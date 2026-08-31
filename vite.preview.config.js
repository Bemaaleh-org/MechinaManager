/* ============================================================
   בנייה לתצוגה — קובץ HTML יחיד עם נתוני דוגמה
   ------------------------------------------------------------
     node tools/preview/build.mjs

   ההבדל היחיד מהבנייה הרגילה: src/api.js מוחלף בשכבת נתוני
   דוגמה. האריזה לקובץ יחיד נעשית ב-tools/preview/build.mjs,
   ידנית ובלי תלות חיצונית — חבילה נוספת רק בשביל זה נגרפה
   כאן פעם אחת על ידי npm install של חבילה אחרת.

   התוצאה נפתחת בכל מקום בלי שרת, ומשמשת להצגת המסכים
   בסביבות שאין בהן localhost.

   ⚠ אינה נוגעת בבנייה של הייצור. `npm run build` נשאר כשהיה.
   ============================================================ */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const REAL = path.resolve("src/api.js");
const MOCK = path.resolve("tools/preview/mock-api.js");

/* ⚠ resolveId ולא alias: הייבוא בקוד הוא יחסי ("./api.js"),
   ואליאס לפי נתיב מוחלט אינו תופס אותו. כאן מפענחים את
   הנתיב מול המייבא ומשווים לקובץ האמיתי — החלפה מדויקת
   של קובץ אחד, בלי לגעת בשום ייבוא אחר. */
function mockApi() {
  return {
    name: "mock-api",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.endsWith("api.js")) return null;
      const resolved = source.startsWith(".")
        ? path.resolve(path.dirname(importer), source)
        : source;
      return resolved === REAL ? MOCK : null;
    },
  };
}

export default defineConfig({
  plugins: [mockApi(), react()],
  /* תמונות עד 2MB נכנסות כ-data URI במקום כקובץ נפרד */
  build: {
    assetsInlineLimit: 2 * 1024 * 1024,
    outDir: "dist-preview",
    emptyOutDir: true,
  },
});
