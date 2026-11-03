// Approve (or suspend) a doctor when REQUIRE_DOCTOR_APPROVAL=true.
//   npm run verify-doctor -- doctor@example.com          -> approve
//   npm run verify-doctor -- doctor@example.com --revoke -> hide again
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import DoctorProfile from "../models/DoctorProfile.js";

const email = process.argv[2]?.toLowerCase().trim();
const revoke = process.argv.includes("--revoke");
if (!email || email.startsWith("--")) {
  console.error("Usage: npm run verify-doctor -- doctor@example.com [--revoke]");
  process.exit(1);
}
await connectDB();
const user = await User.findOne({ email, role: "doctor" });
if (!user) {
  console.error(`No doctor account for ${email}`);
} else {
  await DoctorProfile.updateOne({ user: user._id }, { isVerified: !revoke });
  console.log(`${user.name} is now ${revoke ? "hidden from patients" : "verified and listed"}.`);
}
await mongoose.disconnect();
