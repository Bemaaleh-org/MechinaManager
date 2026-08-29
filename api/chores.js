/* ============================================================
   /api/chores — תורניות המכינה
     ?action=view    GET    כל המסך בקריאה אחת (admin=1 מרחיב)
     ?action=assign  POST   שיבוץ גזרה לשבוע, או יום לתורנות
     ?action=sector  POST   הגדרת גזרה — יצירה ועריכה
     ?action=adjust  POST/DELETE   +1 / -1 ידני על הספירה
     ?action=task    POST/DELETE   תבנית הצ׳ק ליסט
     ?action=tick    POST   סימון מטלה כבוצעה, וביטול
     ?action=text    PUT    עריכת בלוק טקסט

   ------------------------------------------------------------
   ⚠ **קובץ נספר שביעי מתוך 12.** התורניות הן תחום שלם — חמישה
     לוחות, שבע פעולות ושני קהלים — ודחיפה שלהן לתוך
     `students.js` הייתה הופכת אותו לנתב של עשרים ושתיים
     פעולות. אותו שיקול שבגללו `container.js` נפרד.

     **תפוסות עכשיו 7. נותרו 5.**

   ⚠ הנתב אינו עוטף באימות — כל מודול מביא את ה-`withAuth` שלו.
     כולם `{ student: true }`, כי חניך **כן** נכנס לכאן: הוא
     רואה את הלוח ואת טבלת המעקב, ותורן היום מסמן צ׳ק ליסט.
     ההרשאה האמיתית היא `mayChores` בתוך כל מודול.
   ============================================================ */

import { router } from "./_router.js";
import view from "./_chores-view.js";
import { assign, sector, adjust, task, tick, text } from "./_chores-write.js";

export default router({ view, assign, sector, adjust, task, tick, text });
