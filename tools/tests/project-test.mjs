/* ============================================================
   הפרויקטים שלי — הבעלות, הגבול מול הצוות, והתקציב
   ------------------------------------------------------------
   ⚠⚠ **הטענה המרכזית כאן היא מה שהצוות *אינו* יכול לעשות.**
     זו נקודת הקצה השנייה במערכת שבה `isManager` אינו מרחיב
     גישה אלא מבטל אותה (4מה), והבטחה כזו שאין לה בדיקה נשברת
     בתיקון הראשון של מי שלא יודע עליה.

   ⚠ הבדיקה יוצרת את הנתונים שלה ומוחקת אותם לפי **המזהים
     שחזרו מהיצירה**, ובכל שלושת הלוחות שהיא נוגעת בהם.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { studentRows } from "../../api/_student-rows.js";
import { PROJECT_BOARDS, projectsReady } from "../../shared/projects-ids.js";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
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

if (!projectsReady()) {
  console.log("לוחות הפרויקטים טרם הוקמו — npm run seed:projects");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}

const made = { projects: [], tasks: [], money: [] };
const cleanup = async () => {
  for (const [k, board] of [["projects", PROJECT_BOARDS.projects],
    ["tasks", PROJECT_BOARDS.tasks], ["money", PROJECT_BOARDS.budget]]) {
    for (const id of made[k]) {
      try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id }); } catch { /* כבר נמחק */ }
    }
    made[k].length = 0;
  }
};

const students = await studentRows({ force: true });
const other = students.find((s) => s.active && !s.demo);

const reg = await tempRegister("דני לויט");
const M = jar();
let r;

/* ⚠⚠ **המנהל חייב להיות מחובר באמת.** ג'ר ריק מקבל 401 על כל
   קריאה, וטענה שבודקת 403 הייתה עוברת מהסיבה הלא-נכונה —
   כלומר "הצוות חסום" היה נשאר ירוק גם אם הגבול היה נשבר. */
const cvAuth = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const users = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){ items{ id name
       column_values(ids:["${AUTH_COLS.code}"]){ id text } } } } }`))
  .boards[0].items_page.items;
const danny = users.find((x) => x.name.includes("דני לויט"));

try {
  r = await call(M, "POST", "/api/auth?action=login", { code: cvAuth(danny, AUTH_COLS.code) });
  if (r.s !== 200) { console.log("כניסת מנהל נכשלה", r.b); await reg.restore(); process.exit(1); }

  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ============ 1 · הגבול מול הצוות ============ */
  console.log("\n=== הצוות אינו רואה, וזו הנקודה ===");
  r = await call(M, "GET", "/api/students?action=projects");
  ok("הצוות מקבל 403 בקריאה", r.s === 403, `${r.s} ${r.b.error || ""}`);
  ok("וההודעה אומרת למה", /שייכים לחניכים/.test(r.b.error || ""), r.b.error);

  r = await call(M, "POST", "/api/students?action=projects", { name: "בדיקה — של הצוות" });
  ok("ואינו יוצר פרויקט", r.s === 403, String(r.s));
  r = await call(M, "POST", "/api/students?action=project-task", { project: "1", title: "x" });
  ok("ואינו מוסיף משימה", r.s === 403, String(r.s));
  r = await call(M, "POST", "/api/students?action=project-money", { project: "1", title: "x" });
  ok("ואינו רושם תנועת תקציב", r.s === 403, String(r.s));

  /* ============ 2 · יצירה ועריכה ============ */
  console.log("\n=== החניך יוצר ומנהל ===");
  r = await call(S, "POST", "/api/students?action=projects",
    { name: "בדיקה — פרויקט", kind: "אישי", budget: "1000", goal: "בדיקה" });
  ok("פרויקט נוצר", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  const pid = String(r.b.id);
  made.projects.push(pid);

  r = await call(S, "GET", "/api/students?action=projects");
  const p0 = (r.b.projects || []).find((x) => x.id === pid);
  ok("והוא חוזר ברשימה", Boolean(p0), String((r.b.projects || []).length));
  ok("עם סטטוס ברירת מחדל", p0 && p0.status === "רעיון", p0 && p0.status);
  ok("ובעלות", p0 && p0.isOwner === true, String(p0 && p0.isOwner));
  /* ⚠ בלי משימות אין מה למדוד — null ולא 0 (4נ). */
  ok("ובלי משימות ההתקדמות היא null ולא 0", p0 && p0.sum.pct === null, JSON.stringify(p0 && p0.sum.pct));

  r = await call(S, "PUT", "/api/students?action=projects", { id: pid, status: "סטטוס מומצא" });
  ok("סטטוס שאינו בלוח נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  /* ============ 3 · משימות ============ */
  console.log("\n=== משימות ===");
  r = await call(S, "POST", "/api/students?action=project-task",
    { project: pid, title: "בדיקה — משימה א" });
  ok("משימה נוספה", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  made.tasks.push(String(r.b.id));
  const t1 = String(r.b.id);

  r = await call(S, "POST", "/api/students?action=project-task",
    { project: pid, title: "בדיקה — משימה ב" });
  made.tasks.push(String(r.b.id));

  r = await call(S, "PUT", "/api/students?action=project-task", { id: t1, done: true });
  ok("סימון כבוצע עובר", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(S, "GET", "/api/students?action=projects");
  const p1 = r.b.projects.find((x) => x.id === pid);
  ok("וההתקדמות מחושבת בשרת", p1.sum.pct === 50, String(p1.sum.pct));
  ok("ונשארת משימה פתוחה אחת", p1.sum.open === 1, String(p1.sum.open));

  /* ============ 4 · תקציב ============ */
  console.log("\n=== תקציב ===");
  r = await call(S, "POST", "/api/students?action=project-money",
    { project: pid, title: "בדיקה — חומרים", kind: "הוצאה", amount: "300" });
  ok("הוצאה נרשמה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  made.money.push(String(r.b.id));

  r = await call(S, "POST", "/api/students?action=project-money",
    { project: pid, title: "בדיקה — תרומה", kind: "הכנסה", amount: "100" });
  made.money.push(String(r.b.id));

  /* ⚠ תנועה בלי סכום — נספרת ומדווחת ואינה מושמטת בשקט (4ט). */
  r = await call(S, "POST", "/api/students?action=project-money",
    { project: pid, title: "בדיקה — בלי סכום", kind: "הוצאה", amount: "" });
  made.money.push(String(r.b.id));

  r = await call(S, "GET", "/api/students?action=projects");
  const p2 = r.b.projects.find((x) => x.id === pid);
  ok("ההוצאות מסוכמות", p2.sum.spent === 300, String(p2.sum.spent));
  ok("וההכנסות בנפרד", p2.sum.income === 100, String(p2.sum.income));
  ok("והיתרה נגזרת", p2.sum.left === 800, String(p2.sum.left));
  ok("ותנועה בלי סכום מדווחת", p2.sum.noAmount === 1, String(p2.sum.noAmount));

  /* ============ 5 · שותפים ============ */
  console.log("\n=== שותפים ===");
  r = await call(S, "PUT", "/api/students?action=projects",
    { id: pid, partners: ["999999999"] });
  ok("שותף שאינו חניך מוכר נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  if (other) {
    r = await call(S, "PUT", "/api/students?action=projects", { id: pid, partners: [other.id] });
    ok("ושותף אמיתי מתקבל", r.s === 200, `${r.s} ${r.b.error || ""}`);
    r = await call(S, "GET", "/api/students?action=projects");
    const p3 = r.b.projects.find((x) => x.id === pid);
    /* ⚠ השם נגזר בשרת מהמזהה ואינו נשמר בלוח. */
    ok("והשם נגזר מהמזהה", p3.partnerNames.includes(other.name), JSON.stringify(p3.partnerNames));
    await call(S, "PUT", "/api/students?action=projects", { id: pid, partners: [] });
  }

  /* ============ 6 · פרויקט של מישהו אחר ============ */
  console.log("\n=== מה שאינו שלי ===");
  r = await call(S, "PUT", "/api/students?action=projects", { id: "999999999", status: "בתכנון" });
  ok("פרויקט שאינו שלי מחזיר 404", r.s === 404, `${r.s} ${r.b.error || ""}`);
  r = await call(S, "POST", "/api/students?action=project-task",
    { project: "999999999", title: "בדיקה" });
  ok("ומשימה לפרויקט כזה — 404", r.s === 404, String(r.s));

  /* ============ 7 · מחיקה של פרויקט עם תוכן ============ */
  console.log("\n=== מחיקה ===");
  r = await call(S, "DELETE", "/api/students?action=projects", { id: pid });
  /* ⚠⚠ מחיקה שקטה של משימות ותנועות היא בדיוק מה שאי אפשר
     לתקן. ההודעה אומרת כמה יש ומה לעשות במקום (4ק). */
  ok("פרויקט עם תוכן אינו נמחק", r.s === 400, `${r.s} ${r.b.error || ""}`);
  ok("וההודעה מונה כמה יש", /משימות/.test(r.b.error || ""), r.b.error);

  r = await call(S, "PUT", "/api/students?action=projects", { id: pid, archived: true });
  ok("וארכוב עובר", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ============ 8 · בלי כניסה ============ */
  console.log("\n=== בלי כניסה ===");
  const OUT = jar();
  r = await call(OUT, "GET", "/api/students?action=projects");
  ok("חסום", r.s === 401, String(r.s));

  console.log("\n=== ניקוי ===");
  await cleanup();
  const left = (await gql(
    `query($b:[ID!]){ boards(ids:$b){ items_page(limit:200){ items{ id name } } } }`,
    { b: [PROJECT_BOARDS.projects] })).boards[0].items_page.items
    .filter((x) => x.name.includes("בדיקה"));
  ok("שורות הבדיקה נמחקו", left.length === 0, left.map((x) => x.name).join(", "));
} finally {
  await cleanup();
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
