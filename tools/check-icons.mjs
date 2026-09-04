/* ============================================================
   כל `<XX.name />` מצביע על מפתח שקיים
   ------------------------------------------------------------
   ⚠⚠ **זו המחלקה ש-`vite build` אינה תופסת, והיא מפילה מסך
     שלם.** `<I.lock />` על מפתח שאינו קיים עובר את הבנייה
     בשלום, ובדפדפן הוא "Element type is invalid" — כלומר
     **מסך לבן**, ולא רכיב חסר. בפיילוט זה אומר שאיש צוות פותח
     את התפריט ומקבל דף ריק.

   זה קרה כאן שלוש פעמים בסשן אחד: `MI.flag`, `reload` שאינו
   קיים, ו-`I.lock` — והאחרון הגיע עד הדפדפן.

   ⚠⚠ **ולמה זו סריקה עם התאמת סוגריים ולא רג׳קס.** גרסה
     ראשונה השתמשה ב-`const I = \\{(.*?)\\n\\};`, והיא פשוט **לא
     התאימה** לאובייקט שב-App.jsx — כלומר החזירה "אין חסרים"
     בלי לבדוק כלום. בדיקה שנכשלת בשקט גרועה מהיעדר בדיקה,
     ולכן הסקריפט הזה **נכשל ברעש** כשהוא לא מצא אובייקט
     אייקונים שהוא מצפה לו.

   הרצה: node tools/check-icons.mjs
   ============================================================ */
import { readdirSync, readFileSync } from "node:fs";

const files = readdirSync("src").filter((f) => f.endsWith(".jsx"));
let problems = 0, checked = 0;

/** גוף האובייקט לפי התאמת סוגריים — ולא רג׳קס שעלול לא להתאים */
function objectBody(src, name) {
  const head = `const ${name} = {`;
  const i = src.indexOf(head);
  if (i < 0) return null;
  let depth = 0;
  for (let k = i + head.length - 1; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") {
      depth--;
      if (depth === 0) return src.slice(i + head.length, k);
    }
  }
  return null;
}

for (const f of files) {
  /* ⚠ **ההערות מוסרות לפני הסריקה.** ההערות כאן מתעדות באגים,
     והן מצטטות את הקוד שגרם להם — למשל `<I.lock />`. סורק
     שסופר ציטוט בהערה כהפניה אמיתית מדווח על תקלה שאינה
     קיימת, ובדיקה שמתריעה לשווא מפסיקים להריץ. */
  const raw = readFileSync("src/" + f, "utf8");
  /* ⚠ הערה: `.` בלי הדגל s אינה תופסת שורה חדשה, ולכן
     הביטוי לתגובת-שורה בטוח כאן. */
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*/gm, "$1");
  /* כל תחילית שמשמשת כרכיב: <I.x />, <MI.x />, <CI.x /> … */
  const prefixes = [...new Set([...src.matchAll(/<([A-Z][A-Za-z]*)\.[a-zA-Z]/g)].map((m) => m[1]))];

  for (const p of prefixes) {
    const body = objectBody(src, p);
    if (body === null) {
      /* ⚠ מיובא מקובץ אחר — לא נבדק כאן, ונאמר במפורש. */
      if (new RegExp(`import\\s+\\{[^}]*\\b${p}\\b`).test(src)
        || new RegExp(`import\\s+${p}\\b`).test(src)) continue;
      /* ⚠ הקשר של React אינו מפת אייקונים. <Ctx.Provider> הוא
         שימוש לגיטימי, וסימון שלו כשבור היה הופך את הבדיקה
         לרועשת — ובדיקה רועשת מפסיקים להריץ. */
      if (new RegExp(`const ${p} = createContext`).test(src)) continue;
      console.log(`  ? ${f}: <${p}.…> — לא נמצא \`const ${p} = {\` ולא ייבוא. לבדוק ידנית.`);
      problems++;
      continue;
    }
    checked++;
    const keys = new Set([...body.matchAll(/(?:^|\n)\s{2,}"?([a-zA-Z][\w-]*)"?:/g)].map((m) => m[1]));
    const used = new Set([...src.matchAll(new RegExp(`<${p}\\.([a-zA-Z]\\w*)`, "g"))].map((m) => m[1]));
    for (const u of used) {
      if (!keys.has(u)) {
        console.log(`  X ${f}: <${p}.${u} /> — אינו מוגדר ב-${p}`);
        problems++;
      }
    }
  }
}

console.log(problems
  ? `\n${problems} הפניות שבורות. כל אחת מהן = מסך לבן.`
  : `\nכל הפניות האייקונים תקינות (${checked} אובייקטים ב-${files.length} מסכים).`);
process.exit(problems ? 1 : 0);
