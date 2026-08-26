/* ============================================================
   בטיחות ותקלות — תוויות וכללים
   ------------------------------------------------------------
   דיווחי אירועי בטיחות. גלוי למנהלים ולאחראי הבטיחות בלבד —
   ההרשאה נאכפת בשרת (withAuth {safety:true}), לא בתצוגה.

   ⚠ אין מחיקה של דיווח. אירוע בטיחות הוא רשומה רשמית שמדווחת
     הלאה (משרד הביטחון, מועצת המכינות) — תיקון עושים בעריכה,
     שנשמרת בלוח, ולא בהעלמת השורה.
   ============================================================ */

import { SAFETY, SAFETY_BOARD, SAFETY_COLS } from "./safety-ids.js";

/* ⚠ SAFETY הוא אובייקט ({ board }) ולא מחרוזת, כדי שהחלפת
   מחזור תוכל להחליף את המזהה בזמן ריצה — ראו api/_cycle.js.
   SAFETY_BOARD נשאר לתאימות ואינו מתחלף. */
export { SAFETY, SAFETY_BOARD, SAFETY_COLS };

export const safetyReady = () => Boolean(SAFETY.board);

/** איפה קרה האירוע */
export const SAFETY_PLACE = [
  "שגרה", "סדרה", "טיול", "התנדבות בענפים",
  "משרדים", "מכולה", "אחר",
];

/** חומרת האירוע. "פגיעה" פותחת את שדות הנזק לגוף ולרכוש. */
export const SAFETY_SEVERITY = { injury: "פגיעה", nearMiss: "כמעט ונפגע" };
export const SEVERITIES = [SAFETY_SEVERITY.injury, SAFETY_SEVERITY.nearMiss];

export const YES_NO = { yes: "כן", no: "לא" };
