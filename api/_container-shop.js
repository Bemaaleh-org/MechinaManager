/* ============================================================
   /api/container?action=shop
     POST    { items: [{ name, qty }] }   הוספת שורות לרשימה
     PUT     { itemId, status }           פתוח / נקנה
     DELETE  { itemId }                   הסרת שורה

   רשימת הקניות של המכולה. שורות "פתוח" הן הרשימה הפעילה;
   "נקנה" נשאר כהיסטוריה.

   ⚠ ההרשאה לפי תחום, כמו בציוד עצמו: המכולה לאחראי המכולה,
     הניקיון לאב הבית. ראו mayArea ב-shared/container-boards.js.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { israelToday } from "./_attendance-data.js";
import {
  CONTAINER_BOARDS, CONTAINER_COLS, SHOP_STATUS, AREA, AREAS, mayArea,
} from "../shared/container-boards.js";
import {
  loadShopping, invalidateContainer, setColumns, createItem, deleteItem,
} from "./_container-data.js";

const S = CONTAINER_COLS.shopping;

const OWNER = { "ניקיון": "אב הבית", "מכולה": "אחראי המכולה" };
const deny = (res, area) =>
  res.status(403).json({ error: `רשימת הקניות של ה${area} מנוהלת על ידי ${OWNER[area] || "האחראי"}` });

async function handler(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const items = Array.isArray(body?.items) ? body.items : null;
      if (!items || !items.length) return res.status(400).json({ error: "לא נשלחו פריטים" });
      if (items.length > 60) return res.status(400).json({ error: "עד 60 פריטים ברשימה" });
      const area = String(body?.area || "").trim() || AREA.container;
      if (!AREAS.includes(area)) return res.status(400).json({ error: "תחום לא מוכר" });
      if (!mayArea(session, area)) return deny(res, area);

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
          [S.area]: { label: area },
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
      const row = rows.find((x) => x.id === itemId);
      if (!row) return res.status(404).json({ error: "השורה אינה נמצאת" });
      /* ⚠ התחום מהשורה עצמה ולא מהבקשה */
      if (!mayArea(session, row.area)) return deny(res, row.area);
      await setColumns(CONTAINER_BOARDS.shopping, itemId, { [S.status]: { label: status } });
      invalidateContainer();
      return res.status(200).json({ ok: true, id: itemId, status });
    }

    if (req.method === "DELETE") {
      const itemId = String(body?.itemId || "").trim();
      if (!itemId) return res.status(400).json({ error: "לא צוינה שורה" });
      const row = (await loadShopping()).find((x) => x.id === itemId);
      if (!row) return res.status(404).json({ error: "השורה אינה נמצאת" });
      if (!mayArea(session, row.area)) return deny(res, row.area);
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

export default withAuth(handler, { student: true });
