/* ============================================================
   הרשאות — צפייה בלבד, ועריכה לפי תחום

   ⚠ שלוש טענות שחייבות להיבדק **באותה הרצה**, כי כל אחת לבדה
     נראית כמו באג:
       · מנכ״ל העמותה רואה הכול ואינו כותב דבר.
       · מדריך רואה את התקציב ואת השיעורים ואינו עורך אותם.
       · ראש המכינה ואחראי התחום כן עורכים.

   ⚠ הבדיקה **רושמת זמנית** את אנשי הצוות שטרם נרשמו ומחזירה
     בסוף (4לד) — בלי זה כניסה עם קוד נותנת סשן `setup` שחסום
     בכל נקודת קצה, וכל הטענות היו נכשלות מסיבה שאינה קשורה.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { invalidate } from "../../api/_cache.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};
const jar = () => {
  let c = "";
  return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } };
};
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, {
    method: m,
    headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) },
    ...(b ? { body: JSON.stringify(b) } : {}),
  });
  j.set(r);
  const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 200) }; }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const items = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name
       column_values(ids:["${AUTH_COLS.code}","${AUTH_COLS.viewOnly}","${AUTH_COLS.role}"]){ id text } } } } }`
)).boards[0].items_page.items;
const row = (frag) => items.find((i) => i.name.includes(frag));

const alon = row("אלון"), noam = row("נעם"), dani = row("דני לויט");
if (!alon || !noam || !dani) { console.log("חסר משתמש בלוח"); process.exit(1); }
console.log(`אלון: ${cv(alon, AUTH_COLS.viewOnly) === "v" ? "צפייה בלבד" : "⚠ לא מסומן!"}`);
console.log(`נעם: ${cv(noam, AUTH_COLS.role) || "ללא תפקיד"} · דני: ${cv(dani, AUTH_COLS.role)}`);

const regs = [];
try {
  for (const [who, frag] of [["alon", "אלון"], ["noam", "נעם"], ["dani", "דני לויט"]]) {
    regs.push(await tempRegister(frag));
  }
  invalidate("auth-rows");

  const login = async (r) => {
    const j = jar();
    const res = await call(j, "POST", "/api/auth?action=login", { code: cv(r, AUTH_COLS.code) });
    return { j, res };
  };
  const A = await login(alon), N = await login(noam), D = await login(dani);
  ok("אלון נכנס", A.res.s === 200, `${A.res.s} ${A.res.b.error || ""}`);
  ok("נעם נכנס", N.res.s === 200, `${N.res.s} ${N.res.b.error || ""}`);
  ok("דני נכנס", D.res.s === 200, `${D.res.s} ${D.res.b.error || ""}`);

  /* ============ 1 · צפייה בלבד ============ */
  console.log("\n1 · מנכ״ל העמותה — רואה הכול, אינו משנה דבר");
  let r = await call(A.j, "GET", "/api/auth?action=me");
  ok("me מחזיר viewOnly", r.s === 200 && r.b.viewOnly === true, JSON.stringify(r.b.viewOnly));

  for (const [what, path] of [
    ["רשימת החניכים", "/api/students?action=list"],
    ["שיבוצי חניכים", "/api/students?action=placements"],
    ["ניהול צוותים", "/api/students?action=team"],
    ["ציוד המטבח", "/api/kitchen?action=equip"],
    ["גיליונות מרצים", "/api/lessons?action=list"],
  ]) {
    r = await call(A.j, "GET", path);
    ok(`קורא ${what}`, r.s === 200, `${r.s} ${r.b.error || ""}`);
  }

  /* ⚠ הטענה על **תוכן ההודעה** ולא רק על 403: 403 מגיע מעשרה
     שערים שונים, וטענה שבודקת רק סטטוס עוברת גם כשהיא נחסמה
     מסיבה אחרת לגמרי. */
  for (const [what, m, path, body] of [
    ["יצירת צוות", "POST", "/api/students?action=team-admin", { name: "בדיקה — אסור", category: "ועדה" }],
    ["שיוך משימה", "POST", "/api/students?action=team-task", { teamId: "1", title: "בדיקה — אסור" }],
    ["שינוי תפקידים", "POST", "/api/students?action=role", { studentId: "1", roles: [] }],
    ["הצפה", "POST", "/api/students?action=duty-notes", { duty: "אחראי מטבח", title: "בדיקה — אסור" }],
  ]) {
    r = await call(A.j, m, path, body);
    ok(`נחסם: ${what}`, r.s === 403 && /צפייה בלבד/.test(r.b.error || ""),
      `${r.s} ${r.b.error || ""}`);
  }

  /* ============ 2 · מדריך — קריאה כן, כתיבה לא ============ */
  console.log("\n2 · מדריך — תקציב ושיעורים לקריאה");
  r = await call(N.j, "GET", "/api/kitchen?action=budget");
  ok("מדריך קורא את התקציב", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(N.j, "GET", "/api/lessons?action=list");
  ok("ומדריך קורא את הגיליונות", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("אבל canEdit=false", r.s === 200 && r.b.canEdit === false, String(r.b.canEdit));

  r = await call(N.j, "POST", "/api/lessons?action=list", { name: "בדיקה — אסור" });
  ok("וכתיבה לגיליונות נחסמת, עם שם מי כן רשאי",
    r.s === 403 && /אחראי הלו/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);

  r = await call(N.j, "POST", "/api/kitchen?action=budget", { date: "2026-09-01" });
  ok("וכתיבה לתקציב נחסמת, עם שם מי כן רשאי",
    r.s === 403 && /אחראי המטבח/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);

  /* ============ 3 · ראש המכינה כן ============ */
  console.log("\n3 · ראש המכינה — עורך");
  r = await call(D.j, "GET", "/api/lessons?action=list");
  ok("canEdit=true לראש המכינה", r.s === 200 && r.b.canEdit === true, String(r.b.canEdit));
  /* ⚠ לא כותבים באמת — מוודאים שהשער נפתח, ושהשגיאה (אם יש)
     אינה שגיאת הרשאה. גיליון בדיקה שנוצר כאן היה נשאר בלוח. */
  r = await call(D.j, "POST", "/api/lessons?action=list", {});
  ok("והשער נפתח לו (הכישלון אינו הרשאה)",
    r.s !== 403 || !/אחראי הלו/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);

  /* ============ 4 · "כבר נרשמת" ============ */
  console.log("\n4 · מי שכבר נרשם");
  const code = cv(dani, AUTH_COLS.code);
  const F = jar();
  r = await call(F, "POST", "/api/auth?action=signin", { user: code, password: code });
  ok("קוד בשני השדות למי שכבר נרשם — 409 ולא הודעה גנרית",
    r.s === 409 && /כבר נרשמת/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);

  /* ⚠ והכלל הכללי לא נשבר: שם משתמש שגוי מקבל את אותה הודעה
     גנרית כמו תמיד, ולא רמז על קיום החשבון. */
  const G = jar();
  r = await call(G, "POST", "/api/auth?action=signin", { user: "לאקיים123", password: "לאקיים123" });
  ok("ושם שאינו קיים מקבל את ההודעה הגנרית",
    r.s === 401 && !/כבר נרשמת/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);

} catch (e) {
  console.error("\nנפילה:", e.message);
  fail++;
} finally {
  for (const reg of regs) await reg.restore().catch(() => {});
  invalidate("auth-rows");
  console.log("\nהזהויות הזמניות שוחזרו");
}

console.log(`\n${pass} עברו · ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
