/* ============================================================
   /api/auth — כניסה, יציאה וזהות
     ?action=login    POST   קוד → סשן
     ?action=logout   POST   ניקוי העוגייה
     ?action=me       GET    מי מחובר
     ?action=me       POST   חניך בוחר או מחליף שם

   ⚠ login ו-logout אינם דורשים סשן, ו-me כן. לכן הקובץ הזה
     אינו נעטף ב-withAuth — כל מודול מביא את ההגנה שלו.
     logout חייב להצליח גם למי שהעוגייה שלו פגה, אחרת הוא
     נשאר תקוע עם עוגייה מתה.
   ============================================================ */

import { router } from "./_router.js";
import login from "./_login.js";
import logout from "./_logout.js";
import me from "./_me.js";

export default router({ login, logout, me });
