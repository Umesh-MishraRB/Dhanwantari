import MedicalReport from "../models/MedicalReport.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import DoctorProfile from "../models/DoctorProfile.js";
import { buildReportPdf } from "../services/reportPdf.js";
import * as storage from "../services/storage.js";
import { notify } from "../services/notify.js";
import { sendReportEmail } from "../services/mailer.js";
import { HttpError } from "../utils/HttpError.js";

function parsePrescription(raw) {
  if (raw === undefined) return undefined;
  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw || "[]");
    } catch {
      throw new HttpError(400, "Prescription must be valid JSON.");
    }
  }
  if (!Array.isArray(arr)) throw new HttpError(400, "Prescription must be a list.");
  return arr
    .filter((p) => p?.medicine?.trim())
    .map((p) => ({ medicine: p.medicine.trim(), dosage: p.dosage || "", frequency: p.frequency || "", duration: p.duration || "" }));
}

/**
 * PUT /api/appointments/:id/report  (doctor, multipart)
 * Fields: diagnosis, observations, treatment, prescription (JSON), followUpAdvice, publish ("true"), file: handwritten
 * Creates or updates the report; publish=true makes it visible to the patient, notifies them and e-mails it.
 */
export async function saveReport(req, res) {
  const appt = await Appointment.findOne({ _id: req.params.id, doctor: req.user.id });
  if (!appt) throw new HttpError(404, "Appointment not found.");
  if (!["confirmed", "completed"].includes(appt.status)) throw new HttpError(400, "Confirm the appointment before writing a report.");

  const b = req.body || {};
  let report = await MedicalReport.findOne({ appointment: appt._id });
  if (!report) {
    report = new MedicalReport({ appointment: appt._id, patient: appt.patient, doctor: appt.doctor, prediction: appt.prediction });
  }

  for (const k of ["diagnosis", "observations", "treatment", "followUpAdvice"]) if (b[k] !== undefined) report[k] = String(b[k]).trim();
  const prescription = parsePrescription(b.prescription);
  if (prescription !== undefined) report.prescription = prescription;

  if (req.file) {
    const saved = await storage.save(req.file.buffer, { folder: "reports", originalName: req.file.originalname });
    report.handwrittenReportUrl = saved.url;
    report.handwrittenReportName = req.file.originalname;
  }

  const publish = b.publish === "true" || b.publish === true;
  const firstPublish = publish && !report.publishedAt;
  // Also (re)send the mail when a published report was never successfully e-mailed, e.g. the first attempt failed.
  const needsEmail = publish && report.emailStatus !== "sent";
  if (publish) {
    if (!report.diagnosis && !report.handwrittenReportUrl) throw new HttpError(400, "Add a diagnosis or upload the handwritten report before publishing.");
    report.status = "published";
    if (!report.publishedAt) report.publishedAt = new Date();
  }
  await report.save();

  if (needsEmail) {
    const [patient, doctor] = await Promise.all([User.findById(appt.patient), User.findById(appt.doctor)]);
    if (firstPublish) await notify(appt.patient, {
      type: "report_available",
      title: "Your medical report is ready",
      message: `Dr. ${doctor.name} published your report for ${appt.date}.`,
      link: `/patient/sessions/${appt._id}`,
      appointment: appt._id,
    });
    // fire-and-forget: e-mail must never block the core flow
    (async () => {
      let pdf = null;
      const hasText = report.diagnosis || report.observations || report.treatment || report.followUpAdvice || report.prescription?.length;
      if (hasText) {
        try {
          const dp = await DoctorProfile.findOne({ user: appt.doctor }).populate("specialization", "name");
          pdf = await buildReportPdf({ report, patient, doctor, specialization: dp?.specialization?.name, appointment: appt });
        } catch (e) {
          console.error("[mail] PDF generation failed:", e.message); // still send the mail (+ handwritten file)
        }
      }
      return sendReportEmail({ to: patient.email, patientName: patient.name, doctorName: doctor.name, report, appointment: appt, pdf });
    })()
      .then((status) =>
        MedicalReport.updateOne({ _id: report._id }, { emailStatus: status, ...(status === "sent" ? { emailedAt: new Date() } : {}) })
      )
      .catch((e) => console.error("[mail] status update failed:", e.message));
  }

  res.json({ report });
}

/** GET /api/reports - patient: published reports; doctor: all reports they wrote. */
export async function listReports(req, res) {
  const filter = req.user.role === "doctor" ? { doctor: req.user.id } : { patient: req.user.id, status: "published" };
  const reports = await MedicalReport.find(filter)
    .sort({ updatedAt: -1 })
    .limit(200)
    .populate("appointment", "date startTime")
    .populate("doctor", "name")
    .populate("patient", "name")
    .populate("prediction", "displayName riskLevel");
  res.json({ reports });
}
