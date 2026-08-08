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
  if (onUnauthorized && !path.startsWith("/api/login") && !path.startsWith("/api/logout")) {
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
  login: (code) => post("/api/login", { code }),
  logout: () => post("/api/logout", {}),
  me: () => get("/api/me"),
  setMyName: (name) => post("/api/me", { name }),

  /** רשימות הקניות, כל אחת עם השורות שלה */
  getLists: () => get("/api/lists"),

  getCatalog: () => get("/api/catalog"),
  getMoves: () => get("/api/moves"),

  /** תורני היום מלוח השיבוץ. רשימה ריקה = אין מה להציג. */
  getDutyToday: (date) =>
    get("/api/duty-today" + (date ? `?date=${encodeURIComponent(date)}` : "")),

  /* --- משימות ניקיון שבועיות --- */

  /** מוודא שקיימות שורות ביצוע לשבוע הנוכחי. אידמפוטנטי. */
  ensureWeek: () => post("/api/tasks-week", {}),

  /** משימות היום לפי שעון ישראל. date אופציונלי — מצב בדיקה בלבד. */
  getTodayTasks: (date) =>
    get("/api/tasks-today" + (date ? `?date=${encodeURIComponent(date)}` : "")),

  /** מסמן משימה. שולח את המצב הרצוי, לא "הפוך". */
  setTaskDone: (rowId, done) => post("/api/task-toggle", { rowId, done }),

  /** סיכום שבועי למנהל. קריאה בלבד, ברמת יום — בלי שמות. */
  getTasksSummary: (date) =>
    get("/api/tasks-summary" + (date ? `?date=${encodeURIComponent(date)}` : "")),

  /** קבלת סחורה: כמויות לפי rowId. סוגרת את הרשימה ומעדכנת מלאי. */
  receiveList: ({ listId, user, received }) =>
    post("/api/list-receive", { listId, user: { name: user.name }, received }),

  /** מוודא שהרשימות החיות משקפות את החוסרים הנוכחיים. אידמפוטנטי. */
  syncLists: () => post("/api/lists-sync", {}),

  /** מעבר סטטוס של רשימה. השרת אוכף מי רשאי ואילו מעברים חוקיים. */
  setListStatus: ({ listId, to, user }) =>
    post("/api/list-status", { listId, to, user: { name: user.name, role: user.role } }),

  /** עריכה ידנית של שורה: add / setQty / remove */
  editRow: (body) => post("/api/list-row", body),

  /** פותח רשימת טיוטה לספק. מחזיר את הקיימת אם יש. */
  createList: ({ sup, user }) =>
    post("/api/list-create", { sup, user: { name: user.name } }),

  /** דיווח יומי: קבלה / שימוש / פחת */
  commitMoves: ({ type, user, entries }) =>
    post("/api/moves", {
      type,
      user,
      entries: entries.map((e) => ({
        pid: e.pid,
        qty: e.qty,
        reason: e.reason || null,
      })),
    }),

  /** ביטול דיווח — מסמן אותו כמבוטל ומחזיר את המלאי */
  cancelMove: (moveId) => post("/api/move-cancel", { moveId }),

  /** ספירה שבועית: קובעת מלאי וסימון תוקף */
  finishCount: ({ user, entries }) => post("/api/count", { user, entries }),
};
