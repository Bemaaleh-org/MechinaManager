/* ============================================================
   POST /api/lists-sync
   מוודא שלכל ספק יש בדיוק רשימת טיוטה פתוחה אחת, ובתוכה כל
   המוצרים שנמצאים כרגע מתחת למינימום.

   למה זה כאן ולא בדפדפן: בפרוטוטייפ הפונקציה רצה בכל מכשיר.
   מרגע שהרשימות חיות ב-monday, שני תורנים שפותחים את
   האפליקציה באותו רגע היו יוצרים שתי רשימות כפולות לאותו ספק.
   ההחלטה חייבת לשבת במקום אחד.

   הפעולה אידמפוטנטית: הרצה חוזרת בלי שינוי במלאי לא עושה כלום.

   כללי ההשוואה, כמו בפרוטוטייפ:
     • מוצר שירד מתחת למינימום → נכנס כשורה אוטומטית
     • שורה אוטומטית שהמוצר בה חזר מעל המינימום → יוצאת
     • שורה שהוזנה ידנית → נשארת תמיד
     • שורה שכבר קיימת → הכמות שלה נשמרת, גם אם נערכה ידנית
   ============================================================ */

import { BOARDS, COLS, LABELS } from "../shared/boards.js";
import { withAuth } from "./_session.js";
import { rowColumns, listColumns } from "../shared/mapper.js";
import { gql } from "./_monday.js";
import { loadCatalog } from "./catalog.js";
import { loadLists, dedupeEmptyDrafts } from "./_lists.js";

/** הכמות להשלמה עד היעד, מעוגלת כלפי מעלה לחצי יחידה */
const toOrder = (p) => Math.ceil((p.target - p.stock) * 2) / 2;

const SUPPLIERS = ["super", "wholesale"];

/** בונה תוכנית פעולה בלי לגעת ב-monday */
export function planSync(products, lists) {
  const plan = { createLists: [], createRows: [], deleteRows: [], unchanged: [], updateCosts: [] };
  const byId = new Map(products.map((p) => [p.id, p]));
  const priceOf = (pid) => byId.get(pid)?.price ?? 0;

  for (const sup of SUPPLIERS) {
    const below = products.filter((p) => p.sup === sup && !p.pending && p.stock < p.min);
    const draft = lists.find((l) => l.sup === sup && l.status === "draft");

    if (!draft) {
      if (!below.length) continue; // אין חוסרים ואין טיוטה — אין מה לעשות
      plan.createLists.push({
        sup,
        rows: below.map((p) => ({ pid: p.id, name: p.name, qty: toOrder(p), auto: true })),
        cost: below.reduce((a, p) => a + toOrder(p) * p.price, 0),
      });
      continue;
    }

    // יש טיוטה: משווים מול המצב הנוכחי
    const finalRows = []; // מה שיישאר ברשימה בסוף — הבסיס לחישוב העלות

    for (const p of below) {
      const existing = draft.items.find((it) => it.pid === p.id);
      if (existing) {
        plan.unchanged.push({ list: draft.id, pid: p.id, name: p.name, qty: existing.qty });
        finalRows.push({ pid: p.id, qty: existing.qty });
      } else {
        const qty = toOrder(p);
        plan.createRows.push({ listId: draft.id, pid: p.id, name: p.name, qty, auto: true });
        finalRows.push({ pid: p.id, qty });
      }
    }

    for (const it of draft.items) {
      const stillLow = below.some((p) => p.id === it.pid);
      if (stillLow) continue;
      if (it.auto) {
        // נכנסה אוטומטית והמוצר התאושש — יוצאת
        plan.deleteRows.push({ rowId: it.rowId, pid: it.pid, name: byId.get(it.pid)?.name ?? it.pid });
      } else {
        // הוזנה ידנית — נשארת גם אם המוצר מעל המינימום
        plan.unchanged.push({ list: draft.id, pid: it.pid, name: byId.get(it.pid)?.name ?? it.pid, qty: it.qty, manual: true });
        finalRows.push({ pid: it.pid, qty: it.qty });
      }
    }

    // העלות מחושבת מחדש מכל השורות שיישארו. בלי זה היא נשארת
    // מהרגע שהרשימה נוצרה, ומנהל מאשר סכום שאינו נכון.
    const cost = Math.round(finalRows.reduce((a, r) => a + r.qty * priceOf(r.pid), 0));
    if (cost !== Math.round(draft.cost || 0)) {
      plan.updateCosts.push({ listId: draft.id, sup, from: Math.round(draft.cost || 0), to: cost });
    }
  }

  return plan;
}

/** מבצע את התוכנית ב-monday */
async function applySync(plan) {
  const done = { lists: [], rows: 0, deleted: 0 };

  for (const l of plan.createLists) {
    const title = `רשימת ${LABELS.sup[l.sup]} – ${new Date().toLocaleDateString("he-IL")}`;
    const cols = listColumns({
      sup: l.sup, status: "draft", createdBy: "אוטומטי",
      approvedBy: null, cost: Math.round(l.cost),
    });
    const created = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){
         create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
      { b: BOARDS.lists, n: title, v: JSON.stringify(cols) }
    );
    const listId = created.create_item.id;
    done.lists.push({ id: listId, sup: l.sup, title });

    for (const r of l.rows) {
      await createRow({ listId, ...r });
      done.rows++;
    }
  }

  for (const r of plan.createRows) {
    await createRow(r);
    done.rows++;
  }

  for (const r of plan.deleteRows) {
    await gql(`mutation{ delete_item(item_id:${Number(r.rowId)}){ id } }`);
    done.deleted++;
  }

  for (const c of plan.updateCosts) {
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v){ id } }`,
      { b: BOARDS.lists, i: String(c.listId), v: JSON.stringify({ [COLS.lists.cost]: String(c.to) }) }
    );
    done.costsUpdated = (done.costsUpdated || 0) + 1;
  }

  return done;
}

async function createRow({ listId, pid, name, qty, auto }) {
  const cols = rowColumns({ listId, pid, qty, got: null, auto });
  await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){
       create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
    { b: BOARDS.rows, n: name, v: JSON.stringify(cols) }
  );
}

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const [products, loaded] = await Promise.all([loadCatalog(), loadLists()]);

    // ריפוי עצמי בכל טעינה: כפילות שנוצרה מהתנגשות מתנקה מעצמה
    const cleaned = await dedupeEmptyDrafts(loaded.lists);
    const removedIds = new Set(cleaned.map((c) => c.id));
    const lists = loaded.lists.filter((l) => !removedIds.has(l.id));

    const plan = planSync(products, lists);

    const nothingToDo =
      !plan.createLists.length && !plan.createRows.length &&
      !plan.deleteRows.length && !plan.updateCosts.length;
    if (nothingToDo) {
      return res.status(200).json({ ok: true, changed: cleaned.length > 0, cleaned, plan });
    }

    const done = await applySync(plan);
    res.status(200).json({ ok: true, changed: true, cleaned, plan, done });
  } catch (e) {
    console.error("[lists-sync]", e);
    res.status(502).json({ error: e.message });
  }
}

export default withAuth(handler);
