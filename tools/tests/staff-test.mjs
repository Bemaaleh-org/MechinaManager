/* ============================================================
   הרשמת מנהל: קוד → בחירת שם וסיסמה → כניסה רגילה

   ⚠ הבדיקה מצלמת את שורת המנהל לפני ומשחזרת אותה בסוף, כולל
     במקרה של כשל. אסור שתישאר סיסמת בדיקה על חשבון של מנהל.

   ⚠ נבחר "אחים — פיתוח" ולא ראש המכינה: אם משהו כאן ידלוף
     למרות השחזור, שיהיה על חשבון הפיתוח ולא על החשבון עם
     ההרשאות הרחבות ביותר.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { identities, writeIdentity, isFresh } from "../../api/_identity.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 200) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const WHO = "אחים";
const USER = "bdika.menahel";
const PASS = "Bdika-Menahel-2026!";
const MAIL = "bdika.menahel@example.invalid";

const row = (await identities()).find((r) => r.kind === "staff" && r.name.includes(WHO));
if (!row) { console.log("לא נמצאה שורת המנהל"); process.exit(1); }
const before = { user: row.user || "", hash: row.hash || "", email: row.email || "", setAt: row.setAt || "", reset: row.reset || "" };
console.log(`נבדק: ${row.name}`);

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const CODE = cv(us.find((x) => String(x.id) === row.id), AUTH_COLS.code);

try {
  /* ---- מצב פתיחה ---- */
  await writeIdentity(row, { user: "", hash: "", email: "", setAt: "" });
  ok("המנהל מתחיל בלי זהות", isFresh((await identities()).find((r) => r.id === row.id)));

  /* ============ 1 · קוד → מצב הרשמה ============ */
  console.log("=== כניסה עם הקוד ===");
  const J = jar();
  let r = await call(J, "POST", "/api/auth?action=login", { code: CODE });
  ok("הקוד מתקבל", r.s === 200, `${r.s} ${r.b.error || ""}`);
  /* ⚠ העיקר: הקוד אינו מכניס למערכת אלא להרשמה. */
  ok("והוא מוביל להרשמה ולא למערכת", r.b.setup === true, JSON.stringify(r.b.setup));

  /* ⚠ ובאמת חסום. מסך שמונע ניווט הוא הצעה; שרת שחוסם הוא הבטחה. */
  r = await call(J, "GET", "/api/kitchen?action=equip&area=אוכל");
  ok("ולפני ההרשמה הכול חסום", r.s === 403, `${r.s}`);
  r = await call(J, "GET", "/api/students?action=list");
  ok("גם מסך החניכים", r.s === 403, `${r.s}`);

  /* ============ 2 · ההרשמה ============ */
  console.log("=== בחירת שם וסיסמה ===");
  r = await call(J, "POST", "/api/auth?action=account", { user: USER, password: "123", email: MAIL });
  ok("סיסמה קצרה נדחית", r.s === 400, `${r.s} ${r.b.error || ""}`);
  /* ⚠ האימייל חובה — בלעדיו איפוס סיסמה דורש אדם זמין עם קוד. */
  r = await call(J, "POST", "/api/auth?action=account", { user: USER, password: PASS });
  ok("בלי אימייל נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);
  r = await call(J, "POST", "/api/auth?action=account", { user: USER, password: PASS, email: "לא-מייל" });
  ok("אימייל פסול נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  r = await call(J, "POST", "/api/auth?action=account", { user: USER, password: PASS, email: MAIL });
  ok("הרשמה תקינה עוברת", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ============ 3 · אחרי ההרשמה ============ */
  console.log("=== אחרי ההרשמה ===");
  r = await call(J, "GET", "/api/kitchen?action=equip&area=אוכל");
  ok("החסימה הוסרה", r.s === 200, `${r.s} ${r.b.error || ""}`);

  const K = jar();
  r = await call(K, "POST", "/api/auth?action=signin", { user: USER, password: PASS });
  ok("כניסה עם שם משתמש וסיסמה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("והיא כבר לא במצב הרשמה", !r.b.setup, JSON.stringify(r.b.setup));
  /* ⚠ מנהל שנרשם חייב לקבל את ההרשאות שלו, ולא סשן חניך. */
  r = await call(K, "GET", "/api/auth?action=me");
  ok("והוא מזוהה כצוות", r.b.isManager === true, JSON.stringify(r.b.isManager));

  const L = jar();
  r = await call(L, "POST", "/api/auth?action=signin", { user: MAIL, password: PASS });
  ok("וגם עם האימייל", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(jar(), "POST", "/api/auth?action=signin", { user: USER, password: PASS + "x" });
  ok("סיסמה שגויה נדחית", r.s === 401, `${r.s}`);

  /* ⚠ הקוד ממשיך לעבוד, אבל כבר לא כהרשמה — אחרת מי שיודע את
     הקוד היה יכול לאפס את הזהות של מנהל רשום. */
  const M = jar();
  r = await call(M, "POST", "/api/auth?action=login", { code: CODE });
  ok("הקוד עדיין נכנס", r.s === 200, `${r.s}`);
  ok("אבל כבר לא כהרשמה", !r.b.setup, JSON.stringify(r.b.setup));

  /* ⚠ הסיסמה עצמה לעולם אינה חוזרת מהשרת. */
  r = await call(K, "GET", "/api/auth?action=account");
  const blob = JSON.stringify(r.b);
  ok("הפרופיל אינו מחזיר סיסמה", !blob.includes(PASS) && !blob.includes("hash"), blob.slice(0, 90));
} finally {
  await writeIdentity(row, before);
  const after = (await identities()).find((r) => r.id === row.id);
  console.log(isFresh(after) === isFresh({ user: before.user, hash: before.hash })
    ? "  (שורת המנהל שוחזרה)" : "  !! השחזור נכשל — להריץ scratchpad/unregister.mjs");
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
