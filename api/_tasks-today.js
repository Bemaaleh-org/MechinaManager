/* ============================================================
   GET /api/tasks-today
   משימות הניקיון של היום הנוכחי, לפי שעון ישראל.

   מחזיר שורות מלוח הביצוע של השבוע הנוכחי, מסוננות ליום הזה
   וממוינות לפי "סדר תצוגה". הפירוט לתורן נשלף מלוח התבנית
   דרך "מזהה משימה בתבנית".

   בשבת אין משימות — מוחזרת רשימה ריקה עם ציון הסיבה.
   ============================================================ */

import { gql } from "./_monday.js";
import { withAuth } from "./_session.js";
import { parseTestDate } from "./_test-date.js";
import { TASK_BOARDS, TASK_COLS, DONE } from "../shared/tasks-boards.js";
import { weekId, israelDayLetter } from "../shared/week.js";

const T = TASK_COLS.template;
const E = TASK_COLS.execution;

const val = (item, colId) => (item.column_values.find((c) => c.id === colId) || {}).text || "";

async function allItems(boardId) {
  const out = [];
  let cursor = null;
  do {
    const page = cursor
      ? `next_items_page(limit:500, cursor:${JSON.stringify(cursor)}){ cursor items { id name column_values { id text } } }`
      : `boards(ids:[${boardId}]){ items_page(limit:500){ cursor items { id name column_values { id text } } } }`;
    const data = await gql(`{ ${page} }`);
    const p = cursor ? data.next_items_page : data.boards[0].items_page;
    out.push(...p.items);
    cursor = p.cursor;
  } while (cursor);
  return out;
}

export async function todayTasks(at = new Date()) {
  const week = weekId(at);
  const day = israelDayLetter(at);

  if (!day) {
    return { week, day: "שבת", tasks: [], total: 0, doneCount: 0, restDay: true };
  }

  const [execRows, templateRows] = await Promise.all([
    allItems(TASK_BOARDS.execution),
    allItems(TASK_BOARDS.template),
  ]);

  const detailOf = new Map(
    templateRows.map((t) => [String(t.id), val(t, T.detail)])
  );

  const tasks = execRows
    .filter((r) => val(r, E.week) === week && val(r, E.day) === day)
    .map((r) => ({
      rowId: String(r.id),
      name: r.name,
      focus: val(r, E.focus),
      done: val(r, E.done) === DONE.yes,
      order: Number(val(r, E.order)) || 0,
      detail: detailOf.get(val(r, E.templateId)) || "",
    }))
    .sort((a, b) => a.order - b.order || a.rowId.localeCompare(b.rowId, undefined, { numeric: true }));

  return {
    week,
    day,
    tasks,
    total: tasks.length,
    doneCount: tasks.filter((t) => t.done).length,
    restDay: false,
  };
}

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const testAt = parseTestDate(req.query?.date);
    const data = await todayTasks(testAt || new Date());
    res.status(200).json(testAt ? { ...data, testMode: true, testDate: req.query.date } : data);
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[tasks-today]", e);
    res.status(502).json({ error: "שליפת משימות היום נכשלה" });
  }
}

export default withAuth(handler);
