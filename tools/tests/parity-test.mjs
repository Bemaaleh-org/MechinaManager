/* ============================================================
   שתי הבדיקות שהמנהל ביקש:
   1. חניך בעל תפקיד מגיע לאותם מסכים כמו המנהל.
   2. לוח השיעורים מתיישב עם הגאנט.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { MECHINA_BOARDS as MB, MECHINA_COLS as MC } from "../../shared/mechina-boards.js";
/* ⚠ עמודת התפקידים יושבת ב-lessons-boards ולא ב-mechina-boards */
import { ROLES_COL } from "../../shared/lessons-boards.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 200) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const D = jar();
/* ⚠ מנהל שטרם בחר שם וסיסמה חסום בכל נקודות הקצה מאז שנוספה
   ההרשמה. הרישום כאן זמני, הסיסמה שנוצרת אינה קיימת, והשחזור
   בסוף חובה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("דני");
await call(D, "POST", "/api/auth?action=login", { code: cv(us.find((x) => x.name.includes("דני")), AUTH_COLS.code) });

/* ============ 1 · חניך בעל תפקיד ============ */
console.log("=== חניך בעל תפקיד מול מנהל ===");

const roster = (await gql(`{ boards(ids:[${MB.roster}]){ items_page(limit:100){items{id name column_values(ids:["${MC.roster.tz}","${MC.roster.active}","${ROLES_COL}"]){id text}}} } }`))
  .boards[0].items_page.items.filter((x) => cv(x, MC.roster.tz) && cv(x, MC.roster.active) === "v");

/* ⚠ הבדיקה מוסיפה תפקיד לחניך ומחזירה בדיוק את מה שהיה.
   השורה נקראת לפני ואחרי, ולא מונחת עליה רשימה מנוחשת. */
const target = roster[0];
const before = cv(target, ROLES_COL);
console.log(`  חניך הבדיקה: ${target.name} (תפקידים כעת: ${before || "—"})`);

const setRoles = async (list) => {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: MB.roster, i: target.id, v: JSON.stringify({ [ROLES_COL]: { labels: list } }) });
};

const ROLES = ["אחראי מטבח", "אחראי מכולה", "אחראי בטיחות"];
const HOUSE = ["אב בית"];
await setRoles(ROLES);

const S = jar();
let r = await call(S, "POST", "/api/students?action=login", { tz: cv(target, MC.roster.tz) });
ok("החניך נכנס", r.s === 200, r.b.error);
/* ⚠ תשובת הכניסה אינה נושאת תפקידים בכוונה — הם נקראים טרי
   מהלוח בכל בקשה, כדי שהסרת תפקיד תיסגר מיד ולא בכניסה
   הבאה. לכן נבדקים ב-me ולא בתשובת הכניסה. */
const me = await call(S, "GET", "/api/auth?action=me");
ok("והתפקידים נקראים טרי מהלוח", ROLES.every((x) => (me.b.roles || []).includes(x)),
  JSON.stringify(me.b.roles));

/* המסכים שהמנהל רואה, וכל אחד מהם צריך להיפתח גם לבעל התפקיד */
const SCREENS = [
  ["אוכל וחד״פ (מאוחד)", "GET", "/api/kitchen?action=equip", "אחראי מטבח"],
  ["תקציב המטבח", "GET", "/api/kitchen?action=budget", "אחראי מטבח"],
  ["תפריט ארוחות", "GET", "/api/kitchen?action=menu", "אחראי מטבח"],
  ["מכולה", "GET", "/api/container?action=equip&area=" + encodeURIComponent("מכולה"), "אחראי מכולה"],
  ["השאלת ציוד", "GET", "/api/container?action=loans", "אחראי מכולה"],
  ["אירועי בטיחות", "GET", "/api/students?action=safety", "אחראי בטיחות"],
  ["אירוח קבוצות", "GET", "/api/students?action=hosting", "אחראי בטיחות"],
];
for (const [label, m, path] of SCREENS) {
  const a = await call(S, m, path);
  const b = await call(D, m, path);
  ok(`${label} — נפתח לחניך`, a.s === 200, `${a.s} ${a.b.error || ""}`);
  /* ⚠ לא רק "נפתח" אלא **אותו מידע**: אותם מפתחות ואותה כמות
     שורות. מסך שנפתח ומחזיר חצי נתונים גרוע ממסך חסום. */
  if (a.s === 200 && b.s === 200) {
    const keys = (o) => Object.keys(o || {}).sort().join(",");
    ok(`  ואותו מבנה כמו אצל המנהל`, keys(a.b) === keys(b.b),
      keys(a.b) === keys(b.b) ? "" : `חניך: ${keys(a.b)}\n            מנהל: ${keys(b.b)}`);
  }
}

/* ============================================================
   ציוד הניקיון עבר לאב הבית
   ------------------------------------------------------------
   ⚠ שני התחומים חולקים לוח וקוד, ולכן זו הבדיקה החשובה: לא
     רק שאב הבית נכנס, אלא שאחראי המכולה **לא** נכנס לניקיון
     ואב הבית לא נכנס למכולה.
   ============================================================ */
console.log("\n=== ניקיון לאב הבית, מכולה לאחראי המכולה ===");
const CLEAN = "/api/container?action=equip&area=" + encodeURIComponent("ניקיון");
const CONT = "/api/container?action=equip&area=" + encodeURIComponent("מכולה");

r = await call(S, "GET", CLEAN);
ok("אחראי מכולה נחסם מציוד הניקיון", r.s === 403, `${r.s} ${r.b.error || ""}`);

await setRoles(HOUSE);
const H = jar();
await call(H, "POST", "/api/students?action=login", { tz: cv(target, MC.roster.tz) });
r = await call(H, "GET", CLEAN);
ok("אב בית נכנס לציוד הניקיון", r.s === 200, `${r.s} ${r.b.error || ""}`);
ok("  ומקבל את הפריטים", Array.isArray(r.b.equipment), `${(r.b.equipment || []).length} פריטים`);
r = await call(H, "GET", CONT);
ok("ואינו נכנס למכולה", r.s === 403, `${r.s} ${r.b.error || ""}`);

/* ⚠ גם הכתיבה, לא רק הקריאה */
r = await call(H, "POST", "/api/container?action=shop",
  { items: [{ name: "בדיקה", qty: "1" }], area: "מכולה" });
ok("ואינו מוסיף לרשימת הקניות של המכולה", r.s === 403, `${r.s} ${r.b.error || ""}`);

/* ⚠ ולא ניתן לעקוף בכך שכותבים תחום אחר בגוף הבקשה */
const cleanItem = (await call(H, "GET", CLEAN)).b.equipment[0];
await setRoles(ROLES);
const K = jar();
await call(K, "POST", "/api/students?action=login", { tz: cv(target, MC.roster.tz) });
if (cleanItem) {
  r = await call(K, "PUT", "/api/container?action=equip", { itemId: cleanItem.id, delta: 1 });
  ok("אחראי מכולה אינו משנה כמות בפריט ניקיון", r.s === 403, `${r.s} ${r.b.error || ""}`);
}
r = await call(D, "GET", CLEAN);
ok("המנהל רואה את שניהם", r.s === 200, `${r.s}`);

/* ⚠ ואיפה כן יש הבדל: תקציב הוא נתון כספי, ובוגרים הם מנהלים בלבד */
r = await call(K, "GET", CONT);
ok("אחראי מכולה עדיין נכנס למכולה", r.s === 200, `${r.s}`);
r = await call(S, "GET", "/api/students?action=alumni");
ok("בוגרים נשארים חסומים לחניך", r.s === 403, `${r.s}`);

/* ---------- החזרת המצב ---------- */
await setRoles(before ? before.split(",").map((x) => x.trim()).filter(Boolean) : []);
const back = (await gql(`{ items(ids:[${target.id}]){ column_values(ids:["${ROLES_COL}"]){ text } } }`))
  .items[0].column_values[0].text || "";
ok("התפקידים הוחזרו כפי שהיו", back === before, `"${back}" מול "${before}"`);

/* ============ 2 · שיעורים מול גאנט ============ */
console.log("\n=== לוח השיעורים מול הגאנט ===");
r = await call(D, "GET", "/api/lessons?action=board");
ok("הלוח נטען", r.s === 200, r.b.error);
const L = r.b;
ok("יש שדה cancelled", Array.isArray(L.cancelled), typeof L.cancelled);
/* ⚠ **הפוך ממה שהיה כאן.** הייתה בדיקה שדרשה שלכל שורה יהיה
   שדה `conflict` מול הגאנט. אין קשר בין הגאנט לשיעורים, השדה
   הוסר, והבדיקה נועלת עכשיו את ההיעדר שלו — כדי שלא יחזור. */
ok("אין שדה conflict על אף שורה", [...L.upcoming, ...L.unreported, ...L.cancelled]
  .every((m) => m.conflict === undefined),
  [...L.upcoming, ...L.unreported].filter((m) => m.conflict).length + " עם conflict");
ok("ואין מונה התנגשויות", L.counts.clashing === undefined, String(L.counts.clashing));
/* ⚠ ואף לא זכר לגאנט בתשובה כולה. */
ok("ולוח השיעורים אינו מזכיר את הגאנט כלל",
  !JSON.stringify(L).includes("גאנט"));

/* ============================================================
   ⚠ העיקר: "מתוכנן" שבגיליון מכריע.
   ------------------------------------------------------------
   התלונה הייתה ש"מסע בתרבות היהודית" הוצג ב-7/9 כשהגיליון
   אומר שהוא מתחיל ב-14/9. הגיליון מסמן את 7/9 כ"לא מתוכנן ·
   שבוע קליטה", והלוח התעלם מזה.
   ============================================================ */
const { PLANNED } = await import("../../shared/lessons-boards.js");
ok("אין מפגש \"לא מתוכנן\" בשיעורים הקרובים",
  L.upcoming.every((m) => m.planned !== PLANNED.no),
  L.upcoming.filter((m) => m.planned === PLANNED.no).map((m) => m.subject).join(" | "));
ok("וכל המבוטלים אכן מסומנים \"לא\"",
  L.cancelled.every((m) => m.planned === PLANNED.no));
ok("אין מפגש מבוטל ב\"טרם דווחו\"",
  L.unreported.every((m) => m.planned !== PLANNED.no));
ok("הספירה תואמת", L.counts.cancelled === L.cancelled.length &&
  L.counts.upcoming === L.upcoming.length);

/* ⚠ "מתוכנן" שבגיליון הוא הכלל **היחיד**. אין שני. */
ok("מספר המבוטלים שווה למי שסומן \"לא\"",
  L.counts.cancelled === L.cancelled.filter((m) => m.planned === PLANNED.no).length,
  `${L.counts.cancelled}`);

/* ⚠ המקרה הקונקרטי שהמנהל דיווח עליו */
const board7 = await call(D, "GET", "/api/lessons?action=board&today=2026-09-07");
const b14 = await call(D, "GET", "/api/lessons?action=board&today=2026-09-14");
const on7 = board7.b.upcoming.filter((m) => m.date === "2026-09-07"
  && m.subject.includes("מסע בתרבות"));
const on14 = b14.b.upcoming.filter((m) => m.date === "2026-09-14"
  && m.subject.includes("מסע בתרבות"));
ok("\"מסע בתרבות היהודית\" אינו מוצג ב-7/9", on7.length === 0);
ok("ומוצג ב-14/9", on14.length === 1, `${on14.length}`);

console.log(`  קרובים: ${L.counts.upcoming} · מבוטלים: ${L.counts.cancelled} · טרם דווחו: ${L.counts.unreported} · ביום אחר: ${L.counts.offDay}`);

/* ⚠ הסדר הוא התלונה: הלוח חייב להיקרא כמו הגיליון */
const { minutesOf } = await import("../../shared/lessons-boards.js");
let ordered = true;
for (let i = 1; i < L.upcoming.length; i++) {
  const a = L.upcoming[i - 1], b = L.upcoming[i];
  if (a.date > b.date) { ordered = false; break; }
  if (a.date === b.date && minutesOf(a.dayTime) > minutesOf(b.dayTime)) { ordered = false; break; }
}
ok("הלוח ממוין לפי תאריך ואז שעה", ordered);
ok("ולכל שורה יש שעה או סימון שאין", L.upcoming.every((m) => "time" in m));
ok("ומסומן מפגש שביום אחר מהגיליון", L.upcoming.every((m) => "offDay" in m),
  `${L.counts.offDay} חריגים`);
const off = L.upcoming.filter((m) => m.offDay);
for (const m of off.slice(0, 3)) console.log(`    ${m.date} ${m.subject} — בגיליון ${m.dayTime}`);
for (const m of L.cancelled.slice(0, 4)) {
  console.log(`    ${m.date}  ${m.subject}  <- לא מתוכנן: ${m.reason || "—"}`);
}

/* ⚠ "טרם דווח" מסונן לפי הגיליון בלבד ולא לפי הגאנט: חג
   בגאנט אינו הוכחה שלא היה שיעור (צום גדליה, אסרו חג). */

/* ⚠ `gantt-days` משרת עכשיו את **תקציב המטבח בלבד**, ושם הקשר
   אמיתי: סופ״ש בית וחג משנים כמה סועדים יש. */
const gd = await import("../../shared/gantt-days.js");
ok("gantt-days עדיין משרת את התקציב",
  typeof gd.eventsByDate === "function" && gd.HOME_RE instanceof RegExp);
ok("ו-lessonBlock הוסרה", gd.lessonBlock === undefined, typeof gd.lessonBlock);
/* ⚠ ולוח השיעורים אינו מייבא אותה. */
const { readFileSync } = await import("node:fs");
const src = readFileSync("api/_lessons-board.js", "utf8");
ok("לוח השיעורים אינו מייבא את הגאנט",
  !src.includes("gantt-days") && !src.includes("loadGantt"));

/* ============================================================
   ⚠⚠ **הסיכום בסדר המילים שהמריץ מנתח, והיציאה בקוד שגיאה.**

   שמונה חבילות הדפיסו "עברו N · נכשלו M" — סדר הפוך לזה
   ש-`run.mjs` מחפש — **ולא יצאו בקוד שגיאה**. התוצאה הייתה
   כפולה וגרועה משתי הסיבות בנפרד:

     · הטענות שלהן לא נספרו בסך הכול בכלל.
     · וטענה שנכשלה בהן הוצגה כ-V ירוק, כי המריץ קובע
       לפי קוד היציאה בלבד.

   כלומר "423 טענות עברו" היה מספר של שתים־עשרה חבילות, ושמונה
   חבילות יכלו להיכשל בלי שאיש יראה. זה בדיוק סוג הכשל שהבדיקות
   קיימות כדי למנוע.
   ============================================================ */
console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);

await reg.restore();
