/* ============================================================
   אחריות — משימות · הצפות · חפיפה · יו״ר
   והגבול: לצוות אין מעקב אחרי המשימות.

   ⚠ הבדיקה מפעילה זמנית תפקיד ויו״ר על **חשבון הבדיקה**,
     ומחזירה הכול ב-finally. אין נגיעה בחניך אמיתי.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { invalidate } from "../../api/_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../../shared/mechina-boards.js";
import { ROLES_COL, ROLE_CONTAINER } from "../../shared/lessons-boards.js";
import { PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORY } from "../../shared/placements.js";
import { allItems } from "../../api/_monday.js";
import { DUTY_BOARDS } from "../../shared/duty-ids.js";
import { boardColumn } from "../../api/_board-col.js";

const B = "http://localhost:5173";
/* ⚠ חשבון הבדיקה של החניכים — אינו נספר בשום מקום (4לא). */
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 300) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }
console.log(`נבדק: ${demo.name}`);

/* ועדה אמיתית כלשהי, כדי לבדוק יו״ר.
   ⚠ נקרא ישירות מהלוח: loadDefinitions אינה מיוצאת, ומיפוי
     מפורש עדיף על הרחבת ה-API רק בשביל בדיקה. */
const DC = PLACEMENT_COLS.definitions;
const dv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const defs = (await allItems(PLACEMENT_BOARDS.definitions)).map((i) => ({
  id: String(i.id), name: String(i.name || "").trim(),
  category: dv(i, DC.category), chair: dv(i, DC.chair), chairName: dv(i, DC.chairName),
}));
const cmt = defs.find((d) => d.category === CATEGORY.committee);
if (!cmt) { console.log("אין ועדה בלוח ההגדרות"); process.exit(1); }
console.log(`ועדה לבדיקה: ${cmt.name}`);

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const code = (t) => cv(us.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const D = jar();
await call(D, "POST", "/api/auth?action=login", { code: code("דני לויט") });

/* ---- מצב פתיחה, לשחזור ---- */
const before = {
  roles: demo.roles || [],
  demo: true,
  chair: cmt.chair || "",
  chairName: cmt.chairName || "",
};
const setRoster = async (cols) => {
  await gql(`mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
    { b: MECHINA_BOARDS.roster, i: demo.id, v: JSON.stringify(cols) });
  invalidate("student-rows");
};

const made = [];   /* מזהי שורות שהבדיקה יצרה */

try {
  /* ============ הכנה ============ */
  await setRoster({
    [MECHINA_COLS.roster.demo]: { checked: "false" },
    [ROLES_COL]: ROLE_CONTAINER,
  });
  /* ⚠ **הסדר קובע.** מטמון החניכים של השרת יושב בתהליך אחר
     ומחזיק עד 30 שניות. גרסה קודמת קבעה יו״ר מיד אחרי כיבוי
     דגל הבדיקה וקיבלה "החניך אינו פעיל" — וארבע טענות נפלו
     מסיבה שאינה קשורה למה שהן בודקות. */
  const S = jar();
  let r;
  for (let i = 0; i < 45; i++) {
    /* ⚠ **סיסמה ולא תעודת זהות.** חשבון הבדיקה רשום, ומאז
       שנסגרה עקיפת הסיסמה ?action=login מחזיר לו 409. */
    r = await call(S, "POST", "/api/auth?action=signin",
      { user: DEMO_USER, password: DEMO_PASS });
    if (r.s === 200) break;
    await new Promise((z) => setTimeout(z, 1000));
  }
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* יו״ר הוועדה — אחרי שהשרת כבר רואה את החניך */
  r = await call(D, "PUT", "/api/students?action=chair",
    { placementId: cmt.id, studentId: demo.id });
  ok("יו״ר נקבע לוועדה", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ ענף אינו נושא יו״ר */
  const branch = defs.find((d) => d.category === CATEGORY.branch);
  if (branch) {
    r = await call(D, "PUT", "/api/students?action=chair",
      { placementId: branch.id, studentId: demo.id });
    ok("אבל לענף אי אפשר לקבוע יו״ר", r.s === 400, `${r.s} ${r.b.error || ""}`);
  }

  /* ============ 1 · מרכז התפקיד ============ */
  console.log("=== מרכז התפקיד ===");
  /* ============================================================
     ⚠ **להמתין עד שהשרת רואה את התפקיד, ולא להניח שהוא רואה.**

     מטמון החניכים של השרת יושב בתהליך אחר ומחזיק עד 30 שניות,
     ולולאת ההתחברות שלמעלה מסתיימת ברגע שהכניסה מצליחה —
     כלומר מהרגע שהשורה קיימת, ולאו דווקא מהרגע שהתפקיד עליה
     נקרא. בהרצה על חשבון בדיקה שזה עתה נוצר ההפרש הזה הפיל
     את כל הסעיף, ובמסלול שנראה כמו באג באפליקציה.

     ⚠ ולכן ההמתנה היא **על תנאי ולא על זמן** — בדיוק הכלל
       שנשבר כאן פעמיים קודם.
     ============================================================ */
  for (let i = 0; i < 45; i++) {
    r = await call(S, "GET", "/api/students?action=duty");
    if (r.s === 200 && (r.b.duties || []).some((d) => d.name === ROLE_CONTAINER)) break;
    await new Promise((z) => setTimeout(z, 1000));
  }
  ok("המרכז נטען", r.s === 200, `${r.s} ${r.b.error || ""}`);
  const hub = r.b;
  ok("ויש בו אחריות", hub.hasAny === true && hub.duties.length >= 2,
    hub.duties?.map((d) => d.label).join(" · "));
  const cont = (hub.duties || []).find((d) => d.name === ROLE_CONTAINER);
  const chair = (hub.duties || []).find((d) => d.scope === cmt.id);
  ok("אחראי מכולה מהתפקידים", Boolean(cont), cont?.label);
  ok("ויו״ר מהוועדה", Boolean(chair), chair?.label);
  /* ⚠ האחריות נושאת את המסכים שהיא פותחת — אותה רשימה
     שמזינה את המגירה, כדי ששתיהן לא יוכלו להיפרד. */
  ok("ולמכולה יש קיצורים למסכים", (cont?.tabs || []).length === 2,
    cont?.tabs?.map((t) => t.label).join(" · "));
  ok("ולכל אחריות מפתח ייחודי",
    new Set(hub.duties.map((d) => d.key)).size === hub.duties.length,
    hub.duties.map((d) => d.key).join(" | "));

  /* ============ 2 · מסמך החפיפה ============ */
  console.log("=== מסמך חפיפה ===");
  ok("למכולה יש מסמך חפיפה", Boolean(cont?.handover), cont?.handover?.by);
  ok("ובו התוכן", String(cont?.handover?.doing || "").includes("מכולה"),
    String(cont?.handover?.doing || "").slice(0, 40));
  ok("וגם מסקנות לשימור", Boolean(cont?.handover?.keep));
  ok("והוא עדיין לא אושר", cont?.handover?.read === false, String(cont?.handover?.read));
  /* ⚠ ליו״ר אין מסמך — וזה null ולא אובייקט ריק. */
  ok("וליו״ר אין מסמך", chair?.handover === null, JSON.stringify(chair?.handover));

  r = await call(S, "POST", "/api/students?action=duty", { duty: ROLE_CONTAINER });
  ok("אישור קריאה עובר", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(S, "GET", "/api/students?action=duty");
  const cont2 = r.b.duties.find((d) => d.name === ROLE_CONTAINER);
  ok("והמסמך מסומן כנקרא", cont2?.handover?.read === true, String(cont2?.handover?.read));

  /* ============ 3 · משימות ============ */
  console.log("=== משימות ===");
  /* ⚠ בלי אחריות מכולה אין מפתח, ו-`cont.key` היה נופל
     ב-TypeError שמסתיר את הטענה שכשלה באמת. */
  if (!cont) throw new Error("אין אחריות 'אחראי מכולה' — הסעיפים שלמעלה מסבירים למה");
  const key = cont.key;
  r = await call(S, "POST", "/api/students?action=duty-tasks",
    { duty: key, title: "בדיקה — לסדר את המכולה", due: "2026-12-01" });
  ok("משימה נוצרת", r.s === 200, `${r.s} ${r.b.error || ""}`);
  const taskId = r.b.id;
  if (taskId) made.push(taskId);

  r = await call(S, "GET", `/api/students?action=duty-tasks&duty=${encodeURIComponent(key)}`);
  ok("והיא חוזרת", (r.b.tasks || []).some((t) => t.id === taskId), `${r.b.tasks?.length} משימות`);
  ok("ונספרת כפתוחה", r.b.counts?.open >= 1, JSON.stringify(r.b.counts));

  r = await call(S, "PUT", "/api/students?action=duty-tasks", { id: taskId, done: true });
  ok("סימון כבוצע עובר", r.s === 200, r.b.error);
  r = await call(S, "GET", `/api/students?action=duty-tasks&duty=${encodeURIComponent(key)}`);
  ok("והיא מסומנת", (r.b.tasks || []).find((t) => t.id === taskId)?.done === true);

  /* ⚠ אי אפשר לכתוב משימה לאחריות שאינך נושא. */
  r = await call(S, "POST", "/api/students?action=duty-tasks",
    { duty: "אחראי מטבח", title: "בדיקה — לא שלי" });
  ok("משימה לאחריות שאינה שלי נחסמת", r.s === 403, `${r.s} ${r.b.error || ""}`);

  /* ============ 4 · ⚠ הגבול: לצוות אין מעקב ============ */
  console.log("=== הגבול: אין מעקב צמוד ===");
  /* ⚠ **הטענה החשובה ביותר בקובץ.** זו נקודת הקצה היחידה
     במאגר שבה מנהל אינו מקבל יותר, וזה מכוון. */
  r = await call(D, "GET", `/api/students?action=duty-tasks&duty=${encodeURIComponent(key)}`);
  ok("מנהל אינו רואה משימות כלל", r.s === 403, `${r.s} ${r.b.error || ""}`);
  r = await call(D, "GET", "/api/students?action=duty");
  ok("ולא את מרכז התפקיד", r.s === 403, `${r.s}`);
  /* ⚠ וגם ראש מכינה לא. אין דרך עוקפת. */
  r = await call(D, "PUT", "/api/students?action=duty-tasks", { id: taskId, done: false });
  ok("ואינו יכול לשנות משימה", r.s === 403, `${r.s}`);
  r = await call(D, "DELETE", "/api/students?action=duty-tasks", { id: taskId });
  ok("ולא למחוק אותה", r.s === 403, `${r.s}`);

  /* ============ 5 · הצפות מהצוות ============ */
  console.log("=== הצפות ===");
  r = await call(D, "POST", "/api/students?action=duty-notes",
    { duty: key, title: "בדיקה — לבדוק את המנעול", body: "הדלת נסגרת בכבדות" });
  ok("הצוות שולח הצפה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  const noteId = r.b.id;

  r = await call(S, "GET", "/api/students?action=duty-notes");
  const got = (r.b.notes || []).find((n) => n.id === noteId);
  ok("והחניך רואה אותה", Boolean(got), got?.title);
  ok("עם שם השולח", Boolean(got?.by), got?.by);
  ok("והחניך אינו יכול לשלוח", r.b.canSend === false);

  r = await call(S, "PUT", "/api/students?action=duty-notes",
    { id: noteId, reply: "טופל, הוזמן מנעול חדש" });
  ok("החניך משיב", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(D, "GET", "/api/students?action=duty-notes");
  const staffSees = (r.b.notes || []).find((n) => n.id === noteId);
  ok("והצוות רואה את התשובה", staffSees?.reply?.includes("מנעול"), staffSees?.reply);
  /* ⚠ ומה שהצוות **לא** מקבל: שום סימן על ביצוע. */
  ok("אבל לא מצב ביצוע", staffSees && !("done" in staffSees) && !("owner" in staffSees),
    Object.keys(staffSees || {}).join(","));

  /* ⚠ חניך אינו יכול לשלוח הצפה, וגם לא להשיב על הצפה שאינה שלו */
  r = await call(S, "POST", "/api/students?action=duty-notes",
    { duty: key, title: "בדיקה — מהחניך" });
  ok("חניך אינו שולח הצפה", r.s === 403, `${r.s}`);

  /* ============================================================
     ⚠⚠ **המחיקה מאומתת מול הלוח ומול השולח.**

     עד התיקון הבדיקה היחידה ב-DELETE הייתה `!session.isStudent`,
     ו-`deleteItem` שולחת `delete_item(item_id:…)` **בלי
     `board_id`** — כלומר כל איש צוות יכול היה למחוק **כל שורה
     בכל לוח במערכת** בכך שישלח מזהה שרירותי לנקודת הקצה הזו.
     חניך, שיעור, יום נוכחות, בקשת יציאה.

     הטענה כאן שולחת מזהה של שורה **בלוח אחר** ומוודאת שני
     דברים: שהתשובה 404, **וששורה עדיין קיימת**. בלי הבדיקה
     השנייה, 404 שמגיע אחרי מחיקה מוצלחת נראה בדיוק כמו הצלחה.
     ============================================================ */
  const victim = await gql(
    `mutation($b:ID!,$n:String!){ create_item(board_id:$b,item_name:$n,create_labels_if_missing:false){ id } }`,
    { b: DUTY_BOARDS.tasks, n: "בדיקה — שורה שאסור למחוק" });
  const victimId = String(victim.create_item.id);
  made.push(victimId);

  r = await call(D, "DELETE", "/api/students?action=duty-notes", { id: victimId });
  ok("מזהה מלוח אחר נדחה ב-404", r.s === 404, `${r.s} ${r.b.error || ""}`);

  const alive = (await gql(`query($i:[ID!]){ items(ids:$i){ id name } }`, { i: [victimId] })).items || [];
  ok("והשורה בלוח האחר שרדה", alive.length === 1 && alive[0], alive.length + "");

  if (noteId) {
    r = await call(D, "DELETE", "/api/students?action=duty-notes", { id: noteId });
    ok("הצוות מסיר הצפה שהוא שלח", r.s === 200, r.b.error);
  }

  /* ============ 6 · בלי סשן ============ */
  console.log("=== בלי כניסה ===");
  const A = jar();
  for (const p of ["duty", "duty-tasks", "duty-notes"]) {
    r = await call(A, "GET", `/api/students?action=${p}`);
    ok(`${p} חסום`, r.s === 401, `${r.s}`);
  }
} finally {
  for (const id of made) {
    await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id }).catch(() => {});
  }
  /* כל שורה בשני הלוחות ששייכת לחשבון הבדיקה */
  for (const [board, colId] of [
    [DUTY_BOARDS.tasks, null], [DUTY_BOARDS.notes, null],
  ]) {
    const items = (await gql(`query($b:[ID!]){ boards(ids:$b){ items_page(limit:200){ items{ id name } } } }`, { b: [board] }))
      .boards[0].items_page.items;
    for (const i of items) {
      if (i.name.startsWith("בדיקה — ")) {
        await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: i.id }).catch(() => {});
      }
    }
  }
  await gql(`mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
    { b: PLACEMENT_BOARDS.definitions, i: cmt.id,
      v: JSON.stringify({ [PLACEMENT_COLS.definitions.chair]: before.chair,
        [PLACEMENT_COLS.definitions.chairName]: before.chairName }) });
  /* ⚠ **גם עמודת אישורי הקריאה.** היא לא נוקתה בגרסה הקודמת,
     והריצה השנייה נכשלה על "המסמך עדיין לא אושר" — כי הוא כן
     אושר, בריצה שלפניה. בדיקה שאינה מנקה אחריה אינה חוזרת על
     עצמה. */
  const readCol = await boardColumn(MECHINA_BOARDS.roster, "חפיפות שנקראו", "long_text");
  await setRoster({
    [MECHINA_COLS.roster.demo]: { checked: "true" },
    [ROLES_COL]: before.roles.join(", "),
    ...(readCol ? { [readCol]: "" } : {}),
  });
  invalidate("placement-defs");
  const back = (await studentRows({ force: true })).find((r) => r.id === demo.id);
  console.log(back?.demo && !back.roles.length
    ? "  (חשבון הבדיקה שוחזר)" : `  !! שחזור חלקי — demo=${back?.demo} roles=${back?.roles}`);
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
