/* ============================================================
   לוח אנשי המקצוע
   ------------------------------------------------------------
     npm run seed:pros

   ⚠ **אידמפוטנטי** — לוח בשם הזה אינו נוצר שוב, ועמודה בשם
     הזה אינה נוצרת שוב.

   ⚠ **מדלג על מפתח 5** בעמודת המקצוע — המשבצת הריקה של monday
     (5ז). בלעדיו איש מקצוע בלי מקצוע היה נקרא בטקסט כשם
     התווית שנפלה שם, וכל השורות הריקות היו מופיעות כמקצוע
     שאיש לא בחר.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { PROFESSIONS } from "../shared/pros-board.js";

const PATH = "shared/pros-ids.js";
const TITLE = "אנשי מקצוע";

/* ============================================================
   ⚠⚠⚠ **השאילתה בלי משתנה שאינו בשימוש, ובלי `catch`.**

   גרסה ראשונה הצהירה `$n` ולא השתמשה בו — GraphQL
   דוחה את זה (אותה תקלה של seed-content-sheets) — וה-`catch`
   הפך את השגיאה ל-`null`. התוצאה: הסקריפט הסיק שאין
   לוח ויצר אחד **בכל הרצה**, בלי שום רמז.

   ⚠ זה בדיוק הלקח של "סקריפט שיוצא 0 אינו עדות
     לכך שהוא עבד" (5כג): שגיאה שנבלעת ב-`catch`
     היא הדרך להפוך סקריפט אידמפוטנטי למחולל לוחות.
   ============================================================ */
const existing = (await gql(`{ boards(limit:400, state:active){ id name } }`)).boards;
let board = "";
const hit = existing.find((b) => String(b.name).trim() === TITLE);
if (hit) { board = String(hit.id); console.log(`הלוח קיים: ${TITLE} → ${board}`); }
else {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n,board_kind:public){ id } }`,
    { n: TITLE },
  );
  board = String(d.create_board.id);
  console.log(`נוצר לוח: ${TITLE} → ${board}`);
}

const cols = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`, { b: [board] },
)).boards[0].columns;

/* ============================================================
   ⚠⚠ **המפתחות מתחילים ב-0, ומדלגים על 5.**

   0,1,2,3,4,6,7… — בדיוק כמו `LABEL_KEYS` ב-seed-buy.
   גרסה שהתחילה ב-1 נפלה ב-`INTERNAL_SERVER_ERROR` סתום
   מ-monday — ללא שום הסבר, והעמודות הפשוטות עברו
   באותה הרצה. **מפתח 0 חייב להתקיים.**

   ⚠ ו-5 מדולג מהסיבה המוכרת (5ז): זו המשבצת
     הריקה, ותווית שתשב עליה תיקרא על כל שורה
     שאין בה בחירה.
   ============================================================ */
const labels = () => {
  const keys = [];
  for (let k = 0; keys.length < PROFESSIONS.length; k++) if (k !== 5) keys.push(k);
  return Object.fromEntries(PROFESSIONS.map((n, i) => [String(keys[i]), n]));
};

async function ensure(title, type, defaults) {
  const have = cols.find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type, s: defaults ? JSON.stringify(defaults) : null },
  );
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
}

const ids = {
  profession: await ensure("מקצוע", "status", { labels: labels() }),
  phone: await ensure("טלפון", "text"),
  notes: await ensure("פרטים", "long_text"),
  photo: await ensure("תמונה", "file"),
  /* ⚠ קוטביות הפוכה — ראו shared/pros-ids.js. */
  archived: await ensure("לא בשימוש", "checkbox"),
};

/* ---- כתיבה לקובץ המחולל ---- */
let src = readFileSync(PATH, "utf8");
src = src.replace(/(export const PRO_BOARDS = \{ board: )""( \};)/, `$1"${board}"$2`);
for (const [k, v] of Object.entries(ids)) {
  src = src.replace(new RegExp(`(\\n(\\s*)${k}: )""(,)`), `$1"${v}"$3`);
}
writeFileSync(PATH, src, "utf8");
console.log(`\n✓ נכתב ל-${PATH}`);

/* ⚠⚠ אימות **בתהליך נפרד**: `?v=` מבטל את המטמון של המודול
   שנטען ולא של מה שהוא מייבא, ו-pros-board.js מייבא את
   pros-ids.js. ראו tools/ready-probe.mjs. */
const { spawnSync } = await import("node:child_process");
const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
  "import('./shared/pros-board.js').then(m=>process.exit(m.prosReady()?0:1))"],
  { cwd: process.cwd(), encoding: "utf8" });
if (probe.status !== 0) {
  console.error("\n✗ prosReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ prosReady() = true");
console.log("⚠ shared/pros-ids.js חייב להיכנס לקומיט.");
console.log("⚠ ואחריו: npm run clean:defaults -- --go (שורות ה-Task 1 של monday, 5יב).\n");
