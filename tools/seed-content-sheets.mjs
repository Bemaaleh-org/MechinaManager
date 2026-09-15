/* ============================================================
   הגיליונות שוועדת קבוצה ותוכן אחראית עליהם
   ------------------------------------------------------------
     npm run seed:content-sheets          (יבש)
     npm run seed:content-sheets -- --go  (מבצע)

   יוצר בלוח הגיליונות תיבה "ועדת קבוצה ותוכן", ומסמן את
   השלושה שראש המכינה מסר: מדעי המדינה · כישורי חיים ·
   שיעור ניר עוז.

   ⚠⚠ **הרקע:** עד היום `lessonRights.write` היה בוליאני אחד
     בלי פרמטר של גיליון, ולכן הוועדה יכלה לערוך את **כל 21
     הגיליונות**. ראש המכינה התכוון לשלושה, ובדק.

   ⚠ **שלושת השמות כאן הם זריעה בלבד.** מרגע שהתיבה קיימת
     הלוח הוא מקור האמת, והמכינה מסמנת גיליון רביעי — או
     מבטלת אחד — בלי דיפלוי (עיקרון 1).

   ⚠ **התאמת שם מדויקת** — `pay-keep` נשרף על התאמה חלקית
     ש"ציונות" תפסה גם את "איה - ציונות".

   ⚠⚠ **אבל גיליון שאינו נמצא מדווח ואינו עוצר את ההקמה.**
     זה נתפס ב-`check:seeds`: במחזור חדש לוח הגיליונות **ריק**,
     ויציאה בקוד 1 הרגה את כל שרשרת ההקמה — 25 טענות נפלו על
     שלבים שכלל לא קשורים.

     ההבחנה: **העמודה היא החוזה, והשמות הם זריעה.** בלי העמודה
     `contentSheetsReady()` נשאר false והמערכת יודעת לומר מה
     להריץ (עיקרון 6); גיליון שטרם נוצר הוא מצב תקין לגמרי,
     ומי שיקים מחזור חדש יסמן אותו כשייווצר.

   ⚠ **ואינו מבטל סימון קיים.** הרצה חוזרת מסמנת את מה שחסר
     ואינה מנקה גיליון שמישהו סימן ביד.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";

const GO = process.argv.includes("--go");
const PATH = "shared/lessons-boards.js";
const TITLE = "ועדת קבוצה ותוכן";
const WANT = ["מדעי המדינה", "כישורי חיים", "שיעור ניר עוז"];

console.log(GO ? "\n▶ מבצע\n" : "\n▶ הרצה יבשה — הוסיפו -- --go כדי לבצע\n");

/* ⚠ המזהים נדרסים בזמן ריצה (4ל). */
await ensureCycle();
const board = LESSON_BOARDS.sheets;

const cols = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`, { b: [board] },
)).boards[0];
console.log(`לוח: ${cols.name}`);

let colId = "";
const have = cols.columns.find((c) => String(c.title).trim() === TITLE);
if (have) { colId = String(have.id); console.log(`  קיימת: ${TITLE} → ${colId}`); }
else if (GO) {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: board, t: TITLE, c: "checkbox" },
  );
  colId = String(d.create_column.id);
  console.log(`  נוצרה: ${TITLE} → ${colId}`);
} else { console.log(`  תיווצר: ${TITLE}`); }

/* ---- מי מסומן ---- */
/* ⚠ שתי שאילתות ולא תבנית מותנית: GraphQL דוחה משתנה שהוצהר
   ואינו בשימוש, וזה בדיוק מה שקרה בהרצה היבשה כשהעמודה עוד
   לא הייתה קיימת. */
const items = colId
  ? (await gql(
      `query($b:[ID!],$c:[String!]){ boards(ids:$b){ items_page(limit:500){ items{ id name
         column_values(ids:$c){ text } } } } }`, { b: [board], c: [colId] },
    )).boards[0].items_page.items
  : (await gql(
      `query($b:[ID!]){ boards(ids:$b){ items_page(limit:500){ items{ id name } } } }`,
      { b: [board] },
    )).boards[0].items_page.items;

const pick = [];
const missing = [];
for (const want of WANT) {
  const hits = items.filter((i) => String(i.name).trim() === want);
  if (!hits.length) { missing.push(want); continue; }
  if (hits.length > 1) {
    /* ⚠ כפילות **כן** ראויה לקריאה חזקה — היא אומרת שהלוח
       עצמו שבור — אבל גם היא אינה מפילה את ההקמה. */
    console.error(`  ⚠ ${hits.length} גיליונות בשם "${want}" — יש לאחד אותם בלוח. מדולג.`);
    continue;
  }
  const on = colId && String(hits[0].column_values?.[0]?.text || "").trim();
  if (on === "v" || on === "✓") console.log(`  כבר מסומן: ${want}`);
  else pick.push(hits[0]);
}

if (missing.length) {
  /* ⚠ מדווח בבירור ואינו עוצר — ראו האזהרה בראש הקובץ. */
  console.log(`\n  ⚠ טרם קיימים בלוח: ${missing.join(" · ")}`);
  console.log("    העמודה נוצרת בכל מקרה; לסמן אותם כשייווצרו.");
}

if (!pick.length) console.log("\n  אין מה לסמן — שלושתם כבר מסומנים.");
else for (const p of pick) console.log(`  ${GO ? "מסומן" : "יסומן"}: ${p.name}`);

if (!GO) { console.log("\n(יבש — לא נכתב דבר)\n"); process.exit(0); }

for (const p of pick) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: board, i: p.id, v: JSON.stringify({ [colId]: { checked: "true" } }) },
  );
}

/* ---- המזהה לקובץ, בהחלפה כירורגית (הדפוס של seed-appeal) ---- */
let src = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)contentTeam: )""(,)/;
if (empty.test(src)) {
  writeFileSync(PATH, src.replace(empty, `$1"${colId}"$3`), "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = src.match(/\n\s*contentTeam: "([^"]+)"/);
  if (!filled) { console.error(`\n✗ לא נמצאה השורה contentTeam ב-${PATH}`); process.exit(1); }
  console.log(`  לא נגעתי — contentTeam כבר מוגדר: ${filled[1]}`);
}

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה (5כג). */
const fresh = await import("../shared/lessons-boards.js?v=" + Date.now());
if (!fresh.contentSheetsReady()) {
  console.error("\n✗ contentSheetsReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ contentSheetsReady() = true");
console.log("⚠ shared/lessons-boards.js חייב להיכנס לקומיט.\n");
