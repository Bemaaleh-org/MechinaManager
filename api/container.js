/* ============================================================
   /api/container — ציוד המכולה
     ?action=equip   GET/POST/PUT/DELETE   הציוד עצמו
     ?action=shop    POST/PUT/DELETE       רשימת קניות המכולה
     ?action=buy     GET/POST/PUT/DELETE   רשימת הקניות הכללית
     ?action=allshop GET                   כל הקניות במסך אחד

   ⚠ שני המודולים עטופים ב-{container:true} — מנהל או אחראי
     המכולה. חניך אחר מקבל 403 גם דרך הנתב.
   ============================================================ */

import { router } from "./_router.js";
import equip from "./_container-equip.js";
import shop from "./_container-shop.js";
import loans from "./_loans.js";
/* ⚠ **הרשימה הכללית והמסך המאוחד נכנסו כ-`?action=` ולא
   כקובץ נספר** — מגבלת 12 הפונקציות, 8 תפוסות. והם כאן ולא
   תחת `kitchen.js` מפני שהרשימה הכללית היא של המכינה כולה,
   ו-`allshop` קורא את שלוש הרשימות ואינו שייך לאף אחת. */
import buy from "./_buy.js";
import allshop from "./_shop-all.js";

export default router({ equip, shop, loans, buy, allshop });
