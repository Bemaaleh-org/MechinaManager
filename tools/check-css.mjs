/* ============================================================
   בקטיק בתוך בלוק CSS — הבדיקה שנולדה אחרי הפעם הרביעית
   ------------------------------------------------------------
     npm run check:css

   כל בלוק עיצוב במאגר הוא **מחרוזת תבנית אחת**: `src/styles.js`
   כולו, ו-`export const X_CSS = ...` בכל מסך. בקטיק בתוך הערת
   CSS **סוגר את המחרוזת**, והשארית הופכת לקוד.

   ⚠⚠ **וזה לא תמיד נופל ברעש.** פעם אחת `vite build` דיווח
     הצלחה בעוד הדפדפן נכשל, ופעם אחת ההערה הייתה על שם מחלקה
     והשגיאה הצביעה על שורה אחרת לגמרי.

   ⚠ **הבדיקה הידנית שנוסתה כאן הייתה שקרית**: היא חיפשה את
     הבקטיק **הראשון** אחרי פתיחת הבלוק והכריזה "אין בקטיקים
     עד אליו" — טענה ריקה שנכונה תמיד. הבדיקה חייבת למצוא את
     הסוגר האמיתי, ולכן היא מפרסרת ולא סופרת.

   מה שנבדק:
     · `src/styles.js` — בדיוק שני בקטיקים בקובץ כולו
     · כל `export const *_CSS = ` — אפס בקטיקים בתוך הבלוק
   ============================================================ */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

let bad = 0;

/* ---------- styles.js ---------- */
const styles = readFileSync("src/styles.js", "utf8");
const ticks = (styles.match(/`/g) || []).length;
if (ticks === 2) {
  console.log("  ✓ src/styles.js — שני בקטיקים, כמו שצריך");
} else {
  bad++;
  console.log(`  ✗ src/styles.js — ${ticks} בקטיקים במקום 2`);
  console.log("    הקובץ כולו מחרוזת תבנית. בקטיק בהערת CSS סוגר אותה.");
}

/* ---------- בלוקי X_CSS בכל מסך ---------- */
/* ⚠ מוצא את **סוף** הבלוק ולא את הבקטיק הבא: הבלוק נגמר
   בבקטיק שאחריו נקודה-פסיק, וכל בקטיק לפניו הוא התקלה. */
const RE = /export const (\w*_CSS)\s*=\s*`/g;

for (const f of readdirSync("src").filter((x) => x.endsWith(".jsx") || x.endsWith(".js")).sort()) {
  if (f === "styles.js") continue;
  const src = readFileSync(join("src", f), "utf8");
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(src))) {
    const from = RE.lastIndex;
    const close = src.indexOf("`;", from);
    if (close < 0) {
      bad++;
      console.log(`  ✗ src/${f} — ${m[1]} אינו נסגר בבקטיק`);
      continue;
    }
    const inside = src.slice(from, close);
    const n = (inside.match(/`/g) || []).length;
    if (n) {
      bad++;
      const line = src.slice(0, from).split("\n").length;
      console.log(`  ✗ src/${f}:${line} — ${m[1]} מכיל ${n} בקטיקים`);
      /* ⚠ מדפיס את השורה עצמה: "יש בקטיק איפשהו בבלוק של 200
         שורות" אינו ממצא שאפשר לפעול לפיו. */
      for (const [i, l] of inside.split("\n").entries()) {
        if (l.includes("`")) console.log(`      ${line + i}: ${l.trim().slice(0, 80)}`);
      }
    } else {
      console.log(`  ✓ src/${f} — ${m[1]}`);
    }
    RE.lastIndex = close;
  }
}

console.log("");
if (bad) {
  console.error(`✗ ${bad} בלוקים עם בקטיק. להסיר אותם מההערות.\n`);
  process.exit(1);
}
console.log("✓ אין בקטיק באף בלוק עיצוב.\n");
