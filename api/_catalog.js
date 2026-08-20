/* ============================================================
   GET /api/catalog
   מחזיר את כל המוצרים בקטלוג, מתורגמים למבנה שהאפליקציה מכירה.
   ============================================================ */

import { BOARDS } from "../shared/boards.js";
import { withAuth } from "./_session.js";
import { toProduct } from "../shared/mapper.js";
import { allItems } from "./_monday.js";

/** כל המוצרים בקטלוג, מתורגמים וממוינים. משמש גם את סנכרון הרשימות. */
export async function loadCatalog() {
  const items = await allItems(BOARDS.catalog);
  return items
    .map(toProduct)
    // סדר יציב: לפי קטגוריה ואז לפי שם, כדי שהמסך לא יקפוץ בין טעינות
    .sort((a, b) => (a.cat || "").localeCompare(b.cat || "", "he") || a.name.localeCompare(b.name, "he"));
}

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const all = await loadCatalog();

    /* ⚠ סינון מחירים — דרישה מסעיף 3 במסמך ההעברה.
       לחניך המחיר לא מוסתר בתצוגה אלא פשוט לא יוצא מהשרת.
       מי שיפתח כלי פיתוח או יקרא ל-endpoint ישירות לא ימצא אותו. */
    const products = session.isManager
      ? all
      : all.map(({ price, ...rest }) => rest);

    res.status(200).json({ products, count: products.length, prices: session.isManager });
  } catch (e) {
    console.error("[catalog]", e);
    res.status(502).json({ error: "שליפת הקטלוג מ-monday נכשלה" });
  }
}

export default withAuth(handler);
