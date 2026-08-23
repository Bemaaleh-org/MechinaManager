/* ============================================================
   /api/kitchen — ציוד המטבח
     ?action=equip   GET/POST/PUT/DELETE   הציוד עצמו
     ?action=shop    POST/PUT/DELETE       רשימת הקניות

   שני תחומים באותו לוח: ציוד אוכל וציוד חד״פ. הסינון לפי
   תחום נעשה בשרת, לא בדפדפן.

   ⚠ הנתב אינו נוגע באימות. שני המודולים עטופים ב-withAuth
     ללא דגלים — צוות ותורנים נכנסים, סשן חניך נדחה. זה קהל
     המטבח מאז ומתמיד.

   ⚠ הלוחות נוצרים על ידי tools/seed-kitchen.mjs. עד שהם
     קיימים המודולים מחזירים 503 מפורש ולא רשימה ריקה.
   ============================================================ */

import { router } from "./_router.js";
import equip from "./_kitchen-equip.js";
import shop from "./_kitchen-shop.js";
import doctor from "./_kitchen-doctor.js";

export default router({ equip, shop, doctor });
