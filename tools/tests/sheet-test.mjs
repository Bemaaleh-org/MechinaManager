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

    /* ============================================================
       ⚠⚠ **חשבון הבדיקה נושא אחראי לו״ז, ולכן הוא כן מגיע.**

       כאן היה כתוב `403` על שני המסלולים, וזה היה נכון כל עוד
       חשבון הבדיקה היה חניך בלי תפקידים. הוא נושא חמישה (4ת)
       ובהם **אחראי לו״ז** — כלומר 200 הוא התשובה הנכונה, ושלוש
       הטענות נפלו על התנהגות תקינה.

       ⚠ **וזה בדיוק המצב של perm-test ו-chores-test (5כז):**
         דרך החשבון הזה אי אפשר לבדוק את הצד החוסם **כלל**.
         לכן הטענה מול השרת נגזרת מהזכויות בפועל, והכלל עצמו
         נבדק טהור מול `lessonRights` — בשני הכיוונים.
       ============================================================ */
    const { lessonRights } = await import("../../api/_lesson-rights.js");
    const meS = await call(S, "GET", "/api/auth?action=me");
    const mayRead = (await lessonRights(meS.b)).read;
    r = await call(S, "GET", "/api/lessons?action=sheet&id=" + id);
    ok(`הגיליון תואם את lessonRights.read (${mayRead})`,
      r.s === (mayRead ? 200 : 403), `${r.s} · isScheduler=${meS.b.isScheduler}`);
    r = await call(S, "GET", "/api/lessons?action=list");
    ok("וגם רשימת הגיליונות", r.s === (mayRead ? 200 : 403), String(r.s));

    /* ⚠ הכלל עצמו — חניך בלי תפקיד נחסם, ואחראי לו״ז נפתח. */
    ok("lessonRights חוסם חניך בלי תפקיד",
      (await lessonRights({ isStudent: true })).read === false);
    ok("ופותח לאחראי הלו״ז",
      (await lessonRights({ isStudent: true, isScheduler: true })).read === true);
    ok("ולכל כניסת צוות",
      (await lessonRights({ isManager: true })).read === true);

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
    /* ⚠ **אחראי הלו״ז כן רואה — הוא מסכם עם המרצים** (5ו),
       וחשבון הבדיקה נושא את התפקיד. הטענה נגזרת מהזכות
       בפועל, והכלל נבדק טהור מתחתיה. */
    const meP = await call(S2, "GET", "/api/auth?action=me");
    const mayP = Boolean(!meP.b.isStudent || meP.b.isScheduler);
    r = await call(S2, "GET", "/api/lessons?action=pay");
    ok(`דוח התשלום תואם את הכלל (${mayP})`, r.s === (mayP ? 200 : 403),
      `${r.s} · isScheduler=${meP.b.isScheduler}`);
    /* ⚠⚠ **והכיוון שחשוב באמת: חניך רגיל אינו רואה כסף.**
       מוביל שבוע מדווח על קיום מפגשים ואינו רואה מחירים —
       וזו הסיבה שהבדיקה היא `isScheduler` ולא שלילת `isLeader`. */
    r = await call(S2, "GET", "/api/lessons?action=rate");
    ok("ודירוג השיעורים אינו נושא מחירים",
      r.s === 200 && !/"price"/.test(JSON.stringify(r.b)), String(r.s));
  }
  r = await call(G, "PUT", "/api/lessons?action=pay", { id, price: 100 });
  ok("ומדריך אינו קובע מחיר", r.s === 403, `${r.s} ${r.b.error || ""}`);
  r = await call(G, "GET", "/api/lessons?action=pay");
  ok("אבל כן קורא את הדוח", r.s === 200, String(r.s));

  /* ============================================================
     הוצאת שיעור מדוח התשלום
     ------------------------------------------------------------
     ⚠ **על הגיליון שהבדיקה יצרה בלבד.** הפיכת התיבה על שיעור
       אמיתי משנה מספר כסף שהמכינה מסתכלת עליו — ו"מחזירים
       בסוף" אינו מספיק כשהכתיבה היא על שורה קיימת (5א).
     ============================================================ */
  console.log("\n=== הוצאה מדוח התשלום ===");
  r = await call(M, "GET", "/api/lessons?action=pay");
  ok("המסך יודע אם העמודה הוקמה",
    typeof r.b.excludeReady === "boolean", String(r.b.excludeReady));
  ok("ומי רשאי להוציא נקבע בשרת",
    r.b.canExclude === true, String(r.b.canExclude));

  if (r.b.excludeReady) {
    await call(M, "PUT", "/api/lessons?action=pay", { id, price: 450 });
    r = await call(M, "PUT", "/api/lessons?action=pay", { id, noPay: true });
    ok("הגיליון הוצא מהדוח", r.s === 200, `${r.s} ${r.b.error || ""}`);

    r = await call(M, "GET", "/api/lessons?action=pay");
    /* ⚠⚠ **הטענה המרכזית: הוצאה מוצגת ואינה נעלמת.** הוצאה
       שאי אפשר לראות היא הוצאה שאיש לא יזכור, ואז מרצה שכן
       צריך תשלום פשוט אינו בדוח בלי שום סימן. */
    ok("והוא מופיע ברשימת מה שהוצא",
      (r.b.excluded || []).some((x) => String(x.sheetId) === String(id)),
      JSON.stringify((r.b.excluded || []).map((x) => x.subject)));
    ok("ואינו ברשימת המחירים",
      !(r.b.rows || []).some((x) => String(x.sheetId) === String(id)),
      "הגיליון עדיין בדוח");

    /* ⚠ **הגיליון נשאר פעיל בכל שאר המערכת** — זו עמודה של
       הדוח ולא של השיעור. כיבוי active היה מוריד אותו מהכול. */
    d = await mine();
    ok("והשיעור עצמו נשאר פעיל", d.sheet.active === true, String(d.sheet.active));

    /* ⚠ אחראי הלו״ז קובע מחיר ואינו מוציא מהדוח — שתי שאלות,
       ולא הרשאה אחת. */
    if (demo) {
      const S3 = jar();
      await call(S3, "POST", "/api/auth?action=signin",
        { user: DEMO_USER, password: DEMO_PASS });
      r = await call(S3, "PUT", "/api/lessons?action=pay", { id, noPay: false });
      ok("וחניך אינו מחזיר אותו", r.s === 403, `${r.s} ${r.b.error || ""}`);
    }

    r = await call(M, "PUT", "/api/lessons?action=pay", { id, noPay: false });
    ok("וההוצאה הפיכה", r.s === 200, `${r.s} ${r.b.error || ""}`);
    r = await call(M, "GET", "/api/lessons?action=pay");
    ok("והגיליון חזר לדוח",
      !(r.b.excluded || []).some((x) => String(x.sheetId) === String(id)),
      "עדיין ברשימת המוצאים");
  } else {
    r = await call(M, "PUT", "/api/lessons?action=pay", { id, noPay: true });
    ok("ובלי העמודה — 503 מפורש ולא כישלון סתום",
      r.s === 503 && r.b.setupRequired === true, `${r.s} ${r.b.error || ""}`);
  }

  /* ============================================================
     ⚠⚠ **שני מפגשים באותו יום** (בקשת ראש המכינה,
     16.9.2026: "לפעמים יש שני שיעורי מדעי המדינה
     באותו היום").

     ⚠ **שני הכיוונים באותה הרצה:** בלי אישור זה
       409 עם `sameDate` (ולא שגיאה סתומה), ועם אישור זה
       נשמר. הטענה השנייה לבדה הייתה נשארת ירוקה גם
       אילו הוסר החיכוך לגמרי, ואז לחיצה כפולה יוצרת
       מפגש רפאים בשקט.

     ⚠ שני המפגשים נמחקים **לפי המזהה שחזר מה-POST**
       ולא לפי סינון — הפעולה נוגעת בלוח שני (מפגשים)
       ולא רק בלוח הגיליונות.
     ============================================================ */
  console.log("\n=== שני מפגשים באותו יום ===");
  const DAY = "2027-05-11";           /* רחוק, על גיליון הבדיקה בלבד */
  const mtgs = [];
  try {
    r = await call(M, "POST", "/api/lessons?action=meeting",
      { sheetId: id, date: DAY, planned: "כן" });
    ok("מפגש ראשון נוצר", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
    if (r.b.id) mtgs.push(r.b.id);

    r = await call(M, "POST", "/api/lessons?action=meeting",
      { sheetId: id, date: DAY, planned: "כן" });
    ok("שני בלי אישור → 409 עם sameDate",
      r.s === 409 && r.b.sameDate === 1, `${r.s} sameDate=${r.b.sameDate}`);

    r = await call(M, "POST", "/api/lessons?action=meeting",
      { sheetId: id, date: DAY, planned: "כן", same: true });
    ok("ועם אישור נשמר", r.s === 200 && r.b.id, `${r.s} ${r.b.error || ""}`);
    if (r.b.id) mtgs.push(r.b.id);

    /* ⚠ והמספר גדל עם כל מפגש — הודעה שאומרת "אחד"
       על שלושה היא הסיבה שהספירה בתשובה ולא בוליאני. */
    r = await call(M, "POST", "/api/lessons?action=meeting",
      { sheetId: id, date: DAY, planned: "כן" });
    ok("והמניין עולה לשניים", r.s === 409 && r.b.sameDate === 2,
      `${r.s} sameDate=${r.b.sameDate}`);
  } finally {
    for (const mid of mtgs) {
      await call(M, "DELETE", "/api/lessons?action=meeting", { meetingId: mid });
    }
  }
  r = await call(M, "GET", "/api/lessons?action=sheet&id=" + id);
  ok("ושני מפגשי הבדיקה נמחקו",
    !(r.b.meetings || []).some((m) => m.date === DAY),
    (r.b.meetings || []).filter((m) => m.date === DAY).length + " נשארו");

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
