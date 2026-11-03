
import { Coffee, Heart } from "lucide-react";
import { useI18n } from "../i18n/index.jsx";

const NAMES = { a: "Umesh", b: "Lakshya" };

/** Made with love and chai by Umesh and Lakshya under the guidance of Dr. Rahul Kumar Sharma. */
export default function Footer({ className = "" }) {
  const { t } = useI18n();
  const parts = t("footer.made").split(/(\{a\}|\{b\})/g);

  return (
    <footer className={`relative z-10 border-t border-white/10 px-4 py-8 text-center ${className}`}>
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-lav-200">
        <Heart
          className="h-4 w-4 fill-rose-400 text-rose-400 motion-safe:animate-pulse"
          aria-hidden="true"
        />

        <span>
          {parts.map((p, i) =>
            p === "{a}" ? (
              <strong key={i} className="font-semibold text-lav-100">
                {NAMES.a}
              </strong>
            ) : p === "{b}" ? (
              <strong key={i} className="font-semibold text-lav-100">
                {NAMES.b}
              </strong>
            ) : (
              <span key={i}>{p}</span>
            )
          )}
        </span>

        <Coffee className="h-4 w-4 text-amber-300" aria-hidden="true" />
      </p>

      <p className="mt-1 text-xs text-lav-300">
        Under the guidance of{" "}
        <strong className="font-semibold text-lav-100">
          Dr. Rahul Kumar Sharma
        </strong>
      </p>

      <p className="mt-2 text-xs text-lav-400">
        © {new Date().getFullYear()} {t("footer.rights")} · {t("footer.note")}
      </p>
    </footer>
  );
}
