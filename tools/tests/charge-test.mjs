/* ============================================================
   כמה ימים נספרים — המדריך מציע, ראש המכינה מכריע
   ------------------------------------------------------------
   החלטת אחים (12.9.2026): *"גם במוצדקת ובמחלה צריך שהמדריך
   וראש המכינה יחליטו כמה ימים בתכלס לגבות."*

   ⚠⚠ **הטענות על שני הקצוות של כל גבול, באותה הרצה:**
     · המדריך מציע מעל התקרה → 400; בתוך התקרה → נשמר.
     · ראש המכינה מקבל את ההצעה כברירת מחדל — ומכריע.
     · מחלה של יומיים שנספרה כיום אחד: שתי שורות היעדרות (לנוכחות),
       אבל `charged === 1`.
     · תיקון בדיעבד עד התקרה ולא מעבר לה.

   ⚠ **חשבון הבדיקה, ששובץ זמנית לקבוצה של מדריך** — לא חניך
     אמיתי. flow-test נכנס בת״ז של חניך אמיתי שכבר נרשם ונופל
     ב-409 לפני הטענה הראשונה; כאן זה לא יקרה.

   ⚠ **תאריכים שאיש לא נגע בהם** (5א), והניקוי **לפי מזהים**:
     הכרעה מחדש לדחייה מוחקת את שורות ההיעדרות שהבקשה יצרה
     (המסלול של המוצר עצמו), ואז הבקשה והשיבוץ נמחקים לפי המזהה
     שחזר מהיצירה.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { PLACEMENT_BOARDS as PB, PLACEMENT_COLS as PC } from "../../shared/placements-ids.js";
import { loadCalendar, loadAbsences } from "../../api/_attendance-data.js";
import { studentRows } from "../../api/_student-rows.js";
import { guideDaysReady } from "../../shared/mechina-boards.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 200) }; }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const del = (i) => gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";

if (!guideDaysReady()) {
  console.log("עמודת ימים לפי המדריך טרם הוקמה — npm run seed:recdays");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}

const demo = (await studentRows({ force: true })).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); console.log("\n0 עברו, 1 נכשלו"); process.exit(1); }

/* ---------- שני תאריכים רצופים שאיש לא נגע בהם ---------- */
const cal = await loadCalendar();
const mine = (await loadAbsences({ force: true })).filter((a) => a.studentId === demo.id);
const taken = new Set(mine.map((a) => a.date));
const days = cal.days.map((d) => d.date).sort();
const next = (iso) => {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
let d1 = null;
for (let i = 0; i < days.length - 1; i++) {
  if (days[i] < "2026-12-01") continue;
  if (days[i + 1] !== next(days[i])) continue;
  if (taken.has(days[i]) || taken.has(days[i + 1])) continue;
  d1 = days[i]; break;
}
if (!d1) { console.log("לא נמצאו שני ימים רצופים פנויים"); console.log("\n0 עברו, 1 נכשלו"); process.exit(1); }
const d2 = next(d1);
console.log(`תאריכים: ${d1} – ${d2}`);

/* ---------- שיבוץ זמני לקבוצה של מדריך ---------- */
const defs = await allItems(PB.definitions);
const grp = defs.find((d) => cv(d, PC.definitions.category) === "קבוצה" && /נעם/.test(d.name));
if (!grp) { console.log("לא נמצאה קבוצת נעם"); console.log("\n0 עברו, 1 נכשלו"); process.exit(1); }

const made = { requests: [], assignment: null };
let reg = null;
const cleanup = async () => {
  for (const id of made.requests) { try { await del(id); } catch { /* כבר נמחק */ } }
  made.requests.length = 0;
  if (made.assignment) { try { await del(made.assignment); } catch { /* */ } made.assignment = null; }
  if (reg) { try { await reg.restore(); } catch { /* */ } reg = null; }
};
process.on("uncaughtException", async (e) => { console.error(e); await cleanup(); process.exit(1); });

try {
  const a = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: PB.assignments, n: `${demo.name} — ${grp.name}`, v: JSON.stringify({
        [PC.assignments.student]: String(demo.id),
        [PC.assignments.studentName]: demo.name,
        [PC.assignments.placement]: String(grp.id),
        [PC.assignments.placementName]: grp.name,
        [PC.assignments.semester]: { label: "שנתי" },
      }) });
  made.assignment = a.create_item.id;

  const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
    .boards[0].items_page.items;
  const codeOf = (t) => cv(users.find((x) => x.name.includes(t)) || { column_values: [] }, AUTH_COLS.code);
  reg = await tempRegister("נעם", "דני לויט");

  const NOAM = jar(), DANI = jar(), S = jar();
  let r = await call(NOAM, "POST", "/api/auth?action=login", { code: codeOf("נעם") });
  ok("נעם נכנס", r.s === 200, `${r.s}`);
  r = await call(DANI, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
  ok("דני נכנס", r.s === 200, `${r.s}`);
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s}`);

  console.log("\n=== בקשת מחלה של יומיים ===");
  r = await call(S, "POST", "/api/attendance?action=requests",
    { type: "מחלה", date: d1, endDate: d2, detail: "בדיקה — מחלה", outAt: "08:00", backAt: "18:00" });
  ok("הוגשה", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  const id = r.b.id;
  if (id) made.requests.push(id);

  /* ⚠ **המתנה על תנאי ולא על זמן** — מטמון השיבוצים יושב בתהליך
     של השרת, והשיבוץ הזמני נראה שם רק כשהוא מתרענן. */
  let q = null;
  for (let t = 0; t < 12; t++) {
    q = ((await call(NOAM, "GET", "/api/attendance?action=requests")).b.requests || []).find((x) => x.id === id);
    if (q && q.canDecide) break;
    await sleep(5000);
  }
  ok("הבקשה אצל נעם, והוא רשאי להמליץ", Boolean(q && q.canDecide), q ? `${q.stage} canDecide=${q.canDecide}` : "לא נמצאה");
  ok("והתקרה היא ימי הטווח — 2", q && q.cost === 2, String(q && q.cost));

  console.log("\n=== המדריך מציע ===");
  r = await call(NOAM, "POST", "/api/attendance?action=decide", { requestId: id, decision: "approve", days: 3 });
  ok("הצעה מעל התקרה נדחית", r.s === 400 && /ימי המחלה/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);
  r = await call(NOAM, "POST", "/api/attendance?action=decide", { requestId: id, decision: "approve", days: 1 });
  ok("המדריך ממליץ ומציע יום אחד", r.s === 200 && r.b.guideDays === 1, `${r.s} ${JSON.stringify({ g: r.b.guideDays, st: r.b.stage })}`);

  q = ((await call(DANI, "GET", "/api/attendance?action=requests")).b.requests || []).find((x) => x.id === id);
  ok("ראש המכינה רואה את ההצעה", q && q.guideDays === 1 && q.stage === "אצל ראש המכינה",
    q ? `${q.guideDays} ${q.stage}` : "—");

  console.log("\n=== ראש המכינה מכריע ===");
  /* ⚠ **בלי `days`** — כלומר ברירת המחדל. אם ההצעה לא הייתה
     נקלטת, היו נספרים שני ימים. */
  r = await call(DANI, "POST", "/api/attendance?action=decide", { requestId: id, decision: "approve" });
  ok("אושר — וברירת המחדל היא הצעת המדריך", r.s === 200 && r.b.charged === 1 && r.b.type === "מחלה",
    `${r.s} ${JSON.stringify({ c: r.b.charged, t: r.b.type, e: r.b.error })}`);
  ok("ושורת היעדרות לכל יום בטווח — לנוכחות", r.b.daysCreated === 2, String(r.b.daysCreated));

  q = ((await call(DANI, "GET", "/api/attendance?action=requests")).b.requests || []).find((x) => x.id === id);
  ok("ובהוכרעו: נספר יום אחד מתוך שניים", q && q.charged === 1 && q.cost === 2, q ? `${q.charged}/${q.cost}` : "—");
  ok("ואפשר לתקן בדיעבד", q && q.canRecost === true, String(q && q.canRecost));

  console.log("\n=== תיקון בדיעבד ===");
  r = await call(DANI, "POST", "/api/attendance?action=recost", { requestId: id, days: 3 });
  ok("מעל התקרה — נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);
  r = await call(DANI, "POST", "/api/attendance?action=recost", { requestId: id, days: 2 });
  ok("עד התקרה — נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);
  q = ((await call(DANI, "GET", "/api/attendance?action=requests")).b.requests || []).find((x) => x.id === id);
  ok("ועכשיו נספרו שניים", q && q.charged === 2, String(q && q.charged));

  console.log("\n=== ניקוי ===");
  r = await call(DANI, "POST", "/api/attendance?action=decide", { requestId: id, decision: "reject", redo: true });
  ok("הכרעה מחדש מוחקת את שתי השורות", r.s === 200 && r.b.daysRemoved === 2, `${r.s} ${r.b.daysRemoved}`);
  const left = (await loadAbsences({ force: true }))
    .filter((x) => x.studentId === demo.id && (x.date === d1 || x.date === d2));
  ok("ולא נשארה שורה בתאריכים של הבדיקה", left.length === 0, String(left.length));
} finally {
  await cleanup();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
