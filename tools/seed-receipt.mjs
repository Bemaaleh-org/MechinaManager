/* ============================================================
   קבלה על קנייה, ומי העלה אותה
   ------------------------------------------------------------
     npm run seed:receipt

   שתי עמודות בלוח הקניות של תקציב המטבח, פעם אחת:
     1. "קבלה"        — עמודת קובץ
     2. "העלה/תה"     — טקסט, שם מי שהעלה

   ⚠ **שם ולא מזהה, וזה ההפך מלוח המשימות האישיות (4מה).**
     קבלה היא מסמך כספי, ו"את מי לשאול על הקנייה הזו" היא
     בדיוק השאלה שהיא נועדה לענות עליה. אותו נימוק של "מי
     לקח" בפניות הגיוס (5כו) ושל מי סימן בצ׳ק ליסט ההובלה
     (5יא) — ולא מעקב אחרי חניך.

   ⚠ **אידמפוטנטי.** עמודה נמצאת לפי שם ואינה נוצרת שוב.

   ⚠ **וכותב את שני המזהים בעצמו** ל-shared/budget-ids.js,
     בהחלפה **כירורגית**: רק מציין המקום הריק ("") מוחלף,
     ושורה שכבר נושאת מזהה אינה נדרסת ומדווחת. הקובץ מחולל
     על ידי seed-budget, אבל הרצה חוזרת שלו לא תגיע לכאן.

   ⚠ **ושתיהן או אף אחת** — `receiptReady()` דורש את שתיהן.
     קבלה בלי שם המעלה היא בדיוק מה שהתבקש כאן ואינו קיים.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gql } from "../api/_monday.js";
import { BUDGET_BOARDS } from "../shared/budget-ids.js";

const PATH = "shared/budget-ids.js";
const COLS = [
  { key: "receipt", title: "קבלה", type: "file" },
  { key: "by", title: "העלה/תה", type: "text" },
];

if (!BUDGET_BOARDS.orders) {
  console.error("\n✗ לוחות התקציב טרם הוקמו. הריצו קודם: npm run seed:budget\n");
  process.exit(1);
}

/* ---------- 1 · העמודות ---------- */
const board = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`,
  { b: [BUDGET_BOARDS.orders] })).boards[0];
console.log(`\nלוח: ${board.name}`);

const ids = {};
for (const c of COLS) {
  const have = board.columns.find((x) => String(x.title).trim() === c.title);
  if (have) {
    ids[c.key] = String(have.id);
    console.log(`  קיימת: ${c.title} → ${ids[c.key]}`);
    continue;
  }
  const d = await gql(
    `mutation($b:ID!,$t:String!,$k:ColumnType!){
       create_column(board_id:$b,title:$t,column_type:$k){ id } }`,
    { b: BUDGET_BOARDS.orders, t: c.title, k: c.type });
  ids[c.key] = String(d.create_column.id);
  console.log(`  נוצרה: ${c.title} → ${ids[c.key]}`);
}

/* ---------- 2 · כתיבת המזהים ---------- */
let src = readFileSync(PATH, "utf8");
let wrote = 0;
for (const c of COLS) {
  const empty = new RegExp(`(\\n(\\s*)${c.key}: )""(,)`);
  if (empty.test(src)) {
    src = src.replace(empty, `$1"${ids[c.key]}"$3`);
    wrote++;
    continue;
  }
  const filled = src.match(new RegExp(`\\n\\s*${c.key}: "([^"]+)"`));
  if (!filled) {
    console.error(`\n✗ לא נמצאה השורה ${c.key} ב-${PATH}`);
    process.exit(1);
  }
  console.log(`  לא נגעתי — ${c.key} כבר מוגדר: ${filled[1]}`);
}
if (wrote) {
  writeFileSync(PATH, src, "utf8");
  console.log(`\n✓ נכתבו ${wrote} מזהים ל-${PATH}`);
}

/* ============================================================
   ⚠ **אימות בתהליך נפרד ולא ב-`?v=`.**
     מחרוזת שאילתה מבטלת את המטמון של המודול שנטען ולא של מה
     שהוא מייבא, ולכן ייבוא של budget-boards כאן היה מקבל
     ids מהמטמון ומדווח "לא קרה כלום" על כתיבה שהצליחה (5כג).
   ============================================================ */
const probe = spawnSync(process.execPath, ["-e",
  `import("./shared/budget-boards.js").then((m) => {
     process.stdout.write(m.receiptReady() ? "ok" : "no");
   })`], { encoding: "utf8" });

if (probe.stdout.trim() !== "ok") {
  console.error("\n✗ receiptReady() עדיין false בקובץ המזהים.\n");
  process.exit(1);
}
console.log("✓ receiptReady() = true");
console.log("⚠ shared/budget-ids.js חייב להיכנס לקומיט.\n");
