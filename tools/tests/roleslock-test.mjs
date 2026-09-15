/* ============================================================
   נעילת התפקידים הקבועים
   ------------------------------------------------------------
     npm test -- roleslock

   ⚠⚠ **הבדיקה אינה משנה תפקיד של אף חניך.**

     הטענה "הקוד הנכון פותח" נבדקת עם **מזהה חניך שאינו
     קיים**: אם השער נפתח, הבקשה ממשיכה ונופלת ב-404
     "החניך אינו נמצא" — וזו בדיוק ההוכחה שהנעילה נפתחה,
     בלי שנכתבה ולו שורה אחת. בדיקה שהייתה משבצת תפקיד
     אמיתי כדי לאמת את זה הייתה נוגעת במצבה החיה (5א).

   ⚠ **ושתי הטענות ההפוכות באותה הרצה.** בלי "הקוד השגוי
     נחסם" הבדיקה הייתה ירוקה גם אילו השער נפתח לכולם, ובלי
     "הקוד הנכון פותח" היא הייתה ירוקה גם אילו הוא חסם הכול.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS, SETTINGS_ROW, SETTING_COLS, rolesLockReady } from "../../shared/auth-board.js";
import { invalidate } from "../../api/_cache.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};
const jar = () => {
  let c = "";
  return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } };
};
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, {
    method: m,
    headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) },
    ...(b ? { body: JSON.stringify(b) } : {}),
  });
  j.set(r);
  const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t), raw: t }; } catch { return { s: r.status, b: t.slice(0, 200), raw: t }; }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

if (!rolesLockReady()) {
  console.log("✗ נעילת התפקידים טרם הוקמה. הריצו: npm run seed:roles-lock");
  console.log("0 עברו, 1 נכשלו");
  process.exit(1);
}

const items = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:500){ items{ id name
       column_values(ids:["${AUTH_COLS.code}","${AUTH_COLS.active}","${AUTH_COLS.role}","${SETTING_COLS.lockCode}"]){ id text } } } } }`
)).boards[0].items_page.items;

const settings = items.find((i) => String(i.name).trim() === SETTINGS_ROW);
if (!settings) { console.log("✗ שורת ההגדרות אינה בלוח"); console.log("0 עברו, 1 נכשלו"); process.exit(1); }
const CODE = cv(settings, SETTING_COLS.lockCode).trim();

console.log("\n0 · שורת ההגדרות אינה משתמש");
ok("עמודת הקוד מלאה", Boolean(CODE));
/* ⚠⚠ הטענה החשובה ביותר בקובץ: עמודת `code` היא סוד הכניסה,
   וקוד נעילה שהיה יושב בה היה הופך ל-דלת כניסה למערכת. */
ok("עמודת code (סוד הכניסה) ריקה", cv(settings, AUTH_COLS.code).trim() === "");
ok("השורה כבויה", cv(settings, AUTH_COLS.active).trim() !== "v");

const anon = jar();
let r = await call(anon, "POST", "/api/auth?action=login", { code: CODE });
ok("קוד הנעילה אינו פותח כניסה", r.s !== 200, `${r.s} ${r.b.error || ""}`);
r = await call(anon, "POST", "/api/auth?action=signin", { user: CODE, password: CODE });
ok("וגם לא במסלול שם משתמש", r.s !== 200, `${r.s} ${r.b.error || ""}`);

const dani = items.find((i) => i.name.includes("דני לויט"));
if (!dani) { console.log("✗ לא נמצא מנהל בלוח"); console.log(`${pass} עברו, ${fail + 1} נכשלו`); process.exit(1); }

const regs = [];
try {
  regs.push(await tempRegister("דני לויט"));
  invalidate("auth-rows");

  const D = jar();
  r = await call(D, "POST", "/api/auth?action=login", { code: cv(dani, AUTH_COLS.code) });
  ok("מנהל נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ מזהה שאינו קיים — כך אף תפקיד אמיתי אינו נוגע. */
  const GHOST = "0";
  const body = (lockCode) => ({ studentId: GHOST, roles: [], ...(lockCode ? { lockCode } : {}) });

  console.log("\n1 · בלי קוד — חסום");
  r = await call(D, "POST", "/api/students?action=role", body());
  ok("403", r.s === 403, String(r.s));
  ok("ומסומן needCode", r.b.needCode === true, JSON.stringify(r.b));

  console.log("\n2 · קוד שגוי — חסום");
  r = await call(D, "POST", "/api/students?action=role", body(CODE + "9"));
  ok("403", r.s === 403, String(r.s));
  ok('ההודעה "קוד שגוי"', String(r.b.error || "").includes("קוד שגוי"), JSON.stringify(r.b.error));

  console.log("\n3 · הקוד הנכון פותח את השער");
  r = await call(D, "POST", "/api/students?action=role", body(CODE));
  /* ⚠ 404 ולא 200: השער נפתח והבקשה נפלה על החניך הפיקטיבי.
     כל תשובה שאינה 403 מוכיחה שהנעילה נפתחה. */
  ok("אינו 403 — כלומר נפתח", r.s !== 403, `${r.s} ${r.b.error || ""}`);
  ok("ונפל על החניך שאינו קיים", r.s === 404, `${r.s} ${r.b.error || ""}`);

  console.log("\n3ב · מסלול האימות המוקדם — בודק ואינו נוגע");
  let v = await call(D, "POST", "/api/students?action=role", { verify: true, lockCode: CODE });
  ok("קוד נכון → 200", v.s === 200 && v.b.unlocked === true, `${v.s} ${JSON.stringify(v.b)}`);
  ok("ואינו מחזיר את הקוד", !v.raw.includes(CODE), v.raw.slice(0, 80));
  v = await call(D, "POST", "/api/students?action=role", { verify: true, lockCode: CODE + "9" });
  ok("קוד שגוי → 403", v.s === 403, `${v.s} ${v.b.error || ""}`);
  /* ⚠ verify בלי studentId חייב לא להיחשב כבקשת שינוי: אילו
     הוא היה נופל ל-400 "לא צוין חניך" היה סימן שהמסלול
     אינו קצר-דרך אמיתי והמסך היה מקבל שגיאה מבלבלת. */
  v = await call(D, "POST", "/api/students?action=role", { verify: true });
  ok("verify בלי קוד → 403 ולא 400", v.s === 403, `${v.s} ${v.b.error || ""}`);

  console.log("\n4 · הקוד לעולם אינו יוצא מהשרת");
  for (const [what, res] of [["role", r]]) {
    ok(`תשובת ${what} אינה נושאת את הקוד`, !res.raw.includes(CODE), res.raw.slice(0, 80));
  }
  const me = await call(D, "GET", "/api/auth?action=me");
  ok("גם לא ב-me", !me.raw.includes(CODE));

  console.log("\n5 · הנעילה אינה מחליפה את בדיקת התפקיד");
  const S = jar();
  await call(S, "POST", "/api/auth?action=signin", { user: "bdika", password: "mechina2026" });
  r = await call(S, "POST", "/api/students?action=role", body(CODE));
  /* ⚠ חניך עם הקוד הנכון עדיין נחסם: הנעילה נוספת ל-manager
     ואינה מחליפה אותו. בלי הטענה הזו אפשר היה "לפתוח" את
     המסך לכל מי שיודע את הקוד. */
  ok("חניך עם הקוד הנכון עדיין נחסם", r.s === 403, `${r.s} ${r.b.error || ""}`);
} finally {
  for (const g of regs) await g.restore();
  invalidate("auth-rows");
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
