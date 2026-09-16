/* ============================================================
   לוח "הרשאות מותאמות"
   ------------------------------------------------------------
     npm run seed:access

   שורה לכל התאמה: מי · איזה מסך · איזו רמה.

   ⚠⚠ **הלוח אינו נחוץ כדי שהמערכת תעבוד.** בלעדיו אין שום
     התאמה, וזה בדיוק המצב שהיה עד היום. לכן `accessReady()`
     שקרי אינו מחזיר 503 מאף מסך — הוא פשוט אומר "אין
     התאמות" (עיקרון 6 בכיוון הבטוח).

   ⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז). כאן זה היה גורם לכל שורה בלי רמה להיקרא
     "חסום", כלומר **לחסום מסך שאיש לא ביקש לחסום**.

   ⚠ אידמפוטנטי — לוח או עמודה שקיימים באותו שם אינם נוצרים שוב.
   ⚠ אחרי ההרצה: npm run clean:defaults (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { LEVELS, LEVEL_HE } from "../shared/access-rules.js";

const TITLE = "מכינה – הרשאות מותאמות";
const PATH = "shared/access-ids.js";

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
  /* ⚠ **טקסט ולא רשימה** לנושא ולמסך: הנושא הוא
     `role:אחראי בטיחות` או `user:12345`, והרשימה שלהם נגזרת
     מהחניכים ומהתפקידים שחיים בלוח אחר. עמודת status הייתה
     דורשת לתחזק תווית לכל תפקיד ולכל אדם. */
  subject: await make(board, "למי", "text"),
  screen: await make(board, "מסך", "text"),
  /* ⚠ הרמה **כן** רשימה — שלוש אפשרויות סגורות. */
  level: await make(board, "רמה", "status",
    labels(LEVELS.map((l) => LEVEL_HE[l]))),
  note: await make(board, "הערה", "text"),
  /* ⚠ שם ולא מזהה: זה "מי קבע את ההתאמה", ומי לשאול עליה —
     לא מעקב על חניך (אותו נימוק של "מי לקח" ב-5כו). */
  by: await make(board, "נקבע על ידי", "text"),
};

const head = `/* ============================================================
   הרשאות מותאמות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-access.mjs.
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

put("ACCESS_BOARDS", { board });
put("ACCESS_COLS", out);
writeFileSync(PATH, src, "utf8");

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/access-ids.js?v=" + Date.now());
if (!fresh.accessReady()) {
  console.error("\n✗ accessReady() עדיין false.\n");
  process.exit(1);
}
console.log(`\n✓ נכתב ${PATH} — חייב להיכנס לקומיט.`);
console.log("✓ accessReady() = true\n");
console.log("עכשיו: npm run clean:defaults\n");
