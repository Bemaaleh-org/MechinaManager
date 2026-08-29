/* ============================================================
   טבלת המרה נערכת · שווי רשימת קניות · קוד צוות במסך הרגיל

   ⚠ הבדיקה יוצרת את השורות שלה ומוחקת אותן בסוף, כולל בכשל.
     אין נגיעה בשורות אמיתיות בלוח ההמרות.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { identities, writeIdentity, isFresh } from "../../api/_identity.js";
import { PRODUCE_KG, buildTable, kgPerUnit } from "../../shared/produce.js";

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

/* ============ 1 · מיזוג הטבלה ============ */
console.log("=== מיזוג ברירת מחדל ולוח ===");
const t = buildTable([{ name: "עגבנייה", kg: 0.2 }, { name: "פטריות", kg: 0.02 }]);
ok("ברירת המחדל בלי הלוח", kgPerUnit("עגבניות") === 0.12, String(kgPerUnit("עגבניות")));
/* ⚠ העיקר: הלוח גובר, וגם על צורת הרבים. */
ok("הלוח גובר", kgPerUnit("עגבניות", t) === 0.2, String(kgPerUnit("עגבניות", t)));
ok("ופריט חדש מהלוח נמצא", kgPerUnit("פטריות", t) === 0.02, String(kgPerUnit("פטריות", t)));
ok("שרי לא נפגעה מהדריסה", kgPerUnit("עגבניות שרי", t) === 0.012, String(kgPerUnit("עגבניות שרי", t)));
/* ⚠ ערך פסול מהלוח אינו מוחק את ברירת המחדל. */
const bad = buildTable([{ name: "עגבנייה", kg: 0 }, { name: "מלפפון", kg: "לא מספר" }]);
ok("אפס מהלוח אינו דורס", kgPerUnit("עגבנייה", bad) === 0.12, String(kgPerUnit("עגבנייה", bad)));
ok("וגם לא טקסט", kgPerUnit("מלפפון", bad) === 0.11, String(kgPerUnit("מלפפון", bad)));
ok("רשימה ריקה מחזירה את המקור",
  Object.keys(buildTable([])).length === Object.keys(PRODUCE_KG).length);
ok("ו-null אינו מפיל", Object.keys(buildTable(null)).length > 0);

/* ============ 2 · השרת ============ */
console.log("=== נקודת הקצה ===");
const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const code = (t2) => cv(us.find((x) => x.name.includes(t2)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const D = jar(); await call(D, "POST", "/api/auth?action=login", { code: code("דני לויט") });

const NEW = "בדיקה — פטריות שמפיניון";
/* ⚠ השם מכיל "מלפפון" כדי שההתאמה לטבלה תתפוס אותו, ומסומן
   כבדיקה כדי שלא יתבלבל עם מלאי אמיתי. */
const CUKE_ITEM = "מלפפון — פריט בדיקה";
let newId = null, overrideId = null, cukeItemId = null;

try {
  let r = await call(D, "GET", "/api/kitchen?action=produce");
  ok("הטבלה נקראת", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("והיא ניתנת לעריכה", r.b.editable === true);
  ok("ויש בה שורות", (r.b.rows || []).length >= 40, `${(r.b.rows || []).length}`);
  const tom = (r.b.rows || []).find((x) => x.name === "עגבנייה");
  /* ⚠ כל שורה אומרת מאיפה היא. בלי זה אי אפשר להבדיל בין
     ערך מובנה לערך שנקבע ידנית — וכפתור "איפוס" נראה כמו
     מחיקה של הפריט. */
  ok("ולכל שורה יש מקור", tom && (tom.source === "board" || tom.source === "default"), tom?.source);
  /* ⚠ הלוח מחזיק דריסות בלבד. אם הכול מסומן "board", התג
     "נערך" מופיע על כל הטבלה ומאבד את משמעותו. */
  const fromBoard = (r.b.rows || []).filter((x) => x.source === "board").length;
  ok("ורוב השורות מובנות ולא דריסות", fromBoard <= 3,
    `${fromBoard} דריסות מתוך ${(r.b.rows || []).length}`);

  /* ---- הוספה ---- */
  r = await call(D, "POST", "/api/kitchen?action=produce", { name: NEW, kg: 0.025 });
  ok("פריט חדש נוסף", r.s === 200, `${r.s} ${r.b.error || ""}`);
  newId = r.b.id;

  r = await call(D, "GET", "/api/kitchen?action=produce");
  let mine = (r.b.rows || []).find((x) => x.name === NEW);
  ok("והוא חוזר בטבלה", mine?.kg === 0.025, String(mine?.kg));
  ok("מסומן כמגיע מהלוח", mine?.source === "board", mine?.source);
  /* ⚠ פריט חדש אין לו ערך מובנה לחזור אליו. */
  ok("ובלי ערך מובנה", mine?.fallback === null, String(mine?.fallback));

  /* ---- שם כפול ---- */
  r = await call(D, "POST", "/api/kitchen?action=produce", { name: NEW, kg: 0.05 });
  ok("אותו שם פעמיים נדחה", r.s === 409, `${r.s}`);

  /* ---- קלט פסול ---- */
  r = await call(D, "POST", "/api/kitchen?action=produce", { name: "בדיקה — אפס", kg: 0 });
  ok("משקל אפס נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);
  r = await call(D, "POST", "/api/kitchen?action=produce", { name: "בדיקה — שלילי", kg: -1 });
  ok("משקל שלילי נדחה", r.s === 400, `${r.s}`);
  r = await call(D, "POST", "/api/kitchen?action=produce", { name: "", kg: 1 });
  ok("שם ריק נדחה", r.s === 400, `${r.s}`);

  /* ---- עריכה ---- */
  r = await call(D, "PUT", "/api/kitchen?action=produce", { id: newId, kg: 0.03 });
  ok("עריכת משקל עוברת", r.s === 200, r.b.error);
  r = await call(D, "GET", "/api/kitchen?action=produce");
  ok("והערך התעדכן",
    (r.b.rows || []).find((x) => x.name === NEW)?.kg === 0.03,
    String((r.b.rows || []).find((x) => x.name === NEW)?.kg));

  /* ---- דריסת ערך מובנה ----
     ⚠ הלוח מחזיק **דריסות בלבד**, ולכן "מלפפון" אינו אמור
       להיות בו מלכתחילה. בדיקה קודמת מחקה שורה שהוזרעה שם
       וזו הייתה פגיעה בנתונים — לכן הבדיקה מוודאת עכשיו שהיא
       יוצרת את הדריסה בעצמה, ומסירה בדיוק אותה. */
  r = await call(D, "GET", "/api/kitchen?action=produce");
  const cucumber = (r.b.rows || []).find((x) => x.name === "מלפפון");
  ok("מלפפון מגיע מברירת המחדל", cucumber?.source === "default", cucumber?.source);
  r = await call(D, "POST", "/api/kitchen?action=produce", { name: "מלפפון", kg: 0.19 });
  ok("דריסת ערך מובנה עוברת", r.s === 200, `${r.s} ${r.b.error || ""}`);
  overrideId = r.b.id;
  r = await call(D, "GET", "/api/kitchen?action=produce");
  const c2 = (r.b.rows || []).find((x) => x.name === "מלפפון");
  ok("והמשקל החדש הוא שגובר", c2?.kg === 0.19, String(c2?.kg));
  /* ⚠ העיקר: המסך צריך לדעת שיש למה לחזור. */
  ok("והערך המובנה נשמר כנקודת חזרה", c2?.fallback === 0.11, String(c2?.fallback));

  /* ---- הדריסה משפיעה על חישוב הציוד ----
     ⚠ **הטענה החשובה ביותר בקובץ**, ולכן הבדיקה יוצרת לעצמה
       פריט ציוד במקום לחפש כזה שאולי קיים. גרסה קודמת דילגה
       כאן כשלא נמצא מלפפון במלאי, ובדיקה שמדלגת על העיקר היא
       בדיקה שעוברת בלי לבדוק כלום. */
  r = await call(D, "POST", "/api/kitchen?action=equip",
    { name: CUKE_ITEM, qty: "10", kind: "מתכלה", area: "אוכל" });
  ok("פריט ציוד לבדיקה נוצר", r.s === 200, `${r.s} ${r.b.error || ""}`);
  cukeItemId = r.b.id;

  r = await call(D, "GET", "/api/kitchen?action=equip&area=אוכל");
  const cuke = (r.b.equipment || []).find((x) => x.id === cukeItemId);
  ok("והציוד מחשב לפי הטבלה החדשה", cuke?.kgEach === 0.19, String(cuke?.kgEach));
  ok("ומצהיר שהמקור הוא הטבלה", cuke?.kgSource === "table", cuke?.kgSource);
  ok("והמשקל הכולל לפי הדריסה", cuke?.kgTotal === 1.9, String(cuke?.kgTotal));

  /* ---- מחיקה מחזירה לערך המובנה ---- */
  r = await call(D, "DELETE", "/api/kitchen?action=produce", { id: overrideId });
  ok("הסרת דריסה עוברת", r.s === 200, r.b.error);
  ok("והשרת אומר לאן חוזרים", r.b.fallback === 0.11, String(r.b.fallback));
  overrideId = null;
  r = await call(D, "GET", "/api/kitchen?action=produce");
  ok("והערך חזר למובנה",
    (r.b.rows || []).find((x) => x.name === "מלפפון")?.kg === 0.11,
    String((r.b.rows || []).find((x) => x.name === "מלפפון")?.kg));

  /* ============ 3 · שווי רשימת הקניות ============ */
  console.log("=== שווי רשימת הקניות ===");
  r = await call(D, "GET", "/api/kitchen?action=equip&area=אוכל");
  const target = (r.b.equipment || [])[0];
  await call(D, "PUT", "/api/kitchen?action=equip", { itemId: target.id, price: 8 });

  r = await call(D, "POST", "/api/kitchen?action=shop",
    { items: [{ name: target.name, qty: "5" }], area: "אוכל" });
  ok("שורת קנייה נוצרה", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(D, "GET", "/api/kitchen?action=equip&area=אוכל");
  const line = (r.b.shopping || []).find((x) => x.name === target.name && x.status === "פתוח");
  /* ⚠ ההתאמה לפי שם מדויק ותחום. התאמה חלקית הייתה מדביקה
     מחיר של פריט אחר על שורה שהוקלדה ביד. */
  ok("ויש לה מחיר מהציוד", line?.price === 8, String(line?.price));
  ok("ועלות מחושבת", line?.cost === 40, String(line?.cost));
  ok("ויש שווי לרשימה כולה", r.b.openValue && r.b.openValue.total >= 40,
    JSON.stringify(r.b.openValue));
  ok("שמדווח כמה שורות בלי מחיר", typeof r.b.openValue.unpriced === "number",
    String(r.b.openValue.unpriced));
  /* ⚠ שווי הקנייה ושווי המלאי הם שתי שאלות שונות. */
  ok("והוא נפרד משווי המלאי", r.b.value.total !== r.b.openValue.total,
    `מלאי ${r.b.value.total} · קנייה ${r.b.openValue.total}`);

  /* ניקוי */
  for (const x of (r.b.shopping || []).filter((y) => y.name === target.name)) {
    await call(D, "DELETE", "/api/kitchen?action=shop", { itemId: x.id });
  }
  await call(D, "PUT", "/api/kitchen?action=equip", { itemId: target.id, price: "" });
  console.log("  (שורת הקנייה והמחיר נוקו)");

  /* ---- חניך אינו עורך את הטבלה ---- */
  const S = jar();
  r = await call(S, "GET", "/api/kitchen?action=produce");
  ok("בלי כניסה אין טבלה", r.s === 401, `${r.s}`);
} finally {
  if (newId) await call(D, "DELETE", "/api/kitchen?action=produce", { id: newId });
  if (overrideId) await call(D, "DELETE", "/api/kitchen?action=produce", { id: overrideId });
  if (cukeItemId) await call(D, "DELETE", "/api/kitchen?action=equip", { itemId: cukeItemId });
  await reg.restore();
}

/* ============ 4 · קוד צוות במסך הכניסה הרגיל ============ */
console.log("=== קוד צוות בשני השדות ===");
const WHO = "אחים";
const row = (await identities()).find((r) => r.kind === "staff" && r.name.includes(WHO));
const before = { user: row.user || "", hash: row.hash || "", email: row.email || "", setAt: row.setAt || "" };
const CODE = cv(us.find((x) => String(x.id) === row.id), AUTH_COLS.code);

try {
  await writeIdentity(row, { user: "", hash: "", email: "", setAt: "" });
  ok("המנהל מתחיל בלי זהות", isFresh((await identities()).find((r) => r.id === row.id)));

  const J = jar();
  let r = await call(J, "POST", "/api/auth?action=signin", { user: CODE, password: CODE });
  ok("הקוד בשני השדות פותח", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("ומוביל להרשמה ולא למערכת", r.b.setup === true, JSON.stringify(r.b.setup));
  ok("ומזוהה כצוות", r.b.kind === "manager", r.b.kind);

  /* ⚠ שני התנאים. קוד בשם המשתמש עם סיסמה אחרת אינו כניסה. */
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: CODE, password: "משהו-אחר" });
  ok("קוד עם סיסמה אחרת נדחה", r.s === 401, `${r.s}`);
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: "לא-קוד", password: CODE });
  ok("שם שגוי עם הקוד נדחה", r.s === 401, `${r.s}`);

  /* ---- אחרי הרשמה, הקוד כבר לא פותח ---- */
  r = await call(J, "POST", "/api/auth?action=account",
    { user: "bdika.kod", password: "Bdika-Kod-2026!", email: "bdika.kod@example.invalid" });
  ok("ההרשמה עוברת", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ **העיקר של כל השינוי הזה.** אחרת מי שיודע את הקוד היה
     עוקף את הסיסמה של מנהל שכבר נרשם. */
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: CODE, password: CODE });
  /* ⚠ **409 ולא 401, ובכוונה.** מי שהקליד את אותו סוד בשני
     השדות הוכיח שהוא מחזיק בו — ולכן הוא מקבל "כבר נרשמת"
     ולא הודעה גנרית (4ע). הטענה בודקת **גם את התוכן**: 409
     לבדו יכול להגיע ממקום אחר. */
  ok("ואז הקוד כבר אינו פותח, ואומר למה",
    r.s === 409 && /כבר נרשמת/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  r = await call(jar(), "POST", "/api/auth?action=signin",
    { user: "bdika.kod", password: "Bdika-Kod-2026!" });
  ok("אבל שם המשתמש כן", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("וכבר לא במצב הרשמה", !r.b.setup, JSON.stringify(r.b.setup));
} finally {
  await writeIdentity(row, before);
  console.log("  (שורת המנהל שוחזרה)");
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
