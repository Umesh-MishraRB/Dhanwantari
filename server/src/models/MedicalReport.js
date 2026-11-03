import mongoose from "mongoose";

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicine: { type: String, required: true, trim: true },
    dosage: { type: String, default: "" },
    frequency: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false }
);

const medicalReportSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    prediction: { type: mongoose.Schema.Types.ObjectId, ref: "Prediction" },

    diagnosis: { type: String, default: "" },
    observations: { type: String, default: "" },
    treatment: { type: String, default: "" },
    prescription: [prescriptionItemSchema],
    followUpAdvice: { type: String, default: "" },

    handwrittenReportUrl: { type: String, default: "" },
    handwrittenReportName: { type: String, default: "" },

    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: Date,
    emailStatus: { type: String, enum: ["not_sent", "sent", "failed", "skipped"], default: "not_sent" },
    emailedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("MedicalReport", medicalReportSchema);
