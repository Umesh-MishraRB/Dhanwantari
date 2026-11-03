import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // HH:mm
  endTime: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
});

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    slots: [slotSchema],
  },
  { timestamps: true }
);

doctorAvailabilitySchema.index({ doctor: 1, date: 1 }, { unique: true });

export default mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
