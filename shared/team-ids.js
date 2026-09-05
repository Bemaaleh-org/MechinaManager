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
  "tasks": "5103121837",
  "vocab": "5103121871",
  "entries": "5103613828",
  "feedback": "5103613830",
  "polls": "5103613831",
  "votes": "5103613833"
};

export const TEAM_COLS = {
  "tasks": {
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
    "upAt": "text_mm6n19a8",
    "tags": "text_mm6x59ft"
  },
  "vocab": {
    "kind": "color_mm6npyy",
    "order": "numeric_mm6nxe42",
    "closes": "boolean_mm6n2f8a",
    "archived": "boolean_mm6nm51c"
  },
  "entries": {
    "team": "text_mm6xn4qc",
    "kind": "color_mm6xjdc7",
    "date": "date_mm6xn1fh",
    "body": "long_text_mm6xm5qm",
    "extra": "text_mm6x2dkk",
    "qty": "numeric_mm6x4xkm",
    "amount": "numeric_mm6xdygn",
    "done": "boolean_mm6xbq7z",
    "by": "text_mm6xnvv2"
  },
  "feedback": {
    "team": "text_mm6xdbgk",
    "date": "date_mm6xy0d4"
  },
  "polls": {
    "team": "text_mm6x6vk",
    "options": "long_text_mm6xy39f",
    "closes": "date_mm6xpqtd",
    "closed": "boolean_mm6xaa9x",
    "by": "text_mm6x9dhn"
  },
  "votes": {
    "poll": "text_mm6xzwsm",
    "choice": "text_mm6xkpc9",
    "voter": "text_mm6xkqmt"
  }
};

/** ⚠ זהות בתו לתוויות שבלוח. */
export const TEAM_ENTRY_KIND = [
  "פרוטוקול",
  "אירוע",
  "קישור",
  "ציוד",
  "חפיפה",
  "הוצאה",
  "הכנסה"
];

/** ⚠ הלוחות החדשים אינם חובה — בלעדיהם המסך עובד בלי הלשוניות. */
export const teamExtrasReady = () =>
  Boolean(TEAM_BOARDS.entries && TEAM_BOARDS.feedback && TEAM_BOARDS.polls && TEAM_BOARDS.votes);

/** נוספה ללוח הגדרות השיבוצים הקיים */
export const PLACEMENT_ARCHIVED = "boolean_mm6ncm52";
