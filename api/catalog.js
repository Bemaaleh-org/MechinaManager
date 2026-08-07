/* ============================================================
   GET /api/catalog
   מחזיר את כל המוצרים בקטלוג, מתורגמים למבנה שהאפליקציה מכירה.
   ============================================================ */

import { BOARDS } from "../shared/boards.js";
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const products = await loadCatalog();

    // TODO (שלב ההרשאות): כאן ייכנס סינון המחירים לפי תפקיד המשתמש.
    // כרגע אין עדיין התחברות אישית, ולכן אין למי לסנן — והשדה מוחזר במלואו.

    res.status(200).json({ products, count: products.length });
  } catch (e) {
    console.error("[catalog]", e);
    res.status(502).json({ error: "שליפת הקטלוג מ-monday נכשלה" });
  }
}
