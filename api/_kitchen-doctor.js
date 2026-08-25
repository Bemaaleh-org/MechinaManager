/* ============================================================
   GET /api/kitchen?action=doctor — אבחון בדפדפן
   ------------------------------------------------------------
   מציג מה באמת יושב בלוחות המטבח: העמודות, התוויות שקיימות
   בפועל, וכמה פריטים יש בכל תחום. נועד לאבחן את התקלה שבה
   מסך החד״פ מציג פריטי אוכל — בלי טרמינל: פותחים את הכתובת
   בדפדפן (מחוברים) ומצלמים.

   ⚠ פיתוח מקומי בלבד, כמו ?date= — בדיפלוי הפעולה לא קיימת.
   ⚠ קריאה בלבד. לא משנה דבר בלוחות.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { KITCHEN_BOARDS, KITCHEN_COLS, boardsReady } from "../shared/kitchen-boards.js";
import { loadKitchenEquipment } from "./_kitchen-data.js";

async function handler(req, res) {
  if (process.env.VERCEL) return res.status(404).json({ error: "פעולה לא מוכרת: doctor" });
  if (!boardsReady()) return res.status(503).json({ error: "לוחות המטבח טרם הוקמו" });

  try {
    const E = KITCHEN_COLS.equipment;

    /* התוויות כפי שהן מוגדרות בעמודות — החשוד המרכזי */
    const d = await gql(`{ boards(ids:[${KITCHEN_BOARDS.equipment}]) {
      name items_count
      columns { id title type settings_str }
    } }`);
    const board = d.boards[0];
    const labelsOf = (colId) => {
      const c = board.columns.find((x) => x.id === colId);
      if (!c) return "— העמודה לא קיימת —";
      try { return Object.values(JSON.parse(c.settings_str || "{}").labels || {}).filter(Boolean); }
      catch { return "— לא קריא —"; }
    };

    /* הפריטים כפי שהשרת קורא אותם */
    const items = await loadKitchenEquipment({ force: true });
    const tally = {};
    for (const x of items) tally[x.area || "(ריק)"] = (tally[x.area || "(ריק)"] || 0) + 1;

    res.status(200).json({
      board: { name: board.name, id: KITCHEN_BOARDS.equipment, itemsInMonday: board.items_count },
      columns: {
        area: { id: E.area, labelsInBoard: labelsOf(E.area) },
        kind: { id: E.kind, labelsInBoard: labelsOf(E.kind) },
      },
      itemsServerSees: items.length,
      byArea: tally,
      samples: items.slice(0, 5).map((x) => ({ name: x.name, qty: x.qty, area: x.area, kind: x.kind })),
      hint: "אם byArea מציג הכול תחת תחום אחד או תחת (ריק) — התוויות בלוח אינן מה שהקוד מצפה לו",
    });
  } catch (e) {
    console.error("[kitchen-doctor]", e);
    res.status(502).json({ error: "האבחון נכשל: " + e.message });
  }
}

export default withAuth(handler);
