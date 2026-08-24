/* ============================================================
   GET /api/kitchen?action=par-import — ייבוא המפתח בדפדפן
   ------------------------------------------------------------
   קורא את tools/kitchen-par.mjs ומעדכן את עמודת המפתח של כל
   פריט ברשימה. פותחים את הכתובת בדפדפן (מחוברים כמנהל)
   ומקבלים דוח: מה עודכן, מה כבר היה נכון, ומה לא נמצא.

   אידמפוטנטי — הרצה חוזרת מעדכנת רק את מה שהשתנה. פריט
   שהמפתח שלו כבר נכון לא נכתב שוב.

   ⚠ פיתוח מקומי בלבד, מנהל בלבד — כמו שאר פעולות ההקמה.
     המפתח השוטף מנוהל בלשונית "מפתח" שבמסך או ישירות בלוח;
     הפעולה הזו היא ייבוא ראשוני של רשימה שלמה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { KITCHEN_BOARDS, KITCHEN_COLS, boardsReady } from "../shared/kitchen-boards.js";
import { loadKitchenEquipment, invalidateKitchen, setColumns } from "./_kitchen-data.js";
import { FOOD_PAR } from "../tools/kitchen-par.mjs";

async function handler(req, res) {
  if (process.env.VERCEL) return res.status(404).json({ error: "פעולה לא מוכרת: par-import" });
  if (!boardsReady()) return res.status(503).json({ error: "לוחות המטבח טרם הוקמו", setupRequired: true });

  try {
    const equipment = await loadKitchenEquipment({ force: true });
    const byName = new Map(equipment.map((x) => [x.name, x]));

    const updated = [], unchanged = [], notFound = [];
    for (const [name, par] of FOOD_PAR) {
      const item = byName.get(name);
      if (!item) { notFound.push(name); continue; }
      if (item.par === par) { unchanged.push(name); continue; }
      await setColumns(KITCHEN_BOARDS.equipment, item.id, { [KITCHEN_COLS.equipment.par]: par });
      updated.push(`${name} → ${par}`);
    }
    invalidateKitchen();

    res.status(200).json({
      ok: true,
      עודכנו: updated.length,
      "כבר היו נכונים": unchanged.length,
      "לא נמצאו בלוח": notFound,
      פירוט: updated,
      הערה: "רסק/מרוסקות, שימורי תירס ופתיבר מופו לפי הנחה — ראו tools/kitchen-par.mjs. תיקון: עמודת המפתח בלוח.",
    });
  } catch (e) {
    console.error("[kitchen-par]", e);
    res.status(502).json({ error: "ייבוא המפתח נכשל: " + e.message });
  }
}

export default withAuth(handler, { manager: true });
