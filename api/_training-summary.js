/* ============================================================
   סיכום נוכחות באימונים, לכל חניך
   ------------------------------------------------------------
   ⚠ עצמאי לחלוטין מהנוכחות היומית. חניך יכול להיות נוכח במכינה
     ולהיעדר מהאימון, ולהפך — שתי אמיתות שנשמרות בנפרד בכוונה
     (ראו ההערה ב-_training-mark.js). לכן גם הסיכום נפרד, ולא
     שדה בתוך סיכום הנוכחות.

   ⚠ "לא סומן" הוא מצב שלישי אמיתי, כאן כמו בכל מקום אחר
     במערכת. מפגש שהחניך אינו מופיע באף אחת משלוש הרשימות שלו
     אינו נספר לו — לא כנוכחות ולא כהיעדרות. אחרת מפגש שאיש לא
     סימן היה נראה כמו מפגש שכולם נעדרו ממנו.

   ⚠ מטבח אינו היעדרות. תורן מטבח לא היה באימון כי המכינה
     שלחה אותו למטבח; לספור אותו כנעדר היה מעניש אותו על
     תורנות. הוא נספר בנפרד ואינו נכנס למכנה של האחוז.
   ============================================================ */

import { loadMeetings, loadSheets } from "./_lessons-data.js";

/**
 * מפה: מזהה חניך → { present, absent, kitchen, marked, pct }
 * pct הוא null עד שיש מספיק מפגשים — ראו ההערה למטה.
 */
export async function trainingByStudent() {
  const [meetings, sheets] = await Promise.all([loadMeetings(), loadSheets()]);
  /* ⚠ רק גיליונות שמסומנים לנוכחות יומית מנהלים נוכחות אימון.
     שאר המפגשים אינם אימונים ואין להם רשימות. */
  const ok = new Set(sheets.filter((s) => s.inDaily).map((s) => s.id));

  const out = new Map();
  const bump = (id, key) => {
    if (!id) return;
    const e = out.get(id) || { present: 0, absent: 0, kitchen: 0 };
    e[key]++;
    out.set(id, e);
  };

  for (const m of meetings) {
    if (!ok.has(m.sheetId)) continue;
    for (const id of m.tPresent || []) bump(String(id), "present");
    for (const id of m.tAbsent || []) bump(String(id), "absent");
    for (const id of m.tKitchen || []) bump(String(id), "kitchen");
  }

  for (const [, e] of out) {
    /* המכנה הוא נוכח + נעדר בלבד. מטבח אינו הזדמנות שהוחמצה. */
    e.marked = e.present + e.absent;
    /* ⚠ אחוז מוצג רק מארבעה אימונים ומעלה. "0%" על אימון אחד
       הוא מספר נכון חשבונית ומטעה לחלוטין — אותו כלל שנקבע
       לנוכחות היומית. */
    e.pct = e.marked >= 4 ? Math.round((e.present / e.marked) * 100) : null;
  }
  return out;
}

/** ברירת מחדל לחניך שאין לו אף סימון */
export const EMPTY_TRAINING = { present: 0, absent: 0, kitchen: 0, marked: 0, pct: null };
