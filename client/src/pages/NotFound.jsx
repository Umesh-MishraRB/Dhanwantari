import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="glass max-w-md p-8">
        <Compass className="mx-auto h-9 w-9 text-lav-300" />
        <h1 className="mt-3 text-2xl font-light text-lav-100">{t("nf.title")}</h1>
        <p className="muted mt-2">{t("nf.body")}</p>
        <Link to="/" className="btn-primary mt-5">{t("nf.home")}</Link>
      </div>
    </div>
  );
}
