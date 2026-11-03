import DoctorProfile from "../models/DoctorProfile.js";
import DoctorAvailability from "../models/DoctorAvailability.js";
import Specialization from "../models/Specialization.js";
import { HttpError } from "../utils/HttpError.js";
import { todayStr, addDays, isPastSlot } from "../utils/dates.js";

export async function listSpecializations(_req, res) {
  const specializations = await Specialization.find().sort({ name: 1 });
  res.json({ specializations });
}

const freeSlots = (day) => day.slots.filter((s) => !s.isBooked && !isPastSlot(day.date, s.startTime));

/**
 * Verified doctors, optionally filtered by specialization / search text, each with their next open slot.
 * Doctors who can be seen soonest come first, then the most experienced.
 */
export async function findDoctors({ specializationId, q, limit = 100 } = {}) {
  const filter = { isVerified: true };
  if (specializationId) filter.specialization = specializationId;

  let doctors = await DoctorProfile.find(filter)
    .select("-paymentQrUrl")
    .populate("user", "name avatarUrl")
    .populate("specialization", "name slug")
    .limit(200)
    .lean();
  doctors = doctors.filter((d) => d.user); // skip profiles whose user was deleted

  if (q) {
    const needle = String(q).toLowerCase();
    doctors = doctors.filter((d) => [d.user?.name, d.clinicName, d.city].some((v) => v?.toLowerCase().includes(needle)));
  }

  const days = await DoctorAvailability.find({
    doctor: { $in: doctors.map((d) => d.user._id) },
    date: { $gte: todayStr() },
    slots: { $elemMatch: { isBooked: false } },
  })
    .sort({ date: 1 })
    .lean();

  const next = new Map();
  for (const day of days) {
    const key = String(day.doctor);
    if (next.has(key)) continue;
    const free = freeSlots(day);
    if (free.length) next.set(key, { date: day.date, startTime: free[0].startTime });
  }

  const withNext = doctors.map((d) => ({ ...d, nextAvailable: next.get(String(d.user._id)) || null }));
  const key = (d) => (d.nextAvailable ? `${d.nextAvailable.date}T${d.nextAvailable.startTime}` : "9999");
  withNext.sort((a, b) => key(a).localeCompare(key(b)) || (b.experienceYears || 0) - (a.experienceYears || 0));
  return withNext.slice(0, limit);
}

/**
 * Doctors to suggest right after a prediction. If nobody practises the suggested specialization yet,
 * fall back to General Medicine (and say so) so the patient is never left with an empty list.
 */
export async function suggestDoctorsFor(specializationId, limit = 3) {
  let doctors = await findDoctors({ specializationId, limit });
  let fallback = false;
  if (!doctors.length) {
    const general = await Specialization.findOne({ slug: "general-medicine" });
    if (general && String(general._id) !== String(specializationId)) {
      doctors = await findDoctors({ specializationId: general._id, limit });
      fallback = doctors.length > 0;
    }
  }
  return { doctors, fallback };
}

/** GET /api/doctors?specialization=<slug>&q=<text> */
export async function listDoctors(req, res) {
  const { specialization: slug, q } = req.query;
  let specialization = null;
  if (slug) {
    specialization = await Specialization.findOne({ slug: String(slug).toLowerCase() });
    if (!specialization) return res.json({ doctors: [], specialization: null });
  }
  const doctors = await findDoctors({ specializationId: specialization?._id, q });
  res.json({ specialization, doctors });
}

export async function getDoctor(req, res) {
  const doctor = await DoctorProfile.findById(req.params.id).populate("user", "name avatarUrl").populate("specialization", "name slug description");
  if (!doctor || !doctor.isVerified) throw new HttpError(404, "Doctor not found.");
  res.json({ doctor });
}

/** GET /api/doctors/:id/availability - only future, unbooked slots for the next 30 days. */
export async function getDoctorAvailability(req, res) {
  const doctor = await DoctorProfile.findById(req.params.id);
  if (!doctor) throw new HttpError(404, "Doctor not found.");
  const from = todayStr();
  const days = await DoctorAvailability.find({ doctor: doctor.user, date: { $gte: from, $lte: addDays(from, 30) } }).sort({ date: 1 }).lean();
  const availability = days
    .map((d) => ({ date: d.date, slots: freeSlots(d).map((s) => ({ startTime: s.startTime, endTime: s.endTime })) }))
    .filter((d) => d.slots.length);
  res.json({ availability });
}
