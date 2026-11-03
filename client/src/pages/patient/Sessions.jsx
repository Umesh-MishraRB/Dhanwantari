import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, FileText } from "lucide-react";
import { api } from "../../api/client.js";
import { useApi } from "../../lib/useApi.js";
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, StatusBadge } from "../../components/ui.jsx";
import { fmtDate, fmtTime } from "../../lib/format.js";

const TABS = [["", "All"], ["requested,confirmed", "Upcoming"], ["completed", "Completed"], ["cancelled,rejected", "Cancelled / declined"]];

export default function Sessions() {
  const [tab, setTab] = useState("");
  const { data, loading, error, reload } = useApi(`/api/appointments${tab ? `?status=${tab}` : ""}`);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this session?")) return;
    try {
      await api.patch(`/api/appointments/${id}/status`, { status: "cancelled" });
      reload();
    } catch (e) {
      window.alert(e.message);
    }
  };

  return (
    <div className="stagger">
      <PageHeader title="My sessions" subtitle="Your full session history with doctors." actions={<Link to="/patient/doctors" className="btn-primary">Book a session</Link>} />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => <button key={l} className={`chip ${tab === v ? "chip-active" : ""}`} onClick={() => setTab(v)}>{l}</button>)}
      </div>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.appointments.length ? (
        <EmptyState title="No sessions here" hint="Sessions you request will show up with their status." />
      ) : (
        <ul className="space-y-3">
          {data.appointments.map((a) => (
            <li key={a._id} className="glass flex flex-wrap items-center justify-between gap-4 p-4">
              <Link to={`/patient/sessions/${a._id}`} className="min-w-0 flex-1">
                <p className="font-medium text-lav-100">Dr. {a.doctor?.name} <span className="muted">- {a.doctorProfile?.specialization?.name}</span></p>
                <p className="muted mt-1 flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> {fmtDate(a.date)}, {fmtTime(a.startTime)}</p>
                <p className="mt-1 line-clamp-1 text-sm text-lav-300">{a.reason}</p>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {a.reportStatus === "published" && <Badge tone="low"><FileText className="h-3 w-3" /> report</Badge>}
                <StatusBadge status={a.status} />
                {["requested", "confirmed"].includes(a.status) && <button onClick={() => cancel(a._id)} className="btn-danger btn-sm">Cancel</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
