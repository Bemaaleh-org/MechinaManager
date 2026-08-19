/* ============================================================
   /api/attendance — נוכחות ובקשות יציאה
     ?action=day        GET    מצב יום אחד (מנהל / מוביל שבוע)
     ?action=mark       POST   שמירת סימון היום
     ?action=requests   GET    רשימת בקשות
     ?action=requests   POST   הגשת בקשה
     ?action=decide     POST   אישור או דחייה (מנהל בלבד)

   ⚠ הנתב אינו נוגע באימות. כל מודול מביא את ההגנה שלו:
     day ו-mark ב-{marker:true}, requests ב-{student:true},
     decide ב-{manager:true}. ההתנהגות דרך הנתב זהה לקריאה
     ישירה למודול.
   ============================================================ */

import { router } from "./_router.js";
import day from "./_attendance-day.js";
import mark from "./_attendance-mark.js";
import requests from "./_requests.js";
import decide from "./_request-decide.js";

export default router({ day, mark, requests, decide });
