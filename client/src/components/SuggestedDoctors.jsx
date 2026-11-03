import { Link } from "react-router-dom";
import { AlertTriangle, CalendarCheck, MapPin, PlayCircle, Stethoscope } from "lucide-react";
import { useApi } from "../lib/useApi.js";
import { useI18n } from "../i18n/index.jsx";
import { fmtDateShort, fmtTime } from "../lib/format.js";
import { Spinner } from "./ui.jsx";

/**
 * Shown right under a prediction: the doctors matching the suggested specialization (soonest available first).
 * If nobody practises that specialization yet, the server falls back to General Medicine and says so.
 */
export default function SuggestedDoctors({ predictionId }) {
  const { t } = useI18n();
  const { data, loading, error } = useApi(`/api/predictions/${predictionId}/doctors`);

  if (loading) return <div className="glass flex items-center gap-2 p-5 text-sm text-lav-300"><Spinner /> {t("common.loading")}</div>;
  if (error || !data) return null; // the plain "Find doctors" button below still works

  const slug = data.specialization?.slug || "general-medicine";
  return (
    <section className="glass p-5" aria-labelledby="suggested-doctors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="suggested-doctors" className="h2 flex items-center gap-2"><Stethoscope className="h-5 w-5" /> {t("suggest.title")}</h3>
          {data.specialization && <p className="muted mt-0.5">{t("suggest.for")}: <span className="text-lav-100">{data.specialization.name}</span></p>}
        </div>
        <Link to={`/patient/doctors?specialization=${slug}&prediction=${predictionId}`} className="btn-ghost btn-sm">{t("suggest.all")}</Link>
      </div>

      {data.urgent && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t("suggest.urgent")}
        </p>
      )}
      {data.fallback && <p className="mt-3 text-sm text-amber-200/90">{t("suggest.fallback")}</p>}

      {!data.doctors.length ? (
        <p className="muted mt-4">{t("suggest.none")}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {data.doctors.map((d) => (
            <li key={d._id}>
              <Link to={`/patient/doctors/${d._id}?prediction=${predictionId}`} className="glass-soft group flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <img src={d.photoUrl || "/images/doctor-placeholder.svg"} alt="" className="h-12 w-12 rounded-xl bg-ink-900 object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-lav-100">{d.user.name}</p>
                    <p className="truncate text-xs text-brand-400">{d.specialization?.name}</p>
                  </div>
                </div>
                <div className="muted mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {d.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {d.city}</span>}
                  <span className="font-medium text-lav-100">{d.consultationFee > 0 ? `₹${d.consultationFee}` : t("common.free")}</span>
                  {d.introVideoUrl && <span className="flex items-center gap-1 text-brand-400"><PlayCircle className="h-3.5 w-3.5" /> {t("suggest.video")}</span>}
                </div>
                <p className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-lav-300">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  {d.nextAvailable ? t("suggest.next", { when: `${fmtDateShort(d.nextAvailable.date)}, ${fmtTime(d.nextAvailable.startTime)}` }) : t("suggest.noSlots")}
                </p>
                <span className="mt-3 text-sm font-medium text-lav-100 group-hover:underline">{t("suggest.book")} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
