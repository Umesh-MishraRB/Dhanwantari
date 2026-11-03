import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import AppBackground from "./AppBackground.jsx";
import Footer from "./Footer.jsx";
import { useI18n } from "../i18n/index.jsx";

export default function Layout() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">{t("common.skip")}</a>
      <AppBackground />
      <Navbar />
      <main id="main" className="page flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
