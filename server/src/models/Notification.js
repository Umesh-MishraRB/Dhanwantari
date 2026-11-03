import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "appointment_requested",
  "appointment_confirmed",
  "appointment_rejected",
  "appointment_cancelled",
  "report_available",
  "diagnosis_completed",
  "general",
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "general" },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    link: { type: String, default: "" }, // client route to open
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
