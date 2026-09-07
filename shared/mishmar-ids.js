/* ============================================================
   מזהי לוחות המשמר — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-mishmar.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל). שני הלוחות שייכים למחזור:
     משמר הוא ערב של מחזור מסוים, והלו״ז שלו איתו.

   ⚠ **המפתחות ריקים עד שהסקריפט רץ.** בלעדיהם נקודת הקצה
     מחזירה 503 מפורש עם `setupRequired`, והמסך אומר מה להריץ
     — ולא רשימה ריקה שנראית כמו "אין משמרים" (עיקרון 6).

   ⚠ **הדירוגים אינם כאן.** מפגש משמר מדורג באותו לוח של דירוגי
     השיעורים (`LESSON_BOARDS.ratings`), במפתח `meeting` שהוא
     מזהה המפגש. מזהי monday ייחודיים בין לוחות, ולכן אין
     התנגשות עם מפגשי הגיליונות — ואין לוח דירוגים שני לתחזק.
   ============================================================ */

export const MISHMAR_BOARDS = {
  "events": "5103746421",
  "sessions": "5103746429"
};

export const MISHMAR_STATUS = [
  "בתכנון",
  "פורסם",
  "התקיים",
  "בוטל"
];

export const SESSION_KIND = [
  "שיעור",
  "סדנה",
  "שיח",
  "הפסקה",
  "ארוחה",
  "אחר"
];

/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const mishmarReady = () =>
  Boolean(MISHMAR_BOARDS.events && MISHMAR_BOARDS.sessions);

export const MISHMAR_COLS = {
  "events": {
    "date": "date_mm6zmsgc",
    "theme": "text_mm6zh3zs",
    "team": "text_mm6z1ebg",
    "teamName": "text_mm6zthaj",
    "place": "text_mm6zj0fg",
    "start": "text_mm6z3887",
    "end": "text_mm6zpmtw",
    "summary": "long_text_mm6z4d6y",
    "status": "color_mm6zjyc4",
    "by": "text_mm6zxksh",
    "byId": "text_mm6zgj7g"
  },
  "sessions": {
    "mishmar": "text_mm6zrhqg",
    "time": "text_mm6z9eyc",
    "minutes": "numeric_mm6z7hmk",
    "lecturer": "text_mm6ztev",
    "place": "text_mm6z57yw",
    "kind": "color_mm6zsea9",
    "desc": "long_text_mm6zhwpj",
    "summary": "long_text_mm6zeef2",
    "files": "file_mm6zxm72",
    "order": "numeric_mm6z3a3w",
    "openRate": "boolean_mm6zbykm"
  }
};
