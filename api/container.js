/* ============================================================
   /api/container — ציוד המכולה
     ?action=equip   GET/POST/PUT/DELETE   הציוד עצמו
     ?action=shop    POST/PUT/DELETE       רשימת הקניות

   ⚠ שני המודולים עטופים ב-{container:true} — מנהל או אחראי
     המכולה. חניך אחר מקבל 403 גם דרך הנתב.
   ============================================================ */

import { router } from "./_router.js";
import equip from "./_container-equip.js";
import shop from "./_container-shop.js";

export default router({ equip, shop });
