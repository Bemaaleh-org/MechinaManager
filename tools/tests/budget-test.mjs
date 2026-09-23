/* ============================================================
   תקציב — קנייה שמתחלקת על חודשים שנבחרו
   ------------------------------------------------------------
   ⚠ החלק הראשון הוא חישוב טהור ואינו נוגע בלוח בכלל.
   ⚠ החלק השני יוצר קנייה משלו ומוחק אותה **לפי המזהה שחזר
     מהיצירה**, ואינו נוגע באף קנייה אמיתית.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import {
  BUDGET_BOARDS as B, BUDGET_COLS as C,
} from "../../shared/budget-ids.js";
import {
  orderMonths, orderShareFor, monthsOf, consecutiveMonths, ORDER_KIND,
  orderByReady,
} from "../../shared/budget-boards.js";

const SRV = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(SRV + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 250) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ============ 1 · החישוב ============ */
console.log("=== חלוקה לחודשים ===");

const q = (o) => ({ kind: ORDER_KIND.quarterly, amount: 900, ...o });

ok("רשימה מפורשת נקראת כמות שהיא",
  orderMonths(q({ months: "2026-09,2026-11" })).join(",") === "2026-09,2026-11");

/* ⚠ הכלל המרכזי: מחלקים במספר שנבחר בפועל ולא ב-3 קבוע. */
ok("שני חודשים = חצי בכל אחד",
  orderShareFor(q({ months: "2026-09,2026-11" }), "2026-09") === 450);
ok("וחודש שלא נבחר מקבל אפס",
  orderShareFor(q({ months: "2026-09,2026-11" }), "2026-10") === 0);
ok("ארבעה חודשים = רבע בכל אחד",
  orderShareFor(q({ months: "2026-09,2026-10,2026-11,2026-12" }), "2026-12") === 225);
ok("וחודש אחד = הכול בו",
  orderShareFor(q({ months: "2026-09" }), "2026-09") === 900);

/* ⚠ שורה ישנה בלי רשימה ממשיכה לעבוד בדיוק כמו קודם. */
ok("שורה ישנה נופלת לשלושה רצופים",
  orderMonths(q({ startMonth: "2026-09" })).join(",") === "2026-09,2026-10,2026-11");
ok("והחלוקה שם נשארת שליש",
  orderShareFor(q({ startMonth: "2026-09" }), "2026-10") === 300);
ok("רשימה גוברת על חודש הפתיחה",
  orderMonths(q({ startMonth: "2026-01", months: "2026-09" })).join(",") === "2026-09");

/* ⚠ ערך פסול מסונן ואינו מפיל את הטבלה. */
ok("חודש בפורמט שגוי מסונן",
  orderMonths(q({ startMonth: "2026-09", months: "2026-9,ספטמבר,2026-13,2026-10" }))
    .join(",") === "2026-10");
ok("ורשימה שכולה פסולה נופלת לאחור",
  orderMonths(q({ startMonth: "2026-09", months: "בלה,בלה" })).join(",")
    === "2026-09,2026-10,2026-11");
ok("כפילות אינה מכפילה את המכנה",
  orderShareFor(q({ months: "2026-09,2026-09" }), "2026-09") === 900);

/* ⚠ שבועית לא הושפעה בכלל. */
const w = { kind: ORDER_KIND.weekly, amount: 500, date: "2026-09-15" };
ok("שבועית נזקפת כולה לחודש שלה", orderShareFor(w, "2026-09") === 500);
ok("ולא לחודש אחר", orderShareFor(w, "2026-10") === 0);
ok("ו-monthsOf שלה הוא חודש התאריך", monthsOf(w).join(",") === "2026-09");

ok("consecutiveMonths עם ספירה אחרת",
  consecutiveMonths("2026-11", 3).join(",") === "2026-11,2026-12,2027-01");
ok("וחודש ריק מחזיר רשימה ריקה", consecutiveMonths("").length === 0);

/* ============ 2 · מול השרת ============ */
console.log("\n=== יצירת קנייה ===");

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

/* ⚠ גם נעם — הכיוון השני של העברת החד״א נבדק דרכו. */
const reg = await tempRegister("דני לויט", "נעם");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

const NAME = "בדיקה — קנייה זמנית";
let madeId = null;
const cleanup = async () => {
  /* ⚠ לפי מזהה, ולא לפי סינון על שם. */
  if (!madeId) return;
  try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: madeId }); } catch { /* כבר נמחק */ }
};

try {
  r = await call(M, "POST", "/api/kitchen?action=budget",
    { name: NAME, amount: 900, kind: ORDER_KIND.quarterly, months: [] });
  ok("קנייה בלי חודשים נדחית",
    r.s === 400 && /לפחות חודש אחד/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);

  r = await call(M, "POST", "/api/kitchen?action=budget",
    { name: NAME, amount: 900, kind: ORDER_KIND.quarterly, months: ["2026-9", "בלה"] });
  ok("וחודשים פסולים בלבד נדחים גם הם", r.s === 400, `${r.s} ${r.b.error || ""}`);

  r = await call(M, "POST", "/api/kitchen?action=budget",
    { name: NAME, amount: 900, kind: ORDER_KIND.quarterly,
      months: ["2026-11", "2026-09"], note: "בדיקה אוטומטית" });
  ok("קנייה על שני חודשים נשמרת", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("והתשובה מחזירה את שניהם ממוינים",
    (r.b.months || []).join(",") === "2026-09,2026-11", (r.b.months || []).join(","));

  const rows = await allItems(B.orders);
  const row = rows.find((x) => String(x.name || "").trim() === NAME);
  ok("השורה בלוח", Boolean(row));
  if (row) {
    madeId = String(row.id);
    ok("ובעמודת החודשים מה שנבחר",
      cv(row, C.orders.months) === "2026-09,2026-11", cv(row, C.orders.months));
    /* ⚠ חודש הפתיחה נשמר, כי שורות ישנות נשענות עליו והוא מה
       שמסדר את הרשימה. */
    ok("וחודש הפתיחה הוא המוקדם שנבחר",
      cv(row, C.orders.startMonth) === "2026-09", cv(row, C.orders.startMonth));
    /* ============================================================
       ⚠⚠ **מי רשם את הקנייה** (בקשת ראש המכינה, 22.9.2026).

       ⚠ **נפרד מ-`by`, שהוא מי שהעלה את הקבלה.** שניהם
         עשויים להיות אנשים שונים, ולכן שתי עמודות ולא אחת —
         והמסך מציג את השני רק כשהוא באמת אחר.
       ⚠ **והשם נלקח מהסשן ולא מגוף הבקשה** (עיקרון 3). שורת
         הבדיקה לא שלחה שום שם, והיא נושאת אותו.
       ⚠ הטענה מדלגת כשהעמודה טרם הוקמה — `npm run seed:order-by` —
         כי אז השדה ריק בצדק ואין מה לנעול (עיקרון 6).
       ============================================================ */
    if (orderByReady()) {
      ok("ומי רשם את הקנייה נכתב מהסשן",
        (cv(row, C.orders.createdBy) || "").includes("דני"),
        cv(row, C.orders.createdBy));
    } else {
      ok("(עמודת \"נרשמה על ידי\" טרם הוקמה — npm run seed:order-by)", true);
    }
  }

  /* ============================================================
     ⚠⚠ **העברת יתרת החד״א לתקציב הקניות (15.9.2026).**

     ⚠ **הבדיקה אינה מעבירה כסף באמת.** ההעברה כותבת
       שורת הגדרה בלוח האמיתי ומשנה תקציב שהמכינה
       עובדת לפיו עכשיו — והרצה שתיפול באמצע תשאיר
       אותה שם (5א). מה שנבדק הוא **השער והחישוב**.

     ⚠⚠ **ושני הכיוונים באותה הרצה:** השדות יוצאים,
       ומי שאינו ראש מכינה נחסם. טענה אחת בלבד הייתה
       נשארת ירוקה גם אילו כל איש צוות יכול להעביר כסף
       בין סעיפי תקציב.
     ============================================================ */
  /* ============================================================
     תוספת "אחר" ליום — נשמרת, נראית, ומופרדת בפירוט
     ------------------------------------------------------------
     ⚠⚠⚠ הדיווח (ראש המכינה, 22.9.2026): *"כשמוסיפים 'אחר' אין
       פירוט על כמה סכום התווסף והסיבה גם לא כתובה... שיהיה
       שמור אותו הערך ולא ימחק כמו עכשיו."*

     הסכום **נשמר בלוח כל הזמן** ונכנס לסך הכול — הוא פשוט
     מעולם לא חזר כשדה משלו, ולכן הטופס נפתח ריק וכל עריכה
     חוזרת מחקה אותו. שלוש טענות, אחת לכל חלק בבקשה:

       1. `flat` חוזר בשליפה → הטופס נפתח על מה שנשמר
       2. `byType` מפריד אותו מסוג היום, עם התאריכים
       3. הסכום הכולל **אינו משתנה** — זו חלוקה מחדש

     ⚠ **הבדיקה בוחרת יום שאיש לא נגע בו** (`overridden:false`)
       ומוחקת את החריגה בסוף — זה הכלל של 5א, והתקציב הוא
       נתון שהמכינה עובדת לפיו.
     ============================================================ */
  console.log("\n=== תוספת \"אחר\" ליום ===");
  {
    const g0 = await call(M, "GET", "/api/kitchen?action=budget");
    /* ⚠ מהסוף אחורה: ימים רחוקים הם הפחות סבירים להיות ערוכים. */
    const free = [...(g0.b.days || [])].reverse()
      .find((d) => !d.overridden && d.total > 0);
    if (!free) console.log("  (אין יום פנוי בחודש הזה — מדולג)");
    else {
      const was = { total: g0.b.total, purchases: g0.b.purchases };
      const AMT = 137;
      const NOTE = "בדיקה אוטומטית — תוספת";
      let r2 = await call(M, "PUT", "/api/kitchen?action=budget",
        { date: free.date, flat: String(AMT), note: NOTE });
      ok("התוספת נשמרת", r2.s === 200, `${r2.s} ${r2.b.error || ""}`);

      let g1 = null;
      for (let i = 0; i < 30; i++) {
        g1 = await call(M, "GET", "/api/kitchen?action=budget");
        const d = (g1.b.days || []).find((x) => x.date === free.date);
        if (d && d.flat === AMT) break;
        await new Promise((z) => setTimeout(z, 1000));
      }
      const d1 = (g1.b.days || []).find((x) => x.date === free.date);
      /* ⚠⚠ **זו הטענה שהייתה חסרה.** בלעדיה הכול "עבד": הסכום
         נשמר, נכנס לסך הכול — ופשוט לא חזר. */
      ok("והיא חוזרת בשליפה", d1 && d1.flat === AMT, d1 ? String(d1.flat) : "—");
      ok("וגם הסיבה", d1 && d1.note === NOTE, d1 ? String(d1.note) : "—");
      ok("והיום מסומן כנקבע ידנית", d1 && d1.overridden === true);

      const oth = (g1.b.byType || []).find((t) => t.other);
      ok("ובפירוט יש שורת הוצאות אחרות", Boolean(oth),
        (g1.b.byType || []).map((t) => t.type).join(" · "));
      ok("והיא כוללת את התוספת",
        Boolean(oth) && oth.total >= AMT, oth ? String(oth.total) : "—");
      /* ⚠ **התאריכים, ולא רק הסכום** — זו השאלה "באיזה ימים
         היו חריגות" (4יח). */
      ok("ומפרטת את היום, הסכום והסיבה",
        Boolean(oth) && (oth.dates || []).some((x) =>
          x.date === free.date && x.amount === AMT && x.note === NOTE),
        JSON.stringify((oth || {}).dates || []));
      /* ⚠⚠ **והכיוון ההפוך: סוג היום אינו נושא אותה.** בלי זה
         הפירוט היה סופר את הסכום פעמיים. */
      const sameType = (g1.b.byType || []).find((t) => !t.other && t.type === free.type);
      const sumTypes = (g1.b.byType || []).reduce((a, t) => a + t.total, 0);
      ok("וסוגי היום אינם נושאים אותה",
        Boolean(sameType) && Math.round(sumTypes) === Math.round(g1.b.total),
        `${Math.round(sumTypes)} מול ${Math.round(g1.b.total)}`);
      /* ⚠ הסכום הכולל גדל בדיוק בתוספת — חלוקה מחדש ולא
         הוצאה שנעלמה. */
      ok("והסכום החודשי גדל בדיוק בתוספת",
        Math.round(g1.b.total - was.total) === AMT,
        `${Math.round(g1.b.total - was.total)}`);
      ok("וגם תקציב הקניות",
        Math.round(g1.b.purchases - was.purchases) === AMT,
        `${Math.round(g1.b.purchases - was.purchases)}`);

      /* ⚠ ניקוי: ריקון מלא מחזיר את היום לגזירה מהלו״ז. */
      r2 = await call(M, "PUT", "/api/kitchen?action=budget",
        { date: free.date, type: "", type2: "", cost: "", flat: "", note: "" });
      ok("והניקוי מחזיר את היום לקדמותו", r2.s === 200, `${r2.s} ${r2.b.error || ""}`);
      let back = null;
      for (let i = 0; i < 30; i++) {
        const g2 = await call(M, "GET", "/api/kitchen?action=budget");
        back = (g2.b.days || []).find((x) => x.date === free.date);
        if (back && !back.overridden) break;
        await new Promise((z) => setTimeout(z, 1000));
      }
      ok("והיום נקי", back && back.overridden === false && back.flat === null,
        back ? `overridden=${back.overridden} flat=${back.flat}` : "—");
    }
  }

  console.log("\n=== העברת יתרת החד״א ===");
  r = await call(M, "GET", "/api/kitchen?action=budget");
  const bd = r.b;
  ok("השדות יוצאים מהשרת",
    typeof bd.diningMoved === "number" && typeof bd.diningMovable === "number"
      && typeof bd.canMoveDining === "boolean",
    `moved=${bd.diningMoved} movable=${bd.diningMovable} may=${bd.canMoveDining}`);

  /* ============================================================
     ⚠⚠ **ההעברה אוטומטית (16.9.2026), ואין כפתור.**
     הדיווח שהתקבל היה "בתקציב הכללי לא מתווסף
     מה שנשאר מהחד״א" — כלומר הכפתור לא נלחץ.
     שלוש הטענות נועלות שלא יוחזר הכפתור בשקט.
     ============================================================ */
  ok("והכפתור ירד — canMoveDining הוא false",
    bd.canMoveDining === false, String(bd.canMoveDining));
  ok("ומה שעבר הוא מה שניתן להעברה",
    bd.diningMoved === bd.diningMovable, `${bd.diningMoved} / ${bd.diningMovable}`);
  /* ⚠ וההצהרה מגיעה מהשרת כשיש מה להצהיר —
     מספר שגדל בלי הסבר נראה כמו טעות (4לג). */
  ok("וכשהועבר כסף — יש הצהרה במילים",
    !bd.diningMoved || /לתקציב הקניות/.test(bd.diningMoveNote || ""),
    bd.diningMoveNote || "(לא עבר כלום)");
  /* ⚠ והמסלול הישן נסגר ב-410 ולא בשקט — לקוח ישן
     שישלח אותו חייב לדעת שלא קרה דבר (5ו). */
  r = await call(M, "PUT", "/api/kitchen?action=budget",
    { month: bd.month, diningMove: true });
  ok("והמסלול הידני מחזיר 410 עם הסבר",
    r.s === 410 && /מעצמה/.test(r.b.error || ""), `${r.s} ${r.b.error || ""}`);
  /* ⚠ **כשאי אפשר להעביר יש סיבה במילים**, ולא כפתור
     מושבת בלי הסבר (4כב). */
  ok("וכשאין מה להעביר — יש סיבה במילים",
    bd.diningMovable > 0 || Boolean(bd.diningMoveReason),
    bd.diningMoveReason || "(ניתן להעביר)");
  /* ⚠ תקציב הקניות כולל את מה שהועבר — אחרת ההעברה
     רשומה בלוח ואינה משנה אף מספר (עיקרון 6). */
  ok("ותקציב הקניות כולל את המועבר",
    bd.purchases === bd.purchasesBase + bd.diningMoved,
    `${bd.purchases} = ${bd.purchasesBase} + ${bd.diningMoved}`);
  /* ⚠⚠ **והכיוון השני: מי שאינו ראש מכינה נחסם.**
     זו העברה בין סעיפי תקציב, באותה רמה של קביעת
     התקציב עצמו. נבדק על חודש שאין בו ימי עשייה
     קהילתית, כלומר גם אילו השער היה נפתח לא היה מה
     להעביר — הבדיקה אינה נוגעת בכסף בשום מצב. */
  const G = jar();
  await call(G, "POST", "/api/auth?action=login", { code: codeOf("נעם") });
  r = await call(G, "PUT", "/api/kitchen?action=budget",
    { month: "2026-07", diningMove: true });
  ok("מדריך נחסם בהעברה",
    r.s === 403 && /ראש המכינה/.test(r.b.error || ""),
    `${r.s} ${r.b.error || ""}`);

  /* ============================================================
     ⚠⚠ **הקבלה, ומי העלה אותה (15.9.2026).**

     ⚠ **על קניית הבדיקה שנוצרה למעלה בלבד** — היא נמחקת
       ב-finally לפי המזהה שחזר מהיצירה, ולכן גם קובץ
       שיעלה אליה נעלם איתה. העלאה לשורה אמיתית הייתה
       משאירה קבלה מזויפת על קנייה של המכינה.

     ⚠⚠ **ושני הכיוונים באותה הרצה:** השם נכתב מהסשן,
       ו**שם ששולחים בגוף הבקשה מתעלמים ממנו**. בלי
       הטענה השנייה הבדיקה הייתה ירוקה גם אילו אפשר
       היה לחתום קבלה בשם של מישהו אחר.
     ============================================================ */
  console.log("\n=== קבלה על קנייה ===");
  const { receiptReady } = await import("../../shared/budget-boards.js");
  if (!receiptReady()) {
    ok("עמודות הקבלה טרם הוקמו — הריצו npm run seed:receipt", false, "setupRequired");
  } else if (!madeId) {
    ok("אין קניית בדיקה — אי אפשר לבדוק קבלה", false, "היצירה נכשלה למעלה");
  } else {
    /* GIF שקוף בן פיקסל אחד — הקובץ הקטן ביותר שהוא באמת קובץ. */
    const GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    r = await call(M, "PUT", "/api/kitchen?action=budget",
      { receiptFor: madeId, fileData: GIF, fileName: "קבלה-בדיקה.gif", fileMime: "image/gif" });
    ok("הקבלה עולה", r.s === 200, `${r.s} ${r.b.error || ""}`);
    ok("והשם חוזר מהשרת", Boolean(r.b.by), r.b.by || "—");

    /* ⚠ **ההמתנה היא על תנאי ולא על זמן** — מטמון השרת
       יושב בתהליך אחר, ו-`invalidate` שבבדיקה אינו נוגע בו. */
    let row = null;
    for (let i = 0; i < 20 && !row; i++) {
      const g = await call(M, "GET", "/api/kitchen?action=budget");
      row = (g.b.orders || []).find((x) => x.id === madeId && x.receipt);
      if (!row) await new Promise((s) => setTimeout(s, 500));
    }
    ok("והיא חוזרת בשליפה", Boolean(row), row ? row.receipt.name : "לא חזרה");
    ok("עם שם מי שהעלה", Boolean(row && row.by), row ? row.by || "—" : "—");
    /* ⚠ עמודת קובץ מחזירה כתובת רק דרך `assets` — בלי זה
       המסך מציג שם בלי קישור, וזה נראה כמו קבלה שאבדה. */
    ok("ועם כתובת להצגה", Boolean(row && row.receipt && row.receipt.url),
      row && row.receipt ? String(row.receipt.url).slice(0, 40) : "—");

    /* ⚠⚠ הכיוון השני: שם שנשלח מהמסך אינו נכתב. */
    r = await call(M, "PUT", "/api/kitchen?action=budget",
      { receiptFor: madeId, fileData: GIF, fileName: "שוב.gif", fileMime: "image/gif",
        by: "מישהו אחר לגמרי" });
    ok("ושם שנשלח מהמסך אינו נכתב",
      r.s === 200 && r.b.by !== "מישהו אחר לגמרי", r.b.by || "—");

    /* ⚠ והסרה מנקה **גם את השם** — "העלה: דני" בלי קבלה
       הוא טענה שגויה על אדם. */
    r = await call(M, "PUT", "/api/kitchen?action=budget", { receiptFor: madeId, fileData: null });
    ok("הסרה מחזירה 200", r.s === 200, `${r.s} ${r.b.error || ""}`);
    let gone = false;
    for (let i = 0; i < 20 && !gone; i++) {
      const g = await call(M, "GET", "/api/kitchen?action=budget");
      const x = (g.b.orders || []).find((y) => y.id === madeId);
      gone = Boolean(x) && !x.receipt && !x.by;
      if (!gone) await new Promise((s) => setTimeout(s, 500));
    }
    ok("והקבלה והשם ירדו יחד", gone);

    /* ⚠ 404 על קנייה שאינה קיימת, ולא 500 גנרי. */
    r = await call(M, "PUT", "/api/kitchen?action=budget",
      { receiptFor: "999999999", fileData: GIF });
    ok("קנייה לא קיימת מקבלת 404", r.s === 404, `${r.s} ${r.b.error || ""}`);
  }

  console.log("\n=== ניקוי ===");
  await cleanup();
  const left = (await allItems(B.orders)).filter((x) => String(x.name || "").includes("בדיקה"));
  ok("קניית הבדיקה נמחקה", left.length === 0, left.map((x) => x.name).join(", "));
  madeId = null;
} finally {
  await cleanup();
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
