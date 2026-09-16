/* ============================================================
   ועדה שמסומנת בתיבה — מי רשאי
   ------------------------------------------------------------
   שלוש ועדות במכינה נושאות תיבה בלוח ההגדרות ולא שם בקוד:

     `army`      — ועדת הגיוסים / ההכנה לצה״ל
     `content`   — ועדת קבוצה ותוכן
     `community` — ועדת קהילה

   ⚠⚠ **זו הרשימה, ואין שנייה.** `_lesson-rights.js`, `_me.js`
     ו-`tools/flag-team.mjs` כולם נגזרים מ-`FLAG`, ולכן ועדה
     רביעית היא **שורה אחת כאן** — ולא שלושה מקומות
     שמי שישכח אחד מהם ייתן לה הרשאה בלי מסלול (5לא, 5לב).

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
import { contentFlagReady, communityFlagReady } from "../shared/placements.js";

/* ============================================================
   התיבות המוכרות, ומה לומר על כל אחת כשאף ועדה אינה מסומנת.

   ⚠⚠ **ועדה אחת = שורה אחת, כולל עמודת הגיליונות שלה.**
     `sheetCol` הוא שם השדה ב-`LESSON_COLS.sheets` שמסמן אילו
     גיליונות באחריותה. הוא יושב **כאן** ולא במפה שנייה
     ב-`_lesson-rights.js`, כי שתי רשימות מקבילות של ועדות הן
     בדיוק מה שהוליד את `_flag-team.js` מלכתחילה (4מד, 5לא).

   ⚠ **ועדה בלי `sheetCol` אינה מוגבלת לגיליונות — היא פשוט
     אינה נוגעת בהם.** ועדת הגיוסים אינה עוסקת בלו״ז, ולכן
     אין לה עמודה שם; ההיעדר הוא ההצהרה.
   ============================================================ */
export const FLAG = {
  content: {
    label: "ועדת קבוצה ותוכן",
    /* ⚠ העמודה נוצרת ב-seed:stulesson — ההודעה אומרת מה להריץ. */
    seed: "npm run seed:stulesson",
    ready: contentFlagReady,
    sheetCol: "contentTeam",
  },
  army: {
    label: "ועדת הגיוסים",
    seed: "npm run seed:recruit",
    /* ⚠ `army` קיימת מזמן ואין לה בדיקת מוכנות נפרדת. */
    ready: () => true,
  },
  /* ⚠ "זמן קהילה" ו"משפחות מאמצות" (בקשת ראש המכינה, 16.9.2026)
     — אותה צורה בדיוק של ועדת קבוצה ותוכן, עם הגיליונות שלה. */
  community: {
    label: "ועדת קהילה",
    seed: "npm run seed:community -- --go",
    ready: communityFlagReady,
    sheetCol: "communityTeam",
  },
};

/**
 * @param session  הסשן
 * @param flag     מפתח מ-`FLAG` — "content" | "army" | "community"
 * @returns {{ok:boolean, why:string|null, setup?:boolean, teams:Array}}
 *   `setup` — התיבה טרם הוקמה או שאף ועדה אינה מסומנת. זה
 *   **אינו** "אין הרשאה": זה מצב שהמסך יודע לתאר, והוא אומר
 *   מה לעשות (עיקרון 6).
 */
export async function mayFlagged(session, flag) {
  const cfg = FLAG[flag];
  if (!cfg) throw new Error("תיבה לא מוכרת: " + flag);

  /* ============================================================
     ⚠⚠ **`staff: true` אינו קישוט — הוא מבחין בין שתי
       סיבות שונות לאותה תשובה.**

     `ok` כאן הוא איחוד: "צוות **או** יו״ר **או** חבר",
     וזה הרף הנכון לפניות הגיוס ולמיונים. אבל יש שואל
     שצריך דווקא את הצד הצר — "האם הוא **הועדה**" ולא
     "האם מותר לו להיכנס".

     ⚠ **וזה בדיוק הבאג שנתפס כאן (15.9.2026):**
       `lessonRights.write` היה `mayEdit(...) || content`, ו-`content`
       הוא `ok` — כלומר **כל כניסת צוות קיבלה כתיבה
       לגיליונות המרצים ולחוות הדעת**: מדריך, רואה
       חשבון ובוגר. זה סתר את מה שכתוב בראש
       `_lesson-rights.js` עצמו ("מדריך אינו עורך את
       גיליונות המרצים") ואת הצמצום של 4ע.

       `rating-test` ו-`sheet-test` תפסו את זה והיו צודקים.

     ⚠ מי ששואל "האם מותר לו" ממשיך לקרוא `ok` ולא
       משתנה דבר — פניות הגיוס והמיונים כפי שהיו.
     ============================================================ */
  if (!session.isStudent) return { ok: true, why: "צוות", staff: true, teams: [] };
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
