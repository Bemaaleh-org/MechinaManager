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
   ⚠ מדפיס את שלוש השורות להעתקה ל-shared/lessons-boards.js.
     **הקובץ הזה אינו מחולל** ולכן ההעתקה ידנית, בכוונה: הוא
     מלא בהערות שסקריפט היה מוחק.
   ============================================================ */
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

console.log("\n⚠ להעתיק ל-shared/lessons-boards.js, בתוך LESSON_COLS.meetings:\n");
for (const w of WANT) console.log(`    ${w.key}: "${out[w.key]}",`);
console.log("\nבלי ההעתקה הזו contentReady() נשאר false והתוכן אינו נשמר.\n");
