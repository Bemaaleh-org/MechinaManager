/* ============================================================
   תקציב המטבח — סוגי ימים, חישוב ותוויות
   ------------------------------------------------------------
   כמה עולה להאכיל את המכינה בכל חודש, בשני ראשים נפרדים:

     קייטרינג — מה שמזמינים מבחוץ
     קניות    — כל השאר

   לכל סוג יום שלושה מספרים: קייטרינג לאדם, קייטרינג קבוע
   ליום (שאינו תלוי בכמות), וקניות לאדם.

   ⚠ הקבוע קיים בגלל העשייה הקהילתית: 900 ₪ ליום, בין אם
     הגיעו עשרים אנשים או ארבעים. מודל של "מחיר לאדם" בלבד
     לא ידע לבטא אותו והיה מנפח או מכווץ אותו לפי המצבה.

   ⚠ המחירים חיים בלוח ולא בקוד. המכינה מייקרת יום שגרה
     ב-monday והחישוב משתנה מיד, בלי דיפלוי (עיקרון 1).

   ⚠ סוג היום נגזר מהגאנט ואינו נשמר לכל יום: נשמרות רק
     החריגות. ראו ההסבר ב-api/_kitchen-budget.js.
   ============================================================ */

import { BUDGET_BOARDS, BUDGET_COLS } from "./budget-ids.js";

export { BUDGET_BOARDS, BUDGET_COLS };

export const budgetReady = () =>
  Boolean(BUDGET_BOARDS.dayTypes && BUDGET_BOARDS.days && BUDGET_BOARDS.orders && BUDGET_BOARDS.settings);

/* ------------------------------------------------------------
   סוגי הימים כפי שנמסרו. זו רשימת ההקמה בלבד — מרגע שהלוח
   קיים, הוא מקור האמת, וסוג חדש נוסף שם.
   ------------------------------------------------------------ */
export const DAY_TYPE_SEED = [
  { name: "שגרה", catering: 34, cateringFixed: 0, purchases: 10 },
  { name: "סדרה", catering: 0, cateringFixed: 0, purchases: 35 },
  { name: "עשייה קהילתית", catering: 0, cateringFixed: 900, purchases: 8 },
  { name: "שישי מכינה", catering: 34, cateringFixed: 0, purchases: 25 },
  { name: "שבת מכינה", catering: 34, cateringFixed: 0, purchases: 10 },
  { name: "חזרה מהבית", catering: 0, cateringFixed: 0, purchases: 15 },
  { name: "בית", catering: 0, cateringFixed: 0, purchases: 0 },
  { name: "שישי בית", catering: 0, cateringFixed: 0, purchases: 0 },
  { name: "שבת בית", catering: 0, cateringFixed: 0, purchases: 0 },
  /* ⚠ "אחר" תמיד אחרון ברשימה — הוא המוצא לימים חריגים
     שאין להם סוג, ולא בחירה שמציעים ראשונה. */
  { name: "אחר", catering: 0, cateringFixed: 0, purchases: 0, last: true },
];

/** ברירת מחדל למספר הסועדים — חניכים וצוות יחד */
export const DEFAULT_HEADCOUNT = 37;

/** שם השורה בלוח ההגדרות */
export const SETTING_HEADCOUNT = "מספר סועדים";

/* ------------------------------------------------------------
   חישוב יום
   ------------------------------------------------------------ */

/**
 * פירוק עלות יום אחד לשני הראשים.
 *   type   שורת סוג היום
 *   head   מספר הסועדים
 *   over   מחיר מיוחד לאדם שנכפה ליום. ⚠ גובר על הכול ונזקף
 *          כולו לקניות: יום חריג הוא הוצאה נקודתית, לא
 *          שינוי בהסכם הקייטרינג.
 */
export function dayCost(type, head, over = null) {
  if (over != null) {
    return { catering: 0, purchases: over * head, total: over * head };
  }
  if (!type) return { catering: 0, purchases: 0, total: 0 };
  const catering = (Number(type.cateringFixed) || 0) + (Number(type.catering) || 0) * head;
  const purchases = (Number(type.purchases) || 0) * head;
  return { catering, purchases, total: catering + purchases };
}

/** מה שמוצג כ"לאדם" — בלי הקבוע, שאינו תלוי בכמות */
export const perPersonOf = (type) =>
  type ? (Number(type.catering) || 0) + (Number(type.purchases) || 0) : 0;

/** סדר התצוגה: "אחר" תמיד בסוף, השאר כסדר הלוח */
export function sortTypes(types) {
  const lastNames = new Set(DAY_TYPE_SEED.filter((t) => t.last).map((t) => t.name));
  return [...types].sort((a, b) =>
    (lastNames.has(a.name) ? 1 : 0) - (lastNames.has(b.name) ? 1 : 0));
}

/* ------------------------------------------------------------
   קניות
   ------------------------------------------------------------
   ⚠ קנייה אינה מוסיפה לתקציב אלא יורדת ממנו. התקציב נקבע
     מסוגי הימים; הקניות הן ההוצאה בפועל מולו, וההפרש הוא
     שאומר אם חרגנו.
   ------------------------------------------------------------ */
export const ORDER_KIND = { quarterly: "רבעונית", weekly: "שבועית" };
export const ORDER_KINDS = [ORDER_KIND.quarterly, ORDER_KIND.weekly];

export const ORDER_MONTHS = 3;

export function orderMonths(startMonth) {
  const [y, m] = String(startMonth || "").split("-").map(Number);
  if (!y || !m) return [];
  const out = [];
  for (let i = 0; i < ORDER_MONTHS; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/**
 * כמה מקנייה אחת נזקף לחודש נתון.
 *   רבעונית — שליש בכל אחד משלושת החודשים
 *   שבועית  — כולה בחודש שבו נעשתה
 */
export function orderShareFor(order, month) {
  if (order.kind === ORDER_KIND.weekly) {
    return String(order.date || "").startsWith(month) ? (Number(order.amount) || 0) : 0;
  }
  return orderMonths(order.startMonth).includes(month)
    ? (Number(order.amount) || 0) / ORDER_MONTHS
    : 0;
}

/** החודשים שקנייה נוגעת בהם — לתצוגה */
export const monthsOf = (order) =>
  order.kind === ORDER_KIND.weekly
    ? [String(order.date || "").slice(0, 7)].filter(Boolean)
    : orderMonths(order.startMonth);

export const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export const monthLabel = (m) => {
  const [y, mo] = String(m || "").split("-").map(Number);
  return y && mo ? `${MONTHS_HE[mo - 1]} ${y}` : m;
};
