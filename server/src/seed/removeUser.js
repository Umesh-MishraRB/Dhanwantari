// Removes an account created by mistake (e.g. a patient auto-created by an earlier Google login
// when the person actually is a doctor).   Usage:  npm run remove-user -- someone@gmail.com
// Refuses to delete accounts that already have appointments or reports.
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import Appointment from "../models/Appointment.js";
import MedicalReport from "../models/MedicalReport.js";
import Notification from "../models/Notification.js";
import Prediction from "../models/Prediction.js";

const email = (process.argv[2] || "").toLowerCase().trim();
if (!email) {
  console.error("Usage: npm run remove-user -- <email>");
  process.exit(1);
}

await mongoose.connect(env.mongoUri);
try {
  const user = await User.findOne({ email });
  if (!user) throw new Error(`No user with e-mail ${email}`);
  const used = (await Appointment.exists({ $or: [{ patient: user._id }, { doctor: user._id }] })) || (await MedicalReport.exists({ $or: [{ patient: user._id }, { doctor: user._id }] }));
  if (used) throw new Error("This account already has appointments or reports - not deleting it.");

  await Promise.all([
    PatientProfile.deleteMany({ user: user._id }),
    DoctorProfile.deleteMany({ user: user._id }),
    Notification.deleteMany({ user: user._id }),
    Prediction.deleteMany({ patient: user._id }),
  ]);
  await User.deleteOne({ _id: user._id });
  console.log(`Removed ${user.role} account ${email}. They can now sign up again (choose patient or doctor).`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
