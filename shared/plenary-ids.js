/* ============================================================
   מליאות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-plenary.mjs.
     להקמה:  npm run seed:plenary

   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף מזהים עם
     Object.assign (4ל).

   ⚠⚠ **בלוח הפתקים אין ולא תהיה עמודת כותב לפתק אנונימי.**
     האנונימיות כאן היא **בהיעדר הנתון** ולא בהסתרה שלו —
     בדיוק כמו המשוב לצוות (5י). שלוש שכבות:
       1. פתק אנונימי נכתב בלי `authorId` ובלי `authorName`.
       2. המסלול בשרת אינו נוגע ב-`session.itemId` בפתק כזה.
       3. התשובה **אינה מחזירה מזהה שורה** — מזהה שחוזר מופיע
          בלוג הרשת לצד הסשן ששלח אותו, כלומר שובר את
          האנונימיות מחוץ ל-monday.

   ⚠ **המחיר מוצהר במסך**: אי אפשר למחוק "את מה שאני כתבתי",
     ואי אפשר למנוע כפילות. שניהם עדיפים על אנונימיות
     למראית עין.
   ============================================================ */

export const PLENARY_BOARDS = {
  "events": "5103855466",
  "notes": "5103855491"
};

export const PLENARY_COLS = {
  "events": {
    "date": "date_mm71gx52",
    "status": "color_mm71e80g",
    "owners": "text_mm71gfhw",
    "ownerNames": "text_mm71arsj",
    "open": "boolean_mm71v5fx",
    "agenda": "long_text_mm71f8wg",
    "summary": "long_text_mm714g76",
    "summaryBy": "text_mm717975",
    "file": "file_mm712nsz",
    "note": "text_mm714k6d"
  },
  "notes": {
    "plenary": "text_mm71jwd3",
    "text": "long_text_mm71e5xv",
    "anon": "boolean_mm71xfrw",
    "authorId": "text_mm714gmx",
    "authorName": "text_mm71ttza",
    "order": "numeric_mm71b4rk",
    "inAgenda": "boolean_mm71z06g",
    "date": "date_mm71s0dv"
  }
};

/** ⚠ בלי הלוחות המסך אומר מה להריץ ואינו מציג רשימה ריקה (עיקרון 6). */
export const plenaryReady = () =>
  Boolean(PLENARY_BOARDS.events && PLENARY_BOARDS.notes && PLENARY_COLS.events.status);

/* ⚠ **התוויות זהות בתו לתוויות שבלוח.** */
export const PLENARY_STATUS = {
  planned: "בתכנון",
  done: "התקיימה",
  cancelled: "בוטלה",
};
export const PLENARY_STATUSES = Object.values(PLENARY_STATUS);
