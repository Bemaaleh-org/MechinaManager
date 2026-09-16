/* ============================================================
   בורר מצב המפתח — אחראי בינה
   ------------------------------------------------------------
   הבקשה: *"תפריט נפתח מתחת למסך של 'בוקר טוב עומר', מן חץ שבו
   הוא יכול לעבור לדף המפתח ואז יהיה לו תפריט כמו של האחים
   וכמובן יוכל להחליף חזרה לדף של 'עומר החניך'."*

   ⚠⚠ **מוצג רק ל-`isDev`.** לכל שאר המשתמשים הרכיב מחזיר
     `null` ואינו מרנדר דבר — לא כפתור מושבת ולא רמז. בורר
     שמופיע לכולם ופותח רק לאחד הוא בדיוק 4יד.

   ⚠⚠ **והמעבר טוען מחדש את האפליקציה.** זה נראה כמו קיצור דרך
     והוא ההפך: כל מסך שכבר נטען מחזיק בזיכרון נתונים של המצב
     הקודם — רשימת חניכים מסוננת, דגלים, מטמון. מעבר "חלק"
     היה משאיר תצוגת מפתח עם נתוני חניך, וזה נראה כמו באג
     במקרה הטוב ודליפה במקרה הרע.

   ⚠ **המצב במכשיר ולא בשרת** (`src/api.js`), כמו העדפות
     התצוגה (5יד): זו בחירה של המכשיר, והיא שורדת רענון.

   ⚠ **והשרת אינו סומך על כלום מכאן.** ההרשאה נגזרת מהתפקיד
     בלוח בכל בקשה; הכותרת רק בוחרת בין שני מצבים שכבר
     מגיעים לו.
   ============================================================ */
import { useState } from "react";
import { setDevMode } from "./api.js";

/**
 * @param isDev    האם המשתמש רשאי בכלל. ⚠ מהשרת.
 * @param devMode  האם הוא נמצא במצב מפתח **עכשיו**. ⚠ מהשרת.
 * @param name     שמו הפרטי, לניסוח "עומר החניך".
 */
export function DevSwitch({ isDev, devMode, name }) {
  const [open, setOpen] = useState(false);
  if (!isDev) return null;

  const go = (on) => {
    if (on === devMode) { setOpen(false); return; }
    setDevMode(on);
    /* ⚠ ראו ההערה בראש הקובץ — טעינה מחדש ולא החלפת state. */
    window.location.reload();
  };

  const who = name ? `${name} החניך` : "תצוגת חניך";

  return (
    <div className="dvs">
      <button type="button" className="dvs-btn" onClick={() => setOpen((v) => !v)}
        aria-expanded={open}>
        <span className={"dvs-dot" + (devMode ? " on" : "")} />
        <b>{devMode ? "דף המפתח" : who}</b>
        <span className={"dvs-chev" + (open ? " open" : "")}>⌄</span>
      </button>

      {open && (
        <div className="dvs-menu">
          <button type="button" className={"dvs-item" + (devMode ? "" : " sel")}
            onClick={() => go(false)}>
            <b>{who}</b>
            <span>המסכים שלך כחניך — בקשות, דירוגים, תורנויות</span>
          </button>
          <button type="button" className={"dvs-item" + (devMode ? " sel" : "")}
            onClick={() => go(true)}>
            <b>דף המפתח</b>
            <span>תצוגת הצוות המלאה, לפיתוח ובדיקה</span>
          </button>
          {/* ⚠⚠ **המחיר מוצהר, כמו בכל מקום אחר במערכת.**
              מפתח שלא יידע מה הוא רואה עלול לקרוא נתונים
              אישיים של חבריו בלי לשים לב. */}
          <div className="dvs-note">
            בדף המפתח נפתחים נתונים אישיים של חניכים אחרים.
            כשלא צריך אותם — כדאי לחזור לתצוגת חניך.
          </div>
        </div>
      )}
    </div>
  );
}

export const DEVSWITCH_CSS = `
/* ⚠ קידומת dvs- — נבדקה ב-grep לפני שנכתבה.
   ⚠ ו-.kx מלא על הכפתורים: .kx button מאפסת רקע ומסגרת
     בסגוליות גבוהה יותר (4מח). */
/* ⚠⚠ **הרכיב יושב מתחת לכרטיס הפתיח ולא בתוכו.**
   כשהוא היה בפנים, overflow:hidden של הכרטיס חתך את
   התפריט לגמרי — הכפתור נראה ולא עשה כלום. ולכן
   הצבעים כאן הם של רקע **בהיר** ולא לבן-על-כהה:
   כפתור לבן על קרם היה בלתי נראה — אותה תקלה, מראה אחר. */
.dvs{position:relative;margin:-8px 0 14px}
.kx .dvs-btn{display:inline-flex;align-items:center;gap:7px;
  padding:6px 13px;border-radius:999px;
  background:var(--surface);border:1px solid var(--line2);box-shadow:var(--sh-1);
  color:var(--ink);font:inherit;font-size:12.5px;font-weight:800;cursor:pointer}
.dvs-dot{width:7px;height:7px;border-radius:99px;background:var(--faint)}
.dvs-dot.on{background:#177A45}
.dvs-chev{font-size:13px;line-height:1;transition:transform .12s var(--ease)}
.dvs-chev.open{transform:rotate(180deg)}
.dvs-menu{position:absolute;z-index:30;inset-inline-start:0;top:calc(100% + 6px);
  min-width:236px;max-width:min(88vw,300px);
  background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-md);box-shadow:var(--sh-2);overflow:hidden}
.kx .dvs-item{display:flex;flex-direction:column;gap:2px;width:100%;
  text-align:start;padding:10px 13px;background:var(--surface);border:0;
  border-bottom:1px solid var(--line);font:inherit;cursor:pointer;color:var(--ink)}
.kx .dvs-item:hover{background:var(--sand)}
.kx .dvs-item.sel{background:var(--accent-soft)}
.dvs-item b{font-size:13.5px;font-weight:800}
.dvs-item span{font-size:11.5px;font-weight:600;color:var(--faint);line-height:1.4}
.dvs-note{padding:9px 13px;font-size:11px;font-weight:600;
  color:var(--faint);line-height:1.5;background:var(--sand)}
`;
