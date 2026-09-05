/* ============================================================
   הרחבת ניהול הצוותים — רשומות, משוב, וסקרים
   ------------------------------------------------------------
   ⚠⚠ **שלושה לוחות ולא אחד, וההפרדה אינה שרירותית.**

   1. `רשומות צוות` — פרוטוקול, אירוע, קישור, ציוד, חפיפה,
      והוצאה/הכנסה. כולן שורה שכותרתה טקסט, שייכת לצוות, נושאת
      תאריך וגוף — ונבדלות ב-`kind`. זה הדפוס של לוח הגדרות
      השיבוצים, שמחזיק ענפים, ועדות וסדרות באותו לוח.

   2. `משוב לצוות` — **לוח נפרד, ובו אין ולא תהיה עמודת כותב.**
      זו כל התכלית: משוב אנונימי שנשמר בלוח שיש בו עמודת "מי
      כתב" הוא משוב שאפשר לפתוח ולראות. אנונימיות שנשענת על
      "השדה נשאר ריק" אינה אנונימיות — היא הבטחה שאפשר לשבור
      בטעות. כאן אין מה לשבור.

      ⚠ מי שיוסיף עמודת כותב ללוח הזה — שובר הבטחה, לא מוסיף
        תכונה. זה אותו כלל של "אין שדה שמזהה מי ביצע תורנות"
        (עיקרון 5).

   3. `סקרי צוות` + `הצבעות` — סקר הוא שאלה עם אפשרויות, והצבעה
      היא שורה. **שורה לכל הצבעה ולא JSON על הסקר**: שני חברים
      שמצביעים באותה שנייה היו דורסים זה את זה, וזה בדיוק
      הכשל של "לשלוח את המצב הרצוי" (עיקרון 5).

      ⚠ ההצבעה כאן **אינה חשאית** — "איזה תאריך מתאים" היא
        שאלת תיאום, ולדעת מי עוד לא הצביע זו כל התועלת. משוב
        אנונימי הוא הלוח האחר.

   ⚠ מדלגים על מפתח 5 בכל רשימת תוויות — המשבצת הריקה (5ז).

   הרצה: node --env-file=.env tools/seed-teams2.mjs
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync } from "node:fs";
import { TEAM_BOARDS, TEAM_COLS } from "../shared/team-ids.js";

const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

export const ENTRY_KIND = [
  "פרוטוקול", "אירוע", "קישור", "ציוד", "חפיפה", "הוצאה", "הכנסה",
];

const NEW = {
  entries: "מכינה ב׳ – רשומות צוות",
  feedback: "מכינה ב׳ – משוב לצוות",
  polls: "מכינה ב׳ – סקרי צוות",
  votes: "מכינה ב׳ – הצבעות בסקר",
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

/* ---------- 1 · רשומות ---------- */
boards.entries = await board(NEW.entries);
colsOut.entries = {
  team: await make(boards.entries, "צוות", "text"),
  kind: await make(boards.entries, "סוג", "status", ENTRY_KIND),
  date: await make(boards.entries, "תאריך", "date"),
  body: await make(boards.entries, "תוכן", "long_text"),
  /* קישור, מיקום, או כל פרט קצר שהסוג מצריך */
  extra: await make(boards.entries, "פרטים", "text"),
  /* ⚠ שתי עמודות מספר ולא אחת: כמות ציוד וסכום כסף הם שני
     דברים, ועמודה משותפת הייתה מייצרת "12 ₪ כיסאות". */
  qty: await make(boards.entries, "כמות", "numbers"),
  amount: await make(boards.entries, "סכום", "numbers"),
  done: await make(boards.entries, "סגור", "checkbox"),
  by: await make(boards.entries, "נכתב על ידי", "text"),
};

/* ---------- 2 · משוב אנונימי ---------- */
boards.feedback = await board(NEW.feedback);
colsOut.feedback = {
  team: await make(boards.feedback, "צוות", "text"),
  date: await make(boards.feedback, "תאריך", "date"),
  /* ⚠⚠ ואין כאן עמודת כותב. ראו ההערה בראש הקובץ. */
};

/* ---------- 3 · סקרים והצבעות ---------- */
boards.polls = await board(NEW.polls);
colsOut.polls = {
  team: await make(boards.polls, "צוות", "text"),
  options: await make(boards.polls, "אפשרויות", "long_text"),
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

/* ---------- 4 · תגית על משימות הצוות ---------- */
console.log("\nמשימות הצוות:");
const taskTags = await make(TEAM_BOARDS.tasks, "תגיות", "text");

/* ---------- כתיבה ---------- */
const path = "shared/team-ids.js";
let src = readFileSync(path, "utf8");

src = src.replace(/export const TEAM_BOARDS = \{[\s\S]*?\};/,
  `export const TEAM_BOARDS = ${JSON.stringify({ ...TEAM_BOARDS, ...boards }, null, 2)};`);

const nextCols = {
  ...TEAM_COLS,
  tasks: { ...TEAM_COLS.tasks, tags: taskTags },
  ...colsOut,
};
src = src.replace(/export const TEAM_COLS = \{[\s\S]*?\n\};/,
  `export const TEAM_COLS = ${JSON.stringify(nextCols, null, 2)};`);

if (!src.includes("TEAM_ENTRY_KIND")) {
  src = src.replace('/** נוספה ללוח הגדרות השיבוצים הקיים */',
    `/** ⚠ זהות בתו לתוויות שבלוח. */
export const TEAM_ENTRY_KIND = ${JSON.stringify(ENTRY_KIND, null, 2)};

/** ⚠ הלוחות החדשים אינם חובה — בלעדיהם המסך עובד בלי הלשוניות. */
export const teamExtrasReady = () =>
  Boolean(TEAM_BOARDS.entries && TEAM_BOARDS.feedback && TEAM_BOARDS.polls && TEAM_BOARDS.votes);

/** נוספה ללוח הגדרות השיבוצים הקיים */`);
}

writeFileSync(path, src, "utf8");
console.log("\nעודכן shared/team-ids.js — חייב להיכנס לקומיט.");
