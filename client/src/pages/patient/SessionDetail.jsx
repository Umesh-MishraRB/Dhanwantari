import { Link, useLocation, useParams } from "react-router-dom";
import { CalendarClock, CheckCircle2, ChevronLeft, Video, Building2 } from "lucide-react";
import { api } from "../../api/client.js";
import { useApi } from "../../lib/useApi.js";
import { DiagnosisBadge, ErrorState, PageLoader, PaymentBadge, StatusBadge } from "../../components/ui.jsx";
import PredictionResult from "../../components/PredictionResult.jsx";
import ReportView from "../ReportView.jsx";
import { fmtDate, fmtTime } from "../../lib/format.js";

export default function SessionDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const { data, loading, error, reload } = useApi(`/api/appointments/${id}`);
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { appointment: a, report } = data;

  const cancel = async () => {
    if (!window.confirm("Cancel this session?")) return;
    try { await api.patch(`/api/appointments/${id}/status`, { status: "cancelled" }); reload(); } catch (e) { window.alert(e.message); }
  };

  return (
    <div className="stagger space-y-6">
      <Link to="/patient/sessions" className="inline-flex items-center gap-1 text-sm text-lav-300 hover:text-white"><ChevronLeft className="h-4 w-4" /> All sessions</Link>

      {state?.justBooked && (
        <div className="glass flex items-center gap-3 border-emerald-400/30 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> Your request was sent. You will be notified when Dr. {a.doctor.name} confirms the session.
        </div>
      )}

      <section className="glass p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h1">Dr. {a.doctor.name}</h1>
            <p className="mt-1 text-brand-400">{a.doctorProfile?.specialization?.name}</p>
          </div>
          <div className="flex gap-2"><StatusBadge status={a.status} /><DiagnosisBadge status={a.diagnosisStatus} /></div>
        </div>
        <div className="muted mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> {fmtDate(a.date)}, {fmtTime(a.startTime)} - {fmtTime(a.endTime)}</span>
          <span className="flex items-center gap-1.5">{a.mode === "online" ? <Video className="h-4 w-4" /> : <Building2 className="h-4 w-4" />} {a.mode === "online" ? "Online" : "In person"}</span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          {[["Reason", a.reason], ["Symptoms", a.symptoms?.join(", ")], ["Since", a.symptomDuration], ["Severity", a.severity], ["Medicines", a.currentMedications], ["Allergies", a.allergies], ["Notes", a.additionalNotes]].map(([k, v]) => v ? <div key={k}><dt className="label">{k}</dt><dd className="text-lav-100">{v}</dd></div> : null)}
        </dl>
        {a.fee > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <span className="font-medium text-lav-100">Paid ₹{a.fee}</span>
            <PaymentBadge status={a.payment?.status} />
            <span className="muted">Ref: <span className="font-mono">{a.payment?.utr}</span></span>
            {a.payment?.status === "submitted" && <span className="text-xs text-lav-400">Waiting for the doctor to verify your payment.</span>}
            {a.payment?.status === "rejected" && <span className="text-xs text-amber-200">The doctor could not find this payment. Check the reference or contact the doctor.</span>}
          </div>
        )}
        {["requested", "confirmed"].includes(a.status) && <button onClick={cancel} className="btn-danger btn-sm mt-5">Cancel session</button>}
      </section>

      {report ? <ReportView report={report} /> : a.status !== "rejected" && a.status !== "cancelled" && (
        <p className="glass-soft p-4 text-sm text-lav-300">Your report will appear here once your doctor publishes it.</p>
      )}

      {a.prediction && (
        <section>
          <h2 className="h2 mb-3">Shared prediction</h2>
          <PredictionResult prediction={a.prediction} compact />
        </section>
      )}
    </div>
  );
}
