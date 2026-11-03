import { Link } from "react-router-dom";

export default function Brand({ to = "/", className = "" }) {
  return (
    <Link to={to} className={`flex items-center gap-2 ${className}`} aria-label="Dhanwantari home">
      {/* IMAGE: brand logo - replace /public/images/logo.svg */}
      <img src="/images/logo.svg" alt="" className="h-7 w-7" />
      <span className="text-lg font-semibold tracking-tight text-lav-100">Dhanwantari</span>
    </Link>
  );
}
