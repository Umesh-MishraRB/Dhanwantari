import { useEffect, useRef, useState } from "react";
import { Camera, Film, Trash2, UploadCloud } from "lucide-react";
import { api, upload } from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useApi } from "../../lib/useApi.js";
import { useI18n } from "../../i18n/index.jsx";
import { Field, FormError, FormNotice, PageHeader, PageLoader, Spinner } from "../../components/ui.jsx";

const MAX_VIDEO_MB = 40;
const MAX_VIDEO_SEC = 180;
const MAX_PHOTO_MB = 5;
const VIDEO_OK = /\.(mp4|mov|m4v|webm)$/i;
const PHOTO_OK = /\.(jpe?g|png|webp)$/i;

/** reads the duration without uploading anything */
const videoDuration = (url) =>
  new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(v.duration);
    v.onerror = () => resolve(null); // some containers cannot be probed in every browser; the server still validates
    v.src = url;
  });

/** Photo + introduction video. Saved on its own so a patient-facing intro can be added without touching the rest of the profile. */
function MediaSection({ profile, onSaved }) {
  const { t } = useI18n();
  const photoInput = useRef(null);
  const videoInput = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);
  const [photoPrev, setPhotoPrev] = useState("");
  const [videoPrev, setVideoPrev] = useState("");
  const [removeVideo, setRemoveVideo] = useState(false);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [pct, setPct] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => () => { photoPrev && URL.revokeObjectURL(photoPrev); }, [photoPrev]);
  useEffect(() => () => { videoPrev && URL.revokeObjectURL(videoPrev); }, [videoPrev]);

  const pickPhoto = (f) => {
    setError(""); setSaved(false);
    if (!f) return;
    if (!PHOTO_OK.test(f.name)) return setError("JPG, PNG or WebP only.");
    if (f.size > MAX_PHOTO_MB * 1024 * 1024) return setError(`Photo must be smaller than ${MAX_PHOTO_MB} MB.`);
    setPhoto(f); setRemovePhoto(false); setPhotoPrev(URL.createObjectURL(f));
  };

  const pickVideo = async (f) => {
    setError(""); setSaved(false);
    if (!f) return;
    if (!VIDEO_OK.test(f.name)) return setError(t("media.badType"));
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) return setError(t("media.tooBig"));
    const url = URL.createObjectURL(f);
    const dur = await videoDuration(url);
    if (dur && dur > MAX_VIDEO_SEC) {
      URL.revokeObjectURL(url);
      return setError(t("media.tooLong"));
    }
    setVideo(f); setRemoveVideo(false); setVideoPrev(url);
  };

  const shownPhoto = removePhoto ? "" : photoPrev || profile.photoUrl;
  const shownVideo = removeVideo ? "" : videoPrev || profile.introVideoUrl;
  const dirty = Boolean(photo || video || removeVideo || removePhoto);
  const busy = pct !== null;

  const save = async () => {
    setError(""); setSaved(false); setPct(0);
    try {
      const fd = new FormData();
      if (photo) fd.append("photo", photo);
      if (video) fd.append("video", video);
      if (removePhoto) fd.append("removePhoto", "true");
      if (removeVideo) fd.append("removeVideo", "true");
      const { profile: p } = await upload("PUT", "/api/doctor/media", fd, setPct);
      setPhoto(null); setVideo(null); setPhotoPrev(""); setVideoPrev(""); setRemoveVideo(false); setRemovePhoto(false);
      onSaved(p);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setPct(null);
    }
  };

  return (
    <section className="glass space-y-6 p-6" aria-labelledby="media-h">
      <h2 id="media-h" className="h2">{t("media.photo")} & {t("media.video")}</h2>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="label">{t("media.photo")}</p>
          <div className="flex items-center gap-4">
            <img src={shownPhoto || "/images/doctor-placeholder.svg"} alt="" className="h-24 w-24 rounded-2xl bg-ink-900 object-cover" />
            <div className="flex flex-col gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => photoInput.current?.click()} disabled={busy}><Camera className="h-4 w-4" /> {t("media.choosePhoto")}</button>
              {shownPhoto && <button type="button" className="btn-ghost btn-sm" onClick={() => { setPhoto(null); setPhotoPrev(""); setRemovePhoto(true); }} disabled={busy}><Trash2 className="h-4 w-4" /> {t("media.remove")}</button>}
            </div>
            <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <p className="label">{t("media.video")}</p>
          {shownVideo ? (
            // IMAGE/VIDEO: doctor's introduction (uploaded file, or a local preview before saving)
            <video key={shownVideo} src={shownVideo} controls preload="metadata" playsInline className="video-frame" />
          ) : (
            <button type="button" onClick={() => videoInput.current?.click()} disabled={busy} className="video-frame grid place-items-center border-2 border-dashed border-[rgba(150,160,255,.3)] !bg-transparent text-lav-300 transition hover:bg-white/5">
              <span className="flex flex-col items-center gap-2 px-4 text-center text-sm"><Film className="h-8 w-8" /> {t("media.choose")}</span>
            </button>
          )}
          <p className="mt-2 text-xs text-lav-400">{t("media.videoHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => videoInput.current?.click()} disabled={busy}><UploadCloud className="h-4 w-4" /> {shownVideo ? t("media.replace") : t("media.choose")}</button>
            {shownVideo && <button type="button" className="btn-ghost btn-sm" onClick={() => { setVideo(null); setVideoPrev(""); setRemoveVideo(true); }} disabled={busy}><Trash2 className="h-4 w-4" /> {t("media.remove")}</button>}
          </div>
          <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" className="hidden" onChange={(e) => { pickVideo(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>

      {busy && (
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="mb-1 text-xs text-lav-300">{t("media.uploading", { pct })}</div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-lav-200 transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      <FormError>{error}</FormError>
      {saved && <FormNotice>{t("media.saved")}</FormNotice>}
      <button type="button" className="btn-primary" disabled={!dirty || busy} onClick={save}>{busy && <Spinner />} {t("media.save")}</button>
    </section>
  );
}

export default function DoctorProfile() {
  const { user, refresh } = useAuth();
  const specs = useApi("/api/specializations");
  const [f, setF] = useState(null);
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/api/doctor/profile").then(({ profile: p }) => {
      setMedia({ photoUrl: p.photoUrl || "", introVideoUrl: p.introVideoUrl || "" });
      setF({
        name: user.name, specialization: p.specialization?._id || "", qualifications: (p.qualifications || []).join(", "), experienceYears: p.experienceYears ?? 0,
        licenseNumber: p.licenseNumber || "", clinicName: p.clinicName || "", city: p.city || "", languages: (p.languages || []).join(", "), bio: p.bio || "",
      });
    }).catch((e) => setError(e.message));
  }, [user.name]);

  if (!f || specs.loading) return error ? <FormError>{error}</FormError> : <PageLoader />;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try { await api.put("/api/doctor/profile", f); await refresh(); setSaved(true); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="stagger space-y-6">
      <PageHeader title="My profile" subtitle="This is what patients see when they browse doctors." />
      <MediaSection profile={media} onSaved={(p) => { setMedia({ photoUrl: p.photoUrl || "", introVideoUrl: p.introVideoUrl || "" }); refresh(); }} />

      <form onSubmit={submit} className="space-y-6">
        <section className="glass grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Full name"><input className="input" value={f.name} onChange={set("name")} /></Field>
          <Field label="Specialization">
            <select className="input" value={f.specialization} onChange={set("specialization")}>{specs.data?.specializations.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select>
          </Field>
          <Field label="Qualifications" hint="Comma separated"><input className="input" value={f.qualifications} onChange={set("qualifications")} /></Field>
          <Field label="Experience (years)"><input type="number" min="0" max="70" className="input" value={f.experienceYears} onChange={set("experienceYears")} /></Field>
          <Field label="Licence number"><input className="input" value={f.licenseNumber} onChange={set("licenseNumber")} /></Field>
          <Field label="Languages" hint="Comma separated"><input className="input" value={f.languages} onChange={set("languages")} /></Field>
          <Field label="Clinic / hospital"><input className="input" value={f.clinicName} onChange={set("clinicName")} /></Field>
          <Field label="City"><input className="input" value={f.city} onChange={set("city")} /></Field>
          <div className="sm:col-span-2"><Field label="About you"><textarea rows={4} maxLength={1200} className="input" value={f.bio} onChange={set("bio")} /></Field></div>
        </section>
        <FormError>{error}</FormError>{saved && <FormNotice>Profile saved.</FormNotice>}
        <button className="btn-primary" disabled={busy}>{busy && <Spinner />} Save profile</button>
      </form>
    </div>
  );
}
