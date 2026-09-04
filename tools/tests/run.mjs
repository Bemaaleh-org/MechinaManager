/* ============================================================
   הרצת כל חבילות הבדיקה, אחת אחרי השנייה
   ------------------------------------------------------------
   node --env-file=.env tools/tests/run.mjs           הכול
   node --env-file=.env tools/tests/run.mjs chores    אחת

   ⚠ **אחת אחרי השנייה ולא במקביל.** כל חבילה כותבת ללוחות
     האמיתיים של המכינה ומנקה אחריה; שתיים במקביל היו רואות
     זו את הנתונים של זו ונכשלות מסיבה שאינה קשורה.

   ⚠ **דורש שרת פיתוח פעיל** על 5173 — הבדיקות פונות אליו
     ב-fetch. `npm run dev` בטרמינל אחר, או ברקע.
   ============================================================ */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const all = readdirSync("tools/tests")
  .filter((f) => f.endsWith("-test.mjs"))
  .filter((f) => !only.length || only.some((o) => f.includes(o)))
  .sort();

/* ⚠ בדיקה שהשרת בכלל עונה — לפני שמריצים עשרים חבילות
   שכולן ייכשלו באותה שגיאה חסרת פשר. */
try {
  const r = await fetch("http://localhost:5173/", { signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(String(r.status));
} catch {
  console.error("✗ שרת הפיתוח אינו עונה על 5173. הריצו: npm run dev");
  process.exit(1);
}

let pass = 0, fail = 0;
const bad = [];
const noCount = [];
for (const f of all) {
  const t = Date.now();
  const r = spawnSync(process.execPath, ["--env-file=.env", "tools/tests/" + f],
    { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  /* ⚠ שני סדרי מילים, כי שתי משפחות של חבילות נכתבו אחרת.
     ⚠ וחבילה שאין לה שורת סיכום כלל **מדווחת** — "—" בעמודה
       פירושו שהטענות שלה אינן בסך הכול, וזה נראה בדיוק כמו
       חבילה שהכול בה עבר. */
  const m = out.match(/(\d+)\s+עברו[^\d]*?(\d+)\s+נכשלו/)
    || out.match(/עברו\s+(\d+)[^\d]*?נכשלו\s+(\d+)/);
  const ok = r.status === 0;
  if (!ok) bad.push({ f, out: out.split("\n").slice(-14).join("\n") });
  if (m) { pass += Number(m[1]); fail += Number(m[2]); }
  else noCount.push(f);
  console.log(`${ok ? "V" : "X"} ${f.padEnd(24)} ${m ? m[1] + "/" + (Number(m[1]) + Number(m[2])) : "—"}  ${Math.round((Date.now() - t) / 1000)}s`);
}

console.log(`\nסה״כ ${pass} טענות עברו · ${fail} נכשלו · ${bad.length} חבילות נפלו`);
/* ⚠ חבילה בלי שורת סיכום אינה נספרת, ושתיקה על כך היא בדיוק
   האופן שבו שמונה חבילות נעדרו מהמניין במשך סשן שלם. */
if (noCount.length) {
  console.log(`⚠ ${noCount.length} חבילות בלי שורת סיכום — הטענות שלהן אינן במניין: ` +
    noCount.join(", "));
}
/* ⚠ הפלט של מי שנפל מודפס — "נכשל" בלי מה נכשל אינו מידע. */
for (const b of bad) console.log(`\n--- ${b.f} ---\n${b.out}`);
process.exit(bad.length ? 1 : 0);
