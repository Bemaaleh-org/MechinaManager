/* ============================================================
   /api/container?action=equip
     GET     כל הציוד + רשימת הקניות
     POST    { name, qty, kind }           פריט ציוד חדש
     PUT     { itemId, name?, qty?, kind? } עריכה
     DELETE  { itemId }                     מחיקה

   ⚠ מנהל או אחראי מכולה — {container:true}, נאכף בשרת.
   ============================================================ */

import { withAuth } from "./_session.js";
import { CONTAINER_BOARDS, CONTAINER_COLS, EQUIP_KIND } from "../shared/container-boards.js";
import {
  loadEquipment, loadShopping, invalidateContainer,
  setColumns, renameItem, createItem, deleteItem,
} from "./_container-data.js";

const E = CONTAINER_COLS.equipment;
const KINDS = [EQUIP_KIND.consumable, EQUIP_KIND.permanent];

async function handler(req, res, session) {
  try {
    if (req.method === "GET") {
      const [equipment, shopping] = await Promise.all([loadEquipment(), loadShopping()]);
      return res.status(200).json({
        equipment, shopping,
        counts: {
          total: equipment.length,
          consumable: equipment.filter((x) => x.kind === EQUIP_KIND.consumable).length,
          permanent: equipment.filter((x) => x.kind === EQUIP_KIND.permanent).length,
          openShopping: shopping.filter((x) => x.status === "פתוח").length,
        },
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = String(body?.name || "").trim();
      const qty = String(body?.qty || "").trim().slice(0, 60);
      const kind = String(body?.kind || EQUIP_KIND.permanent);
      if (!name) return res.status(400).json({ error: "לא הוזן שם ציוד" });
      if (!KINDS.includes(kind)) return res.status(400).json({ error: "סוג לא מוכר" });
      const equipment = await loadEquipment({ force: true });
      if (equipment.some((x) => x.name === name)) {
        return res.status(409).json({ error: "כבר קיים ציוד בשם הזה" });
      }
      const id = await createItem(CONTAINER_BOARDS.equipment, name,
        { [E.qty]: qty, [E.kind]: { label: kind } });
      invalidateContainer();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוין פריט" });
      const equipment = await loadEquipment();
      const item = equipment.find((x) => x.id === itemId);
      if (!item) return res.status(404).json({ error: "הפריט אינו נמצא" });

      const cols = {};
      if (body.qty !== undefined) cols[E.qty] = String(body.qty).trim().slice(0, 60);
      if (body.kind !== undefined) {
        if (!KINDS.includes(String(body.kind))) return res.status(400).json({ error: "סוג לא מוכר" });
        cols[E.kind] = { label: String(body.kind) };
      }
      if (Object.keys(cols).length) await setColumns(CONTAINER_BOARDS.equipment, itemId, cols);
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return res.status(400).json({ error: "שם ריק" });
        await renameItem(CONTAINER_BOARDS.equipment, itemId, name);
      }
      invalidateContainer();
      return res.status(200).json({ ok: true, id: itemId });
    }

    if (req.method === "DELETE") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוין פריט" });
      await deleteItem(itemId);
      invalidateContainer();
      return res.status(200).json({ ok: true, id: itemId });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[container-equip]", e);
    res.status(502).json({ error: "פעולת הציוד נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { container: true });
