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

/* ⚠ רק מה שמשנה את מה שהמשתמש רואה או יכול לעשות. שינוי
   בכלי, בבדיקה או בתיעוד אינו "חדש באפליקציה". */
const WATCHED = /^(src|api|shared)\//;
const IGNORE = /^shared\/(whats-new|.*-ids)\.js$/;

const git = (c) => { try { return execSync(c, { encoding: "utf8" }).trim(); } catch { return ""; } };

const newest = WHATS_NEW.map((n) => n.date).filter(Boolean).sort().pop() || "";
if (!newest) {
  console.log("⚠ אין אף רשומה ב-WHATS_NEW.");
  process.exit(1);
}

/* ⚠ `--since` על תאריך הרשומה, ולא `HEAD~n`: מספר קומיטים
   אינו אומר דבר על כמה זמן עבר. */
const log = git(`git log --since="${newest} 00:00" --pretty=format:%h%x09%s`);
const commits = log ? log.split("\n") : [];

const files = git(`git diff --name-only --diff-filter=d "@{u}" HEAD 2>/dev/null`)
  || git(`git log --since="${newest} 00:00" --name-only --pretty=format:`);
const touched = [...new Set(files.split("\n").map((f) => f.trim()).filter(Boolean))]
  .filter((f) => WATCHED.test(f) && !IGNORE.test(f));

if (process.argv.includes("--list")) {
  for (const c of commits) console.log("  " + c);
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
console.log('    items: ["מה אפשר לעשות היום ולא היה אפשר אתמול"],');
console.log("  },\n");
/* ⚠ יוצא 1 כדי שמי שמריץ אותו בשרשרת ייעצר. הדחיפה עצמה
   אינה נחסמת — הכלי אינו hook, והוא לא ינעל אף אחד מחוץ
   למאגר שלו. */
process.exit(1);
