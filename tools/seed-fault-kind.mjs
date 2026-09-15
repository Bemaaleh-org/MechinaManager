/* ============================================================
   תקלה או שדרוג — עמודת הסוג בלוח התקלות
   ------------------------------------------------------------
     npm run seed:fault-kind

   הבקשה: *"בתקלות תוסיף אופציה לשידרוגים ותקרא לזה תקלות
   ושידרוגים, וגם שתיהיה בחירה האם זה תקלה או שדרוג."*

   ⚠ **אידמפוטנטי** — עמודה בשם הזה אינה נוצרת שוב.

   ⚠⚠ **ואינו ממלא את 40 השורות הקיימות.** הן נכתבו בעולם שבו
     כל שורה היא תקלה, ו"ריק = תקלה" בקוד (`shared/faults-board.js`)
     נותן להן בדיוק את המשמעות הנכונה. מילוי למפרע היה מסווג
     כשדרוג או כתקלה שורות שאיש לא סיווג — ומוחק את המספר
     שההבחנה קיימת בשבילו.

   ⚠ **מדלג על מפתח 5** — המשבצת הריקה של monday (5ז). בלעדיו
     שורה בלי בחירה הייתה נקראת בטקסט כשם התווית שנפלה שם, וכל
     40 השורות היו מופיעות כ"שדרוג".
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";
import { FAULTS } from "../shared/faults-ids.js";
import { KINDS } from "../shared/faults-board.js";

const PATH = "shared/faults-ids.js";
const TITLE = "סוג";

/* ⚠ המזהים נדרסים בזמן ריצה (4ל). */
await ensureCycle();
const board = FAULTS.board;
if (!board) {
  console.error("\n✗ לוח התקלות טרם הוקם — להקים אותו מהמסך.\n");
  process.exit(1);
}

const b = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`, { b: [board] },
)).boards[0];
console.log(`\nלוח: ${b.name}`);

/* ⚠ מפתחות 1,2 — ומדלגים על 5 (5ז). כאן יש שתי תוויות בלבד
   ולכן 5 לא בסכנה, אבל הדפוס נשמר כדי שהוספה שלישית מחר לא
   תיפול עליו. */
const labels = () => {
  const out = {};
  let k = 1;
  for (const name of KINDS) { if (k === 5) k = 6; out[String(k)] = name; k++; }
  return out;
};

let colId = "";
const have = b.columns.find((c) => String(c.title).trim() === TITLE);
if (have) {
  colId = String(have.id);
  console.log(`  קיימת: ${TITLE} → ${colId}`);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: TITLE, c: "status",
      s: JSON.stringify({ labels: labels() }) },
  );
  colId = String(d.create_column.id);
  console.log(`  נוצרה: ${TITLE} → ${colId}  (${KINDS.join(" · ")})`);
}

/* ---- המזהה לקובץ, בהחלפה כירורגית ---- */
let file = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)kind: )""(,)/;
if (empty.test(file)) {
  writeFileSync(PATH, file.replace(empty, `$1"${colId}"$3`), "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = file.match(/\n\s*kind: "([^"]+)"/);
  if (!filled) { console.error(`\n✗ לא נמצאה השורה kind ב-${PATH}`); process.exit(1); }
  console.log(`  לא נגעתי — kind כבר מוגדר: ${filled[1]}`);
}

/* ============================================================
   ⚠⚠⚠ **האימות בתהליך נפרד, ולא ב-`import(...?v=)`.**

   מחרוזת השאילתה מבטלת את המטמון של המודול שנטען
   — **ולא של מה שהוא מייבא.** `faults-board.js` מייבא את
   `faults-ids.js`, והסקריפט כותב לשני — כלומר התהליך
   שכבר טען אותו ריק ממשיך לראות אותו ריק לנצח.

   זה קרה כאן בהרצה הראשונה: העמודה נוצרה, המזהה נכתב
   נכון, והסקריפט דיווח כישלון. זה בדיוק הלקח של
   `tools/ready-probe.mjs`, וכל סקריפט שכותב לקובץ ids
   ומאמת דרך קובץ אחר חייב אותו.
   ============================================================ */
const { spawnSync } = await import("node:child_process");
const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
  "import('./shared/faults-board.js').then(m=>process.exit(m.faultKindReady()?0:1))"],
  { cwd: process.cwd(), encoding: "utf8" });
if (probe.status !== 0) {
  console.error("\n✗ faultKindReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ faultKindReady() = true");
console.log("⚠ shared/faults-ids.js חייב להיכנס לקומיט.\n");
