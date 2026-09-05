/* ============================================================
   הרחבת לוחות הפרויקטים — שלבים, יומן, תת-משימות, קטגוריות
   ------------------------------------------------------------
   ⚠⚠ **לוח אחד לשלבים וליומן, ולא שניים.**

   "אבן דרך" ו"רשומת יומן" הן אותה צורה בדיוק: שורה שכותרתה
   טקסט, שייכת לפרויקט, נושאת תאריך וגוף. מה שמבדיל הוא עמודת
   `סוג` — בדיוק כמו לוח ההגדרות של השיבוצים, שמחזיק ענפים,
   ועדות וסדרות עם עמודת קטגוריה.

   שני לוחות היו מייצרים שתי גרסאות של אותה טעינה, אותו אימות
   שייכות ואותו ניקוי — ואלה נפרדות זו מזו בתיקון הראשון.

   ⚠ ההפך מהמקרה של `duty.tasks` מול `team.tasks` (4נ): שם שני
     לוחות שנראים דומים הם **הפוכים בבעלות**, ולכן חייבים
     להישאר נפרדים. כאן זו אותה בעלות ואותו מסלול קריאה.

   ⚠ מדלגים על מפתח 5 בכל רשימת תוויות — המשבצת הריקה (5ז).

   הרצה: node --env-file=.env tools/seed-projects2.mjs
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync } from "node:fs";
import { PROJECT_BOARDS, PROJECT_COLS } from "../shared/projects-ids.js";

const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

export const ENTRY_KIND = ["שלב", "יומן"];
export const MONEY_CAT = ["חומרים", "הסעות", "פרסום", "כיבוד", "ציוד", "שכר", "אחר"];

const NEW_BOARD = "מכינה ב׳ – רשומות פרויקט";

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
  console.log(`  עמודה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

/* ---------- 1 · לוח הרשומות ---------- */
const boards = (await gql(`{ boards(limit:300, state:active){ id name } }`)).boards;
let entries = boards.find((b) => String(b.name).trim() === NEW_BOARD);
if (entries) console.log("הלוח כבר קיים: " + entries.id);
else {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
    { n: NEW_BOARD });
  entries = { id: d.create_board.id };
  console.log("נוצר לוח: " + NEW_BOARD + " → " + entries.id);
}

const entryCols = {
  project: await make(entries.id, "פרויקט", "text"),
  kind: await make(entries.id, "סוג", "status", ENTRY_KIND),
  date: await make(entries.id, "תאריך", "date"),
  body: await make(entries.id, "תוכן", "long_text"),
  done: await make(entries.id, "הושלם", "checkbox"),
  /* ⚠ סדר ידני לשלבים — תאריך אינו מספיק: שני שלבים יכולים
     להיות באותו שבוע, והסדר ביניהם הוא החלטה של החניך. */
  order: await make(entries.id, "סדר", "numbers"),
};

/* ---------- 2 · עמודות חדשות בלוחות הקיימים ---------- */
console.log("\nמשימות:");
const taskAdd = {
  /* שיוך לשלב. ריק = "בלי שלב", וזה מצב תקין ולא חסר. */
  stage: await make(PROJECT_BOARDS.tasks, "שלב", "text"),
  /* ⚠ תת-משימה: מזהה משימת האב. עומק אחד בלבד — עץ בלי גבול
     הופך רשימה למבוך, וזו רשימת מטלות ולא מערכת ניהול. */
  parent: await make(PROJECT_BOARDS.tasks, "משימת אב", "text"),
};

console.log("\nתקציב:");
const moneyAdd = {
  category: await make(PROJECT_BOARDS.budget, "קטגוריה", "status", MONEY_CAT),
};

console.log("\nפרויקטים:");
const projAdd = {
  /* ⚠⚠ שיתוף עם הצוות — **בבחירת החניך בלבד**, ולכן תיבה על
     הפרויקט ולא הרשאה בשרת. זו ההבטחה שהמסך כולו נשען עליה. */
  shared: await make(PROJECT_BOARDS.projects, "משותף עם הצוות", "checkbox"),
  shareNote: await make(PROJECT_BOARDS.projects, "מה מבקשים", "long_text"),
  /* ⚠ ולדורות הבאים — שיתוף נפרד ומכוון. "הצוות רואה עכשיו"
     ו"מחזור הבא יראה" הן שתי החלטות שונות. */
  legacy: await make(PROJECT_BOARDS.projects, "לשמור לדורות הבאים", "checkbox"),
};

/* ---------- 3 · כתיבה לקובץ המזהים ---------- */
const path = "shared/projects-ids.js";
let src = readFileSync(path, "utf8");

src = src.replace(
  /export const PROJECT_BOARDS = \{[\s\S]*?\};/,
  `export const PROJECT_BOARDS = ${JSON.stringify(
    { ...PROJECT_BOARDS, entries: String(entries.id) }, null, 2)};`);

const nextCols = {
  ...PROJECT_COLS,
  projects: { ...PROJECT_COLS.projects, ...projAdd },
  tasks: { ...PROJECT_COLS.tasks, ...taskAdd },
  budget: { ...PROJECT_COLS.budget, ...moneyAdd },
  entries: entryCols,
};
src = src.replace(
  /export const PROJECT_COLS = \{[\s\S]*?\n\};/,
  `export const PROJECT_COLS = ${JSON.stringify(nextCols, null, 2)};`);

if (!src.includes("ENTRY_KIND")) {
  src = src.replace(
    'export const PROJECT_CLOSED',
    `/** ⚠ סוג הרשומה: שלב בדרך, או שורת יומן. זהות בתו לתוויות שבלוח. */
export const ENTRY_KIND = ${JSON.stringify(ENTRY_KIND, null, 2)};

/** קטגוריות ההוצאה. המכינה יכולה להוסיף תווית בלוח. */
export const MONEY_CAT = ${JSON.stringify(MONEY_CAT, null, 2)};

export const PROJECT_CLOSED`);
}

writeFileSync(path, src, "utf8");
console.log("\nעודכן shared/projects-ids.js");
console.log("⚠ הקובץ חייב להיכנס לקומיט.");
