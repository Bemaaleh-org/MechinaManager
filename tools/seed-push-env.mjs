/* ============================================================
   כותב מפתחות VAPID ישירות ל-.env
   ------------------------------------------------------------
   ⚠⚠ **המפתח הפרטי אינו מודפס למסך ואינו עובר בשום צ׳אט.**
     הוא נכתב לקובץ `.env` בלבד, שחסום ב-.gitignore. מי שצריך
     להעתיק אותו למשתני הסביבה ב-Vercel פותח את הקובץ אצלו.

   ⚠ **אינו דורס מפתחות קיימים.** החלפת המפתחות מבטלת את כל
     ההרשמות שנעשו מולם, וכל המשתמשים יצטרכו לאשר מחדש.
     להחלפה מכוונת: `--force`.

   הרצה: node tools/seed-push-env.mjs
   ============================================================ */
import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FORCE = process.argv.includes("--force");
const path = ".env";
const cur = existsSync(path) ? readFileSync(path, "utf8") : "";

if (/^VAPID_PRIVATE=.+/m.test(cur) && !FORCE) {
  console.log("כבר קיימים מפתחות VAPID ב-.env. להחלפה מכוונת: --force");
  console.log("⚠ החלפה מבטלת את כל ההרשמות הקיימות.");
  process.exit(0);
}

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const der = publicKey.export({ type: "spki", format: "der" });
const pub = der.subarray(der.length - 65).toString("base64url");
const priv = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64url");

const cleaned = cur
  .replace(/^VAPID_PUBLIC=.*$/m, "")
  .replace(/^VAPID_PRIVATE=.*$/m, "")
  .replace(/^VAPID_SUBJECT=.*$/m, "")
  .replace(/\n{3,}/g, "\n\n")
  .trimEnd();

const block = [
  "",
  "",
  "# ---- התראות דחיפה (VAPID) ----",
  "# ⚠ הפרטי הוא סוד. ⚠ החלפה מבטלת את כל ההרשמות הקיימות.",
  "VAPID_PUBLIC=" + pub,
  "VAPID_PRIVATE=" + priv,
  "VAPID_SUBJECT=mailto:achim@bemaaleh.com",
  "",
].join("\n");

writeFileSync(path, cleaned + block, "utf8");

console.log("נכתבו מפתחות VAPID ל-.env.");
console.log("⚠ המפתח הפרטי לא הודפס כאן במכוון — פותחים את .env כדי להעתיק");
console.log("  את שלושת המשתנים למשתני הסביבה ב-Vercel.");
console.log("\nאורך המפתח הציבורי: " + pub.length + " תווים (זה מה שנשלח לדפדפן).");
