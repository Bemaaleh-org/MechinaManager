/* ============================================================
   בדיקת האצווה: מיקום משרדים · תשלום וסיכום באירוח ·
   החזרה חלקית בהשאלות · פיקוד/קצונה והוספת זרוע בבוגרים.

   ⚠ הבדיקה יוצרת את השורות שלה ומוחקת אותן בסוף. אין נגיעה
     בשורות קיימות — זו הייתה תקלה בסשן קודם.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";

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

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const code = (t) => cv(us.find((x) => x.name.includes(t)), AUTH_COLS.code);

/* ⚠ מנהל שטרם בחר שם וסיסמה חסום בכל נקודות הקצה מאז שנוספה
   ההרשמה. הרישום כאן זמני, הסיסמה שנוצרת אינה קיימת, והשחזור
   בסוף חובה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("דני לויט", "רועי", "נעם");
const D = jar();  await call(D, "POST", "/api/auth?action=login", { code: code("דני לויט") });
const R = jar();  await call(R, "POST", "/api/auth?action=login", { code: code("רועי") });

/* ============ 1 · מיקום "משרדים" ============ */
console.log("=== תקלות: מיקום משרדים ===");
const { FAULT_PLACE } = await import("../../shared/faults-board.js");
ok("\"משרדים\" ברשימה", FAULT_PLACE.includes("משרדים"), FAULT_PLACE.join(" · "));
let r = await call(D, "POST", "/api/students?action=faults",
  { title: "בדיקה — משרדים", place: "משרדים", urgency: "רגיל" });
ok("השרת מקבל אותו", r.s === 200, `${r.s} ${r.b.error || ""}`);
const faultId = r.b.id;
if (faultId) {
  const f = await call(D, "GET", "/api/students?action=faults");
  const mine = (f.b.faults || []).find((x) => x.id === faultId);
  ok("ונשמר בלוח", mine?.place === "משרדים", mine?.place);
  await call(D, "DELETE", "/api/students?action=faults", { id: faultId });
}

/* ============ 2 · אירוח: תשלום וסכימה ============ */
console.log("\n=== אירוח: תשלום וסיכום תקופתי ===");
const HOSTS = [
  { title: "בדיקה — קבוצה א", from: "2026-02-10", to: "2026-02-11", people: 30,
    paid: "בתשלום", amount: "4000", status: "התקיים", sleeping: "לנים" },
  { title: "בדיקה — קבוצה ב", from: "2026-02-20", people: 12,
    paid: "בתשלום", amount: "1500", status: "מאושר" },
  { title: "בדיקה — קבוצה ג", from: "2026-05-04", people: 40,
    paid: "ללא תשלום", status: "התקיים" },
];
const hIds = [];
for (const h of HOSTS) {
  const x = await call(D, "POST", "/api/students?action=hosting", h);
  if (x.s === 200) hIds.push(x.b.id); else ok("יצירת " + h.title, false, x.b.error);
}
ok("שלושה אירוחים נוצרו", hIds.length === 3);

r = await call(D, "GET", "/api/students?action=hosting");
const mineH = (r.b.hosting || []).filter((x) => hIds.includes(x.id));
ok("התשלום נשמר", mineH.find((x) => x.title.includes("קבוצה א"))?.paid === "בתשלום");
ok("הסכום נשמר", mineH.find((x) => x.title.includes("קבוצה א"))?.amount === 4000);

const feb = (r.b.periods.month || []).find((p) => p.key === "2026-02");
ok("סיכום חודשי — פברואר קיים", Boolean(feb), JSON.stringify(feb || null));
ok("  שתי קבוצות בפברואר", feb?.groups >= 2, String(feb?.groups));
ok("  סכום 5,500", feb?.amount >= 5500, String(feb?.amount));
/* ⚠ ההפרדה שנבדקת: 4,000 התקיים מול 1,500 שעדיין צפוי */
ok("  4,000 התקבל · 1,500 צפוי", feb?.earned >= 4000 && feb?.expected >= 1500,
  `earned=${feb?.earned} expected=${feb?.expected}`);

const q1 = (r.b.periods.quarter || []).find((p) => p.key === "2026-Q1");
ok("סיכום רבעוני — רבעון 1", Boolean(q1) && q1.amount >= 5500, JSON.stringify(q1 || null));
const q2 = (r.b.periods.quarter || []).find((p) => p.key === "2026-Q2");
ok("  מאי ברבעון 2 ולא ב-1", Boolean(q2) && q2.groups >= 1, String(q2?.groups));
const y = (r.b.periods.year || []).find((p) => p.key === "2026");
ok("סיכום שנתי — שלוש הקבוצות", Boolean(y) && y.groups >= 3, String(y?.groups));
ok("  קבוצה ללא תשלום אינה מוסיפה כסף", y?.amount >= 5500 && y?.amount < 5500 + 1,
  String(y?.amount));

/* ============ 3 · השאלה עם החזרה חלקית ============ */
console.log("\n=== השאלות: פריטים והחזרה חלקית ===");
r = await call(D, "POST", "/api/container?action=loans", {
  title: "בדיקה — אוהלים", party: "בית ספר", direction: "הושאל מאיתנו",
  due: "2026-09-01",
  items: [
    { name: "כיסאות פלסטיק", qty: 20, unit: "", back: 0 },
    { name: "שולחנות", qty: 4, unit: "", back: 0 },
    { name: "מקרן", qty: 1, unit: "יח׳", back: 0 },
  ],
});
ok("השאלה עם שלושה פריטים נוצרה", r.s === 200, r.b.error);
const loanId = r.b.id;

const readLoan = async () => {
  const g = await call(D, "GET", "/api/container?action=loans");
  return (g.b.loans || []).find((x) => x.id === loanId);
};
let L = await readLoan();
ok("שלושה פריטים חזרו מהלוח", L?.items?.length === 3, JSON.stringify(L?.items));
ok("25 יחידות בסך הכול", L?.totals?.out === 25, JSON.stringify(L?.totals));
ok("המצב \"בחוץ\"", L?.state === "בחוץ", L?.state);

/* --- החזרה חלקית --- */
r = await call(D, "PUT", "/api/container?action=loans", {
  id: loanId,
  items: [
    { name: "כיסאות פלסטיק", qty: 20, unit: "", back: 15 },
    { name: "שולחנות", qty: 4, unit: "", back: 4 },
    { name: "מקרן", qty: 1, unit: "יח׳", back: 0 },
  ],
});
ok("החזרה חלקית נשמרה", r.s === 200, r.b.error);
L = await readLoan();
ok("המצב \"חזר חלקית\"", L?.state === "חזר חלקית", L?.state);
ok("19 חזרו · 6 בחוץ", L?.totals?.back === 19 && L?.totals?.left === 6, JSON.stringify(L?.totals));
ok("ההשאלה עדיין פתוחה", !L?.back, String(L?.back));

/* --- החזרה מלאה סוגרת בתאריך --- */
r = await call(D, "PUT", "/api/container?action=loans", {
  id: loanId,
  items: [
    { name: "כיסאות פלסטיק", qty: 20, unit: "", back: 20 },
    { name: "שולחנות", qty: 4, unit: "", back: 4 },
    { name: "מקרן", qty: 1, unit: "יח׳", back: 1 },
  ],
});
L = await readLoan();
ok("החזרה מלאה — המצב \"הוחזר\"", L?.state === "הוחזר", L?.state);
ok("  ותאריך הסגירה נחתם מעצמו", Boolean(L?.back), String(L?.back));

/* --- תיקון לאחור מנקה את התאריך --- */
await call(D, "PUT", "/api/container?action=loans", {
  id: loanId,
  items: [{ name: "כיסאות פלסטיק", qty: 20, unit: "", back: 20 },
    { name: "שולחנות", qty: 4, unit: "", back: 4 },
    { name: "מקרן", qty: 1, unit: "יח׳", back: 0 }],
});
L = await readLoan();
ok("תיקון לאחור מוחק את תאריך הסגירה", !L?.back, String(L?.back));

/* --- החזרה גדולה מהכמות נדחית --- */
r = await call(D, "PUT", "/api/container?action=loans", {
  id: loanId, items: [{ name: "מקרן", qty: 1, unit: "", back: 5 }],
});
ok("החזרה גדולה מהכמות נדחית", r.s === 400, `${r.s} ${r.b.error || ""}`);

/* ============ 4 · בוגרים ============ */
console.log("\n=== בוגרים ===");
r = await call(D, "GET", "/api/students?action=alumni");
const A = r.b;
ok("הזרועות מהלוח", (A.branches || []).includes("גדודי חי״ר") &&
  A.branches.includes("סיירות חי״ר וקומנדו") && A.branches.includes("יחידות מובחרות") &&
  A.branches.includes("הדרכה"), (A.branches || []).join(" · "));
ok("כולם משויכים למחזור", (A.byCycle || []).every((c) => c.key !== "לא ידוע"),
  (A.byCycle || []).map((c) => `${c.key}:${c.n}`).join(" "));
ok("רוני סער בהדרכה", A.alumni.find((x) => x.name === "רוני סער")?.branch === "הדרכה");
ok("סיון יקיר בהדרכה", A.alumni.find((x) => x.name === "סיון יקיר")?.branch === "הדרכה");
ok("ליאור חניה בשריון", A.alumni.find((x) => x.name === "ליאור חניה")?.branch === "שריון");
ok("זהר שורק בחיל האוויר", A.alumni.find((x) => x.name === "זהר שורק")?.branch === "חיל האוויר");

/* --- בוגר בדיקה עם פיקוד וקצונה --- */
r = await call(D, "POST", "/api/students?action=alumni",
  { name: "בדיקה — בוגר", cycle: "מחזור א׳", branch: "גדודי חי״ר", command: "כן", officer: "לא" });
ok("בוגר בדיקה נוצר", r.s === 200, r.b.error);
const alumId = r.b.id;
r = await call(D, "GET", "/api/students?action=alumni");
const mineA = r.b.alumni.find((x) => x.id === alumId);
ok("פיקוד נשמר", mineA?.command === "כן", mineA?.command);
ok("קצונה נשמרה", mineA?.officer === "לא", mineA?.officer);
ok("הסטטיסטיקה סופרת אותו", r.b.command.asked >= 1 && r.b.command.yes >= 1,
  JSON.stringify(r.b.command));
/* ⚠ המכנה הוא מי שנשאל בלבד */
ok("המכנה = מי שנשאל, לא כולם", r.b.command.asked < r.b.count,
  `asked=${r.b.command.asked} count=${r.b.count}`);

/* --- הוספת סוג תפקיד ---
   ⚠ isManager פירושו כל כניסת צוות, ולכן שירה ונעם כן מוסיפות.
     מה שנבדק כאן הוא הגבול האמיתי: חניך לא מגיע למסך בכלל. */
const N = jar(); await call(N, "POST", "/api/auth?action=login", { code: code("נעם") });
r = await call(N, "PUT", "/api/students?action=alumni",
  { id: alumId, branch: "יחידות מובחרות" });
ok("איש צוות מעדכן זרוע", r.s === 200, `${r.s} ${r.b.error || ""}`);

const { MECHINA_BOARDS: MBb, MECHINA_COLS: MCb } = await import("../../shared/mechina-boards.js");
const rost = (await gql(`{ boards(ids:[${MBb.roster}]){ items_page(limit:100){items{id name column_values(ids:["${MCb.roster.tz}","${MCb.roster.active}"]){id text}}} } }`))
  .boards[0].items_page.items.filter((x) => cv(x, MCb.roster.tz) && cv(x, MCb.roster.active) === "v");
const S = jar();
await call(S, "POST", "/api/students?action=login", { tz: cv(rost[0], MCb.roster.tz) });
r = await call(S, "GET", "/api/students?action=alumni");
ok("חניך אינו מגיע למסך הבוגרים כלל", r.s === 403, `${r.s} ${r.b.error || ""}`);
r = await call(D, "PUT", "/api/students?action=alumni",
  { id: alumId, branch: "מגן דוד אדום — בדיקה" });
ok("מנהל מוסיף סוג חדש", r.s === 200, r.b.error);
r = await call(D, "GET", "/api/students?action=alumni");
ok("  והוא ברשימה מעכשיו", (r.b.branches || []).includes("מגן דוד אדום — בדיקה"));

/* ============ ניקוי ============ */
console.log("\n=== ניקוי ===");
for (const id of hIds) await call(D, "DELETE", "/api/students?action=hosting", { id });
if (loanId) await call(D, "DELETE", "/api/container?action=loans", { id: loanId });
if (alumId) await gql(`mutation{ delete_item(item_id:${Number(alumId)}){ id } }`);
/* ⚠ התווית "מגן דוד אדום — בדיקה" נשארת בלוח; מוחקים אותה ביד
   בלוח מונדיי. אין API למחיקת תווית בודדת. */
r = await call(D, "GET", "/api/students?action=hosting");
ok("האירוחים נוקו", !(r.b.hosting || []).some((x) => hIds.includes(x.id)));
r = await call(D, "GET", "/api/container?action=loans");
ok("ההשאלה נוקתה", !(r.b.loans || []).some((x) => x.id === loanId));
/* ⚠ נקרא ישירות מהלוח ולא דרך ה-API: המחיקה נעשתה ב-gql
   ולא דרך המסלול, ולכן המטמון עדיין מחזיק את השורה. */
const { loadAlumni } = await import("../../api/_alumni.js");
const fresh = await loadAlumni({ force: true });
ok("בוגר הבדיקה נוקה מהלוח", fresh.length === 24 && !fresh.some((x) => x.id === alumId),
  `${fresh.length} בוגרים`);

/* ============================================================
   ⚠⚠ **הסיכום בסדר המילים שהמריץ מנתח, והיציאה בקוד שגיאה.**

   שמונה חבילות הדפיסו "עברו N · נכשלו M" — סדר הפוך לזה
   ש-`run.mjs` מחפש — **ולא יצאו בקוד שגיאה**. התוצאה הייתה
   כפולה וגרועה משתי הסיבות בנפרד:

     · הטענות שלהן לא נספרו בסך הכול בכלל.
     · וטענה שנכשלה בהן הוצגה כ-V ירוק, כי המריץ קובע
       לפי קוד היציאה בלבד.

   כלומר "423 טענות עברו" היה מספר של שתים־עשרה חבילות, ושמונה
   חבילות יכלו להיכשל בלי שאיש יראה. זה בדיוק סוג הכשל שהבדיקות
   קיימות כדי למנוע.
   ============================================================ */
console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);

await reg.restore();
