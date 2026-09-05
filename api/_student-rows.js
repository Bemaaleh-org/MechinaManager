/* ============================================================
   שורות החניכים — צד שרת בלבד
   ------------------------------------------------------------
   נפרד מ-authRows שב-_session.js במכוון: זה לוח אחר, מטמון אחר,
   ותחום אחר. שכבת הקודים של המטבח לא מושפעת ממה שקורה כאן.

   ⚠ הלוח הזה אינו לוח של האפליקציה. הוא לוח קיים של המכינה ובו
     הרבה מעבר למה שצריך: בעיות רפואיות, אלרגיות, הגדרה דתית,
     פרטי הורים וצילומי תעודת זהות.

     לכן השליפה מבקשת ids מפורשים ולא column_values ריק. עמודה
     חדשה שתתווסף ללוח לא תיכנס לזיכרון של השרת מלכתחילה, ולא
     תוכל לדלוף גם אם מישהו ישכח לסנן בהמשך.

   ⚠ תעודת הזהות היא סוד הכניסה. היא לא יוצאת מהמודול הזה —
     toPublic מסירה אותה, וכל נקודת קצה מחזירה דרכה בלבד.
   ============================================================ */

import { gql } from "./_monday.js";
import { cached } from "./_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { ROLES_COL, ROLE_SCHEDULE } from "../shared/lessons-boards.js";

const C = MECHINA_COLS.roster;

/** מנקה ת"ז לספרות בלבד, ומשלים ל-9 — כך "0123..." ו-123... זהים */
export const normalizeTz = (v) =>
  String(v ?? "").replace(/\D/g, "").padStart(9, "0");

/**
 * כל שורות החניכים, עם השדות המותרים בלבד.
 * ⚠ tz נשאר כאן לצורך אימות כניסה ואינו יוצא ללקוח.
 */
export async function studentRows({ force = false } = {}) {
  return cached("student-rows", async () => {
    const ids = JSON.stringify([
      C.tz, C.active, C.demo, C.leader, C.gender, C.dob, ROLES_COL,
      C.phone, C.mail, C.city, C.allergy, C.religion, C.shirt,
      C.army, C.tryouts, C.talk1, C.talk2, C.talk3,
      /* ⚠ שתי אלה ריקות עד ש-`npm run seed:army` ירוץ, ומזהה
         ריק ברשימה הזו גורם ל-monday להחזיר את **כל** העמודות
         — כלומר בדיוק את פרטי ההורים והמידע הרפואי שהמיפוי
         המפורש נועד למנוע. מסוננות. */
      C.armyCorps, C.armyRole,
    ].filter(Boolean));
    const d = await gql(
      `{ boards(ids:[${MECHINA_BOARDS.roster}]){ items_page(limit:500){ items {
           id name column_values(ids:${ids}){ id text } } } } }`
    );
    const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
    return d.boards[0].items_page.items.map((i) => {
      /* עמודת dropdown מחזירה תוויות מופרדות בפסיק. הרשימה אינה
         סגורה — תפקיד שיתווסף בלוח יגיע לכאן בלי שינוי בקוד. */
      const roles = val(i, ROLES_COL)
        .split(",").map((s) => s.trim()).filter(Boolean);
      return {
        id: String(i.id),
        name: String(i.name || "").trim(),
        tz: normalizeTz(val(i, C.tz)),
        /* ⚠ פרטי קשר. מי שרואה אותם נקבע במיפוי המפורש של
           נקודת הקצה, לא כאן — ראו _account.js ו-_student-profile.js. */
        phone: val(i, C.phone),
        mail: val(i, C.mail),
        city: val(i, C.city),
        allergy: val(i, C.allergy),
        religion: val(i, C.religion),
        shirt: val(i, C.shirt),
        gender: val(i, C.gender) || null,
        /* ⚠ אינו ב-toPublic. יוצא רק דרך נקודת הקצה של הפרופיל,
           ורק לצוות — כמו תעודת הזהות. */
        dob: val(i, C.dob) || null,
        active: val(i, C.active) === "v",
        /* ⚠ חשבון בדיקה. נכנס למערכת ככל חניך ואינו נספר בשום
           מקום — הסינון ב-activeStudents למטה. */
        demo: val(i, C.demo) === "v",
        leader: val(i, C.leader) === "v",
        roles,
        /* ⚠ התפקיד היחיד שקשורה אליו הרשאה. ראו shared/lessons-boards.js */
        isScheduler: roles.includes(ROLE_SCHEDULE),
        /* ---- פרופיל ----
           ⚠ לא נכנס ל-toPublic. יוצא רק דרך נקודת הקצה של
           הפרופיל, שאוכפת מי רואה מה. */
        /* ============================================================
           השיבוץ לצה״ל — חיל ופירוט תפקיד
           ------------------------------------------------------------
           ⚠ **מחוץ ל-`profile`, כי הוא כבר אינו נתון של הפרופיל.**
             "שאיפות ומיונים" יצא מהמסך ההוא לגמרי, והשיבוץ חי
             עכשיו במסך "מיונים ושיבוצים".

           ⚠ **אינו ב-`toPublic`** — הוא יוצא רק דרך נקודת הקצה
             של המיונים, שאוכפת מי רואה מה.
           ============================================================ */
        armyCorps: (C.armyCorps && val(i, C.armyCorps)) || "",
        armyRole: (C.armyRole && val(i, C.armyRole)) || "",
        profile: {
          army: val(i, C.army) || "",
          tryouts: val(i, C.tryouts) || "",
          talks: [val(i, C.talk1) || null, val(i, C.talk2) || null, val(i, C.talk3) || null],
        },
      };
    });
  }, { force });
}

/**
 * הצורה היחידה שבה חניך יוצא מהשרת.
 * ⚠ מיפוי מפורש ולא השמטה — ראו shared/mechina-boards.js.
 */
export const toPublic = (r) => ({
  id: r.id,
  name: r.name,
  gender: r.gender,
  active: r.active,
  leader: r.leader,
  roles: r.roles || [],
  isScheduler: Boolean(r.isScheduler),
});

/* ============================================================
   החניכים הפעילים, ממוינים לפי א״ב
   ------------------------------------------------------------
   ⚠ **חשבון בדיקה יוצא כאן, פעם אחת.** כל מסך שמונה חניכים —
     נוכחות, שיבוצים, מובילי שבוע, רשימת החניכים, אימונים —
     עובר דרך הפונקציה הזו, ולכן די בשורה אחת כדי שהוא לא
     ייספר בשום מקום.

     כיוון הכשל הנכון: מסך חדש שייכתב ויקרא activeStudents
     יסנן אותו מעצמו. מי שירצה דווקא לכלול אותו יצטרך לקרוא
     ל-studentRows במפורש, ולכתוב למה.

   ⚠ הכניסה עצמה עוברת ב-studentRows ולא כאן — ולכן הוא כן
     יכול להיכנס. זו כל התכלית שלו.
   ============================================================ */
export async function activeStudents({ withDemo = false } = {}) {
  const rows = await studentRows();
  return rows
    .filter((r) => r.active && (withDemo || !r.demo))
    .sort((a, b) => a.name.localeCompare(b.name, "he", { numeric: true }));
}

/* ============================================================
   ⚠ **"נספר" ו"ניתן לשיבוץ" הן שתי שאלות.**

   `demo` נבנה כדי שחשבון הבדיקה לא יזייף נוכחות, אחוזים
   ומכסות — וזה נשאר. אבל אותו סינון הוציא אותו גם מ**רשימת
   הבחירה** של עורך השיבוצים, ולכן אי אפשר היה לשבץ אותו
   לוועדה כדי לבדוק את מסך הוועדה. כלומר החשבון שנועד לבדיקות
   לא יכול היה להשתתף בדבר שצריך לבדוק.

   ⚠ **הכיוון נשאר הנכון.** `withDemo` הוא אופציה מפורשת
     שצריך לבקש, ומסך חדש שיקרא `activeStudents()` בלי ארגומנט
     ימשיך לסנן אותו מעצמו — בדיוק כמו קודם (4לא).

   ⚠ **ורק לבחירה, לא לספירה.** כל שימוש ב-`withDemo` שנוגע
     במונה, בממוצע או במכסה הוא באג.
   ============================================================ */
export const assignableStudents = () => activeStudents({ withDemo: true });
