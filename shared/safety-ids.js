/* ============================================================
   מזהי לוח הבטיחות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נוצר מכפתור ההקמה שבמסך בטיחות ותקלות
     (api/_safety-setup.js). חייב להיכנס לקומיט.
   ============================================================ */

export const SAFETY_BOARD = "5102832891";

export const SAFETY_COLS = {
  date: "date_mm6h41qk", place: "color_mm6h31a", severity: "color_mm6h1yyv",
  bodyHarm: "text_mm6hm1hb", propHarm: "text_mm6he5w3",
  desc: "long_text_mm6hgjz0", evac: "color_mm6htdrx", medical: "color_mm6hf9p1", medicalDetail: "text_mm6he6qd",
  lessons: "long_text_mm6hn3bp", reportMod: "color_mm6hnwqa", reportCouncil: "color_mm6hn0w8",
  /* ⚠ דיווח להורים הוא חובה נפרדת מהדיווח למשרד הביטחון
     ולמועצה, והוא הראשון בזמן — לכן שדה משלו. */
  parents: "color_mm6k7mgx",
  /* ⚠ נרשם מהסשן ולא מהקלדה: מי שדיווח הוא מי שמחובר. */
  by: "text_mm6kry0j",
};
