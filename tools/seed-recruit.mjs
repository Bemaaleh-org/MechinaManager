/* ============================================================
   לוח פניות הגיוס
   ------------------------------------------------------------
     npm run seed:recruit

   יוצר את הלוח שאליו נכנסות פניות מהאינטרנט — מאתר מועצת
   המכינות, מאינסטגרם, מטיקטוק ומאתר המכינה — וכותב את
   המזהים ל-shared/recruit-ids.js.

   ⚠⚠ **הלוח בנוי כדי שטופס monday יוכל לכתוב אליו ישירות.**
     ששת השדות הראשונים הם בדיוק מה שהטופס שואל, ובאותו סדר.
     ארבעת האחרונים (סטטוס, מטפל, מתי טופל, הערות) הם של
     ועדת הגיוסים ואינם בטופס — פונה אינו קובע את הסטטוס של
     עצמו.

   ⚠⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז). תא בלי בחירה מחזיר `value:null` אבל `text`
     של התווית שיושבת על 5, וכל 35 החניכים הופיעו פעם
     כמשובצים ל"חיל האוויר" בגלל זה. כאן זה היה גורם לכל
     פנייה חדשה להיראות כאילו כבר נענתה.

   ⚠ אידמפוטנטי — לוח או עמודה שקיימים באותו שם אינם נוצרים שוב.

   ⚠ אחרי ההרצה: npm run clean:defaults — monday יוצרת לוח חדש
     עם שורות דמה ("Task 1"), והן היו מופיעות כפנייה אמיתית
     של אדם שאינו קיים (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { RECRUIT_KIND, RECRUIT_SOURCE, RECRUIT_STATUSES } from "../shared/recruit-ids.js";

const TITLE = "מכינה – פניות גיוס";
const PATH = "shared/recruit-ids.js";

/* ⚠ 1,2,3,4,6,7… — מפתח 5 מדולג. ראו ההערה בראש. */
const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 1; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();

const cols = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [board] })).boards[0].columns;

const make = async (board, title, type, labels) => {
  const have = (await cols(board)).find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type,
      s: labels
        ? JSON.stringify({ labels: Object.fromEntries(labels.map((l, i) => [LABEL_KEYS[i], l])) })
        : null });
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

const existing = (await gql(`{ boards(limit:400, state:active){ id name } }`)).boards;
const hit = existing.find((b) => String(b.name).trim() === TITLE);
let board;
if (hit) { board = String(hit.id); console.log(`\nקיים: ${TITLE} → ${board}\n`); }
else {
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`, { n: TITLE });
  board = String(d.create_board.id);
  console.log(`\nנוצר: ${TITLE} → ${board}\n`);
}

/* ---------- מה שהטופס ממלא ---------- */
const out = {
  /* שם הפונה הוא שם הפריט עצמו, ולא עמודה */
  phone: await make(board, "טלפון", "text"),
  email: await make(board, "אימייל", "text"),
  kind: await make(board, "סוג הפנייה", "status", RECRUIT_KIND),
  message: await make(board, "תוכן הפנייה", "long_text"),
  source: await make(board, "מאיפה הגיע", "status", RECRUIT_SOURCE),
  date: await make(board, "תאריך הפנייה", "date"),
  /* ---------- מה שהוועדה ממלאת ---------- */
  status: await make(board, "סטטוס", "status", RECRUIT_STATUSES),
  owner: await make(board, "מטפל", "text"),
  ownerId: await make(board, "מזהה מטפל", "text"),
  handledAt: await make(board, "תאריך טיפול", "date"),
  notes: await make(board, "הערות פנימיות", "long_text"),
};

/* ---------- כתיבה ---------- */
const head = `/* ============================================================
   פניות גיוס — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-recruit.mjs.
   ============================================================ */

`;
let src = existsSync(PATH) ? readFileSync(PATH, "utf8") : head;

/* ⚠ `;\r?\n` ומחיקת כפילויות — git בווינדוס בודק ב-CRLF, והביטוי
   הישן לא תפס כלום ואז כל החלפה **הוסיפה** הצהרה שנייה. שתי
   הצהרות export לאותו שם הן SyntaxError, כלומר כל api/students.js
   מפסיק להיטען וכל מסך מחזיר 500 (5כג). */
const put = (name, value) => {
  const re = () => new RegExp(`export const ${name} = [\\s\\S]*?;\\r?\\n`, "g");
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  if (!re().test(src)) { src += "\n" + line; return; }
  let first = true;
  src = src.replace(re(), () => (first ? ((first = false), line) : ""));
};

put("RECRUIT_BOARDS", { board });
put("RECRUIT_COLS", out);

if (!new RegExp("export const recruitReady\\s*=").test(src)) {
  src += `
/** ⚠ הלוח אינו חובה — בלעדיו המסך אומר מה להריץ (עיקרון 6). */
export const recruitReady = () => Boolean(RECRUIT_BOARDS.board);
`;
}
writeFileSync(PATH, src, "utf8");

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/recruit-ids.js?v=" + Date.now());
if (!fresh.recruitReady()) {
  console.error("\n✗ recruitReady() עדיין false.\n");
  process.exit(1);
}

console.log(`\n✓ נכתב ${PATH} — חייב להיכנס לקומיט.`);
console.log("✓ recruitReady() = true\n");
console.log("─".repeat(56));
console.log("עכשיו, ב-monday, פעם אחת:");
console.log("─".repeat(56));
console.log(`  1. לפתוח את הלוח "${TITLE}"`);
console.log("  2. Integrate ▸ Forms ▸ Create form  (או  + ▸ Form)");
console.log("  3. להשאיר בטופס את ששת השדות האלה בלבד:");
console.log("       שם הפונה (שם הפריט) · טלפון · אימייל");
console.log("       סוג הפנייה · תוכן הפנייה · מאיפה הגיע");
console.log("  4. ⚠ להסיר מהטופס: סטטוס · מטפל · תאריך טיפול · הערות פנימיות");
console.log("     פונה אינו קובע את הסטטוס של עצמו.");
console.log("  5. Share ▸ להעתיק את הקישור הציבורי");
console.log("  6. להדביק אותו באפליקציה: פניות גיוס ▸ הקישור לשיתוף\n");
console.log("ואז: npm run clean:defaults\n");
