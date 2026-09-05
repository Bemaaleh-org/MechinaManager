/* ============================================================
   מזהי לוחות שבוע ההובלה — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-lead.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).

   ⚠⚠ **בנק הפעילויות אינו במחזור.** מה שמחזור אחד המציא הוא
     בדיוק מה שהבא צריך, ולוח שמשוכפל ריק בכל שנה מבטל את כל
     הסיבה שהוא קיים. אותו נימוק כמו לוח המנות ולוח הבוגרים.
   ============================================================ */


export const LEAD_BOARDS = {
  "checklist": "5103614666",
  "log": "5103614670",
  "activities": "5103614673"
};

export const LEAD_COLS = {
  "checklist": {
    "week": "text_mm6x5px2",
    "when": "color_mm6xxf3s",
    "body": "long_text_mm6xg7nq",
    "order": "numeric_mm6xdv31",
    "archived": "boolean_mm6xp6kx",
    "by": "text_mm6xcv17"
  },
  "log": {
    "kind": "color_mm6x6yfa",
    "ref": "text_mm6xxqet",
    "week": "text_mm6xnxgj",
    "date": "date_mm6xmtfg",
    "owner": "text_mm6x8mej",
    "ownerName": "text_mm6x6xbt",
    "note": "long_text_mm6x9a92"
  },
  "activities": {
    "kind": "color_mm6xsswh",
    "body": "long_text_mm6xeje7",
    "minutes": "numeric_mm6xpdrk",
    "people": "numeric_mm6xrvx9",
    "gear": "text_mm6x9rt1",
    "link": "text_mm6xcjte",
    "by": "text_mm6xxatt",
    "archived": "boolean_mm6xtstt"
  }
};

export const LEAD_WHEN = [
  "לפני השבוע",
  "בתחילת השבוע",
  "כל יום",
  "בסוף השבוע"
];

export const ACTIVITY_KIND = [
  "פעילות ערב",
  "שיא",
  "רגוע",
  "פתיחת יום",
  "סיום יום",
  "אחר"
];

export const LEAD_LOG_KIND = [
  "משימה",
  "פעילות"
];

/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const leadReady = () =>
  Boolean(LEAD_BOARDS.checklist && LEAD_BOARDS.log && LEAD_BOARDS.activities);
