import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { useApi } from "../../lib/useApi.js";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../../components/ui.jsx";
import { fmtDate, fmtDateTime } from "../../lib/format.js";

export default function Reports() {
  const { data, loading, error, reload } = useApi("/api/reports");
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="stagger">
      <PageHeader title="My reports" subtitle="Reports published by your doctors." />
      {!data.reports.length ? <EmptyState title="No reports yet" hint="When a doctor publishes a report it appears here and in your email." /> : (
        <ul className="space-y-3">
          {data.reports.map((r) => (
            <li key={r._id}>
              <Link to={`/patient/sessions/${r.appointment?._id}`} className="glass flex items-center gap-4 p-4 hover:bg-white/5">
                <FileText className="h-6 w-6 shrink-0 text-lav-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-lav-100">{r.diagnosis || "Handwritten report"}</p>
                  <p className="muted">Dr. {r.doctor?.name} - session on {fmtDate(r.appointment?.date)}</p>
                </div>
                <span className="muted hidden sm:block">{fmtDateTime(r.publishedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
