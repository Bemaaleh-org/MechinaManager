/* ============================================================
   שבוע המשימות — מזהי לוחות ועמודות
   ------------------------------------------------------------
   נפרד מ-shared/boards.js במכוון: זה תחום אחר (משימות תורנות)
   ולא המלאי. שינוי כאן לא נוגע במלאי, ברשימות או בדיווחים.
   ============================================================ */

export const TASK_BOARDS = {
  template: "5101772036", // מלאי מטבח – תבנית משימות שבועיות
  execution: "5101772108", // מלאי מטבח – ביצוע משימות שבועי
};

export const TASK_COLS = {
  template: {
    day: "color_mm60jv4d",
    focus: "color_mm60ebs9",
    detail: "long_text_mm60fm5z",
    active: "boolean_mm60xf44",
    order: "numeric_mm60f6bb",
  },
  execution: {
    day: "color_mm60qaac",
    focus: "color_mm60wzk2",
    done: "color_mm60gf8k",
    week: "text_mm60fpta",
    markedAt: "date_mm605ddy",
    templateId: "text_mm6099ve",
    order: "numeric_mm61bawn",
  },
};

/** תוויות עמודת "בוצע" */
export const DONE = { no: "לא בוצע", yes: "בוצע" };

/** ימי השבוע כפי שהם מופיעים בתבנית */
export const DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳"];
