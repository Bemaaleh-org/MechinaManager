/* ============================================================
   דירוג ידני לחוות דעת.
   ------------------------------------------------------------
   ⚠ הבדיקה יוצרת חוות דעת משלה ומוחקת אותה בסוף. היא אינה
     נוגעת בשורה אמיתית.

     הגרסה הקודמת בחרה "חוות הדעת הראשונה בלי דירוג", שינתה
     אותה והחזירה אותה בסוף — ופעם אחת ההחזרה לא תפסה והשאירה
     7.5 על שורה של מרצה אמיתי. בדיקה שנוגעת בנתונים של
     המכינה תלויה בכך שכל שלב בניקוי יצליח; בדיקה שיוצרת את
     הנתונים שלה לא תלויה בכלום.

   ⚠ הקודים נקראים מהלוח בתוך הסקריפט ואינם מודפסים.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { LESSON_BOARDS as LB, LESSON_COLS as LC } from "../../shared/lessons-boards.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { status: r.status, b: JSON.parse(t) } } catch { return { status: r.status, b: t.slice(0, 200) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const M = jar();
/* ⚠ מנהל שטרם בחר שם וסיסמה חסום בכל נקודות הקצה מאז שנוספה
   ההרשמה. הרישום כאן זמני, הסיסמה שנוצרת אינה קיימת, והשחזור
   בסוף חובה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("דני לויט", "נעם");
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.status !== 200) { console.log("כניסה נכשלה", r.b); process.exit(1); }

const list = () => call(M, "GET", "/api/lessons?action=evals").then((x) => x.b.evals);
const NAME = "בדיקה — מרצה זמני";

/* ---------- שורה משלנו ---------- */
r = await call(M, "POST", "/api/lessons?action=evals",
  { name: NAME, opinion: "שורת בדיקה. נמחקת בסוף הריצה.", cycle: "מחזור ב׳" });
if (r.status !== 200) { console.log("יצירה נכשלה", r.b); process.exit(1); }
const id = r.b.id;
console.log("נוצרה שורת בדיקה:", id);

/* ⚠ כל יציאה — גם על כישלון — מוחקת את השורה. */
const cleanup = async () => {
  try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: id }); } catch { /* נמחקה כבר */ }
};
process.on("uncaughtException", async (e) => { console.log("שגיאה:", e.message); await cleanup(); process.exit(1); });

const mine = async () => (await list()).find((x) => x.id === id);
let e = await mine();

console.log("\n=== שורה חדשה מתחילה בלי דירוג ===");
ok("אין דירוג", e.manual === null && e.score === null, `${e.manual}/${e.score}`);
ok("ואין מקור", e.source === null, String(e.source));

console.log("\n=== הזנת דירוג ===");
r = await call(M, "PUT", "/api/lessons?action=evals", { evalId: id, manualScore: 7.5 });
ok("נשמר", r.status === 200, r.b.error);
e = await mine();
ok("הדירוג נקלט", e.manual === 7.5, String(e.manual));
ok("והוא מה שמוצג", e.score === 7.5, String(e.score));
ok("ומסומן כידני", e.source === "manual", String(e.source));
ok("⚠ ואינו מתחזה לממוצע חניכים", e.avg === null && e.votes === null, `avg=${e.avg} votes=${e.votes}`);

console.log("\n=== עיגול וגבולות ===");
await call(M, "PUT", "/api/lessons?action=evals", { evalId: id, manualScore: 8.26 });
e = await mine();
ok("מתעגל לספרה אחת", e.manual === 8.3, String(e.manual));
for (const [v, why] of [[0, "אפס"], [11, "מעל עשר"], [-3, "שלילי"], ["שמונה", "טקסט"]]) {
  r = await call(M, "PUT", "/api/lessons?action=evals", { evalId: id, manualScore: v });
  ok(`${why} נדחה`, r.status === 400, `${r.status} ${r.b.error || ""}`);
}
e = await mine();
ok("והערך הקודם לא נפגע", e.manual === 8.3, String(e.manual));

console.log("\n=== עריכת הערה אינה מוחקת דירוג ===");
r = await call(M, "PUT", "/api/lessons?action=evals", { evalId: id, opinion: "טקסט אחר." });
ok("נשמר", r.status === 200, r.b.error);
e = await mine();
ok("הדירוג שרד", e.manual === 8.3, String(e.manual));

console.log("\n=== ניקוי הדירוג ===");
r = await call(M, "PUT", "/api/lessons?action=evals", { evalId: id, manualScore: null });
ok("נשמר", r.status === 200, r.b.error);
e = await mine();
ok("הדירוג נמחק", e.manual === null, String(e.manual));
ok("וחזרנו לבלי דירוג", e.source === null && e.score === null, `${e.source}/${e.score}`);

console.log("\n=== הצבעות חניכים גוברות ===");
/* ⚠ קריאה בלבד על שורה אמיתית — לא כתיבה. */
const voted = (await list()).find((x) => x.source === "students");
if (!voted) {
  console.log("  (אין חוות דעת עם הצבעות חניכים — מדולג)");
} else {
  ok("מוצג לפי החניכים", voted.score === voted.avg, `${voted.score}/${voted.avg}`);
  ok("ויש מניין מדרגים", voted.votes > 0, String(voted.votes));
}

console.log("\n=== הרשאה ===");
const G = jar();
await call(G, "POST", "/api/auth?action=login", { code: codeOf("נעם") });
r = await call(G, "PUT", "/api/lessons?action=evals", { evalId: id, manualScore: 5 });
/* ============================================================
   ⚠ **מדריך קורא ואינו כותב.** הטענה כאן אמרה עד עכשיו
     "מדריך כן רשאי (צוות)", והיא נכתבה לפני 4ע — כשכל כניסת
     צוות יכלה לערוך גיליונות מרצים ותקציב, לא כי מישהו החליט
     אלא כי `isManager` הוא הדגל הרחב ביותר במערכת.

   `edit: "scheduler"` צמצם את **הכתיבה בלבד** לראש המכינה
   ולאחראי הלו״ז, והטענה נשארה מאחור. היא נכשלה בשקט במשך סשן
   שלם כי החבילה לא יצאה בקוד שגיאה.

   ⚠ ובודקים גם את **תוכן ההודעה**: 403 לבדו יכול להגיע משורה
     אחרת לגמרי, וההודעה היא מה שאומר למשתמש למי לפנות.
   ============================================================ */
ok("מדריך נחסם בכתיבה", r.status === 403, `${r.status} ${r.b.error || ""}`);
ok("וההודעה אומרת מי כן רשאי",
  /ראש המכינה|אחראי הלו/.test(r.b.error || ""), r.b.error);
r = await call(G, "GET", "/api/lessons?action=evals");
ok("אבל קורא בלי בעיה", r.status === 200, String(r.status));
const OUT = jar();
r = await call(OUT, "PUT", "/api/lessons?action=evals", { evalId: id, manualScore: 5 });
ok("מנותק נחסם", r.status === 401, `${r.status} ${r.b.error || ""}`);

console.log("\n=== תאריך השיעור ===");
/* ⚠ שונה מהתאריך שבו נכתבה חוות הדעת. ראו shared/lessons-boards.js. */
r = await call(M, "PUT", "/api/lessons?action=evals",
  { evalId: id, lessonDate: "2026-09-10" });
ok("תאריך שיעור נשמר", r.status === 200, r.b.error);
e = await mine();
ok("והוא חוזר", e.lessonDate === "2026-09-10", String(e.lessonDate));
ok("ואינו דורס את תאריך הכתיבה", Boolean(e.at) && e.at !== e.lessonDate,
  `${e.at} מול ${e.lessonDate}`);

r = await call(M, "PUT", "/api/lessons?action=evals",
  { evalId: id, lessonDate: "10/09/2026" });
ok("פורמט שגוי נדחה", r.status === 400 && /YYYY-MM-DD/.test(r.b.error || ""),
  `${r.status} ${r.b.error || ""}`);

r = await call(M, "PUT", "/api/lessons?action=evals", { evalId: id, lessonDate: "" });
ok("וריק מנקה", r.status === 200, r.b.error);
e = await mine();
ok("התאריך נוקה", e.lessonDate === null, String(e.lessonDate));

console.log("\n=== מחיקה: מחזור ב׳ בלבד ===");
/* ⚠⚠ **הטענה החשובה כאן היא החסימה, לא המחיקה.** 31 חוות הדעת
   של מחזור א׳ יובאו ממקור שאינו קיים עוד, והטקסט שבשורה הוא כל
   מה שנשאר מהשיעור. הבדיקה בוחרת שורה אמיתית של מחזור א׳,
   מנסה למחוק אותה, ומוודאת **גם שהיא נדחתה וגם שהשורה שרדה** —
   בלי הטענה השנייה, 404 שמגיע אחרי מחיקה מוצלחת נראה כמו הצלחה. */
const firstCycle = (await list()).find((x) => x.cycle === "מחזור א׳");
if (!firstCycle) {
  console.log("  (אין חוות דעת ממחזור א׳ — מדולג)");
} else {
  r = await call(M, "DELETE",
    "/api/lessons?action=evals&evalId=" + encodeURIComponent(firstCycle.id));
  ok("מחזור א׳ נחסם", r.status === 403, `${r.status} ${r.b.error || ""}`);
  ok("וההודעה אומרת למה", /אינה נמחקת/.test(r.b.error || ""), r.b.error);
  const survived = (await allItems(LB.evals)).some((x) => String(x.id) === firstCycle.id);
  ok("והשורה האמיתית שרדה", survived);
}

const OUT2 = jar();
r = await call(OUT2, "DELETE", "/api/lessons?action=evals&evalId=" + id);
ok("מנותק נחסם במחיקה", r.status === 401, String(r.status));

r = await call(M, "DELETE", "/api/lessons?action=evals&evalId=999999999");
ok("מזהה שאינו קיים מחזיר 404", r.status === 404, `${r.status} ${r.b.error || ""}`);

r = await call(M, "DELETE", "/api/lessons?action=evals&evalId=" + id);
ok("ומחזור ב׳ נמחק", r.status === 200, `${r.status} ${r.b.error || ""}`);
ok("והשורה אינה בלוח",
  !(await allItems(LB.evals)).some((x) => String(x.id) === String(id)));

console.log("\n=== ניקוי ===");
await cleanup();
const left = (await allItems(LB.evals)).some((x) => String(x.id) === String(id));
ok("שורת הבדיקה נמחקה", !left);
const names = (await allItems(LB.evals)).filter((x) => x.name.includes("בדיקה"));
ok("ולא נשארה שום שורת בדיקה", names.length === 0, names.map((x) => x.name).join(","));

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
