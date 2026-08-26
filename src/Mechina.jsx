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
import { LessonsPage, LessonsBoard } from "./Lessons.jsx";
import { MenuPage } from "./Menu.jsx";
import { ROLE_INFO, LEADER_INFO } from "./roles-info.js";
import { SafetyPage } from "./Safety.jsx";
import { FaultsPage } from "./Faults.jsx";
import { ContainerPage } from "./Container.jsx";
import { FaultReportPage } from "./Faults.jsx";
import { BudgetPage } from "./Budget.jsx";
import { KitchenPage } from "./Kitchen.jsx";
import { HostingPage, LoansPage } from "./Extras.jsx";
import { useNotify, NotifyBell, NotifyPanel } from "./Notify.jsx";
import { GanttPage } from "./Gantt.jsx";
import { AgendaPage, TodayAgenda } from "./Agenda.jsx";
import { Drawer, Hamburger } from "./Drawer.jsx";
import { useExcel, downloadTable } from "./excel.js";

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
  book: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5z"/><path d="M4 17.5h16"/></svg>,
  bell: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>,
  box: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  tool: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14.6 12l-2.6-2.6 2.7-3.1z"/></svg>,
  dl: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
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
    return "present"; // סומן נוכח במפורש
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
        <i><b style={{ background: "#16A34A", borderColor: "#16A34A" }} />נוכחות</i>
        <i><b style={{ background: "#DC2626", borderColor: "#DC2626" }} />מחלה</i>
        <i><b style={{ background: "#D97706", borderColor: "#D97706" }} />מוצדקת</i>
        <i><b style={{ background: "#2563EB", borderColor: "#2563EB" }} />חופש</i>
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
  const [endDate, setEndDate] = useState(""); // ריק = יום אחד
  const [detail, setDetail] = useState("");
  const [file, setFile] = useState(null); // {name, mime, data}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const day = date ? byDate.get(date) : null;

  /* מספר ימי הלימוד בטווח — מוצג לפני השליחה */
  const spanDays = useMemo(() => {
    if (!date) return 0;
    const to = endDate || date;
    return days.filter((d) => d.date >= date && d.date <= to).length;
  }, [days, date, endDate]);

  const q = day ? quota.find((x) => x.half === day.half) : null;
  const vacationBlocked = type === "חופש" && day && day.kind !== "רגיל";
  const quotaOut = type === "חופש" && q && q.left < Math.max(1, spanDays);
  const needDetail = type === "מוצדקת" && !detail.trim();
  const unknownDate = Boolean(date) && !day;
  const badRange = Boolean(endDate) && endDate < date;

  const blocked = !date || unknownDate || vacationBlocked || quotaOut || needDetail || badRange;

  /* הקובץ נקרא כ-base64 ועובר בגוף הבקשה. עד 3.5MB. */
  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { setFile(null); return; }
    if (f.size > 3.5 * 1024 * 1024) { say("הקובץ גדול מדי — עד 3.5MB"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setFile({
      name: f.name, mime: f.type || "application/octet-stream",
      data: String(reader.result).split(",")[1] || "",
    });
    reader.readAsDataURL(f);
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy || blocked) return;
    setBusy(true); setErr(null);
    api.createRequest({
      type, date, endDate: endDate || undefined, detail: detail.trim(),
      ...(type === "מחלה" && file
        ? { fileName: file.name, fileMime: file.mime, fileData: file.data } : {}),
    })
      .then((r) => {
        if (r.fileUploaded === false) say("הבקשה נשלחה, אבל העלאת האישור נכשלה — נסו שוב מהמסך");
        else say(r.days > 1 ? `הבקשה נשלחה — ${r.days} ימים` : "הבקשה נשלחה");
        setDate(""); setEndDate(""); setDetail(""); setFile(null);
        onDone();
      })
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

      <div className="two">
        <div className="fld">
          <label htmlFor="rq-date">מתאריך</label>
          <select id="rq-date" value={date} disabled={busy}
            onChange={(e) => { setDate(e.target.value); setErr(null); if (endDate && e.target.value > endDate) setEndDate(""); }}>
            <option value="">בחרו תאריך…</option>
            {options.map((d) => (
              <option value={d.date} key={d.date}>
                {dmy(d.date)}{d.kind !== "רגיל" ? " · " + d.kind : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="rq-end">עד תאריך (לא חובה)</label>
          <select id="rq-end" value={endDate} disabled={busy || !date}
            onChange={(e) => { setEndDate(e.target.value); setErr(null); }}>
            <option value="">יום אחד</option>
            {options.filter((d) => date && d.date > date).map((d) => (
              <option value={d.date} key={d.date}>{dmy(d.date)}</option>
            ))}
          </select>
        </div>
      </div>

      {spanDays > 1 && (
        <div className="alert a-amber" style={{ marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="bd" style={{ marginTop: 0 }}>
              הבקשה חלה על <b className="num">{spanDays}</b> ימי לימוד
              {type === "חופש" ? " וכל אחד מהם נספר מהמכסה" : ""}.
            </div>
          </div>
        </div>
      )}

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
          פירוט{type === "מוצדקת" ? " (חובה)" : " (לא חובה)"}
        </label>
        <input id="rq-detail" value={detail} disabled={busy}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={type === "מוצדקת" ? "שמחה או אבל מדרגה ראשונה" : "אפשר להוסיף הסבר קצר"} />
      </div>

      {type === "מחלה" && (
        <div className="fld">
          <label htmlFor="rq-file">אישור מחלה (לא חובה)</label>
          <input id="rq-file" type="file" accept="image/*,.pdf" disabled={busy}
            onChange={pickFile}
            style={{ width: "100%", minHeight: 48, background: "var(--surface)",
                     border: "1px solid var(--line2)", borderRadius: 11,
                     padding: "11px 13px", fontSize: 14 }} />
          {file && (
            <div style={{ fontSize: 12, color: "var(--ok)", fontWeight: 700, marginTop: 5 }}>
              ✓ {file.name} מוכן לשליחה
            </div>
          )}
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={busy || blocked}>
        {busy ? "שולח…" : "שליחת הבקשה"}
      </button>
    </form>
  );
}

/* ============================================================
   כרטיס בקשה. אצל המנהל מופיעים כפתורי ההכרעה.
   ============================================================ */
/* ============================================================
   מסלול הבקשה — המדריך ואז ראש המכינה
   ------------------------------------------------------------
   ⚠ שתי תחנות תמיד, גם כשהראשונה מדולגת. חניך בלי שיבוץ
     לקבוצה מגיע ישר לראש המכינה, והתחנה הראשונה מוצגת אפורה
     עם הסבר — עדיף שיראו שהמדריך לא נשאל מאשר שהשלב ייעלם
     ואיש לא ידע שהוא היה אמור להיות שם.
   ============================================================ */
/* ⚠ שמות בלוח ההרשאות נושאים תיאור תפקיד — "דני לויט — מנהל
   המכינה". בכרטיס צר זה גולש, והתיאור ממילא כתוב מעליו. */
const shortName = (n) => String(n || "").split(/[—–-]/)[0].replace(/\s+/g, " ").trim();

function RequestTrack({ r }) {
  const done = r.stage === "הסתיים";
  const atHead = r.stage === "אצל ראש המכינה";

  const first = !r.guideName
    ? { state: "skip", title: "מדריך", note: "אין שיבוץ לקבוצה" }
    : r.guideDecision
      ? { state: r.guideDecision === "מאושר" ? "ok" : "no",
          title: shortName(r.guideBy) || r.guideName,
          note: "המליץ" + (r.guideDecision === "מאושר" ? " לאשר" : " לדחות") }
      : { state: "now", title: r.guideName, note: "ממתין להמלצה" };

  const second = done
    ? { state: r.status === "מאושר" ? "ok" : "no",
        title: shortName(r.decidedBy) || "ראש המכינה",
        note: r.status === "מאושר" ? "אישר" : "דחה" }
    : { state: atHead ? "now" : "wait", title: "ראש המכינה",
        note: atHead ? "ממתין להכרעה" : "יגיע אחרי המדריך" };

  return (
    <div className="rq-track">
      {[first, second].map((st, i) => (
        <div className={"trk trk-" + st.state} key={i}>
          {/* ⚠ הנקודה והקו המחבר חיים בשורה משלהם, מעל הטקסט.
              כשהקו עבר באותו גובה כמו השם הוא חצה אותו. */}
          <div className="trk-rail"><span className="trk-dot" /></div>
          <b>{st.title}</b>
          <span className="trk-note">{st.note}</span>
        </div>
      ))}
    </div>
  );
}

function RequestCard({ r, onDecide, busyId }) {
  const busy = busyId === r.id;
  /* ⚠ המדריך ממליץ, ראש המכינה מכריע. אותם כפתורים, טקסט אחר —
     כדי שהמדריך לא יחשוב שסגר את הבקשה. */
  const isRec = r.decideAs === "guide";
  /* ראש המכינה שמכריע לפני שהמדריך המליץ — עוקף אותו, וכדאי
     שיֵדע. הודעה ולא חסימה: זו סמכותו. */
  const skipping = r.decideAs === "head" && r.stage === "אצל המדריך";
  return (
    <div className="rq">
      <div className="rq-top">
        <div className="rq-name">{r.student ? r.student.name : r.type}</div>
        <span className="when num">
          {r.endDate && r.endDate !== r.date ? `${dm(r.date)}–${dm(r.endDate)}` : dm(r.date)}
        </span>
      </div>
      <div className="rq-meta">
        <span className={"pill " + (TYPE_PILL[r.type] || "p-new")}>{r.type}</span>
        <span className={"pill " + (STATUS_PILL[r.status] || "p-new")}>{r.status}</span>
        {r.hasFile && <span className="pill p-ok">צורף אישור</span>}
        {r.groupName && <span>· {r.groupName}</span>}
      </div>
      {r.detail && <div className="rq-detail">{r.detail}</div>}
      {r.stage && <RequestTrack r={r} />}
      {onDecide && r.canDecide && skipping && (
        <div className="rq-skip">
          הבקשה עדיין אצל {r.guideName} — החלטה שלך תסגור אותה בלי להמתין להמלצה
        </div>
      )}
      {onDecide && r.canDecide && (
        <div className="rq-act">
          <button className="ok" disabled={busy} onClick={() => onDecide(r.id, "approve")}>
            {busy ? "…" : isRec ? "ממליץ לאשר" : "אישור"}
          </button>
          <button className="no" disabled={busy} onClick={() => onDecide(r.id, "reject")}>
            {isRec ? "ממליץ לדחות" : "דחייה"}
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
  useExcel();
  const td = testDate();
  const [date, setDate] = useState(null);
  const { data, err, busy, reload } = useLoad(
    () => api.getAttendanceDay(date, td), [date, td]);

  const [draft, setDraft] = useState(null); // studentId → {type, detail}
  const [present, setPresent] = useState(new Set()); // ⚠ נוכחות מפורשת
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [trainPatch, setTrainPatch] = useState({});
  /* נשמר בין טעינות: כשתאריך נבחר נופל מחוץ ללוח, התשובה היא
     שגיאה ובלי זה גבולות הלוח היו הולכים לאיבוד. */
  const [range, setRange] = useState(null);

  useEffect(() => {
    if (!data) return;
    if (data.range) setRange(data.range);
    const d = {};
    for (const s of data.students) if (s.absent) d[s.id] = { type: s.type, detail: s.detail || "" };
    setDraft(d);
    setPresent(new Set(data.students.filter((s) => s.present).map((s) => s.id)));
    setTrainPatch({});
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

  /* מצב החניך: "present" | סוג היעדרות | null = לא סומן */
  const stateOf = (id) => (present.has(id) ? "present" : (draft[id] ? draft[id].type : null));

  const setState = (id, t) => {
    if (locked.has(id)) return;
    const cur = stateOf(id);
    const next = cur === t ? null : t; // לחיצה חוזרת מנקה ל"לא סומן"
    setPresent((prev) => {
      const p = new Set(prev);
      if (next === "present") p.add(id); else p.delete(id);
      return p;
    });
    setDraft((prev) => {
      const d = { ...prev };
      if (next && next !== "present") d[id] = { type: next, detail: (prev[id] && prev[id].detail) || "" };
      else delete d[id];
      return d;
    });
  };
  const setDetail = (id, v) =>
    setDraft((prev) => ({ ...prev, [id]: { ...(prev[id] || { type: "מוצדקת" }), detail: v } }));

  /* כל מי שלא סומן — נוכח. חוסך 30 לחיצות ביום רגיל. */
  const markRestPresent = () => {
    setPresent((prev) => {
      const p = new Set(prev);
      for (const s of students) if (!draft[s.id] && !locked.has(s.id)) p.add(s.id);
      return p;
    });
  };

  const absentCount = Object.keys(draft).length;
  const presentCount = present.size;
  const unmarkedCount = students.length - absentCount - presentCount;

  const save = () => {
    if (saving) return;
    /* ⚠ מוצדקת מחייבת פירוט — נבדק גם בשרת; כאן חוסכים שליחה */
    const missing = Object.entries(draft).find(([, v]) => v.type === "מוצדקת" && !v.detail.trim());
    if (missing) {
      setOpen(missing[0]);
      say("היעדרות מוצדקת מחייבת פירוט");
      return;
    }
    setSaving(true);
    const absences = Object.entries(draft).map(([studentId, v]) => ({
      studentId, type: v.type, detail: v.detail,
    }));
    api.markAttendance({ date: day.date, absences, present: [...present] }, td)
      .then((r) => {
        say(r.locked.length
          ? `נשמר. ${r.locked.length} מבקשה מאושרת לא שונו`
          : `נשמר · ${r.present} נוכחים, ${r.absent} חסרים, ${r.unmarked} לא סומנו`);
        reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  /* דיווח אימון — נקודת הקצה של השיעורים, פתוחה גם למובילים */
  const trainState = (t) => (t.id in trainPatch ? trainPatch[t.id] : t.happened);
  const markTraining = (t, value) => {
    const next = trainState(t) === value ? null : value;
    setTrainPatch((p) => ({ ...p, [t.id]: next }));
    api.markLesson({ meetingId: t.id, happened: next })
      .catch((e) => { setTrainPatch((p) => ({ ...p, [t.id]: t.happened })); say(e.message); });
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
            <div className="bd">כל חניך שלא יסומן יישאר "לא סומן" — נוכחות אינה ברירת מחדל.</div>
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

      {/* מפגשי היום שסומנו להצגה כאן — אימונים, עם נוכחות פרטנית */}
      {data.trainings && data.trainings.length > 0 && canMark && data.trainings.map((t) => (
        <TrainingCard key={t.id} training={t} students={students} say={say}
          today={td} happenedState={trainState(t)} onHappened={(v) => markTraining(t, v)} />
      ))}

      <div className="grp-h">
        <span className="num">{presentCount} נוכחים · {absentCount} חסרים · {unmarkedCount} לא סומנו</span>
        <button className="btn btn-ghost btn-sm" style={{ minHeight: 30, padding: "0 10px" }}
          onClick={() => {
            downloadTable({
              file: `נוכחות-${day.date}`,
              sheet: "נוכחות",
              title: `נוכחות יומית — ${dmy(day.date)} · יום ${day.kind}`,
              header: ["חניך", "סטטוס", "פירוט"],
              rows: students.map((s) => {
                const st = stateOf(s.id);
                return [
                  s.name,
                  st === "present" ? "נוכח" : (st || "לא סומן"),
                  (st && st !== "present" && draft[s.id] && draft[s.id].detail) || "",
                ];
              }),
              widths: [22, 12, 34],
            });
            say("הקובץ ירד");
          }}>
          <MI.dl />אקסל
        </button>
      </div>

      {canMark && unmarkedCount > 0 && (
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
          onClick={markRestPresent}>
          סימון כל מי שלא סומן כנוכח ({unmarkedCount})
        </button>
      )}

      <div className="rows">
        {students.map((s) => {
          const st = stateOf(s.id);
          const cur = draft[s.id];
          const isLocked = locked.has(s.id);
          const isOpen = open === s.id;
          return (
            <div key={s.id}>
              <button className="st-row" onClick={() => setOpen(isOpen ? null : s.id)}>
                <div className={"st-av" + (cur ? " absent" : st === "present" ? " here" : " none")}>
                  {initials(s.name)}
                </div>
                <div className="st-main">
                  <div className="st-n">{s.name}</div>
                  <div className="st-m">
                    {st === "present" ? (
                      <span className="pill pp-ok">נוכח/ת</span>
                    ) : cur ? (
                      <>
                        <span className={"pill " + (TYPE_PILL[cur.type] || "p-low")}>{cur.type}</span>
                        {cur.detail ? <span>{cur.detail}</span> : null}
                      </>
                    ) : (
                      <span className="pill pp-none">לא סומן</span>
                    )}
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
                  {/* לחיצה חוזרת על מצב פעיל מנקה ל"לא סומן" */}
                  <div className="abs-pick">
                    <button className={st === "present" ? "on here" : ""} disabled={isLocked}
                      onClick={() => setState(s.id, "present")}>נוכח</button>
                    {TYPES.map((t) => (
                      <button key={t} disabled={isLocked || (t === "חופש" && !day.vacationAllowed)}
                        className={(st === t ? "on " : "") + (TYPE_CLASS[t] || "")}
                        onClick={() => setState(s.id, t)}>{t}</button>
                    ))}
                  </div>
                  {cur && cur.type === "מוצדקת" && !isLocked && (
                    <div className="abs-note">
                      <input value={cur.detail} placeholder="פירוט (חובה)"
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
   כרטיס אימון — קיום + נוכחות פרטנית
   ------------------------------------------------------------
   ⚠ הנוכחות באימון עצמאית מהנוכחות היומית: תורן אוכל נעדר
     מהאימון ועדיין נוכח באותו יום. שני רישומים, שתי אמיתות.
   ============================================================ */
function TrainingCard({ training: t, students, say, today, happenedState, onHappened }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(() => {
    const m = {};
    for (const id of t.present) m[id] = "here";
    for (const id of t.absent) m[id] = "absent";
    for (const id of t.kitchen) m[id] = "kitchen";
    return m;
  });
  const [saving, setSaving] = useState(false);

  const setOne = (id, v) =>
    setState((p) => {
      const n = { ...p };
      if (p[id] === v) delete n[id]; // לחיצה חוזרת מנקה
      else n[id] = v;
      return n;
    });

  const markRest = () =>
    setState((p) => {
      const n = { ...p };
      for (const s of students) if (!n[s.id]) n[s.id] = "here";
      return n;
    });

  const counts = Object.values(state).reduce(
    (a, v) => ({ ...a, [v]: (a[v] || 0) + 1 }), {});

  const save = () => {
    if (saving) return;
    setSaving(true);
    const of = (v) => Object.entries(state).filter(([, x]) => x === v).map(([id]) => id);
    api.markTraining({
      meetingId: t.id, present: of("here"), absent: of("absent"), kitchen: of("kitchen"),
    }, today)
      .then((r) => say(`אימון נשמר · ${r.present} נכחו, ${r.absent} לא, ${r.kitchen} תורני אוכל`))
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <div className="card" style={{ marginBottom: 12, padding: "13px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <b style={{ fontSize: 14.5, fontWeight: 800 }}>{t.subject} היום</b>
        {!happenedState && <span className="pill p-new">טרם דווח</span>}
      </div>
      <div className="exp" style={{ marginTop: 9 }}>
        <button className={happenedState === "כן" ? "on-ok" : ""} onClick={() => onHappened("כן")}>התקיים</button>
        <button className={happenedState === "לא" ? "on-soon" : ""} onClick={() => onHappened("לא")}>לא התקיים</button>
      </div>

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 9 }}
        onClick={() => setOpen(!open)}>
        {open ? "סגירת נוכחות האימון" : `נוכחות באימון (${counts.here || 0} נכחו · ${counts.absent || 0} לא · ${counts.kitchen || 0} תורני אוכל)`}
      </button>

      {open && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8 }}
            onClick={markRest}>
            סימון כל מי שלא סומן כנכח
          </button>
          <div style={{ marginTop: 8 }}>
            {students.map((s) => {
              const v = state[s.id];
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                          padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </div>
                  <div className="tr-pick">
                    <button className={v === "here" ? "on here" : ""}
                      onClick={() => setOne(s.id, "here")}>נכח</button>
                    <button className={v === "absent" ? "on absent" : ""}
                      onClick={() => setOne(s.id, "absent")}>לא נכח</button>
                    <button className={v === "kitchen" ? "on kitchen" : ""}
                      onClick={() => setOne(s.id, "kitchen")}>תורן אוכל</button>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-ok" style={{ marginTop: 10 }} disabled={saving} onClick={save}>
            {saving ? "שומר…" : "שמירת נוכחות האימון"}
          </button>
        </>
      )}
    </div>
  );
}

/* ============================================================
   רשימת החניכים — מנהל
   ============================================================ */
function StudentsList({ onOpen, say }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => api.getStudents(), []);
  const [q, setQ] = useState("");

  if (busy && !data) return <Loading what="טוען חניכים" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const list = data.students.filter((s) => !q.trim() || s.name.includes(q.trim()));

  /* ⚠ ממוצע הנוכחות של המחזור — לא של חניך בודד. הוא נגזר
     מהסכומים ולא מממוצע-של-ממוצעים, שהיה נותן משקל זהה לחניך
     שסומן ביום אחד ולחניך שסומן במאה. */
  const totPresent = data.students.reduce((a, x) => a + ((x.summary && x.summary.present) || 0), 0);
  const totDays = data.students.reduce((a, x) => a + ((x.summary && x.summary.schoolDays) || 0), 0);
  /* ⚠ הסף הוא ימי לימוד שסומנו, לא סכום ימי-חניך. עם 33 חניכים
     סכום ימי-החניך עובר 5 כבר אחרי יום אחד, ואז מוצג "0%
     נוכחות ממוצעת" על סמך יום בודד — מספר נכון חשבונית
     ומטעה לחלוטין. */
  const markedDays = data.students[0] && data.students[0].summary
    ? data.students[0].summary.schoolDays : 0;

  return (
    <>
      <div className="band">
        <div className="band-h">המחזור במספרים</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{data.students.length}</div>
            <div className="band-l">חניכים פעילים</div>
          </div>
          <div className="band-c">
            <div className="band-n">
              {markedDays >= 5 ? Math.round((totPresent / totDays) * 100) + "%" : "—"}
            </div>
            <div className="band-l">נוכחות ממוצעת</div>
          </div>
          {/* ⚠ הרצועה מדברת על השנה; מצב היום יושב באריחים
              שמתחתיה. אותו מספר בשני מקומות על אותו מסך הוא
              רעש, לא הדגשה. */}
          <div className="band-c">
            <div className="band-n">{markedDays}</div>
            <div className="band-l">ימי לימוד שסומנו</div>
          </div>
        </div>
      </div>

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש חניך" />

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
        onClick={() => {
          downloadTable({
            file: "נוכחות-שנתית",
            sheet: "נוכחות שנתית",
            title: "סיכום נוכחות שנתי — מכינת ניר עוז",
            header: ["חניך", "ימים שסומנו", "נוכח", "נעדר", "לא סומן", "מחלה", "מוצדקת", "חופש"],
            rows: data.students.map((s) => [
              s.name, s.summary.schoolDays, s.summary.present, s.summary.absent,
              s.summary.unmarked, s.summary.sick, s.summary.justified, s.summary.vacation,
            ]),
            widths: [22, 12, 9, 9, 10, 9, 9, 9],
          });
          say("הקובץ ירד");
        }}><MI.dl />הורדת סיכום שנתי לאקסל</button>

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
              {/* ⚠ נוכחות אימון נפרדת מהיומית — ראו
                  _training-summary.js. מוצגת רק כשיש מה להציג. */}
              {s.training && s.training.marked > 0 && (
                <div className="st-train">
                  <span className={"pill " + (s.training.pct != null && s.training.pct < 70 ? "p-low" : "p-ok")}>
                    אימונים {s.training.pct != null ? `${s.training.pct}%` : `${s.training.present}/${s.training.marked}`}
                  </span>
                  {s.training.kitchen > 0 && <span className="st-train-k">{s.training.kitchen} מטבח</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* לוח שנתי של חניך אחד, כפי שהמנהל רואה אותו */
function StudentDetail({ student, onBack, say }) {
  const td = testDate();
  const { data, err, busy, reload } = useLoad(
    () => api.getStudentYear(student.id, td), [student.id, td]);
  const [half, setHalf] = useState(null);

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <MI.chev style={{ transform: "rotate(180deg)" }} />חזרה לרשימה
      </button>

      {/* ---------- כותרת החניך ----------
          ⚠ שם על שורה אפורה לא נראה כמו כרטיס של אדם. ראשי
            תיבות בעיגול, השם בגדול, ומתחתיו מה שמזהה אותו
            במכינה — הקבוצה והענף. */}
      <div className="sd-head">
        <div className="sd-av">{initials(student.name)}</div>
        <div className="sd-who">
          <b>{student.name}</b>
          <span>{student.leader ? "מוביל שבוע · " : ""}מכינת ניר עוז · מחזור ב׳</span>
        </div>
      </div>

      {busy && !data && <Loading what="טוען נוכחות" />}
      {err && <LoadFail msg={err} onRetry={reload} />}

      {data && (
        <>
          {/* ⚠ שלושת המספרים שעונים על "מה מצבו" לפני הפירוט */}
          <div className="band">
            <div className="band-h">התמונה השנתית</div>
            <div className="band-grid">
              <div className="band-c">
                <div className="band-n">
                  {data.summary.schoolDays >= 5
                    ? Math.round((data.summary.present / data.summary.schoolDays) * 100) + "%"
                    : `${data.summary.present}/${data.summary.schoolDays}`}
                </div>
                <div className="band-l">נוכחות</div>
              </div>
              <div className="band-c">
                {(() => {
                  const left = data.summary.quota.reduce((a, q) => a + q.left, 0);
                  return (
                    <>
                      <div className={"band-n" + (left === 0 ? " warn" : " ok")}>{left}</div>
                      <div className="band-l">ימי חופש שנותרו</div>
                    </>
                  );
                })()}
              </div>
              <div className="band-c">
                <div className={"band-n" + (data.summary.absent ? " warn" : "")}>
                  {data.summary.absent}
                </div>
                <div className="band-l">ימי היעדרות</div>
              </div>
            </div>
          </div>

          <Summary s={data.summary} />

          {/* ---------- נוכחות באימונים ----------
              ⚠ אמת נפרדת מהנוכחות היומית. חניך יכול להיות נוכח
                במכינה ולהיעדר מהאימון, ולהפך. מטבח אינו
                היעדרות — הוא נספר בנפרד ואינו במכנה. */}
          <div className="sec-label">נוכחות באימונים</div>
          {data.training && data.training.marked > 0 ? (
            <div className="card tr-card">
              <div className="tr-pct num"
                style={{ color: data.training.pct != null && data.training.pct < 70 ? "var(--clay)" : "var(--ok)" }}>
                {data.training.pct != null ? `${data.training.pct}%` : "—"}
              </div>
              <div className="tr-legs">
                <div><b className="num">{data.training.present}</b><span>נכח</span></div>
                <div><b className="num">{data.training.absent}</b><span>נעדר</span></div>
                <div><b className="num">{data.training.kitchen}</b><span>מטבח</span></div>
              </div>
            </div>
          ) : (
            <div className="attn-calm" style={{ marginBottom: 14 }}>
              <b>עוד לא סומנה נוכחות באימונים</b>
              <span>הסימון נעשה מתוך המפגש בגיליון</span>
            </div>
          )}

          <div className="sec-label">ימי חופש</div>
          <Quota quota={data.summary.quota} />
          <div className="sec-label">לוח שנתי</div>
          <HalfPicker half={half} setHalf={setHalf} />
          <div className="card"><YearBoard days={data.days} half={half} /></div>

          <div className="sec-label">פרופיל · שיבוץ ומיונים מהחניך</div>
          <ProfileCard studentId={student.id} say={say} />

          {/* ⚠ צוות בלבד — הרכיב אינו קיים אצל החניך */}
          <Incidents studentId={student.id} say={say} />
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
/* ⚠ "אין בקשות" ו"אין בקשות *שלך*" הם שני מסכים שונים. מדריך
   שרואה ריק צריך לדעת שהבקשות קיימות ופשוט לא אצלו. */
const EMPTY = {
  mine: ["אין בקשה שממתינה להחלטתך",
         "בקשה תופיע כאן כשהיא תגיע לשלב שלך בתהליך."],
  pending: ["אין בקשות בתהליך",
            "כשחניך יגיש בקשה היא תופיע כאן, עם השלב שהיא נמצאת בו."],
  decided: ["עדיין לא הוכרעה בקשה",
            "בקשות שראש המכינה אישר או דחה יופיעו כאן."],
};

function ManagerRequests({ say }) {
  useExcel();
  const [tab, setTab] = useState("mine"); // mine · pending · decided
  const { data, err, busy, reload } = useLoad(() => api.getRequests(), []);
  const [busyId, setBusyId] = useState(null);

  const decide = (requestId, decision) => {
    setBusyId(requestId);
    api.decideRequest({ requestId, decision })
      .then((r) => {
        /* ⚠ המלצת מדריך אינה הכרעה. השרת מחזיר stage, והטקסט
           נגזר ממנו — אחרת המדריך היה מקבל "אושר" ומניח שסיים. */
        if (r.stage === "אצל ראש המכינה") {
          say(`ההמלצה נרשמה — הבקשה הועברה לראש המכינה`);
        } else {
          say(r.status === "מאושר"
            ? (r.alreadyAbsent ? "אושר. כבר הייתה היעדרות ליום הזה" : "אושר ונרשמה היעדרות")
            : "הבקשה נדחתה");
        }
        reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  if (busy && !data) return <Loading what="טוען בקשות" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  /* ⚠ שלוש רשימות ולא שתיים. "ממתינות" בלבד לא הספיק ברגע
     שיש שני שלבים: מדריך צריך לראות מיד מה תלוי בו, ולא לחפש
     בין בקשות שממתינות לראש המכינה. */
  const mine = data.requests.filter((r) => r.canDecide);
  const pending = data.requests.filter((r) => r.status === "ממתין");
  const decided = data.requests.filter((r) => r.status !== "ממתין");
  const list = tab === "mine" ? mine : tab === "pending" ? pending : decided;

  return (
    <>
      <div className="seg">
        <button className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>
          להחלטתי{mine.length ? ` (${mine.length})` : ""}
        </button>
        <button className={tab === "pending" ? "on" : ""} onClick={() => setTab("pending")}>
          בתהליך{pending.length ? ` (${pending.length})` : ""}
        </button>
        <button className={tab === "decided" ? "on" : ""} onClick={() => setTab("decided")}>הוכרעו</button>
      </div>

      {data.requests.length > 0 && (
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
          onClick={() => {
            downloadTable({
              file: "בקשות-יציאה",
              sheet: "בקשות יציאה",
              title: "בקשות יציאה — מכינת ניר עוז",
              header: ["חניך", "קבוצה", "סוג", "מתאריך", "עד תאריך", "פירוט", "אישור מחלה",
                       "שלב", "המלצת המדריך", "המדריך", "סטטוס", "הוכרע על ידי"],
              rows: data.requests.map((r) => [
                r.student ? r.student.name : "", r.groupName || "", r.type, dmy(r.date),
                r.endDate && r.endDate !== r.date ? dmy(r.endDate) : "",
                r.detail || "", r.hasFile ? "צורף" : "",
                r.stage || "", r.guideDecision || "", r.guideBy || r.guideName || "",
                r.status, r.decidedBy || "",
              ]),
              widths: [20, 13, 10, 12, 12, 30, 11, 15, 13, 15, 10, 16],
            });
            say("הקובץ ירד");
          }}><MI.dl />הורדת כל הבקשות לאקסל</button>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">{EMPTY[tab][0]}</div>
          <div className="e2">{EMPTY[tab][1]}</div>
        </div>
      ) : (
        list.map((r) => <RequestCard key={r.id} r={r}
          onDecide={tab === "decided" ? null : decide} busyId={busyId} />)
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
   הפרופיל האישי
   ------------------------------------------------------------
   שיבוץ ומיונים — החניך ממלא והצוות רואה (אצל הצוות: קריאה
   בלבד). שיחה אישית — הצוות קובע והחניך רואה.

   ⚠ אירועים חריגים אינם כאן. הם ברכיב נפרד שמרונדר אך ורק
     אצל הצוות, מול נקודת קצה שהיא כולה מנהל בלבד.
   ============================================================ */
const TALK_LABELS = ["תחילת שנה", "אמצע שנה", "סוף שנה"];

function ProfileCard({ studentId, say }) {
  const { data, err, busy, reload } = useLoad(() => api.getProfile(studentId), [studentId]);
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setF({ army: data.army, tryouts: data.tryouts, talks: [...data.talks] });
  }, [data]);

  if (busy && !data) return <Loading what="טוען פרופיל" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data || !f) return null;

  const saveArmy = () => {
    setSaving(true);
    api.setProfile({ studentId, army: f.army, tryouts: f.tryouts })
      .then(() => say("הפרופיל נשמר"))
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };
  const saveTalks = () => {
    setSaving(true);
    api.setProfile({ studentId, talks: f.talks })
      .then(() => say("תאריכי השיחה נשמרו"))
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="fld">
          <label htmlFor="pf-army">שיבוץ צבאי</label>
          <input id="pf-army" value={f.army} disabled={saving || !data.canEditArmy}
            onChange={(e) => setF({ ...f, army: e.target.value })}
            placeholder={data.canEditArmy ? "לאן שובצת" : "החניך טרם מילא"} />
        </div>
        <div className="fld">
          <label htmlFor="pf-try">מיונים לצבא</label>
          <input id="pf-try" value={f.tryouts} disabled={saving || !data.canEditArmy}
            onChange={(e) => setF({ ...f, tryouts: e.target.value })}
            placeholder={data.canEditArmy ? "אילו מיונים עברת או צפויים" : "החניך טרם מילא"} />
        </div>
        {data.canEditArmy && (
          <button className="btn btn-primary" disabled={saving} onClick={saveArmy}>
            {saving ? "שומר…" : "שמירה"}
          </button>
        )}
      </div>

      <div className="sec-label">שיחה אישית</div>
      <div className="card lift">
        {TALK_LABELS.map((label, i) => (
          <div className="fld" key={label}>
            <label>{label}</label>
            {data.canEditTalks ? (
              <input type="date" value={f.talks[i] || ""} disabled={saving}
                onChange={(e) => {
                  const talks = [...f.talks]; talks[i] = e.target.value || null;
                  setF({ ...f, talks });
                }} />
            ) : (
              <div style={{ minHeight: 44, display: "flex", alignItems: "center",
                            background: "var(--bg)", borderRadius: 11, padding: "0 13px",
                            fontSize: 15, fontWeight: 700 }}>
                {f.talks[i] ? dmy(f.talks[i]) : "טרם נקבע"}
              </div>
            )}
          </div>
        ))}
        {data.canEditTalks && (
          <button className="btn btn-primary" disabled={saving} onClick={saveTalks}>
            {saving ? "שומר…" : "שמירת התאריכים"}
          </button>
        )}
      </div>
    </>
  );
}

/* אירועים חריגים — צוות בלבד. מרונדר רק במסך המנהל. */
function Incidents({ studentId, say }) {
  const { data, err, busy, reload } = useLoad(() => api.getIncidents(studentId), [studentId]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ kind: "שיחת משמעת", detail: "", date: "" });
  const [saving, setSaving] = useState(false);

  if (busy && !data) return <Loading what="טוען אירועים" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const submit = () => {
    if (saving || !f.detail.trim()) return;
    setSaving(true);
    api.addIncident({ studentId, kind: f.kind, detail: f.detail.trim(), date: f.date || undefined })
      .then(() => { say("האירוע נרשם"); setAdding(false); setF({ kind: "שיחת משמעת", detail: "", date: "" }); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <div className="sec-label">אירועים חריגים · לעיני הצוות בלבד</div>

      {data.incidents.length === 0 && !adding && (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)",
                                       fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>
          אין אירועים רשומים
        </div>
      )}

      {data.incidents.map((x) => (
        <div className="rq" key={x.id}>
          <div className="rq-top">
            <span className="pill p-low">{x.kind}</span>
            <span className="when num">{dmy(x.date)}</span>
          </div>
          <div className="rq-detail">{x.detail}</div>
          {x.by && <div className="rq-meta" style={{ marginTop: 8 }}><span>נרשם על ידי {x.by}</span></div>}
        </div>
      ))}

      {adding ? (
        <div className="card lift">
          <div className="fld">
            <label>סוג</label>
            <div className="pick">
              {data.kinds.map((k) => (
                <button type="button" key={k} className={f.kind === k ? "on" : ""}
                  onClick={() => setF({ ...f, kind: k })}>{k}</button>
              ))}
            </div>
          </div>
          <div className="fld">
            <label htmlFor="in-date">תאריך (ריק = היום)</label>
            <input id="in-date" type="date" value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div className="fld">
            <label htmlFor="in-detail">פירוט (חובה)</label>
            <input id="in-detail" value={f.detail}
              onChange={(e) => setF({ ...f, detail: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={saving || !f.detail.trim()} onClick={submit}>
            {saving ? "רושם…" : "רישום האירוע"}
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setAdding(false)}>
            ביטול
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ width: "100%" }}
          onClick={() => setAdding(true)}>
          <MI.plus />רישום אירוע חריג
        </button>
      )}
    </>
  );
}

/* ============================================================
   דירוג שיעורי המרצה המתחלף — בדף הבית של כל חניך
   ------------------------------------------------------------
   מוצגים מפגשי מדעי המדינה וכישורי חיים מהשבועיים האחרונים.
   הדירוג 1–10, אישי, פעם אחת למפגש (דירוג חוזר מעדכן). הממוצע
   בין כל החניכים מוצג בחוות הדעת של מחזור ב׳.
   ============================================================ */
function RateLessons({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getRatable(), []);
  const [patch, setPatch] = useState({});
  const [busyId, setBusyId] = useState(null);

  if (busy && !data) return null; // לא חוסמים את דף הבית
  if (err || !data || !data.meetings.length) return null;

  const scoreOf = (m) => (m.id in patch ? patch[m.id] : m.myScore);

  const rate = (m, score) => {
    setBusyId(m.id);
    setPatch((p) => ({ ...p, [m.id]: score })); // מיד על המסך
    api.rateLesson({ meetingId: m.id, score })
      .then((r) => say(`דורג ${score}/10 · ממוצע הכיתה ${r.avg}`))
      .catch((e) => { setPatch((p) => ({ ...p, [m.id]: m.myScore })); say(e.message); })
      .finally(() => setBusyId(null));
  };

  return (
    <>
      <div className="sec-label">דירוג שיעורים</div>
      {data.meetings.map((m) => {
        const my = scoreOf(m);
        return (
          <div className="rq" key={m.id}>
            <div className="rq-top">
              <div className="rq-name">{m.subject}</div>
              <span className="when num">{dm(m.date)}</span>
            </div>
            {m.lecturer && <div className="rq-meta"><span>{m.lecturer}</span></div>}
            <div className="rate-row">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} disabled={busyId === m.id}
                  className={my === n ? "on" : my && n <= my ? "lt" : ""}
                  onClick={() => rate(m, n)}>{n}</button>
              ))}
            </div>
            {my && (
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, marginTop: 6 }}>
                הדירוג שלך: {my}/10 · אפשר לשנות בלחיצה
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ============================================================
   בעלי תפקידים במכינה
   ------------------------------------------------------------
   ⚠ נפרד ממובילי השבוע בכוונה. מוביל שבוע מתחלף כל שבוע, ואילו
     תפקיד נשמר לאורך השנה — ערבוב שלהם באותו מסך היה גורר
     איפוס של תפקידים בכל החלפת מובילים.

   ⚠ רשימת התפקידים מגיעה מהגדרות העמודה בלוח ולא מהקוד. תפקיד
     חדש שרועי יוסיף ב-monday יופיע כאן מעצמו.
   ============================================================ */
export function RoleHolders({ say }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => api.getStudents(), []);
  const [patch, setPatch] = useState({});
  const [open, setOpen] = useState(null);   // התפקיד הפתוח לעריכה
  const [q, setQ] = useState("");
  const [busyRole, setBusyRole] = useState(null);

  if (busy && !data) return <Loading what="טוען תפקידים" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  /* ⚠ רשימת התפקידים נקראת מהלוח ולא מהקוד — תפקיד חדש יופיע
     כאן מעצמו. התיאור מגיע מ-roles-info לפי השם; תפקיד בלי
     תיאור מוצג בלי תיאור, ולא נעלם. */
  const roles = data.roles || [];
  const rolesOf = (s2) => (s2.id in patch ? patch[s2.id] : (s2.roles || []));
  const holders = (role) => data.students.filter((s2) => rolesOf(s2).includes(role));

  /* ⚠ אופטימי, כמו ברשימת הקניות: הסימון מוצג מיד והבקשה
     נשלחת ברקע. בכישלון חוזרים אחורה ואומרים. */
  const toggle = (s2, role) => {
    const cur = rolesOf(s2);
    const next = cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role];
    const before = cur;
    setPatch((p2) => ({ ...p2, [s2.id]: next }));
    setBusyRole(role);
    api.setRoles({ studentId: s2.id, roles: next })
      .catch((e) => {
        say(e.message);
        setPatch((p2) => ({ ...p2, [s2.id]: before }));
      })
      .finally(() => setBusyRole(null));
  };

  const list = data.students.filter((s2) => !q.trim() || s2.name.includes(q.trim()));

  return (
    <>
      {roles.map((role) => {
        const info = ROLE_INFO[role] || null;
        const h = holders(role);
        const isOpen = open === role;
        return (
          <div className={`card rl-card ${roleTone(role)}`} key={role}>
            <button className="rl-head" onClick={() => setOpen(isOpen ? null : role)}>
              <div className="tile">{roleIcon(role)}</div>
              <div className="rl-nm">
                <b>{role}</b>
                <span>{info ? info.who : "תפקיד"}</span>
              </div>
              <b className="rl-n">{h.length}</b>
              <MI.chev style={{ transform: isOpen ? "rotate(-90deg)" : "none",
                                color: "var(--line2)", flex: "0 0 auto" }} />
            </button>

            {/* ⚠ בעלי התפקיד מוצגים תמיד, גם כשסגור: זו השאלה
                הראשונה ששואלים על תפקיד. */}
            <div className="rl-who">
              {h.length
                ? h.map((s2) => <span className="rl-chip" key={s2.id}>{s2.name}</span>)
                : <span className="rl-none">לא הוגדר</span>}
            </div>

            {isOpen && (
              <div className="rl-body">
                {info && (
                  <>
                    <div className="rl-k">תיאור התפקיד</div>
                    <div className="rl-desc">{info.desc}</div>
                    <div className="rl-k">מה התפקיד פותח במערכת</div>
                    <ul className="rl-perms">
                      {info.perms.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </>
                )}

                <div className="rl-k">בחירת חניכים</div>
                <input className="search" value={q} placeholder="חיפוש חניך"
                  onChange={(e) => setQ(e.target.value)} />
                {/* ⚠ גלילה בתוך הכרטיס, כמו במובילי שבוע: 33
                    חניכים בלי גלילה הופכים כל תפקיד לדף שלם. */}
                <div className="rows rl-pick">
                  {list.map((s2) => {
                    const on = rolesOf(s2).includes(role);
                    return (
                      <button className="st-row" key={s2.id}
                        disabled={busyRole === role}
                        onClick={() => toggle(s2, role)}>
                        <div className={"tick" + (on ? " on" : "")}>
                          {on && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
                        </div>
                        <div className="st-main"><div className="st-n">{s2.name}</div></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", margin: "12px 0" }}
        onClick={() => {
          downloadTable({
            file: "בעלי-תפקידים",
            sheet: "בעלי תפקידים",
            title: "בעלי תפקידים — מכינת ניר עוז",
            header: ["תפקיד", "מי", "תיאור"],
            rows: roles.map((role) => [
              role,
              holders(role).map((s2) => s2.name).join(" · "),
              (ROLE_INFO[role] && ROLE_INFO[role].desc.replace(/\n+/g, " ")) || "",
            ]),
            widths: [18, 26, 70],
          });
          say("הקובץ ירד");
        }}><MI.dl />הורדה לאקסל</button>
      <div style={{ height: 20 }} />
    </>
  );
}

/* ⚠ גוון ואייקון לפי שם התפקיד. תפקיד חדש שיתווסף בלוח מקבל
   גוון מעצמו (אותו גיבוב כמו בשיבוצים) ואייקון ברירת מחדל. */
const roleTone = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return "tone-" + (h % 8 + 1);
};
const ROLE_ICON = {
  "אחראי לו״ז": <MI.cal />,
  "אחראי מטבח": <MI.box />,
  "אחראי מכולה": <MI.box />,
  "אב בית": <MI.tool />,
  "אחראי בטיחות": <MI.warn />,
};
const roleIcon = (name) => ROLE_ICON[name] || <MI.users />;

/* ============================================================
   טאב המכינה אצל הצוות — הכול במקום אחד
   ⚠ מנהל בלבד. תורן רואה את המטבח בלבד, והשרת אוכף את זה
     בכל נקודת קצה כאן.
   ============================================================ */
export function MechinaStaff({ say, sub0, onSub }) {
  /* ⚠ החניכים הם ברירת המחדל ולא הסימון היומי. המסך הזה נקרא
     פעם "נוכחות", והסימון פתח אותו — אבל מי שנכנס לכאן מחפש
     בדרך כלל חניך, לא את הטופס של היום. */
  const [sub, setSub] = useState(sub0 || "students");
  const [student, setStudent] = useState(null);

  /* ⚠ המסך מדווח החוצה על הלשונית, כדי שהתפריט יסמן את הדף
     שנמצאים בו. בלי זה המגירה לא ידעה שאנחנו כאן. */
  React.useEffect(() => { if (onSub) onSub(sub); }, [sub, onSub]);

  /* ⚠ מובילי שבוע ובעלי תפקידים עברו לדף נפרד — MechinaRolesPage. */
  const tabs = [
    ["students", "חניכים"],
    ["mark", "סימון יומי"],
    ["requests", "בקשות יציאה"],
  ];

  return (
    <>
      <div className="screen-title">חניכים</div>

      {!student && (
        <div className="seg">
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
          ? <StudentDetail student={student} say={say} onBack={() => setStudent(null)} />
          : <StudentsList onOpen={setStudent} say={say} />
      )}
      {sub === "requests" && <ManagerRequests say={say} />}
    </>
  );
}

/* ============================================================
   שיבוץ מובילי השבוע — 43 שבועות מקובץ הלו״ז
   ------------------------------------------------------------
   ⚠ מי שמשובץ לשבוע הנוכחי מקבל אוטומטית את הרשאת המוביל
     (סימון נוכחות, שיעורים) — לשבוע הזה בלבד. אין צורך לסמן
     ולבטל ידנית בכל החלפה.
   ============================================================ */
/* קלט תאריך בתוך פאנל השבוע — אותו מראה כמו .fld input, בלי העטיפה */
const weekDateInp = {
  flex: 1, minWidth: 0, minHeight: 42, background: "var(--surface)",
  border: "1px solid var(--line2)", borderRadius: 11, padding: "0 9px",
  outline: "none", fontSize: 14,
};

function WeekLeaders({ say }) {
  const [info, setInfo] = useState(false);
  useExcel();
  const td = testDate();
  const { data, err, busy, reload } = useLoad(() => api.getLeaderWeeks(td), [td]);
  const [open, setOpen] = useState(null); // weekId שנבחר לעריכה
  const [pick, setPick] = useState([]);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [past, setPast] = useState(false);
  const [dates, setDates] = useState({ start: "", end: "" });
  const [editDates, setEditDates] = useState(false);

  if (busy && !data) return <Loading what="טוען שיבוץ" />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  const shown = past ? data.weeks : data.weeks.filter((w) => w.end >= data.today || w.isCurrent);
  const hidden = data.weeks.length - shown.length;

  const openWeek = (w) => {
    setOpen(w.id);
    setPick(w.leaders.map((l) => l.id));
    setQ("");
    setDates({ start: w.start, end: w.end });
    setEditDates(false);
  };
  const toggle = (id) =>
    setPick((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 3) { say("עד שלושה מובילים לשבוע"); return p; }
      return [...p, id];
    });

  const save = (w) => {
    if (saving) return;
    setSaving(true);
    api.assignWeek({ weekId: w.id, studentIds: pick })
      .then(() => { say(`${w.name} — השיבוץ נשמר`); setOpen(null); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  const saveDates = (w) => {
    if (saving) return;
    if (!dates.start || !dates.end) { say("יש למלא את שני התאריכים"); return; }
    if (dates.end < dates.start) { say("תאריך הסיום לפני תאריך ההתחלה"); return; }
    setSaving(true);
    api.editWeek({ weekId: w.id, start: dates.start, end: dates.end })
      .then(() => { say(`${w.name} — התאריכים עודכנו`); setEditDates(false); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  const roster = data.roster.filter((s) => !q.trim() || s.name.includes(q.trim()));
  /* כמה פעמים החניך הוביל בשבועות אחרים — בלי השבוע הפתוח עכשיו */
  const ledElsewhere = (s, w) =>
    (data.leadCounts?.[s.id] || 0) - (w.leaderIds?.includes(s.id) ? 1 : 0);

  /* ⚠ שולח escort בלבד. ראו ההערה בשרת — שליחה משותפת עם
     המובילים הייתה מוחקת אותם בכל החלפת מלווה. */
  const saveEscort = (w, name) => {
    if (saving) return;
    setSaving(true);
    api.setWeekEscort({ weekId: w.id, escort: name })
      .then(() => { say(name ? `${name} מלווה את ${w.name}` : "המלווה הוסר"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  const exportWeeks = () => {
    downloadTable({
      file: "מובילי-שבוע",
      sheet: "מובילי שבוע",
      title: "שיבוץ מובילי שבוע — מכינת ניר עוז",
      header: ["שבוע", "מתאריך", "עד תאריך", "מה בשבוע", "מובילים", "מלווה", "פתוח לשיבוץ", "הערה"],
      rows: data.weeks.map((w) => [
        w.name, dmy(w.start), dmy(w.end), w.what || "",
        w.leaders.map((l) => l.name).join(" · "),
        w.escort || "", w.assignable ? "כן" : "לא (חג/סדרה)", w.note || "",
      ]),
      widths: [10, 12, 12, 16, 30, 14, 14, 24],
    });
    say("הקובץ ירד");
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
        onClick={exportWeeks}><MI.dl />הורדת השיבוץ לאקסל</button>

      {/* ---------- מהות התפקיד ----------
          ⚠ סגור כברירת מחדל. הטקסט ארוך ומי שנכנס לשבץ אינו
            רוצה לגלול אותו בכל פעם — אבל הוא צריך להיות זמין
            במקום שבו מדברים על התפקיד. */}
      <div className="card rl-card tone-2" style={{ marginBottom: 12 }}>
        <button className="rl-head" onClick={() => setInfo(!info)}>
          <div className="tile"><MI.users /></div>
          <div className="rl-nm">
            <b>{LEADER_INFO.title}</b>
            <span>מהות התפקיד ומשימותיו</span>
          </div>
          <MI.chev style={{ transform: info ? "rotate(-90deg)" : "none",
                            color: "var(--line2)", flex: "0 0 auto" }} />
        </button>
        {info && (
          <div className="rl-body">
            <div className="ld-info">{LEADER_INFO.purpose}</div>
            <div className="rl-k">משימות התפקיד</div>
            <ul className="ld-tasks">
              {LEADER_INFO.tasks.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>

      {hidden > 0 && !past && (
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
          onClick={() => setPast(true)}>הצגת {hidden} שבועות שעברו</button>
      )}

      <div className="rows">
        {shown.map((w) => (
          <div key={w.id} style={w.isCurrent ? { background: "#FDF6E7" } : undefined}>
            <button className="st-row" style={!w.assignable ? { opacity: 0.55 } : undefined}
              onClick={() => open === w.id ? setOpen(null) : openWeek(w)}>
              <div className="st-main">
                <div className="st-n">
                  {w.name}
                  {w.isCurrent && <span className="pill p-new" style={{ marginRight: 7 }}>השבוע</span>}
                </div>
                <div className="st-m">
                  <span className="num">{dm(w.start)}–{dm(w.end)}</span>
                  {w.what && w.what !== "רגיל" && <span>· {w.what}</span>}
                </div>
              </div>
              <div style={{ flex: "0 1 auto", minWidth: 0, textAlign: "left", fontSize: 12.5,
                            fontWeight: 700, color: w.leaders.length ? "var(--ink)" : "var(--faint)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {!w.assignable ? "ללא שיבוץ"
                  : w.leaders.length ? w.leaders.map((l) => l.name.split(" ")[0]).join(" · ") : "לא שובץ"}
                {/* ⚠ המלווה מוצג בשורה ולא רק בפתיחה: מי שסורק
                    את השנה רוצה לראות איזה שבוע עדיין בלי ליווי. */}
                {w.escort && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 2 }}>
                    מלווה: {w.escort}
                  </div>
                )}
              </div>
              <MI.chev style={{ transform: open === w.id ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
            </button>

            {open === w.id && (
              <div style={{ padding: "0 13px 13px", borderBottom: "1px solid var(--line)" }}>
                {/* ---------- מדריך מלווה ----------
                    ⚠ הרשימה נקראת מלוח המשתמשים לפי תפקיד
                      "מדריך" — מדריך חדש יופיע כאן בלי דיפלוי. */}
                {w.assignable && (data.guides || []).length > 0 && (
                  <div className="fld" style={{ marginTop: 10 }}>
                    <label>מדריך מלווה</label>
                    <div className="pick">
                      <button type="button" className={!w.escort ? "on" : ""} disabled={saving}
                        onClick={() => saveEscort(w, "")}>בלי</button>
                      {data.guides.map((g) => (
                        <button type="button" key={g.id} disabled={saving}
                          className={w.escort === g.name ? "on" : ""}
                          onClick={() => saveEscort(w, g.name)}>{g.name}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {editDates ? (
                    <>
                      <input type="date" style={weekDateInp}
                        value={dates.start}
                        onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} />
                      <span style={{ color: "var(--faint)" }}>עד</span>
                      <input type="date" style={weekDateInp}
                        value={dates.end}
                        onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} />
                      <button className="btn btn-primary btn-sm" disabled={saving}
                        onClick={() => saveDates(w)}>{saving ? "…" : "עדכון"}</button>
                    </>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ width: "100%" }}
                      onClick={() => setEditDates(true)}>עריכת תאריכי השבוע</button>
                  )}
                </div>

                {!w.assignable ? (
                  <div style={{ fontSize: 13, color: "var(--faint)", textAlign: "center", padding: "6px 0" }}>
                    {(w.what && w.what !== "רגיל") ? w.what : "חג / סדרה"} — השבוע אינו פתוח לשיבוץ
                  </div>
                ) : (
                  <>
                    <input className="search" style={{ marginBottom: 8 }} value={q} autoFocus
                      onChange={(e) => setQ(e.target.value)} placeholder="חיפוש חניך לשיבוץ" />
                    <div style={{ maxHeight: "34vh", overflowY: "auto",
                                  border: "1px solid var(--line)", borderRadius: 12 }}>
                      {roster.map((s) => {
                        const led = ledElsewhere(s, w);
                        return (
                          <button key={s.id} className="st-row" style={{ minHeight: 48, padding: "6px 12px" }}
                            onClick={() => toggle(s.id)}>
                            <div className={"tick" + (pick.includes(s.id) ? " on" : "")}>
                              {pick.includes(s.id) && <MI.check style={{ color: "#fff" }} />}
                            </div>
                            <div className="st-main"><div className="st-n" style={{ fontSize: 14 }}>{s.name}</div></div>
                            {led > 0 && (
                              <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 8px",
                                             borderRadius: 999, whiteSpace: "nowrap",
                                             background: led >= 2 ? "#B3541E" : "#EAE3D5",
                                             color: led >= 2 ? "#fff" : "#6B6254" }}>
                                {led >= 2 ? `הוביל ×${led}` : "הוביל פעם"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: "100%", marginTop: 9 }}
                      disabled={saving} onClick={() => save(w)}>
                      {saving ? "שומר…" : `שמירת השיבוץ (${pick.length})`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   תפקידים במכינה — דף עצמאי, נפרד לגמרי מהנוכחות
   ============================================================ */
export function MechinaRolesPage({ say, sub0 }) {
  const [sub, setSub] = useState(sub0 || "weeks");
  return (
    <>
      <div className="screen-title">תפקידים במכינה</div>
      <div className="seg">
        <button className={sub === "weeks" ? "on" : ""} onClick={() => setSub("weeks")}>מובילי שבוע</button>
        <button className={sub === "roles" ? "on" : ""} onClick={() => setSub("roles")}>בעלי תפקידים</button>
      </div>
      {sub === "weeks" && <WeekLeaders say={say} />}
      {sub === "roles" && <RoleHolders say={say} />}
    </>
  );
}

/* ============================================================
   השיבוצים שלי — הדף של החניך
   ------------------------------------------------------------
   מציג את מה שהמנהל שיבץ: ענף לכל סמסטר, ועדות, סדרות
   וקבוצות, והתפקידים האישיים מהמגירה של ההרשאות.

   ⚠ השרת מחזיר לחניך את השיבוצים שלו בלבד — הסינון שם,
     לא כאן.
   ============================================================ */
/* ---------- כרטיס שיבוץ אחד ----------
   ⚠ אותו כרטיס בכל מקום שהחניך רואה שיבוץ — מסך הבית ומסך
     השיבוצים. צבע לפי קטגוריה.

   ⚠ הסמסטר נכתב רק בוועדות, ורק כשהוא באמת חצי שנה: ענף
     וסדרה הם שנתיים ממילא, ו"לאורך כל השנה" על כל כרטיס הוא
     רעש ולא מידע. */
const PL_LOOK = {
  "ענף": { cls: "", eyebrow: "הענף שלי" },
  "ועדה": { cls: "pl-committee", eyebrow: "ועדה" },
  "סדרה": { cls: "pl-series", eyebrow: "צוות סדרה" },
  "קבוצה": { cls: "pl-group", eyebrow: "קבוצה" },
};

function PlacementTile({ m, onClick }) {
  const look = PL_LOOK[m.def.category] || PL_LOOK["ענף"];
  const semester = m.def.category === "ועדה" && m.semester !== "שנתי" ? m.semester : null;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={("pl-lead " + look.cls).trim()} onClick={onClick || undefined}>
      <div className="pl-lead-k">{look.eyebrow}</div>
      <div className="pl-lead-n">{m.def.name}</div>
      {m.def.hours && <div className="pl-lead-h num">{m.def.hours}</div>}
      {semester && <div className="pl-lead-s">{semester}</div>}
    </Tag>
  );
}

function MyPlacements({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getPlacements(), []);

  if (busy && !data) return <Loading what="טוען את השיבוצים" />;
  if (err && err.setupRequired) return (
    <>
      <div className="screen-title">השיבוצים שלי</div>
      <div className="attn-calm">
        <b>השיבוצים עוד לא פתוחים</b>
        <span>כשהצוות יגדיר אותם — הם יופיעו כאן</span>
      </div>
    </>
  );
  if (err) return <LoadFail msg={err.message || String(err)} onRetry={reload} />;
  if (!data) return null;

  const defs = Object.fromEntries((data.definitions || []).map((d) => [d.id, d]));
  const mine = (data.mine || [])
    .map((m) => ({ ...m, def: defs[m.placement] }))
    .filter((m) => m.def);

  /* סדר הצגה: ענף, ועדות, סדרות, קבוצות */
  const ORDER = ["ענף", "ועדה", "סדרה", "קבוצה"];
  const sorted = [...mine].sort((a, b) =>
    ORDER.indexOf(a.def.category) - ORDER.indexOf(b.def.category)
    || a.def.name.localeCompare(b.def.name, "he"));

  return (
    <>
      <div className="screen-title">השיבוצים שלי</div>

      {sorted.length === 0 ? (
        <div className="attn-calm">
          <b>עוד לא שובצת</b>
          <span>כשהצוות ישבץ — הכול יופיע כאן</span>
        </div>
      ) : (
        <div className="pl-stack">
          {sorted.map((m) => <PlacementTile key={m.id} m={m} />)}
        </div>
      )}
    </>
  );
}

/* ============================================================
   מסך הבית של החניך
   ------------------------------------------------------------
   אותה שפה של מסך הבית של המנהל: פתיח עם תמונה, ארבעה
   מספרים, "דורש טיפול", וניווט.

   ⚠ "דורש טיפול" נבנה רק ממה שנטען בפועל. תחום שנפל פשוט לא
     תורם שורה, ואינו מציג שגיאה על מסך הבית — הנתונים
     המלאים ממילא נמצאים במסך הייעודי שלו.
   ============================================================ */
const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const longDate = (d = new Date()) =>
  DAYS_HE[d.getDay()] + ", " + d.getDate() + " ב" + MONTHS_HE[d.getMonth()];

function StudentDash({ auth, year, reqs, unseen, go, say }) {
  const [profile, setProfile] = useState(null);
  const [faults, setFaults] = useState(null);
  const [ratable, setRatable] = useState(null);
  const [places, setPlaces] = useState(null);
  const [gantt, setGantt] = useState(null);

  useEffect(() => {
    let live = true;
    api.getProfile().then((r) => { if (live) setProfile(r); }).catch(() => {});
    api.getPlacements()
      .then((r) => {
        if (!live) return;
        const defs = Object.fromEntries((r.definitions || []).map((d) => [d.id, d]));
        setPlaces((r.mine || []).map((m) => ({ ...m, def: defs[m.placement] })).filter((m) => m.def));
      })
      .catch(() => { if (live) setPlaces([]); });
    api.getFaults()
      .then((r) => { if (live) setFaults((r.faults || []).filter((x) => x.status !== "טופלה").length); })
      .catch(() => {});
    api.getRatable()
      .then((r) => { if (live) setRatable((r.meetings || []).filter((m) => !m.rated).length); })
      .catch(() => {});
    api.getGantt()
      .then((r) => { if (live) setGantt(r.events || []); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 5) return "לילה טוב";
    if (h < 12) return "בוקר טוב";
    if (h < 17) return "צהריים טובים";
    if (h < 21) return "ערב טוב";
    return "לילה טוב";
  };

  const first = String(auth.name || "").trim().split(/\s+/)[0];
  const sum = year.data && year.data.summary;
  const quotaLeft = sum ? sum.quota.reduce((a, q) => a + q.left, 0) : null;
  const quotaTotal = sum ? sum.quota.reduce((a, q) => a + q.total, 0) : null;
  const pending = reqs.data ? reqs.data.requests.filter((r) => r.status === "ממתין").length : null;

  /* ---------- דורש טיפול ---------- */
  const attn = [];
  if (ratable > 0) {
    attn.push({ key: "rate", cls: "amber",
      t: ratable === 1 ? "שיעור אחד ממתין לדירוג שלך" : `${ratable} שיעורים ממתינים לדירוג שלך`,
      s: "הדירוג נכנס לחוות הדעת על המרצה", go: null });
  }
  if (unseen > 0) {
    attn.push({ key: "dec", cls: "amber",
      t: unseen === 1 ? "בקשה שלך הוכרעה" : `${unseen} בקשות שלך הוכרעו`,
      s: "לחצו לצפייה", go: () => go("requests") });
  }
  if (profile && !profile.army && !profile.tryouts) {
    attn.push({ key: "prof", cls: "",
      t: "הפרופיל שלך עדיין ריק",
      s: "שיבוץ צבאי ומיונים — כדי שהצוות יידע איפה אתה עומד", go: () => go("profile") });
  }
  const nextTalk = profile && (profile.talks || []).filter(Boolean).sort()
    .find((d) => d >= (testDate() || new Date().toISOString().slice(0, 10)));
  if (nextTalk) {
    attn.push({ key: "talk", cls: "",
      t: "שיחה אישית קרובה", s: dmy(nextTalk), go: () => go("profile") });
  }

  /* ---------- השיבוצים ----------
     ⚠ הענף פותח את המסך ולא מספרי הנוכחות: זה מה שהחניך צריך
       לדעת בבוקר. הנוכחות, החופש והבקשות יורדים למטה. */
  const todayIso = testDate() || new Date().toISOString().slice(0, 10);
  const upcoming = (gantt || [])
    .filter((e) => e.end >= todayIso && e.type !== "שבת")
    .slice(0, 5);

  /* ⚠ אותו טיפול בדיוק כמו במסך המנהל: גוון לכל תחום ואייקון
     בתוך אריח. הגוון הוא של התחום ולא של המצב — אדום וירוק
     שמורים למספר עצמו כשמשהו דורש טיפול. */
  const tiles = [
    { key: "vac", tone: "tone-1", ico: <MI.cal />, go: () => go("year"),
      cls: quotaLeft === 0 ? "warn" : "good",
      v: quotaLeft == null ? "…" : quotaLeft, l: "ימי חופש שנותרו",
      s: quotaTotal ? `מתוך ${quotaTotal} בשנה` : "טוען" },
    { key: "req", tone: "tone-2", ico: <MI.note />, go: () => go("requests"),
      cls: pending ? "warn" : "good",
      v: pending == null ? "…" : pending, l: "בקשות ממתינות",
      s: pending ? "ממתינות להחלטה" : "אין ממתינות" },
    { key: "fault", tone: "tone-8", ico: <MI.tool />, go: () => go("report"),
      cls: faults ? "" : "good",
      v: faults == null ? "…" : faults, l: "תקלות שדיווחת",
      s: faults ? "עדיין פתוחות" : "אין פתוחות" },
    { key: "att", tone: "tone-7", ico: <MI.check />, go: () => go("year"), cls: "good",
      v: sum ? sum.present : "…", l: "ימים שנכחת",
      s: sum ? `מתוך ${sum.schoolDays} שסומנו` : "טוען" },
  ];

  const nav = [
    { key: "n-year", tone: "tone-1", l: "הנוכחות שלי", icon: <MI.cal />, go: () => go("year") },
    { key: "n-req", tone: "tone-2", l: "בקשות יציאה", icon: <MI.note />, go: () => go("requests"), badge: unseen },
    { key: "n-prof", tone: "tone-5", l: "הפרופיל שלי", icon: <MI.users />, go: () => go("profile") },
    { key: "n-place", tone: "tone-4", l: "השיבוצים שלי", icon: <MI.users />, go: () => go("placements") },
    { key: "n-agenda", tone: "tone-6", l: "הלו״ז שלי", icon: <MI.cal />, go: () => go("agenda") },
    { key: "n-gantt", tone: "tone-7", l: "גאנט שנתי", icon: <MI.cal />, go: () => go("gantt") },
    /* ⚠ התפריט פתוח לכולם — מה אוכלים היום ומה יש במנה זה
       מידע שכל המכינה רוצה, ובמיוחד מי שיש לו אלרגיה. */
    { key: "n-menu", tone: "tone-3", l: "תפריט ארוחות", icon: <MI.book />, go: () => go("menu") },
    { key: "n-report", tone: "tone-8", l: "דיווח תקלה", icon: <MI.tool />, go: () => go("report") },
    { key: "n-new", tone: "tone-3", l: "בקשת יציאה חדשה", icon: <MI.plus />, go: () => go("new") },
  ];

  return (
    <>
      <div className="hero2">
        <img src="/photos/student.jpg" alt="חניכי המכינה" />
        <div className="h2-veil" />
        <div className="h2-cap">מכינת ניר עוז · מחזור ב׳</div>
        <div className="h2-txt">
          <div className="h2-greet">{greet()}{first ? `, ${first}` : ""}</div>
          <div className="h2-date">{longDate(new Date())}</div>
        </div>
      </div>

      {year.err && <LoadFail msg={year.err} onRetry={year.reload} />}

      <TodayAgenda onOpen={() => go("agenda")} />

      {/* ============================================================
          לוח השיעורים — לאחראי הלו״ז
          ------------------------------------------------------------
          ⚠ אותו רכיב בדיוק שיושב במסך הבית של המנהל. אחראי
            הלו״ז נכנס למסך הבית כדי לדעת מה עליו היום, ומה
            שטרם דווח נשכח בדיוק כשלא רואים אותו.
          ============================================================ */}
      {auth.isScheduler && (
        <>
          <div className="sec-label">לוח השיעורים</div>
          <LessonsBoard compact onOpenSheet={() => go("lessons")} />
          <div style={{ height: 6 }} />
        </>
      )}

      {/* ---------- השיבוצים שלי — ראש המסך ----------
          ⚠ אותם כרטיסים בדיוק כמו במסך השיבוצים. */}
      {places && places.length > 0 && (
        <div className="pl-stack" style={{ marginBottom: 16 }}>
          {[...places]
            .sort((a, b) =>
              ["ענף", "ועדה", "סדרה", "קבוצה"].indexOf(a.def.category)
              - ["ענף", "ועדה", "סדרה", "קבוצה"].indexOf(b.def.category)
              || a.def.name.localeCompare(b.def.name, "he"))
            .map((m) => (
              <PlacementTile key={m.id} m={m} onClick={() => go("placements")} />
            ))}
        </div>
      )}

      {places && places.length === 0 && (
        <div className="attn-calm" style={{ marginBottom: 14 }}>
          <b>עוד לא שובצת</b>
          <span>כשהצוות ישבץ אותך — הענף והוועדות יופיעו כאן</span>
        </div>
      )}

      {/* ---------- מה קרוב בלו״ז ----------
          ⚠ רק מה שעוד לא הסתיים, ובלי שבתות: החניך רוצה לדעת
            מה בא, לא לקרוא את כל השנה. */}
      {upcoming.length > 0 && (
        <>
          <div className="sec-label">מה קרוב</div>
          <div className="gantt-strip">
            {upcoming.map((e) => (
              <button key={e.id} className={"gantt-chip" + (e.start <= todayIso ? " now" : "")}
                onClick={() => go("gantt")}>
                {e.start <= todayIso ? `עכשיו · ${e.name}` : `${dm(e.start)} · ${e.name}`}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ---------- רצועת הסיכום ----------
          ⚠ שלושת המספרים שהחניך שואל עליהם באמת — כמה נכחתי,
            כמה חופש נשאר, כמה מהשנה עברה — על כהה ובמקום אחד,
            לפני שיורדים לפירוט. */}
      {sum && (
        <div className="band">
          <div className="band-h">התמונה שלי בשנה</div>
          <div className="band-grid">
            {/* ⚠ אחוז מוצג רק כשיש מספיק ימים מאחוריו. בתחילת
                שנה, כשסומן יום אחד, "0% נוכחות" הוא מספר נכון
                חשבונית ושקרי במשמעותו — והוא הדבר הראשון
                שהחניך רואה על עצמו. עד חמישה ימים מוצגת
                השבירה עצמה. */}
            <div className="band-c">
              <div className="band-n">
                {sum.schoolDays >= 5
                  ? Math.round((sum.present / sum.schoolDays) * 100) + "%"
                  : `${sum.present}/${sum.schoolDays}`}
              </div>
              <div className="band-l">נוכחות</div>
            </div>
            <div className="band-c">
              <div className={"band-n" + (quotaLeft === 0 ? " warn" : quotaLeft > 0 ? " ok" : "")}>
                {quotaLeft == null ? "—" : quotaLeft}
              </div>
              <div className="band-l">ימי חופש שנותרו</div>
            </div>
            <div className="band-c">
              <div className="band-n">{sum.schoolDays}</div>
              <div className="band-l">ימים שסומנו עד היום</div>
            </div>
          </div>
        </div>
      )}

      <div className="sec-label">המצב שלי</div>
      <div className="stat-grid">
        {tiles.map((t) => (
          <button key={t.key} className={`stat-tile ${t.cls} ${t.tone || ""}`} onClick={t.go}>
            <span className="tile sm">{t.ico}</span>
            <span className="sv num">{t.v}</span>
            <span className="sl">{t.l}</span>
            <span className="ss">{t.s}</span>
          </button>
        ))}
      </div>

      {attn.length > 0 ? (
        <>
          <div className="sec-label">דורש טיפול</div>
          <div className="attn">
            {attn.map((a) => (
              <button key={a.key} className={"attn-row " + a.cls} onClick={a.go || undefined}>
                <div style={{ flex: 1 }}>
                  <div className="attn-t">{a.t}</div>
                  {a.s && <div className="attn-s">{a.s}</div>}
                </div>
                {a.go && <MI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="attn-calm">
          <b>הכול מסודר</b>
          <span>אין דבר שממתין לך</span>
        </div>
      )}

      <RateLessons say={say} />

      {reqs.data && reqs.data.requests.length > 0 && (
        <>
          <div className="sec-label">הבקשות האחרונות שלי</div>
          {reqs.data.requests.slice(0, 3).map((r) => <RequestCard key={r.id} r={r} />)}
        </>
      )}

      <div className="sec-label">הכול</div>
      <div className="navgrid">
        {nav.map((t) => (
          <button key={t.key} className={"nav-tile " + (t.tone || "")} onClick={t.go}>
            <span className="nav-ico">{t.icon}</span>
            <b>{t.l}</b>
            {t.badge > 0 && <span className="nav-badge num">{t.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ height: 30 }} />
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

  /* ---------- פעמון: בקשות שהוכרעו וטרם נראו ----------
     "נראה" נשמר מקומית בדפדפן — זה חיווי נוחות, לא רישום. */
  const seenKey = "mk_seen_dec_" + (auth.name || "");
  const decided = (reqs.data ? reqs.data.requests : []).filter((r) => r.status !== "ממתין");
  let seenIds;
  try { seenIds = new Set(JSON.parse(localStorage.getItem(seenKey) || "[]")); }
  catch { seenIds = new Set(); }
  const unseen = decided.filter((r) => !seenIds.has(r.id)).length;

  const [notifOpen, setNotifOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /* ⚠ אותו מנגנון של המנהל. חניך בעל תפקיד מקבל בדיוק את
     ההתראות של התפקיד שלו — ראו api/_notify.js. */
  const notify = useNotify(true);

  /* ⚠ `unseen` נשאר לתג שעל "בקשות יציאה" בתפריט ובאריח
     במסך הבית — הוא נספר מ-localStorage ולא מהשרת, כי הוא
     אומר "אתה עוד לא פתחת את זה" ולא "יש כאן משהו".
     ההתראות עצמן עברו ל-useNotify. */

  /* רענון תקופתי — כדי שהחלטה שהתקבלה תופיע בלי לצאת ולהיכנס */
  useEffect(() => {
    const t = setInterval(() => reqs.reload(), 90_000);
    return () => clearInterval(t);
  }, [reqs.reload]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="kx">
      <header className="top">
        <div className="top-row">
          <Hamburger onClick={() => setDrawerOpen(true)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>{(() => {
              const h = new Date().getHours();
              const g = h < 5 ? "לילה טוב" : h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 21 ? "ערב טוב" : "לילה טוב";
              return g + ", " + String(auth.name || "").split(" ")[0];
            })()}</h1>
            <div className="sub">מכינת ניר עוז · מחזור ב׳</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <NotifyBell notify={notify} open={notifOpen}
              onToggle={() => setNotifOpen((v) => !v)} />
            <button className="who" onClick={signOut}>
              <span className="dot" />יציאה
            </button>
          </div>
        </div>
      </header>

      {/* המגירה — כל הדפים של החניך, כולל מה שתפקידיו פותחים */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        logo="/logo-mark.png" title="מכינת ניר עוז" subtitle="מחזור ב׳"
        user={{
          name: auth.name,
          role: [auth.isLeader && "מוביל/ת שבוע", ...(auth.roles || [])]
            .filter(Boolean).join(" · ") || "חניך/ה",
        }}
        onLogout={signOut}
        groups={[
          { label: "אישי", items: [
            { key: "home", label: "בית", icon: <MI.home />, active: tab === "home", onClick: () => setTab("home") },
            { key: "year", label: "הנוכחות שלי", icon: <MI.cal />, active: tab === "year", onClick: () => setTab("year") },
            { key: "requests", label: "בקשות יציאה", icon: <MI.note />, badge: unseen,
              active: tab === "requests", onClick: () => setTab("requests") },
            { key: "profile", label: "הפרופיל שלי", icon: <MI.users />, active: tab === "profile", onClick: () => setTab("profile") },
            { key: "placements", label: "השיבוצים שלי", icon: <MI.users />, active: tab === "placements", onClick: () => setTab("placements") },
            { key: "menu", label: "תפריט ארוחות", icon: <MI.book />, active: tab === "menu", onClick: () => setTab("menu") },
            { key: "report", label: "דיווח תקלה", icon: <MI.tool />, active: tab === "report", onClick: () => setTab("report") },
            { key: "agenda", label: "הלו״ז שלי", icon: <MI.cal />, active: tab === "agenda", onClick: () => setTab("agenda") },
            { key: "gantt", label: "גאנט שנתי", icon: <MI.cal />, active: tab === "gantt", onClick: () => setTab("gantt") },
          ] },
          ...(auth.isLeader || auth.isScheduler || auth.isContainer || auth.isSafety || auth.isHouse || auth.isKitchen ? [{
            label: "תפקידים", items: [
              ...(auth.isLeader ? [{ key: "mark", label: "סימון נוכחות", icon: <MI.tick />,
                active: tab === "mark", onClick: () => setTab("mark") }] : []),
              ...(auth.isScheduler || auth.isLeader ? [{ key: "lessons", label: "שיעורים במכינה", icon: <MI.book />,
                active: tab === "lessons", onClick: () => setTab("lessons") }] : []),
              /* ⚠ אותם מסכים בדיוק כמו אצל המנהל, ובאותו סדר.
                 חניך שנושא תפקיד עושה את אותה עבודה, ומסך
                 מקוצץ רק גורם לו לבקש מהמנהל לעשות בשבילו
                 את מה שהתפקיד שלו. ההרשאה נאכפת בשרת ממילא. */
              ...(auth.isContainer ? [
                { key: "container", label: "מכולה", icon: <MI.box />,
                  active: tab === "container", onClick: () => setTab("container") },
                { key: "loans", label: "השאלת ציוד", icon: <MI.box />,
                  active: tab === "loans", onClick: () => setTab("loans") },
              ] : []),
              ...(auth.isSafety ? [
                { key: "safety", label: "אירועי בטיחות", icon: <MI.note />,
                  active: tab === "safety", onClick: () => setTab("safety") },
                { key: "hosting", label: "אירוח קבוצות", icon: <MI.home />,
                  active: tab === "hosting", onClick: () => setTab("hosting") },
              ] : []),
              ...(auth.isHouse ? [
                { key: "faults", label: "תקלות ובעיות", icon: <MI.box />,
                  active: tab === "faults", onClick: () => setTab("faults") },
                /* ⚠ ציוד הניקיון הוא של אב הבית ולא של אחראי
                   המכולה. השרת אוכף לפי תחום — ראו mayArea. */
                { key: "cleaning", label: "ציוד ניקיון", icon: <MI.box />,
                  active: tab === "cleaning", onClick: () => setTab("cleaning") },
              ] : []),
              /* ⚠ הקוד המשותף לתורנים נגנז; אחראי המטבח הוא
                 הדרך שבה חניך מגיע למסכי המטבח. */
              ...(auth.isKitchen ? [
                /* ⚠ פריט אחד ולא שניים, בדיוק כמו אצל המנהל.
                   אוכל וחד״פ חולקים לוח אחד ורשימת קניות אחת,
                   וההפרדה למסכים אילצה לעבור ביניהם באמצע
                   ספירת מלאי. */
                { key: "k-all", label: "אוכל וחד״פ", icon: <MI.box />,
                  active: tab === "k-all", onClick: () => setTab("k-all") },
                { key: "budget", label: "תקציב המטבח", icon: <MI.tick />,
                  active: tab === "budget", onClick: () => setTab("budget") },
              ] : []),
            ],
          }] : []),
        ]} />

      {/* תצוגה מקדימה של ההתראות — הבקשות שהוכרעו */}
      {notifOpen && (
        <NotifyPanel notify={notify} onClose={() => setNotifOpen(false)}
          onGo={(t) => setTab(t)} />
      )}

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
          <StudentDash auth={auth} year={year} reqs={reqs} unseen={unseen}
            go={setTab} say={say} />
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
        {tab === "placements" && <MyPlacements say={say} />}

        {tab === "profile" && (
          <>
            <div className="screen-title">הפרופיל שלי</div>
            <ProfileCard studentId={null} say={say} />
          </>
        )}

        {tab === "menu" && <MenuPage say={say} />}
        {tab === "report" && <FaultReportPage say={say} />}

        {tab === "agenda" && <AgendaPage />}

        {tab === "gantt" && <GanttPage say={say} />}

        {/* ⚠ area={null} — התצוגה המאוחדת, אותה אחת של המנהל. */}
        {tab === "k-all" && auth.isKitchen && <KitchenPage say={say} area={null} />}
        {tab === "budget" && auth.isKitchen && <BudgetPage say={say} />}

        {tab === "container" && auth.isContainer && <ContainerPage say={say} area="מכולה" />}
        {tab === "cleaning" && auth.isHouse && <ContainerPage say={say} area="ניקיון" />}
        {tab === "loans" && auth.isContainer && <LoansPage say={say} />}
        {tab === "safety" && auth.isSafety && <SafetyPage say={say} />}
        {tab === "hosting" && auth.isSafety && <HostingPage say={say} />}
        {tab === "faults" && auth.isHouse && <FaultsPage say={say} />}

        {tab === "mark" && auth.isLeader && <MarkDay say={say} />}

        {/* ⚠ אחראי לו״ז בלבד. השרת אוכף בכל נקודת קצה של השיעורים,
            והתפקיד נקרא טרי מהלוח — הסרתו סוגרת את הטאב מיד. */}
        {tab === "lessons" && (auth.isScheduler || auth.isLeader) && <LessonsPage say={say} />}

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

      {/* הסרגל התחתון הוסר — הניווט במגירת שלושת הקווים */}

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
