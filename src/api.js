/* ============================================================
   קריאות לשכבת הביניים
   ------------------------------------------------------------
   זה מה שהאפליקציה מכירה. היא לא יודעת ש-monday קיימת, ולא
   רואה טוקן — רק כתובות מקומיות שהשרת מטפל בהן.
   ============================================================ */

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
  if (!r.ok) throw new Error(data.error || `השרת החזיר שגיאה ${r.status}`);
  return data;
}

export const api = {
  /** רשימות הקניות, כל אחת עם השורות שלה */
  getLists: () => get("/api/lists"),

  getCatalog: () => get("/api/catalog"),
  getMoves: () => get("/api/moves"),

  /* --- משימות ניקיון שבועיות --- */

  /** מוודא שקיימות שורות ביצוע לשבוע הנוכחי. אידמפוטנטי. */
  ensureWeek: () => post("/api/tasks-week", {}),

  /** משימות היום לפי שעון ישראל */
  getTodayTasks: () => get("/api/tasks-today"),

  /** מסמן משימה. שולח את המצב הרצוי, לא "הפוך". */
  setTaskDone: (rowId, done) => post("/api/task-toggle", { rowId, done }),

  /** סיכום שבועי למנהל. קריאה בלבד, ברמת יום — בלי שמות. */
  getTasksSummary: () => get("/api/tasks-summary"),

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
