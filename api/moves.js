/* ============================================================
   POST /api/moves
   רושם דיווח יומי: קבלה, שימוש או פחת.

   כל דיווח = שתי כתיבות ל-monday:
     1. שורה ביומן התנועות  (הרישום — מה קרה, מי דיווח, מתי)
     2. עדכון המלאי בקטלוג  (התוצאה)

   הסדר מכוון. אם השנייה נכשלת, נשאר תיעוד מלא של מה שקרה
   והמלאי מפגר — מצב גלוי שניתן לתקן בספירה. הסדר ההפוך היה
   משנה מלאי בלי שום עקבות.

   גוף הבקשה:
     { type: "usage" | "waste" | "receipt",
       user: "שם המדווח",
       entries: [{ pid, qty, reason? }] }
   ============================================================ */

import { BOARDS, COLS, LABELS } from "../shared/boards.js";
import { toProduct, toMove, moveColumns, productColumns } from "../shared/mapper.js";
import { gql, allItems } from "./_monday.js";

const TYPES = ["usage", "waste", "receipt"];

/** שולף מוצר בודד מהקטלוג, במצבו הנוכחי */
async function loadProduct(pid) {
  const d = await gql(`{ items(ids:[${Number(pid)}]){ id name
      column_values { id text value ... on BoardRelationValue { linked_item_ids } } } }`);
  const item = d.items?.[0];
  if (!item) throw new Error(`מוצר ${pid} לא נמצא בקטלוג`);
  return toProduct(item);
}

/** יוצר שורה ביומן התנועות */
async function writeMove(move, product) {
  const cols = moveColumns(move, { productName: product.name, price: product.price });
  const title = `${LABELS.moveType[move.type]} – ${product.name}`;
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
    { b: BOARDS.moves, n: title, v: JSON.stringify(cols) }
  );
  return d.create_item.id;
}

/** מעדכן את המלאי ואת סטטוס המלאי בקטלוג */
async function writeStock(product, newStock) {
  const cols = productColumns({ ...product, stock: newStock });
  const only = {
    [COLS.catalog.stock]: cols[COLS.catalog.stock],
    [COLS.catalog.stockStatus]: cols[COLS.catalog.stockStatus],
  };
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v){ id } }`,
    { b: BOARDS.catalog, i: product.id, v: JSON.stringify(only) }
  );
}

/** מריץ דיווח אחד מקצה לקצה. dryRun מדלג על הכתיבות עצמן. */
export async function commitEntry({ type, user, entry, ts, dryRun }) {
  const product = await loadProduct(entry.pid);
  const qty = Math.abs(Number(entry.qty));
  if (!(qty > 0)) throw new Error(`כמות לא תקינה עבור ${product.name}`);

  const delta = type === "receipt" ? qty : -qty;
  const newStock = Math.max(0, Math.round((product.stock + delta) * 100) / 100);

  const move = { pid: product.id, type, qty, reason: entry.reason || null, user, ts };
  const plan = {
    product: product.name,
    pid: product.id,
    type,
    qty,
    reason: entry.reason || null,
    stockBefore: product.stock,
    stockAfter: newStock,
    statusBefore: product.stockStatus,
    statusAfter: newStock < product.min ? "low" : "ok",
    value: Math.round(qty * product.price * 100) / 100,
  };

  if (dryRun) return { ...plan, dryRun: true };

  plan.moveId = await writeMove(move, product); // קודם הרישום
  await writeStock(product, newStock); // ואז התוצאה
  return plan;
}

/* ------------------------------------------------------------
   GET /api/moves?months=6
   מחזיר את יומן התנועות. ברירת המחדל מכסה את מה שהדוח התקופתי
   מציג, ולא את כל ההיסטוריה — אין טעם לשלוח לטלפון תנועות
   משנה שעברה בכל טעינה.
   ------------------------------------------------------------ */
async function listMoves(req, res) {
  const months = Math.min(24, Math.max(1, Number(req.query?.months) || 6));
  const since = new Date();
  since.setMonth(since.getMonth() - months, 1);
  since.setHours(0, 0, 0, 0);

  const items = await allItems(BOARDS.moves);
  const all = items.map(toMove);

  // תנועות בלי תאריך הן שורות מלפני שנוספה עמודת התאריך. אי אפשר
  // למקם אותן בזמן, וחישוב חודשי היה משייך אותן לינואר 1970 —
  // מה שהיה מזהם את הדוח בכל ינואר. מוציאים אותן, וסופרים כמה.
  const dated = all.filter((m) => m.ts !== null);
  const undated = all.length - dated.length;

  const moves = dated
    .filter((m) => m.ts >= since.getTime())
    .sort((a, b) => a.ts - b.ts);

  res.status(200).json({
    moves,
    count: moves.length,
    skippedNoDate: undated,
    since: since.toISOString(),
  });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      return await listMoves(req, res);
    } catch (e) {
      console.error("[moves:get]", e);
      return res.status(502).json({ error: "שליפת יומן התנועות נכשלה" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const { type, user, entries } = body || {};

    if (!TYPES.includes(type)) {
      return res.status(400).json({ error: `סוג תנועה לא מוכר: ${type}` });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "לא נשלחו דיווחים" });
    }
    if (type === "waste" && entries.some((e) => !e.reason)) {
      // סיבת פחת היא מה שמאפשר למידה ארגונית — לא מוותרים עליה
      return res.status(400).json({ error: "דיווח פחת מחייב ציון סיבה" });
    }

    const ts = Date.now();
    const results = [];
    for (const entry of entries) {
      results.push(await commitEntry({ type, user, entry, ts, dryRun: false }));
    }

    res.status(200).json({ ok: true, results });
  } catch (e) {
    console.error("[moves]", e);
    res.status(502).json({ error: e.message });
  }
}

/** Vercel מפרסרת גוף בקשה לבד; שרת הפיתוח המקומי לא */
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
