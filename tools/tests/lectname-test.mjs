/* ============================================================
   שם המרצה ופרטי הקשר — על המפגש, ובלי לפתוח חוות דעת
   ------------------------------------------------------------
   שלוש בקשות של ראש המכינה (17.9.2026) נועלות כאן:

   1. *"כשמכניסים שם מרצה אז זה לא יפתח חוות דעת אוטומטית
      אלא אם לחצו על פתיחת חוות דעת"*
   2. *"ברגע שמוסיפים שם אני רוצה שזה אוטומטית יופיע בחוות
      דעת, כרגע זה לא קורה משום מה"*
   3. *"בשיעורי ניר עוז יהיה אפשר להכניס שם מרצה ופרטי קשר"*

   ⚠⚠ **שני הכיוונים באותה הרצה.** טענה אחת בלבד ("לא נפתחה
     חוות דעת") הייתה נשארת ירוקה גם אילו שם המרצה כלל לא
     נשמר — ואז 1 ו-3 היו נשברים בשקט.

   ⚠ הבדיקה **יוצרת גיליון ומפגש משלה** ומוחקת אותם לפי
     המזהים שחזרו מהיצירה, ולא לפי סינון ערכים. היא אינה
     נוגעת באף שורה אמיתית.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import {
  LESSON_BOARDS as LB, LESSON_COLS as LC, meetingContactReady,
} from "../../shared/lessons-boards.js";

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

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט", "נעם");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

/* ⚠⚠ **גיליון רגיל ולא "מרצה מתחלף"** — זו כל הנקודה של בקשה 3.
   גיליון "מרצה מתחלף" עבד ממילא; מה שלא עבד הוא שיעור ניר עוז. */
const SUBJECT = "בדיקה — שיעור זמני לפרטי מרצה";
/* ⚠ **תאריך שעבר** — הארכיון מחזיר מה שהתקיים בפועל
   (`m.date <= today`), ותאריך עתידי היה מפיל את טענת
   הדליפה על **התנהגות נכונה**. ⚠ והוא בעבר הרחוק
   כדי שלא יתנגש ביום שהמכינה נגעה בו (5א). */
const DATE = "2026-01-13";
let sheetId = null, meetId = null, evalId = null;

const cleanup = async () => {
  for (const id of [evalId, meetId, sheetId]) {
    if (!id) continue;
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: id }); } catch { /* כבר נמחק */ }
  }
};
process.on("uncaughtException", async (e) => {
  console.log("שגיאה:", e.message); await cleanup(); await reg.restore(); process.exit(1);
});

/* ⚠ המטמון של השרת יושב בתהליך אחר — ממתינים **על תנאי**. */
const meeting = async () => {
  const d = await call(M, "GET", "/api/lessons?action=sheet&id=" + sheetId);
  return (d.b.meetings || []).find((m) => m.id === meetId) || null;
};
const evalsOf = async () => (await call(M, "GET", "/api/lessons?action=evals")).b.evals || [];
const evalFor = async (mid) => (await evalsOf()).find((e) => String(e.meetingId) === String(mid)) || null;

try {
  if (!meetingContactReady()) {
    console.log("  X עמודות פרטי הקשר של המפגש טרם הוקמו — npm run seed:meeting-contact -- --go");
    fail++;
    throw new Error("setup");
  }
  ok("עמודות פרטי הקשר של המפגש קיימות", true);

  console.log("\n=== גיליון ומפגש משלנו ===");
  r = await call(M, "POST", "/api/lessons?action=sheet",
    { subject: SUBJECT, lecturer: "", dayTime: "שלישי 10:00" });
  ok("גיליון נוצר", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  sheetId = r.b.id;
  if (!sheetId) throw new Error("לא נוצר גיליון");

  r = await call(M, "POST", "/api/lessons?action=meeting",
    { sheetId, date: DATE, planned: "כן" });
  ok("מפגש נוצר", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  meetId = r.b.id;
  if (!meetId) throw new Error("לא נוצר מפגש");

  let m = await meeting();
  ok("ומתחיל בלי שם מרצה ובלי פרטים",
    m && !m.lecturer && !m.phone && !m.mail,
    JSON.stringify([m && m.lecturer, m && m.phone, m && m.mail]));

  console.log("\n=== 3 · שם מרצה ופרטי קשר בגיליון רגיל ===");
  r = await call(M, "POST", "/api/lessons?action=mark",
    { meetingId: meetId, happened: null, lecturer: "מור בדיקה",
      phone: "052-9999999", mail: "bodek@example.com" });
  ok("נשמר בגיליון שאינו מרצה מתחלף", r.s === 200, `${r.s} ${r.b.error || ""}`);

  m = await meeting();
  ok("השם חוזר", m && m.lecturer === "מור בדיקה", String(m && m.lecturer));
  ok("הטלפון חוזר", m && m.phone === "052-9999999", String(m && m.phone));
  ok("והאימייל חוזר", m && m.mail === "bodek@example.com", String(m && m.mail));

  /* ⚠⚠ ולפני שהשיעור התקיים — `happened` נשאר null. פרטים
     נרשמים לשיעור שיגיע בעוד שלושה חודשים. */
  ok("והמפגש נשאר טרם דווח", m && !m.happened, String(m && m.happened));

  console.log("\n=== 1 · שם מרצה אינו פותח חוות דעת ===");
  ok("לא נפתחה חוות דעת על הרשמת השם", (await evalFor(meetId)) === null);
  ok("והתשובה מצהירה על כך", r.b.evalCreated === false, String(r.b.evalCreated));

  /* ⚠ וגם "התקיים" אינו פותח — זה המסלול שהיה אוטומטי עד היום. */
  r = await call(M, "POST", "/api/lessons?action=mark",
    { meetingId: meetId, happened: "כן" });
  ok('סימון "התקיים" נשמר', r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok('ו"התקיים" אינו פותח חוות דעת', (await evalFor(meetId)) === null);

  console.log("\n=== 2 · שם שנרשם אחרי הפתיחה זורם לחוות הדעת ===");
  /* פתיחה מפורשת, בלי שם — כמו הכפתור במסך כשהשדה ריק. */
  r = await call(M, "POST", "/api/lessons?action=evals",
    { name: "", opinion: "שורת בדיקה. נמחקת בסוף.", cycle: "מחזור ב׳", meetingId: meetId });
  ok("שורה בלי שם נדחית", r.s === 400, `${r.s} ${r.b.error || ""}`);

  r = await call(M, "POST", "/api/lessons?action=evals",
    { name: "טרם נרשם שם המרצה · " + SUBJECT + " · " + DATE,
      opinion: "שורת בדיקה. נמחקת בסוף.", cycle: "מחזור ב׳", meetingId: meetId });
  ok("חוות דעת נפתחת בפעולה מפורשת", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  evalId = r.b.id;

  r = await call(M, "POST", "/api/lessons?action=mark",
    { meetingId: meetId, happened: "כן", lecturer: "שם אמיתי לבדיקה" });
  ok("השם החדש נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("והתשובה אומרת שחוות הדעת שונתה", r.b.evalRenamed === true, String(r.b.evalRenamed));

  let e = await evalFor(meetId);
  ok("ושם חוות הדעת התעדכן מעצמו", e && e.name === "שם אמיתי לבדיקה", String(e && e.name));

  /* ⚠⚠ **והכיוון השני: שם אמיתי אינו נדרס.** דריסה מוחקת
     עבודה של אדם בלי לומר מילה. */
  r = await call(M, "POST", "/api/lessons?action=mark",
    { meetingId: meetId, happened: "כן", lecturer: "שם שני לבדיקה" });
  e = await evalFor(meetId);
  ok("אבל שם שכבר נכתב אינו נדרס", e && e.name === "שם אמיתי לבדיקה", String(e && e.name));
  ok("והתשובה אינה מצהירה על שינוי", r.b.evalRenamed === false, String(r.b.evalRenamed));

  console.log("\n=== פרטי הקשר עוברים לחוות דעת שנפתחת אחריהם ===");
  const raw = await gql(
    `query($i:[ID!]){ items(ids:$i){ column_values(ids:["${LC.evals.phone}","${LC.evals.mail}"]){ id text } } }`,
    { i: [evalId] });
  const cols = raw.items[0].column_values;
  const got = (id) => (cols.find((c) => c.id === id) || {}).text || "";
  /* ⚠ השורה הזו נפתחה **לפני** שהפרטים הוזנו? לא — הם הוזנו
     ראשונים, ולכן חייבים להיות עליה. */
  ok("הטלפון הועתק לחוות הדעת", got(LC.evals.phone) === "052-9999999", got(LC.evals.phone));
  ok("והאימייל הועתק", got(LC.evals.mail) === "bodek@example.com", got(LC.evals.mail));

  console.log("\n=== והפרטים אינם יוצאים לחניך ===");
  /* ⚠⚠ **בודק את מסלול הקריאה ולא את השורה.** אם מסלול
     חדש ייפתח לחניך עם פריסת `...m`, הוא ייפול כאן.
     ⚠ ודרך הארכיון עצמו — `toStudentLesson` אינו מיוצא,
       וייבוא שלו היה מדלג את הסעיף בשקט (עיקרון 6). */
  const arch = await call(M, "GET", "/api/lessons?action=archive");
  ok("הארכיון נקרא", arch.s === 200, String(arch.s));
  const row = (arch.b.lessons || []).find((x) => String(x.id) === String(meetId));
  ok("והמפגש שלנו בתוכו", Boolean(row), String(meetId));
  if (row) {
    const txt = JSON.stringify(row);
    /* ⚠⚠ **השם כן יוצא לחניך** — זו בקשה מפורשת
       (*"חשוב גם שבצד החניך יראו את שם המרצה"*).
       ⚠ והוא השם שעל **המפגש**, האחרון שנכתב — ההגנה
         מפני דריסה חלה על שם חוות הדעת בלבד, שהוא טקסט
         שאדם ערך. שדה שממלאים בטופס נשמר כפשוטו. */
    ok("שם המרצה יוצא לחניך", row.lecturer === "שם שני לבדיקה", String(row.lecturer));
    ok("הטלפון אינו במיפוי לחניך", !txt.includes("052-9999999"), txt.slice(0, 160));
    ok("והאימייל אינו במיפוי לחניך", !txt.includes("bodek@example.com"), txt.slice(0, 160));
  }
} finally {
  await cleanup();
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
