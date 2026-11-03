import PDFDocument from "pdfkit";

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/**
 * Builds the patient's medical report as a PDF (in memory). Only the built-in Helvetica font is used,
 * so keep the text ASCII / Latin-1 (no rupee sign etc.).
 */
export function buildReportPdf({ report, patient, doctor, specialization, appointment }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Medical Report", Author: `Dr. ${doctor.name}` } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const heading = (t) => doc.moveDown(0.8).font("Helvetica-Bold").fontSize(12).fillColor("#1b1b4b").text(t).moveDown(0.2);
    const body = (t) => doc.font("Helvetica").fontSize(11).fillColor("#222").text(t, { lineGap: 2 });

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#1b1b4b").text("DHANWANTARI");
    doc.font("Helvetica").fontSize(12).fillColor("#555").text("Medical Report");
    doc.moveTo(50, doc.y + 6).lineTo(545, doc.y + 6).strokeColor("#bbb").stroke();
    doc.moveDown(1);

    const row = (k, v) => v && doc.font("Helvetica-Bold").fontSize(11).fillColor("#222").text(`${k}: `, { continued: true }).font("Helvetica").text(v);
    row("Patient", patient.name);
    row("Doctor", `Dr. ${doctor.name}${specialization ? ` (${specialization})` : ""}`);
    row("Session", `${appointment.date}, ${appointment.startTime} - ${appointment.endTime}`);
    row("Report date", fmtDate(report.publishedAt || new Date()));

    if (report.diagnosis) { heading("Diagnosis"); body(report.diagnosis); }
    if (report.observations) { heading("Observations"); body(report.observations); }
    if (report.treatment) { heading("Treatment"); body(report.treatment); }
    if (report.prescription?.length) {
      heading("Prescription");
      report.prescription.forEach((p, i) => {
        const details = [p.dosage, p.frequency, p.duration].filter(Boolean).join(" | ");
        body(`${i + 1}. ${p.medicine}${details ? ` - ${details}` : ""}`);
      });
    }
    if (report.followUpAdvice) { heading("Follow-up advice"); body(report.followUpAdvice); }
    if (report.handwrittenReportName) { heading("Handwritten report"); body(`Attached separately: ${report.handwrittenReportName}`); }

    doc.moveDown(2).font("Helvetica-Oblique").fontSize(9).fillColor("#777").text("Generated electronically by Dhanwantari. This document is confidential and meant only for the patient named above. It supports, and does not replace, a consultation with your doctor.");
    doc.end();
  });
}
