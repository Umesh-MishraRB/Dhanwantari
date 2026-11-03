import Appointment from "../models/Appointment.js";
import Prediction from "../models/Prediction.js";
import MedicalReport from "../models/MedicalReport.js";
import Notification from "../models/Notification.js";
import { todayStr } from "../utils/dates.js";

/** GET /api/stats - small role-aware counters for the dashboards. */
export async function getStats(req, res) {
  const id = req.user.id;
  const today = todayStr();
  const unread = await Notification.countDocuments({ user: id, isRead: false });

  if (req.user.role === "patient") {
    const [predictions, upcoming, reports] = await Promise.all([
      Prediction.countDocuments({ patient: id }),
      Appointment.countDocuments({ patient: id, status: { $in: ["requested", "confirmed"] }, date: { $gte: today } }),
      MedicalReport.countDocuments({ patient: id, status: "published" }),
    ]);
    return res.json({ predictions, upcoming, reports, unread });
  }

  const [todayCount, pending, active, completed, critical] = await Promise.all([
    Appointment.countDocuments({ doctor: id, date: today, status: { $in: ["requested", "confirmed"] } }),
    Appointment.countDocuments({ doctor: id, status: "requested" }),
    Appointment.countDocuments({ doctor: id, diagnosisStatus: "active", status: { $in: ["confirmed", "completed"] } }),
    Appointment.countDocuments({ doctor: id, diagnosisStatus: "completed" }),
    Appointment.countDocuments({ doctor: id, priority: { $in: ["high", "critical"] }, diagnosisStatus: "active", status: { $in: ["confirmed", "completed"] } }),
  ]);
  res.json({ today: todayCount, pending, active, completed, critical, unread });
}
