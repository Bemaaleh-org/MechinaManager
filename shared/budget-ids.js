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
  dayTypes: { cost: "numeric_mm6jfer5", weekend: "boolean_mm6jmk91" },
  days: { date: "date_mm6jzcmd", type: "color_mm6jc4sw", cost: "numeric_mm6jw604", note: "text_mm6jh0dx" },
  orders: { amount: "numeric_mm6jnhh2", startMonth: "text_mm6j7pqm", date: "date_mm6jp9as", note: "text_mm6jv2xv" },
  settings: { value: "numeric_mm6jkeme" },
};
