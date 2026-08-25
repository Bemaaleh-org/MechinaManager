/* ============================================================
   ציוד המכינה — מכולה וניקיון
   ------------------------------------------------------------
   קובץ הגדרה בלבד. המסך עצמו יושב ב-Equipment.jsx ומשותף עם
   ציוד המטבח; כאן רק הניסוחים ושבע קריאות השרת של התחום הזה.

   הדף מוצג לאחראי המכולה (התפקיד נקבע במסך "בעלי תפקידים")
   — וההרשאה נאכפת בשרת בכל נקודת קצה.
   ============================================================ */

import React from "react";
import { EquipmentPage } from "./Equipment.jsx";
import { api } from "./api.js";
import { AREA, AREAS, EQUIP_KIND } from "../shared/container-boards.js";

const DOMAIN = {
  areas: AREAS,
  /* במכולה רוב הציוד תמידי — כלים, ארגזים, ריהוט */
  defaultKind: EQUIP_KIND.permanent,
  look: {
    [AREA.container]: {
      title: "ציוד מכולה", photo: "/photos/container.jpg",
      loading: "טוען את המכולה", file: "ציוד-מכולה", shopFile: "רשימת-קניות-מכולה",
    },
    [AREA.cleaning]: {
      title: "ציוד ניקיון", photo: null,
      loading: "טוען את ציוד הניקיון", file: "ציוד-ניקיון", shopFile: "רשימת-קניות-ניקיון",
    },
  },
  load: (area) => api.getContainer(area),
  addEquip: (b) => api.addEquip(b),
  editEquip: (b) => api.editEquip(b),
  deleteEquip: (id) => api.deleteEquip(id),
  addShopping: (items, area) => api.addShopping(items, area),
  setShoppingStatus: (b) => api.setShoppingStatus(b),
  deleteShopping: (id) => api.deleteShopping(id),
};

export function ContainerPage({ say, area }) {
  return <EquipmentPage say={say} domain={DOMAIN} area={area} />;
}
