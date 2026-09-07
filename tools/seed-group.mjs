/* ============================================================
   לוח הודעות לקבוצה — מה שהמדריך מפרסם לקבוצה שלו
   ------------------------------------------------------------
   הקבוצה עצמה, השיבוץ אליה והמדריך שלה כבר קיימים בלוח
   ההגדרות ובלוח השיבוץ (tools/seed-placements.mjs). הלוח היחיד
   שחסר הוא מקום לשים בו הודעה: שורה אחת = הודעה אחת, ומזוהה
   לקבוצה בעמודת טקסט (מזהה ההגדרה) ולא בלינק בין לוחות — אותו
   דפוס כמו עמודות student/placement בלוח השיבוץ עצמו.

   ⚠ אין כאן עמודת סטטוס, ולכן אין צורך לדלג על מפתח 5 (5ז).
     אם ייווסף אי-פעם שדה קטגוריה בלוח הזה — יש לדלג עליו,
     כמו בכל לוח סטטוס אחר במערכת.

   ⚠ **אידמפוטנטי לפי שם הלוח**, כמו tools/seed-board.mjs:
     הרצה חוזרת לא יוצרת לוח כפול, רק משלימה עמודות חסרות.

   הרצה: npm run seed:group
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const TITLE = "מכינה ב׳ – הודעות לקבוצה";

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [board] })).boards[0].columns;

/** מוצא עמודה קיימת לפי כותרת, ואם אין — יוצר */
const make = async (board, title, type) => {
  const have = (await cols(board)).find((c) => String(c.title).trim() === title);
  if (have) return String(have.id);
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){
       create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: board, t: title, c: type });
  console.log(`  ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

const existing = (await gql(`{ boards(limit:400, state:active){ id name } }`)).boards;
const hit = existing.find((b) => String(b.name).trim() === TITLE);

const board = hit
  ? String(hit.id)
  : String((await gql(
      `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
      { n: TITLE })).create_board.id);

console.log(hit ? `קיים: ${TITLE} (${board})` : `נוצר: ${TITLE} → ${board}`);

const colsOut = {
  group: await make(board, "קבוצה", "text"),
  groupName: await make(board, "שם הקבוצה", "text"),
  body: await make(board, "תוכן", "long_text"),
  date: await make(board, "תאריך", "date"),
  /* ⚠ נעוץ הוא של המדריך או ראש המכינה שכתבו את ההודעה —
     אין כאן הפרדה בין "מי כתב" ל"מי נועץ" כמו בלוח המודעות
     הכללי, כי כאן אין קהל רחב שצריך להגן עליו מנעיצות. */
  pinned: await make(board, "נעוץ", "checkbox"),
  by: await make(board, "פורסם על ידי", "text"),
  byId: await make(board, "מזהה מפרסם", "text"),
};

/* ---------- כתיבת shared/group-ids.js ---------- */
const path = "shared/group-ids.js";
const head = `/* ============================================================
   מזהי לוח ההודעות לקבוצה — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-group.mjs.

   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign על האובייקט הקיים (4ל).
   ============================================================ */

`;

let src = existsSync(path) ? readFileSync(path, "utf8") : head;
const put = (name, value) => {
  /* ⚠ `;\\r?\\n` ולא `;\\n` — גיט בווינדוס בודק את הקבצים ב-CRLF,
     ואז הביטוי לא היה תופס כלום וכל put היה **מוסיף** הצהרה
     שנייה במקום להחליף. שתי הצהרות export לאותו שם הן
     SyntaxError, כלומר הקובץ כולו מפסיק להיטען. */
  const re = () => new RegExp(`export const ${name} = [\\s\\S]*?;\\r?\\n`, "g");
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  if (!re().test(src)) { src += "\n" + line; return; }
  /* ⚠ **הראשונה מוחלפת והשאר נמחקות.** קובץ שכבר נפגע מהבאג
     של CRLF מחזיק שתי הצהרות לאותו שם — וזה SyntaxError, כלומר
     כל api/students.js מפסיק להיטען וכל מסך מחזיר 500. החלפה
     של הראשונה בלבד הייתה משאירה אותו שבור. */
  let first = true;
  src = src.replace(re(), () => (first ? ((first = false), line) : ""));
};

put("GROUP_BOARDS", { messages: board });
put("GROUP_COLS", { messages: colsOut });

/* ⚠ בודק את ה-export עצמו ולא את המילה. שם הפונקציה מופיע
   גם בהערת הכותרת, ולכן includes החזיר true גם כשה-export
   עצמו חסר — ואז הוא לעולם לא הוחזר, והאימות נפל
   על "אין groupReady()" אחרי הרצה שהצליחה. */
if (!new RegExp("export const groupReady\\s*=").test(src)) {
  src += `
/** ⚠ הלוח אינו חוסם את מסך "הקבוצה שלי" — ראו api/_group.js:
    רכיב ההודעות מחזיר רשימה ריקה כשהלוח לא הוקם, אבל הקבוצה
    עצמה (מדריך, שיבוץ) ממשיכה לעבוד — היא נגזרת מלוחות אחרים. */
export const groupReady = () => Boolean(GROUP_BOARDS.messages);
`;
}

writeFileSync(path, src, "utf8");
console.log("\nנכתב shared/group-ids.js — חייב להיכנס לקומיט.");
console.log("להריץ אחר כך: npm run clean:defaults");
