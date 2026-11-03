import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Briefcase, CalendarCheck, MapPin, PlayCircle, Search } from "lucide-react";
import { useApi } from "../../lib/useApi.js";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../../components/ui.jsx";
import { fmtDateShort, fmtTime } from "../../lib/format.js";
import { useI18n } from "../../i18n/index.jsx";

export default function Doctors() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const slug = params.get("specialization") || "";
  const predictionId = params.get("prediction") || "";
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const specs = useApi("/api/specializations");
  const pred = useApi(predictionId ? `/api/predictions/${predictionId}` : null);
  const list = useApi(`/api/doctors?specialization=${encodeURIComponent(slug)}&q=${encodeURIComponent(debounced)}`);

  const choose = (s) => {
    const next = new URLSearchParams(params);
    s ? next.set("specialization", s) : next.delete("specialization");
    setParams(next, { replace: true });
  };
  const detailQuery = predictionId ? `?prediction=${predictionId}` : "";

  return (
    <div className="stagger">
      <PageHeader title={t("doctors.title")} subtitle={t("doctors.subtitle")} />

      {pred.data?.prediction && (
        <div className="glass mb-6 p-4 text-sm">
          Based on your result <span className="font-medium text-lav-100">{pred.data.prediction.displayName}</span>
          {pred.data.prediction.specialization && <>, we suggest <span className="font-medium text-lav-100">{pred.data.prediction.specialization.name}</span> specialists.</>}
          <span className="muted"> You can pick a different specialization below.</span>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lav-400" />
          <input className="input pl-9" placeholder={t("doctors.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search doctors" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`chip ${!slug ? "chip-active" : ""}`} onClick={() => choose("")}>{t("doctors.all")}</button>
          {specs.data?.specializations.map((s) => (
            <button key={s._id} className={`chip ${slug === s.slug ? "chip-active" : ""}`} onClick={() => choose(s.slug)}>{s.name}</button>
          ))}
        </div>
      </div>

      {list.loading ? <PageLoader /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data.doctors.length ? (
        <EmptyState title={t("doctors.none")} hint="Try another specialization or clear the search." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.data.doctors.map((d) => (
            <Link key={d._id} to={`/patient/doctors/${d._id}${detailQuery}`} className="glass group flex flex-col p-5 transition hover:-translate-y-1 hover:bg-white/5">
              <div className="flex items-center gap-4">
                {/* IMAGE: doctor photo (doctorProfiles.photoUrl) - placeholder in /public/images/doctor-placeholder.svg */}
                <img src={d.photoUrl || "/images/doctor-placeholder.svg"} alt={`Dr. ${d.user.name}`} className="h-16 w-16 rounded-2xl bg-ink-900 object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium text-lav-100">{d.user.name}{d.introVideoUrl && <PlayCircle className="ms-1.5 inline h-4 w-4 text-brand-400" aria-label={t("suggest.video")} />}</p>
                  <p className="text-sm text-brand-400">{d.specialization?.name}</p>
                </div>
              </div>
              <p className="muted mt-3 line-clamp-1">{d.qualifications?.join(", ")}</p>
              <div className="muted mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {d.experienceYears} yrs</span>
                {d.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {d.city}</span>}
                <span className="font-medium text-lav-100">{d.consultationFee > 0 ? `₹${d.consultationFee}` : t("common.free")}</span>
              </div>
              <p className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-lav-300">
                <CalendarCheck className="h-3.5 w-3.5" />
                {d.nextAvailable ? t("suggest.next", { when: `${fmtDateShort(d.nextAvailable.date)}, ${fmtTime(d.nextAvailable.startTime)}` }) : t("suggest.noSlots")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
