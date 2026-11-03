import nodemailer from "nodemailer";
import fs from "node:fs";
import { env } from "../config/env.js";
import { absolutePath } from "./storage.js";

let transporter = null;
const isConfigured = () => Boolean(env.smtp.host && env.smtp.user);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      family: 4, // force IPv4: a cold IPv6 attempt to the SMTP host can hang/fail the very first send
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 60_000, // report mails carry attachments
    });
  }
  return transporter;
}

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const PRIVACY_NOTE = "For your privacy this e-mail contains no medical details. Log in to the app to view them.";
const wrap = (inner, note = PRIVACY_NOTE) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;line-height:1.5">
    ${inner}
    <p style="color:#666;font-size:12px;margin-top:24px">${note}</p>
  </div>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Opens the SMTP connection once at start-up so the first real mail does not pay the cold-start cost. */
export async function warmUpMailer() {
  if (!isConfigured()) return;
  try {
    await getTransporter().verify();
    console.log("[mail] SMTP ready");
  } catch (err) {
    console.error("[mail] SMTP verify failed:", err.message);
    transporter = null;
  }
}

// Retries transient failures (timeouts, resets, 4xx) with a fresh transporter, so one bad first attempt does not lose the mail.
async function send(message, attempts = 3) {
  if (!isConfigured()) {
    console.log("[mail] SMTP not configured - skipping e-mail");
    return "skipped";
  }
  for (let i = 1; i <= attempts; i++) {
    try {
      await getTransporter().sendMail({ from: env.smtp.from, ...message });
      return "sent";
    } catch (err) {
      console.error(`[mail] attempt ${i}/${attempts} to ${message.to} failed:`, err.message);
      transporter = null; // drop a possibly broken connection/transporter
      const permanent = err.responseCode >= 500 && err.responseCode < 600;
      if (permanent || i === attempts) return "failed";
      await sleep(1500 * i);
    }
  }
  return "failed";
}

/**
 * "Your report is ready" e-mail. The body has no medical details (who/when + a link); the report itself
 * travels as an attachment (PDF + the handwritten file) unless MAIL_ATTACH_REPORT=false. Returns "sent" | "skipped" | "failed". Never blocks the report flow.
 */
export async function sendReportEmail({ to, patientName, doctorName, report, appointment, pdf }) {
  const link = `${env.clientUrl}/patient/sessions/${appointment._id}`;
  const attachments = [];
  if (env.mailAttachReport) {
    if (pdf) attachments.push({ filename: `Medical-Report-${appointment.date}.pdf`, content: pdf, contentType: "application/pdf" });
    const file = absolutePath(report.handwrittenReportUrl);
    if (file && fs.existsSync(file)) attachments.push({ filename: report.handwrittenReportName || "handwritten-report", path: file });
  }
  return send({
    to,
    subject: "Your medical report is ready",
    html: wrap(`
      <h2>Hello ${esc(patientName)},</h2>
      <p>Dr. ${esc(doctorName)} has published a report for your session on ${esc(appointment.date)} at ${esc(appointment.startTime)}.</p>
      ${attachments.length ? "<p>Your report is attached to this e-mail.</p>" : ""}
      <p><a href="${link}">Log in to view your report</a></p>`,
      attachments.length ? "This e-mail attaches your medical report. It is confidential - please do not forward it." : PRIVACY_NOTE
    ),
    attachments,
  });
}

/** Session confirmed notice: doctor, date, time and mode only - no reason, symptoms or other details. */
export async function sendSessionConfirmedEmail({ to, patientName, doctorName, appointment }) {
  const link = `${env.clientUrl}/patient/sessions/${appointment._id}`;
  return send({
    to,
    subject: "Your session is confirmed",
    html: wrap(`
      <h2>Hello ${esc(patientName)},</h2>
      <p>Dr. ${esc(doctorName)} has confirmed your session.</p>
      <p><b>Date:</b> ${esc(appointment.date)}<br/><b>Time:</b> ${esc(appointment.startTime)} - ${esc(appointment.endTime)}<br/><b>Type:</b> ${appointment.mode === "online" ? "Online" : "In person"}</p>
      <p><a href="${link}">View your session</a></p>`),
  });
}

/** Doctor-side copy of an in-app notification (new request, cancellation, ...). No medical details. */
export async function sendDoctorNotificationEmail({ to, doctorName, title, message, link }) {
  const url = link ? `${env.clientUrl}${link}` : env.clientUrl;
  return send({
    to,
    subject: title,
    html: wrap(
      `<h2>Hello Dr. ${esc(doctorName)},</h2>
      <p>${esc(message)}</p>
      <p><a href="${url}">Open in Dhanwantari</a></p>`,
      "You receive this e-mail because you are registered as a doctor on Dhanwantari. It contains no medical details."
    ),
  });
}
