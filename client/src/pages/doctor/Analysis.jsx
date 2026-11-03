import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock, Check, ChevronLeft, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api/client.js";
import { useApi } from "../../lib/useApi.js";
import { DiagnosisBadge, EmptyState, ErrorState, Field, FormError, FormNotice, PageLoader, PaymentBadge, PriorityBadge, Spinner, StatusBadge } from "../../components/ui.jsx";
import PredictionResult from "../../components/PredictionResult.jsx";
import { ageFrom, fmtDate, fmtTime } from "../../lib/format.js";

const PRIORITIES = ["low", "medium", "high", "critical"];
const emptyRx = () => ({ medicine: "", dosage: "", frequency: "", duration: "" });

export default function Analysis() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/api/appointments/${id}`);
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ error: "", ok: "" });

  useEffect(() => {
    if (!data) return;
    const r = data.report;
    setForm({
      diagnosis: r?.diagnosis || "", observations: r?.observations || "", treatment: r?.treatment || "", followUpAdvice: r?.followUpAdvice || "",
      prescription: r?.prescription?.length ? r.prescription.map((p) => ({ ...p })) : [emptyRx()],
    });
  }, [data]);

  if (loading || !form) return error ? <ErrorState message={error} onRetry={reload} /> : <PageLoader />;
  const { appointment: a, report, patientProfile: pp } = data;
  const canWrite = ["confirmed", "completed"].includes(a.status);
  const needsPayment = a.fee > 0 && a.payment?.status !== "verified";
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const setRx = (i, k) => (e) => setForm((s) => ({ ...s, prescription: s.prescription.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)) }));

  const run = async (key, fn) => {
    setBusy(key); setMsg({ error: "", ok: "" });
    try { await fn(); } catch (e) { setMsg({ error: e.message, ok: "" }); } finally { setBusy(""); }
  };
  const setStatus = (status) => run(status, async () => { await api.patch(`/api/appointments/${id}/status`, { status }); reload(); });
  const payStatus = (status) => run("pay", async () => { await api.patch(`/api/appointments/${id}/payment`, { status }); reload(); });
  const triage = (body) => run("triage", async () => { await api.patch(`/api/appointments/${id}/triage`, body); reload(); });

  const saveReport = (publish) => run(publish ? "publish" : "draft", async () => {
    const fd = new FormData();
    ["diagnosis", "observations", "treatment", "followUpAdvice"].forEach((k) => fd.append(k, form[k]));
    fd.append("prescription", JSON.stringify(form.prescription));
    fd.append("publish", String(publish));
    if (file) fd.append("handwritten", file);
    await api.put(`/api/appointments/${id}/report`, fd);
    setFile(null);
    setMsg({ error: "", ok: publish ? "Report published. The patient was notified and emailed (if email is configured)." : "Draft saved." });
    reload();
  });

  return (
    <div className="stagger space-y-6">
      <Link to="/doctor/appointments" className="inline-flex items-center gap-1 text-sm text-lav-300 hover:text-white"><ChevronLeft className="h-4 w-4" /> Appointments</Link>

      <section className="glass p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* IMAGE: patient avatar - replace /public/images/avatar-placeholder.svg */}
            <img src="/images/avatar-placeholder.svg" alt="" className="h-14 w-14 rounded-2xl" />
            <div>
              <h1 className="h1">{a.patient.name}</h1>
              <p className="muted flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> {fmtDate(a.date)}, {fmtTime(a.startTime)} - {fmtTime(a.endTime)} - {a.mode === "online" ? "Online" : "In person"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={a.status} /><PriorityBadge priority={a.priority} /><DiagnosisBadge status={a.diagnosisStatus} /></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {a.status === "requested" && <>
            <button className="btn-accent btn-sm" disabled={!!busy || needsPayment} title={needsPayment ? "Verify the payment first" : "Accept"} onClick={() => setStatus("confirmed")}><Check className="h-4 w-4" /> Accept</button>
            <button className="btn-danger btn-sm" disabled={!!busy} onClick={() => setStatus("rejected")}><X className="h-4 w-4" /> Decline</button>
          </>}
          {a.status === "confirmed" && <>
            <button className="btn-accent btn-sm" disabled={!!busy} onClick={() => setStatus("completed")}>Mark session completed</button>
            <button className="btn-danger btn-sm" disabled={!!busy} onClick={() => window.confirm("Cancel this session?") && setStatus("cancelled")}>Cancel session</button>
          </>}
        </div>

        {a.fee > 0 && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-lav-100">Payment: ₹{a.fee}</p>
              <PaymentBadge status={a.payment?.status} />
            </div>
            <p className="muted mt-2 text-sm">
              UPI reference (UTR): <span className="font-mono text-lav-100">{a.payment?.utr || "-"}</span>
              {a.payment?.screenshotUrl && <> - <a href={a.payment.screenshotUrl} target="_blank" rel="noreferrer" className="underline">view screenshot</a></>}
            </p>
            <p className="muted mt-1 text-xs">Check this reference and the amount in your UPI / bank app before confirming.</p>
            {!["rejected", "cancelled"].includes(a.status) && a.payment?.status !== "verified" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-accent btn-sm" disabled={!!busy} onClick={() => payStatus("verified")}><Check className="h-4 w-4" /> Payment received</button>
                {a.payment?.status !== "rejected" && <button className="btn-danger btn-sm" disabled={!!busy} onClick={() => payStatus("rejected")}><X className="h-4 w-4" /> Not received</button>}
              </div>
            )}
          </div>
        )}
        <FormError>{msg.error}</FormError>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass space-y-4 p-6 text-sm lg:col-span-1">
          <h2 className="h2">Patient & request</h2>
          <dl className="space-y-3">
            {[["Reason", a.reason], ["Symptoms", a.symptoms?.join(", ")], ["Since", a.symptomDuration], ["Self-rated severity", a.severity], ["Medicines", a.currentMedications], ["Allergies", a.allergies], ["Notes", a.additionalNotes]].map(([k, v]) => v ? <div key={k}><dt className="label">{k}</dt><dd className="text-lav-100">{v}</dd></div> : null)}
          </dl>
          {pp && <div className="border-t border-white/10 pt-4">
            <p className="label">Health profile</p>
            <ul className="space-y-1 text-lav-200">
              {pp.dateOfBirth && <li>Age: {ageFrom(pp.dateOfBirth)}</li>}
              {pp.gender && <li className="capitalize">Gender: {pp.gender.replace(/_/g, " ")}</li>}
              {pp.bloodGroup && <li>Blood group: {pp.bloodGroup}</li>}
              {pp.heightCm && <li>Height: {pp.heightCm} cm{pp.weightKg ? `, weight ${pp.weightKg} kg` : ""}</li>}
              {pp.chronicConditions?.length > 0 && <li>Long-term conditions: {pp.chronicConditions.join(", ")}</li>}
              {pp.phone && <li>Phone: {pp.phone}</li>}
            </ul>
          </div>}

          <div className="border-t border-white/10 pt-4">
            <p className="label">Priority</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => <button key={p} disabled={busy === "triage"} onClick={() => triage({ priority: a.priority === p ? null : p })} className={`chip capitalize ${a.priority === p ? "chip-active" : ""}`}>{p}</button>)}
            </div>
            <p className="label mt-4">Diagnosis status</p>
            <div className="flex gap-2">
              {["active", "completed"].map((s) => <button key={s} disabled={busy === "triage"} onClick={() => triage({ diagnosisStatus: s })} className={`chip capitalize ${a.diagnosisStatus === s ? "chip-active" : ""}`}>{s}</button>)}
            </div>
          </div>
        </section>

        <section className="space-y-3 lg:col-span-2">
          <h2 className="h2">AI analysis</h2>
          {a.prediction ? <PredictionResult prediction={a.prediction} /> : <EmptyState title="No prediction attached" hint="The patient did not share a model prediction for this session." />}
        </section>
      </div>

      <section className="glass space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h2">Diagnosis & medical report</h2>
          {report && <span className="muted">Status: <b className="text-lav-100">{report.status}</b>{report.status === "published" && ` - email: ${report.emailStatus.replace("_", " ")}`}</span>}
        </div>
        {!canWrite ? <p className="muted">Accept the appointment to start writing the report.</p> : (
          <>
            <Field label="Final diagnosis"><textarea rows={2} className="input" value={form.diagnosis} onChange={set("diagnosis")} /></Field>
            <Field label="Doctor's observations"><textarea rows={3} className="input" value={form.observations} onChange={set("observations")} placeholder="What you noticed in the image / Grad-CAM and during the session" /></Field>
            <Field label="Treatment plan"><textarea rows={3} className="input" value={form.treatment} onChange={set("treatment")} /></Field>

            <div>
              <p className="label">Prescription</p>
              <div className="space-y-2">
                {form.prescription.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                    <input className="input col-span-2 sm:col-span-1" placeholder="Medicine" value={p.medicine} onChange={setRx(i, "medicine")} />
                    <input className="input" placeholder="Dosage" value={p.dosage} onChange={setRx(i, "dosage")} />
                    <input className="input" placeholder="Frequency" value={p.frequency} onChange={setRx(i, "frequency")} />
                    <input className="input" placeholder="Duration" value={p.duration} onChange={setRx(i, "duration")} />
                    <button type="button" className="btn-danger btn-sm" aria-label="Remove medicine" onClick={() => setForm((s) => ({ ...s, prescription: s.prescription.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setForm((s) => ({ ...s, prescription: [...s.prescription, emptyRx()] }))}><Plus className="h-4 w-4" /> Add medicine</button>
            </div>

            <Field label="Follow-up advice"><textarea rows={2} className="input" value={form.followUpAdvice} onChange={set("followUpAdvice")} /></Field>

            <Field label="Handwritten report (photo or PDF)" hint={report?.handwrittenReportUrl ? `Current file: ${report.handwrittenReportName || "uploaded"} - choose a new file to replace it.` : "JPG, PNG or PDF, up to 10 MB"}>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="input file:mr-3 file:rounded-full file:border-0 file:bg-lav-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink-900" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Field>
            {report?.handwrittenReportUrl && /\.(png|jpe?g)$/i.test(report.handwrittenReportUrl) && (
              // IMAGE: handwritten report preview (URL stored in MongoDB)
              <img src={report.handwrittenReportUrl} alt="Handwritten report" className="max-h-72 rounded-xl border border-white/10 bg-white object-contain" />
            )}

            <FormNotice>{msg.ok}</FormNotice>
            <div className="flex flex-wrap gap-3">
              <button className="btn-ghost" disabled={!!busy} onClick={() => saveReport(false)}>{busy === "draft" && <Spinner />} Save draft</button>
              <button className="btn-primary" disabled={!!busy} onClick={() => saveReport(true)}>{busy === "publish" && <Spinner />} {report?.status === "published" ? "Update published report" : "Publish & send to patient"}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
