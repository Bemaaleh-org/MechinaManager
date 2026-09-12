/* ============================================================
   מכסת ימי החופש — הפרדה מוחלטת בין המחציות

   ⚠ הבדיקה יוצרת שורות היעדרות ומוחקת אותן בסוף, כולל בכשל.
     היא נוגעת בחניך אחד בלבד — **חשבון הבדיקה**, ולא בחניך
     אמיתי, כדי שלא תיווצר לאף אחד היעדרות פיקטיבית ברישום.
   ============================================================ */
import { tempRegister } from "./_auth.mjs";
import { gql } from "../../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { invalidate } from "../../api/_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../../shared/mechina-boards.js";
import {
  loadCalendar, loadAbsences, loadMarked, createAbsence, deleteAbsence, invalidateAttendance,
} from "../../api/_attendance-data.js";
import {
  ABSENCE, ABSENCE_SOURCE, HALF, VACATION_PER_HALF, VACATION_ALLOWED_ON,
} from "../../shared/mechina-boards.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 300) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ============================================================
   החניך שנבדק: **חשבון הבדיקה בלבד**
   ------------------------------------------------------------
   ⚠ חשבון הבדיקה מסונן מ-`activeStudents` בכוונה (סעיף 4לא),
     ולכן `?action=mark` דוחה אותו ב-"חניך לא מוכר ברשימה".

   ⚠ **וזו הייתה כמעט בדיקה ריקה.** הריצה הראשונה "עברה" על
     "יום רביעי נחסם" — כי אכן חזר 400, אבל מסיבה אחרת לגמרי.
     רק בדיקת **תוכן** ההודעה תפסה את זה. סטטוס לבדו אינו ראיה.

   הפתרון: מכבים את דגל הבדיקה לזמן הריצה ומחזירים אותו
   ב-finally. כך הבדיקה רצה על חניך שאינו אמיתי, ובכל זאת
   עוברת את אותו מסלול בדיוק כמו חניך אמיתי.
   ============================================================ */
const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("לא נמצא חשבון בדיקה — הבדיקה אינה רצה על חניך אמיתי"); process.exit(1); }
console.log(`נבדק: ${demo.name} (חשבון בדיקה)`);

const setDemo = async (on) => {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
    { b: MECHINA_BOARDS.roster, i: demo.id,
      v: JSON.stringify({ [MECHINA_COLS.roster.demo]: { checked: on ? "true" : "false" } }) });
  invalidate("student-rows");
};

const cal = await loadCalendar();
/* ⚠ הסוג נלקח מ-VACATION_ALLOWED_ON ולא מוקלד. גרסה קודמת
   חיפשה "שגרה" בעוד שבלוח כתוב "רגיל", והבדיקה דילגה על עצמה
   בשקט במקום להיכשל. */
const usable = (d) => VACATION_ALLOWED_ON.includes(d.kind);

/* ============================================================
   ⚠⚠ **יום שכבר סומנה בו נוכחות אינו יום שאפשר לבדוק עליו.**

   הבדיקה בחרה את ימי השגרה **הראשונים** של כל מחצית — שהם
   בדיוק הימים הראשונים של שנת המכינה, כלומר בדיוק הימים
   שהצוות סימן ראשונים. שתי פגיעות נבעו מזה, ושתיהן בנתונים
   אמיתיים:

   1. הניקוי מחק את שורת יום הסימון לפי **תאריך** — ואיתה
      נוכחות אמיתית של 33 חניכים בשלושה ימים.
   2. `?action=mark` **דורס** את רשימת הנוכחים של אותו יום,
      ולכן אפילו בלי מחיקה היום נשאר בלוח עם אפס נוכחים.

   הפתרון הוא בבחירה ולא בניקוי: הבדיקה עובדת רק על ימים
   שאיש עוד לא סימן. `marksBefore` מצולם **לפני** הבחירה,
   ומשמש גם כאן וגם בניקוי שבסוף.
   ============================================================ */
const marksBefore = new Set((await loadMarked({ force: true })).keys());
const free = (d) => usable(d) && !marksBefore.has(d.date);

const firstDays = cal.days.filter((d) => d.half === HALF.first && free(d));
const secondDays = cal.days.filter((d) => d.half === HALF.second && free(d));
if (firstDays.length < 6 || secondDays.length < 2) {
  console.log("אין מספיק ימי שגרה שטרם סומנו בשתי המחציות — אי אפשר לבדוק");
  process.exit(1);
}
if (marksBefore.size) {
  console.log(`  (${marksBefore.size} ימים כבר מסומנים בלוח — הבדיקה מדלגת עליהם)`);
}

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const code = (t) => cv(us.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const D = jar();
await call(D, "POST", "/api/auth?action=login", { code: code("דני לויט") });

await setDemo(false);

/* ⚠ **המטמון של השרת יושב בתהליך אחר.** `invalidate` כאן אינו
   נוגע בו, ו-`activeStudents` שם מחזיק רשימה בת עד 30 שניות.
   בלי ההמתנה הזו הבדיקה קיבלה "חניך לא מוכר ברשימה" ו**עברה
   מסיבה שגויה** — 400 הוא 400.

   ⚠ המתנה על **תנאי** ולא על זמן: ברגע שהשרת רואה את החניך,
     ממשיכים. */
const seesStudent = async () => {
  const r = await call(D, "GET", "/api/students?action=list");
  return r.s === 200 && (r.b.students || []).some((x) => String(x.id) === demo.id);
};
let ready = false;
for (let i = 0; i < 45 && !ready; i++) {
  ready = await seesStudent();
  if (!ready) await new Promise((z) => setTimeout(z, 1000));
}
if (!ready) {
  console.log("השרת עדיין אינו רואה את חשבון הבדיקה — הבדיקה נעצרת");
  await setDemo(true); process.exit(1);
}
console.log("  (השרת רואה את החניך — ממשיכים)");

/* השורות שהבדיקה יצרה — נמחקות לפי מזהה, לא לפי סינון */
const mine = [];
const seed = async (date) => {
  const id = await createAbsence({
    studentId: demo.id, studentName: demo.name, date,
    type: ABSENCE.vacation, detail: "", source: ABSENCE_SOURCE.manual,
  });
  mine.push(id);
  return id;
};

const markVacation = (date) => call(D, "POST", "/api/attendance?action=mark", {
  date, absences: [{ studentId: demo.id, type: ABSENCE.vacation, detail: "" }], present: [],
});

try {
  /* ---- ניקוי מצב פתיחה: אין לחשבון הבדיקה חופשים ---- */
  const before = (await loadAbsences({ force: true }))
    .filter((a) => a.studentId === demo.id && a.type === ABSENCE.vacation);
  ok("חשבון הבדיקה מתחיל בלי ימי חופש", before.length === 0,
    `${before.length} קיימים — הבדיקה תדלג`);
  if (before.length) process.exit(1);

  /* ============================================================
     1 · הסימון הידני אינו נאכף על ידי המכסה — ואינו יורד ממנה
     ------------------------------------------------------------
     ⚠⚠⚠ **הבלוק הזה התהפך ב-12.9.2026.** הוא נעל קודם את
       הכלל ההפוך ("יום רביעי במחצית א׳ נחסם"), וההערה כאן
       אמרה שזו "הטענה המרכזית".

     מאז המכסה נגזרת **מבקשות מאושרות בלבד**, ולכן:
       · סימון ידני רביעי **עובר** — הוא תיאור של יום.
       · והוא **אינו** יורד מהמכסה, אבל **מדווח** ב-`manual`.

     שתי הטענות נחוצות יחד: "עובר" לבדו היה נשאר ירוק גם אילו
     השורות נעלמו מהחישוב בשקט, ו-"אינו יורד" לבדו היה נשאר
     ירוק גם אילו הסימון נחסם מראש.
     ============================================================ */
  console.log(`=== סימון ידני ומכסה (${VACATION_PER_HALF} ימים למחצית) ===`);
  for (let i = 0; i < VACATION_PER_HALF; i++) await seed(firstDays[i].date);
  invalidateAttendance();

  let r = await markVacation(firstDays[VACATION_PER_HALF].date);
  ok("סימון ידני רביעי במחצית א׳ עובר",
    r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ ובמפורש: ההודעה הישנה על מכסה **אינה** חוזרת. טענה על
     היעדר היא מה שמונע החזרה שקטה של החסימה. */
  ok("ואין הודעת מכסה בסימון הידני",
    !String(r.b.error || "").includes("מכסת ימי החופש"),
    r.b.error || "(אין שגיאה)");

  /* ============ 2 · והמחציות מופרדות ============ */
  console.log("=== הפרדה בין המחציות ===");
  /* ⚠ העיקר: שלושה ימים שנוצלו במחצית א׳ **אינם** מפחיתים
     ממחצית ב׳. בלי ההפרדה החניך היה נחסם כאן. */
  r = await markVacation(secondDays[0].date);
  ok("אותו חניך כן מקבל יום במחצית ב׳", r.s === 200, `${r.s} ${r.b.error || ""}`);
  if (r.s === 200) {
    const added = (await loadAbsences({ force: true }))
      .find((a) => a.studentId === demo.id && a.date === secondDays[0].date);
    if (added) mine.push(added.id);
    ok("והשורה אכן נוצרה", Boolean(added), added ? added.date : "לא נוצרה");
  }

  /* ---- והמכסה של ב׳ נספרת בנפרד ---- */
  for (let i = 1; i < VACATION_PER_HALF; i++) await seed(secondDays[i].date);
  invalidateAttendance();
  r = await markVacation(secondDays[VACATION_PER_HALF].date);
  /* ============================================================
     ⚠⚠⚠ **ההיפוך של 12.9.2026.** הטענה כאן הייתה "ורביעי
       במחצית ב׳ נחסם גם הוא", והיא נעלה את הכלל שהמכסה נאכפת
       בסימון היומי.

     מאז המכסה נגזרת **מבקשות מאושרות בלבד**, והסימון היומי
     אינו יורד ממנה — ולכן חסימה שלו הייתה חוסמת תיאור של יום
     על סמך תקציב שהוא אינו נוגע בו.

     ⚠ **הטענה עודכנה ולא הקוד**, והיא נועלת עכשיו את הכלל
       החדש: הסימון עובר.
     ============================================================ */
  /* ⚠ `created` בתשובה הוא **מספר** ולא רשימת מזהים
     (api/_attendance-mark.js), והניקוי שב-`finally` סורק בכל
     מקרה כל שורה של חשבון הבדיקה — לכן אין מה לדחוף. */
  ok("סימון ידני רביעי עובר — הוא אינו יורד מהמכסה",
    r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ============ 3 · הסיכום תואם את האכיפה ============ */
  console.log("=== הסיכום ===");
  r = await call(D, "GET", `/api/students?action=year&student=${demo.id}`);
  if (r.s === 200) {
    const q = r.b.summary?.quota || [];
    const a = q.find((x) => x.half === HALF.first);
    const b2 = q.find((x) => x.half === HALF.second);
    /* ============================================================
       ⚠⚠ **המכסה נגזרת מבקשות מאושרות בלבד** (12.9.2026).

       כל השורות שהבדיקה יצרה הן `סימון ידני`, ולכן `used`
       חייב להיות 0 והיתרה מלאה — **ו-`manual` חייב לספור
       אותן**. שתי הטענות יחד: אחת לבדה הייתה נשארת ירוקה גם
       אילו השורות נעלמו מהחישוב לגמרי בלי להידווח (4יח).
       ============================================================ */
    ok("סימון ידני אינו יורד מהמכסה — מחצית א׳",
      a && a.used === 0 && a.left === a.total, JSON.stringify(a));
    ok("וגם מחצית ב׳", b2 && b2.used === 0 && b2.left === b2.total, JSON.stringify(b2));
    ok("אבל הוא מדווח ב-manual ואינו נעלם בשקט",
      a && a.manual > 0 && b2 && b2.manual > 0,
      `א׳=${a && a.manual} ב׳=${b2 && b2.manual}`);
  } else {
    ok("סיכום השנה נקרא", false, `${r.s} ${r.b.error || ""}`);
  }

  /* ============ 4 · תיקון יום קיים אינו נחסם ============ */
  console.log("=== תיקון שורה קיימת ===");
  /* ⚠ יום שכבר מסומן חופש אינו יום נוסף. בלי החריג הזה,
     עריכת פירוט של חופש קיים הייתה נחסמת. */
  r = await markVacation(firstDays[0].date);
  ok("סימון חוזר של יום שכבר חופש עובר", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ============ 5 · סוגים אחרים אינם מוגבלים ============ */
  console.log("=== מחלה אינה מוגבלת ===");
  r = await call(D, "POST", "/api/attendance?action=mark", {
    date: firstDays[VACATION_PER_HALF].date,
    absences: [{ studentId: demo.id, type: ABSENCE.sick, detail: "" }], present: [],
  });
  ok("מחלה עוברת גם כשמכסת החופש נגמרה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  if (r.s === 200) {
    const add = (await loadAbsences({ force: true }))
      .find((a) => a.studentId === demo.id && a.date === firstDays[VACATION_PER_HALF].date);
    if (add) mine.push(add.id);
  }
} finally {
  /* ============================================================
     ניקוי
     ------------------------------------------------------------
     ⚠ **כל שורה שנמחקת כאן שייכת לחשבון הבדיקה**, וזה התנאי
       היחיד שמותר להסתמך עליו. סינון לפי שם ותאריך מחק בסשן
       הזה שורה אמיתית מלוח אחר — ראו CLAUDE.md.
     ============================================================ */
  let n = 0;
  for (const a of await loadAbsences({ force: true })) {
    if (a.studentId !== demo.id) continue;
    await deleteAbsence(a.id); n++;
  }

  /* ⚠ **וגם שורות "יום שסומן".** `?action=mark` יוצר שורה
     בלוח הסימונים לכל תאריך שנוגעים בו, וגרסה קודמת ניקתה
     היעדרויות בלבד. התוצאה: שלושה ימים נשארו מסומנים בלוח
     האמיתי, והמכינה ראתה 4 ימי נוכחות שלא היו — כולל אחד
     בפברואר 2027.

     ⚠ נמחקים **רק** התאריכים שהבדיקה נגעה בהם, לפי הרשימה
       שהיא בנתה — ולא לפי סינון על ערכים. */
  const touched = new Set([
    ...firstDays.slice(0, VACATION_PER_HALF + 1).map((d) => d.date),
    ...secondDays.slice(0, VACATION_PER_HALF + 1).map((d) => d.date),
  ]);
  const marks = await loadMarked({ force: true });
  let mk = 0, kept = 0;
  for (const [date, stamp] of marks.entries()) {
    if (!touched.has(date)) continue;
    /* ⚠⚠ **יום שכבר היה מסומן לפני ההרצה אינו שלנו.** הבדיקה
       נגעה בתאריך, אבל השורה נכתבה על ידי המכינה — ומחיקתה
       מוחקת נוכחות אמיתית של כל החניכים. */
    if (marksBefore.has(date)) { kept++; continue; }
    await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: stamp.id });
    mk++;
  }
  if (kept) console.log(`  (${kept} ימי סימון היו קיימים מראש ולא נגענו בהם)`);
  invalidateAttendance();
  if (mk) console.log(`  (נמחקו ${mk} ימי סימון שהבדיקה יצרה)`);
  /* ⚠ דגל הבדיקה חוזר תמיד. בלעדיו חשבון הבדיקה נספר בנוכחות
     של כל המכינה. */
  await setDemo(true);
  const back = (await studentRows({ force: true })).find((r) => r.id === demo.id);
  console.log(back?.demo ? "  (דגל הבדיקה שוחזר)" : "  !! דגל הבדיקה לא שוחזר — לבדוק בלוח");
  const left = (await loadAbsences({ force: true })).filter((a) => a.studentId === demo.id);
  console.log(`  (נוקו ${n} שורות · נותרו ${left.length} לחשבון הבדיקה)`);
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
