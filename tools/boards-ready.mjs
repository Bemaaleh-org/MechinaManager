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

/* ---- הרצה ישירה ---- */
if (import.meta.url === "file://" + process.argv[1] ||
    process.argv[1]?.endsWith("boards-ready.mjs")) {
  const bad = await notReady();
  if (!bad.length) {
    console.log("✓ כל הלוחות החדשים מוגדרים.");
    process.exit(0);
  }
  console.log("טרם הוקמו " + bad.length + " מתוך " + STEPS.length + ":");
  for (const b of bad) console.log("    " + b.title + " — " + b.why);
  process.exit(1);
}
