/* ============================================================
   GET /api/lists
   מחזיר את רשימות הקניות, כל אחת עם השורות שלה.

   הנתונים יושבים בשני לוחות: הרשימה עצמה בלוח אחד, והשורות
   בלוח נפרד שמצביע עליה. השליפה מביאה את שניהם ומחברת.

   מבנה התשובה תואם למה שהפרוטוטייפ מכיר:
     { id, sup, status, createdBy, createdAt, approvedBy,
       approvedAt, purchasedAt, items: [{ pid, qty, got, auto }] }
   ============================================================ */

import { BOARDS } from "../shared/boards.js";
import { withAuth } from "./_session.js";
import { toList, toRow } from "../shared/mapper.js";
import { allItems, gql } from "./_monday.js";

/** שולף רשימות ושורות ומחבר ביניהן */
export async function loadLists() {
  const [listItems, rowItems] = await Promise.all([
    allItems(BOARDS.lists, "created_at"),
    allItems(BOARDS.rows),
  ]);

  const lists = listItems.map(toList);
  const rows = rowItems.map(toRow);

  const byList = new Map(lists.map((l) => [l.id, l]));
  let orphans = 0;

  for (const r of rows) {
    const target = r.listId && byList.get(r.listId);
    if (!target) {
      // שורה שאיבדה את הרשימה שלה — לא מפילים עליה את הטעינה
      orphans++;
      continue;
    }
    target.items.push({
      rowId: r.id,
      pid: r.pid,
      qty: r.qty,
      got: r.got,
      auto: r.auto,
    });
  }

  // החדשות למעלה, כמו בפרוטוטייפ
  lists.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return { lists, orphans };
}

/* ------------------------------------------------------------
   ריפוי עצמי: משאיר טיוטה אחת לכל ספק.

   הבדיקה "יש כבר טיוטה?" והיצירה הן שתי פעולות נפרדות, ו-monday
   לא מציעה פעולה אטומית. שתי בקשות שנשלחות באותה שנייה יכולות
   שתיהן לראות "אין טיוטה" ולייצר אחת. במקום להילחם בזה, מנקים
   אחר כך — בכל טעינה ובכל פתיחת רשימה.

   ⚠ מוחק אך ורק טיוטה ריקה. טיוטה שיש בה שורות לעולם לא נמחקת,
   גם אם היא כפולה — עדיף כפילות גלויה מאשר עבודה שנעלמת.
   ------------------------------------------------------------ */
export async function dedupeEmptyDrafts(lists) {
  const removed = [];

  for (const sup of ["super", "wholesale"]) {
    const drafts = lists.filter((l) => l.sup === sup && l.status === "draft");
    if (drafts.length < 2) continue;

    // שומרים את זו שיש בה תוכן; אם כולן ריקות — את הוותיקה
    const keep =
      drafts.find((d) => d.items.length > 0) ||
      [...drafts].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0];

    for (const d of drafts) {
      if (d.id === keep.id || d.items.length > 0) continue;
      await gql(`mutation{ delete_item(item_id:${Number(d.id)}){ id } }`);
      removed.push({ id: d.id, sup, name: d.name });
    }
  }

  return removed;
}

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const { lists: raw, orphans } = await loadLists();

    // עלות הרשימה היא נתון כספי — לא יוצאת לחניך
    const lists = session.isManager ? raw : raw.map(({ cost, ...rest }) => rest);

    res.status(200).json({
      lists,
      count: lists.length,
      rows: lists.reduce((n, l) => n + l.items.length, 0),
      orphanRows: orphans,
    });
  } catch (e) {
    console.error("[lists]", e);
    res.status(502).json({ error: "שליפת רשימות הקניות נכשלה" });
  }
}

export default withAuth(handler);
