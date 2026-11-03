import { useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useI18n } from "../i18n/index.jsx";
import { api } from "../api/client.js";
import { FormError, PageHeader, Spinner } from "../components/ui.jsx";
import PredictionResult from "../components/PredictionResult.jsx";

const MODALITIES = [
  { id: "chest_xray", k: "chest", img: "/images/modality-chest-xray.svg" },
  { id: "skin", k: "skin", img: "/images/modality-skin.svg" },
  { id: "mri", k: "mri", img: "/images/modality-mri.svg" },
];
const OK_EXT = /\.(jpe?g|png|bmp)$/i;
const MAX_MB = 10;

export default function Predict() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [modality, setModality] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const input = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const pick = (f) => {
    setError("");
    if (!f) return;
    if (!OK_EXT.test(f.name)) return setError("Please choose a JPG, PNG or BMP image.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Image must be smaller than ${MAX_MB} MB.`);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const submit = async () => {
    setError("");
    if (!modality) return setError("Choose what kind of scan this is.");
    if (!file) return setError("Upload an image first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("modality", modality);
      fd.append("image", file);
      const data = await api.post("/api/predictions", fd);
      setResult(data.prediction);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stagger">
      <PageHeader title={user.role === "doctor" ? t("predict.titleDoctor") : t("predict.titlePatient")} subtitle={t("predict.subtitle")} />

      <section className="glass p-6">
        <p className="label">{t("predict.step1")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODALITIES.map((m) => (
            <button key={m.id} type="button" onClick={() => setModality(m.id)} aria-pressed={modality === m.id} className={`glass-soft flex items-center gap-3 p-3 text-left transition hover:bg-white/5 ${modality === m.id ? "!border-lav-200 bg-white/10" : ""}`}>
              {/* IMAGE: scan type icon - replace /public/images/modality-*.svg */}
              <img src={m.img} alt="" className="h-14 w-14 rounded-lg" />
              <span>
                <span className="block font-medium text-lav-100">{t(`predict.${m.k}`)}</span>
                <span className="text-xs text-lav-400">{t(`predict.${m.k}Hint`)}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="label mt-6">{t("predict.step2")}</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          onClick={() => input.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? "border-lav-200 bg-white/10" : "border-[rgba(150,160,255,.3)] hover:bg-white/5"}`}
        >
          {preview ? (
            // IMAGE: local preview of the chosen file
            <img src={preview} alt="Selected scan preview" className="max-h-64 rounded-lg object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              {/* IMAGE: upload illustration - replace /public/images/scan-placeholder.svg */}
              <img src="/images/scan-placeholder.svg" alt="" className="h-24 w-24" />
              <p className="text-sm text-lav-200">
                <UploadCloud className="me-1 inline h-4 w-4" /> {t("predict.drag")}
              </p>
              <p className="text-xs text-lav-400">JPG, PNG or BMP - up to {MAX_MB} MB</p>
            </div>
          )}
          <input ref={input} type="file" accept=".jpg,.jpeg,.png,.bmp,image/jpeg,image/png,image/bmp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        {file && <p className="mt-2 text-xs text-lav-400">{file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB</p>}

        <div className="mt-5 space-y-3">
          <FormError>{error}</FormError>
          <button onClick={submit} disabled={busy} aria-busy={busy} className="btn-primary">
            {busy ? (
              <>
                <Spinner /> {t("predict.analysing")}
              </>
            ) : (
              t("predict.run")
            )}
          </button>
        </div>
      </section>

      {result && (
        <section ref={resultRef} className="mt-8 animate-fade-up scroll-mt-28">
          <h2 className="h2 mb-4">{t("predict.result")}</h2>
          <PredictionResult prediction={result} showActions={user.role === "patient"} />
        </section>
      )}
    </div>
  );
}
