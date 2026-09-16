/* ============================================================
   קניות המכינה — הרשימה הכללית, והמסך שמאחד את שלושתן
   ------------------------------------------------------------
   ⚠⚠ **שתי הרשאות על אותו לוח, וזה מה שנבדק כאן.** ניהול
     הרשימה הוא של ראש המכינה; סימון "נקנה" הוא של כל הצוות.
     שתי הטענות יחד — אחת לבדה הייתה נשארת ירוקה גם אילו הגבול
     נפל לכל כיוון.

   ⚠⚠ **והטענה על המסך המאוחד היא שהשורה מגיעה אליו ויורדת
     ממנו.** מסך שקורא שלוש רשימות נשבר בשקט: שורה שלא תגיע
     אליו נראית בדיוק כמו רשימה שאין בה מה לקנות, וזו בדיוק
     התקלה שהוא נבנה כדי למנוע.

   ⚠ הבדיקה יוצרת את הנתונים שלה ומוחקת אותם **לפי המזהים
     שחזרו מהיצירה** ולא לפי סינון ערכים.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS, STAFF_ROLE, KIND } from "../../shared/auth-board.js";
import { BUY_BOARDS, buyReady, BUY_STATUS } from "../../shared/buy-ids.js";
import { tempRegister } from "./_auth.mjs";

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

if (!buyReady()) {
  console.log("לוח הקניות הכלליות טרם הוקם — npm run seed:buy");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}

const made = [];
const cleanup = async () => {
  for (const id of made) {
    try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){id} }`, { i: id }); } catch { /* כבר נמחק */ }
  }
  made.length = 0;
};
process.on("uncaughtException", async (e) => { console.error(e); await cleanup(); process.exit(1); });

/* ---------- מי בלוח ההרשאות: ראש מכינה, ואיש צוות שאינו ---------- */
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const users = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name
       column_values(ids:["${AUTH_COLS.code}","${AUTH_COLS.role}","${AUTH_COLS.kind}","${AUTH_COLS.active}","${AUTH_COLS.viewOnly}"]){ id text } } } } }`))
  .boards[0].items_page.items;

/* ⚠ **`KIND.manager` ולא "לא חניך".** בלוח יש גם שורת "קוד
   כניסה לתורנים" שהיא קוד משותף ולא אדם — `tempRegister`
   מחפש `kind === "staff"` ואינו מוצא אותה, והבדיקה נופלת על
   משהו שאינו הנושא שלה.
   ⚠ ו"צפייה בלבד" מסונן: הוא מקבל 403 על כל POST ממילא,
     כלומר היה מאשר את הטענה מהסיבה הלא-נכונה. */
const staff = users.filter((u) =>
  cv(u, AUTH_COLS.kind) === KIND.manager && cv(u, AUTH_COLS.code)
  && cv(u, AUTH_COLS.viewOnly) !== "v" && cv(u, AUTH_COLS.viewOnly) !== "✓");
const head = staff.find((u) => cv(u, AUTH_COLS.role) === STAFF_ROLE.head);
/* ⚠ **נבחר לפי התכונה שנבדקת ולא לפי מיקום** — שיבוץ שישתנה
   לא יפיל את הבדיקה על התנהגות נכונה. */
const plain = staff.find((u) => cv(u, AUTH_COLS.role) !== STAFF_ROLE.head);

if (!head) {
  console.log("אין ראש מכינה בלוח ההרשאות — אי אפשר לבדוק את הגבול");
  console.log("\n0 עברו, 1 נכשלו");
  process.exit(1);
}

const reg = await tempRegister(head.name, ...(plain ? [plain.name] : []));
const H = jar();
let r;

try {
  r = await call(H, "POST", "/api/auth?action=login", { code: cv(head, AUTH_COLS.code) });
  if (r.s !== 200) { console.log("כניסת ראש המכינה נכשלה", r.b); await reg.restore(); process.exit(1); }
  /* ⚠ `?action=login` אינו מחזיר `isHead` — הוא יוצא ב-
     `?action=me`. אימות מול השדה הלא-נכון היה נכשל על
     התנהגות נכונה. */
  r = await call(H, "GET", "/api/auth?action=me");
  ok("ראש המכינה נכנס", r.s === 200 && r.b.isHead === true, `${r.s} isHead=${r.b.isHead}`);

  /* ============ 1 · הרשימה נקראת, וראש המכינה מנהל ============ */
  console.log("\n=== הרשימה הכללית ===");
  r = await call(H, "GET", "/api/container?action=buy");
  ok("הרשימה נטענת", r.s === 200 && r.b.ready === true, `${r.s}`);
  ok("ושני הדגלים מגיעים מהשרת",
    r.b.canManage === true && r.b.canMark === true,
    `canManage=${r.b.canManage} canMark=${r.b.canMark}`);

  const NAME = TAG + "כיסאות " + Date.now();
  r = await call(H, "POST", "/api/container?action=buy",
    { items: [{ name: NAME, qty: "30 יחידות", detail: "לטקס" }] });
  ok("ראש המכינה מוסיף פריט", r.s === 200 && r.b.created === 1, `${r.s} ${r.b.error || ""}`);
  /* ⚠ המזהים מהיצירה — זה מה שהניקוי מוחק. */
  if (r.b.ids) made.push(...r.b.ids);
  const id = (r.b.ids || [])[0];
  ok("והמזהה חזר כדי שאפשר יהיה לנקות", Boolean(id), String(id));

  r = await call(H, "GET", "/api/container?action=buy");
  const row = (r.b.rows || []).find((x) => x.id === id);
  ok("והשורה ברשימה עם מה שנשלח",
    row && row.qty === "30 יחידות" && row.detail === "לטקס" && row.status === BUY_STATUS.open,
    JSON.stringify(row && { qty: row.qty, detail: row.detail, status: row.status }));

  /* ============ 2 · המסך המאוחד ============ */
  console.log("\n=== כל הקניות במסך אחד ===");
  r = await call(H, "GET", "/api/container?action=allshop");
  ok("המסך המאוחד נטען", r.s === 200 && Array.isArray(r.b.groups), `${r.s}`);
  /* ⚠⚠ **המסך מקבץ לפי קטגוריה של הפריט ולא לפי מקור**
     (15.9.2026). הטענה נשארה מה שהייתה — שהשורה מגיעה למסך
     ונושאת את המקור שלה — אבל היא מחפשת אותה **בכל הקבוצות**,
     כי `g.key` הוא עכשיו שם קטגוריה. */
  const allRows = (r.b.groups || []).flatMap((g) => g.rows);
  const hit = allRows.find((x) => x.id === id);
  /* ⚠⚠ **הטענה המרכזית של המסך המאוחד.** שורה שלא תגיע אליו
     נראית בדיוק כמו רשימה ריקה — ואז מי שיוצא לקניות מפספס
     אותה, וזה ההפך המדויק ממה שהמסך נועד לעשות. */
  ok("והשורה החדשה מופיעה בו", Boolean(hit), hit ? hit.name : "לא נמצאה");
  ok("ונושאת את המקור שלה ואת ההרשאה לסמן",
    hit && hit.source === "buy" && hit.canMark === true,
    hit ? `${hit.source} canMark=${hit.canMark}` : "—");

  /* ============================================================
     ⚠ **עריכה ומי הוסיף (15.9.2026).**
     הבקשה: *"אפשרות לערוך פריטים וכמויות אחרי
     שהוכנסו, להראות מי הוסיף, ואופציה למחוק."*

     ⚠ `canEdit` נגזר בשרת ואינו נקבע במסך (4יד) — כפתור
       שמופיע ומקבל 403 אחרי שהמשתמש כבר הקליד הוא
       בדיוק מה שהכלל נועד למנוע.
     ============================================================ */
  ok("  ו-canEdit מגיע מהשרת", hit && hit.canEdit === true,
    hit ? String(hit.canEdit) : "—");
  /* ⚠ "מי הוסיף" כבר נשמר בלוח — מה שנבדק הוא שהוא
     מגיע עד למסך המאוחד, ולא נשמט במיפוי. */
  ok("  ושם מי שהוסיף יוצא עם השורה", Boolean(hit && hit.by),
    hit ? `"${hit.by}"` : "—");

  /* ⚠ והעריכה עצמה עובדת, ולא רק הדגל.

     ⚠⚠ **במשתנים משלה ולא ב-`r` המשותף.** הטענות שמתחת
       ממשיכות לקרוא את תשובת ה-`allshop` שב-`r`, ודריסה שלו
       כאן הפילה ארבע טענות **שלא קשורות לשינוי הזה
       בכלל** — והן נראו כמו רגרסיה בקיבוץ לפי קטגוריה. */
  let e1 = await call(H, "PUT", "/api/container?action=buy",
    { id, name: "בדיקה — שם מתוקן", qty: "7" });
  ok("  ועריכת שם וכמות נשמרת", e1.s === 200, `${e1.s} ${e1.b.error || ""}`);
  const e2 = await call(H, "GET", "/api/container?action=allshop");
  const after = (e2.b.groups || []).flatMap((g) => g.rows).find((x) => x.id === id);
  ok("  והשינוי חוזר במסך המאוחד",
    Boolean(after) && after.name === "בדיקה — שם מתוקן" && after.qty === "7",
    after ? `"${after.name}" · ${after.qty}` : "לא נמצאה");
  /* ⚠ ושם ריק נדחה ברעש ולא בשקט (4ט). */
  e1 = await call(H, "PUT", "/api/container?action=buy", { id, name: "   " });
  ok("  ושם ריק נדחה", e1.s === 400, `${e1.s} ${e1.b.error || ""}`);
  /* ⚠ **המטבח יצא מהמסך (12.9.2026)** — הטענה נועלת את
     ההיעדר, אחרת מקור שיחזור בטעות יעבור בשקט. */
  /* ⚠ הבדיקה היא על **המקור של השורות** ולא על מפתח הקבוצה,
     שהוא עכשיו שם קטגוריה. */
  ok("והמטבח אינו במסך",
    !allRows.some((x) => x.source === "kitchen")
      && !(r.b.missing || []).some((g) => g.key === "kitchen"),
    JSON.stringify([...new Set(allRows.map((x) => x.source))]));
  /* ⚠⚠ **והוועדות יצאו** (15.9.2026) — להן מסך ומועד משלהן.
     בלי הטענה הזו מקור שיחזור בטעות יעבור בשקט, בדיוק כמו
     שקרה עם המטבח. */
  ok("והוועדות אינן במסך",
    !allRows.some((x) => x.source === "team"),
    JSON.stringify([...new Set(allRows.map((x) => x.source))]));
  /* ⚠ הקיבוץ עצמו: מפתח הקבוצה הוא שם הקטגוריה, והוא זהה
     לכותרת. מפתח שיחזור להיות שם מקור ייפול כאן. */
  ok("הקיבוץ הוא לפי קטגוריה",
    (r.b.groups || []).every((g) => g.key === g.title)
      && Array.isArray(r.b.categories) && r.b.categories.length > 0,
    JSON.stringify((r.b.groups || []).map((g) => g.key)));
  ok("ולראש המכינה הלשונית הכללית פתוחה", r.b.canGeneral === true, String(r.b.canGeneral));

  /* ============ 2ב · הקטגוריה — סיווג, ניקוי, וערך לא מוכר ============ */
  console.log("\n=== קטגוריה ===");
  const CAT = (r.b.categories || [])[0];
  r = await call(H, "PUT", "/api/container?action=buy", { id, category: CAT });
  ok("סיווג נשמר", r.s === 200 && (r.b.changed || []).includes("קטגוריה"),
    `${r.s} ${JSON.stringify(r.b.changed)}`);
  r = await call(H, "GET", "/api/container?action=allshop");
  let mine = (r.b.groups || []).flatMap((g) => g.rows.map((x) => ({ ...x, g: g.title })))
    .find((x) => x.id === id);
  ok("והשורה עברה לקבוצה של הקטגוריה", mine && mine.g === CAT, mine ? mine.g : "לא נמצאה");

  /* ⚠⚠ **ניקוי חייב להחזיר ל"ללא קטגוריה" ולא לקבוע תווית.**
     מחרוזת ריקה בעמודת סטטוס כותבת `index 5` — המשבצת הריקה
     של monday — וזה **קובע** את התווית שיושבת שם במקום לנקות
     (5ז). בלי הטענה הזו הבאג עובר בשקט. */
  r = await call(H, "PUT", "/api/container?action=buy", { id, category: "" });
  ok("ניקוי הסיווג נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(H, "GET", "/api/container?action=allshop");
  mine = (r.b.groups || []).flatMap((g) => g.rows.map((x) => ({ ...x, g: g.title })))
    .find((x) => x.id === id);
  ok("והיא באמת חזרה ל\"ללא קטגוריה\"",
    mine && mine.g === "ללא קטגוריה" && !mine.category,
    mine ? `${mine.g} category=${JSON.stringify(mine.category)}` : "לא נמצאה");

  /* ⚠ ערך לא מוכר נדחה ברעש ואינו נכתב: `create_labels_if_missing`
     הוא false, ותווית שאינה קיימת מפילה את **כל** השורה (4לב). */
  r = await call(H, "PUT", "/api/container?action=buy", { id, category: "קטגוריה שלא קיימת" });
  ok("קטגוריה לא מוכרת נדחית ב-400", r.s === 400, `${r.s} ${r.b.error || ""}`);

  /* ============ 3 · סימון "נקנה" מוריד מהמסך המאוחד ============ */
  r = await call(H, "PUT", "/api/container?action=buy", { id, status: BUY_STATUS.bought });
  ok("סימון כנקנה נשמר", r.s === 200 && (r.b.changed || []).includes("סטטוס"),
    `${r.s} ${JSON.stringify(r.b.changed)}`);

  r = await call(H, "GET", "/api/container?action=allshop");
  const g2 = (r.b.groups || []).find((g) => g.key === "buy");
  /* ⚠ הכיוון השני של אותה טענה: מה שנקנה **יורד** מהמסך.
     בלעדיו "השורה מופיעה" היה נשאר ירוק גם אילו המסך הציג
     את ההיסטוריה כמשימה. */
  ok("ומה שנקנה יורד מהמסך המאוחד",
    !g2 || !g2.rows.some((x) => x.id === id), "—");

  r = await call(H, "GET", "/api/container?action=buy");
  ok("ונשאר בהיסטוריה של הרשימה ואינו נמחק",
    (r.b.rows || []).some((x) => x.id === id && x.status === BUY_STATUS.bought), "—");

  /* ============ 4 · חניך ============ */
  console.log("\n=== הגבולות ===");
  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ============================================================
     ⚠⚠ **הטענה נגזרת מהכלל ואינה מקובעת.** הגרסה הראשונה כאן
       דרשה 403 מחשבון הבדיקה — והיא הייתה ירוקה רק מפני
       ש-`_buy.js` נשא `withAuth(handler)` שחוסם חניכים, בעוד
       `maySeeBuy` כבר כלל את שלושת בעלי התפקיד מ-15.9. כלומר
       הבדיקה **נעלה התנהגות שבורה**: הרשאה שנוספה בקוד ואין
       אליה מסלול (5לא, 5נ). ההערה שלוש שורות מתחת אמרה את
       ההפך ("אבל הוא כן מגיע").

     ⚠ חשבון הבדיקה נושא חמישה תפקידים ובהם אחראי מטבח, ולכן
       דרכו אי אפשר לבדוק את הכיוון השני **כלל** — הוא נבדק
       בפונקציה הטהורה שלמטה.
     ============================================================ */
  const { maySeeBuy } = await import("../../api/_buy.js");
  const meB = await call(S, "GET", "/api/auth?action=me");
  const wantSee = maySeeBuy(meB.b);
  r = await call(S, "GET", "/api/container?action=buy");
  ok(wantSee ? "בעל תפקיד קורא את הרשימה הכללית" : "חניך אינו קורא את הרשימה הכללית",
    r.s === (wantSee ? 200 : 403), `${r.s} · maySeeBuy=${wantSee}`);
  /* ⚠ **בלי POST כאן.** הגרסה הקודמת שלחה פריט וציפתה ל-403,
     ומרגע שהשער נפתח היא **יצרה שורה אמיתית** בלוח ולא שמרה
     את המזהה שלה — כלומר הניקוי לא יכול היה למחוק אותה.
     בדיקה שיוצרת נתון חייבת לשמור את המזהה שחזר (הכלל של
     "ניקוי לפי מזהה"). הכתיבה נבדקת למעלה, עם ניקוי. */
  ok("  והכלל עצמו חוסם חניך בלי תפקיד",
    maySeeBuy({ isStudent: true }) === false);

  /* ⚠ **אבל הוא כן מגיע למסך המאוחד** — חשבון הבדיקה נושא
     חמישה תפקידים, ובהם אחראי מטבח — ורואה בו את הרשימות
     שלו בלבד. זה כל העניין: כל מקור אוכף את ההרשאה של עצמו
     (5יג), ולא סינון אחד בסוף. */
  r = await call(S, "GET", "/api/container?action=allshop");
  ok("בעל תפקיד כן מגיע למסך המאוחד", r.s === 200, `${r.s}`);

  /* ============================================================
     ⚠⚠ **הטענה הזו התהפכה, וזו החלטה ולא רגרסיה (15.9.2026).**

     כאן היה כתוב `canGeneral === false` — אב הבית ואחראי
     המטבח מגיעים למסך ואינם רואים את הלשונית הכללית. הבקשה
     של ראש המכינה הייתה במפורש ההפך: *"תוסיף אפשרות לאב
     בית, אחראי בטיחות ולאחראי מטבח, גם להם רשימות קניות
     שהם מוסיפים שבסוף זה מתווסף לרשימת הקניות הכללית"* —
     ולכן `roleHolder` נכלל ב-`maySeeBuy`.

     ⚠ **והציפייה נגזרת מהכלל ואינה קבועה**, כי חשבון הבדיקה
       נושא את כל חמשת התפקידים ומחר הם עשויים להשתנות (4ת).
     ============================================================ */
  const meBuy = await call(S, "GET", "/api/auth?action=me");
  ok("והלשונית הכללית תואמת את maySeeBuy",
    r.b.canGeneral === maySeeBuy(meBuy.b),
    `canGeneral=${r.b.canGeneral} · isKitchen=${meBuy.b.isKitchen} · isHouse=${meBuy.b.isHouse}`);

  /* ⚠ **והכלל עצמו — טהור, ובשני הכיוונים.** דרך חשבון הבדיקה
     אי אפשר לבדוק את הצד החוסם כלל, בדיוק כמו ב-chores-test
     (5כז) וב-perm-test. */
  ok("maySeeBuy חוסם חניך בלי תפקיד", maySeeBuy({ isStudent: true }) === false);
  ok("ופותח לאב הבית", maySeeBuy({ isStudent: true, isHouse: true }) === true);
  ok("ולאחראי הבטיחות", maySeeBuy({ isStudent: true, isSafety: true }) === true);
  ok("ולכל כניסת צוות", maySeeBuy({ isManager: true }) === true);
  ok("והרשימה הכללית אינה בגוף התשובה שלו",
    !(r.b.groups || []).some((g) => g.key === "buy"),
    JSON.stringify((r.b.groups || []).map((g) => g.key)));

  /* ============ 5 · איש צוות שאינו ראש המכינה ============ */
  if (!plain) {
    /* ⚠ אומרת זאת ונכשלת, ולא טוענת טענה ריקה. */
    ok("יש בלוח איש צוות שאינו ראש מכינה", false, "לא נמצא — הגבול הזה לא נבדק");
  } else {
    const P = jar();
    r = await call(P, "POST", "/api/auth?action=login", { code: cv(plain, AUTH_COLS.code) });
    const me = await call(P, "GET", "/api/auth?action=me");
    ok(`${plain.name} נכנס ואינו ראש מכינה`,
      r.s === 200 && me.b.isHead === false, `${r.s} isHead=${me.b.isHead}`);

    r = await call(P, "GET", "/api/container?action=buy");
    ok("איש צוות קורא את הרשימה", r.s === 200, `${r.s}`);
    /* ⚠⚠ **התהפך במכוון (12.9.2026):** כל הצוות מנהל את הרשימה,
       ולא רק ראש המכינה. הטענות נועלות את הכלל החדש. */
    ok("ומקבל canManage=true מהשרת — כל הצוות מנהל", r.b.canManage === true && r.b.canMark === true,
      `canManage=${r.b.canManage} canMark=${r.b.canMark}`);

    r = await call(P, "POST", "/api/container?action=buy", { items: [{ name: TAG + "מאיש צוות" }] });
    ok("ומוסיף פריט", r.s === 200 && r.b.created === 1, `${r.s} ${r.b.error || ""}`);
    if (r.b.ids) made.push(...r.b.ids);

    /* ⚠⚠ **הכיוון השני, ובאותה הרצה.** "אינו מוסיף" לבדו היה
       נשאר ירוק גם אילו הלוח היה נעול לחלוטין — ואז מי שיוצא
       לקניות אינו יכול לסמן דבר, וזה בדיוק מה שמחזיר את
       הרשימה לוואטסאפ. */
    r = await call(P, "PUT", "/api/container?action=buy", { id, status: BUY_STATUS.open });
    ok("אבל כן מסמן סטטוס", r.s === 200, `${r.s} ${r.b.error || ""}`);

    r = await call(P, "PUT", "/api/container?action=buy", { id, name: TAG + "שם אחר" });
    ok("וגם עורך את התוכן", r.s === 200 && (r.b.changed || []).includes("שם"),
      `${r.s} ${r.b.error || ""}`);
  }

  /* ============ 6 · מזהה שאינו קיים ============ */
  r = await call(H, "PUT", "/api/container?action=buy", { id: "9", status: BUY_STATUS.open });
  ok("מזהה שאינו קיים מחזיר 404", r.s === 404, `${r.s}`);

  /* ⚠ מחיקה — וגם היא של ראש המכינה בלבד. */
  r = await call(H, "DELETE", "/api/container?action=buy", { id });
  ok("ראש המכינה מוחק שורה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  if (r.s === 200) made.splice(made.indexOf(id), 1);
} finally {
  await cleanup();
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
