import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { Field, FormError, FormNotice, PageHeader, PageLoader, Spinner } from "../../components/ui.jsx";

const blank = { name: "", dateOfBirth: "", gender: "", phone: "", bloodGroup: "", heightCm: "", weightKg: "", allergies: "", chronicConditions: "", currentMedications: "", emergencyContact: { name: "", phone: "", relation: "" }, address: { line1: "", city: "", state: "", country: "", postalCode: "" } };

export default function PatientProfile() {
  const { user, refresh } = useAuth();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/api/patient/profile").then(({ profile: p }) => {
      setF({
        ...blank,
        name: user.name,
        ...(p || {}),
        dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
        heightCm: p?.heightCm ?? "",
        weightKg: p?.weightKg ?? "",
        allergies: (p?.allergies || []).join(", "),
        chronicConditions: (p?.chronicConditions || []).join(", "),
        currentMedications: (p?.currentMedications || []).join(", "),
        emergencyContact: { ...blank.emergencyContact, ...(p?.emergencyContact || {}) },
        address: { ...blank.address, ...(p?.address || {}) },
      });
    }).catch((e) => setError(e.message));
  }, [user.name]);

  if (!f) return error ? <FormError>{error}</FormError> : <PageLoader />;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const nested = (g, k) => (e) => setF((s) => ({ ...s, [g]: { ...s[g], [k]: e.target.value } }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api.put("/api/patient/profile", f);
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stagger space-y-6">
      <PageHeader title="My health profile" subtitle="Shared with a doctor only when you book a session with them." />

      <section className="glass grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Full name"><input className="input" value={f.name} onChange={set("name")} /></Field>
        <Field label="Date of birth"><input type="date" max={new Date().toISOString().slice(0, 10)} className="input" value={f.dateOfBirth} onChange={set("dateOfBirth")} /></Field>
        <Field label="Gender">
          <select className="input" value={f.gender} onChange={set("gender")}>
            <option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={set("phone")} inputMode="tel" /></Field>
        <Field label="Blood group">
          <select className="input" value={f.bloodGroup} onChange={set("bloodGroup")}>
            <option value="">Select</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (cm)"><input type="number" min="30" max="260" className="input" value={f.heightCm} onChange={set("heightCm")} /></Field>
          <Field label="Weight (kg)"><input type="number" min="2" max="400" className="input" value={f.weightKg} onChange={set("weightKg")} /></Field>
        </div>
      </section>

      <section className="glass grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="h2 sm:col-span-2">Medical background</h2>
        <Field label="Allergies" hint="Comma separated"><input className="input" value={f.allergies} onChange={set("allergies")} /></Field>
        <Field label="Long-term conditions" hint="Comma separated"><input className="input" value={f.chronicConditions} onChange={set("chronicConditions")} /></Field>
        <div className="sm:col-span-2"><Field label="Current medicines" hint="Comma separated"><input className="input" value={f.currentMedications} onChange={set("currentMedications")} /></Field></div>
      </section>

      <section className="glass grid gap-4 p-6 sm:grid-cols-3">
        <h2 className="h2 sm:col-span-3">Emergency contact</h2>
        <Field label="Name"><input className="input" value={f.emergencyContact.name} onChange={nested("emergencyContact", "name")} /></Field>
        <Field label="Phone"><input className="input" value={f.emergencyContact.phone} onChange={nested("emergencyContact", "phone")} inputMode="tel" /></Field>
        <Field label="Relation"><input className="input" value={f.emergencyContact.relation} onChange={nested("emergencyContact", "relation")} /></Field>
      </section>

      <section className="glass grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="h2 sm:col-span-2">Address</h2>
        <div className="sm:col-span-2"><Field label="Address line"><input className="input" value={f.address.line1} onChange={nested("address", "line1")} /></Field></div>
        <Field label="City"><input className="input" value={f.address.city} onChange={nested("address", "city")} /></Field>
        <Field label="State"><input className="input" value={f.address.state} onChange={nested("address", "state")} /></Field>
        <Field label="Country"><input className="input" value={f.address.country} onChange={nested("address", "country")} /></Field>
        <Field label="Postal code"><input className="input" value={f.address.postalCode} onChange={nested("address", "postalCode")} /></Field>
      </section>

      <FormError>{error}</FormError>
      {saved && <FormNotice>Profile saved.</FormNotice>}
      <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Save profile</button>
    </form>
  );
}
