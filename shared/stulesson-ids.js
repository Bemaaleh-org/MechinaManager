/* ============================================================
   שיעורי חניך — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-stulesson.mjs.
     להקמה:  npm run seed:stulesson

   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף מזהים עם
     Object.assign (4ל). מזהה שמיוצא כמחרוזת נקבע פעם אחת
     בטעינת המודול ואי אפשר להחליף אותו.

   ⚠ **הלוח שייך למחזור** — שיעורי החניכים הם של המחזור הזה,
     והמחזור הבא מתחיל מרשימה ריקה. ראו shared/cycles.js.
   ============================================================ */

export const STU_BOARDS = {
  "board": "5103855441"
};

export const STU_COLS = {
  "student": "text_mm717w60",
  "studentName": "text_mm71w14d",
  "kind": "color_mm715xgy",
  "date": "date_mm71vvnd",
  "topic": "text_mm71904t",
  "happened": "color_mm71xd07",
  "note": "long_text_mm71s51j",
  "by": "text_mm71khmp"
};

/** ⚠ בלי הלוח המסך אומר מה להריץ ואינו מציג טבלה ריקה (עיקרון 6). */
export const stuLessonReady = () => Boolean(STU_BOARDS.board && STU_COLS.kind);

/** תוויות "התקיים" — ⚠ זהות בתו לתוויות שבלוח. */
export const HAPPENED = { yes: "התקיים", no: "לא התקיים" };
export const HAPPENED_LABELS = [HAPPENED.yes, HAPPENED.no];
