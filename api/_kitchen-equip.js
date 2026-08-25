/* ============================================================
   /api/kitchen?action=equip[&area=אוכל|חד״פ]
     GET     הציוד של התחום + רשימת הקניות שלו
     POST    { name, qty, kind, par?, area? }        פריט חדש
     PUT     { itemId, name?, qty?, kind?, par? }     עריכה
     DELETE  { itemId }                               מחיקה

   ⚠ צוות ותורנים. חניך נדחה — withAuth ללא דגלים חוסם סשן
     חניך, וזה בדיוק קהל המטבח מאז ומתמיד.

   ⚠ הסינון לפי תחום נעשה כאן ולא בדפדפן: מסך החד״פ לא אמור
     לקבל את 90 פריטי האוכל ולהסתיר אותם.
   ============================================================ */

import { withAuth } from "./_session.js";
import {
  KITCHEN_BOARDS, KITCHEN_COLS, KITCHEN_KIND,
  KITCHEN_AREA, KITCHEN_AREAS, boardsReady, missingFor,
} from "../shared/kitchen-boards.js";
import {
  loadKitchenEquipment, loadKitchenShopping, invalidateKitchen,
  setColumns, renameItem, createItem, deleteItem,
} from "./_kitchen-data.js";

const E = KITCHEN_COLS.equipment;
const KINDS = [KITCHEN_KIND.consumable, KITCHEN_KIND.permanent];

/** התחום המבוקש. ברירת המחדל היא אוכל — הגדול מבין השניים. */
function areaOf(raw) {
  const a = String(raw || "").trim();
  if (!a) return KITCHEN_AREA.food;
  return KITCHEN_AREAS.includes(a) ? a : null;
}

async function handler(req, res, session) {
  /* ⚠ לוחות שלא הוקמו הם כשל הקמה, לא מטבח ריק. רשימה ריקה
     כאן הייתה נראית בדיוק כמו מטבח בלי ציוד — וזה הבאג שחי
     יומיים בייצור. */
  if (!boardsReady()) {
    return res.status(503).json({
      error: "לוחות המטבח טרם הוקמו ב-monday. הריצו: node --env-file=.env tools/seed-kitchen.mjs",
      setupRequired: true,
    });
  }

  try {
    if (req.method === "GET") {
      const area = areaOf(req.query?.area);
      if (!area) return res.status(400).json({ error: "תחום לא מוכר" });

      const [allEquip, allShop] = await Promise.all([
        loadKitchenEquipment(), loadKitchenShopping(),
      ]);
      const equipment = allEquip.filter((x) => x.area === area);
      const shopping = allShop.filter((x) => x.area === area);

      return res.status(200).json({
        area, equipment, shopping,
        counts: {
          total: equipment.length,
          consumable: equipment.filter((x) => x.kind === KITCHEN_KIND.consumable).length,
          permanent: equipment.filter((x) => x.kind === KITCHEN_KIND.permanent).length,
          openShopping: shopping.filter((x) => x.status === "פתוח").length,
          /* כמה פריטים מתחת למפתח — המספר שמניע את רשימת החוסרים */
          missing: equipment.filter((x) => missingFor(x) > 0).length,
          withPar: equipment.filter((x) => x.par != null).length,
        },
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = String(body?.name || "").trim();
      const qty = String(body?.qty || "").trim().slice(0, 60);
      const kind = String(body?.kind || KITCHEN_KIND.consumable);
      const area = areaOf(body?.area);
      if (!name) return res.status(400).json({ error: "לא הוזן שם פריט" });
      if (!KINDS.includes(kind)) return res.status(400).json({ error: "סוג לא מוכר" });
      if (!area) return res.status(400).json({ error: "תחום לא מוכר" });
      const par = parPatch(body?.par);
      if (par === false) return res.status(400).json({ error: "מפתח חייב להיות מספר" });

      const equipment = await loadKitchenEquipment({ force: true });
      if (equipment.some((x) => x.name === name && x.area === area)) {
        return res.status(409).json({ error: "כבר קיים פריט בשם הזה" });
      }
      const id = await createItem(KITCHEN_BOARDS.equipment, name, {
        [E.qty]: qty, [E.kind]: { label: kind }, [E.area]: { label: area },
        ...(par === null ? {} : { [E.par]: par }),
      });
      invalidateKitchen();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוין פריט" });
      const equipment = await loadKitchenEquipment();
      const item = equipment.find((x) => x.id === itemId);
      if (!item) return res.status(404).json({ error: "הפריט אינו נמצא" });

      const cols = {};
      if (body.qty !== undefined) cols[E.qty] = String(body.qty).trim().slice(0, 60);
      if (body.kind !== undefined) {
        if (!KINDS.includes(String(body.kind))) return res.status(400).json({ error: "סוג לא מוכר" });
        cols[E.kind] = { label: String(body.kind) };
      }
      if (body.par !== undefined) {
        const par = parPatch(body.par);
        if (par === false) return res.status(400).json({ error: "מפתח חייב להיות מספר" });
        /* מחרוזת ריקה מנקה את העמודה — כך מבטלים מפתח לפריט */
        cols[E.par] = par === null ? "" : par;
      }
      if (Object.keys(cols).length) await setColumns(KITCHEN_BOARDS.equipment, itemId, cols);
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return res.status(400).json({ error: "שם ריק" });
        await renameItem(KITCHEN_BOARDS.equipment, itemId, name);
      }
      invalidateKitchen();
      return res.status(200).json({ ok: true, id: itemId });
    }

    if (req.method === "DELETE") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוין פריט" });
      await deleteItem(itemId);
      invalidateKitchen();
      return res.status(200).json({ ok: true, id: itemId });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[kitchen-equip]", e);
    res.status(502).json({ error: "פעולת הציוד נכשלה" });
  }
}

/**
 * ערך המפתח שנשלח: null = ריק (אין מפתח), מספר = מפתח,
 * false = ערך פסול. ⚠ שלושה מצבים ולא שניים, כי "לנקות מפתח"
 * ו"מפתח שגוי" אינם אותו דבר.
 */
function parPatch(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return false;
  return n;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler);
