/* ============================================================
   הרצה יבשה של כל 14 שלבי ההקמה — בלי monday ובלי רשת
   ------------------------------------------------------------
     npm run check:seeds

   ⚠⚠ **למה זה קיים.** שבעת סקריפטי ההקמה החדשים נכתבו בסביבה
     שאין בה גישה ל-monday, ולכן מעולם לא הורצו כאן — והמשתמש
     שימש כמריץ הבדיקות. כל הרצה אצלו נעצרה על באג אחר, ובכל
     סבב נשרפו עשר דקות שלו על משהו שאפשר לתפוס כאן בשתי
     שניות.

   מה זה כן בודק:
     · שכל שאילתה תקינה ושכל משתנה שהיא מצהירה עליו באמת נשלח
     · שכל seed כותב את קובץ המזהים שלו ושהקובץ **נטען**
     · שכל *Ready() מחזירה true בסוף
     · שהרצה שנייה אינה יוצרת לוח או עמודה כפולים (אידמפוטנטיות)
     · שכל נתב ב-api/ עדיין נטען אחרי שהקבצים נכתבו

   ⚠ מה שהוא **אינו** בודק: הסמנטיקה של monday — תוויות
     כפולות, מפתח 5, הרשאות, וכל מה שרק השרת האמיתי יודע.
     "עבר כאן" אינו "יעבוד שם", והוא כן אומר שלא נעצור על
     שגיאת תחביר או על משתנה חסר.
   ============================================================ */
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { STEPS } from "../boards-ready.mjs";

const ROOT = process.cwd();
const DIR = join(process.env.TMPDIR || tmpdir(), "seed-dry-" + Date.now());
const STATE = join(DIR, "monday.json");
const DIR2 = DIR + "-full";
const DIR3 = DIR + "-crlf";
const SKIP = new Set(["node_modules", ".git", "dist", ".vercel"]);

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log("  ✓ " + msg); } else { fail++; console.log("  ✗ " + msg); } };

/* ---------- עותק עבודה ---------- */
mkdirSync(DIR, { recursive: true });
for (const e of readdirSync(ROOT)) {
  if (SKIP.has(e)) continue;
  cpSync(join(ROOT, e), join(DIR, e), { recursive: true });
}
/* ⚠ המוק במקום הלקוח האמיתי — וזה עותק, המאגר עצמו לא נגוע. */
cpSync(join(ROOT, "tools/tests/monday-mock.mjs"), join(DIR, "api/_monday.js"));
writeFileSync(join(DIR, ".env"), "MONDAY_TOKEN=mock\nSESSION_SECRET=mock\n", "utf8");
/* ⚠ גם בתהליך הזה — הנתבים מיובאים כאן, לא בילד. */
process.env.MONDAY_MOCK = STATE;

/* ⚠ קבצי מזהים ריקים לפני שמתחילים — אחרת "עבר" עשוי להיות
   רק מפני שהקובץ כבר היה מלא מהרצה קודמת. */
const idFiles = [...new Set(STEPS.map((s) => s.ids))];

const run = (script, env = {}) =>
  spawnSync(process.execPath, [script], {
    cwd: DIR, encoding: "utf8",
    env: { ...process.env, MONDAY_MOCK: STATE, PYTHONUTF8: "1", ...env },
  });

/* ---------- מעבר ראשון ---------- */
console.log("\n▶ מעבר ראשון — הקמה מאפס\n");
const scripts = [...new Set(STEPS.map((s) => s.script))];
const first = {};
for (const script of scripts) {
  const r = run(script);
  first[script] = r;
  const line = (r.stderr || "").trim().split("\n").filter(Boolean).pop() || "";
  ok(r.status === 0, script + (r.status === 0 ? "" : "  → " + line.slice(0, 150)));
}

/* ---------- כל *Ready() ---------- */
console.log("\n▶ קבצי המזהים\n");
for (const s of STEPS) {
  const url = pathToFileURL(join(DIR, s.ids)).href + "?v=" + Date.now();
  try {
    const m = await import(url);
    const fn = m[s.ready];
    ok(typeof fn === "function" && fn() === true, s.ready + "()  ·  " + s.title);
  } catch (e) {
    ok(false, s.ready + "() — " + s.ids + " אינו נטען: " + String(e.message).split("\n")[0]);
  }
}

/* ---------- הרצה שנייה: אידמפוטנטיות ---------- */
console.log("\n▶ מעבר שני — אסור שייווצר משהו פעמיים\n");
const before = JSON.parse(readJson(STATE));
for (const script of scripts) {
  const r = run(script);
  ok(r.status === 0, "הרצה חוזרת: " + script);
}
const after = JSON.parse(readJson(STATE));
ok(Object.keys(after.boards).length === Object.keys(before.boards).length,
  "מספר הלוחות לא השתנה (" + Object.keys(before.boards).length + ")");
for (const [id, b] of Object.entries(after.boards)) {
  const was = before.boards[id];
  if (!was) continue;
  const dupes = b.columns.map((c) => c.title).filter((t, i, a) => a.indexOf(t) !== i);
  if (dupes.length) ok(false, "עמודות כפולות ב-" + b.name + ": " + [...new Set(dupes)].join(", "));
  else if (b.columns.length !== was.columns.length)
    ok(false, "מספר העמודות ב-" + b.name + " השתנה: " + was.columns.length + " → " + b.columns.length);
}
ok(true, "אין עמודות כפולות באף לוח");

/* ---------- נתבים ---------- */
console.log("\n▶ הנתבים נטענים עם המזהים שנכתבו\n");
for (const f of readdirSync(join(DIR, "api")).filter((x) => x.endsWith(".js") && !x.startsWith("_")).sort()) {
  try {
    await import(pathToFileURL(join(DIR, "api", f)).href + "?v=" + Date.now());
    ok(true, "api/" + f);
  } catch (e) { ok(false, "api/" + f + " — " + String(e.message).split("\n")[0]); }
}

/* ---------- המסלול השלם: setup-boards עצמו ---------- */
/* ⚠⚠ **זה מה שנשבר אצל המשתמש, ולא ה-seeds.** כל 14 הסקריפטים
   עברו, וההקמה בכל זאת נעצרה בשלב 6 — כי המתזמר השווה לפי שם
   הקובץ, ושני שלבים חולקים את shared/mechina-boards.js. בדיקה
   שמריצה את הסקריפטים לבדם לא הייתה תופסת את זה לעולם. */
console.log("\n▶ npm run setup:boards מאפס\n");
rmSync(DIR2, { recursive: true, force: true });
mkdirSync(DIR2, { recursive: true });
for (const e of readdirSync(ROOT)) {
  if (SKIP.has(e)) continue;
  cpSync(join(ROOT, e), join(DIR2, e), { recursive: true });
}
cpSync(join(ROOT, "tools/tests/monday-mock.mjs"), join(DIR2, "api/_monday.js"));
writeFileSync(join(DIR2, ".env"), "MONDAY_TOKEN=mock\nSESSION_SECRET=mock\n", "utf8");
const full = spawnSync(process.execPath, ["tools/setup-boards.mjs", "--no-push"], {
  cwd: DIR2, encoding: "utf8",
  env: { ...process.env, MONDAY_MOCK: join(DIR2, "monday.json") },
});
const out = (full.stdout || "") + (full.stderr || "");
ok(full.status === 0, "setup:boards יצא 0"
  + (full.status === 0 ? "" : "\n" + out.split("\n").filter((l) => l.includes("✗")).join("\n")));
for (const s of STEPS) ok(out.includes("✓ " + s.title), "אומת בסוף ההרצה: " + s.title);
ok(!/Task 1/.test(out) || /נמחק/.test(out), "שורות הדמה טופלו");

/* ---------- מעבר CRLF ---------- */
/* ⚠⚠ **הבאג היקר ביותר במאגר, ננעל כאן** (5כג). גיט בווינדוס
   מוציא קבצים ב-CRLF, ה-put() של ה-seed חיפש `;\n`, לא תפס
   כלום, **והוסיף** הצהרת export שנייה במקום להחליף — SyntaxError
   שהפיל כל מסך במערכת. .gitattributes מונע את זה מלכתחילה,
   וזה מוודא שגם אם מישהו יעקוף אותו, ההחלפה עדיין נכונה. */
console.log("\n▶ אותה הקמה על עץ ב-CRLF\n");
rmSync(DIR3, { recursive: true, force: true });
mkdirSync(DIR3, { recursive: true });
for (const e of readdirSync(ROOT)) {
  if (SKIP.has(e)) continue;
  cpSync(join(ROOT, e), join(DIR3, e), { recursive: true });
}
cpSync(join(ROOT, "tools/tests/monday-mock.mjs"), join(DIR3, "api/_monday.js"));
writeFileSync(join(DIR3, ".env"), "MONDAY_TOKEN=mock\nSESSION_SECRET=mock\n", "utf8");
for (const f of idFiles) {
  const at = join(DIR3, f);
  if (existsSync(at)) writeFileSync(at, readFileSync(at, "utf8").replace(/\r?\n/g, "\r\n"), "utf8");
}
const crlf = spawnSync(process.execPath, ["tools/setup-boards.mjs", "--no-push"], {
  cwd: DIR3, encoding: "utf8",
  env: { ...process.env, MONDAY_MOCK: join(DIR3, "monday.json") },
});
ok(crlf.status === 0, "setup:boards יצא 0 גם על עץ ב-CRLF");
for (const f of idFiles) {
  const at = join(DIR3, f);
  if (!existsSync(at)) continue;
  const names = [...readFileSync(at, "utf8").matchAll(/^export const (\w+)\s*=/gm)].map((m) => m[1]);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) ok(false, "הצהרת export כפולה ב-" + f + ": " + [...new Set(dup)].join(", "));
}
ok(true, "אין הצהרת export כפולה באף קובץ מזהים");

/* ---------- ניקוי ---------- */
if (!process.env.KEEP) { rmSync(DIR, { recursive: true, force: true }); rmSync(DIR2, { recursive: true, force: true }); rmSync(DIR3, { recursive: true, force: true }); }
else console.log("\n(העותקים נשארו ב-" + DIR + " וב-" + DIR2 + ")");

console.log("\n" + "─".repeat(50));
console.log(pass + " עברו, " + fail + " נכשלו");
process.exit(fail ? 1 : 0);

function readJson(p) {
  return existsSync(p) ? readFileSync(p, "utf8") : '{"boards":{}}';
}
