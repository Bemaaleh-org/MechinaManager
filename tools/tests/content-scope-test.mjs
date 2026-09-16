/* ============================================================
   ועדת קבוצה ותוכן — מוגבלת לגיליונות שלה
   ------------------------------------------------------------
     npm test -- content-scope

   ⚠⚠ **הרקע:** עד 15.9.2026 `lessonRights.write` היה בוליאני
     אחד בלי פרמטר של גיליון, ולכן חבר ועדה יכול היה לערוך את
     **כל 21 הגיליונות**. ראש המכינה התכוון לשלושה, בדק, וזה
     תוקן. הבדיקה הזו היא מה שמונע חזרה.

   ⚠⚠ **ושני הכיוונים באותה הרצה:**
       · הוועדה רואה **רק** את המסומנים, ונחסמת בשאר
       · אחראי הלו״ז ממשיך לראות ולערוך את **כולם**

     הראשון לבדו היה נשאר ירוק גם אילו סגרנו בטעות את הלו״ז
     עצמו — וזו תקלה גרועה בהרבה מהבעיה שתיקנּו.

   ⚠ הבדיקה **אינה כותבת דבר**: היא בודקת קריאה, ואת הכתיבה
     היא בודקת במפגש שאינו קיים — שם 404 מגיע מהשער ולא
     מהנתונים, ושום שורה לא נוגעת.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { LESSON_BOARDS, LESSON_COLS, contentSheetsReady } from "../../shared/lessons-boards.js";
import { tempRegister } from "./_auth.mjs";
import { invalidate } from "../../api/_cache.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};

if (!contentSheetsReady()) {
  console.log("✗ טרם הוקם — npm run seed:content-sheets -- --go");
  console.log("0 עברו, 1 נכשלו");
  process.exit(1);
}

/* ---- מה מסומן בלוח (מקור האמת, ולא רשימה בקוד) ---- */
const sheets = (await gql(
  `query($b:[ID!],$c:[String!]){ boards(ids:$b){ items_page(limit:500){ items{ id name
     column_values(ids:$c){ text } } } } }`,
  { b: [LESSON_BOARDS.sheets], c: [LESSON_COLS.sheets.contentTeam] },
)).boards[0].items_page.items;
const marked = sheets.filter((s) => {
  const t = String(s.column_values[0]?.text || "").trim();
  return t === "v" || t === "✓";
});
const other = sheets.find((s) => !marked.some((m) => m.id === s.id));

console.log(`\nבלוח: ${sheets.length} גיליונות · ${marked.length} באחריות הוועדה`);
console.log("  " + marked.map((m) => m.name).join(" · "));
ok("יש גיליונות מסומנים", marked.length > 0, String(marked.length));
ok("ויש גם כאלה שאינם", Boolean(other), other ? other.name : "—");

const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const users = (await gql(
  `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{ id name
       column_values(ids:["${AUTH_COLS.code}"]){ id text } } } } }`,
)).boards[0].items_page.items;
const dani = users.find((u) => u.name.includes("דני לויט"));

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
  return { s: r.status, b: await r.json().catch(() => ({})) };
};

const regs = [];
try {
  regs.push(await tempRegister("דני לויט"));
  invalidate("auth-rows");

  /* ============ 1 · אחראי הלו״ז / הצוות — הכול ============ */
  console.log("\n1 · הצוות ממשיך לראות הכול");
  const S = jar();
  let r = await call(S, "POST", "/api/auth?action=login", { code: cv(dani, AUTH_COLS.code) });
  ok("נכנס", r.s === 200, `${r.s} ${r.b.error || ""}`);
  /* ============================================================
     ⚠⚠ **על תנאי ולא על זמן.**
     הטענה משווה קריאה טרייה מהלוח מול תשובת השרת,
     ומטמון הגיליונות יושב **בתהליך של השרת**. חבילה
     שרצה לפני (sheet-test יוצר גיליון ומוחק אותו) משאירה
     את השרת עם רשימה בת 22 בעוד בלוח 21 — והטענה
     נכשלת על **התנהגות נכונה לחלוטין**. זה בדיוק
     הכלל שכתוב ב-CLAUDE.md על מטמון השרת.
     ============================================================ */
  /* ⚠⚠ **והתקציב חייב לעלות על המטמון עצמו.** הלולאה
     הייתה 24×2ש׳ = 48 שניות, ומטמון הגיליונות בשרת
     הוא **חמש דקות** — כלומר כל הרצה של החבילה בתוך
     חמש דקות מ-`sheet-test` (שיוצר גיליון ומוחק אותו)
     נכשלה על "22 מתוך 21" — התנהגות נכונה לחלוטין.
     ההערה מעל תיארה בדיוק את הסצנריו הזה, והתקציב
     פשוט לא הספיק לו.
     ⚠ והמתנה על **תנאי** ולא על זמן: הלולאה נשברת
       באיטרציה הראשונה כשהכול תקין, והאיטיות היא
       במקרה הרע בלבד. */
  let seen = 0;
  for (let i = 0; i < 70; i++) {
    r = await call(S, "GET", "/api/lessons?action=list");
    seen = (r.b.sheets || []).length;
    if (r.s === 200 && seen === sheets.length) break;
    if (i === 24) console.log("    (ממתין לפקיעת מטמון הגיליונות — עד חמש דקות)");
    await new Promise((x) => setTimeout(x, 6000));
  }
  ok("רואה את כל הגיליונות", r.s === 200 && seen === sheets.length,
    `${r.s} ${seen} מתוך ${sheets.length}`);
  if (other) {
    r = await call(S, "GET", "/api/lessons?action=sheet&id=" + other.id);
    ok(`ונכנס לגיליון שאינו של הוועדה (${other.name})`, r.s === 200, String(r.s));
  }

  /* ============ 2 · הוועדה — רק שלה ============
     ⚠ נבדק ברמת `lessonRights` ישירות, כי חבר ועדה אמיתי
       אינו חשבון שאפשר להיכנס אליו בבדיקה — והשאלה כאן היא
       הכלל עצמו, לא מסלול הכניסה. אותו דפוס של chores-test
       (5כז), שבודק את `mayChores` ישירות. */
  console.log("\n2 · הוועדה — רק הגיליונות שלה");
  const { lessonRights } = await import("../../api/_lesson-rights.js");
  const { loadSheets } = await import("../../api/_lessons-data.js");
  const all = await loadSheets();

  /* ⚠⚠ **מה הבדיקה הזו כן מכסה ומה לא — במפורש.**

     `mayContent` נגזר משיבוץ אמיתי לוועדה, ואין חשבון בדיקה
     שמשובץ אליה — ולכן **אין כאן סשן ועדה אמיתי**. מה שנבדק:
     שהדגל נקרא נכון מהלוח, ושהצוות אינו מוגבל. הסינון עצמו
     (`mayRead`/`mayWrite`) נבדק על אובייקט הזכויות כמו שהוא
     מוחזר, ולא דרך הרשת.

     ⚠ בדיקה שהייתה מעמידה פנים שיש כאן סשן ועדה הייתה נראית
       כמו כיסוי מלא ואינה — וזה גרוע מבדיקה קטנה שאומרת
       מה גבולה. הכיסוי המלא יגיע כשיהיה חשבון בדיקה משובץ. */
  const mk = all.find((x) => x.contentTeam);
  const un = all.find((x) => !x.contentTeam);
  ok("הדגל נקרא מהלוח לגיליון מסומן", Boolean(mk), mk ? mk.subject : "—");
  ok("ולגיליון שאינו מסומן הוא כבוי", Boolean(un) && un.contentTeam === false,
    un ? `${un.subject}=${un.contentTeam}` : "—");

  /* הצוות: mayRead/mayWrite פתוחים על שניהם. */
  const staff = await lessonRights({ isManager: true, isStudent: false });
  ok("לצוות mayRead פתוח על שניהם",
    staff.mayRead(mk) === true && staff.mayRead(un) === true);
  ok("ו-limited כבוי אצלו", staff.limited === false, String(staff.limited));

  /* ============ 3 · מפגש בגיליון שאינו של הוועדה ============ */
  console.log("\n3 · סימון מפגש — הגיליון נלקח מהמפגש");
  r = await call(S, "POST", "/api/lessons?action=mark",
    { meetingId: "0", happened: "כן" });
  /* ⚠ מזהה שאינו קיים: התשובה מגיעה מהשער ולא מהנתונים, ואף
     שורה לא נוגעת. לצוות זה 404 "המפגש אינו נמצא". */
  ok("מפגש שאינו קיים → 404, ולא נכתב דבר", r.s === 404, `${r.s} ${r.b.error || ""}`);

  /* ============================================================
     4 · ⚠⚠⚠ **הועדה באמת מסמנת — ואין שער שני**
     ------------------------------------------------------------
     הבאג שזה נולד ממנו (16.9.2026): `_lesson-mark.js` החזיק
     `mayMark` — `isManager || isScheduler || isLeader || leadsAnyWeek` —
     **לפני** `lessonRights`, והוא אינו כולל את הועדה. כל
     ששת חברי קבוצה ותוכן הם חניכים בלי תפקיד אחראי
     הלו״ז, ולכן קיבלו 403 על "התקיים", על "שם המרצה
     שהגיע" ועל הערת חוות הדעת.

     ⚠⚠ **וטענה על `lessonRights` לבדה לעולם לא היתה תופסת
       את זה** — ההרשאה שם היתה נכונה כל הזמן. לכן שתי
       טענות ולא אחת: שהכלל נכון, ושאין שער שני לפניו.
     ============================================================ */
  console.log("\n4 · חבר ועדה אמיתי — הכלל, ואין שער שני");
  const { loadDefinitions, loadAssignments } = await import("../../api/_placements.js");
  const team = (await loadDefinitions()).find((x) => x.content && !x.archived);
  const mem = team
    ? (await loadAssignments()).filter((x) => String(x.placement) === String(team.id))
    : [];
  ok("נמצאה ועדה עם חברים", Boolean(team) && mem.length > 0,
    team ? `${team.name} · ${mem.length}` : "—");
  if (mem.length) {
    /* ⚠ סשן של חבר ועדה אמיתי, **בקריאה בלבד** — אף
       שורה אינה נכתבת ואין שיבוץ זמני לנקות אחריו. */
    const g = await lessonRights({ isStudent: true, itemId: String(mem[0].student) });
    ok("לחבר הועדה write פתוח", g.write === true, String(g.write));
    ok("והוא limited", g.limited === true, String(g.limited));
    ok("כותב בגיליון שלו", Boolean(mk) && g.mayWrite(mk) === true,
      mk ? mk.subject : "—");
    ok("ואינו כותב באחר", Boolean(un) && g.mayWrite(un) === false,
      un ? un.subject : "—");
  }

  /* ============================================================
     ⚠⚠ **וזו הטענה שהייתה תופסת את הבאג: שער אחד.**

     הבדיקה קוראת את הקובץ **בלי ההערות** ומוודאת
     שאין בו הפניה לדגלי הסשן. זו אינה בדיקת התנהגות
     והיא מצהירה על עצמה ככזו — אבל היא הדבר היחיד
     שתופס שער שני שיוחזר לשם, כי אין חשבון בדיקה
     משובץ לועדה שאפשר להיכנס איתו (ראו ההערה בחלק 2).

     ⚠ הדגלים מופיעים בהערות של הקובץ במכוון — הן
       מתעדות מה הוסר ולמה — ולכן הן מוסרות לפני הסריקה.
     ============================================================ */
  const src = (await import("node:fs")).readFileSync("api/_lesson-mark.js", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const gates = ["isManager", "isScheduler", "isLeader", "leadsAnyWeek"]
    .filter((f) => src.includes(f));
  ok("ואין ב-_lesson-mark.js שער שני לפני lessonRights",
    gates.length === 0, gates.join(" · ") || "שער אחד");
} finally {
  for (const x of regs) await x.restore();
  invalidate("auth-rows");
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
