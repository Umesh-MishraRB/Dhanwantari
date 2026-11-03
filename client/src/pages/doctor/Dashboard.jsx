import { Link } from "react-router-dom";
import { Briefcase, Check, GraduationCap, MapPin, X } from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useI18n } from "../../i18n/index.jsx";
import { useApi } from "../../lib/useApi.js";
import { EmptyState, ErrorState, PageHeader, PageLoader, PaymentBadge, PriorityBadge, StatCard, StatusBadge } from "../../components/ui.jsx";
import DoctorPaymentCard from "../../components/DoctorPaymentCard.jsx";
import { fmtDateShort, fmtTime } from "../../lib/format.js";

export default function DoctorDashboard() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const stats = useApi("/api/stats");
  const today = useApi("/api/appointments?today=true&status=requested,confirmed&sort=asc");
  const pending = useApi("/api/appointments?status=requested&sort=asc");

  if (stats.loading || today.loading || pending.loading) return <PageLoader />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;

  const act = async (id, status) => {
    try { await api.patch(`/api/appointments/${id}/status`, { status }); stats.reload(); today.reload(); pending.reload(); } catch (e) { window.alert(e.message); }
  };

  return (
    <div className="stagger">
      <PageHeader title={t("dash.welcome", { name: user.name })} subtitle="Your schedule and patients at a glance." actions={<Link to="/doctor/calendar" className="btn-primary">Manage calendar</Link>} />
      {profile && (
        <section className="glass mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            {/* IMAGE: doctor photo (doctorProfiles.photoUrl) */}
            <img src={profile.photoUrl || "/images/doctor-placeholder.svg"} alt="" className="h-16 w-16 rounded-2xl bg-ink-900 object-cover" />
            <div>
              <p className="text-lg font-medium text-lav-100">{profile.specialization?.name || "Specialization not set"}</p>
              <div className="muted mt-1 flex flex-wrap gap-x-5 gap-y-1">
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {profile.experienceYears ?? 0} years experience</span>
                {profile.qualifications?.length > 0 && <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {profile.qualifications.join(", ")}</span>}
                {(profile.clinicName || profile.city) && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {[profile.clinicName, profile.city].filter(Boolean).join(", ")}</span>}
              </div>
            </div>
          </div>
          <Link to="/doctor/profile" className="btn-ghost btn-sm">Edit profile</Link>
        </section>
      )}

      <DoctorPaymentCard />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={stats.data.today} />
        <StatCard label="Pending requests" value={stats.data.pending} tone={stats.data.pending ? "text-amber-200" : ""} />
        <StatCard label="Active patients" value={stats.data.active} />
        <StatCard label="High / critical" value={stats.data.critical} tone={stats.data.critical ? "text-red-300" : ""} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="h2 mb-3">Today's appointments</h2>
          {!today.data?.appointments.length ? <EmptyState title="Nothing scheduled today" /> : (
            <ul className="space-y-3">
              {today.data.appointments.map((a) => (
                <li key={a._id}>
                  <Link to={`/doctor/appointments/${a._id}`} className="glass flex items-center justify-between gap-3 p-4 hover:bg-white/5">
                    <div><p className="font-medium text-lav-100">{a.patient?.name}</p><p className="muted">{fmtTime(a.startTime)} - {fmtTime(a.endTime)} - {a.reason}</p></div>
                    <div className="flex flex-col items-end gap-1"><StatusBadge status={a.status} /><PriorityBadge priority={a.priority} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="h2 mb-3">Pending requests</h2>
          {!pending.data?.appointments.length ? <EmptyState title="No pending requests" /> : (
            <ul className="space-y-3">
              {pending.data.appointments.map((a) => (
                <li key={a._id} className="glass flex items-center justify-between gap-3 p-4">
                  <Link to={`/doctor/appointments/${a._id}`} className="min-w-0 flex-1">
                    <p className="font-medium text-lav-100">{a.patient?.name}</p>
                    <p className="muted">{fmtDateShort(a.date)}, {fmtTime(a.startTime)}</p>
                    <p className="line-clamp-1 text-sm text-lav-300">{a.reason}</p>
                    {a.fee > 0 && <div className="mt-1 flex items-center gap-2"><span className="text-xs text-lav-200">₹{a.fee}</span><PaymentBadge status={a.payment?.status} /></div>}
                  </Link>
                  <div className="flex gap-2">
                    <button onClick={() => act(a._id, "confirmed")} disabled={a.fee > 0 && a.payment?.status !== "verified"} title={a.fee > 0 && a.payment?.status !== "verified" ? "Open the request and verify the payment first" : "Accept"} className="btn-accent btn-sm disabled:opacity-40" aria-label="Accept"><Check className="h-4 w-4" /></button>
                    <button onClick={() => act(a._id, "rejected")} className="btn-danger btn-sm" aria-label="Decline"><X className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
