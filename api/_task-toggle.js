/* ============================================================
   POST /api/task-toggle   { rowId, done }

   מסמן משימה כבוצעה או מבטל את הסימון.

   ⚠ הבקשה נושאת את המצב הרצוי (done: true/false) ולא "הפוך את
     מה שיש". זה מכוון: כל התורנים של אותו יום אחראים יחד, ושניים
     שלוחצים כמעט יחד על אותה משימה שולחים את אותה כוונה. בקשת
     "הפוך" הייתה גורמת לשנייה לבטל את הראשונה, והמשימה הייתה
     חוזרת ל"לא בוצע" בלי שאיש התכוון לכך.

     במבנה הזה שתי לחיצות זהות נותנות אותה תוצאה, אין שגיאה
     למשתמש, ושניהם רואים את אותו מצב ברענון הבא.

   אין רישום של מי סימן — האחריות משותפת, בכוונה.
   ============================================================ */

import { gql } from "./_monday.js";
import { withAuth } from "./_session.js";
import { TASK_BOARDS, TASK_COLS, DONE } from "../shared/tasks-boards.js";

const E = TASK_COLS.execution;

export async function setTaskDone(rowId, done, at = new Date()) {
  const cols = { [E.done]: { label: done ? DONE.yes : DONE.no } };

  if (done) {
    // התאריך נשמר בשעון ישראל, כדי שסימון בערב לא ייפול ליום הבא
    const israel = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(at);
    cols[E.markedAt] = { date: israel };
  } else {
    cols[E.markedAt] = {}; // ביטול מנקה גם את התאריך
  }

  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: TASK_BOARDS.execution, i: String(rowId), v: JSON.stringify(cols) }
  );

  return { rowId: String(rowId), done };
}

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }
  try {
    const body = req.body ?? (await readJson(req));
    const { rowId, done } = body || {};
    if (!rowId) return res.status(400).json({ error: "לא צוינה משימה" });
    if (typeof done !== "boolean") return res.status(400).json({ error: "לא צוין מצב הסימון" });

    res.status(200).json({ ok: true, ...(await setTaskDone(rowId, done)) });
  } catch (e) {
    console.error("[task-toggle]", e);
    res.status(502).json({ error: "עדכון המשימה נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler);
