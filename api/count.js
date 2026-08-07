/* ============================================================
   POST /api/count
   הספירה השבועית.

   שונה מדיווח יומי בשלושה דברים:
     • הספירה קובעת מלאי ("זה מה שיש"), לא מזיזה אותו
     • תנועת הספירה שומרת הפרש, שיכול להיות שלילי
     • היא קובעת גם את סימון התוקף למוצרים טריים

   מוצר שנספר וההפרש בו אפס לא מייצר תנועה — אין מה לתעד —
   אבל סימון התוקף שלו כן מתעדכן.

   גוף הבקשה:
     { user: "שם הסופר",
       entries: [{ pid, counted, exp? }] }        exp: "ok" | "soon"
   ============================================================ */

import { BOARDS, COLS, LABELS } from "../shared/boards.js";
import { toProduct, moveColumns, productColumns } from "../shared/mapper.js";
import { gql } from "./_monday.js";

const CV = `column_values { id text value ... on BoardRelationValue { linked_item_ids } }`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const { user, entries } = body || {};

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "לא נשלחו ספירות" });
    }
    for (const e of entries) {
      if (!(Number(e.counted) >= 0)) {
        return res.status(400).json({ error: `כמות ספירה לא תקינה עבור ${e.pid}` });
      }
      if (e.exp && !["ok", "soon"].includes(e.exp)) {
        return res.status(400).json({ error: `סימון תוקף לא מוכר: ${e.exp}` });
      }
    }

    const ts = Date.now();
    const results = [];

    for (const entry of entries) {
      // הקריאה בתוך הלולאה במכוון: הספירה מתבצעת מוצר-מוצר לאורך זמן,
      // וכל שורה נכתבת מול המצב המעודכן ביותר של אותו רגע.
      const pd = await gql(`{ items(ids:[${Number(entry.pid)}]){ id name ${CV} } }`);
      if (!pd.items?.[0]) throw new Error(`מוצר ${entry.pid} לא נמצא בקטלוג`);
      const product = toProduct(pd.items[0]);

      const counted = Math.round(Number(entry.counted) * 100) / 100;
      const diff = Math.round((counted - product.stock) * 100) / 100;
      // סימון תוקף רלוונטי רק למוצר שעוקבים אחרי התוקף שלו
      const expiryFlag = product.exp ? entry.exp || null : null;

      let moveId = null;
      if (diff !== 0) {
        const cols = moveColumns(
          { pid: product.id, type: "count", qty: diff, reason: null, user, ts },
          { productName: product.name, price: product.price }
        );
        const d = await gql(
          `mutation($b:ID!,$n:String!,$v:JSON!){
             create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
          {
            b: BOARDS.moves,
            n: `${LABELS.moveType.count} – ${product.name}`,
            v: JSON.stringify(cols),
          }
        );
        moveId = d.create_item.id;
      }

      // המלאי נקבע למה שנספר, יחד עם הסטטוס וסימון התוקף
      const pc = productColumns({ ...product, stock: counted, expiryFlag });
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){
           change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
        {
          b: BOARDS.catalog,
          i: String(product.id),
          v: JSON.stringify({
            [COLS.catalog.stock]: pc[COLS.catalog.stock],
            [COLS.catalog.stockStatus]: pc[COLS.catalog.stockStatus],
            [COLS.catalog.expiryFlag]: pc[COLS.catalog.expiryFlag],
          }),
        }
      );

      results.push({
        pid: String(product.id),
        product: product.name,
        stockBefore: product.stock,
        stockAfter: counted,
        diff,
        statusAfter: counted < product.min ? "low" : "ok",
        expiryFlag,
        moveId,
      });
    }

    res.status(200).json({ ok: true, ts, counted: results.length, results });
  } catch (e) {
    console.error("[count]", e);
    res.status(502).json({ error: e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
