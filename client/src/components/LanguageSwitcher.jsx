import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";

export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, languages, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = languages.find((l) => l.code === lang);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={t("common.language")} title={t("common.language")} className="flex items-center gap-1.5 rounded-full p-2 text-sm text-lav-200 transition hover:bg-white/10">
        <Globe className="h-5 w-5" />
        <span className="hidden max-w-[5.5rem] truncate lg:inline">{current.native}</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={t("common.language")} className="glass absolute end-0 top-full z-50 mt-2 max-h-80 w-52 animate-panel-in overflow-y-auto p-1.5">
          {languages.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                onClick={() => { setLang(l.code); setOpen(false); }}
                lang={l.code}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition hover:bg-white/10 ${l.code === lang ? "text-lav-100" : "text-lav-200"}`}
              >
                <span>
                  {l.native} {l.code !== "en" && <span className="text-xs text-lav-400">· {l.name}</span>}
                </span>
                {l.code === lang && <Check className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
