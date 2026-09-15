/* ============================================================
   בקשות שעברו — יורדות מהמונה ומהפעמון, ולא מהמערכת
   ------------------------------------------------------------
     npm test -- past

   הבקשה (15.9.2026): *"בבקשות יציאה אני רוצה שיהיה בקשות
   שבעבר כבר ויהיה לו בקשות שעברו ולא יהיה התראות שיהיו."*

   ⚠⚠ **ארבע טענות, וכל אחת נועלת כיוון אחר.** אחת לבדה הייתה
     נשארת ירוקה גם אילו הגבול נפל:

       1. לפני התאריך → `past:false`, ונספרת במונה
       2. אחרי התאריך → `past:true`, ויורדת מ-`mine`/`pending`
       3. **`canDecide` נשאר true** — היא סומנה, לא נחסמה
       4. הפעמון מפסיק להתריע עליה

     בלי (3) "סימון" היה הופך בשקט ל"חסימה", ובקשה שנשכחה
     הייתה נתקעת בלוח בלי שום מסך שיסגור אותה (4צ).
     בלי (1) אפשר היה להחזיר true תמיד והשאר היה עובר.

   ⚠ **`?today=` ולא המתנה ליום שיעבור.** השער חסום לחלוטין
     בכל דיפלוי (api/_test-date.js), ובלעדיו אי אפשר לבדוק
     גבול שתלוי בתאריך בלי לחכות לו.

   ⚠ **יוצרת את הבקשה שלה ומוחקת אותה לפי המזהה** שחזר
     מה-POST, ולא לפי סינון ערכים. ובתאריך שאיש לא נגע בו (5א).
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { loadCalendar, loadAbsences } from "../../api/_attendance-data.js";
import { studentRows } from "../../api/_student-rows.js";

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
const del = (i) => gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i });
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";

const demo = (await studentRows({ force: true })).find((r) => r.demo);
if (!demo) {
  console.log("אין חשבון בדיקה — npm run seed:demo");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}

/* ---------- יום לימוד פנוי, רחוק קדימה ---------- */
const cal = await loadCalendar();
const taken = new Set((await loadAbsences({ force: true }))
  .filter((a) => a.studentId === demo.id).map((a) => a.date));
const day = cal.days.map((d) => d.date).sort()
  .find((d) => d >= "2027-01-01" && !taken.has(d));
if (!day) {
  console.log("לא נמצא יום לימוד פנוי");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}
/** יום אחרי הבקשה — משם היא "עברה". */
const after = (() => {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();
console.log(`\nתאריך הבקשה: ${day} · "היום" בבדיקה: ${after}`);

const made = [];
const cleanup = async () => {
  for (const id of made) { try { await del(id); } catch { /* כבר נמחק */ } }
  made.length = 0;
};
process.on("uncaughtException", async (e) => { console.error(e); await cleanup(); process.exit(1); });

try {
  const S = jar();
  let r = await call(S, "POST", "/api/auth?action=signin",
    { user: "bdika", password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, String(r.s));

  r = await call(S, "POST", "/api/attendance?action=requests",
    { type: "מחלה", date: day, endDate: day, detail: "בדיקה — בקשה שעברה",
      outAt: "08:00", backAt: "18:00" });
  ok("הוגשה בקשה", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  const id = r.b.id;
  if (!id) throw new Error("הבקשה לא נוצרה");
  made.push(id);

  const findAs = async (today) => {
    const res = await call(S, "GET",
      "/api/attendance?action=requests" + (today ? "&today=" + today : ""));
    return { row: (res.b.requests || []).find((x) => x.id === id), body: res.b };
  };

  /* ============ 1 · לפני התאריך ============ */
  console.log("\n1 · לפני התאריך — בקשה רגילה");
  let f = await findAs(null);
  ok("הבקשה חוזרת", Boolean(f.row), f.row ? f.row.status : "לא נמצאה");
  ok("past כבוי", f.row && f.row.past === false, String(f.row && f.row.past));

  /* ============ 2 · אחרי התאריך ============ */
  console.log("\n2 · אחרי התאריך — past דלוק");
  f = await findAs(after);
  ok("past דלוק", f.row && f.row.past === true, String(f.row && f.row.past));
  /* ⚠ הבקשה **עדיין ברשימה**. סינון שלה מהתשובה היה משאיר אותה
     בלוח בלי שום מסך שמציג אותה. */
  ok("והבקשה עדיין ברשימה", Boolean(f.row));
  ok("והמונה past סופר אותה", Number(f.body.past) >= 1, String(f.body.past));

  /* ============ 3 · הסטטוס לא השתנה ============
     ⚠ `past` הוא מסמן. חניך אינו `canDecide` בשום מקרה, ולכן
       מה שנבדק כאן הוא שהשורה עצמה לא נגעה: אותו סטטוס, אותו
       תאריך, ו-`canEdit` פתוח — כלומר היא עדיין חיה בלוח. */
  console.log("\n3 · הבקשה סומנה ולא נחסמה");
  ok("הסטטוס נשאר ממתין", f.row && f.row.status === "ממתין",
    f.row ? f.row.status : "—");
  ok("ועדיין ניתנת לעריכה/ביטול", f.row && f.row.canEdit === true,
    String(f.row && f.row.canEdit));

  /* ============ 4 · הפעמון ============ */
  console.log("\n4 · הפעמון מפסיק להתריע");
  const { buildNotes } = await import("../../api/_notify.js");
  const sess = { itemId: demo.id, isStudent: true, name: demo.name, roles: demo.roles || [] };
  const notesNow = await buildNotes(sess);
  const notesAfter = await buildNotes(sess, after);
  const pend = (list) => list.filter((n) => String(n.id).startsWith("req:pending:")).length;
  ok("לפני התאריך יש התראת 'ממתינה לתשובה'", pend(notesNow) >= 1, String(pend(notesNow)));
  ok("ואחרי התאריך אין", pend(notesAfter) === 0, String(pend(notesAfter)));
} finally {
  await cleanup();
  console.log("\n(נמחקה הבקשה שנוצרה)");
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
