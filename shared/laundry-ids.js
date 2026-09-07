/* ============================================================
   מזהי לוח הכביסה — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-laundry.mjs.
   להקמה:  npm run seed:laundry

   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל). מזהה שמיוצא כמחרוזת נקבע
     פעם אחת בטעינת המודול ואי אפשר להחליף אותו.

   ⚠ עד שהסקריפט ירוץ המזהים ריקים, ו-`laundryReady()` הוא מה
     ששומר על נקודת הקצה: 503 מפורש ולא רשימה ריקה (עיקרון 6).
   ============================================================ */

export const LAUNDRY_BOARDS = {
  "board": "5103746363"
};

export const MACHINES = [
  "מכונת כביסה",
  "מייבש"
];

export const KINDS = [
  "לבנים",
  "צבעוניים",
  "מצעים ומגבות",
  "עדינה",
  "מעורב"
];

export const LAUNDRY_COLS = {
  "student": "text_mm6zzy38",
  "studentName": "text_mm6z8sdf",
  "date": "date_mm6zdc2z",
  "hour": "text_mm6zwpgj",
  "machine": "color_mm6zzk82",
  "kind": "color_mm6za8xg",
  "minutes": "numeric_mm6zrh5x",
  "note": "text_mm6zj1hr",
  "by": "text_mm6zt817",
  "byId": "text_mm6zmqt5"
};
