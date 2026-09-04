/* ============================================================
   מעבר מחזור — הבדיקה שקובעת אם הדבר הזה באמת עובד
   ------------------------------------------------------------
   ⚠ הבדיקה **מפעילה מחזור אחר באמת** ואז מחזירה. היא רצה רק
     מול שרת פיתוח, והשחזור נמצא ב-finally כדי שגם כישלון
     באמצע יחזיר את המערכת למחזור ב׳.

   ⚠ מה שנבדק הוא לא "הסטטוס התחלף" אלא ש**המסכים באמת קוראים
     מלוח אחר**: מצבת חניכים ריקה מול 33 חניכים.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { CYCLES_BOARD, CYCLES_COLS as C } from "../../shared/cycles-ids.js";

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

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const D = jar();
/* ⚠ מנהל שטרם בחר שם וסיסמה חסום בכל נקודות הקצה מאז שנוספה
   ההרשמה. הרישום כאן זמני, הסיסמה שנוצרת אינה קיימת, והשחזור
   בסוף חובה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("דני");
await call(D, "POST", "/api/auth?action=login", { code: cv(us.find((x) => x.name.includes("דני")), AUTH_COLS.code) });

const state = async () => (await call(D, "GET", "/api/students?action=cycles")).b;
const before = await state();
const two = before.cycles.find((c) => c.name === "מחזור ב׳");
const three = before.cycles.find((c) => c.name === "מחזור ג׳");
const doneBefore = three ? [...three.done] : [];

console.log(`מחזור ב׳: ${two?.status} · מחזור ג׳: ${three?.status}`);

const restore = async () => {
  /* ⚠ ישירות ללוח ולא דרך ה-API: אם ההפעלה נכשלה באמצע,
     ה-API עשוי לסרב להחזיר, והשחזור חייב להצליח תמיד. */
  await gql(`mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: CYCLES_BOARD, i: two.id, v: JSON.stringify({ [C.status]: { label: "פעיל" } }) });
  if (three) {
    await gql(`mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: CYCLES_BOARD, i: three.id, v: JSON.stringify({
        [C.status]: { label: "בהקמה" }, [C.done]: doneBefore.join(","),
      }) });
  }
};

try {
  if (!three) { console.log("מחזור ג׳ אינו קיים — הבדיקה מדלגת."); process.exit(0); }

  /* ============ לפני ============ */
  console.log("\n=== לפני המעבר ===");
  let r = await call(D, "GET", "/api/students?action=list");
  const nBefore = (r.b.students || []).length;
  ok("מצבת החניכים מלאה", nBefore > 0, `${nBefore} חניכים`);
  r = await call(D, "GET", "/api/lessons?action=board");
  const lBefore = r.b.counts?.upcoming ?? 0;
  ok("ולוח השיעורים מלא", r.s === 200, `${lBefore} שיעורים קרובים`);

  /* ============ המעבר ============ */
  console.log("\n=== מעבר למחזור ג׳ ===");
  r = await call(D, "PUT", "/api/students?action=cycles", { id: three.id, step: "students" });
  ok("סימון שלב המצבה", r.s === 200, r.b.error);
  r = await call(D, "PUT", "/api/students?action=cycles", { id: three.id, activate: true });
  ok("ההפעלה עברה", r.s === 200, `${r.s} ${r.b.error || ""}`);

  const mid = await state();
  ok("מחזור ג׳ פעיל", mid.cycles.find((c) => c.name === "מחזור ג׳")?.status === "פעיל");
  ok("ומחזור ב׳ בארכיון", mid.cycles.find((c) => c.name === "מחזור ב׳")?.status === "ארכיון");

  /* ⚠ העיקר: המסכים קוראים מהלוחות החדשים */
  r = await call(D, "GET", "/api/students?action=list");
  const nAfter = (r.b.students || []).length;
  ok("מצבת החניכים ריקה — נקראת מהלוח החדש", r.s === 200 && nAfter === 0,
    `${nAfter} חניכים (היו ${nBefore})`);
  r = await call(D, "GET", "/api/lessons?action=board");
  ok("ולוח השיעורים ריק", r.s === 200 && (r.b.counts?.upcoming ?? 0) === 0,
    `${r.b.counts?.upcoming} קרובים`);
  r = await call(D, "GET", "/api/students?action=faults");
  ok("וגם התקלות", r.s === 200 && (r.b.faults || []).length === 0,
    `${(r.b.faults || []).length} תקלות`);

  /* ⚠ ומה ש**לא** אמור להתחלף */
  r = await call(D, "GET", "/api/students?action=alumni");
  ok("הבוגרים לא התחלפו — אינם שייכים למחזור", r.s === 200 && r.b.count === 24,
    `${r.b.count} בוגרים`);
  r = await call(D, "GET", "/api/auth?action=me");
  ok("והצוות ממשיך להיות מחובר", r.s === 200 && r.b.isHead === true);

  /* ============ חזרה ============ */
  console.log("\n=== חזרה למחזור ב׳ ===");
  r = await call(D, "PUT", "/api/students?action=cycles", { id: two.id, activate: true });
  ok("ההחזרה עברה", r.s === 200, `${r.s} ${r.b.error || ""}`);

  r = await call(D, "GET", "/api/students?action=list");
  ok("והמצבה חזרה במלואה", (r.b.students || []).length === nBefore,
    `${(r.b.students || []).length} מתוך ${nBefore}`);
  r = await call(D, "GET", "/api/lessons?action=board");
  ok("וגם השיעורים", (r.b.counts?.upcoming ?? 0) === lBefore,
    `${r.b.counts?.upcoming} מתוך ${lBefore}`);

} finally {
  console.log("\n=== שחזור ===");
  await restore();
  const end = await state();
  ok("מחזור ב׳ פעיל שוב", end.cycles.find((c) => c.name === "מחזור ב׳")?.status === "פעיל");
  ok("ומחזור ג׳ חזר להקמה", end.cycles.find((c) => c.name === "מחזור ג׳")?.status === "בהקמה");
  const r = await call(D, "GET", "/api/students?action=list");
  ok("והנתונים במקומם", (r.b.students || []).length > 0, `${(r.b.students || []).length} חניכים`);
}

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
