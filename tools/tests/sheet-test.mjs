/* ============================================================
   גיליון שיעור — פרטי הקשר עם המרצה
   ------------------------------------------------------------
   ⚠ הבדיקה **יוצרת גיליון משלה** ומוחקת אותו בסוף, לפי המזהה
     שחזר מהיצירה. היא אינה נוגעת באף גיליון אמיתי — 30 גיליונות
     המרצים של המכינה נשארים כפי שהם.

   ⚠ ומוודאת גם את הכיוון השני: פרטי הקשר של מרצה הם פרטים של
     אדם חיצוני, ו**אינם יוצאים לחניך**.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { LESSON_BOARDS as LB, LESSON_COLS as LC } from "../../shared/lessons-boards.js";
import { studentRows } from "../../api/_student-rows.js";

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

const reg = await tempRegister("דני לויט", "נעם");
const M = jar();
let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
if (r.s !== 200) { console.log("כניסה נכשלה", r.b); process.exit(1); }

const SUBJECT = "בדיקה — שיעור זמני";
let id = null;

const cleanup = async () => {
  if (!id) return;
  try { await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: id }); } catch { /* כבר נמחק */ }
};
process.on("uncaughtException", async (e) => {
  console.log("שגיאה:", e.message); await cleanup(); await reg.restore(); process.exit(1);
});

try {
  console.log("=== יצירה ===");
  r = await call(M, "POST", "/api/lessons?action=sheet",
    { subject: SUBJECT, lecturer: "מרצה בדיקה", dayTime: "שני 10:00" });
  ok("גיליון נוצר", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
  id = r.b.id;
  if (!id) throw new Error("לא נוצר גיליון");

  const mine = async () => (await call(M, "GET", "/api/lessons?action=sheet&id=" + id)).b;

  let d = await mine();
  ok("ופרטי הקשר מתחילים ריקים",
    d.sheet.phone === null && d.sheet.mail === null && d.sheet.contact === null,
    JSON.stringify([d.sheet.phone, d.sheet.mail, d.sheet.contact]));

  console.log("\n=== הזנת פרטי קשר ===");
  r = await call(M, "PUT", "/api/lessons?action=sheet",
    { id, phone: "052-1234567", mail: "test@example.com", contact: "מתאמים דרך המשרד" });
  ok("נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("והתשובה אומרת מה השתנה", (r.b.changed || []).length === 3,
    (r.b.changed || []).join(", "));

  d = await mine();
  ok("הטלפון חוזר", d.sheet.phone === "052-1234567", String(d.sheet.phone));
  ok("האימייל חוזר", d.sheet.mail === "test@example.com", String(d.sheet.mail));
  ok("וההערה חוזרת", d.sheet.contact === "מתאמים דרך המשרד", String(d.sheet.contact));

  /* ⚠ שמירה חוזרת של אותם ערכים אינה "שינוי". התשובה שאומרת
     "נשמר" על שמירה ריקה מלמדת להתעלם ממנה. */
  r = await call(M, "PUT", "/api/lessons?action=sheet", { id, phone: "052-1234567" });
  ok("שמירה של אותו ערך אינה נספרת כשינוי",
    r.s === 200 && (r.b.changed || []).length === 0, JSON.stringify(r.b.changed));

  /* ⚠ undefined ו-"" הן שתי כוונות שונות. */
  r = await call(M, "PUT", "/api/lessons?action=sheet", { id, mail: "" });
  ok("ריק מנקה", r.s === 200 && (r.b.changed || []).includes("אימייל המרצה"),
    JSON.stringify(r.b.changed));
  d = await mine();
  ok("והאימייל נוקה", d.sheet.mail === null, String(d.sheet.mail));
  ok("אבל הטלפון לא נגע", d.sheet.phone === "052-1234567", String(d.sheet.phone));

  console.log("\n=== הרשאות ===");
  r = await call(M, "PUT", "/api/lessons?action=sheet", { id: "999999999", phone: "1" });
  ok("גיליון שאינו קיים מחזיר 404", r.s === 404, `${r.s} ${r.b.error || ""}`);

  const G = jar();
  await call(G, "POST", "/api/auth?action=login", { code: codeOf("נעם") });
  r = await call(G, "PUT", "/api/lessons?action=sheet", { id, phone: "050-0000000" });
  ok("מדריך נחסם בכתיבה", r.s === 403, `${r.s} ${r.b.error || ""}`);
  r = await call(G, "GET", "/api/lessons?action=sheet&id=" + id);
  ok("אבל קורא", r.s === 200, String(r.s));

  /* ============================================================
     ⚠⚠ **פרטי מרצה אינם יוצאים לחניך.**
       זה אדם חיצוני למכינה, ומספר הטלפון שלו אינו נתון שהחניך
       צריך. הטענה בודקת את **מסלול הקריאה** ולא את השורה: אם
       מסלול חדש ייפתח לחניך עם פריסת `...sheet`, הוא ייפול כאן.
     ============================================================ */
  const demo = (await studentRows()).find((x) => x.demo);
  if (!demo) { console.log("  (אין חשבון בדיקה — סעיף החניך מדולג)"); }
  else {
    const S = jar();
    r = await call(S, "POST", "/api/auth?action=signin",
      { user: DEMO_USER, password: DEMO_PASS });
    ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

    r = await call(S, "GET", "/api/lessons?action=sheet&id=" + id);
    ok("חניך אינו מגיע לגיליון בכלל", r.s === 403, `${r.s} ${r.b.error || ""}`);
    r = await call(S, "GET", "/api/lessons?action=list");
    ok("ולא לרשימת הגיליונות", r.s === 403, String(r.s));

    /* המסלול שחניך כן מגיע אליו — ושם אין פרטי קשר */
    r = await call(S, "GET", "/api/lessons?action=rate");
    ok("דירוג שיעורים פתוח לחניך", r.s === 200, `${r.s} ${r.b.error || ""}`);
    const leak = JSON.stringify(r.b).includes("052-1234567");
    ok("ואין בו פרטי קשר של מרצה", !leak);
  }

  console.log("\n=== דוח תשלום למרצים ===");
  /* ⚠ הבדיקה עובדת על הגיליון שהיא יצרה. אין לו מפגשים, ולכן
     היא בודקת את **הכללים** — מה נספר, מה מדווח כחסר, ומי
     רשאי — ולא סכום על נתונים אמיתיים. */
  r = await call(M, "PUT", "/api/lessons?action=pay", { id, price: 450 });
  ok("מחיר למפגש נשמר", r.s === 200, `${r.s} ${r.b.error || ""}`);

  d = await mine();
  ok("והוא חוזר בגיליון", d.sheet.price === 450, String(d.sheet.price));

  /* ⚠⚠ **ריק אינו אפס.** 0 הוא מתנדב, וריק הוא "לא סוכם" —
     שני מצבים שונים לגמרי, ואיחודם מסתיר בדיוק את מה שהדוח
     צריך לצעוק. */
  r = await call(M, "PUT", "/api/lessons?action=pay", { id, price: 0 });
  ok("מחיר אפס מתקבל", r.s === 200, `${r.s} ${r.b.error || ""}`);
  d = await mine();
  ok("והוא אפס ולא ריק", d.sheet.price === 0, JSON.stringify(d.sheet.price));

  r = await call(M, "PUT", "/api/lessons?action=pay", { id, price: "" });
  ok("וריק מחזיר ל'לא סוכם'", r.s === 200, r.b.error);
  d = await mine();
  ok("והוא null ולא אפס", d.sheet.price === null, JSON.stringify(d.sheet.price));

  r = await call(M, "PUT", "/api/lessons?action=pay", { id, price: "בערך 400" });
  ok("מחיר לא-מספרי נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);
  r = await call(M, "PUT", "/api/lessons?action=pay", { id, price: -5 });
  ok("ומחיר שלילי נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  r = await call(M, "GET", "/api/lessons?action=pay");
  ok("הדוח השנתי נטען", r.s === 200 && r.b.year, `${r.s} ${r.b.error || ""}`);
  ok("ויש בו סך הכול", typeof r.b.year.total === "number", String(r.b.year.total));
  /* ⚠ שני המספרים שאומרים כמה מהתמונה חסר — הם הסיבה שהמסך
     אינו מציג סכום שנראה סופי (4ח, 4יח). */
  ok("וכמה מפגשים טרם דווחו", typeof r.b.year.unreported === "number",
    String(r.b.year.unreported));
  ok("וכמה שיעורים בלי מחיר", typeof r.b.year.unpriced === "number",
    String(r.b.year.unpriced));

  const someMonth = (r.b.months || [])[0];
  if (someMonth) {
    const mr = await call(M, "GET", "/api/lessons?action=pay&month=" + someMonth);
    ok("ודוח חודשי נטען", mr.s === 200 && Array.isArray(mr.b.rows),
      `${mr.s} ${mr.b.error || ""}`);
  }
  r = await call(M, "GET", "/api/lessons?action=pay&month=2026");
  ok("חודש בפורמט שגוי נדחה", r.s === 400, `${r.s} ${r.b.error || ""}`);

  /* ⚠⚠ **עלויות אינן נתון של חניך** (עיקרון 4). */
  if (demo) {
    const S2 = jar();
    await call(S2, "POST", "/api/auth?action=signin",
      { user: DEMO_USER, password: DEMO_PASS });
    r = await call(S2, "GET", "/api/lessons?action=pay");
    ok("חניך אינו רואה את דוח התשלום", r.s === 403, `${r.s} ${r.b.error || ""}`);
  }
  r = await call(G, "PUT", "/api/lessons?action=pay", { id, price: 100 });
  ok("ומדריך אינו קובע מחיר", r.s === 403, `${r.s} ${r.b.error || ""}`);
  r = await call(G, "GET", "/api/lessons?action=pay");
  ok("אבל כן קורא את הדוח", r.s === 200, String(r.s));

  console.log("\n=== ניקוי ===");
  await cleanup();
  const left = (await allItems(LB.sheets)).filter((x) => x.name.includes("בדיקה"));
  ok("גיליון הבדיקה נמחק", left.length === 0, left.map((x) => x.name).join(", "));
  id = null;
} finally {
  await cleanup();
  await reg.restore();
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
