/* ============================================================
   תקציב המטבח — סוגי ימים, חישוב ותוויות
   ------------------------------------------------------------
   כמה עולה להאכיל את המכינה בכל חודש, בשני ראשים נפרדים:

     קייטרינג — מה שמזמינים מבחוץ
     קניות    — כל השאר

   לכל סוג יום שלושה מספרים: קייטרינג לאדם, מספר קבוע
   לקייטרינג, וקניות לאדם.

   ⚠ המספר הקבוע קיים בגלל העשייה הקהילתית: 45 ₪ כפול 20,
     תמיד — גם אם יאכלו שם ארבעים איש או עשרה. שם הוא חלק
     מההסכם ולא נגזרת של המצבה, ולכן הוא לא זז איתה לעולם.
     0 פירושו "לפי מספר הסועדים בפועל".

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
  { name: "שגרה", catering: 34, fixedHeads: 0, purchases: 10 },
  { name: "סדרה", catering: 0, fixedHeads: 0, purchases: 35 },
  /* 45 × 20, קבוע — ראו ההערה למעלה */
  /* ⚠ 750 ₪ ליום לחדר האוכל של הקיבוץ, קבוע ובלתי תלוי במצבה */
  { name: "עשייה קהילתית", catering: 0, fixedHeads: 0, dining: 750, purchases: 8 },
  { name: "שישי מכינה", catering: 34, fixedHeads: 0, purchases: 25 },
  { name: "שבת מכינה", catering: 34, fixedHeads: 0, purchases: 10 },
  { name: "חזרה מהבית", catering: 0, fixedHeads: 0, purchases: 15 },
  /* ⚠ סוף שבוע בבית הוא "בית" ככל יום אחר: שלושה סוגים באפס
     ₪ הם אותו דבר בשלושה שמות, והם רק האריכו את הרשימה. */
  { name: "בית", catering: 0, fixedHeads: 0, purchases: 0 },
  /* ⚠ "אחר" תמיד אחרון ברשימה — הוא המוצא לימים חריגים
     שאין להם סוג, ולא בחירה שמציעים ראשונה. */
  { name: "אחר", catering: 0, fixedHeads: 0, purchases: 0, last: true },
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
export function dayCost(type, head, over = null, extra = null, flat = null) {
  /* ⚠ שלושה דליים ולא שניים:
       catering  קייטרינג — לפי מספר הסועדים
       dining    חד"א של הקיבוץ — סכום קבוע ליום
       purchases קניות — לפי מספר הסועדים

     החד"א נולד מיום העשייה הקהילתית, שבו אוכלים בחדר האוכל של
     הקיבוץ. קודם הוא היה מחופש לקייטרינג של 45×20, וזה הסתיר
     את מה שהוא באמת: תשלום קבוע לקיבוץ שאינו קשור לחוזה
     הקייטרינג ואינו זז עם המצבה. */
  const add = (r) => (flat != null ? { ...r, total: r.total + flat } : r);

  if (over != null) {
    return add({ catering: 0, dining: 0, purchases: over * head, total: over * head });
  }
  const one = (t) => {
    if (!t) return { catering: 0, dining: 0, purchases: 0 };
    /* ⚠ מספר קבוע גובר על המצבה — הוא לא זז איתה לעולם */
    const heads = Number(t.fixedHeads) > 0 ? Number(t.fixedHeads) : head;
    return {
      catering: (Number(t.catering) || 0) * heads,
      /* ⚠ לא מוכפל בכלום. זה סכום היום, לא סכום לאדם. */
      dining: Number(t.dining) || 0,
      purchases: (Number(t.purchases) || 0) * head,
    };
  };
  /* ⚠ שני סוגים מתחברים. יום יכול להיות "שגרה + אחר": שגרה
     רגילה שקרה בה עוד משהו — סדרה קצרה, אירוע, ארוחה נוספת.
     עד היום היה צריך לבחור אחד מהם או להזין מחיר ידני שדורס
     את שניהם, ואז נעלמה הסיבה שבגללה היום יקר.

     ⚠ המחיר הידני (over) עדיין דורס את שניהם — הוא נועד למקרה
       שבו שום צירוף של סוגים אינו מתאר את היום. */
  const a = one(type), b = one(extra);
  const catering = a.catering + b.catering;
  const dining = a.dining + b.dining;
  const purchases = a.purchases + b.purchases;
  /* ⚠ flat מוסיף ואינו דורס — בניגוד ל-over. "שגרה + אחר של
     300 ₪" הוא יום שגרה רגיל שקרה בו משהו ב-300 ₪, ולא יום
     שכל עלותו 300. */
  return add({ catering, dining, purchases, total: catering + dining + purchases });
}

/** מה שמוצג כ"לאדם" */
export const perPersonOf = (type) =>
  type ? (Number(type.catering) || 0) + (Number(type.purchases) || 0) : 0;

/* ------------------------------------------------------------
   מצבת הסועדים לאורך השנה
   ------------------------------------------------------------
   ⚠ שינוי במצבה אינו רטרואקטיבי כברירת מחדל: חניך שעזב
     בינואר לא מוזיל את ספטמבר. לכן זו רשימת שינויים עם תאריך
     תחילה, ולא מספר אחד — ומי שכן רוצה לתקן את כל השנה בוחר
     בכך במפורש.
   ------------------------------------------------------------ */

/** המצבה שתקפה בתאריך נתון */
export function headcountAt(history, date, fallback = DEFAULT_HEADCOUNT) {
  if (!history || !history.length) return fallback;
  const sorted = [...history].sort((a, b) => String(a.from).localeCompare(String(b.from)));
  let value = sorted[0].value;
  for (const row of sorted) {
    if (!row.from || row.from <= date) value = row.value;
  }
  return value ?? fallback;
}

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

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** שלושה חודשים רצופים מחודש פתיחה — ברירת המחדל ההיסטורית */
export function consecutiveMonths(startMonth, count = ORDER_MONTHS) {
  const [y, m] = String(startMonth || "").split("-").map(Number);
  if (!y || !m) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/**
 * ============================================================
 * החודשים שקנייה רב-חודשית מתחלקת עליהם.
 * ------------------------------------------------------------
 * ⚠ **רשימה מפורשת גוברת על גזירה מחודש הפתיחה.** עד עכשיו
 *   כל קנייה רבעונית נפרשה על שלושה חודשים **רצופים** מחודש
 *   הפתיחה, וזו הנחה שאינה תמיד נכונה — קנייה יכולה לכסות
 *   ספטמבר ואוקטובר ולדלג על חודש שאין בו פעילות. אותו כלל
 *   כמו "מתוכנן" שבגיליון (4כה).
 *
 * ⚠ **שורה ישנה ממשיכה לעבוד.** רשימה ריקה נופלת חזרה
 *   לשלושה רצופים, ואף שורה קיימת אינה צריכה לזוז.
 *
 * ⚠ **ערך פסול מסונן ואינו מפיל.** חודש שמישהו הקליד ביד
 *   ב-monday בפורמט אחר יורד מהרשימה; אם לא נשאר כלום —
 *   נפילה לאחור. טבלת תקציב שנופלת בגלל תא אחד גרועה
 *   מטבלה שמתעלמת ממנו (4לו).
 * ============================================================
 */
export function orderMonths(startMonthOrOrder) {
  /* תאימות לאחור: הפונקציה נקראה עם מחרוזת בלבד */
  if (typeof startMonthOrOrder === "string" || startMonthOrOrder == null) {
    return consecutiveMonths(startMonthOrOrder);
  }
  const o = startMonthOrOrder;
  const listed = String(o.months || "")
    .split(",").map((x) => x.trim()).filter((x) => MONTH_RE.test(x));
  const uniq = [...new Set(listed)].sort();
  return uniq.length ? uniq : consecutiveMonths(o.startMonth);
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
  /* ⚠ **מחלקים במספר החודשים שנבחרו בפועל, לא ב-3 קבוע.**
     קנייה שנפרשת על שני חודשים היא חצי בכל אחד, ו-1/3 קשיח
     היה מאבד שליש מהסכום בלי שאיש יראה — הטבלה עדיין מסתכמת
     למספר סביר, והוא פשוט שגוי. */
  const ms = orderMonths(order);
  if (!ms.length || !ms.includes(month)) return 0;
  return (Number(order.amount) || 0) / ms.length;
}

/** החודשים שקנייה נוגעת בהם — לתצוגה */
export const monthsOf = (order) =>
  order.kind === ORDER_KIND.weekly
    ? [String(order.date || "").slice(0, 7)].filter(Boolean)
    : orderMonths(order);

export const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export const monthLabel = (m) => {
  const [y, mo] = String(m || "").split("-").map(Number);
  return y && mo ? `${MONTHS_HE[mo - 1]} ${y}` : m;
};
