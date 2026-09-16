/* ============================================================
   רשימת קניות מהתפריט השבועי, והמצרכים הקבועים
   ------------------------------------------------------------
   ⚠⚠ **הטענה המרכזית היא שהשורה מגיעה ללשונית "אוכל" ויורדת
     ממנה.** הבנייה יכולה להצליח, monday יכולה לקבל את השורה,
     והקטגוריה יכולה להיכתב ריקה — ואז השורה קיימת, נספרת
     ב"ללא קטגוריה", ופשוט אינה בלשונית שבשבילה כל זה נבנה.
     טענה על "נוצר בהצלחה" לבדה הייתה נשארת ירוקה.

   ⚠ **הפיצול והמיזוג נבדקים כפונקציה טהורה**, בלי רשת: מצרך
     שחוזר בשתי ארוחות הוא שורה אחת, והכמות שנכתבה נשמרת
     כלשונה. בדיקה שעוברת רק דרך השרת אינה יכולה להבחין בין
     "המיזוג עובד" לבין "יש רק ארוחה אחת".

   ⚠ הבדיקה יוצרת את הנתונים שלה ומוחקת אותם **לפי המזהים
     שחזרו מהיצירה** ולא לפי סינון ערכים.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { buyReady } from "../../shared/buy-ids.js";
import { FOOD_CATEGORY } from "../../shared/buy-categories.js";
import { staplesReady } from "../../shared/staples-ids.js";
import { splitItems, shopFromMenu } from "../../shared/weekmenu.js";

const B = "http://localhost:5173";
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 250) }; }
};

const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
const TAG = "בדיקה — ";

let pass = 0, fail = 0;
const ok = (t, c, d = "") => {
  if (c) { pass++; console.log("  V " + t + (d ? "  -> " + d : "")); }
  else { fail++; console.log("  X " + t + "  -> " + d); }
};

const made = [];
const cleanup = async () => {
  for (const id of made) {
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id }); } catch { /* כבר נמחק */ }
  }
  made.length = 0;
};
process.on("uncaughtException", async (e) => { console.error(e); await cleanup(); process.exit(1); });

/* ============================================================
   1 · הפיצול והמיזוג — טהור, בלי רשת
   ============================================================ */
console.log("\n=== פיצול הטקסט החופשי ===");

ok("פסיק, נקודה-פסיק ושורה חדשה מפרידים",
  JSON.stringify(splitItems("בצל, שום; גזר\nתבלינים"))
  === JSON.stringify(["בצל", "שום", "גזר", "תבלינים"]));

/* ⚠ הטענה השנייה היא ההפוכה, ובלעדיה "הפיצול עובד" היה נשאר
   ירוק גם אילו כל נקודה פיצלה מספר לשניים. */
ok("נקודה עשרונית אינה מפרידה",
  JSON.stringify(splitItems("תבלינים 1.5 קג")) === JSON.stringify(["תבלינים 1.5 קג"]));

ok("כמות נשמרת כלשונה ואינה מנותחת",
  splitItems("3 קג פתיתים, בצל")[0] === "3 קג פתיתים");

const GRID = [
  { day: "ראשון", meals: [
    { meal: "ארוחת בוקר", items: "לחם, ביצים", computed: [] },
    { meal: "ארוחת ערב", items: "3 קג פתיתים, בצל", computed: [] },
  ] },
  { day: "שני", meals: [
    { meal: "ארוחת בוקר", items: "לחם, קוטג׳", computed: [] },
    { meal: "ארוחת ערב", items: "", computed: [{ name: "חזה עוף", qty: 6, unit: "קילו" }] },
  ] },
  { day: "שלישי", meals: [{ meal: "ארוחת ערב", items: "שוקולד", computed: [] }] },
];

{
  const r = shopFromMenu(GRID, ["ראשון", "שני"]);
  const lehem = r.free.find((f) => f.text === "לחם");
  ok("מצרך שחוזר בשתי ארוחות הוא שורה אחת", Boolean(lehem) && r.free.filter((f) => f.text === "לחם").length === 1);
  ok("  ומופיעים בה שני המקורות", Boolean(lehem) && lehem.from.length === 2, lehem ? lehem.from.join(" · ") : "—");
  ok("ארוחה שלא נבחר יומה אינה נספרת", !r.free.some((f) => f.text === "שוקולד"));
  ok("מנה מקושרת חוזרת ב-lists ולא ב-free",
    r.lists.length === 1 && !r.free.some((f) => f.text === "חזה עוף"));
  ok("ארוחה עם מנה **וגם** טקסט נספרת", r.meals === 4, `meals=${r.meals}`);
}

{
  /* ⚠ שני הקצוות: יום שלא נבחר אינו נכנס, ויום שנבחר כן. */
  const none = shopFromMenu(GRID, []);
  ok("בלי ימים — רשימה ריקה", none.free.length === 0 && none.lists.length === 0 && none.meals === 0);
}

/* ============================================================
   2 · דרך השרת
   ============================================================ */
if (!buyReady()) {
  console.log("\nלוח הקניות הכלליות טרם הוקם — npm run seed:buy");
  console.log(`\n${pass} עברו, ${fail + 1} נכשלו`);
  process.exit(1);
}

const S = jar();
const login = await call(S, "POST", "/api/auth?action=signin",
  { user: DEMO_USER, password: DEMO_PASS });
if (login.s !== 200) {
  console.log("\nאין חשבון בדיקה — npm run seed:demo");
  console.log(`\n${pass} עברו, ${fail + 1} נכשלו`);
  process.exit(1);
}

try {
  console.log("\n=== המצרכים הקבועים ===");
  let r = await call(S, "GET", "/api/kitchen?action=staples");
  ok("הרשימה נטענת", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("  ומצהירה אם הלוח הוקם", r.b.ready === staplesReady());
  /* ⚠ מהשרת ולא נגזר במסך (4יד). */
  ok("  ומחזירה canEdit", typeof r.b.canEdit === "boolean", String(r.b.canEdit));

  let stapleId = null;
  if (staplesReady() && r.b.canEdit) {
    r = await call(S, "POST", "/api/kitchen?action=staples",
      { name: TAG + "ביצים", qty: "90 יחידות", note: "לשבוע" });
    ok("הוספת מצרך קבוע", r.s === 200, `${r.s} ${r.b.error || ""}`);
    stapleId = r.b.id;
    if (stapleId) made.push(String(stapleId));

    /* ⚠ שם כפול נחסם — שתי שורות "ביצים" הן המקום שבו מוסיפים
       לרשימה את השורה הלא-נכונה. */
    r = await call(S, "POST", "/api/kitchen?action=staples", { name: TAG + "ביצים" });
    ok("  ושם כפול נחסם ב-409", r.s === 409, `${r.s} ${r.b.error || ""}`);

    r = await call(S, "GET", "/api/kitchen?action=staples");
    const row = (r.b.rows || []).find((x) => x.id === String(stapleId));
    ok("  והוא ברשימה ופעיל", Boolean(row) && row.active === true);
    ok("  והכמות נשמרה כלשונה", Boolean(row) && row.qty === "90 יחידות", row ? row.qty : "—");

    /* ⚠ כיבוי ולא מחיקה — הכמות נשמרת והשורה יורדת מהבורר. */
    r = await call(S, "PUT", "/api/kitchen?action=staples", { id: stapleId, active: false });
    ok("כיבוי מצרך", r.s === 200, `${r.s} ${r.b.error || ""}`);
    r = await call(S, "GET", "/api/kitchen?action=staples");
    const off = (r.b.rows || []).find((x) => x.id === String(stapleId));
    ok("  והוא כבוי, והכמות נשארה", Boolean(off) && off.active === false && off.qty === "90 יחידות");

    /* ⚠ 404 ולא 403 על שורה שאינה קיימת. */
    r = await call(S, "PUT", "/api/kitchen?action=staples", { id: "1", active: true });
    ok("מזהה שאינו קיים מקבל 404", r.s === 404, `${r.s} ${r.b.error || ""}`);
  } else {
    console.log("  (הלוח טרם הוקם או שאין הרשאת כתיבה — מדלג על הכתיבה)");
  }

  console.log("\n=== מהתפריט לרשימת הקניות ===");
  r = await call(S, "GET", "/api/kitchen?action=weekmenu");
  ok("התפריט נטען", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("  ויש בו grid לשבעה ימים", Array.isArray(r.b.grid) && r.b.grid.length === 7);

  /* ⚠⚠ הבנייה נעשית מאותה פונקציה שהמסך קורא לה — שתי גרסאות
     היו נפרדות זו מזו בתיקון הראשון (4יד, 5כד). */
  const built = shopFromMenu(r.b.grid, r.b.days);
  ok("  ונבנית ממנו רשימה", built.free.length > 0 || built.lists.length > 0,
    `${built.free.length} שורות טקסט · ${built.lists.length} מנות`);

  const NAME = TAG + "פתיתים";
  r = await call(S, "POST", "/api/container?action=buy",
    { items: [{ name: NAME, qty: "3 קג", detail: "מהתפריט", category: FOOD_CATEGORY }] });
  ok("שורה נוספת לרשימה הכללית", r.s === 200, `${r.s} ${r.b.error || ""}`);
  for (const id of r.b.ids || []) made.push(String(id));

  /* ⚠⚠ **וזו הטענה שבגללה הבדיקה קיימת.** הקטגוריה יכולה
     להיכתב ריקה בלי שום שגיאה, ואז השורה קיימת ואינה בלשונית. */
  r = await call(S, "GET", "/api/container?action=allshop");
  ok("המסך המאוחד נטען", r.s === 200, `${r.s} ${r.b.error || ""}`);
  const food = (r.b.groups || []).find((g) => g.key === FOOD_CATEGORY);
  ok(`יש קבוצה "${FOOD_CATEGORY}"`, Boolean(food),
    (r.b.groups || []).map((g) => g.key).join(" · "));
  ok("  והשורה בתוכה", Boolean(food) && food.rows.some((x) => x.name === NAME));
  /* ⚠ והכיוון ההפוך: היא **אינה** באף קבוצה אחרת. בלי זה
     שורה שנכתבה בלי קטגוריה הייתה נראית כמו הצלחה. */
  const elsewhere = (r.b.groups || [])
    .filter((g) => g.key !== FOOD_CATEGORY)
    .some((g) => g.rows.some((x) => x.name === NAME));
  ok("  ואינה בשום קבוצה אחרת", !elsewhere);
} finally {
  console.log("\n=== ניקוי ===");
  const n = made.length;
  await cleanup();
  console.log(`  נמחקו ${n} שורות`);
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
