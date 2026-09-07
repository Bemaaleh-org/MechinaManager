/* ============================================================
   האם הלוחות החדשים הוקמו
   ------------------------------------------------------------
     node tools/boards-ready.mjs      יוצא 0 אם הכול מוכן, 1 אם לא

   ⚠ **זהו מקור האמת היחיד לרשימת הלוחות החדשים.**
     `setup-boards.mjs` מייבא מכאן, וכך גם `go.ps1`. שתי
     רשימות מקבילות מתפצלות בתוספת הראשונה — ואז ההקמה מריצה
     סקריפט שהבדיקה אינה מכירה, או להפך.

   ⚠ **אינו נוגע ב-monday.** הוא בודק את קבצי המזהים שבמאגר
     בלבד, ולכן רץ מיד וגם בלי רשת. השאלה שהוא עונה עליה היא
     "האם הקוד יודע איפה הלוחות", ולא "האם הלוחות קיימים".
   ============================================================ */

export const STEPS = [
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

/** מחזיר את השלבים שאינם מוכנים. ייבוא טרי בכל קריאה. */
export async function notReady() {
  const bad = [];
  for (const s of STEPS) {
    try {
      const m = await import("../" + s.ids + "?v=" + Date.now());
      const fn = m[s.ready];
      if (typeof fn !== "function") { bad.push({ ...s, why: "אין " + s.ready + "()" }); continue; }
      if (!fn()) bad.push({ ...s, why: "טרם הוקם" });
    } catch (e) {
      bad.push({ ...s, why: String(e?.message || e) });
    }
  }
  return bad;
}

/**
 * ⚠⚠ **כל קבצי המזהים נטענים, לא רק החמישה.**
 *   `api/students.js` מייבא את כולם, ולכן קובץ **אחד** שאינו
 *   נטען מפיל את הפונקציה כולה — וכל מסך במערכת מחזיר 500,
 *   כולל מסכים שאין להם שום קשר לאותו לוח. זה קרה כאן: הצהרת
 *   export כפולה ב-laundry-ids.js הפילה את מסך המשמר.
 */
export async function brokenIdFiles() {
  const { readdirSync } = await import("node:fs");
  const bad = [];
  for (const f of readdirSync("shared").filter((x) => x.endsWith("-ids.js")).sort()) {
    try { await import("../shared/" + f + "?v=" + Date.now()); }
    catch (e) { bad.push({ file: "shared/" + f, why: String(e?.message || e).split("\n")[0] }); }
  }
  return bad;
}

/* ---- הרצה ישירה ---- */
if (import.meta.url === "file://" + process.argv[1] ||
    process.argv[1]?.endsWith("boards-ready.mjs")) {
  /* ⚠ קובץ שבור נבדק **ראשון**: הוא מפיל את כל המערכת, ולעומתו
     לוח שטרם הוקם הוא מצב תקין שהמסך יודע לתאר (עיקרון 6). */
  const broken = await brokenIdFiles();
  if (broken.length) {
    console.error("✗✗ " + broken.length + " קבצי מזהים אינם נטענים.");
    console.error("   כל עוד זה כך, **כל** מסך במערכת מחזיר 500:");
    for (const b of broken) console.error("      " + b.file + " — " + b.why);
    console.error("\n   התיקון: למחוק את הקובץ ולהריץ את ה-seed שלו שוב.");
    console.error("   npm run setup:boards יעשה את זה עבור החמישה החדשים.\n");
    process.exit(2);
  }

  const bad = await notReady();
  if (!bad.length) {
    console.log("✓ כל הלוחות החדשים מוגדרים.");
    process.exit(0);
  }
  console.log("טרם הוקמו " + bad.length + " מתוך " + STEPS.length + ":");
  for (const b of bad) console.log("    " + b.title + " — " + b.why);
  process.exit(1);
}
