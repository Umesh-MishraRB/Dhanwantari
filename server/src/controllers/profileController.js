import mongoose from "mongoose";
import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import Specialization from "../models/Specialization.js";
import * as storage from "../services/storage.js";
import { HttpError } from "../utils/HttpError.js";
import { looksLikeImage, looksLikeVideo, MAX_PHOTO_MB } from "../middleware/upload.js";

const toList = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim()).filter(Boolean);
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

export async function getPatientProfile(req, res) {
  const profile = await PatientProfile.findOne({ user: req.user.id });
  res.json({ profile });
}

export async function updatePatientProfile(req, res) {
  const b = req.body || {};
  const update = pick(b, ["dateOfBirth", "gender", "phone", "bloodGroup", "heightCm", "weightKg", "emergencyContact", "address"]);
  for (const k of ["allergies", "chronicConditions", "currentMedications"]) if (b[k] !== undefined) update[k] = toList(b[k]);
  if (update.dateOfBirth === "") update.dateOfBirth = null;
  for (const k of ["heightCm", "weightKg"]) if (update[k] === "") update[k] = null;

  const profile = await PatientProfile.findOneAndUpdate({ user: req.user.id }, { $set: update }, { new: true, upsert: true, runValidators: true });
  profile.profileCompleted = Boolean(profile.dateOfBirth && profile.gender && profile.phone);
  await profile.save();

  if (b.name?.trim()) await User.updateOne({ _id: req.user.id }, { name: b.name.trim() });
  res.json({ profile });
}

export async function getDoctorProfile(req, res) {
  const profile = await DoctorProfile.findOne({ user: req.user.id }).populate("specialization", "name slug");
  res.json({ profile });
}

export async function updateDoctorProfile(req, res) {
  const b = req.body || {};
  const update = pick(b, ["experienceYears", "licenseNumber", "clinicName", "city", "bio"]);
  for (const k of ["qualifications", "languages"]) if (b[k] !== undefined) update[k] = toList(b[k]);
  if (b.specialization !== undefined) {
    if (!mongoose.isValidObjectId(b.specialization) || !(await Specialization.exists({ _id: b.specialization }))) {
      throw new HttpError(400, "Unknown specialization.");
    }
    update.specialization = b.specialization;
  }
  const profile = await DoctorProfile.findOneAndUpdate({ user: req.user.id }, { $set: update }, { new: true, runValidators: true }).populate("specialization", "name slug");
  if (!profile) throw new HttpError(404, "Doctor profile not found.");
  if (b.name?.trim()) await User.updateOne({ _id: req.user.id }, { name: b.name.trim() });
  res.json({ profile });
}

export const MAX_FEE = 5000;

/** PUT /api/doctor/payment (doctor, multipart) - fields: consultationFee, removeQr, file: qr */
export async function updateDoctorPayment(req, res) {
  const profile = await DoctorProfile.findOne({ user: req.user.id });
  if (!profile) throw new HttpError(404, "Doctor profile not found.");
  const b = req.body || {};

  let fee = profile.consultationFee || 0;
  if (b.consultationFee !== undefined) {
    fee = Number(b.consultationFee);
    if (!Number.isInteger(fee) || fee < 0 || fee > MAX_FEE) throw new HttpError(400, `Fee must be a whole number between 0 and ${MAX_FEE}.`);
  }
  const removeQr = b.removeQr === "true" || b.removeQr === true;
  const willHaveQr = Boolean(req.file) || (Boolean(profile.paymentQrUrl) && !removeQr);
  if (fee > 0 && !willHaveQr) throw new HttpError(400, "Upload your payment QR code to charge a consultation fee.");

  if (req.file) {
    const saved = await storage.save(req.file.buffer, { folder: "qr", originalName: req.file.originalname });
    profile.paymentQrUrl = saved.url;
  } else if (removeQr) {
    profile.paymentQrUrl = "";
  }
  profile.consultationFee = fee;
  await profile.save();
  await profile.populate("specialization", "name slug");
  res.json({ profile });
}

/**
 * PUT /api/doctor/media (doctor, multipart) - fields: removePhoto, removeVideo; files: photo, video.
 * The intro video is what a patient watches on the doctor's page before booking.
 */
export async function updateDoctorMedia(req, res) {
  const profile = await DoctorProfile.findOne({ user: req.user.id });
  if (!profile) throw new HttpError(404, "Doctor profile not found.");
  const b = req.body || {};
  const photo = req.files?.photo?.[0];
  const video = req.files?.video?.[0];
  const flag = (v) => v === "true" || v === true;

  if (photo) {
    if (photo.size > MAX_PHOTO_MB * 1024 * 1024) throw new HttpError(400, `Photo must be smaller than ${MAX_PHOTO_MB} MB.`);
    if (!looksLikeImage(photo.buffer)) throw new HttpError(400, "That file is not a valid image.");
  }
  if (video && !looksLikeVideo(video.buffer)) throw new HttpError(400, "That file is not a valid MP4, MOV or WebM video.");

  const oldPhoto = profile.photoUrl;
  const oldVideo = profile.introVideoUrl;

  if (photo) profile.photoUrl = (await storage.save(photo.buffer, { folder: "photos", originalName: photo.originalname })).url;
  else if (flag(b.removePhoto)) profile.photoUrl = "";

  if (video) profile.introVideoUrl = (await storage.save(video.buffer, { folder: "videos", originalName: video.originalname })).url;
  else if (flag(b.removeVideo)) profile.introVideoUrl = "";

  await profile.save();
  // delete replaced files only after the new state is saved; never touch external (http) photo links
  if (oldPhoto !== profile.photoUrl && oldPhoto?.startsWith("/uploads/")) storage.remove(oldPhoto);
  if (oldVideo !== profile.introVideoUrl && oldVideo?.startsWith("/uploads/")) storage.remove(oldVideo);

  await profile.populate("specialization", "name slug");
  res.json({ profile });
}
