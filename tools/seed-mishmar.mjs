/* ============================================================
   משמר — הערב ולו״ז המפגשים שלו
   ------------------------------------------------------------
   ⚠⚠ **שני לוחות, ולא אחד עם עמודת "סוג".**

   1. `משמרים` — שורה לערב: תאריך, נושא, הצוות המארגן, מקום,
      שעות, סטטוס, וסיכום שנכתב אחרי הערב.

   2. `לו״ז משמר` — שורה למפגש: שעה, משך, מרצה, מקום, סוג, תיאור
      **לפני**, סיכום **אחרי**, וקבצי עזר. המפגש מצביע על המשמר
      במזהה (`מישמר`), כמו תגובה שמצביעה על מודעה.

      ⚠ **תיאור וסיכום הן שתי עמודות.** מה שתכננו ומה שקרה הם שני
        דברים, וברגע שהם יושבים בשדה אחד אי אפשר עוד להבדיל
        — אותו נימוק כמו שתי עמודות הדירוג (4ב).

      ⚠ **"פתוח לדירוג" היא תיבה על המפגש ולא על המשמר.** הפסקה
        וארוחה אינן מדורגות, ומארגן שרוצה משוב על שיעור אחד
        בלבד לא צריך לפתוח את כולם.

   ⚠ **הדירוגים עצמם אינם כאן** — הם בלוח דירוגי השיעורים,
     במפתח `meeting` = מזהה המפגש (ראו shared/mishmar-ids.js).

   ⚠ מדלגים על מפתח 5 בכל רשימת תוויות — המשבצת הריקה (5ז).

   הרצה: npm run seed:mishmar
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

/** ⚠ זהות בתו לתוויות שבלוח. */
export const MISHMAR_STATUS = ["בתכנון", "פורסם", "התקיים", "בוטל"];
export const SESSION_KIND = ["שיעור", "סדנה", "שיח", "הפסקה", "ארוחה", "אחר"];

const NEW = {
  events: "מכינה ב׳ – משמרים",
  sessions: "מכינה ב׳ – לו״ז משמר",
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

/* ---------- 1 · המשמרים ---------- */
boards.events = await board(NEW.events);
colsOut.events = {
  date: await make(boards.events, "תאריך", "date"),
  theme: await make(boards.events, "נושא", "text"),
  /* ⚠ מזהה הגדרת השיבוץ של הצוות המזדמן, ולצידו השם לקריאה
     בלוח. המזהה הוא מה שקובע הרשאה; השם מתעדכן ממנו. */
  team: await make(boards.events, "צוות מארגן (מזהה)", "text"),
  teamName: await make(boards.events, "צוות מארגן", "text"),
  place: await make(boards.events, "מקום", "text"),
  start: await make(boards.events, "שעת התחלה", "text"),
  end: await make(boards.events, "שעת סיום", "text"),
  /* ⚠ נכתב אחרי הערב — זה מה שהחניכים חוזרים אליו. */
  summary: await make(boards.events, "סיכום הערב", "long_text"),
  status: await make(boards.events, "סטטוס", "status", MISHMAR_STATUS),
  by: await make(boards.events, "נפתח על ידי", "text"),
  byId: await make(boards.events, "מזהה פותח", "text"),
};

/* ---------- 2 · לו״ז המשמר ---------- */
boards.sessions = await board(NEW.sessions);
colsOut.sessions = {
  mishmar: await make(boards.sessions, "משמר", "text"),
  time: await make(boards.sessions, "שעה", "text"),
  minutes: await make(boards.sessions, "משך (דקות)", "numbers"),
  lecturer: await make(boards.sessions, "מרצה", "text"),
  place: await make(boards.sessions, "מקום", "text"),
  kind: await make(boards.sessions, "סוג", "status", SESSION_KIND),
  /* ⚠ לפני ואחרי — שתי עמודות. ראו ההערה בראש. */
  desc: await make(boards.sessions, "תיאור", "long_text"),
  summary: await make(boards.sessions, "מה היה", "long_text"),
  /* ⚠ עמודת קבצים — דפי עזר, מצגות, מקורות. */
  files: await make(boards.sessions, "דפי עזר", "file"),
  order: await make(boards.sessions, "סדר", "numbers"),
  openRate: await make(boards.sessions, "פתוח לדירוג", "checkbox"),
};

/* ---------- כתיבה ---------- */
const path = "shared/mishmar-ids.js";
const head = `/* ============================================================
   מזהי לוחות המשמר — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-mishmar.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).

   ⚠ **הדירוגים אינם כאן** — הם בלוח דירוגי השיעורים, במפתח
     \`meeting\` = מזהה המפגש.
   ============================================================ */

`;

let src = existsSync(path) ? readFileSync(path, "utf8") : head;
const put = (name, value) => {
  const re = new RegExp(`export const ${name} = [\\s\\S]*?;\\n`);
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  src = re.test(src) ? src.replace(re, line) : src + "\n" + line;
};

put("MISHMAR_BOARDS", boards);
put("MISHMAR_COLS", colsOut);
put("MISHMAR_STATUS", MISHMAR_STATUS);
put("SESSION_KIND", SESSION_KIND);

if (!src.includes("mishmarReady")) {
  src += `
/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const mishmarReady = () =>
  Boolean(MISHMAR_BOARDS.events && MISHMAR_BOARDS.sessions);
`;
}

writeFileSync(path, src, "utf8");
console.log("\nנכתב shared/mishmar-ids.js — חייב להיכנס לקומיט.");
console.log("⚠ אחרי ההרצה: npm run clean:defaults — monday יוצרת לוח חדש עם שורות דמה.");
