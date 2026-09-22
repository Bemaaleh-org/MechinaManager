/* ============================================================
   שבועות חופפים — "שבוע 3-4", ופתיחה על ההווה
   ------------------------------------------------------------
     npm test -- weeks

   ⚠⚠ **שלושה כיוונים, וכל אחד לבדו היה נשאר ירוק:**
       1. שתי שורות חופפות מקבלות **אותה תווית ואותו טווח**
       2. שורות שאינן חופפות **אינן** מאוחדות — אחרת כל הלוח
          היה הופך ל"שבוע 1-43"
       3. הנתון עצמו (`num`, `start`, `end`) **אינו משתנה** —
          שיבוץ, הרשאה וסימון מצביעים עליו

   ⚠ **והחפיפה מדווחת ואינה נבלעת** (4ט): `warnings` אומר
     אילו שורות ובכמה ימים, כי התיקון הוא בלוח (עיקרון 1).

   ⚠ רוב הבדיקה **טהורה** — בלי רשת ובלי monday. החלק החי
     קורא בלבד ואינו יוצר דבר.
   ============================================================ */
import { weekSpans, withSpans, spanLabel, weekIndexFor } from "../../shared/week-span.js";
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};

console.log("\n1 · התווית");
ok('שבוע יחיד', spanLabel([4]) === "שבוע 4", spanLabel([4]));
ok('שניים רצופים → "שבוע 3-4"', spanLabel([4, 3]) === "שבוע 3-4", spanLabel([4, 3]));
ok('שלושה רצופים → "שבוע 3-5"', spanLabel([3, 4, 5]) === "שבוע 3-5", spanLabel([3, 4, 5]));
/* ⚠ לא רצף → מונים במפורש. "שבוע 3-7" היה טענה על חמישה שבועות. */
ok('לא רצף → "שבוע 3, 7"', spanLabel([7, 3]) === "שבוע 3, 7", spanLabel([7, 3]));
/* ⚠ שבוע בלי מספר אינו נעלם מהתווית — הוא מקבל את שמו בלוח. */
ok("בלי מספר — נופל לשם השורה", spanLabel([], "שבוע קליטה") === "שבוע קליטה",
  spanLabel([], "שבוע קליטה"));

console.log("\n2 · מה מתאחד ומה לא");
const ROWS = [
  { id: "a", num: 1, start: "2026-09-06", end: "2026-09-11" },
  { id: "b", num: 2, start: "2026-09-14", end: "2026-09-19" },
  /* ⚠ המקרה האמיתי: שבוע 4 בולע את שבוע 3 כולו. */
  { id: "c", num: 4, start: "2026-09-22", end: "2026-10-05" },
  { id: "d", num: 3, start: "2026-09-27", end: "2026-10-01" },
  { id: "e", num: 5, start: "2026-10-11", end: "2026-10-15" },
  /* ⚠ וחפיפה של יומיים — אותו כלל, ולא "טעות קטנה שמתעלמים ממנה". */
  { id: "f", num: 6, start: "2026-10-18", end: "2026-10-26" },
  { id: "g", num: 7, start: "2026-10-25", end: "2026-10-29" },
];
const { spans, byId, warnings } = weekSpans(ROWS);
ok("חמישה אשכולות מתוך שבע שורות", spans.length === 5, String(spans.length));
ok("4 ו-3 באותו אשכול", byId.get("c") === byId.get("d"));
ok('ותוויתו "שבוע 3-4"', byId.get("c").label === "שבוע 3-4", byId.get("c").label);
/* ⚠ הטווח הוא **האיחוד** ולא של השורה שנבחרה. */
ok("והטווח הוא האיחוד",
  byId.get("d").start === "2026-09-22" && byId.get("d").end === "2026-10-05",
  `${byId.get("d").start}–${byId.get("d").end}`);
ok("6 ו-7 באותו אשכול", byId.get("f") === byId.get("g"));
ok('ותוויתו "שבוע 6-7"', byId.get("f").label === "שבוע 6-7", byId.get("f").label);
ok("והטווח נמתח עד 29.10", byId.get("f").end === "2026-10-29", byId.get("f").end);

/* ⚠⚠ הכיוון ההפוך — בלעדיו כל הלוח היה אשכול אחד. */
ok("שבוע 1 לבדו", byId.get("a").weeks.length === 1 && byId.get("a").label === "שבוע 1");
ok("שבוע 2 לבדו", byId.get("b").weeks.length === 1);
ok("שבוע 5 לבדו", byId.get("e").weeks.length === 1 && byId.get("e").label === "שבוע 5");
ok("ושבועות סמוכים בלי חפיפה אינם מתאחדים",
  byId.get("b") !== byId.get("c") && byId.get("e") !== byId.get("f"));

console.log("\n3 · החפיפה מדווחת");
ok("שתי אזהרות", warnings.length === 2, String(warnings.length));
ok("הראשונה על 4 ו-3, חמישה ימים",
  warnings[0].days === 5 && /שבוע 4/.test(warnings[0].text) && /שבוע 3/.test(warnings[0].text),
  warnings[0].text);
ok("השנייה על 6 ו-7, יומיים", warnings[1].days === 2, warnings[1].text);

console.log("\n4 · הנתון אינו משתנה");
const { weeks: out } = withSpans(ROWS);
const w3 = out.find((w) => w.num === 3);
ok("num נשאר", w3.num === 3, String(w3.num));
ok("start נשאר של השורה", w3.start === "2026-09-27", w3.start);
ok("end נשאר של השורה", w3.end === "2026-10-01", w3.end);
/* ⚠ והמיון כרונולוגי — זו כל התלונה: "שבוע שלוש בא אחרי ארבע". */
ok("והמיון כרונולוגי", out.map((w) => w.num).join(",") === "1,2,4,3,5,6,7",
  out.map((w) => w.num).join(","));
ok("spanKey זהה לשתי השורות באשכול",
  out.find((w) => w.num === 4).spanKey === w3.spanKey, w3.spanKey);
/* ⚠⚠ **spanKey אינו מחליף את id** — שיבוץ והרשאה מצביעים על שורה. */
ok("ו-id נשאר של השורה עצמה", w3.id === "d", w3.id);

console.log("\n5 · על איזה שבוע נפתח מסך");
ok("בתוך שבוע → הוא", weekIndexFor(ROWS, "2026-09-16") === 1,
  String(weekIndexFor(ROWS, "2026-09-16")));
/* ⚠⚠ **הפער בין שבועות** — כאן נפילה ל-0 החזירה לספטמבר. */
ok("בפער בין שבועות → הבא", weekIndexFor(ROWS, "2026-10-08") === 4,
  String(weekIndexFor(ROWS, "2026-10-08")));
ok("לפני תחילת השנה → הראשון", weekIndexFor(ROWS, "2026-08-01") === 0,
  String(weekIndexFor(ROWS, "2026-08-01")));
ok("אחרי הסוף → האחרון", weekIndexFor(ROWS, "2027-01-01") === ROWS.length - 1,
  String(weekIndexFor(ROWS, "2027-01-01")));
ok("רשימה ריקה → -1", weekIndexFor([], "2026-09-16") === -1);

console.log("\n6 · מה שיוצא מהשרת בפועל");
let reg = null;
try {
  const B = "http://localhost:5173";
  let ck = "";
  const call = async (p) => {
    const r = await fetch(B + p, { headers: ck ? { cookie: ck } : {} });
    const s = r.headers.get("set-cookie"); if (s) ck = s.split(";")[0];
    return { s: r.status, b: await r.json().catch(() => ({})) };
  };
  const users = (await gql(
    `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name
         column_values(ids:["${AUTH_COLS.code}"]){ id text } } } } }`,
  )).boards[0].items_page.items;
  const dani = users.find((u) => u.name.includes("דני לויט"));
  const code = (dani.column_values.find((x) => x.id === AUTH_COLS.code) || {}).text || "";
  reg = await tempRegister("דני לויט");
  await fetch(B + "/api/auth?action=login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).then((r) => { const s = r.headers.get("set-cookie"); if (s) ck = s.split(";")[0]; });

  const v = await call("/api/chores?action=view");
  ok("מסך התורנויות נטען", v.s === 200, String(v.s));
  const ws = v.b.weeks || [];
  ok("וכל שבוע נושא תווית מהשרת",
    ws.length > 0 && ws.every((w) => typeof w.label === "string" && w.label),
    `${ws.length} שבועות`);
  /* ⚠ **המיון כרונולוגי בתשובה עצמה** ולא במסך — שני מסכים
     שממיינים בנפרד מתפצלים (4מד). */
  ok("והרשימה ממוינת כרונולוגית",
    ws.every((w, i) => i === 0 || ws[i - 1].start <= w.start),
    ws.slice(0, 4).map((w) => w.num).join(","));
  /* ⚠⚠ **רשימת הניווט מקובצת — אשכול אחד = שורה אחת.**
     שתי שורות עם אותה תווית ואותם תאריכים זו לצד זו נראות
     כמו תקלה, והחץ ביניהן לא היה משנה דבר על המסך. */
  ok("ורשימת הניווט אינה מכילה שתי שורות מאותו אשכול",
    new Set(ws.map((w) => w.spanKey)).size === ws.length,
    `${ws.length} שורות · ${new Set(ws.map((w) => w.spanKey)).size} אשכולות`);
  ok("ושבוע מאוחד נושא תווית עם שני מספרים",
    ws.filter((w) => w.merged).every((w) => /-|,/.test(w.label)),
    ws.filter((w) => w.merged).map((w) => w.label).join(" · ") || "אין מאוחדים");

  /* ⚠ והתקופות המוצגות — גם הן אשכול אחד לכל היותר פעם אחת,
     וכל תקופה נושאת את כל מזהי האשכול שלה. */
  const per = v.b.periods || [];
  ok("ואין שתי תקופות מאותו אשכול",
    new Set(per.map((x) => x.spanKey)).size === per.length,
    per.map((x) => x.label).join(" · "));
  ok("וכל תקופה נושאת את מזהי האשכול שלה",
    per.every((x) => Array.isArray(x.ids) && x.ids.includes(String(x.id))),
    JSON.stringify(per.map((x) => (x.ids || []).length)));
} catch (e) {
  ok("החלק החי רץ", false, e.message.slice(0, 120));
} finally {
  if (reg) await reg.restore().catch(() => {});
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
