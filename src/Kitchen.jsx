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
    /* ⚠ המצב המאוחד. שני התחומים חולקים לוח אחד ממילא, ורשימת
       הקניות שלהם משותפת — ההפרדה למסכים רק אילצה לעבור
       ביניהם באמצע ספירת מלאי. */
    all: {
      title: "אוכל וחד״פ", photo: null,
      loading: "טוען את ציוד המטבח", file: "ציוד-מטבח", shopFile: "רשימת-קניות-מטבח",
    },
  },
  load: (area) => api.getKitchen(area),
  addEquip: (b) => api.addKitchenItem(b),
  editEquip: (b) => api.editKitchenItem(b),
  addQty: (b) => api.addKitchenQty(b),
  deleteEquip: (id) => api.deleteKitchenItem(id),
  addShopping: (items, area) => api.addKitchenShopping(items, area),
  setShoppingStatus: (b) => api.setKitchenShoppingStatus(b),
  deleteShopping: (id) => api.deleteKitchenShopping(id),
};

export function KitchenPage({ say, area }) {
  return <EquipmentPage say={say} domain={DOMAIN} area={area} />;
}
