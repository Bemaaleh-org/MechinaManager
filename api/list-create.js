/* ============================================================
   POST /api/list-create   { sup, user: { name } }
   פותח רשימת טיוטה לספק.

   אידמפוטנטי: אם כבר קיימת טיוטה לאותו ספק — מחזיר אותה
   במקום ליצור שנייה. זה מה שמונע שתי רשימות פתוחות לספק אחד
   כששני תורנים לוחצים במקביל.

   נחוץ כשאין חוסרים כלל: הסנכרון האוטומטי לא יוצר רשימה ריקה,
   אבל תורן עדיין צריך מקום להוסיף אליו מוצר ידנית.
   ============================================================ */

import { BOARDS, LABELS } from "../shared/boards.js";
import { listColumns } from "../shared/mapper.js";
import { gql } from "./_monday.js";
import { loadLists, dedupeEmptyDrafts } from "./lists.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const { sup, user } = body || {};
    if (!LABELS.sup[sup]) return res.status(400).json({ error: `ספק לא מוכר: ${sup}` });

    let { lists } = await loadLists();

    // אם שתי בקשות קודמות התנגשו והשאירו כפילות — מנקים לפני שממשיכים
    const removed = await dedupeEmptyDrafts(lists);
    if (removed.length) {
      const ids = new Set(removed.map((r) => r.id));
      lists = lists.filter((l) => !ids.has(l.id));
    }

    const existing = lists.find((l) => l.sup === sup && l.status === "draft");
    if (existing) {
      return res.status(200).json({ ok: true, created: false, listId: existing.id, cleaned: removed.length });
    }

    const title = `רשימת ${LABELS.sup[sup]} – ${new Date().toLocaleDateString("he-IL")}`;
    const cols = listColumns({
      sup, status: "draft", createdBy: user?.name || "—", approvedBy: null, cost: 0,
    });
    const created = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){
         create_item(board_id:$b, item_name:$n, column_values:$v, create_labels_if_missing:false){ id } }`,
      { b: BOARDS.lists, n: title, v: JSON.stringify(cols) }
    );

    res.status(200).json({ ok: true, created: true, listId: created.create_item.id, title });
  } catch (e) {
    console.error("[list-create]", e);
    res.status(502).json({ error: e.message });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
