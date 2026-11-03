import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * File storage abstraction. Today: local disk under /uploads, returned as a relative URL.
 * To move to S3 / Cloudinary / GCS, re-implement save() and absolutePath() only -
 * MongoDB keeps just the URL, as the project plan requires.
 */
export async function save(buffer, { folder, originalName = "", ext } = {}) {
  const extension = (ext || path.extname(originalName) || ".bin").toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const dir = path.join(env.uploadsDir, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${folder}/${filename}`, name: originalName || filename };
}

/** Absolute path of a stored file (used for e-mail attachments). Returns null if unsafe. */
export function absolutePath(url) {
  if (!url?.startsWith("/uploads/")) return null;
  const full = path.resolve(env.uploadsDir, url.replace("/uploads/", ""));
  return full.startsWith(env.uploadsDir) ? full : null;
}

/** Deletes a stored file (best effort - never throws). Used when a doctor replaces their photo / intro video. */
export async function remove(url) {
  const full = absolutePath(url);
  if (!full) return;
  await fs.unlink(full).catch(() => {});
}
