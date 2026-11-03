import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import Specialization from "../models/Specialization.js";
import { HttpError } from "../utils/HttpError.js";
import { env } from "../config/env.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const toList = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim()).filter(Boolean);

/** Validates the role-specific fields, then creates the user + patient/doctor profile (rolls back on failure). */
async function createAccount({ name, email, role, passwordHash, authProvider = "local", avatarUrl = "", body }) {
  let specialization = null;
  if (role === "doctor") {
    if (!mongoose.isValidObjectId(body.specializationId)) throw new HttpError(400, "Please choose a specialization.");
    specialization = await Specialization.findById(body.specializationId);
    if (!specialization) throw new HttpError(400, "Unknown specialization.");
  }

  const user = await User.create({ name, email, role, passwordHash, authProvider, avatarUrl });
  try {
    if (role === "patient") {
      await PatientProfile.create({ user: user._id });
    } else {
      await DoctorProfile.create({
        user: user._id,
        specialization: specialization._id,
        qualifications: toList(body.qualifications),
        experienceYears: Number(body.experienceYears) || 0,
        licenseNumber: body.licenseNumber || "",
        isVerified: !env.requireDoctorApproval,
      });
    }
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // keep user + profile consistent (no transactions on standalone MongoDB)
    throw err;
  }
  return user;
}

/** POST /api/register - creates the user + role-specific profile. Login itself is handled by Auth.js. */
export async function register(req, res) {
  const { name, email, password, role } = req.body || {};
  if (!name?.trim()) throw new HttpError(400, "Name is required.");
  if (!EMAIL_RE.test(email || "")) throw new HttpError(400, "A valid email is required.");
  if (typeof password !== "string" || password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
  if (!["patient", "doctor"].includes(role)) throw new HttpError(400, "Role must be patient or doctor.");

  const normalized = email.toLowerCase().trim();
  if (await User.exists({ email: normalized })) throw new HttpError(409, "An account with this email already exists.");

  await createAccount({ name: name.trim(), email: normalized, role, passwordHash: await bcrypt.hash(password, 10), body: req.body });
  res.status(201).json({ message: "Account created. You can log in now." });
}

/**
 * POST /api/google/complete - onboarding for a first-time Google user (req.pending, set by softAuth).
 * Body: { role, name?, specializationId, qualifications, experienceYears, licenseNumber }
 * The e-mail comes from the verified Google session, never from the request body.
 */
export async function completeGoogleProfile(req, res) {
  if (req.user) throw new HttpError(409, "Your account is already set up.");
  if (!req.pending) throw new HttpError(401, "Please continue with Google first.");

  const b = req.body || {};
  if (!["patient", "doctor"].includes(b.role)) throw new HttpError(400, "Choose whether you are a patient or a doctor.");
  const name = String(b.name || req.pending.name || "").trim().slice(0, 80);
  if (!name) throw new HttpError(400, "Name is required.");
  if (await User.exists({ email: req.pending.email })) throw new HttpError(409, "An account with this email already exists.");

  await createAccount({ name, email: req.pending.email, role: b.role, authProvider: "google", avatarUrl: req.pending.picture, body: b });
  res.status(201).json({ message: "Account ready." });
}

/** GET /api/me - current user + profile; or { user: null, pending } for a Google identity that still has to finish onboarding. */
export async function me(req, res) {
  if (req.pending) return res.json({ user: null, profile: null, pending: req.pending });
  if (!req.user) throw new HttpError(401, "Please log in to continue.");
  const user = await User.findById(req.user.id);
  if (!user || !user.isActive) throw new HttpError(401, "Account not found.");
  const profile =
    user.role === "patient"
      ? await PatientProfile.findOne({ user: user._id })
      : await DoctorProfile.findOne({ user: user._id }).populate("specialization", "name slug");
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, profile });
}
