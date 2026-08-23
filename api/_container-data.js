/* ============================================================
   נתוני המכולה — שליפה, מטמון וכתיבה. צד שרת בלבד.
   ============================================================ */

import { allItems } from "./_monday.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { cached, invalidate } from "./_cache.js";
import {
  CONTAINER_BOARDS, CONTAINER_COLS, EQUIP_KIND, SHOP_STATUS, AREA,
} from "../shared/container-boards.js";

const E = CONTAINER_COLS.equipment;
const S = CONTAINER_COLS.shopping;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ שורה בלי תחום היא שורה שנוצרה לפני שהתחומים הופרדו —
   מקומה במכולה, לא ב"אף מקום". */
const areaOf = (i, c) => val(i, c) || AREA.container;

export async function loadEquipment({ force = false } = {}) {
  return cached("container-equipment", async () => {
    const items = await allItems(CONTAINER_BOARDS.equipment);
    return items
      .map((i) => {
        const par = val(i, E.par);
        return {
          id: String(i.id),
          name: String(i.name || "").trim(),
          qty: val(i, E.qty),
          kind: val(i, E.kind) || EQUIP_KIND.permanent,
          area: areaOf(i, E.area),
          par: par === "" ? null : Number(par),
        };
      })
      .filter((x) => x.name)
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, { force });
}

export async function loadShopping({ force = false } = {}) {
  return cached("container-shopping", async () => {
    const items = await allItems(CONTAINER_BOARDS.shopping);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        qty: val(i, S.qty),
        date: val(i, S.date),
        status: val(i, S.status) || SHOP_STATUS.open,
        by: val(i, S.by),
        area: areaOf(i, S.area),
      }))
      .filter((x) => x.name)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.name.localeCompare(b.name, "he"));
  }, { force });
}

export function invalidateContainer() {
  invalidate("container-equipment");
  invalidate("container-shopping");
}

/* ארבע פעולות הפריט עברו ל-_items.js — גם ציוד המטבח צריך
   אותן. מיוצאות מכאן כדי שהקוראים הקיימים לא ישתנו. */
export { setColumns, renameItem, createItem, deleteItem };
