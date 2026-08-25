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
  { name: "שגרה", cost: 40 },
  { name: "סדרה", cost: 20 },
  { name: "התנדבות", cost: 20 },
  { name: "חזרה מהבית", cost: 15 },
  { name: "שישי מכינה", cost: 38 },
  { name: "שבת מכינה", cost: 37 },
  { name: "בית", cost: 0 },
  { name: "שישי בית", cost: 0 },
  { name: "שבת בית", cost: 0 },
  /* ⚠ "אחר" תמיד אחרון ברשימה — הוא המוצא לימים חריגים
     שאין להם סוג, ולא בחירה שמציעים ראשונה. */
  { name: "אחר", cost: 0, last: true },
];

/** ברירת מחדל למספר הסועדים — חניכים וצוות יחד */
export const DEFAULT_HEADCOUNT = 37;

/** שם השורה בלוח ההגדרות */
export const SETTING_HEADCOUNT = "מספר סועדים";

/* ------------------------------------------------------------
   ⚠ סוף השבוע מתומחר יומיים נפרדים: שישי 38 ושבת 37, יחד 75.
     קודם הוא היה סוג אחד ב-75 שנזקף כולו ליום שישי, והשבת
     הופיעה באפס — נכון חשבונית, מבלבל למי שקורא את הטבלה.
     שני סוגים נפרדים מייתרים את כלל ה"נספר בשישי" לגמרי.
   ------------------------------------------------------------ */

/** כמה עולה יום אחד לאדם */
export function dayCostPerPerson(type) {
  return type ? (Number(type.cost) || 0) : 0;
}

/** סדר התצוגה: "אחר" תמיד בסוף, השאר כסדר הלוח */
export function sortTypes(types) {
  const lastNames = new Set(DAY_TYPE_SEED.filter((t) => t.last).map((t) => t.name));
  return [...types].sort((a, b) =>
    (lastNames.has(a.name) ? 1 : 0) - (lastNames.has(b.name) ? 1 : 0));
}

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
