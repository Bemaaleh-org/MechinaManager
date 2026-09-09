/* ============================================================
   שיעורי חניך — הלוח, ותיבת "ועדת קבוצה ותוכן"
   ------------------------------------------------------------
     npm run seed:stulesson

   שני דברים, פעם אחת:
     1. לוח "שיעורי חניך" — שורה לכל שיבוץ
     2. עמודת checkbox "ועדת קבוצה ותוכן" בלוח הגדרות השיבוצים

   ⚠⚠ **התיבה ולא שם בקוד.** שלושה מסכים חדשים באחריות הוועדה
     הזו, והשם שלה בלוח עשוי להשתנות, להתאחד או להתפצל. אותו
     דפוס בדיוק של ועדת הגיוסים (5ד). ⚠ הסקריפט **אינו מסמן
     ועדה** — הוא רק יוצר את התיבה. סימון אוטומטי לפי ניחוש
     שם היה נותן הרשאות ניהול לוועדה הלא-נכונה.

   ⚠ **הלוח שייך למחזור** — ראו shared/cycles.js.

   ⚠ **מדלג על מפתח 5 בכל רשימת תוויות** — המשבצת הריקה של
     monday (5ז). כאן זה היה גורם לכל שיבוץ עתידי להיקרא
     כאילו כבר "התקיים" או "לא התקיים".

   ⚠ אידמפוטנטי, ואחריו: npm run clean:defaults (5יב).
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { STU_KINDS } from "../shared/stulesson.js";
import { HAPPENED_LABELS } from "../shared/stulesson-ids.js";
import { PLACEMENT_BOARDS } from "../shared/placements-ids.js";

const TITLE = "מכינה – שיעורי חניך";
const PATH = "shared/stulesson-ids.js";
const PLACEMENTS_PATH = "shared/placements-ids.js";
const FLAG_COL = "ועדת קבוצה ותוכן";

/* ⚠ 0,1,2,3,4,6,7… — מפתח 5 מדולג. */
const LABEL_KEYS = (() => {
  const out = [];
  for (let k = 0; out.length < 20; k++) if (k !== 5) out.push(k);
  return out;
})();
const labels = (names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(LABEL_KEYS[i]), n])) });

const colsOf = async (board) =>
  (await gql(`query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`,
    { b: [board] })).boards[0].columns;

const make = async (board, title, type, defaults) => {
  const have = (await colsOf(board)).find((c) => String(c.title).trim() === title);
  if (have) { console.log(`  קיימת: ${title} → ${have.id}`); return String(have.id); }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$s:JSON){
       create_column(board_id:$b,title:$t,column_type:$c,defaults:$s){ id } }`,
    { b: board, t: title, c: type, s: defaults || null });
  console.log(`  נוצרה: ${title} → ${d.create_column.id}`);
  return String(d.create_column.id);
};

/* ---------- 1 · הלוח ---------- */
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

const out = {
  /* ⚠ מזהה **ושם**: המזהה קובע בעלות, והשם נועד כדי שהלוח
     יהיה קריא לאדם שפותח אותו ב-monday (4מו). */
  student: await make(board, "מזהה חניך", "text"),
  studentName: await make(board, "חניך", "text"),
  kind: await make(board, "סוג", "status", labels(STU_KINDS)),
  date: await make(board, "תאריך", "date"),
  topic: await make(board, "נושא", "text"),
  happened: await make(board, "התקיים", "status", labels(HAPPENED_LABELS)),
  note: await make(board, "הערה", "long_text"),
  by: await make(board, "שובץ על ידי", "text"),
};

/* ---------- 2 · התיבה בלוח ההגדרות ---------- */
let flagId = "";
if (PLACEMENT_BOARDS.definitions) {
  console.log(`\nלוח הגדרות השיבוצים:`);
  flagId = await make(PLACEMENT_BOARDS.definitions, FLAG_COL, "checkbox");
} else {
  console.log("\n  ⚠ לוח ההגדרות טרם הוקם — התיבה תיווצר בהרצה הבאה.");
}

/* ---------- כתיבת המזהים ---------- */
const head = `/* ============================================================
   שיעורי חניך — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נכתב על ידי tools/seed-stulesson.mjs.
   ============================================================ */

`;
let src = existsSync(PATH) ? readFileSync(PATH, "utf8") : head;

/* ⚠ `;\r?\n` ומחיקת כפילויות — ראו ההסבר ב-5כג. */
const put = (name, value) => {
  const re = () => new RegExp(`export const ${name} = [\\s\\S]*?;\\r?\\n`, "g");
  const line = `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
  if (!re().test(src)) { src += "\n" + line; return; }
  let first = true;
  src = src.replace(re(), () => (first ? ((first = false), line) : ""));
};
put("STU_BOARDS", { board });
put("STU_COLS", out);
writeFileSync(PATH, src, "utf8");

/* ⚠ **החלפה כירורגית** ב-placements-ids: הקובץ מחולל על ידי
   seed-placements, אבל הרצה חוזרת שלו לא תגיע לכאן — ורק
   מציין המקום הריק מוחלף. */
if (flagId) {
  let ps = readFileSync(PLACEMENTS_PATH, "utf8");
  const empty = /(\n(\s*)content: )""(,)/;
  if (empty.test(ps)) {
    ps = ps.replace(empty, `$1"${flagId}"$3`);
    writeFileSync(PLACEMENTS_PATH, ps, "utf8");
    console.log(`\n✓ נכתב ל-${PLACEMENTS_PATH}`);
  } else {
    const filled = ps.match(/\n\s*content: "([^"]+)"/);
    if (!filled) {
      console.error(`\n✗ לא נמצאה השורה content ב-${PLACEMENTS_PATH}`);
      process.exit(1);
    }
    console.log(`\n  לא נגעתי — content כבר מוגדר: ${filled[1]}`);
  }
}

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה עצמה (5כג). */
const fresh = await import("../shared/stulesson-ids.js?v=" + Date.now());
if (!fresh.stuLessonReady()) {
  console.error("\n✗ stuLessonReady() עדיין false.\n");
  process.exit(1);
}
console.log(`\n✓ נכתב ${PATH} — שני הקבצים חייבים להיכנס לקומיט.`);
console.log("✓ stuLessonReady() = true\n");
console.log("─".repeat(56));
console.log("⚠ עכשיו, ב-monday, פעם אחת:");
console.log("─".repeat(56));
console.log(`  לסמן את התיבה "${FLAG_COL}" בשורת הוועדה בלוח`);
console.log("  \"שיבוצים – הגדרות\". בלי הסימון המסכים החדשים");
console.log("  פתוחים לצוות בלבד, והמסך אומר זאת.\n");
console.log("ואז: npm run clean:defaults\n");
