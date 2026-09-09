/* ============================================================
   התפריט השבועי — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-weekmenu.mjs.
     להקמה:  npm run seed:weekmenu

   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף מזהים עם
     Object.assign (4ל). מזהה שמיוצא כמחרוזת נקבע פעם אחת
     בטעינת המודול ואי אפשר להחליף אותו.
   ============================================================ */

export const WEEKMENU_BOARDS = {
  board: "",
};

export const WEEKMENU_COLS = {
  day: "",
  meal: "",
  main: "",
  gf: "",
  side: "",
  protein: "",
  items: "",
  dishes: "",
  note: "",
};

/** ⚠ בלי הלוח המסך אומר מה להריץ, ואינו מציג טבלה ריקה (עיקרון 6). */
export const weekMenuReady = () =>
  Boolean(WEEKMENU_BOARDS.board && WEEKMENU_COLS.day && WEEKMENU_COLS.meal);
