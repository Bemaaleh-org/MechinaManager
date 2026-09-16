/* ============================================================
   אימייל בחוות דעת
   ------------------------------------------------------------
     npm run seed:eval-mail

   עמודה אחת בלוח חוות הדעת: "אימייל".

   ⚠ **הטלפון כבר קיים** (`LESSON_COLS.evals.phone`) ופשוט לא
     היה ניתן לעריכה מהמסך. הבקשה הייתה "להוסיף שם פרטי קשר
     בכל חוות דעת", ולכן נוסף מה שחסר — ולא עמודה שנייה לטלפון.

   ⚠⚠ **ולמה לא לקרוא את פרטי הקשר מהגיליון.** הגיליון נושא
     טלפון ואימייל של המרצה **הקבוע** שלו. שלושת הגיליונות של
     ועדת קבוצה ותוכן הם "מרצה מתחלף" — לכל מפגש מרצה אחר,
     ולגיליון עצמו אין מרצה כלל. פרטי הקשר שייכים לשורה, לא
     לגיליון.

   ⚠ **אידמפוטנטי** — העמודה נמצאת לפי שם ואינה נוצרת שוב.

   ⚠ **וכותב את המזהה בהחלפה כירורגית** ל-shared/lessons-boards.js:
     הקובץ אינו מחולל והוא מלא בהערות שסקריפט היה מוחק, ולכן
     רק מציין המקום הריק מוחלף ושורה שכבר נושאת מזהה מדווחת
     ואינה נדרסת.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";

/* ⚠ `LESSON_BOARDS` הוא אובייקט שנדרס בזמן ריצה (4ל) — כלי
   שקורא אותו כמות שהוא כותב ללוח של המחזור שכתוב בקוד. */
await ensureCycle();
const { LESSON_BOARDS } = await import("../shared/lessons-boards.js");

const PATH = "shared/lessons-boards.js";
const TITLE = "אימייל";

if (!LESSON_BOARDS.evals) {
  console.error("\n✗ לוח חוות הדעת אינו מוגדר.\n");
  process.exit(1);
}

const board = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`,
  { b: [LESSON_BOARDS.evals] })).boards[0];
console.log(`\nלוח: ${board.name}`);

let colId;
const have = board.columns.find((c) => String(c.title).trim() === TITLE);
if (have) {
  colId = String(have.id);
  console.log(`  קיימת: ${TITLE} → ${colId}`);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!){ create_column(board_id:$b,title:$t,column_type:text){ id } }`,
    { b: LESSON_BOARDS.evals, t: TITLE });
  colId = String(d.create_column.id);
  console.log(`  נוצרה: ${TITLE} → ${colId}`);
}

let src = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)mail: )""(,)/;
if (empty.test(src)) {
  src = src.replace(empty, `$1"${colId}"$3`);
  writeFileSync(PATH, src, "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = src.match(/evals[\s\S]{0,400}?\n\s*mail: "([^"]+)"/);
  if (!filled) {
    console.error(`\n✗ לא נמצאה שורת mail ריקה בבלוק evals שב-${PATH}`);
    console.error("  הוסיפו שם  mail: \"\",  והריצו שוב.\n");
    process.exit(1);
  }
  console.log(`\n  לא נגעתי — mail כבר מוגדר: ${filled[1]}`);
}

/* ⚠ אימות בתהליך נפרד — `?v=` מבטל מטמון של מודול אחד ולא
   של הגרף שהוא מייבא (5כג). */
const probe = spawnSync(process.execPath, ["-e",
  `import("./shared/lessons-boards.js").then((m) => {
     process.stdout.write(m.evalMailReady() ? "ok" : "no");
   })`], { encoding: "utf8" });

if (probe.stdout.trim() !== "ok") {
  console.error("\n✗ evalMailReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ evalMailReady() = true");
console.log("⚠ shared/lessons-boards.js חייב להיכנס לקומיט.\n");
