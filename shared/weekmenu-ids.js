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
  "board": "5103855321"
};

export const WEEKMENU_COLS = {
  "day": "color_mm7114gm",
  "meal": "color_mm71c0w1",
  "main": "long_text_mm7173c",
  "gf": "text_mm71brhw",
  "side": "long_text_mm71gcqf",
  "protein": "text_mm71hkbr",
  "items": "long_text_mm71m7nh",
  "dishes": "text_mm71qsgg",
  "note": "text_mm71h7v7"
};

/** ⚠ בלי הלוח המסך אומר מה להריץ, ואינו מציג טבלה ריקה (עיקרון 6). */
export const weekMenuReady = () =>
  Boolean(WEEKMENU_BOARDS.board && WEEKMENU_COLS.day && WEEKMENU_COLS.meal);
