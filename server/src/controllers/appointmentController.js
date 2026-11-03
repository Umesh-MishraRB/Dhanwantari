import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import DoctorAvailability from "../models/DoctorAvailability.js";
import DoctorProfile from "../models/DoctorProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import Prediction from "../models/Prediction.js";
import MedicalReport from "../models/MedicalReport.js";
import { PRIORITIES, APPOINTMENT_STATUSES } from "../models/Appointment.js";
import * as storage from "../services/storage.js";
import { notify } from "../services/notify.js";
import { sendSessionConfirmedEmail } from "../services/mailer.js";
import { HttpError } from "../utils/HttpError.js";
import { isValidDate, isValidTime, isPastSlot, todayStr } from "../utils/dates.js";

const toList = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim()).filter(Boolean);

const LIST_POPULATE = [
  { path: "patient", select: "name email" },
  { path: "doctor", select: "name email" },
  { path: "doctorProfile", select: "specialization clinicName city photoUrl", populate: { path: "specialization", select: "name slug" } },
  { path: "prediction", select: "displayName riskLevel modality confidence imageUrl gradcamUrl createdAt" },
];

async function releaseSlot(appt) {
  await DoctorAvailability.updateOne(
    { doctor: appt.doctor, date: appt.date, "slots.startTime": appt.startTime },
    { $set: { "slots.$.isBooked": false, "slots.$.appointment": null } }
  );
  appt.slotLocked = false;
}

/** POST /api/appointments  (patient) - the "session request" form */
export async function createAppointment(req, res) {
  const b = req.body || {};
  const { doctorProfileId, date, startTime, predictionId } = b;

  if (!mongoose.isValidObjectId(doctorProfileId)) throw new HttpError(400, "Choose a doctor.");
  if (!isValidDate(date) || !isValidTime(startTime)) throw new HttpError(400, "Choose a valid date and time slot.");
  if (isPastSlot(date, startTime)) throw new HttpError(400, "That time has already passed.");
  if (!b.reason?.trim()) throw new HttpError(400, "Please tell the doctor why you want a session.");

  const doctorProfile = await DoctorProfile.findById(doctorProfileId);
  if (!doctorProfile || !doctorProfile.isVerified) throw new HttpError(404, "Doctor not found.");

  let prediction = null;
  if (predictionId) {
    if (!mongoose.isValidObjectId(predictionId)) throw new HttpError(400, "Invalid prediction.");
    prediction = await Prediction.findOne({ _id: predictionId, patient: req.user.id });
    if (!prediction) throw new HttpError(400, "That prediction does not belong to you.");
  }

  // Payment gate: a paid doctor needs proof of payment (UPI reference / UTR) before the request can be made.
  // NOTE: a personal UPI QR has no webhook, so payment cannot be detected automatically; the doctor verifies it.
  const fee = doctorProfile.consultationFee || 0;
  let utr;
  if (fee > 0) {
    if (!doctorProfile.paymentQrUrl) throw new HttpError(400, "This doctor has not set up payments yet. Please try again later.");
    utr = String(b.utr || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{10,22}$/.test(utr)) throw new HttpError(400, "Pay using the QR code, then enter the UPI reference number (UTR) from your payment app.");
    if (await Appointment.exists({ "payment.utr": utr })) throw new HttpError(409, "This payment reference was already used for another request.");
  }

  // 1) atomically claim the slot - only one request can flip isBooked false -> true
  const avail = await DoctorAvailability.findOneAndUpdate(
    { doctor: doctorProfile.user, date, slots: { $elemMatch: { startTime, isBooked: false } } },
    { $set: { "slots.$.isBooked": true } },
    { new: true }
  );
  if (!avail) throw new HttpError(409, "Sorry, that slot was just taken. Please pick another.");
  const slot = avail.slots.find((s) => s.startTime === startTime);

  // 2) create the appointment; roll the slot back if anything fails
  let appt;
  try {
    const screenshot = fee > 0 && req.file ? await storage.save(req.file.buffer, { folder: "payments", originalName: req.file.originalname }) : null;
    appt = await Appointment.create({
      patient: req.user.id,
      doctor: doctorProfile.user,
      doctorProfile: doctorProfile._id,
      prediction: prediction?._id,
      date,
      startTime,
      endTime: slot.endTime,
      mode: b.mode === "in_person" ? "in_person" : "online",
      reason: b.reason.trim(),
      symptoms: toList(b.symptoms),
      symptomDuration: b.symptomDuration || "",
      severity: ["mild", "moderate", "severe"].includes(b.severity) ? b.severity : "mild",
      currentMedications: b.currentMedications || "",
      allergies: b.allergies || "",
      additionalNotes: b.additionalNotes || "",
      fee,
      payment: fee > 0 ? { status: "submitted", utr, screenshotUrl: screenshot?.url || "", submittedAt: new Date() } : { status: "not_required" },
      status: "requested",
      slotLocked: true,
    });
    await DoctorAvailability.updateOne({ _id: avail._id, "slots.startTime": startTime }, { $set: { "slots.$.appointment": appt._id } });
  } catch (err) {
    await DoctorAvailability.updateOne(
      { _id: avail._id, "slots.startTime": startTime },
      { $set: { "slots.$.isBooked": false, "slots.$.appointment": null } }
    );
    if (err.code === 11000 && err.keyPattern?.["payment.utr"]) throw new HttpError(409, "This payment reference was already used for another request.");
    if (err.code === 11000) throw new HttpError(409, "Sorry, that slot was just taken. Please pick another.");
    throw err;
  }

  await notify(doctorProfile.user, {
    type: "appointment_requested",
    title: "New session request",
    message: `${req.user.name} requested a session on ${date} at ${startTime}.${fee > 0 ? ` Payment of Rs. ${fee} was submitted - please verify it before accepting.` : ""}`,
    link: `/doctor/appointments/${appt._id}`,
    appointment: appt._id,
  });

  await appt.populate(LIST_POPULATE);
  res.status(201).json({ appointment: appt });
}

/** GET /api/appointments?status=a,b&diagnosisStatus=&priority=&from=&to=&today=true&sort=asc|desc */
export async function listAppointments(req, res) {
  const q = req.query;
  const filter = req.user.role === "doctor" ? { doctor: req.user.id } : { patient: req.user.id };

  if (q.status) filter.status = { $in: String(q.status).split(",").filter((s) => APPOINTMENT_STATUSES.includes(s)) };
  if (["active", "completed"].includes(q.diagnosisStatus)) filter.diagnosisStatus = q.diagnosisStatus;
  if (PRIORITIES.includes(q.priority)) filter.priority = q.priority;
  if (q.today === "true") filter.date = todayStr();
  else if (isValidDate(q.from) || isValidDate(q.to)) {
    filter.date = {};
    if (isValidDate(q.from)) filter.date.$gte = q.from;
    if (isValidDate(q.to)) filter.date.$lte = q.to;
  }

  const dir = q.sort === "asc" ? 1 : -1;
  const appointments = await Appointment.find(filter).sort({ date: dir, startTime: dir }).limit(300).populate(LIST_POPULATE).lean();

  const reports = await MedicalReport.find({ appointment: { $in: appointments.map((a) => a._id) } }).select("appointment status").lean();
  const reportMap = new Map(reports.map((r) => [String(r.appointment), r.status]));
  for (const a of appointments) {
    const st = reportMap.get(String(a._id));
    // patients only learn about published reports
    a.reportStatus = st && (req.user.role === "doctor" || st === "published") ? st : null;
  }
  res.json({ appointments });
}

/** GET /api/appointments/:id - full detail (doctor sees patient profile + prediction + GradCAM). */
export async function getAppointment(req, res) {
  const appt = await Appointment.findById(req.params.id)
    .populate(LIST_POPULATE.slice(0, 3))
    .populate({ path: "prediction", populate: { path: "specialization", select: "name slug" } });
  if (!appt) throw new HttpError(404, "Appointment not found.");

  const isDoctor = req.user.role === "doctor" && String(appt.doctor._id) === req.user.id;
  const isPatient = req.user.role === "patient" && String(appt.patient._id) === req.user.id;
  if (!isDoctor && !isPatient) throw new HttpError(403, "You do not have access to this appointment.");

  let report = await MedicalReport.findOne({ appointment: appt._id });
  if (report && isPatient && report.status !== "published") report = null;

  const patientProfile = isDoctor ? await PatientProfile.findOne({ user: appt.patient._id }) : null;
  res.json({ appointment: appt, report, patientProfile });
}

const TRANSITIONS = {
  doctor: { requested: ["confirmed", "rejected"], confirmed: ["completed", "cancelled"] },
  patient: { requested: ["cancelled"], confirmed: ["cancelled"] },
};

/** PATCH /api/appointments/:id/status  body: { status } */
export async function updateStatus(req, res) {
  const { status } = req.body || {};
  const appt = await Appointment.findById(req.params.id).populate("patient", "name email").populate("doctor", "name");
  if (!appt) throw new HttpError(404, "Appointment not found.");

  const role = req.user.role;
  const owner = role === "doctor" ? String(appt.doctor._id) : String(appt.patient._id);
  if (owner !== req.user.id) throw new HttpError(403, "You do not have access to this appointment.");

  if (!TRANSITIONS[role][appt.status]?.includes(status)) {
    throw new HttpError(400, `You cannot change a ${appt.status} appointment to ${status}.`);
  }

  if (role === "doctor" && status === "confirmed" && appt.fee > 0 && appt.payment?.status !== "verified") {
    throw new HttpError(400, "Verify the patient's payment before accepting this session.");
  }

  appt.status = status;
  if (status === "rejected" || status === "cancelled") await releaseSlot(appt);
  await appt.save();

  const link = (base) => `/${base}/${base === "doctor" ? "appointments" : "sessions"}/${appt._id}`;
  const when = `${appt.date} at ${appt.startTime}`;
  if (role === "doctor" && status === "confirmed") {
    // fire-and-forget; contains no medical details
    sendSessionConfirmedEmail({ to: appt.patient.email, patientName: appt.patient.name, doctorName: appt.doctor.name, appointment: appt }).catch(() => {});
    await notify(appt.patient._id, { type: "appointment_confirmed", title: "Session confirmed", message: `Dr. ${appt.doctor.name} confirmed your session on ${when}.`, link: link("patient"), appointment: appt._id });
  } else if (role === "doctor" && status === "rejected") {
    await notify(appt.patient._id, { type: "appointment_rejected", title: "Session declined", message: `Dr. ${appt.doctor.name} could not accept your request for ${when}. Please choose another slot.`, link: link("patient"), appointment: appt._id });
  } else if (role === "doctor" && status === "cancelled") {
    await notify(appt.patient._id, { type: "appointment_cancelled", title: "Session cancelled", message: `Dr. ${appt.doctor.name} cancelled the session on ${when}.`, link: link("patient"), appointment: appt._id });
  } else if (role === "patient" && status === "cancelled") {
    await notify(appt.doctor._id, { type: "appointment_cancelled", title: "Session cancelled by patient", message: `${appt.patient.name} cancelled the session on ${when}.`, link: link("doctor"), appointment: appt._id });
  }

  res.json({ appointment: appt });
}

/** PATCH /api/appointments/:id/triage (doctor) body: { priority?, diagnosisStatus? } */
export async function updateTriage(req, res) {
  const { priority, diagnosisStatus } = req.body || {};
  const appt = await Appointment.findOne({ _id: req.params.id, doctor: req.user.id });
  if (!appt) throw new HttpError(404, "Appointment not found.");

  if (priority !== undefined) {
    if (priority !== null && !PRIORITIES.includes(priority)) throw new HttpError(400, `priority must be one of ${PRIORITIES.join(", ")}`);
    appt.priority = priority;
  }
  let justCompleted = false;
  if (diagnosisStatus !== undefined) {
    if (!["active", "completed"].includes(diagnosisStatus)) throw new HttpError(400, "diagnosisStatus must be active or completed");
    justCompleted = diagnosisStatus === "completed" && appt.diagnosisStatus !== "completed";
    appt.diagnosisStatus = diagnosisStatus;
  }
  await appt.save();

  if (justCompleted) {
    await notify(appt.patient, {
      type: "diagnosis_completed",
      title: "Diagnosis completed",
      message: "Your doctor has marked your diagnosis as completed.",
      link: `/patient/sessions/${appt._id}`,
      appointment: appt._id,
    });
  }
  res.json({ appointment: appt });
}

/** PATCH /api/appointments/:id/payment (doctor) body: { status: "verified" | "rejected" } */
export async function updatePayment(req, res) {
  const { status } = req.body || {};
  if (!["verified", "rejected"].includes(status)) throw new HttpError(400, "status must be verified or rejected.");

  const appt = await Appointment.findOne({ _id: req.params.id, doctor: req.user.id }).populate("patient", "name email").populate("doctor", "name");
  if (!appt) throw new HttpError(404, "Appointment not found.");
  if (!(appt.fee > 0) || appt.payment?.status === "not_required") throw new HttpError(400, "No payment is required for this session.");
  if (["rejected", "cancelled"].includes(appt.status)) throw new HttpError(400, "This session is already closed.");

  appt.payment.status = status;
  appt.payment.verifiedAt = status === "verified" ? new Date() : undefined;
  await appt.save();

  const when = `${appt.date} at ${appt.startTime}`;
  await notify(appt.patient._id, {
    type: status === "verified" ? "payment_verified" : "payment_rejected",
    title: status === "verified" ? "Payment confirmed" : "Payment not found",
    message:
      status === "verified"
        ? `Dr. ${appt.doctor.name} confirmed your payment of Rs. ${appt.fee} for ${when}.`
        : `Dr. ${appt.doctor.name} could not find your payment of Rs. ${appt.fee} for ${when}. Please check the reference number or contact the doctor.`,
    link: `/patient/sessions/${appt._id}`,
    appointment: appt._id,
  });
  res.json({ appointment: appt });
}
