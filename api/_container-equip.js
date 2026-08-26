/* ============================================================
   /api/container?action=equip[&area=מכולה|ניקיון]
     GET     הציוד של התחום + רשימת הקניות שלו
     POST    { name, qty, kind, par?, area? }           פריט חדש
     PUT     { itemId, name?, qty?, delta?, kind?, par? }  עריכה
     DELETE  { itemId }                                  מחיקה

   ⚠ מנהל או אחראי מכולה — {container:true}, נאכף בשרת.

   ⚠ הסינון לפי תחום נעשה כאן ולא בדפדפן: מסך הניקיון לא
     אמור לקבל את 95 פריטי המכולה ולהסתיר אותם.
   ============================================================ */

import { withAuth } from "./_session.js";
import {
  CONTAINER_BOARDS, CONTAINER_COLS, EQUIP_KIND, AREA, AREAS, missingFor,
} from "../shared/container-boards.js";
import {
  loadEquipment, loadShopping, invalidateContainer,
  setColumns, renameItem, createItem, deleteItem,
} from "./_container-data.js";
import { qtyAdd } from "../shared/par.js";

const E = CONTAINER_COLS.equipment;
const KINDS = [EQUIP_KIND.consumable, EQUIP_KIND.permanent];

/** התחום המבוקש. ברירת המחדל היא מכולה, כמו שהיה לפני הפיצול. */
function areaOf(raw) {
  const a = String(raw || "").trim();
  if (!a) return AREA.container;
  return AREAS.includes(a) ? a : null;
}

async function handler(req, res, session) {
  try {
    if (req.method === "GET") {
      const area = areaOf(req.query?.area);
      if (!area) return res.status(400).json({ error: "תחום לא מוכר" });

      const [allEquip, allShop] = await Promise.all([loadEquipment(), loadShopping()]);
      const equipment = allEquip.filter((x) => x.area === area);
      const shopping = allShop.filter((x) => x.area === area);

      return res.status(200).json({
        area, equipment, shopping,
        counts: {
          total: equipment.length,
          consumable: equipment.filter((x) => x.kind === EQUIP_KIND.consumable).length,
          permanent: equipment.filter((x) => x.kind === EQUIP_KIND.permanent).length,
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
      const kind = String(body?.kind || EQUIP_KIND.permanent);
      const area = areaOf(body?.area);
      if (!name) return res.status(400).json({ error: "לא הוזן שם ציוד" });
      if (!KINDS.includes(kind)) return res.status(400).json({ error: "סוג לא מוכר" });
      if (!area) return res.status(400).json({ error: "תחום לא מוכר" });
      const par = parPatch(body?.par);
      if (par === false) return res.status(400).json({ error: "מפתח חייב להיות מספר" });

      const equipment = await loadEquipment({ force: true });
      if (equipment.some((x) => x.name === name && x.area === area)) {
        return res.status(409).json({ error: "כבר קיים ציוד בשם הזה" });
      }
      const id = await createItem(CONTAINER_BOARDS.equipment, name, {
        [E.qty]: qty, [E.kind]: { label: kind }, [E.area]: { label: area },
        ...(par === null ? {} : { [E.par]: par }),
      });
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
      /* ---------- הוספה או הורדה ----------
         ⚠ delta ולא qty: השולח אומר "נוספו 12", לא "עכשיו יש
           52". שני אנשים שמכניסים סחורה באותה דקה — הראשון
           שולח 12 והשני 8, והתוצאה 20. אילו כל אחד היה שולח
           את הסך הכול, השני היה מוחק את הראשון.

         ⚠ הטקסט התיאורי נשמר. הכמות היא טקסט חופשי
           ("40 חבילות של 10"), ורק המספר הראשון זז. ראו
           qtyAdd ב-shared/par.js. */
      if (body.delta !== undefined) {
        const d = Number(body.delta);
        if (!Number.isFinite(d) || d === 0) {
          return res.status(400).json({ error: "שינוי כמות לא תקין" });
        }
        cols[E.qty] = qtyAdd(item.qty, d).slice(0, 60);
      }

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

export default withAuth(handler, { container: true });
