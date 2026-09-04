/* ============================================================
   מסלול הזהות מקצה לקצה
   ------------------------------------------------------------
   ⚠ הבדיקה עובדת על חניך אחד, שומרת את מצב העמודות שלו לפני
     ומחזירה אותן בסוף — כולל אם נכשלה באמצע.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { MECHINA_BOARDS as MB, MECHINA_COLS as MC } from "../../shared/mechina-boards.js";
import { CRED_COLS } from "../../shared/cred-ids.js";

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

const T = CRED_COLS.student;
const CIDS = Object.values(T).map((x) => `"${x}"`).join(",");

const roster = (await gql(`{ boards(ids:[${MB.roster}]){ items_page(limit:100){ items{
  id name column_values(ids:["${MC.roster.tz}","${MC.roster.active}",${CIDS}]){ id text } } } } }`))
  .boards[0].items_page.items.filter((x) => cv(x, MC.roster.tz) && cv(x, MC.roster.active) === "v");

const me = roster[0];
const TZ = cv(me, MC.roster.tz).replace(/\D/g, "");
const before = Object.fromEntries(Object.entries(T).map(([k, id]) => [id, cv(me, id)]));
console.log(`חניך הבדיקה: ${me.name}`);

const restore = async () => {
  await gql(`mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: MB.roster, i: me.id, v: JSON.stringify(before) });
};

try {
  /* ============ 1 · כניסה ראשונה עם ת"ז ============ */
  console.log("\n=== כניסה ראשונה ===");
  await restore(); // מתחילים ממצב "טרם נקבעה זהות"

  let r = await call(jar(), "POST", "/api/auth?action=signin", { user: TZ, password: "לאנכון" });
  ok("ת\"ז עם סיסמה שגויה נדחית", r.s === 401, `${r.s} ${r.b.error || ""}`);

  const S = jar();
  r = await call(S, "POST", "/api/auth?action=signin", { user: TZ, password: TZ });
  ok("ת\"ז + ת\"ז נכנסת", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("  ומסומנת כהקמה", r.b.setup === true, String(r.b.setup));

  /* ⚠ העיקר: סשן בהקמה חסום בכל מקום אחר */
  r = await call(S, "GET", "/api/students?action=year");
  ok("סשן בהקמה חסום משאר המערכת", r.s === 403, `${r.s} ${r.b.error || ""}`);
  r = await call(S, "GET", "/api/auth?action=account");
  ok("אבל מגיע למסך החשבון", r.s === 200, `${r.s} ${r.b.error || ""}`);
  ok("  שאומר לו שהוא בהקמה", r.b.setup === true);
  ok("  ולעולם אינו מחזיר סיסמה", !("hash" in r.b) && !("password" in r.b),
    Object.keys(r.b).join(","));

  /* ============ 2 · קביעת שם וסיסמה ============ */
  console.log("\n=== קביעת שם וסיסמה ===");
  const USER = "bodek.test";
  const PASS = "mechina-2026!";

  r = await call(S, "POST", "/api/auth?action=account", { user: "ab", password: PASS });
  ok("שם קצר נדחה", r.s === 400, r.b.error);
  r = await call(S, "POST", "/api/auth?action=account", { user: USER, password: "1234" });
  ok("סיסמה קצרה נדחית", r.s === 400, r.b.error);
  r = await call(S, "POST", "/api/auth?action=account", { user: USER, password: TZ });
  ok("תעודת זהות כסיסמה נדחית", r.s === 400, r.b.error);
  r = await call(S, "POST", "/api/auth?action=account", { user: TZ, password: PASS });
  ok("שם משתמש שהוא ת\"ז נדחה", r.s === 400, r.b.error);

  /* ⚠ אימייל חובה בכניסה ראשונה */
  r = await call(S, "POST", "/api/auth?action=account", { user: USER, password: PASS });
  ok("בלי אימייל — נחסם", r.s === 400, r.b.error);
  r = await call(S, "POST", "/api/auth?action=account",
    { user: USER, password: PASS, email: "לא-כתובת" });
  ok("אימייל לא תקין — נחסם", r.s === 400, r.b.error);

  const MAIL = "bodek.test@example.com";
  r = await call(S, "POST", "/api/auth?action=account",
    { user: USER, password: PASS, email: MAIL });
  ok("שם, סיסמה ואימייל תקינים נשמרים", r.s === 200, r.b.error);
  ok("  והסשן משוחרר מההקמה", r.b.setup === false);

  r = await call(S, "GET", "/api/students?action=year");
  ok("ומכאן המערכת פתוחה", r.s === 200, `${r.s} ${r.b.error || ""}`);

  /* ⚠ מה שנשמר בלוח הוא גיבוב ולא סיסמה */
  const row = (await gql(`{ items(ids:[${me.id}]){ column_values(ids:[${CIDS}]){ id text } } }`)).items[0];
  const stored = cv(row, T.pass);
  ok("בלוח נשמר גיבוב ולא סיסמה", stored.startsWith("scrypt$") && !stored.includes(PASS),
    stored.slice(0, 22) + "…");
  ok("ושם המשתמש נשמר", cv(row, T.user) === USER, cv(row, T.user));

  /* ============ 3 · כניסה עם השם החדש ============ */
  console.log("\n=== כניסה רגילה ===");
  const S2 = jar();
  r = await call(S2, "POST", "/api/auth?action=signin", { user: USER, password: PASS });
  ok("שם וסיסמה נכנסים", r.s === 200, r.b.error);
  ok("  ולא בהקמה", r.b.setup === false);
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: USER, password: PASS + "x" });
  ok("סיסמה שגויה נדחית", r.s === 401, `${r.s}`);
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: "BODEK.TEST", password: PASS });
  ok("שם משתמש אינו תלוי רישיות", r.s === 200, `${r.s}`);
  /* ============================================================
     ⚠ כניסה גם באימייל — לא רק בשם משתמש.
     ------------------------------------------------------------
     מי שזה עתה איפס סיסמה דרך המייל מנסה להיכנס עם אותה כתובת,
     כי זה מה שהיה מול העיניים שלו. דרישה שיזכור דווקא את שם
     המשתמש היא בדיוק הרגע שבו הוא נתקע שוב.
     ============================================================ */
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: MAIL, password: PASS });
  ok("כניסה עם אימייל", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(jar(), "POST", "/api/auth?action=signin",
    { user: MAIL.toUpperCase(), password: PASS });
  ok("  ואינה תלויה ברישיות", r.s === 200, `${r.s}`);
  r = await call(jar(), "POST", "/api/auth?action=signin",
    { user: MAIL, password: PASS + "x" });
  ok("  אבל סיסמה שגויה עדיין נדחית", r.s === 401, `${r.s}`);
  r = await call(jar(), "POST", "/api/auth?action=signin",
    { user: "אין-כזה@example.com", password: PASS });
  ok("  ואימייל שאינו רשום נדחה", r.s === 401, `${r.s}`);
  /* ============================================================
     ⚠ **ת"ז כבר אינה פותחת דלת — והתשובה היא 409, לא 401.**

     הטענה כאן ציפתה ל-401 ונכתבה לפני שנוספה ההודעה "כבר
     נרשמת". מי שנרשם פעם אחת, חוזר כעבור חודש, ומקליד את
     תעודת הזהות בשני השדות — קיבל "שם משתמש או סיסמה שגויים",
     הודעה נכונה שאינה עוזרת, והסיק שהחשבון נמחק (4ע).

     ⚠ **מה שנבדק כאן הוא שהדלת סגורה, לא איזה מספר חוזר.**
       לכן שלוש טענות: הסטטוס, תוכן ההודעה, ו-**שלא הונפקה
       עוגיית סשן**. בלי האחרונה, 409 שמלווה בסשן מלא נראה
       בדיוק כמו חסימה.

     ⚠ הטענה נכשלה בשקט סשן שלם, כי החבילה לא יצאה בקוד שגיאה.
     ============================================================ */
  const tzJar = jar();
  r = await call(tzJar, "POST", "/api/auth?action=signin", { user: TZ, password: TZ });
  ok("ת\"ז כבר אינה פותחת את הדלת", r.s === 409, `${r.s}`);
  ok("  וההודעה מפנה לשם משתמש וסיסמה",
    /כבר נרשמת/.test(r.b.error || ""), r.b.error);
  ok("  ולא הונפקה עוגיית סשן", !tzJar.get(), tzJar.get());

  /* ============ 4 · אותה הודעה לכל כישלון ============ */
  console.log("\n=== אין דליפת מידע ===");
  const a = await call(jar(), "POST", "/api/auth?action=signin", { user: USER, password: "שגוי-לגמרי" });
  const b = await call(jar(), "POST", "/api/auth?action=signin", { user: "אין-כזה-משתמש", password: "שגוי-לגמרי" });
  ok("\"סיסמה שגויה\" ו\"אין משתמש\" זהות", a.b.error === b.b.error && a.s === b.s,
    `${a.b.error} / ${b.b.error}`);

  /* ============ 5 · החלפת סיסמה ============ */
  console.log("\n=== החלפת סיסמה ===");
  /* ⚠ החובה חלה על כניסה ראשונה בלבד — מי שכבר בפנים אינו
     נחסם בגלל שדה שלא היה קיים כשנכנס. */
  r = await call(S2, "POST", "/api/auth?action=account", { current: "לא-נכון", password: "chadash-2026!" });
  ok("בלי הסיסמה הנוכחית — נחסם", r.s === 403, r.b.error);
  r = await call(S2, "POST", "/api/auth?action=account", { current: PASS, password: "chadash-2026!" });
  ok("עם הסיסמה הנוכחית — עובר", r.s === 200, r.b.error);
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: USER, password: "chadash-2026!" });
  ok("והחדשה עובדת", r.s === 200);
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: USER, password: PASS });
  ok("והישנה כבר לא", r.s === 401);

  /* ============ 6 · שכחתי סיסמה ============ */
  console.log("\n=== שכחתי סיסמה ===");
  const t0 = await call(jar(), "POST", "/api/auth?action=recover", { user: "אין-כזה-בכלל" });
  const t1 = await call(jar(), "POST", "/api/auth?action=recover", { user: USER });
  ok("אותה תשובה למשתמש קיים ולא קיים",
    t0.s === t1.s && t0.b.message === t1.b.message, `${t0.s}/${t1.s}`);

  const after = (await gql(`{ items(ids:[${me.id}]){ column_values(ids:[${CIDS}]){ id text } } }`)).items[0];
  const reset = cv(after, T.reset);
  ok("נוצר קוד איפוס", Boolean(reset), reset.slice(0, 18) + "…");
  /* ⚠ הבאג שהיה כאן: כשהמייל נכשל האסימון נשאר אסימון־מייל,
     המשתמש לא קיבל דבר ולמנהל לא היה קוד למסור. עכשיו הקוד
     הידני נכתב **קודם** ומוחלף רק אם המייל באמת יצא. */
  ok("  והוא בן שש ספרות", /^hand:\d{6}\|/.test(reset), reset.slice(0, 12));
  ok("  והקוד אינו חוזר בתשובה", !JSON.stringify(t1.b).includes(reset.slice(5, 11)),
    JSON.stringify(t1.b).slice(0, 60));

  const code = reset.slice(5, reset.indexOf("|"));
  /* ============================================================
     ⚠ נוסח המכתב עצמו — לא רק שהזרימה עובדת.
     ------------------------------------------------------------
     באג שנשלח לייצור: resetLetter נשאר עם החתימה הישנה
     ({name, link}) בעוד הקורא כבר העביר {name, code}. התוצאה
     הייתה מכתב עם שורה ריקה במקום הקוד — והבדיקות עברו, כי
     הן בדקו רק שהאיפוס עובד ולא **מה נשלח**.
     ============================================================ */
  {
    const { resetLetter } = await import("../../api/_mailer.js");
    const l = resetLetter({ name: "ישראל ישראלי", code: "482913", minutes: 60 });
    const lines = l.text.split("\n");
    ok("המכתב מכיל את הקוד", l.text.includes("482913"), lines[5]);
    ok("  והקוד גם בשורת הנושא", l.subject.includes("482913"), l.subject);
    ok("  ואין בו קישור", !l.text.includes("קישור") && !l.text.includes("http"));
    ok("  ואין בו undefined", !l.text.includes("undefined"));
    ok("  ופונה בשם הפרטי", lines[0] === "שלום ישראל,", lines[0]);
  }

  const RU = `user=${encodeURIComponent(USER)}`;
  r = await call(jar(), "GET", `/api/auth?action=recover&${RU}&token=${code}`);
  ok("הקוד תקף", r.s === 200, `${r.s} ${r.b.error || ""}`);
  r = await call(jar(), "GET", `/api/auth?action=recover&${RU}&token=999999`);
  ok("קוד שגוי נדחה", r.s === 404, `${r.s}`);
  /* ⚠ העיקר: הקוד קשור למשתמש. בלי זה ניחוש מוצלח היה פותח
     את החשבון של מי שבמקרה מחזיק באותו קוד. */
  r = await call(jar(), "GET", `/api/auth?action=recover&user=%D7%9C%D7%90-%D7%A7%D7%99%D7%99%D7%9D&token=${code}`);
  ok("קוד נכון של משתמש אחר נדחה", r.s === 404, `${r.s}`);
  r = await call(jar(), "GET", `/api/auth?action=recover&token=${code}`);
  ok("ובלי שם משתמש בכלל — נדחה", r.s === 400, `${r.s}`);

  /* ============ ⚠ הקוד אינו מוצג לאיש ============
     מדריך שרואה קוד איפוס של חניך אחר מחזיק מפתח לחשבון
     שאינו שלו. הקוד נשלח למייל בלבד. */
  {
    const { AUTH_BOARD, AUTH_COLS } = await import("../../shared/auth-board.js");
    const staff = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
      .boards[0].items_page.items;
    for (const who of ["דני", "נעם"]) {
      const A = jar();
      await call(A, "POST", "/api/auth?action=login",
        { code: cv(staff.find((x) => x.name.includes(who)), AUTH_COLS.code) });
      const n = await call(A, "GET", "/api/auth?action=notify");
      ok(`${who} אינו רואה קוד איפוס בהתראות`,
        !(n.b.notes || []).some((x) => x.kind === "סיסמה"));
    }
  }

  r = await call(jar(), "POST", "/api/auth?action=recover",
    { token: code, password: "sofi-2026!" });
  ok("איפוס בלי שם משתמש נדחה", r.s === 400, `${r.s}`);
  r = await call(jar(), "POST", "/api/auth?action=recover",
    { user: USER, token: code, password: "sofi-2026!" });
  ok("איפוס עם שם משתמש וקוד עובד", r.s === 200, r.b.error);
  r = await call(jar(), "POST", "/api/auth?action=signin", { user: USER, password: "sofi-2026!" });
  ok("והסיסמה החדשה נכנסת", r.s === 200);
  /* ⚠ שימוש אחד בלבד */
  r = await call(jar(), "POST", "/api/auth?action=recover",
    { user: USER, token: code, password: "shuv-2026!" });
  ok("הקוד נשרף אחרי שימוש", r.s === 404, `${r.s}`);

} finally {
  console.log("\n=== ניקוי ===");
  await restore();
  const back = (await gql(`{ items(ids:[${me.id}]){ column_values(ids:[${CIDS}]){ id text } } }`)).items[0];
  const clean = Object.values(T).every((id) => cv(back, id) === (before[id] || ""));
  ok("כל עמודות הזהות הוחזרו כפי שהיו", clean);
  const r = await fetch(B + "/api/students?action=login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tz: TZ }) });
  ok("והכניסה הישנה עם ת\"ז עדיין עובדת", r.status === 200, String(r.status));
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
