/* ============================================================
   שני שלבים בבקשת יציאה — מקצה לקצה.
   ⚠ מוחקת אך ורק את מה שיצרה: שתי בקשות ושורת ההיעדרות
     שנוצרה מהאישור. אינה נוגעת בשיבוצים ואינה מוחקת לוח.
   ⚠ הקודים נקראים מהלוח בתוך הסקריפט. אינם מודפסים ואינם
     עוברים בשורת הפקודה.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { MECHINA_BOARDS as MB, MECHINA_COLS as MC } from "../../shared/mechina-boards.js";
import { PLACEMENT_BOARDS as PB, PLACEMENT_COLS as PC } from "../../shared/placements-ids.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { status: r.status, b: JSON.parse(t) } } catch { return { status: r.status, b: t.slice(0, 200) } }
};
const login = async (code) => { const j = jar(); const r = await call(j, "POST", "/api/auth?action=login", { code }); return { j, r }; };
/* ⚠ חשבון הבדיקה **רשום**, ומאז שנסגרה עקיפת הסיסמה
   ?action=login מחזיר לו 409. חניך שטרם נרשם עדיין נכנס בת"ז,
   ולכן שני המסלולים קיימים כאן — והבחירה לפי מה שיש. */
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
const loginStudent = async (tz, viaPassword) => {
  const j = jar();
  const r = viaPassword
    ? await call(j, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS })
    : await call(j, "POST", "/api/students?action=login", { tz });
  return { j, r };
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const del = (i) => gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i });

/* ---------- מי נכנס ---------- */
const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => {
  const u = users.find((x) => x.name.includes(t));
  if (!u || !cv(u, AUTH_COLS.code)) { console.log("אין קוד ל:", t); process.exit(1); }
  return cv(u, AUTH_COLS.code);
};

const roster = (await gql(`{ boards(ids:[${MB.roster}]){ items_page(limit:100){items{id name column_values(ids:["${MC.roster.tz}","${MC.roster.active}"]){id text}}} } }`))
  .boards[0].items_page.items
  .filter((x) => cv(x, MC.roster.tz) && cv(x, MC.roster.active) === "v");

const defs = await allItems(PB.definitions);
const groups = new Set(defs.filter((d) => cv(d, PC.definitions.category) === "קבוצה").map((d) => String(d.id)));
const inGroup = new Set((await allItems(PB.assignments))
  .filter((a) => groups.has(cv(a, PC.assignments.placement)))
  .map((a) => cv(a, PC.assignments.student)));

const withG = roster.find((x) => inGroup.has(String(x.id)));
const noG = roster.find((x) => !inGroup.has(String(x.id)));
/* ⚠ הבדיקה לא תלויה בשיבוצים של המכינה. אם אין חניך משובץ
   לקבוצה — היא משבצת אחד בעצמה ומחזירה את המצב בסוף. בדיקה
   שנופלת כי מישהו שינה שיבוץ אינה בדיקה, היא מלכודת. */
let mineAssignment = null;
let withGuide = withG;
if (!noG) { console.log("נדרש לפחות חניך אחד בלי שיבוץ לקבוצה"); process.exit(1); }
if (!withGuide) {
  const grp = defs.find((d) => cv(d, PC.definitions.category) === "קבוצה" && /נעם/.test(d.name));
  if (!grp) { console.log("לא נמצאה קבוצת נעם"); process.exit(1); }
  withGuide = roster.find((x) => String(x.id) !== String(noG.id));
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: PB.assignments, n: `${withGuide.name} — ${grp.name}`, v: JSON.stringify({
        [PC.assignments.student]: String(withGuide.id),
        [PC.assignments.studentName]: withGuide.name,
        [PC.assignments.placement]: String(grp.id),
        [PC.assignments.placementName]: grp.name,
        [PC.assignments.semester]: { label: "שנתי" },
      }) });
  mineAssignment = d.create_item.id;
  console.log("שובץ זמנית לבדיקה:", withGuide.name, "→", grp.name);
}
console.log(`משובץ: ${withGuide.name} · לא משובץ: ${noG.name}`);

const S = await loginStudent(cv(withGuide, MC.roster.tz));
/* ⚠ noG הוא חשבון הבדיקה, והוא רשום — לכן סיסמה ולא ת"ז.
   הדגל נגזר מהנתונים ולא מקובע: אם ייבחר חניך אחר שאינו
   רשום, המסלול יתאים את עצמו. */
const S2 = await loginStudent(cv(noG, MC.roster.tz), noG.name.includes("בדיקה"));
/* ⚠ מנהל שטרם בחר שם וסיסמה חסום בכל נקודות הקצה מאז שנוספה
   ההרשמה. הרישום כאן זמני, הסיסמה שנוצרת אינה קיימת, והשחזור
   בסוף חובה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("נעם", "שירה", "דני לויט", "רועי");
const NOAM = await login(codeOf("נעם")), SHIRA = await login(codeOf("שירה"));
const DANI = await login(codeOf("דני לויט")), ROY = await login(codeOf("רועי"));
for (const [n, x] of Object.entries({ משובץ: S, "לא משובץ": S2, נעם: NOAM, שירה: SHIRA, דני: DANI, רועי: ROY }))
  if (x.r.status !== 200) { console.log("כניסה נכשלה:", n, x.r.b); process.exit(1) }

console.log("\n=== תפקידים ===");
let me = await call(DANI.j, "GET", "/api/auth?action=me");
ok("דני הוא ראש מכינה", me.b.isHead === true && me.b.isGuide === false, JSON.stringify({ h: me.b.isHead, g: me.b.isGuide }));
me = await call(NOAM.j, "GET", "/api/auth?action=me");
ok("נעם הוא מדריך", me.b.isGuide === true && me.b.isHead === false, JSON.stringify({ h: me.b.isHead, g: me.b.isGuide }));
me = await call(ROY.j, "GET", "/api/auth?action=me");
ok("רועי — מנהל ותו לא", !me.b.isHead && !me.b.isGuide);
me = await call(S.j, "GET", "/api/auth?action=me");
ok("חניך אינו ראש ואינו מדריך", !me.b.isHead && !me.b.isGuide);

const DATE = "2026-11-16", DATE2 = "2026-11-17";
let r, q;

console.log("\n=== חניך בלי קבוצה: ישר לראש המכינה ===");
r = await call(S2.j, "POST", "/api/attendance?action=requests",
  { type: "מוצדקת", date: DATE, endDate: DATE, detail: "בדיקה — בלי קבוצה", outAt: "14:00", backAt: "20:00" });
ok("הוגשה", r.status === 200, r.b.error);
const noGroupId = r.b.id;
q = (await call(DANI.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === noGroupId);
ok("שלב = אצל ראש המכינה", q.stage === "אצל ראש המכינה", q.stage);
ok("אין מדריך", q.guideName === null, String(q.guideName));
ok("דני יכול להכריע מיד", q.canDecide === true);
q = (await call(NOAM.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === noGroupId);
ok("נעם לא", q.canDecide === false);
r = await call(NOAM.j, "POST", "/api/attendance?action=decide", { requestId: noGroupId, decision: "approve" });
ok("ונחסם בשרת", r.status === 403, `${r.status} ${r.b.error}`);
r = await call(DANI.j, "POST", "/api/attendance?action=decide", { requestId: noGroupId, decision: "reject" });
ok("דני דוחה", r.status === 200 && r.b.status === "נדחה", r.b.error || r.b.status);

console.log("\n=== חניך עם קבוצה: מדריך ואז ראש מכינה ===");
r = await call(S.j, "POST", "/api/attendance?action=requests",
  { type: "מוצדקת", date: DATE2, endDate: DATE2, detail: "בדיקה — עם קבוצה", outAt: "14:00", backAt: "20:00" });
ok("הוגשה", r.status === 200, r.b.error);
const id = r.b.id;
q = (await call(DANI.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === id);
ok("שלב = אצל המדריך", q.stage === "אצל המדריך", q.stage);
ok("המדריך הוא נעם", (q.guideName || "").includes("נעם"), String(q.guideName));
ok("הקבוצה מוצגת", q.groupName === "קבוצת נעם", String(q.groupName));
ok("דני יכול להכריע כבר עכשיו", q.canDecide === true);
ok("ובכובע של ראש מכינה", q.decideAs === "head", String(q.decideAs));
q = (await call(SHIRA.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === id);
ok("שירה — לא הקבוצה שלה", q.canDecide === false);
r = await call(SHIRA.j, "POST", "/api/attendance?action=decide", { requestId: id, decision: "approve" });
ok("ונחסמת", r.status === 403, `${r.status} ${r.b.error}`);
q = (await call(ROY.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === id);
ok("רועי רואה את הבקשה ואת השלב", q.stage === "אצל המדריך" && q.canDecide === false && q.decideAs === null);
q = (await call(NOAM.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === id);
ok("נעם כן — בכובע של מדריך", q.canDecide === true && q.decideAs === "guide", String(q.decideAs));

console.log("\n=== דחיית המדריך ממשיכה לדני ===");
r = await call(NOAM.j, "POST", "/api/attendance?action=decide", { requestId: id, decision: "reject" });
ok("ההמלצה נרשמה", r.status === 200, r.b.error);
ok("השלב עבר לראש המכינה", r.b.stage === "אצל ראש המכינה", r.b.stage);
ok("הסטטוס לא זז", r.b.status === "ממתין", r.b.status);
ok("ולא נוצרה היעדרות", r.b.absenceCreated === false);
q = (await call(DANI.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === id);
ok("דני רואה את ההמלצה", q.guideDecision === "נדחה", String(q.guideDecision));
ok("ואת מי שהמליץ", (q.guideBy || "").includes("נעם"), String(q.guideBy));
ok("ועכשיו הוא מכריע", q.canDecide === true);
q = (await call(NOAM.j, "GET", "/api/attendance?action=requests")).b.requests.find((x) => x.id === id);
ok("נעם כבר לא", q.canDecide === false);
r = await call(NOAM.j, "POST", "/api/attendance?action=decide", { requestId: id, decision: "approve" });
ok("וחסום מלשנות את דעתו", r.status === 403, `${r.status} ${r.b.error}`);

console.log("\n=== דני הופך את ההמלצה ===");
r = await call(DANI.j, "POST", "/api/attendance?action=decide", { requestId: id, decision: "approve" });
ok("דני מאשר למרות הדחייה", r.status === 200 && r.b.status === "מאושר", r.b.error || r.b.status);
ok("ונרשמה היעדרות", r.b.absenceCreated === true);
ok("השלב הסתיים", r.b.stage === "הסתיים", r.b.stage);
r = await call(DANI.j, "POST", "/api/attendance?action=decide", { requestId: id, decision: "reject" });
ok("ואי אפשר להכריע פעמיים", r.status === 409, `${r.status} ${r.b.error}`);

console.log("\n=== מה החניך רואה ===");
const mineReqs = (await call(S.j, "GET", "/api/attendance?action=requests")).b;
q = mineReqs.requests.find((x) => x.id === id);
ok("רואה שאושרה", q.status === "מאושר", q.status);
/* ⚠ העיקר: שום שדה של השלבים הפנימיים לא יוצא לחניך. */
const LEAK = ["stage", "guideName", "groupName", "guideDecision", "guideBy",
              "guideAt", "canDecide", "decideAs", "student"];
const leaked = LEAK.filter((k) => k in q);
ok("לא רואה שלב, מדריך או המלצה", leaked.length === 0, "דלף: " + leaked.join(", "));
ok("והשדות שכן — בדיוק אלה שהוגדרו",
  JSON.stringify(Object.keys(q).sort()) === JSON.stringify(
    /* ⚠ הרשימה **סגורה בכוונה**: היא נועלת את מה שיוצא
       לחניך, ושדה חדש שיתווסף למיפוי ייפול כאן ולא ידלוף
       בשקט. outAt ו-backAt נוספו במודע — הן שעות שהחניך
       עצמו הזין. */
    ["backAt","date","decidedAt","decidedBy","detail","endDate","hasFile","id","outAt","status","type"]),
  Object.keys(q).sort().join(","));
ok("ולא רואה בקשות של אחרים",
  !mineReqs.requests.some((x) => x.id === noGroupId), "מספר בקשות: " + mineReqs.requests.length);

console.log("\n=== ניקוי ===");
for (const rid of [id, noGroupId]) await del(rid);
let removed = 0;
for (const a of await allItems(MB.absence)) {
  if (cv(a, MC.absence.date) !== DATE2) continue;
  await del(a.id); removed++;
}
ok("ההיעדרות שנוצרה נמחקה", removed === 1, "נמחקו " + removed);
const left = await allItems(MB.requests);
ok("שתי הבקשות נמחקו", !left.some((x) => [id, noGroupId].includes(String(x.id))), "נותרו " + left.length);

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
