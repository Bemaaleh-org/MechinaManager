/* ============================================================
   /api/kitchen?action=shop
     POST    { items: [{ name, qty }], area? }   הוספת שורות
     PUT     { itemId, status }                  פתוח / נקנה
     DELETE  { itemId }                          הסרת שורה

   רשימת הקניות של המטבח. שורות "פתוח" הן הרשימה הפעילה;
   "נקנה" נשאר כהיסטוריה ולא נמחק.

   ⚠ צוות ותורנים, כמו הציוד עצמו.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { israelToday } from "./_attendance-data.js";
import {
  KITCHEN_BOARDS, KITCHEN_COLS, KITCHEN_SHOP_STATUS,
  KITCHEN_AREA, KITCHEN_AREAS, boardsReady,
} from "../shared/kitchen-boards.js";
import {
  loadKitchenShopping, invalidateKitchen, setColumns, createItem, deleteItem,
} from "./_kitchen-data.js";

const S = KITCHEN_COLS.shopping;

async function handler(req, res, session) {
  if (!boardsReady()) {
    return res.status(503).json({
      error: "לוחות המטבח טרם הוקמו ב-monday. הריצו: node --env-file=.env tools/seed-kitchen.mjs",
      setupRequired: true,
    });
  }

  try {
    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const items = Array.isArray(body?.items) ? body.items : null;
      if (!items || !items.length) return res.status(400).json({ error: "לא נשלחו פריטים" });
      if (items.length > 60) return res.status(400).json({ error: "עד 60 פריטים ברשימה" });
      const area = String(body?.area || "").trim() || KITCHEN_AREA.food;
      if (!KITCHEN_AREAS.includes(area)) return res.status(400).json({ error: "תחום לא מוכר" });

      const today = israelToday();
      const by = actorName(session).slice(0, 120);
      let created = 0;
      for (const raw of items) {
        const name = String(raw?.name || "").trim();
        const qty = String(raw?.qty || "").trim().slice(0, 60);
        if (!name) continue;
        await createItem(KITCHEN_BOARDS.shopping, name, {
          [S.qty]: qty,
          [S.date]: { date: today },
          [S.status]: { label: KITCHEN_SHOP_STATUS.open },
          [S.by]: by,
          [S.area]: { label: area },
        });
        created++;
      }
      invalidateKitchen();
      return res.status(200).json({ ok: true, created });
    }

    if (req.method === "PUT") {
      const itemId = String(body?.itemId || "").trim();
      const status = String(body?.status || "");
      if (!itemId) return res.status(400).json({ error: "לא צוינה שורה" });
      if (![KITCHEN_SHOP_STATUS.open, KITCHEN_SHOP_STATUS.bought].includes(status)) {
        return res.status(400).json({ error: "סטטוס לא מוכר" });
      }
      const rows = await loadKitchenShopping();
      if (!rows.some((x) => x.id === itemId)) return res.status(404).json({ error: "השורה אינה נמצאת" });
      await setColumns(KITCHEN_BOARDS.shopping, itemId, { [S.status]: { label: status } });
      invalidateKitchen();
      return res.status(200).json({ ok: true, id: itemId, status });
    }

    if (req.method === "DELETE") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוינה שורה" });
      await deleteItem(itemId);
      invalidateKitchen();
      return res.status(200).json({ ok: true, id: itemId });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[kitchen-shop]", e);
    res.status(502).json({ error: "פעולת רשימת הקניות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ הקוד המשותף לתורנים נגנז, ואיתו הדרך שבה חניך הגיע לכאן.
   הגישה עוברת עכשיו דרך תפקיד "אחראי מטבח" בלוח החניכים —
   מנהל או בעל התפקיד, וההרשאה נסגרת כשמסירים אותו. */
export default withAuth(handler, { kitchen: true });
