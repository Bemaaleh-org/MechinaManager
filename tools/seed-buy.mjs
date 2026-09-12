/* ============================================================
   לוח "מכינה – קניות כלליות"
   ------------------------------------------------------------
     npm run seed:buy

   רשימת הקניות שראש המכינה מנהל: כל מה שצריך לקנות ואינו
   מלאי מטבח ואינו ציוד מכולה.

   ⚠ **מחוץ ל-CYCLE_BOARDS** — ראו הנימוק ב-shared/buy-ids.js.

   ⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז). כאן זה היה גורם לכל שורה חדשה להיראות
     כאילו כבר נקנתה.

   ⚠ אידמפוטנטי — לוח או עמודה שקיימים באותו שם אינם נוצרים שוב.
   ⚠ אחרי ההרצה: npm run clean:defaults (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { BUY_STATUSES } from "../shared/buy-ids.js";

const TITLE = "מכינה – קניות כלליות";
const PATH = "shared/buy-ids.js";

/* ⚠ 0,1,2,3,4,6,7… — מפתח 5 מדולג. */
const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 0; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();
const labels = (names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(LABEL_KEYS[i]), n])) });

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [board] })).boards[0].columns;

const make = async (board, title, type, defaults) => {
  const have = (await cols(board)).find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type, s: defaults || null });
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

const existing = (await gql(`{ boards(limit:400, state:active){ id name } }`)).boards;
const hit = existing.find((b) => String(b.name).trim() === TITLE);
let board;
if (hit) { board = String(hit.id); console.log(`\nקיים: ${TITLE} → ${board}\n`); }
else {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`, { n: TITLE });
  board = String(d.create_board.id);
  console.log(`\nנוצר: ${TITLE} → ${board}\n`);
}

const out = {
  /* ⚠ הכמות היא **טקסט** ולא מספר, כמו בשתי הרשימות האחרות:
     "שני שקים" ו-"4 מטר" הן כמויות אמיתיות שעמודת מספר הייתה
     מוחקת או נכשלת עליהן. */
  qty: await make(board, "כמה", "text"),
  detail: await make(board, "פירוט", "long_text"),
  status: await make(board, "סטטוס", "status", labels(BUY_STATUSES)),
  /* ⚠ שם ולא מזהה: הרשימה מנוהלת על ידי ראש המכינה, וה"מי
     הוסיף" כאן הוא מי לשאול על השורה — לא מעקב על חניך
     (עיקרון 5, ואותו נימוק של "מי לקח" בפניות הגיוס 5כו). */
  by: await make(board, "מי הוסיף", "text"),
  date: await make(board, "נוסף בתאריך", "date"),
};

const head = `/* ============================================================
   רשימת הקניות הכללית — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-buy.mjs.
   ============================================================ */

`;
let src = existsSync(PATH) ? readFileSync(PATH, "utf8") : head;

/* ⚠ `;\r?\n` ומחיקת כפילויות — ראו ההסבר ב-5כג. */
const put = (name, value) => {
  const re = () => new RegExp(`export const ${name} = [\\s\\S]*?;\\r?\\n`, "g");
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  if (!re().test(src)) { src += "\n" + line; return; }
  let first = true;
  src = src.replace(re(), () => (first ? ((first = false), line) : ""));
};

put("BUY_BOARDS", { board });
put("BUY_COLS", out);
writeFileSync(PATH, src, "utf8");

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/buy-ids.js?v=" + Date.now());
if (!fresh.buyReady()) {
  console.error("\n✗ buyReady() עדיין false.\n");
  process.exit(1);
}
console.log(`\n✓ נכתב ${PATH} — חייב להיכנס לקומיט.`);
console.log("✓ buyReady() = true\n");
console.log("עכשיו: npm run clean:defaults\n");
