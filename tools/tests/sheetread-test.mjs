/* ============================================================
   קריאת הגיליונות של המכינה — נבדק על התוכן האמיתי

   ⚠ הקלט הוא scratchpad/fixtures/*.json — המרה נאמנה של שלושת
     הקבצים שהמכינה שלחה, באותו פורמט בדיוק ש-`readRange`
     מחזירה. כך הפרסרים נבדקים על נתונים אמיתיים בלי לגעת
     בגוגל ובלי לכתוב לשום מקום.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  readDate, parseSubjectTab, parseAttendanceTab, parseGanttGrid, parseRange, ABSENCE_CODES,
} from "../../shared/sheet-read.js";

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const load = (n) => JSON.parse(readFileSync(`scratchpad/fixtures/${n}.json`, "utf8"));

/* ============ 1 · תאריכים ============ */
console.log("=== תאריכים ===");
ok("dd/mm/yyyy", readDate("07/09/2026") === "2026-09-07", readDate("07/09/2026"));
ok("d/m/yyyy", readDate("7/9/2026") === "2026-09-07", readDate("7/9/2026"));
ok("ISO עובר כמו שהוא", readDate("2026-09-07") === "2026-09-07");
ok("נקודות", readDate("07.09.2026") === "2026-09-07", readDate("07.09.2026"));
/* ⚠ שנת לימודים חוצה שנה אזרחית — זה הכלל שהכי קל לפספס. */
ok("dd/mm בספטמבר → שנת הפתיחה", readDate("06/09", 2026) === "2026-09-06", readDate("06/09", 2026));
ok("dd/mm בינואר → השנה שאחריה", readDate("28/01", 2026) === "2027-01-28", readDate("28/01", 2026));
ok("ובלי רמז שנה — null", readDate("06/09") === null);
ok("טקסט → null", readDate("שני") === null && readDate("") === null && readDate(null) === null);

console.log("=== טווח מיזוג ===");
const rg = parseRange("AI5:AK10");
ok("A1 → אינדקסים מאפס", rg.r1 === 4 && rg.r2 === 9 && rg.c1 === 34 && rg.c2 === 36,
  JSON.stringify(rg));
ok("טווח פסול → null", parseRange("שלום") === null);

/* ============ 2 · לשונית נושא ============ */
console.log("=== גיליון נושא ===");
const L = load("lessons");
const subj = L["מסע בתרבות היהודית"];
const p = parseSubjectTab(subj.rows, { yearHint: 2026 });
ok("הנושא זוהה", p.subject === "מסע בתרבות היהודית", p.subject);
/* ⚠ המרצה נגזר מהכותרת ולא מעמודה — כך זה בגיליון. */
/* ⚠ הכותרת היא "נושא — מרצה — יום ושעה", שלושה חלקים. */
ok("והמרצה מהכותרת", p.lecturer === "חיים וייס", p.lecturer);
ok("וגם היום והשעה", p.dayTime === "שני 10:00", p.dayTime);
/* ⚠ "—" לבדו פירושו שאין מרצה, ולא שם של מרצה. */
const noLect = parseSubjectTab(L["כישורי חיים"].rows, { yearHint: 2026 });
ok("ו-\"—\" נקרא כאין מרצה", noLect.lecturer === null, String(noLect.lecturer));
ok("אבל היום והשעה כן נקראים", noLect.dayTime === "שני 17:30", noLect.dayTime);
ok("נקראו מפגשים", p.meetings.length >= 40, `${p.meetings.length} מפגשים`);
ok("ואין שורות שנפלו", p.bad.length === 0, p.bad.map((b) => b.why).join(" | "));

const m1 = p.meetings[0];
ok("המפגש הראשון 07/09", m1.date === "2026-09-07", m1.date);
ok("מסומן שאינו מתקיים", m1.planned === "לא", m1.planned);
ok("עם הסיבה", m1.reason === "שבוע קליטה", m1.reason);
/* ⚠ ריק הוא "טרם דווח" ולא "לא התקיים" — מצב שלישי. */
ok("ו-happened ריק הוא null", m1.happened === null, String(m1.happened));
const m2 = p.meetings[1];
ok("והשני מתקיים", m2.date === "2026-09-14" && m2.planned === "כן", `${m2.date} ${m2.planned}`);
ok("בלי סיבה", m2.reason === null);
/* ⚠ ברירת המחדל: תא ריק ב"יתקיים?" נחשב "כן". */
ok("ריק ב\"יתקיים?\" נחשב כן", p.meetings.every((m) => m.planned === "כן" || m.planned === "לא"));

const cancelled = p.meetings.filter((m) => m.planned === "לא");
ok("יש מבוטלים עם סיבות", cancelled.length > 0 && cancelled.every((m) => m.reason),
  `${cancelled.length} מבוטלים`);

/* ---- כל הלשוניות ---- */
const skip = (n) => n === "דאשבורד" || n.includes("חוות דעת");
const tabs = Object.keys(L).filter((n) => !skip(n));
let total = 0, bad = 0;
for (const t of tabs) {
  const r = parseSubjectTab(L[t].rows, { subject: t, yearHint: 2026 });
  total += r.meetings.length; bad += r.bad.length;
}
ok("כל לשוניות הנושא נקראות", tabs.length >= 18, `${tabs.length} נושאים`);
ok("ובסך הכול מפגשים", total > 600, `${total} מפגשים`);
/* ⚠ שורה שלא נקראה מדווחת. אפס כאן פירושו שהמבנה זהה בכולן. */
ok("ואף שורה לא נפלה", bad === 0, `${bad} נפלו`);

/* ⚠ הכותרת נמצאת לפי הטקסט ולא לפי מיקום — עמודה שתתווסף
   באמצע לא תשבור את הייבוא. */
const shifted = subj.rows.map((r) => (r.length ? ["", ...r] : r));
const ps = parseSubjectTab(shifted, { yearHint: 2026 });
ok("עמודה שנוספה בהתחלה אינה שוברת", ps.meetings.length === p.meetings.length,
  `${ps.meetings.length} מול ${p.meetings.length}`);

/* ============ 3 · נוכחות ============ */
console.log("=== נוכחות ===");
const A = load("attendance");
const a = parseAttendanceTab(A["נוכחות"].rows, { yearHint: 2026 });
ok("נקראו ימים", a.days.length > 150, `${a.days.length} ימים`);
ok("היום הראשון 06/09/2026", a.days[0].date === "2026-09-06", a.days[0].date);
ok("ועם סוג יום", a.days.every((d) => d.kind), a.days[0].kind);
ok("נקראו חניכים", a.students.length === 33, `${a.students.length} חניכים`);
ok("והראשון מרום אמר", a.students[0].name === "מרום אמר", a.students[0].name);
/* ⚠ הגיליון עדיין ריק מסימונים — זו תחילת שנה, וזה תקין.
   הבדיקה מצהירה על כך במקום להיכשל. */
ok("אין סימוני היעדרות עדיין", a.marks.length === 0, `${a.marks.length} סימונים`);
ok("ואין קודים לא מוכרים", a.bad.length === 0, a.bad.slice(0, 2).map((b) => b.why).join(" | "));

/* ---- סימונים מלאכותיים, כדי לבדוק את המסלול עצמו ---- */
const rows = A["נוכחות"].rows.map((r) => [...r]);
const dateRow = rows.findIndex((r) => String(r[0]).trim() === "תאריך");
const firstStud = rows.findIndex((r) => String(r[0]).trim() === "מרום אמר");
rows[firstStud][1] = "חופש";
rows[firstStud][2] = "מחלה";
rows[firstStud + 1][1] = "מוצדקת";
rows[firstStud + 2][1] = "משהו אחר";
const a2 = parseAttendanceTab(rows, { yearHint: 2026 });
ok("סימונים נקראים", a2.marks.length === 3, `${a2.marks.length}`);
ok("עם שם, תאריך וסוג",
  a2.marks[0].name === "מרום אמר" && a2.marks[0].date === "2026-09-06" && a2.marks[0].type === "חופש",
  JSON.stringify(a2.marks[0]));
/* ⚠ העיקר: קוד שאינו במקרא **מדווח ואינו מיובא**. כתיב חופשי
   בתא אחד היה נכנס כסוג היעדרות שאינו קיים בלוח. */
ok("קוד לא מוכר נדחה ומדווח", a2.bad.length === 1 && a2.bad[0].why.includes("משהו אחר"),
  a2.bad[0]?.why);
ok("ואינו נספר בסימונים", !a2.marks.some((m) => m.type === "משהו אחר"));
ok("המקרא מגדיר שלושה קודים", ABSENCE_CODES.length === 3, ABSENCE_CODES.join(" · "));

/* ============ 4 · הגאנט ============ */
console.log("=== גאנט ===");
const G = load("gantt");
const tab = G["גאנט שנתי נקי"];
const g = parseGanttGrid(tab.rows, tab.merges, { yearHint: 2026 });
ok("נקראו אירועים", g.events.length > 20, `${g.events.length} אירועים`);
ok("ולכל אירוע שם ותאריכים",
  g.events.every((e) => e.name && /^\d{4}-\d{2}-\d{2}$/.test(e.start) && /^\d{4}-\d{2}-\d{2}$/.test(e.end)));
ok("והסיום אינו לפני ההתחלה", g.events.every((e) => e.end >= e.start),
  g.events.filter((e) => e.end < e.start).map((e) => e.name).join(", "));
/* ⚠ שנת הלימודים חוצה שנה אזרחית. */
const y26 = g.events.filter((e) => e.start.startsWith("2026")).length;
const y27 = g.events.filter((e) => e.start.startsWith("2027")).length;
ok("יש אירועים בשתי השנים", y26 > 0 && y27 > 0, `2026: ${y26} · 2027: ${y27}`);
/* ⚠ תאריך עברי אינו אירוע. אם י"ח או כ"ג נכנסו — הסינון נשבר. */
const hebrew = g.events.filter((e) => /^[א-ת]["'׳״]?[א-ת]?$/.test(e.name));
ok("תאריכים עבריים אינם אירועים", hebrew.length === 0, hebrew.map((e) => e.name).join(", "));
/* ⚠ אירוע רב-יומי מגיע מטווח מיזוג. בלעדיו הכול היה יום אחד. */
const multi = g.events.filter((e) => e.end > e.start);
ok("יש אירועים רב-יומיים", multi.length > 0, `${multi.length} רב-יומיים`);

/* ⚠ אותו פרסר חייב לקבל גם את הצורה ש-`readGrid` מחזירה
   (אובייקטים) וגם מחרוזות A1 — אחרת הבדיקה בודקת מסלול אחד
   והייצור מריץ אחר. */
const asObjects = tab.merges.map((m) => parseRange(m));
const g2 = parseGanttGrid(tab.rows, asObjects, { yearHint: 2026 });
ok("מיזוגים כאובייקטים נותנים אותה תוצאה",
  g2.events.length === g.events.length
  && JSON.stringify(g2.events) === JSON.stringify(g.events),
  `${g2.events.length} מול ${g.events.length}`);

const known = ["שבוע קליטה", "מסע עליה למכינה"];
for (const n of known) {
  const hit = g.events.find((e) => e.name.includes(n));
  ok(`"${n}" נמצא`, Boolean(hit), hit ? `${hit.start}–${hit.end}` : "לא נמצא");
}

console.log("\nדוגמה — עשרת האירועים הראשונים:");
for (const e of g.events.slice(0, 10)) {
  console.log(`   ${e.start}${e.end !== e.start ? "–" + e.end : "        "}  ${e.name}`);
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
