/* ============================================================
   הציטוט היומי — שני לוחות
   ------------------------------------------------------------
   1. `ציטוטים` — הבנק. שם השורה הוא תחילת הציטוט (120 תווים),
      הטקסט המלא בעמודה משלו. `ציטוט היום` הוא **תאריך על
      הציטוט** ולא לוח שני: ריק = יושב בבנק, תאריך = היום שבו
      הוא היה של היום. ⚠ ארכיון ולא מחיקה — התגובות נושאות את
      המזהה, ומחיקה הייתה משאירה אותן מצביעות על כלום.

   2. `תגובות לציטוט` — **שורה לכל חניך לכל ציטוט.** לא JSON על
      הציטוט: שני חניכים שמגיבים באותה שנייה היו דורסים זה את
      זה (עיקרון 5). תגובה חוזרת מחליפה את השורה, ותגובה ריקה
      מוחקת אותה.

   ⚠ **אין כאן עמודת סטטוס, ובכוונה.** התגובה היא טקסט חופשי —
     אימוג׳י או מילה — ורשימת תוויות סגורה הייתה דורשת
     `create_labels_if_missing` על כל אימוג׳י חדש (4טז). מה
     שמותר נבדק ברג׳קס בשרת, לא בתוויות.

   ⚠ **הבעלות לפי מזהה, והשם לצידו לתצוגה בלבד** (4מו).

   ⚠ מדלגים על מפתח 5 בכל רשימת תוויות — המשבצת הריקה (5ז).
     (אין כאן רשימות, אבל `make` יודע לקבל אחת — למי שיוסיף.)

   ⚠ **אחרי ההרצה:** `npm run clean:defaults` — monday יוצרת לוח
     חדש עם שורות דמה ("Task 1"), והן היו מופיעות כציטוט (5יב).

   הרצה: npm run seed:quotes
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

const NEW = {
  quotes: "מכינה ב׳ – ציטוטים",
  reactions: "מכינה ב׳ – תגובות לציטוט",
};

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [board] })).boards[0].columns;

/** מוצא עמודה לפי כותרת, או יוצר אותה. אידמפוטנטי. */
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

const boards = {};
const colsOut = {};

/* ---------- 1 · הבנק ---------- */
boards.quotes = await board(NEW.quotes);
colsOut.quotes = {
  /* שם השורה הוא תחילת הציטוט; כאן הטקסט המלא. */
  text: await make(boards.quotes, "הציטוט", "long_text"),
  author: await make(boards.quotes, "מי אמר", "text"),
  by: await make(boards.quotes, "נוסף על ידי", "text"),
  byId: await make(boards.quotes, "מזהה מוסיף", "text"),
  added: await make(boards.quotes, "נוסף", "date"),
  /* ⚠ תאריך ולא תיבה: "ציטוט היום" של אתמול נשאר עם התאריך
     של אתמול, וזו ההיסטוריה. תיבה הייתה דורשת ניקוי כל בוקר. */
  shown: await make(boards.quotes, "ציטוט היום", "date"),
  archived: await make(boards.quotes, "ארכיון", "checkbox"),
};

/* ---------- 2 · התגובות ---------- */
boards.reactions = await board(NEW.reactions);
colsOut.reactions = {
  quote: await make(boards.reactions, "ציטוט", "text"),
  student: await make(boards.reactions, "מזהה חניך", "text"),
  studentName: await make(boards.reactions, "חניך", "text"),
  /* שם השורה הוא התגובה עצמה; העמודה מחזיקה אותה גם, כדי
     שקריאה לא תיסמך על שם שמישהו שינה ביד. */
  reaction: await make(boards.reactions, "תגובה", "text"),
  date: await make(boards.reactions, "תאריך", "date"),
};

/* ---------- כתיבה ---------- */
const path = "shared/quotes-ids.js";
const head = `/* ============================================================
   מזהי לוחות הציטוט היומי — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-quotes.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).

   ⚠ **הבעלות בשני הלוחות היא לפי מזהה ולא לפי שם** (4מו).
   ============================================================ */

`;

let src = existsSync(path) ? readFileSync(path, "utf8") : head;
const put = (name, value) => {
  const re = new RegExp(`export const ${name} = [\\s\\S]*?;\\n`);
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  src = re.test(src) ? src.replace(re, line) : src + "\n" + line;
};

put("QUOTE_BOARDS", boards);
put("QUOTE_COLS", colsOut);

if (!src.includes("quotesReady")) {
  src += `
/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const quotesReady = () =>
  Boolean(QUOTE_BOARDS.quotes && QUOTE_BOARDS.reactions);
`;
}

writeFileSync(path, src, "utf8");
console.log("\nנכתב shared/quotes-ids.js — חייב להיכנס לקומיט.");
console.log("ועכשיו: npm run clean:defaults — למחוק את שורות הדמה של monday.");
