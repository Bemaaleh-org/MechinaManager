/* ============================================================
   חילות החניכים מול חילות הבוגרים
   ------------------------------------------------------------
     npm run army:parity          מדווח על הפרש בין שתי הרשימות

   ⚠⚠ **למה זה קיים.** "לאיזה חיל" היא אותה שאלה בדיוק על חניך
     ועל בוגר, ושתי רשימות מקבילות מתפצלות ביום הראשון — ואז
     הסטטיסטיקה של הבוגרים מפסיקה להתיישב עם השיבוצים.
     `seed-army.mjs` זורע את רשימת החילות **פעם אחת** מלוח
     הבוגרים; מהרגע שמישהו מוסיף זרוע שם, שום דבר לא מסנכרן.

   ⚠⚠ **מדווח ואינו כותב.** כתיבה לעמודת סטטוס דורסת את **כל**
     רשימת התוויות, ותווית שנעלמת ממנה מוחקת בשקט את הערך של
     כל שורה שיושבת עליה (4כד, 5ז). המימוש הבטוח לזה כבר קיים
     ובדוק ב-`seed-army.mjs`, ומימוש שני שלו כאן הוא בדיוק סוג
     הכפילות שהקובץ הזה נועד לבטל.
   ============================================================ */
import { labelsOf, labelDrift } from "../api/_status-labels.js";
import { MECHINA_BOARDS, MECHINA_COLS, armyPlacementReady } from "../shared/mechina-boards.js";
import { EXTRA } from "../shared/extras-ids.js";

const R = MECHINA_COLS.roster;

if (!armyPlacementReady()) {
  console.error("\n✗ עמודות השיבוץ טרם הוקמו. להריץ קודם: npm run seed:army\n");
  process.exit(1);
}
const alumBoard = EXTRA.alumni && EXTRA.alumni.board;
const alumCol = EXTRA.alumni && EXTRA.alumni.cols && EXTRA.alumni.cols.branch;
if (!alumBoard || !alumCol) {
  console.error("\n✗ לוח הבוגרים אינו מוגדר ב-shared/extras-ids.js\n");
  process.exit(1);
}

const [alumni, students] = await Promise.all([
  labelsOf(alumBoard, alumCol),
  labelsOf(MECHINA_BOARDS.roster, R.armyCorps),
]);

console.log(`\nבוגרים : ${alumni.length} זרועות`);
console.log(`חניכים : ${students.length} חילות\n`);

const d = labelDrift(alumni, students);
if (d.same) {
  console.log("✓ הרשימות זהות.\n");
  process.exit(0);
}

if (d.missingInStudents.length) {
  console.log(`חסרות אצל החניכים (${d.missingInStudents.length}):`);
  for (const x of d.missingInStudents) console.log("    " + x);
}
/* ⚠ **מדווח ואינו מוחק.** תווית שקיימת רק אצל החניכים עשויה
   לשאת שיבוצים, והסרתה תמחק אותם בשקט. ההחלטה של אדם. */
if (d.extraInStudents.length) {
  console.log(`\nקיימות רק אצל החניכים (${d.extraInStudents.length}) — מדווח ולא נוגע:`);
  for (const x of d.extraInStudents) console.log("    " + x);
}

/* ============================================================
   ⚠⚠ **הכלי מדווח ואינו כותב, וזו החלטה.**

   כתיבה לעמודת סטטוס דורסת את **כל** רשימת התוויות, ותווית
   שנעלמת ממנה מוחקת בשקט את הערך של כל שורה שיושבת עליה
   (4כד, 5ז). המימוש הבטוח לזה כבר קיים ובדוק ב-seed-army.mjs
   — הוא שומר כל תווית קיימת עם ה-id והצבע שלה, מדלג על מפתח
   5, ומאמת בקריאה חוזרת. מימוש שני שלו כאן הוא בדיוק סוג
   הכפילות שהקובץ הזה נועד לבטל.
   ============================================================ */
console.log("\nמה לעשות:");
if (d.missingInStudents.length) {
  console.log("  npm run seed:army   — זורע מחדש את רשימת החילות מלוח הבוגרים,");
  console.log("                        שומר את הקיימות ומוסיף את החסרות.");
}
if (d.extraInStudents.length) {
  console.log("  ⚠ מה שקיים רק אצל החניכים לא ייעלם ולא יימחק. אם הוא");
  console.log("    מיותר — להשבית אותו ביד בלוח, אחרי בדיקה שאין עליו שיבוץ.");
}
console.log("");
process.exit(1);
