/* ============================================================
   כמה ימים בקשה יכולה לעלות — מקום אחד לשלושה מסלולים
   ------------------------------------------------------------
   ההגשה, ההכרעה והתיקון בדיעבד שואלים את אותה שאלה: מה התקרה
   למספר הימים שהמכריע בוחר. שלוש תשובות מקבילות היו מתפצלות
   בתיקון הראשון (4מד), ולכן היא כאן.

   · **חופש** — לפי השעות (`vacationCost`, 24 שעות = יום).
   · **מחלה ומוצדקת** — מספר הימים בטווח, כלומר בדיוק מספר שורות
     ההיעדרות שההכרעה יוצרת. אין להן שעות שקובעות משך, והמכריע
     מוריד משם ("שלושה תאריכים, בפועל יום אחד").
   · כל השאר — `null`: אין מה לספור.
   ============================================================ */
import { ABSENCE, vacationCost, isChargeable } from "../shared/mechina-boards.js";

export function chargeCeiling(r, cal) {
  if (!r || !isChargeable(r.type)) return null;
  const end = r.endDate || r.date;
  if (r.type === ABSENCE.vacation) return vacationCost(r.date, r.outAt, end, r.backAt);
  const days = (cal && cal.days ? cal.days : [])
    .filter((d) => d.date >= r.date && d.date <= end).length;
  return days || null;
}

/** השם של מה שנספר, לשגיאות ולהודעות */
export const chargeNoun = (type) =>
  type === ABSENCE.vacation ? "ימי החופש לגבייה"
    : type === ABSENCE.sick ? "ימי המחלה שנספרים"
      : "הימים שנספרים כהיעדרות מוצדקת";
