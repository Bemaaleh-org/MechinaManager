/* ============================================================
   מזהי לוחות ניהול הצוותים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-teams.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign, ומחרוזת מיוצאת נקבעת פעם אחת
     בטעינת המודול.

   ⚠⚠ **`ownerName` כאן נכתב בכוונה, וזה ההפך מ-shared/duty-ids.js.**
     שם עמודת הבעלים מחזיקה **מזהה בלבד**, כדי שלוח המשימות
     האישיות לא ייקרא כיומן של אדם (CLAUDE 4מה). כאן הלוח
     **משותף** ליו״ר, למדריך ולחברי הצוות, ו"באחריות מי"
     היא כל התכלית — לכן השם נכתב.

     שני הלוחות נראים דומים וההיפוך הוא הדבר השברירי ביותר
     כאן. מי שיראה אותם זה לצד זה עלול "לתקן" אחד לפי השני.
     ראו CLAUDE.md סעיף 4נ.
   ============================================================ */

export const TEAM_BOARDS = {
  tasks: "5103121837",
  vocab: "5103121871",
};

export const TEAM_COLS = {
  tasks: {
      "team": "text_mm6nwqsn",
      "teamName": "text_mm6n56fx",
      "owner": "text_mm6nnkzx",
      "ownerName": "text_mm6n3gxt",
      "status": "text_mm6ng6hd",
      "statusName": "text_mm6n425a",
      "stage": "text_mm6nr4z1",
      "stageName": "text_mm6ng0ck",
      "due": "date_mm6n2sjb",
      "note": "long_text_mm6nzfyr",
      "link": "text_mm6nw5nn",
      "by": "text_mm6njhbz",
      "byId": "text_mm6n8pxf",
      "at": "text_mm6nqwma",
      "upBy": "text_mm6nx1gq",
      "upAt": "text_mm6n19a8"
  },
  vocab: {
      "kind": "color_mm6npyy",
      "order": "numeric_mm6nxe42",
      "closes": "boolean_mm6n2f8a",
      "archived": "boolean_mm6nm51c"
  },
};

/** נוספה ללוח הגדרות השיבוצים הקיים */
export const PLACEMENT_ARCHIVED = "boolean_mm6ncm52";
