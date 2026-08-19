/* ============================================================
   נתוני המכולה — שליפה, מטמון וכתיבה. צד שרת בלבד.
   ============================================================ */

import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import {
  CONTAINER_BOARDS, CONTAINER_COLS, EQUIP_KIND, SHOP_STATUS,
} from "../shared/container-boards.js";

const E = CONTAINER_COLS.equipment;
const S = CONTAINER_COLS.shopping;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

export async function loadEquipment({ force = false } = {}) {
  return cached("container-equipment", async () => {
    const items = await allItems(CONTAINER_BOARDS.equipment);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        qty: val(i, E.qty),
        kind: val(i, E.kind) || EQUIP_KIND.permanent,
      }))
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
      }))
      .filter((x) => x.name)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.name.localeCompare(b.name, "he"));
  }, { force });
}

export function invalidateContainer() {
  invalidate("container-equipment");
  invalidate("container-shopping");
}

export async function setColumns(board, itemId, cols) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: board, i: String(itemId), v: JSON.stringify(cols) }
  );
}

export async function renameItem(board, itemId, name) {
  await gql(
    `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
    { i: String(itemId), b: board, n: name }
  );
}

export async function createItem(board, name, cols) {
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: board, n: name, v: JSON.stringify(cols) }
  );
  return String(d.create_item.id);
}

export async function deleteItem(itemId) {
  await gql(`mutation{ delete_item(item_id:${Number(itemId)}){ id } }`);
}
