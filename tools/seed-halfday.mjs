/* ============================================================
   עמודת "חצי יום" בלוח ימי הסימון
   ------------------------------------------------------------
     npm run seed:halfday

   חניך שיצא לחופש וחזר באמצע היום היה חייב להירשם או נוכח
   (ואז יום החופש נעלם מהנוכחות) או נעדר (ואז חצי היום שהוא
   כן היה נמחק). העמודה הזו היא המצב הרביעי.

   ⚠ **אידמפוטנטי** — עמודה בשם הזה אינה נוצרת שוב.

   ⚠ **וכותב את המזהה בעצמו** ל-shared/mechina-boards.js.
     הקובץ אינו מחולל והוא מלא בהערות, ולכן ההחלפה כירורגית:
     רק מציין המקום הריק מוחלף, ושורה שכבר נושאת מזהה אינה
     נדרסת ומדווחת (אותו דפוס של seed-appeal).

   ⚠ **המפתח הוא `halfDay` ולא `half`** — `half` כבר תפוס
     בקובץ במשמעות "מחצית א׳/ב׳", ושני שדות באותו שם היו
     שולחים את ההחלפה לשורה הלא-נכונה (5לב).
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";

const PATH = "shared/mechina-boards.js";
const board = MECHINA_BOARDS.marked;

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

/* ⚠ `long_text` ולא `people` — מזהי החניכים מופרדים בפסיק,
   בדיוק כמו `present` שלצידה. עמודת people הייתה דורשת חשבון
   monday לכל חניך, ואין להם. */
const ids = { halfDay: await ensure("חצי יום", "long_text") };

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
if (!fresh.halfDayReady()) {
  console.error("\n✗ halfDayReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ halfDayReady() = true");
console.log("⚠ shared/mechina-boards.js חייב להיכנס לקומיט.\n");
