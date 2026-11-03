import { Loader2, AlertTriangle, Inbox } from "lucide-react";

export const Spinner = ({ className = "h-4 w-4" }) => <Loader2 className={`${className} animate-[spin_.8s_linear_infinite]`} />;

export const PageLoader = ({ label = "Loading..." }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-lav-300" role="status">
    <Spinner className="h-7 w-7" />
    <span className="text-sm">{label}</span>
  </div>
);

export function ErrorState({ message, onRetry }) {
  return (
    <div className="glass flex flex-col items-center gap-3 p-8 text-center" role="alert">
      <AlertTriangle className="h-7 w-7 text-amber-300" />
      <p className="text-sm text-lav-200">{message || "Something went wrong."}</p>
      {onRetry && (
        <button className="btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="glass-soft flex flex-col items-center gap-2 p-10 text-center">
      <Inbox className="h-7 w-7 text-lav-400" />
      <p className="font-medium text-lav-100">{title}</p>
      {hint && <p className="muted max-w-sm">{hint}</p>}
      {action}
    </div>
  );
}

export const FormError = ({ children }) =>
  children ? (
    <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
      {children}
    </p>
  ) : null;

export const FormNotice = ({ children }) =>
  children ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{children}</p> : null;

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-lav-400">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-lav-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const StatCard = ({ label, value, tone = "" }) => (
  <div className="glass p-5">
    <p className="text-xs uppercase tracking-wider text-lav-400">{label}</p>
    <p className={`mt-2 text-3xl font-light ${tone || "text-lav-100"}`}>{value ?? "-"}</p>
  </div>
);

const TONES = {
  low: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  medium: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  high: "bg-orange-500/15 text-orange-200 border border-orange-400/30",
  critical: "bg-red-500/20 text-red-200 border border-red-400/40",
  neutral: "bg-white/5 text-lav-300 border border-white/10",
  info: "bg-brand-500/20 text-lav-100 border border-brand-400/40",
};

export const Badge = ({ tone = "neutral", children }) => <span className={`badge ${TONES[tone]}`}>{children}</span>;

export const RiskBadge = ({ level }) => <Badge tone={level}>{level} risk</Badge>;
export const PriorityBadge = ({ priority }) => (priority ? <Badge tone={priority}>{priority} priority</Badge> : <Badge>no priority</Badge>);

const STATUS_TONE = { requested: "medium", confirmed: "info", completed: "low", rejected: "critical", cancelled: "neutral" };
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || "neutral"}>{status}</Badge>;
export const DiagnosisBadge = ({ status }) => <Badge tone={status === "completed" ? "low" : "info"}>diagnosis {status}</Badge>;

const PAYMENT_TONE = { not_required: "neutral", submitted: "medium", verified: "low", rejected: "critical" };
const PAYMENT_LABEL = { not_required: "free session", submitted: "payment to verify", verified: "payment verified", rejected: "payment not found" };
export const PaymentBadge = ({ status }) => <Badge tone={PAYMENT_TONE[status] || "neutral"}>{PAYMENT_LABEL[status] || "free session"}</Badge>;
