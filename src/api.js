/* ============================================================
   קריאות לשכבת הביניים
   ------------------------------------------------------------
   זה מה שהאפליקציה מכירה. היא לא יודעת ש-monday קיימת, ולא
   רואה טוקן — רק כתובות מקומיות שהשרת מטפל בהן.
   ============================================================ */

/* מנוי על אירוע ניתוק. כשהשרת מחזיר 401 — פג תוקף, הקוד הוחלף
   או ההרשאה כובתה — האפליקציה חוזרת למסך הכניסה עם הסבר,
   במקום להציג שגיאה או מסך ריק. */
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/* מסלולי כניסה — 401 מהם הוא "הקוד שגוי", לא "פג התוקף", ולכן
   אסור שיפעילו את מסך הכניסה מחדש עם הודעת ניתוק. */
const LOGIN_PATHS = [
  "/api/auth?action=login",
  "/api/auth?action=logout",
  "/api/students?action=login",
];

function handle401(path, data) {
  if (onUnauthorized && !LOGIN_PATHS.some((p) => path.startsWith(p))) {
    onUnauthorized(data.error || "נדרשת כניסה מחדש");
  }
}

async function send(method, path, body) {
  let r;
  try {
    r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("אין חיבור לשרת");
  }

  const data = await r.json().catch(() => ({}));
  if (r.status === 401) handle401(path, data);
  if (!r.ok) throw new Error(data.error || `השרת החזיר שגיאה ${r.status}`);
  return data;
}

const post = (path, body) => send("POST", path, body);
const put = (path, body) => send("PUT", path, body);
const del = (path, body) => send("DELETE", path, body);

async function get(path) {
  let r;
  try {
    r = await fetch(path);
  } catch {
    throw new Error("אין חיבור לשרת");
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) handle401(path, data);
  if (!r.ok) throw new Error(data.error || `השרת החזיר שגיאה ${r.status}`);
  return data;
}

export const api = {
  /* --- כניסה וזהות --- */
  login: (code) => post("/api/auth?action=login", { code }),
  logout: () => post("/api/auth?action=logout", {}),
  me: () => get("/api/auth?action=me"),
  setMyName: (name) => post("/api/auth?action=me", { name }),

  /** רשימת משתמשים לתצוגה. בלי קודים, מנהל בלבד. */
  getUsers: () => get("/api/kitchen?action=users"),

  /** רשימות הקניות, כל אחת עם השורות שלה */
  getLists: () => get("/api/kitchen?action=lists-read"),

  getCatalog: () => get("/api/kitchen?action=catalog"),
  getMoves: () => get("/api/kitchen?action=moves-read"),

  /** תורני היום מלוח השיבוץ. רשימה ריקה = אין מה להציג. */
  getDutyToday: (date) =>
    get("/api/kitchen?action=duty-today" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** שיבוץ השבוע כולו — 7 תאים לפי אינדקס היום. קריאה בלבד. */
  getDutyWeek: (date) =>
    get("/api/kitchen?action=duty-week" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /* --- משימות ניקיון שבועיות --- */

  /** מוודא שקיימות שורות ביצוע לשבוע הנוכחי. אידמפוטנטי. */
  ensureWeek: () => post("/api/kitchen?action=tasks-ensure", {}),

  /** משימות היום לפי שעון ישראל. date אופציונלי — מצב בדיקה בלבד. */
  getTodayTasks: (date) =>
    get("/api/kitchen?action=tasks-today" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** מסמן משימה. שולח את המצב הרצוי, לא "הפוך". */
  setTaskDone: (rowId, done) => post("/api/kitchen?action=tasks-toggle", { rowId, done }),

  /** סיכום שבועי למנהל. קריאה בלבד, ברמת יום — בלי שמות. */
  getTasksSummary: (date) =>
    get("/api/kitchen?action=tasks-summary" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** פירוט משימות של יום אחד. מנהל בלבד, קריאה בלבד. */
  getTasksDay: (day, date) =>
    get(`/api/kitchen?action=tasks-day&day=${encodeURIComponent(day)}`
        + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** קבלת סחורה: כמויות לפי rowId. סוגרת את הרשימה ומעדכנת מלאי. */
  receiveList: ({ listId, user, received }) =>
    post("/api/kitchen?action=lists-receive", { listId, user: { name: user.name }, received }),

  /** מוודא שהרשימות החיות משקפות את החוסרים הנוכחיים. אידמפוטנטי. */
  syncLists: () => post("/api/kitchen?action=lists-sync", {}),

  /** מעבר סטטוס של רשימה. השרת אוכף מי רשאי ואילו מעברים חוקיים. */
  setListStatus: ({ listId, to, user }) =>
    post("/api/kitchen?action=lists-status", { listId, to, user: { name: user.name, role: user.role } }),

  /** עריכה ידנית של שורה: add / setQty / remove */
  editRow: (body) => post("/api/kitchen?action=lists-row", body),

  /** פותח רשימת טיוטה לספק. מחזיר את הקיימת אם יש. */
  createList: ({ sup, user }) =>
    post("/api/kitchen?action=lists-create", { sup, user: { name: user.name } }),

  /** דיווח יומי: קבלה / שימוש / פחת */
  commitMoves: ({ type, user, entries }) =>
    post("/api/kitchen?action=moves-commit", {
      type,
      user,
      entries: entries.map((e) => ({
        pid: e.pid,
        qty: e.qty,
        reason: e.reason || null,
      })),
    }),

  /** ביטול דיווח — מסמן אותו כמבוטל ומחזיר את המלאי */
  cancelMove: (moveId) => post("/api/kitchen?action=moves-cancel", { moveId }),

  /** ספירה שבועית: קובעת מלאי וסימון תוקף */
  finishCount: ({ user, entries }) => post("/api/kitchen?action=moves-count", { user, entries }),

  /* ============================================================
     מכינה — חניכים, נוכחות ובקשות יציאה
     ------------------------------------------------------------
     ⚠ כל הקריאות האלה עוברות דרך הקובץ הזה כמו כל השאר. אין
       fetch ישיר במסכים — זה מה שמנע את חזרת הבאג שבו קובץ
       אחד החזיק כתובות ישנות והקטלוג חזר ריק בייצור.
     ============================================================ */

  /** כניסת חניך בתעודת זהות. השרת מחזיר עוגייה, כמו בכניסת הצוות. */
  loginStudent: (tz) => post("/api/students?action=login", { tz }),

  /** רשימת החניכים וסיכומיהם. מנהל בלבד — השרת אוכף. */
  getStudents: () => get("/api/students?action=list"),

  /** הלוח השנתי. בלי מזהה — של המחובר. עם מזהה — מנהל בלבד. */
  getStudentYear: (studentId, today) =>
    get("/api/students?action=year"
      + (studentId ? `&student=${encodeURIComponent(studentId)}` : "")
      + (today ? `&today=${encodeURIComponent(today)}` : "")),

  /** מינוי או ביטול מוביל שבוע. מנהל בלבד — השרת אוכף. */
  setLeader: ({ studentId, leader }) =>
    post("/api/students?action=leader", { studentId, leader }),

  /** מצב יום אחד לסימון. מנהל או מוביל שבוע. */
  getAttendanceDay: (date, today) =>
    get("/api/attendance?action=day"
      + (date ? `&date=${encodeURIComponent(date)}` : "")
      + (today ? `&today=${encodeURIComponent(today)}` : "")),

  /** שומר את סימון היום. נושא את המצב המלא הרצוי — נוכחים
   *  והיעדרויות — לא פעולות. מי שלא באף רשימה נשאר "לא סומן". */
  markAttendance: ({ date, absences, present }, today) =>
    post("/api/attendance?action=mark" + (today ? `&today=${encodeURIComponent(today)}` : ""),
      { date, absences, present }),

  /** בקשות יציאה. חניך מקבל את שלו בלבד — הסינון בשרת. */
  getRequests: (status) =>
    get("/api/attendance?action=requests" + (status ? `&status=${encodeURIComponent(status)}` : "")),

  /** הגשת בקשה חדשה. endDate לטווח ימים; אישור מחלה עובר
   *  כ-base64 ועולה לעמודת הקבצים בלוח. */
  createRequest: ({ type, date, endDate, detail, fileName, fileMime, fileData }) =>
    post("/api/attendance?action=requests",
      { type, date, endDate, detail, fileName, fileMime, fileData }),

  /** אישור או דחייה. מנהל בלבד. אישור יוצר את שורת ההיעדרות. */
  decideRequest: ({ requestId, decision }) =>
    post("/api/attendance?action=decide", { requestId, decision }),

  /** נוכחות פרטנית באימון — שלוש רשימות, מצב מלא */
  markTraining: ({ meetingId, present, absent, kitchen }, today) =>
    post("/api/attendance?action=train" + (today ? "&today=" + encodeURIComponent(today) : ""),
      { meetingId, present, absent, kitchen }),

  /** הפרופיל האישי. חניך — שלו; מנהל — של כל חניך. */
  getProfile: (studentId) =>
    get("/api/students?action=profile" + (studentId ? "&student=" + encodeURIComponent(studentId) : "")),

  /** עדכון פרופיל: חניך שולח army/tryouts, מנהל שולח talks */
  setProfile: ({ studentId, army, tryouts, talks }) =>
    post("/api/students?action=profile" + (studentId ? "&student=" + encodeURIComponent(studentId) : ""),
      { army, tryouts, talks }),

  /** אירועים חריגים. מנהל בלבד — השרת אוכף. */
  getIncidents: (studentId) =>
    get("/api/students?action=incident" + (studentId ? "&student=" + encodeURIComponent(studentId) : "")),
  addIncident: ({ studentId, kind, detail, date }) =>
    post("/api/students?action=incident", { studentId, kind, detail, date }),

  /* --- ציוד המכולה — מנהל או אחראי מכולה --- */
  getContainer: () => get("/api/container?action=equip"),
  addEquip: ({ name, qty, kind }) => post("/api/container?action=equip", { name, qty, kind }),
  editEquip: ({ itemId, name, qty, kind }) => put("/api/container?action=equip", { itemId, name, qty, kind }),
  deleteEquip: (itemId) => del("/api/container?action=equip", { itemId }),
  /** יצירת רשימת קניות — כמה שורות בבת אחת */
  addShopping: (items) => post("/api/container?action=shop", { items }),
  setShoppingStatus: ({ itemId, status }) => put("/api/container?action=shop", { itemId, status }),
  deleteShopping: (itemId) => del("/api/container?action=shop", { itemId }),

  /** שיבוץ מובילי השבוע — 43 השבועות והרשימה לשיבוץ. מנהל בלבד. */
  getLeaderWeeks: (today) =>
    get("/api/students?action=weeks" + (today ? "&today=" + encodeURIComponent(today) : "")),

  /** שיבוץ מובילים לשבוע. נושא את הרשימה המלאה (עד 3). */
  assignWeek: ({ weekId, studentIds }) =>
    post("/api/students?action=weeks", { weekId, studentIds }),

  /** עריכת תאריכי שבוע. מנהל בלבד. */
  editWeek: ({ weekId, start, end }) =>
    put("/api/students?action=weeks", { weekId, start, end }),

  /** קביעת תפקידי חניך. מנהל בלבד. נושא את הרשימה המלאה. */
  setRoles: ({ studentId, roles }) =>
    post("/api/students?action=role", { studentId, roles }),

  /* ============================================================
     שיעורים במכינה
     ⚠ כל נקודות הקצה כאן פתוחות לצוות ולאחראי הלו״ז בלבד.
     ============================================================ */

  /** כל גיליונות השיעור עם הספירה של כל אחד */
  getLessonSheets: () => get("/api/lessons?action=list"),

  /** גיליון אחד עם כל מפגשיו */
  getLessonSheet: (id) => get(`/api/lessons?action=sheet&id=${encodeURIComponent(id)}`),

  /** פתיחת גיליון חדש. נוצר ריק — המפגשים נוספים בנפרד. */
  createLessonSheet: ({ subject, lecturer, dayTime }) =>
    post("/api/lessons?action=sheet", { subject, lecturer, dayTime }),

  /** דיווח אם מפגש התקיים. null מחזיר ל"טרם דווח".
   *  lecturer ו-opinion רלוונטיים בשיעורי מרצה אורח בלבד. */
  markLesson: ({ meetingId, happened, note, lecturer, opinion }) =>
    post("/api/lessons?action=mark", { meetingId, happened, note, lecturer, opinion }),

  /** הוספת מפגש ידנית לגיליון קיים. נשמר ב-monday מיד. */
  addLessonMeeting: ({ sheetId, date, planned, reason, note }) =>
    post("/api/lessons?action=meeting", { sheetId, date, planned, reason, note }),

  /** עריכת מפגש: תאריך, האם יתקיים, סיבה והערות */
  editLessonMeeting: ({ meetingId, date, planned, reason, note }) =>
    put("/api/lessons?action=meeting", { meetingId, date, planned, reason, note }),

  /** ⚠ מחיקת מפגש — בלתי הפיך, השורה נמחקת מהלוח */
  deleteLessonMeeting: (meetingId) =>
    del("/api/lessons?action=meeting", { meetingId }),

  /** הגאנט השנתי — כל אירועי השנה. עריכה בלוח ב-monday. */
  getGantt: () => get("/api/lessons?action=gantt"),

  /** נתוני הדוח החודשי. בלי חודש — כל השנה. */
  getLessonReport: (month) =>
    get("/api/lessons?action=report" + (month ? `&month=${encodeURIComponent(month)}` : "")),

  /** שיעורי מרצה אורח שהחניך המחובר יכול לדרג */
  getRatable: () => get("/api/lessons?action=rate"),

  /** דירוג 1–10. דירוג חוזר מעדכן את הקודם. */
  rateLesson: ({ meetingId, score }) =>
    post("/api/lessons?action=rate", { meetingId, score }),

  /** חוות דעת על מרצים */
  getLessonEvals: (cycle) =>
    get("/api/lessons?action=evals" + (cycle ? `&cycle=${encodeURIComponent(cycle)}` : "")),

  /** הוספת חוות דעת חדשה. meetingId מצמיד אליה את דירוג החניכים. */
  addLessonEval: ({ name, topic, field, phone, opinion, cycle, meetingId }) =>
    post("/api/lessons?action=evals", { name, topic, field, phone, opinion, cycle, meetingId }),
};
