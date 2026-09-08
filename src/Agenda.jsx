/* ============================================================
   הלו״ז — היום ושבועיים קדימה
   ------------------------------------------------------------
   נמשך מיומן Google של המכינה. אותו מסך לחניכים ולצוות.

   ⚠ צפייה בלבד. אין כאן כפתור עריכה ולא תהיה נקודת קצה
     שכותבת: היומן נערך ב-Google, והאפליקציה מציגה אותו.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";

const AI = {
  cal: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  pin: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>,
};

const DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const dowOf = (iso) => DOW[new Date(iso + "T12:00:00Z").getUTCDay()];
const dayLabel = (iso) =>
  `יום ${dowOf(iso)}, ${Number(iso.slice(8, 10))} ב${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/* ============================================================
   מסך הבית נטען בבת אחת
   ------------------------------------------------------------
   ⚠⚠ **הבעיה שזה פותר:** מסך הבית מורכב מחמישה-שישה מקורות
     שכל אחד נטען לבד, וכרטיס הלו״ז — שמושך 787KB מ-Google —
     קפץ פנימה שניות אחרי השאר ודחף את כל המסך למטה. מסך
     ש"מתיישב" בשלבים נראה שבור, גם כשכל חלק בו תקין.

   ⚠ **הרכיבים מורכבים ומביאים את הנתונים שלהם, ורק התצוגה
     מוסתרת** (`hidden`, לא אי-רינדור). אחרת כרטיס שנטען רק
     כשהוא מורכב לעולם לא היה מסיים לטעון, והשער היה נעול
     על עצמו.

   ⚠ **תקרה של חמש שניות.** מקור שנפל או שנתקע אינו מחזיק את
     כל המסך כבן ערובה — אחרי התקרה מציגים מה שיש, וכל כרטיס
     מציג את מצבו שלו (עיקרון 6 בגרסה של זמן).
   ============================================================ */
const HOME_GATE_MS = 5000;
export function useHomeGate(expected) {
  const [settled, setSettled] = React.useState(0);
  const [late, setLate] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setLate(true), HOME_GATE_MS);
    return () => clearTimeout(t);
  }, []);
  const bump = React.useCallback(() => setSettled((n) => n + 1), []);
  return { ready: late || settled >= expected, bump };
}

function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);
  const run = React.useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

/* ⚠ "עכשיו" נקבע בשעון המכשיר ולא בשרת: הלו״ז מוצג לאדם
   שעומד במכינה, והשעה שרלוונטית לו היא זו שעל הטלפון. */
const hm = (t) => {
  const m = String(t || "").match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** דקות מתחילת היום, לפי שעון המכשיר. */
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

/** ההתחלה והסיום של אירוע בדקות. אירוע בלי סיום — שעה. */
const spanOf = (e) => {
  const a = hm(e && e.time);
  if (a == null) return null;
  const b = hm(e && e.endTime);
  return { from: a, to: b == null ? a + 60 : b };
};

/* ⚠ אירוע "כל היום" אינו מסומן כ"עכשיו" — הוא נכון לכל שעה,
   והסימון לא היה אומר דבר. ומאותה סיבה הוא גם לעולם אינו
   "הסתיים": יום חופש אינו נגמר ב-14:00. */
function isNow(e, cur = nowMinutes()) {
  if (!e || e.allDay) return false;
  const s = spanOf(e);
  return Boolean(s) && cur >= s.from && cur < s.to;
}

function isDone(e, cur = nowMinutes()) {
  if (!e || e.allDay) return false;
  const s = spanOf(e);
  return Boolean(s) && cur >= s.to;
}

/* ============================================================
   ⚠⚠ **שעון שמתקדם, ולא צילום של רגע הטעינה.**

   הלו״ז נטען פעם אחת בבוקר ונשאר תקוע שם: `isNow` חושב את
   השעה **ברינדור**, ובלי רינדור נוסף היא נשארת השעה שבה
   המסך נפתח. מי שהשאיר את האפליקציה פתוחה ראה ב-16:00 את
   מה שהיה נכון ב-08:00 — כלומר "הלו״ז של היום" הפך לתדריך
   בוקר, וזה בדיוק מה שהמסך לא אמור להיות.

   ⚠ **דקה, ולא שנייה.** הלו״ז מדויק לדקה, ורינדור כל שנייה
     הוא 60 רינדורים מיותרים בדקה על מסך שמחזיק גם את הגאנט,
     גם הציטוט וגם הדירוגים.

   ⚠ **מסונכרן לתחילת הדקה** ולא כל 60 שניות מרגע הטעינה:
     אחרת מסך שנפתח ב-08:00:59 מתעדכן ב-08:01:59, כלומר
     כמעט דקה שלמה של פיגור קבוע.

   ⚠ **ונעצר כשהלשונית מוסתרת.** טיימר שרץ ברקע על טלפון
     נעול הוא סוללה, ו-`visibilitychange` ממילא מחזיר את
     המסך למצב הנכון ברגע שחוזרים אליו.
   ============================================================ */
export function useMinuteTick() {
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    let timer = null;
    const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const schedule = () => {
      stop();
      if (typeof document !== "undefined" && document.hidden) return;
      const d = new Date();
      const ms = (60 - d.getSeconds()) * 1000 - d.getMilliseconds();
      timer = setTimeout(() => { tick((n) => n + 1); schedule(); }, Math.max(1000, ms));
    };
    const onVis = () => { tick((n) => n + 1); schedule(); };
    schedule();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);
}

/* ---------- שורת אירוע ----------
   ⚠ now מסמן את מה שקורה ברגע זה — המידע היחיד במסך שמשתנה
     תוך כדי שמסתכלים עליו, וזו הסיבה שפותחים את הלו״ז. */
function EventRow({ e, now = false, done = false }) {
  return (
    <div className={"ag-ev" + (now ? " now" : "") + (done ? " done" : "")}>
      <div className="ag-time num">
        {e.allDay ? <span className="ag-allday">כל היום</span> : (
          <>
            <b>{e.time}</b>
            {e.endTime && <span>{e.endTime}</span>}
          </>
        )}
      </div>
      <div className="ag-body">
        <div className="ag-name">{e.name}</div>
        {e.location && (
          <div className="ag-loc"><AI.pin />{e.location}</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   הלו״ז של היום, לשיבוץ במסך הבית
   ------------------------------------------------------------
   ⚠⚠ **מתקדם עם היום ולא נשאר על הבוקר.** הכרטיס הציג תמיד
     את ארבעת האירועים **הראשונים** של היום, ולכן ב-16:00 הוא
     עדיין הראה את מה שהיה ב-08:00 — תדריך בוקר, לא לו״ז.

   ⚠ **מה שהסתיים יורד, ומה שקורה עכשיו נשאר בראש.** אירוע
     שעדיין רץ אינו "הסתיים" גם אם התחיל לפני שעתיים, והוא
     בדיוק המידע שמחפשים.

   ⚠ **וכשהכול נגמר הכרטיס אומר זאת ואינו נעלם.** כרטיס
     שנעלם ב-21:00 נראה כמו תקלה בטעינה; שורה שאומרת "הלו״ז
     של היום הסתיים" היא תשובה (עיקרון 6).

   ⚠ **אירוע "כל היום" תמיד נשאר.** הוא נכון בכל שעה, ואילו
     סוננו כמו השאר, יום סמינר היה נעלם מהמסך בצהריים.
   ============================================================ */
export function TodayAgenda({ onOpen, max = 4, onSettled }) {
  const { data, err, busy } = useLoad(() => api.getAgenda(), []);
  useMinuteTick();
  /* ⚠ מדווח למסך הבית שסיים — הצלחה או כישלון — כדי שהמסך
     ייפתח בבת אחת ולא יקפוץ כשהלו״ז מגיע. ראו useHomeGate. */
  React.useEffect(() => { if (!busy && onSettled) onSettled(); }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  if (busy || err || !data) return null;
  const list = data.todayEvents || [];
  if (list.length === 0) return null;

  const cur = nowMinutes();
  const live = list.filter((e) => !isDone(e, cur));
  const passed = list.length - live.length;

  if (live.length === 0) {
    return (
      <>
        <div className="sec-label">הלו״ז של היום</div>
        <button className="card ag-card" onClick={onOpen}>
          <div className="ag-done">
            הלו״ז של היום הסתיים · {list.length} פעילויות
          </div>
        </button>
      </>
    );
  }

  return (
    <>
      <div className="sec-label">הלו״ז של היום</div>
      <button className="card ag-card" onClick={onOpen}>
        {passed > 0 && <div className="ag-passed">{passed} כבר הסתיימו</div>}
        {live.slice(0, max).map((e, i) => <EventRow key={i} e={e} now={isNow(e, cur)} />)}
        {live.length > max && (
          <div className="ag-more">ועוד {live.length - max} בהמשך היום</div>
        )}
      </button>
    </>
  );
}

/* ---------- הדף ---------- */
export function AgendaPage() {
  const { data, err, busy, reload } = useLoad(() => api.getAgenda(), []);
  const [openAll, setOpenAll] = useState(false);
  useMinuteTick();

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען לו״ז…</div></div>
  );
  if (err?.setupRequired) return (
    <>
      <div className="screen-title">הלו״ז</div>
      <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <div style={{ marginBottom: 8 }}><AI.cal /></div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>היומן עדיין לא חובר</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          {err.message}
        </div>
      </div>
    </>
  );
  if (err) return (
    <div className="alert a-clay">
      <AI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הלו״ז</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  const today = data.days[0];
  const rest = data.days.slice(1);
  /* ⚠ ימים ריקים בהמשך אינם מוצגים — שורה "אין פעילות" לכל
     יום ריק הופכת שבועיים לרשימה של כלום. היום עצמו כן. */
  const withEvents = rest.filter((d) => d.events.length > 0);
  const shown = openAll ? withEvents : withEvents.slice(0, 3);

  return (
    <>
      <div className="screen-title">הלו״ז</div>

      <div className="ag-day today">
        <div className="ag-day-h">
          <b>היום · {dayLabel(today.date)}</b>
          <span className="num">{today.events.length ? `${today.events.length} פעילויות` : ""}</span>
        </div>
        {today.events.length === 0 ? (
          <div className="ag-empty">אין פעילות ביומן להיום</div>
        ) : today.events.map((e, i) => (
          <EventRow key={i} e={e} now={isNow(e)} done={isDone(e)} />
        ))}
      </div>

      <div className="sec-label">השבועיים הקרובים</div>

      {withEvents.length === 0 ? (
        <div className="attn-calm">
          <b>אין פעילות ביומן</b>
          <span>הימים הקרובים ריקים</span>
        </div>
      ) : (
        <>
          {shown.map((d) => (
            <div className="ag-day" key={d.date}>
              <div className="ag-day-h">
                <b>{dayLabel(d.date)}</b>
                <span className="num">{d.events.length}</span>
              </div>
              {d.events.map((e, i) => <EventRow key={i} e={e} />)}
            </div>
          ))}
          {withEvents.length > shown.length && (
            <button className="btn btn-ghost btn-sm" style={{ width: "100%" }}
              onClick={() => setOpenAll(true)}>
              הצגת {withEvents.length - shown.length} הימים הנותרים
            </button>
          )}
        </>
      )}

      <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600,
                    textAlign: "center", margin: "16px 0 24px", lineHeight: 1.6 }}>
        הלו״ז נמשך מיומן המכינה ומתעדכן מעצמו. שינויים נעשים ביומן.
      </div>
    </>
  );
}
