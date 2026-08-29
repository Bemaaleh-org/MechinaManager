/* ============================================================
   מחיר ליחידה · המרת ירקות לק״ג · שווי מלאי

   ⚠ הבדיקה יוצרת פריט משלה ומוחקת אותו בסוף. אין נגיעה
     בפריטי המטבח האמיתיים.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { kgPerUnit, unitsToKg, kgToUnits, lineCost, produceList, isProduce } from "../../shared/produce.js";
import { KITCHEN_COLS } from "../../shared/kitchen-ids.js";
import { tempRegister } from "./_auth.mjs";

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

/* ============ 1 · טבלת ההמרה ============ */
console.log("=== טבלת ההמרה ===");
ok("עגבנייה מזוהה", kgPerUnit("עגבנייה") === 0.12, String(kgPerUnit("עגבנייה")));
/* ⚠ הריבוי הוא המקרה האמיתי: בלוח כתוב "עגבניות", לא "עגבנייה". */
ok("וגם ברבים — עגבניות", kgPerUnit("עגבניות") === 0.12, String(kgPerUnit("עגבניות")));
ok("וגם בלי יוד כפולה", kgPerUnit("עגבניה") === 0.12, String(kgPerUnit("עגבניה")));
/* ⚠ אות סופית מתחלפת ברבים — ן הופכת ל-נ. זה הכשיל את הגרסה
   הראשונה, ולכן יש כאן בדיקה משלו. */
ok("מלפפון ומלפפונים — אותו משקל",
  kgPerUnit("מלפפון") === 0.11 && kgPerUnit("מלפפונים") === 0.11,
  `${kgPerUnit("מלפפון")} / ${kgPerUnit("מלפפונים")}`);
/* ⚠ העיקר: שרי אינה עגבנייה רגילה. פי עשרה בהזמנת ירקות. */
ok("עגבניות שרי נבדלות", kgPerUnit("עגבניות שרי") === 0.012, String(kgPerUnit("עגבניות שרי")));
ok("ו\"עגבניות\" לבדן אינן נתפסות כשרי", kgPerUnit("עגבניות") !== 0.012);
ok("בצל ירוק נבדל מבצל",
  kgPerUnit("בצל") === 0.15 && kgPerUnit("בצל ירוק") === 0.02,
  `${kgPerUnit("בצל")} / ${kgPerUnit("בצל ירוק")}`);
ok("תפוחי אדמה = תפוח אדמה", kgPerUnit("תפוחי אדמה") === 0.17, String(kgPerUnit("תפוחי אדמה")));
ok("ותפוחים לבדם הם הפרי", kgPerUnit("תפוחים") === 0.18, String(kgPerUnit("תפוחים")));
/* ⚠ null ולא 0. פריט שאינו ברשימה אינו שוקל אפס. */
ok("סוכר אינו ירק", kgPerUnit("סוכר") === null && !isProduce("סוכר"));
ok("וקמח גם לא", kgPerUnit("קמח") === null);
ok("שם ריק אינו מפיל", kgPerUnit("") === null && kgPerUnit(null) === null);
ok("הטבלה מלאה", produceList().length >= 40, `${produceList().length} פריטים`);

console.log("=== חישוב ===");
ok("12 עגבניות ≈ 1.44 ק״ג", unitsToKg(12, "עגבניות") === 1.44, String(unitsToKg(12, "עגבניות")));
ok("5 ק״ג תפוחים ≈ 28 יחידות", kgToUnits(5, "תפוחים") === 28, String(kgToUnits(5, "תפוחים")));
/* ⚠ ערך מהלוח גובר על הטבלה — עיקרון 1. */
ok("ק״ג ליחידה מהלוח גובר", unitsToKg(10, "עגבניות", 0.2) === 2, String(unitsToKg(10, "עגבניות", 0.2)));
ok("אפס יחידות אינו אפס ק״ג אלא null", unitsToKg(0, "עגבניות") === null);
ok("פריט לא מוכר מחזיר null", unitsToKg(10, "סוכר") === null);
ok("מחיר × כמות", lineCost(4.5, 10) === 45, String(lineCost(4.5, 10)));
ok("מחיר חסר → null ולא 0", lineCost(null, 10) === null && lineCost("", 10) === null);

/* ============ 2 · הלוח ============ */
console.log("=== עמודות הלוח ===");
const E = KITCHEN_COLS.equipment;
ok("קיימת עמודת מחיר", Boolean(E.price), E.price);
ok("וקיימת עמודת ק״ג ליחידה", Boolean(E.kgPer), E.kgPer);

/* ============ 3 · השרת ============ */
console.log("=== השרת ===");
const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const code = (t) => cv(us.find((x) => x.name.includes(t)), AUTH_COLS.code);
/* ⚠ מנהל שטרם נרשם חסום בכל נקודות הקצה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("דני לויט");
const D = jar(); await call(D, "POST", "/api/auth?action=login", { code: code("דני לויט") });

const NAME = "בדיקה — עגבניות מחיר";
let r = await call(D, "POST", "/api/kitchen?action=equip",
  { name: NAME, qty: "20", kind: "מתכלה", area: "אוכל", price: 6.5 });
ok("פריט עם מחיר נוצר", r.s === 200, `${r.s} ${r.b.error || ""}`);
const id = r.b.id;

try {
  r = await call(D, "GET", "/api/kitchen?action=equip&area=אוכל");
  const mine = (r.b.equipment || []).find((x) => x.id === id);
  ok("המחיר חוזר מהשרת", mine?.price === 6.5, String(mine?.price));
  /* ⚠ העיקר: השרת מחשב, לא הדפדפן. שני מסכים שמחשבים לבד
     מתפצלים ברגע שאחד מהם מסנן אחרת. */
  ok("והעלות מחושבת בשרת", mine?.cost === 130, String(mine?.cost));
  ok("ק״ג ליחידה הגיע מהטבלה", mine?.kgEach === 0.12 && mine?.kgSource === "table",
    `${mine?.kgEach} / ${mine?.kgSource}`);
  ok("וגם המשקל הכולל", mine?.kgTotal === 2.4, String(mine?.kgTotal));
  ok("יש שווי מלאי כולל", r.b.value && r.b.value.total > 0, JSON.stringify(r.b.value));
  /* ⚠ בלי זה, סכום חלקי נקרא כשווי המחסן כולו. */
  ok("והוא מדווח כמה פריטים בלי מחיר", r.b.value.unpriced > 0, String(r.b.value.unpriced));
  ok("וכמה כן נספרו", r.b.value.counted >= 1, String(r.b.value.counted));

  /* ---- ערך מהלוח גובר על הטבלה ---- */
  r = await call(D, "PUT", "/api/kitchen?action=equip", { itemId: id, kgPer: 0.3 });
  ok("עדכון ק״ג ליחידה עובר", r.s === 200, r.b.error);
  r = await call(D, "GET", "/api/kitchen?action=equip&area=אוכל");
  let m2 = (r.b.equipment || []).find((x) => x.id === id);
  ok("והוא גובר על הטבלה", m2?.kgEach === 0.3 && m2?.kgSource === "board",
    `${m2?.kgEach} / ${m2?.kgSource}`);
  ok("והמשקל הכולל השתנה בהתאם", m2?.kgTotal === 6, String(m2?.kgTotal));

  /* ---- ריק מנקה, ואינו אפס ---- */
  r = await call(D, "PUT", "/api/kitchen?action=equip", { itemId: id, price: "" });
  ok("מחרוזת ריקה מנקה מחיר", r.s === 200, r.b.error);
  r = await call(D, "GET", "/api/kitchen?action=equip&area=אוכל");
  m2 = (r.b.equipment || []).find((x) => x.id === id);
  ok("והמחיר חזר ל-null ולא ל-0", m2?.price === null, String(m2?.price));
  ok("ואין לו עלות", m2?.cost === null, String(m2?.cost));

  /* ---- קלט פסול ---- */
  r = await call(D, "PUT", "/api/kitchen?action=equip", { itemId: id, price: "בערך" });
  ok("מחיר לא מספרי נדחה", r.s === 400, `${r.s}`);
  r = await call(D, "PUT", "/api/kitchen?action=equip", { itemId: id, kgPer: -3 });
  ok("ק״ג שלילי נדחה", r.s === 400, `${r.s}`);
  /* ⚠ 0 הוא ערך חוקי — פריט שמקבלים בחינם. */
  r = await call(D, "PUT", "/api/kitchen?action=equip", { itemId: id, price: 0 });
  ok("אבל מחיר 0 מתקבל", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ---- החניך אינו רואה ---- */
  /* ⚠ המטבח סגור לחניך ללא תפקיד. אם זה ייפרץ, המחירים
     ייחשפו יחד עם כל השאר. */
  const S = jar();
  r = await call(S, "GET", "/api/kitchen?action=equip&area=אוכל");
  ok("בלי כניסה אין ציוד מטבח", r.s === 401, `${r.s}`);
} finally {
  if (id) {
    await call(D, "DELETE", "/api/kitchen?action=equip", { itemId: id });
    console.log("  (פריט הבדיקה נמחק)");
  }
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
