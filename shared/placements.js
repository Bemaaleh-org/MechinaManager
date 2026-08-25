/* ============================================================
   שיבוצי חניכים — קטגוריות, תקופות וחישובים
   ------------------------------------------------------------
   שני לוחות: "הגדרות" — מהם השיבוצים (ענף, סדרה, ועדה,
   קבוצה), ו"שיבוץ" — מי משובץ לאן ובאיזה סמסטר.

   ⚠ רשימת השיבוצים עצמה חיה בלוח ההגדרות, לא בקוד. המכינה
     מוסיפה ועדה, משנה מכסה או הופכת ענף לשנתי — ישירות
     ב-monday, בלי דיפלוי. הקוד מכיר רק את הקטגוריות והתקופות.

   ⚠ החלוקה לסמסטרים היא אותה חלוקה של הנוכחות — שתי מחציות
     שנקטעות בשבוע האמצע (ראו HALF ב-mechina-boards.js).
     בממשק הן נקראות "סמסטר", כמו שמדברים במכינה.
   ============================================================ */

import { PLACEMENT_BOARDS, PLACEMENT_COLS } from "./placements-ids.js";

export { PLACEMENT_BOARDS, PLACEMENT_COLS };

/** האם הלוחות כבר הוקמו */
export const placementsReady = () =>
  Boolean(PLACEMENT_BOARDS.definitions && PLACEMENT_BOARDS.assignments);

/** קטגוריות השיבוץ. הסדר כאן הוא סדר הלשוניות במסך. */
export const CATEGORY = {
  branch: "ענף",
  series: "סדרה",
  committee: "ועדה",
  group: "קבוצה",
};
export const CATEGORIES = [CATEGORY.branch, CATEGORY.series, CATEGORY.committee, CATEGORY.group];

/**
 * תקופת השיבוץ — קובעת אילו סמסטרים פתוחים לשיבוץ:
 *   "לפי סמסטר"  שיבוץ נפרד לכל סמסטר (ענפים, ועדות)
 *   "שנתי"       שיבוץ אחד לכל השנה (סדרות, קבוצות)
 *   "סמסטר א׳"   קיים רק בסמסטר הראשון
 *   "סמסטר ב׳"   קיים רק בשני (ועדת גיוסים)
 */
export const PERIOD = {
  perSemester: "לפי סמסטר",
  yearly: "שנתי",
  firstOnly: "סמסטר א׳",
  secondOnly: "סמסטר ב׳",
};
export const PERIODS = [PERIOD.perSemester, PERIOD.yearly, PERIOD.firstOnly, PERIOD.secondOnly];

/** ערכי עמודת הסמסטר בלוח השיבוץ */
export const SEM = {
  first: "סמסטר א׳",
  second: "סמסטר ב׳",
  yearly: "שנתי",
};

/** אילו סמסטרים פתוחים לשיבוץ עבור תקופה נתונה */
export function semestersFor(period) {
  if (period === PERIOD.perSemester) return [SEM.first, SEM.second];
  if (period === PERIOD.firstOnly) return [SEM.first];
  if (period === PERIOD.secondOnly) return [SEM.second];
  return [SEM.yearly];
}
