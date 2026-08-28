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
  /* ⚠ **צוות שקם באמצע שנה** — צוות יום הזיכרון, צוות טקס.
     אינו ועדה קבועה ואינו סדרה, ומנהל המכינה מקים אותו בעצמו
     מהמסך (api/_team-admin.js). מתנהג כמו ועדה לכל דבר:
     שיבוץ, יו״ר, וניהול משימות. */
  adhoc: "צוות מזדמן",
};
export const CATEGORIES = [
  CATEGORY.branch, CATEGORY.series, CATEGORY.committee,
  CATEGORY.group, CATEGORY.adhoc,
];

/* ============================================================
   סדר התצוגה — מקום אחד
   ------------------------------------------------------------
   ⚠ **היו חמש רשימות סדר מקובעות בארבעה קבצים, ובשני
     סדרים שונים.** `CATEGORIES` כאן מסודרת ענף·סדרה·ועדה·קבוצה,
     ואילו `api/_placements.js`, `src/Mechina.jsx` (פעמיים)
     ו-`shared/import-parse.js` החזיקו ["ענף","ועדה","סדרה","קבוצה"]
     — הפוך בשניים מהם. ההערה בראש shared/duties.js הזהירה
     שזה "כתוב בשלושה מקומות"; בפועל היו חמישה.

   ⚠ וכל אחת מהן היא `indexOf` על מערך סגור, כלומר קטגוריה
     חדשה מקבלת **-1 וקופצת לראש המיון** — בלי שגיאה ובלי
     שאיש ישים לב. זה בדיוק הכשל השקט של עיקרון 4ט.

   מכאן: `categoryRank` הוא המקור היחיד, וקטגוריה לא מוכרת
   יורדת **לסוף** ולא לראש.
   ============================================================ */
export const categoryRank = (c) => {
  const i = CATEGORIES.indexOf(c);
  return i === -1 ? CATEGORIES.length : i;
};
export const byCategory = (a, b) => categoryRank(a) - categoryRank(b);

/* ============================================================
   שם הרבים — מקום אחד
   ------------------------------------------------------------
   ⚠ **הייתה שרשרת טרנרי ב-src/Placements.jsx שנפלה ל-else**,
     ולכן הקטגוריה החמישית קיבלה את התווית "קבוצות" — שתי
     לשוניות באותו שם, זו לצד זו, בלי שגיאה ובלי שאיש ישים לב
     עד שילחץ על שתיהן.

   ⚠ וקטגוריה לא-מוכרת מחזירה **את עצמה** ולא ריק ולא ברירת
     מחדל של אחת האחרות. עיקרון 4ט.
   ============================================================ */
export const CATEGORY_PLURAL = {
  [CATEGORY.branch]: "ענפים",
  [CATEGORY.series]: "סדרות",
  [CATEGORY.committee]: "ועדות",
  [CATEGORY.group]: "קבוצות",
  [CATEGORY.adhoc]: "צוותים מזדמנים",
};
export const plural = (c) => CATEGORY_PLURAL[c] || c;

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
