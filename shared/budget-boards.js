/* ============================================================
   תקציב המטבח — סוגי ימים, חישוב ותוויות
   ------------------------------------------------------------
   כמה עולה להאכיל את המכינה בכל חודש. הבסיס: לכל יום יש סוג,
   ולכל סוג יש מחיר לאדם. חודש = סכום הימים × מספר הסועדים,
   ועוד החלק החודשי של הזמנת האוכל היבש.

   ⚠ המחירים חיים בלוח ולא בקוד. המכינה מייקרת יום שגרה
     ב-monday והחישוב משתנה מיד, בלי דיפלוי (עיקרון 1).

   ⚠ סוג היום נגזר מהגאנט ומלוח השנה ואינו נשמר לכל יום:
     נשמרות רק החריגות. כך הלו״ז נשאר מקור אחד — שינוי בגאנט
     משתקף בתקציב — ומי שרוצה לכפות סוג אחר ליום מסוים, כופה,
     והכפייה גוברת. 298 שורות שהיו מועתקות מהגאנט היו מתיישנות
     ברגע שהגאנט זז.
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
  { name: "יום שגרה במכינה", cost: 40, weekend: false },
  { name: "יום סדרה", cost: 20, weekend: false },
  { name: "יום בית", cost: 0, weekend: false },
  { name: "יום התנדבות", cost: 20, weekend: false },
  { name: "שבת מכינה", cost: 75, weekend: true },
  { name: "יום חזרה מהבית", cost: 15, weekend: false },
  { name: "שישי שבת בבית", cost: 0, weekend: true },
];

/** ברירת מחדל למספר הסועדים — חניכים וצוות יחד */
export const DEFAULT_HEADCOUNT = 37;

/** שם השורה בלוח ההגדרות */
export const SETTING_HEADCOUNT = "מספר סועדים";

/* ------------------------------------------------------------
   ⚠ סוג "סופ״ש" מתומחר פעם אחת לזוג הימים ולא לכל יום.
     75 ₪ לאדם הם המחיר של שישי ושבת יחד, ולכן הם נזקפים ליום
     שישי והשבת שאחריו נספרת באפס. בלי הכלל הזה כל סוף שבוע
     היה נספר פעמיים והתקציב החודשי היה מנופח ב-40 אחוז.
   ------------------------------------------------------------ */
export const isFriday = (iso) => new Date(iso + "T12:00:00Z").getUTCDay() === 5;
export const isSaturday = (iso) => new Date(iso + "T12:00:00Z").getUTCDay() === 6;

/**
 * כמה עולה יום אחד לאדם.
 *   type    שורת סוג היום ({ cost, weekend })
 *   iso     התאריך
 * מחזיר 0 לשבת של סוג סופ״ש — המחיר כבר נזקף ביום שישי.
 */
export function dayCostPerPerson(type, iso) {
  if (!type) return 0;
  if (type.weekend && isSaturday(iso)) return 0;
  return Number(type.cost) || 0;
}

/** האם היום הזה "נבלע" בתמחור של יום שישי שלפניו */
export const isPairedSaturday = (type, iso) => Boolean(type && type.weekend && isSaturday(iso));

/**
 * החלק החודשי של הזמנה רבעונית.
 * ההזמנה נפרסת על שלושה חודשים רצופים מחודש הפתיחה שנבחר.
 */
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

/** חלקה של הזמנה אחת בחודש נתון. 0 אם אינה נוגעת בו. */
export function orderShareFor(order, month) {
  return orderMonths(order.startMonth).includes(month)
    ? (Number(order.amount) || 0) / ORDER_MONTHS
    : 0;
}

export const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export const monthLabel = (m) => {
  const [y, mo] = String(m || "").split("-").map(Number);
  return y && mo ? `${MONTHS_HE[mo - 1]} ${y}` : m;
};
