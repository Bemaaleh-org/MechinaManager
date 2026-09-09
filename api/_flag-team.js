/* ============================================================
   ועדה שמסומנת בתיבה — מי רשאי
   ------------------------------------------------------------
   שתי ועדות במכינה נושאות תיבה בלוח ההגדרות ולא שם בקוד:

     `army`    — ועדת הגיוסים / ההכנה לצה״ל
     `content` — ועדת קבוצה ותוכן

   ⚠⚠ **היו כאן שלושה מימושים כמעט־זהים**: `mayContent`,
     `mayRecruit`, ו-`maySeeAll` שב-`_tryouts.js`. השלישי היה
     **יו״ר בלבד** — לא בהחלטה, אלא כי הוא נכתב ראשון ואיש לא
     חזר אליו. התוצאה: חבר ועדת ההכנה לצה״ל לא ראה את המיונים
     של הוועדה שהוא חבר בה, בעוד חבר ועדת הגיוסים כן ראה את
     הפניות. שתי תשובות שונות לאותה שאלה.

     זה 4מד בדיוק: שלוש הגדרות מקבילות מתפצלות, וההפרש
     מתגלה רק כשמישהו מתלונן.

   ⚠ **איחוד ולא AND**: איש צוות **או** יו״ר **או** חבר.
     דגלי `withAuth` הם AND ואינם יכולים לבטא את זה, ולכן
     ההכרעה כאן ולא בדגל (4כב, 4נ, 5כו).

   ⚠ **חברים ולא רק יו״ר.** יו״ר לבדו הוא צוואר בקבוק, וגם
     נקודת כשל ביום שהוא במיונים.

   ⚠ **וכשל בטעינת ההגדרות אינו פותח גישה** — הוא סוגר אותה.
   ============================================================ */

import { loadDefinitions } from "./_placements.js";
import { teamsForStudent } from "./_team-data.js";
import { contentFlagReady } from "../shared/placements.js";

/** התיבות המוכרות, ומה לומר על כל אחת כשאף ועדה אינה מסומנת. */
export const FLAG = {
  content: {
    label: "ועדת קבוצה ותוכן",
    /* ⚠ העמודה נוצרת ב-seed:stulesson — ההודעה אומרת מה להריץ. */
    seed: "npm run seed:stulesson",
    ready: contentFlagReady,
  },
  army: {
    label: "ועדת הגיוסים",
    seed: "npm run seed:recruit",
    /* ⚠ `army` קיימת מזמן ואין לה בדיקת מוכנות נפרדת. */
    ready: () => true,
  },
};

/**
 * @param session  הסשן
 * @param flag     "content" | "army"
 * @returns {{ok:boolean, why:string|null, setup?:boolean, teams:Array}}
 *   `setup` — התיבה טרם הוקמה או שאף ועדה אינה מסומנת. זה
 *   **אינו** "אין הרשאה": זה מצב שהמסך יודע לתאר, והוא אומר
 *   מה לעשות (עיקרון 6).
 */
export async function mayFlagged(session, flag) {
  const cfg = FLAG[flag];
  if (!cfg) throw new Error("תיבה לא מוכרת: " + flag);

  if (!session.isStudent) return { ok: true, why: "צוות", teams: [] };
  if (!cfg.ready()) return { ok: false, why: null, setup: true, teams: [] };

  try {
    const defs = await loadDefinitions();
    const teams = defs.filter((d) => d[flag] && !d.archived);
    if (!teams.length) return { ok: false, why: null, setup: true, teams: [] };

    const chaired = teams.filter((d) => String(d.chair || "") === String(session.itemId));
    if (chaired.length) {
      return { ok: true, why: "יו״ר " + chaired[0].name, teams: chaired };
    }

    /* ⚠ **וגם חבר בוועדה** — ראו ההסבר בראש הקובץ. */
    const ids = new Set(teams.map((d) => d.id));
    const mine = await teamsForStudent(session.itemId);
    const inTeam = mine.filter((t) => ids.has(t.id));
    if (inTeam.length) {
      return { ok: true, why: "חבר " + inTeam[0].name, teams: inTeam };
    }
  } catch (e) {
    console.error("[flag-team:" + flag + "]", e && e.message);
  }
  return { ok: false, why: null, teams: [] };
}

/**
 * ההודעה למי שנחסם.
 * ⚠ **אומרת מי כן רשאי ולא "אין הרשאה"** (4כב), ובמצב `setup`
 *   אומרת בדיוק מה לעשות — כי זו אינה חסימה אלא לוח שטרם
 *   הוגדר, ומי שרואה "אין הרשאה" על זה יחפש במקום הלא נכון.
 */
export function flagHint(may, flag) {
  const cfg = FLAG[flag] || {};
  if (may && may.setup) {
    return `אף ועדה אינה מסומנת כ"${cfg.label}" בלוח השיבוצים. `
      + `סמנו את התיבה בשורת הוועדה, או הריצו ${cfg.seed}`;
  }
  return `המסך מנוהל על ידי ${cfg.label}`;
}
