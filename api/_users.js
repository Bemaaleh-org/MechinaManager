/* ============================================================
   GET /api/users
   רשימת המשתמשים לתצוגה בטאב הניהול.

   ⚠ הקוד לעולם לא יוצא מכאן. התשובה מכילה שם, סוג והאם פעיל
     בלבד — גם למנהל. עריכה נעשית בלוח ב-monday.

   מנהל בלבד: זו תמונת ההרשאות של המכינה, ואין סיבה שתורן
   יראה מי מוגדר מנהל ומי כובה.

   משתמש במטמון המשותף דרך authRows() — אותן 30 שניות של
   שכבת האימות, בלי קריאה נוספת ל-monday.
   ============================================================ */

import { withAuth } from "./_session.js";
import { authRows } from "./_session.js";
import { KIND } from "../shared/auth-board.js";

const ORDER = [KIND.manager, KIND.trainee, KIND.shared];

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }
  try {
    const rows = await authRows();

    // מיפוי מפורש ולא השמטה: כך תוספת עמודה עתידית בלוח
    // לא תדלוף החוצה בטעות.
    const users = rows
      .map((r) => ({ id: r.id, name: r.name, kind: r.kind, active: r.active }))
      .sort((a, b) =>
        (ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)) ||
        a.name.localeCompare(b.name, "he", { numeric: true }));

    res.status(200).json({ users, count: users.length });
  } catch (e) {
    console.error("[users]", e);
    res.status(502).json({ error: "שליפת המשתמשים נכשלה" });
  }
}

export default withAuth(handler, { manager: true });
