/* ============================================================
   מובילי השבוע — חשיפה בתחילת השבוע, ולא לפניה
   ------------------------------------------------------------
   ההחלטה (ראש המכינה, 23.9.2026): *"המובילשים זה כעקרון עניין
   שעושים אליו חשיפה בתחילת השבוע... אני רוצה שזה ישאר בסוד
   ולא יחשף לשאר החניכים עד 0:00 ביום שלמחרת תחילת השבוע."*

   ⚠⚠ **שני הכיוונים באותה הרצה.** טענה שהשמות מוסתרים היא
     ירוקה גם על שרת שהפסיק להחזיר מובילים בכלל, וטענה שהם
     מוצגים היא ירוקה גם על שרת שלא הסתיר מעולם. הגבול נבדק
     בשני התאריכים הצמודים — יום הפתיחה עצמו, והיום שאחריו.

   ⚠ **`?today=` ולא המתנה ליום שיעבור.** השער חסום בכל דיפלוי
     (api/_test-date.js), ובלעדיו אי אפשר לבדוק גבול של חצות.

   ⚠ **כתיבה אחת בלבד, והיא הפיכה**: חשבון הבדיקה משובץ זמנית
     לשבוע **שאין לו מובילים** — כלומר שורה שאיש לא נגע בה
     (5א) — ומוחזר לרשימה הריקה ב-finally. בלי השיבוץ הזה
     `?action=lead-week` מחזיר 403 ואי אפשר לבדוק את המסלול
     בכלל, כי חשבון הבדיקה אינו מוביל אף שבוע.

   ⚠ **ומה שאי אפשר לבדוק דרך חשבון הבדיקה נבדק ישירות.**
     החשבון נושא את כל חמשת התפקידים — כולל אב בית — ולכן
     במסך התורניות הוא **תמיד** רואה את המובילים (החריג
     התפעולי). הטענה על חניך רגיל שם נבדקת מול `maySeeLeaders`
     עצמה, בדיוק כמו `mayChores` ב-chores-test (5כז).
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { loadLeaderWeeks } from "../../api/_leader-weeks.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../../shared/mechina-boards.js";
import {
  maySeeLeaders, leadersRevealed, revealDate, leadSecretNote,
} from "../../shared/lead-secret.js";

const B = "http://localhost:5173";
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
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
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 250) }; }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const W = MECHINA_COLS.leaderWeeks;
const addD = (iso, n) => {
  const d = new Date(String(iso) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ============================================================
   1. הכלל עצמו — פונקציה טהורה, בלי רשת
   ============================================================ */
console.log("\n=== הכלל ===");
ok("יום הפתיחה עצמו — טרם נחשף",
  leadersRevealed("2026-09-22", "2026-09-22") === false);
ok("היום שאחריו — נחשף",
  leadersRevealed("2026-09-22", "2026-09-23") === true);
ok("ויום לפני הפתיחה — טרם נחשף",
  leadersRevealed("2026-09-22", "2026-09-21") === false);
/* ⚠ גבולות חודש ושנה — `Date` מקומי היה מזיז אותם ביום שלם. */
ok("החשיפה חוצה חודש", revealDate("2026-09-30") === "2026-10-01",
  revealDate("2026-09-30"));
ok("וגם שנה", revealDate("2026-12-31") === "2027-01-01",
  revealDate("2026-12-31"));
/* ⚠ שורה שבורה בלוח נחשבת חשופה — הסתרה שקטה בגללה הייתה
   מוחקת מידע תפעולי אמיתי בלי שאיש ידע למה (עיקרון 6). */
ok("שבוע בלי תאריך פתיחה נחשב חשוף",
  leadersRevealed("", "2026-09-22") === true);
ok("והנוסח נושא את התאריך",
  /24\/09/.test(leadSecretNote("2026-09-23")), leadSecretNote("2026-09-23"));

const day0 = { start: "2026-09-22", today: "2026-09-22" };
ok("חניך רגיל ביום הפתיחה — אינו רואה",
  maySeeLeaders(day0) === false);
ok("צוות רואה", maySeeLeaders({ ...day0, staff: true }) === true);
/* ⚠ המובילים עצמם — ההכנה מראש היא כל התכלית (5יא). */
ok("והמובילים עצמם רואים", maySeeLeaders({ ...day0, isLeader: true }) === true);
/* ⚠ מי שמשבץ תורנויות — החריג התפעולי: השרת חוסם שיבוץ של
   מוביל, והודעת ה-403 נושאת את השם ממילא (4יד). */
ok("ומי שמשבץ תורנויות רואה", maySeeLeaders({ ...day0, assigns: true }) === true);
ok("ואחרי החשיפה כולם רואים",
  maySeeLeaders({ start: "2026-09-22", today: "2026-09-23" }) === true);

/* ============================================================
   2. דרך השרת
   ============================================================ */
const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }

const weeks = await loadLeaderWeeks();
/* ⚠ **נבחר לפי התכונה שנבדקת ולא לפי מיקום** — שבוע עם מובילים
   שחשבון הבדיקה אינו אחד מהם, וזה בדיוק המצב שנבדק. */
const other = weeks.find((w) => (w.leaderIds || []).length > 0
  && (w.spanStart || w.start)
  && !(w.leaderIds || []).map(String).includes(String(demo.id)));
/* ⚠ והשבוע שחשבון הבדיקה ישובץ אליו — **בלי מובילים**, כלומר
   שורה שאיש לא נגע בה, וההחזרה שלה היא רשימה ריקה. */
/* ⚠ **`assignable` ולא "הראשון הפנוי".** שבוע חג או סדרה אינו
   פתוח לשיבוץ, והשרת דוחה אותו ב-400 — כלומר הבדיקה הייתה
   נופלת על כלל אחר לגמרי. נבחר לפי התכונה שנדרשת. */
const empty = weeks.find((w) => (w.leaderIds || []).length === 0
  && w.assignable && w.start && w.end
  && String(w.id) !== String(other && other.id));

if (!other) {
  console.log("  X אין שבוע עם מובילים שחשבון הבדיקה אינו מוביל");
  fail++;
} else if (!empty) {
  console.log("  X אין שבוע פנוי לשיבוץ זמני");
  fail++;
} else {
  const raw = await allItems(MECHINA_BOARDS.leaderWeeks);
  const emptyRow = raw.find((i) => String(i.id) === String(empty.id));
  console.log(`\nשבוע נבדק: ${other.num} · ${other.spanStart || other.start}`);
  console.log(`שבוע לשיבוץ זמני: ${empty.num} · ${empty.start}`);

  const users = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
    .boards[0].items_page.items;
  const codeOf = (t) => cv(users.find((x) => x.name.includes(t)), AUTH_COLS.code);

  const reg = await tempRegister("דני לויט");
  const M = jar();
  let r = await call(M, "POST", "/api/auth?action=login", { code: codeOf("דני לויט") });
  if (r.s !== 200) { console.log("כניסה נכשלה", r.b); await reg.restore(); process.exit(1); }

  const setLeaders = async (weekId, ids) => {
    const x = await call(M, "POST", "/api/students?action=weeks",
      { weekId: String(weekId), studentIds: ids.map(String) });
    if (x.s !== 200) throw new Error(`שיבוץ נכשל: ${x.s} ${x.b.error || ""}`);
  };

  const start = other.spanStart || other.start;
  const before = addD(start, -0);       // יום הפתיחה עצמו
  const after = addD(start, 1);         // 0:00 שלמחרת
  const nLeaders = (other.leaderIds || []).length;
  const url = (today) =>
    `/api/students?action=lead-week&week=${other.id}&today=${today}`;

  try {
    /* ⚠ בלי השיבוץ הזמני `mayEnter` מחזיר false וכל הסעיף הזה
       היה 403 — כלומר "עבר" מסיבה שאינה הכלל הנבדק. */
    await setLeaders(empty.id, [demo.id]);

    const S = jar();
    r = await call(S, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });
    ok("חשבון הבדיקה נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);

    console.log("\n=== שבוע של מישהו אחר, ביום הפתיחה ===");
    r = await call(S, "GET", url(before));
    ok("המסך נפתח", r.s === 200, `${r.s} ${r.b.error || ""}`);
    const w1 = (r.b || {}).week || {};
    ok("והשמות אינם בגוף התשובה", Array.isArray(w1.leaders) && w1.leaders.length === 0,
      JSON.stringify(w1.leaders || null));
    ok("ונאמר שהם ייחשפו", w1.leadersHidden === true && Boolean(w1.leadersNote),
      String(w1.leadersNote));

    console.log("\n=== אותו שבוע, 0:00 שלמחרת ===");
    r = await call(S, "GET", url(after));
    const w2 = (r.b || {}).week || {};
    /* ⚠⚠ זה הכיוון שנועל את הראשון: בלעדיו הטענה למעלה הייתה
       ירוקה גם על שרת שהפסיק להחזיר מובילים לגמרי. */
    ok("השמות מופיעים", (w2.leaders || []).length === nLeaders,
      `${(w2.leaders || []).length} מתוך ${nLeaders}`);
    ok("ואין יותר הודעת הסתרה", !w2.leadersHidden && !w2.leadersNote);

    console.log("\n=== השבוע שלי, ביום הפתיחה ===");
    r = await call(S, "GET",
      `/api/students?action=lead-week&week=${empty.id}&today=${empty.start}`);
    const w3 = (r.b || {}).week || {};
    /* ⚠ מוביל שיגלה ביום ראשון בבוקר שהוא מוביל כבר איחר את
       ההכנה — הסוד הוא מהאחרים, לא ממנו (5יא). */
    ok("המוביל רואה את השבוע שלו", (w3.leaders || []).length === 1 && !w3.leadersHidden,
      `${(w3.leaders || []).length} · hidden=${w3.leadersHidden}`);
    ok("ומסומן שזה טרם פומבי", Boolean(w3.leadersPrivate), String(w3.leadersPrivate));

    console.log("\n=== צוות ===");
    r = await call(M, "GET", url(before));
    const w4 = (r.b || {}).week || {};
    ok("הצוות רואה גם ביום הפתיחה",
      (w4.leaders || []).length === nLeaders && !w4.leadersHidden,
      `${(w4.leaders || []).length} מתוך ${nLeaders}`);

    /* ============================================================
       מסך התורניות — החריג התפעולי
       ⚠ חשבון הבדיקה הוא אב בית, ולכן הוא **אמור** לראות. מה
         שנבדק כאן הוא שהוא גם **יודע** שזה טרם פומבי: בלי זה
         הוא היה מכריז על השמות ברצועה בלי לדעת שהם סוד.
       ============================================================ */
    console.log("\n=== התורניות · מי שמשבץ ===");
    r = await call(S, "GET", `/api/chores?action=view&week=${other.id}&today=${before}`);
    ok("המסך נפתח", r.s === 200, `${r.s} ${r.b.error || ""}`);
    const p1 = ((r.b || {}).periods || []).find((p) =>
      (p.ids || []).map(String).includes(String(other.id)));
    ok("אב הבית רואה את השמות", Boolean(p1) && (p1.leaderNames || []).length === nLeaders,
      p1 ? `${(p1.leaderNames || []).length} מתוך ${nLeaders}` : "התקופה לא חזרה");
    ok("ומסומן שזה טרם נחשף", Boolean(p1) && Boolean(p1.leadersPrivate),
      p1 ? String(p1.leadersPrivate) : "—");
    r = await call(S, "GET", `/api/chores?action=view&week=${other.id}&today=${after}`);
    const p2 = ((r.b || {}).periods || []).find((p) =>
      (p.ids || []).map(String).includes(String(other.id)));
    ok("ואחרי החשיפה הסימון יורד", Boolean(p2) && !p2.leadersPrivate,
      p2 ? String(p2.leadersPrivate) : "התקופה לא חזרה");
  } catch (e) {
    console.log("  X נפילה: " + (e && e.message));
    fail++;
  } finally {
    /* ⚠ **ההחזרה היא לרשימה שהייתה — ריקה.** לא "מחיקה של מה
       שיצרנו": השיבוץ הוא עמודת קישור, ולא שורה. */
    try {
      await setLeaders(empty.id, []);
      const back = await allItems(MECHINA_BOARDS.leaderWeeks);
      const now = back.find((i) => String(i.id) === String(empty.id));
      const ids = ((now.column_values.find((c) => c.id === W.leaders) || {}).linked_item_ids || []);
      ok("השיבוץ הזמני הוסר", ids.length === 0, `${ids.length} · היה ${
        ((emptyRow.column_values.find((c) => c.id === W.leaders) || {}).linked_item_ids || []).length}`);
    } catch (e) {
      console.log("  X הניקוי נכשל — לבדוק ביד: " + (e && e.message));
      fail++;
    }
    await reg.restore();
  }
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
