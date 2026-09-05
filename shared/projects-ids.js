/* ============================================================
   מזהי לוחות הפרויקטים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-projects.mjs.

   ⚠⚠ **הלוחות האלה שייכים לחניכים, והצוות אינו קורא אותם.**
     `api/_projects.js` מחזיר 403 לכל כניסת צוות — זו נקודת
     הקצה השנייה במערכת שבה `isManager` אינו מרחיב גישה, אחרי
     משימות בעלי התפקידים (4מה). מי שיוסיף כאן מסלול לצוות
     שובר הבטחה, ולא רק מוסיף תכונה.

   ⚠ **עמודת הבעלים מחזיקה מזהה בלבד ולא שם**, כדי שהלוח
     ייקרא כרשימת פרויקטים ולא כיומן של אדם.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign.
   ============================================================ */

export const PROJECT_BOARDS = {
  "projects": "5103597773",
  "tasks": "5103597777",
  "budget": "5103597780"
};

export const PROJECT_COLS = {
  "projects": {
    "owner": "text_mm6x5s4h",
    "partners": "long_text_mm6xxxf5",
    "status": "color_mm6xr4aq",
    "kind": "color_mm6x8c63",
    "about": "long_text_mm6xxjmq",
    "goal": "long_text_mm6xb6yk",
    "start": "date_mm6x6d5k",
    "due": "date_mm6xhtcv",
    "budget": "numeric_mm6xf44g",
    "archived": "boolean_mm6xw0x4"
  },
  "tasks": {
    "project": "text_mm6x3b7d",
    "done": "boolean_mm6xy3a6",
    "due": "date_mm6xr42t",
    "owner": "text_mm6xnjkb",
    "note": "long_text_mm6xdbwm"
  },
  "budget": {
    "project": "text_mm6xbjv5",
    "kind": "color_mm6xr5kb",
    "amount": "numeric_mm6xg55m",
    "date": "date_mm6xhwe3",
    "note": "long_text_mm6xbdv1"
  }
};

/** ⚠ זהות בתו לתוויות שבלוח. */
export const PROJECT_STATUS = [
  "רעיון",
  "בתכנון",
  "בביצוע",
  "מושהה",
  "הושלם",
  "בוטל"
];
export const PROJECT_KIND = [
  "אישי",
  "קבוצתי",
  "קהילתי",
  "עסקי",
  "אחר"
];
export const MONEY_KIND = [
  "הוצאה",
  "הכנסה"
];

/** סטטוסים שנחשבים סגורים — לחישוב ההתקדמות */
export const PROJECT_CLOSED = ["הושלם", "בוטל"];

export const projectsReady = () =>
  Boolean(PROJECT_BOARDS.projects && PROJECT_BOARDS.tasks && PROJECT_BOARDS.budget);
