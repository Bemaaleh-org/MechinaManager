/* ============================================================
   ייבוא נתוני מחזור — מקצה לקצה
   ------------------------------------------------------------
   ⚠ עובד על **מחזור ג׳ בלבד**, שהוא מחזור הקמה ריק. הבדיקה
     מוחקת בסוף כל שורה שהיא יצרה, ומוודאת שהלוח חזר לריק.

   ⚠ אם מחזור ג׳ יהפוך אי פעם לפעיל — הבדיקה עוצרת. אסור לה
     לגעת בנתונים חיים.
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
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 250) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const D = jar();
/* ⚠ מנהל שטרם בחר שם וסיסמה חסום בכל נקודות הקצה מאז שנוספה
   ההרשמה. הרישום כאן זמני, הסיסמה שנוצרת אינה קיימת, והשחזור
   בסוף חובה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("דני", "רועי");
await call(D, "POST", "/api/auth?action=login", { code: cv(us.find((x) => x.name.includes("דני")), AUTH_COLS.code) });
const R = jar();
await call(R, "POST", "/api/auth?action=login", { code: cv(us.find((x) => x.name.includes("רועי")), AUTH_COLS.code) });

const cycles = (await call(D, "GET", "/api/students?action=cycles")).b.cycles;
const three = cycles.find((c) => c.name === "מחזור ג׳");
if (!three) { console.log("מחזור ג׳ אינו קיים — הבדיקה מדלגת."); process.exit(0); }
if (three.status === "פעיל") { console.log("⚠ מחזור ג׳ פעיל — הבדיקה עוצרת."); process.exit(1); }
console.log(`מחזור הבדיקה: ${three.name} [${three.status}]`);

const created = [];

/* ============ הרשאה ============ */
console.log("\n=== הרשאה ===");
let r = await call(R, "POST", "/api/students?action=import",
  { cycleId: three.id, step: "students", text: "בדיקה\t111111111" });
ok("איש צוות שאינו ראש המכינה נחסם", r.s === 403, `${r.s} ${r.b.error || ""}`);

/* ============ תצוגה מקדימה ============ */
console.log("\n=== תצוגה מקדימה ===");
const STUDENTS = [
  "שם\tתעודת זהות",
  "בדיקה ראשונה\t111111111",
  "בדיקה שנייה, 222222222",
  "בדיקה שלישית\t333333333\tבת",
  "שורה בלי תז",
  "כפולה\t111111111",
].join("\n");

r = await call(D, "POST", "/api/students?action=import",
  { cycleId: three.id, step: "students", text: STUDENTS });
ok("התצוגה המקדימה עובדת", r.s === 200, r.b.error);
ok("  שלוש שורות תקינות", r.b.rows.length === 3, `${r.b.rows.length}`);
ok("  שתיים נדחו עם סיבה", r.b.bad.length === 2,
  r.b.bad.map((x) => x.why).join(" · "));
/* ⚠ שורת הכותרת נזרקת ואינה נחשבת שגיאה */
ok("  שורת הכותרת לא נספרה כשגיאה",
  !r.b.bad.some((x) => x.text.includes("תעודת זהות")));
/* ⚠ התוויות בלוח הן "זכר"/"נקבה". "בן"/"בת" גרמו ל-monday
   לדחות את כל השורה, והתצוגה המקדימה לא ידעה על כך. */
ok("  מגדר זוהה בתווית של הלוח", r.b.rows[2].gender === "נקבה", String(r.b.rows[2].gender));

/* ⚠ העיקר: תצוגה מקדימה אינה כותבת */
let after = await call(D, "GET",
  `/api/students?action=import&cycleId=${three.id}&step=students`);
ok("ותצוגה מקדימה לא כתבה כלום", after.b.count === 0, `${after.b.count} שורות`);

/* ============ כתיבה ============ */
console.log("\n=== כתיבה ===");
r = await call(D, "POST", "/api/students?action=import",
  { cycleId: three.id, step: "students", text: STUDENTS, commit: true });
ok("הכתיבה עברה", r.s === 200 && r.b.created === 3,
  `נוצרו ${r.b.created}${(r.b.failed || []).length ? " · נדחו: " + r.b.failed.map((f) => f.why).join(" | ") : ""}`);
ok("  ואף שורה לא נדחתה על ידי הלוח", (r.b.failed || []).length === 0);

after = await call(D, "GET",
  `/api/students?action=import&cycleId=${three.id}&step=students`);
ok("שלוש שורות בלוח", after.b.count === 3, `${after.b.count}`);
created.push(...after.b.rows.map((x) => x.id));
const first = after.b.rows.find((x) => x.name === "בדיקה ראשונה");
ok("  והת\"ז נשמרה", first && first.fields.tz.replace(/\D/g, "") === "111111111",
  first ? first.fields.tz : "—");

/* ⚠ הדבקה חוזרת אינה מייצרת כפילויות */
r = await call(D, "POST", "/api/students?action=import",
  { cycleId: three.id, step: "students", text: STUDENTS, commit: true });
ok("הדבקה חוזרת אינה מכפילה", r.s === 200 && r.b.created === 0,
  `נוצרו ${r.b.created} · ${r.b.duplicates} כבר קיימים`);

/* ============ תיקון ============ */
console.log("\n=== תיקון על ידי המנהל ===");
r = await call(D, "PUT", "/api/students?action=import",
  { cycleId: three.id, step: "students", id: first.id,
    name: "בדיקה ראשונה מתוקנת", tz: "444444444" });
ok("תיקון שם ותעודת זהות", r.s === 200, r.b.error);
after = await call(D, "GET",
  `/api/students?action=import&cycleId=${three.id}&step=students`);
const fixed = after.b.rows.find((x) => x.id === first.id);
ok("  השם התעדכן", fixed.name === "בדיקה ראשונה מתוקנת", fixed.name);
ok("  והת\"ז התעדכנה", fixed.fields.tz.replace(/\D/g, "") === "444444444", fixed.fields.tz);

/* ============ גאנט ============ */
console.log("\n=== גאנט ===");
const GANTT = [
  "מסע פתיחה בדיקה\t01/09/2027\t03/09/2027",
  "שבת בדיקה\t05/09/2027\tשבת",
  "אירוע בלי תאריך",
].join("\n");
r = await call(D, "POST", "/api/students?action=import",
  { cycleId: three.id, step: "gantt", text: GANTT });
ok("שני אירועים נקלטו", r.b.rows.length === 2, `${r.b.rows.length}`);
ok("  הטווח נקרא נכון", r.b.rows[0].start === "2027-09-01" && r.b.rows[0].end === "2027-09-03",
  `${r.b.rows[0].start} – ${r.b.rows[0].end}`);
ok("  והסוג", r.b.rows[1].type === "שבת", r.b.rows[1].type);
r = await call(D, "POST", "/api/students?action=import",
  { cycleId: three.id, step: "gantt", text: GANTT, commit: true });
ok("נכתבו", r.b.created === 2, `${r.b.created}`);
const g = await call(D, "GET", `/api/students?action=import&cycleId=${three.id}&step=gantt`);
const gIds = g.b.rows.map((x) => x.id);

/* ============ גיליונות ============ */
console.log("\n=== גיליונות מרצים ===");
const SHEETS = "ציונות בדיקה\tאלירן\tרביעי 9:00\nמליאה בדיקה\t\tשני 20:00";
r = await call(D, "POST", "/api/students?action=import",
  { cycleId: three.id, step: "sheets", text: SHEETS, commit: true });
ok("שני גיליונות נכתבו", r.b.created === 2, `${r.b.created}`);
const sh = await call(D, "GET", `/api/students?action=import&cycleId=${three.id}&step=sheets`);
const shIds = sh.b.rows.map((x) => x.id);
const zion = sh.b.rows.find((x) => x.name === "ציונות בדיקה");
ok("  המרצה והשעה נשמרו",
  zion && zion.fields.lecturer === "אלירן" && zion.fields.dayTime === "רביעי 9:00",
  zion ? `${zion.fields.lecturer} · ${zion.fields.dayTime}` : "—");

/* ============ ⚠ לא נגע במחזור הפעיל ============ */
console.log("\n=== המחזור הפעיל לא נגוע ===");
r = await call(D, "GET", "/api/students?action=list");
ok("מצבת מחזור ב׳ ללא שינוי", (r.b.students || []).length === 33,
  `${(r.b.students || []).length} חניכים`);
r = await call(D, "GET", "/api/lessons?action=gantt");
const names = JSON.stringify(r.b);
ok("והגאנט של מחזור ב׳ נקי מהבדיקה", !names.includes("מסע פתיחה בדיקה"));

/* ============ ניקוי ============ */
console.log("\n=== ניקוי ===");
for (const [step, ids] of [["students", created], ["gantt", gIds], ["sheets", shIds]]) {
  for (const id of ids) {
    await call(D, "DELETE", "/api/students?action=import",
      { cycleId: three.id, step, id });
  }
  const left = await call(D, "GET",
    `/api/students?action=import&cycleId=${three.id}&step=${step}`);
  ok(`${step} חזר לריק`, left.b.count === 0, `${left.b.count} נותרו`);
}

console.log(`\nעברו ${pass} · נכשלו ${fail}`);

await reg.restore();
