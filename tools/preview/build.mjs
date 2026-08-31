/* ============================================================
   אריזת האפליקציה לקובץ HTML אחד — לתצוגה בלבד
   ------------------------------------------------------------
     node tools/preview/build.mjs

   בונה עם vite.preview.config.js (נתוני דוגמה במקום השרת),
   ואז מטמיע את ה-JS ואת התמונות לתוך ה-HTML. התוצאה:
   dist-preview/index.html — קובץ אחד שנפתח בכל מקום בלי שרת.

   ⚠ אינו נוגע ב-`npm run build` של הייצור.
   ============================================================ */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "dist-preview";

console.log("בונה…");
execSync("npx vite build --config vite.preview.config.js", { stdio: "inherit" });

const htmlPath = path.join(OUT, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");

/* ---------- הטמעת ה-JS ---------- */
/* ⚠ הבנייה מייצרת קובץ אחד בלבד; יותר מאחד פירושו שהוגדר
   פיצול, ואז ההטמעה הפשוטה הזו כבר לא נכונה. */
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)];
for (const [tag, src] of scripts) {
  const file = path.join(OUT, src.replace(/^\//, ""));
  /* ⚠ שני מוקשים בהטמעת קוד לתוך HTML:
     1. פונקציית החלפה ולא מחרוזת — ‎$&‎ ו-‎$1‎ במחרוזת החלפה
        מתפרשים כתבנית, וקוד מוקטן מלא בהם. זה שבר את הבנייה.
     2. ‎</script>‎ בתוך מחרוזת בקוד סוגר את התגית מוקדם. */
  const code = fs.readFileSync(file, "utf8").split("</script").join("<\\/script");
  html = html.replace(tag, () => `<script type="module">\n${code}\n</script>`);
}

/* ---------- הטמעת ה-CSS, אם נוצר קובץ נפרד ---------- */
const links = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
for (const [tag, href] of links) {
  const file = path.join(OUT, href.replace(/^\//, ""));
  if (!fs.existsSync(file)) continue;
  const css = fs.readFileSync(file, "utf8");
  html = html.replace(tag, () => `<style>\n${css}\n</style>`);
}

/* ---------- הטמעת התמונות ----------
   הנתיבים האלה הם מחרוזות בקוד ולא ייבוא, ולכן vite אינה
   נוגעת בהם — צריך להחליף אותם כאן. */
const ASSETS = {
  "/photos/dash.jpg": "image/jpeg",
  "/photos/container.jpg": "image/jpeg",
  "/photos/student.jpg": "image/jpeg",
  "/logo-mark.png": "image/png",
};
for (const [url, mime] of Object.entries(ASSETS)) {
  const file = path.join("public", url.replace(/^\//, ""));
  if (!fs.existsSync(file)) continue;
  const uri = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  html = html.split(url).join(uri);
}

/* ---------- מה שאין לו משמעות בקובץ בודד ---------- */
html = html
  .replace(/<link rel="manifest"[^>]*>/g, "")
  .replace(/<link rel="apple-touch-icon"[^>]*>/g, "")
  .replace(/<link rel="icon"[^>]*>/g, "");

/* ---------- חיווי שזו הדגמה ----------
   ⚠ חובה, לא קישוט: המסכים נראים בדיוק כמו הייצור, והנתונים
     בדויים. בלי הפס הזה אפשר לטעות ולחשוב שמסתכלים על
     המכינה האמיתית. הצבעים מהאפליקציה עצמה. */
const BANNER = `
<style>
  .demo-flag{position:sticky;top:0;z-index:9999;background:#002454;color:#F5F1E8;
    font-family:'Heebo',system-ui,sans-serif;font-size:12.5px;font-weight:700;
    padding:7px 14px;text-align:center;letter-spacing:.2px;direction:rtl;
    box-shadow:0 2px 10px rgba(0,36,84,.3)}
  .demo-flag b{color:#fff}
  @media (prefers-reduced-motion:no-preference){.demo-flag{transition:opacity .2s}}
</style>
<div class="demo-flag" role="note">
  <b>הדגמה</b> · נתוני דוגמה בדויים, לא המכינה האמיתית · הכפתורים נראים ולא נשמרים
</div>`;
html = html.replace("<body>", () => "<body>" + BANNER);

fs.writeFileSync(htmlPath, html);
fs.rmSync(path.join(OUT, "assets"), { recursive: true, force: true });

const kb = Math.round(fs.statSync(htmlPath).size / 1024);
console.log(`\n✓ ${htmlPath} — ${kb} KB, קובץ אחד`);
