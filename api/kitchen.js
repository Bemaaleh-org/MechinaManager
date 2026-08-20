/* ============================================================
   /api/kitchen — כל נקודות הקצה של המטבח בקובץ נספר אחד
   ------------------------------------------------------------
   איחוד של שישה קבצים נספרים (catalog, users, duty, lists,
   moves, tasks) לאחד, כדי לשחרר משבצות במגבלת 12 הפונקציות
   של Vercel. שום לוגיקה לא זזה: כל action ממופה לאותו מודול
   ‎_‎ שהיה מאחורי הנתב הישן, על אותה עטיפת אימות בדיוק.

     ?action=catalog                    הקטלוג
     ?action=users                      משתמשים (מנהל בלבד)
     ?action=duty-today | duty-week     שיבוץ תורנויות
     ?action=lists-*                    רשימות קניות
     ?action=moves-*                    תנועות מלאי
     ?action=tasks-*                    משימות

   ⚠ הנתב אינו נוגע באימות — כל מודול מביא את withAuth שלו,
     בדיוק כפי שהיה. moves-read ו-moves-commit יושבים באותו
     מודול ומופרדים בו לפי המתודה, כמו קודם.

   ⚠ שינוי כתובת נקודת קצה משתקף בשלושה מקומות בלבד:
     כאן, src/api.js (הדלת היחידה), ו-tools/api-snapshot.mjs.
   ============================================================ */

import { router } from "./_router.js";

import catalog from "./_catalog.js";
import users from "./_users.js";

import dutyToday from "./_duty-today.js";
import dutyWeek from "./_duty-week.js";

import listsRead from "./_lists.js";
import listsSync from "./_lists-sync.js";
import listCreate from "./_list-create.js";
import listRow from "./_list-row.js";
import listStatus from "./_list-status.js";
import listReceive from "./_list-receive.js";

import moves from "./_moves.js";
import moveCancel from "./_move-cancel.js";
import movesCount from "./_count.js";

import tasksToday from "./_tasks-today.js";
import tasksSummary from "./_tasks-summary.js";
import tasksDay from "./_tasks-day.js";
import tasksEnsure from "./_tasks-week.js";
import taskToggle from "./_task-toggle.js";

export default router({
  catalog,
  users,

  "duty-today": dutyToday,
  "duty-week": dutyWeek,

  "lists-read": listsRead,
  "lists-sync": listsSync,
  "lists-create": listCreate,
  "lists-row": listRow,
  "lists-status": listStatus,
  "lists-receive": listReceive,

  "moves-read": moves,
  "moves-commit": moves,
  "moves-cancel": moveCancel,
  "moves-count": movesCount,

  "tasks-today": tasksToday,
  "tasks-summary": tasksSummary,
  "tasks-day": tasksDay,
  "tasks-ensure": tasksEnsure,
  "tasks-toggle": taskToggle,
});
