/* ============================================================
   מזהי לוחות ועמודות של שיבוצי החניכים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב מחדש במלואו על ידי
     tools/seed-placements.mjs כשהוא יוצר את הלוחות ב-monday.

   להקמה:  node --env-file=.env tools/seed-placements.mjs
   ============================================================ */

export const PLACEMENT_BOARDS = {
  definitions: "",
  assignments: "",
};

export const PLACEMENT_COLS = {
  definitions: { category: "", period: "", capacity: "" },
  assignments: { student: "", studentName: "", placement: "", placementName: "", semester: "" },
};
