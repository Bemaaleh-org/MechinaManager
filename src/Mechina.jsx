/* ============================================================
   מכינה — נוכחות, בקשות יציאה וחניכים
   ------------------------------------------------------------
   הופרד מ-App.jsx כדי שהמטבח יישאר קובץ אחד ותחום אחד. אין כאן
   שום ייבוא מהמטבח ואין ממנו ייבוא לכאן — שני התחומים נפגשים
   רק בשלד ב-App.jsx.

   ⚠ כל הקריאות לשרת עוברות דרך src/api.js, כמו בכל האפליקציה.
     אין כאן fetch.

   ⚠ כשל טעינה מוצג אחרת מ"אין נתונים" בכל מסך כאן. חניך שרואה
     לוח ריק חייב לדעת אם אין לו היעדרויות או שהחיבור נפל.
   ============================================================ */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "./api.js";
import { testDate } from "./testDate.js";

/* אותו אוצר צורות של האייקונים במטבח: 21px, stroke 2.1, קצוות עגולים */
const MI = {
  home: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  cal: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  note: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h14v18l-7-4-7 4V3z"/></svg>,
  users: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.4-1-4.1-2.6-5"/></svg>,
  tick: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="17" rx="2.4"/><path d="M8 12.5 11 15.5 16.5 9.5"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  lock: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="10" width="16" height="11" rx="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
};

const MON_HE = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];
const dm = (iso) => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "";
const dmy = (iso) => iso ? dm(iso) + "/" + iso.slice(0, 4) : "";
const initials = (name) => String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("");

const TYPE_CLASS = { "חופש": "vac", "מחלה": "sick", "מוצדקת": "just" };
const TYPE_PILL = { "חופש": "p-ok", "מחלה": "p-low", "מוצדקת": "p-new" };
const STATUS_PILL = { "ממתין": "p-new", "מאושר": "p-ok", "נדחה": "p-low" };

/* ============================================================
   טעינה — מצב אחד לשלושתם: טוען, נכשל, יש נתונים.
   ⚠ err ו"ריק" הם שני מצבים שונים ולעולם לא מוצגים אותו דבר.
   ============================================================ */
function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);

  const run = useCallback(() => {
    let live = true;
    setBusy(true);
    fn()
      .then((d) => { if (live) { setData(d); setErr(null); } })
      .catch((e) => { if (live) setErr(e.message || "הטעינה נכשלה"); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

function LoadFail({ msg, onRetry }) {
  return (
    <div className="alert a-clay">
      <MI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הנתונים</div>
        <div className="bd">{msg} — מה שמוצג כאן אינו מעודכן ואסור להסתמך עליו.</div>
        {onRetry && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>
            נסו שוב
          </button>
        )}
      </div>
    </div>
  );
}

const Loading = ({ what }) => (
  <div className="empty" style={{ paddingTop: 60 }}><div className="e1">{what}…</div></div>
);

/* ============================================================
   לוח נוכחות שנתי
   ============================================================ */
function YearBoard({ days, half }) {
  const shown = half ? days.filter((d) => d.half === half) : days;

  const months = useMemo(() => {
    const out = [];
    let cur = null;
    for (const d of shown) {
      const key = d.date.slice(0, 7);
      if (!cur || cur.key !== key) {
        cur = { key, label: MON_HE[Number(d.date.slice(5, 7)) - 1], days: [] };
        out.push(cur);
      }
      cur.days.push(d);
    }
    return out;
  }, [shown]);

  const cls = (d) => {
    if (d.state === "absent") return TYPE_CLASS[d.type] || "sick";
    if (d.state === "off") return "off";
    if (d.state === "future") return "future";
    if (d.state === "unmarked") return "unmarked";
    return "";
  };
  const title = (d) => {
    const base = dmy(d.date) + " · " + d.kind;
    if (d.state === "absent") return base + " · " + d.type + (d.detail ? " — " + d.detail : "");
    if (d.state === "unmarked") return base + " · טרם סומן";
    if (d.state === "future") return base;
    if (d.state === "off") return base;
    return base + " · נוכחות";
  };

  return (
    <>
      <div className="yr">
        {months.map((m) => (
          <div className="yr-row" key={m.key}>
            <div className="yr-lab">{m.label}</div>
            <div className="yr-cells">
              {m.days.map((d) => (
                <span className={"yr-c " + cls(d)} key={d.date} title={title(d)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="yr-key">
        <i><b style={{ background: "var(--surface)" }} />נוכחות</i>
        <i><b style={{ background: "var(--clay)", borderColor: "var(--clay)" }} />מחלה</i>
        <i><b style={{ background: "var(--amber)", borderColor: "var(--amber)" }} />מוצדקת</i>
        <i><b style={{ background: "var(--accent)", borderColor: "var(--accent)" }} />חופש</i>
        <i><b style={{ background: "#E7EBF1", borderColor: "#E7EBF1" }} />ללא פעילות</i>
        <i><b className="yr-c unmarked" style={{ width: 11, height: 11 }} />טרם סומן</i>
      </div>
    </>
  );
}

/* ============================================================
   מכסת ימי חופש — לפי מחצית.
   ⚠ שתי מחציות ולא מספר אחד: המכסה מתאפסת בשבוע האמצע, ומספר
     מאוחד היה מטעה את החניך בדיוק בתקופה שבה זה משנה.
   ============================================================ */
function Quota({ quota }) {
  return (
    <div className="quota">
      {quota.map((q) => (
        <div className="quota-h" key={q.half}>
          <div className="qk">{q.half}</div>
          <div className="qv"><b className="num">{q.left}</b><span>מתוך {q.total}</span></div>
          <div className="quota-dots">
            {Array.from({ length: q.total }, (_, i) => (
              <i key={i} className={i < q.used ? "used" : ""} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Summary({ s }) {
  return (
    <div className="stats">
      <div className="stat">
        <div className="k">ימים שסומנו</div>
        <div className="v num">{s.schoolDays}</div>
        <div className="n">נכחת ב-{s.present}</div>
      </div>
      <div className={"stat" + (s.absent ? " clay" : "")}>
        <div className="k">סה״כ היעדרויות</div>
        <div className="v num">{s.absent}</div>
        <div className="n">{s.schoolDays ? Math.round((s.absent / s.schoolDays) * 100) + "% מהימים" : "טרם התחילה השנה"}</div>
      </div>
      <div className="stat"><div className="k">מחלה</div><div className="v num">{s.sick}</div><div className="n">ללא הגבלה</div></div>
      <div className="stat"><div className="k">מוצדקת</div><div className="v num">{s.justified}</div><div className="n">ללא הגבלה</div></div>
    </div>
  );
}

/* ============================================================
   בקשת יציאה — הגשה
   ⚠ הכללים נבדקים גם בשרת. החסימה כאן נועדה לחסוך לחניך הגשה
     לחינם, לא להגן. ראו api/_requests.js.
   ============================================================ */
const TYPES = ["חופש", "מחלה", "מוצדקת"];

function RequestForm({ days, quota, onDone, say }) {
  const [type, setType] = useState("מחלה");
  const [date, setDate] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const day = date ? byDate.get(date) : null;

  const q = day ? quota.find((x) => x.half === day.half) : null;
  const vacationBlocked = type === "חופש" && day && day.kind !== "רגיל";
  const quotaOut = type === "חופש" && q && q.left <= 0;
  const needDetail = type === "מוצדקת" && !detail.trim();
  const unknownDate = Boolean(date) && !day;

  const blocked = !date || unknownDate || vacationBlocked || quotaOut || needDetail;

  const submit = (e) => {
    e.preventDefault();
    if (busy || blocked) return;
    setBusy(true); setErr(null);
    api.createRequest({ type, date, detail: detail.trim() })
      .then(() => { say("הבקשה נשלחה"); setDate(""); setDetail(""); onDone(); })
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  /* רק ימים שקיימים בלוח, ומהיום והלאה */
  const options = useMemo(
    () => days.filter((d) => d.state === "future" || d.state === "unmarked"),
    [days]
  );

  return (
    <form className="card" onSubmit={submit}>
      {err && (
        <div className="alert a-clay" style={{ marginBottom: 12 }}>
          <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
        </div>
      )}

      <div className="fld">
        <label>סוג הבקשה</label>
        <div className="pick">
          {TYPES.map((t) => (
            <button type="button" key={t} className={type === t ? "on" : ""}
              disabled={busy} onClick={() => { setType(t); setErr(null); }}>{t}</button>
          ))}
        </div>
      </div>

      <div className="fld">
        <label htmlFor="rq-date">תאריך</label>
        <select id="rq-date" value={date} disabled={busy}
          onChange={(e) => { setDate(e.target.value); setErr(null); }}>
          <option value="">בחרו תאריך…</option>
          {options.map((d) => (
            <option value={d.date} key={d.date}>
              {dmy(d.date)}{d.kind !== "רגיל" ? " · " + d.kind : ""}
            </option>
          ))}
        </select>
      </div>

      {vacationBlocked && (
        <div className="alert a-clay">
          <MI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">יום {day.kind} — אי אפשר לנצל בו יום חופש</div>
            <div className="bd">ימי חופש זמינים בימי שגרה בלבד. אפשר להגיש היעדרות מוצדקת עם פירוט.</div>
          </div>
        </div>
      )}

      {quotaOut && !vacationBlocked && (
        <div className="alert a-clay">
          <MI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">נוצלו כל {q.total} ימי החופש ב{q.half}</div>
            <div className="bd">אפשר להגיש מחלה או היעדרות מוצדקת.</div>
          </div>
        </div>
      )}

      {type === "חופש" && day && !vacationBlocked && !quotaOut && (
        <div className="alert a-ok">
          <div style={{ flex: 1 }}>
            <div className="ttl">יום רגיל — חופש אפשרי</div>
            <div className="bd">נשארו לך {q ? q.left : "—"} ימי חופש ב{day.half}.</div>
          </div>
        </div>
      )}

      <div className="fld">
        <label htmlFor="rq-detail">
          פירוט{type === "מוצדקת" ? "" : " (לא חובה)"}
        </label>
        <input id="rq-detail" value={detail} disabled={busy}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={type === "מוצדקת" ? "שמחה או אבל מדרגה ראשונה" : "אפשר להוסיף הסבר קצר"} />
      </div>

      <button className="btn btn-primary" type="submit" disabled={busy || blocked}>
        {busy ? "שולח…" : "שליחת הבקשה"}
      </button>
    </form>
  );
}

/* ============================================================
   כרטיס בקשה. אצל המנהל מופיעים כפתורי ההכרעה.
   ============================================================ */
function RequestCard({ r, onDecide, busyId }) {
  const busy = busyId === r.id;
  return (
    <div className="rq">
      <div className="rq-top">
        <div className="rq-name">{r.student ? r.student.name : r.type}</div>
        <span className="when">{dm(r.date)}</span>
      </div>
      <div className="rq-meta">
        <span className={"pill " + (TYPE_PILL[r.type] || "p-new")}>{r.type}</span>
        <span className={"pill " + (STATUS_PILL[r.status] || "p-new")}>{r.status}</span>
        {r.decidedBy && <span>· {r.decidedBy}</span>}
      </div>
      {r.detail && <div className="rq-detail">{r.detail}</div>}
      {onDecide && r.status === "ממתין" && (
        <div className="rq-act">
          <button className="ok" disabled={busy} onClick={() => onDecide(r.id, "approve")}>
            {busy ? "…" : "אישור"}
          </button>
          <button className="no" disabled={busy} onClick={() => onDecide(r.id, "reject")}>
            דחייה
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   סימון נוכחות יומי — מנהל או מוביל שבוע
   ⚠ ההגבלה של מוביל שבוע ליום הנוכחי נאכפת בשרת. כאן היא רק
     מוסברת, כדי שלא ילחץ לחינם.
   ============================================================ */
function MarkDay({ say, allowPick = false }) {
  const td = testDate();
  const [date, setDate] = useState(null);
  const { data, err, busy, reload } = useLoad(
    () => api.getAttendanceDay(date, td), [date, td]);

  const [draft, setDraft] = useState(null); // studentId → {type, detail}
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(false);
  /* נשמר בין טעינות: כשתאריך נבחר נופל מחוץ ללוח, התשובה היא
     שגיאה ובלי זה גבולות הלוח היו הולכים לאיבוד. */
  const [range, setRange] = useState(null);

  useEffect(() => {
    if (!data) return;
    if (data.range) setRange(data.range);
    const d = {};
    for (const s of data.students) if (s.absent) d[s.id] = { type: s.type, detail: s.detail || "" };
    setDraft(d);
    setOpen(null);
  }, [data]);

  /* ⚠ הבורר מרונדר לפני כל יציאה מוקדמת, ובכוונה.
     כשהוא ישב אחרי בדיקת השגיאה, יום שאינו בלוח השנה — למשל
     היום, לפני תחילת השנה — החליף את כל המסך בבאנר אדום ולא
     נשארה שום דרך לקפוץ לתאריך אחר. הבורר הוא בדיוק המוצא
     מהמצב הזה, ולכן הוא חייב לשרוד אותו. */
  const picker = allowPick ? (
    <div className="fld">
      <label htmlFor="mk-date">תאריך הסימון</label>
      <input id="mk-date" type="date"
        value={date || (data && data.day ? data.day.date : "")}
        min={range ? range.from : undefined}
        max={range ? range.to : undefined}
        onChange={(e) => { setDate(e.target.value); setOpen(null); }} />
      {date && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
          onClick={() => setDate(null)}>חזרה להיום</button>
      )}
    </div>
  ) : null;

  if (busy && !data) return <>{picker}<Loading what="טוען את היום" /></>;

  if (err) return <>{picker}<LoadFail msg={err} onRetry={reload} /></>;
  if (!data) return picker;

  /* ⚠ מצב תקין ולא כשל: התאריך פשוט אינו בשנת הלימודים. לפני
     06/09 זה המצב של "היום" לאורך כל הקיץ. הבחנה בין כשל למצב
     רגיל, באותו היגיון של loadFailed ב-storage.js. */
  if (data.outOfYear) {
    return (
      <>
        {picker}
        <div className="alert a-amber">
          <MI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">{dmy(data.asked)} אינו בשנת הלימודים</div>
            <div className="bd">
              {range ? `שנת הלימודים: ${dmy(range.from)} – ${dmy(range.to)}. ` : ""}
              בחרו תאריך בלוח למעלה כדי לסמן נוכחות.
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!draft) return picker;

  const { day, students, marked, canMark, canOverride } = data;

  /* שורות שמקורן בבקשה מאושרת. מנהל רשאי לתקן אותן — המציאות
     משתנה אחרי ההחלטה — ומוביל שבוע לא. השרת אוכף; כאן זו
     התצוגה בלבד. */
  const fromRequest = new Set(
    students.filter((s) => s.source === "בקשה מאושרת").map((s) => s.id));
  const locked = canOverride ? new Set() : fromRequest;

  const setType = (id, t) => {
    if (locked.has(id)) return;
    setDraft((prev) => {
      const next = { ...prev };
      if (!t) delete next[id];
      else next[id] = { type: t, detail: (prev[id] && prev[id].detail) || "" };
      return next;
    });
  };
  const setDetail = (id, v) =>
    setDraft((prev) => ({ ...prev, [id]: { ...(prev[id] || { type: "מוצדקת" }), detail: v } }));

  const absentCount = Object.keys(draft).length;

  const save = () => {
    if (saving) return;
    setSaving(true);
    const absences = Object.entries(draft).map(([studentId, v]) => ({
      studentId, type: v.type, detail: v.detail,
    }));
    api.markAttendance({ date: day.date, absences }, td)
      .then((r) => {
        say(r.locked.length
          ? `נשמר. ${r.locked.length} מבקשה מאושרת לא שונו`
          : `נשמר · ${r.present} נוכחים, ${r.absent} חסרים`);
        reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <>
      {picker}

      <div className="sec-label">
        {dmy(day.date)} · יום {day.kind}
        {day.isToday ? " · היום" : ""}
      </div>

      {!day.isSchoolDay && (
        <div className="alert a-amber">
          <MI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">יום {day.kind}</div>
            <div className="bd">אין בו סימון נוכחות.</div>
          </div>
        </div>
      )}

      {day.isSchoolDay && !marked && (
        <div className="alert a-amber">
          <MI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">היום טרם סומן</div>
            <div className="bd">כל עוד לא נשמר, היום אינו נחשב כ״כולם נכחו״.</div>
          </div>
        </div>
      )}

      {marked && (
        <div className="alert a-ok">
          <div style={{ flex: 1 }}>
            <div className="ttl">היום סומן</div>
            <div className="bd">על ידי {marked.by}{marked.at ? " · " + dmy(marked.at) : ""}</div>
          </div>
        </div>
      )}

      {!canMark && (
        <div className="alert a-clay">
          <MI.lock />
          <div style={{ flex: 1 }}>
            <div className="ttl">אין הרשאת סימון ליום הזה</div>
            <div className="bd">מוביל שבוע מסמן את היום הנוכחי בלבד.</div>
          </div>
        </div>
      )}

      <div className="grp-h">
        <span>{students.length} חניכים · {absentCount} חסרים</span>
        <span>נוכח = ברירת מחדל</span>
      </div>

      <div className="rows">
        {students.map((s) => {
          const cur = draft[s.id];
          const isLocked = locked.has(s.id);
          const isOpen = open === s.id;
          return (
            <div key={s.id}>
              <button className="st-row" onClick={() => setOpen(isOpen ? null : s.id)}>
                <div className={"st-av" + (cur ? " absent" : "")}>{initials(s.name)}</div>
                <div className="st-main">
                  <div className="st-n">{s.name}</div>
                  <div className="st-m">
                    {cur ? (
                      <>
                        <span className={"pill " + (TYPE_PILL[cur.type] || "p-low")}>{cur.type}</span>
                        {cur.detail ? <span>{cur.detail}</span> : null}
                      </>
                    ) : "נוכח/ת"}
                    {fromRequest.has(s.id) && <MI.lock />}
                  </div>
                </div>
                <MI.chev style={{ transform: isOpen ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
              </button>

              {isOpen && (
                <>
                  {fromRequest.has(s.id) && (
                    <div className="abs-lock">
                      <MI.lock />
                      {isLocked
                        ? "מבקשה שאושרה — מנהל בלבד רשאי לשנות"
                        : "מבקשה שאושרה — שינוי כאן מתקן את הרישום בפועל"}
                    </div>
                  )}
                  <div className="abs-pick">
                    <button className={!cur ? "on" : ""} disabled={isLocked}
                      onClick={() => setType(s.id, null)}>נוכח</button>
                    {TYPES.map((t) => (
                      <button key={t} disabled={isLocked || (t === "חופש" && !day.vacationAllowed)}
                        className={(cur && cur.type === t ? "on " : "") + (TYPE_CLASS[t] || "")}
                        onClick={() => setType(s.id, t)}>{t}</button>
                    ))}
                  </div>
                  {cur && cur.type === "מוצדקת" && !isLocked && (
                    <div className="abs-note">
                      <input value={cur.detail} placeholder="פירוט"
                        onChange={(e) => setDetail(s.id, e.target.value)} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {canMark && day.isSchoolDay && (
        <div className="sticky">
          <button className="btn btn-ok" disabled={saving} onClick={save}>
            {saving ? "שומר…" : "שמירת הסימון"}
          </button>
        </div>
      )}
      <div style={{ height: 60 }} />
    </>
  );
}

/* ============================================================
   רשימת החניכים — מנהל
   ============================================================ */
function StudentsList({ onOpen }) {
  const { data, err, busy, reload } = useLoad(() => api.getStudents(), []);
  const [q, setQ] = useState("");

  if (busy && !data) return <Loading what="טוען חניכים" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const list = data.students.filter((s) => !q.trim() || s.name.includes(q.trim()));

  return (
    <>
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש חניך" />

      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="k">נוכחות היום</div>
          <div className="v num">{data.today.present === null ? "—" : data.today.present}</div>
          <div className="n">{data.today.marked ? `מתוך ${data.count}` : "היום טרם סומן"}</div>
        </div>
        <div className={"stat" + (data.today.absent ? " clay" : "")}>
          <div className="k">חסרים היום</div>
          <div className="v num">{data.today.absent}</div>
          <div className="n">{data.today.kind ? "יום " + data.today.kind : "מחוץ לשנה"}</div>
        </div>
      </div>

      <div className="grp-h"><span>לפי סדר א״ב</span><span>מחלה · מוצדקת · חופש</span></div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">אין חניך בשם הזה</div>
          <div className="e2">נסו חלק מהשם.</div>
        </div>
      ) : (
        <div className="rows">
          {list.map((s) => (
            <button className="st-row" key={s.id} onClick={() => onOpen(s)}>
              <div className={"st-av" + (s.today.absent ? " absent" : "")}>{initials(s.name)}</div>
              <div className="st-main">
                <div className="st-n">{s.name}</div>
                <div className="st-m">
                  {s.leader && <span className="pill p-new">מוביל שבוע</span>}
                  {s.today.absent ? <span>חסר/ה היום · {s.today.type}</span> : <span>נוכח/ת</span>}
                </div>
              </div>
              <div className="st-fig">
                <b className="p-low num">{s.summary.sick}</b>
                <b className="p-new num">{s.summary.justified}</b>
                <b className="p-ok num">{s.summary.vacation}</b>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* לוח שנתי של חניך אחד, כפי שהמנהל רואה אותו */
function StudentDetail({ student, onBack }) {
  const td = testDate();
  const { data, err, busy, reload } = useLoad(
    () => api.getStudentYear(student.id, td), [student.id, td]);
  const [half, setHalf] = useState(null);

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <MI.chev style={{ transform: "rotate(180deg)" }} />חזרה לרשימה
      </button>
      <div className="screen-title">{student.name}</div>

      {busy && !data && <Loading what="טוען נוכחות" />}
      {err && <LoadFail msg={err} onRetry={reload} />}

      {data && (
        <>
          <Summary s={data.summary} />
          <div className="sec-label">ימי חופש</div>
          <Quota quota={data.summary.quota} />
          <div className="sec-label">לוח שנתי</div>
          <HalfPicker half={half} setHalf={setHalf} />
          <div className="card"><YearBoard days={data.days} half={half} /></div>
        </>
      )}
    </>
  );
}

function HalfPicker({ half, setHalf }) {
  return (
    <div className="seg">
      <button className={half === null ? "on" : ""} onClick={() => setHalf(null)}>כל השנה</button>
      <button className={half === "מחצית א׳" ? "on" : ""} onClick={() => setHalf("מחצית א׳")}>מחצית א׳</button>
      <button className={half === "מחצית ב׳" ? "on" : ""} onClick={() => setHalf("מחצית ב׳")}>מחצית ב׳</button>
    </div>
  );
}

/* ============================================================
   בקשות — מנהל
   ============================================================ */
function ManagerRequests({ say }) {
  const [showDecided, setShowDecided] = useState(false);
  const { data, err, busy, reload } = useLoad(() => api.getRequests(), []);
  const [busyId, setBusyId] = useState(null);

  const decide = (requestId, decision) => {
    setBusyId(requestId);
    api.decideRequest({ requestId, decision })
      .then((r) => {
        say(r.status === "מאושר"
          ? (r.alreadyAbsent ? "אושר. כבר הייתה היעדרות ליום הזה" : "אושר ונרשמה היעדרות")
          : "הבקשה נדחתה");
        reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  if (busy && !data) return <Loading what="טוען בקשות" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const pending = data.requests.filter((r) => r.status === "ממתין");
  const decided = data.requests.filter((r) => r.status !== "ממתין");
  const list = showDecided ? decided : pending;

  return (
    <>
      <div className="seg">
        <button className={!showDecided ? "on" : ""} onClick={() => setShowDecided(false)}>
          ממתינות{pending.length ? ` (${pending.length})` : ""}
        </button>
        <button className={showDecided ? "on" : ""} onClick={() => setShowDecided(true)}>הוכרעו</button>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">{showDecided ? "עדיין לא הוכרעה בקשה" : "אין בקשות ממתינות"}</div>
          <div className="e2">{showDecided ? "בקשות שאושרו או נדחו יופיעו כאן." : "כשחניך יגיש בקשה היא תופיע כאן."}</div>
        </div>
      ) : (
        list.map((r) => <RequestCard key={r.id} r={r} onDecide={showDecided ? null : decide} busyId={busyId} />)
      )}
    </>
  );
}

/* ============================================================
   מובילי שבוע — מינוי מתוך האפליקציה
   ⚠ העמודה בלוח נשארת מקור האמת. זה קיצור דרך, לא מנגנון מקביל.
   ============================================================ */
function Leaders({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getStudents(), []);
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState("");
  /* ⚠ מפת שינויים מקומית במקום טעינה מחדש. reload() כאן היה
     שולף מחדש את הקטלוג, ההיעדרויות וימי הסימון של כל 33
     החניכים — בשביל תיבת סימון אחת. המסך התעדכן רק אחרי
     שהכול חזר, וזה מה שהרגיש איטי. */
  const [patch, setPatch] = useState({});

  if (busy && !data) return <Loading what="טוען חניכים" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const isLeader = (s) => (s.id in patch ? patch[s.id] : s.leader);
  const leaders = data.students.filter(isLeader);
  const list = data.students.filter((s) => !q.trim() || s.name.includes(q.trim()));

  const toggle = (s) => {
    const next = !isLeader(s);
    setBusyId(s.id);
    setPatch((p) => ({ ...p, [s.id]: next })); // מתעדכן מיד על המסך
    api.setLeader({ studentId: s.id, leader: next })
      .then((r) => say(r.leader ? `${r.name} — מוביל/ת שבוע` : `${r.name} — הוסר/ה מהובלת השבוע`))
      .catch((e) => {
        setPatch((p) => ({ ...p, [s.id]: !next })); // נכשל — חוזרים אחורה
        say(e.message);
      })
      .finally(() => setBusyId(null));
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800 }}>
          {leaders.length === 0 ? "לא נבחרו מובילי שבוע"
            : leaders.map((s) => s.name).join(" · ")}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginTop: 5, lineHeight: 1.6 }}>
          מוביל שבוע יכול לסמן נוכחות ליום הנוכחי בלבד. שאר המסכים כאן נשארים למנהלים.
        </div>
      </div>

      {leaders.length > 2 && (
        <div className="alert a-amber">
          <MI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">{leaders.length} מובילים מסומנים</div>
            <div className="bd">בדרך כלל בוחרים שניים. אין חסימה — רק תזכורת.</div>
          </div>
        </div>
      )}

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש חניך" />

      <div className="rows">
        {list.map((s) => {
          const on = isLeader(s);
          return (
            <button className="st-row" key={s.id} disabled={busyId === s.id} onClick={() => toggle(s)}>
              <div className={"tick" + (on ? " on" : "")}>
                {on && <MI.check style={{ color: "#fff" }} />}
              </div>
              <div className="st-main">
                <div className="st-n">{s.name}</div>
                <div className="st-m">{on ? "מוביל/ת שבוע" : "לחיצה למינוי"}</div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ============================================================
   טאב המכינה אצל הצוות — הכול במקום אחד
   ⚠ מנהל בלבד. תורן רואה את המטבח בלבד, והשרת אוכף את זה
     בכל נקודת קצה כאן.
   ============================================================ */
export function MechinaStaff({ say }) {
  const [sub, setSub] = useState("mark");
  const [student, setStudent] = useState(null);

  const tabs = [
    ["mark", "סימון יומי"],
    ["students", "חניכים"],
    ["requests", "בקשות יציאה"],
    ["leaders", "מובילי שבוע"],
  ];

  return (
    <>
      <div className="screen-title">נוכחות</div>

      {!student && (
        <div className="seg seg-scroll">
          {tabs.map(([k, l]) => (
            <button key={k} className={sub === k ? "on" : ""} onClick={() => setSub(k)}>{l}</button>
          ))}
        </div>
      )}

      {/* allowPick — הצוות בוחר כל יום בשנה. מוביל שבוע לא מקבל
          את הבורר, והשרת דוחה אותו מכל תאריך שאינו היום. */}
      {sub === "mark" && <MarkDay say={say} allowPick />}
      {sub === "students" && (
        student
          ? <StudentDetail student={student} onBack={() => setStudent(null)} />
          : <StudentsList onOpen={setStudent} />
      )}
      {sub === "requests" && <ManagerRequests say={say} />}
      {sub === "leaders" && <Leaders say={say} />}
    </>
  );
}

/* ============================================================
   האפליקציה של החניך — שלד מלא משלה
   ⚠ אין כאן טאב מטבח. השרת דוחה סשן חניך מכל נקודות הקצה של
     המטבח, ולכן טאב כזה היה מוביל למסך שגיאה בלבד.
   ============================================================ */
export function MechinaApp({ auth, onSignedOut }) {
  const td = testDate();
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const say = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2600); }, []);

  const year = useLoad(() => api.getStudentYear(null, td), [td]);
  const reqs = useLoad(() => api.getRequests(), []);

  const signOut = () => {
    api.logout().catch(() => {}).finally(onSignedOut);
  };

  const refreshAll = () => { year.reload(); reqs.reload(); };

  return (
    <div className="kx">
      <header className="top">
        <div className="top-row">
          <div>
            <h1>{auth.name}</h1>
            <div className="sub">מכינת ניר עוז · מחזור ב׳</div>
          </div>
          <button className="who" onClick={signOut}>
            <span className="dot" />יציאה
          </button>
        </div>
      </header>

      <main className="wrap">
        {td && (
          <div className="test-banner">
            <MI.warn />
            <div>מצב בדיקה — התאריך מדומה ל-{dmy(td)}</div>
          </div>
        )}

        {/* ⚠ כשל טעינה חייב להיראות אחרת ממסך ריק */}
        {year.err && <LoadFail msg={year.err} onRetry={year.reload} />}

        {tab === "home" && (
          <>
            {year.busy && !year.data && <Loading what="טוען את הנוכחות שלך" />}
            {year.data && (
              <>
                <div className="sec-label">הנוכחות שלי</div>
                <Summary s={year.data.summary} />

                <div className="sec-label">ימי חופש</div>
                <Quota quota={year.data.summary.quota} />

                <div className="sec-label">הבקשות שלי</div>
                {reqs.err && <LoadFail msg={reqs.err} onRetry={reqs.reload} />}
                {reqs.data && reqs.data.requests.length === 0 && (
                  <div className="card" style={{ textAlign: "center", color: "var(--muted)",
                                                 fontSize: 13.5, fontWeight: 600 }}>
                    לא הגשת בקשות עדיין
                  </div>
                )}
                {reqs.data && reqs.data.requests.slice(0, 3).map((r) => (
                  <RequestCard key={r.id} r={r} />
                ))}

                <div className="sticky">
                  <button className="btn btn-primary" onClick={() => setTab("new")}>
                    <MI.plus />בקשת יציאה חדשה
                  </button>
                </div>
                <div style={{ height: 60 }} />
              </>
            )}
          </>
        )}

        {tab === "year" && (
          <>
            <div className="screen-title">הנוכחות שלי</div>
            {year.busy && !year.data && <Loading what="טוען" />}
            {year.data && (
              <>
                <HalfPickerTab days={year.data.days} />
              </>
            )}
          </>
        )}

        {tab === "requests" && (
          <>
            <div className="screen-title">הבקשות שלי</div>
            {reqs.err && <LoadFail msg={reqs.err} onRetry={reqs.reload} />}
            {reqs.busy && !reqs.data && <Loading what="טוען בקשות" />}
            {reqs.data && (reqs.data.requests.length === 0 ? (
              <div className="empty">
                <div className="e1">אין בקשות</div>
                <div className="e2">בקשה שתגיש תופיע כאן עם הסטטוס שלה.</div>
              </div>
            ) : reqs.data.requests.map((r) => <RequestCard key={r.id} r={r} />))}

            <div className="sticky">
              <button className="btn btn-primary" onClick={() => setTab("new")}>
                <MI.plus />בקשה חדשה
              </button>
            </div>
            <div style={{ height: 60 }} />
          </>
        )}

        {/* ⚠ מוביל שבוע בלבד. auth.isLeader מגיע מהסשן ונקרא טרי
            מהלוח בכל בקשה — מנהל שמבטל את המינוי מנתק את הגישה
            בלי שהחניך צריך להתנתק. השרת אוכף, זו רק התצוגה. */}
        {tab === "mark" && auth.isLeader && <MarkDay say={say} />}

        {tab === "new" && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}
              onClick={() => setTab("home")}>
              <MI.chev style={{ transform: "rotate(180deg)" }} />ביטול
            </button>
            <div className="screen-title">בקשת יציאה</div>
            {year.data ? (
              <RequestForm days={year.data.days} quota={year.data.summary.quota}
                say={say} onDone={() => { refreshAll(); setTab("requests"); }} />
            ) : <Loading what="טוען" />}
          </>
        )}
      </main>

      <nav className="nav">
        {[
          ["home", "בית", MI.home],
          ["year", "נוכחות", MI.cal],
          ["requests", "בקשות", MI.note],
          ...(auth.isLeader ? [["mark", "סימון", MI.tick]] : []),
        ].map(([k, label, Icon]) => (
            <button key={k} className={tab === k || (k === "requests" && tab === "new") ? "on" : ""}
              onClick={() => setTab(k)}>
              <Icon />
              <span>{label}</span>
            </button>
          ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* הלוח השנתי עם בורר המחצית — מופרד כדי שמצב הבורר לא יאבד
   בכל רענון של שאר המסך */
function HalfPickerTab({ days }) {
  const [half, setHalf] = useState(null);
  return (
    <>
      <HalfPicker half={half} setHalf={setHalf} />
      <div className="card"><YearBoard days={days} half={half} /></div>
    </>
  );
}
