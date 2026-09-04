/* ============================================================
   התראות דחיפה — הגבולות, וההפרדה מהפעמון
   ------------------------------------------------------------
   ⚠ הבדיקה **אינה שולחת דחיפה אמיתית** — אין מכשיר לקבל אותה.
     מה שנבדק הוא מה שאפשר לבדוק בלי מכשיר: מי רשאי להירשם,
     מה נדחה, שההרשמה אידמפוטנטית, ושהסבב מוגן בסוד.

   ⚠ והיא מנקה אחריה את המנוי שיצרה.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { buildNotes } from "../../api/_notify.js";

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

const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

const FAKE = "https://fcm.googleapis.com/fcm/send/בדיקה-" + Math.random().toString(36).slice(2);

try {
  console.log("=== מצב ===");
  r = await call(M, "GET", "/api/auth?action=push");
  ok("המצב נטען", r.s === 200, `${r.s} ${r.b.error || ""}`);
  /* ⚠ עיקרון 6: "לא הוגדר" הוא מצב, לא שגיאה — והמסך אומר
     אותו במילים אחרות מ"לא נרשמת". */
  ok("ויש בו האם המערכת מוגדרת", typeof r.b.ready === "boolean", String(r.b.ready));
  ok("ומספר המכשירים", typeof r.b.devices === "number", String(r.b.devices));
  const ready = r.b.ready;
  if (ready) {
    /* ⚠ המפתח הציבורי **אינו סוד** ובלעדיו אי אפשר להירשם. */
    ok("והמפתח הציבורי מוחזר", typeof r.b.publicKey === "string" && r.b.publicKey.length > 60,
      String(r.b.publicKey && r.b.publicKey.length));
  } else {
    console.log("  (VAPID אינו מוגדר — סעיפי ההרשמה מדולגים)");
  }

  console.log("\n=== הסבב מוגן ===");
  /* ⚠⚠ הטענה החשובה: נקודת קצה שרצה בלי משתמש חייבת סוד. */
  r = await call(jar(), "GET", "/api/auth?action=push-run");
  ok("סבב בלי סוד נדחה", r.s === 401, `${r.s} ${r.b.error || ""}`);
  /* ⚠ **וגם סשן מנהל אינו מספיק.** ההגנה היא הסוד, ולא זהות. */
  r = await call(M, "GET", "/api/auth?action=push-run");
  ok("וגם מנהל מחובר אינו מפעיל אותו", r.s === 401, `${r.s} ${r.b.error || ""}`);
  r = await call(jar(), "GET", "/api/auth?action=push-run&key=לא-נכון");
  ok("וסוד שגוי נדחה", r.s === 401, String(r.s));

  /* ⚠⚠ **הנתיב האמיתי של המשימה המתוזמנת הוא `/api/cron`.**
     Vercel Cron מקבל נתיב בלבד ולא query string, ולכן משימה
     מתוזמנת חייבת פונקציה נספרת משלה — השמינית מתוך 12. */
  r = await call(jar(), "GET", "/api/cron");
  ok("הנתיב המתוזמן קיים ומוגן", r.s === 401, r.s + " " + (r.b.error || ""));
  r = await call(jar(), "GET", "/api/cron?job=nope");
  /* ⚠ משימה בשם שגוי מחזירה 404 ואינה רצה כברירת מחדל בשקט. */
  ok("ומשימה בשם שגוי מחזירה 404", r.s === 404, r.s + " " + (r.b.error || ""));

  if (ready) {
    console.log("\n=== הרשמה ===");
    r = await call(M, "POST", "/api/auth?action=push", { subscription: { endpoint: "לא-כתובת" } });
    ok("מנוי בלי https נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);
    r = await call(M, "POST", "/api/auth?action=push", {});
    ok("ובלי מנוי בכלל נדחה", r.s === 400, String(r.s));

    const before = (await call(M, "GET", "/api/auth?action=push")).b.devices;
    r = await call(M, "POST", "/api/auth?action=push", { subscription: { endpoint: FAKE } });
    ok("מנוי תקין נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);
    ok("ומספר המכשירים עלה", r.b.devices === before + 1, `${before} → ${r.b.devices}`);

    /* ⚠ אותו מכשיר פעמיים אינו שני מנויים (עיקרון 5). */
    r = await call(M, "POST", "/api/auth?action=push", { subscription: { endpoint: FAKE } });
    ok("הרשמה חוזרת אינה מכפילה", r.b.devices === before + 1, String(r.b.devices));

    r = await call(M, "DELETE", "/api/auth?action=push", { endpoint: FAKE });
    ok("ביטול מסיר", r.s === 200 && r.b.devices === before, `${r.s} ${r.b.devices}`);
  }

  console.log("\n=== buildNotes משותפת ===");
  /* ⚠⚠ **הפעמון וסבב הדחיפה בונים מאותה פונקציה.** שני
     מקומות שבונים התראות בנפרד מתפצלים ביום הראשון, ואז
     הדחיפה מודיעה על משהו שהמסך אינו מראה. */
  const demo = (await studentRows()).find((x) => x.demo);
  if (demo) {
    const notes = await buildNotes({
      kind: "student", itemId: String(demo.id), name: demo.name,
      isStudent: true, isManager: false, roles: demo.roles || [],
    });
    ok("buildNotes מחזירה מערך", Array.isArray(notes), String(notes.length));
    ok("ולכל התראה מזהה יציב", notes.every((n) => n.id), String(notes.length));
    /* ⚠ מזהה נגזר מהתוכן ולא מספר רץ — אחרת "נקרא" מתאפס
       בכל רענון (4כו). */
    const again = await buildNotes({
      kind: "student", itemId: String(demo.id), name: demo.name,
      isStudent: true, isManager: false, roles: demo.roles || [],
    });
    ok("והמזהים יציבים בין שתי קריאות",
      notes.map((n) => n.id).join("|") === again.map((n) => n.id).join("|"));
  }

  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
  if (r.s === 200) {
    r = await call(S, "GET", "/api/auth?action=push");
    /* ⚠ חניך הוא בדיוק מי שצריך התראות בטלפון. */
    ok("חניך מגיע למסך ההתראות", r.s === 200, `${r.s} ${r.b.error || ""}`);
  }

  const OUT = jar();
  r = await call(OUT, "GET", "/api/auth?action=push");
  ok("מנותק חסום", r.s === 401, String(r.s));
} finally {
  /* ⚠ ניקוי המנוי שנוצר — גם אם הבדיקה נפלה באמצע. */
  await call(M, "DELETE", "/api/auth?action=push", { endpoint: FAKE }).catch(() => {});
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
