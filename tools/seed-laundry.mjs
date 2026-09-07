/* ============================================================
   חדר כביסה — לוח אחד, והספירה נגזרת
   ------------------------------------------------------------
   `מכינה ב׳ – כביסה` — שורה לכל תור: מי, מתי, איזו מכונה, כמה
   זמן ואיזו כביסה.

   ⚠ **לוח אחד ולא שניים.** "כמה כביסות עשה כל חניך השנה" הוא
     ספירת שורות בלוח הזה, ולא לוח מונים שמישהו צריך לעדכן —
     מונה שמור מתיישן ברגע שמישהו מוחק תור בלוח (4כו). זו
     ספירה "בשביל הכיף", ומספר אחד לחניך הוא כל מה שיש בה.

   ⚠ **הבעלים בעמודת מזהה, והשם לצידה.** המזהה הוא מה שהשרת
     משווה ("האם זה שלי"); השם הוא מה שהלוח מציג — הלוח הוא
     מסד הנתונים ומישהו יסתכל בו.

   ⚠ **השעה טקסט `HH:MM` ולא עמודת hour של monday.** היא מחזירה
     `{hour, minute}` ומקבלת פורמט משלה, ושתי המרות בכל כיוון הן
     שתי הזדמנויות לשגות (4ר).

   ⚠ מדלגים על מפתח 5 בכל רשימת תוויות — המשבצת הריקה (5ז).

   ⚠ אידמפוטנטי: לוח קיים באותו שם אינו נוצר שוב, ועמודה
     נמצאת לפי הכותרת. ההרצה השנייה כותבת את אותם מזהים.

   ⚠ אחרי ההרצה: `npm run clean:defaults` — monday יוצרת לוח
     חדש עם שורות דמה ("Task 1"), והן היו מופיעות כתור אמיתי
     בלוח השבועי (5יב).

   הרצה: npm run seed:laundry
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

/** ⚠ זהות בתו לתוויות שבלוח. */
export const MACHINES = ["מכונת כביסה", "מייבש"];
export const KINDS = ["לבנים", "צבעוניים", "מצעים ומגבות", "עדינה", "מעורב"];

const TITLE = "מכינה ב׳ – כביסה";

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [board] })).boards[0].columns;

const make = async (board, title, type, labels) => {
  const have = (await cols(board)).find((c) => String(c.title).trim() === title);
  if (have) return String(have.id);
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type,
      s: labels
        ? JSON.stringify({ labels: Object.fromEntries(labels.map((l, i) => [LABEL_KEYS[i], l])) })
        : null });
  console.log(`  ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

const existing = (await gql(`{ boards(limit:400, state:active){ id name } }`)).boards;
const board = async (title) => {
  const hit = existing.find((b) => String(b.name).trim() === title);
  if (hit) { console.log("קיים: " + title); return String(hit.id); }
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`, { n: title });
  console.log("נוצר: " + title + " → " + d.create_board.id);
  return String(d.create_board.id);
};

/* ---------- הלוח ---------- */
const boards = { board: await board(TITLE) };
const colsOut = {
  /* ⚠ מזהה ושם — ראו ההערה בראש. */
  student: await make(boards.board, "מזהה חניך", "text"),
  studentName: await make(boards.board, "חניך", "text"),
  date: await make(boards.board, "תאריך", "date"),
  hour: await make(boards.board, "שעה", "text"),
  machine: await make(boards.board, "מכונה", "status", MACHINES),
  kind: await make(boards.board, "סוג כביסה", "status", KINDS),
  minutes: await make(boards.board, "דקות", "numbers"),
  note: await make(boards.board, "הערה", "text"),
  /* ⚠ מי רשם — לא בהכרח מי מכבס. אב הבית מזמין בשם חניך, והלוח
     צריך להראות את שניהם. */
  by: await make(boards.board, "נרשם על ידי", "text"),
  byId: await make(boards.board, "מזהה רושם", "text"),
};

/* ---------- כתיבה ---------- */
const path = "shared/laundry-ids.js";
const head = `/* ============================================================
   מזהי לוח הכביסה — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-laundry.mjs.
   להקמה:  npm run seed:laundry

   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).
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

put("LAUNDRY_BOARDS", boards);
put("LAUNDRY_COLS", colsOut);
put("MACHINES", MACHINES);
put("KINDS", KINDS);

/* ⚠ בודק את ה-export עצמו ולא את המילה. שם הפונקציה מופיע
   גם בהערת הכותרת, ולכן includes החזיר true גם כשה-export
   עצמו חסר — ואז הוא לעולם לא הוחזר, והאימות נפל
   על "אין laundryReady()" אחרי הרצה שהצליחה. */
if (!new RegExp("export const laundryReady\\s*=").test(src)) {
  src += `
/** ⚠ הלוח אינו חובה — בלעדיו המסך אומר מה להריץ (עיקרון 6). */
export const laundryReady = () => Boolean(LAUNDRY_BOARDS.board);
`;
}

writeFileSync(path, src, "utf8");
console.log("\nנכתב shared/laundry-ids.js — חייב להיכנס לקומיט.");
console.log("ועכשיו: npm run clean:defaults — למחוק את שורות הדמה של monday.");
