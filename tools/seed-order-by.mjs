/* ============================================================
   "מי רשם את הקנייה" — עמודה בלוח הקניות
   ------------------------------------------------------------
     npm run seed:order-by          (יבש)
     npm run seed:order-by -- --go  (מבצע)

   הבקשה (ראש המכינה, 22.9.2026): *"בתקציב האוכל תחת הקטגוריה
   של קבלות... מעבר לסכום והתאריך יהיה כתוב מי הזין את אותה
   קבלה (אותו חניך/איש צוות)."*

   ⚠⚠ **למה עמודה נוספת ולא `by` הקיימת.** `by` היא **מי העלה
     את הקובץ**, ונכתבת רק ברגע ההעלאה. בלוח יושבות 29 קניות
     ו**אפס קבלות** — כלומר בלעדיה כל שורה ברשימה תישאר בלי
     שם, וזו בדיוק הבקשה. השתיים אינן אותו אדם: אחד רושם את
     הקנייה, ואחר עשוי לצלם את הקבלה.

   ⚠ **שם ולא מזהה, וזה ההפך מלוח המשימות האישיות (4מה).**
     קנייה היא רשומה כספית, והשאלה "את מי לשאול על הקנייה
     הזו" היא בדיוק מה שהיא נועדה לענות — אותו נימוק של "מי
     לקח" בפניות הגיוס (5כו) ושל מי סימן בצ׳ק ליסט ההובלה
     (5יא). זה אינו מעקב אחרי עבודת תורנים.

   ⚠ אידמפוטנטי — עמודה שכבר קיימת אינה נוצרת שוב.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";

const GO = process.argv.includes("--go");

/* ⚠⚠ `ensureCycle()` לפני שנוגעים במזהי הלוחות — הם אובייקטים
   שנדרסים בזמן ריצה (4ל). */
try {
  await ensureCycle();
} catch (e) {
  console.error("\n✗ טעינת המחזור נכשלה — לא נגעתי בכלום.");
  console.error("  " + (e && e.message) + "\n");
  process.exit(1);
}

const { BUDGET_BOARDS } = await import("../shared/budget-boards.js");
const TITLE = "נרשמה על ידי";
const board = BUDGET_BOARDS.orders;

const b = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title type } } }`,
  { b: [board] })).boards[0];
console.log(`\nלוח: ${b.name}\n`);

const have = b.columns.find((c) => String(c.title).trim() === TITLE);
let id = have ? String(have.id) : null;
if (have) console.log(`  קיימת: ${TITLE} → ${id}`);
else if (!GO) {
  console.log(`  תיווצר: ${TITLE}  (text)`);
  console.log("\n(יבש — לא נכתב דבר. להוסיף --go כדי לבצע)\n");
  process.exit(0);
} else {
  const d = await gql(
    `mutation($b:ID!,$t:String!){ create_column(board_id:$b,title:$t,column_type:text){ id } }`,
    { b: board, t: TITLE });
  id = String(d.create_column.id);
  console.log(`  נוצרה: ${TITLE} → ${id}`);
}

if (!GO) { console.log("\n(יבש)\n"); process.exit(0); }

/* ⚠ החלפה **כירורגית** — `shared/budget-ids.js` נכתב ביד ומלא
   בהערות, וכתיבה מחדש שלו תמחק אותן (5לב). */
const PATH = "shared/budget-ids.js";
let src = readFileSync(PATH, "utf8");
/* ⚠ `;\r?\n` ולא `\n` — עץ שנבדק ב-CRLF אינו נתפס אחרת (5כג). */
const empty = /(\n(\s*)createdBy: )""(,)/;
if (empty.test(src)) {
  src = src.replace(empty, `$1"${id}"$3`);
  writeFileSync(PATH, src, "utf8");
  console.log(`✓ נכתב createdBy → ${id}`);
} else {
  /* ⚠ מציין המקום כבר הוחלף — לא נוגעים. זהו
     הדפוס של כל ההחלפות הכירורגיות במאגר (5לב),
     והוא מה שעושה את הסקריפט אידמפוטנטי.
     ⚠⚠ **והמזהה שבקובץ מודפס לצד זה שבלוח.**
       שונים פירושו שהעמודה נוצרה מחדש בלוח והקובץ
       מצביע על עמודה מתה — וזה נראה בפלט ולא
       נבלע. (בהרצה היבשה של `check:seeds` המוק מחזיר
       מזהה מומצא, ולכן זו אינה שגיאה.) */
  const cur = (src.match(/\n\s*createdBy: "([^"]*)"/) || [])[1] || "";
  if (cur === id) console.log("  כבר מוגדר — לא נגעתי");
  else console.log(`  כבר מוגדר כ-"${cur}" — לא נגעתי. בלוח: "${id}".`);
}

/* ⚠⚠ אימות ב**תהליך נפרד** — מחרוזת שאילתה מבטלת את המטמון של
   המודול שנטען ולא של מה שהוא מייבא (5כג). */
const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `
  const m = await import("${new URL("../shared/budget-boards.js", import.meta.url).href}");
  process.stdout.write(JSON.stringify({ ready: m.orderByReady() }));
`], { encoding: "utf8" });
let out = null;
try { out = JSON.parse(probe.stdout); } catch { /* נאמר מיד */ }
if (!out || !out.ready) {
  console.error("\n✗ orderByReady() עדיין false.");
  console.error("  " + (probe.stderr || "").split("\n")[0] + "\n");
  process.exit(1);
}
console.log("\n✓ orderByReady() = true");
console.log("⚠ shared/budget-ids.js חייב להיכנס לקומיט.\n");
