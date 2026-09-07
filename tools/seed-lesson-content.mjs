/* ============================================================
   שלוש עמודות התוכן בלוח המפגשים
   ------------------------------------------------------------
     node --env-file=.env tools/seed-lesson-content.mjs

   מוסיף ללוח "מפגשי שיעור" את מה שהופך אותו ממעקב דיווח
   לארכיון שיעורים:

     סיכום השיעור   long_text  — מה היה, בכמה משפטים
     דפי עזר        file       — מצגת, דף מקורות, סיכום
     פתוח לדירוג    checkbox   — חוות דעת מזדמנת

   ⚠ **הסיכום נפרד מ"הערות".** "הערות" היא הערה תפעולית של
     אחראי הלו״ז ואינה יוצאת לחניך; הסיכום נכתב **כדי** שיקראו
     אותו. עמודה אחת לשניהם הייתה מדליפה את הראשונה.

   ⚠ **"פתוח לדירוג" קיים כי החלון הישן היה סגור מדי.** דירוג
     נפתח רק לגיליון "מרצה מתחלף" ורק 14 יום אחורה, ולכן סדנה
     חד-פעמית או שיעור מלפני חודש לא היו ניתנים לדירוג בכלל.

   ⚠ אידמפוטנטי — עמודה שקיימת בשם הזה אינה נוצרת שוב.

   ⚠ **וכותב את המזהים בעצמו** ל-shared/lessons-boards.js.
     ההעתקה הידנית הייתה השלב היחיד בהקמה שדרש מאדם לערוך קוד,
     והיא גם היחיד שאפשר לשכוח — ואז העמודות קיימות ב-monday,
     `contentReady()` נשאר false, והמסך אומר "טרם הוקם" על משהו
     שכן הוקם.

     ⚠ **ההחלפה כירורגית ולא כתיבה מחדש של הקובץ.** הקובץ הזה
       אינו מחולל והוא מלא בהערות שמסבירות למה כל עמודה קיימת;
       סקריפט שהיה כותב אותו מחדש היה מוחק אותן. לכן מוחלפות
       שלוש שורות בדיוק — הריקות שנכתבו כמציין מקום — ואם אחת
       מהן אינה ריקה, הסקריפט **אינו נוגע בה** ומדווח.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";

const WANT = [
  { key: "summary", title: "סיכום השיעור", type: "long_text" },
  { key: "files", title: "דפי עזר", type: "file" },
  { key: "openRate", title: "פתוח לדירוג", type: "checkbox" },
];

const board = LESSON_BOARDS.meetings;
if (!board) {
  console.error("\n✗ לוח המפגשים אינו מוגדר ב-shared/lessons-boards.js\n");
  process.exit(1);
}

const cols = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title type } } }`, { b: [board] }
)).boards[0];

console.log(`\nלוח: ${cols.name}\n`);

const out = {};
for (const w of WANT) {
  const have = cols.columns.find((c) => String(c.title).trim() === w.title);
  if (have) {
    out[w.key] = String(have.id);
    console.log(`  קיימת: ${w.title} → ${have.id}`);
    continue;
  }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: board, t: w.title, c: w.type });
  out[w.key] = String(d.create_column.id);
  console.log(`  נוצרה: ${w.title} → ${d.create_column.id}`);
}

/* ---- כתיבת המזהים לקובץ ---- */
const PATH = "shared/lessons-boards.js";
let src = readFileSync(PATH, "utf8");
const wrote = [], skipped = [];

for (const w of WANT) {
  /* ⚠ תופס **רק** את מציין המקום הריק. שורה שכבר נושאת מזהה
     נשארת כפי שהיא — הסקריפט אינו דורס עבודה קיימת. */
  const empty = new RegExp(`(\\n\\s*${w.key}: )""(,)`);
  if (empty.test(src)) {
    src = src.replace(empty, `$1"${out[w.key]}"$2`);
    wrote.push(w.key);
    continue;
  }
  const filled = new RegExp(`\\n\\s*${w.key}: "([^"]+)"`);
  const m = src.match(filled);
  skipped.push(m ? `${w.key} (כבר מוגדר: ${m[1]})` : `${w.key} (השורה לא נמצאה)`);
}

if (wrote.length) {
  writeFileSync(PATH, src, "utf8");
  console.log(`\n✓ נכתבו ל-${PATH}: ${wrote.join(", ")}`);
}
if (skipped.length) console.log(`  לא נגעתי ב: ${skipped.join(" · ")}`);

/* ⚠ אימות בקריאה חוזרת: הסקריפט אינו מדווח הצלחה על סמך
   ההחלפה עצמה. ייבוא טרי מוודא ש-contentReady() באמת true. */
const fresh = await import("../shared/lessons-boards.js?v=" + Date.now());
if (fresh.contentReady()) {
  console.log("\n✓ contentReady() = true — ארכיון השיעורים והדירוג המזדמן פעילים.");
  console.log("⚠ shared/lessons-boards.js חייב להיכנס לקומיט.\n");
} else {
  console.log("\n✗ contentReady() עדיין false. שלוש השורות בתוך LESSON_COLS.meetings:");
  for (const w of WANT) console.log(`    ${w.key}: "${out[w.key]}",`);
  console.log("");
  process.exit(1);
}
