/* ============================================================
   חד״א — כמה אכלו בפועל
   ------------------------------------------------------------
     npm run seed:dining

   שלושה דברים, פעם אחת:
     1. עמודת "אכלו בחד״א" בלוח ימי התקציב
     2. שורת "מחיר חד״א לסועד" בלוח ההגדרות  (45 ₪)
     3. שורת "תקציב חד״א חודשי" בלוח ההגדרות (ריקה)

   ⚠ **המחיר בלוח ולא בקוד.** 45 ₪ הוא ההסכם של היום והוא
     ישתנה; `DEFAULT_DINING_RATE` הוא נפילה לאחור לשורה שטרם
     נוצרה, ולא מקור אמת (עיקרון 1).

   ⚠ **התקציב נוצר ריק בכוונה.** אף אחד לא מסר מספר, ומספר
     שנמציא ייראה כמו נתון — והמסך יציג "נשאר" שגוי. ריק
     פירושו "לא הוגדר", והמסך אומר זאת במילים (עיקרון 6).

   ⚠ **אידמפוטנטי.** עמודה ושורות נמצאות לפי שם ואינן נוצרות
     שוב, וערך שכבר הוזן אינו נדרס.

   ⚠ **וכותב את המזהה בעצמו** ל-shared/budget-ids.js. הקובץ
     מחולל על ידי seed-budget, אבל הרצה חוזרת שלו לא תגיע לכאן
     — ולכן ההחלפה **כירורגית**: רק מציין המקום הריק מוחלף,
     ושורה שכבר נושאת מזהה אינה נדרסת ומדווחת.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { BUDGET_BOARDS, BUDGET_COLS } from "../shared/budget-ids.js";
import {
  SETTING_DINING_RATE, SETTING_DINING_BUDGET, DEFAULT_DINING_RATE,
} from "../shared/budget-boards.js";

const PATH = "shared/budget-ids.js";
const COL = "אכלו בחד״א";

if (!BUDGET_BOARDS.days || !BUDGET_BOARDS.settings) {
  console.error("\n✗ לוחות התקציב טרם הוקמו. הריצו קודם: npm run seed:budget\n");
  process.exit(1);
}

/* ---------- 1 · העמודה ---------- */
const cols = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`,
  { b: [BUDGET_BOARDS.days] })).boards[0];
console.log(`\nלוח: ${cols.name}`);

let colId;
const have = cols.columns.find((c) => String(c.title).trim() === COL);
if (have) {
  colId = String(have.id);
  console.log(`  קיימת: ${COL} → ${colId}`);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!){ create_column(board_id:$b,title:$t,column_type:numbers){ id } }`,
    { b: BUDGET_BOARDS.days, t: COL });
  colId = String(d.create_column.id);
  console.log(`  נוצרה: ${COL} → ${colId}`);
}

/* ---------- 2 · שתי שורות ההגדרה ---------- */
const items = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ items_page(limit:200){ items{ id name } } } }`,
  { b: [BUDGET_BOARDS.settings] })).boards[0].items_page.items;

async function ensureSetting(name, value) {
  const hit = items.find((i) => String(i.name || "").trim() === name);
  if (hit) {
    /* ⚠ ערך שמישהו כבר הזין אינו נדרס — זו כל הסיבה שהוא בלוח. */
    console.log(`  קיימת שורה: ${name}`);
    return;
  }
  const cv = value == null ? {} : { [BUDGET_COLS.settings.value]: String(value) };
  await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b,item_name:$n,column_values:$v){ id } }`,
    { b: BUDGET_BOARDS.settings, n: name, v: JSON.stringify(cv) });
  console.log(`  נוצרה שורה: ${name}${value == null ? " (ריקה)" : ` = ${value}`}`);
}

await ensureSetting(SETTING_DINING_RATE, DEFAULT_DINING_RATE);
/* ⚠ ריקה — ראו ההערה בראש הקובץ. */
await ensureSetting(SETTING_DINING_BUDGET, null);

/* ---------- 3 · כתיבת המזהה ---------- */
let src = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)diningHeads: )""(,)/;
if (empty.test(src)) {
  src = src.replace(empty, `$1"${colId}"$3`);
  writeFileSync(PATH, src, "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = src.match(/\n\s*diningHeads: "([^"]+)"/);
  if (!filled) {
    console.error(`\n✗ לא נמצאה השורה diningHeads ב-${PATH}`);
    process.exit(1);
  }
  console.log(`\n  לא נגעתי — diningHeads כבר מוגדר: ${filled[1]}`);
}

/* ⚠ אימות בקריאה חוזרת ולא על סמך ההחלפה עצמה (5כג).
   ⚠ ומייבא את **קובץ המזהים** ולא את budget-boards: ייבוא
     מבוטל-מטמון של המעטפת עדיין מקבל את ה-ids מהמטמון, ואז
     האימות מדווח "לא קרה כלום" על כתיבה שהצליחה — בדיוק
     הדיווח שמסתיר כישלון אמיתי בפעם הבאה (5ז). */
const fresh = await import("../shared/budget-ids.js?v=" + Date.now());
if (!fresh.BUDGET_COLS.days.diningHeads) {
  console.error("\n✗ diningHeads עדיין ריק בקובץ המזהים.\n");
  process.exit(1);
}
console.log("✓ diningHeads = " + fresh.BUDGET_COLS.days.diningHeads);
console.log("⚠ shared/budget-ids.js חייב להיכנס לקומיט.\n");
