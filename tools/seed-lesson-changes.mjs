/* ============================================================
   ארבע עמודות יומן השינויים בגיליונות
   ------------------------------------------------------------
     npm run seed:lesson-changes

   מה שהשתנה בגיליון — מתי, מה, ומי — כדי שאחראי הלו״ז יידע
   לעדכן את היומן החיצוני. ההסבר המלא ב-shared/lessons-boards.js.

   ⚠ **אידמפוטנטי** — עמודה בשם הזה אינה נוצרת שוב.

   ⚠ **וכותב את המזהים בעצמו** ל-shared/lessons-boards.js.
     הקובץ אינו מחולל והוא מלא בהערות, ולכן ההחלפה **כירורגית**:
     רק מציין המקום הריק ("") מוחלף, ושורה שכבר נושאת מזהה
     אינה נדרסת ומדווחת (הדפוס של seed-lesson-content).

   ⚠ **`changedAt` הוא `text` ולא `date`.** מה שנשמר שם הוא
     חותמת ISO מלאה, כי הפעמון משווה אותה מול `seenAt` שהוא
     `toISOString()`. עמודת תאריך של monday מחזירה יום בלבד,
     והשוואה כזו נכשלת באותו יום עצמו — בדיוק המקרה שבשבילו
     ההתראה קיימת.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";

const PATH = "shared/lessons-boards.js";
const board = LESSON_BOARDS.sheets;

if (!board) {
  console.error("\n✗ לוח הגיליונות אינו מוגדר.\n");
  process.exit(1);
}

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
  changedAt: await ensure("שינוי אחרון — מתי", "text"),
  changeNote: await ensure("שינוי אחרון — מה", "text"),
  changeBy: await ensure("שינוי אחרון — מי", "text"),
  changeById: await ensure("שינוי אחרון — מזהה", "text"),
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
const fresh = await import("../shared/lessons-boards.js?v=" + Date.now());
if (!fresh.changeLogReady()) {
  console.error("\n✗ changeLogReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ changeLogReady() = true");
console.log("⚠ shared/lessons-boards.js חייב להיכנס לקומיט.\n");
