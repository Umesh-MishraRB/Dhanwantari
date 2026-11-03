import multer from "multer";
import { HttpError } from "../utils/HttpError.js";

export function notFound(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || "Something went wrong";

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "That file is too large. Images: up to 10 MB, intro video: up to 40 MB." : err.message;
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(" ");
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid identifier.";
  } else if (err.code === 11000) {
    status = 409;
    message = "That record already exists.";
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}
