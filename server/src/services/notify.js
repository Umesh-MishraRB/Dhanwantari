import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendDoctorNotificationEmail } from "./mailer.js";

/** Doctors get every in-app notification by e-mail as well. Fire-and-forget; never throws. */
async function emailIfDoctor(userId, { title, message, link }) {
  try {
    const user = await User.findById(userId).select("name email role isActive");
    if (user?.role === "doctor" && user.isActive) await sendDoctorNotificationEmail({ to: user.email, doctorName: user.name, title, message, link });
  } catch (err) {
    console.error("[notify] e-mail failed:", err.message);
  }
}

/** Creates an in-app notification. Never throws - notifications must not break core flows. */
export async function notify(userId, { type = "general", title, message = "", link = "", appointment }) {
  try {
    const n = await Notification.create({ user: userId, type, title, message, link, appointment });
    emailIfDoctor(userId, { title, message, link });
    return n;
  } catch (err) {
    console.error("[notify] failed:", err.message);
    return null;
  }
}
