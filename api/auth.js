/* ============================================================
   /api/auth — כניסה, יציאה וזהות
     ?action=login    POST   קוד → סשן
     ?action=logout   POST   ניקוי העוגייה
     ?action=me       GET    מי מחובר
     ?action=me       POST   חניך בוחר או מחליף שם
     ?action=notify   GET    ההתראות של מי שמחובר
     ?action=notify   POST   סימון שנקראו
     ?action=signin   POST   שם משתמש וסיסמה
     ?action=account  GET/POST  קביעת שם משתמש וסיסמה
     ?action=recover  GET/POST  שכחתי סיסמה

   ⚠ ההתראות יושבות כאן ולא בקובץ משלהן בגלל מגבלת 12
     הפונקציות של Vercel — וגם כי הן שאלה על **מי שמחובר**,
     בדיוק כמו me.

   ⚠ login ו-logout אינם דורשים סשן, ו-me כן. לכן הקובץ הזה
     אינו נעטף ב-withAuth — כל מודול מביא את ההגנה שלו.
     logout חייב להצליח גם למי שהעוגייה שלו פגה, אחרת הוא
     נשאר תקוע עם עוגייה מתה.
   ============================================================ */

import { router } from "./_router.js";
import login from "./_login.js";
import logout from "./_logout.js";
import me from "./_me.js";
import notify from "./_notify.js";
import signin from "./_signin.js";
import account from "./_account.js";
import recover from "./_recover.js";

export default router({ login, logout, me, notify, signin, account, recover });
