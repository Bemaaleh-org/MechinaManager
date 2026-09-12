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
  { script: "tools/seed-vacation-cost.mjs", title: "עמודת ימי החופש בהיעדרויות",
    ids: "shared/mechina-boards.js", ready: "vacationCostReady" },
  { script: "tools/seed-recruit.mjs", title: "לוח פניות הגיוס",
    ids: "shared/recruit-ids.js", ready: "recruitReady" },
  { script: "tools/seed-dining.mjs", title: "ספירת הסועדים בחד״א",
    ids: "shared/budget-boards.js", ready: "diningHeadsReady" },
  { script: "tools/seed-weekmenu.mjs", title: "לוח התפריט השבועי",
    ids: "shared/weekmenu-ids.js", ready: "weekMenuReady" },
  { script: "tools/seed-bugs.mjs", title: "לוח הבאגים וההערות",
    ids: "shared/bugs-ids.js", ready: "bugsReady" },
  { script: "tools/seed-appeal.mjs", title: "עמודות הערר בבקשות היציאה",
    ids: "shared/mechina-boards.js", ready: "appealReady" },
  /* ⚠ שלב שלישי על shared/mechina-boards.js — הזיהוי הוא הצמד
     ids+ready ולא הקובץ, וזה בדיוק המוקש של 5לב. */
  { script: "tools/seed-halfday.mjs", title: "עמודת \"חצי יום\" בימי הסימון",
    ids: "shared/mechina-boards.js", ready: "halfDayReady" },
  { script: "tools/seed-stulesson.mjs", title: "לוח שיעורי החניך",
    ids: "shared/stulesson-ids.js", ready: "stuLessonReady" },
  /* ⚠ סקריפט אחד לשלושת לוחות ועדת קבוצה ותוכן, ולכן שתי
     שורות שמצביעות עליו — כל אחת בודקת קובץ מזהים אחר. */
  { script: "tools/seed-plenary.mjs", title: "לוחות המליאות",
    ids: "shared/plenary-ids.js", ready: "plenaryReady" },
  { script: "tools/seed-plenary.mjs", title: "מאגר המרצים",
    ids: "shared/lecturers-ids.js", ready: "lecturersReady" },
  /* ⚠ שלב שני על shared/lecturers-ids.js, והוא חייב לרוץ
     **אחרי** seed-plenary — הוא נוגע בלוח שאותו סקריפט מקים.
     הזיהוי הוא הצמד ids+ready ולא הקובץ (5לב). */
  { script: "tools/seed-lecturers.mjs", title: "קטגוריה וסטטוסים במאגר המרצים",
    ids: "shared/lecturers-ids.js", ready: "lectCategoryReady" },
  /* ⚠ שלב שני על shared/lessons-boards.js (הראשון הוא עמודות
     התוכן במפגשים) — הזיהוי הוא הצמד ids+ready (5לב). */
  { script: "tools/seed-lesson-changes.mjs", title: "יומן השינויים בגיליונות",
    ids: "shared/lessons-boards.js", ready: "changeLogReady" },
  { script: "tools/seed-buy.mjs", title: "רשימת הקניות הכללית",
    ids: "shared/buy-ids.js", ready: "buyReady" },
  /* ⚠ שלב רביעי על shared/mechina-boards.js — הזיהוי הוא הצמד
     ids+ready ולא הקובץ (5לב). */
  { script: "tools/seed-recdays.mjs", title: "ימים לפי המדריך בבקשות היציאה",
    ids: "shared/mechina-boards.js", ready: "guideDaysReady" },
];

/**
 * מחזיר את השלבים שאינם מוכנים.
 *
 * ⚠⚠ **בתהליך נפרד, ולא ב-`import(...?v=)`.** מחרוזת השאילתה
 *   מבטלת את המטמון של המודול שנטען — **ולא של מה שהוא מייבא**.
 *   `budget-boards.js` מייצא את `diningHeadsReady` וקורא את
 *   המספר מ-`budget-ids.js`, ו-seed:dining כותב את השני; תהליך
 *   שכבר טען פעם את budget-ids.js המשיך לראות אותו ריק לנצח,
 *   וההקמה נעצרה על שלב שהצליח באמת. ראו tools/ready-probe.mjs.
 *
 * ⚠ **נפילה של התהליך אינה "הכול מוכן".** ברירת המחדל אז היא
 *   הבדיקה בתוך התהליך — פחות מדויקת, אבל לעולם לא שקטה.
 */
export async function notReady() {
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const probe = fileURLToPath(new URL("./ready-probe.mjs", import.meta.url));
  const r = spawnSync(process.execPath, [probe], { encoding: "utf8", cwd: process.cwd() });
  if (r.status === 0 && r.stdout) {
    try { return JSON.parse(r.stdout); } catch { /* נופלים לגיבוי */ }
  }
  return inProcessNotReady();
}

/** גיבוי בלבד — ראו האזהרה מעל. */
async function inProcessNotReady() {
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

/**
 * ⚠⚠⚠ **הבדיקה שתופסת את מה שהשאר מפספסות.**
 *   `shared/laundry-ids.js` נטען מצוין בפני עצמו — חסר בו רק
 *   ה-export של `laundryReady`. מי שנפל הוא **הצרכן**:
 *   `api/_laundry.js` מייבא את השם הזה, ולכן `api/students.js`
 *   שמייבא אותו לא נטען, **וכל פעולה במערכת החזירה 500** —
 *   כולל מסך המשמר, שאין לו שום קשר לחדר הכביסה.
 *
 *   טעינת נתב אמיתית היא הדבר היחיד שמוכיח שהשרשרת שלמה.
 *   ⚠ אינה נוגעת ברשת: ייבוא מודול אינו מריץ שום הנדלר.
 */
export async function brokenRouters() {
  const { readdirSync } = await import("node:fs");
  const bad = [];
  const routers = readdirSync("api")
    .filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort();
  for (const f of routers) {
    try { await import("../api/" + f + "?v=" + Date.now()); }
    catch (e) { bad.push({ file: "api/" + f, why: String(e?.message || e).split("\n")[0] }); }
  }
  return bad;
}

/* ---- הרצה ישירה ---- */
if (import.meta.url === "file://" + process.argv[1] ||
    process.argv[1]?.endsWith("boards-ready.mjs")) {
  /* ⚠ קובץ שבור נבדק **ראשון**: הוא מפיל את כל המערכת, ולעומתו
     לוח שטרם הוקם הוא מצב תקין שהמסך יודע לתאר (עיקרון 6). */
  const broken = [...await brokenIdFiles(), ...await brokenRouters()];
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
