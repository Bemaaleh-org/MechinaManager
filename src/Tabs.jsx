/* ============================================================
   רצועת לשוניות שנגללת, עם חצים
   ------------------------------------------------------------
   ⚠ **הבעיה שהרכיב הזה פותר: לשונית שנבלעת אינה קיימת.**
     רצועה עם `overflow-x:auto` נראית שלמה כשהיא נחתכת — אין
     פס גלילה במגע, ואין שום רמז שיש עוד. משתמש שלא יודע
     שאפשר להחליק פשוט לא מגיע ללשונית החמישית.

   ⚠ **החצים מופיעים רק כשיש מה לגלול**, ונעלמים בקצוות. חץ
     שתמיד שם ולוחצים עליו ולא קורה כלום מלמד להתעלם ממנו.

   ⚠ **והם `aria-hidden`**: הרצועה עצמה נגישה במקלדת (Tab בין
     הכפתורים), והחצים הם עזר עכבר-ומגע בלבד. קורא מסך שיקריא
     "כפתור, כפתור" בין כל לשונית מייצר רעש ולא עזרה.

   ⚠ **הגלילה מדודה לפי רוחב הרצועה** ולא בפיקסלים קבועים —
     80% מהרוחב הנראה, כדי שתמיד תישאר לשונית אחת מוכרת על
     המסך ומי שגולל לא יאבד את ההקשר.
   ============================================================ */

import React, { useRef, useState, useEffect, useCallback } from "react";

const AR = {
  l: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  r: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 5l7 7-7 7"/></svg>,
};

/**
 * @param className  המחלקה של הרצועה עצמה — "tm-tabs", "seg", "duty-chips"
 * @param children   הכפתורים, כפי שהם
 */
export default function ScrollTabs({ className = "", children }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: false, end: false });

  /* ============================================================
     ⚠ **`scrollLeft` ב-RTL הוא סיוט של תאימות.** בכרום הוא
       שלילי, בפיירפוקס הוא שלילי, ובגרסאות ישנות הוא ספר
       מהקצה הימני. הבדיקה כאן משתמשת ב**ערך המוחלט** ובמרחק
       מהקצה, ולכן היא נכונה בשלוש המוסכמות בלי לזהות דפדפן.
     ============================================================ */
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) { setEdge({ start: false, end: false }); return; }
    const at = Math.abs(el.scrollLeft);
    setEdge({ start: at > 2, end: at < max - 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    /* ⚠ גם על שינוי גודל **וגם** על שינוי תוכן: לשונית שנוספת
       אחרי טעינת נתונים אינה משנה את רוחב החלון, והחץ היה
       נשאר מוסתר. */
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const c of el.children) ro.observe(c);
    return () => { el.removeEventListener("scroll", measure); ro.disconnect(); };
  }, [measure, children]);

  const nudge = (dir) => {
    const el = ref.current;
    if (!el) return;
    /* ⚠ `dir` הוא "לכיוון ההתחלה" / "לכיוון הסוף" ולא ימין
       ושמאל — ב-RTL הם הפוכים, וקידוד של ימין/שמאל כאן היה
       שולח את החץ לכיוון הלא נכון. */
    const step = Math.max(120, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="stabs">
      {edge.start && (
        <button className="stabs-a start" aria-hidden="true" tabIndex={-1}
          onClick={() => nudge(1)}><AR.r /></button>
      )}
      <div className={"stabs-in " + className} ref={ref}>{children}</div>
      {edge.end && (
        <button className="stabs-a end" aria-hidden="true" tabIndex={-1}
          onClick={() => nudge(-1)}><AR.l /></button>
      )}
    </div>
  );
}
