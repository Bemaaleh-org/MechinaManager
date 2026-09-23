/* ============================================================
   גרסה ישנה בדפדפן — הכלל, והשדה שמזין אותו
   ------------------------------------------------------------
   ⚠⚠ הדיווח חזר פעמיים (23.9.2026): *"לא מופיע"* על תכונה
   שנדחפה. בשני המקרים הקוד היה תקין ומה שרץ בדפדפן היה ישן,
   ואין שום דרך לדעת את זה מהמסך.

   שני הנתונים כבר היו קיימים ואיש לא השווה ביניהם:
   `<meta name="build">` (החבילה שהדפדפן טען) מול `build`
   שב-`?action=me` (מה שהשרת מריץ). ראו src/StaleBuild.jsx.

   ⚠ **הבדיקה נועלת בעיקר את השתיקות.** אזהרת שווא כאן גרועה
     מהיעדרה: מי שיראה "יש גרסה חדשה" בכל טעינה ילמד להתעלם,
     ואז היא לא תעבוד ביום שבאמת יהיה צריך אותה (4כו).

   ⚠ **ושהשדה באמת יוצא מהשרת** — כלל שנשען על שדה שאינו
     נשלח הוא כלל ששותק תמיד, וזו בדיוק התקלה שהוא בא למנוע.
   ============================================================ */
import { tempRegister } from "./_auth.mjs";
import { gql } from "../../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { isStale } from "../../src/stale-build.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

console.log("\n=== מתי אומרים \"גרסה ישנה\" ===");
/* ⚠ המקרה היחיד שמדליק את הרצועה: שני מזהים ידועים ושונים. */
ok("שני קומיטים שונים — ישן", isStale("bbb2222", "aaa1111") === true);
ok("אותו קומיט — שקט", isStale("aaa1111", "aaa1111") === false);

console.log("\n=== ומתי שותקים ===");
/* ⚠ בפיתוח שניהם "local". אזהרה שמופיעה תמיד היא אזהרה
   שמפסיקים לראות. */
ok("שניהם local", isStale("local", "local") === false);
ok("השרת local", isStale("local", "aaa1111") === false);
ok("הדף local", isStale("bbb2222", "local") === false);
/* ⚠ תג חסר בדף אינו "ישן" — הוא "לא ידוע". */
ok("הדף בלי תג", isStale("bbb2222", "") === false);
ok("השרת בלי שדה", isStale("", "aaa1111") === false);
ok("שניהם ריקים", isStale("", "") === false);
ok("undefined אינו מפיל", isStale(undefined, undefined) === false);

/* ============================================================
   השדה עצמו — יוצא מהשרת?
   ============================================================ */
console.log("\n=== ?action=me ===");
const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const code = cv(users.find((x) => x.name.includes("דני לויט")), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
let jar = "";
const call = async (m, p, b) => {
  const r = await fetch(B + p, {
    method: m,
    headers: { "Content-Type": "application/json", ...(jar ? { cookie: jar } : {}) },
    ...(b ? { body: JSON.stringify(b) } : {}),
  });
  const s = r.headers.get("set-cookie");
  if (s) jar = s.split(";")[0];
  const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 200) }; }
};

try {
  let r = await call("POST", "/api/auth?action=login", { code });
  ok("כניסה", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call("GET", "/api/auth?action=me");
  ok("התשובה נושאת build", typeof r.b.build === "string" && r.b.build.length > 0,
    String(r.b.build));
  /* ⚠ **מזהה קומיט ולא מחרוזת כלשהי.** "local" בפיתוח, שבעה
     תווים הקסדצימליים בייצור — כל דבר אחר אומר שהשדה מגיע
     ממקום אחר ממה שנדמה. */
  ok("והוא local או sha קצר",
    r.b.build === "local" || /^[0-9a-f]{7}$/.test(r.b.build), String(r.b.build));
} finally {
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
