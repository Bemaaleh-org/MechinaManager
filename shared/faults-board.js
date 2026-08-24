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
