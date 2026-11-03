import { getSession } from "@auth/express";
import { authConfig } from "../config/auth.js";
import User from "../models/User.js";
import { HttpError } from "../utils/HttpError.js";

/**
 * Reads the Auth.js session cookie and sets:
 *   req.user    = { id, role, name, email }   - a person with a finished account
 *   req.pending = { name, email, picture }    - a verified Google identity that has no account yet (onboarding)
 * It never rejects; use requireAuth when an account is mandatory.
 */
export async function softAuth(req, _res, next) {
  try {
    req.user = null;
    req.pending = null;
    const su = (await getSession(req, authConfig))?.user;
    if (su?.id) {
      req.user = { id: su.id, role: su.role, name: su.name, email: su.email };
    } else if (su?.pending && su.email) {
      // Signed in with Google before the account existed. The account may have been created since
      // (onboarding finished), so always resolve it from the database.
      const email = su.email.toLowerCase().trim();
      const u = await User.findOne({ email }).select("name email role isActive");
      if (u) {
        if (u.isActive) req.user = { id: u._id.toString(), role: u.role, name: u.name, email: u.email };
      } else {
        req.pending = { name: su.name || "", email, picture: su.image || "" };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  softAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) return next(new HttpError(401, req.pending ? "Complete your profile to continue." : "Please log in to continue."));
    next();
  });
}

export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(new HttpError(403, "You do not have access to this resource."));
