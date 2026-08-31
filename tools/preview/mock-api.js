/* ============================================================
   שכבת נתוני דוגמה — לתצוגה בתוך קלוד בלבד
   ------------------------------------------------------------
   מחליפה את src/api.js בזמן בנייה (ראו vite.preview.config.js).
   האפליקציה נבנית כרגיל, אבל במקום לפנות לשרת היא מקבלת
   נתונים קבועים — כך אפשר לראות ולתפעל את המסכים בכל מקום,
   בלי שרת, בלי .env ובלי monday.

   ⚠ אינה נכנסת לבנייה של הייצור. הקובץ יושב ב-tools/ ולא
     ב-src/, ומוחלף רק דרך vite.preview.config.js.

   ⚠ נתוני הדוגמה כאן בדויים לחלוטין: שמות, מספרים ותאריכים
     הומצאו לצורך התצוגה. אין כאן שום נתון של חניך אמיתי.
   ============================================================ */

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const plus = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

/* ---------- חניכים בדויים ---------- */
const NAMES = [
  "נועם ברק", "יעל אדרי", "איתי כהן", "שירה לוי", "עומר דגן",
  "תמר שגב", "רועי אלון", "אביגיל מור", "יהונתן פז", "נעה גלר",
  "אורי בן חיים", "מיכל ארז", "דניאל שוהם", "ליאור נחום", "טל אבידן",
];
const roster = NAMES.map((name, i) => ({
  id: "s" + (i + 1), name, gender: i % 2 ? "נקבה" : "זכר", active: true,
  leader: i === 0, roles: i === 1 ? ["אחראי מטבח"] : i === 2 ? ["אב בית"] : [],
}));

/* ---------- ציוד ---------- */
const FOOD = [
  ["פסטה", "121", 100], ["אורז", "37", 30], ["קוסקוס", "58", 30],
  ["טונה", "24", 50], ["קטשופ", "13", 50], ["מיונז", "10", 30],
  ["סוכר", "11", 30], ["קמח", "18", 30], ["מלח", "23", 30],
  ["שמן זית", "12", 15], ["חמוצים שימורים", "8", 60], ["בפלות", "48", 100],
];
const DISP = [
  ["קשים", "500", null], ["קערות חד״פ", "400", null], ["גביעי רוטב חד״פ", "170", null],
  ["קערות מרק", "150", null], ["חבילת כפיות חד״פ (50 יחידות)", "52", null],
  ["כפות עבות חד״פ", "41", null],
];
const equip = (rows, area) => rows.map(([name, qty, par], i) => ({
  id: `${area}-${i}`, name, qty, kind: "מתכלה", area, par,
}));
const missing = (rows) => rows.filter(([, q, p]) => p != null && Number(q) < p).length;

/* ---------- תקלות ---------- */
const faults = [
  { id: "f1", title: "נזילה במקלחות בנים", date: plus(-2), place: "מגורי בנים",
    fix: "בעל מקצוע", urgency: "דחוף", status: "פתוחה",
    desc: "נזילה מתחת לכיור השני. הושם דלי.", notes: "" },
  { id: "f2", title: "מזגן בכיתה לא מקרר", date: plus(-6), place: "כיתה",
    fix: "בעל מקצוע", urgency: "רגיל", status: "בטיפול",
    desc: "", notes: "הוזמן טכנאי ליום ראשון" },
  { id: "f3", title: "נורה שרופה בחאן", date: plus(-11), place: "חאן יונס",
    fix: "בתוך המכינה", urgency: "רגיל", status: "טופלה", desc: "", notes: "הוחלפה" },
];

/* ---------- שיבוצים ---------- */
const defs = [
  ["p1", "נוי", "ענף", "לפי סמסטר", 6], ["p2", "גד״ש", "ענף", "לפי סמסטר", 5],
  ["p3", "רפת", "ענף", "לפי סמסטר", 4], ["p4", "חינוך", "ענף", "לפי סמסטר", 6],
  ["p5", "כולבו", "ענף", "שנתי", 3],
  ["p6", "סדרת חינוך", "סדרה", "שנתי", null], ["p7", "סדרה מסכמת", "סדרה", "שנתי", null],
  ["p8", "ועדת תרבות", "ועדה", "לפי סמסטר", 5],
  ["p9", "ועדת קהילה", "ועדה", "לפי סמסטר", 5],
  ["p10", "ועדת גיוסים", "ועדה", "סמסטר ב׳", 4],
  ["p11", "קבוצת שירה", "קבוצה", "שנתי", null],
  ["p12", "קבוצת נעם", "קבוצה", "שנתי", null],
].map(([id, name, category, period, capacity]) => ({ id, name, category, period, capacity }));

const assignments = [
  ["a1", "s1", "נועם ברק", "p1", "נוי", "סמסטר א׳"],
  ["a2", "s3", "איתי כהן", "p1", "נוי", "סמסטר א׳"],
  ["a3", "s2", "יעל אדרי", "p3", "רפת", "סמסטר א׳"],
  ["a4", "s4", "שירה לוי", "p8", "ועדת תרבות", "סמסטר א׳"],
  ["a5", "s5", "עומר דגן", "p11", "קבוצת שירה", "שנתי"],
  ["a6", "s6", "תמר שגב", "p6", "סדרת חינוך", "שנתי"],
].map(([id, student, studentName, placement, placementName, semester]) =>
  ({ id, student, studentName, placement, placementName, semester }));

/* ---------- בטיחות ---------- */
const incidents = [
  { id: "i1", title: "נקע בקרסול במהלך אימון בוקר", date: plus(-4), place: "שגרה",
    severity: "פגיעה", bodyHarm: "נקע קל בקרסול ימין", propHarm: "",
    desc: "החניך מעד במהלך ריצה. קורר, נחבש והמשיך ליום רגיל.",
    evac: "לא", medical: "כן", medicalDetail: "חובש המכינה — קירור וחבישה",
    lessons: "לסמן את הבור במסלול הריצה", reportMod: "כן", reportCouncil: "לא" },
  { id: "i2", title: "כמעט התהפכות טרקטורון בסדרה", date: plus(-19), place: "סדרה",
    severity: "כמעט ונפגע", bodyHarm: "", propHarm: "",
    desc: "הטרקטורון החליק בפנייה חדה. הנהג התאושש, איש לא נפגע.",
    evac: "לא", medical: "לא", medicalDetail: "",
    lessons: "תדריך נהיגה לפני כל סדרה, והגבלת מהירות בשטח.",
    reportMod: "לא", reportCouncil: "לא" },
];

/* ---------- הגאנט ---------- */
const gantt = [
  { name: "סדרת חינוך", start: plus(-1), end: plus(3), type: "סדרה" },
  { name: "טיול צפון", start: plus(9), end: plus(11), type: "טיול" },
  { name: "שבוע התנדבות", start: plus(17), end: plus(21), type: "סדרה" },
];

/* ---------- בקשות יציאה ---------- */
const requests = [
  { id: "r1", student: { id: "s4", name: "שירה לוי" }, type: "חופש", date: plus(2),
    endDate: plus(2), detail: "אירוע משפחתי", status: "ממתין", outAt: "14:00", backAt: "22:00" },
  { id: "r2", student: { id: "s7", name: "רועי אלון" }, type: "מחלה", date: plus(1),
    endDate: plus(1), detail: "תור לרופא", status: "ממתין", outAt: "08:00", backAt: "13:00" },
];

/* ---------- מה שכל מתודה מחזירה ---------- */
const R = {
  me: { kind: "manager", itemId: "m1", name: "דני לויט", isManager: true, isStudent: false,
        isHead: true, viewOnly: false, setup: false, cycle: { name: "מחזור ב׳" },
        roster: roster.map((r) => ({ id: r.id, name: r.name })) },
  getStudents: {
    students: roster,
    today: { kind: "רגיל", marked: true, present: 13, absent: 2, date: iso(today) },
    roles: ["אחראי לו״ז", "אחראי מטבח", "אחראי מכולה", "אב בית", "אחראי בטיחות"],
  },
  getGantt: { events: gantt },
  getRequests: { requests },
  getFaults: { faults, counts: { open: 1, working: 1, done: 1 } },
  getSafety: { incidents },
  getPlacements: { definitions: defs, assignments, roster: roster.map((r) => ({ id: r.id, name: r.name })) },
  getLessonSheets: { sheets: [
    { id: "l1", subject: "מנהיגות", lecturer: "ד״ר אורית שגב", dayTime: "שני 10:00", count: 12, reported: 9 },
    { id: "l2", subject: "יהדות וזהות", lecturer: "הרב אבי דרור", dayTime: "רביעי 20:00", count: 14, reported: 14 },
    { id: "l3", subject: "אימונים", lecturer: "יואב מזרחי", dayTime: "שני 7:00", count: 86, reported: 71 },
  ] },
  getBudget: { months: [], year: { total: 0, used: 0 } },

  /* לוח השיעורים שמוצג גם במסך הבית */
  getLessonsBoard: {
    counts: { upcoming: 3, unreported: 2, notHappening: 1 },
    upcoming: [
      { id: "m1", subject: "מנהיגות", lecturer: "ד״ר אורית שגב", date: plus(0),
        time: "10:00", dayTime: "שני 10:00", happened: null },
      { id: "m2", subject: "אימונים", lecturer: "יואב מזרחי", date: plus(1),
        time: "07:00", dayTime: "שני 7:00", happened: null },
      { id: "m3", subject: "יהדות וזהות", lecturer: "הרב אבי דרור", date: plus(2),
        time: "20:00", dayTime: "רביעי 20:00", happened: null },
    ],
    unreported: [
      { id: "m4", subject: "כלכלת המשפחה", lecturer: "רונית כספי", date: plus(-3),
        time: "18:00", dayTime: "חמישי 18:00", happened: null },
      { id: "m5", subject: "מנהיגות", lecturer: "ד״ר אורית שגב", date: plus(-8),
        time: "10:00", dayTime: "שני 10:00", happened: null },
    ],
    notHappening: [
      { id: "m6", subject: "סיור מוזיאון", lecturer: "—", date: plus(4),
        time: "", dayTime: "", planned: "לא", reason: "יום מיון" },
    ],
  },

  /* פעמון ההתראות */
  getNotify: { items: [
    { id: "n1", kind: "faults", urgent: true, title: "תקלה דחופה: נזילה במקלחות בנים",
      sub: "דווחה לפני יומיים", seen: false },
    { id: "n2", kind: "requests", urgent: false, title: "2 בקשות יציאה ממתינות",
      sub: "שירה לוי, רועי אלון", seen: false },
  ], unseen: 2 },

  getDuty: { duties: [], tasks: [], notes: [], handovers: [] },
  getChores: { sectors: [], week: null, weeks: [], rows: [], hasData: false },
  getTeams: { teams: [] },
  getMenu: { dishes: [], menus: [] },
  getAlumni: { alumni: [], stats: {} },
  getHosting: { hostings: [], counts: {} },
  getLoans: { loans: [] },
  getCycles: { cycles: [], active: null },
  getAccount: { user: {}, student: {} },
  getIncidents: { incidents: [] },
  getLeaderWeeks: { weeks: [], roster: [] },
  getAgenda: { days: [] },
  getRatable: { meetings: [] },
  getLessonEvals: { evals: [], fields: [] },
  getLessonReport: { rows: [], totals: {} },
  getStudentYear: { days: [], summary: {}, quota: {}, training: {} },
  getAttendanceDay: { students: roster, absences: [], marked: true },
  getProfile: { student: roster[0], army: {}, tryouts: [], talks: [] },
  getProduce: { table: [] },
  getMailStatus: { ok: true },
  getExportStatus: { linked: false },
  getTeamAdmin: { defs: [], teamCategories: [], vocab: [] },
};

/* ציוד לפי תחום — הפרמטר קובע */
function kitchenFor(area) {
  const rows = area === "חד״פ" ? DISP : FOOD;
  return {
    area: area || "אוכל",
    equipment: equip(rows, area || "אוכל"),
    shopping: [],
    counts: {
      total: rows.length, consumable: rows.length, permanent: 0,
      openShopping: 0, missing: missing(rows), withPar: rows.filter(([, , p]) => p != null).length,
    },
  };
}
function containerFor(area) {
  const rows = [["ארגזי פלסטיק", "24", 30], ["שולחנות", "12", 12], ["כיסאות", "80", 100]];
  return {
    area: area || "מכולה", equipment: equip(rows, area || "מכולה"), shopping: [],
    counts: { total: 3, consumable: 0, permanent: 3, openShopping: 0, missing: 2, withPar: 3 },
  };
}

/* ⚠ מתודה שאין לה נתון מחזירה אובייקט ריק ולא נופלת — מסך
   שלא הוכן לתצוגה יראה "אין נתונים" במקום להתרסק. */
const EMPTY = {};

export const api = new Proxy({}, {
  get(_, name) {
    return (...args) => {
      if (name === "getKitchen") return Promise.resolve(kitchenFor(args[0]));
      if (name === "getContainer") return Promise.resolve(containerFor(args[0]));
      if (name in R) return Promise.resolve(R[name]);
      /* פעולות כתיבה: מדווחות הצלחה ואינן משנות דבר */
      return Promise.resolve({ ok: true, ...EMPTY });
    };
  },
});

export function setUnauthorizedHandler() { /* אין 401 בתצוגה */ }
