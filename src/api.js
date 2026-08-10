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

function handle401(path, data) {
  if (onUnauthorized && !path.startsWith("/api/auth?action=login") && !path.startsWith("/api/auth?action=logout")) {
    onUnauthorized(data.error || "נדרשת כניסה מחדש");
  }
}

async function post(path, body) {
  let r;
  try {
    r = await fetch(path, {
      method: "POST",
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
  getUsers: () => get("/api/users"),

  /** רשימות הקניות, כל אחת עם השורות שלה */
  getLists: () => get("/api/lists?action=read"),

  getCatalog: () => get("/api/catalog"),
  getMoves: () => get("/api/moves?action=read"),

  /** תורני היום מלוח השיבוץ. רשימה ריקה = אין מה להציג. */
  getDutyToday: (date) =>
    get("/api/duty?action=today" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** שיבוץ השבוע כולו — 7 תאים לפי אינדקס היום. קריאה בלבד. */
  getDutyWeek: (date) =>
    get("/api/duty?action=week" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /* --- משימות ניקיון שבועיות --- */

  /** מוודא שקיימות שורות ביצוע לשבוע הנוכחי. אידמפוטנטי. */
  ensureWeek: () => post("/api/tasks?action=ensure", {}),

  /** משימות היום לפי שעון ישראל. date אופציונלי — מצב בדיקה בלבד. */
  getTodayTasks: (date) =>
    get("/api/tasks?action=today" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** מסמן משימה. שולח את המצב הרצוי, לא "הפוך". */
  setTaskDone: (rowId, done) => post("/api/tasks?action=toggle", { rowId, done }),

  /** סיכום שבועי למנהל. קריאה בלבד, ברמת יום — בלי שמות. */
  getTasksSummary: (date) =>
    get("/api/tasks?action=summary" + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** פירוט משימות של יום אחד. מנהל בלבד, קריאה בלבד. */
  getTasksDay: (day, date) =>
    get(`/api/tasks?action=day&day=${encodeURIComponent(day)}`
        + (date ? `&date=${encodeURIComponent(date)}` : "")),

  /** קבלת סחורה: כמויות לפי rowId. סוגרת את הרשימה ומעדכנת מלאי. */
  receiveList: ({ listId, user, received }) =>
    post("/api/lists?action=receive", { listId, user: { name: user.name }, received }),

  /** מוודא שהרשימות החיות משקפות את החוסרים הנוכחיים. אידמפוטנטי. */
  syncLists: () => post("/api/lists?action=sync", {}),

  /** מעבר סטטוס של רשימה. השרת אוכף מי רשאי ואילו מעברים חוקיים. */
  setListStatus: ({ listId, to, user }) =>
    post("/api/lists?action=status", { listId, to, user: { name: user.name, role: user.role } }),

  /** עריכה ידנית של שורה: add / setQty / remove */
  editRow: (body) => post("/api/lists?action=row", body),

  /** פותח רשימת טיוטה לספק. מחזיר את הקיימת אם יש. */
  createList: ({ sup, user }) =>
    post("/api/lists?action=create", { sup, user: { name: user.name } }),

  /** דיווח יומי: קבלה / שימוש / פחת */
  commitMoves: ({ type, user, entries }) =>
    post("/api/moves?action=commit", {
      type,
      user,
      entries: entries.map((e) => ({
        pid: e.pid,
        qty: e.qty,
        reason: e.reason || null,
      })),
    }),

  /** ביטול דיווח — מסמן אותו כמבוטל ומחזיר את המלאי */
  cancelMove: (moveId) => post("/api/moves?action=cancel", { moveId }),

  /** ספירה שבועית: קובעת מלאי וסימון תוקף */
  finishCount: ({ user, entries }) => post("/api/moves?action=count", { user, entries }),
};
