import { HttpError } from "../utils/HttpError.js";

/**
 * Tiny fixed-window, in-memory rate limiter (no extra dependency).
 * Good enough for one server instance; if you scale to several instances, move the counters to Redis.
 */
export function rateLimit({ windowMs, max, message = "Too many requests. Please try again in a few minutes.", key = (req) => req.ip }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.min(windowMs, 60_000));
  timer.unref();

  return (req, res, next) => {
    const k = String(key(req));
    const now = Date.now();
    let e = hits.get(k);
    if (!e || e.reset <= now) {
      e = { count: 0, reset: now + windowMs };
      hits.set(k, e);
    }
    e.count += 1;
    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - e.count));
    if (e.count > max) {
      res.setHeader("Retry-After", Math.ceil((e.reset - now) / 1000));
      return next(new HttpError(429, message));
    }
    next();
  };
}
