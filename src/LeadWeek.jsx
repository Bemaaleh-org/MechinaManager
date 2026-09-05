/* ============================================================
   שבוע ההובלה — הקונסולה של המובילים
   ------------------------------------------------------------
   ⚠⚠ **המסך נפתח לפני שהשבוע מתחיל, וזו כל התכלית.** מוביל
     שמגלה ביום ראשון בבוקר שהוא מוביל השבוע כבר איחר את ההכנה.
     ברירת המחדל של השרת היא השבוע הנוכחי שלי, ואם אין — **הבא**.

   ⚠ **צ׳ק ליסט אחד לתבנית ולמשימות השבוע.** מה שתמיד עושים ומה
     שהוספנו יושבים באותה רשימה, כי למוביל אין הבחנה ביניהם —
     יש לו "מה נשאר". `own` אומר מה ניתן למחוק, וזה כל ההבדל
     שמעניין אותו.

   ⚠ **ומי סימן נכתב בשם.** שני מובילים מחלקים ביניהם, ו"מי לקח
     מה" היא כל התכלית של החלוקה — זה ההפך מלוח המשימות
     האישיות (4מה) ואותו כלל כמו לוח הצוותים (4נ).

   ⚠ **הסיכום והמסירה הם שני שדות ושני נמענים.** הסיכום לצוות
     ומתאר מה היה; המסירה למובילים הבאים ומתארת מה נשאר פתוח.
   ============================================================ */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "./api.js";
import Escalate from "./Escalate.jsx";
import ScrollTabs from "./Tabs.jsx";
import ScreenNote from "./ScreenNote.jsx";
import { dutyKey, DUTY_LEADER } from "../shared/duties.js";

const I = {
  chev: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 18l-6-6 6-6" /></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" /></svg>),
  cal: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" /></svg>),
  star: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
    <path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 19.6l1.1-6L3.4 9.4l6-.8z" /></svg>),
  send: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" /></svg>),
  hand: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 12h12M12 6l6 6-6 6" /></svg>),
  bell: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>),
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};
const DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const dowOf = (iso) => (iso ? DOW[new Date(iso + "T12:00:00Z").getUTCDay()] : "");
const daysOf = (a, b) => {
  if (!a || !b) return [];
  const out = [];
  const t = (x) => new Date(x + "T12:00:00Z").getTime();
  for (let d = t(a); d <= t(b); d += 86400000) {
    out.push(new Date(d).toISOString().slice(0, 10));
  }
  return out;
};

export default function LeadWeekPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [pick, setPick] = useState("");
  const [view, setView] = useState("today");

  const load = useCallback(() => {
    setErr(null);
    api.leadWeek(pick)
      .then((x) => { setD(x); if (!pick && x.week) setPick(x.week.id); })
      /* ⚠ כשל טעינה נראה אחרת מ"אין נתונים" (עיקרון 6). */
      .catch((e) => setErr(e.message));
  }, [pick]);
  useEffect(load, [load]);

  if (err) {
    return (
      <>
        <div className="screen-title">שבוע ההובלה</div>
        <div className="banner-bad">{err}</div>
      </>
    );
  }
  if (!d) return <div className="skel" style={{ height: 220 }} />;

  if (!d.week) {
    return (
      <>
        <div className="screen-title">שבוע ההובלה</div>
        <div className="empty">
          <div className="e1">אין עדיין שבועות הובלה בלוח</div>
          <div className="e2">ראש המכינה פותח אותם במסך "מובילי שבוע".</div>
        </div>
      </>
    );
  }

  const w = d.week;
  const state = d.today < w.start ? "לפני" : d.today > w.end ? "אחרי" : "עכשיו";

  return (
    <>
      <div className="screen-title">שבוע ההובלה</div>
      <ScreenNote name="note.leadweek" say={say} />

      <WeekPicker d={d} pick={pick} setPick={setPick} />

      <div className={"lw-hero lw-" + (state === "עכשיו" ? "now" : state === "לפני" ? "soon" : "past")}>
        <div className="lw-hero-t">
          <div className="lw-hero-n">שבוע {w.num || w.name}</div>
          <div className="lw-hero-d">
            {dmy(w.start)} – {dmy(w.end)}
            {state === "עכשיו" && <span className="pill p-ok">השבוע</span>}
            {state === "לפני" && <span className="pill p-idle">מתחיל בעוד {daysOf(d.today, w.start).length - 1} ימים</span>}
            {state === "אחרי" && <span className="pill p-idle">הסתיים</span>}
          </div>
        </div>
        <div className="lw-hero-p">
          {w.leaders.length
            ? w.leaders.map((l) => <span key={l.id} className={"lw-who" + (l.id === d.me.id ? " me" : "")}>{l.name}</span>)
            : <span className="tm-faint">טרם שובצו מובילים</span>}
          {w.escort && <span className="tm-faint">מלווה · {w.escort}</span>}
        </div>
        {w.what && <div className="lw-hero-w">{w.what}</div>}
      </div>

      {/* ⚠ אחוז `null` ולא 0 כשאין משימות — 0% נראה כמו "לא
          התקדמתי" בעוד שהאמת היא "אין מה למדוד" (4ג). */}
      <div className="band">
        <div className="band-grid">
          <div className="band-c">
            <div className={"band-n" + (d.counts.left ? " warn" : " ok")}>{d.counts.left}</div>
            <div className="band-l">נשארו בצ׳ק ליסט</div>
          </div>
          <div className="band-c">
            <div className="band-n">{d.counts.pct == null ? "—" : d.counts.pct + "%"}</div>
            <div className="band-l">{d.counts.pct == null ? "אין צ׳ק ליסט" : "הושלם"}</div>
          </div>
          <div className="band-c">
            <div className="band-n">{d.used.length}</div>
            <div className="band-l">פעילויות שרצו</div>
          </div>
        </div>
      </div>

      {!d.me.edit && (
        <div className="note-warn" style={{ marginBottom: 12 }}>
          {d.me.staff
            ? "השבוע הזה מנוהל על ידי המובילים שלו — כאן רק צפייה."
            : "זה אינו שבוע שאתה מוביל, ולכן אי אפשר לסמן בו."}
        </div>
      )}

      <ScrollTabs className="tm-tabs">
        {[["today", "היום", <I.cal key="a" />],
          ["list", "צ׳ק ליסט", <I.check key="b" />],
          ["acts", "בנק פעילויות", <I.star key="c" />],
          ["hand", "מסירה וסיכום", <I.hand key="d" />],
          ["esc", "הצפה", <I.bell key="e" />]].map(([k, t, ic]) => (
          <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
            {ic}{t}
          </button>
        ))}
      </ScrollTabs>

      {view === "today" && <Today d={d} say={say} reload={load} />}
      {view === "list" && <Checklist d={d} say={say} reload={load} />}
      {view === "acts" && <Activities d={d} say={say} reload={load} />}
      {view === "hand" && <Handover d={d} say={say} reload={load} />}
      {/* ⚠ **הצפה בתוך ההקשר ולא בדף נפרד** (4ס). ולמוביל שבוע
          לא היה נתיב הצפה כלל — הוא נגזר משיבוץ ואינו בעמודת
          התפקידים, ולכן זה ההקשר היחיד שלו. */}
      {view === "esc" && (
        <Escalate duty={dutyKey(DUTY_LEADER)} label="מוביל שבוע" say={say} />
      )}
    </>
  );
}

/* ============================================================
   בורר השבועות
   ⚠ **כל השבועות ולא רק שלי** — מוביל שרוצה לראות מה עשה השבוע
     שעבר צריך להגיע לשם, ומי שמכין את שלו רוצה לראות מה קורה
     לפניו. "שלי" מסומן ואינו מסנן.
   ============================================================ */
function WeekPicker({ d, pick, setPick }) {
  const [open, setOpen] = useState(false);
  const cur = d.weeks.find((w) => w.id === (pick || d.week.id)) || d.week;
  const i = d.weeks.findIndex((w) => w.id === cur.id);

  return (
    <div className="lw-pick">
      <button className="btn btn-ghost btn-sm" disabled={i <= 0}
        onClick={() => setPick(d.weeks[i - 1].id)} aria-label="השבוע הקודם">
        <I.chev style={{ transform: "rotate(180deg)" }} />
      </button>
      <button className="lw-pick-m" onClick={() => setOpen(!open)}>
        שבוע {cur.num || cur.name}
        {cur.mine && <span className="pill p-ok">שלי</span>}
      </button>
      <button className="btn btn-ghost btn-sm" disabled={i < 0 || i >= d.weeks.length - 1}
        onClick={() => setPick(d.weeks[i + 1].id)} aria-label="השבוע הבא">
        <I.chev />
      </button>
      {open && (
        <div className="lw-pick-list scroll-y">
          {d.weeks.map((w) => (
            <button key={w.id} className={w.id === cur.id ? "on" : ""}
              onClick={() => { setPick(w.id); setOpen(false); }}>
              <span>שבוע {w.num || w.name}</span>
              <span className="tm-faint">{dmy(w.start)}</span>
              {w.mine && <span className="pill p-ok">שלי</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   המסך של היום
   ------------------------------------------------------------
   ⚠ **יום אחד ולא שבוע.** מוביל בשעה שבע בבוקר שואל "מה היום",
     ורשימה של שבעה ימים מחייבת אותו למצוא את היום בתוכה — וזה
     בדיוק הרגע שבו הוא יפסיק להסתכל.

   ⚠ **ומחוץ לשבוע שלו זה נופל ליום הראשון של השבוע הנבחר**, כי
     "היום" בשבוע שהסתיים אינו יום שקיים בו.
   ============================================================ */
function Today({ d, say, reload }) {
  const days = daysOf(d.week.start, d.week.end);
  const [day, setDay] = useState(() =>
    days.includes(d.today) ? d.today : days[0] || d.today);

  const daily = d.tasks.filter((t) => t.when === "כל יום");
  const usedToday = d.used.filter((u) => u.date === day);

  return (
    <>
      <div className="lw-days">
        {days.map((iso) => (
          <button key={iso} className={"lw-day" + (iso === day ? " on" : "") + (iso === d.today ? " today" : "")}
            onClick={() => setDay(iso)}>
            <span className="lw-day-n">{dowOf(iso)}</span>
            <span className="lw-day-d num">{Number(iso.slice(8))}</span>
          </button>
        ))}
      </div>

      <div className="lw-daytitle">
        יום {dowOf(day)} · {dmy(day)}
        {day === d.today && <span className="pill p-ok">היום</span>}
      </div>

      {/* ⚠ **"כל יום" מוצג כאן ולא בצ׳ק ליסט השבועי**, כי הוא
          שאלה של היום ולא של השבוע. הסימון עצמו הוא שבועי — ולכן
          נאמר במפורש, ולא נשאר להסקה מהצבע. */}
      {daily.length > 0 && (
        <>
          <div className="grp-h"><span>מה עושים כל יום</span></div>
          {/* ⚠ נאמר במפורש ולא נשאר להסקה: הסימון הוא של השבוע
              ולא של היום, ומי שיחשוב אחרת יסמן שוב כל בוקר. */}
          <div className="tm-note" style={{ marginTop: 0, marginBottom: 8 }}>
            הסימון כאן הוא <b>לשבוע כולו</b> ולא ליום — הצ׳ק ליסט מלווה את
            השבוע, לא כל בוקר מחדש.
          </div>
          <TaskList tasks={daily} d={d} say={say} reload={reload} />
        </>
      )}

      <div className="grp-h"><span>פעילויות שרצו ביום הזה</span></div>
      {usedToday.length === 0 ? (
        <div className="tm-note" style={{ marginTop: 0 }}>
          עוד לא נרשמה פעילות ליום הזה. אפשר לרשום מלשונית "בנק פעילויות".
        </div>
      ) : (
        <div className="rows">
          {usedToday.map((u) => (
            <div className="tm-entry-row" key={u.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* ⚠ **השם מגיע משורת הביצוע ולא מהבנק.** פעילות
                    שהוסתרה עדיין צריכה להיקרא בהיסטוריה — זו כל
                    הסיבה שמחיקה שם היא הסתרה. */}
              <div className="tm-entry-t">{u.title}</div>
                <div className="tm-entry-m">{u.by && <span>{u.by}</span>}</div>
                {u.note && <div className="tm-note">{u.note}</div>}
              </div>
              {d.me.edit && <DelBtn id={u.id} say={say} reload={reload} />}
            </div>
          ))}
        </div>
      )}

      {d.week.note && (
        <>
          <div className="grp-h"><span>הערת המכינה לשבוע</span></div>
          <div className="tm-pre">{d.week.note}</div>
        </>
      )}
    </>
  );
}

function DelBtn({ id, say, reload }) {
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm ev-del" disabled={busy}
      onClick={() => {
        setBusy(true);
        api.deleteLeadRow(id)
          .then(() => { say("נמחק"); reload(); })
          .catch((e) => say(e.message)).finally(() => setBusy(false));
      }}>מחיקה</button>
  );
}

/* ============================================================
   הצ׳ק ליסט
   ------------------------------------------------------------
   ⚠⚠ **הסימון אופטימי ואינו טוען מחדש את המסך** (4י). לחיצה
     שמחכה ל-monday ואז טוענת הכול לקחה שנייה וחצי, וזה מרגיש
     כאילו לא נקלטה. ⚠ ובכישלון חוזרים אחורה ואומרים.
   ============================================================ */
function Checklist({ d, say, reload }) {
  const [adding, setAdding] = useState(false);
  const groups = useMemo(() => {
    const by = new Map();
    for (const t of d.tasks) {
      if (!by.has(t.when)) by.set(t.when, []);
      by.get(t.when).push(t);
    }
    return [...by.entries()];
  }, [d.tasks]);

  return (
    <>
      {d.tasks.length === 0 && (
        <div className="empty">
          <div className="e1">הצ׳ק ליסט ריק</div>
          <div className="e2">
            ראש המכינה קובע מה צריך לעשות בכל שבוע הובלה, ואתם יכולים
            להוסיף לשבוע שלכם משימות משלכם.
          </div>
        </div>
      )}

      {groups.map(([when, list]) => (
        <React.Fragment key={when}>
          <div className="grp-h">
            <span>{when}</span>
            <span className="num">{list.filter((t) => t.done).length}/{list.length}</span>
          </div>
          <TaskList tasks={list} d={d} say={say} reload={reload} />
        </React.Fragment>
      ))}

      {d.me.edit && (adding ? (
        <AddTask d={d} say={say} onDone={() => { setAdding(false); reload(); }}
          onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><I.plus />משימה לשבוע הזה</button>
      ))}

      {/* ⚠ **העריכה יושבת באותו מסך שבו רואים את הרשימה.** מי
          שקורא משימה ורוצה לנסח אותה מחדש לא צריך לעבור מסך,
          למצוא אותה שוב ולזכור מה רצה לשנות — זו בדיוק הטעות
          של מסך ההצפות שנמחק (4ס, 4ק). */}
      {d.template && <Template d={d} say={say} reload={reload} />}
    </>
  );
}

/* ============================================================
   הצ׳ק ליסט הקבוע — ראש המכינה בלבד
   ------------------------------------------------------------
   ⚠⚠ **הסתרה ולא מחיקה.** שורות הביצוע של כל השבועות שעברו
     נושאות את מזהה המשימה, ומחיקה הייתה משאירה היסטוריה
     שמצביעה לשומקום — ואין מסך שמציג אותה, כלומר היא לא
     תימחק לעולם (4ק).

   ⚠ **והמוסתרות מוצגות כאן ורק כאן.** מי שעורך צריך לראות מה
     הוסתר, אחרת ההסתרה היא מחיקה שאי אפשר לבטל.
   ============================================================ */
function Template({ d, say, reload }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const [f, setF] = useState({ title: "", when: d.when[1], body: "" });

  const flip = (t) => {
    setBusy(t.id);
    api.editLeadTemplate({ template: t.id, archived: !t.archived })
      .then(() => { say(t.archived ? "חזרה לרשימה" : "הוסתרה"); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  return (
    <div className="lw-tmpl">
      <button className="lw-tmpl-h" onClick={() => setOpen(!open)}>
        <span>הצ׳ק ליסט הקבוע · {d.template.length} שורות</span>
        <I.chev style={{ transform: open ? "rotate(-90deg)" : "none" }} />
      </button>
      {open && (
        <div className="lw-tmpl-b">
          <div className="tm-note" style={{ marginTop: 0 }}>
            מה שכתוב כאן מופיע <b>בכל שבוע הובלה</b>. שורה שאינה רלוונטית עוד
            מוסתרת ואינה נמחקת — כדי שהסימונים של השבועות שעברו יישארו קריאים.
          </div>
          <div className="rows">
            {d.template.map((t) => (
              <div className={"tm-entry-row" + (t.archived ? " lw-off" : "")} key={t.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tm-entry-t">{t.title}</div>
                  <div className="tm-entry-m">
                    <span>{t.when}</span>
                    {t.archived && <span className="pill p-idle">מוסתרת</span>}
                  </div>
                  {t.body && <div className="tm-note">{t.body}</div>}
                </div>
                <button className="btn btn-ghost btn-sm" disabled={busy === t.id}
                  onClick={() => flip(t)}>{t.archived ? "להחזיר" : "להסתיר"}</button>
              </div>
            ))}
          </div>

          {adding ? (
            <div className="card lift" style={{ marginTop: 10 }}>
              <div className="fld">
                <label>מה צריך לעשות בכל שבוע הובלה</label>
                <input value={f.title} autoFocus disabled={busy === "new"}
                  onChange={(e) => setF({ ...f, title: e.target.value })} />
              </div>
              <div className="fld">
                <label>מתי</label>
                <select value={f.when} disabled={busy === "new"}
                  onChange={(e) => setF({ ...f, when: e.target.value })}>
                  {d.when.map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>הסבר</label>
                <textarea rows={2} value={f.body} disabled={busy === "new"}
                  onChange={(e) => setF({ ...f, body: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  disabled={busy === "new" || !f.title.trim()}
                  onClick={() => {
                    setBusy("new");
                    api.addLeadTemplate({ ...f, title: f.title.trim() })
                      .then(() => { say("נוספה"); setF({ title: "", when: d.when[1], body: "" });
                        setAdding(false); reload(); })
                      .catch((e) => say(e.message)).finally(() => setBusy(null));
                  }}>הוספה</button>
                <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy === "new"}
                  onClick={() => setAdding(false)}>ביטול</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
              onClick={() => setAdding(true)}><I.plus />שורה לכל שבוע הובלה</button>
          )}
        </div>
      )}
    </div>
  );
}

function TaskList({ tasks, d, say, reload }) {
  const [flip, setFlip] = useState({});
  const [open, setOpen] = useState(null);
  const isDone = (t) => (flip[t.id] !== undefined ? flip[t.id] : t.done);

  const toggle = (t) => {
    if (!d.me.edit) return;
    const next = !isDone(t);
    setFlip((x) => ({ ...x, [t.id]: next }));
    api.markLeadTask({ week: d.week.id, task: t.id, done: next })
      .catch((e) => {
        setFlip((x) => { const c = { ...x }; delete c[t.id]; return c; });
        say(e.message);
      });
  };

  return (
    <div className="rows">
      {tasks.map((t) => (
        <div className={"lw-task" + (isDone(t) ? " done" : "")} key={t.id}>
          <button className="pr-chk" onClick={() => toggle(t)} disabled={!d.me.edit}
            aria-label={isDone(t) ? "לבטל סימון" : "סימון כבוצע"}>
            {isDone(t) ? "✓" : ""}
          </button>
          <button className="lw-task-b" onClick={() => setOpen(open === t.id ? null : t.id)}>
            <div className="lw-task-t">{t.title}</div>
            <div className="tm-entry-m">
              {/* ⚠ **מי סימן, בשם.** זו החלוקה בין השניים, וזו כל
                  התכלית — ראו ההערה בראש הקובץ. */}
              {isDone(t) && t.by && <span>{t.by}</span>}
              {isDone(t) && t.doneAt && <span>· {dmy(t.doneAt)}</span>}
              {t.own && <span className="pill p-idle">שלנו</span>}
            </div>
          </button>
          {t.body && open === t.id && <div className="lw-task-x tm-pre">{t.body}</div>}
          {t.own && d.me.edit && <DelBtn id={t.id} say={say} reload={reload} />}
        </div>
      ))}
    </div>
  );
}

function AddTask({ d, say, onDone, onCancel }) {
  const [f, setF] = useState({ title: "", when: d.when[1], body: "" });
  const [busy, setBusy] = useState(false);
  return (
    <div className="card lift" style={{ marginTop: 10 }}>
      <div className="fld">
        <label>מה צריך לעשות</label>
        <input value={f.title} autoFocus disabled={busy}
          onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="fld">
        <label>מתי</label>
        <select value={f.when} disabled={busy}
          onChange={(e) => setF({ ...f, when: e.target.value })}>
          {d.when.map((w) => <option key={w}>{w}</option>)}
        </select>
      </div>
      <div className="fld">
        <label>הסבר</label>
        <textarea rows={2} value={f.body} disabled={busy}
          onChange={(e) => setF({ ...f, body: e.target.value })} />
      </div>
      {/* ⚠ נאמר שזו משימה לשבוע הזה בלבד — מוביל שיחשוב שהוא
          עורך את התבנית יופתע בשבוע הבא. */}
      <div className="tm-note" style={{ marginTop: 0, marginBottom: 10 }}>
        המשימה נוספת <b>לשבוע הזה בלבד</b>. שינוי הצ׳ק ליסט הקבוע הוא של
        ראש המכינה.
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }}
          disabled={busy || !f.title.trim()}
          onClick={() => {
            setBusy(true);
            api.addLeadTask({ week: d.week.id, ...f, title: f.title.trim() })
              .then(() => { say("נוסף"); onDone(); })
              .catch((e) => say(e.message)).finally(() => setBusy(false));
          }}>הוספה</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy}
          onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   בנק הפעילויות
   ------------------------------------------------------------
   ⚠⚠ **המאגר עובר בין מחזורים, וזו כל התכלית.** מוביל שבוע
     מתחיל מדף ריק, ומה שהמחזור הקודם המציא הולך לאיבוד. הלוח
     הזה אינו משוכפל במחזור חדש (shared/cycles.js).

   ⚠ **"רץ 3 פעמים, אחרון ב…" נגזר ואינו נשמר** — וזה בדיוק
     המידע שהופך רשימה למאגר: מה כבר נשחק, ומה עוד לא.
   ============================================================ */
function Activities({ d, say, reload }) {
  const [a, setA] = useState(null);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setErr(null);
    api.activities().then(setA).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) return <div className="banner-bad">{err}</div>;
  if (!a) return <div className="skel" style={{ height: 160 }} />;

  const list = a.activities.filter((x) =>
    (!kind || x.kind === kind)
    && (!q.trim() || (x.title + " " + (x.body || "") + " " + (x.gear || ""))
      .toLowerCase().includes(q.trim().toLowerCase())));

  const run = (act) => {
    setBusy(act.id);
    api.logLeadActivity({ week: d.week.id, activity: act.id })
      .then(() => { say("נרשם שהפעילות רצה"); load(); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  return (
    <>
      <div className="tm-note" style={{ marginTop: 0 }}>
        הבנק <b>נשאר בין מחזורים</b> — מה שתוסיפו כאן ישרת גם את מי שיוביל
        אחריכם. {a.archivedCount > 0 && `${a.archivedCount} מוסתרות.`}
      </div>

      <div className="fld" style={{ marginTop: 12 }}>
        <input value={q} placeholder="חיפוש בפעילויות"
          onChange={(e) => setQ(e.target.value)} />
      </div>
      <ScrollTabs className="seg">
        <button className={kind === "" ? "on" : ""} onClick={() => setKind("")}>הכול</button>
        {a.kinds.map((k) => (
          <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k}</button>
        ))}
      </ScrollTabs>

      {list.length === 0 && (
        <div className="empty">
          <div className="e1">{q || kind ? "אין התאמות" : "הבנק ריק"}</div>
          <div className="e2">כל פעילות שהרצתם שווה דקה של כתיבה — היא תחסוך שעה למי שיבוא.</div>
        </div>
      )}

      <div className="rows">
        {list.map((x) => (
          <div className="tm-entry" key={x.id}>
            <button className="tm-entry-h" onClick={() => setOpen(open === x.id ? null : x.id)}>
              <div style={{ minWidth: 0 }}>
                <div className="tm-entry-t">{x.title}</div>
                <div className="tm-entry-m">
                  <span>{x.kind}</span>
                  {x.minutes != null && <span>· {x.minutes} דק׳</span>}
                  {x.people != null && <span>· עד {x.people}</span>}
                  {/* ⚠ "רץ 0 פעמים" אינו מוצג — מספר שאין מאחוריו
                      דבר נראה כמו נתון (4ג). */}
                  {x.uses > 0 && <span>· רץ {x.uses} פעמים</span>}
                  {x.lastUsed && <span>· אחרון {dmy(x.lastUsed)}</span>}
                </div>
              </div>
              <I.chev style={{ transform: open === x.id ? "rotate(-90deg)" : "none" }} />
            </button>
            {open === x.id && (
              <div className="tm-entry-b">
                {x.body && <div className="tm-pre">{x.body}</div>}
                {x.gear && <div className="tm-note">ציוד: {x.gear}</div>}
                {x.link && (
                  <div className="tm-note">
                    <a className="tm-link" href={x.link} target="_blank" rel="noreferrer">קישור</a>
                  </div>
                )}
                {x.by && <div className="tm-entry-m"><span>הוסיף · {x.by}</span></div>}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {d.me.edit && (
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                      disabled={busy === x.id} onClick={() => run(x)}>
                      <I.check />רצה השבוע
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm ev-del" disabled={busy === x.id}
                    onClick={() => {
                      setBusy(x.id);
                      api.deleteActivity(x.id)
                        .then((r) => { say(r.message || "נמחק"); load(); })
                        .catch((e) => say(e.message)).finally(() => setBusy(null));
                    }}>מחיקה</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <AddActivity kinds={a.kinds} say={say}
          onDone={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><I.plus />פעילות חדשה לבנק</button>
      )}
    </>
  );
}

function AddActivity({ kinds, say, onDone, onCancel }) {
  const [f, setF] = useState({
    title: "", kind: kinds[0], body: "", minutes: "", people: "", gear: "", link: "",
  });
  const [busy, setBusy] = useState(false);
  return (
    <div className="card lift" style={{ marginTop: 10 }}>
      <div className="fld">
        <label>שם הפעילות</label>
        <input value={f.title} autoFocus disabled={busy}
          onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="fld">
        <label>סוג</label>
        <select value={f.kind} disabled={busy}
          onChange={(e) => setF({ ...f, kind: e.target.value })}>
          {kinds.map((k) => <option key={k}>{k}</option>)}
        </select>
      </div>
      <div className="fld">
        <label>איך מריצים</label>
        <textarea rows={4} value={f.body} disabled={busy}
          placeholder="שלב אחר שלב, כדי שמי שלא היה שם יוכל להריץ את זה"
          onChange={(e) => setF({ ...f, body: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="fld" style={{ flex: 1 }}>
          <label>דקות</label>
          {/* ⚠ numeric ולא decimal — זו כמות, לא כסף (5ג). */}
          <input inputMode="numeric" value={f.minutes} disabled={busy}
            placeholder="ריק = לא צוין"
            onChange={(e) => setF({ ...f, minutes: e.target.value })} />
        </div>
        <div className="fld" style={{ flex: 1 }}>
          <label>עד כמה משתתפים</label>
          <input inputMode="numeric" value={f.people} disabled={busy}
            onChange={(e) => setF({ ...f, people: e.target.value })} />
        </div>
      </div>
      <div className="fld">
        <label>ציוד</label>
        <input value={f.gear} disabled={busy}
          onChange={(e) => setF({ ...f, gear: e.target.value })} />
      </div>
      <div className="fld">
        <label>קישור</label>
        <input dir="ltr" value={f.link} disabled={busy}
          onChange={(e) => setF({ ...f, link: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1 }}
          disabled={busy || !f.title.trim()}
          onClick={() => {
            setBusy(true);
            api.addActivity({ ...f, title: f.title.trim() })
              .then(() => { say("נוספה לבנק"); onDone(); })
              .catch((e) => say(e.message)).finally(() => setBusy(false));
          }}>הוספה</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy}
          onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}

/* ============================================================
   מסירה וסיכום
   ------------------------------------------------------------
   ⚠⚠ **שני שדות ושני נמענים.** הסיכום מופנה לצוות ומתאר מה
     היה; המסירה מופנית למובילים הבאים ומתארת מה נשאר פתוח.
     שדה אחד לשניהם הוא מסמך שאיש משניהם אינו קורא.

   ⚠ **והמסירה של הקודמים מוצגת למעלה** — זו כל התכלית: מי
     שנכנס לשבוע צריך לדעת מה נשאר פתוח, ולא לשאול בוואטסאפ.
   ============================================================ */
function Handover({ d, say, reload }) {
  const [hand, setHand] = useState(d.week.handover || "");
  const [sum, setSum] = useState(d.week.summary || "");
  const [busy, setBusy] = useState(null);

  const save = (send) => {
    setBusy(send ? "send" : "save");
    api.saveLeadWeek({ week: d.week.id, handover: hand, summary: sum, send })
      .then(() => { say(send ? "הסיכום נשלח לצוות" : "נשמר"); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  return (
    <>
      {d.prev && (
        <>
          <div className="grp-h"><span>מה מסרו לנו · שבוע {d.prev.num || d.prev.name}</span></div>
          {d.prev.handover
            ? <div className="tm-pre lw-prev">{d.prev.handover}</div>
            : <div className="tm-note" style={{ marginTop: 0 }}>
                המובילים הקודמים לא כתבו מסירה.
              </div>}
        </>
      )}

      <div className="grp-h"><span>מסירה למובילים הבאים</span></div>
      <div className="card lift">
        <div className="fld">
          <label>מה נשאר פתוח, ומה כדאי שיֵדעו</label>
          <textarea rows={5} value={hand} disabled={Boolean(busy) || !d.me.edit}
            placeholder="מה לא הספקנו, במי צריך לטפל, ומה למדנו שכדאי לדעת מראש"
            onChange={(e) => setHand(e.target.value)} />
        </div>
        {d.me.edit && (
          <button className="btn btn-ghost" disabled={Boolean(busy)}
            onClick={() => save(false)}>שמירת המסירה</button>
        )}
      </div>

      <div className="grp-h"><span>סיכום לצוות</span></div>
      <div className="card lift">
        <div className="fld">
          <label>איך היה השבוע</label>
          <textarea rows={5} value={sum} disabled={Boolean(busy) || !d.me.edit}
            placeholder="מה עבד, מה פחות, ומה שווה לשנות בפעם הבאה"
            onChange={(e) => setSum(e.target.value)} />
        </div>
        {/* ⚠ **"נשלח" הוא חותמת ולא דגל** — תאריך אומר מתי, ודגל
            בוליאני אינו אומר דבר חוץ מ"פעם". ובלי החיווי הזה
            המוביל אינו יודע אם מישהו קיבל את מה שכתב. */}
        {d.week.summarySent && (
          <div className="tm-note" style={{ marginTop: 0, marginBottom: 10 }}>
            נשלח לצוות ב-{dmy(d.week.summarySent)}.
          </div>
        )}
        {d.me.edit && (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} disabled={Boolean(busy)}
              onClick={() => save(false)}>שמירה</button>
            <button className="btn btn-primary" style={{ flex: 1 }}
              disabled={Boolean(busy) || !sum.trim()} onClick={() => save(true)}>
              <I.send />{d.week.summarySent ? "שליחה שוב" : "שליחה לצוות"}
            </button>
          </div>
        )}
      </div>

      {/* ⚠ המשוב **נקרא ואינו נערך כאן** — הוא של הצוות, ודף
          המובילשיות הוא המקום שלו (5ד). שני קולות, שני שדות. */}
      {d.week.feedback && (
        <>
          <div className="grp-h"><span>המשוב שהצוות כתב</span></div>
          <div className="tm-pre lw-prev">{d.week.feedback}</div>
          {d.week.feedbackBy && (
            <div className="tm-entry-m"><span>{d.week.feedbackBy}</span></div>
          )}
        </>
      )}
    </>
  );
}
