import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText, ScanSearch, ShieldCheck, Stethoscope, UploadCloud } from "lucide-react";
import FlowBackground from "../components/FlowBackground.jsx";
import AuthPanel from "../components/AuthPanel.jsx";
import GoogleOnboarding from "../components/GoogleOnboarding.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import Footer from "../components/Footer.jsx";
import Reveal from "../components/Reveal.jsx";
import { useAuth, homeFor } from "../auth/AuthContext.jsx";
import { useI18n } from "../i18n/index.jsx";
import { api } from "../api/client.js";

const STEPS = [
  { icon: UploadCloud, k: "s1" },
  { icon: ScanSearch, k: "s2" },
  { icon: Stethoscope, k: "s3" },
  { icon: FileText, k: "s4" },
];
const SCANS = [
  { img: "/images/modality-chest-xray.svg", k: "chest" },
  { img: "/images/modality-skin.svg", k: "skin" },
  { img: "/images/modality-mri.svg", k: "mri" },
];

export default function Landing() {
  const { user, pending, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = params.get("auth") === "signup" ? "signup" : params.get("auth") === "login" || params.get("error") ? "login" : null;

  // Returning from Google: send the user straight to their dashboard.
  useEffect(() => {
    if (!loading && user && params.get("oauth")) navigate(homeFor(user.role), { replace: true });
  }, [loading, user, params, navigate]);
  const openAuth = (m) => setParams({ auth: m }, { replace: true });
  const closeAuth = () => setParams({}, { replace: true });

  const [menu, setMenu] = useState(false);
  const [specs, setSpecs] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    api.get("/api/specializations").then((d) => setSpecs(d.specializations)).catch(() => {});
  }, []);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const gate = (e) => {
    if (!user) {
      e.preventDefault();
      openAuth("login");
    }
  };
  const specLink = (s) => (user ? (user.role === "patient" ? `/patient/doctors?specialization=${s.slug}` : "/doctor/patients") : "#");

  let delay = 0.15;
  const words = (text) =>
    text.split(" ").map((w, i) => (
      <span key={`${w}${i}`} className="hero-word me-[0.22em]" style={{ animationDelay: `${(delay += 0.12)}s` }}>
        {w}
      </span>
    ));
  const tagLines = t("hero.tag").split("|");

  return (
    <div className="relative min-h-screen">
      <a href="#how" className="skip-link">{t("common.skip")}</a>
      <FlowBackground />

      {/* ================= hero ================= */}
      <section className="relative h-screen min-h-[620px]">
        <div className="frame">
          <header className="relative z-20 flex items-center justify-between gap-3 px-4 pt-5 sm:px-9 sm:pt-7">
            <Link to="/" className="flex items-center gap-2" aria-label="Dhanwantari">
              <img src="/images/logo.svg" alt="" className="h-8 w-8" />
              <span className="text-xl font-bold tracking-tight text-lav-100">DHANWANTARI</span>
            </Link>

            <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
              <Link to={user ? (user.role === "patient" ? "/patient/doctors" : "/doctor/patients") : "#"} onClick={gate} className="nav-link">
                {t("nav.doctors")}
              </Link>
              <div className="relative" ref={menuRef}>
                <button className="nav-link flex items-center gap-1" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="true">
                  {t("nav.specialities")} <ChevronDown className={`h-3.5 w-3.5 transition ${menu ? "rotate-180" : ""}`} />
                </button>
                {menu && (
                  <ul className="glass absolute left-1/2 top-9 w-56 -translate-x-1/2 animate-panel-in p-2">
                    {specs.length === 0 && <li className="px-3 py-2 text-xs text-lav-400">{t("common.loading")}</li>}
                    {specs.map((s) => (
                      <li key={s._id}>
                        <Link to={specLink(s)} onClick={(e) => { setMenu(false); gate(e); }} className="block rounded-lg px-3 py-2 text-sm text-lav-200 hover:bg-white/10">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link to="/blogs" className="nav-link">{t("nav.blogs")}</Link>
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              {user ? (
                <Link to={homeFor(user.role)} className="btn-primary btn-sm">
                  {t("nav.dashboard")} <ChevronRight className="rtl-flip h-3.5 w-3.5" />
                </Link>
              ) : (
                <>
                  <button onClick={() => openAuth("signup")} className="btn-ghost btn-sm hidden rounded-full sm:inline-flex">{t("nav.signup")}</button>
                  <button onClick={() => openAuth("login")} className="btn-primary btn-sm">
                    {t("nav.login")} <ChevronRight className="rtl-flip h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </header>

          <main className="relative z-10 grid h-[calc(100%-5rem)] place-items-center px-6 text-center">
            <h1 className="hero-title -mt-6">
              <span className="block">{words(t("hero.l1"))}</span>
              <span className="block">{words(t("hero.l2"))}</span>
            </h1>
          </main>

          <div className="absolute inset-x-0 bottom-6 z-10 mx-auto w-fit animate-fade-up text-center text-sm leading-snug text-lav-200 sm:text-base" style={{ animationDelay: "1s" }}>
            {tagLines.map((l) => <div key={l}>{l}</div>)}
            <a href="#how" aria-label={t("land.how")} className="bob mx-auto mt-2 block w-fit text-lav-300"><ChevronDown className="h-5 w-5" /></a>
          </div>
        </div>
      </section>

      {/* ================= content sections ================= */}
      <div className="relative z-10 mx-auto max-w-6xl space-y-24 px-4 pb-24 pt-16 sm:px-6">
        <section id="how" className="scroll-mt-8">
          <Reveal><h2 className="text-center text-3xl font-semibold text-lav-100 sm:text-4xl">{t("land.how")}</h2></Reveal>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, k }, i) => (
              <Reveal as="li" key={k} delay={i * 90} className="glass lift p-6">
                <div className="flex items-center justify-between">
                  <span className="step-num grid h-9 w-9 place-items-center rounded-full text-sm font-bold">{i + 1}</span>
                  <Icon className="h-6 w-6 text-lav-300" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-lav-100">{t(`land.${k}t`)}</h3>
                <p className="mt-1.5 text-sm text-lav-300">{t(`land.${k}d`)}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section>
          <Reveal className="text-center">
            <h2 className="text-3xl font-semibold text-lav-100 sm:text-4xl">{t("land.scans")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-lav-300">{t("land.scansSub")}</p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {SCANS.map((s, i) => (
              <Reveal key={s.k} delay={i * 90} className="glass lift flex items-center gap-4 p-5">
                <img src={s.img} alt="" className="h-20 w-20 shrink-0 rounded-2xl" loading="lazy" />
                <div>
                  <p className="text-lg font-semibold text-lav-100">{t(`predict.${s.k}`)}</p>
                  <p className="text-sm text-lav-300">{t(`predict.${s.k}Hint`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {specs.length > 0 && (
          <section>
            <Reveal><h2 className="text-center text-3xl font-semibold text-lav-100 sm:text-4xl">{t("land.specs")}</h2></Reveal>
            <Reveal delay={100} className="mt-8 flex flex-wrap justify-center gap-3">
              {specs.map((s) => (
                <Link key={s._id} to={specLink(s)} onClick={gate} title={s.description} className="chip lift px-5 py-2 text-sm">{s.name}</Link>
              ))}
            </Reveal>
          </section>
        )}

        <Reveal as="section" className="glass relative overflow-hidden p-8 text-center sm:p-12">
          <div className="shine pointer-events-none absolute inset-0" aria-hidden="true" />
          <h2 className="relative text-3xl font-semibold text-lav-100 sm:text-4xl">{t("land.cta")}</h2>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            {user ? (
              <Link to={homeFor(user.role)} className="btn-primary px-7 py-3 text-base">{t("nav.dashboard")}</Link>
            ) : (
              <>
                <button onClick={() => openAuth("signup")} className="btn-primary px-7 py-3 text-base">{t("land.ctaBtn")}</button>
                <button onClick={() => openAuth("login")} className="btn-ghost px-7 py-3 text-base">{t("nav.login")}</button>
              </>
            )}
          </div>
          <p className="relative mx-auto mt-6 flex max-w-xl items-start justify-center gap-2 text-xs text-lav-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> {t("land.notice")}
          </p>
        </Reveal>
      </div>

      <Footer />

      {pending ? <GoogleOnboarding /> : mode && <AuthPanel mode={mode} onMode={openAuth} onClose={closeAuth} />}
    </div>
  );
}
