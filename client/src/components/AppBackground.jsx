/** Calm, static version of the landing backdrop used behind the logged-in app. */
export default function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950" aria-hidden="true">
      <div className="absolute inset-0" style={{ opacity: "var(--blob-op)" }}>
      <div className="absolute -right-40 -top-40 h-[60vh] w-[50vw] rounded-full opacity-70 blur-[110px]" style={{ background: "radial-gradient(closest-side, rgba(80,70,240,.65), transparent)" }} />
      <div className="absolute -bottom-52 left-[-10vw] h-[55vh] w-[50vw] rounded-full opacity-60 blur-[120px]" style={{ background: "radial-gradient(closest-side, rgba(60,70,220,.5), transparent)" }} />
      </div>
    </div>
  );
}
