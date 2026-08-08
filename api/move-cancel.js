/* ============================================================
   POST /api/move-cancel   { moveId }

   מבטל דיווח יומי. לא מוחק — מסמן את השורה ביומן כ"בוטל"
   ומחזיר את המלאי בקטלוג. השורה נשארת כעקבה של מה שקרה,
   כולל הטעות עצמה.

   הסדר כאן הפוך מהדיווח: קודם הסימון, אחר כך המלאי. גם כאן
   העיקרון זהה — עדיף רישום בלי עדכון מלאי מאשר מלאי שהשתנה
   בלי שום תיעוד.
   ============================================================ */

import { BOARDS, COLS } from "../shared/boards.js";
import { withAuth } from "./_session.js";
import { toProduct, toMove } from "../shared/mapper.js";
import { gql } from "./_monday.js";

const CV = `column_values { id text value ... on BoardRelationValue { linked_item_ids } }`;

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const moveId = body?.moveId;
    if (!moveId) return res.status(400).json({ error: "לא צוין דיווח לביטול" });

    // --- קריאת הדיווח ---
    const md = await gql(`{ items(ids:[${Number(moveId)}]){ id name ${CV} } }`);
    const item = md.items?.[0];
    if (!item) return res.status(404).json({ error: "הדיווח לא נמצא ביומן" });

    const move = toMove(item);
    if (move.cancelled) {
      return res.status(409).json({ error: "הדיווח כבר בוטל" });
    }
    if (!move.pid) {
      // תנועות ישנות מלפני עמודת הקישור — אין להן מוצר לשחזר אליו
      return res.status(422).json({ error: "לדיווח הזה אין מוצר מקושר, אי אפשר לבטל אותו אוטומטית" });
    }

    // --- קריאת המוצר במצבו הנוכחי ---
    const pd = await gql(`{ items(ids:[${Number(move.pid)}]){ id name ${CV} } }`);
    const product = toProduct(pd.items[0]);

    // קבלה הוסיפה מלאי, ולכן הביטול מפחית. שימוש ופחת הפחיתו — הביטול מחזיר.
    const delta = move.type === "receipt" ? -move.qty : move.qty;
    const restored = Math.max(0, Math.round((product.stock + delta) * 100) / 100);

    // --- 1. סימון הביטול ---
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
      { b: BOARDS.moves, i: String(moveId), v: JSON.stringify({ [COLS.moves.cancelled]: { checked: "true" } }) }
    );

    // --- 2. החזרת המלאי ---
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
      { b: BOARDS.catalog, i: String(product.id), v: JSON.stringify({
          [COLS.catalog.stock]: String(restored),
          [COLS.catalog.stockStatus]: { label: restored < product.min ? "מתחת למינימום" : "תקין" },
        }) }
    );

    res.status(200).json({
      ok: true,
      moveId: String(moveId),
      pid: String(product.id),
      product: product.name,
      stockBefore: product.stock,
      stockAfter: restored,
      statusAfter: restored < product.min ? "low" : "ok",
    });
  } catch (e) {
    console.error("[move-cancel]", e);
    res.status(502).json({ error: e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler);
