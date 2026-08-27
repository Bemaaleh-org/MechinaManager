/* ============================================================
   /api/kitchen?action=produce
     GET     טבלת ההמרה — הלוח ממוזג עם ברירת המחדל
     POST    { name, kg }              פריט חדש או דריסה
     PUT     { id, name?, kg? }        עריכה
     DELETE  { id }                    הסרה

   טבלת "כמה שוקלת יחידה" של ירקות ופירות, שנערכת מהמסך.

   ⚠ **צוות ואחראי מטבח** (`kitchen: true`) — אותה הרשאה בדיוק
     כמו הציוד עצמו. מי שאחראי על ההזמנה הוא מי שיודע כמה
     באמת שוקלת עגבנייה אצל הספק שלנו, וזו כל הנקודה.

   ⚠ **הלוח גובר על ברירת המחדל, אך אינו מוחק אותה.** פריט
     שנמחק מהלוח חוזר לערך המובנה אם קיים כזה. זה מכוון: מחיקה
     היא "אני לא רוצה את ההגדרה שלי", ולא "אני רוצה שהמערכת
     תפסיק לדעת מה זו עגבנייה".

   ⚠ **משקל חייב להיות חיובי.** אפס אינו "לא יודעים" — הוא
     יחידה שאינה שוקלת כלום, וכל חישוב שנשען עליו יחזיר אפס
     ק״ג לכל כמות. לכן הוא נדחה ולא נשמר כ-null בשקט.
   ============================================================ */

import { withAuth } from "./_session.js";
import { KITCHEN_BOARDS, KITCHEN_COLS } from "../shared/kitchen-boards.js";
import {
  loadProduce, invalidateProduce,
  setColumns, renameItem, createItem, deleteItem,
} from "./_kitchen-data.js";
import { PRODUCE_KG, buildTable, produceList } from "../shared/produce.js";

const P = KITCHEN_COLS.produce;

/** משקל שנשלח: מספר חיובי, או false אם פסול. */
function kgPatch(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 500) return false;
  return Math.round(n * 1000) / 1000;
}

async function handler(req, res) {
  /* ⚠ לוח שלא הוקם אינו מפיל את המסך — ראו loadProduce. אבל
     כתיבה אליו כן חייבת להיכשל במפורש, אחרת המשתמש מקבל
     "נשמר" על משהו שלא נשמר בשום מקום. */
  const ready = Boolean(KITCHEN_BOARDS.produce);

  try {
    if (req.method === "GET") {
      const rows = await loadProduce();
      const table = buildTable(rows);
      const byName = new Map(rows.map((r) => [r.name, r]));
      return res.status(200).json({
        editable: ready,
        /* ⚠ כל שורה אומרת מאיפה היא. בלי זה אי אפשר לדעת מה
           נערך ידנית ומה מובנה, ומחיקה נראית כמו פעולה
           הרסנית גם כשהיא רק ביטול דריסה. */
        rows: produceList(table).map((x) => {
          const own = byName.get(x.name);
          return {
            ...x,
            id: own ? own.id : null,
            source: own ? "board" : "default",
            /* הערך המובנה, אם יש — כדי שהמסך יראה למה חוזרים */
            fallback: PRODUCE_KG[x.name] ?? null,
          };
        }),
      });
    }

    if (!ready) {
      return res.status(503).json({
        error: "לוח ההמרות טרם הוקם ב-monday",
        setupRequired: true,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = String(body?.name || "").trim().slice(0, 80);
      if (!name) return res.status(400).json({ error: "לא הוזן שם" });
      const kg = kgPatch(body?.kg);
      if (kg === false) return res.status(400).json({ error: "משקל חייב להיות מספר גדול מאפס" });

      const rows = await loadProduce({ force: true });
      /* ⚠ אותו שם פעמיים היה יוצר שתי שורות שסותרות זו את זו,
         ומי שגובר היה תלוי בסדר השליפה. */
      if (rows.some((r) => r.name === name)) {
        return res.status(409).json({ error: "כבר קיימת שורה בשם הזה" });
      }
      const id = await createItem(KITCHEN_BOARDS.produce, name, { [P.kg]: kg });
      invalidateProduce();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });
      const rows = await loadProduce();
      const row = rows.find((r) => r.id === id);
      if (!row) return res.status(404).json({ error: "השורה אינה נמצאת" });

      if (body.kg !== undefined) {
        const kg = kgPatch(body.kg);
        if (kg === false) return res.status(400).json({ error: "משקל חייב להיות מספר גדול מאפס" });
        await setColumns(KITCHEN_BOARDS.produce, id, { [P.kg]: kg });
      }
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 80);
        if (!name) return res.status(400).json({ error: "שם ריק" });
        if (name !== row.name && rows.some((r) => r.name === name)) {
          return res.status(409).json({ error: "כבר קיימת שורה בשם הזה" });
        }
        await renameItem(KITCHEN_BOARDS.produce, id, name);
      }
      invalidateProduce();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });
      const row = (await loadProduce()).find((r) => r.id === id);
      if (!row) return res.status(404).json({ error: "השורה אינה נמצאת" });
      await deleteItem(id);
      invalidateProduce();
      /* ⚠ אומר למסך אם הפריט חוזר לערך מובנה או נעלם לגמרי.
         "נמחק" לבד משאיר את המשתמש בלי לדעת מה קורה עכשיו. */
      return res.status(200).json({
        ok: true, id,
        fallback: PRODUCE_KG[row.name] ?? null,
      });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[produce]", e);
    res.status(502).json({ error: "פעולת ההמרה נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { kitchen: true });
