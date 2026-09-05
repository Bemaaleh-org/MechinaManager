/* ============================================================
   אחריות — אוצר מילים אחד לכל התפקידים
   ------------------------------------------------------------
   "אילו אחריות נושא החניך הזה" נשאלת היום בשלושה מקומות שונים
   ומשלושה מקורות שונים:

     1. עמודת התפקידים בלוח החניכים — אחראי מטבח, מכולה,
        בטיחות, אב בית, לו״ז
     2. שיבוץ מוביל שבוע — לוח שבועות ההובלה
     3. יו״ר ועדה או סדרה — עמודה בלוח הגדרות השיבוצים

   ⚠ **שלוש הגדרות מקבילות מתפצלות.** זה כבר קרה כאן: סדר
     הקטגוריות של השיבוצים כתוב היום בשלושה מקומות נפרדים,
     ו-`KNOWN_ROLES` יושב ב-lessons-boards.js כשאף אחד אינו
     מייבא אותו — קבוע מת שמי שיערוך יחשוב שעשה משהו.

   ⚠ **`DUTY_TABS` הוא המקור לניווט ולקיצורים כאחד.** עיקרון
     4יט נשבר פעם אחת בדיוק בגלל שתי רשימות שאמורות היו להיות
     זהות — מסך המנהל ומסך בעל התפקיד. רשימה שלישית הייתה
     מבטיחה שזה יקרה שוב.

   ⚠ **המפתחות הם מחרוזות עברית מדויקות** ובהן גרש עברי ״.
     "אחראי לו״ז" עם גרשיים רגילים הוא מפתח אחר, ומשימה
     שתישמר איתו לא תזרוק שגיאה — היא פשוט לעולם לא תתאים.
   ============================================================ */

import {
  ROLE_SCHEDULE, ROLE_KITCHEN, ROLE_CONTAINER, ROLE_HOUSE, ROLE_SAFETY,
} from "./lessons-boards.js";

/** אחריות שאינה בעמודת התפקידים */
export const DUTY_LEADER = "מוביל שבוע";
export const DUTY_CHAIR = "יו״ר";

/* ============================================================
   מה כל אחריות פותחת
   ------------------------------------------------------------
   `tabs` הם מזהי המסכים במעטפת החניך (src/Mechina.jsx). אותה
   רשימה בדיוק מזינה את המגירה ואת רשת הקיצורים במרכז התפקיד,
   כדי ששתיהן לא יוכלו להיפרד.
   ============================================================ */
export const DUTIES = {
  [ROLE_KITCHEN]: {
    key: "kitchen", tone: 3, icon: "cart",
    short: "מטבח",
    tabs: [
      { tab: "k-all", label: "אוכל וחד״פ" },
      { tab: "budget", label: "תקציב המטבח" },
      { tab: "menu", label: "תפריט ארוחות" },
      /* ⚠ תורנות המטבח והחד״א היא שלו — הפירוט, הצ׳ק ליסט
         והמעקב. השיבוץ עצמו נשאר אצל אב הבית. */
      { tab: "chores", label: "תורנויות מטבח" },
    ],
  },
  [ROLE_CONTAINER]: {
    key: "container", tone: 5, icon: "box",
    short: "מכולה",
    tabs: [
      { tab: "container", label: "ציוד מכולה" },
      { tab: "loans", label: "השאלת ציוד" },
    ],
  },
  [ROLE_HOUSE]: {
    key: "house", tone: 7, icon: "tool",
    short: "אב בית",
    tabs: [
      { tab: "faults", label: "תקלות ובעיות" },
      { tab: "cleaning", label: "ציוד ניקיון" },
      /* ⚠ **המסך המרכזי של אב הבית**, ולכן ראשון בהמשך הרשימה. */
      { tab: "chores", label: "תורנויות" },
    ],
  },
  [ROLE_SAFETY]: {
    key: "safety", tone: 2, icon: "warn",
    short: "בטיחות",
    tabs: [
      { tab: "safety", label: "אירועי בטיחות" },
      { tab: "hosting", label: "אירוח קבוצות" },
    ],
  },
  [ROLE_SCHEDULE]: {
    key: "schedule", tone: 1, icon: "cal",
    short: "לו״ז",
    /* ⚠ **ארבעה מסכים ולא אחד.** "שיעורים במכינה" היה דף אחד
       עם ארבע לשוניות פנימיות, ולשונית שנבלעת ברצועה אינה
       קיימת (4ר). כל אחד מהם נפתח מסיבה אחרת.
       ⚠ **אותו מסך בדיוק של הצוות, ולא גרסה מקוצצת** (4יט).
       מסך שנוסף כאן מופיע מעצמו גם במגירה וגם במרכז התפקיד. */
    tabs: [
      { tab: "l-board", label: "שיעורים קרובים" },
      { tab: "l-sheets", label: "גיליונות מרצים" },
      { tab: "l-evals", label: "חוות דעת" },
      { tab: "pay", label: "תשלום למרצים" },
      { tab: "gantt", label: "גאנט שנתי" },
    ],
  },
  [DUTY_LEADER]: {
    key: "leader", tone: 4, icon: "sun",
    short: "מוביל שבוע",
    /* ⚠ למוביל השבוע די ב**שיעורים הקרובים** — הוא מדווח קיום
       מפגשים, ואינו עורך גיליונות ואינו רואה כסף. */
    tabs: [
      { tab: "mark", label: "סימון נוכחות" },
      { tab: "l-board", label: "שיעורים קרובים" },
      { tab: "leadership", label: "המובילשיות שלי" },
    ],
  },
  /* ⚠ ליו״ר אין מסך ייעודי שנפתח לו — האחריות שלו היא על
     הוועדה או הסדרה עצמה, ולא על מסך במערכת. הוא מקבל משימות
     והצפות, וזה כל מה שהוא צריך. `tabs` ריק ולא חסר, כדי
     שהקוד לא יצטרך לבדוק. */
  [DUTY_CHAIR]: {
    key: "chair", tone: 6, icon: "users",
    short: "יו״ר",
    tabs: [],
  },
};

/** כל שמות האחריות המוכרים */
export const DUTY_NAMES = Object.keys(DUTIES);

/** האם השם הזה הוא אחריות מוכרת */
export const isDuty = (name) => Object.prototype.hasOwnProperty.call(DUTIES, name);

/**
 * מה שידוע על אחריות, גם אם אינה מוכרת.
 * ⚠ תפקיד חדש שיתווסף בעמודת התפקידים ב-monday יגיע לכאן בלי
 *   שינוי קוד — הוא יקבל גוון ואייקון ברירת מחדל ולא ייעלם.
 *   זה אותו כלל של `roleTone` במסך התפקידים.
 */
export function dutyInfo(name) {
  const known = DUTIES[name];
  if (known) return { name, ...known };
  return {
    name, key: slug(name), tone: toneOf(name), icon: "users",
    short: name, tabs: [],
  };
}

/** גוון יציב מהשם — אותו שם מקבל תמיד אותו צבע */
export function toneOf(name) {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 8) + 1;
}

/** מפתח בטוח לכתובת, משם עברי */
const slug = (name) =>
  String(name || "").trim().replace(/["'׳״]/g, "").replace(/\s+/g, "-");

/* ============================================================
   האחריות של חניך אחד
   ------------------------------------------------------------
   ⚠ הקלט הוא **מה שכבר נטען**, ולא לוחות. הפונקציה טהורה כדי
     שגם המסך וגם השרת יוכלו לקרוא לה על אותם נתונים ולקבל
     אותה תשובה — אותו שיקול של shared/import-parse.js.
   ============================================================ */

/**
 * @param {object} p
 * @param {string[]} p.roles       התפקידים מעמודת הלוח
 * @param {boolean}  p.isLeader    האם משובץ כמוביל שבוע
 * @param {Array}    p.chairOf     ההגדרות שהוא יו״ר שלהן
 * @returns {Array} אחריות, בסדר קבוע
 */
export function dutiesOf({ roles = [], isLeader = false, chairOf = [] } = {}) {
  const out = [];
  /* ⚠ הסדר קבוע ואינו לפי הלוח: רשימה שמשנה סדר בכל טעינה
     מאלצת לקרוא אותה מחדש בכל פעם. */
  for (const name of DUTY_NAMES) {
    if (name === DUTY_LEADER || name === DUTY_CHAIR) continue;
    if (roles.includes(name)) out.push(dutyInfo(name));
  }
  /* תפקיד שאינו מוכר — נכנס אחרי המוכרים ולא נעלם */
  for (const name of roles) {
    if (!isDuty(name) && !out.some((d) => d.name === name)) out.push(dutyInfo(name));
  }
  if (isLeader) out.push(dutyInfo(DUTY_LEADER));
  for (const c of chairOf) {
    /* ⚠ ליו״ר יש **מופע לכל ועדה**, ולא אחריות אחת כללית.
       חניך יכול להיות יו״ר של שתי ועדות, והמשימות של כל אחת
       שייכות לה. `scope` הוא מה שמפריד ביניהן. */
    out.push({
      ...dutyInfo(DUTY_CHAIR),
      scope: c.id,
      scopeName: c.name,
      category: c.category || null,
      label: `יו״ר ${c.name}`,
    });
  }
  return out.map((d) => ({ ...d, label: d.label || d.name }));
}

/**
 * מפתח יציב לאחריות — משמש כמזהה משימה, מסמך חפיפה והצפה.
 * ⚠ כולל את ה-scope, אחרת שתי ועדות של אותו יו״ר היו חולקות
 *   רשימת משימות אחת.
 */
export const dutyKey = (d) =>
  d.scope ? `${d.name}#${d.scope}` : String(d.name || "");

/** הפוך — ממפתח לשם ולתחום */
export function parseDutyKey(key) {
  const s = String(key || "");
  const i = s.indexOf("#");
  return i < 0 ? { name: s, scope: null } : { name: s.slice(0, i), scope: s.slice(i + 1) };
}
