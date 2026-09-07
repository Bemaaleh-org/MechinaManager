/* ============================================================
   משמר — הערב הארוך, והרשומה שנשארת ממנו
   ------------------------------------------------------------
   שני מסכים ברכיב אחד: הרשימה (קרובים · שהיו) והמשמר עצמו —
   רצועת כותרת, ומתחתיה הלו״ז כציר זמן אנכי. כל מפגש נפתח למה
   שתוכנן, למה שהיה, לדפי העזר, ולדירוג.

   ⚠⚠ **מי מארגן נקבע בשרת** (`canEdit`, `canCreate`), והמסך
     מציע עריכה בדיוק למי שהשרת יאשר — כפתור שמופיע ונופל
     ב-403 אחרי שהמשתמש הקליד הוא הכשל של 4יד.

   ⚠ **הדירוג אופטימי, ובכישלון חוזר אחורה ואומר** (4י).

   ⚠ **תיאור ו"מה היה" מוצגים בנפרד ובשני מראות.** מה שתכננו
     ומה שקרה הם שני דברים; ברגע שהם נראים אותו דבר החניך
     שחוזר לכאן אחרי חודש לא יודע מה מהם באמת קרה.

   ⚠ **כשל טעינה ≠ ריק ≠ טרם הוקם.** שלושה מסכים שונים.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScreenNote from "./ScreenNote.jsx";

const MS = {
  moon: (p) => (<svg viewBox="0 0 24 24" width="22" height="22" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>),
  cal: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  pin: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>),
  user: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>),
  users: (p) => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0114 0" /><circle cx="17" cy="9" r="3" />
    <path d="M15.5 14.5A5.5 5.5 0 0122 20" /></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" /></svg>),
  back: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M12 5l7 7-7 7" /></svg>),
  edit: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13 7l4 4" /></svg>),
  trash: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>),
  file: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></svg>),
  upload: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>),
  star: (p) => (<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"
    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}>
    <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>),
  chev: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 9l6 6 6-6" /></svg>),
  warn: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>),
};

/* ---------- עזרי תאריך ושעה ---------- */
const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};
const MONTHS = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יוני", "יולי", "אוג", "ספט", "אוק", "נוב", "דצמ"];
const weekday = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso + "T12:00:00Z")
      .toLocaleDateString("he-IL", { weekday: "long", timeZone: "Asia/Jerusalem" });
  } catch { return ""; }
};
const daysUntil = (today, iso) => {
  if (!today || !iso) return null;
  return Math.round((Date.parse(iso + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000);
};
const soonText = (n) => (n === 0 ? "היום" : n === 1 ? "מחר" : n > 1 ? `בעוד ${n} ימים` : "");
const minsOf = (t) => {
  const m = /^(\d{2}):(\d{2})$/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const addMin = (t, n) => {
  const base = minsOf(t);
  if (base === null || !Number.isFinite(n)) return null;
  const x = (base + n) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};
/* ⚠ סיום אחרי חצות הוא ערב ארוך, לא שגיאה — מוסיפים יממה. */
const spanHours = (start, end) => {
  const a = minsOf(start), b = minsOf(end);
  if (a === null || b === null) return null;
  const d = b >= a ? b - a : b + 1440 - a;
  return Math.round((d / 60) * 10) / 10;
};

/* ⚠ הגוון נגזר מהשם ואינו נשמר — כמו tone() בשיבוצים (4ג). */
const toneOf = (name) => {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return "tone-" + ((h % 8) + 1);
};
/* ⚠ סוג המפגש בגוון קבוע: שיעור ושיח צריכים להיראות שונים גם
   בלי לקרוא את התווית. */
const KIND_TONE = {
  "שיעור": "tone-1", "סדנה": "tone-3", "שיח": "tone-6",
  "הפסקה": "tone-4", "ארוחה": "tone-2", "אחר": "tone-8",
};
const STATUS_PILL = {
  "בתכנון": "p-new", "פורסם": "p-ok", "התקיים": "p-idle", "בוטל": "p-low",
};
const STATUSES_FALLBACK = ["בתכנון", "פורסם", "התקיים", "בוטל"];
const KINDS_FALLBACK = ["שיעור", "סדנה", "שיח", "הפסקה", "ארוחה", "אחר"];
const PARTIAL_NAME = { ratings: "הדירוגים", teams: "רשימת הצוותים" };

/* ⚠ base64 מנפח בשליש, ופונקציית Vercel מקבלת גוף עד 4.5MB —
   קובץ של 3MB הוא הגבול שבו ההעלאה עוד מגיעה לשרת. */
const MAX_UPLOAD = 3 * 1024 * 1024;

/* ============================================================
   המסך
   ============================================================ */
export default function MishmarPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    setErr(null);
    api.getMishmarim().then(setD).catch(setErr);
  }, []);
  useEffect(load, [load]);

  /* ⚠ שלושה מצבים, שלושה מסכים: טרם הוקם · נכשל · נטען. */
  if (err?.setupRequired) return (
    <>
      <div className="screen-title">משמר</div>
      <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <div style={{ marginBottom: 8 }}><MS.moon /></div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>לוחות המשמר טרם הוקמו</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          {err.message}. להריץ <b dir="ltr">npm run seed:mishmar</b> ולהכניס את
          קובץ המזהים לקומיט.
        </div>
      </div>
    </>
  );
  if (err) return (
    <>
      <div className="screen-title">משמר</div>
      <div className="alert a-clay">
        <MS.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">לא הצלחנו לטעון את המשמרים</div>
          <div className="bd">{err.message}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={load}>לנסות שוב</button>
        </div>
      </div>
    </>
  );
  if (!d) return (
    <>
      <div className="screen-title">משמר</div>
      <div className="skel" style={{ height: 96, marginBottom: 10 }} />
      <div className="skel" style={{ height: 96 }} />
    </>
  );

  if (openId) {
    const initial = [...d.upcoming, ...d.past].find((e) => e.id === openId) || null;
    return (
      <Detail id={openId} initial={initial} d={d} say={say}
        onBack={() => { setOpenId(null); load(); }} />
    );
  }
  return <ListView d={d} say={say} reload={load} onOpen={setOpenId} />;
}

function PartialNote({ partial }) {
  if (!partial || !partial.length) return null;
  return (
    <div className="ms-note ms-warn">
      <MS.warn /> חלק מהנתונים לא נטענו: {partial.map((p) => PARTIAL_NAME[p] || p).join(", ")}.
      מה שמוצג נכון, אבל חסר.
    </div>
  );
}

/* ============================================================
   הרשימה
   ============================================================ */
function ListView({ d, say, reload, onOpen }) {
  const [adding, setAdding] = useState(false);
  const total = d.upcoming.length + d.past.length;

  return (
    <>
      <div className="screen-title">משמר</div>
      <ScreenNote name="note.mishmar" say={say} />
      <PartialNote partial={d.partial} />

      {total === 0 && !adding && (
        <div className="empty">
          <div className="e-ico"><MS.moon /></div>
          <div className="e1">אין עדיין משמרים</div>
          <div className="e2">
            משמר הוא ערב לימוד ארוך שהמכינה מקיימת מדי פעם. כשייפתח אחד — הלו״ז,
            דפי העזר והסיכום יהיו כאן.
          </div>
        </div>
      )}

      {d.upcoming.length > 0 && (
        <>
          <div className="sec-label">משמר קרוב</div>
          {d.upcoming.map((e) => (
            <EventCard key={e.id} e={e} today={d.today} onOpen={() => onOpen(e.id)} />
          ))}
        </>
      )}

      {d.canCreate && (adding ? (
        <EventForm d={d} say={say} onDone={() => { setAdding(false); reload(); }}
          onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, marginBottom: 6 }}
          onClick={() => setAdding(true)}><MS.plus />משמר חדש</button>
      ))}

      {d.past.length > 0 && (
        <>
          <div className="sec-label">משמרים שהיו</div>
          {d.past.map((e) => (
            <EventCard key={e.id} e={e} today={d.today} past onOpen={() => onOpen(e.id)} />
          ))}
        </>
      )}
    </>
  );
}

function EventCard({ e, today, past, onOpen }) {
  const [y, m, day] = (e.date || "").split("-");
  const soon = past ? "" : soonText(daysUntil(today, e.date));
  const rated = e.sessions.filter((s) => s.votes > 0);
  return (
    <button className={"ms-card " + toneOf(e.title) + (past ? " ms-past" : "")} onClick={onOpen}>
      <div className="ms-date">
        <b className="num">{Number(day) || "?"}</b>
        <span>{MONTHS[Number(m) - 1] || ""}{y ? " " + y.slice(2) : ""}</span>
      </div>
      <div className="ms-card-main">
        <div className="ms-card-top">
          <div className="ms-t">{e.title}</div>
          <span className={"pill " + (STATUS_PILL[e.status] || "p-idle")}>{e.status}</span>
        </div>
        {e.theme && <div className="ms-theme">{e.theme}</div>}
        <div className="ms-meta">
          {soon && <span className="ms-soon">{soon}</span>}
          {e.teamName && <span><MS.users />{e.teamName}</span>}
          {(e.start || e.end) && (
            <span dir="ltr"><MS.clock />{e.start || "?"}–{e.end || "?"}</span>
          )}
          {e.place && <span><MS.pin />{e.place}</span>}
          <span>{e.sessions.length ? `${e.sessions.length} מפגשים` : "הלו״ז טרם נבנה"}</span>
          {past && rated.length > 0 && <span className="ms-rate"><MS.star /> דורג</span>}
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   טופס המשמר — פתיחה ועריכה
   ⚠ הסיכום אינו כאן: הוא נכתב אחרי הערב, במקום שבו רואים אותו.
   ============================================================ */
function EventForm({ d, say, initial, onDone, onCancel }) {
  const editing = Boolean(initial);
  const statuses = d.statuses || STATUSES_FALLBACK;
  const teams = d.teams || [];
  const [f, setF] = useState({
    title: initial?.title || "",
    date: initial?.date || "",
    theme: initial?.theme || "",
    team: initial?.team || (d.soloCreate ? "" : (teams[0]?.id || "")),
    place: initial?.place || "",
    start: initial?.start || "",
    end: initial?.end || "",
    status: initial?.status || statuses[0],
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value });
  const canSave = f.title.trim() && f.date && (d.soloCreate || f.team);

  /* ⚠ צוות שמקושר ואינו ברשימה שלי (ועדה שהוסרתי ממנה, או צוות
     שאורכב) נשאר מוצג — כדי שהשמירה לא תנתק אותו בשקט. */
  const orphan = editing && initial.team && !teams.some((t) => t.id === initial.team)
    ? { id: initial.team, name: initial.teamName || "הצוות הנוכחי" } : null;

  const save = () => {
    if (!canSave || busy) return;
    setBusy(true);
    const body = { ...f, title: f.title.trim() };
    (editing ? api.editMishmar({ id: initial.id, ...body }) : api.addMishmar(body))
      .then(() => { say(editing ? "המשמר עודכן" : "המשמר נפתח — עכשיו בונים את הלו״ז"); onDone(); })
      .catch((e) => say(e.message)).finally(() => setBusy(false));
  };

  return (
    <div className="card lift" style={{ marginTop: 10, marginBottom: 12 }}>
      <div className="fld">
        <label>שם המשמר</label>
        <input value={f.title} autoFocus disabled={busy} onChange={set("title")}
          placeholder="משמר חנוכה · משמר ליל הסדר" />
      </div>
      <div className="two">
        <div className="fld">
          <label>תאריך</label>
          <input type="date" dir="ltr" value={f.date} disabled={busy} onChange={set("date")} />
        </div>
        <div className="fld">
          <label>מצב</label>
          <select value={f.status} disabled={busy || !editing} onChange={set("status")}>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="fld">
        <label>נושא</label>
        <input value={f.theme} disabled={busy} onChange={set("theme")} placeholder="על מה הערב" />
      </div>
      <div className="fld">
        <label>הצוות המארגן</label>
        <select value={f.team} disabled={busy} onChange={set("team")}>
          {d.soloCreate && <option value="">— בלי צוות מזדמן —</option>}
          {orphan && <option value={orphan.id}>{orphan.name}</option>}
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {!editing && !d.soloCreate && (
          <div className="ms-note">המשמר ייפתח בשם הצוות, וכל חבריו יוכלו לערוך את הלו״ז.</div>
        )}
        {!editing && d.soloCreate && teams.length === 0 && (
          <div className="ms-note">אין עדיין "צוות מזדמן" בלוח השיבוצים. אפשר לפתוח בלי צוות,
            ולקשר אחר כך.</div>
        )}
      </div>
      <div className="two">
        <div className="fld">
          <label>מתחיל</label>
          <input type="time" dir="ltr" value={f.start} disabled={busy} onChange={set("start")} />
        </div>
        <div className="fld">
          <label>מסתיים</label>
          <input type="time" dir="ltr" value={f.end} disabled={busy} onChange={set("end")} />
        </div>
      </div>
      <div className="fld">
        <label>מקום</label>
        <input value={f.place} disabled={busy} onChange={set("place")} />
      </div>
      {!editing && (
        <div className="ms-note" style={{ marginBottom: 10 }}>
          המשמר נפתח במצב "בתכנון" ורואים אותו רק המארגנים. כשהלו״ז מוכן —
          משנים ל"פורסם" והחניכים רואים אותו.
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !canSave} onClick={save}>
          {editing ? "שמירה" : "פתיחת המשמר"}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   המשמר עצמו
   ============================================================ */
function Detail({ id, initial, d, say, onBack }) {
  const [ev, setEv] = useState(initial);
  const [today, setToday] = useState(d.today);
  const [partial, setPartial] = useState(d.partial || []);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ⚠ הרשימה שימשה לרינדור מיידי; המשמר עצמו נקרא טרי, כדי
     שדירוג או קובץ שנוספו ממכשיר אחר יופיעו. */
  const refresh = useCallback(() => {
    api.getMishmar(id)
      .then((r) => { setEv(r.event); setToday(r.today); setPartial(r.partial || []); })
      .catch((e) => { say(e.message); if (/אינו נמצא/.test(e.message)) onBack(); });
  }, [id, say, onBack]);
  useEffect(() => { refresh(); }, [refresh]);

  if (!ev) return <div className="skel" style={{ height: 160 }} />;

  const sessions = ev.sessions || [];
  const totalMin = sessions.reduce((a, s) => a + (Number.isFinite(s.minutes) ? s.minutes : 0), 0);
  const hours = spanHours(ev.start, ev.end) ?? (totalMin ? Math.round((totalMin / 60) * 10) / 10 : null);
  const votes = sessions.reduce((a, s) => a + (s.votes || 0), 0);
  const avg = votes
    ? Math.round((sessions.reduce((a, s) => a + (s.avg || 0) * (s.votes || 0), 0) / votes) * 10) / 10
    : null;
  const past = ev.date && today && ev.date <= today;
  const ratable = sessions.some((s) => s.canRate);
  const willRate = !past && sessions.some((s) => s.openRate);

  const remove = () => {
    setBusy(true);
    api.deleteMishmar(ev.id, sessions.length > 0)
      .then((r) => { say(r.removed ? `המשמר נמחק עם ${r.removed} מפגשים` : "המשמר נמחק"); onBack(); })
      .catch((e) => { say(e.message); setBusy(false); setConfirm(false); });
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm ms-back" onClick={onBack}><MS.back />לכל המשמרים</button>

      <div className={"band " + toneOf(ev.title)}>
        <div className="band-h">
          משמר · {weekday(ev.date)} {dmy(ev.date)}
          <span className={"pill ms-band-pill " + (STATUS_PILL[ev.status] || "p-idle")}>{ev.status}</span>
        </div>
        <div className="ms-band-t">{ev.title}</div>
        {ev.theme && <div className="ms-band-s">{ev.theme}</div>}
        <div className="ms-band-meta">
          {ev.teamName && <span><MS.users />{ev.teamName}</span>}
          {(ev.start || ev.end) && <span dir="ltr"><MS.clock />{ev.start || "?"}–{ev.end || "?"}</span>}
          {ev.place && <span><MS.pin />{ev.place}</span>}
        </div>
        <div className="band-grid" style={{ marginTop: 12 }}>
          <div className="band-c">
            <div className="band-n num">{sessions.length}</div>
            <div className="band-l">מפגשים</div>
          </div>
          <div className="band-c">
            <div className="band-n num">{hours ?? "—"}</div>
            <div className="band-l">שעות</div>
          </div>
          <div className="band-c">
            {/* ⚠ "—" ולא 0: אין דירוגים אינו "דירוג אפס". */}
            <div className="band-n num">{avg ?? "—"}</div>
            <div className="band-l">{votes ? `דירוג · ${votes} קולות` : "דירוג"}</div>
          </div>
        </div>
      </div>

      <PartialNote partial={partial} />

      {ev.canEdit && !editing && (
        <div className="ms-tools" style={{ marginTop: 0 }}>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditing(true)}>
            <MS.edit />פרטי המשמר
          </button>
          <button className="btn btn-ghost btn-sm ev-del" disabled={busy} onClick={() => setConfirm(true)}>
            <MS.trash />מחיקה
          </button>
        </div>
      )}
      {confirm && (
        <div className="ms-confirm">
          {sessions.length
            ? `בלו״ז ${sessions.length} מפגשים. מחיקת המשמר תמחק גם אותם ואת הדירוגים שלהם.`
            : "למחוק את המשמר?"}
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-clay btn-sm" style={{ flex: 1 }} disabled={busy} onClick={remove}>
              כן, למחוק
            </button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy}
              onClick={() => setConfirm(false)}>ביטול</button>
          </div>
        </div>
      )}
      {editing && (
        <EventForm d={d} say={say} initial={ev}
          onDone={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />
      )}

      {/* ⚠ הסיכום מוצג לכולם כשיש, ונערך במקום שבו רואים אותו. */}
      <EventSummary ev={ev} say={say} onSaved={refresh} />

      <div className="sec-label">לו״ז המשמר</div>
      {sessions.length === 0 && (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="e1">הלו״ז עוד לא נבנה</div>
          {ev.canEdit && <div className="e2">מוסיפים מפגש ראשון למטה — שעה, כותרת, מי מעביר.</div>}
        </div>
      )}
      {ratable && (
        <div className="ms-note ms-hint">
          <MS.star /> המשמר התקיים — אפשר לדרג את המפגשים שנפתחו לדירוג. הדירוג אישי, ומוצג
          כממוצע בלבד.
        </div>
      )}
      {willRate && d.me?.isStudent && (
        <div className="ms-note">הדירוג ייפתח אחרי הערב.</div>
      )}

      <div className="ms-tl">
        {sessions.map((s) => (
          <SessionRow key={s.id} s={s} ev={ev} d={d} say={say} onChanged={refresh} />
        ))}
      </div>

      {ev.canEdit && <AddSession ev={ev} d={d} say={say} onDone={refresh} />}
    </>
  );
}

/* ---------- סיכום הערב ---------- */
function EventSummary({ ev, say, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(ev.summary || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setText(ev.summary || ""); }, [ev.summary]);

  if (!ev.summary && !ev.canEdit) return null;
  if (editing) return (
    <div className="card lift" style={{ marginTop: 10 }}>
      <div className="fld">
        <label>סיכום הערב</label>
        <textarea rows={6} value={text} disabled={busy} autoFocus
          onChange={(e) => setText(e.target.value)}
          placeholder="מה היה בערב, מה עבד, מה כדאי לזכור לפעם הבאה" />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy}
          onClick={() => {
            setBusy(true);
            api.editMishmar({ id: ev.id, summary: text })
              .then(() => { say("הסיכום נשמר"); setEditing(false); onSaved(); })
              .catch((e) => say(e.message)).finally(() => setBusy(false));
          }}>שמירה</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy}
          onClick={() => { setEditing(false); setText(ev.summary || ""); }}>ביטול</button>
      </div>
    </div>
  );
  return (
    <div className={"ms-evsum " + toneOf(ev.title)}>
      <div className="ms-lbl">מה היה בערב</div>
      {ev.summary
        ? <div className="ms-pre">{ev.summary}</div>
        : <div className="ms-note" style={{ marginTop: 0 }}>הסיכום נכתב אחרי הערב — זה מה שהחניכים יחזרו אליו.</div>}
      {ev.canEdit && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setEditing(true)}>
          <MS.edit />{ev.summary ? "עריכת הסיכום" : "כתיבת סיכום"}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   מפגש בציר הזמן
   ============================================================ */
function SessionRow({ s, ev, d, say, onChanged }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(null);
  const end = addMin(s.time, s.minutes);
  const hasBody = s.desc || s.summary || s.files.length || s.canRate || s.myScore || ev.canEdit;

  const toggleRate = () => {
    setBusy("r");
    api.editMishmarSession({ session: s.id, openRate: !s.openRate })
      .then(() => { say(s.openRate ? "הדירוג נסגר" : "המפגש נפתח לדירוג"); onChanged(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };
  const remove = () => {
    setBusy("d");
    api.deleteMishmarSession(s.id)
      .then((r) => { say(r.ratingsRemoved ? `המפגש נמחק עם ${r.ratingsRemoved} דירוגים` : "המפגש נמחק"); onChanged(); })
      .catch((e) => { say(e.message); setBusy(null); setConfirm(false); });
  };

  return (
    <div className={"ms-s " + (KIND_TONE[s.kind] || "tone-8")}>
      <div className="ms-time">
        <b>{s.time || "—"}</b>
        {end && <span>{end}</span>}
      </div>
      <div className="ms-dot"><i /></div>
      <div className="ms-box">
        <button className="ms-s-h" onClick={() => hasBody && setOpen(!open)} aria-expanded={open}>
          <span className="ms-kind">{s.kind}</span>
          {s.openRate && <span className="ms-kind ms-kind-rate"><MS.star /> דירוג</span>}
          <div className="ms-s-t">{s.title}</div>
          <div className="ms-s-m">
            {s.lecturer && <span><MS.user />{s.lecturer}</span>}
            {s.place && <span><MS.pin />{s.place}</span>}
            {Number.isFinite(s.minutes) && s.minutes > 0 && <span>{s.minutes} דק׳</span>}
            {s.files.length > 0 && <span><MS.file />{s.files.length}</span>}
            {s.votes > 0 && <span className="ms-rate"><MS.star /> {s.avg} · {s.votes}</span>}
            {s.myScore && <span className="ms-mine">דירגת {s.myScore}</span>}
          </div>
          {hasBody && <span className={"ms-chev" + (open ? " on" : "")}><MS.chev /></span>}
        </button>

        {open && (
          <div className="ms-s-b">
            {editing ? (
              <SessionForm d={d} say={say} ev={ev} initial={s}
                onDone={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
            ) : (
              <>
                {s.desc && (
                  <>
                    <div className="ms-lbl">על המפגש</div>
                    <div className="ms-pre">{s.desc}</div>
                  </>
                )}
                {s.summary && (
                  <div className="ms-summary">
                    <div className="ms-lbl">מה היה</div>
                    <div className="ms-pre">{s.summary}</div>
                  </div>
                )}
                {s.files.length > 0 && (
                  <>
                    <div className="ms-lbl">דפי עזר</div>
                    <div className="ms-files">
                      {s.files.map((f) => (
                        f.url
                          ? <a key={f.id} className="ms-file" href={f.url} target="_blank" rel="noreferrer">
                              <MS.file /><span>{f.name}</span></a>
                          : <span key={f.id} className="ms-file"><MS.file /><span>{f.name}</span></span>
                      ))}
                    </div>
                  </>
                )}
                {s.canRate && <RateRow s={s} say={say} />}
                {!s.canRate && s.myScore && (
                  <div className="ms-my">הדירוג שלך: {s.myScore}/10</div>
                )}

                {ev.canEdit && (
                  <>
                    <div className="ms-tools">
                      <button className="btn btn-ghost btn-sm" disabled={Boolean(busy)}
                        onClick={() => setEditing(true)}><MS.edit />עריכה</button>
                      <button className="btn btn-ghost btn-sm" disabled={Boolean(busy)} onClick={toggleRate}>
                        <MS.star />{s.openRate ? "לסגור דירוג" : "לפתוח לדירוג"}
                      </button>
                      <button className="btn btn-ghost btn-sm ev-del" disabled={Boolean(busy)}
                        onClick={() => setConfirm(true)}><MS.trash />מחיקה</button>
                    </div>
                    {confirm && (
                      <div className="ms-confirm">
                        למחוק את המפגש{s.votes ? ` ואת ${s.votes} הדירוגים שלו` : ""}?
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-clay btn-sm" style={{ flex: 1 }} disabled={busy === "d"}
                            onClick={remove}>כן, למחוק</button>
                          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy === "d"}
                            onClick={() => setConfirm(false)}>ביטול</button>
                        </div>
                      </div>
                    )}
                    <FileUpload s={s} say={say} onDone={onChanged} />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- דירוג 1–10, אופטימי ---------- */
function RateRow({ s, say }) {
  const [my, setMy] = useState(s.myScore);
  const [stat, setStat] = useState({ avg: s.avg, votes: s.votes });
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMy(s.myScore); setStat({ avg: s.avg, votes: s.votes }); },
    [s.id, s.myScore, s.avg, s.votes]);

  const rate = (n) => {
    if (busy) return;
    const prev = my;
    /* ⚠ מוצג מיד, ובכישלון חוזר אחורה ואומר (4י). */
    setMy(n);
    setBusy(true);
    api.rateMishmarSession({ session: s.id, score: n })
      .then((r) => setStat({ avg: r.avg, votes: r.votes }))
      .catch((e) => { setMy(prev); say(e.message); })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <div className="ms-lbl">{my ? "הדירוג שלך" : "איך היה המפגש?"}</div>
      <div className="rate-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} disabled={busy}
            className={my === n ? "on" : my && n <= my ? "lt" : ""}
            onClick={() => rate(n)}>{n}</button>
        ))}
      </div>
      <div className="ms-my">
        {my ? `${my}/10 · אפשר לשנות בלחיצה` : "1 — לא היה שווה · 10 — מהטובים שהיו"}
        {stat.votes > 0 && ` · ממוצע ${stat.avg} מ-${stat.votes}`}
      </div>
    </>
  );
}

/* ---------- העלאת דף עזר ---------- */
function FileUpload({ s, say, onDone }) {
  const [busy, setBusy] = useState(false);
  const pick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD) {
      say("הקובץ גדול מדי — עד 3MB. מצגת כבדה עדיף לכווץ ל-PDF.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBusy(true);
      api.uploadMishmarFile({
        session: s.id,
        fileData: String(reader.result).split(",")[1] || "",
        fileName: file.name,
        fileMime: file.type || "application/octet-stream",
      })
        .then(() => { say("הקובץ עלה"); onDone(); })
        .catch((err) => say(err.message))
        .finally(() => { setBusy(false); e.target.value = ""; });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="fld" style={{ marginTop: 10, marginBottom: 0 }}>
      <label className="file-drop">
        <MS.upload />
        <span>{busy ? "מעלה…" : "העלאת דף עזר · מצגת · מקורות"}</span>
        <input type="file" disabled={busy} onChange={pick} />
      </label>
    </div>
  );
}

/* ============================================================
   טופס המפגש — הוספה ועריכה
   ⚠ "מה היה" ו"פתוח לדירוג" מופיעים בעריכה בלבד: אלה שדות של
     אחרי הערב, ובטופס ההוספה הם רק רעש.
   ============================================================ */
function AddSession({ ev, d, say, onDone }) {
  const [adding, setAdding] = useState(false);
  if (!adding) return (
    <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setAdding(true)}>
      <MS.plus />הוספת מפגש ללו״ז
    </button>
  );
  return (
    <SessionForm d={d} say={say} ev={ev}
      onDone={() => { setAdding(false); onDone(); }} onCancel={() => setAdding(false)} />
  );
}

function SessionForm({ d, say, ev, initial, onDone, onCancel }) {
  const editing = Boolean(initial);
  const kinds = d.kinds || KINDS_FALLBACK;
  /* ⚠ ברירת מחדל לשעה: סיום המפגש האחרון — בונים לו״ז ברצף. */
  const last = !editing && ev.sessions.length ? ev.sessions[ev.sessions.length - 1] : null;
  const [f, setF] = useState({
    title: initial?.title || "",
    time: initial?.time || (last ? addMin(last.time, last.minutes) || "" : ev.start || ""),
    minutes: initial?.minutes ?? "",
    kind: initial?.kind || kinds[0],
    lecturer: initial?.lecturer || "",
    place: initial?.place || ev.place || "",
    desc: initial?.desc || "",
    summary: initial?.summary || "",
    order: initial?.order ?? "",
    openRate: Boolean(initial?.openRate),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = () => {
    if (!f.title.trim() || busy) return;
    setBusy(true);
    const body = {
      title: f.title.trim(), time: f.time, minutes: f.minutes, kind: f.kind,
      lecturer: f.lecturer, place: f.place, desc: f.desc, order: f.order,
    };
    const req = editing
      ? api.editMishmarSession({ session: initial.id, ...body, summary: f.summary, openRate: f.openRate })
      : api.addMishmarSession({ mishmar: ev.id, ...body });
    req.then(() => { say(editing ? "המפגש עודכן" : "המפגש נוסף"); onDone(); })
      .catch((e) => say(e.message)).finally(() => setBusy(false));
  };

  return (
    <div className={"card lift " + (KIND_TONE[f.kind] || "tone-8")} style={{ marginTop: 10 }}>
      <div className="fld">
        <label>כותרת המפגש</label>
        <input value={f.title} autoFocus disabled={busy} onChange={set("title")} />
      </div>
      <div className="fld">
        <label>סוג</label>
        <div className="pick ms-pick">
          {kinds.map((k) => (
            <button key={k} type="button" className={f.kind === k ? "on" : ""} disabled={busy}
              onClick={() => setF({ ...f, kind: k })}>{k}</button>
          ))}
        </div>
      </div>
      <div className="two">
        <div className="fld">
          <label>שעה</label>
          <input type="time" dir="ltr" value={f.time} disabled={busy} onChange={set("time")} />
        </div>
        <div className="fld">
          <label>משך (דקות)</label>
          <input inputMode="numeric" dir="ltr" value={f.minutes} disabled={busy} onChange={set("minutes")} />
        </div>
      </div>
      <div className="two">
        <div className="fld">
          <label>מי מעביר</label>
          <input value={f.lecturer} disabled={busy} onChange={set("lecturer")} />
        </div>
        <div className="fld">
          <label>מקום</label>
          <input value={f.place} disabled={busy} onChange={set("place")} />
        </div>
      </div>
      <div className="fld">
        <label>על המפגש</label>
        <textarea rows={3} value={f.desc} disabled={busy} onChange={set("desc")}
          placeholder="מה הולך להיות, מה כדאי להביא, על מה נדבר" />
      </div>
      {editing && (
        <>
          <div className="fld">
            <label>מה היה</label>
            <textarea rows={4} value={f.summary} disabled={busy} onChange={set("summary")}
              placeholder="נכתב אחרי הערב — מה קרה בפועל" />
          </div>
          <label className="ms-toggle">
            <input type="checkbox" checked={f.openRate} disabled={busy}
              onChange={(e) => setF({ ...f, openRate: e.target.checked })} />
            פתוח לדירוג
          </label>
          <div className="ms-note" style={{ marginTop: -4, marginBottom: 10 }}>
            החניכים מדרגים 1–10 רק אחרי שהמשמר התקיים, ורק מפגשים שסומנו כאן.
          </div>
          <div className="fld">
            <label>סדר (למפגשים באותה שעה)</label>
            <input inputMode="numeric" dir="ltr" value={f.order} disabled={busy} onChange={set("order")} />
          </div>
        </>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !f.title.trim()} onClick={save}>
          {editing ? "שמירה" : "הוספה"}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   העיצוב — מועתק לסוף src/styles.js על ידי מי שמשלב.
   ⚠ בלי בקטיקים בפנים. צבע רק דרך טוקנים. כלל על <button> נושא
     `.kx` כי `.kx button` מאפסת רקע ומסגרת (4מח).
   ============================================================ */
export const MISHMAR_CSS = `
/* ---- משמר ---- */
.kx .ms-back{margin-bottom:10px}
.kx .ms-card{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:right;
  padding:14px 14px 13px;margin-bottom:10px;position:relative;overflow:hidden;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  box-shadow:var(--sh-1);transition:transform 120ms var(--ease),box-shadow 120ms var(--ease)}
.kx .ms-card::before{content:"";position:absolute;top:0;right:0;left:0;height:4px;background:var(--t)}
.kx .ms-card:active{transform:scale(.99);box-shadow:var(--sh-2)}
.ms-date{flex:0 0 54px;width:54px;border-radius:var(--r-md);background:var(--t-s);color:var(--t);
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 0 7px}
.ms-date b{font-size:23px;line-height:1;font-weight:800}
.ms-date span{font-size:10.5px;font-weight:800;letter-spacing:.4px;margin-top:3px}
.ms-past .ms-date{background:var(--bg);color:var(--muted)}
.ms-card-main{flex:1;min-width:0}
.ms-card-top{display:flex;align-items:flex-start;gap:8px}
.ms-card-top .pill{flex:0 0 auto;margin-top:2px}
.ms-t{flex:1;min-width:0;font-size:15.5px;font-weight:800;color:var(--ink);line-height:1.3}
.ms-theme{font-size:13px;font-weight:700;color:var(--t);margin-top:2px}
.ms-meta{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;margin-top:7px;
  font-size:11.5px;font-weight:600;color:var(--muted)}
.ms-meta svg,.ms-s-m svg,.ms-band-meta svg{width:12px;height:12px;vertical-align:-2px;margin-left:3px}
.ms-soon{font-weight:800;color:var(--ok)}
.ms-rate{font-weight:800;color:var(--amber)}
.ms-mine{font-weight:800;color:var(--t)}

/* רצועת המשמר */
.ms-band-pill{margin-right:8px;vertical-align:1px}
.ms-band-t{font-family:'Suez One',Heebo,serif;font-size:22px;line-height:1.25;margin:5px 0 2px;position:relative}
.ms-band-s{font-size:13.5px;font-weight:700;opacity:.85;position:relative}
.ms-band-meta{position:relative;display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:9px;
  font-size:12px;font-weight:700;opacity:.82}

/* הערות מסך */
.ms-note{font-size:12px;line-height:1.65;font-weight:600;color:var(--muted);margin-top:6px}
.ms-note svg{vertical-align:-3px;margin-left:3px}
.ms-warn{color:var(--amber);margin:8px 0}
.ms-hint{color:var(--t);margin:2px 0 10px}
.ms-lbl{font-size:11px;font-weight:800;letter-spacing:.7px;color:var(--faint);margin:12px 0 4px}
.ms-pre{white-space:pre-wrap;font-size:13.5px;line-height:1.75;color:var(--ink);font-weight:500}
.ms-my{font-size:12px;font-weight:700;color:var(--muted);margin-top:6px}

/* סיכום הערב */
.ms-evsum{position:relative;overflow:hidden;margin-top:12px;padding:12px 14px;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh-1)}
.ms-evsum::before{content:"";position:absolute;top:0;bottom:0;right:0;width:4px;background:var(--t)}
.ms-evsum .ms-lbl{margin-top:0;color:var(--t)}

/* ציר הזמן */
.ms-tl{position:relative}
.ms-s{position:relative;display:flex;gap:8px;padding-bottom:12px}
.ms-s::before{content:"";position:absolute;top:24px;bottom:-2px;right:63px;width:2px;background:var(--line2)}
.ms-s:last-child::before{display:none}
.ms-time{flex:0 0 46px;width:46px;direction:ltr;text-align:right;padding-top:11px}
.ms-time b{display:block;font-size:14px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1.2}
.ms-time span{display:block;font-size:10.5px;font-weight:700;color:var(--faint);font-variant-numeric:tabular-nums}
.ms-dot{flex:0 0 20px;width:20px;display:flex;justify-content:center;padding-top:14px}
.ms-dot i{display:block;width:12px;height:12px;border-radius:50%;background:var(--t);box-shadow:0 0 0 3px var(--t-s)}
.ms-box{flex:1;min-width:0;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-md);box-shadow:var(--sh-1);overflow:hidden}
.kx .ms-s-h{display:block;width:100%;text-align:right;padding:11px 12px 10px;position:relative}
.kx .ms-s-h:active{background:var(--bg)}
.ms-kind{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.4px;
  padding:2px 7px;border-radius:6px;background:var(--t-s);color:var(--t);margin:0 0 5px 4px}
.ms-kind svg{width:10px;height:10px;vertical-align:-1px;margin-left:2px}
.ms-kind-rate{background:var(--bg);color:var(--amber)}
.ms-s-t{font-size:15px;font-weight:800;color:var(--ink);line-height:1.3;padding-left:22px}
.ms-s-m{display:flex;flex-wrap:wrap;gap:3px 10px;margin-top:4px;font-size:11.5px;font-weight:600;color:var(--muted)}
.ms-chev{position:absolute;top:12px;left:10px;color:var(--faint);
  transition:transform 120ms var(--ease)}
.ms-chev.on{transform:rotate(180deg)}
.ms-s-b{padding:0 12px 12px;border-top:1px solid var(--line)}
.ms-summary{margin-top:10px;padding:10px 12px;border-radius:var(--r-sm);background:var(--t-s)}
.ms-summary .ms-lbl{margin-top:0;color:var(--t)}
.ms-summary .ms-pre{color:var(--ink)}
.ms-files{display:flex;flex-direction:column;gap:6px}
.ms-file{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:var(--r-sm);
  background:var(--bg);border:1px solid var(--line);color:var(--accent);font-weight:700;
  font-size:13px;text-decoration:none}
.ms-file svg{flex:0 0 auto}
.ms-file span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* כלי מארגן */
.ms-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.ms-tools .btn{flex:1 1 auto}
.ms-confirm{margin-top:10px;padding:10px 12px;border-radius:var(--r-sm);
  border:1px solid var(--line2);background:var(--bg);color:var(--clay);font-size:13px;font-weight:700;line-height:1.5}
.ms-confirm > div{margin-top:8px}
.ms-toggle{display:flex;align-items:center;gap:9px;margin:4px 0 10px;font-size:14px;font-weight:700;color:var(--ink)}
.ms-toggle input{width:20px;height:20px;accent-color:var(--accent)}
.ms-pick{flex-wrap:wrap}
.kx .ms-pick button{flex:1 1 30%;min-height:40px;font-size:13px}

@media (prefers-reduced-motion:reduce){
  .kx .ms-card,.ms-chev{transition:none}
}
`;
