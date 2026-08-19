/* ============================================================
   /api/students — חניכי המכינה
     ?action=login   POST   תעודת זהות → סשן חניך
     ?action=list    GET    רשימת החניכים וסיכומיהם (מנהל בלבד)
     ?action=year    GET    הלוח השנתי של חניך אחד
     ?action=leader  POST   מינוי או ביטול מוביל שבוע (מנהל בלבד)

   ⚠ login אינו דורש סשן, ולכן הקובץ הזה אינו נעטף ב-withAuth —
     כל מודול מביא את ההגנה שלו, בדיוק כמו ב-api/auth.js.
     list מוגן ב-{manager:true} ו-year ב-{student:true}, ושניהם
     נשארים מוגנים גם דרך הנתב.
   ============================================================ */

import { router } from "./_router.js";
import login from "./_student-login.js";
import list from "./_students-list.js";
import year from "./_student-year.js";
import leader from "./_student-leader.js";

export default router({ login, list, year, leader });
