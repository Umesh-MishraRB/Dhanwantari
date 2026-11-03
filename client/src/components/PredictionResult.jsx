import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, Stethoscope } from "lucide-react";
import { RiskBadge } from "./ui.jsx";
import SuggestedDoctors from "./SuggestedDoctors.jsx";
import { useI18n } from "../i18n/index.jsx";
import { pct, prettyLabel, fmtDateTime } from "../lib/format.js";

const MODALITY_KEY = { mri: "predict.mri", skin: "predict.skin", chest_xray: "predict.chest" };

/** Image + Grad-CAM + prediction summary. Used for patients, doctors and the appointment analysis view. */
export default function PredictionResult({ prediction: p, showActions = false, compact = false }) {
  const { t } = useI18n();
  const modalityName = t(MODALITY_KEY[p.modality] || "predict.result");
  const probs = Object.entries(p.probabilities || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, compact ? 3 : 5);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <figure className="glass-soft overflow-hidden">
          {/* IMAGE: the patient's uploaded scan (URL stored in MongoDB) */}
          <img src={p.imageUrl} alt={modalityName} className="aspect-square w-full bg-ink-900 object-contain" />
          <figcaption className="px-3 py-2 text-xs text-lav-400">{t("result.uploaded")}</figcaption>
        </figure>
        <figure className="glass-soft overflow-hidden">
          {/* IMAGE: Grad-CAM heat-map from the ML service; falls back to a placeholder */}
          <img src={p.gradcamUrl || "/images/gradcam-placeholder.svg"} alt="Grad-CAM heat-map showing the regions that influenced the prediction" className="aspect-square w-full bg-ink-900 object-contain" />
          <figcaption className="px-3 py-2 text-xs text-lav-400">{p.gradcamUrl ? "Grad-CAM: highlighted areas influenced the model most" : "Grad-CAM not available for this prediction"}</figcaption>
        </figure>
      </div>

      <div className="glass p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-lav-400">
              {modalityName} {p.createdAt && <span className="normal-case"> - {fmtDateTime(p.createdAt)}</span>}
            </p>
            <h3 className="mt-1 text-2xl font-light text-lav-100">{p.displayName}</h3>
          </div>
          <RiskBadge level={p.riskLevel} />
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-lav-300">
            <span>{t("result.confidence")}</span>
            <span>{pct(p.confidence)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lav-200 transition-all duration-700" style={{ width: pct(p.confidence) }} />
          </div>
        </div>

        {p.riskNote && <p className="mt-3 text-sm text-amber-200/90">{p.riskNote}</p>}

        {probs.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs uppercase tracking-wider text-lav-400">{t("result.top")}</p>
            {probs.map(([label, v]) => (
              <div key={label} className="flex items-center gap-3 text-xs">
                <span className="w-40 shrink-0 truncate capitalize text-lav-200">{prettyLabel(label)}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-lav-300/80" style={{ width: pct(v) }} />
                </div>
                <span className="w-10 text-right text-lav-300">{pct(v)}</span>
              </div>
            ))}
          </div>
        )}

        {p.specialization && !compact && (
          <p className="mt-5 text-sm text-lav-300">
            {t("result.suggested")}: <span className="font-medium text-lav-100">{p.specialization.name}</span>
          </p>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-100/90">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("result.disclaimer")}</span>
        </div>

        {showActions && (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={`/patient/doctors?specialization=${p.specialization?.slug || "general-medicine"}&prediction=${p._id}`} className="btn-primary">
              <Stethoscope className="h-4 w-4" /> {t("result.find")}
            </Link>
            {p.blogSlug && (
              <Link to={`/blogs/${p.blogSlug}`} className="btn-ghost">
                <BookOpen className="h-4 w-4" /> {t("result.read")}
              </Link>
            )}
          </div>
        )}
      </div>

      {showActions && p._id && <SuggestedDoctors predictionId={p._id} />}
    </div>
  );
}
