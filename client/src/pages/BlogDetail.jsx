import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { useApi } from "../lib/useApi.js";
import { ErrorState, PageLoader } from "../components/ui.jsx";

const Section = ({ title, items }) => items?.length ? (
  <section className="glass p-6">
    <h2 className="h2 mb-3">{title}</h2>
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-lav-200 marker:text-brand-400">{items.map((i) => <li key={i}>{i}</li>)}</ul>
  </section>
) : null;

export default function BlogDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(`/api/blogs/${slug}`);
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const b = data.blog;
  return (
    <article className="stagger mx-auto max-w-3xl space-y-5">
      <Link to="/blogs" className="inline-flex items-center gap-1 text-sm text-lav-300 hover:text-white"><ChevronLeft className="h-4 w-4" /> Health library</Link>
      {/* IMAGE: blog cover (blogs.coverImageUrl) */}
      <img src={b.coverImageUrl || "/images/blog-placeholder.svg"} alt="" className="h-52 w-full rounded-2xl bg-ink-800 object-cover" />
      <header>
        <span className="text-xs font-medium uppercase tracking-wider text-brand-400">{b.category} - {b.readMinutes} min read</span>
        <h1 className="h1 mt-1">{b.title}</h1>
        <p className="mt-3 text-lav-300">{b.summary}</p>
      </header>
      {b.overview && <section className="glass p-6"><h2 className="h2 mb-3">Overview</h2><p className="text-sm leading-relaxed text-lav-200">{b.overview}</p></section>}
      <Section title="Common symptoms" items={b.symptoms} />
      <Section title="Precautions" items={b.precautions} />
      <Section title="General treatment information" items={b.treatments} />
      <Section title="When to see a doctor" items={b.whenToSeeDoctor} />
      <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-xs text-amber-100/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>This article is general health information, not personal medical advice or a diagnosis. Talk to a qualified doctor about your own situation.</span>
      </div>
    </article>
  );
}
