/* ============================================================
   לוח "מטבח – מצרכים קבועים לשבוע"
   ------------------------------------------------------------
     npm run seed:staples

   הבקשה: *"אני רוצה שיהיה לאחראי מטבח אופציה להוסיף ברשימה
   הזאת רשימה קבועה של מצרכים קבועים לשבוע לדוגמא 90 ביצים
   לשבוע הקרוב ואז בוחרים אותם ומוסיפים לרשימה."*

   ⚠ **למה לוח ולא רשימה בקוד:** אחראי המטבח משנה את זה —
     90 ביצים הופכות ל-120 כשמחזור גדל — וזה עיקרון 1 במלוא
     היקפו: מה שאפשר להגדיר בלוח מוגדר בלוח, בלי דיפלוי.

   ⚠ **ולמה לא מנה בלוח המנות:** מנה היא מתכון עם מצרכים
     לכמות אנשים, והכמות שלה מוכפלת (4יב). "90 ביצים לשבוע"
     אינה מוכפלת ואינה מתכון, ולוח המנות היה מציג אותה
     בבורר של תכנון ארוחה.

   ⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז). כאן זה היה גורם לכל שורה חדשה להיקרא
     "כבוי" ולא להופיע בכלל.

   ⚠ אידמפוטנטי — לוח או עמודה שקיימים באותו שם אינם נוצרים שוב.
   ⚠ אחרי ההרצה: npm run clean:defaults (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { STAPLE_ACTIVES } from "../shared/staples-ids.js";

const TITLE = "מטבח – מצרכים קבועים לשבוע";
const PATH = "shared/staples-ids.js";

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
  /* ⚠ **טקסט ולא מספר**, כמו בשלוש רשימות הקניות: "שני שקים"
     ו-"90 יחידות" הן כמויות אמיתיות שעמודת מספר הייתה מוחקת
     או נכשלת עליהן (4כב בציוד, 5מ ברשימה הכללית). */
  qty: await make(board, "כמה", "text"),
  note: await make(board, "הערה", "text"),
  /* ⚠ **כיבוי ולא מחיקה.** מצרך שלא צריך החודש חוזר בחודש
     הבא, ומחיקה הייתה מוחקת גם את הכמות שמישהו כיוון. */
  active: await make(board, "פעיל", "status", labels(STAPLE_ACTIVES)),
};

const head = `/* ============================================================
   מצרכים קבועים לשבוע — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-staples.mjs.
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

put("STAPLE_BOARDS", { board });
put("STAPLE_COLS", out);
writeFileSync(PATH, src, "utf8");

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/staples-ids.js?v=" + Date.now());
if (!fresh.staplesReady()) {
  console.error("\n✗ staplesReady() עדיין false.\n");
  process.exit(1);
}
console.log(`\n✓ נכתב ${PATH} — חייב להיכנס לקומיט.`);
console.log("✓ staplesReady() = true\n");
console.log("עכשיו: npm run clean:defaults\n");
