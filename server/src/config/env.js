import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

if (!process.env.AUTH_SECRET) {
  if (isProd) throw new Error("AUTH_SECRET is required in production");
  console.warn("[env] AUTH_SECRET not set - using an insecure dev fallback.");
}

if (isProd && !process.env.MONGODB_URI) throw new Error("MONGODB_URI is required in production");
if (isProd && !process.env.CLIENT_URL) console.warn("[env] CLIENT_URL is not set - CORS will only allow http://localhost:5173.");
if (isProd && !process.env.AUTH_URL) console.warn("[env] AUTH_URL is not set - set it to https://your-domain/auth so Auth.js builds correct callback URLs.");

export const env = {
  isProd,
  // Number of reverse-proxy hops in front of the app (Render / Railway / Nginx = 1). 0 = none. Needed for correct client IPs (rate limits).
  trustProxy: process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : isProd ? 1 : 0,
  // When true, new doctors are hidden until approved with `npm run verify-doctor -- email`.
  requireDoctorApproval: process.env.REQUIRE_DOCTOR_APPROVAL === "true",
  cspOff: process.env.CSP === "off",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dhanwantari",
  authSecret: process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mlApiUrl: (process.env.ML_API_URL || "http://127.0.0.1:8000").replace(/\/$/, ""),
  mlMock: process.env.ML_MOCK === "true",
  // The report e-mail attaches the report PDF (and the handwritten file). Set MAIL_ATTACH_REPORT=false to send a link only.
  mailAttachReport: process.env.MAIL_ATTACH_REPORT !== "false", // default ON: the PDF report (+ handwritten file) is attached
  uploadsDir: path.resolve(__dirname, "../../uploads"),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "Dhanwantari <no-reply@dhanwantari.local>",
  },
};
