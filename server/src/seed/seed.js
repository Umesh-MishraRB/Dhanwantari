import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import Specialization from "../models/Specialization.js";
import DoctorAvailability from "../models/DoctorAvailability.js";
import Blog from "../models/Blog.js";
import { specializations, doctors, demoPatient, DOCTOR_PASSWORD, blogs } from "./data.js";
import { todayStr, addDays } from "../utils/dates.js";

const RESET = process.argv.includes("--reset");

function daySlots() {
  const out = [];
  const add = (startH, endH) => {
    for (let m = startH * 60; m < endH * 60; m += 30) {
      const f = (x) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
      out.push({ startTime: f(m), endTime: f(m + 30), isBooked: false });
    }
  };
  add(10, 13);
  add(16, 18);
  return out;
}

async function main() {
  await connectDB();
  if (RESET) {
    console.log("[seed] --reset: dropping all collections");
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  }

  const specMap = {};
  for (const s of specializations) {
    specMap[s.slug] = await Specialization.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
  }

  for (const b of blogs) await Blog.findOneAndUpdate({ slug: b.slug }, b, { upsert: true });

  const hash = await bcrypt.hash(DOCTOR_PASSWORD, 10);
  const today = todayStr();
  for (const d of doctors) {
    let user = await User.findOne({ email: d.email });
    if (!user) {
      user = await User.create({ name: d.name, email: d.email, passwordHash: hash, role: "doctor" });
      await DoctorProfile.create({
        user: user._id,
        specialization: specMap[d.spec]._id,
        qualifications: d.qualifications,
        experienceYears: d.exp,
        licenseNumber: `DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
        clinicName: d.clinic,
        city: d.city,
        bio: d.bio,
        languages: d.languages,
      });
    }
    // 14 days of availability, Sundays off
    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i);
      if (new Date(`${date}T00:00:00`).getDay() === 0) continue;
      await DoctorAvailability.updateOne({ doctor: user._id, date }, { $setOnInsert: { doctor: user._id, date, slots: daySlots() } }, { upsert: true });
    }
  }

  if (!(await User.exists({ email: demoPatient.email }))) {
    const u = await User.create({ name: demoPatient.name, email: demoPatient.email, passwordHash: await bcrypt.hash(demoPatient.password, 10), role: "patient" });
    await PatientProfile.create({ user: u._id });
  }

  console.log(`[seed] done: ${specializations.length} specializations, ${doctors.length} doctors, ${blogs.length} blogs`);
  console.log(`[seed] demo patient  -> ${demoPatient.email} / ${demoPatient.password}`);
  console.log(`[seed] demo doctors  -> e.g. ${doctors[0].email} / ${DOCTOR_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
