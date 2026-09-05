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
import { PROJECT_BOARDS, PROJECT_COLS, projectsReady } from "../../shared/projects-ids.js";
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

const made = { projects: [], tasks: [], money: [], entries: [] };
const cleanup = async () => {
  /* ⚠ **כל לוח שהבדיקה נגעה בו**, ולא רק הראשי. שלבים ויומן
     יושבים בלוח רביעי, וניקוי שמדלג עליו משאיר שורות. */
  for (const [k, board] of [["projects", PROJECT_BOARDS.projects],
    ["tasks", PROJECT_BOARDS.tasks], ["money", PROJECT_BOARDS.budget],
    ["entries", PROJECT_BOARDS.entries]]) {
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

  /* ============ 4ב · שלבים, תת-משימות וקטגוריות ============ */
  console.log("\n=== שלבים ותת-משימות ===");
  r = await call(S, "POST", "/api/students?action=project-entry",
    { project: pid, kind: "שלב", title: "בדיקה — שלב א", order: 1 });
  ok("שלב נוסף", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  const sid = String(r.b.id);
  made.entries.push(sid);

  r = await call(S, "POST", "/api/students?action=project-entry",
    { project: pid, kind: "סוג מומצא", title: "בדיקה" });
  ok("סוג רשומה שאינו מוכר נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  r = await call(S, "PUT", "/api/students?action=project-task", { id: t1, stage: sid });
  ok("משימה משויכת לשלב", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(S, "POST", "/api/students?action=project-task",
    { project: pid, title: "בדיקה — תת-משימה", parent: t1 });
  ok("תת-משימה נוספה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  made.tasks.push(String(r.b.id));

  r = await call(S, "GET", "/api/students?action=projects");
  const pS = r.b.projects.find((x) => x.id === pid);
  ok("והשלב חוזר עם הפרויקט", (pS.stages || []).some((x) => x.id === sid),
    JSON.stringify((pS.stages || []).map((x) => x.title)));
  ok("והשיוך נשמר", (pS.tasks || []).some((x) => x.id === t1 && x.stage === sid),
    JSON.stringify((pS.tasks || []).map((x) => x.stage)));
  ok("והשרת סופר שלבים", pS.sum.stages === 1, String(pS.sum.stages));

  /* ⚠ סימון שלב כהושלם — הוא נשאר ואינו נמחק. */
  r = await call(S, "PUT", "/api/students?action=project-entry", { id: sid, done: true });
  ok("שלב מסומן כהושלם", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(S, "GET", "/api/students?action=projects");
  ok("והוא עדיין ברשימה",
    (r.b.projects.find((x) => x.id === pid).stages || []).some((x) => x.id === sid && x.done),
    "השלב נעלם או לא סומן");

  console.log("\n=== קטגוריות בתקציב ===");
  r = await call(S, "POST", "/api/students?action=project-money",
    { project: pid, title: "בדיקה — קטגוריה", kind: "הוצאה", amount: "50", category: "חומרים" });
  ok("תנועה עם קטגוריה נרשמה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  made.money.push(String(r.b.id));

  r = await call(S, "POST", "/api/students?action=project-money",
    { project: pid, title: "בדיקה — קטגוריה שגויה", kind: "הוצאה", amount: "10",
      category: "קטגוריה מומצאת" });
  ok("קטגוריה שאינה מוכרת נדחתה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  r = await call(S, "GET", "/api/students?action=projects");
  const pC = r.b.projects.find((x) => x.id === pid);
  ok("והפירוט לפי קטגוריה מחושב בשרת",
    (pC.sum.byCategory || []).some((c) => c.category === "חומרים" && c.amount === 50),
    JSON.stringify(pC.sum.byCategory));

  console.log("\n=== יומן ===");
  r = await call(S, "POST", "/api/students?action=project-entry",
    { project: pid, kind: "יומן", title: "בדיקה — יומן", date: "2026-09-01", body: "מה קרה" });
  ok("רשומת יומן נוספה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  made.entries.push(String(r.b.id));
  r = await call(S, "GET", "/api/students?action=projects");
  const pJ = r.b.projects.find((x) => x.id === pid);
  /* ⚠ **שני הסוגים באותו לוח, ונפרדים בתשובה.** אם הם היו
     מתערבבים, היומן היה מופיע בשלבים ולהפך. */
  ok("היומן והשלבים נפרדים בתשובה",
    (pJ.journal || []).length === 1 && (pJ.stages || []).length === 1,
    `יומן ${(pJ.journal || []).length} · שלבים ${(pJ.stages || []).length}`);

  console.log("\n=== תבניות ===");
  ok("השרת מציע תבניות", Array.isArray(r.b.templates) && r.b.templates.length > 0,
    JSON.stringify((r.b.templates || []).map((t) => t.key)));
  r = await call(S, "POST", "/api/students?action=projects",
    { name: "בדיקה — מתבנית", template: "event" });
  ok("פרויקט מתבנית נוצר", r.s === 200 && r.b.template === "event",
    `${r.s} ${r.b.template}`);
  const tid = String(r.b.id);
  made.projects.push(tid);
  r = await call(S, "GET", "/api/students?action=projects");
  const pT = r.b.projects.find((x) => x.id === tid);
  ok("ונוצרו לו שלבים ומשימות",
    (pT.stages || []).length > 0 && (pT.tasks || []).length > 0,
    `שלבים ${(pT.stages || []).length} · משימות ${(pT.tasks || []).length}`);
  for (const st of pT.stages) made.entries.push(st.id);
  for (const t of pT.tasks) made.tasks.push(t.id);

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
  r = await call(S, "PUT", "/api/students?action=projects", { id: pid, archived: true });
  ok("ארכוב עובר", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ============================================================
     ⚠⚠ **מחיקה גוררת את הכול, ומדווחת כמה.**

     קודם פרויקט עם תוכן פשוט לא נמחק. זה הגן על נתונים והשאיר
     את החניך בלי דרך למחוק פרויקט שפתח בטעות. עכשיו הוא נמחק
     תמיד — **וגם התלויים בו**, אחרת הם נשארים כיתומים שאינם
     מופיעים בשום מסך ולכן אי אפשר גם למחוק אותם.

     הטענה כאן היא בדיוק על זה: אחרי המחיקה **אין יתומים**.
     ============================================================ */
  const before2 = await call(S, "GET", "/api/students?action=projects");
  const pDel = before2.b.projects.find((x) => x.id === pid);
  const kidCount = (pDel.tasks || []).length + (pDel.money || []).length
    + (pDel.stages || []).length + (pDel.journal || []).length;

  r = await call(S, "DELETE", "/api/students?action=projects", { id: pid });
  ok("פרויקט עם תוכן נמחק", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("והשרת מדווח כמה שורות נגררו",
    r.b.removed === kidCount, `דווח ${r.b.removed} · צפוי ${kidCount}`);
  ok("ובלי כשלים", r.b.failed === undefined, String(r.b.failed));

  /* ⚠ הטענה שסוגרת את המעגל: אף שורה לא נשארה בלי פרויקט. */
  const after2 = await gql(
    `query($b:[ID!]){ boards(ids:$b){ items_page(limit:300){ items{ id
       column_values(ids:["${PROJECT_COLS.tasks.project}"]){ text } } } } }`,
    { b: [PROJECT_BOARDS.tasks] });
  const orphans = (after2.boards[0].items_page.items || [])
    .filter((i) => (i.column_values[0].text || "") === pid);
  ok("ולא נשארו משימות יתומות", orphans.length === 0, String(orphans.length));
  /* כבר נמחקו — שלא ינסה שוב בניקוי */
  made.projects = made.projects.filter((x) => x !== pid);

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
