/* ============================================================
   שתי עמודות הערר בלוח בקשות היציאה
   ------------------------------------------------------------
     npm run seed:appeal

   בקשה שנדחתה הייתה סוף הדרך במערכת, והשיחה עברה לוואטסאפ.
   הערר מחזיר אותה: החניך כותב למה לדעתו צריך לשקול מחדש,
   וראש המכינה רואה זאת על אותה שורה ורשאי להכריע מחדש.

   ⚠ **הערר אינו משנה את הסטטוס.** "נדחה" עם ערר פתוח הוא
     עדיין "נדחה", והחניך אינו יוצא.

   ⚠ **אידמפוטנטי** — עמודה בשם הזה אינה נוצרת שוב.

   ⚠ **וכותב את המזהים בעצמו** ל-shared/mechina-boards.js.
     הקובץ אינו מחולל והוא מלא בהערות, ולכן ההחלפה כירורגית:
     רק מציין המקום הריק מוחלף, ושורה שכבר נושאת מזהה אינה
     נדרסת ומדווחת (אותו דפוס של seed-vacation-cost).
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";

const PATH = "shared/mechina-boards.js";
const board = MECHINA_BOARDS.requests;

const b = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`, { b: [board] }
)).boards[0];
console.log(`\nלוח: ${b.name}\n`);

async function ensure(title, type) {
  const have = b.columns.find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: board, t: title, c: type });
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
}

const ids = {
  appeal: await ensure("ערר", "long_text"),
  appealAt: await ensure("תאריך הערר", "date"),
};

let src = readFileSync(PATH, "utf8");
let wrote = 0;
for (const [key, id] of Object.entries(ids)) {
  const empty = new RegExp(`(\\n(\\s*)${key}: )""(,)`);
  if (empty.test(src)) { src = src.replace(empty, `$1"${id}"$3`); wrote++; continue; }
  const filled = src.match(new RegExp(`\\n\\s*${key}: "([^"]+)"`));
  if (!filled) {
    console.error(`\n✗ לא נמצאה השורה ${key} ב-${PATH}`);
    process.exit(1);
  }
  console.log(`  לא נגעתי — ${key} כבר מוגדר: ${filled[1]}`);
}
if (wrote) { writeFileSync(PATH, src, "utf8"); console.log(`\n✓ נכתב ל-${PATH}`); }

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/mechina-boards.js?v=" + Date.now());
if (!fresh.appealReady()) {
  console.error("\n✗ appealReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ appealReady() = true");
console.log("⚠ shared/mechina-boards.js חייב להיכנס לקומיט.\n");
