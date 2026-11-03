import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./locales/en.js";
import hi from "./locales/hi.js";
import bn from "./locales/bn.js";
import mr from "./locales/mr.js";
import te from "./locales/te.js";
import ta from "./locales/ta.js";
import gu from "./locales/gu.js";
import ur from "./locales/ur.js";
import kn from "./locales/kn.js";
import ml from "./locales/ml.js";
import pa from "./locales/pa.js";

/**
 * Lightweight i18n (no library). Every UI string that has a key is translated; a missing key falls back to English.
 * `font` is the Google Fonts family loaded on demand when that language is chosen:
 *   - Latin / Gujarati: Baloo Bhai 2 (the site font)
 *   - Hindi / Marathi:  Tiro Devanagari Sanskrit / Marathi (classic Sanskrit-style Devanagari)
 *   - other Indic scripts: the matching Baloo 2 family so the look stays consistent
 */
export const LANGUAGES = [
  { code: "en", name: "English", native: "English", dict: en, font: "Baloo Bhai 2" },
  { code: "hi", name: "Hindi", native: "हिन्दी", dict: hi, font: "Tiro Devanagari Sanskrit" },
  { code: "bn", name: "Bengali", native: "বাংলা", dict: bn, font: "Baloo Da 2" },
  { code: "mr", name: "Marathi", native: "मराठी", dict: mr, font: "Tiro Devanagari Marathi" },
  { code: "te", name: "Telugu", native: "తెలుగు", dict: te, font: "Baloo Tammudu 2" },
  { code: "ta", name: "Tamil", native: "தமிழ்", dict: ta, font: "Baloo Thambi 2" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", dict: gu, font: "Baloo Bhai 2" },
  { code: "ur", name: "Urdu", native: "اردو", dict: ur, font: "Noto Nastaliq Urdu", rtl: true },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", dict: kn, font: "Baloo Tamma 2" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", dict: ml, font: "Baloo Chettan 2" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", dict: pa, font: "Baloo Paaji 2" },
];
const BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
const KEY = "lang";

const initial = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (BY_CODE[saved]) return saved;
  } catch { /* ignore */ }
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  return BY_CODE[nav] ? nav : "en";
};

const loaded = new Set();
function loadFont(family) {
  if (!family || loaded.has(family)) return;
  loaded.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

const I18nContext = createContext(null);
export const useI18n = () => useContext(I18nContext);

/** Module-level lookup for non-React code (date formatting etc.). */
let current = "en";
export const currentLocale = () => (current === "ur" ? "ur-IN" : `${current}-IN`);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initial);

  useEffect(() => {
    const l = BY_CODE[lang];
    current = lang;
    loadFont(l.font);
    const root = document.documentElement;
    root.lang = lang;
    root.dir = l.rtl ? "rtl" : "ltr";
    root.style.setProperty("--font-lang", `"${l.font}"`);
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!BY_CODE[code]) return;
    try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
    setLangState(code);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = BY_CODE[lang].dict[key] ?? en[key] ?? key;
      if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES, rtl: Boolean(BY_CODE[lang].rtl) }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
