import DoctorAvailability from "../models/DoctorAvailability.js";
import { HttpError } from "../utils/HttpError.js";
import { isValidDate, isValidTime, isPastSlot, todayStr, toMinutes } from "../utils/dates.js";

/** GET /api/availability/me?from=YYYY-MM-DD&to=YYYY-MM-DD (doctor) */
export async function myAvailability(req, res) {
  const from = isValidDate(req.query.from) ? req.query.from : todayStr();
  const to = isValidDate(req.query.to) ? req.query.to : "9999-12-31";
  const availability = await DoctorAvailability.find({ doctor: req.user.id, date: { $gte: from, $lte: to } }).sort({ date: 1 });
  res.json({ availability });
}

/**
 * PUT /api/availability/:date  body: { slots: [{ startTime, endTime }] }
 * Replaces the *unbooked* slots of that day. Booked slots are never touched.
 * Uses atomic $pull/$push so a patient booking at the same moment cannot be overwritten.
 */
export async function setDay(req, res) {
  const { date } = req.params;
  if (!isValidDate(date)) throw new HttpError(400, "Invalid date.");
  if (date < todayStr()) throw new HttpError(400, "You cannot edit availability for a past date.");

  const incoming = Array.isArray(req.body?.slots) ? req.body.slots : [];
  const wanted = new Map();
  for (const s of incoming) {
    if (!isValidTime(s?.startTime) || !isValidTime(s?.endTime)) throw new HttpError(400, "Slots need start and end times in HH:mm format.");
    if (toMinutes(s.endTime) <= toMinutes(s.startTime)) throw new HttpError(400, `Slot ${s.startTime} must end after it starts.`);
    wanted.set(s.startTime, { startTime: s.startTime, endTime: s.endTime });
  }

  const doc = await DoctorAvailability.findOneAndUpdate(
    { doctor: req.user.id, date },
    { $setOnInsert: { doctor: req.user.id, date, slots: [] } },
    { upsert: true, new: true }
  );

  const booked = doc.slots.filter((s) => s.isBooked);
  const bookedStarts = new Set(booked.map((s) => s.startTime));
  const desired = [...wanted.values()].filter((s) => !bookedStarts.has(s.startTime));

  // overlap check across (booked + desired)
  const all = [...booked.map((s) => ({ startTime: s.startTime, endTime: s.endTime })), ...desired].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (let i = 1; i < all.length; i++) {
    if (toMinutes(all[i].startTime) < toMinutes(all[i - 1].endTime)) {
      throw new HttpError(400, `Slots ${all[i - 1].startTime}-${all[i - 1].endTime} and ${all[i].startTime}-${all[i].endTime} overlap.`);
    }
  }
  const past = desired.filter((s) => isPastSlot(date, s.startTime));
  if (past.length) {
    throw new HttpError(400, `These times have already passed: ${past.map((s) => s.startTime).join(", ")}. Pick a later time or another date.`);
  }

  const existingFree = doc.slots.filter((s) => !s.isBooked);
  const desiredStarts = new Set(desired.map((s) => s.startTime));
  const toRemove = existingFree.filter((s) => !desiredStarts.has(s.startTime)).map((s) => s.startTime);
  const existingStarts = new Set(doc.slots.map((s) => s.startTime));
  const toAdd = desired.filter((s) => !existingStarts.has(s.startTime));

  if (toRemove.length) {
    await DoctorAvailability.updateOne({ _id: doc._id }, { $pull: { slots: { isBooked: false, startTime: { $in: toRemove } } } });
  }
  if (toAdd.length) {
    await DoctorAvailability.updateOne(
      { _id: doc._id, "slots.startTime": { $nin: toAdd.map((s) => s.startTime) } },
      { $push: { slots: { $each: toAdd.map((s) => ({ ...s, isBooked: false })), $sort: { startTime: 1 } } } }
    );
  }
  await DoctorAvailability.deleteOne({ _id: doc._id, slots: { $size: 0 } });

  const fresh = await DoctorAvailability.findOne({ doctor: req.user.id, date });
  res.json({ day: fresh || { date, slots: [] } });
}

/** DELETE /api/availability/:date - only when nothing is booked that day. */
export async function clearDay(req, res) {
  const { date } = req.params;
  if (!isValidDate(date)) throw new HttpError(400, "Invalid date.");
  const result = await DoctorAvailability.deleteOne({ doctor: req.user.id, date, slots: { $not: { $elemMatch: { isBooked: true } } } });
  if (!result.deletedCount && (await DoctorAvailability.exists({ doctor: req.user.id, date }))) {
    throw new HttpError(409, "This day has booked appointments. Cancel or complete them first.");
  }
  res.json({ ok: true });
}
