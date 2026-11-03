import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, ScanSearch } from "lucide-react";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useI18n } from "../../i18n/index.jsx";
import { useApi } from "../../lib/useApi.js";
import { EmptyState, ErrorState, PageHeader, PageLoader, RiskBadge, StatCard, StatusBadge } from "../../components/ui.jsx";
import { fmtDateShort, fmtTime, todayStr, fmtDateTime } from "../../lib/format.js";

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const stats = useApi("/api/stats");
  const appts = useApi(`/api/appointments?status=requested,confirmed&from=${todayStr()}&sort=asc`);
  const preds = useApi("/api/predictions");

  if (stats.loading || appts.loading || preds.loading) return <PageLoader />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;

  return (
    <div className="stagger">
      <PageHeader title={t("dash.hello", { name: user.name.split(" ")[0] })} subtitle={t("dash.sub")} actions={<Link to="/patient/predict" className="btn-primary"><ScanSearch className="h-4 w-4" /> {t("dash.newPred")}</Link>} />

      {profile && !profile.profileCompleted && (
        <Link to="/patient/profile" className="glass mb-6 flex items-center justify-between gap-3 p-4 text-sm hover:bg-white/5">
          <span>Complete your health profile so doctors have the context they need before your session.</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Predictions" value={stats.data.predictions} />
        <StatCard label="Upcoming sessions" value={stats.data.upcoming} />
        <StatCard label="Reports" value={stats.data.reports} />
        <StatCard label="Unread alerts" value={stats.data.unread} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h2">{t("dash.upcoming")}</h2>
            <Link to="/patient/sessions" className="text-xs text-lav-300 hover:text-lav-100">{t("dash.viewAll")}</Link>
          </div>
          {appts.data?.appointments.length ? (
            <ul className="space-y-3">
              {appts.data.appointments.slice(0, 4).map((a) => (
                <li key={a._id}>
                  <Link to={`/patient/sessions/${a._id}`} className="glass flex items-center justify-between gap-3 p-4 hover:bg-white/5">
                    <div>
                      <p className="font-medium text-lav-100">Dr. {a.doctor?.name}</p>
                      <p className="muted flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {fmtDateShort(a.date)}, {fmtTime(a.startTime)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming sessions" hint="Run a prediction to find the right specialist, then book a session." action={<Link to="/patient/doctors" className="btn-ghost btn-sm">Browse doctors</Link>} />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h2">{t("dash.recent")}</h2>
          </div>
          {preds.data?.predictions.length ? (
            <ul className="space-y-3">
              {preds.data.predictions.slice(0, 4).map((p) => (
                <li key={p._id}>
                  <Link to={`/patient/predictions/${p._id}`} className="glass flex items-center gap-3 p-3 hover:bg-white/5">
                    {/* IMAGE: thumbnail of the uploaded scan */}
                    <img src={p.imageUrl} alt="" className="h-14 w-14 rounded-lg bg-ink-900 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-lav-100">{p.displayName}</p>
                      <p className="muted">{fmtDateTime(p.createdAt)}</p>
                    </div>
                    <RiskBadge level={p.riskLevel} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No predictions yet" hint="Upload a scan to get started." action={<Link to="/patient/predict" className="btn-ghost btn-sm">Upload an image</Link>} />
          )}
        </section>
      </div>
    </div>
  );
}
