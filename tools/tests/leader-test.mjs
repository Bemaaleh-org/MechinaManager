/* ============================================================
   מוביל שבוע — הטווח שבאחריותו, והעברת ההרשאה בזמן
   ------------------------------------------------------------
   ⚠ הבדיקה משבצת את **חשבון הבדיקה** לשבוע קיים ומחזירה את
     המובילים המקוריים ב-finally. היא אינה נוגעת בחניך אמיתי
     ואינה יוצרת שבועות.

   ⚠⚠ **ואינה מסמנת נוכחות באף יום.** כאן נבדק **מי רשאי**,
     כלומר סטטוסים בלבד — כל POST ל-`?action=mark` בבדיקה הזו
     אמור לחזור 403. גרסה ראשונה שלה סימנה יום בתוך השבוע
     וקיבלה 200, והשאירה בלוח האמיתי יום נוכחות ריק. הסימון
     עצמו נבדק ב-quota-test, שבוחר ימים שאיש לא נגע בהם.

   ⚠ הניקוי שבסוף מוודא שלא נשאר יום סימון חדש. אם כן — הוא
     **אומר את זה** ולא מוחק בשקט: יום עם נוכחים הוא נתון של
     המכינה, ומחיקה שלו אינה ניתנת לתיקון.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { invalidate } from "../../api/_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../../shared/mechina-boards.js";
import { loadCalendar, isSchoolDay, loadMarked } from "../../api/_attendance-data.js";
import { LEAD_BOARDS, LEAD_COLS, leadReady } from "../../shared/lead-ids.js";

const B = "http://localhost:5173";
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 250) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const linked = (i, c) => ((i.column_values.find((x) => x.id === c) || {}).linked_item_ids || []).map(String);

const W = MECHINA_COLS.leaderWeeks;
const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }

const weeks = await allItems(MECHINA_BOARDS.leaderWeeks);
const cal = await loadCalendar();

/* ⚠ שבוע שיש בו לפחות **שני** ימי לימוד, כדי שאפשר יהיה לבדוק
   גם יום בתוך הטווח וגם יום מחוצה לו. נבחר לפי התכונה שנבדקת
   ולא לפי מיקום ברשימה. */
const schoolIn = (w) => cal.days.filter((d) =>
  d.date >= cv(w, W.start) && d.date <= cv(w, W.end) && isSchoolDay(d));
const week = weeks.find((w) => cv(w, W.start) && cv(w, W.end) && schoolIn(w).length >= 2);
if (!week) { console.log("אין שבוע עם שני ימי לימוד"); process.exit(1); }

const inside = schoolIn(week).map((d) => d.date);
/* יום לימוד שאינו בשבוע הזה */
const outsideDay = cal.days.find((d) => isSchoolDay(d)
  && (d.date < cv(week, W.start) || d.date > cv(week, W.end)));

/* ⚠ צילום ימי הסימון **לפני** כל פעולה — כדי שהניקוי יידע
   מה הבדיקה יצרה, ומה כבר היה כאן. */
const marksBefore = new Set((await loadMarked({ force: true })).keys());

const before = linked(week, W.leaders);

/* ⚠⚠ **צילום שדות הטקסט של השבוע לפני שנוגעים בהם.**
   השבוע הזה אמיתי, ומוביל אמיתי אולי כבר כתב בו סיכום. בדיקה
   שכותבת עליו ואינה מחזירה מוחקת נתון של המכינה — בדיוק
   התקלה של demo-test, שניקה עמודות זהות ומחק למנהל את שם
   המשתמש שהרגע הגדיר. */
const textBefore = {
  handover: cv(week, W.handover || "") || "",
  summary: cv(week, W.summary) || "",
  summarySent: cv(week, W.summarySent || "") || "",
};
/* מה שהבדיקה יצרה — נמחק לפי מזהה, ולא לפי סינון ערכים. */
const madeLead = [];

/* ============================================================
   ⚠⚠ **השיבוץ נעשה דרך ה-API ולא בכתיבה ישירה ללוח.**

   הגרסה הקודמת כתבה ישירות ל-monday, ו**כתיבה ישירה אינה מנקה
   את מטמון השרת** — הוא בן חמש דקות ויושב בתהליך אחר. הבדיקה
   המתינה 45 שניות ואז הכריזה על כישלון, כלומר עברה או נכשלה
   לפי מזל התזמון: כשהמטמון היה קר היא עברה, וכשמישהו גלש
   באפליקציה דקה קודם — נכשלה על התנהגות **נכונה**.

   `POST ?action=weeks` מנקה את המטמון באותו תהליך שטיפל
   בבקשה, ולכן השינוי נראה מיד. ובדרך זו הבדיקה גם עוברת
   במסלול האמיתי ולא בקיצור דרך.

   ⚠ זה מה שחשף ש-`?action=weeks` אימת מול `activeStudents()`
     ולכן **סירב לשבץ את חשבון הבדיקה בכלל** — בורר הוא רשימת
     בחירה וצריך `assignableStudents()` (4ע). תוקן בשרת.
   ============================================================ */
const setLeaders = async (ids) => {
  const r = await call(M, "POST", "/api/students?action=weeks",
    { weekId: String(week.id), studentIds: ids.map(String) });
  if (r.s !== 200) throw new Error(`שיבוץ מובילים נכשל: ${r.s} ${r.b.error || ""}`);
  return r;
};

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

console.log(`שבוע ${cv(week, W.num)}: ${cv(week, W.start)} → ${cv(week, W.end)}`);
console.log(`ימי לימוד בו: ${inside.length}`);

try {
  await setLeaders([demo.id]);
  invalidate("leader-weeks");

  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ נשארת רשת ביטחון קצרה: השיבוץ דרך ה-API מנקה את המטמון
     באותו מופע, אבל בייצור יש כמה מופעים. */
  let day = null;
  for (let i = 0; i < 45; i++) {
    day = await call(S, "GET", "/api/attendance?action=day&date=" + inside[0]);
    if (day.s === 200) break;
    await new Promise((z) => setTimeout(z, 1000));
  }

  console.log("\n=== הטווח שבאחריותו ===");
  ok("פותח יום בשבוע שלו", day.s === 200, `${day.s} ${day.b.error || ""}`);
  ok("והשרת מחזיר את השבועות שלו",
    Array.isArray(day.b.myWeeks) && day.b.myWeeks.some((w) => String(w.id) === String(week.id)),
    JSON.stringify((day.b.myWeeks || []).map((w) => w.num)));
  /* ⚠⚠ הטענה המרכזית: **מסמן, ולא רק צופה** — גם ביום שאינו היום. */
  ok("ורשאי לסמן בו", day.b.canMark === true, String(day.b.canMark));

  const second = await call(S, "GET", "/api/attendance?action=day&date=" + inside[1]);
  ok("וגם ביום שני בשבוע שלו", second.s === 200 && second.b.canMark === true,
    `${second.s} ${second.b.canMark}`);

  console.log("\n=== מה שמחוץ לטווח ===");
  if (!outsideDay) { console.log("  (אין יום לימוד מחוץ לשבוע — מדולג)"); }
  else {
    const out = await call(S, "GET", "/api/attendance?action=day&date=" + outsideDay.date);
    /* ⚠ **403 על הקריאה, ולא מסך ריק.** ההודעה אומרת מה מותר. */
    ok("יום מחוץ לשבוע שלו נחסם", out.s === 403, `${out.s} ${out.b.error || ""}`);
    ok("וההודעה אומרת מה כן אפשר",
      /שבועות שאתם מובילים|באחריותו/.test(out.b.error || ""), out.b.error);

    /* ⚠⚠ **וגם הכתיבה נחסמת — זה השער האמיתי.** מסך שחוסם הוא
       הצעה; שרת שחוסם הוא הבטחה (עיקרון 3). */
    const w = await call(S, "POST", "/api/attendance?action=mark",
      { date: outsideDay.date, absences: [] });
    ok("וסימון שלו נחסם בשרת", w.s === 403, `${w.s} ${w.b.error || ""}`);
    ok("וההודעה מונה את השבועות שלו",
      /אינו באחד השבועות שאתם מובילים/.test(w.b.error || ""), w.b.error);
  }

  console.log("\n=== ההרשאה עוברת כשהתאריך עובר ===");
  /* ============================================================
     ⚠⚠ **זו הטענה שהמכינה ביקשה, והיא נבדקת על הגבול עצמו.**

     "ההרשאה עוברת למובילים האחרים כשהתאריך מתחלף" אינה פעולה
     שמישהו מבצע — היא נובעת מכך שהכלל הוא **התאריך מול הטווח**
     ולא דגל שמישהו מדליק. לכן היא נבדקת בדיוק שם: היום האחרון
     בשבוע מותר, והיום שאחריו כבר לא. מעבר חצות מזיז את התאריך
     מעל אותו קו, בלי שאיש יעשה דבר.

     ⚠ **גרסה קודמת בדקה זאת בהסרת השיבוץ, וזו הייתה בדיקה של
       המטמון ולא של הכלל.** מטמון השבועות בשרת חי חמש דקות
       ויושב בתהליך אחר, ולכן ההסרה לא נראתה — והטענה נכשלה על
       התנהגות נכונה. אותה מלכודת שמתועדת ב-CLAUDE.md.
     ============================================================ */
  const lastDay = inside[inside.length - 1];
  const lastIn = await call(S, "GET", "/api/attendance?action=day&date=" + lastDay);
  ok("היום האחרון בשבוע — מסמן", lastIn.s === 200 && lastIn.b.canMark === true,
    lastDay + ": " + lastIn.s + " " + lastIn.b.canMark);

  const wEnd = cv(week, W.end);
  const nextDay = cal.days.find((d) => d.date > wEnd && isSchoolDay(d));
  if (!nextDay) {
    console.log("  (אין יום לימוד אחרי השבוע — מדולג)");
  } else {
    const after = await call(S, "GET", "/api/attendance?action=day&date=" + nextDay.date);
    ok("והיום שאחרי סוף השבוע — כבר לא",
      after.s === 403 || after.b.canMark === false,
      nextDay.date + ": " + after.s + " " + (after.b && after.b.canMark));
    const wr = await call(S, "POST", "/api/attendance?action=mark",
      { date: nextDay.date, absences: [] });
    ok("וגם הכתיבה שם נחסמת", wr.s === 403, wr.s + " " + (wr.b.error || ""));
  }

  /* ============================================================
     דיווח על מפגשים — אותו כלל בדיוק
     ------------------------------------------------------------
     ⚠⚠ `{scheduler:true}` פותח את `?action=mark` לשלושה: צוות,
       אחראי לו״ז, ומוביל שבוע. לשניים הראשונים זה נכון; למוביל
       שבוע זה נתן לסמן **כל מפגש בשנה**, כולל בשבועות של אחרים
       ובחודשים שלא היה בהם. הכלל זהה לזה של הנוכחות — התאריך
       מול הטווח, ולכן ההרשאה עוברת מעצמה כשהשבוע נגמר.
     ============================================================ */
  console.log("\n=== דיווח על מפגשים ===");
  {
    const board = await call(S, "GET", "/api/lessons?action=board");
    ok("מוביל שבוע פותח את לוח השיעורים", board.s === 200, String(board.s));
    /* ⚠ מה שמותר נשלח מהשרת ואינו נגזר במסך (4יד). */
    ok("והשרת אומר על אילו טווחים מותר",
      board.b.markAll === false && Array.isArray(board.b.markWeeks),
      JSON.stringify({ all: board.b.markAll, weeks: board.b.markWeeks }));
    ok("והטווח הוא השבוע שהוא מוביל",
      (board.b.markWeeks || []).some((w) => w.start === cv(week, W.start)),
      JSON.stringify(board.b.markWeeks));

    const all = [...(board.b.upcoming || []), ...(board.b.unreported || [])];
    const wStart = cv(week, W.start), wEnd = cv(week, W.end);
    const inside2 = all.find((m) => m.date >= wStart && m.date <= wEnd);
    const outside2 = all.find((m) => m.date < wStart || m.date > wEnd);

    if (inside2) {
      const was = inside2.happened ?? null;
      const r2 = await call(S, "POST", "/api/lessons?action=mark",
        { meetingId: inside2.id, happened: "כן" });
      ok("מסמן מפגש בשבוע שלו", r2.s === 200, `${r2.s} ${r2.b.error || ""}`);
      /* ⚠ מחזירים למה שהיה — הבדיקה כותבת על שורה אמיתית (5א). */
      await call(S, "POST", "/api/lessons?action=mark",
        { meetingId: inside2.id, happened: was });
    } else console.log("  (אין מפגש בשבוע הזה — הטענה דולגה)");

    if (outside2) {
      const r3 = await call(S, "POST", "/api/lessons?action=mark",
        { meetingId: outside2.id, happened: "כן" });
      ok("ואינו מסמן מפגש מחוץ לשבוע שלו", r3.s === 403, `${r3.s} ${r3.b.error || ""}`);
      ok("וההודעה מונה את השבועות שלו",
        /אינו באחד השבועות/.test(r3.b.error || ""), r3.b.error);
    } else console.log("  (אין מפגש מחוץ לשבוע — הטענה דולגה)");

    /* ============================================================
       ⚠⚠ **הטענה ששומרת על הרחבת השער.**

       כדי שמוביל שבוע יוכל לפתוח את לוח השיעורים, השער שלו
       הוחלף מ-`{scheduler:true}` לאיחוד מפורש בקוד. `scheduler`
       שומר גם על **דוח התשלום למרצים**, ואילו הרחבנו אותו
       עצמו — כל מוביל שבוע היה רואה כמה משלמים לכל מרצה.

       זה בדיוק סוג הדליפה שאיש לא מתכוון אליה ואיש לא בודק,
       ולכן היא נבדקת כאן ובמפורש.
       ============================================================ */
    const pay = await call(S, "GET", "/api/lessons?action=pay");
    ok("ומוביל שבוע אינו רואה את דוח התשלום למרצים",
      pay.s === 403, `${pay.s} ${pay.b.error || ""}`);
  }

  console.log("\n=== המנהל אינו מוגבל ===");
  const mg = await call(M, "GET", "/api/attendance?action=day&date=" + inside[0]);
  ok("מנהל פותח כל יום", mg.s === 200 && mg.b.canMark === true,
    `${mg.s} ${mg.b.canMark}`);
  ok("ו-myWeeks ריק לאיש צוות", (mg.b.myWeeks || []).length === 0,
    JSON.stringify(mg.b.myWeeks));

  /* ============================================================
     שבוע ההובלה — הקונסולה
     ------------------------------------------------------------
     ⚠ **הטענה המרכזית: השער הוא `leadsAnyWeek` ולא `isLeader`.**
       חשבון הבדיקה משובץ לשבוע הזה, ואם השבוע אינו "היום" הוא
       עדיין חייב להיכנס — זו בדיוק התקלה של 5ב, ומוביל השבוע
       הבא הוא האדם היחיד שצריך את המסך לפני שהשבוע מתחיל.
     ============================================================ */
  if (!leadReady()) {
    console.log("\n=== שבוע ההובלה: הלוחות טרם הוקמו — מדלג ===");
  } else {
    console.log("\n=== שבוע ההובלה ===");

    let lw = await call(S, "GET", "/api/students?action=lead-week&week=" + week.id);
    ok("מוביל שבוע נכנס לקונסולה, גם כשהשבוע אינו היום",
      lw.s === 200 && lw.b.week && lw.b.week.id === String(week.id),
      `${lw.s} ${lw.b.error || ""}`);
    ok("והשבוע מסומן כשלו לעריכה", lw.b.me && lw.b.me.edit === true,
      JSON.stringify(lw.b.me));
    /* ⚠ **התבנית אינה בתשובה של מי שאינו ראש מכינה** — לא ריקה,
       פשוט אינה שם (4מא). */
    ok("והתבנית אינה מוחזרת לחניך כלל", !("template" in lw.b),
      Object.keys(lw.b).join(","));

    /* --- משימה לשבוע, וסימון --- */
    let r2 = await call(S, "POST", "/api/students?action=lead-week",
      { week: String(week.id), title: "בדיקה — משימה אוטומטית", when: "בסוף השבוע" });
    ok("המוביל מוסיף משימה לשבוע שלו", r2.s === 200 && r2.b.id,
      `${r2.s} ${r2.b.error || ""}`);
    const TASK = r2.b.id;
    if (TASK) madeLead.push(TASK);

    /* ⚠ **חניך אינו יוצר שורת תבנית**, גם כשהוא מוביל: זו הגדרה
       של המכינה ולא ביצוע של שבוע. */
    r2 = await call(S, "POST", "/api/students?action=lead-week",
      { template: true, title: "בדיקה — תבנית אסורה" });
    ok("ואינו יוצר שורת תבנית", r2.s === 403 && /ראש המכינה/.test(r2.b.error || ""),
      `${r2.s} ${r2.b.error || ""}`);
    if (r2.s === 200 && r2.b.id) madeLead.push(r2.b.id);

    if (TASK) {
      r2 = await call(S, "POST", "/api/students?action=lead-week",
        { week: String(week.id), task: TASK, done: true });
      ok("מסמן אותה כבוצעה", r2.s === 200 && r2.b.done === true,
        `${r2.s} ${r2.b.error || ""}`);

      /* ⚠⚠ **אידמפוטנטי**: שני מובילים שלוחצים כמעט יחד שולחים
         אותה כוונה ומקבלים אותה תוצאה, ולא שתי שורות ביצוע
         (עיקרון 5). */
      r2 = await call(S, "POST", "/api/students?action=lead-week",
        { week: String(week.id), task: TASK, done: true });
      ok("סימון חוזר אינו יוצר שורה שנייה", r2.s === 200 && r2.b.done === true,
        `${r2.s} ${r2.b.error || ""}`);

      lw = await call(S, "GET", "/api/students?action=lead-week&week=" + week.id);
      const t = (lw.b.tasks || []).filter((x) => x.id === TASK);
      ok("והמשימה מופיעה פעם אחת ומסומנת", t.length === 1 && t[0].done === true,
        "n=" + t.length);
      /* ⚠ **מי סימן, בשם** — זו החלוקה בין שני המובילים, וזו כל
         התכלית של השדה (ההפך מ-4מה, אותו כלל כמו 4נ). */
      ok("ומי סימן נכתב בשם", Boolean(t[0] && t[0].by), (t[0] || {}).by);

      /* ⚠ ביטול = **מחיקת השורה**, ולא עמודה שמסומנת "לא". */
      r2 = await call(S, "POST", "/api/students?action=lead-week",
        { week: String(week.id), task: TASK, done: false });
      ok("ביטול סימון מוחק את שורת הביצוע", r2.s === 200 && r2.b.done === false,
        `${r2.s} ${r2.b.error || ""}`);
    }

    /* --- מסירה וסיכום: שני שדות --- */
    r2 = await call(S, "PUT", "/api/students?action=lead-week", {
      week: String(week.id),
      handover: "בדיקה — מסירה אוטומטית",
      summary: "בדיקה — סיכום אוטומטי",
    });
    ok("המוביל שומר מסירה וסיכום", r2.s === 200, `${r2.s} ${r2.b.error || ""}`);

    lw = await call(S, "GET", "/api/students?action=lead-week&week=" + week.id);
    ok("ושניהם חוזרים בנפרד",
      lw.b.week.handover === "בדיקה — מסירה אוטומטית"
      && lw.b.week.summary === "בדיקה — סיכום אוטומטי",
      JSON.stringify([lw.b.week.handover, lw.b.week.summary]));
    /* ⚠ "נשלח" הוא **חותמת ולא דגל** — לפני השליחה אין תאריך. */
    ok("וטרם נשלח", !lw.b.week.summarySent, String(lw.b.week.summarySent));

    /* --- הגבול: שבוע של מישהו אחר --- */
    const other = (lw.b.weeks || []).find((x) => !x.mine);
    if (other) {
      r2 = await call(S, "POST", "/api/students?action=lead-week",
        { week: other.id, title: "בדיקה — שבוע של אחרים" });
      ok("ואינו כותב לשבוע שאינו שלו", r2.s === 403,
        `${r2.s} ${r2.b.error || ""}`);
      if (r2.s === 200 && r2.b.id) madeLead.push(r2.b.id);

      /* ⚠ **קריאה כן** — מוביל שרוצה לראות מה עשה השבוע שעבר
         צריך להגיע לשם, ו`me.edit` הוא שמבדיל (4ר). */
      const rd = await call(S, "GET", "/api/students?action=lead-week&week=" + other.id);
      ok("אבל כן קורא אותו, בלי הרשאת עריכה",
        rd.s === 200 && rd.b.me.edit === false, `${rd.s} ${rd.b.me && rd.b.me.edit}`);
    }

    /* --- בנק הפעילויות --- */
    r2 = await call(S, "POST", "/api/students?action=lead-activity",
      { title: "בדיקה — פעילות אוטומטית", minutes: "45", people: "30" });
    ok("מוסיף פעילות לבנק", r2.s === 200 && r2.b.id, `${r2.s} ${r2.b.error || ""}`);
    const ACT = r2.b.id;
    if (ACT) madeLead.push(ACT);

    r2 = await call(S, "POST", "/api/students?action=lead-activity",
      { title: "בדיקה — סוג לא מוכר", kind: "משהו" });
    ok("סוג פעילות לא מוכר נדחה", r2.s === 400, `${r2.s} ${r2.b.error || ""}`);
    if (r2.s === 200 && r2.b.id) madeLead.push(r2.b.id);

    if (ACT) {
      r2 = await call(S, "POST", "/api/students?action=lead-week",
        { week: String(week.id), activity: ACT, date: inside[0] });
      ok("ורושם שהיא רצה", r2.s === 200 && r2.b.id, `${r2.s} ${r2.b.error || ""}`);
      const USE = r2.b.id;
      if (USE) madeLead.push(USE);

      const ab = await call(S, "GET", "/api/students?action=lead-activity");
      const a1 = (ab.b.activities || []).find((x) => x.id === ACT) || {};
      /* ⚠ המונה **נגזר ואינו נשמר** — מונה שמור מתיישן ברגע
         שמישהו מוחק שורת שימוש בלוח (4כו). */
      ok("והמונה נגזר מהשימושים", a1.uses === 1, "uses=" + a1.uses);
      ok("וגם התאריך האחרון", a1.lastUsed === inside[0], "last=" + a1.lastUsed);

      /* ⚠⚠ **מחיקה של פעילות שרצה היא הסתרה** — שורות השימוש
         נושאות את המזהה, והיסטוריה שמצביעה לשומקום היא בדיוק
         מה שהמאגר קיים כדי למנוע (4ק). */
      r2 = await call(S, "DELETE", "/api/students?action=lead-activity", { id: ACT });
      ok("מחיקת פעילות שרצה מסתירה ואינה מוחקת",
        r2.s === 200 && r2.b.archived === true, `${r2.s} ${JSON.stringify(r2.b)}`);

      const ab2 = await call(S, "GET", "/api/students?action=lead-activity");
      ok("והיא יורדת מהבורר", !(ab2.b.activities || []).some((x) => x.id === ACT),
        "archivedCount=" + ab2.b.archivedCount);
      /* ⚠ אבל שורת השימוש **נשארת קריאה** — השם נשמר עליה. */
      const lw2 = await call(S, "GET", "/api/students?action=lead-week&week=" + week.id);
      const u = (lw2.b.used || []).find((x) => x.id === USE);
      ok("ושורת השימוש נשארה עם השם", Boolean(u && u.title), JSON.stringify(u));
    }

    /* --- הגבול השני: מי שאינו מוביל כלל --- */
    /* ⚠ מנהל **כן** קורא (הוא עוקב), ואינו עורך — אלא אם הוא
       ראש המכינה. דני לויט הוא ראש מכינה, ולכן זה נבדק בכיוון
       הקריאה בלבד. */
    const mg2 = await call(M, "GET", "/api/students?action=lead-week&week=" + week.id);
    ok("איש צוות קורא את הקונסולה", mg2.s === 200, `${mg2.s} ${mg2.b.error || ""}`);
    ok("ורואה את התבנית", Array.isArray(mg2.b.template),
      typeof mg2.b.template);
  }
} finally {
  /* ⚠ **לספור מה נוצר בלוח שהפעולה נוגעת בו, ולא רק בלוח
     הראשי.** `?action=mark` יוצר שורה בלוח ימי הסימון לכל
     תאריך שנוגעים בו, וגרסה ראשונה של הבדיקה השאירה שם יום
     ריק בלוח האמיתי. */
  try {
    const after = await loadMarked({ force: true });
    const extra = [...after.keys()].filter((d) => !marksBefore.has(d));
    if (extra.length) {
      console.log("  !! הבדיקה יצרה ימי סימון חדשים: " + extra.join(", "));
      for (const d of extra) {
        const st = after.get(d);
        if (st.present.size > 0) {
          console.log("     " + d + " — יש בו נוכחים, לא נמחק. לבדוק בלוח.");
          continue;
        }
        await gql("mutation($i:ID!){ delete_item(item_id:$i){id} }", { i: st.id });
        console.log("     " + d + " — ריק, נמחק");
      }
    }
  } catch (e) { console.log("  ! בדיקת ימי הסימון נכשלה: " + e.message); }

  /* ============================================================
     ⚠ **ניקוי שבוע ההובלה — שלושה לוחות ושדות טקסט משוחזרים.**

     המחיקה לפי המזהים שחזרו מהיצירה, ולא לפי סינון ערכים
     (שתופס גם שורות שלא יצרנו). ושדות הטקסט של השבוע מוחזרים
     למה שהיה — לא נמחקים.
     ============================================================ */
  if (leadReady()) {
    for (const id of madeLead) {
      await gql("mutation($i:ID!){ delete_item(item_id:$i){id} }", { i: id })
        .catch((e) => console.log("  ! לא נמחק " + id + ": " + e.message));
    }
    /* ⚠ **וגם שורות הביצוע שנוצרו לשבוע הזה.** סימון יוצר שורה
       בלוח שני, ובדיקה שסופרת לוח אחד מתוך שניים משאירה שורות —
       בדיוק הלקח של quota-test. */
    try {
      const logs = (await allItems(LEAD_BOARDS.log))
        .filter((i) => cv(i, LEAD_COLS.log.week) === String(week.id)
          && String(i.name || "").startsWith("בדיקה — "));
      for (const i of logs) {
        await gql("mutation($i:ID!){ delete_item(item_id:$i){id} }", { i: String(i.id) });
      }
      const left = (await allItems(LEAD_BOARDS.checklist))
        .filter((i) => String(i.name || "").startsWith("בדיקה — "));
      if (left.length) console.log("  !! נשארו " + left.length + " שורות צ׳ק ליסט של בדיקה");
    } catch (e) { console.log("  ! ניקוי לוחות ההובלה נכשל: " + e.message); }

    /* ⚠⚠ **החזרת שדות הטקסט לערכם הקודם, ולא ניקוי שלהם.** */
    try {
      const cols = {};
      if (W.handover) cols[W.handover] = textBefore.handover;
      cols[W.summary] = textBefore.summary;
      if (W.summarySent) {
        cols[W.summarySent] = textBefore.summarySent
          ? { date: textBefore.summarySent } : null;
      }
      await gql("mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }",
        { b: MECHINA_BOARDS.leaderWeeks, i: String(week.id), v: JSON.stringify(cols) });
      console.log("  (שדות השבוע שוחזרו)");
    } catch (e) { console.log("  !! שחזור שדות השבוע נכשל: " + e.message); }
  }

  /* ⚠ השחזור עטוף: אם הוא נופל, ההודעה חייבת לצאת ולא להיבלע
     ב-finally — שבוע שנשאר עם המובילים הלא-נכונים הוא נתון
     אמיתי שהמכינה עובדת לפיו. */
  try {
    await setLeaders(before);
  } catch (e) {
    console.log("  !! שחזור המובילים נכשל: " + e.message);
  }
  invalidate("leader-weeks");
  const back = (await allItems(MECHINA_BOARDS.leaderWeeks)).find((w) => String(w.id) === String(week.id));
  const now = linked(back, W.leaders);
  console.log(now.join(",") === before.join(",")
    ? "  (המובילים שוחזרו)" : "  !! המובילים לא שוחזרו — לבדוק בלוח");
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
