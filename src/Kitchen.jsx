/* ============================================================
   ציוד המטבח — אוכל וחד״פ
   ------------------------------------------------------------
   קובץ הגדרה בלבד. המסך עצמו יושב ב-Equipment.jsx ומשותף עם
   ציוד המכינה; כאן רק הניסוחים ושבע קריאות השרת של התחום הזה.

   ⚠ ברירת המחדל לפריט חדש היא "מתכלה" ולא "תמידי", בניגוד
     למכולה: במטבח כמעט הכול נאכל או נזרק. סיר הוא החריג.
   ============================================================ */

import React from "react";
import { EquipmentPage } from "./Equipment.jsx";
import { api } from "./api.js";
import { KITCHEN_AREA, KITCHEN_AREAS, KITCHEN_KIND } from "../shared/kitchen-boards.js";

const DOMAIN = {
  areas: KITCHEN_AREAS,
  defaultKind: KITCHEN_KIND.consumable,
  look: {
    [KITCHEN_AREA.food]: {
      title: "ציוד אוכל", photo: null,
      loading: "טוען את ציוד האוכל", file: "ציוד-אוכל", shopFile: "רשימת-קניות-אוכל",
    },
    [KITCHEN_AREA.disposable]: {
      title: "ציוד חד״פ", photo: null,
      loading: "טוען את ציוד החד״פ", file: "ציוד-חדפ", shopFile: "רשימת-קניות-חדפ",
    },
  },
  load: (area) => api.getKitchen(area),
  addEquip: (b) => api.addKitchenItem(b),
  editEquip: (b) => api.editKitchenItem(b),
  deleteEquip: (id) => api.deleteKitchenItem(id),
  addShopping: (items, area) => api.addKitchenShopping(items, area),
  setShoppingStatus: (b) => api.setKitchenShoppingStatus(b),
  deleteShopping: (id) => api.deleteKitchenShopping(id),
};

export function KitchenPage({ say, area }) {
  return <EquipmentPage say={say} domain={DOMAIN} area={area} />;
}
