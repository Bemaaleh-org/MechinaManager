/* ============================================================
   לוח המיונים לצבא
   ------------------------------------------------------------
   ⚠ **שורה לכל מיון, ולא שדה טקסט אחד.** עד עכשיו כל המיונים
     של חניך ישבו במחרוזת אחת ("גיבוש שייטת, מיון 669") — קריא
     לאדם, ובלתי אפשרי לשאול עליו שום שאלה. כמה חניכים ניגשו
     לגיבוש? מי עבר? מה קורה בשבוע הבא? כל אלה דורשות שורות.

   ⚠ **הבעלות נשארת אצל החניך** (4ש): המיונים ממולאים על ידו
     על עצמו. יו״ר ועדת הגיוסים והצוות **קוראים** את הכול
     ואינם כותבים — עריכה מבחוץ הופכת את השדה למשהו אחר לגמרי.

   ⚠ **מזהה חניך ושם, ולא board_relation.** אותו דפוס כמו לוח
     התורניות: קישור עולה קריאה נוספת בכל שליפה, והשם נשמר
     לצידו כדי שהלוח ייקרא בעין ב-monday.

   מריצים פעם אחת: node --env-file=.env tools/seed-tryouts.mjs
   ============================================================ */
import { gql } from "../api/_monday.js";
import { writeFileSync } from "node:fs";

const BOARD = "מכינה ב׳ – מיונים לצבא";

const COLS = [
  ["חניך", "text", "student"],
  ["שם החניך", "text", "studentName"],
  ["תאריך", "date", "date"],
  ["מצב", "status", "status"],
  ["מסלול", "text", "track"],
  ["הערות", "long_text", "note"],
];

/* ⚠ התוויות נזרעות פעם אחת ומכאן והלאה `create_labels_if_missing`
   נשאר false — תווית חסרה פירושה טעות בקוד. */
/* ⚠ זהה לרשימה שב-shared/tryouts-ids.js ולזו שב-tools/seed-army.mjs.
   שלושתן חייבות להישאר תואמות בתו — לוח חדש שייזרע עם רשימה
   ישנה יראה תקין ויכשיל כל כתיבה. */
const STATUSES = ["טרם ניגשתי", "ניגשתי ועברתי לשלב הבא",
  "ניגשתי והתקבלתי", "ניגשתי ולא התקבלתי", "לא ניגשתי"];

const boards = (await gql(`{ boards(limit:200, state:active){ id name } }`)).boards;
let board = boards.find((b) => String(b.name).trim() === BOARD);

if (board) {
  console.log("הלוח כבר קיים: " + board.id);
} else {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
    { n: BOARD });
  board = { id: String(d.create_board.id) };
  console.log("נוצר לוח: " + board.id);
}

const existing = (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
  { b: [board.id] })).boards[0].columns;

const ids = {};
for (const [title, type, key] of COLS) {
  const hit = existing.find((c) => String(c.title).trim() === title);
  if (hit) { ids[key] = String(hit.id); continue; }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board.id, t: title, c: type,
      s: type === "status"
        ? JSON.stringify({ labels: Object.fromEntries(STATUSES.map((l, i) => [i + 1, l])) })
        : null });
  ids[key] = String(d.create_column.id);
  console.log("  עמודה: " + title + " → " + ids[key]);
}

const out = `/* ============================================================
   מזהי לוח המיונים — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-tryouts.mjs.
   ⚠ **אובייקט ולא מחרוזת** — api/_cycle.js מחליף את המחזור
     הפעיל עם Object.assign, ומחרוזת מיוצאת נקבעת פעם אחת
     בטעינת המודול.
   ============================================================ */

export const TRYOUT_BOARD = { board: ${JSON.stringify(board.id)} };

export const TRYOUT_COLS = ${JSON.stringify(ids, null, 2)};

/** ⚠ זהות בתו לתוויות שבלוח. תווית שאינה כאן תיכשל ברעש. */
export const TRYOUT_STATUS = ${JSON.stringify(STATUSES, null, 2)};

export const tryoutsReady = () => Boolean(TRYOUT_BOARD.board);
`;
writeFileSync("shared/tryouts-ids.js", out, "utf8");
console.log("\nנכתב shared/tryouts-ids.js — ⚠ חייב להיכנס לקומיט.");
