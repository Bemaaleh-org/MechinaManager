/* ============================================================
   check:profile — הפרופיל חייב לשקף את הקוד, תו בתו
   ------------------------------------------------------------
   shared/mechina-profile.js מצהיר על כל מה שאמור, בסופו של
   דבר, להגיע מהגדרות המכינה. כל עוד הוא אינו נקרא על ידי אף
   מודול, אין שום דבר שמונע ממנו להתיישן בשקט — ואז ההצהרה
   "ניר עוז לא תשתנה" הופכת לתקווה במקום לעובדה.

   הבדיקה הזו משווה כל ערך בפרופיל מול הקבוע שהוא אמור
   להחליף, ונכשלת על כל סטייה.

   ⚠ **אינה דורשת .env ואינה נוגעת ב-monday.** זו השוואת
     קבועים בזיכרון, ולכן היא רצה בכל סביבה ובשבריר שנייה —
     בניגוד לשלושים חבילות הבדיקה שכותבות ללוחות אמיתיים.

   ⚠ והיא נכשלת **בשני הכיוונים**: תפקיד שיתווסף לקוד ולא
     לפרופיל, ותפקיד שיתווסף לפרופיל ואינו בקוד. בדיקה
     חד־כיוונית הייתה מאשרת פרופיל חלקי (עיקרון 4ט).

       node tools/check-profile.mjs
   ============================================================ */

import { PROFILE, STRUCTURE } from "../shared/mechina-profile.js";
import { STAFF_ROLE, KIND } from "../shared/auth-board.js";
import {
  ROLE_SCHEDULE, ROLE_KITCHEN, ROLE_CONTAINER, ROLE_SAFETY, ROLE_HOUSE,
} from "../shared/lessons-boards.js";
import {
  CATEGORY, CATEGORIES, CATEGORY_PLURAL, PERIOD,
} from "../shared/placements.js";
import { DUTY_LEADER, DUTY_CHAIR } from "../shared/duties.js";
import { SAME_SECTOR_WARN } from "../shared/chores.js";

let pass = 0;
const fails = [];

/** השוואת ערך יחיד */
function eq(what, got, want) {
  if (got === want) { pass++; return; }
  fails.push(`${what}\n    בפרופיל: ${JSON.stringify(got)}\n    בקוד:    ${JSON.stringify(want)}`);
}

/** השוואת רשימות — כולל הסדר, שהוא משמעותי */
function sameList(what, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) { pass++; return; }
  fails.push(`${what}\n    בפרופיל: ${a}\n    בקוד:    ${b}`);
}

/* ---------- אוצר מילים ---------- */
const W = PROFILE.words;

eq("staff.head", W.staff.head, STAFF_ROLE.head);
eq("staff.guide", W.staff.guide, STAFF_ROLE.guide);

eq("kind.shared", W.kind.shared, KIND.shared);
eq("kind.manager", W.kind.manager, KIND.manager);
eq("kind.trainee", W.kind.trainee, KIND.trainee);

eq("roles.schedule", W.roles.schedule, ROLE_SCHEDULE);
eq("roles.kitchen", W.roles.kitchen, ROLE_KITCHEN);
eq("roles.container", W.roles.container, ROLE_CONTAINER);
eq("roles.safety", W.roles.safety, ROLE_SAFETY);
eq("roles.house", W.roles.house, ROLE_HOUSE);

eq("duties.weekLead", W.duties.weekLead, DUTY_LEADER);
eq("duties.chair", W.duties.chair, DUTY_CHAIR);

/* ⚠ הקטגוריות — גם התוויות, גם הרבים, וגם **הסדר**.
   סדר שונה אינו ניואנס: categoryRank בנוי עליו, וקטגוריה
   שיוצאת מהסדר משנה מיון בארבעה מסכים. */
sameList("categories — הסדר והתוויות",
  W.categories.map((c) => c.one), CATEGORIES);

sameList("categories — שמות הרבים",
  W.categories.map((c) => c.many),
  CATEGORIES.map((c) => CATEGORY_PLURAL[c]));

/* ⚠ ומפתחות ה-slug חייבים לכסות בדיוק את CATEGORY שבקוד —
   בלי חוסר ובלי תוספת. */
sameList("categories — מפתחות ה-slug",
  W.categories.map((c) => c.key).sort(),
  Object.keys(CATEGORY).sort());

for (const c of W.categories) {
  eq(`categories.${c.key} — התווית תואמת ל-CATEGORY.${c.key}`,
    c.one, CATEGORY[c.key]);
}

eq("periods.perSemester", W.periods.perSemester, PERIOD.perSemester);
eq("periods.yearly", W.periods.yearly, PERIOD.yearly);
eq("periods.firstOnly", W.periods.firstOnly, PERIOD.firstOnly);
eq("periods.secondOnly", W.periods.secondOnly, PERIOD.secondOnly);

/* ---------- מבנה ---------- */
eq("STRUCTURE.sameSectorWarn", STRUCTURE.sameSectorWarn, SAME_SECTOR_WARN);

/* ⚠ ערכים שאין להם קבוע מיוצא — נבדקים מול מה שמתועד
   ב-CLAUDE.md, כדי שהצהרה שגויה לא תעבור בשקט. */
eq("STRUCTURE.timezone", STRUCTURE.timezone, "Asia/Jerusalem");
eq("STRUCTURE.weekStartsOn", STRUCTURE.weekStartsOn, 0);
eq("STRUCTURE.semesters", STRUCTURE.semesters, 2);
eq("STRUCTURE.personalTalks", STRUCTURE.personalTalks, 3);
eq("STRUCTURE.minMarkedDaysForPct", STRUCTURE.minMarkedDaysForPct, 5);
eq("STRUCTURE.minTrainingsForPct", STRUCTURE.minTrainingsForPct, 4);
sameList("STRUCTURE.requestChain", STRUCTURE.requestChain, ["guide", "head"]);

/* ---------- שפיות הפרופיל עצמו ---------- */
if (!PROFILE.key || /[^a-z0-9-]/.test(PROFILE.key)) {
  fails.push("PROFILE.key חייב להיות לועזי, אותיות קטנות ומקפים בלבד");
} else pass++;

const mods = Object.values(PROFILE.modules);
if (mods.some((v) => typeof v !== "boolean")) {
  fails.push("PROFILE.modules — כל ערך חייב להיות בוליאני");
} else pass++;

/* ⚠ ניר עוז היא המכינה שהכול דלוק בה. ברגע שמודול ייכבה כאן,
   הפרופיל מפסיק לתאר את הייצור — וזו בדיוק הסטייה השקטה
   שהבדיקה קיימת בשבילה. */
const off = Object.entries(PROFILE.modules).filter(([, v]) => !v).map(([k]) => k);
if (off.length) {
  fails.push(`מודולים כבויים בפרופיל של ניר עוז: ${off.join(", ")}\n` +
    "    בייצור כולם דלוקים. אם זה מכוון — לעדכן גם את הבדיקה.");
} else pass++;

/* ---------- סיכום ---------- */
if (fails.length) {
  console.error("\n✗ הפרופיל אינו תואם לקוד:\n");
  for (const f of fails) console.error("  • " + f + "\n");
  console.error(`${pass} עברו, ${fails.length} נכשלו\n`);
  console.error("  הפרופיל הוא הצהרה על מה שמקובע בקוד. סטייה כאן\n" +
                "  פירושה שההבטחה «ניר עוז לא תשתנה» כבר אינה נכונה.\n");
  process.exit(1);
}

console.log(`✓ הפרופיל תואם לקוד — ${pass} עברו, 0 נכשלו`);
process.exit(0);
