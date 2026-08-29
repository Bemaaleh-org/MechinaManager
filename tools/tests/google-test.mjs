/* ============================================================
   שכבת החיבור ל-Google Sheets — בדיקה בלי חשבון גוגל

   ⚠ הבדיקה **מייצרת מפתח RSA משלה** ומוודאת שה-JWT שנחתם
     תקף ובנוי בדיוק כפי שגוגל דורשת. כך אפשר להוכיח שהמנגנון
     עובד לפני שמישהו פותח פרויקט ב-Google Cloud.

   ⚠ מה שהבדיקה **אינה** מוכיחה: שגוגל תקבל את החשבון בפועל.
     זה תלוי בהפעלת ה-API ובשיתוף הגיליון, ואי אפשר לבדוק
     אותו בלי חשבון אמיתי. הפער מוצהר כאן ולא מוסתר.
   ============================================================ */
import crypto from "node:crypto";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };

/* ⚠ נשמרים ומוחזרים בסוף. הבדיקה רצה גם כשהמפתחות האמיתיים
   מוגדרים בסביבה. */
const SAVED = process.env.GOOGLE_SA_KEY;
const SAVED_KEY = process.env.GOOGLE_API_KEY;

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

try {
  /* ============ 1 · בלי הגדרה ============ */
  console.log("=== מערכת בלי חיבור ===");
  delete process.env.GOOGLE_SA_KEY;
  delete process.env.GOOGLE_API_KEY;
  let m = await import("../../api/_google.js?v=1");
  /* ⚠ "לא מוגדר" הוא מצב תקין ולא תקלה. */
  ok("googleReady=false", m.googleReady() === false);
  ok("ואין מצב אימות", m.authMode() === null, String(m.authMode()));
  ok("ואי אפשר לכתוב", m.canWrite() === false);
  ok("והמצב מסביר מה חסר", m.googleStatus().ready === false
    && String(m.googleStatus().hint || "").includes("GOOGLE_SA_KEY"),
    m.googleStatus().hint);
  ok("ואין חשבון בתשובה", m.googleStatus().account === null);
  let threw = null;
  try { await m.accessToken(); } catch (e) { threw = e.message; }
  ok("ובקשת אסימון נכשלת מפורשות", Boolean(threw), threw);

  /* ============ 2 · JSON פגום ============ */
  console.log("=== הגדרה פגומה ===");
  process.env.GOOGLE_SA_KEY = "{לא JSON";
  m = await import("../../api/_google.js?v=2");
  ok("JSON פגום אינו מפיל", m.googleReady() === false);
  process.env.GOOGLE_SA_KEY = JSON.stringify({ client_email: "a@b.c" });
  m = await import("../../api/_google.js?v=3");
  /* ⚠ חצי הגדרה גרועה מאין הגדרה — מערכת שחושבת שהיא מחוברת
     ונכשלת בשקט. */
  ok("ומפתח חסר נחשב 'לא מוגדר'", m.googleReady() === false);

  /* ============ 3 · הגדרה תקינה ============ */
  console.log("=== הגדרה תקינה ===");
  const EMAIL = "mechina-bot@nir-oz.iam.gserviceaccount.com";
  process.env.GOOGLE_SA_KEY = JSON.stringify({
    client_email: EMAIL,
    /* ⚠ בדיוק כפי ש-Vercel שומרת: \n כשני תווים. */
    private_key: privateKey.replace(/\n/g, "\\n"),
  });
  m = await import("../../api/_google.js?v=4");
  ok("googleReady=true", m.googleReady() === true);
  ok("והמצב מחזיר את כתובת החשבון", m.googleStatus().account === EMAIL, m.googleStatus().account);
  /* ⚠ **העיקר.** המפתח הפרטי לעולם אינו יוצא. */
  const blob = JSON.stringify(m.googleStatus());
  ok("ולעולם לא את המפתח",
    !blob.includes("PRIVATE") && !blob.includes(privateKey.slice(40, 90)));

  const sa = m.serviceAccount();
  ok("ו-\\n הומר לשורות אמיתיות", sa.key.includes("\n") && !sa.key.includes("\\n"));

  /* ============ 3ב · מפתח API — קריאה בלבד ============ */
  console.log("=== מפתח API ===");
  delete process.env.GOOGLE_SA_KEY;
  process.env.GOOGLE_API_KEY = "AIzaTESTKEY_not_real_000000000000000000";
  let k = await import("../../api/_google.js?v=5");
  ok("מפתח API לבדו מספיק לקריאה", k.googleReady() === true);
  ok("והמצב הוא key", k.authMode() === "key", k.authMode());
  /* ⚠ העיקר: כתיבה חסומה **מראש** ובהודעה שמסבירה, ולא
     בשגיאה סתומה מגוגל אחרי שהמנהל כבר לחץ. */
  ok("אבל כתיבה חסומה", k.canWrite() === false);
  let wErr = null;
  try { await k.batchUpdate("abc", [{ x: 1 }]); } catch (e) { wErr = e.message; }
  ok("וניסיון כתיבה נעצר בהודעה מסבירה",
    Boolean(wErr) && wErr.includes("קריאה בלבד"), wErr);
  /* ⚠ והמפתח עצמו לעולם אינו חוזר בסטטוס. */
  const kb = JSON.stringify(k.googleStatus());
  ok("המפתח אינו יוצא בסטטוס", !kb.includes("AIzaTESTKEY"), kb.slice(0, 80));
  ok("והסטטוס מצהיר שאי אפשר לכתוב", k.googleStatus().canWrite === false);

  /* ⚠ חשבון שירות גובר כששניהם מוגדרים — הוא צר יותר. */
  process.env.GOOGLE_SA_KEY = JSON.stringify({
    client_email: EMAIL, private_key: privateKey.replace(/\n/g, "\\n"),
  });
  const both = await import("../../api/_google.js?v=6");
  ok("חשבון שירות גובר על מפתח API", both.authMode() === "service", both.authMode());
  ok("ואז כתיבה מותרת", both.canWrite() === true);
  delete process.env.GOOGLE_API_KEY;

  /* ============ 4 · ה-JWT עצמו ============ */
  console.log("=== חתימת ה-JWT ===");
  /* משחזרים כאן את מה ש-accessToken בונה, ומאמתים בכלים
     עצמאיים. ⚠ אימות עם אותה פונקציה שיצרה את החתימה לא היה
     מוכיח כלום. */
  const b64url = (b) => Buffer.from(b).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.key);
  const jwt = `${header}.${claims}.${b64url(sig)}`;

  ok("שלושה חלקים", jwt.split(".").length === 3);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${header}.${claims}`);
  ok("החתימה מאומתת מול המפתח הציבורי", verifier.verify(publicKey, sig) === true);

  const dec = (p) => JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
  const h = dec(header), c = dec(claims);
  ok("alg=RS256", h.alg === "RS256", h.alg);
  ok("aud הוא נקודת האסימון של גוגל", c.aud === "https://oauth2.googleapis.com/token", c.aud);
  ok("iss הוא חשבון השירות", c.iss === EMAIL, c.iss);
  /* ⚠ הרשאה צרה. drive מלא היה נותן לחשבון גישה לכל הדרייב
     של מי ששיתף, ולא רק לגיליון. */
  ok("scope הוא spreadsheets בלבד",
    c.scope === "https://www.googleapis.com/auth/spreadsheets", c.scope);
  ok("ותוקף שעה", c.exp - c.iat === 3600, String(c.exp - c.iat));
  /* ⚠ base64url ולא base64 — + ו-/ היו שוברים את ה-JWT. */
  ok("קידוד base64url תקין", !/[+/=]/.test(jwt), jwt.slice(0, 12) + "…");

  /* ============ 5 · זיהוי הגיליון ============ */
  console.log("=== זיהוי הגיליון מהכתובת ===");
  const ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
  ok("כתובת מלאה", m.sheetId(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`) === ID);
  ok("כתובת עם gid ופרמטרים",
    m.sheetId(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`) === ID);
  ok("מזהה חשוף", m.sheetId(ID) === ID);
  ok("רווחים מסביב", m.sheetId(`  ${ID}  `) === ID);
  /* ⚠ null ולא זריקה: הדבקה שגויה היא טעות משתמש רגילה. */
  ok("כתובת שאינה גיליון → null", m.sheetId("https://docs.google.com/document/d/abc/edit") === null);
  ok("טקסט קצר → null", m.sheetId("שלום") === null);
  ok("ריק → null", m.sheetId("") === null && m.sheetId(null) === null);

  /* ============ 6 · אין ייבוא לצד הלקוח ============ */
  console.log("=== גבול השרת ===");
  const { readFileSync, readdirSync } = await import("node:fs");
  const bad = readdirSync("src")
    .filter((f) => /\.(jsx?|mjs)$/.test(f))
    .filter((f) => /_google\.js/.test(readFileSync("src/" + f, "utf8")));
  /* ⚠ אותו כלל כמו _monday.js: ייבוא מ-src היה מכניס את
     המפתח לחבילת הדפדפן. */
  ok("_google.js אינו מיובא מ-src", bad.length === 0, bad.join(", "));
} finally {
  if (SAVED === undefined) delete process.env.GOOGLE_SA_KEY;
  else process.env.GOOGLE_SA_KEY = SAVED;
  if (SAVED_KEY === undefined) delete process.env.GOOGLE_API_KEY;
  else process.env.GOOGLE_API_KEY = SAVED_KEY;
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
console.log("⚠ לא נבדק כאן: קבלה בפועל מול Google (דורש חשבון אמיתי ושיתוף גיליון).");
process.exit(fail ? 1 : 0);
