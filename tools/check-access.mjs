/* ============================================================
   npm run check:access — החוזה בין המסכים לפעולות
   ------------------------------------------------------------
   ⚠⚠ **בלי הבדיקה הזו `SCREEN_API` היא רשימה שנייה.** דף
     ההרשאות אוכף לפי מסך, והאכיפה בפועל היא לפי `?action=`.
     פעולה שתתווסף מחר לנתב ולא תמופה כאן נשארת **פתוחה
     בשקט** — כלומר ראש המכינה חוסם מסך, והמסלול אליו ממשיך
     לעבוד. זו בדיוק התקלה שאין לה שגיאה (4ט, 4מד).

   שלוש טענות:
     1. כל פעולה בנתבים ממופה למסך או מוצהרת ב-OPEN_ACTIONS.
     2. אין פעולה שמופיעה בשתיהן — הצהרה שסותרת את עצמה.
     3. כל מסך ב-SCREEN_API קיים ב-STAFF_SCREENS או ב-
        STUDENT_SCREENS. מסך שאינו קיים אינו ניתן לבחירה בדף
        ההרשאות, והמיפוי שלו אינו מגיע לאיש.

   ⚠ **כלל אחד ולא חבילת lint** — אותו נימוק של `check:undef`.
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";
import { SCREEN_API, OPEN_ACTIONS, STAFF_SCREENS, STUDENT_SCREENS } from "../shared/screens.js";

let bad = 0;
const fail = (msg) => { bad++; console.error("  ✗ " + msg); };

/* ---------- 1 · הפעולות שקיימות בנתבים ---------- */
const routed = new Map();          // action → קובץ הנתב
for (const f of readdirSync("api")) {
  if (!f.endsWith(".js") || f.startsWith("_")) continue;
  const src = readFileSync("api/" + f, "utf8");
  const m = src.match(/router\(\{([\s\S]*?)\}\)/);
  if (!m) continue;
  for (const part of m[1].split(",")) {
    const t = part.trim();
    if (!t) continue;
    /* `name` או `"name": handler` — המפתח הוא מה שלפני הנקודתיים */
    const key = (t.includes(":") ? t.split(":")[0] : t)
      .split("\n").pop().trim().replace(/^"|"$/g, "");
    if (/^[A-Za-z0-9_-]+$/.test(key)) routed.set(key, f);
  }
}
console.log(`\nנתבים: ${routed.size} פעולות ב-${new Set(routed.values()).size} קבצים`);

const mapped = new Set();
for (const list of Object.values(SCREEN_API)) for (const a of list) mapped.add(a);

const missing = [...routed.keys()].filter((a) => !mapped.has(a) && !OPEN_ACTIONS[a]);
if (missing.length) {
  fail("פעולות שאינן ממופות לשום מסך ואינן מוצהרות כפתוחות:");
  for (const a of missing) console.error(`      ${a}   (api/${routed.get(a)})`);
  console.error("    להוסיף ל-SCREEN_API של המסך שלה, או ל-OPEN_ACTIONS עם הסיבה.");
} else {
  console.log("  ✓ כל פעולה ממופה למסך או מוצהרת כפתוחה");
}

/* ---------- 2 · אין הצהרה כפולה ---------- */
const both = [...mapped].filter((a) => OPEN_ACTIONS[a]);
if (both.length) {
  fail(`פעולות שמוצהרות גם כפתוחות וגם ממופות: ${both.join(" · ")}`);
  console.error("    הצהרה שסותרת את עצמה — פעולה פתוחה אינה נחסמת לעולם.");
} else {
  console.log("  ✓ אין פעולה שמוצהרת גם כפתוחה וגם ממופה");
}

/* ---------- 3 · פעולה שממופה ואינה קיימת בנתב ---------- */
const ghost = [...mapped].filter((a) => !routed.has(a));
if (ghost.length) {
  fail(`פעולות שממופות ואינן קיימות בשום נתב: ${ghost.join(" · ")}`);
  console.error("    מיפוי לפעולה שנמחקה אינו חוסם דבר, ונראה כאילו כן.");
} else {
  console.log("  ✓ כל פעולה שממופה קיימת בנתב");
}

/* ---------- 4 · המסכים קיימים ---------- */
/* ⚠ גם הלשוניות שנגזרות מ-`DUTIES` הן מסכים אמיתיים — הן פשוט
   אינן נכתבות ברשימה הסטטית אלא נגזרות מהתפקיד (4מד, 4ק). */
const { DUTIES } = await import("../shared/duties.js");
const known = new Set([...STAFF_SCREENS, ...STUDENT_SCREENS].map((s) => s.tab));
for (const d of Object.values(DUTIES)) for (const t of d.tabs || []) known.add(t.tab);
const unknown = Object.keys(SCREEN_API).filter((t) => !known.has(t));
if (unknown.length) {
  fail(`מסכים ב-SCREEN_API שאינם ברשימת המסכים: ${unknown.join(" · ")}`);
  console.error("    מסך שאינו ברשימה אינו ניתן לבחירה בדף ההרשאות.");
} else {
  console.log(`  ✓ כל ${Object.keys(SCREEN_API).length} המסכים הממופים קיימים`);
}

/* ---------- 5 · מסך בלי מיפוי — הערה, לא כישלון ----------
   ⚠ מסך שאין לו פעולה משלו הוא מצב אמיתי: "הרשאות" עצמו,
     ומסכים שכל תוכנם מגיע מפעולה של מסך אחר. מה שלא בסדר
     הוא לשתוק על זה — ראש המכינה שיחסום מסך כזה יראה אותו
     נעלם מהניווט, והמסלול יישאר פתוח. */
const noApi = [...known].filter((t) => !SCREEN_API[t]);
if (noApi.length) {
  console.log(`\n  ⚠ ${noApi.length} מסכים בלי פעולה משלהם — חסימתם מסתירה`);
  console.log("    את המסך ואינה חוסמת מסלול. אלה:");
  console.log("      " + noApi.join(" · "));
}

console.log(bad ? `\n✗ ${bad} בעיות\n` : "\n✓ החוזה בין המסכים לפעולות תקין.\n");
process.exit(bad ? 1 : 0);
