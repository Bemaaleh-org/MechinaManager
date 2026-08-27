/* ============================================================
   מזהי לוחות ועמודות של המטבח — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. הקובץ נכתב מחדש במלואו על ידי
     tools/seed-kitchen.mjs כשהוא יוצר את הלוחות ב-monday.

   נוצר על ידי רועי הוניג.
   ============================================================ */

export const KITCHEN_BOARDS = {
  equipment: "5102761634",
  shopping: "5102761635",
  /* ⚠ טבלת ההמרה — נערכת מהמסך על ידי אחראי המטבח והמנהלים.
     ברירת המחדל יושבת ב-shared/produce.js, והלוח גובר עליה. */
  produce: "5103034411",
};

export const KITCHEN_COLS = {
  equipment: {
    qty: "text_mm6gpsc7", kind: "color_mm6g5xe4", area: "color_mm6gthnf", par: "numeric_mm6gfk9m",
    price: "numeric_mm6m5y4b", kgPer: "numeric_mm6m99f5",
  },
  produce: { kg: "numeric_mm6mpsxs" },
  shopping: { qty: "text_mm6g3rtt", date: "date_mm6grr9a", status: "color_mm6gbf5k", by: "text_mm6gfn7v", area: "color_mm6ggr80" },
};
