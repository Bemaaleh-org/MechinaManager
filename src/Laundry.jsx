/* ============================================================
   חדר כביסה — תורים למכונת הכביסה ולמייבש
   ------------------------------------------------------------
   רצועת שבוע, ולכל יום שתי עמודות: מכונת כביסה ומייבש. כל
   חניך רואה את כולם (כדי לדעת מתי פנוי), מזמין לעצמו, ועורך
   או מוחק את התורים שלו שטרם עברו. אב הבית והצוות עורכים הכול
   ומזמינים בשם חניך.

   ⚠ **המסך מסתיר בדיוק את מה שהשרת יחסום** — `mine` ו-`past`
     מגיעים מהשרת, ו-`me.manage` הוא מי שרואה כפתורים על תור
     של מישהו אחר. כפתור שמופיע ואז מחזיר 403 הוא הכשל של 4יד.

   ⚠ **"השנה בכביסה" הוא בשביל הכיף, ונאמר במסך.** מספר אחד
     לחניך, בלי דירוג ובלי "מי הכי מלוכלך". מי שירצה להוסיף לו
     עומק — לקרוא את עיקרון 5 קודם.

   ⚠ כשל טעינה, לוח שטרם הוקם ויום ריק הם שלושה מסכים שונים
     (עיקרון 6).
   ============================================================ */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "./api.js";
import ScreenNote from "./ScreenNote.jsx";

const LI = {
  washer: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="13" r="4.5" />
    <path d="M8 6.5h.01M11 6.5h2" /></svg>),
  dryer: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="13" r="4.5" />
    <path d="M10 13a2 2 0 004 0M8 6.5h.01M11 6.5h2" /></svg>),
  chev: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 5l-7 7 7 7" /></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" /></svg>),
  pen: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4" /></svg>),
  trash: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>),
  cup: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 3h8v6a4 4 0 01-8 0V3zM8 5H5a3 3 0 003 3M16 5h3a3 3 0 01-3 3M12 13v4M8 21h8M9 17h6" /></svg>),
  bubble: (p) => (<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <circle cx="9" cy="10" r="5" /><circle cx="17" cy="15" r="3.5" /><circle cx="15" cy="6" r="1.5" /></svg>),
};

/* ---------- תאריכים — חשבון מחרוזות, בלי שעון הדפדפן ---------- */
const DOW = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const parts = (iso) => iso.split("-").map(Number);
const addDays = (iso, n) => {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dow = (iso) => {
  const [y, m, d] = parts(iso);
  return DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};
const dm = (iso) => { const [, m, d] = parts(iso); return `${d}.${m}`; };
const dmy = (iso) => { const [y, m, d] = parts(iso); return `${d}.${m}.${String(y).slice(2)}`; };

const minutesOf = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const hhmm = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const endOf = (b) => (b.minutes ? hhmm(minutesOf(b.hour) + b.minutes) : null);

/** כל שעות הבורר, מהפתיחה לסגירה בקפיצות. */
const slotsOf = (hours) => {
  const out = [];
  for (let m = minutesOf(hours.open); m <= minutesOf(hours.close); m += hours.step) out.push(hhmm(m));
  return out;
};

const KIND_TONE = {
  "לבנים": "tone-6", "צבעוניים": "tone-4", "מצעים ומגבות": "tone-1",
  "עדינה": "tone-5", "מעורב": "tone-3",
};
const MACHINE_ICON = { "מכונת כביסה": LI.washer, "מייבש": LI.dryer };
const MACHINE_TONE = ["tone-6", "tone-3"];

/* ============================================================
   המסך
   ============================================================ */
export default function LaundryPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  /* ⚠ `null` = "עוד לא נבחר": השרת מחזיר את היום, והרצועה נפתחת
     עליו. ברירת מחדל של תאריך מהדפדפן הייתה פותחת על יום אחר
     בערב וב-UTC (4פ). */
  const [from, setFrom] = useState(null);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback((start) => {
    let alive = true;
    setLoading(true);
    const to = start ? addDays(start, 6) : undefined;
    api.getLaundry(start || undefined, to)
      .then((r) => {
        if (!alive) return;
        setD(r); setErr(null);
        setFrom(r.from);
        setSel((s) => (s && s >= r.from && s <= r.to ? s : (r.today >= r.from && r.today <= r.to ? r.today : r.from)));
      })
      .catch((e) => { if (alive) setErr(e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => load(null), [load]);

  const reload = () => load(from);
  const move = (n) => { const f = addDays(from, n); setSel(null); load(f); };

  const days = useMemo(() => (d ? Array.from({ length: 7 }, (_, i) => addDays(d.from, i)) : []), [d]);
  const dayRows = useMemo(() => (d && sel ? d.bookings.filter((b) => b.date === sel) : []), [d, sel]);
  const myUpcoming = useMemo(() => (d ? d.bookings.filter((b) => b.mine && !b.past).length : 0), [d]);
  const yearTotal = useMemo(() => (d ? d.tally.reduce((s, t) => s + t.n, 0) : 0), [d]);

  const remove = (b) => {
    setBusy(b.id);
    api.deleteLaundry(b.id)
      .then(() => { say("התור בוטל"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  /* ---- שלושה מצבים שאינם המסך: הקמה, כשל, טעינה ראשונה ---- */
  if (err?.setupRequired) return (
    <>
      <div className="screen-title">חדר כביסה</div>
      <div className="alert a-amber">
        <div>
          <div className="ttl">לוח הכביסה טרם הוקם</div>
          <div className="bd">
            להריץ <code dir="ltr">npm run seed:laundry</code> ולהכניס את
            <code dir="ltr"> shared/laundry-ids.js </code> לקומיט.
          </div>
        </div>
      </div>
    </>
  );
  if (err) return (
    <>
      <div className="screen-title">חדר כביסה</div>
      <div className="alert a-clay">
        <div>
          <div className="ttl">לא הצלחנו לטעון את חדר הכביסה</div>
          <div className="bd">{err.message}</div>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={reload}>לנסות שוב</button>
    </>
  );
  if (!d) return (
    <>
      <div className="screen-title">חדר כביסה</div>
      <div className="skel" style={{ height: 64, marginBottom: 12 }} />
      <div className="skel" style={{ height: 220 }} />
    </>
  );

  const canTouch = (b) => d.me.manage || (b.mine && !b.past);

  return (
    <>
      <div className="screen-title">חדר כביסה</div>
      <ScreenNote name="note.laundry" say={say} />

      <div className="band">
        <div className="band-h">חדר הכביסה · שבוע {dmy(d.from)} – {dmy(d.to)}</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n num">{d.bookings.length}</div>
            <div className="band-l">תורים השבוע</div>
          </div>
          <div className="band-c">
            <div className={"band-n num" + (myUpcoming ? " ok" : "")}>{myUpcoming}</div>
            <div className="band-l">שלי, קדימה</div>
          </div>
          <div className="band-c">
            <div className="band-n num">{yearTotal}</div>
            <div className="band-l">כביסות השנה</div>
          </div>
        </div>
      </div>

      {/* ---- רצועת השבוע ---- */}
      <div className={"ln-week" + (loading ? " ln-dim" : "")}>
        <button className="ln-arrow" aria-label="שבוע קודם" disabled={loading}
          onClick={() => move(-7)}><LI.chev style={{ transform: "rotate(180deg)" }} /></button>
        <div className="ln-days">
          {days.map((iso) => {
            const n = d.bookings.filter((b) => b.date === iso).length;
            return (
              <button key={iso}
                className={"ln-day" + (iso === sel ? " on" : "") + (iso === d.today ? " today" : "")
                  + (iso < d.today ? " past" : "")}
                onClick={() => setSel(iso)}>
                <span className="ln-dn">{dow(iso)}</span>
                <span className="ln-dd num">{dm(iso)}</span>
                <span className={"ln-dc num" + (n ? "" : " none")}>{n ? n : "·"}</span>
              </button>
            );
          })}
        </div>
        <button className="ln-arrow" aria-label="שבוע הבא" disabled={loading}
          onClick={() => move(7)}><LI.chev /></button>
      </div>

      {/* ---- היום שנבחר: שתי מכונות ---- */}
      <div className="ln-day-h">
        <b>יום {dow(sel)} · {dmy(sel)}</b>
        {sel === d.today && <span className="pill p-ok">היום</span>}
        {sel < d.today && <span className="pill p-idle">עבר</span>}
      </div>

      {dayRows.length === 0 && (
        <div className="empty">
          <div className="e-ico tone-6"><LI.bubble /></div>
          <div className="e1">{sel < d.today ? "לא היו תורים ביום הזה" : "המכונות פנויות"}</div>
          <div className="e2">
            {sel < d.today ? "מה שלא נרשם — לא נספר." : "עוד אין תורים ליום הזה. כל השעות פתוחות."}
          </div>
        </div>
      )}

      <div className="ln-cols">
        {d.machines.map((m, mi) => {
          const Icon = MACHINE_ICON[m] || LI.washer;
          const rows = dayRows.filter((b) => b.machine === m);
          return (
            <div key={m} className={"ln-col " + (MACHINE_TONE[mi] || "tone-2")}>
              <div className="ln-col-h">
                <span className="tile sm"><Icon /></span>
                <b>{m}</b>
                <span className="ln-fun num">{rows.length ? `${rows.length} תורים` : "פנוי"}</span>
              </div>
              {rows.length > 0 && (
                <div className="rows">
                  {rows.map((b) => (
                    <div key={b.id} className={"st-row" + (b.mine ? " ln-mine" : "")}>
                      <div className="st-main">
                        <div className="st-n">
                          <span className="ln-hr num" dir="ltr">{b.hour}{endOf(b) ? `–${endOf(b)}` : ""}</span>
                          {" · "}{b.studentName}
                          {b.mine && <span className="ln-me">אני</span>}
                        </div>
                        <div className="st-m">
                          {b.kind && <span className={"pill ln-kind " + (KIND_TONE[b.kind] || "tone-2")}>{b.kind}</span>}
                          {/* ⚠ משך שנמחק בלוח מוצג כחסר ולא כשעה (4ט). */}
                          {b.minutes ? <span className="num">{b.minutes} דק׳</span> : <span>משך לא ידוע</span>}
                          {b.note && <span className="ln-note">{b.note}</span>}
                        </div>
                      </div>
                      {canTouch(b) && (
                        <div className="ln-acts">
                          <button className="ln-ib" aria-label="עריכה" disabled={busy === b.id}
                            onClick={() => setForm({ ...b })}><LI.pen /></button>
                          <button className="ln-ib del" aria-label="ביטול התור" disabled={busy === b.id}
                            onClick={() => remove(b)}><LI.trash /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- הזמנה ---- */}
      {form ? (
        <BookingForm d={d} sel={sel} initial={form} say={say}
          onDone={() => { setForm(null); reload(); }}
          onCancel={() => setForm(null)} />
      ) : (
        <button className="btn btn-primary" style={{ marginTop: 14 }}
          disabled={!d.me.manage && sel < d.today}
          onClick={() => setForm({ date: sel >= d.today || d.me.manage ? sel : d.today })}>
          <LI.plus />תור חדש
        </button>
      )}
      {!d.me.manage && (
        <div className="ln-fun" style={{ margin: "8px 2px 0" }}>
          עד שני תורים קדימה לכל אחד. תור שעבר אי אפשר לשנות — הוא כבר נספר.
        </div>
      )}

      {/* ---- השנה בכביסה ---- */}
      <Tally tally={d.tally} me={d.me} />
    </>
  );
}

/* ============================================================
   טופס תור — חדש או עריכה
   ============================================================ */
function BookingForm({ d, sel, initial, say, onDone, onCancel }) {
  const editing = Boolean(initial?.id);
  const slots = useMemo(() => slotsOf(d.hours), [d.hours]);

  /* ⚠ ברירת המחדל לשעה היא הראשונה שפנויה במכונה ביום הזה —
     לא "07:00" שכמעט תמיד תפוסה בבוקר. */
  const firstFree = (machine, date, minutes) => {
    const taken = d.bookings.filter((b) => b.machine === machine && b.date === date && b.id !== initial?.id);
    for (const s of slots) {
      const st = minutesOf(s), en = st + minutes;
      const hit = taken.some((b) => {
        const bs = minutesOf(b.hour), be = bs + (b.minutes || d.hours.step);
        return st < be && bs < en;
      });
      if (!hit) return s;
    }
    return slots[0];
  };

  const [f, setF] = useState(() => ({
    date: initial?.date || sel || d.today,
    machine: initial?.machine || d.machines[0],
    hour: initial?.hour || firstFree(initial?.machine || d.machines[0], initial?.date || sel || d.today, 60),
    minutes: initial?.minutes || 60,
    kind: initial?.kind || d.kinds[0],
    note: initial?.note || "",
    /* ⚠ ריק = "בשבילי". רק `manage` רואה את הבורר. */
    studentId: (d.me.manage && initial?.student && initial.student !== d.me.id) ? initial.student : "",
  }));
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (busy) return;
    setBusy(true);
    const body = {
      date: f.date, hour: f.hour, machine: f.machine, kind: f.kind,
      minutes: f.minutes, note: f.note.trim(),
      ...(d.me.manage && f.studentId ? { studentId: f.studentId } : {}),
    };
    (editing ? api.editLaundry({ id: initial.id, ...body }) : api.addLaundry(body))
      .then(() => { say(editing ? "התור עודכן" : "התור נרשם"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="card lift" style={{ marginTop: 14 }}>
      <div className="grp-h"><span>{editing ? "עריכת תור" : "תור חדש"}</span></div>

      {d.me.manage && d.students && (
        <div className="fld">
          <label>בשביל מי</label>
          <select value={f.studentId} disabled={busy} onChange={(e) => set("studentId", e.target.value)}>
            <option value="">בשבילי</option>
            {d.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div className="fld">
        <label>מכונה</label>
        <div className="pick">
          {d.machines.map((m) => {
            const Icon = MACHINE_ICON[m] || LI.washer;
            return (
              <button type="button" key={m} className={f.machine === m ? "on" : ""} disabled={busy}
                onClick={() => set("machine", m)}><Icon /> {m}</button>
            );
          })}
        </div>
      </div>

      <div className="two">
        <div className="fld">
          <label>תאריך</label>
          {/* ⚠ הצוות רושם גם בדיעבד; חניך — מהיום והלאה. השרת אוכף
              את שניהם, השדה רק מונע הקלדה שתיפול. */}
          <input type="date" dir="ltr" value={f.date} disabled={busy}
            min={d.me.manage ? undefined : d.today}
            onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="fld">
          <label>שעת התחלה</label>
          <select value={f.hour} dir="ltr" disabled={busy} onChange={(e) => set("hour", e.target.value)}>
            {slots.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="fld">
        <label>משך</label>
        <div className="pick pick-wrap ln-wrap">
          {d.durations.map((n) => (
            <button type="button" key={n} className={f.minutes === n ? "on" : ""} disabled={busy}
              onClick={() => set("minutes", n)}>{n} דק׳</button>
          ))}
        </div>
        <div className="ln-fun" style={{ marginTop: 5 }}>
          יסתיים ב-<span className="num" dir="ltr">{hhmm(minutesOf(f.hour) + f.minutes)}</span>
        </div>
      </div>

      <div className="fld">
        <label>סוג הכביסה</label>
        <div className="pick pick-wrap ln-wrap">
          {d.kinds.map((k) => (
            <button type="button" key={k} className={f.kind === k ? "on" : ""} disabled={busy}
              onClick={() => set("kind", k)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="fld">
        <label>הערה</label>
        <input value={f.note} disabled={busy} placeholder="לא חובה"
          onChange={(e) => set("note", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={save}>
          {editing ? "שמירה" : "הזמנת התור"}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   השנה בכביסה — בשביל הכיף בלבד
   ⚠ מספר אחד לחניך. לא מי כיבס מה, לא מתי, ולא ממוצע. זה
     נשאר "כיף" בדיוק כל עוד אין בו מה להשוות (עיקרון 5).
   ============================================================ */
const TOP = 10;
function Tally({ tally, me }) {
  const [all, setAll] = useState(false);
  const shown = all ? tally : tally.slice(0, TOP);
  const more = tally.length - shown.length;

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="ln-tally-h">
        <span className="tile sm tone-3"><LI.cup /></span>
        <div>
          <b>השנה בכביסה</b>
          <span className="ln-fun">בשביל הכיף בלבד · כמה מכונות הפעיל כל אחד</span>
        </div>
      </div>

      {tally.length === 0 ? (
        <div className="empty" style={{ padding: "18px 8px" }}>
          <div className="e1">עוד לא הופעלה אף מכונה</div>
          <div className="e2">התור הראשון שיעבור יפתח את הספירה.</div>
        </div>
      ) : (
        <>
          <div className="ln-tally">
            {shown.map((t, i) => (
              <div key={t.id} className={"ln-trow" + (t.id === me.id ? " ln-mine" : "")}>
                <span className={"ln-rank num " + (i < 3 ? ["tone-3", "tone-2", "tone-8"][i] : "tone-6")}>{i + 1}</span>
                <span className="ln-tname">{t.name}{t.id === me.id && <span className="ln-me">אני</span>}</span>
                <b className="num">{t.n}</b>
              </div>
            ))}
          </div>
          {more > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setAll(true)}>
              ועוד {more}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   עיצוב — נספח ל-src/styles.js
   ⚠ אין כאן בקטיקים (המחרוזת כולה היא template literal), הקידומת
     `.ln-` בלבד, וכל כלל על <button> נושא `.kx` — האיפוס
     `.kx button` גובר אחרת (4מח).
   ============================================================ */
export const LAUNDRY_CSS = `
/* ---- חדר כביסה ---- */
.ln-week{display:flex;gap:6px;align-items:stretch;margin-bottom:12px;transition:opacity .12s var(--ease)}
.ln-dim{opacity:.55;pointer-events:none}
.kx .ln-arrow{flex:0 0 34px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface);
  color:var(--muted);display:grid;place-items:center;box-shadow:var(--sh-1)}
.kx .ln-arrow:disabled{opacity:.4}
.ln-days{flex:1;display:grid;grid-template-columns:repeat(7,1fr);gap:5px;min-width:0}
.kx .ln-day{display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 2px 6px;
  border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface);color:var(--ink);
  box-shadow:var(--sh-1);transition:transform .12s var(--ease),box-shadow .12s var(--ease)}
.kx .ln-day:active{transform:translateY(1px)}
.kx .ln-day.past{color:var(--faint)}
.kx .ln-day.today{border-color:var(--accent)}
.kx .ln-day.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent);box-shadow:var(--sh-2)}
.ln-dn{font-size:11px;font-weight:800;letter-spacing:.2px}
.ln-dd{font-size:12px;font-weight:700}
.ln-dc{font-size:10.5px;font-weight:800;margin-top:2px;min-height:14px}
.ln-dc.none{opacity:.45}
.ln-day-h{display:flex;align-items:center;gap:8px;margin:14px 2px 8px;font-size:15px}
.ln-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:540px){.ln-cols{grid-template-columns:1fr}}
.ln-col{min-width:0}
.ln-col-h{display:flex;align-items:center;gap:8px;margin:0 2px 7px;font-size:14px}
.ln-col-h .ln-fun{margin-inline-start:auto}
.ln-hr{font-weight:800;letter-spacing:.2px;display:inline-block}
.ln-note{color:var(--faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ln-kind{background:var(--t-s);color:var(--t)}
.ln-me{font-size:10px;font-weight:800;color:var(--accent);background:var(--t6-s);
  border-radius:5px;padding:1px 5px;margin-inline-start:6px;vertical-align:middle}
.st-row.ln-mine,.ln-trow.ln-mine{background:var(--t6-s)}
.ln-acts{display:flex;gap:4px;flex:0 0 auto}
.kx .ln-ib{width:34px;height:34px;border-radius:var(--r-sm);display:grid;place-items:center;
  color:var(--muted);border:1px solid var(--line);background:var(--surface)}
.kx .ln-ib.del{color:var(--clay)}
.kx .ln-ib:disabled{opacity:.4}
.kx .ln-wrap button{flex:1 0 28%}
.ln-fun{font-size:12px;color:var(--faint);font-weight:600;display:block}
.ln-tally-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.ln-tally-h b{display:block;font-size:15px}
.ln-tally{display:flex;flex-direction:column}
.ln-trow{display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--line);
  border-radius:var(--r-sm)}
.ln-trow:last-child{border-bottom:none}
.ln-rank{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;flex:0 0 auto;
  font-size:12.5px;font-weight:800;background:var(--t-s);color:var(--t)}
.ln-tname{flex:1;min-width:0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
