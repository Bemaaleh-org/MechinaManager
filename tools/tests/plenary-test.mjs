/* ============================================================
   מליאות — יצירה, פתקים, ומחיקה
   ------------------------------------------------------------
     npm test -- plenary

   ⚠⚠ **שני הכיוונים של המחיקה באותה הרצה:**
       · מליאה ריקה **נמחקת** — זו הבקשה (22.9.2026): שתי
         מליאות ניסיון נתקעו בלשונית בלי שום דרך להסיר אותן.
       · מליאה **עם פתקים נחסמת ב-409**, וההודעה אומרת כמה
         פתקים יש ומה לעשות במקום (5כח, 4ק).

     הראשון לבדו היה נשאר ירוק גם אילו המחיקה סוחפת עשרים
     פתקים, והשני לבדו היה נשאר ירוק גם אילו אי אפשר למחוק
     כלום — וזה בדיוק המצב שהבקשה באה לתקן.

   ⚠ **והפתק האנונימי — אנונימי בהיעדר הנתון** (5י, 5כח):
     התשובה **אינה מחזירה מזהה שורה**, כי מזהה שחוזר מופיע
     בלוג הרשת לצד הסשן ששלח אותו.

   ⚠ יוצרת את הנתונים שלה ומוחקת אותם **לפי מזהה** שחזר
     מה-POST, ולא לפי סינון ערכים.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { PLENARY_BOARDS, plenaryReady } from "../../shared/plenary-ids.js";

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

if (!plenaryReady()) {
  console.log("✗ לוחות המליאות טרם הוקמו — npm run setup:boards");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}

const users = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name
       column_values(ids:["${AUTH_COLS.code}"]){ id text } } } } }`,
)).boards[0].items_page.items;
const dani = users.find((u) => u.name.includes("דני לויט"));

/* ⚠ שני לוחות: המליאה והפתקים. בדיקה שסופרת אחד מהם משאירה
   שורות — הלקח של quota-test. */
const made = { events: [], notes: [] };
const cleanup = async () => {
  for (const id of made.notes.concat(made.events)) {
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: id }); }
    catch { /* כבר נמחק */ }
  }
  made.events.length = 0; made.notes.length = 0;
};
let reg = null;
process.on("uncaughtException", async (e) => {
  console.error(e); await cleanup();
  if (reg) await reg.restore().catch(() => {});
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
});

/** כל שורות הפתקים ששייכות למליאה — לניקוי, ולא לפי שם. */
const notesOf = async (plenaryId) => {
  const d = await gql(`{ boards(ids:[${PLENARY_BOARDS.notes}]){ items_page(limit:500){ items{ id column_values{ id text } } } } }`);
  return d.boards[0].items_page.items.filter((i) =>
    i.column_values.some((c) => String(c.text || "").includes(String(plenaryId))));
};

try {
  reg = await tempRegister("דני לויט");
  const D = jar();
  let r = await call(D, "POST", "/api/auth?action=login", { code: cv(dani, AUTH_COLS.code) });
  ok("הצוות נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  console.log("\n1 · יצירה");
  const TITLE = "בדיקה — מליאה " + Date.now();
  r = await call(D, "POST", "/api/students?action=plenary", { title: TITLE, date: "2026-12-31" });
  ok("מליאה נוצרה", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  const id = r.b.id;
  if (id) made.events.push(id);

  r = await call(D, "GET", "/api/students?action=plenary&id=" + encodeURIComponent(id));
  ok("והיא נטענת", r.s === 200 && r.b.plenary && r.b.plenary.title === TITLE,
    `${r.s} ${r.b.plenary && r.b.plenary.title}`);
  /* ⚠ תיבת הפתקים נפתחת עם היצירה — פעולה שנייה שאיש לא
     יזכור הייתה משאירה מליאה שאי אפשר להכניס לה פתק (5כח). */
  ok("ותיבת הפתקים פתוחה", r.b.plenary && r.b.plenary.open === true,
    String(r.b.plenary && r.b.plenary.open));

  console.log("\n2 · מליאה ריקה נמחקת");
  const EMPTY = "בדיקה — מליאה ריקה " + Date.now();
  r = await call(D, "POST", "/api/students?action=plenary", { title: EMPTY, date: "2026-12-30" });
  const emptyId = r.b.id;
  if (emptyId) made.events.push(emptyId);
  ok("נוצרה מליאה ריקה", r.s === 200 && emptyId, `${r.s} ${r.b.error || ""}`);

  r = await call(D, "DELETE", "/api/students?action=plenary", { id: emptyId });
  ok("והיא נמחקה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  if (r.s === 200) made.events = made.events.filter((x) => x !== emptyId);
  r = await call(D, "GET", "/api/students?action=plenary");
  ok("ואינה ברשימה יותר",
    !(r.b.plenaries || []).some((p) => String(p.id) === String(emptyId)));

  console.log("\n3 · מליאה עם פתקים נחסמת");
  r = await call(D, "POST", "/api/students?action=plenary",
    { plenary: id, text: "בדיקה אוטומטית — פתק", anon: false });
  ok("פתק נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(D, "POST", "/api/students?action=plenary",
    { plenary: id, text: "בדיקה אוטומטית — פתק אנונימי", anon: true });
  ok("ופתק אנונימי נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);
  /* ⚠⚠ **מזהה שחוזר שובר את האנונימיות מחוץ ל-monday** — הוא
     מופיע בלוג הרשת לצד הסשן ששלח אותו (5י). */
  ok("והתשובה אינה מחזירה מזהה שורה",
    !r.b.noteId && !r.b.id, JSON.stringify(r.b).slice(0, 80));

  r = await call(D, "DELETE", "/api/students?action=plenary", { id });
  ok("מחיקת מליאה עם פתקים נחסמת", r.s === 409, `${r.s} ${r.b.error || ""}`);
  /* ⚠ ההודעה אומרת **כמה** ומה לעשות במקום, ולא "אי אפשר" (4ק). */
  ok("וההודעה אומרת כמה פתקים ומה לעשות במקום",
    /פתק/.test(r.b.error || "") && /בוטלה/.test(r.b.error || ""), r.b.error);

  r = await call(D, "GET", "/api/students?action=plenary&id=" + encodeURIComponent(id));
  ok("והמליאה עדיין שם", r.s === 200 && r.b.plenary, String(r.s));
  ok("ושני הפתקים שרדו", (r.b.notes || []).length >= 2, String((r.b.notes || []).length));

  console.log("\n4 · מזהה שאינו קיים");
  r = await call(D, "DELETE", "/api/students?action=plenary", { id: "999999999" });
  ok("מחיקה של מליאה שאינה קיימת מחזירה 404", r.s === 404, `${r.s} ${r.b.error || ""}`);
} finally {
  console.log("\nניקוי…");
  /* ⚠ הפתקים נוצרו דרך ה-API ולא חזר להם מזהה (אנונימיות),
     ולכן הם נאספים מהלוח **לפי המליאה שלהם** — שהיא שורה
     שהבדיקה יצרה ושמזהה שלה נשמר. */
  for (const eid of made.events) {
    try {
      const rows = await notesOf(eid);
      for (const n of rows) made.notes.push(String(n.id));
    } catch (e) { console.log("  ! איסוף הפתקים נכשל: " + e.message); }
  }
  const n = made.events.length + made.notes.length;
  await cleanup();
  console.log(`  נמחקו ${n} שורות`);
  if (reg) await reg.restore().catch(() => {});
  console.log(`\n${pass} עברו, ${fail} נכשלו`);
  process.exit(fail ? 1 : 0);
}
