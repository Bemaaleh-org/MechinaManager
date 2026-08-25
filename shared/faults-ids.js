/* ============================================================
   מזהי לוח התקלות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נוצר מכפתור ההקמה שבמסך תקלות ובעיות
     (api/_faults-setup.js). חייב להיכנס לקומיט.
   ============================================================ */

export const FAULTS_BOARD = "5102833573";

export const FAULTS_COLS = {
  date: "date_mm6htkm2", place: "color_mm6hyxwh", fix: "color_mm6h5fdq", urgency: "color_mm6hg4rf", status: "color_mm6hkm26",
  desc: "long_text_mm6h5qb5", notes: "long_text_mm6hycz5",
  /* ---- מעקב טיפול (צוות בלבד) ---- */
  cost: "numeric_mm6jfzbp", pro: "text_mm6je4zk", proPhone: "text_mm6jea16",
  doneDate: "date_mm6jf4jx",
  /* ---- מי דיווח ---- */
  reporter: "text_mm6jv7x0", reporterId: "text_mm6jpxp7",
  photo: "file_mm6jcghe",
};
