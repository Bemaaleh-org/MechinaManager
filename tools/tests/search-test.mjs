/* ============================================================
   החיפוש הרוחבי — שהמסכים באמת נמצאים
   ------------------------------------------------------------
   ⚠⚠ **הבדיקה נולדה מדיווח:** ראש המכינה הקליד "מכולה" וקיבל
     תקלה אחת. מסך "מכולה" קיים, פתוח לו לגמרי, ופשוט לא היה
     בשום רשימה שהחיפוש קורא — `searchScreens` בנה את מסכי
     התפקידים בתוך `if (session.isStudent)`, ולצוות נשארו
     שישה־עשר מסכים כתובים ביד.

   ⚠ **שני הכיוונים באותה הרצה**: מה שנמצא, ומה ש**אסור**
     שיימצא — חניך אינו מוצא מסכי צוות. טענה על "נמצא" לבדה
     הייתה נשארת ירוקה גם אילו החיפוש החזיר לכל אחד הכול.

   ⚠ **בוחרת מונחים לפי מה שנבדק ולא לפי מה שקיים בנתונים** —
     שמות מסכים קבועים בקוד, ולכן הטענות אינן נשברות ביום
     שמישהו מוחק תקלה.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";

const B = "http://localhost:5173";
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 200) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const find = async (j, q) => {
  const r = await call(j, "GET", "/api/students?action=search&q=" + encodeURIComponent(q));
  if (r.s !== 200) return { s: r.s, screens: [], all: [] };
  const groups = r.b.groups || [];
  const screens = (groups.find((g) => g.kind === "מסך") || {}).items || [];
  return { s: r.s, screens: screens.map((x) => x.title), all: groups.map((g) => g.kind) };
};

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
try {
  console.log("=== הקטלוג מול המגירה ===");
  const { STAFF_SCREENS, STUDENT_SCREENS } = await import("../../shared/screens.js");
  ok("קטלוג הצוות אינו ריק", STAFF_SCREENS.length >= 40, String(STAFF_SCREENS.length));
  ok("וקטלוג החניך", STUDENT_SCREENS.length >= 15, String(STUDENT_SCREENS.length));
  /* ⚠ מפתח כפול פירושו שמסך אחד מסתיר את השני בתוצאות. */
  const dupe = STAFF_SCREENS.length - new Set(STAFF_SCREENS.map((x) => x.tab)).size;
  ok("ואין מפתח כפול", dupe === 0, String(dupe));

  console.log("\n=== צוות ===");
  const M = jar();
  let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
  ok("מנהל נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠⚠ **"מכולה" הוא המקרה שדווח.** */
  let f = await find(M, "מכולה");
  ok("\"מכולה\" מחזיר את מסך המכולה", f.screens.includes("מכולה"), f.screens.join(" · ") || "—");

  f = await find(M, "תקציב");
  ok("\"תקציב\" מחזיר את תקציב המטבח", f.screens.includes("תקציב המטבח"), f.screens.join(" · ") || "—");

  f = await find(M, "תורנ");
  ok("\"תורנ\" מחזיר את התורנויות", f.screens.some((x) => x.includes("תורנ")), f.screens.join(" · ") || "—");

  /* ⚠ מונח שמתאים לכמה מסכים מחזיר את כולם ולא את הראשון. */
  f = await find(M, "מרצ");
  ok("\"מרצ\" מחזיר יותר ממסך אחד", f.screens.length >= 2, f.screens.join(" · ") || "—");

  f = await find(M, "בוגר");
  ok("\"בוגר\" מחזיר את מסך הבוגרים", f.screens.includes("בוגרי המכינה"), f.screens.join(" · ") || "—");

  f = await find(M, "כביסה");
  ok("\"כביסה\" מחזיר מסך ופריטים", f.screens.includes("חדר כביסה") && f.all.length >= 2,
    f.all.join(" · ") || "—");

  console.log("\n=== חניך ===");
  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠⚠ **הכיוון החוסם.** מסכי הצוות אינם בתשובה של חניך —
     לא מסוננים בתצוגה, פשוט אינם שם (עיקרון 4). */
  f = await find(S, "בוגר");
  ok("חניך אינו מוצא את מסך הבוגרים", !f.screens.includes("בוגרי המכינה"),
    f.screens.join(" · ") || "—");
  f = await find(S, "הרשאות");
  ok("ולא את מסך ההרשאות", !f.screens.includes("הרשאות"), f.screens.join(" · ") || "—");

  /* ⚠ ומה שכן שלו — חשבון הבדיקה נושא חמישה תפקידים (4ת),
     ולכן מסכי התפקידים שלו אמורים להימצא. */
  f = await find(S, "מכולה");
  ok("אבל כן מוצא את ציוד המכולה שלו", f.screens.some((x) => x.includes("מכולה")),
    f.screens.join(" · ") || "—");
  f = await find(S, "בקשות");
  ok("ואת בקשות היציאה", f.screens.some((x) => x.includes("בקשות")), f.screens.join(" · ") || "—");

  /* ⚠ מחרוזת קצרה מדי אינה מחפשת — אחרת כל הקלדה ראשונה
     מריצה תשע שליפות לוח. */
  r = await call(M, "GET", "/api/students?action=search&q=א");
  ok("מחרוזת קצרה מדי אינה מחפשת", r.s === 200 && r.b.short === true, JSON.stringify(r.b.short));
} finally {
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
