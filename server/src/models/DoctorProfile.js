import mongoose from "mongoose";

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    specialization: { type: mongoose.Schema.Types.ObjectId, ref: "Specialization", required: true, index: true },
    qualifications: [String],
    experienceYears: { type: Number, min: 0, max: 70, default: 0 },
    licenseNumber: { type: String, trim: true, default: "" },
    clinicName: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    bio: { type: String, maxlength: 1200, default: "" },
    languages: [String],
    photoUrl: { type: String, default: "" },
    // Short self-introduction video uploaded by the doctor (shown on the doctor's public page).
    introVideoUrl: { type: String, default: "" },
    // Consultation fee (INR) and the doctor's UPI / payment QR image. Patients pay through the QR before requesting a session.
    consultationFee: { type: Number, min: 0, max: 5000, default: 0 },
    paymentQrUrl: { type: String, default: "" },
    // Doctors are listed immediately unless REQUIRE_DOCTOR_APPROVAL=true (then approve with `npm run verify-doctor`).
    isVerified: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("DoctorProfile", doctorProfileSchema);
