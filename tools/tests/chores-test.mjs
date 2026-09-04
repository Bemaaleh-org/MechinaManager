/* ============================================================
   תורניות — הגזרות, התורנות היומית, המעקב והצ׳ק ליסט

   ⚠ הבדיקה יוצרת גזרה משלה, משבצת אליה את חשבון הבדיקה,
     ומוחקת **הכול לפי מזהה** — בארבעה לוחות: גזרות, שיבוץ,
     התאמות וביצוע. `quota-test` השאיר בעבר ימים מסומנים בלוח
     האמיתי כי ספר לוח אחד מתוך שניים.

   ⚠ ואינה נוגעת בגזרות האמיתיות של המכינה.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { CHORE_BOARDS, CHORE_COLS } from "../../shared/chores-ids.js";
import { KIND, fridayAfterTuesday, dowOf, TUESDAY } from "../../shared/chores.js";

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
async function until(what, fn, tries = 30) {
  for (let i = 0; i < tries; i++) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 1000)); }
  console.log("  ! פג הזמן בהמתנה ל: " + what);
  return false;
}

const R = CHORE_COLS.roster;
const A = CHORE_COLS.adjust;
const D = CHORE_COLS.done;

const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){ items{ id name column_values(ids:["${AUTH_COLS.code}"]){ id text } } } } }`))
  .boards[0].items_page.items;
const code = (t) => cv(us.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const MGR = jar();
await call(MGR, "POST", "/api/auth?action=login", { code: code("דני לויט") });
const ST = jar();
await call(ST, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });

/* ⚠ **חשבון הבדיקה נושא את כל חמשת התפקידים** (כולל אב בית),
   ולכן mayChores נותן לו assign — וזה נכון. כדי לבדוק את הגבול
   של חניך רגיל צריך חניך **בלי תפקידים**, ולכן נבחר אחד כזה
   מהנתונים ולא לפי מיקום ברשימה. */
const plainRow = (await studentRows()).find(
  (x) => x.active && !x.demo && !(x.roles || []).length);
if (!plainRow) { console.log("אין חניך בלי תפקידים"); process.exit(1); }
const PLAIN = jar();
await call(PLAIN, "POST", "/api/students?action=login", { tz: plainRow.tz });
console.log("חניך רגיל: " + plainRow.name);

const made = { sectors: [], rows: [], adjusts: [], done: [], tasks: [] };
const EV = "בדיקה — גזרת בדיקה";

try {
  /* ============ 1 · אב הבית מגדיר גזרה ============ */
  console.log("\n1 · הגדרת גזרה");
  let r = await call(MGR, "GET", "/api/chores?action=view&admin=1");
  ok("המסך נטען", r.s === 200 && Array.isArray(r.b.sectors), r.b.error || "");
  ok("ואב הבית רשאי לשבץ", r.b.me.assign === true, r.b.me.role);
  const students = r.b.admin.students;
  const week = r.b.periods[0];
  if (!week) throw new Error("אין שבועות בלוח מובילי השבוע");

  r = await call(MGR, "POST", "/api/chores?action=sector",
    { name: EV, kind: KIND.evening, cap: 2, detail: "בדיקה אוטומטית" });
  ok("גזרה חדשה נוצרת", r.s === 200 && r.b.created, r.b.error || "");
  const SEC = r.b.id;
  if (SEC) made.sectors.push(SEC);
  if (!SEC) throw new Error("לא נוצרה גזרה");

  r = await call(MGR, "POST", "/api/chores?action=sector",
    { name: "בדיקה — יומית שנייה", kind: KIND.daily });
  /* ⚠ גזרה יומית שנייה הייתה קיימת בלוח ובלתי נראית בכל מסך. */
  ok("גזרה יומית שנייה נחסמת", r.s === 400 && /כבר קיימת תורנות יומית/.test(r.b.error || ""),
    r.s + " " + (r.b.error || ""));
  if (r.s === 200) made.sectors.push(r.b.id);

  r = await call(MGR, "POST", "/api/chores?action=sector",
    { id: SEC, name: EV, kind: KIND.evening, cap: "שתיים" });
  ok("מכסה לא-מספרית נדחית ואינה הופכת ל-NaN",
    r.s === 400 && /מספר שלם/.test(r.b.error || ""), r.b.error || "");

  /* ============ 2 · שיבוץ ============ */
  console.log("\n2 · שיבוץ לשבוע");
  const two = students.slice(0, 2).map((s) => s.id);
  r = await call(MGR, "POST", "/api/chores?action=assign",
    { sector: SEC, date: "2026-09-07", students: two });
  ok("תאריך לגזרת סוף יום נדחה",
    r.s === 400 && /שבוע ולא תאריך/.test(r.b.error || ""), r.b.error || "");

  r = await call(MGR, "POST", "/api/chores?action=assign",
    { sector: SEC, week: week.id, students: [...two, students[2].id] });
  ok("מעל המכסה נדחה", r.s === 400 && /מקומות/.test(r.b.error || ""), r.b.error || "");

  r = await call(MGR, "POST", "/api/chores?action=assign",
    { sector: SEC, week: week.id, students: two });
  ok("שיבוץ תקין נשמר", r.s === 200 && r.b.added === 2, r.b.error || "");

  await until("השיבוץ נראה", async () => {
    const x = await call(MGR, "GET", "/api/chores?action=view&admin=1");
    const s = (x.b.periods[0].sectors || []).find((y) => y.id === SEC);
    return s && s.members.length === 2;
  });

  /* ============ 3 · המונים והגוונים ============ */
  console.log("\n3 · מעקב");
  r = await call(MGR, "GET", "/api/chores?action=view&admin=1");
  const t = r.b.tally.find((x) => x.sector === SEC);
  ok("הגזרה בטבלת המעקב", Boolean(t));
  ok("ויש בה נתונים", t.hasData === true);
  const mine = t.per.filter((p) => two.includes(p.id));
  /* ⚠ אדום כאן = "תורו", ולא בעיה. מי ששובץ הוא מעל הממוצע. */
  ok("מי ששובץ הוא מעל הממוצע", mine.every((p) => p.count === 1 && p.tone === "over"),
    mine.map((p) => p.name + ":" + p.count + "/" + p.tone).join(" "));

  /* ============ 4 · התאמה ידנית ============ */
  console.log("\n4 · תיקון ספירה");
  r = await call(MGR, "POST", "/api/chores?action=adjust",
    { student: two[0], sector: SEC, delta: 0 });
  ok("שינוי אפס נדחה", r.s === 400 && /שאינו אפס/.test(r.b.error || ""), r.b.error || "");

  r = await call(MGR, "POST", "/api/chores?action=adjust",
    { student: two[0], sector: SEC, delta: -1, reason: "בדיקה" });
  ok("התאמה נרשמת", r.s === 200, r.b.error || "");
  if (r.b.id) made.adjusts.push(r.b.id);

  await until("ההתאמה נספרת", async () => {
    const x = await call(MGR, "GET", "/api/chores?action=view&admin=1");
    const tt = x.b.tally.find((y) => y.sector === SEC);
    return tt && (tt.per.find((p) => p.id === two[0]) || {}).count === 0;
  });
  r = await call(MGR, "GET", "/api/chores?action=view&admin=1");
  const t2 = r.b.tally.find((x) => x.sector === SEC);
  ok("1- מוריד את הספירה ל-0",
    (t2.per.find((p) => p.id === two[0]) || {}).count === 0,
    String((t2.per.find((p) => p.id === two[0]) || {}).count));

  /* ============ 5 · הגבול של החניך ============ */
  console.log("\n5 · מה חניך יכול");
  r = await call(PLAIN, "GET", "/api/chores?action=view");
  ok("חניך רואה את המסך", r.s === 200, r.b.error || "");
  /* ⚠ בקשה מפורשת של המכינה: הטבלה גלויה לכולם. */
  ok("ורואה את טבלת המעקב של כולם",
    Array.isArray(r.b.tally) && r.b.tally.length > 0);
  ok("אבל אינו רשאי לשבץ", r.b.me.assign === false && r.b.me.sectors === false,
    JSON.stringify(r.b.me));
  ok("ואינו מקבל את בלוק ה-admin", r.b.admin === undefined);

  r = await call(PLAIN, "POST", "/api/chores?action=assign",
    { sector: SEC, week: week.id, students: [] });
  ok("שיבוץ מחניך נחסם עם שם מי כן רשאי",
    r.s === 403 && /אב הבית/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  r = await call(PLAIN, "POST", "/api/chores?action=sector", { id: SEC, name: EV });
  ok("עריכת גזרה מחניך נחסמת", r.s === 403, r.s + " " + (r.b.error || ""));

  /* ============ 6 · הצ׳ק ליסט — תורן היום בלבד ============ */
  console.log("\n6 · צ׳ק ליסט");
  r = await call(MGR, "GET", "/api/chores?action=view&admin=1");
  const item = (r.b.checklist.items || [])[0];
  ok("יש מטלות ליום", Boolean(item), r.b.checklist.dow);

  if (item) {
    /* ⚠⚠ **אב הבית עוקב ואינו מסמן.** זו הבחנה שהמכינה ביקשה
       במפורש: סימון שמישהו אחר עשה במקום התורן הופך את הצ׳ק
       ליסט לרישום ולא לכלי. */
    r = await call(MGR, "POST", "/api/chores?action=tick", { item: item.id, done: true });
    ok("גם אב הבית אינו מסמן — רק תורן היום",
      r.s === 403 && /תורני המטבח של אותו יום/.test(r.b.error || ""),
      r.s + " " + (r.b.error || ""));

    r = await call(PLAIN, "POST", "/api/chores?action=tick", { item: item.id, done: true });
    ok("וחניך שאינו תורן היום גם לא", r.s === 403, r.s + " " + (r.b.error || ""));
  }

  /* ============ 6ב · יום ג׳ גורר את יום ו׳ ============ */
  console.log("\n6ב · יום שלישי גורר את יום שישי");
  {
    const v = await call(MGR, "GET", "/api/chores?action=view&admin=1");
    const dSec = v.b.sectors.find((x) => x.kind === KIND.daily);

    /* ⚠ יום שלישי **פנוי** מתוך הימים שהמסך מציג, ולא תאריך
       מומצא: תאריך מחוץ לתקופה שהשרת מכיר נדחה מסיבה אחרת
       לגמרי, והבדיקה הייתה עוברת בלי לבדוק כלום. */
    const days = (v.b.periods || []).flatMap((pp) => pp.days || []);
    const tue = days.find((x) => dowOf(x.date) === TUESDAY && !(x.on || []).length
      && days.some((y) => y.date === fridayAfterTuesday(x.date) && !(y.on || []).length));

    if (!dSec || !tue) {
      console.log("  (אין יום שלישי פנוי שגם יום שישי שאחריו פנוי — מדולג)");
    } else {
      const fri = fridayAfterTuesday(tue.date);
      ok("יום שישי מחושב נכון", dowOf(fri) === 5, `${tue.date} → ${fri}`);

      /* ⚠ חניך שאינו מוביל את אף אחד משני השבועות — אחרת
         החסימה הלגיטימית של מובילי שבוע נראית ככישלון המראה. */
      const leaders = new Set((v.b.periods || []).flatMap((pp) => (pp.leaders || []).map(String)));
      const cand = (v.b.admin.students || []).find((x) => !leaders.has(String(x.id)));
      if (!cand) { console.log("  (כל החניכים מובילים — מדולג)"); }
      else {
        r = await call(MGR, "POST", "/api/chores?action=assign",
          { sector: dSec.id, date: tue.date, students: [cand.id] });
        ok("שיבוץ ליום שלישי נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);
        ok("והמראה ליום שישי דווחה",
          r.b.mirror && r.b.mirror.done === true && r.b.mirror.date === fri,
          JSON.stringify(r.b.mirror));

        const rows = (await allItems(CHORE_BOARDS.roster))
          .filter((i) => cv(i, R.sector) === String(dSec.id)
            && cv(i, R.student) === String(cand.id)
            && [tue.date, fri].includes(cv(i, R.date)));
        for (const x of rows) made.rows.push(String(x.id));
        ok("ושתי שורות בלוח — שלישי ושישי", rows.length === 2, String(rows.length));

        /* ⚠⚠ **הטענה החשובה: שיבוץ חוזר אינו דורס את יום שישי.**
           בלעדיה, עריכה של יום שלישי הייתה מוחקת בשקט שיבוץ
           שמישהו עשה ביד ביום שישי — פעולה שאיש לא רואה שקרתה. */
        r = await call(MGR, "POST", "/api/chores?action=assign",
          { sector: dSec.id, date: tue.date, students: [cand.id] });
        ok("שיבוץ חוזר אינו נוגע ביום שישי",
          r.b.mirror && r.b.mirror.done === false && /כבר משובץ/.test(r.b.mirror.why || ""),
          JSON.stringify(r.b.mirror));

        /* ⚠ ואפשר לכבות. */
        const tue2 = days.find((x) => x.date !== tue.date && dowOf(x.date) === TUESDAY
          && !(x.on || []).length);
        if (tue2) {
          r = await call(MGR, "POST", "/api/chores?action=assign",
            { sector: dSec.id, date: tue2.date, students: [cand.id], mirror: false });
          ok("mirror:false מכבה את הגרירה", r.s === 200 && r.b.mirror === null,
            JSON.stringify(r.b.mirror));
          const extra = (await allItems(CHORE_BOARDS.roster))
            .filter((i) => cv(i, R.sector) === String(dSec.id)
              && cv(i, R.student) === String(cand.id)
              && [tue2.date, fridayAfterTuesday(tue2.date)].includes(cv(i, R.date)));
          for (const x of extra) made.rows.push(String(x.id));
          ok("ונוצרה שורה אחת בלבד", extra.length === 1, String(extra.length));
        }
      }
    }
  }

  /* ============ 6ג · תזמון מטלות הצ׳ק ליסט ============ */
  console.log("\n6ג · ימים מרובים ומתי ביום");
  {
    /* ⚠ המטלות שהבדיקה יוצרת מארכבות ולא נמחקות (שורות ביצוע
       נושאות את המזהה), ולכן הן נושאות "בדיקה —" בשם ומסוננות
       בסוף לפי מזהה. */
    let r2 = await call(MGR, "POST", "/api/chores?action=task",
      { task: "בדיקה — מטלה בימים א ו-ד", days: ["א", "ד"], when: "אחרי ארוחת בוקר" });
    ok("מטלה עם שני ימים נשמרת", r2.s === 200 && r2.b.id, `${r2.s} ${r2.b.error || ""}`);
    const tid = r2.b.id;
    if (tid) made.tasks = (made.tasks || []).concat(tid);

    /* ⚠ תווית שאינה בלוח נדחית ברעש ואינה נוצרת בשקט. */
    r2 = await call(MGR, "POST", "/api/chores?action=task",
      { id: tid, task: "בדיקה — מטלה בימים א ו-ד", days: ["א"], when: "אחרי הצהריים" });
    ok("זמן שאינו מוכר נדחה",
      r2.s === 400 && /אינו זמן מוכר/.test(r2.b.error || ""), `${r2.s} ${r2.b.error || ""}`);

    const tpl = async () => {
      const x = await call(MGR, "GET", "/api/chores?action=view&admin=1");
      return (x.b.template || []).find((t) => t.id === tid);
    };
    await until("המטלה נראית", async () => Boolean(await tpl()));
    const row = await tpl();
    ok("שני הימים נשמרו", row && row.days === "א,ד", row && row.days);
    ok("והזמן נשמר", row && row.when === "אחרי ארוחת בוקר", row && row.when);
    /* ⚠ `day` הישן נכתב לצד החדש, כדי שהלוח ב-monday ייקרא נכון. */
    ok("ו-day הישן נשמר לצידו", row && ["א", "ד"].includes(row.day), row && row.day);

    /* ⚠⚠ **רשימה ריקה פירושה כל יום, ולא אף יום.** מטלה בלי
       אף יום אינה מצב שקיים, והיא הייתה נעלמת מכל מסך. */
    r2 = await call(MGR, "POST", "/api/chores?action=task",
      { id: tid, task: "בדיקה — מטלה בימים א ו-ד", days: [], when: "בסוף היום" });
    ok("רשימת ימים ריקה מתקבלת", r2.s === 200, `${r2.s} ${r2.b.error || ""}`);
    await until("העדכון נראה", async () => { const t = await tpl(); return t && t.days === ""; });
    const row2 = await tpl();
    ok("והמטלה הפכה ליומית", row2 && row2.days === "" && row2.day === "כל יום",
      `${row2 && row2.days}|${row2 && row2.day}`);

    /* ⚠ והמסך של התורן מקבל את אוצר המילים מהשרת ולא מקליד אותו. */
    const v2 = await call(MGR, "GET", "/api/chores?action=view&admin=1");
    ok("אוצר הזמנים מגיע מהשרת",
      Array.isArray(v2.b.checklist.whenOptions) && v2.b.checklist.whenOptions.length >= 4,
      (v2.b.checklist.whenOptions || []).join(" · "));
    ok("והמטלה היומית מופיעה ברשימת היום",
      (v2.b.checklist.items || []).some((i) => i.id === tid),
      String((v2.b.checklist.items || []).length));
  }

  /* ============ 7 · תורן היום כן מסמן ============ */
  console.log("\n7 · תורן היום");
  /* ⚠  כאן הוא התשובה של ה-403 מסעיף 6, לא של view.
     הישענות על משתנה שנדרס היא בדיוק סוג הבאג שנראה כמו
     כישלון מוצר ואינו. */
  const fresh = await call(MGR, "GET", "/api/chores?action=view&admin=1");
  const daily = fresh.b.sectors.find((s) => s.kind === KIND.daily);
  const today = fresh.b.today;
  if (daily && item) {
    r = await call(MGR, "POST", "/api/chores?action=assign",
      { sector: daily.id, date: today, students: [demo.id] });
    ok("חשבון הבדיקה משובץ לתורנות היום", r.s === 200, r.b.error || "");

    await until("השיבוץ נראה בשרת", async () => {
      const x = await call(ST, "GET", "/api/chores?action=view");
      return x.s === 200 && x.b.me.onDutyToday === true;
    });

    r = await call(ST, "GET", "/api/chores?action=view");
    ok("והמסך שלו יודע שהוא תורן", r.b.me.onDutyToday === true);

    /* ============================================================
       ⚠ **תורן המטבח מגיע גם למסך סימון הנוכחות.**
         תורן מטבח אינו נעדר מהאימון — המכינה שלחה אותו למטבח
         (4ז). עד עכשיו המסמן היה צריך לזכור מי בתורנות בכל
         אימון מחדש, והמידע כבר יושב בלוח התורניות.
       ============================================================ */
    const dayR = await call(MGR, "GET", "/api/attendance?action=day&date=" + today);
    ok("מסך היום מחזיר את תורני המטבח",
      Array.isArray(dayR.b.kitchenDuty), JSON.stringify(dayR.b.kitchenDuty));
    ok("וחשבון הבדיקה ברשימה",
      (dayR.b.kitchenDuty || []).map(String).includes(String(demo.id)),
      (dayR.b.kitchenDuty || []).join(","));

    r = await call(ST, "POST", "/api/chores?action=tick", { item: item.id, done: true });
    ok("תורן היום מסמן", r.s === 200, r.s + " " + (r.b.error || ""));

    /* ⚠ אידמפוטנטי — שני תורנים שלוחצים יחד שולחים אותה כוונה. */
    r = await call(ST, "POST", "/api/chores?action=tick", { item: item.id, done: true });
    ok("וסימון חוזר אינו מכפיל", r.s === 200, r.b.error || "");

    await until("הסימון נראה", async () => {
      const x = await call(ST, "GET", "/api/chores?action=view");
      return (x.b.checklist.items.find((i) => i.id === item.id) || {}).done === true;
    });
    const rows = (await allItems(CHORE_BOARDS.done))
      .filter((i) => cv(i, D.item) === item.id && cv(i, D.date) === today);
    ok("שורת ביצוע אחת בלבד בלוח", rows.length === 1, String(rows.length));
    for (const x of rows) made.done.push(String(x.id));

    r = await call(ST, "POST", "/api/chores?action=tick", { item: item.id, done: false });
    ok("וביטול מוחק אותה", r.s === 200, r.b.error || "");
  }

  /* ============ 8 · בלוק טקסט ============ */
  console.log("\n8 · נוסח הנהלים");
  r = await call(ST, "PUT", "/api/chores?action=text", { key: "hada.hygiene", title: "x", body: "x" });
  ok("חניך אינו עורך נוסח",
    r.s === 403 && /ראש המכינה/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  r = await call(MGR, "GET", "/api/chores?action=view");
  const before = (r.b.texts || []).find((x) => x.key === "hada.hygiene");
  ok("בלוקי הנהלים נטענים", Boolean(before), (r.b.texts || []).map((x) => x.key).join(" "));
  if (before) {
    r = await call(MGR, "PUT", "/api/chores?action=text",
      { key: before.key, title: before.title, body: before.body + "\n10. בדיקה" });
    ok("ראש המכינה עורך", r.s === 200, r.b.error || "");
    await until("העריכה נראית", async () => {
      const x = await call(MGR, "GET", "/api/chores?action=view");
      return (x.b.texts.find((y) => y.key === before.key) || {}).body.includes("10. בדיקה");
    });
    /* ⚠ ומחזירים בדיוק את מה שהיה — זה נוהל אמיתי של המכינה. */
    await call(MGR, "PUT", "/api/chores?action=text",
      { key: before.key, title: before.title, body: before.body });
    const back = await call(MGR, "GET", "/api/chores?action=view");
    ok("והנוסח הוחזר במדויק",
      (back.b.texts.find((y) => y.key === before.key) || {}).body === before.body);
  }

  /* ============ 9 · עריכת נתוני חניך ============
     ⚠ מה שהצוות מנהל, ולא מה שהחניך הזין. הבדיקה נוגעת
       **בחשבון הבדיקה בלבד** ומחזירה בדיוק את מה שהיה. */
  console.log("\n9 · עריכת נתוני חניך");
  const was = (await call(MGR, "GET", "/api/students?action=profile&student=" + demo.id)).b.staff;
  ok("התיק נטען", Boolean(was), was ? "" : "אין staff");

  r = await call(PLAIN, "PUT", "/api/students?action=edit", { studentId: demo.id, city: "x" });
  ok("חניך אינו עורך נתוני חניך", r.s === 403, r.s + " " + (r.b.error || ""));

  r = await call(MGR, "PUT", "/api/students?action=edit",
    { studentId: demo.id, city: "בדיקה — עיר" });
  ok("ראש המכינה עורך, ומקבל מה השתנה",
    r.s === 200 && (r.b.changed || []).includes("עיר מגורים"), JSON.stringify(r.b));

  r = await call(MGR, "PUT", "/api/students?action=edit",
    { studentId: demo.id, city: "בדיקה — עיר" });
  /* ⚠ שדה שנשלח זהה לקיים אינו נספר — המסך אומר אמת. */
  ok("ושליחה חוזרת אינה נספרת כשינוי",
    r.s === 200 && (r.b.changed || []).length === 0, JSON.stringify(r.b.changed));

  r = await call(MGR, "PUT", "/api/students?action=edit",
    { studentId: demo.id, shirt: "לא-קיים-בלוח" });
  ok("תווית שאינה בלוח נדחית עם הסבר",
    r.s === 400 && /אינו קיים ברשימה/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  r = await call(MGR, "PUT", "/api/students?action=edit", { studentId: demo.id, tz: "123" });
  ok("ת.ז קצרה נדחית", r.s === 400 && /תשע ספרות/.test(r.b.error || ""), r.b.error || "");

  r = await call(MGR, "PUT", "/api/students?action=edit",
    { studentId: demo.id, army: "בדיקה", tryouts: "בדיקה" });
  /* ⚠⚠ **השדות שהחניך מילא אינם נערכים כאן.** מיפוי מפורש —
     שדה שאינו ברשימה פשוט אינו נכתב, ואינו נספר כשינוי. */
  ok("והשדות שהחניך מילא אינם נוגעים",
    r.s === 200 && (r.b.changed || []).length === 0, JSON.stringify(r.b.changed));

  /* ⚠ מחזירים בדיוק את מה שהיה — 4כח. */
  await call(MGR, "PUT", "/api/students?action=edit",
    { studentId: demo.id, city: was.city || "" });
  const now2 = (await call(MGR, "GET", "/api/students?action=profile&student=" + demo.id)).b.staff;
  ok("והעיר הוחזרה למה שהייתה", (now2.city || "") === (was.city || ""),
    (was.city || "(ריק)") + " → " + (now2.city || "(ריק)"));

} catch (e) {
  console.error("\nנפילה:", e.message);
  fail++;
} finally {
  console.log("\nניקוי…");
  /* ⚠ ארבעה לוחות, לפי מזהה, ולא סינון לפי ערך. */
  const rows = (await allItems(CHORE_BOARDS.roster))
    .filter((i) => made.sectors.includes(cv(i, R.sector))
      || String(i.name || "").startsWith("בדיקה"));
  const adj = (await allItems(CHORE_BOARDS.adjust))
    .filter((i) => made.adjusts.includes(String(i.id)) || made.sectors.includes(cv(i, A.sector)));
  const dn = (await allItems(CHORE_BOARDS.done)).filter((i) => made.done.includes(String(i.id)));
  /* ⚠ **מטלות הצ׳ק ליסט נמחקות כאן במפורש.** נקודת הקצה
     *מארכבת* אותן (שורות ביצוע נושאות את המזהה), ולכן שורה
     מארכבת שהבדיקה יצרה הייתה נשארת בלוח לנצח ומצטברת בכל
     הרצה. הבדיקה יצרה אותן ולכן היא זו שמוחקת. */
  const ids = [...rows, ...adj, ...dn].map((i) => String(i.id))
    .concat(made.sectors).concat(made.tasks || []);

  /* ⚠ ובנוסף: התורנות היומית שהבדיקה יצרה לחשבון הבדיקה. */
  const daily = (await allItems(CHORE_BOARDS.sectors))
    .find((i) => String(i.name).trim() === "מטבח וחד״א");
  if (daily) {
    const extra = (await allItems(CHORE_BOARDS.roster))
      .filter((i) => cv(i, R.sector) === String(daily.id) && cv(i, R.student) === demo.id);
    for (const x of extra) ids.push(String(x.id));
  }

  for (const id of [...new Set(ids)]) {
    await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id })
      .catch((e) => console.log("  ! לא נמחק " + id + ": " + e.message.slice(0, 60)));
  }
  console.log("  נמחקו " + new Set(ids).size + " שורות");
  await reg.restore();

  const leftS = (await allItems(CHORE_BOARDS.sectors)).filter((i) => String(i.name).startsWith("בדיקה"));
  const leftR = (await allItems(CHORE_BOARDS.roster)).filter((i) => String(i.name).startsWith("בדיקה"));
  const leftA = (await allItems(CHORE_BOARDS.adjust)).filter((i) => String(i.name).startsWith("בדיקה"));
  ok("לא נשארו שאריות בארבעת הלוחות",
    !leftS.length && !leftR.length && !leftA.length,
    `sectors=${leftS.length} roster=${leftR.length} adjust=${leftA.length}`);
}

console.log(`\n${pass} עברו · ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
