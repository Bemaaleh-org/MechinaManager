/* ============================================================
   תקלות ובעיות — תוויות וכללים
   ------------------------------------------------------------
   מעקב תקלות תחזוקה. גלוי למנהלים ולאב הבית בלבד — ההרשאה
   נאכפת בשרת (withAuth {house:true}).

   בניגוד לאירוע בטיחות, תקלה אינה רשומה רשמית: מותר למחוק
   שורה שנפתחה בטעות. תקלה שטופלה עדיף לסמן "טופלה" ולא
   למחוק — כך נשארת היסטוריית תחזוקה.
   ============================================================ */

import { FAULTS_BOARD, FAULTS_COLS } from "./faults-ids.js";

export { FAULTS_BOARD, FAULTS_COLS };

export const faultsReady = () => Boolean(FAULTS_BOARD);

/** איפה התקלה */
export const FAULT_PLACE = [
  "כיתה", "חאן יונס", "מגורי בנים", "מגורי בנות", "חוץ", "מכולה", "מגורי צוות",
  /* ⚠ "אחר" אחרון — הוא סל ולא מקום, ורשימה שנגמרת בו נקראת
     נכון. בלעדיו תקלה במקום שאינו ברשימה נרשמה במקום שגוי. */
  "אחר",
];

/** מי מתקן */
export const FAULT_FIX = { pro: "בעל מקצוע", inhouse: "בתוך המכינה" };
export const FIXES = [FAULT_FIX.pro, FAULT_FIX.inhouse];

/** דחיפות */
export const FAULT_URGENCY = { urgent: "דחוף", normal: "רגיל" };
export const URGENCIES = [FAULT_URGENCY.urgent, FAULT_URGENCY.normal];

/** מחזור החיים של תקלה */
export const FAULT_STATUS = { open: "פתוחה", working: "בטיפול", done: "טופלה" };
export const STATUSES = [FAULT_STATUS.open, FAULT_STATUS.working, FAULT_STATUS.done];

/* ============================================================
   מה חניך רואה על תקלה שהוא דיווח
   ------------------------------------------------------------
   ⚠ החלטה של המכינה: החניך רואה סטטוס, ולא עלויות או פרטי
     איש המקצוע. כמו כל נתון רגיש במערכת — הסינון בשרת ולא
     בתצוגה, ובמיפוי מפורש ולא בהשמטה, כדי שעמודה חדשה שתיווסף
     ללוח לא תדלוף מעצמה (עיקרון 4).
   ============================================================ */
export function toStudentFault(f) {
  return {
    id: f.id,
    title: f.title,
    date: f.date,
    place: f.place,
    urgency: f.urgency,
    status: f.status,
    desc: f.desc,
    hasPhoto: Boolean(f.photoUrl),
    photoUrl: f.photoUrl || null,
  };
}
