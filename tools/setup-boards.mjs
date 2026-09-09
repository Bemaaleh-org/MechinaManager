/* ============================================================
   הקמת כל הלוחות החדשים — פקודה אחת
   ------------------------------------------------------------
     npm run setup:boards

   מריץ את חמשת הסקריפטים של המסכים החדשים ואז את ניקוי שורות
   הדמה, אחד אחרי השני, ועוצר על הכישלון הראשון.

   ⚠ **למה זה קיים.** ההקמה הייתה שש פקודות נפרדות שצריך
     להריץ בסדר, וכל אחת מהן כותבת קובץ מזהים אחר. מי שהריץ
     ארבע מתוך שש קיבל מערכת שחציה עובדת וחציה אומרת "טרם
     הוקם" — וזה נראה בדיוק כמו באג ולא כמו שלב שנשכח.

   ⚠ **עוצר על הכישלון הראשון ואינו ממשיך.** סקריפט שנפל
     בגלל טוקן, הרשאה או קצב יגרור את כל מי שאחריו לאותה
     שגיאה, ואז שש שגיאות זהות מסתירות את זו האמיתית.

   ⚠ **אידמפוטנטי — מותר להריץ שוב.** כל סקריפט מזהה לוח או
     עמודה שכבר קיימים לפי השם ואינו יוצר אותם פעמיים. הרצה
     חוזרת אחרי כישלון באמצע ממשיכה בדיוק מהמקום שנעצר.

   ⚠ **ניקוי הדמה אחרון ולא אחרי כל אחד.** monday יוצרת כל
     לוח חדש עם שורות "Task 1", והן שורות לכל דבר (5יב). הוא
     סורק את כל הלוחות ממילא, ולכן פעם אחת בסוף מספיקה.

   ⚠ **ומוודא בסוף בקריאה טרייה.** הסקריפט אינו מדווח הצלחה
     על סמך קוד היציאה של מי שהוא הריץ — הוא מייבא כל מודול
     מזהים ובודק שפונקציית ה-Ready שלו מחזירה true. קובץ
     שנכתב חלקית עובר את קוד היציאה ונופל כאן.
   ============================================================ */
import { spawnSync } from "node:child_process";
/* ⚠ הרשימה מיובאת ואינה כתובה כאן שוב — ראו boards-ready.mjs. */
import { STEPS, notReady } from "./boards-ready.mjs";

/* ⚠ **`--no-push` קיים, וברירת המחדל היא כן לדחוף.** קבצי
   המזהים הם הדבר היחיד שעומד בין הקמה מוצלחת לבין מסך שאומר
   "טרם הוקם" בייצור, והשלב הזה הוא בדיוק זה שנשכח. */
const PUSH = !process.argv.includes("--no-push");

const git = (args) => {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return { ok: r.status === 0, out: String(r.stdout || ""), err: String(r.stderr || "") };
};

/* כל קובץ ש-seed כלשהו כותב. ⚠ רחב יותר מ-STEPS[].ids: seed
   אחד כותב שניים (plenary → plenary+lecturers, stulesson →
   stulesson+placements), וקובץ שיישאר מחוץ לרשימה יישאר שינוי
   מקומי שחוסם את ה-pull הבא. */
const GENERATED = [...new Set([
  ...STEPS.map((s) => s.ids),
  "shared/budget-ids.js", "shared/placements-ids.js",
  "shared/plenary-ids.js", "shared/lecturers-ids.js",
])];

const CLEAN = { script: "tools/clean-defaults.mjs", title: "מחיקת שורות הדמה של monday" };

/* ⚠ בדיקה ש-monday בכלל עונה — לפני שמריצים שישה סקריפטים
   שכולם ייפלו באותה שגיאה. אותו נימוק כמו בדיקת השרת
   ב-tools/tests/run.mjs. */
try {
  const { gql } = await import("../api/_monday.js");
  await gql(`query{ me{ id } }`);
} catch (e) {
  const msg = String(e?.message || e);
  console.error("\n✗ אין חיבור ל-monday: " + msg);
  /* ⚠ **רשת חסומה נראית בדיוק כמו טוקן פסול.** שתי התקלות
     נופלות באותה שורה, והפתרון שלהן הפוך לגמרי — מי שיקבל
     "לבדוק את הטוקן" על חסימת פרוקסי יחליף טוקן תקין. */
  if (/Host not in allowlist|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|proxy|tunnel/i.test(msg)) {
    console.error("  זו חסימת רשת ולא בעיית טוקן — api.monday.com אינו נגיש");
    console.error("  מהסביבה הזו. להריץ ממחשב עם גישה רגילה לאינטרנט.\n");
  } else {
    console.error("  לבדוק ש-MONDAY_TOKEN נמצא ב-.env ושהוא בתוקף.\n");
  }
  process.exit(1);
}

/* ⚠⚠ **עותק שמאחור מדווח הצלחה על רשימה ישנה.** זה קרה: עמדה
   שנשארה על גרסה עם 7 שלבים הריצה את שבעתם, הדפיסה "הכול הוקם
   ואומת", והמסכים החדשים המשיכו לומר "טרם הוקם" — כי הם כלל
   לא היו ברשימה. אימות שמסתמך על STEPS אינו יכול לתפוס את זה,
   כי STEPS עצמו הוא מה שמיושן.
   ⚠ ומה שהשאיר אותה מאחור הוא קבצי המזהים: seed משנה אותם, העץ
   מתלכלך, וכל pull נחסם (5כג). */
async function behind() {
  const f = git(["fetch", "origin", "main", "--quiet"]);
  if (!f.ok) return null;                 /* בלי רשת — לא טוענים כלום */
  const n = git(["rev-list", "--count", "HEAD..origin/main"]);
  return n.ok ? Number(n.out.trim()) || 0 : null;
}

const gap = await behind();
if (gap) {
  console.error("\n" + "═".repeat(56));
  console.error("✗ העותק הזה מאחור ב-" + gap + " קומיטים אחרי origin/main.");
  console.error("═".repeat(56));
  console.error("  רשימת השלבים כאן ישנה, ולכן ההקמה תדווח הצלחה על");
  console.error("  חלק מהמסכים בלבד — והשאר ימשיכו לומר \"טרם הוקם\".");
  console.error("\n  לסנכרן קודם. הדרך הבטוחה, שגם דוחפת בסוף:");
  console.error("      start.cmd            (לחיצה כפולה, או: npm run go)");
  console.error("\n  או ביד, אם העץ מלוכלך מקבצי מזהים:");
  console.error("      git stash push -u -m ids");
  console.error("      git pull origin main");
  console.error("      npm install");
  console.error("      npm run setup:boards\n");
  process.exit(1);
}

const run = (s, args = []) => {
  console.log("\n" + "═".repeat(56));
  console.log("▶ " + s.title);
  console.log("═".repeat(56));
  const r = spawnSync(process.execPath, ["--env-file=.env", s.script, ...args],
    { stdio: "inherit" });
  return r.status === 0;
};

/* ⚠ **בדיקה אחרי כל שלב ולא רק בסוף.** סקריפט seed יכול לצאת 0
   ובכל זאת להשאיר קובץ מזהים שאינו נטען — קרה כאן: קובץ ב-CRLF
   קיבל הצהרת export כפולה, וזה SyntaxError. אימות רק בסוף אמר
   "אחד נכשל" אחרי חמישה שלבים, בלי לומר איזה מהם באמת שבר. */
const stepOk = async (s) => (await notReady()).every((b) => b.ids !== s.ids);

const done = [];
for (const s of STEPS) {
  const ranOk = run(s);
  if (ranOk && await stepOk(s)) { done.push(s); continue; }
  console.error("\n" + "═".repeat(56));
  if (ranOk) {
    console.error("✗ " + s.title + " הסתיים בהצלחה, אבל " + s.ids);
    console.error("  עדיין אינו נטען. זה כמעט תמיד הצהרת export כפולה");
    console.error("  בקובץ — למחוק אותו ולהריץ שוב:");
    console.error("      del " + s.ids.replace(/\//g, "\\") + "   (או rm בלינוקס)");
  } else {
    console.error("✗ נעצר על: " + s.title + "  (" + s.script + ")");
  }
  if (done.length) {
    console.error("\n  מה שכן הוקם, וחייב להיכנס לקומיט:");
    for (const d of done) console.error("    " + d.ids);
  }
  console.error("\n  אחרי שהתקלה נפתרת — להריץ שוב את אותה פקודה.");
  console.error("  הסקריפטים אידמפוטנטיים; מה שכבר נוצר לא ייווצר שוב.\n");
  process.exit(1);
}

/* ⚠ **`--go` ולא הרצה יבשה.** clean-defaults מדפיס בלי הדגל את
   מה שהוא *היה* מוחק ויוצא 0 — כלומר ההקמה דיווחה הצלחה ושורות
   ה-"Task 1" נשארו בכל לוח חדש, בדיוק מה שהוא נועד למנוע (5יב). */
if (!run(CLEAN, ["--go"])) {
  console.error("\n⚠ הלוחות הוקמו וניקוי שורות הדמה נכשל.");
  console.error("  זה אינו חוסם — להריץ בנפרד: npm run clean:defaults\n");
}

/* ---- אימות טרי ---- */
console.log("\n" + "═".repeat(56));
console.log("▶ אימות");
console.log("═".repeat(56));

const bad = await notReady();
const badKeys = new Set(bad.map((b) => b.ids));
for (const s of STEPS) if (!badKeys.has(s.ids)) console.log("  ✓ " + s.title);

if (bad.length) {
  console.error("\n✗ " + bad.length + " לא עברו את האימות:");
  for (const b of bad) console.error("    " + b.title + " — " + b.why);
  console.error("");
  process.exit(1);
}

console.log("\n✓ הכול הוקם ואומת.\n");

/* ============================================================
   קומיט ודחיפה של קבצי המזהים
   ------------------------------------------------------------
   ⚠⚠ **זה השלב שנשכח, וכשהוא נשכח הכול נראה כאילו לא עבד.**
     ההקמה הצליחה, monday מלאה — והייצור ממשיך לומר "טרם הוקם",
     כי Vercel בונה מהענף ולא מהמחשב. הסקריפט הדפיס עד היום את
     הפקודות וקיווה שיריצו אותן. עכשיו הוא מריץ אותן.

   ⚠ **ובנוסף זה משחרר את ה-pull הבא.** קובץ מזהים שנשאר שינוי
     מקומי חוסם כל משיכה, וזו הלולאה שתקעה את העמדה (5כג).

   ⚠ **דחיפה ל-main רק כשההפרש הוא קבצי מזהים בלבד.** `main` רץ
     במטבח תוך דקה, ודחיפה שלו גוררת גם כל קומיט אחר שיושב על
     הענף. עבודה שלא נבדקה אינה עולה למטבח כתופעת לוואי של
     הקמת לוחות — ואז נדחף רק הענף הנוכחי, ונאמר מה נשאר.
   ============================================================ */
function publish() {
  if (!git(["rev-parse", "--is-inside-work-tree"]).ok) return manual("אין כאן מאגר גיט");
  if (!PUSH) return manual("--no-push");

  const have = GENERATED.filter((f) => git(["ls-files", "--error-unmatch", f]).ok ||
    git(["status", "--porcelain", "--", f]).out.trim());
  git(["add", "--", ...have]);

  const staged = !git(["diff", "--cached", "--quiet"]).ok;
  if (staged) {
    /* ⚠ מוגבל לנתיבים: קומיט שסוחף שינוי אחר שכבר היה ב-stage
       הוא בדיוק מה שדוחף למטבח משהו שלא נבדק. */
    const c = git(["commit", "-q", "-m", "הקמת הלוחות מהעמדה המקומית", "--", ...have]);
    if (!c.ok) return manual("הקומיט נכשל: " + (c.err || c.out).trim());
    console.log("✓ נוצר קומיט עם קבצי המזהים");
  } else {
    console.log("• אין שינוי בקבצי המזהים — כבר בקומיט");
  }

  /* ⚠ אין מה לדחוף? עדיין ייתכן קומיט מקומי שלא עלה. */
  git(["fetch", "origin", "main", "--quiet"]);
  const ahead = git(["rev-list", "--count", "origin/main..HEAD"]);
  if (ahead.ok && Number(ahead.out.trim()) === 0) {
    console.log("✓ הענף כבר זהה ל-origin/main — אין מה לדחוף.\n");
    return;
  }

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).out.trim();
  const push = (ref) => {
    const r = git(["push", "origin", "HEAD:" + ref]);
    console.log((r.ok ? "  ✓ " : "  ✗ ") + ref + (r.ok ? "" : " — " + (r.err || "").trim().split("\n")[0]));
    return r.ok;
  };

  /* מה בדיוק ההפרש מול main? */
  const diff = git(["diff", "--name-only", "origin/main...HEAD"]);
  const files = diff.out.split("\n").map((s) => s.trim()).filter(Boolean);
  const onlyIds = files.length > 0 && files.every((f) => GENERATED.includes(f));

  const side = branch && branch !== "HEAD" && branch !== "main" ? branch : null;
  if (side || onlyIds) console.log("\nדוחף:");
  if (side) push(side);

  if (!onlyIds) {
    const extra = files.filter((f) => !GENERATED.includes(f));
    console.log("\n⚠ לא נדחף ל-main: יש כאן גם שינויים שאינם קבצי מזהים.");
    for (const f of extra.slice(0, 12)) console.log("    " + f);
    if (extra.length > 12) console.log("    ועוד " + (extra.length - 12));
    console.log("\n  main רץ במטבח. לבדוק מה אלה, ואז:");
    console.log("      git push origin HEAD:lessons");
    console.log("      git push origin HEAD:main\n");
    return;
  }

  const a = push("lessons");
  const b = push("main");
  if (a && b) {
    console.log("\n✓ נדחף. Vercel בונה עכשיו — 40 עד 90 שניות,");
    console.log("  ואז לרענן את האתר (חלון פרטי, כדי לא לקבל מטמון).\n");
  } else {
    console.log("\n  להריץ שוב ביד את מה שנכשל.\n");
  }
}

function manual(why) {
  console.log("(לא נדחף אוטומטית — " + why + ")\n");
  console.log("⚠ הקבצים שנכתבו חייבים להיכנס לקומיט — בלעדיהם");
  console.log("  הדיפלוי ב-Vercel לא ימצא את הלוחות:\n");
  console.log("  git add " + GENERATED.join(" "));
  console.log("  git commit -m \"הקמת הלוחות החדשים\"");
  console.log("  git push -u origin HEAD");
  console.log("  git push origin HEAD:lessons");
  console.log("  git push origin HEAD:main\n");
}

publish();
