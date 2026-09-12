/* ============================================================
   "מה חדש" — שער לפני הדחיפה
   ------------------------------------------------------------
     node tools/news-check.mjs          יוצא 1 אם חסרה רשומה
     node tools/news-check.mjs --list   מדפיס את הקומיטים בלבד

   ⚠⚠ **למה שער ולא ייצור אוטומטי.** הפיתוי הוא לגזור את
     "מה חדש" מהודעות הקומיט. זה נראה אוטומטי ויוצא שגוי:
     הודעת קומיט כתובה למי שקורא קוד ("תיקון ה-500 בכל
     המסכים — laundryReady חסר"), והרשומה נכתבת למי שמשתמש
     ("חדר כביסה — אפשר לשריין מכונה"). טקסט שנשמע סמכותי
     ואינו נכון גרוע מהיעדר טקסט — אותו נימוק של מפת
     ההרשאות (5ד) ושל "מי רואה" בנתונים שלי (5טו).

   ⚠ **מה שכן אוטומטי: לא לשכוח.** הכלל ב-shared/whats-new.js
     אומר שהרשומה נכתבת **באותו קומיט** של השינוי. כלל
     שנשען על זיכרון נשבר, ואז המסך מציג גרסה שאינה קיימת —
     בדיוק מה שהסעיף ההוא נועד למנוע. הבדיקה הזו הופכת אותו
     לדבר שאי אפשר לדלג עליו בשקט.

   ⚠ **נמדד מול התאריך של הרשומה החדשה ביותר** ולא מול
     הדחיפה האחרונה: כמה קומיטים באותו יום הם שחרור אחד,
     ורשומה אחת עליהם היא התיאור הנכון.
   ============================================================ */
import { execSync } from "node:child_process";
import { WHATS_NEW } from "../shared/whats-new.js";
import { readdirSync, readFileSync } from "node:fs";

/* ⚠ רק מה שמשנה את מה שהמשתמש רואה או יכול לעשות. שינוי
   בכלי, בבדיקה או בתיעוד אינו "חדש באפליקציה". */
const WATCHED = /^(src|api|shared)\//;
const IGNORE = /^shared\/(whats-new|.*-ids)\.js$/;

/* ⚠ **stderr מושתק ב-stdio ולא ב-2>/dev/null.** execSync רץ דרך
   cmd.exe בווינדוס, ושם /dev/null אינו קיים — הפקודה נכשלה בכל
   הרצה ("The system cannot find the path specified"), והכלי נפל
   לענף הגיבוי בשקט. ⚠ null ולא "" בכישלון: "אין תוצאה" ו"נכשל"
   הן שתי תשובות. */
const git = (c) => {
  try { return execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
};

const newest = WHATS_NEW.map((n) => n.date).filter(Boolean).sort().pop() || "";
if (!newest) {
  console.log("⚠ אין אף רשומה ב-WHATS_NEW.");
  process.exit(1);
}

/* ⚠ `--since` על תאריך הרשומה, ולא `HEAD~n`: מספר קומיטים
   אינו אומר דבר על כמה זמן עבר. */
/* ⚠⚠ **הבסיס הוא הקומיט שכתב את הרשומה, לא התאריך שלה.** הכלל
   ב-shared/whats-new.js: הרשומה נכתבת **באותו קומיט** של השינוי.
   --since על התאריך כולל את הקומיט שכתב את הרשומה עצמה, ולכן
   ביום שבו נכתבה רשומה הכלי **לא יכול היה לעבור** — נתפס כשארבע
   רשומות מ-12.9 נכנסו לקומיט והוא עדיין דרש רשומה. */
const base = git(`git log -1 --pretty=format:%H -- shared/whats-new.js`);
const log = base
  ? git(`git log ${base}..HEAD --pretty=format:%h%x09%s`)
  : git(`git log --since="${newest} 00:00" --pretty=format:%h%x09%s`);
const commits = log ? log.split("\n") : [];

/* ⚠ **`||` התייחס ל"אין מה לדחוף" ככישלון** — מחרוזת ריקה היא
   falsy — ולכן אחרי כל דחיפה נבדק הגיבוי שתמיד נכשל. עכשיו:
   מה שנגע אחרי קומיט הרשומה, ומה שטרם נכנס לקומיט. */
const files = base
  ? [git(`git diff --name-only --diff-filter=d ${base} HEAD`),
     git(`git diff --name-only --diff-filter=d HEAD`)].filter(Boolean).join("\n")
  : (git(`git log --since="${newest} 00:00" --name-only --pretty=format:`) || "");
const touched = [...new Set(files.split("\n").map((f) => f.trim()).filter(Boolean))]
  .filter((f) => WATCHED.test(f) && !IGNORE.test(f));

/* ============================================================
   ⚠⚠ **`screens` — שם שאינו במגירה אינו מסמן כלום, בשקט.**
     האריח במסך הבית מקבל "עודכן" לפי התאמה מדויקת לשם שבמגירה
     (src/Shortcuts.jsx). שגיאת כתיב — "קניות מכינה" במקום
     "קניות המכינה" — פשוט לא תסמן, ואיש לא יידע למה. לכן כל
     שם נבדק מול כל ה-label שכתובים בקוד המסכים וב-DUTIES.
   ============================================================ */
const known = new Set();
const sources = readdirSync("src").filter((f) => f.endsWith(".jsx"))
  .map((f) => "src/" + f).concat(["shared/duties.js"]);
for (const f of sources) {
  for (const m of readFileSync(f, "utf8").matchAll(/label: "([^"]+)"/g)) known.add(m[1]);
}
const unknown = [];
for (const n of WHATS_NEW) {
  for (const sc of n.screens || []) if (!known.has(sc)) unknown.push(`${n.date} · ${n.title} → "${sc}"`);
}
if (unknown.length) {
  console.log("");
  console.log("⚠ שמות ב-screens שאינם שם של מסך במגירה — לא יסמנו אף אריח:");
  for (const u of unknown) console.log("  " + u);
  console.log("");
  process.exit(1);
}

if (process.argv.includes("--list")) {
  for (const c of commits) console.log("  " + c);
  process.exit(0);
}

/* ⚠ **רשומה שנכתבת עכשיו, באותו שינוי — עוברת.** בלי זה הכלי
   נכשל תמיד **לפני** הקומיט (הבסיס הוא הקומיט הקודם שנגע בקובץ),
   כלומר אי אפשר היה להריץ אותו כשער לפני קומיט — רק אחריו, כשכבר
   מאוחר. שינוי לא-מקומט ב-whats-new.js הוא בדיוק "באותו קומיט". */
const pending = git(`git diff --name-only HEAD -- shared/whats-new.js`);
if (pending) {
  console.log(`✓ רשומה ב-WHATS_NEW נכתבת יחד עם השינוי (${touched.length} קבצים).`);
  process.exit(0);
}

if (!touched.length) {
  console.log(`✓ אין שינוי במסכים מאז ${newest} — אין מה להוסיף.`);
  process.exit(0);
}

console.log("");
console.log("═".repeat(56));
console.log("⚠ נגעת ב-" + touched.length + " קבצים שהמשתמש רואה, והרשומה");
console.log("  האחרונה ב-WHATS_NEW היא מ-" + newest + ".");
console.log("═".repeat(56));
console.log("\nהקומיטים מאז:");
for (const c of commits.slice(0, 15)) console.log("  " + c);
if (commits.length > 15) console.log(`  … ועוד ${commits.length - 15}`);

console.log("\nלהוסיף בראש WHATS_NEW ב-shared/whats-new.js:\n");
console.log("  {");
console.log(`    date: "${new Date().toISOString().slice(0, 10)}",`);
console.log('    title: "כותרת קצרה",');
console.log('    for: "all",              // all · student · staff');
console.log('    tags: ["שם המסך"],       // הצ׳יפים במסך הבית');
console.log('    screens: ["שם במגירה"],  // האריחים שיסומנו "עודכן"');
console.log('    items: ["מה אפשר לעשות היום ולא היה אפשר אתמול"],');
console.log("  },\n");
/* ⚠ יוצא 1 כדי שמי שמריץ אותו בשרשרת ייעצר. הדחיפה עצמה
   אינה נחסמת — הכלי אינו hook, והוא לא ינעל אף אחד מחוץ
   למאגר שלו. */
process.exit(1);
