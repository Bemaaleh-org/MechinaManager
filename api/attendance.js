/* ============================================================
   /api/attendance — נוכחות ובקשות יציאה
     ?action=day        GET    מצב יום אחד (מנהל / מוביל שבוע)
     ?action=mark       POST   שמירת סימון היום
     ?action=requests   GET    רשימת בקשות
     ?action=requests   POST   הגשת בקשה
     ?action=decide     POST   אישור או דחייה (מנהל בלבד)
     ?action=recost     POST   תיקון ימי החופש שנגבו, בדיעבד

   ⚠ הנתב אינו נוגע באימות. כל מודול מביא את ההגנה שלו:
     day ו-mark ב-{marker:true}, requests ב-{student:true},
     decide ב-{manager:true}, ו-recost ב-{student:true} עם
     `mayRecost` בפנים. ההתנהגות דרך הנתב זהה לקריאה ישירה
     למודול.

   ⚠ **recost אינו decide.** הוא אינו נוגע בהחלטה ואינו במחיקת
     שורות — רק במחיר במכסה. ראו הבלוק בראש _request-recost.js.
   ============================================================ */

import { router } from "./_router.js";
import day from "./_attendance-day.js";
import mark from "./_attendance-mark.js";
import requests from "./_requests.js";
import decide from "./_request-decide.js";
import recost from "./_request-recost.js";
import train from "./_training-mark.js";

export default router({ day, mark, requests, decide, recost, train });
