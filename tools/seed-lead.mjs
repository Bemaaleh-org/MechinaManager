/* ============================================================
   שבוע ההובלה — הלוחות של מובילי השבוע
   ------------------------------------------------------------
   ⚠⚠ **שלושה לוחות, וההפרדה היא בין הגדרה, ביצוע ומאגר.**

   1. `צ׳ק ליסט הובלה` — **מה צריך לעשות בשבוע הובלה**, פעם
      אחת ולכל השבועות. זו הגדרה, ומי שעורך אותה הוא ראש
      המכינה — בדיוק כמו צ׳ק ליסט התורנויות (4צ).

      ⚠ ושורה עם `שבוע` מלא היא **משימה של אותו שבוע בלבד** —
        מה שהמובילים הוסיפו לעצמם. אותו לוח, שני תפקידים,
        ונבדלים בשדה אחד. שני לוחות היו מפצלים את המסך.

   2. `ביצוע הובלה` — **קיום שורה = בוצע**, ואין עמודת "בוצע".
      אותו כלל של הצ׳ק ליסט בתורנויות: מצב שלישי שקוף, שבו
      השורה קיימת ומסומנת "לא", הוא בדיוק מה שמייצר מחלוקת
      על מה נעשה.

      ⚠ ובאותו לוח נרשם גם **שימוש בפעילות** (`סוג`) — "מה
        עשינו בשבוע שעבר" ו"מה סימנו" הן שתי שאלות על אותו
        ציר זמן, ולוח שני היה מכפיל את הקריאה בלי להוסיף דבר.

   3. `בנק פעילויות` — **מאגר משותף שנשאר בין מחזורים.** זו
      כל התכלית: מוביל שבוע מתחיל מדף ריק כל שבוע, ומה
      שהמחזור הקודם המציא הולך לאיבוד. לכן הלוח הזה **אינו
      במחזור** — כמו לוח המנות ולוח הבוגרים (4ל).

   ⚠ מדלגים על מפתח 5 בכל רשימת תוויות — המשבצת הריקה (5ז).

   הרצה: node --env-file=.env tools/seed-lead.mjs
   ============================================================ */
import { gql } from "../api/_monday.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";

const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

/** מתי במהלך שבוע ההובלה. ⚠ זהות בתו לתוויות שבלוח. */
export const LEAD_WHEN = [
  "לפני השבוע",
  "בתחילת השבוע",
  "כל יום",
  "בסוף השבוע",
];

/** סוג הפעילות בבנק. */
export const ACTIVITY_KIND = [
  "פעילות ערב",
  "שיא",
  "רגוע",
  "פתיחת יום",
  "סיום יום",
  "אחר",
];

/** מה נרשם בלוח הביצוע. */
export const LEAD_LOG_KIND = ["משימה", "פעילות"];

const NEW = {
  checklist: "מכינה ב׳ – צ׳ק ליסט הובלה",
  log: "מכינה ב׳ – ביצוע הובלה",
  activities: "בנק פעילויות – מובילי שבוע",
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

/* ---------- 1 · צ׳ק ליסט ---------- */
boards.checklist = await board(NEW.checklist);
colsOut.checklist = {
  /* ⚠ ריק = תבנית לכל שבוע. מלא = משימה של אותו שבוע בלבד. */
  week: await make(boards.checklist, "שבוע", "text"),
  when: await make(boards.checklist, "מתי", "status", LEAD_WHEN),
  body: await make(boards.checklist, "הסבר", "long_text"),
  order: await make(boards.checklist, "סדר", "numbers"),
  archived: await make(boards.checklist, "מוסתר", "checkbox"),
  by: await make(boards.checklist, "נוסף על ידי", "text"),
};

/* ---------- 2 · ביצוע ---------- */
boards.log = await board(NEW.log);
colsOut.log = {
  kind: await make(boards.log, "סוג", "status", LEAD_LOG_KIND),
  /* מזהה המשימה או הפעילות */
  ref: await make(boards.log, "פריט", "text"),
  week: await make(boards.log, "שבוע", "text"),
  date: await make(boards.log, "תאריך", "date"),
  /* ⚠ מזהה **ושם**: שני מובילים מחלקים ביניהם, ו"מי לקח מה"
     היא כל התכלית של החלוקה. זה ההפך מלוח המשימות האישיות
     (4מה) ואותו כלל כמו לוח משימות הצוות (4נ). */
  owner: await make(boards.log, "מי", "text"),
  ownerName: await make(boards.log, "שם", "text"),
  note: await make(boards.log, "הערה", "long_text"),
};

/* ---------- 3 · בנק הפעילויות ---------- */
boards.activities = await board(NEW.activities);
colsOut.activities = {
  kind: await make(boards.activities, "סוג", "status", ACTIVITY_KIND),
  body: await make(boards.activities, "איך מריצים", "long_text"),
  /* ⚠ דקות ומשתתפים הם שני מספרים — "בערך שעה ל-30" בעמודה
     אחת אינו ניתן לסינון, וסינון הוא כל מה שהופך מאגר לכלי. */
  minutes: await make(boards.activities, "דקות", "numbers"),
  people: await make(boards.activities, "כמה משתתפים", "numbers"),
  gear: await make(boards.activities, "ציוד", "text"),
  link: await make(boards.activities, "קישור", "text"),
  by: await make(boards.activities, "הוסיף", "text"),
  archived: await make(boards.activities, "מוסתר", "checkbox"),
};

/* ---------- 4 · שתי עמודות על לוח השבועות ---------- */
/* ⚠ **על שורת השבוע ולא בלוח נפרד.** מסירת משמרת שייכת לשבוע
   בדיוק כמו הסיכום והמשוב שכבר יושבים שם, ולוח רביעי היה
   מוסיף קריאה בלי להוסיף שום דבר אחר. */
console.log("\nלוח שבועות ההובלה:");
const weekCols = {
  handover: await make(MECHINA_BOARDS.leaderWeeks, "מסירת משמרת", "long_text"),
  /* ⚠ "נשלח לצוות" הוא **פעולה שקרתה** ולא דגל תצוגה: בלעדיו
     המוביל אינו יודע אם הסיכום שכתב הגיע למישהו. */
  summarySent: await make(MECHINA_BOARDS.leaderWeeks, "הסיכום נשלח", "date"),
};

/* ---------- כתיבה ---------- */
const path = "shared/lead-ids.js";
const head = `/* ============================================================
   מזהי לוחות שבוע ההובלה — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-lead.mjs.

   ⚠ **אובייקט ולא מחרוזות** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign (4ל).

   ⚠⚠ **בנק הפעילויות אינו במחזור.** מה שמחזור אחד המציא הוא
     בדיוק מה שהבא צריך, ולוח שמשוכפל ריק בכל שנה מבטל את כל
     הסיבה שהוא קיים. אותו נימוק כמו לוח המנות ולוח הבוגרים.
   ============================================================ */

`;

let src = existsSync(path) ? readFileSync(path, "utf8") : head;
const put = (name, value) => {
  const re = new RegExp(`export const ${name} = [\\s\\S]*?;\\n`);
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  src = re.test(src) ? src.replace(re, line) : src + "\n" + line;
};

put("LEAD_BOARDS", boards);
put("LEAD_COLS", colsOut);
put("LEAD_WHEN", LEAD_WHEN);
put("ACTIVITY_KIND", ACTIVITY_KIND);
put("LEAD_LOG_KIND", LEAD_LOG_KIND);

if (!src.includes("leadReady")) {
  src += `
/** ⚠ הלוחות אינם חובה — בלעדיהם המסך אומר מה להריץ (עיקרון 6). */
export const leadReady = () =>
  Boolean(LEAD_BOARDS.checklist && LEAD_BOARDS.log && LEAD_BOARDS.activities);
`;
}

writeFileSync(path, src, "utf8");
console.log("\nנכתב shared/lead-ids.js — חייב להיכנס לקומיט.");
console.log("\n⚠ ולהוסיף ידנית ל-shared/mechina-boards.js, תחת leaderWeeks:");
console.log(JSON.stringify(weekCols, null, 2));
