/* ============================================================
   לוח מודעות, סקרי מכינה ומשוב אנונימי
   ------------------------------------------------------------
   ⚠⚠ **חמישה לוחות, וההפרדה אינה שרירותית.**

   1. `לוח מודעות` — הודעה עם כותרת, גוף, קהל יעד ותאריך תפוגה.
      ⚠ **התפוגה היא שדה ולא מחיקה**: מודעה שפג תוקפה יורדת
        מהלוח ונשארת קריאה למי שמחפש אותה. לוח שמוחק בעצמו הוא
        לוח שאי אפשר לענות בו על "מה בעצם נאמר אז".

   2. `תגובות בלוח מודעות` — שורה לתגובה. **לא JSON על המודעה**:
      שני אנשים שמגיבים באותה שנייה היו דורסים זה את זה, וזה
      בדיוק הכשל של "לשלוח את המצב הרצוי" (עיקרון 5).

   3+4. `סקרי מכינה` + `הצבעות מכינה` — אותו דפוס של סקרי הצוות:
      שורה לכל הצבעה, והצבעה חוזרת מחליפה.
      ⚠ סקר מכינה **אינו חשאי**, כמו סקר ועדה: "מי עוד לא הצביע"
        היא כל התועלת בשאלת תיאום.

   5. `משוב למכינה` — **ואין בו ולא תהיה בו עמודת כותב.**
      ⚠⚠ זו כל התכלית. משוב אנונימי שנשמר בלוח שיש בו "מי כתב"
        הוא משוב שאפשר לפתוח ולראות; אנונימיות שנשענת על "השדה
        נשאר ריק" היא הבטחה שאפשר לשבור בעדכון אחד. כאן אין מה
        לשבור. מי שיוסיף עמודת כותב — שובר הבטחה, לא מוסיף
        תכונה (עיקרון 5, וכמו api/_team-extras.js).

   ⚠ מדלגים על מפתח 5 בכל רשימת תוויות — המשבצת הריקה (5ז).

   הרצה: npm run seed:board
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

/** ⚠ זהות בתו לתוויות שבלוח. */
export const NOTICE_KIND = [
  "הודעה",
  "אירוע",
  "אבידה ומציאה",
  "בקשה",
  "המלצה",
];

/* ⚠⚠ **הקהל הוא הרשאת קריאה ולא סינון תצוגה.** מודעה שמופנית
   לצוות אינה יוצאת לחניך מהשרת — לא מוסתרת במסך. */
export const NOTICE_TO = ["כולם", "חניכים", "צוות"];

const NEW = {
  notices: "מכינה ב׳ – לוח מודעות",
  comments: "מכינה ב׳ – תגובות בלוח מודעות",
  polls: "מכינה ב׳ – סקרי מכינה",
  votes: "מכינה ב׳ – הצבעות מכינה",
  feedback: "מכינה ב׳ – משוב למכינה",
};

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

const boards = {};
const colsOut = {};

/* ---------- 1 · המודעות ---------- */
boards.notices = await board(NEW.notices);
colsOut.notices = {
  kind: await make(boards.notices, "סוג", "status", NOTICE_KIND),
  body: await make(boards.notices, "תוכן", "long_text"),
  to: await make(boards.notices, "קהל", "status", NOTICE_TO),
  date: await make(boards.notices, "פורסם", "date"),
  /* ⚠ תפוגה ולא מחיקה — ראו ההערה בראש. */
  until: await make(boards.notices, "עד", "date"),
  /* ⚠ נעוץ הוא החלטה של ראש המכינה, לא של מי שפרסם: אחרת כל
     מודעה תהיה נעוצה תוך שבוע. */
  pinned: await make(boards.notices, "נעוץ", "checkbox"),
  by: await make(boards.notices, "פורסם על ידי", "text"),
  byId: await make(boards.notices, "מזהה מפרסם", "text"),
  link: await make(boards.notices, "קישור", "text"),
};

/* ---------- 2 · תגובות ---------- */
boards.comments = await board(NEW.comments);
colsOut.comments = {
  post: await make(boards.comments, "מודעה", "text"),
  date: await make(boards.comments, "תאריך", "date"),
  by: await make(boards.comments, "מגיב", "text"),
  byId: await make(boards.comments, "מזהה מגיב", "text"),
};

/* ---------- 3+4 · סקרים והצבעות ---------- */
boards.polls = await board(NEW.polls);
colsOut.polls = {
  options: await make(boards.polls, "אפשרויות", "long_text"),
  to: await make(boards.polls, "קהל", "status", NOTICE_TO),
  closes: await make(boards.polls, "סגירה", "date"),
  closed: await make(boards.polls, "סגור", "checkbox"),
  by: await make(boards.polls, "נפתח על ידי", "text"),
};

boards.votes = await board(NEW.votes);
colsOut.votes = {
  poll: await make(boards.votes, "סקר", "text"),
  choice: await make(boards.votes, "בחירה", "text"),
  voter: await make(boards.votes, "מצביע", "text"),
};

/* ---------- 5 · משוב אנונימי ---------- */
boards.feedback = await board(NEW.feedback);
colsOut.feedback = {
  topic: await make(boards.feedback, "נושא", "text"),
  date: await make(boards.feedback, "תאריך", "date"),
  /* ⚠⚠ ואין כאן עמודת כותב. ראו ההערה בראש הקובץ. */
};

/* ---------- כתיבה ---------- */
const path = "shared/board-ids.js";
const head = `/* ============================================================
   מזהי לוח המודעות, הסקרים והמשוב — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-board.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).

   ⚠⚠ **BOARD_COLS.feedback אינו מחזיק עמודת כותב, ולא יחזיק.**
     ראו ההערה ב-tools/seed-board.mjs ו-api/_board.js.
   ============================================================ */

`;

let src = existsSync(path) ? readFileSync(path, "utf8") : head;
const put = (name, value) => {
  const re = new RegExp(`export const ${name} = [\\s\\S]*?;\\n`);
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  src = re.test(src) ? src.replace(re, line) : src + "\n" + line;
};

put("BOARD_BOARDS", boards);
put("BOARD_COLS", colsOut);
put("NOTICE_KIND", NOTICE_KIND);
put("NOTICE_TO", NOTICE_TO);

if (!src.includes("boardReady")) {
  src += `
/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const boardReady = () =>
  Boolean(BOARD_BOARDS.notices && BOARD_BOARDS.comments
    && BOARD_BOARDS.polls && BOARD_BOARDS.votes && BOARD_BOARDS.feedback);
`;
}

writeFileSync(path, src, "utf8");
console.log("\nנכתב shared/board-ids.js — חייב להיכנס לקומיט.");
