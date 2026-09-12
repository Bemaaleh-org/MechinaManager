/* ============================================================
   ניווט — חץ חזרה בראש, וסרגל קבוע בתחתית
   ------------------------------------------------------------
   הבקשה: *"אני רוצה שתמיד יהיה חץ חזרה… בכללי אני רוצה
   שתחשוב ותיצור לי navigation bar או בכללי התמצאות יותר קלה
   ואינטואיטיבית באפליקציה."*

   שלושה משטחי ניווט, ולכל אחד שאלה משלו:

     **החץ**    — לאן חזרתי (לינארי, לפי מה שעשיתי)
     **הסרגל**  — ארבעת המסכים שאני בהם כל יום (קבוע)
     **המגירה** — המפה המלאה (כל מה שקיים)

   ⚠⚠ **הסרגל אינו מחליף את המגירה.** ארבעה יעדים בתחתית
     המסך הם מה שאדם פותח מדי יום, ומגירה שדורשת שתי נגיעות
     לכל אחד מהם היא מה שגרם למי שרוצה את הלו״ז לחפש אותו
     בכל פעם מחדש. מה שאינו נפתח כל יום נשאר במגירה — ארבעה
     יעדים הם ארבעה, ורשימה של שנים־עשר בתחתית המסך היא שוב
     רשימה שקוראים את שלושת הפריטים הראשונים שלה.

   ⚠ **והיעדים נבחרים בכל מעטפת בנפרד**, כמו קבוצות המגירה:
     הצוות פותח את היום בבקשות ובחניכים, והחניך בלו״ז. רשימה
     אחת לשתיהן הייתה נכונה לאחת מהן (4יט בכיוון ההפוך —
     **אותם רכיבים, ולא בהכרח אותו סדר יום**).
   ============================================================ */

import React from "react";

/* ============================================================
   חץ החזרה
   ------------------------------------------------------------
   ⚠ **נושא את שם היעד ולא רק חץ.** "חזרה" לבדו מחייב לזכור
     מאיפה באת, וזו בדיוק השאלה שהכפתור נועד לענות עליה.

   ⚠ **ואינו מוצג כשאין לאן לחזור** — ולא מושבת: כפתור
     מושבת בפינה שמעולם אינו נלחץ מלמד להתעלם מהפינה. כאן
     ההיעלמות אינה "מזיזה את הכותרת" כמו בדפדוף החודשים
     (4פ), כי הוא נמצא **לפני** ההמבורגר ושניהם באותו גודל.
   ============================================================ */
export function BackButton({ nav }) {
  if (!nav || !nav.canBack) return null;
  return (
    <button className="nv-back" onClick={nav.back}
      aria-label={"חזרה אל " + (nav.backLabel || "המסך הקודם")}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <span>{nav.backLabel}</span>
    </button>
  );
}

const NI = {
  home: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>,
  day: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>,
  users: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4" /><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.4-1-4.1-2.6-5" /></svg>,
  out: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h14v18l-7-4-7 4V3z" /></svg>,
  tick: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="17" rx="2.4" /><path d="M8 12.5 11 15.5 16.5 9.5" /></svg>,
  book: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5z" /><path d="M4 17.5h16" /></svg>,
  cart: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2l2.4 11h10.2l2-7H6.2" /><circle cx="9" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></svg>,
  more: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

/** האייקונים הזמינים לסרגל — מסך בלי ערך במפה מקבל ברירת מחדל (4יא) */
export const NAV_ICON = NI;

/**
 * items: [{ key, label, icon, active, badge?, onClick }]  עד ארבעה
 * onMore: פותח את המגירה
 */
export function NavBar({ items, onMore }) {
  const four = (items || []).slice(0, 4);
  return (
    <nav className="nv" aria-label="ניווט מהיר">
      {four.map((it) => (
        <button key={it.key} className={"nv-i" + (it.active ? " on" : "")}
          onClick={it.onClick} aria-current={it.active ? "page" : undefined}>
          <span className="nv-ic">
            {it.icon}
            {/* ⚠ המונה הוא כל התועלת — בלעדיו הסרגל אינו אומר
                אם יש שם משהו (4כו). */}
            {!!it.badge && <i className="nv-b">{it.badge > 99 ? "99+" : it.badge}</i>}
          </span>
          <span className="nv-l">{it.label}</span>
        </button>
      ))}
      <button className="nv-i" onClick={onMore} aria-label="כל המסכים">
        <span className="nv-ic"><NI.more width="21" height="21" /></span>
        <span className="nv-l">עוד</span>
      </button>
    </nav>
  );
}

/* ============================================================
   ⚠ קידומת `nv-` — נבדקה ב-grep לפני שנכתבה.

   ⚠⚠ **`.kx.has-nv` ולא `.kx`** — מסך הכניסה מגדיר לעצמו
     רקע ומרווחים באותה דרגת ספציפיות, וכלל על `.kx` היה
     מוסיף לו ריפוד תחתון בשביל סרגל שאינו מוצג שם (4ג).

   ⚠ **`env(safe-area-inset-bottom)`** — באייפון עם פס הבית
     סרגל צמוד לתחתית יושב מתחת לפס ואי אפשר ללחוץ עליו.

   ⚠ **`position:sticky` ולא `fixed`** — `fixed` בתוך מכל
     שנגלל בטלפון קופץ בזמן הגלילה ברוב הדפדפנים הניידים.
   ============================================================ */
export const NAVBAR_CSS = `
/* ---------- חץ החזרה ---------- */
.kx .nv-back{display:flex;align-items:center;gap:4px;min-height:40px;min-width:0;max-width:62%;
  padding:0 10px 0 7px;border-radius:12px;border:1.5px solid var(--line2);
  background:var(--surface);color:var(--ink);font-size:13.5px;font-weight:800;
  flex:0 1 auto;transition:all 120ms var(--ease)}
.kx .nv-back:active{transform:scale(.97)}
.kx .nv-back span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* ⚠ החץ מצביע ימינה ב-RTL — ‎path‎ אחד, והיפוך בטרנספורם. */
.kx .nv-back svg{flex:0 0 auto;transform:scaleX(-1)}

/* ---------- הסרגל התחתון ---------- */
/* ⚠⚠ **flex ולא רק sticky.** position:sticky;bottom:0
   מצמיד את הסרגל לתחתית החלון רק כשמקומו הטבעי בזרימה נמצא
   **מתחת** לחלון — כלומר בדף ארוך. בדף קצר (מצב טעינה, מסך
   ריק) מקומו הטבעי הוא מיד אחרי התוכן, והוא נראה תלוי באמצע
   המסך. זה נתפס בצילום מסך ולא בבנייה. עמודת flex עם
   ‎main{flex:1}‎ פותרת את שני המצבים: בזרימה הוא בתחתית,
   ו-sticky שומר אותו גלוי בגלילה. */
.kx.has-nv{display:flex;flex-direction:column;min-height:100vh;padding-bottom:0}
/* ⚠⚠ **width:100% על main — בלעדיו כל הדף גלש לצדדים.**
   .wrap נושא max-width:640px ו-margin:0 auto; בזרימת בלוק
   זה נותן min(640, רוחב המסך), אבל בעמודת flex השוליים
   האוטומטיים מבטלים את ה-stretch והפריט מקבל את רוחב התוכן
   שלו — 598px בטלפון של 375. נתפס במדידת scrollWidth. */
.kx.has-nv main{flex:1 0 auto;width:100%;min-width:0;padding-bottom:14px}
.nv{position:sticky;bottom:0;z-index:25;display:flex;align-items:stretch;
  gap:2px;padding:6px 6px calc(6px + env(safe-area-inset-bottom));
  background:var(--surface);border-top:1px solid var(--line);
  box-shadow:0 -8px 24px -18px rgba(47,38,22,.35)}
.kx .nv-i{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:3px;min-height:52px;padding:5px 2px;border:none;
  border-radius:13px;background:transparent;color:var(--faint);
  transition:all 120ms var(--ease)}
.kx .nv-i:active{transform:scale(.95)}
.kx .nv-i.on{background:var(--accent-soft);color:var(--accent)}
.nv-ic{position:relative;display:flex;align-items:center;justify-content:center;
  width:22px;height:22px}
.nv-ic svg{width:21px;height:21px}
.nv-l{font-size:11px;font-weight:800;line-height:1;max-width:100%;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.nv-b{position:absolute;top:-5px;left:-7px;min-width:16px;height:16px;padding:0 4px;
  display:flex;align-items:center;justify-content:center;border-radius:999px;
  background:var(--clay);color:#fff;font-size:10px;font-weight:900;font-style:normal;
  line-height:1}
/* ⚠⚠ **הסרגל דרס את כפתורי השמירה.** פס הפעולה .sticky
   (שמירת הסימון, שמירת ספירה ועוד 16 מסכים) הוא position:fixed
   במרחק 10px מתחתית החלון — בדיוק איפה שהסרגל יושב, ומתחתיו
   בסדר השכבות. עכשיו הוא עולה מעל הסרגל בגובהו המלא: 6+52+6
   של הכפתורים, קו עליון, ופס הבית של אייפון.
   ⚠ והסרגל ירד ל-z-index:25 — מתחת לרשימות נפתחות (30),
     לפאנל ההתראות (39) ולכותרת (40). הוא צריך לעמוד מעל תוכן
     רגיל, ולא מעל שום דבר שנפתח מעליו. */
.kx.has-nv .sticky{bottom:calc(75px + env(safe-area-inset-bottom))}
.kx.has-nv .toast{bottom:calc(84px + env(safe-area-inset-bottom))}
@media (prefers-reduced-motion: reduce){
  .kx .nv-i:active,.kx .nv-back:active{transform:none}
}
`;
