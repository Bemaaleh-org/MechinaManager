/* ============================================================
   השעיה, ושחרור היעדרות מאושרת על ידי מוביל שבוע
   ------------------------------------------------------------
   שתי בקשות של ראש המכינה (23.9.2026), ובאותו מסך:

     1. *"בסימון נוכחות יהיה אפשר להוסיף אופציה של השעייה...
        כאשר סימון אופציה זו תינתן אך ורק לראש מכינה, נועם או
        שירה."*
     2. *"שלמובילשים לא יהיה נעול סימון נוכחות לאנשים נעדרים...
        לעיתים אותו אדם חוזר מוקדם יותר מהצפוי."*

   ⚠⚠ **הבדיקה בוחרת יום שאיש לא נגע בו, ומאמתת את זה.**
     `quota-test` מחק פעם שלושה ימי נוכחות אמיתיים של 33
     חניכים, כי בחר את ימי השגרה **הראשונים** — שהם בדיוק
     הימים שהצוות סימן ראשונים (5א). כאן נבחר יום לימוד עתידי
     שאין לו שורת סימון ואין בו אף היעדרות, והבחירה נבדקת
     מול הלוח ולא מול התצוגה.

   ⚠⚠ **`?action=mark` נוגע בשני לוחות** — היעדרויות **וסימונים**.
     הניקוי סופר את שניהם: שורות ההיעדרות נמחקות לפי המזהה
     שחזר מהיצירה, ושורת הסימון נמחקת **רק אם לא הייתה קיימת
     לפני** (הצילום בתחילת ההרצה).

   ⚠ **וניקוי גם על נפילה** — `finally` ו-`uncaughtException`.
     בדיקה שתלויה בכך שכל שלב יצליח היא בדיוק זו שמשאירה
     נתונים על שורות אמיתיות.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS, suspendReady } from "../../shared/auth-board.js";
import { studentRows, activeStudents } from "../../api/_student-rows.js";
import { loadLeaderWeeks } from "../../api/_leader-weeks.js";
import {
  loadCalendar, isSchoolDay, loadMarked, loadAbsences,
  createAbsence, deleteAbsence,
} from "../../api/_attendance-data.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, ABSENCE, ABSENCE_SOURCE,
} from "../../shared/mechina-boards.js";
import { maySuspend } from "../../shared/edit-rights.js";

const B = "http://localhost:5173";
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
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
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 250) }; }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ============================================================
   1. הכלל — פונקציה טהורה
   ============================================================ */
console.log("\n=== מי רשאי להשעות ===");
ok("ראש מכינה", maySuspend({ isHead: true }) === true);
ok("מי שסומן בתיבה", maySuspend({ canSuspend: true }) === true);
/* ⚠ `isManager` הוא כל כניסת צוות — מדריך, רואה חשבון, מנכ״ל
   (5יז). אילו הוא היה פותח, "אך ורק" לא היה אומר דבר. */
ok("איש צוות רגיל — לא", maySuspend({ isManager: true }) === false);
ok("חניך — לא, גם עם התיבה",
  maySuspend({ isStudent: true, canSuspend: true }) === false);
ok("צפייה בלבד גוברת",
  maySuspend({ isHead: true, viewOnly: true }) === false);

/* ============================================================
   2. התווית בלוח
   ============================================================ */
console.log("\n=== התווית בלוח ===");
ok("עמודת \"רשאי להשעות\" הוקמה", suspendReady() === true,
  String(AUTH_COLS.suspend || "ריק"));
const typeCol = (await gql(
  `query($b:[ID!]){ boards(ids:$b){ columns{ id settings_str } } }`,
  { b: [MECHINA_BOARDS.absence] })).boards[0].columns
  .find((c) => String(c.id) === String(MECHINA_COLS.absence.type));
const labels = Object.values(JSON.parse((typeCol || {}).settings_str || "{}").labels || {});
/* ⚠ **תו בתו** — תווית שאינה זהה גורמת לכתיבה להיכשל, ושום
   דבר בקוד לא יתפוס את זה (ראו "לוחות monday"). */
ok("\"השעיה\" קיימת בעמודת הסוג", labels.includes(ABSENCE.suspension),
  labels.join(" · "));
for (const t of [ABSENCE.vacation, ABSENCE.sick, ABSENCE.justified]) {
  ok(`ו-"${t}" שרדה`, labels.includes(t));
}

/* ============================================================
   3. דרך השרת
   ============================================================ */
const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }

const cal = await loadCalendar();
const marksBefore = new Set((await loadMarked({ force: true })).keys());
const absBefore = await loadAbsences({ force: true });
const absDates = new Set(absBefore.map((a) => a.date));

/* ⚠⚠ **יום לימוד עתידי שאיש לא נגע בו** — לא מסומן, ואין בו
   אף היעדרות. שני התנאים נבדקים מול הלוח. */
const today = new Date().toISOString().slice(0, 10);
const virgin = cal.days
  .filter((d) => isSchoolDay(d) && d.date > today
    && !marksBefore.has(d.date) && !absDates.has(d.date))
  .map((d) => d.date);
if (virgin.length < 2) {
  console.log(`\n✗ פחות משני ימי לימוד עתידיים נקיים (${virgin.length})`);
  process.exit(1);
}
/* מהסוף אחורה — הרחוקים ביותר הם הפחות סבירים להיות בשימוש. */
const daySusp = virgin[virgin.length - 1];
const dayLead = virgin[virgin.length - 2];

const students = await activeStudents();
const victim = students[0];
if (!victim) { console.log("אין חניכים פעילים"); process.exit(1); }

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

/* מה שהבדיקה יצרה — נמחק לפי מזהה, ולא לפי סינון ערכים. */
const madeAbs = [];
let leadWeek = null, leadBefore = [];

const cleanup = async () => {
  for (const id of madeAbs.splice(0)) {
    await deleteAbsence(id).catch((e) => console.log("  ! היעדרות " + id + " לא נמחקה: " + e.message));
  }
  /* ⚠ **כל היעדרות שנשארה על אחד משני הימים**, גם אם לא אנחנו
     יצרנו אותה: שני הימים נבחרו כשהיו ריקים לגמרי. */
  const now = await loadAbsences({ force: true });
  for (const a of now) {
    if (a.date !== daySusp && a.date !== dayLead) continue;
    await deleteAbsence(a.id).catch(() => {});
    console.log("  ! נוקתה היעדרות שנשארה על " + a.date);
  }
  /* ⚠⚠ **ושורות הסימון** — `?action=mark` יוצר אותן, והן בלוח
     אחר. `quota-test` השאיר כך שלושה ימים מסומנים בלוח האמיתי. */
  const marks = await loadMarked({ force: true });
  for (const [date, stamp] of marks.entries()) {
    if (date !== daySusp && date !== dayLead) continue;
    if (marksBefore.has(date)) continue;
    await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: String(stamp.id) })
      .then(() => console.log("  נוקתה שורת סימון: " + date))
      .catch((e) => console.log("  ! שורת סימון " + date + " לא נמחקה: " + e.message));
  }
  if (leadWeek) {
    await call(M, "POST", "/api/students?action=weeks",
      { weekId: String(leadWeek), studentIds: leadBefore.map(String) }).catch(() => {});
  }
};
/* ⚠ גם על נפילה — בדיקה שתלויה בכך שכל שלב יצליח היא זו
   שמשאירה נתונים על שורות אמיתיות. */
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, async () => { await cleanup(); process.exit(1); });
}
process.on("uncaughtException", async (e) => {
  console.log("  X חריגה: " + (e && e.message));
  await cleanup(); process.exit(1);
});

console.log(`\nיום להשעיה: ${daySusp}  ·  יום למוביל: ${dayLead}`);
console.log(`חניך נבדק: ${victim.name}`);

try {
  /* ---------- 3א. מה שיוצא למסך ---------- */
  console.log("\n=== ?action=day ===");
  r = await call(M, "GET", `/api/attendance?action=day&date=${daySusp}`);
  ok("ראש המכינה פותח את היום", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("ומקבל canSuspend", r.b.canSuspend === true, String(r.b.canSuspend));
  ok("ו-\"השעיה\" ברשימת הסוגים",
    (r.b.types || []).includes(ABSENCE.suspension), (r.b.types || []).join(" · "));

  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ---------- 3ב. ההשעיה עצמה ---------- */
  console.log("\n=== סימון השעיה ===");
  /* ============================================================
     ⚠⚠ **שתי הטענות התהפכו במכוון** (23.9.2026).

     הגרסה הראשונה דרשה פירוט ונעלה 400. זה היה באג: שדה
     הפירוט במסך מרונדר רק על "מוצדקת", כלומר בהשעיה לא היה
     לאן להקליד והשמירה נדחתה תמיד. הבדיקה הייתה **ירוקה על
     תכונה שאי אפשר להשתמש בה**.

     ⚠ ו"מוצדקת" נשארת חובה — הטענה מתחת נועלת את זה, אחרת
       הסרת הדרישה כאן הייתה יכולה להסיר גם אותה בלי שאיש ישים
       לב.
     ============================================================ */
  r = await call(M, "POST", "/api/attendance?action=mark", {
    date: daySusp, present: [],
    absences: [{ studentId: victim.id, type: ABSENCE.suspension, detail: "" }],
  });
  ok("בלי פירוט — נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(M, "POST", "/api/attendance?action=mark", {
    date: daySusp, present: [],
    absences: [{ studentId: victim.id, type: ABSENCE.justified, detail: "" }],
  });
  ok("ומוצדקת בלי פירוט עדיין נדחית", r.s === 400 && /פירוט/.test(r.b.error || ""),
    `${r.s} ${r.b.error || ""}`);

  r = await call(M, "POST", "/api/attendance?action=mark", {
    date: daySusp, present: [],
    absences: [{ studentId: victim.id, type: ABSENCE.suspension, detail: "" }],
  });
  ok("והשעיה נשמרת", r.s === 200, `${r.s} ${r.b.error || ""}`);

  const after = await loadAbsences({ force: true });
  const row = after.find((a) => a.date === daySusp && a.studentId === victim.id);
  if (row) madeAbs.push(String(row.id));
  ok("והשורה נכתבה עם הסוג הנכון",
    Boolean(row) && row.type === ABSENCE.suspension, row ? String(row.type) : "—");
  /* ⚠ **סימון ידני ולא "בקשה מאושרת"** — אחרת היא הייתה יורדת
     ממכסת החופש של החניך (5לט). */
  ok("וכסימון ידני", Boolean(row) && row.source === ABSENCE_SOURCE.manual,
    row ? String(row.source) : "—");

  /* ============================================================
     4. מוביל שבוע — שחרור היעדרות מאושרת
     ============================================================ */
  console.log("\n=== מוביל שבוע ===");
  const weeks = await loadLeaderWeeks();
  const w = weeks.find((x) => x.assignable && x.start <= dayLead && dayLead <= x.end);
  if (!w) {
    console.log("  (התאריך אינו בשבוע שניתן לשיבוץ — מדולג)");
  } else {
    leadWeek = w.id;
    leadBefore = (w.leaderIds || []).map(String);
    r = await call(M, "POST", "/api/students?action=weeks",
      { weekId: String(w.id), studentIds: [String(demo.id)] });
    ok("חשבון הבדיקה שובץ כמוביל השבוע", r.s === 200, `${r.s} ${r.b.error || ""}`);

    /* ============================================================
       ⚠⚠ **הגבול נבדק על יום שהמוביל **כן** רשאי לפתוח.**

       גרסה ראשונה בדקה אותו על `daySusp`, שאינו בשבוע שלו —
       התשובה הייתה 403, `canSuspend` חזר `undefined`, והטענה
       "אינו מקבל canSuspend" הייתה **ירוקה מסיבה שגויה**. היא
       הייתה נשארת ירוקה גם אילו השדה נפתח לכל חניך.
       ============================================================ */
    console.log("\n=== מי שאינו רשאי ===");
    r = await call(S, "GET", `/api/attendance?action=day&date=${dayLead}&today=${dayLead}`);
    ok("המוביל פותח את היום שלו", r.s === 200, `${r.s} ${r.b.error || ""}`);
    /* ⚠ חניך; וגם אם מחר תסומן לו התיבה בטעות, `maySuspend`
       חוסם אותו. */
    ok("ואינו מקבל canSuspend", r.b.canSuspend === false, String(r.b.canSuspend));
    ok("ו-\"השעיה\" אינה ברשימת הסוגים שלו",
      (r.b.types || []).length === 3
        && !r.b.types.includes(ABSENCE.suspension), (r.b.types || []).join(" · "));

    /* היעדרות שמקורה בבקשה מאושרת — כמו זו שההכרעה יוצרת. */
    const madeId = await createAbsence({
      studentId: victim.id, studentName: victim.name, date: dayLead,
      type: ABSENCE.vacation, detail: "בדיקה אוטומטית — להתעלם",
      source: ABSENCE_SOURCE.request,
    });
    madeAbs.push(String(madeId));
    ok("ונוצרה היעדרות מאושרת", Boolean(madeId));

    /* ⚠⚠⚠ **הבאג שנמצא בדרך.** המסך שולח בחזרה את המצב המלא,
       והסיבה אינה יוצאת למוביל כלל — ולכן כל היעדרות קיימת
       חזרה לשרת **בלי סוג**, והאימות דחה את כל השמירה ב-400.
       כלומר יום שהיה בו ולו חניך אחד נעדר לא היה ניתן לסימון
       על ידי מוביל שבוע בכלל. */
    r = await call(S, "POST", `/api/attendance?action=mark&today=${dayLead}`, {
      date: dayLead, present: [],
      absences: [{ studentId: victim.id, type: "", detail: "" }],
    });
    ok("שורה בלי סוג ממוביל — נשמר ולא 400", r.s === 200, `${r.s} ${r.b.error || ""}`);
    ok("ומדווח שהיא נשארה כפי שהייתה",
      (r.b.kept || []).includes(victim.name), JSON.stringify(r.b.kept || []));
    let live = (await loadAbsences({ force: true }))
      .find((a) => a.date === dayLead && a.studentId === victim.id);
    ok("וההיעדרות אכן שרדה", Boolean(live), live ? String(live.type) : "נמחקה");

    /* ⚠ וזו הבקשה עצמה: סימון "נוכח" מסיר את ההיעדרות המאושרת. */
    r = await call(S, "POST", `/api/attendance?action=mark&today=${dayLead}`, {
      date: dayLead, present: [String(victim.id)], absences: [],
    });
    ok("מוביל מסמן \"נוכח\" על היעדרות מאושרת", r.s === 200, `${r.s} ${r.b.error || ""}`);
    ok("ומדווח released בנפרד מ-removed",
      (r.b.released || []).includes(victim.name), JSON.stringify(r.b.released || []));
    live = (await loadAbsences({ force: true }))
      .find((a) => a.date === dayLead && a.studentId === victim.id);
    /* ⚠⚠ **שני הכיוונים באותה הרצה** — בלי הטענה הזו "released"
       היה ירוק גם אילו השורה נשארה בלוח. */
    ok("וההיעדרות אינה עוד בלוח", !live, live ? "עדיין קיימת" : "");
    if (!live) madeAbs.splice(madeAbs.indexOf(String(madeId)), 1);

    /* ⚠ ומה שנשאר נעול: שינוי הסיבה. */
    const madeId2 = await createAbsence({
      studentId: victim.id, studentName: victim.name, date: dayLead,
      type: ABSENCE.vacation, detail: "בדיקה אוטומטית — להתעלם",
      source: ABSENCE_SOURCE.request,
    });
    madeAbs.push(String(madeId2));
    r = await call(S, "POST", `/api/attendance?action=mark&today=${dayLead}`, {
      date: dayLead, present: [],
      absences: [{ studentId: victim.id, type: ABSENCE.sick, detail: "ניסיון שינוי" }],
    });
    ok("אבל שינוי הסיבה נחסם", r.s === 200 && (r.b.locked || []).length > 0,
      `${r.s} locked=${JSON.stringify(r.b.locked || [])}`);
    live = (await loadAbsences({ force: true }))
      .find((a) => a.date === dayLead && a.studentId === victim.id);
    ok("והסיבה המקורית שרדה",
      Boolean(live) && live.type === ABSENCE.vacation, live ? String(live.type) : "נמחקה");

    /* ⚠ וההשעיה חסומה לו גם כשהיא חוקית לכל דבר אחר. */
    r = await call(S, "POST", `/api/attendance?action=mark&today=${dayLead}`, {
      date: dayLead, present: [],
      absences: [{ studentId: victim.id, type: ABSENCE.suspension, detail: "ניסיון" }],
    });
    ok("ומוביל שבוע אינו משעה", r.s === 403, `${r.s} ${r.b.error || ""}`);
  }
} catch (e) {
  console.log("  X נפילה: " + (e && e.message));
  fail++;
} finally {
  console.log("\n=== ניקוי ===");
  await cleanup();
  /* ⚠ **סריקה סופית** — מה שנשאר נאמר ולא נבלע. */
  const left = (await loadAbsences({ force: true }))
    .filter((a) => a.date === daySusp || a.date === dayLead);
  ok("לא נשארו היעדרויות של הבדיקה", left.length === 0,
    left.map((a) => `${a.date}/${a.studentId}`).join(" · "));
  const marksNow = await loadMarked({ force: true });
  const extra = [...marksNow.keys()].filter((d) =>
    (d === daySusp || d === dayLead) && !marksBefore.has(d));
  ok("ולא נשארו ימי סימון חדשים", extra.length === 0, extra.join(" · "));
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
