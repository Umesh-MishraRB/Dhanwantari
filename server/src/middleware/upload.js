import multer from "multer";
import path from "node:path";
import { HttpError } from "../utils/HttpError.js";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".bmp"]); // same set the ML API accepts
const QR_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const PROOF_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const REPORT_EXT = new Set([".jpg", ".jpeg", ".png", ".pdf"]);
const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);

export const MAX_PHOTO_MB = 5;
export const MAX_VIDEO_MB = 40;

const checkExt = (allowed, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!allowed.has(ext)) return cb(new HttpError(400, `Unsupported file type. Allowed: ${[...allowed].join(", ")}`));
  cb(null, true);
};

const make = (allowed, maxMb) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => checkExt(allowed, file, cb),
  });

export const uploadScan = make(IMAGE_EXT, 10);
export const uploadReport = make(REPORT_EXT, 10);
export const uploadQr = make(QR_EXT, 5);
export const uploadProof = make(PROOF_EXT, 5);

/** Doctor profile media: one optional photo + one optional intro video in the same request. */
export const uploadDoctorMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024, files: 2 },
  fileFilter(_req, file, cb) {
    if (file.fieldname === "photo") return checkExt(PHOTO_EXT, file, cb);
    if (file.fieldname === "video") return checkExt(VIDEO_EXT, file, cb);
    cb(new HttpError(400, "Unexpected file field."));
  },
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

/** Extension is user-controlled, so also look at the first bytes of the file. */
export function looksLikeVideo(buf) {
  if (!buf || buf.length < 12) return false;
  const isMp4Family = buf.toString("ascii", 4, 8) === "ftyp"; // mp4 / mov / m4v
  const isWebm = buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3; // EBML header
  return isMp4Family || isWebm;
}

export function looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8;
  const png = buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG";
  const webp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return jpg || png || webp;
}
