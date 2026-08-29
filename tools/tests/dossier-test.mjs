/* ============================================================
   התיק המלא של החניך · הרשאות ראש מכינה לאחים

   ⚠ הבדיקה אינה כותבת דבר. היא קוראת בלבד, ומשחזרת את
     הרישום הזמני שהיא צריכה כדי להיכנס.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS, STAFF_ROLE } from "../../shared/auth-board.js";
import { activeStudents } from "../../api/_student-rows.js";

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

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}","${AUTH_COLS.role}"]){id text}}} } }`))
  .boards[0].items_page.items;
const row = (t) => us.find((x) => x.name.includes(t));
const code = (t) => cv(row(t), AUTH_COLS.code);

/* ============ 1 · אחים הוא ראש מכינה בלוח ============ */
console.log("=== התפקיד בלוח ===");
/* ⚠ ההרשאה יושבת בעמודה ולא בקוד — עיקרון 1. */
ok("אחים מסומן ראש מכינה", cv(row("אחים"), AUTH_COLS.role) === STAFF_ROLE.head,
  cv(row("אחים"), AUTH_COLS.role));
ok("ודני נשאר ראש מכינה", cv(row("דני"), AUTH_COLS.role) === STAFF_ROLE.head,
  cv(row("דני"), AUTH_COLS.role));
/* ⚠ ומי שאינו — לא. אחרת הבדיקה הייתה עוברת גם אילו כולם
   סומנו ראשי מכינה. */
ok("ורועי אינו", cv(row("רועי"), AUTH_COLS.role) !== STAFF_ROLE.head,
  cv(row("רועי"), AUTH_COLS.role) || "ריק");

const reg = await tempRegister("אחים", "רועי", "דני לויט");
const A = jar(), R = jar(), D = jar();

try {
  await call(A, "POST", "/api/auth?action=login", { code: code("אחים") });
  await call(R, "POST", "/api/auth?action=login", { code: code("רועי") });
  await call(D, "POST", "/api/auth?action=login", { code: code("דני לויט") });

  console.log("=== isHead בסשן ===");
  let r = await call(A, "GET", "/api/auth?action=me");
  ok("אחים נכנס כראש מכינה", r.b.isHead === true, String(r.b.isHead));
  r = await call(D, "GET", "/api/auth?action=me");
  ok("ודני כמו קודם", r.b.isHead === true, String(r.b.isHead));
  r = await call(R, "GET", "/api/auth?action=me");
  ok("ורועי לא", r.b.isHead !== true, String(r.b.isHead));

  console.log("=== ניהול מחזורים ===");
  r = await call(A, "GET", "/api/students?action=cycles");
  ok("אחים רואה מחזורים", r.s === 200, `${r.s} ${r.b.error || ""}`);
  /* ⚠ העיקר: מנהל שאינו ראש מכינה עדיין נחסם. אם גם רועי היה
     עובר, הבדיקה לא הייתה בודקת כלום. */
  r = await call(R, "GET", "/api/students?action=cycles");
  ok("ורועי נחסם", r.s === 403, `${r.s}`);

  r = await call(A, "POST", "/api/students?action=cycles", {});
  ok("אחים מגיע לאימות הקלט ולא לחומה", r.s === 400, `${r.s} ${r.b.error || ""}`);
  r = await call(R, "POST", "/api/students?action=cycles", {});
  ok("ורועי נעצר בחומה", r.s === 403, `${r.s}`);

  r = await call(A, "GET", "/api/students?action=import&cycleId=x&step=students");
  ok("וגם ייבוא מחזור פתוח לאחים", r.s !== 403, `${r.s}`);
  r = await call(R, "GET", "/api/students?action=import&cycleId=x&step=students");
  ok("ולרועי לא", r.s === 403, `${r.s}`);

  /* ============ 2 · התיק המלא ============ */
  console.log("=== התיק של החניך ===");
  const st = (await activeStudents())[0];
  r = await call(A, "GET", "/api/students?action=profile&student=" + st.id);
  ok("הפרופיל נקרא", r.s === 200, `${r.s} ${r.b.error || ""}`);
  const f = r.b.staff;
  ok("ויש בו בלוק צוות", Boolean(f));
  ok("עם קבוצה ומדריך", Boolean(f.group && f.guide), `${f.group} · ${f.guide}`);
  ok("עם מין ותאריך לידה", Boolean(f.gender && f.dob), `${f.gender} · ${f.dob}`);
  ok("עם תעודת זהות", Boolean(f.tz));
  ok("עם מצב הרשמה", f.account && typeof f.account.registered === "boolean",
    String(f.account?.registered));
  /* ⚠ הסיסמה והגיבוב לעולם אינם יוצאים מהשרת. */
  const blob = JSON.stringify(r.b);
  ok("ובלי סיסמה או גיבוב", !blob.includes("hash") && !blob.includes("\"pass\""));
  ok("עם רשימת שיבוצים", Array.isArray(f.placements), `${f.placements?.length} שיבוצים`);
  ok("עם בקשות יציאה", Array.isArray(f.requests), `${f.requests?.length} בקשות`);
  ok("עם שבועות הובלה", Array.isArray(f.weeks), `${f.weeks?.length} שבועות`);
  ok("ובלי מקור שנכשל", f.partial === null, JSON.stringify(f.partial));

  /* ⚠ שיבוץ נושא את שם ההגדרה ואת הקטגוריה, אחרת המסך מציג
     מזהה. */
  if (f.placements.length) {
    const p0 = f.placements[0];
    ok("ולשיבוץ יש שם וקטגוריה", Boolean(p0.name && p0.category),
      `${p0.category}: ${p0.name}`);
  }

  /* ---- מדריך שאינו של החניך רואה גם הוא ---- */
  r = await call(R, "GET", "/api/students?action=profile&student=" + st.id);
  ok("גם מנהל רגיל רואה את התיק", r.s === 200 && Boolean(r.b.staff), `${r.s}`);
  /* ⚠ אבל אינו עורך את תאריכי השיחה — זה נשאר של המדריך. */
  ok("אך לא עורך תאריכי שיחה", r.b.canEditTalks === false, String(r.b.canEditTalks));

  /* ---- בלי סשן ---- */
  r = await call(jar(), "GET", "/api/students?action=profile&student=" + st.id);
  ok("ובלי כניסה — כלום", r.s === 401, `${r.s}`);
} finally {
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
