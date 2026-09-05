/* ============================================================
   CRON_SECRET — הסוד שמגן על המשימה המתוזמנת
   ------------------------------------------------------------
   ⚠ `api/cron.js` הוא הנתיב שוורסל קוראת לו פעם ביום. אין שם
     משתמש ואין עוגייה, ולכן ההגנה היא סוד משותף: וורסל שולחת
     אותו בכותרת, והשרת משווה. בלעדיו כל אחד באינטרנט יכול
     לגרום למערכת לשלוח לכולם התראות דחיפה.

   ⚠ **הסוד אינו מודפס למסך.** הוא נכתב ישר ל-`.env`, בדיוק
     כמו המפתח הפרטי של VAPID (עיקרון 2).

   הרצה: node tools/seed-cron-secret.mjs
   ============================================================ */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const path = ".env";
const FORCE = process.argv.includes("--force");
const cur = existsSync(path) ? readFileSync(path, "utf8") : "";

if (/^CRON_SECRET=.+/m.test(cur) && !FORCE) {
  console.log("כבר קיים CRON_SECRET ב-.env. להחלפה מכוונת: --force");
  console.log("⚠ החלפה מחייבת לעדכן גם את משתני הסביבה ב-Vercel,");
  console.log("  אחרת המשימה המתוזמנת תיחסם.");
  process.exit(0);
}

/* 32 בתים אקראיים ב-base64url — אין בו תווים שדורשים ציטוט. */
const secret = randomBytes(32).toString("base64url");

const cleaned = cur
  .replace(/^CRON_SECRET=.*$/m, "")
  .replace(/^# ---- המשימה המתוזמנת ----$/m, "")
  .replace(/\n{3,}/g, "\n\n")
  .trimEnd();

writeFileSync(path, cleaned + [
  "",
  "",
  "# ---- המשימה המתוזמנת ----",
  "# ⚠ סוד. בלעדיו סבב הדחיפה היומי אינו רץ בייצור.",
  "CRON_SECRET=" + secret,
  "",
].join("\n"), "utf8");

console.log("נכתב CRON_SECRET ל-.env.");
console.log("⚠ הסוד לא הודפס כאן במכוון — פותחים את .env כדי להעתיק אותו");
console.log("  למשתני הסביבה ב-Vercel.");
console.log("\nאורך: " + secret.length + " תווים.");
