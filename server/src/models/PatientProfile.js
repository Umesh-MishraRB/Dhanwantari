import mongoose from "mongoose";

const patientProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say", ""], default: "" },
    phone: { type: String, trim: true, default: "" },
    bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""], default: "" },
    heightCm: Number,
    weightKg: Number,
    allergies: [String],
    chronicConditions: [String],
    currentMedications: [String],
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relation: { type: String, default: "" },
    },
    address: {
      line1: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "" },
      postalCode: { type: String, default: "" },
    },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("PatientProfile", patientProfileSchema);
