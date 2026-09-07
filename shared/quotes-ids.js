/* ============================================================
   מזהי לוחות הציטוט היומי — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-quotes.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).

   ⚠ **הבעלות בשני הלוחות היא לפי מזהה ולא לפי שם.** `byId`
     על הציטוט ו-`student` על התגובה הם מה שהשרת משווה; השם
     לצידם הוא לתצוגה בלבד ואינו מתעדכן כשחניך משנה שם (4מו).

   ⚠ **אין כאן עמודת סטטוס, ובכוונה.** התגובה היא טקסט חופשי
     — אימוג׳י או מילה — ורשימת תוויות סגורה הייתה דורשת
     `create_labels_if_missing` על כל אימוג׳י חדש (4טז).
   ============================================================ */

export const QUOTE_BOARDS = {
  "quotes": "5103746388",
  "reactions": "5103746408"
};

/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const quotesReady = () =>
  Boolean(QUOTE_BOARDS.quotes && QUOTE_BOARDS.reactions);

export const QUOTE_COLS = {
  "quotes": {
    "text": "long_text_mm6zd01d",
    "author": "text_mm6zfss0",
    "by": "text_mm6zhpa8",
    "byId": "text_mm6zkyb",
    "added": "date_mm6z8h72",
    "shown": "date_mm6zmneb",
    "archived": "boolean_mm6zeb7"
  },
  "reactions": {
    "quote": "text_mm6za06t",
    "student": "text_mm6z8esf",
    "studentName": "text_mm6z2pwx",
    "reaction": "text_mm6zz4wn",
    "date": "date_mm6zf8sd"
  }
};
