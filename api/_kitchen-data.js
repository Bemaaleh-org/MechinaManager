/* ============================================================
   נתוני המטבח — שליפה, מטמון וכתיבה. צד שרת בלבד.
   ------------------------------------------------------------
   ⚠ שורה בלי תחום היא שורה שנוצרה ידנית ב-monday בלי למלא את
     העמודה. מקומה ב"אוכל" ולא ב"אף מקום" — אחרת פריט שנוסף
     מהלוח נעלם מכל המסכים ואיש לא ידע למה.
   ============================================================ */

import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import {
  KITCHEN_BOARDS, KITCHEN_COLS, KITCHEN_KIND, KITCHEN_SHOP_STATUS, KITCHEN_AREA,
} from "../shared/kitchen-boards.js";

export { setColumns, renameItem, createItem, deleteItem } from "./_items.js";

const E = KITCHEN_COLS.equipment;
const S = KITCHEN_COLS.shopping;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const areaOf = (i, c) => val(i, c) || KITCHEN_AREA.food;

export async function loadKitchenEquipment({ force = false } = {}) {
  return cached("kitchen-equipment", async () => {
    const items = await allItems(KITCHEN_BOARDS.equipment);
    return items
      .map((i) => {
        const par = val(i, E.par);
        return {
          id: String(i.id),
          name: String(i.name || "").trim(),
          qty: val(i, E.qty),
          kind: val(i, E.kind) || KITCHEN_KIND.consumable,
          area: areaOf(i, E.area),
          par: par === "" ? null : Number(par),
        };
      })
      .filter((x) => x.name)
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, { force });
}

export async function loadKitchenShopping({ force = false } = {}) {
  return cached("kitchen-shopping", async () => {
    const items = await allItems(KITCHEN_BOARDS.shopping);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        qty: val(i, S.qty),
        date: val(i, S.date),
        status: val(i, S.status) || KITCHEN_SHOP_STATUS.open,
        by: val(i, S.by),
        area: areaOf(i, S.area),
      }))
      .filter((x) => x.name)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.name.localeCompare(b.name, "he"));
  }, { force });
}

export function invalidateKitchen() {
  invalidate("kitchen-equipment");
  invalidate("kitchen-shopping");
}
