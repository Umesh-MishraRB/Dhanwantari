import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Search } from "lucide-react";
import { useApi } from "../lib/useApi.js";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "../components/ui.jsx";

export default function Blogs() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [cat, setCat] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const { data, loading, error, reload } = useApi(`/api/blogs?q=${encodeURIComponent(dq)}&category=${encodeURIComponent(cat)}`);

  return (
    <div className="stagger">
      <PageHeader title="Health library" subtitle="Plain-language articles on common conditions, precautions and general treatment information." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lav-400" />
          <input className="input pl-9" placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search articles" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`chip ${!cat ? "chip-active" : ""}`} onClick={() => setCat("")}>All</button>
          {data?.categories.map((c) => <button key={c} className={`chip ${cat === c ? "chip-active" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      </div>
      {loading && !data ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.blogs.length ? <EmptyState title="No articles found" /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.blogs.map((b) => (
            <Link key={b._id} to={`/blogs/${b.slug}`} className="glass group flex flex-col overflow-hidden transition hover:-translate-y-1">
              {/* IMAGE: blog cover (blogs.coverImageUrl) - placeholder in /public/images/blog-placeholder.svg */}
              <img src={b.coverImageUrl || "/images/image.png"} alt="" className="h-36 w-full bg-ink-800 object-cover" />
              <div className="flex flex-1 flex-col p-5">
                <span className="text-xs font-medium uppercase tracking-wider text-brand-400">{b.category}</span>
                <h2 className="mt-1 text-lg font-medium text-lav-100">{b.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-lav-300">{b.summary}</p>
                <p className="muted mt-auto flex items-center gap-1 pt-4 text-xs"><Clock className="h-3.5 w-3.5" /> {b.readMinutes} min read</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
