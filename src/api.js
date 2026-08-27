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
  if (!r.ok) {
    const err = new Error(data.error || `השרת החזיר שגיאה ${r.status}`);
    /* ⚠ 503 של "טרם הוקם" נושא דגל, כדי שהמסך יציג מצב הקמה
       רגוע ולא באנר כשל — אלה שני מצבים שונים (עיקרון 6). */
    if (data.setupRequired) err.setupRequired = true;
    throw err;
  }
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
  if (!r.ok) {
    const err = new Error(data.error || `השרת החזיר שגיאה ${r.status}`);
    /* ⚠ 503 של "טרם הוקם" נושא דגל, כדי שהמסך יציג מצב הקמה
       רגוע ולא באנר כשל — אלה שני מצבים שונים (עיקרון 6). */
    if (data.setupRequired) err.setupRequired = true;
    throw err;
  }
  return data;
}

export const api = {
  /* --- כניסה וזהות --- */
  login: (code) => post("/api/auth?action=login", { code }),
  logout: () => post("/api/auth?action=logout", {}),
  me: () => get("/api/auth?action=me"),
  setMyName: (name) => post("/api/auth?action=me", { name }),

  /** רשימת משתמשים לתצוגה. בלי קודים, מנהל בלבד. */
  /* ============================================================
     ציוד המטבח — אוכל וחד״פ
     ⚠ אותו דפוס בדיוק כמו ציוד המכינה למטה. שני התחומים
       חולקים מסך אחד (Equipment.jsx) ונבדלים רק בלוח.
     ============================================================ */

  /** הציוד של התחום ורשימת הקניות שלו */
  getKitchen: (area) =>
    get("/api/kitchen?action=equip" + (area ? "&area=" + encodeURIComponent(area) : "")),

  /** פריט חדש. par ריק = בלי מפתח. */
  addKitchenItem: ({ name, qty, kind, par, area }) =>
    post("/api/kitchen?action=equip", { name, qty, kind, par, area }),

  /** עריכת פריט. שדה שלא נשלח אינו משתנה. */
  /** ⚠ delta מוסיף לכמות הקיימת; qty דורס אותה. לא לשלוח שניהם. */
  addKitchenQty: ({ itemId, delta }) =>
    put("/api/kitchen?action=equip", { itemId, delta }),

  editKitchenItem: ({ itemId, name, qty, kind, par }) =>
    put("/api/kitchen?action=equip", { itemId, name, qty, kind, par }),

  /** ⚠ מחיקה — בלתי הפיך, השורה נמחקת מהלוח */
  deleteKitchenItem: (itemId) => del("/api/kitchen?action=equip", { itemId }),

  addKitchenShopping: (items, area) => post("/api/kitchen?action=shop", { items, area }),
  setKitchenShoppingStatus: ({ itemId, status }) =>
    put("/api/kitchen?action=shop", { itemId, status }),
  deleteKitchenShopping: (itemId) => del("/api/kitchen?action=shop", { itemId }),

  /* --- תקציב המטבח — מנהל בלבד --- */
  getBudget: (month) =>
    get("/api/kitchen?action=budget" + (month ? "&month=" + encodeURIComponent(month) : "")),
  /** סיכום שנתי — חודש־חודש ובסוף הסך הכול */
  getBudgetYear: () => get("/api/kitchen?action=budget&view=year"),
  /** כפיית סוג או מחיר ליום. הכול ריק = חזרה לגזירה מהלו״ז. */
  /** ⚠ type2 הוא סוג נוסף שמתחבר לראשון ("שגרה + אחר"), לא מחליף אותו. */
  setBudgetDay: ({ date, type, type2, cost, flat, note }) =>
    put("/api/kitchen?action=budget", { date, type, type2, cost, flat, note }),
  /** מצבת סועדים. ⚠ mode:"forward" משנה קדימה בלבד; "retro" מתקן את כל השנה. */
  setHeadcount: ({ headcount, mode, from }) =>
    put("/api/kitchen?action=budget", { headcount, mode, from }),
  /** תקציב סוג יום — קייטרינג/קבוע/קניות. ⚠ משנה את כל השנה. */
  setDayTypeBudget: (body) => put("/api/kitchen?action=budget", body),
  /** קנייה — שבועית או רבעונית. ⚠ יורדת מתקציב הקניות. */
  addPurchase: (body) => post("/api/kitchen?action=budget", body),
  deletePurchase: (orderId) => del("/api/kitchen?action=budget", { orderId }),

  /* ---------- בוגרים · אירוח · השאלות · תפריט ---------- */
  /* ---------- התראות ----------
     ⚠ נגזרות בשרת מהמצב הנוכחי ואינן תור שמור. ראו api/_notify.js. */
  /* ---------- זהות ----------
     ⚠ הסיסמה נשלחת בגוף הבקשה ולעולם לא ב-URL: כתובות נשמרות
        בהיסטוריה, בלוגים של שרתים ובכותרת Referer. */
  signin: (user, password) => post("/api/auth?action=signin", { user, password }),
  getAccount: () => get("/api/auth?action=account"),
  saveAccount: (b) => post("/api/auth?action=account", b),
  forgot: (user) => post("/api/auth?action=recover", { user }),
  /* ⚠ הקוד נבדק תמיד מול שם המשתמש. שש ספרות לבדן ניתנות
     לניחוש; שש ספרות של אדם מסוים אינן. */
  checkReset: (user, token) =>
    get(`/api/auth?action=recover&user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}`),
  resetPassword: (user, token, password) =>
    post("/api/auth?action=recover", { user, token, password }),

  /* ⚠ אבחון הדואר — מנהל בלבד. מחזיר את שגיאת Resend כלשונה,
     כי בלעדיה "השליחה נכשלה" הוא כל מה שיש. */
  getMailStatus: () => get("/api/auth?action=mailtest"),
  sendTestMail: (to) => post("/api/auth?action=mailtest", { to }),

  getNotify: () => get("/api/auth?action=notify"),
  markNotifySeen: () => post("/api/auth?action=notify", {}),

  /* ---------- מחזורים ----------
     ⚠ ראש המכינה בלבד. פתיחת מחזור יוצרת 19 לוחות ב-monday. */
  getCycles: () => get("/api/students?action=cycles"),
  /* ---------- ייבוא נתוני מחזור ----------
     ⚠ תמיד תצוגה מקדימה לפני כתיבה. ראו api/_cycle-import.js. */
  importPreview: (cycleId, step, text) =>
    post("/api/students?action=import", { cycleId, step, text }),
  importCommit: (cycleId, step, text) =>
    post("/api/students?action=import", { cycleId, step, text, commit: true }),
  importRows: (cycleId, step) =>
    get(`/api/students?action=import&cycleId=${encodeURIComponent(cycleId)}&step=${encodeURIComponent(step)}`),
  importEdit: (b) => put("/api/students?action=import", b),
  importDelete: (cycleId, step, id) =>
    del("/api/students?action=import", { cycleId, step, id }),
  addCycle: (b) => post("/api/students?action=cycles", b),
  editCycle: (b) => put("/api/students?action=cycles", b),
  deleteCycle: (id) => del("/api/students?action=cycles", { id }),

  getAlumni: () => get("/api/students?action=alumni"),
  addAlumni: (b) => post("/api/students?action=alumni", b),
  editAlumni: (b) => put("/api/students?action=alumni", b),

  getHosting: () => get("/api/students?action=hosting"),
  addHosting: (b) => post("/api/students?action=hosting", b),
  editHosting: (b) => put("/api/students?action=hosting", b),
  deleteHosting: (id) => del("/api/students?action=hosting", { id }),

  getLoans: () => get("/api/container?action=loans"),
  addLoan: (b) => post("/api/container?action=loans", b),
  editLoan: (b) => put("/api/container?action=loans", b),
  deleteLoan: (id) => del("/api/container?action=loans", { id }),

  getMenu: () => get("/api/kitchen?action=menu"),
  /** ⚠ תכנון: אילו מנות ולכמה אנשים. מחזיר מצרכים מול המלאי. */
  planMenu: ({ dishIds, heads }) =>
    get(`/api/kitchen?action=menu&plan=${encodeURIComponent(dishIds.join(","))}&heads=${encodeURIComponent(heads)}`),
  addDish: (b) => post("/api/kitchen?action=menu", b),
  editDish: (b) => put("/api/kitchen?action=menu", b),
  deleteDish: (dishId) => del("/api/kitchen?action=menu", { dishId }),
  saveMenu: (b) => post("/api/kitchen?action=menu", { menu: true, ...b }),

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

  /* --- ציוד המכינה (מכולה / ניקיון) — מנהל או אחראי מכולה --- */
  getContainer: (area) =>
    get("/api/container?action=equip" + (area ? "&area=" + encodeURIComponent(area) : "")),
  addEquip: ({ name, qty, kind, par, area }) =>
    post("/api/container?action=equip", { name, qty, kind, par, area }),
  /** ⚠ delta מוסיף לכמות הקיימת; qty דורס אותה. לא לשלוח שניהם. */
  addEquipQty: ({ itemId, delta }) =>
    put("/api/container?action=equip", { itemId, delta }),

  editEquip: ({ itemId, name, qty, kind, par }) =>
    put("/api/container?action=equip", { itemId, name, qty, kind, par }),
  deleteEquip: (itemId) => del("/api/container?action=equip", { itemId }),
  /** יצירת רשימת קניות — כמה שורות בבת אחת, בתחום אחד */
  addShopping: (items, area) => post("/api/container?action=shop", { items, area }),
  setShoppingStatus: ({ itemId, status }) => put("/api/container?action=shop", { itemId, status }),
  deleteShopping: (itemId) => del("/api/container?action=shop", { itemId }),

  /** שיבוץ מובילי השבוע — 43 השבועות והרשימה לשיבוץ. מנהל בלבד. */
  getLeaderWeeks: (today) =>
    get("/api/students?action=weeks" + (today ? "&today=" + encodeURIComponent(today) : "")),

  /** שיבוץ מובילים לשבוע. נושא את הרשימה המלאה (עד 3). */
  assignWeek: ({ weekId, studentIds }) =>
    post("/api/students?action=weeks", { weekId, studentIds }),

  /** ⚠ קריאה נפרדת משיבוץ המובילים: החלפת מלווה לא תמחק אותם. */
  setWeekEscort: ({ weekId, escort }) =>
    post("/api/students?action=weeks", { weekId, escort }),

  /** עריכת תאריכי שבוע. מנהל בלבד. */
  editWeek: ({ weekId, start, end }) =>
    put("/api/students?action=weeks", { weekId, start, end }),

  /* ---------- בטיחות ותקלות ----------
     ⚠ מנהל או אחראי בטיחות בלבד — נאכף בשרת. */
  getSafety: () => get("/api/students?action=safety"),
  addSafety: (body) => post("/api/students?action=safety", body),
  editSafety: (body) => put("/api/students?action=safety", body),
  setupSafety: () => post("/api/students?action=safety-setup", {}),

  /** ⚠ מחיקת דיווח בטיחות — בלתי הפיך. המסך דורש אישור כפול. */
  deleteSafety: (id) => del("/api/students?action=safety", { id }),

  /* ---------- תקלות ובעיות ----------
     ⚠ מנהל או אב בית בלבד — נאכף בשרת. */
  getFaults: () => get("/api/students?action=faults"),
  addFault: (body) => post("/api/students?action=faults", body),
  editFault: (body) => put("/api/students?action=faults", body),
  deleteFault: (id) => del("/api/students?action=faults", { id }),
  setupFaults: () => post("/api/students?action=faults-setup", {}),

  /* ---------- שיבוצי חניכים ---------- */

  /** ההגדרות והשיבוצים. מנהל מקבל הכול; חניך — את שלו בלבד. */
  getPlacements: () => get("/api/students?action=placements"),

  /** הקמת הלוחות בלחיצה — פיתוח מקומי בלבד, מנהל בלבד */
  setupPlacements: () => post("/api/students?action=placements-setup", {}),

  /** שיבוץ לרשימה מלאה של חניכים בשיבוץ+סמסטר. מנהל בלבד. */
  assignPlacement: ({ placementId, semester, studentIds }) =>
    post("/api/students?action=placements", { placementId, semester, studentIds }),

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
  /** הלו״ז מיומן Google — היום ושבועיים קדימה. ⚠ צפייה בלבד. */
  getAgenda: () => get("/api/lessons?action=agenda"),

  /** לוח השיעורים של אחראי הלו״ז — הכול נשלף מהגיליונות. */
  getLessonsBoard: (today) =>
    get("/api/lessons?action=board" + (today ? "&today=" + encodeURIComponent(today) : "")),

  getGantt: () => get("/api/lessons?action=gantt"),
  /** עריכת הלו״ז — מנהל ואחראי לו״ז. השרת אוכף. */
  addGanttEvent: ({ name, start, end, type }) =>
    post("/api/lessons?action=gantt", { name, start, end, type }),
  editGanttEvent: ({ id, name, start, end, type }) =>
    put("/api/lessons?action=gantt", { id, name, start, end, type }),
  deleteGanttEvent: (id) => del("/api/lessons?action=gantt", { id }),

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

  /** עריכת חוות דעת — בעיקר ההערה על שורה שנפתחה אוטומטית */
  /** ⚠ manualScore: מספר 1–10, או null לניקוי. השמטה = בלי שינוי. */
  editLessonEval: ({ evalId, name, topic, field, phone, opinion, manualScore }) =>
    put("/api/lessons?action=evals",
      { evalId, name, topic, field, phone, opinion, manualScore }),
};
