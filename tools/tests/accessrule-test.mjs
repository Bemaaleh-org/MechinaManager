/* ============================================================
   הרשאות מותאמות — מה שראש המכינה סוגר
   ------------------------------------------------------------
   ⚠⚠⚠ **זו התכונה המסוכנת ביותר שנוספה למאגר.** היא מוסיפה
     שער גלובלי ב-`withAuth` שיכול לדחות בקשות, ובאג בה נועל
     את המטבח באמצע שירות. לכן כל טענה כאן נבדקת **בשני
     הכיוונים**, ושלוש הטענות הקריטיות הן:

       1. **ההתאמה באמת חוסמת** — אחרת זה מסך שמשקר על
          אבטחה (5ד), והוא גרוע ממסך שלא קיים.
       2. **ההתאמה אינה מרחיבה** — "מלא" על מסך שהמערכת
          סוגרת אינו פותח אותו.
       3. **והסרתה מחזירה את המצב** — חסימה שנתקעת היא בדיוק
          התקלה שאין לה דרך יציאה.

   ⚠ **בלי `NEVER_BLOCKED` אין דרך חזרה.** הטענה שמי שחסום
     בכל מסך עדיין קורא `me` ו-`logout` היא מה שמפריד בין
     "נחסם" לבין "ננעל בחוץ".

   ⚠ **המטמון של חמש דקות נוגע גם לבדיקה.** `?action=access`
     טוען `force:true`, אבל `withAuth` קורא דרך המטמון —
     ולכן הבדיקה **ממתינה על תנאי** (שואלת את השרת עד שהוא
     רואה את השינוי) ולא על זמן. זה הכלל של "מטמון השרת
     יושב בתהליך אחר".

   ⚠ הבדיקה יוצרת את הנתונים שלה ומוחקת אותם לפי המזהים
     שחזרו מהיצירה, ומחזירה את הרישום ב-finally.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS, STAFF_ROLE, KIND } from "../../shared/auth-board.js";
import { ACCESS_BOARDS, accessReady } from "../../shared/access-ids.js";
import {
  levelFor, narrowedFor, narrower, subjectKey, parseSubject, SUBJECT,
  NEVER_BLOCKED, DEFAULT_LEVEL,
} from "../../shared/access-rules.js";
import { tempRegister } from "./_auth.mjs";

const B = "http://localhost:5173";
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 250) }; }
};

const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";

let pass = 0, fail = 0;
const ok = (t, c, d = "") => {
  if (c) { pass++; console.log("  V " + t + (d ? "  -> " + d : "")); }
  else { fail++; console.log("  X " + t + "  -> " + d); }
};

/* ============================================================
   1 · הכללים עצמם — טהור, בלי רשת
   ============================================================ */
console.log("\n=== הכלל ===");

const S1 = { isStudent: true, itemId: "99", roles: ["אחראי מטבח"] };

ok("בלי כללים — ברירת המחדל מלאה",
  levelFor(S1, "k-all", []) === DEFAULT_LEVEL);

ok("כלל על התפקיד תופס",
  levelFor(S1, "k-all", [{ subject: "role:אחראי מטבח", screen: "k-all", level: "view" }]) === "view");

ok("כלל על תפקיד אחר אינו תופס",
  levelFor(S1, "k-all", [{ subject: "role:אב בית", screen: "k-all", level: "none" }]) === DEFAULT_LEVEL);

ok("כלל על האדם תופס",
  levelFor(S1, "k-all", [{ subject: "user:99", screen: "k-all", level: "none" }]) === "none");

ok("כלל על כל החניכים תופס",
  levelFor(S1, "k-all", [{ subject: "kind:student", screen: "k-all", level: "view" }]) === "view");

ok("כלל על כל הצוות אינו תופס על חניך",
  levelFor(S1, "k-all", [{ subject: "kind:staff", screen: "k-all", level: "none" }]) === DEFAULT_LEVEL);

/* ⚠⚠ **הכיוון שמחזיק את כל הבטיחות**: הצמצום החזק מנצח, כלומר
   התאמה אישית אינה **מרחיבה** את מה שהתפקיד סגר. */
ok("הצמצום החזק מנצח — אישי אינו מרחיב את התפקיד",
  levelFor(S1, "k-all", [
    { subject: "role:אחראי מטבח", screen: "k-all", level: "none" },
    { subject: "user:99", screen: "k-all", level: "view" },
  ]) === "none");

ok("  והכיוון ההפוך — אישי כן מצמצם יותר",
  levelFor(S1, "k-all", [
    { subject: "role:אחראי מטבח", screen: "k-all", level: "view" },
    { subject: "user:99", screen: "k-all", level: "none" },
  ]) === "none");

ok('"מלא" אינו מצמצם',
  levelFor(S1, "k-all", [{ subject: "user:99", screen: "k-all", level: "edit" }]) === DEFAULT_LEVEL);

ok("רמה לא מוכרת אינה מצמצמת",
  levelFor(S1, "k-all", [{ subject: "user:99", screen: "k-all", level: "מה" }]) === DEFAULT_LEVEL);

ok("narrower בוחר את הסגור", narrower("edit", "none") === "none" && narrower("none", "view") === "none");

ok("narrowedFor מחזיר רק את מה שצומצם",
  JSON.stringify(narrowedFor(S1, [
    { subject: "user:99", screen: "k-all", level: "view" },
    { subject: "user:99", screen: "buy", level: "edit" },
    { subject: "role:אב בית", screen: "faults", level: "none" },
  ])) === JSON.stringify({ "k-all": "view" }));

ok("parseSubject דוחה מפתח שאינו תקין",
  parseSubject("שטות") === null && parseSubject("role:") === null
  && parseSubject("nope:x") === null);

ok("subjectKey ו-parseSubject הפוכים",
  parseSubject(subjectKey(SUBJECT.role, "אב בית")).id === "אב בית");

/* ⚠ הטענה שמפרידה בין "נחסם" ל"ננעל בחוץ". */
ok("me ו-logout לעולם אינם נחסמים",
  NEVER_BLOCKED.has("me") && NEVER_BLOCKED.has("logout") && NEVER_BLOCKED.has("account"));

/* ============================================================
   2 · דרך השרת
   ============================================================ */
if (!accessReady()) {
  console.log("\nלוח ההרשאות המותאמות טרם הוקם — npm run seed:access");
  console.log(`\n${pass} עברו, ${fail + 1} נכשלו`);
  process.exit(1);
}

const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const users = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name
       column_values(ids:["${AUTH_COLS.code}","${AUTH_COLS.role}","${AUTH_COLS.kind}","${AUTH_COLS.viewOnly}"]){ id text } } } } }`))
  .boards[0].items_page.items;

const staff = users.filter((u) =>
  cv(u, AUTH_COLS.kind) === KIND.manager && cv(u, AUTH_COLS.code)
  && cv(u, AUTH_COLS.viewOnly) !== "v" && cv(u, AUTH_COLS.viewOnly) !== "✓");
const head = staff.find((u) => cv(u, AUTH_COLS.role) === STAFF_ROLE.head);

if (!head) {
  console.log("\nאין ראש מכינה בלוח ההרשאות — אי אפשר לבדוק את הגבול");
  console.log(`\n${pass} עברו, ${fail + 1} נכשלו`);
  process.exit(1);
}

/* ⚠⚠ **כל מזהה שחוזר נשמר, ולא רק מהיצירה הראשונה.**
   הגרסה הראשונה שמרה את המזהה מה-POST של "חסום" בלבד. בהרצה
   שנפלה באמצע (באג `subject`) ה-POST של "צפייה" **יצר שורה
   שנייה** שאיש לא עקב אחריה — והיא נשארה חיה בלוח, כלומר
   חדר הכביסה היה לצפייה בלבד לכל המכינה עד שנמצאה ביד.
   זה בדיוק "ניקוי לפי מזהה, ולספור מה נוצר בכל לוח". */
const made = [];
const keep = (r) => { if (r && r.b && r.b.id) made.push(String(r.b.id)); return r; };
const cleanRules = async () => {
  for (const id of made) {
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id }); } catch { /* כבר נמחק */ }
  }
  made.length = 0;
};

const reg = await tempRegister(head.name);
const H = jar();
const S = jar();
let r;

/* ⚠ **המתנה על תנאי ולא על זמן** — `withAuth` קורא את הכללים
   דרך מטמון של חמש דקות, והוא יושב באותו תהליך של השרת. */
const waitUntil = async (fn, what, tries = 25) => {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return true;
    await new Promise((x) => setTimeout(x, 400));
  }
  console.log("    (לא נראה שינוי: " + what + ")");
  return false;
};

process.on("uncaughtException", async (e) => {
  console.error(e); await cleanRules(); await reg.restore(); process.exit(1);
});

try {
  r = await call(H, "POST", "/api/auth?action=login", { code: cv(head, AUTH_COLS.code) });
  if (r.s !== 200) { console.log("כניסת ראש המכינה נכשלה", r.b); throw new Error("login"); }
  r = await call(H, "GET", "/api/auth?action=me");
  ok("ראש המכינה נכנס", r.s === 200 && r.b.isHead === true, `${r.s} isHead=${r.b.isHead}`);

  console.log("\n=== הדף ===");
  r = await call(H, "GET", "/api/students?action=access");
  ok("הדף נטען", r.s === 200, `${r.s} ${r.b.error || ""}`);
  const screens = r.b.screens || [];
  ok("  ומחזיר את כל המסכים", screens.length > 40, `${screens.length} מסכים`);
  ok("  ושלוש רמות", (r.b.levels || []).length === 3,
    (r.b.levels || []).map((l) => l.key).join(" · "));
  /* ⚠ המסכים נגזרים ואינם נכתבים — מסך מ-DUTIES חייב להיות שם. */
  ok("  וכולל מסכים שנגזרים מהתפקידים",
    screens.some((s) => s.tab === "lead-week"));

  /* ⚠ 400 על מסך שאינו קיים: מפתח שגוי נשמר בשקט ולעולם אינו חוסם (4ס). */
  r = await call(H, "POST", "/api/students?action=access",
    { subject: "kind:student", screen: "אין-כזה", level: "none" });
  ok("מסך שאינו קיים נדחה ב-400", r.s === 400, `${r.s} ${r.b.error || ""}`);
  r = await call(H, "POST", "/api/students?action=access",
    { subject: "שטות", screen: "laundry", level: "none" });
  ok("נושא שאינו תקין נדחה ב-400", r.s === 400, `${r.s} ${r.b.error || ""}`);
  r = await call(H, "POST", "/api/students?action=access",
    { subject: "kind:student", screen: "laundry", level: "מה" });
  ok("רמה לא מוכרת נדחית ב-400", r.s === 400, `${r.s} ${r.b.error || ""}`);

  console.log("\n=== האכיפה ===");
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ **לפני ההתאמה** — הכיוון השני של כל טענה שלמטה. */
  r = await call(S, "GET", "/api/students?action=laundry");
  const openBefore = r.s;
  ok("חדר הכביסה פתוח לפני ההתאמה", openBefore === 200, `${openBefore}`);

  /* ---------- חסימה מלאה ---------- */
  r = keep(await call(H, "POST", "/api/students?action=access",
    { subject: "kind:student", screen: "laundry", level: "none" }));
  ok("ראש המכינה חוסם את חדר הכביסה לחניכים", r.s === 200, `${r.s} ${r.b.error || ""}`);

  await waitUntil(async () =>
    (await call(S, "GET", "/api/students?action=laundry")).s === 403, "חסימה");
  r = await call(S, "GET", "/api/students?action=laundry");
  ok("  והחניך מקבל 403", r.s === 403, `${r.s} ${r.b.error || ""}`);
  /* ⚠ וההודעה אומרת שזה מכוון ולמי לפנות, ולא "אין הרשאה". */
  ok("  וההודעה אומרת למי לפנות",
    String(r.b.error || "").includes("ראש המכינה"), r.b.error || "");

  /* ⚠⚠ **הטענה שמפרידה בין "נחסם" ל"ננעל בחוץ".** */
  r = await call(S, "GET", "/api/auth?action=me");
  ok("  אבל me ממשיך לעבוד", r.s === 200, `${r.s}`);
  ok("  והוא יודע מה נסגר לו", (r.b.access || {}).laundry === "none",
    JSON.stringify(r.b.access || {}));
  r = await call(S, "GET", "/api/auth?action=notify");
  ok("  והפעמון ממשיך לעבוד", r.s === 200, `${r.s}`);

  /* ⚠ ומסך אחר לא נפגע — חסימה שמחליקה למסכים אחרים היא בדיוק
     הבאג שנועל את המטבח. */
  r = await call(S, "GET", "/api/students?action=quotes");
  ok("  ומסך אחר לא נפגע", r.s === 200, `${r.s}`);

  /* ---------- צפייה בלבד ---------- */
  r = keep(await call(H, "POST", "/api/students?action=access",
    { subject: "kind:student", screen: "laundry", level: "view" }));
  ok("שינוי לצפייה בלבד", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("  ומעדכן את השורה ואינו יוצר שנייה", r.b.updated === true, JSON.stringify(r.b));

  await waitUntil(async () =>
    (await call(S, "GET", "/api/students?action=laundry")).s === 200, "צפייה");
  r = await call(S, "GET", "/api/students?action=laundry");
  ok("  והקריאה חוזרת לעבוד", r.s === 200, `${r.s}`);
  /* ⚠ והכתיבה נחסמת — בלי הטענה הזו "צפייה" הייתה שווה ל"מלא". */
  r = await call(S, "POST", "/api/students?action=laundry", { date: "2026-01-01", slot: 0 });
  ok("  והכתיבה נחסמת ב-403", r.s === 403, `${r.s} ${r.b.error || ""}`);
  ok("  וההודעה אומרת שזו צפייה בלבד",
    String(r.b.error || "").includes("צפייה"), r.b.error || "");

  /* ---------- ההתאמה אינה מרחיבה ---------- */
  console.log("\n=== רק מצמצם ===");
  r = await call(S, "GET", "/api/students?action=alumni");
  const alumniBefore = r.s;
  ok("מסך הבוגרים חסום לחניך ממילא", alumniBefore === 403, `${alumniBefore}`);
  r = keep(await call(H, "POST", "/api/students?action=access",
    { subject: "kind:student", screen: "alumni", level: "edit" }));
  ok('"מלא" על מסך חסום — נשמר ואינו יוצר שורה', r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(S, "GET", "/api/students?action=alumni");
  ok("  והמסך נשאר חסום", r.s === 403, `${r.s}`);

  /* ---------- ההסרה מחזירה ---------- */
  console.log("\n=== ההסרה ===");
  r = await call(H, "GET", "/api/students?action=access");
  const rule = (r.b.rules || []).find((x) => x.screen === "laundry");
  ok("ההתאמה ברשימה", Boolean(rule), (r.b.rules || []).length + " כללים");
  if (rule) {
    r = await call(H, "DELETE", "/api/students?action=access", { id: rule.id });
    ok("הסרת ההתאמה", r.s === 200, `${r.s} ${r.b.error || ""}`);
    const at = made.indexOf(rule.id);
    if (at >= 0) made.splice(at, 1);
    await waitUntil(async () =>
      (await call(S, "POST", "/api/students?action=laundry", { date: "", slot: "" })).s !== 403,
    "הסרה");
    r = await call(S, "GET", "/api/students?action=laundry");
    ok("  והמסך חזר לעבוד", r.s === 200, `${r.s}`);
    r = await call(S, "GET", "/api/auth?action=me");
    ok("  ו-me אינו מדווח עוד על צמצום", !(r.b.access || {}).laundry,
      JSON.stringify(r.b.access || {}));
  }

  /* ⚠ 404 ולא 403 על מזהה שאינו בלוח הזה — `deleteItem` שולחת
     `delete_item` בלי `board_id` (4ס). */
  r = await call(H, "DELETE", "/api/students?action=access", { id: "1" });
  ok("מזהה שאינו קיים מקבל 404", r.s === 404, `${r.s} ${r.b.error || ""}`);

  /* ---------- מי רשאי לפתוח את הדף ---------- */
  console.log("\n=== מי רשאי ===");
  r = await call(S, "GET", "/api/students?action=access");
  ok("חניך אינו מגיע לדף ההרשאות", r.s === 403, `${r.s}`);
  r = await call(S, "POST", "/api/students?action=access",
    { subject: "kind:staff", screen: "buy", level: "none" });
  ok("  וגם אינו כותב בו", r.s === 403, `${r.s}`);
} finally {
  console.log("\n=== ניקוי ===");
  const n = made.length;
  await cleanRules();
  await reg.restore();
  console.log(`  נמחקו ${n} כללים, והרישום הוחזר`);

  /* ⚠⚠ **והלוח נבדק אחרי הניקוי, ולא רק נספר מה נמחק.**
     שורה שהבדיקה יצרה בלי לעקוב אחריה לא תופיע במונה — היא
     תופיע רק כאן. בלי הטענה הזו שורה תקועה משאירה מסך חסום
     לכל המכינה, וזה בדיוק מה שקרה פעם אחת. */
  try {
    const { allItems } = await import("../../api/_monday.js");
    const left = await allItems(ACCESS_BOARDS.board);
    ok("ולוח ההרשאות נשאר ריק", left.length === 0,
      left.map((i) => i.name).join(" · ") || "ריק");
  } catch (e) {
    ok("ולוח ההרשאות נשאר ריק", false, e.message);
  }
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
