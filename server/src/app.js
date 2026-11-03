import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { ExpressAuth } from "@auth/express";

import { env } from "./config/env.js";
import { authConfig } from "./config/auth.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { uploadsRouter } from "./middleware/uploadGuard.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");

  // Content-Security-Policy is only enforced in production, where Express serves the built React app itself.
  const csp = env.isProd && !env.cspOff
    ? {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com"],
          mediaSrc: ["'self'", "blob:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      }
    : false;
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: csp }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  if (!env.isProd) app.use(morgan("dev"));

  // Brute-force protection for password login (must sit before Auth.js).
  app.post(
    "/auth/callback/credentials",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: "Too many login attempts. Please wait a few minutes and try again." })
  );
  // Auth.js must be mounted BEFORE the body parsers (it reads the raw request itself).
  app.use("/auth/*", ExpressAuth(authConfig));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  fs.mkdirSync(env.uploadsDir, { recursive: true });
  app.use("/uploads", uploadsRouter()); // access-controlled (see middleware/uploadGuard.js)

  app.use("/api", routes);
  app.use("/api", notFound);

  // Production: serve the built React app from the same origin (cookies "just work").
  const clientDist = path.resolve(env.uploadsDir, "../../client/dist");
  if (env.isProd && fs.existsSync(clientDist)) {
    app.use("/assets", express.static(path.join(clientDist, "assets"), { immutable: true, maxAge: "1y" }));
    app.use(express.static(clientDist, { maxAge: "1h" }));
    app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
