/* ============================================================
   הקמת כל הלוחות החדשים — פקודה אחת
   ------------------------------------------------------------
     npm run setup:boards

   מריץ את חמשת הסקריפטים של המסכים החדשים ואז את ניקוי שורות
   הדמה, אחד אחרי השני, ועוצר על הכישלון הראשון.

   ⚠ **למה זה קיים.** ההקמה הייתה שש פקודות נפרדות שצריך
     להריץ בסדר, וכל אחת מהן כותבת קובץ מזהים אחר. מי שהריץ
     ארבע מתוך שש קיבל מערכת שחציה עובדת וחציה אומרת "טרם
     הוקם" — וזה נראה בדיוק כמו באג ולא כמו שלב שנשכח.

   ⚠ **עוצר על הכישלון הראשון ואינו ממשיך.** סקריפט שנפל
     בגלל טוקן, הרשאה או קצב יגרור את כל מי שאחריו לאותה
     שגיאה, ואז שש שגיאות זהות מסתירות את זו האמיתית.

   ⚠ **אידמפוטנטי — מותר להריץ שוב.** כל סקריפט מזהה לוח או
     עמודה שכבר קיימים לפי השם ואינו יוצר אותם פעמיים. הרצה
     חוזרת אחרי כישלון באמצע ממשיכה בדיוק מהמקום שנעצר.

   ⚠ **ניקוי הדמה אחרון ולא אחרי כל אחד.** monday יוצרת כל
     לוח חדש עם שורות "Task 1", והן שורות לכל דבר (5יב). הוא
     סורק את כל הלוחות ממילא, ולכן פעם אחת בסוף מספיקה.

   ⚠ **ומוודא בסוף בקריאה טרייה.** הסקריפט אינו מדווח הצלחה
     על סמך קוד היציאה של מי שהוא הריץ — הוא מייבא כל מודול
     מזהים ובודק שפונקציית ה-Ready שלו מחזירה true. קובץ
     שנכתב חלקית עובר את קוד היציאה ונופל כאן.
   ============================================================ */
import { spawnSync } from "node:child_process";

const STEPS = [
  { script: "tools/seed-laundry.mjs", title: "חדר כביסה",
    ids: "shared/laundry-ids.js", ready: "laundryReady" },
  { script: "tools/seed-quotes.mjs", title: "בנק הציטוטים והתגובות",
    ids: "shared/quotes-ids.js", ready: "quotesReady" },
  { script: "tools/seed-mishmar.mjs", title: "משמרים ולו״ז משמר",
    ids: "shared/mishmar-ids.js", ready: "mishmarReady" },
  { script: "tools/seed-group.mjs", title: "הודעות לקבוצה",
    ids: "shared/group-ids.js", ready: "groupReady" },
  { script: "tools/seed-lesson-content.mjs", title: "שלוש עמודות התוכן במפגשים",
    ids: "shared/lessons-boards.js", ready: "contentReady" },
];

const CLEAN = { script: "tools/clean-defaults.mjs", title: "מחיקת שורות הדמה של monday" };

/* ⚠ בדיקה ש-monday בכלל עונה — לפני שמריצים שישה סקריפטים
   שכולם ייפלו באותה שגיאה. אותו נימוק כמו בדיקת השרת
   ב-tools/tests/run.mjs. */
try {
  const { gql } = await import("../api/_monday.js");
  await gql(`query{ me{ id } }`);
} catch (e) {
  const msg = String(e?.message || e);
  console.error("\n✗ אין חיבור ל-monday: " + msg);
  /* ⚠ **רשת חסומה נראית בדיוק כמו טוקן פסול.** שתי התקלות
     נופלות באותה שורה, והפתרון שלהן הפוך לגמרי — מי שיקבל
     "לבדוק את הטוקן" על חסימת פרוקסי יחליף טוקן תקין. */
  if (/Host not in allowlist|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|proxy|tunnel/i.test(msg)) {
    console.error("  זו חסימת רשת ולא בעיית טוקן — api.monday.com אינו נגיש");
    console.error("  מהסביבה הזו. להריץ ממחשב עם גישה רגילה לאינטרנט.\n");
  } else {
    console.error("  לבדוק ש-MONDAY_TOKEN נמצא ב-.env ושהוא בתוקף.\n");
  }
  process.exit(1);
}

const run = (s) => {
  console.log("\n" + "═".repeat(56));
  console.log("▶ " + s.title);
  console.log("═".repeat(56));
  const r = spawnSync(process.execPath, ["--env-file=.env", s.script],
    { stdio: "inherit" });
  return r.status === 0;
};

const done = [];
for (const s of STEPS) {
  if (run(s)) { done.push(s); continue; }
  console.error("\n" + "═".repeat(56));
  console.error("✗ נעצר על: " + s.title + "  (" + s.script + ")");
  if (done.length) {
    console.error("\n  מה שכן הוקם, וחייב להיכנס לקומיט:");
    for (const d of done) console.error("    " + d.ids);
  }
  console.error("\n  אחרי שהתקלה נפתרת — להריץ שוב את אותה פקודה.");
  console.error("  הסקריפטים אידמפוטנטיים; מה שכבר נוצר לא ייווצר שוב.\n");
  process.exit(1);
}

if (!run(CLEAN)) {
  console.error("\n⚠ הלוחות הוקמו וניקוי שורות הדמה נכשל.");
  console.error("  זה אינו חוסם — להריץ בנפרד: npm run clean:defaults\n");
}

/* ---- אימות טרי ---- */
console.log("\n" + "═".repeat(56));
console.log("▶ אימות");
console.log("═".repeat(56));

const bad = [];
for (const s of STEPS) {
  try {
    const m = await import("../" + s.ids + "?v=" + Date.now());
    const fn = m[s.ready];
    if (typeof fn !== "function") { bad.push(s.title + " — אין " + s.ready + "()"); continue; }
    if (!fn()) { bad.push(s.title + " — " + s.ready + "() מחזירה false"); continue; }
    console.log("  ✓ " + s.title);
  } catch (e) {
    bad.push(s.title + " — " + (e?.message || e));
  }
}

if (bad.length) {
  console.error("\n✗ " + bad.length + " לא עברו את האימות:");
  for (const b of bad) console.error("    " + b);
  console.error("");
  process.exit(1);
}

console.log("\n✓ הכול הוקם ואומת.\n");
console.log("⚠ הקבצים שנכתבו חייבים להיכנס לקומיט — בלעדיהם");
console.log("  הדיפלוי ב-Vercel לא ימצא את הלוחות:\n");
for (const s of STEPS) console.log("    " + s.ids);
console.log("\n  git add " + STEPS.map((s) => s.ids).join(" "));
console.log("  git commit -m \"הקמת הלוחות החדשים\"");
console.log("  git push -u origin HEAD");
console.log("  git push origin HEAD:lessons");
console.log("  git push origin HEAD:main\n");
