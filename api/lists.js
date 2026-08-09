/* ============================================================
   /api/lists — רשימות הקניות, מחזור החיים המלא
     ?action=read      GET    רשימות ושורותיהן
     ?action=sync      POST   סנכרון הרשימות החיות
     ?action=create    POST   פתיחת רשימת טיוטה
     ?action=row       POST   עריכת שורה
     ?action=status    POST   מעבר סטטוס
     ?action=receive   POST   קבלת מצרכים
   ============================================================ */

import { router } from "./_router.js";
import read from "./_lists.js";
import sync from "./_lists-sync.js";
import create from "./_list-create.js";
import row from "./_list-row.js";
import status from "./_list-status.js";
import receive from "./_list-receive.js";

export default router({ read, sync, create, row, status, receive });
