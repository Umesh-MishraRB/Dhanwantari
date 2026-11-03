import Notification from "../models/Notification.js";
import { HttpError } from "../utils/HttpError.js";

export async function listNotifications(req, res) {
  const filter = { user: req.user.id };
  if (req.query.unread === "true") filter.isRead = false;
  const [notifications, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(100),
    Notification.countDocuments({ user: req.user.id, isRead: false }),
  ]);
  res.json({ notifications, unread });
}

export async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { isRead: true, readAt: new Date() }, { new: true });
  if (!n) throw new HttpError(404, "Notification not found.");
  res.json({ notification: n });
}

export async function markAllRead(req, res) {
  await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ ok: true });
}
