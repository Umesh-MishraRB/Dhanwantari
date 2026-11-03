import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth, homeFor } from "../auth/AuthContext.jsx";
import { api } from "../api/client.js";
import { signInWithGoogle } from "../api/authClient.js";
import { Field, FormError, Spinner } from "./ui.jsx";
import { useI18n } from "../i18n/index.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OAUTH_ERRORS = {
  GoogleUnverified: "Your Google email is not verified.",
  AccessDenied: "Google sign-in was not allowed for this account.",
  Configuration: "Google sign-in is not configured correctly on the server.",
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.27v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.1z" />
    <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.63l4 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
  </svg>
);

export default function AuthPanel({ mode, onMode, onClose }) {
  const { login, register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [googleOn, setGoogleOn] = useState(false);
  const first = useRef(null);

  const [role, setRole] = useState("patient");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(OAUTH_ERRORS[params.get("error")] || (params.get("error") ? "Google sign-in failed. Please try again." : ""));
  const [specs, setSpecs] = useState([]);
  const [f, setF] = useState({ name: "", email: "", password: "", specializationId: "", qualifications: "", experienceYears: "", licenseNumber: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const isSignup = mode === "signup";

  useEffect(() => {
    api.get("/api/specializations").then((d) => setSpecs(d.specializations)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/api/auth-config").then((d) => setGoogleOn(Boolean(d.google))).catch(() => {});
  }, []);

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      try { sessionStorage.setItem("dh_role", isSignup ? role : ""); } catch { /* ignore */ }
      await signInWithGoogle(); // navigates away to Google
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  useEffect(() => {
    setError("");
    first.current?.focus();
  }, [mode, role]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(f.email)) return setError("Enter a valid email address.");
    if (f.password.length < (isSignup ? 8 : 1)) return setError(isSignup ? "Password must be at least 8 characters." : "Enter your password.");
    if (isSignup && !f.name.trim()) return setError("Enter your full name.");
    if (isSignup && role === "doctor" && !f.specializationId) return setError("Choose your specialization.");

    setBusy(true);
    try {
      if (isSignup) await register({ ...f, role });
      const user = await login(f.email, f.password);
      const from = location.state?.from;
      navigate(from && from.startsWith(`/${user.role}`) ? from : homeFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(2,2,30,.55)] p-4 backdrop-blur-md animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={isSignup ? "Create account" : "Log in"} className="glass relative my-auto w-full max-w-md animate-panel-in p-7 sm:p-8">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-lav-300 hover:bg-white/10" aria-label="Close">
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-2xl font-light tracking-tight text-lav-100">{isSignup ? t("auth.create") : t("auth.welcome")}</h2>
        <p className="mb-6 mt-1 text-sm text-lav-400">{isSignup ? t("auth.subSignup") : t("auth.subLogin")}</p>

        {isSignup && (
          <div className="seg mb-5" role="tablist" aria-label="Account type">
            <span className="thumb" style={{ transform: role === "doctor" ? "translateX(100%)" : "none" }} />
            {["patient", "doctor"].map((r) => (
              <button key={r} type="button" role="tab" aria-selected={role === r} onClick={() => setRole(r)} className={role === r ? "text-ink-900" : "text-lav-200"}>
                {t(r === "doctor" ? "auth.doctor" : "auth.patient")}
              </button>
            ))}
          </div>
        )}

        {googleOn && (
          <>
            <button type="button" onClick={google} disabled={busy} className="btn-ghost flex w-full items-center justify-center gap-2 rounded-full">
              <GoogleIcon /> {t("auth.google")}
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-lav-400">
              <span className="h-px flex-1 bg-white/10" /> {t("auth.or")} <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}
        <form onSubmit={submit} className="space-y-4" noValidate>
          {isSignup && (
            <Field label={t("auth.name")}>
              <input ref={first} className="input" value={f.name} onChange={set("name")} autoComplete="name" placeholder={role === "doctor" ? "Dr. Full Name" : "Your name"} />
            </Field>
          )}
          <Field label={t("auth.email")}>
            <input ref={isSignup ? null : first} type="email" className="input" value={f.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label={t("auth.password")}>
            <div className="relative">
              <input type={show ? "text" : "password"} className="input pr-10" value={f.password} onChange={set("password")} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 8 characters" : "Your password"} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-lav-400 hover:text-lav-100" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {isSignup && role === "doctor" && (
            <div className="animate-fade-up space-y-4">
              <Field label="Specialization">
                <select className="input" value={f.specializationId} onChange={set("specializationId")}>
                  <option value="">Select specialization</option>
                  {specs.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qualifications" hint="Comma separated">
                  <input className="input" value={f.qualifications} onChange={set("qualifications")} placeholder="MBBS, MD" />
                </Field>
                <Field label="Experience (yrs)">
                  <input type="number" min="0" max="70" className="input" value={f.experienceYears} onChange={set("experienceYears")} />
                </Field>
              </div>
              <Field label="Medical licence no.">
                <input className="input" value={f.licenseNumber} onChange={set("licenseNumber")} />
              </Field>
            </div>
          )}

          <FormError>{error}</FormError>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Spinner />} {isSignup ? t("auth.createBtn") : t("auth.login")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-lav-400">
          {isSignup ? t("auth.haveAcc") : t("auth.newHere")}{" "}
          <button type="button" className="font-medium text-lav-100 underline-offset-4 hover:underline" onClick={() => onMode(isSignup ? "login" : "signup")}>
            {isSignup ? t("auth.login") : t("auth.createOne")}
          </button>
        </p>
      </div>
    </div>
  );
}
