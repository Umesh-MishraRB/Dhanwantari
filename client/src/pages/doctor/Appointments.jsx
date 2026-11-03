import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { useApi } from "../../lib/useApi.js";
import { Badge, DiagnosisBadge, EmptyState, ErrorState, PageHeader, PageLoader, PriorityBadge, StatusBadge } from "../../components/ui.jsx";
import { fmtDateShort, fmtTime } from "../../lib/format.js";

const STATUS_TABS = [["", "All"], ["requested", "Pending"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled,rejected", "Cancelled / declined"]];
const DIAG_TABS = [["active", "Active diagnosis"], ["completed", "Completed diagnosis"]];
const PRIORITIES = ["", "critical", "high", "medium", "low"];

/** mode="appointments": every appointment by status.  mode="patients": patients grouped by diagnosis status. */
export default function Appointments({ mode = "appointments" }) {
  const patients = mode === "patients";
  const [tab, setTab] = useState(patients ? "active" : "");
  const [priority, setPriority] = useState("");

  const qs = new URLSearchParams();
  if (patients) { qs.set("diagnosisStatus", tab); qs.set("status", "confirmed,completed"); } else if (tab) qs.set("status", tab);
  if (priority) qs.set("priority", priority);
  const { data, loading, error, reload } = useApi(`/api/appointments?${qs}`);

  const tabs = patients ? DIAG_TABS : STATUS_TABS;
  // most urgent first in the patients view
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  const rows = data ? [...data.appointments].sort((a, b) => (patients ? (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) : 0)) : [];

  return (
    <div className="stagger">
      <PageHeader title={patients ? "My patients" : "Appointments"} subtitle={patients ? "Patients under your care, labelled by priority and diagnosis status." : "All session requests and bookings."} />
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map(([v, l]) => <button key={l} className={`chip ${tab === v ? "chip-active" : ""}`} onClick={() => setTab(v)}>{l}</button>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="muted mr-1">Priority:</span>
        {PRIORITIES.map((p) => <button key={p || "any"} className={`chip capitalize ${priority === p ? "chip-active" : ""}`} onClick={() => setPriority(p)}>{p || "any"}</button>)}
      </div>

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !rows.length ? <EmptyState title="Nothing here yet" /> : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a._id}>
              <Link to={`/doctor/appointments/${a._id}`} className="glass flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-white/5">
                <div className="min-w-0">
                  <p className="font-medium text-lav-100">{a.patient?.name}</p>
                  <p className="muted">{fmtDateShort(a.date)}, {fmtTime(a.startTime)}</p>
                  <p className="line-clamp-1 text-sm text-lav-300">{a.reason}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {a.prediction && <Badge tone={a.prediction.riskLevel}>{a.prediction.displayName}</Badge>}
                  {a.reportStatus && <Badge tone={a.reportStatus === "published" ? "low" : "neutral"}><FileText className="h-3 w-3" /> {a.reportStatus}</Badge>}
                  <PriorityBadge priority={a.priority} />
                  {patients ? <DiagnosisBadge status={a.diagnosisStatus} /> : <StatusBadge status={a.status} />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
