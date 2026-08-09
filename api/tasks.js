/* ============================================================
   /api/tasks — משימות הניקיון
     ?action=today     GET    משימות היום
     ?action=summary   GET    סיכום שבועי (מנהל בלבד)
     ?action=ensure    POST   יצירת שורות השבוע
     ?action=toggle    POST   סימון משימה

   summary נשאר עטוף ב-withAuth({manager:true}) במודול שלו,
   ולכן מחזיר 403 לתורן בדיוק כמו קודם.
   ============================================================ */

import { router } from "./_router.js";
import today from "./_tasks-today.js";
import summary from "./_tasks-summary.js";
import ensure from "./_tasks-week.js";
import toggle from "./_task-toggle.js";

export default router({ today, summary, ensure, toggle });
