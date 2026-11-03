import Prediction from "../models/Prediction.js";
import Specialization from "../models/Specialization.js";
import Appointment from "../models/Appointment.js";
import { analyzeImage } from "../services/mlService.js";
import * as storage from "../services/storage.js";
import { describePrediction, MODALITIES } from "../config/diseaseMap.js";
import { suggestDoctorsFor } from "./doctorController.js";
import { HttpError } from "../utils/HttpError.js";

const POPULATE = [{ path: "specialization", select: "name slug" }];

/** POST /api/predictions  (multipart: image, modality) */
export async function createPrediction(req, res) {
  const { modality } = req.body || {};
  if (!MODALITIES.includes(modality)) throw new HttpError(400, `modality must be one of: ${MODALITIES.join(", ")}`);
  if (!req.file) throw new HttpError(400, "Please choose an image to upload.");

  // Call ML first so a failed prediction does not leave an orphan file behind.
  const ml = await analyzeImage({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    modality,
  });
  const info = describePrediction(modality, ml);

  const image = await storage.save(req.file.buffer, { folder: "scans", originalName: req.file.originalname });
  let gradcamUrl = "";
  if (ml.gradcam_base64) {
    const saved = await storage.save(Buffer.from(ml.gradcam_base64, "base64"), { folder: "gradcam", ext: ".png" });
    gradcamUrl = saved.url;
  }

  const specialization = await Specialization.findOne({ slug: info.specialtySlug });

  const prediction = await Prediction.create({
    patient: req.user.id,
    modality,
    imageUrl: image.url,
    predictedLabel: ml.predicted_label,
    primaryLabel: info.primaryLabel,
    displayName: info.displayName,
    confidence: ml.confidence,
    probabilities: ml.probabilities,
    riskLevel: info.riskLevel,
    riskNote: info.riskNote,
    specialization: specialization?._id,
    blogSlug: info.blogSlug,
    gradcamUrl,
    disclaimer: ml.disclaimer || "",
  });

  await prediction.populate(POPULATE);
  res.status(201).json({ prediction });
}

export async function listMyPredictions(req, res) {
  const predictions = await Prediction.find({ patient: req.user.id }).sort({ createdAt: -1 }).limit(100).populate(POPULATE);
  res.json({ predictions });
}

/** Owner can read; a doctor can read predictions attached to one of their appointments. */
export async function getPrediction(req, res) {
  const prediction = await Prediction.findById(req.params.id).populate(POPULATE);
  if (!prediction) throw new HttpError(404, "Prediction not found.");
  const isOwner = String(prediction.patient) === req.user.id;
  const isTreatingDoctor =
    req.user.role === "doctor" && (await Appointment.exists({ prediction: prediction._id, doctor: req.user.id }));
  if (!isOwner && !isTreatingDoctor) throw new HttpError(403, "You do not have access to this prediction.");
  res.json({ prediction });
}

/**
 * GET /api/predictions/:id/doctors - the specialists to suggest for this result (patient who owns it).
 * Shown right under the prediction so the next step (see a doctor) is one tap away.
 */
export async function getSuggestedDoctors(req, res) {
  const prediction = await Prediction.findOne({ _id: req.params.id, patient: req.user.id }).populate(POPULATE);
  if (!prediction) throw new HttpError(404, "Prediction not found.");
  const { doctors, fallback } = await suggestDoctorsFor(prediction.specialization?._id);
  res.json({
    specialization: prediction.specialization || null,
    riskLevel: prediction.riskLevel,
    urgent: prediction.riskLevel === "high",
    fallback,
    doctors,
  });
}
