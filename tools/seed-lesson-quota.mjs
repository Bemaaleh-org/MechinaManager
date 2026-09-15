/* ============================================================
   תקן השיעורים — כמה מפגשים צריכים להיות עד סוף השנה
   ------------------------------------------------------------
     npm run seed:lesson-quota           (יבש)
     npm run seed:lesson-quota -- --go   (מבצע)

   יוצר בלוח הגיליונות עמודה מספרית "תקן שיעורים", וזורע את
   שבעת המספרים שראש המכינה מסר.

   ⚠⚠ **שבעת המספרים הם זריעה, והלוח הוא מקור האמת.** תקן
     משתנה כשמרצה מבטל חודש וכשנוסף סמינר, ואחראי הלו״ז משנה
     אותו בלוח בלי דיפלוי (עיקרון 1). הרצה חוזרת **אינה דורסת**
     תקן שכבר נקבע — היא ממלאת רק את מה שריק.

   ⚠ **התאמת שם מדויקת**, ושם שאינו נמצא מדווח ואינו עוצר את
     ההקמה: `pay-keep` נשרף על התאמה חלקית ש"ציונות" תפסה גם
     את "איה - ציונות", ו-seed-content-sheets נשרף על יציאה
     בקוד 1 שהרגה את כל שרשרת ההקמה כשלוח הגיליונות היה ריק.

     ההבחנה: **העמודה היא החוזה, והשמות הם זריעה.** במחזור חדש
     הגיליונות טרם קיימים, וזה מצב תקין לגמרי.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { gql } from "../api/_monday.js";
import { ensureCycle } from "../api/_cycle.js";
import { LESSON_BOARDS } from "../shared/lessons-boards.js";

const GO = process.argv.includes("--go");
const PATH = "shared/lessons-boards.js";
const TITLE = "תקן שיעורים";

/* ============================================================
   ⚠⚠ **שם הגיליון בדיוק כמו בלוח, תו בתו.**

   ראש המכינה מסר קיצורים ("תנך", "פסיכולוגיה",
   "הכנה לצהל"), ושלושתם לא נמצאו בלוח — וזה בדיוק
   מה שההרצה היבשה קיימת בשבילו.

   ⚠ **ושני סוגי גרשיים באותו לוח**, והם תווים שונים:
       "הכנה לצה״ל"              — גרשיים עבריים (U+05F4)
       "תנ\"ך בראי החברה הישראלית"  — מרכאות רגילות (U+0022)

     אותו כלל שכתוב על התוויות ב-CLAUDE.md, וכאן הוא אפילו
     גרוע יותר: ההתאמה נכשלת בשקט והגיליון פשוט לא
     מקבל תקן.

   ⚠ ו"ציונות" ו"איה - ציונות" הם שני גיליונות שונים
     עם תקנים שונים — והתאמה חלקית הייתה נותנת לשני
     אותו מספר. זה בדיוק מה ששרף את pay-keep.
   ============================================================ */
const WANT = {
  "ציונות": 25,
  "מסילת ישרים": 15,
  "פסיכולוגיה למכיניסטים": 15,
  "תנ\"ך בראי החברה הישראלית": 25,
  "הכנה לצה״ל": 13,
  "מזרח תיכון": 20,
  "איה - ציונות": 10,
};

console.log(GO ? "\n▶ מבצע\n" : "\n▶ הרצה יבשה — הוסיפו -- --go כדי לבצע\n");

/* ⚠ המזהים נדרסים בזמן ריצה (4ל) — לקרוא לפני שנוגעים בלוח. */
await ensureCycle();
const board = LESSON_BOARDS.sheets;
if (!board) { console.error("✗ לוח הגיליונות אינו מוגדר.\n"); process.exit(1); }

const b = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ name columns{ id title } } }`, { b: [board] },
)).boards[0];
console.log(`לוח: ${b.name}`);

let colId = "";
const have = b.columns.find((c) => String(c.title).trim() === TITLE);
if (have) { colId = String(have.id); console.log(`  קיימת: ${TITLE} → ${colId}`); }
else if (GO) {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!){ create_column(board_id:$b,title:$t,column_type:$c){ id } }`,
    { b: board, t: TITLE, c: "numbers" },
  );
  colId = String(d.create_column.id);
  console.log(`  נוצרה: ${TITLE} → ${colId}`);
} else { console.log(`  תיווצר: ${TITLE}`); }

/* ---- מי כבר נושא תקן ---- */
/* ⚠ שתי שאילתות ולא תבנית מותנית: GraphQL דוחה משתנה שהוצהר
   ואינו בשימוש, וזה בדיוק מה שקורה בהרצה יבשה לפני שהעמודה
   נוצרה (הלקח של seed-content-sheets). */
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
for (const [name, n] of Object.entries(WANT)) {
  const hits = items.filter((i) => String(i.name).trim() === name);
  if (!hits.length) { missing.push(name); continue; }
  if (hits.length > 1) {
    console.error(`  ⚠ ${hits.length} גיליונות בשם "${name}" — יש לאחד אותם בלוח. מדולג.`);
    continue;
  }
  const now = colId ? String(hits[0].column_values?.[0]?.text || "").trim() : "";
  /* ⚠ **אינו דורס תקן קיים.** מרגע שהעמודה קיימת הלוח הוא
     מקור האמת, ומספר שמישהו שינה ביד גובר על הזריעה. */
  if (now !== "") { console.log(`  כבר נקבע: ${name} = ${now}`); continue; }
  pick.push({ id: hits[0].id, name, n });
}

if (missing.length) {
  console.log(`\n  ⚠ טרם קיימים בלוח: ${missing.join(" · ")}`);
  console.log("    העמודה נוצרת בכל מקרה; למלא להם תקן כשייווצרו.");
}

if (!pick.length) console.log("\n  אין מה לזרוע — לכולם כבר יש תקן.");
else for (const p of pick) console.log(`  ${GO ? "נזרע" : "ייזרע"}: ${p.name} = ${p.n}`);

if (!GO) { console.log("\n(יבש — לא נכתב דבר)\n"); process.exit(0); }

for (const p of pick) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: board, i: p.id, v: JSON.stringify({ [colId]: String(p.n) }) },
  );
}

/* ---- המזהה לקובץ, בהחלפה כירורגית ---- */
let file = readFileSync(PATH, "utf8");
const empty = /(\n(\s*)quota: )""(,)/;
if (empty.test(file)) {
  writeFileSync(PATH, file.replace(empty, `$1"${colId}"$3`), "utf8");
  console.log(`\n✓ נכתב ל-${PATH}`);
} else {
  const filled = file.match(/\n\s*quota: "([^"]+)"/);
  if (!filled) { console.error(`\n✗ לא נמצאה השורה quota ב-${PATH}`); process.exit(1); }
  console.log(`  לא נגעתי — quota כבר מוגדר: ${filled[1]}`);
}

/* ⚠ אימות בקריאה טרייה ולא על סמך ההחלפה (5כג). */
const fresh = await import("../shared/lessons-boards.js?v=" + Date.now());
if (!fresh.quotaReady()) {
  console.error("\n✗ quotaReady() עדיין false.\n");
  process.exit(1);
}
console.log("✓ quotaReady() = true");
console.log("⚠ shared/lessons-boards.js חייב להיכנס לקומיט.\n");
