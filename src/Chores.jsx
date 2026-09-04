/* ============================================================
   תורניות
   ------------------------------------------------------------
   מסך אחד, ארבעה קהלים:
     · אב הבית (וראש המכינה) — משבץ, עורך גזרות, מתקן ספירות
     · אחראי המטבח — רואה הכול, עורך את התורנות היומית והצ׳ק ליסט
     · תורן היום — מסמן את הצ׳ק ליסט
     · כל חניך — רואה איפה הוא משובץ ואת טבלת המעקב של כולם

   ⚠⚠ **אדום בטבלה אינו "בעיה" אלא "תורו".** בכל שאר המערכת
     אדום הוא חוסר או חריגה; כאן הוא אומר שהחניך עשה **פחות**
     מהממוצע ולכן הוא המועמד הבא. זה הפוך לאינטואיציה, ולכן
     המקרא אומר את זה במילים ולא רק בצבע.

   ⚠ **טבלת המעקב גלויה לכל החניכים**, בבקשה מפורשת של המכינה.
     זו גם התשובה ל"תמיד אני": מי שרואה את המספרים של כולם
     יכול לבדוק בעצמו.

   ⚠ **ואין כאן שום שדה שאומר מי ביצע מה בפועל** — רק כמה
     פעמים כל אחד **שובץ**. עיקרון 5 לא זז.
   ============================================================ */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "./api.js";
import TextBlock from "./TextBlock.jsx";
import ScrollTabs from "./Tabs.jsx";
import { KIND, SAME_SECTOR_WARN,
  fridayAfterTuesday, dowOf, TUESDAY,
} from "../shared/chores.js";

const CI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  users: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6"/><path d="M17 8.5a3 3 0 0 0 0-1M18 14.6c2 .7 3.5 2.4 3.5 5.4"/></svg>,
  grid: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  list: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>,
  cog: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6 1.6 1.6 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>,
  warn: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  bulb: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 18h6M10 22h4"/><path d="M12 2a6 6 0 0 0-3.5 10.9c.5.4.8 1 .9 1.6l.1.5h5l.1-.5c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 2z"/></svg>,
  crown: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z"/></svg>,
};

const dmy = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");
const dmyFull = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

/* ============================================================
   טבלת מעקב
   ------------------------------------------------------------
   ⚠ **`hasData` הוא מה שמפריד בין טבלה לבין הצהרה.** בתחילת
     שנה כל הספירות אפס והממוצע אפס — כלומר כולם בדיוק בממוצע.
     טבלה צהובה שלמה נראית כמו מסקנה; המשפט מעליה אומר שאין
     עדיין מה להשוות (אותו כלל כמו אחוז נוכחות מחמישה ימים).
   ============================================================ */
function Tally({ rows, compact }) {
  if (!rows.length) return null;
  return (
    <div className={"ch-tally" + (compact ? " compact" : "")}>
      {rows.map((t) => (
        <div className="ch-tally-s" key={t.sector}>
          <div className="ch-tally-h">
            <b>{t.name}</b>
            <span>
              {t.hasData ? `ממוצע ${t.avg}` : "טרם שובץ אף אחד"}
            </span>
          </div>
          {!t.hasData ? (
            <div className="ch-tally-none">
              אין עדיין מה להשוות — הצבעים יופיעו אחרי הסבב הראשון.
            </div>
          ) : (
            <div className="ch-cells">
              {t.per.map((p) => (
                <div className={"ch-cell t-" + p.tone} key={p.id} title={p.name}>
                  <b>{p.count}</b>
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {/* ⚠ המקרא במילים, כי הצבע כאן הפוך לאינטואיציה.
          ⚠ ובגרסה הדחוסה הוא מושמט: הוא כבר מופיע בלשונית
            המעקב, ושכפול שלו בכל אחת מחמש הגזרות הופך אותו
            לרעש שמפסיקים לקרוא. */}
      {!compact && <div className="ch-key">
        <i><b className="ch-dot t-over" />מעל הממוצע</i>
        <i><b className="ch-dot t-near" />בערך בממוצע</i>
        <i><b className="ch-dot t-under" />הרבה מתחת — <b className="ch-key-em">תורו הבא</b></i>
      </div>}
    </div>
  );
}

/* ============================================================
   בורר חניכים לגזרה
   ============================================================ */
function Picker({ students, leaders, picked, onToggle, cap, busy }) {
  const [q, setQ] = useState("");
  const lead = new Set((leaders || []).map(String));
  const list = students.filter((s) => !q.trim() || s.name.includes(q.trim()));
  const over = Number.isFinite(cap) && picked.length > cap;

  return (
    <>
      {Number.isFinite(cap) && (
        <div className={"ch-cap" + (over ? " over" : "")}>
          {picked.length} מתוך {cap}{over ? " — מעל המכסה" : ""}
        </div>
      )}
      <input className="search" value={q} placeholder="חיפוש חניך"
        onChange={(e) => setQ(e.target.value)} />
      <div className="rows ch-pick">
        {list.map((s) => {
          const isLead = lead.has(String(s.id));
          const on = picked.includes(s.id);
          return (
            <button className="st-row" key={s.id} disabled={busy || isLead}
              onClick={() => onToggle(s.id)}>
              <div className={"tick" + (on ? " on" : "")}>
                {on && <CI.check style={{ color: "#fff" }} />}
              </div>
              <div className="st-main"><div className="st-n">{s.name}</div></div>
              {/* ⚠ **מסומן ולא מוסתר.** חניך שלא יראה את עצמו
                  ברשימה יחשוב שנשכח, ולא שהוא פטור. */}
              {isLead && <span className="pill ch-lead"><CI.crown />מוביל השבוע</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ============================================================
   ניווט בין שבועות
   ------------------------------------------------------------
   ⚠ **שני שבועות על המסך, וכל השנה בהישג יד.** ברירת המחדל
     היא ההווה — זה מה שאב הבית עושה ביום שני בבוקר. אבל תכנון
     לטווח ארוך ובדיקה של מה שהיה דורשים לדפדף, ולכן החצים
     עוברים שבוע-שבוע וכפתור "היום" מחזיר.

   ⚠ **החץ מושבת ולא מוסתר בקצוות** — כפתור שנעלם מזיז את
     הכותרת בכל דפדוף, וזה נראה כמו קפיצה.

   ⚠ **וכפתור "היום" מוצג רק כשלא שם.** כפתור שלא עושה כלום
     מלמד להתעלם ממנו.
   ============================================================ */
function WeekNav({ d, onGo }) {
  const list = d.weeks || [];
  const at = list.findIndex((w) => w.id === d.weekAt);
  const go = (n) => { const w = list[at + n]; if (w) onGo(w.id); };
  const nowId = (list.find((w) => w.now) || {}).id;

  return (
    <div className="ch-wnav">
      <button className="mv-nav" disabled={at <= 0} aria-label="שבוע קודם"
        onClick={() => go(-1)}>
        <CI.chev style={{ transform: "rotate(180deg)" }} />
      </button>
      <div className="ch-wnav-m">
        {d.periods.length
          ? <b>{d.periods.map((p) => "שבוע " + p.num).join(" · ")}</b>
          : <b>אין שבוע</b>}
        <span>
          {d.periods[0] ? dmy(d.periods[0].start) : ""}
          {d.periods.length > 1 ? " – " + dmy(d.periods[d.periods.length - 1].end) : ""}
          {d.atNow ? " · השבוע" : ""}
        </span>
      </div>
      <button className="mv-nav" disabled={at < 0 || at >= list.length - 1} aria-label="שבוע הבא"
        onClick={() => go(1)}>
        <CI.chev />
      </button>
      {!d.atNow && nowId && (
        <button className="btn btn-ghost btn-sm ch-now" onClick={() => onGo(nowId)}>היום</button>
      )}
    </div>
  );
}

/* ============================================================
   לשונית הגזרות
   ============================================================ */
function Sectors({ d, say, reload, goWeek }) {
  const [pi, setPi] = useState(0);
  const [open, setOpen] = useState(null);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  const p = d.periods[pi];
  if (!p) return <div className="empty"><b>אין תקופות לשבץ אליהן</b></div>;

  const start = (s) => {
    setOpen(s.id);
    setPicked(s.members.map((m) => m.id));
  };
  const save = (s) => {
    if (busy) return;
    setBusy(true);
    api.assignChore({ sector: s.id, week: p.id, students: picked })
      .then((r) => {
        setOpen(null);
        (r.warnings || []).forEach(say);
        say(`נשמר — ${r.total} משובצים`);
        reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const sugg = d.admin ? d.admin.suggest : {};

  return (
    <>
      {/* ⚠ התקופה היא שבוע הובלה ולא שבוע קלנדרי — כשקדנציה
          מתחלפת, מתחלפות גם התורניות. */}
      <WeekNav d={d} onGo={(id) => { setPi(0); setOpen(null); goWeek(id); }} />
      {d.periods.length > 1 && (
        <div className="seg ch-seg">
          {d.periods.map((x, i) => (
            <button key={x.id} className={pi === i ? "on" : ""} onClick={() => { setPi(i); setOpen(null); }}>
              שבוע {x.num}
              <i className="seg-n">{dmy(x.start)}</i>
            </button>
          ))}
        </div>
      )}

      {p.leaderNames.length > 0 && (
        <div className="ch-leadbar">
          <CI.crown />
          מובילי השבוע — <b>{p.leaderNames.join(" · ")}</b> — פטורים מתורנות ואי אפשר לשבץ אותם.
        </div>
      )}

      {d.sectors.filter((s) => s.kind === KIND.evening && !s.archived).map((s) => {
        const live = p.sectors.find((x) => x.id === s.id) || { members: [] };
        const isOpen = open === s.id;
        const hint = sugg[s.id];
        return (
          <div className="ch-sec card" key={s.id}>
            <button className="ch-sec-h" onClick={() => (isOpen ? setOpen(null) : start(live))}>
              <div className="ch-sec-n">
                <b>{s.name}</b>
                <span>{live.members.length ? live.members.map((m) => m.name).join(" · ") : "טרם שובץ"}</span>
              </div>
              <b className="ch-sec-c">{live.members.length}</b>
              <CI.chev style={{ transform: isOpen ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
            </button>

            {s.detail && <div className="ch-detail">{s.detail}</div>}

            {/* ============================================================
                ⚠ **ההמלצה היא הצעה ולא בחירה.** אב הבית יודע דברים
                  שהמערכת אינה יודעת — מי חולה, מי במיונים, מי כבר
                  עשה טובה. הניסוח שואל ולא קובע, ושתי הרמות
                  מנוסחות אחרת: "מומלץ" מול "הכי מאחור".
                ============================================================ */}
            {d.me.assign && hint && hint.list.length > 0 && (
              <div className={"ch-sugg" + (hint.strong ? " strong" : "")}>
                <CI.bulb />
                <div>
                  {hint.strong ? "שווה לשקול: " : "הכי מאחור כרגע: "}
                  {hint.list.map((x) => (
                    <b key={x.id}>{x.name} <span>({x.count})</span></b>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================
                ⚠ **טבלת הגזרה בתוך הגזרה, ולא רק בלשונית נפרדת.**
                  אב הבית בוחר **כאן**, ומספרים שיושבים בלשונית
                  אחרת דורשים ממנו לזכור אותם בעל פה בזמן שהוא
                  מסמן שמות. זו בדיוק הנקודה שבה הוא יפסיק
                  להסתכל עליהם.
                ============================================================ */}
            {isOpen && (
              <div className="ch-sec-t">
                <Tally rows={d.tally.filter((t) => t.sector === s.id)} compact />
              </div>
            )}

            {isOpen && d.me.assign && (
              <div className="ch-sec-b">
                <Picker students={d.admin.students} leaders={p.leaders}
                  picked={picked} cap={s.cap} busy={busy}
                  onToggle={(id) => setPicked((v) =>
                    v.includes(id) ? v.filter((x) => x !== id) : [...v, id])} />
                <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }}
                  disabled={busy} onClick={() => save(s)}>
                  {busy ? "שומר…" : `שמירת השיבוץ (${picked.length})`}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ============================================================
   לשונית המטבח והחד״א
   ============================================================ */
/* ⚠ נגזר מהתאריך ולא מהתווית `day.dow` שמגיעה מהשרת — תווית
   היא טקסט להצגה, ותנאי שנשען על מחרוזת עברית נשבר ברגע
   שמישהו משנה את הניסוח. */
const isTuesday = (iso) => dowOf(iso) === TUESDAY;
const fridayOf = (iso) => fridayAfterTuesday(iso);

function Daily({ d, say, reload, goWeek }) {
  const [pi, setPi] = useState(0);
  const [open, setOpen] = useState(null);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  const daily = d.sectors.find((s) => s.kind === KIND.daily);
  const p = d.periods[pi];
  if (!daily) return <div className="empty"><b>אין גזרה מסוג יומי</b><span>אב הבית מגדיר אותה בהגדרות.</span></div>;
  if (!p) return <div className="empty"><b>אין תקופות לשבץ אליהן</b></div>;

  /* ⚠ באיזו גזרת ערב יושב כל חניך בשבוע הזה — זו השאלה שאב
     הבית שואל כשהוא בוחר תורן, ולכן היא מוצגת לצד השם. */
  const sectorOf = useMemo(() => {
    const m = new Map();
    for (const s of p.sectors) for (const x of s.members) m.set(x.id, s.name);
    return m;
  }, [p]);

  /* ============================================================
     ⚠ **יום ג׳ גורר את יום ו׳ — ברירת מחדל שאפשר לכבות בלחיצה.**

     המכינה ביקשה שמי שמשובץ ביום שלישי ישובץ אוטומטית גם ביום
     שישי. התיבה נשארת דלוקה, והאחראי מכבה אותה כשהוא לא רוצה.

     ⚠ **ומה שקרה בפועל נאמר במסך.** השרת מדלג על יום שישי אם
       הוא כבר משובץ — הוא לא ידרוס עבודה של מישהו — ואם המסך
       לא יאמר זאת, האחראי יניח ששישי סודר והוא לא.
     ============================================================ */
  const [mirror, setMirror] = useState(true);

  const save = (day) => {
    if (busy) return;
    setBusy(true);
    api.assignChore({
      sector: daily.id, date: day.date, students: picked,
      ...(isTuesday(day.date) ? { mirror } : {}),
    })
      .then((r) => {
        setOpen(null);
        (r.warnings || []).forEach(say);
        if (r.mirror) {
          say(r.mirror.done
            ? `נשמר, ויום שישי (${dmy(r.mirror.date)}) שובץ גם הוא`
            : `נשמר. יום שישי (${dmy(r.mirror.date)}) לא שובץ — ${r.mirror.why}`);
        } else {
          say(`נשמר — ${r.total} תורנים`);
        }
        reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <WeekNav d={d} onGo={(id) => { setPi(0); setOpen(null); goWeek(id); }} />
      {d.periods.length > 1 && (
        <div className="seg ch-seg">
          {d.periods.map((x, i) => (
            <button key={x.id} className={pi === i ? "on" : ""} onClick={() => { setPi(i); setOpen(null); }}>
              שבוע {x.num}
              <i className="seg-n">{dmy(x.start)}</i>
            </button>
          ))}
        </div>
      )}

      {/* ⚠ הטבלה בראש הלשונית **וגם** בתוך כל יום שנפתח. כאן
          היא התמונה הכללית לפני שמתחילים, ושם היא הכלי בזמן
          הבחירה. אותו רכיב, שני הקשרים. */}
      <Tally rows={d.tally.filter((t) => t.kind === KIND.daily)} compact />

      <div className="ch-note">
        {daily.cap || 3} תורנים ליום. הם מופרשים מרוב הלו״ז <b>ומתורנות סוף היום שלהם</b>,
        ולכן כדאי לקחת אחד או שניים מכל גזרה ולא יותר.
      </div>

      {p.days.map((day) => {
        const isOpen = open === day.date;
        return (
          <div className={"ch-day card" + (day.on.length ? " has" : "")} key={day.date}>
            <button className="ch-day-h" onClick={() => {
              if (isOpen) { setOpen(null); return; }
              setOpen(day.date); setPicked(day.on.map((x) => x.id));
            }}>
              <div className="ch-day-d">
                <b>{day.dow}</b>
                <span>{dmy(day.date)}</span>
              </div>
              <div className="ch-day-n">
                {day.on.length
                  ? day.on.map((x) => x.name).join(" · ")
                  : <span className="ch-day-empty">טרם שובץ</span>}
                {day.from.length > 0 && (
                  <div className="ch-day-from">
                    {day.from.map((f) => (
                      <span key={f.name} className={f.n > SAME_SECTOR_WARN ? "hot" : ""}>
                        {f.name} ×{f.n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {d.me.assign && <CI.chev style={{ transform: isOpen ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />}
            </button>

            {/* ⚠ מתריע ואינו חוסם — יום שבו אין ברירה הוא מצב אמיתי. */}
            {day.crowded.length > 0 && (
              <div className="ch-crowd"><CI.warn />{day.crowded.join(" · ")} — הגזרה תישאר חסרה באותו ערב</div>
            )}

            {/* ============================================================
                ⚠ **הטבלה בתוך היום, ולא רק בראש הלשונית.** אב
                  הבית בוחר **כאן**, וטבלה שיושבת שלושה גלילות
                  למעלה דורשת ממנו לזכור מספרים בעל פה בזמן שהוא
                  מסמן שמות — בדיוק הנקודה שבה יפסיק להסתכל.
                ============================================================ */}
            {isOpen && (
              <div className="ch-sec-t">
                <Tally rows={d.tally.filter((t) => t.kind === KIND.daily)} compact />
              </div>
            )}

            {isOpen && d.me.assign && (
              <div className="ch-sec-b">
                <Picker students={d.admin.students.map((s) => ({
                  ...s,
                  name: s.name + (sectorOf.get(s.id) ? ` · ${sectorOf.get(s.id)}` : ""),
                }))} leaders={p.leaders} picked={picked} cap={daily.cap} busy={busy}
                  onToggle={(id) => setPicked((v) =>
                    v.includes(id) ? v.filter((x) => x !== id) : [...v, id])} />
                {/* ============================================================
                    ⚠ **מוצג רק ביום שלישי.** תיבה שמופיעה בכל יום
                      ואינה עושה דבר בארבעה מהם מלמדת להתעלם ממנה.
                    ============================================================ */}
                {isTuesday(day.date) && (
                  <label className="ch-mirror">
                    <input type="checkbox" checked={mirror} disabled={busy}
                      onChange={(e) => setMirror(e.target.checked)} />
                    <span>
                      לשבץ את אותם תורנים גם ביום שישי
                      <i>{fridayOf(day.date) ? dmy(fridayOf(day.date)) : ""} · רק אם הוא עדיין ריק</i>
                    </span>
                  </label>
                )}
                <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }}
                  disabled={busy} onClick={() => save(day)}>
                  {busy ? "שומר…" : `שמירת התורנות (${picked.length})`}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ============================================================
   הצ׳ק ליסט
   ============================================================ */
function Checklist({ d, say, reload }) {
  const [busy, setBusy] = useState(null);
  /* ⚠ העריכה נפתחת רק למי שרשאי, והכפתור עצמו מוסתר לשאר —
     אחרת הוא נלחץ ומחזיר 403 אחרי שהמשתמש כבר הקליד (4יד). */
  const [editing, setEditing] = useState(false);
  const c = d.checklist;

  /* ============================================================
     ⚠ **מקובץ לפי *מתי ביום*, ולא לפי אזור.**

     תורן שרואה 33 מטלות ברשימה אחת אינו יודע מה לעשות עכשיו.
     קיבוץ לפי אזור עונה על "איפה", וזו שאלה שנשאלת רק אחרי
     שיודעים **מתי** — ובפועל היא פיצלה את השגרה של אחרי ארוחת
     הבוקר לחמישה מקומות במסך.

     האזור לא ירד; הוא עבר לתגית על השורה עצמה.

     ⚠ **הסדר מגיע מהשרת** (`whenOptions`), ואינו מוקלד כאן —
       תווית שתשתנה בלוח לא תשבור את הקיבוץ.
     ============================================================ */
  const order = c.whenOptions || [];
  const groups = useMemo(() => {
    const m = new Map();
    for (const it of c.items) {
      const k = it.when || (order[0] || "בכל זמן");
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(it);
    }
    /* ⚠ ערך שאינו ברשימה יורד לסוף ואינו נעלם (4ס). */
    const rank = (k) => { const i = order.indexOf(k); return i < 0 ? 99 : i; };
    return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [c.items, c.whenOptions]);

  const toggle = (it) => {
    if (busy) return;
    setBusy(it.id);
    api.tickChore({ item: it.id, done: !it.done, date: d.today })
      .then(reload)
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  return (
    <>
      <div className="ch-note">
        המטלות של היום — יום {c.dow}. השגרה היומית חוזרת בכל יום, ומעליה
        המטלות של היום עצמו.
      </div>

      <div className="ch-duty">
        <b>תורני היום</b>
        <span>{c.onDuty.length ? c.onDuty.map((x) => x.name).join(" · ") : "טרם שובצו"}</span>
      </div>

      {/* ⚠ **רק תורן היום מסמן**, וזה נאמר במפורש. הכפתור יודע
          מראש, אחרת המשתמש לוחץ ומקבל 403 (4יד). */}
      {!d.me.onDutyToday && (
        <div className="ch-ro">
          הסימון נעשה על ידי תורני המטבח של אותו יום. לצפייה ולמעקב הגישה פתוחה לכולם.
        </div>
      )}

      {groups.map(([area, items]) => (
        <div className="ch-grp" key={area}>
          <div className="ch-grp-h">{area}<i>{items.filter((x) => x.done).length}/{items.length}</i></div>
          {items.map((it) => (
            <button className={"ch-task" + (it.done ? " done" : "")} key={it.id}
              disabled={!d.me.onDutyToday || busy === it.id}
              onClick={() => toggle(it)}>
              <div className={"tick" + (it.done ? " on" : "")}>
                {it.done && <CI.check style={{ color: "#fff" }} />}
              </div>
              <span>{it.task}</span>
              {it.area && <i className="ch-task-a">{it.area}</i>}
              {/* ⚠ מוצג רק כשהמטלה אינה יומית — תגית "כל יום"
                  על שלושים שורות היא רעש. */}
              {(it.days || (it.day && it.day !== "כל יום")) && (
                <i className="ch-task-d">{it.days ? it.days.split(",").join(" ") : it.day}</i>
              )}
            </button>
          ))}
        </div>
      ))}

      {!c.items.length && (
        <div className="empty">
          <div className="e-ico"><CI.list /></div>
          <b>אין מטלות ליום הזה</b>
          <span>
            {d.me.daily
              ? "אפשר להוסיף מטלות בעריכת הרשימה, כאן למטה."
              : "אחראי המטבח מגדיר את המטלות."}
          </span>
        </div>
      )}

      {/* ============================================================
          עריכת הרשימה — אב הבית ואחראי המטבח
          ------------------------------------------------------------
          ⚠ **באותו מסך שבו רואים אותה, ולא בלשונית נפרדת.** מי
            שקורא את המטלה ורוצה לנסח אותה מחדש לא צריך לעבור
            מסך, למצוא אותה שוב ברשימה של 33 ולזכור מה רצה
            לשנות — זו אותה טעות של מסך ההצפות (4ס).
          ============================================================ */}
      {d.me.daily && (
        <>
          <button className="btn btn-ghost tm-add" onClick={() => setEditing(!editing)}>
            {editing ? "סיום העריכה" : "עריכת רשימת המטלות"}
          </button>
          {editing && <TaskEditor d={d} say={say} reload={reload} />}
        </>
      )}

      {/* ============================================================
          הנהלים — באותו דף
          ------------------------------------------------------------
          ⚠ **הנהלים והצ׳ק ליסט הם אותו דבר בשני מצבי צבירה.**
            התורן שמסמן "ניקיון מקררים" צריך לדעת גם מה הכלל על
            אחסון מזון — והוא לא יעזוב את המסך כדי לחפש אותו.
          ============================================================ */}
      {d.texts.length > 0 && (
        <>
          <div className="sec-label">נהלי המטבח והחד״א</div>
          {d.texts.map((t) => (
            <TextBlock key={t.key} block={t} canEdit={d.me.headText} say={say} onSaved={reload} />
          ))}
        </>
      )}
    </>
  );
}

/* ============================================================
   עורך רשימת המטלות
   ------------------------------------------------------------
   ⚠ **מטלה נמחקת מארכבת ולא נמחקת.** שורות הביצוע נושאות את
     המזהה, ומחיקה הייתה משאירה מעקב היסטורי עם שורות בלי שם.
     המסך אומר "הסרה" כי זה מה שקורה מבחינת המשתמש, והשרת
     עושה ארכוב.
   ============================================================ */
function TaskEditor({ d, say, reload }) {
  const DAYS = ["כל יום", "א", "ב", "ג", "ד", "ה", "ו", "ש"];
  const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
  /* ⚠ מהשרת ולא מוקלד — ראו ההערה בקיבוץ. */
  const WHENS = d.checklist.whenOptions || ["בכל זמן"];
  const [day, setDay] = useState(d.checklist.dow);
  const [f, setF] = useState({ task: "", area: "", days: [], when: WHENS[0] });
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  /* days גובר על day: מטלה שנשמרה עם רשימת ימים מופיעה בכל
     אחד מהם, ומטלה ישנה עם יום בודד מתנהגת כמו קודם. אותו כלל
     בדיוק שהשרת מסנן לפיו. */
  const onThisDay = (t) => {
    const list = String(t.days || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (day === "כל יום") return !list.length && t.day === "כל יום";
    if (list.length) return list.includes(day);
    return t.day === day;
  };
  const tpl = (d.template || []).filter(onThisDay)
    .sort((a, b) => {
      const r = (x) => { const i = WHENS.indexOf(x.when || WHENS[0]); return i < 0 ? 99 : i; };
      return r(a) - r(b) || (a.order - b.order) || a.task.localeCompare(b.task, "he");
    });

  const add = () => {
    if (busy || !f.task.trim()) return;
    setBusy(true);
    api.saveChoreTask({
      task: f.task, area: f.area, order: tpl.length + 1,
      /* ⚠ כשלא נבחרו ימים, הימים הם היום שנבחר בלשונית — כך
         שהתנהגות ברירת המחדל זהה למה שהייתה. */
      days: f.days.length ? f.days : (day === "כל יום" ? [] : [day]),
      day: f.days.length ? undefined : day,
      when: f.when,
    })
      .then(() => { setF({ task: "", area: "", days: [], when: WHENS[0] }); say("נוספה"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const saveOne = (t) => {
    if (busy) return;
    setBusy(true);
    api.saveChoreTask({
      id: t.id, task: edit.task, area: edit.area,
      days: edit.dayList, day: edit.dayList.length ? undefined : edit.day,
      when: edit.when,
    })
      .then(() => { setEdit(null); say("נשמר"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const drop = (t) => {
    if (busy) return;
    setBusy(true);
    api.deleteChoreTask(t.id)
      .then(() => { say("הוסרה"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="ch-edit card lift">
      <div className="ch-note" style={{ marginTop: 0 }}>
        <b>"כל יום"</b> היא השגרה שחוזרת בכל יום. שאר הימים נוספים עליה.
      </div>

      <div className="ch-days">
        {DAYS.map((x) => (
          <button key={x} className={"ch-dayb" + (day === x ? " on" : "")}
            onClick={() => { setDay(x); setEdit(null); }}>
            {x}
            <i>{(d.template || []).filter((t) => t.day === x).length}</i>
          </button>
        ))}
      </div>

      {tpl.map((t) => (
        <div className="ch-erow" key={t.id}>
          {edit && edit.id === t.id ? (
            <div className="ch-eform">
              <div className="fld">
                <label>המטלה</label>
                <input value={edit.task} autoFocus
                  onChange={(e) => setEdit((p) => ({ ...p, task: e.target.value }))} />
              </div>
              <div className="tm-row2">
                <div className="fld">
                  <label>אזור</label>
                  <input value={edit.area || ""} placeholder="למשל: מחסן"
                    onChange={(e) => setEdit((p) => ({ ...p, area: e.target.value }))} />
                </div>
                <div className="fld">
                  <label>מתי ביום</label>
                  <select value={edit.when}
                    onChange={(e) => setEdit((p) => ({ ...p, when: e.target.value }))}>
                    {WHENS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              {/* ============================================================
                  ⚠ **ימים מרובים, ולא רשימה נפתחת של יום אחד.**
                    מטלה שמתקיימת בימים א׳ ו-ד׳ דרשה קודם שתי שורות
                    נפרדות — ואז שינוי ניסוח מחייב לזכור את שתיהן.

                  ⚠ ובחירה ריקה פירושה **כל יום**, ולא "אף יום":
                    מטלה בלי אף יום אינה מצב שקיים.
                  ============================================================ */}
              <div className="fld">
                <label>באילו ימים</label>
                <div className="ch-dsel">
                  {LETTERS.map((x) => {
                    const on = edit.dayList.includes(x);
                    return (
                      <button key={x} type="button"
                        className={"ch-dsel-b" + (on ? " on" : "")}
                        onClick={() => setEdit((p) => ({
                          ...p,
                          dayList: on ? p.dayList.filter((y) => y !== x) : [...p.dayList, x],
                        }))}>{x}</button>
                    );
                  })}
                </div>
                <div className="ch-hint">
                  {edit.dayList.length ? `בימים ${edit.dayList.join(" · ")}` : "בכל יום"}
                </div>
              </div>
              <div className="tm-editor-f">
                <button className="btn btn-primary btn-sm" disabled={busy || !edit.task.trim()}
                  onClick={() => saveOne(t)}>שמירה</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>ביטול</button>
              </div>
            </div>
          ) : (
            <>
              <div className="ch-erow-m">
                <b>{t.task}</b>
                {t.area && <span>{t.area}</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit({
                ...t,
                dayList: String(t.days || "").split(",").map((x) => x.trim()).filter(Boolean),
                when: t.when || WHENS[0],
              })}>עריכה</button>
              <button className="esc-del" title="הסרה" onClick={() => drop(t)}>✕</button>
            </>
          )}
        </div>
      ))}

      {!tpl.length && <div className="ch-tally-none">אין מטלות ליום {day}</div>}

      <div className="ch-eadd">
        <div className="tm-row2">
          <div className="fld">
            <label>מטלה חדשה</label>
            <input value={f.task} placeholder="מה צריך לעשות"
              onChange={(e) => setF((p) => ({ ...p, task: e.target.value }))} />
          </div>
          <div className="fld">
            <label>אזור</label>
            <input value={f.area} placeholder="רשות"
              onChange={(e) => setF((p) => ({ ...p, area: e.target.value }))} />
          </div>
        </div>
        <div className="tm-row2">
          <div className="fld">
            <label>מתי ביום</label>
            <select value={f.when} onChange={(e) => setF((p) => ({ ...p, when: e.target.value }))}>
              {WHENS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>באילו ימים</label>
            <div className="ch-dsel">
              {LETTERS.map((x) => {
                const on = f.days.includes(x);
                return (
                  <button key={x} type="button" className={"ch-dsel-b" + (on ? " on" : "")}
                    onClick={() => setF((p) => ({
                      ...p,
                      days: on ? p.days.filter((y) => y !== x) : [...p.days, x],
                    }))}>{x}</button>
                );
              })}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy || !f.task.trim()} onClick={add}>
          הוספה ליום {day}
        </button>
      </div>
    </div>
  );
}

export default function ChoresPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("sectors");

  /* ⚠ `week` הוא **בקשה** ולא מצב: השרת מחזיר `weekAt` עם מה
     שנטען בפועל, ומזהה שאינו קיים נופל חזרה להווה. מסך שיסמן
     את מה שביקש ולא את מה שקיבל יראה שבוע שלא נטען. */
  const [week, setWeek] = useState(null);
  const load = useCallback(() => {
    api.getChores(true, week)
      .then((r) => { setD(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, [week]);
  useEffect(() => { load(); }, [load]);

  if (err) return <><div className="screen-title">תורנויות</div><div className="login-err">{err}</div></>;
  if (!d) return <><div className="screen-title">תורנויות</div><div className="skel" style={{ height: 220 }} /></>;

  const TABS = [
    ["sectors", "גזרות", <CI.grid key="a" />],
    ["daily", "מטבח וחד״א", <CI.users key="b" />],
    ["check", "צ׳ק ליסט ונהלים", <CI.list key="c" />],
    ["tally", "מעקב", <CI.grid key="d" />],
  ];
  if (d.me.sectors || d.me.daily) TABS.push(["setup", "הגדרות", <CI.cog key="e" />]);

  return (
    <>
      <div className="screen-title">תורנויות</div>
      <div className="tm-sub">
        גזרות ניקיון בסוף היום, ותורנות מטבח וחד״א לכל היום.
      </div>

      {d.warnings.map((w, i) => (
        <div className="note-warn" key={i}><CI.warn />{w}</div>
      ))}

      <ScrollTabs className="tm-tabs ch-tabs">
        {TABS.map(([k, label, ic]) => (
          <button key={k} className={"tm-tab" + (tab === k ? " on" : "")}
            onClick={() => setTab(k)}>{ic}{label}</button>
        ))}
      </ScrollTabs>

      {tab === "sectors" && <Sectors d={d} say={say} reload={load} goWeek={setWeek} />}
      {tab === "daily" && <Daily d={d} say={say} reload={load} goWeek={setWeek} />}
      {tab === "check" && <Checklist d={d} say={say} reload={load} />}
      {tab === "tally" && (
        <>
          <div className="ch-note">
            כמה פעמים כל אחד <b>שובץ</b> לכל גזרה. הטבלה גלויה לכולם בכוונה —
            כך אפשר לבדוק ולא רק להרגיש.
          </div>
          <Tally rows={d.tally} />
        </>
      )}
      {tab === "setup" && <Setup d={d} say={say} reload={load} />}
    </>
  );
}

/* ============================================================
   ההגדרות — האוטונומיה
   ============================================================ */
function Setup({ d, say, reload }) {
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [adj, setAdj] = useState({ student: "", sector: "", delta: "1", reason: "" });

  const open = (s) => {
    setEdit(s ? s.id : "new");
    setF(s ? { name: s.name, kind: s.kind, cap: s.cap ?? "", detail: s.detail || "", archived: s.archived }
      : { name: "", kind: KIND.evening, cap: "", detail: "", archived: false });
  };
  const save = () => {
    if (busy) return;
    setBusy(true);
    api.saveSector({ id: edit === "new" ? undefined : edit, ...f })
      .then(() => { setEdit(null); say("נשמר"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const addAdj = () => {
    if (busy) return;
    setBusy(true);
    api.addChoreAdjust({ ...adj, delta: Number(adj.delta) })
      .then(() => { setAdj({ student: "", sector: "", delta: "1", reason: "" }); say("נרשם"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      {d.me.sectors && (
        <>
          <div className="sec-label">גזרות</div>
          {edit === "new"
            ? <SectorForm f={f} setF={setF} busy={busy} onSave={save} onCancel={() => setEdit(null)} isNew />
            : <button className="btn btn-primary tm-add" onClick={() => open(null)}>
                <CI.plus />גזרה חדשה
              </button>}
        </>
      )}

      {d.sectors.map((s) => (
        <div className="ch-set card" key={s.id}>
          {edit === s.id ? (
            <SectorForm f={f} setF={setF} busy={busy} onSave={save} onCancel={() => setEdit(null)} />
          ) : (
            <>
              <div className="ch-set-h">
                <div>
                  <b>{s.name}</b>
                  <span>{s.kind}{s.cap != null ? ` · ${s.cap} חניכים` : ""}{s.archived ? " · מוסתרת" : ""}</span>
                </div>
                {/* ⚠ אחראי המטבח עורך את הגזרה היומית בלבד — היא
                    המטבח שלו. הכפתור יודע מראש. */}
                {(d.me.sectors || (d.me.daily && s.kind === KIND.daily)) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => open(s)}>עריכה</button>
                )}
              </div>
              {s.detail && <div className="ch-detail">{s.detail}</div>}
            </>
          )}
        </div>
      ))}

      {/* ---------- תיקון ספירה ---------- */}
      {d.me.assign && d.admin && (
        <>
          <div className="sec-label">תיקון ספירה</div>
          <div className="card">
            <div className="ch-note" style={{ marginTop: 0 }}>
              הייתה תקלה, מישהו החליף, או שהתורנות לא התקיימה — כאן מוסיפים
              או מורידים מהספירה, <b>עם סיבה</b>. ההיסטוריה נשמרת ואינה נדרסת.
            </div>
            <div className="tm-row2">
              <div className="fld">
                <label>חניך</label>
                <select value={adj.student} onChange={(e) => setAdj((p) => ({ ...p, student: e.target.value }))}>
                  <option value="">—</option>
                  {d.admin.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>גזרה</label>
                <select value={adj.sector} onChange={(e) => setAdj((p) => ({ ...p, sector: e.target.value }))}>
                  <option value="">—</option>
                  {d.sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="tm-row2">
              <div className="fld">
                <label>שינוי</label>
                <select value={adj.delta} onChange={(e) => setAdj((p) => ({ ...p, delta: e.target.value }))}>
                  <option value="1">1+ · הוסף תורנות</option>
                  <option value="-1">1- · הורד תורנות</option>
                </select>
              </div>
              <div className="fld">
                <label>סיבה</label>
                <input value={adj.reason} placeholder="למשל: היה כצופר"
                  onChange={(e) => setAdj((p) => ({ ...p, reason: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary" disabled={busy || !adj.student || !adj.sector}
              onClick={addAdj}>רישום</button>
          </div>

          {d.admin.adjusts.length > 0 && (
            <div className="rows ch-adj">
              {d.admin.adjusts.map((a) => (
                <div className="ch-adj-r" key={a.id}>
                  <b className={a.delta > 0 ? "up" : "down"}>{a.delta > 0 ? "+" : ""}{a.delta}</b>
                  <div>
                    <div>{a.studentName} · {a.sectorName}</div>
                    <span>{a.reason || "בלי סיבה"}{a.by ? " · " + a.by : ""}</span>
                  </div>
                  <button className="esc-del" title="ביטול"
                    onClick={() => api.deleteChoreAdjust(a.id).then(reload).catch((e) => say(e.message))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ⚠ הנהלים עברו ללשונית "צ׳ק ליסט ונהלים" — שם התורן
          קורא אותם בזמן שהוא עובד, ולא בלשונית הגדרות שהוא
          לא נכנס אליה. */}
    </>
  );
}

function SectorForm({ f, setF, busy, onSave, onCancel, isNew }) {
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="ch-form">
      <div className="fld">
        <label>שם הגזרה</label>
        <input value={f.name} autoFocus onChange={(e) => set("name", e.target.value)}
          placeholder="למשל: מגורי בנים" />
      </div>
      <div className="tm-row2">
        <div className="fld">
          <label>סוג</label>
          <select value={f.kind} onChange={(e) => set("kind", e.target.value)} disabled={!isNew}>
            <option value={KIND.evening}>{KIND.evening}</option>
            <option value={KIND.daily}>{KIND.daily}</option>
          </select>
          {!isNew && <div className="fld-hint">שינוי סוג מותר רק כשאין שיבוצים</div>}
        </div>
        <div className="fld">
          <label>כמה חניכים</label>
          <input type="number" min="0" step="1" dir="ltr" value={f.cap}
            onChange={(e) => set("cap", e.target.value)} placeholder="ריק = בלי הגבלה" />
        </div>
      </div>
      <div className="fld">
        <label>מה מנקים כאן</label>
        <textarea rows={4} value={f.detail} onChange={(e) => set("detail", e.target.value)}
          placeholder="הפירוט שהתורן יראה — מה בדיוק צריך לנקות" />
      </div>
      <label className="ch-chk">
        <input type="checkbox" checked={Boolean(f.archived)}
          onChange={(e) => set("archived", e.target.checked)} />
        {/* ⚠ מוסתרת ולא נמחקת — הספירות ההיסטוריות נשארות נכונות. */}
        <span>מוסתרת — לא מוצגת לשיבוץ, והספירות שנצברו נשמרות</span>
      </label>
      <div className="tm-editor-f">
        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={onSave}>
          {busy ? "שומר…" : isNew ? "יצירה" : "שמירה"}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}
