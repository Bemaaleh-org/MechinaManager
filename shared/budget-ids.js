/* ============================================================
   מזהי לוחות תקציב המטבח — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-budget.mjs.
     חייב להיכנס לקומיט — קובץ מזהים שאינו בגיט הוא לוח כפול
     בהמתנה בעמדה הבאה.
   ============================================================ */

export const BUDGET_BOARDS = {
  dayTypes: "5102893671",
  days: "5102893687",
  orders: "5102893692",
  settings: "5102893697",
};

export const BUDGET_COLS = {
  dayTypes: {
    catering: "numeric_mm6j4k1d", cateringFixed: "numeric_mm6jhnp0",
    purchases: "numeric_mm6j850p", fixedHeads: "numeric_mm6j4ppw",
    /* ⚠ חד"א של הקיבוץ — סכום קבוע ליום שאינו תלוי במספר
       הסועדים ואינו חלק מהקייטרינג. ביום עשייה קהילתית אוכלים
       בחדר האוכל של הקיבוץ, וזו הוצאה אחרת לגמרי. */
    dining: "numeric_mm6k997f",
  },
  days: {
    date: "date_mm6jzcmd", type: "color_mm6jh6g3",
    /* ⚠ סוג שני שמתווסף לראשון. "שגרה + אחר" הוא יום שגרה
       שקרה בו עוד משהו, ולא סוג יום חדש. */
    type2: "color_mm6ks4js",
    cost: "numeric_mm6jw604", note: "text_mm6jh0dx",
    /* ⚠ סכום מדויק ליום — מתווסף ואינו תלוי במספר הסועדים.
       cost דורס, flat מוסיף. */
    flat: "numeric_mm6kqpxv",
  },
  orders: { amount: "numeric_mm6jnhh2", startMonth: "text_mm6j7pqm", date: "date_mm6jp9as", note: "text_mm6jv2xv", kind: "color_mm6jtyvv" },
  settings: { value: "numeric_mm6jkeme", from: "date_mm6jb0xz" },
};
