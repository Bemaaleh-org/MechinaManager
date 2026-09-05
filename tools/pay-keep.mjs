/* ============================================================
   דוח התשלום — להשאיר רק את השיעורים שעולים כסף
   ------------------------------------------------------------
   המכינה מסרה את הרשימה. כל השאר מסומן "מחוץ לדוח התשלום" —
   **תיבה, ולא מחיקה**: הגיליון נשאר פעיל, מפגשיו נספרים בלוח
   השיעורים, ואפשר להחזיר אותו לדוח בקליק מהמסך.

   ⚠⚠ **התאמה מדויקת, ולא `includes`.** בלוח יש גם "ציונות"
     וגם "איה - ציונות" — שני גיליונות שונים, ואחד מהם נשאר
     בדוח והשני יוצא. התאמה חלקית הייתה מוציאה את שניהם או
     משאירה את שניהם, ובשקט.

   ⚠ **וגרשיים:** "הכנה לצה״ל" נכתב בגרש עברי, ואילו
     "תנ\\"ך בראי החברה הישראלית" בגרשיים רגילים. הרשימה כאן
     הועתקה מהלוח עצמו ולא הוקלדה מחדש — שם שלא יימצא מדווח
     ואינו מדולג בשקט.

   הרצה: node --env-file=.env tools/pay-keep.mjs [--go]
   ============================================================ */
import { gql } from "../api/_monday.js";
import { loadSheets, invalidateLessons } from "./../api/_lessons-data.js";
import { LESSON_BOARDS, LESSON_COLS, payFilterReady } from "../shared/lessons-boards.js";

const S = LESSON_COLS.sheets;
const GO = process.argv.includes("--go");

/** ⚠ בתו, כפי שהם בלוח. */
const KEEP = [
  "אימונים",
  "דינמיקה קבוצתית",
  "הכנה לצה״ל",
  "מסילת ישרים",
  "פסיכולוגיה למכיניסטים",
  "ציונות",
  'תנ"ך בראי החברה הישראלית',
];

if (!payFilterReady()) {
  console.log("עמודת \"מחוץ לדוח התשלום\" טרם הוקמה. מריצים npm run seed:army.");
  process.exit(1);
}

const sheets = await loadSheets({ force: true });
const names = new Set(sheets.map((s) => s.subject));

/* ⚠ שם ברשימה שאינו בלוח — מדווח ולא מדולג. הוא כמעט תמיד
   הבדל של תו אחד, וזה בדיוק מה שאי אפשר לראות בעין. */
const missing = KEEP.filter((k) => !names.has(k));
if (missing.length) {
  console.log("⚠⚠ שמות שלא נמצאו בלוח (בדקו גרשיים ורווחים):");
  for (const m of missing) console.log("  " + JSON.stringify(m));
  console.log("\nלא בוצע שינוי.");
  process.exit(1);
}

const keep = sheets.filter((s) => KEEP.includes(s.subject));
const drop = sheets.filter((s) => s.active && !KEEP.includes(s.subject) && !s.noPay);
const back = sheets.filter((s) => KEEP.includes(s.subject) && s.noPay);

console.log(`נשארים בדוח (${keep.length}):`);
for (const s of keep) console.log(`  ${s.subject}  ${s.price == null ? "— בלי מחיר" : s.price + " ₪"}`);
console.log(`\nיוצאים מהדוח (${drop.length}):`);
for (const s of drop) console.log(`  ${s.subject}  ${s.price == null ? "— בלי מחיר" : s.price + " ₪"}`);
if (back.length) {
  console.log(`\nמוחזרים לדוח (${back.length}):`);
  for (const s of back) console.log("  " + s.subject);
}

if (!GO) { console.log("\nהרצה יבשה. להוספת --go כדי לבצע."); process.exit(0); }

const set = async (id, on) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){
     change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
       create_labels_if_missing:false){ id } }`,
  { b: LESSON_BOARDS.sheets, i: id, v: JSON.stringify({ [S.noPay]: { checked: on ? "true" : "false" } }) });

for (const s of drop) { await set(s.id, true); console.log("הוצא: " + s.subject); }
for (const s of back) { await set(s.id, false); console.log("הוחזר: " + s.subject); }
invalidateLessons();

/* ⚠ ווידוא בקריאה חוזרת — סימון שלא תפס נראה בדיוק כמו הצלחה. */
const after = await loadSheets({ force: true });
const inReport = after.filter((s) => s.active && !s.noPay).map((s) => s.subject).sort();
console.log("\nבדוח עכשיו (" + inReport.length + "): " + inReport.join(" · "));
const wrong = inReport.filter((n) => !KEEP.includes(n));
console.log(wrong.length ? "⚠⚠ נשארו בדוח שלא ברשימה: " + wrong.join(" · ")
  : "מה שבדוח הוא בדיוק הרשימה שנמסרה.");
