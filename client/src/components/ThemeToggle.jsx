import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme.js";
import { useI18n } from "../i18n/index.jsx";

export default function ThemeToggle({ className = "" }) {
  const [theme, toggle] = useTheme();
  const { t } = useI18n();
  const label = theme === "dark" ? t("common.themeLight") : t("common.themeDark");
  return (
    <button onClick={toggle} className={`rounded-full p-2 text-lav-200 transition hover:bg-white/10 ${className}`} aria-label={label} title={label}>
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
