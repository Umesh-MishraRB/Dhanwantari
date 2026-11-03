/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["\"Baloo Bhai 2\"", "var(--font-lang)", "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        ink: Object.fromEntries([950, 900, 800, 700, 600].map((k) => [k, `rgb(var(--c-ink-${k}) / <alpha-value>)`])),
        lav: Object.fromEntries([100, 200, 300, 400].map((k) => [k, `rgb(var(--c-lav-${k}) / <alpha-value>)`])),
        brand: { 400: "#7c83ff", 500: "#5b5bf0", 600: "#4338ca" },
      },
      boxShadow: { glass: "var(--shadow-glass)" },
      keyframes: {
        "fade-up": { "0%": { opacity: 0, transform: "translateY(18px)", filter: "blur(6px)" }, "100%": { opacity: 1, transform: "none", filter: "blur(0)" } },
        "panel-in": { "0%": { opacity: 0, transform: "translateY(14px) scale(.96)", filter: "blur(8px)" }, "100%": { opacity: 1, transform: "none", filter: "blur(0)" } },
        "fade-in": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up .9s cubic-bezier(.2,.7,.2,1) both",
        "panel-in": "panel-in .45s cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in .4s ease both",
      },
    },
  },
  plugins: [],
};
