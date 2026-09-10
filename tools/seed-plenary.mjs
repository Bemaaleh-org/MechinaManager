/* ============================================================
   מליאות, פתקים, ומאגר המרצים
   ------------------------------------------------------------
     npm run seed:plenary

   שלושה לוחות של ועדת קבוצה ותוכן, בסקריפט אחד:
     1. מכינה – מליאות
     2. מכינה – פתקי מליאה
     3. מכינה – מאגר מרצים

   ⚠⚠ **בלוח הפתקים עמודות הכותב נשארות ריקות בפתק אנונימי**,
     והן קיימות רק בשביל פתק מזוהה. האנונימיות היא **בהיעדר
     הנתון** ולא בהסתרה שלו (5י) — ולכן אין כאן עמודת "אנונימי?
     כן/לא" עם שם לצידה, אלא תיבה ושתי עמודות שנשארות ריקות.

   ⚠ **מאגר המרצים מחוץ למחזור**, והמליאות בתוכו. מרצה ששווה
     להביא הוא בדיוק מה שהמחזור הבא צריך; מליאה של מחזור ב׳
     אינה רלוונטית למחזור ג׳ (4מז, 5יא).

   ⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז).

   ⚠ אידמפוטנטי, ואחריו: npm run clean:defaults (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { PLENARY_STATUSES } from "../shared/plenary-ids.js";
import { LECT_STATUSES, LECT_CATEGORIES } from "../shared/lecturers-ids.js";

/* ⚠ 0,1,2,3,4,6,7… — מפתח 5 מדולג. */
const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 0; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();
const labels = (names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(LABEL_KEYS[i]), n])) });

const boards = (await gql(`{ boards(limit:400, state:active){ id name } }`)).boards;

async function board(title) {
  const hit = boards.find((b) => String(b.name).trim() === title);
  if (hit) { console.log(`\nקיים: ${title} → ${hit.id}`); return String(hit.id); }
  const d = await gql(
    `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`, { n: title });
  console.log(`\nנוצר: ${title} → ${d.create_board.id}`);
  return String(d.create_board.id);
}

const colsOf = async (b) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [b] })).boards[0].columns;

const make = async (b, title, type, defaults) => {
  const have = (await colsOf(b)).find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b, t: title, c: type, s: defaults || null });
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

/* ---------- 1 · מליאות ---------- */
const eventsB = await board("מכינה – מליאות");
const eventsC = {
  date: await make(eventsB, "תאריך", "date"),
  status: await make(eventsB, "סטטוס", "status", labels(PLENARY_STATUSES)),
  owners: await make(eventsB, "מזהי אחראים", "text"),
  ownerNames: await make(eventsB, "אחראי המליאה", "text"),
  open: await make(eventsB, "תיבת הפתקים פתוחה", "checkbox"),
  agenda: await make(eventsB, "סדר היום", "long_text"),
  /* ⚠ שלוש עמודות ולא אחת — ראו ההערה ב-shared/plenary-ids.js. */
  protocol: await make(eventsB, "פרוטוקול", "long_text"),
  summary: await make(eventsB, "סיכום", "long_text"),
  summaryBy: await make(eventsB, "סיכום מאת", "text"),
  file: await make(eventsB, "קבצים", "file"),
  note: await make(eventsB, "הערה", "text"),
};

/* ---------- 2 · פתקים ---------- */
const notesB = await board("מכינה – פתקי מליאה");
const notesC = {
  plenary: await make(notesB, "מזהה מליאה", "text"),
  text: await make(notesB, "הפתק", "long_text"),
  anon: await make(notesB, "אנונימי", "checkbox"),
  /* ⚠ ריקות בפתק אנונימי — ראו ההערה בראש הקובץ. */
  authorId: await make(notesB, "מזהה כותב", "text"),
  authorName: await make(notesB, "כותב", "text"),
  order: await make(notesB, "סדר", "numbers"),
  inAgenda: await make(notesB, "בסדר היום", "checkbox"),
  date: await make(notesB, "תאריך", "date"),
};

/* ---------- 3 · מאגר מרצים ---------- */
const lectB = await board("מכינה – מאגר מרצים");
const lectC = {
  topic: await make(lectB, "נושא", "text"),
  about: await make(lectB, "על מה", "long_text"),
  phone: await make(lectB, "טלפון", "text"),
  email: await make(lectB, "אימייל", "text"),
  link: await make(lectB, "קישור", "text"),
  status: await make(lectB, "סטטוס", "status", labels(LECT_STATUSES)),
  /* ⚠⚠ **גם כאן וגם ב-tools/seed-lecturers.mjs, ובכוונה.**
     שני מחוללים כותבים את LECT_COLS ב-JSON.stringify, ולכן
     עמודה שקיימת רק באחד מהם **נמחקת מהמזהים** בהרצה של
     השני — בדיוק המוקש של 4מו. לוח חדש מקבל את הקטגוריה
     כאן; לוח שכבר עומד מקבל אותה שם. */
  category: await make(lectB, "קטגוריה", "status", labels(LECT_CATEGORIES)),
  byId: await make(lectB, "מזהה מציע", "text"),
  byName: await make(lectB, "הציע", "text"),
  notes: await make(lectB, "הערות הוועדה", "long_text"),
  date: await make(lectB, "תאריך", "date"),
};

/* ---------- כתיבת המזהים ---------- */
/* ⚠ `;\r?\n` ומחיקת כפילויות — ראו ההסבר ב-5כג. */
function put(src, name, value) {
  const re = () => new RegExp(`export const ${name} = [\\s\\S]*?;\\r?\\n`, "g");
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  if (!re().test(src)) return src + "\n" + line;
  let first = true;
  return src.replace(re(), () => (first ? ((first = false), line) : ""));
}

function write(path, head, pairs) {
  let src = existsSync(path) ? readFileSync(path, "utf8") : head;
  for (const [k, v] of pairs) src = put(src, k, v);
  writeFileSync(path, src, "utf8");
  console.log(`\n✓ נכתב ${path}`);
}

write("shared/plenary-ids.js",
  `/* ⚠ קובץ מחולל — נכתב על ידי tools/seed-plenary.mjs */\n\n`,
  [["PLENARY_BOARDS", { events: eventsB, notes: notesB }],
    ["PLENARY_COLS", { events: eventsC, notes: notesC }]]);

write("shared/lecturers-ids.js",
  `/* ⚠ קובץ מחולל — נכתב על ידי tools/seed-plenary.mjs */\n\n`,
  [["LECT_BOARDS", { board: lectB }], ["LECT_COLS", lectC]]);

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const p = await import("../shared/plenary-ids.js?v=" + Date.now());
const l = await import("../shared/lecturers-ids.js?v=" + Date.now());
if (!p.plenaryReady() || !l.lecturersReady()) {
  console.error("\n✗ אחד מקבצי המזהים עדיין אינו מוכן.\n");
  process.exit(1);
}
console.log("✓ plenaryReady() = true · lecturersReady() = true");
console.log("⚠ שני קבצי המזהים חייבים להיכנס לקומיט.\n");
console.log("עכשיו: npm run clean:defaults\n");
