/* ============================================================
   עמודת "ימי חופש" בלוח ההיעדרויות
   ------------------------------------------------------------
     npm run seed:vacation-cost

   שורת היעדרות נוצרת לכל יום לימודים בטווח הבקשה, כי לנוכחות
   זה הנתון הנכון — החניך באמת לא היה. אבל המכסה נמדדת בשעות,
   והמדריך רשאי לגבות פחות. שני המספרים אינם זהים, ולכן העמודה
   הזו: כמה השורה **עולה במכסה**, ולא כמה ימים היא מכסה.

   ⚠ **ריק = 1, ולא 0.** כל שורה שנוצרה לפני העמודה נכתבה
     בעולם שבו יום = יום. אפס היה מוחק למפרע את כל ימי החופש
     שנוצלו עד היום, ומחזיר לכל המכינה מכסה מלאה בטעות.
     הקוד קורא ריק כ-1, והסקריפט **אינו ממלא שורות קיימות**.

   ⚠ **אידמפוטנטי** — עמודה בשם הזה אינה נוצרת שוב.

   ⚠ **וכותב את המזהה בעצמו** ל-shared/mechina-boards.js.
     הקובץ אינו מחולל והוא מלא בהערות, ולכן ההחלפה כירורגית:
     רק מציין המקום הריק מוחלף, ושורה שכבר נושאת מזהה אינה
     נדרסת ומדווחת (אותו דפוס של seed-lesson-content).
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";

const TITLE = "ימי חופש";
const PATH = "shared/mechina-boards.js";
const board = MECHINA_BOARDS.absence;

const b = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title type } } }`, { b: [board] }
)).boards[0];

console.log(`\nלוח: ${b.name}\n`);

let id;
const have = b.columns.find((c) => String(c.title).trim() === TITLE);
if (have) {
  id = String(have.id);
  console.log(`  קיימת: ${TITLE} → ${id}`);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!){ create_column(board_id:$b,title:$t,column_type:numbers){ id } }`,
    { b: board, t: TITLE });
  id = String(d.create_column.id);
  console.log(`  נוצרה: ${TITLE} → ${id}`);
}

/* ---- כתיבת המזהה ---- */
let src = readFileSync(PATH, "utf8");
/* ⚠ `;\r?\n` אינו רלוונטי כאן (זו שורת שדה ולא הצהרה), אבל
   התפיסה חייבת להיות של **מציין המקום הריק בלבד**. */
const empty = /(\n(\s*)cost: )""(,)/;
if (empty.test(src)) {
  src = src.replace(empty, `$1"${id}"$3`);
  writeFileSync(PATH, src, "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = src.match(/\n\s*cost: "([^"]+)"/);
  console.log(filled
    ? `\n  לא נגעתי — cost כבר מוגדר: ${filled[1]}`
    : `\n✗ לא נמצאה השורה cost ב-${PATH}`);
  if (!filled) process.exit(1);
}

/* ⚠ אימות בקריאה חוזרת ולא על סמך ההחלפה עצמה. */
const fresh = await import("../shared/mechina-boards.js?v=" + Date.now());
if (!fresh.vacationCostReady()) {
  console.error("\n✗ vacationCostReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ vacationCostReady() = true");
console.log("⚠ shared/mechina-boards.js חייב להיכנס לקומיט.\n");
