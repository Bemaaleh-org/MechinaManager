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
ok("מדריך כן רשאי (צוות)", r.status === 200, `${r.status} ${r.b.error || ""}`);
const OUT = jar();
r = await call(OUT, "PUT", "/api/lessons?action=evals", { evalId: id, manualScore: 5 });
ok("מנותק נחסם", r.status === 401, `${r.status} ${r.b.error || ""}`);

console.log("\n=== ניקוי ===");
await cleanup();
const left = (await allItems(LB.evals)).some((x) => String(x.id) === String(id));
ok("שורת הבדיקה נמחקה", !left);
const names = (await allItems(LB.evals)).filter((x) => x.name.includes("בדיקה"));
ok("ולא נשארה שום שורת בדיקה", names.length === 0, names.map((x) => x.name).join(","));

console.log(`\nעברו ${pass} · נכשלו ${fail}`);

await reg.restore();
