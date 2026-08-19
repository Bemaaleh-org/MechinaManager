/* ============================================================
   /api/container?action=shop
     POST    { items: [{ name, qty }] }   הוספת שורות לרשימה
     PUT     { itemId, status }           פתוח / נקנה
     DELETE  { itemId }                   הסרת שורה

   רשימת הקניות של המכולה. שורות "פתוח" הן הרשימה הפעילה;
   "נקנה" נשאר כהיסטוריה.

   ⚠ מנהל או אחראי מכולה.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { israelToday } from "./_attendance-data.js";
import { CONTAINER_BOARDS, CONTAINER_COLS, SHOP_STATUS } from "../shared/container-boards.js";
import {
  loadShopping, invalidateContainer, setColumns, createItem, deleteItem,
} from "./_container-data.js";

const S = CONTAINER_COLS.shopping;

async function handler(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const items = Array.isArray(body?.items) ? body.items : null;
      if (!items || !items.length) return res.status(400).json({ error: "לא נשלחו פריטים" });
      if (items.length > 60) return res.status(400).json({ error: "עד 60 פריטים ברשימה" });

      const today = israelToday();
      const by = actorName(session).slice(0, 120);
      let created = 0;
      for (const raw of items) {
        const name = String(raw?.name || "").trim();
        const qty = String(raw?.qty || "").trim().slice(0, 60);
        if (!name) continue;
        await createItem(CONTAINER_BOARDS.shopping, name, {
          [S.qty]: qty,
          [S.date]: { date: today },
          [S.status]: { label: SHOP_STATUS.open },
          [S.by]: by,
        });
        created++;
      }
      invalidateContainer();
      return res.status(200).json({ ok: true, created });
    }

    if (req.method === "PUT") {
      const itemId = String(body?.itemId || "").trim();
      const status = String(body?.status || "");
      if (!itemId) return res.status(400).json({ error: "לא צוינה שורה" });
      if (![SHOP_STATUS.open, SHOP_STATUS.bought].includes(status)) {
        return res.status(400).json({ error: "סטטוס לא מוכר" });
      }
      const rows = await loadShopping();
      if (!rows.some((x) => x.id === itemId)) return res.status(404).json({ error: "השורה אינה נמצאת" });
      await setColumns(CONTAINER_BOARDS.shopping, itemId, { [S.status]: { label: status } });
      invalidateContainer();
      return res.status(200).json({ ok: true, id: itemId, status });
    }

    if (req.method === "DELETE") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוינה שורה" });
      await deleteItem(itemId);
      invalidateContainer();
      return res.status(200).json({ ok: true, id: itemId });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[container-shop]", e);
    res.status(502).json({ error: "פעולת רשימת הקניות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { container: true });
