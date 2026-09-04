/* ============================================================
   מזהי לוח המיונים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-tryouts.mjs.
   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign, ומחרוזת מיוצאת נקבעת פעם אחת
     בטעינת המודול.
   ============================================================ */

export const TRYOUT_BOARD = { board: "5103567888" };

export const TRYOUT_COLS = {
  "student": "text_mm6wxcx3",
  "studentName": "text_mm6w75p7",
  "date": "date_mm6wny84",
  "status": "color_mm6wbrap",
  "track": "text_mm6wkym3",
  "note": "long_text_mm6wntn5"
};

/** ⚠ זהות בתו לתוויות שבלוח. תווית שאינה כאן תיכשל ברעש. */
export const TRYOUT_STATUS = [
  "מתוכנן",
  "עבר",
  "לא עבר",
  "ממתין לתשובה",
  "לא הגיע",
  "בוטל"
];

export const tryoutsReady = () => Boolean(TRYOUT_BOARD.board);
