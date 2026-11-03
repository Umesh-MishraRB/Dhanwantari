import { Download, FileText } from "lucide-react";
import { fmtDateTime } from "../lib/format.js";

const isImage = (u = "") => /\.(png|jpe?g)$/i.test(u);

/** Read-only medical report card (patient view). */
export default function ReportView({ report }) {
  return (
    <section className="glass space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h2 className="h2 flex items-center gap-2"><FileText className="h-5 w-5" /> Medical report</h2>
        {report.publishedAt && <span className="muted">Published {fmtDateTime(report.publishedAt)}</span>}
      </div>
      {[["Diagnosis", report.diagnosis], ["Observations", report.observations], ["Treatment", report.treatment], ["Follow-up advice", report.followUpAdvice]].map(([t, v]) =>
        v ? <div key={t}><p className="label">{t}</p><p className="whitespace-pre-wrap text-sm text-lav-100">{v}</p></div> : null
      )}
      {report.prescription?.length > 0 && (
        <div>
          <p className="label">Prescription</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-lav-400"><tr><th className="py-1 pr-4">Medicine</th><th className="pr-4">Dosage</th><th className="pr-4">Frequency</th><th>Duration</th></tr></thead>
              <tbody>{report.prescription.map((p, i) => <tr key={i} className="border-t border-white/10"><td className="py-2 pr-4 text-lav-100">{p.medicine}</td><td className="pr-4">{p.dosage}</td><td className="pr-4">{p.frequency}</td><td>{p.duration}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
      {report.handwrittenReportUrl && (
        <div>
          <p className="label">Handwritten report</p>
          {isImage(report.handwrittenReportUrl) && (
            // IMAGE: doctor's handwritten report (URL stored in MongoDB)
            <img src={report.handwrittenReportUrl} alt="Handwritten report from your doctor" className="mb-3 max-h-[480px] rounded-xl border border-white/10 bg-white object-contain" />
          )}
          <a href={report.handwrittenReportUrl} target="_blank" rel="noreferrer" download className="btn-ghost btn-sm"><Download className="h-3.5 w-3.5" /> {report.handwrittenReportName || "Download"}</a>
        </div>
      )}
      <p className="text-xs text-lav-400">This report is for you and your treating doctor. Follow your doctor's instructions and seek urgent care if symptoms worsen.</p>
    </section>
  );
}
