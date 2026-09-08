/* ============================================================
   הנתונים שלי · מה חדש
   ------------------------------------------------------------
   ⚠⚠ **שני דברים במסך אחד, ולא במקרה.** שניהם עונים על שאלה
     שאיש אינו יודע איפה לשאול: "מה יש כאן עליי" ו"מה השתנה".
     שני מסכים נפרדים היו שניהם מסכים שאיש לא ימצא.

   ⚠ **וזה מסך של הצהרה ולא של ייצוא.** כל שורה נושאת מאיפה
     הנתון הגיע ומי רואה אותו — ראו api/_mydata.js.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScrollTabs from "./Tabs.jsx";
import { WHATS_NEW, newsFor, latestNews, recentTags } from "../shared/whats-new.js";

const DI = {
  me: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>),
  news: (p) => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 5h13v14H4z" /><path d="M17 9h3v8a2 2 0 01-3 1.7" /><path d="M7 9h7M7 13h7" /></svg>),
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};

const SEEN = "kx-news-seen";

/** ⚠ עטוף — localStorage נופל בגלישה בסתר (ראו src/prefs.js). */
const readSeen = () => { try { return localStorage.getItem(SEEN) || ""; } catch { return ""; } };
const writeSeen = (v) => { try { localStorage.setItem(SEEN, v); } catch { /* ריק */ } };

/** האם יש חדשות שטרם נקראו. משמש גם את הכפתור במגירה. */
export const hasNews = (isStudent) => latestNews(isStudent) !== readSeen();

/* ============================================================
   "מה חדש?" — הרצועה בראש מסך הבית
   ------------------------------------------------------------
   ⚠ **כותרות בלבד.** "חדר כביסה", "משמר" — לא פסקה ולא רשימה.
     מי שרוצה לדעת מה בדיוק נכנס לוחץ ונכנס למסך "מה חדש";
     פסקה בראש מסך הבית היא הדבר שמפסיקים לקרוא ביום השני.

   ⚠ **נעלמת אחרי שקראו, ולא הופכת לקישוט קבוע.** ברגע
     שנכנסו למסך "מה חדש" הרצועה יורדת עד הרשומה הבאה — אחרת
     היא תופסת את השורה הראשונה של מסך הבית לנצח, ואז היא
     כבר לא אומרת "חדש".

   ⚠ **וגם חלון של שלושה שבועות.** רשומה מלפני חצי שנה אינה
     חדשה גם אם איש לא פתח את המסך, ורצועה שמכריזה עליה
     מלמדת להתעלם ממנה (recentTags).

   ⚠ **מחזירה null כשאין מה לומר** — לא קופסה ריקה ולא
     "אין חדשות". רכיב שתמיד תופס מקום הוא רעש.
   ============================================================ */
export function NewsStrip({ isStudent = true, onOpen }) {
  const [seen, setSeen] = useState(readSeen);
  const latest = latestNews(isStudent);
  const tags = recentTags(isStudent);
  if (!tags.length || latest === seen) return null;

  /* ⚠ סימון כנקרא **גם בסגירה** ולא רק בפתיחה: מי שבחר לא
     להיכנס החליט, ורצועה שחוזרת מחר אחרי שסגרו אותה היא
     בדיוק ההתנהגות שגורמת לאנשים להתעלם. */
  const dismiss = (e) => { e.stopPropagation(); writeSeen(latest); setSeen(latest); };

  return (
    <button className="news-strip" onClick={onOpen}>
      <div className="ns-h">
        <b>מה חדש?</b>
        <span className="ns-x" role="presentation" onClick={dismiss}>סגירה</span>
      </div>
      <div className="ns-tags">
        {tags.map((t) => <span className="ns-tag" key={t}>{t}</span>)}
      </div>
    </button>
  );
}

export default function MyDataPage({ say, isStudent = true, sub0 }) {
  const [view, setView] = useState(sub0 === "news" ? "news" : "data");
  return (
    <>
      <div className="screen-title">הנתונים שלי</div>
      <ScrollTabs className="seg">
        <button className={view === "data" ? "on" : ""} onClick={() => setView("data")}>
          <DI.me />מה רשום עליי
        </button>
        <button className={view === "news" ? "on" : ""} onClick={() => setView("news")}>
          <DI.news />מה חדש
        </button>
      </ScrollTabs>
      {view === "data" && <MyData say={say} isStudent={isStudent} />}
      {view === "news" && <News isStudent={isStudent} />}
    </>
  );
}

function MyData({ say, isStudent }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(() => {
    setErr(null);
    api.myData().then(setD).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) {
    return (
      <div className="empty">
        <div className="e1">{isStudent ? "לא ניתן לטעון" : "אין מה להציג"}</div>
        <div className="e2">{err}</div>
      </div>
    );
  }
  if (!d) return <div className="skel" style={{ height: 200 }} />;

  return (
    <>
      <div className="md-intro">
        {/* ⚠ ההצהרה קודמת לנתונים — היא הסיבה שהמסך קיים. */}
        כאן רשום <b>כל מה שהמערכת מחזיקה עליך</b>, מאיפה כל פרט הגיע, ומי
        רואה אותו.
      </div>

      {/* ⚠ הצהרה חלקית שנראית מלאה היא ההפך ממה שהמסך נועד לו. */}
      {d.failed && d.failed.length > 0 && (
        <div className="note-warn" style={{ marginBottom: 12 }}>
          {d.failed.length === 1 ? "חלק אחד לא נטען" : `${d.failed.length} חלקים לא נטענו`}
          {" — " + d.failed.join(" · ")}. הרשימה למטה חלקית.
        </div>
      )}

      {d.groups.map((g) => (
        <React.Fragment key={g.title}>
          <div className="grp-h"><span>{g.title}</span></div>
          <div className="rows">
            {g.items.map((f) => (
              <div className="md-row" key={f.label}>
                <div className="md-l">{f.label}</div>
                <div className="md-v">
                  {/* ⚠ ריק נאמר במילים ואינו מוצג כמחרוזת ריקה,
                      שנראית כמו תקלת תצוגה (4ט). */}
                  {f.value == null
                    ? <span className="tm-faint">לא הוזן</span>
                    : String(f.value)}
                </div>
                <div className="md-m">
                  <span className="md-tag">{f.from}</span>
                  <span className="md-tag md-who">רואים: {f.who}</span>
                </div>
                {f.note && <div className="md-n">{f.note}</div>}
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}

      <div className="tm-note">
        רוצה לתקן משהו? פרטי הזהות מתוקנים על ידי הצוות במסך החניכים; שם
        המשתמש והאימייל — בפרופיל שלך; המיונים והשיבוץ — במסך "מיונים
        ושיבוצים", ואתה היחיד שכותב שם.
      </div>
    </>
  );
}

/* ============================================================
   מה חדש
   ------------------------------------------------------------
   ⚠ **"נקרא" הוא מזהה של הרשומה האחרונה ולא דגל.** דגל בוליאני
     היה נשאר דלוק לנצח, ורשומה חדשה לא הייתה מסמנת את עצמה.
     המזהה נגזר מהתוכן — ולכן דיפלוי שאינו מוסיף רשומה אינו
     מדליק את הסימון (4כו).

   ⚠ **ונשמר במכשיר ולא בשרת.** "מה חדש" הוא של המכשיר בדיוק
     כמו העדפות התצוגה, ואינו מצדיק כתיבה ללוח בכל פתיחה.
   ============================================================ */
function News({ isStudent }) {
  const list = newsFor(isStudent);
  const seen = readSeen();

  /* ⚠ מסומן כנקרא **בכניסה למסך**, ולא בלחיצה על כפתור:
     מי שקרא, קרא. */
  useEffect(() => { writeSeen(latestNews(isStudent)); }, [isStudent]);

  if (!list.length) {
    return <div className="empty"><div className="e1">אין עדיין רשומות</div></div>;
  }

  return (
    <>
      <div className="md-intro">
        מה נוסף לאפליקציה, לפי סדר. {WHATS_NEW.length > list.length && (
          <>חלק מהרשומות אינן מוצגות כאן כי הן נוגעות למסכים שאינם שלך.</>
        )}
      </div>
      {list.map((n, i) => {
        const isNew = i === 0 && `${n.date}:${n.title}` !== seen;
        return (
          <div className={"md-news" + (isNew ? " on" : "")} key={n.date + n.title}>
            <div className="md-news-h">
              <div className="md-news-t">{n.title}</div>
              <div className="md-news-d">
                {isNew && <span className="pill p-ok">חדש</span>}
                {dmy(n.date)}
              </div>
            </div>
            <ul className="md-news-l">
              {n.items.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        );
      })}
    </>
  );
}
