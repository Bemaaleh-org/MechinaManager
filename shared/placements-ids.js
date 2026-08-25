/* ============================================================
   מזהי לוחות ועמודות של שיבוצי החניכים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב מחדש במלואו על ידי
     tools/seed-placements.mjs כשהוא יוצר את הלוחות ב-monday.

   להקמה:  node --env-file=.env tools/seed-placements.mjs
   ============================================================ */

export const PLACEMENT_BOARDS = {
  definitions: "5102763952",
  assignments: "5102763954",
};

export const PLACEMENT_COLS = {
  definitions: {
    category: "color_mm6gv8tt", period: "color_mm6g5fe2", capacity: "numeric_mm6gkv12",
    /* ---- פירוט השיבוץ. ⚠ תיאור ודרישות אינם יוצאים לחניך ---- */
    desc: "long_text_mm6jd1y9", hours: "text_mm6j2fk5",
    needs: "long_text_mm6jmwhh", lead: "text_mm6j922j",
  },
  assignments: {
    student: "text_mm6g1cpe", studentName: "text_mm6gv73f",
    placement: "text_mm6gw7as", placementName: "text_mm6gjf0r",
    semester: "color_mm6gpyh7",
  },
};
