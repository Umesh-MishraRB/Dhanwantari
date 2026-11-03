import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth, homeFor } from "../auth/AuthContext.jsx";
import { api } from "../api/client.js";
import { Field, FormError, Spinner } from "./ui.jsx";

/**
 * Shown after "Continue with Google" when the Google e-mail has no account yet.
 * The person picks patient / doctor (doctors add specialization + licence); only then is the account created,
 * so a doctor is never silently registered as a patient.
 */
export default function GoogleOnboarding() {
  const { pending, completeGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const first = useRef(null);

  const saved = (() => { try { return sessionStorage.getItem("dh_role"); } catch { return ""; } })();
  const [role, setRole] = useState(saved === "doctor" ? "doctor" : "patient");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [specs, setSpecs] = useState([]);
  const [f, setF] = useState({ name: pending?.name || "", specializationId: "", qualifications: "", experienceYears: "", licenseNumber: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    api.get("/api/specializations").then((d) => setSpecs(d.specializations)).catch(() => {});
  }, []);
  useEffect(() => {
    first.current?.focus();
  }, [role]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("Enter your full name.");
    if (role === "doctor" && !f.specializationId) return setError("Choose your specialization.");
    if (role === "doctor" && !f.licenseNumber.trim()) return setError("Enter your medical licence number.");
    setBusy(true);
    try {
      const user = await completeGoogle({ ...f, role });
      try { sessionStorage.removeItem("dh_role"); } catch { /* ignore */ }
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(2,2,30,.55)] p-4 backdrop-blur-md animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label="Finish setting up your account" className="glass relative my-auto w-full max-w-md animate-panel-in p-7 sm:p-8">
        <h2 className="text-2xl font-light tracking-tight text-lav-100">Finish setting up</h2>
        <p className="mb-6 mt-1 text-sm text-lav-400">
          Signed in with Google as <span className="text-lav-100">{pending?.email}</span>. Tell us who you are to create your account.
        </p>

        <div className="seg mb-5" role="tablist" aria-label="Account type">
          <span className="thumb" style={{ transform: role === "doctor" ? "translateX(100%)" : "none" }} />
          {["patient", "doctor"].map((r) => (
            <button key={r} type="button" role="tab" aria-selected={role === r} onClick={() => setRole(r)} className={role === r ? "text-ink-900" : "text-lav-200"}>
              I am a {r}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Full name">
            <input ref={first} className="input" value={f.name} onChange={set("name")} autoComplete="name" placeholder={role === "doctor" ? "Dr. Full Name" : "Your name"} />
          </Field>

          {role === "doctor" && (
            <div className="animate-fade-up space-y-4">
              <Field label="Specialization">
                <select className="input" value={f.specializationId} onChange={set("specializationId")}>
                  <option value="">Select specialization</option>
                  {specs.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
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
            {busy && <Spinner />} Create my {role} account
          </button>
        </form>

        <button type="button" onClick={logout} className="mx-auto mt-5 flex items-center gap-1.5 text-sm text-lav-400 hover:text-lav-100">
          <LogOut className="h-3.5 w-3.5" /> Use a different account
        </button>
      </div>
    </div>
  );
}
