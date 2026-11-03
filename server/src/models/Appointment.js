import mongoose from "mongoose";

export const APPOINTMENT_STATUSES = ["requested", "confirmed", "rejected", "cancelled", "completed"];
export const PAYMENT_STATUSES = ["not_required", "submitted", "verified", "rejected"];
export const PRIORITIES = ["low", "medium", "high", "critical"];

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, // doctor's User id
    doctorProfile: { type: mongoose.Schema.Types.ObjectId, ref: "DoctorProfile", required: true },
    prediction: { type: mongoose.Schema.Types.ObjectId, ref: "Prediction" },

    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    mode: { type: String, enum: ["online", "in_person"], default: "online" },

    // Session request form filled by the patient
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    symptoms: [String],
    symptomDuration: { type: String, default: "" },
    severity: { type: String, enum: ["mild", "moderate", "severe"], default: "mild" },
    currentMedications: { type: String, default: "" },
    allergies: { type: String, default: "" },
    additionalNotes: { type: String, maxlength: 1000, default: "" },

    // Fee snapshot (INR) taken when the request was made + the patient's proof of payment (UPI reference / UTR).
    // The doctor verifies it against their bank / UPI app before accepting the session.
    fee: { type: Number, default: 0 },
    payment: {
      status: { type: String, enum: PAYMENT_STATUSES, default: "not_required" },
      utr: { type: String, default: undefined },
      screenshotUrl: { type: String, default: "" },
      submittedAt: Date,
      verifiedAt: Date,
    },

    status: { type: String, enum: APPOINTMENT_STATUSES, default: "requested", index: true },

    // Doctor-side labels
    priority: { type: String, enum: PRIORITIES, default: null },
    diagnosisStatus: { type: String, enum: ["active", "completed"], default: "active", index: true },

    // true while the appointment holds its slot (requested/confirmed/completed)
    slotLocked: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Second line of defence against double booking (the first is the atomic slot claim).
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { slotLocked: true } }
);
appointmentSchema.index({ doctor: 1, date: 1 });
// One payment reference can only ever be used for one request.
appointmentSchema.index({ "payment.utr": 1 }, { unique: true, sparse: true });

export default mongoose.model("Appointment", appointmentSchema);
