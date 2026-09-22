/* ============================================================
   מאגר אנשי המקצוע, ותקלה מול שדרוג
   ------------------------------------------------------------
     npm test -- pros

   ⚠⚠ **שני הכיוונים באותה הרצה:**
       · אב הבית/הצוות מנהל את המאגר
       · חניך רגיל נחסם — וההודעה אומרת מי כן רשאי

     הראשון לבדו היה נשאר ירוק גם אילו המאגר נפתח לכולם, ואלה
     פרטי קשר של אדם **מחוץ למכינה** (4כ, 5כו).

   ⚠ יוצרת שורה משלה ומוחקת אותה **לפי המזהה** שחזר מה-POST,
     ולא לפי סינון ערכים.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { PROFESSIONS, prosReady, PRO_BOARDS } from "../../shared/pros-board.js";
import { KINDS, FAULT_KIND, faultKindReady, isGear } from "../../shared/faults-board.js";

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
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";

if (!prosReady()) {
  console.log("✗ מאגר אנשי המקצוע טרם הוקם — npm run seed:pros");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}

const users = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name
       column_values(ids:["${AUTH_COLS.code}"]){ id text } } } } }`,
)).boards[0].items_page.items;
const dani = users.find((u) => u.name.includes("דני לויט"));

const made = [];
const cleanup = async () => {
  for (const id of made) {
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: id }); }
    catch { /* כבר נמחק */ }
  }
  made.length = 0;
};
let reg = null;
process.on("uncaughtException", async (e) => {
  console.error(e); await cleanup();
  if (reg) await reg.restore().catch(() => {});
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
});

try {
  reg = await tempRegister("דני לויט");
  const D = jar();
  let r = await call(D, "POST", "/api/auth?action=login", { code: cv(dani, AUTH_COLS.code) });
  ok("הצוות נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  console.log("\n1 · המאגר");
  r = await call(D, "GET", "/api/students?action=pros");
  ok("המאגר נטען", r.s === 200 && Array.isArray(r.b.pros), `${r.s} ${r.b.error || ""}`);
  /* ⚠ רשימת המקצועות מגיעה מהשרת ואינה מוקלדת במסך (4מד). */
  ok("ורשימת המקצועות מגיעה מהשרת",
    Array.isArray(r.b.professions) && r.b.professions.length === PROFESSIONS.length,
    `${(r.b.professions || []).length}/${PROFESSIONS.length}`);

  const NAME = "בדיקה — חשמלאי " + Date.now();
  r = await call(D, "POST", "/api/students?action=pros",
    { name: NAME, profession: "חשמלאי", phone: "050-0000000", notes: "בדיקה אוטומטית" });
  ok("איש מקצוע נוסף", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  const id = r.b.id;
  if (id) made.push(id);

  /* ⚠ שם כפול נחסם — שתי שורות לאותו אדם מפצלות את ההיסטוריה. */
  r = await call(D, "POST", "/api/students?action=pros", { name: NAME });
  ok("שם כפול נחסם", r.s === 409, `${r.s} ${r.b.error || ""}`);
  if (r.s === 200 && r.b.id) made.push(r.b.id);

  /* ⚠ מקצוע שאינו ברשימה נדחה ברעש ולא נכתב בשקט (4ט). */
  r = await call(D, "PUT", "/api/students?action=pros",
    { id, profession: "אסטרונאוט" });
  ok("מקצוע לא מוכר נדחה", r.s === 400 && /לא מוכר/.test(r.b.error || ""),
    `${r.s} ${r.b.error || ""}`);

  r = await call(D, "PUT", "/api/students?action=pros", { id, phone: "052-1111111" });
  ok("עריכה נשמרת", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(D, "GET", "/api/students?action=pros");
  let row = (r.b.pros || []).find((p) => p.id === id);
  ok("והשינוי חוזר", row && row.phone === "052-1111111", row ? row.phone : "—");
  ok("ופעיל כברירת מחדל", row && row.active === true, String(row && row.active));

  /* ============ 2 · מחיקה היא כיבוי ============ */
  console.log("\n2 · הוצאה מהרשימה ולא מחיקה");
  r = await call(D, "DELETE", "/api/students?action=pros", { id });
  ok("ההוצאה נשמרת", r.s === 200 && r.b.archived === true, `${r.s} ${r.b.error || ""}`);
  r = await call(D, "GET", "/api/students?action=pros");
  row = (r.b.pros || []).find((p) => p.id === id);
  /* ⚠⚠ **השורה עדיין שם.** מחיקה אמיתית הייתה מוחקת טלפון של
     מי שתיקן משהו לפני שנתיים — וזה בדיוק מה שמחפשים כשזה
     מתקלקל שוב. טענה על הסטטוס בלבד הייתה נשארת ירוקה גם
     אילו השורה נמחקה. */
  ok("והשורה נשארת במאגר, מכובה", Boolean(row) && row.active === false,
    row ? `active=${row.active}` : "נמחקה!");

  /* ============ 3 · חניך נחסם ============ */
  console.log("\n3 · חניך אינו מגיע למאגר");
  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin",
    { user: "bdika", password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, String(r.s));
  /* ⚠ חשבון הבדיקה נושא "אב בית" ולכן הוא **כן** רשאי — מה
     שנבדק כאן הוא שהשער קיים ושההודעה נכונה, ולכן הטענה היא
     על `mayPros` ישירות, בדפוס של chores-test (5כז). */
  const { mayPros } = await import("../../api/_pros.js");
  ok("צוות רשאי", mayPros({ isManager: true }) === true);
  ok("אב הבית רשאי", mayPros({ isStudent: true, isHouse: true }) === true);
  ok("וחניך רגיל אינו", mayPros({ isStudent: true }) === false);

  /* ============ 4 · תקלה, שדרוג, והמלצה על ציוד ============ */
  console.log("\n4 · שלושת סוגי הדיווח");
  ok("העמודה הוקמה", faultKindReady());
  /* ⚠ **"תקלה" ראשונה ונשארת ראשונה** — ריק בשורה נקרא כמוה,
     ו-40 השורות הישנות נשענות על זה. */
  ok("ושלושת הסוגים מוכרים",
    KINDS.length === 3 && KINDS[0] === FAULT_KIND.fault && isGear(FAULT_KIND.gear),
    KINDS.join(" · "));
  r = await call(D, "GET", "/api/students?action=faults");
  const faults = r.b.faults || [];
  ok("רשימת התקלות נטענת", r.s === 200 && faults.length > 0, `${r.s} ${faults.length}`);
  /* ⚠⚠ **ריק = "תקלה".** 40 השורות שנכתבו לפני שהעמודה נוספה
     חייבות להיקרא כתקלות, ולא כשורות בלי סוג — אחרת המספר
     שההבחנה קיימת בשבילו נמחק ביום שהיא נוספה. */
  ok("ולכל שורה יש סוג, וריק נקרא כתקלה",
    faults.every((x) => KINDS.includes(x.kind)),
    [...new Set(faults.map((x) => x.kind))].join(" · "));

  /* ============================================================
     ⚠⚠ **המלצה על ציוד — נשמרת בלי מיקום, ותקלה עדיין דורשת.**

     בקשת ראש המכינה (22.9.2026). שני הכיוונים באותה הרצה:
     הראשון לבדו היה נשאר ירוק גם אילו המיקום נפתח לכולם,
     והשני לבדו — גם אילו ההמלצה לא הייתה נשמרת כלל.
     ============================================================ */
  const GEAR = "בדיקה — מקרר " + Date.now();
  r = await call(D, "POST", "/api/students?action=faults",
    { title: GEAR, kind: FAULT_KIND.gear, desc: "בדיקה אוטומטית" });
  ok("המלצה על ציוד נשמרת בלי מיקום", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  if (r.b && r.b.id) made.push(String(r.b.id));

  r = await call(D, "GET", "/api/students?action=faults");
  const gearRow = (r.b.faults || []).find((x) => x.title === GEAR || x.name === GEAR);
  ok("והיא חוזרת עם הסוג הנכון", gearRow && gearRow.kind === FAULT_KIND.gear,
    gearRow ? gearRow.kind : "לא נמצאה");

  r = await call(D, "POST", "/api/students?action=faults",
    { title: "בדיקה — תקלה בלי מיקום " + Date.now(), kind: FAULT_KIND.fault });
  ok("ותקלה בלי מיקום עדיין נדחית",
    r.s === 400 && /מיקום/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);
  if (r.s === 200 && r.b.id) made.push(String(r.b.id));
} finally {
  await cleanup();
  if (reg) await reg.restore().catch(() => {});
  console.log("\n(נמחק מה שנוצר)");
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
