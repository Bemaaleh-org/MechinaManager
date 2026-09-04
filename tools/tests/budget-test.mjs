/* ============================================================
   תקציב — קנייה שמתחלקת על חודשים שנבחרו
   ------------------------------------------------------------
   ⚠ החלק הראשון הוא חישוב טהור ואינו נוגע בלוח בכלל.
   ⚠ החלק השני יוצר קנייה משלו ומוחק אותה **לפי המזהה שחזר
     מהיצירה**, ואינו נוגע באף קנייה אמיתית.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import {
  BUDGET_BOARDS as B, BUDGET_COLS as C,
} from "../../shared/budget-ids.js";
import {
  orderMonths, orderShareFor, monthsOf, consecutiveMonths, ORDER_KIND,
} from "../../shared/budget-boards.js";

const SRV = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(SRV + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 250) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ============ 1 · החישוב ============ */
console.log("=== חלוקה לחודשים ===");

const q = (o) => ({ kind: ORDER_KIND.quarterly, amount: 900, ...o });

ok("רשימה מפורשת נקראת כמות שהיא",
  orderMonths(q({ months: "2026-09,2026-11" })).join(",") === "2026-09,2026-11");

/* ⚠ הכלל המרכזי: מחלקים במספר שנבחר בפועל ולא ב-3 קבוע. */
ok("שני חודשים = חצי בכל אחד",
  orderShareFor(q({ months: "2026-09,2026-11" }), "2026-09") === 450);
ok("וחודש שלא נבחר מקבל אפס",
  orderShareFor(q({ months: "2026-09,2026-11" }), "2026-10") === 0);
ok("ארבעה חודשים = רבע בכל אחד",
  orderShareFor(q({ months: "2026-09,2026-10,2026-11,2026-12" }), "2026-12") === 225);
ok("וחודש אחד = הכול בו",
  orderShareFor(q({ months: "2026-09" }), "2026-09") === 900);

/* ⚠ שורה ישנה בלי רשימה ממשיכה לעבוד בדיוק כמו קודם. */
ok("שורה ישנה נופלת לשלושה רצופים",
  orderMonths(q({ startMonth: "2026-09" })).join(",") === "2026-09,2026-10,2026-11");
ok("והחלוקה שם נשארת שליש",
  orderShareFor(q({ startMonth: "2026-09" }), "2026-10") === 300);
ok("רשימה גוברת על חודש הפתיחה",
  orderMonths(q({ startMonth: "2026-01", months: "2026-09" })).join(",") === "2026-09");

/* ⚠ ערך פסול מסונן ואינו מפיל את הטבלה. */
ok("חודש בפורמט שגוי מסונן",
  orderMonths(q({ startMonth: "2026-09", months: "2026-9,ספטמבר,2026-13,2026-10" }))
    .join(",") === "2026-10");
ok("ורשימה שכולה פסולה נופלת לאחור",
  orderMonths(q({ startMonth: "2026-09", months: "בלה,בלה" })).join(",")
    === "2026-09,2026-10,2026-11");
ok("כפילות אינה מכפילה את המכנה",
  orderShareFor(q({ months: "2026-09,2026-09" }), "2026-09") === 900);

/* ⚠ שבועית לא הושפעה בכלל. */
const w = { kind: ORDER_KIND.weekly, amount: 500, date: "2026-09-15" };
ok("שבועית נזקפת כולה לחודש שלה", orderShareFor(w, "2026-09") === 500);
ok("ולא לחודש אחר", orderShareFor(w, "2026-10") === 0);
ok("ו-monthsOf שלה הוא חודש התאריך", monthsOf(w).join(",") === "2026-09");

ok("consecutiveMonths עם ספירה אחרת",
  consecutiveMonths("2026-11", 3).join(",") === "2026-11,2026-12,2027-01");
ok("וחודש ריק מחזיר רשימה ריקה", consecutiveMonths("").length === 0);

/* ============ 2 · מול השרת ============ */
console.log("\n=== יצירת קנייה ===");

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

const NAME = "בדיקה — קנייה זמנית";
let madeId = null;
const cleanup = async () => {
  /* ⚠ לפי מזהה, ולא לפי סינון על שם. */
  if (!madeId) return;
  try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: madeId }); } catch { /* כבר נמחק */ }
};

try {
  r = await call(M, "POST", "/api/kitchen?action=budget",
    { name: NAME, amount: 900, kind: ORDER_KIND.quarterly, months: [] });
  ok("קנייה בלי חודשים נדחית",
    r.s === 400 && /לפחות חודש אחד/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);

  r = await call(M, "POST", "/api/kitchen?action=budget",
    { name: NAME, amount: 900, kind: ORDER_KIND.quarterly, months: ["2026-9", "בלה"] });
  ok("וחודשים פסולים בלבד נדחים גם הם", r.s === 400, `${r.s} ${r.b.error || ""}`);

  r = await call(M, "POST", "/api/kitchen?action=budget",
    { name: NAME, amount: 900, kind: ORDER_KIND.quarterly,
      months: ["2026-11", "2026-09"], note: "בדיקה אוטומטית" });
  ok("קנייה על שני חודשים נשמרת", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("והתשובה מחזירה את שניהם ממוינים",
    (r.b.months || []).join(",") === "2026-09,2026-11", (r.b.months || []).join(","));

  const rows = await allItems(B.orders);
  const row = rows.find((x) => String(x.name || "").trim() === NAME);
  ok("השורה בלוח", Boolean(row));
  if (row) {
    madeId = String(row.id);
    ok("ובעמודת החודשים מה שנבחר",
      cv(row, C.orders.months) === "2026-09,2026-11", cv(row, C.orders.months));
    /* ⚠ חודש הפתיחה נשמר, כי שורות ישנות נשענות עליו והוא מה
       שמסדר את הרשימה. */
    ok("וחודש הפתיחה הוא המוקדם שנבחר",
      cv(row, C.orders.startMonth) === "2026-09", cv(row, C.orders.startMonth));
  }

  console.log("\n=== ניקוי ===");
  await cleanup();
  const left = (await allItems(B.orders)).filter((x) => String(x.name || "").includes("בדיקה"));
  ok("קניית הבדיקה נמחקה", left.length === 0, left.map((x) => x.name).join(", "));
  madeId = null;
} finally {
  await cleanup();
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
