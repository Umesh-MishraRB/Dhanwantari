import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Trash2, Wand2 } from "lucide-react";
import { api } from "../../api/client.js";
import { useApi } from "../../lib/useApi.js";
import { FormError, FormNotice, PageHeader, Spinner, StatusBadge } from "../../components/ui.jsx";
import { fmtDate, fmtTime, todayStr } from "../../lib/format.js";

const pad = (n) => String(n).padStart(2, "0");
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = `${ym.y}-${pad(ym.m + 1)}-01`;
  const lastDay = new Date(ym.y, ym.m + 1, 0).getDate();
  const last = `${ym.y}-${pad(ym.m + 1)}-${pad(lastDay)}`;

  const avail = useApi(`/api/availability/me?from=${first}&to=${last}`);
  const appts = useApi(`/api/appointments?from=${first}&to=${last}&status=requested,confirmed,completed&sort=asc`);

  const [sel, setSel] = useState(todayStr());
  const [draft, setDraft] = useState([]); // editable (free) slots for the selected date
  const [newSlot, setNewSlot] = useState({ start: "10:00", end: "10:30" });
  const [gen, setGen] = useState({ start: "10:00", end: "13:00", mins: 30 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ error: "", ok: "" });

  const byDate = useMemo(() => Object.fromEntries((avail.data?.availability || []).map((d) => [d.date, d])), [avail.data]);
  const apptsByDate = useMemo(() => {
    const m = {};
    (appts.data?.appointments || []).forEach((a) => (m[a.date] ||= []).push(a));
    return m;
  }, [appts.data]);

  const day = byDate[sel];
  const booked = (day?.slots || []).filter((s) => s.isBooked);
  // reload the draft whenever the server data or the selected day changes ...
  useEffect(() => {
    setDraft((byDate[sel]?.slots || []).filter((s) => !s.isBooked).map((s) => ({ startTime: s.startTime, endTime: s.endTime })));
  }, [sel, byDate]);
  // ... but only clear messages when the day changes (otherwise "saved" vanishes right after reload)
  useEffect(() => {
    setMsg({ error: "", ok: "" });
  }, [sel]);

  const isPast = sel < todayStr();
  const addSlot = () => {
    if (toMin(newSlot.end) <= toMin(newSlot.start)) return setMsg({ error: "End time must be after start time.", ok: "" });
    setMsg({ error: "", ok: "" });
    setDraft((d) => [...d.filter((s) => s.startTime !== newSlot.start), { startTime: newSlot.start, endTime: newSlot.end }].sort((a, b) => a.startTime.localeCompare(b.startTime)));
  };
  const generate = () => {
    const out = [];
    for (let m = toMin(gen.start); m + Number(gen.mins) <= toMin(gen.end); m += Number(gen.mins)) out.push({ startTime: toTime(m), endTime: toTime(m + Number(gen.mins)) });
    if (!out.length) return setMsg({ error: "No slots fit in that range.", ok: "" });
    setMsg({ error: "", ok: "" });
    setDraft((d) => {
      const map = new Map(d.map((s) => [s.startTime, s]));
      out.forEach((s) => map.set(s.startTime, s));
      return [...map.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  };

  const save = async () => {
    if (sel === todayStr()) {
      const t = new Date();
      const nowMin = t.getHours() * 60 + t.getMinutes();
      const past = draft.filter((x) => toMin(x.startTime) <= nowMin);
      if (past.length) return setMsg({ error: `Today's time has already passed for: ${past.map((x) => fmtTime(x.startTime)).join(", ")}. Choose later times or pick another date.`, ok: "" });
    }
    setBusy(true); setMsg({ error: "", ok: "" });
    try {
      const { day: saved } = await api.put(`/api/availability/${sel}`, { slots: draft });
      await avail.reload();
      setMsg({ error: "", ok: `Saved ${saved?.slots?.length || 0} slot(s) for ${fmtDate(sel)}. Patients can book them now.` });
    } catch (e) { setMsg({ error: e.message, ok: "" }); } finally { setBusy(false); }
  };
  const clearDay = async () => {
    if (!window.confirm("Remove all open slots for this day?")) return;
    setBusy(true);
    try { await api.del(`/api/availability/${sel}`); await avail.reload(); } catch (e) { setMsg({ error: e.message, ok: "" }); } finally { setBusy(false); }
  };

  const cells = [...Array(new Date(ym.y, ym.m, 1).getDay()).fill(null), ...Array.from({ length: lastDay }, (_, i) => i + 1)];
  const shift = (d) => setYm(({ y, m }) => { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; });

  return (
    <div className="stagger">
      <PageHeader title="Calendar & availability" subtitle="Choose the dates and time slots patients can book." />
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="glass p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <button className="rounded-full p-2 hover:bg-white/10" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="h2">{new Date(ym.y, ym.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <button className="rounded-full p-2 hover:bg-white/10" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-lav-400">{WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {cells.map((n, i) => {
              if (!n) return <div key={`e${i}`} />;
              const date = `${ym.y}-${pad(ym.m + 1)}-${pad(n)}`;
              const d = byDate[date];
              const free = d ? d.slots.filter((s) => !s.isBooked).length : 0;
              const count = apptsByDate[date]?.length || 0;
              const active = sel === date;
              return (
                <button key={date} onClick={() => setSel(date)} className={`flex aspect-square flex-col items-center justify-between rounded-xl border p-1.5 text-sm transition ${active ? "border-lav-200 bg-white/15" : "border-white/10 hover:bg-white/10"} ${date < todayStr() ? "opacity-45" : ""} ${date === todayStr() ? "ring-1 ring-brand-400" : ""}`}>
                  <span className="text-lav-100">{n}</span>
                  <span className="flex gap-1">
                    {free > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" title={`${free} open`} />}
                    {count > 0 && <span className="rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">{count}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="muted mt-4 flex gap-4 text-xs"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-300" />open slots</span><span><span className="mr-1 inline-block rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">2</span>appointments</span></p>
        </section>

        <section className="glass space-y-5 p-5 lg:col-span-2">
          <h2 className="h2">{fmtDate(sel)}</h2>

          {apptsByDate[sel]?.length > 0 && (
            <div>
              <p className="label">Appointments</p>
              <ul className="space-y-2">
                {apptsByDate[sel].map((a) => (
                  <li key={a._id}><Link to={`/doctor/appointments/${a._id}`} className="glass-soft flex items-center justify-between gap-2 p-2.5 text-sm hover:bg-white/10"><span>{fmtTime(a.startTime)} - {a.patient?.name}</span><StatusBadge status={a.status} /></Link></li>
                ))}
              </ul>
            </div>
          )}

          {isPast ? <p className="muted">Past dates cannot be edited.</p> : (
            <>
              <div>
                <p className="label">Open slots</p>
                {booked.length > 0 && <p className="muted mb-2 text-xs">{booked.length} booked slot(s) are locked and stay as they are.</p>}
                <div className="flex flex-wrap gap-2">
                  {draft.map((s) => (
                    <span key={s.startTime} className="chip gap-1.5">{fmtTime(s.startTime)} - {fmtTime(s.endTime)}
                      <button onClick={() => setDraft((d) => d.filter((x) => x.startTime !== s.startTime))} aria-label={`Remove ${s.startTime}`}><Trash2 className="h-3 w-3" /></button>
                    </span>
                  ))}
                  {booked.map((s) => <span key={s.startTime} className="chip border-brand-400/50 bg-brand-500/20">{fmtTime(s.startTime)} booked</span>)}
                  {!draft.length && !booked.length && <span className="muted">No slots for this day yet.</span>}
                </div>
              </div>

              <div>
                <p className="label">Add one slot</p>
                <div className="flex items-center gap-2">
                  <input type="time" className="input" value={newSlot.start} onChange={(e) => setNewSlot((s) => ({ ...s, start: e.target.value }))} />
                  <span>-</span>
                  <input type="time" className="input" value={newSlot.end} onChange={(e) => setNewSlot((s) => ({ ...s, end: e.target.value }))} />
                  <button className="btn-ghost btn-sm" onClick={addSlot} aria-label="Add slot"><Plus className="h-4 w-4" /></button>
                </div>
              </div>

              <div>
                <p className="label">Or generate a block</p>
                <div className="grid grid-cols-3 gap-2">
                  <input type="time" className="input" value={gen.start} onChange={(e) => setGen((s) => ({ ...s, start: e.target.value }))} aria-label="Block start" />
                  <input type="time" className="input" value={gen.end} onChange={(e) => setGen((s) => ({ ...s, end: e.target.value }))} aria-label="Block end" />
                  <select className="input" value={gen.mins} onChange={(e) => setGen((s) => ({ ...s, mins: e.target.value }))} aria-label="Slot length">{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
                </div>
                <button className="btn-ghost btn-sm mt-2" onClick={generate}><Wand2 className="h-4 w-4" /> Generate slots</button>
              </div>

              <FormError>{msg.error}</FormError><FormNotice>{msg.ok}</FormNotice>
              <div className="flex gap-3">
                <button className="btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />} Save day</button>
                {day && <button className="btn-danger" onClick={clearDay} disabled={busy}>Clear day</button>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
