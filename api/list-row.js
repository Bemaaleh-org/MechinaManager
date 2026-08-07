/* ============================================================
   POST /api/list-row
   עריכה ידנית של רשימת קניות.

   פעולות:
     { action: "add",    listId, pid, qty }   הוספת מוצר לרשימה
     { action: "setQty", rowId, qty }          שינוי כמות בשורה
     { action: "remove", rowId }               הסרת שורה

   כל פעולה מחשבת מחדש את עלות הרשימה. בלי זה השדה שמזין את
   דאשבורד המנהלים נשאר מהרגע שהרשימה נוצרה.

   כלל: רק רשימה בסטטוס "טיוטה" ניתנת לעריכה. רשימה שנשלחה
   לאישור נעולה — מנהל צריך לדעת שמה שהוא רואה הוא מה שיאושר.
   ============================================================ */

import { BOARDS, COLS } from "../shared/boards.js";
import { rowColumns } from "../shared/mapper.js";
import { gql } from "./_monday.js";
import { loadCatalog } from "./catalog.js";
import { loadLists } from "./lists.js";

const ACTIONS = ["add", "setQty", "remove"];

/** מחשב מחדש את עלות הרשימה מכל שורותיה ומעדכן את העמודה */
async function recomputeCost(listId, products) {
  const { lists } = await loadLists();
  const list = lists.find((l) => l.id === String(listId));
  if (!list) return null;

  const priceOf = (pid) => products.find((p) => p.id === pid)?.price ?? 0;
  const cost = Math.round(list.items.reduce((a, it) => a + it.qty * priceOf(it.pid), 0));

  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
    { b: BOARDS.lists, i: String(listId), v: JSON.stringify({ [COLS.lists.cost]: String(cost) }) }
  );
  return { cost, items: list.items.length };
}

/** בונה את התוכנית ומוודא שהיא חוקית. לא נוגע ב-monday. */
export async function planRowChange(body) {
  const { action } = body || {};
  if (!ACTIONS.includes(action)) throw new Error(`פעולה לא מוכרת: ${action}`);

  const [products, { lists }] = await Promise.all([loadCatalog(), loadLists()]);
  const findList = (id) => lists.find((l) => l.id === String(id));
  const findRow = (rowId) => {
    for (const l of lists) {
      const it = l.items.find((x) => x.rowId === String(rowId));
      if (it) return { list: l, row: it };
    }
    return null;
  };

  if (action === "add") {
    const list = findList(body.listId);
    if (!list) throw new Error("הרשימה לא נמצאה");
    if (list.status !== "draft") throw new Error("אי אפשר לערוך רשימה שכבר נשלחה לאישור");

    const product = products.find((p) => p.id === String(body.pid));
    if (!product) throw new Error("המוצר לא נמצא בקטלוג");
    if (product.pending) throw new Error("מוצר שממתין לאישור מנהל לא יכול להיכנס לרשימה");
    if (list.items.some((it) => it.pid === product.id)) throw new Error(`${product.name} כבר ברשימה`);
    if (product.sup !== list.sup) throw new Error(`${product.name} שייך לספק אחר`);

    const qty = Math.round(Number(body.qty) * 100) / 100;
    if (!(qty > 0)) throw new Error("כמות לא תקינה");

    return { action, list, product, qty, products,
             describe: `הוספת ${product.name} (${qty}) לרשימת ${list.sup}` };
  }

  const hit = findRow(body.rowId);
  if (!hit) throw new Error("השורה לא נמצאה");
  if (hit.list.status !== "draft") throw new Error("אי אפשר לערוך רשימה שכבר נשלחה לאישור");
  const product = products.find((p) => p.id === hit.row.pid);

  if (action === "setQty") {
    const qty = Math.round(Number(body.qty) * 100) / 100;
    if (!(qty > 0)) throw new Error("כמות לא תקינה");
    return { action, list: hit.list, row: hit.row, product, qty, products,
             describe: `${product?.name ?? hit.row.pid}: כמות ${hit.row.qty} ← ${qty}` };
  }

  return { action, list: hit.list, row: hit.row, product, products,
           describe: `הסרת ${product?.name ?? hit.row.pid} מרשימת ${hit.list.sup}` };
}

/** מבצע תוכנית שכבר אומתה */
export async function applyRowChange(plan) {
  if (plan.action === "add") {
    // שורה שהוזנה ידנית מסומנת כ"ידני", כדי שהסנכרון האוטומטי
    // לא יסיר אותה כשהמוצר יעלה מעל המינימום
    const cols = rowColumns({ listId: plan.list.id, pid: plan.product.id, qty: plan.qty, got: null, auto: false });
    await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){
         create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
      { b: BOARDS.rows, n: plan.product.name, v: JSON.stringify(cols) }
    );
  } else if (plan.action === "setQty") {
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
      { b: BOARDS.rows, i: String(plan.row.rowId), v: JSON.stringify({ [COLS.rows.qty]: String(plan.qty) }) }
    );
  } else {
    await gql(`mutation{ delete_item(item_id:${Number(plan.row.rowId)}){ id } }`);
  }

  return recomputeCost(plan.list.id, plan.products);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const plan = await planRowChange(body);
    const result = await applyRowChange(plan);
    res.status(200).json({ ok: true, action: plan.action, describe: plan.describe, ...result });
  } catch (e) {
    console.error("[list-row]", e);
    // שגיאות חוקיות (רשימה נעולה, מוצר כפול) הן בקשה לא תקינה, לא תקלת שרת
    const bad = /לא נמצא|לא ניתן|אי אפשר|כבר|לא תקינה|לא מוכרת|ספק אחר/.test(e.message);
    res.status(bad ? 400 : 502).json({ error: e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
