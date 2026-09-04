/* ============================================================
   מיונים לצבא — הבעלות, והגישה של יו״ר הוועדה
   ------------------------------------------------------------
   ⚠ הבדיקה יוצרת מיונים **על חשבון הבדיקה בלבד** ומוחקת אותם
     לפי מזהה. היא אינה נוגעת במיון של חניך אמיתי.

   ⚠ ומדליקה זמנית את תיבת "ועדת גיוסים" על ועדה אחת, כדי
     לבדוק את הגישה של היו״ר — ומחזירה אותה ב-finally.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { invalidate } from "../../api/_cache.js";
import { TRYOUT_BOARD, TRYOUT_COLS as T } from "../../shared/tryouts-ids.js";
import { PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORY } from "../../shared/placements.js";

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
const setCols = (board, item, v) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
  { b: board, i: item, v: JSON.stringify(v) });

const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }

const DC = PLACEMENT_COLS.definitions;
const defs = await allItems(PLACEMENT_BOARDS.definitions);
const cmt = defs.find((d) => cv(d, DC.category) === CATEGORY.committee);
if (!cmt) { console.log("אין ועדה בלוח ההגדרות"); process.exit(1); }

const before = {
  army: cv(cmt, DC.army) === "v",
  chair: cv(cmt, DC.chair) || "",
  chairName: cv(cmt, DC.chairName) || "",
};

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

const S = jar();
r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
if (r.s !== 200) { console.log("כניסת חשבון הבדיקה נכשלה", r.b); await reg.restore(); process.exit(1); }

const made = [];
const cleanup = async () => {
  for (const id of made) {
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id }); } catch { /* כבר נמחק */ }
  }
  made.length = 0;
};

try {
  /* ============ 1 · החניך על עצמו ============ */
  console.log("=== החניך רושם על עצמו ===");
  r = await call(S, "GET", "/api/students?action=tryouts");
  ok("המסך נטען", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("וחניך רגיל אינו רואה את כולם", r.b.canSeeAll === false, String(r.b.canSeeAll));
  const startCount = (r.b.tryouts || []).length;

  r = await call(S, "POST", "/api/students?action=tryouts",
    { name: "בדיקה — גיבוש", date: "2026-10-05", status: "מתוכנן", track: "מסלול בדיקה" });
  ok("מיון נוסף", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  if (r.b.id) made.push(String(r.b.id));
  const id1 = r.b.id;

  /* ⚠ הנקודה כולה: **כמה** מיונים לאותו חניך, ולא מחרוזת אחת. */
  r = await call(S, "POST", "/api/students?action=tryouts",
    { name: "בדיקה — מיון שני", date: "2026-11-02", status: "עבר" });
  ok("ומיון שני לאותו חניך", r.s === 200, `${r.s} ${r.b.error || ""}`);
  if (r.b.id) made.push(String(r.b.id));

  r = await call(S, "GET", "/api/students?action=tryouts");
  ok("שניהם חוזרים", (r.b.tryouts || []).length === startCount + 2,
    String((r.b.tryouts || []).length));
  /* ⚠ מיון עתידי לפני מוקדם — הרשימה ממוינת מהאחרון. */
  ok("והחדש ראשון", (r.b.tryouts[0] || {}).date === "2026-11-02",
    (r.b.tryouts[0] || {}).date);

  /* ⚠ תווית שאינה בלוח נדחית ברעש ואינה נוצרת בשקט. */
  r = await call(S, "PUT", "/api/students?action=tryouts",
    { id: id1, status: "עבר בהצטיינות" });
  ok("מצב שאינו בלוח נדחה", r.s === 400 && /אינו מצב מוכר/.test(r.b.error || ""),
    `${r.s} ${r.b.error || ""}`);

  r = await call(S, "PUT", "/api/students?action=tryouts",
    { id: id1, status: "עבר", note: "עבר לשלב הבא" });
  ok("עריכה עוברת", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(S, "PUT", "/api/students?action=tryouts", { id: id1, date: "5.10.2026" });
  ok("תאריך בפורמט שגוי נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  /* ============ 2 · הבעלות ============ */
  console.log("\n=== הבעלות אצל החניך ===");
  /* ⚠⚠ **הטענה המרכזית.** `army` ו-`tryouts` תמיד מולאו על ידי
     החניך על עצמו; עריכה מבחוץ הופכת את הנתון מ"מה שהחניך
     מספר" ל"מה שהצוות רשם עליו". */
  r = await call(M, "POST", "/api/students?action=tryouts", { name: "בדיקה — של הצוות" });
  ok("ראש המכינה אינו רושם מיון", r.s === 403, `${r.s} ${r.b.error || ""}`);
  ok("וההודעה אומרת למה", /החניך על עצמו/.test(r.b.error || ""), r.b.error);
  r = await call(M, "PUT", "/api/students?action=tryouts", { id: id1, status: "לא עבר" });
  ok("ואינו עורך", r.s === 403, String(r.s));
  r = await call(M, "DELETE", "/api/students?action=tryouts", { id: id1 });
  ok("ואינו מוחק", r.s === 403, String(r.s));

  /* ⚠ 404 ולא 403 על מיון של חניך אחר — 403 מאשר שהשורה קיימת. */
  const other = (await allItems(TRYOUT_BOARD.board))
    .find((x) => cv(x, T.student) && cv(x, T.student) !== String(demo.id));
  if (other) {
    r = await call(S, "PUT", "/api/students?action=tryouts", { id: String(other.id), status: "עבר" });
    ok("מיון של חניך אחר מחזיר 404", r.s === 404, `${r.s} ${r.b.error || ""}`);
  } else {
    r = await call(S, "PUT", "/api/students?action=tryouts", { id: "999999999", status: "עבר" });
    ok("מזהה שאינו קיים מחזיר 404", r.s === 404, String(r.s));
  }

  /* ============ 3 · הצוות קורא הכול ============ */
  console.log("\n=== הצוות קורא ===");
  r = await call(M, "GET", "/api/students?action=tryouts");
  ok("הצוות רואה את הכול", r.s === 200 && r.b.canSeeAll === true, String(r.b.canSeeAll));
  ok("ויש סיכום", r.b.summary && typeof r.b.summary.total === "number",
    JSON.stringify(r.b.summary && r.b.summary.byStatus));
  /* ⚠ "טרם ניגש" הוא מצב שלישי ואינו "לא עבר". */
  ok("והמספר שאומר כמה טרם ניגשו", typeof r.b.summary.none === "number",
    String(r.b.summary.none));
  ok("ופירוט לכל חניך", Array.isArray(r.b.perStudent) && r.b.perStudent.length > 0,
    String((r.b.perStudent || []).length));

  /* ============ 4 · יו״ר ועדת הגיוסים ============ */
  console.log("\n=== יו״ר ועדת הגיוסים ===");
  /* ⚠ חניך שהוא יו״ר ועדה **שאינה** מסומנת — עדיין רואה רק את שלו. */
  await setCols(PLACEMENT_BOARDS.definitions, cmt.id, {
    [DC.army]: { checked: "false" },
    [DC.chair]: String(demo.id), [DC.chairName]: demo.name,
  });
  invalidate("placement-defs");
  for (let i = 0; i < 45; i++) {
    r = await call(S, "GET", "/api/students?action=tryouts");
    if (r.b.canSeeAll === false) break;
    await new Promise((z) => setTimeout(z, 1000));
  }
  ok("יו״ר ועדה רגילה אינו רואה את כולם", r.b.canSeeAll === false, String(r.b.canSeeAll));

  await setCols(PLACEMENT_BOARDS.definitions, cmt.id, { [DC.army]: { checked: "true" } });
  invalidate("placement-defs");
  /* ⚠ **המתנה על תנאי ולא על זמן** — מטמון השרת יושב בתהליך אחר. */
  for (let i = 0; i < 45; i++) {
    r = await call(S, "GET", "/api/students?action=tryouts");
    if (r.b.canSeeAll === true) break;
    await new Promise((z) => setTimeout(z, 1000));
  }
  ok("ומרגע שהתיבה דולקת — רואה את כולם", r.b.canSeeAll === true, String(r.b.canSeeAll));
  ok("וההסבר אומר מכוח מה", /יו״ר/.test(r.b.seeAllWhy || ""), r.b.seeAllWhy);

  /* ⚠⚠ **וגם היו״ר אינו כותב.** קריאה נפתחה, בעלות לא. */
  r = await call(S, "PUT", "/api/students?action=tryouts", { id: "999999999", status: "עבר" });
  ok("אבל אינו עורך מיון של אחר", r.s === 404, String(r.s));

  /* ============ 5 · בלי כניסה ============ */
  console.log("\n=== בלי כניסה ===");
  const OUT = jar();
  r = await call(OUT, "GET", "/api/students?action=tryouts");
  ok("חסום", r.s === 401, String(r.s));

  console.log("\n=== ניקוי ===");
  await cleanup();
  const left = (await allItems(TRYOUT_BOARD.board)).filter((x) => x.name.includes("בדיקה"));
  ok("מיוני הבדיקה נמחקו", left.length === 0, left.map((x) => x.name).join(", "));
} finally {
  await cleanup();
  await setCols(PLACEMENT_BOARDS.definitions, cmt.id, {
    [DC.army]: { checked: before.army ? "true" : "false" },
    [DC.chair]: before.chair, [DC.chairName]: before.chairName,
  });
  invalidate("placement-defs");
  console.log("  (הוועדה שוחזרה)");
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
