/* ============================================================
   מי רשאי לנהל את מה שבאחריות ועדת קבוצה ותוכן
   ------------------------------------------------------------
   שלושה מסכים חולקים את אותה שאלה — שיעורי חניך, המליאות
   ומאגר המרצים — ולכן היא נכתבת **פעם אחת** כאן. שלוש בדיקות
   מקבילות מתפצלות בתיקון הראשון, וזו כבר סיבה מתועדת לתקלה
   במאגר הזה יותר מפעם אחת (4מד).

   ⚠ **איחוד ולא AND**: איש צוות **או** יו״ר הוועדה **או** חבר
     בה. `withAuth` אינו יכול לבטא את זה, ולכן זה כאן ולא בדגל
     (4כב, 4נ, 5כו).

   ⚠ **חברים ולא רק יו״ר.** יו״ר לבדו הוא צוואר בקבוק, וגם
     נקודת כשל ביום שהוא במיונים.

   ⚠ **וכשל בטעינת ההגדרות אינו פותח גישה** — הוא סוגר אותה.
   ============================================================ */

import { loadDefinitions } from "./_placements.js";
import { teamsForStudent } from "./_team-data.js";
import { contentFlagReady } from "../shared/placements.js";

/**
 * @returns {{ok:boolean, why:string|null, setup?:boolean}}
 *   `setup` — העמודה בלוח טרם הוקמה, ולכן אף ועדה אינה
 *   מסומנת. זה **אינו** "אין הרשאה": זה מצב שהמסך יודע
 *   לתאר, והוא אומר מה להריץ (עיקרון 6).
 */
export async function mayContent(session) {
  if (!session.isStudent) return { ok: true, why: "צוות" };
  if (!contentFlagReady()) return { ok: false, why: null, setup: true };
  try {
    const defs = await loadDefinitions();
    const teams = defs.filter((d) => d.content && !d.archived);
    if (!teams.length) return { ok: false, why: null, setup: true };

    const chaired = teams.filter((d) => String(d.chair || "") === String(session.itemId));
    if (chaired.length) return { ok: true, why: "יו״ר " + chaired[0].name };

    const ids = new Set(teams.map((d) => d.id));
    const mine = await teamsForStudent(session.itemId);
    const inTeam = mine.find((t) => ids.has(t.id));
    if (inTeam) return { ok: true, why: "חבר " + inTeam.name };
  } catch (e) {
    console.error("[content-team:may]", e && e.message);
  }
  return { ok: false, why: null };
}

/** ההודעה למי שנחסם — ⚠ אומרת מי כן רשאי, ולא "אין הרשאה" (4כב). */
export const contentHint = (may) => (may && may.setup
  ? 'אף ועדה אינה מסומנת כ"ועדת קבוצה ותוכן" בלוח השיבוצים. '
    + "סמנו את התיבה בשורת הוועדה, או הריצו npm run seed:stulesson"
  : "המסך מנוהל על ידי ועדת קבוצה ותוכן");
