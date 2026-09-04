/* ============================================================
   מפת ההרשאות — ⚠ נגזרת מהכללים, ולא טבלה ידנית
   ------------------------------------------------------------
   ⚠⚠ **הבדיקה הזו היא כל התכלית של המסך.**

   טבלת הרשאות שנכתבת ביד מתיישנת ביום שמישהו משנה דגל אחד,
   ואז היא **משקרת על אבטחה** — מסך שאומר "מדריך אינו עורך
   תקציב" בזמן שהוא כן, גרוע ממסך שלא קיים.

   לכן הבדיקה משווה כל שורה במפה מול **הפונקציה שהשרת באמת
   אוכף** (`mayEdit`), ולא מול רשימה שנייה. שינוי בכלל שלא
   יגיע למפה ייפול כאן.

   ⚠ חישוב טהור בלבד — אינה נוגעת בשום לוח ואינה דורשת שרת.
   ============================================================ */
import { roleAccess, STAFF_KINDS, RULES, ROLE_FLAG } from "../../shared/access-map.js";
import { mayEdit, EDIT_AREA } from "../../shared/edit-rights.js";
import { DUTIES } from "../../shared/duties.js";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };

const roles = roleAccess();

console.log("=== המפה נגזרת ואינה כתובה ===");
/* ⚠ כל תפקיד ב-DUTIES מופיע — כולל מוביל שבוע ויו״ר, שאינם
   בעמודת התפקידים. תפקיד שיתווסף שם יופיע כאן מעצמו. */
ok("כל תפקיד ב-DUTIES מופיע במפה",
  roles.length === Object.keys(DUTIES).length,
  `${roles.length} מתוך ${Object.keys(DUTIES).length}`);

for (const r of roles) {
  const d = DUTIES[r.name];
  ok(`  ${r.name}: המסכים זהים ל-DUTIES`,
    r.screens.join("|") === (d.tabs || []).map((t) => t.label).join("|"),
    r.screens.join(", ") || "—");
}

console.log("\n=== העריכה מול הכלל שהשרת אוכף ===");
/* ============================================================
   ⚠⚠ **הטענה המרכזית.** לכל תפקיד נבנה סשן מדומה שמדליק את
   הדגל שלו בלבד, ו-`mayEdit` נשאלת על **כל** התחומים. המפה
   חייבת להסכים איתה — בשני הכיוונים.
   ============================================================ */
for (const r of roles) {
  if (!r.flag) continue;
  const session = { isStudent: true, [r.flag]: true };
  for (const area of Object.keys(EDIT_AREA)) {
    const real = mayEdit(session, area);
    const inMap = r.edits.some((e) => e.key === area);
    ok(`  ${r.name} · ${area}: המפה מסכימה עם mayEdit`,
      real === inMap, `mayEdit=${real} map=${inMap}`);
  }
}

console.log("\n=== מוביל שבוע ויו״ר אינם עורכים תחום ===");
for (const name of ["מוביל שבוע", "יו״ר"]) {
  const r = roles.find((x) => x.name === name);
  if (!r) { console.log(`  (${name} אינו ב-DUTIES — מדולג)`); continue; }
  ok(`${name} בלי תחום עריכה`, r.edits.length === 0, r.edits.map((e) => e.key).join(","));
  ok(`  ומקורו מוצהר`, Boolean(r.derived) && !/עמודת התפקידים/.test(r.derived), r.derived);
}

console.log("\n=== ראש המכינה עורך הכול, וצפייה בלבד כלום ===");
for (const area of Object.keys(EDIT_AREA)) {
  ok(`ראש מכינה עורך ${area}`, mayEdit({ isHead: true }, area) === true);
  /* ⚠ viewOnly גובר גם על ראש מכינה וגם על בעל התחום. */
  ok(`  וצפייה בלבד אינה עורכת ${area}`,
    mayEdit({ isHead: true, viewOnly: true }, area) === false);
}
ok("ומדריך אינו עורך אף תחום",
  Object.keys(EDIT_AREA).every((a) => mayEdit({ isGuide: true, isManager: true }, a) === false));

console.log("\n=== שלמות ===");
ok("לכל תפקיד עם דגל יש תחום עריכה",
  roles.filter((r) => r.flag).every((r) => r.edits.length > 0),
  roles.filter((r) => r.flag && !r.edits.length).map((r) => r.name).join(",") || "הכול תקין");
/* ⚠ EDIT_AREA ו-ROLE_FLAG הן שתי רשימות שיכולות להתפצל: תחום
   שנוסף לאחת ולא לשנייה נותן תפקיד שהמפה תשתוק עליו. */
const flags = new Set(Object.values(ROLE_FLAG));
ok("וכל דגל ב-EDIT_AREA מוכר ב-ROLE_FLAG",
  Object.values(EDIT_AREA).every((a) => flags.has(a.flag)),
  Object.entries(EDIT_AREA).filter(([, a]) => !flags.has(a.flag)).map(([k]) => k).join(",") || "הכול תקין");

ok("יש תיאור לכל סוג כניסת צוות",
  STAFF_KINDS.every((k) => k.can.length && k.cannot.length),
  String(STAFF_KINDS.length));
ok("ולכל כלל יש הפניה למקור",
  RULES.every((r) => r.title && r.body && r.ref), String(RULES.length));

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
