/* ============================================================
   לוח "באגים והערות לשיפור"
   ------------------------------------------------------------
     npm run seed:bugs

   ⚠ **לוח נפרד מלוח התקלות, ובכוונה.** מזגן שבור הולך לאב
     הבית; כפתור שאינו מגיב הולך למי שמתחזק את הקוד. לוח אחד
     לשניהם היה מערבב שתי רשימות מטלות של שני אנשים שונים,
     ואב הבית היה מקבל התראות על דברים שאינם שלו.

   ⚠ **מחוץ ל-CYCLE_BOARDS** — באג אינו של מחזור מסוים, והוא
     נשאר פתוח גם אחרי שהמחזור התחלף (4מז, 5יא).

   ⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז). כאן זה היה גורם לכל דיווח חדש להיראות
     כאילו כבר טופל.

   ⚠ אידמפוטנטי — לוח או עמודה שקיימים באותו שם אינם נוצרים שוב.
   ⚠ אחרי ההרצה: npm run clean:defaults (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { BUG_KINDS, BUG_STATUSES } from "../shared/bugs-ids.js";

const TITLE = "מערכת – באגים והערות";
const PATH = "shared/bugs-ids.js";

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
  kind: await make(board, "סוג", "status", labels(BUG_KINDS)),
  where: await make(board, "באיזה מסך", "text"),
  detail: await make(board, "פירוט", "long_text"),
  status: await make(board, "סטטוס", "status", labels(BUG_STATUSES)),
  /* ⚠ שם **ומזהה**: השם לצוות, והמזהה הוא מה שקובע בעלות.
     שם לבדו אינו מתעדכן כשמישהו משנה שם (4מו). */
  reporter: await make(board, "מדווח", "text"),
  reporterId: await make(board, "מזהה מדווח", "text"),
  date: await make(board, "תאריך", "date"),
  reply: await make(board, "תשובה", "long_text"),
};

const head = `/* ============================================================
   באגים והערות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-bugs.mjs.
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

put("BUG_BOARDS", { board });
put("BUG_COLS", out);
writeFileSync(PATH, src, "utf8");

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/bugs-ids.js?v=" + Date.now());
if (!fresh.bugsReady()) {
  console.error("\n✗ bugsReady() עדיין false.\n");
  process.exit(1);
}
console.log(`\n✓ נכתב ${PATH} — חייב להיכנס לקומיט.`);
console.log("✓ bugsReady() = true\n");
console.log("עכשיו: npm run clean:defaults\n");
