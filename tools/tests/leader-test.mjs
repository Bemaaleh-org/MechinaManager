/* ============================================================
   מוביל שבוע — הטווח שבאחריותו, והעברת ההרשאה בזמן
   ------------------------------------------------------------
   ⚠ הבדיקה משבצת את **חשבון הבדיקה** לשבוע קיים ומחזירה את
     המובילים המקוריים ב-finally. היא אינה נוגעת בחניך אמיתי
     ואינה יוצרת שבועות.

   ⚠ ואינה מסמנת נוכחות באף יום: הסימון נבדק ב-quota-test,
     וכאן נבדק **מי רשאי** — כלומר סטטוסים בלבד.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { invalidate } from "../../api/_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../../shared/mechina-boards.js";
import { loadCalendar, isSchoolDay } from "../../api/_attendance-data.js";

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

const before = linked(week, W.leaders);
const setLeaders = (ids) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
  { b: MECHINA_BOARDS.leaderWeeks, i: week.id,
    v: JSON.stringify({ [W.leaders]: { item_ids: ids.map(Number) } }) });

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

  /* ⚠ המתנה **על תנאי** — מטמון השרת יושב בתהליך אחר. */
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

  console.log("\n=== המנהל אינו מוגבל ===");
  const mg = await call(M, "GET", "/api/attendance?action=day&date=" + inside[0]);
  ok("מנהל פותח כל יום", mg.s === 200 && mg.b.canMark === true,
    `${mg.s} ${mg.b.canMark}`);
  ok("ו-myWeeks ריק לאיש צוות", (mg.b.myWeeks || []).length === 0,
    JSON.stringify(mg.b.myWeeks));
} finally {
  await setLeaders(before);
  invalidate("leader-weeks");
  const back = (await allItems(MECHINA_BOARDS.leaderWeeks)).find((w) => String(w.id) === String(week.id));
  const now = linked(back, W.leaders);
  console.log(now.join(",") === before.join(",")
    ? "  (המובילים שוחזרו)" : "  !! המובילים לא שוחזרו — לבדוק בלוח");
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
