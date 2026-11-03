import express, { Router } from "express";
import { requireAuth } from "./auth.js";
import { env } from "../config/env.js";
import Prediction from "../models/Prediction.js";
import Appointment from "../models/Appointment.js";
import MedicalReport from "../models/MedicalReport.js";
import { HttpError } from "../utils/HttpError.js";

/**
 * Serves /uploads.
 *  - photos, videos      : public (doctor profile media shown to everyone)
 *  - qr                  : any logged-in user (patients need it to pay)
 *  - scans, gradcam      : the patient who owns the prediction, or a doctor with an appointment that uses it
 *  - payments            : the patient and the doctor of that appointment
 *  - reports             : the patient (published reports only) and the doctor of that report
 * Anything else is 404. Before this guard every uploaded file was public to anyone who had the URL.
 */
const PUBLIC = new Set(["photos", "videos"]);

async function canRead(folder, url, user) {
  const me = user.id;
  const isDoctor = user.role === "doctor";
  switch (folder) {
    case "qr":
      return true;
    case "scans":
    case "gradcam": {
      const p = await Prediction.findOne(folder === "scans" ? { imageUrl: url } : { gradcamUrl: url }).select("patient");
      if (!p) return false;
      if (String(p.patient) === me) return true;
      return isDoctor && Boolean(await Appointment.exists({ prediction: p._id, doctor: me }));
    }
    case "payments": {
      const a = await Appointment.findOne({ "payment.screenshotUrl": url }).select("patient doctor");
      return Boolean(a) && [String(a.patient), String(a.doctor)].includes(me);
    }
    case "reports": {
      const r = await MedicalReport.findOne({ handwrittenReportUrl: url }).select("patient doctor status");
      if (!r) return false;
      if (String(r.doctor) === me) return true;
      return String(r.patient) === me && r.status === "published";
    }
    default:
      return false;
  }
}

export function uploadsRouter() {
  const router = Router();
  const isoStatic = (cache) =>
    express.static(env.uploadsDir, {
      dotfiles: "deny",
      index: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", cache);
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    });
  const publicStatic = isoStatic("public, max-age=604800");
  const privateStatic = isoStatic("private, max-age=3600");

  router.use((req, res, next) => {
    const folder = req.path.split("/")[1];
    if (PUBLIC.has(folder)) return publicStatic(req, res, next);
    next();
  });

  router.use(requireAuth, async (req, res, next) => {
    try {
      const [, folder, file] = req.path.split("/");
      if (!folder || !file) throw new HttpError(404, "File not found.");
      if (!(await canRead(folder, `/uploads/${folder}/${file}`, req.user))) throw new HttpError(404, "File not found.");
      privateStatic(req, res, next);
    } catch (err) {
      next(err);
    }
  });
  return router;
}
