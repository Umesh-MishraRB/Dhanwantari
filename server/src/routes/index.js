import { Router } from "express";
import mongoose from "mongoose";
import { softAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { uploadScan, uploadReport, uploadQr, uploadProof, uploadDoctorMedia } from "../middleware/upload.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { asyncHandler as h } from "../utils/HttpError.js";

import * as auth from "../controllers/authController.js";
import * as profile from "../controllers/profileController.js";
import * as doctors from "../controllers/doctorController.js";
import * as availability from "../controllers/availabilityController.js";
import * as predictions from "../controllers/predictionController.js";
import * as appointments from "../controllers/appointmentController.js";
import * as reports from "../controllers/reportController.js";
import * as notifications from "../controllers/notificationController.js";
import * as blogs from "../controllers/blogController.js";
import { googleEnabled } from "../config/auth.js";
import * as stats from "../controllers/statsController.js";

const router = Router();
const patientOnly = requireRole("patient");
const doctorOnly = requireRole("doctor");

router.get("/health", (_req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ status: db ? "ok" : "degraded", db });
});

// ---- public ----
router.get("/me", softAuth, h(auth.me)); // also answers for a Google identity that has no account yet
router.post("/google/complete", softAuth, h(auth.completeGoogleProfile));
router.get("/auth-config", (_req, res) => res.json({ google: googleEnabled }));
router.post("/register", rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: "Too many sign-up attempts. Please try again later." }), h(auth.register));
router.get("/specializations", h(doctors.listSpecializations)); // needed by the doctor sign-up form
router.get("/blogs", h(blogs.listBlogs));
router.get("/blogs/:slug", h(blogs.getBlog));

// ---- everything below needs an Auth.js session ----
router.use(requireAuth);

router.get("/stats", h(stats.getStats));

// profiles
router.get("/patient/profile", patientOnly, h(profile.getPatientProfile));
router.put("/patient/profile", patientOnly, h(profile.updatePatientProfile));
router.get("/doctor/profile", doctorOnly, h(profile.getDoctorProfile));
router.put("/doctor/payment", doctorOnly, uploadQr.single("qr"), h(profile.updateDoctorPayment));
router.put("/doctor/profile", doctorOnly, h(profile.updateDoctorProfile));
router.put("/doctor/media", doctorOnly, uploadDoctorMedia, h(profile.updateDoctorMedia)); // photo + intro video

// doctors directory
router.get("/doctors", h(doctors.listDoctors));
router.get("/doctors/:id", h(doctors.getDoctor));
router.get("/doctors/:id/availability", h(doctors.getDoctorAvailability));

// doctor calendar
router.get("/availability/me", doctorOnly, h(availability.myAvailability));
router.put("/availability/:date", doctorOnly, h(availability.setDay));
router.delete("/availability/:date", doctorOnly, h(availability.clearDay));

// ML predictions (doctors may also analyse images)
router.post("/predictions", rateLimit({ windowMs: 60 * 60 * 1000, max: 40, key: (req) => req.user.id, message: "You have run many predictions in the last hour. Please try again later." }), uploadScan.single("image"), h(predictions.createPrediction));
router.get("/predictions", h(predictions.listMyPredictions));
router.get("/predictions/:id", h(predictions.getPrediction));
router.get("/predictions/:id/doctors", patientOnly, h(predictions.getSuggestedDoctors)); // specialists to suggest for this result

// appointments / sessions
router.post("/appointments", patientOnly, uploadProof.single("screenshot"), h(appointments.createAppointment));
router.get("/appointments", h(appointments.listAppointments));
router.get("/appointments/:id", h(appointments.getAppointment));
router.patch("/appointments/:id/status", h(appointments.updateStatus));
router.patch("/appointments/:id/payment", doctorOnly, h(appointments.updatePayment));
router.patch("/appointments/:id/triage", doctorOnly, h(appointments.updateTriage));
router.put("/appointments/:id/report", doctorOnly, uploadReport.single("handwritten"), h(reports.saveReport));

// reports
router.get("/reports", h(reports.listReports));

// notifications
router.get("/notifications", h(notifications.listNotifications));
router.patch("/notifications/read-all", h(notifications.markAllRead));
router.patch("/notifications/:id/read", h(notifications.markRead));

export default router;
