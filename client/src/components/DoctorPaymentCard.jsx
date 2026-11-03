import { useEffect, useRef, useState } from "react";
import { IndianRupee, QrCode, Trash2, Upload } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { FormError, FormNotice, Spinner } from "./ui.jsx";

const MAX_FEE = 5000;
const STEP = 50;

/** Doctor dashboard card: consultation fee (slider) + payment QR upload. Patients pay through this QR before requesting a session. */
export default function DoctorPaymentCard() {
  const { profile, refresh } = useAuth();
  const input = useRef(null);
  const [fee, setFee] = useState(profile?.consultationFee || 0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [removeQr, setRemoveQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ error: "", ok: "" });

  useEffect(() => {
    setFee(profile?.consultationFee || 0);
  }, [profile?.consultationFee]);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const savedQr = removeQr ? "" : profile?.paymentQrUrl || "";
  const shownQr = preview || savedQr;
  const dirty = file || removeQr || fee !== (profile?.consultationFee || 0);

  const save = async () => {
    setMsg({ error: "", ok: "" });
    if (fee > 0 && !shownQr) return setMsg({ error: "Upload your payment QR code to charge a fee.", ok: "" });
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("consultationFee", String(fee));
      if (file) fd.append("qr", file);
      if (removeQr && !file) fd.append("removeQr", "true");
      await api.put("/api/doctor/payment", fd);
      setFile(null);
      setRemoveQr(false);
      if (input.current) input.current.value = "";
      await refresh();
      setMsg({ error: "", ok: fee > 0 ? `Saved. Patients now pay ₹${fee} through your QR before requesting a session.` : "Saved. Your sessions are free." });
    } catch (e) {
      setMsg({ error: e.message, ok: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass mb-6 p-5">
      <div className="mb-4 flex items-center gap-2">
        <IndianRupee className="h-5 w-5 text-brand-400" />
        <h2 className="h2">Consultation fee &amp; payment QR</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="label">Fee per session</p>
          <p className="text-4xl font-light text-lav-100">{fee > 0 ? `₹${fee}` : "Free"}</p>
          <input
            type="range"
            min={0}
            max={MAX_FEE}
            step={STEP}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
            aria-label="Consultation fee in rupees"
            className="mt-4 w-full"
            style={{ accentColor: "#a78bfa" }}
          />
          <div className="muted mt-1 flex justify-between text-xs"><span>₹0 (free)</span><span>₹{MAX_FEE}</span></div>
          <p className="muted mt-4 text-sm">
            Patients scan your QR, pay this amount and enter the UPI reference number. Check it in your UPI / bank app, then confirm the payment on the appointment before you accept.
          </p>
        </div>

        <div>
          <p className="label">Payment QR code (UPI)</p>
          <div className="flex items-start gap-4">
            {shownQr ? (
              // IMAGE: doctor's payment QR (uploaded by the doctor)
              <img src={shownQr} alt="Payment QR code" className="h-36 w-36 rounded-2xl bg-white object-contain p-2" />
            ) : (
              <div className="grid h-36 w-36 place-items-center rounded-2xl border border-dashed border-white/20 text-lav-400">
                <QrCode className="h-8 w-8" />
              </div>
            )}
            <div className="space-y-2">
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveQr(false); }} />
              <button type="button" className="btn-ghost btn-sm" onClick={() => input.current?.click()}>
                <Upload className="h-4 w-4" /> {shownQr ? "Replace QR" : "Upload QR"}
              </button>
              {(profile?.paymentQrUrl || file) && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => { setFile(null); setRemoveQr(true); if (input.current) input.current.value = ""; }}>
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
              <p className="muted text-xs">PNG, JPG or WebP, up to 5 MB.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <FormError>{msg.error}</FormError>
        <FormNotice>{msg.ok}</FormNotice>
        <button type="button" className="btn-primary" disabled={busy || !dirty} onClick={save}>
          {busy && <Spinner />} Save fee &amp; QR
        </button>
      </div>
    </section>
  );
}
