/* ============================================================
   דף המובילויות — מה שכבר עבר, ושני הקולות
   ------------------------------------------------------------
   ⚠ הבדיקה משבצת את **חשבון הבדיקה** לשבוע שהסתיים ולשבוע
     עתידי, ומחזירה את המובילים המקוריים ב-finally.

   ⚠ ומנקה את שדות המשוב והסיכום שהיא כתבה — הם שדות אמיתיים
     על שורה אמיתית.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { invalidate } from "../../api/_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../../shared/mechina-boards.js";
import { israelToday } from "../../api/_attendance-data.js";

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
const setCols = (item, v) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
  { b: MECHINA_BOARDS.leaderWeeks, i: item, v: JSON.stringify(v) });

const W = MECHINA_COLS.leaderWeeks;
const today = israelToday();
const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }

/* ============================================================
   ⚠ **הבדיקה יוצרת את השבועות שלה ואינה נשענת על הלוח.**

   גרסה ראשונה חיפשה "שבוע שכבר הסתיים" בלוח האמיתי — ובתחילת
   שנה אין כזה, כלומר הבדיקה דילגה על עצמה בשקט בדיוק בתקופה
   שבה היא הכי נחוצה. חמור מזה: היא הייתה כותבת משוב וסיכום על
   שבוע הובלה **אמיתי** של חניכים אמיתיים.

   שני שבועות זמניים — אחד שהסתיים ואחד עתידי — נמחקים ב-finally
   לפי המזהה שחזר מהיצירה.
   ============================================================ */
const mkWeek = async (name, start, end) => {
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b,item_name:$n,column_values:$v,
                   create_labels_if_missing:false){ id } }`,
    { b: MECHINA_BOARDS.leaderWeeks, n: name,
      v: JSON.stringify({
        [W.start]: { date: start }, [W.end]: { date: end },
        [W.num]: "999",
        [W.leaders]: { item_ids: [Number(demo.id)] },
      }) });
  return String(d.create_item.id);
};

const back = (iso, n) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const made = [];
const pastId = await mkWeek("בדיקה — שבוע שהסתיים", back(today, -10), back(today, -4));
made.push(pastId);
const futureId = await mkWeek("בדיקה — שבוע עתידי", back(today, 4), back(today, 10));
made.push(futureId);
invalidate("leader-weeks");

const past = { id: pastId };
const future = { id: futureId };

const cleanup = async () => {
  for (const id of made) {
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id }); }
    catch { /* כבר נמחק */ }
  }
  made.length = 0;
  invalidate("leader-weeks");
};
process.on("uncaughtException", async (e) => {
  console.log("שגיאה:", e.message); await cleanup(); process.exit(1);
});

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

console.log(`שבוע שעבר: ${back(today, -10)}–${back(today, -4)}`);
console.log(`שבוע עתידי: ${back(today, 4)}–${back(today, 10)}`);

try {
  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ המתנה על תנאי — מטמון השבועות יושב בתהליך אחר. */
  let d = null;
  for (let i = 0; i < 60; i++) {
    d = await call(S, "GET", "/api/students?action=leadership");
    if (d.s === 200 && (d.b.weeks || []).some((w) => String(w.id) === String(past.id))) break;
    await new Promise((z) => setTimeout(z, 1000));
  }

  console.log("\n=== רק מה שכבר עבר ===");
  ok("המסך נטען", d.s === 200, `${d.s} ${d.b.error || ""}`);
  ok("השבוע שהסתיים מופיע",
    (d.b.weeks || []).some((w) => String(w.id) === String(past.id)),
    (d.b.weeks || []).map((w) => w.num).join(","));
  /* ⚠⚠ **הטענה המרכזית**, ובקשה מפורשת של המכינה: שבוע עתידי
     אינו מופיע — גם כשהחניך משובץ אליו. דף שמראה את השבוע
     שעומד להגיע הופך מסיכום למטלה. */
  ok("והשבוע העתידי אינו מופיע",
    !(d.b.weeks || []).some((w) => String(w.id) === String(future.id)),
    (d.b.weeks || []).map((w) => w.num).join(","));

  const mine = (d.b.weeks || []).find((w) => String(w.id) === String(past.id));
  ok("ויש עליו עובדות מהלוחות",
    mine && mine.facts && typeof mine.facts.schoolDays === "number",
    JSON.stringify(mine && mine.facts));
  ok("וסידורי — 'המובילות הראשונה'", mine && mine.ordinal === 1, String(mine && mine.ordinal));

  console.log("\n=== שני קולות ===");
  /* ⚠ הצוות כותב משוב; החניך אינו. */
  r = await call(S, "PUT", "/api/students?action=leadership",
    { weekId: past.id, feedback: "בדיקה — משוב מהחניך" });
  ok("חניך אינו כותב משוב", r.s === 403 && /הצוות/.test(r.b.error || ""),
    `${r.s} ${r.b.error || ""}`);

  r = await call(M, "PUT", "/api/students?action=leadership",
    { weekId: past.id, feedback: "בדיקה — משוב הצוות" });
  ok("הצוות כותב משוב", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ והחניך אינו כותב סיכום על שבוע שלא הוביל — וגם הצוות לא. */
  r = await call(M, "PUT", "/api/students?action=leadership",
    { weekId: past.id, summary: "בדיקה — סיכום מהצוות" });
  ok("הצוות אינו כותב סיכום", r.s === 403 && /שהובילו/.test(r.b.error || ""),
    `${r.s} ${r.b.error || ""}`);

  r = await call(S, "PUT", "/api/students?action=leadership",
    { weekId: past.id, summary: "בדיקה — סיכום החניך" });
  ok("מי שהוביל כותב סיכום", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ שבוע שלא הסתיים אינו נכתב עליו כלום. */
  r = await call(M, "PUT", "/api/students?action=leadership",
    { weekId: future.id, feedback: "בדיקה" });
  ok("שבוע שטרם הסתיים נחסם", r.s === 400 && /שכבר הסתיים/.test(r.b.error || ""),
    `${r.s} ${r.b.error || ""}`);

  for (let i = 0; i < 60; i++) {
    d = await call(S, "GET", "/api/students?action=leadership");
    const w = (d.b.weeks || []).find((x) => String(x.id) === String(past.id));
    if (w && w.feedback && w.summary) break;
    await new Promise((z) => setTimeout(z, 1000));
  }
  const w2 = (d.b.weeks || []).find((x) => String(x.id) === String(past.id));
  ok("החניך רואה את המשוב", (w2 || {}).feedback === "בדיקה — משוב הצוות", (w2 || {}).feedback);
  ok("ואת הסיכום שכתב", (w2 || {}).summary === "בדיקה — סיכום החניך", (w2 || {}).summary);
  ok("ונרשם מי כתב את המשוב", Boolean((w2 || {}).feedbackBy), (w2 || {}).feedbackBy);

  console.log("\n=== הצוות ===");
  r = await call(M, "GET", "/api/students?action=leadership&all=1");
  ok("הצוות רואה את כל השבועות שהיו", r.s === 200 && (r.b.weeks || []).length > 0,
    String((r.b.weeks || []).length));
  ok("וגם אצלו רק מה שהסתיים",
    !(r.b.weeks || []).some((w) => String(w.id) === String(future.id)));
  ok("ורשאי לכתוב", r.b.canWrite === true, String(r.b.canWrite));

  const OUT = jar();
  r = await call(OUT, "GET", "/api/students?action=leadership");
  ok("מנותק חסום", r.s === 401, String(r.s));
} finally {
  await cleanup();
  const left = (await allItems(MECHINA_BOARDS.leaderWeeks))
    .filter((w) => String(w.name || "").includes("בדיקה"));
  console.log(left.length === 0
    ? "  (שבועות הבדיקה נמחקו)"
    : "  !! נשארו שבועות בדיקה בלוח: " + left.map((w) => w.name).join(", "));
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
