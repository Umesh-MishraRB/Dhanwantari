import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "../api/client.js";
import { useApi } from "../lib/useApi.js";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../components/ui.jsx";
import { fmtDateTime } from "../lib/format.js";

const ping = () => window.dispatchEvent(new Event("notifications:changed"));

export default function Notifications() {
  const { data, loading, error, reload } = useApi("/api/notifications");
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const open = async (n) => {
    if (!n.isRead) { await api.patch(`/api/notifications/${n._id}/read`).catch(() => {}); ping(); reload(); }
  };
  const readAll = async () => { await api.patch("/api/notifications/read-all"); ping(); reload(); };

  return (
    <div className="stagger">
      <PageHeader title="Notifications" subtitle={`${data.unread} unread`} actions={data.unread > 0 && <button className="btn-ghost btn-sm" onClick={readAll}><CheckCheck className="h-4 w-4" /> Mark all read</button>} />
      {!data.notifications.length ? <EmptyState title="You are all caught up" hint="Appointment updates and reports will appear here." /> : (
        <ul className="space-y-2">
          {data.notifications.map((n) => {
            const body = (
              <div className={`glass flex items-start gap-3 p-4 transition hover:bg-white/5 ${n.isRead ? "opacity-70" : ""}`}>
                <Bell className={`mt-0.5 h-5 w-5 shrink-0 ${n.isRead ? "text-lav-400" : "text-brand-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-lav-100">{n.title}</p>
                  <p className="text-sm text-lav-300">{n.message}</p>
                  <p className="muted mt-1 text-xs">{fmtDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-400" aria-label="unread" />}
              </div>
            );
            return <li key={n._id} onClick={() => open(n)}>{n.link ? <Link to={n.link}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
