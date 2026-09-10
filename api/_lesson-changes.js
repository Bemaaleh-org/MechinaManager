/* ============================================================
   מה השתנה בגיליון — בשביל היומן החיצוני
   ------------------------------------------------------------
   הבקשה: *"אני רוצה שלאחראי לו״ז תקפוץ התראה בראש מסך הבית
   כשגיליון הוזז, שונה או נמחק, ככה שהוא ידע לשנות את זה
   בגוגל קאלנדר בשביל עצמו."*

   המערכת אינה כותבת ליומן החיצוני ולא תכתוב — זה שירות נוסף,
   סוד נוסף ב-.env, וזוג הרשאות שאיש לא ביקש. מה שהיא כן
   יכולה לעשות הוא לומר **מה השתנה כאן**, כדי שמי שמתחזק את
   היומן ידע מה לפתוח.

   ⚠⚠ **וזה החריג המתועד לכלל "התראות נגזרות ולא נשמרות"
     (4כו).** שם הכלל עובד כי המצב עצמו מעיד — תקלה פתוחה היא
     שורה שקיימת. כאן **המידע הוא ההפרש**, ומפגש שנמחק אינו
     משאיר שום דבר לגזור ממנו. ההסבר המלא, ולמה זו שורה אחת
     לגיליון ולא תור, יושב ב-shared/lessons-boards.js.

   ⚠⚠⚠ **וכישלון רישום לעולם אינו מפיל את העריכה.** מי שהזיז
     מפגש והצליח, ואז קיבל 502 כי עמודת יומן נכשלה, יניח
     שההזזה לא נשמרה — **ויזיז שוב**. הרישום נתפס בנפרד
     ונרשם ללוג, בדיוק כמו כל מקור בפעמון (4כו).
   ============================================================ */

import { setColumns } from "./_items.js";
import { actorName } from "./_session.js";
import { invalidateLessons } from "./_lessons-data.js";
import {
  LESSON_BOARDS, LESSON_COLS, changeLogReady, CHANGE_DAYS,
} from "../shared/lessons-boards.js";

const S = LESSON_COLS.sheets;

/** תאריך ISO → "12.09" לקריאה בעברית. */
export const dm = (iso) => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}` : String(iso || "");
};

/**
 * רושם על הגיליון מה השתנה בו, מתי ועל ידי מי.
 *
 * ⚠ **דורס את הרישום הקודם בכוונה.** שני שינויים באותו גיליון
 *   הם עדיין "הגיליון הזה זז — בדוק אותו ביומן", וזו הפעולה.
 *   תור של שינויים היה מתיישן ומצטבר.
 */
export async function stampChange(sheetId, text, session) {
  if (!changeLogReady() || !sheetId || !text) return false;
  try {
    await setColumns(LESSON_BOARDS.sheets, sheetId, {
      [S.changedAt]: new Date().toISOString(),
      [S.changeNote]: String(text).slice(0, 240),
      [S.changeBy]: String(actorName(session) || "").slice(0, 80),
      /* ⚠ המזהה הוא מה שמונע התראה למי ששינה בעצמו (5כה).
         השם הוא לתצוגה בלבד, ואינו בסיס לשום הכרעה. */
      [S.changeById]: String((session && session.itemId) || ""),
    });
    /* ⚠ המטמון של הגיליונות בן חמש דקות, ובלי הניקוי ההתראה
       הייתה מופיעה רק ברענון הבא — כלומר נראית כאילו לא נרשמה. */
    invalidateLessons();
    return true;
  } catch (e) {
    console.error("[lesson-changes]", e && e.message);
    return false;
  }
}

/**
 * השינויים שבתוך החלון, החדש ראשון.
 *
 * ⚠ **`me` יורד מהרשימה.** מי שהרגע הזיז את השיעור אינו צריך
 *   שיודיעו לו על כך; התראה על פעולה שהרגע עשית היא בדיוק מה
 *   שגורם לסגור את הפעמון ולא לפתוח אותו (5כה).
 *   ⚠ והיא **יורדת מההתראה ולא מהמסך** — ראו `recentChanges`.
 */
export function changesSince(sheets, { days = CHANGE_DAYS, exclude = null } = {}) {
  const from = new Date(Date.now() - days * 86400_000).toISOString();
  return (sheets || [])
    .filter((s) => s.changedAt && s.changedAt >= from && s.changeNote)
    .filter((s) => !exclude || String(s.changeById || "") !== String(exclude))
    .sort((a, b) => String(b.changedAt).localeCompare(String(a.changedAt)));
}

/**
 * מיפוי מפורש לתצוגה.
 * ⚠ שדה שאינו כאן אינו יוצא — שורת הגיליון נושאת טלפון ואימייל
 *   של מרצה חיצוני ומחיר למפגש (עיקרון 4).
 */
export const toChange = (s, me) => ({
  id: s.id,
  subject: s.subject,
  note: s.changeNote,
  at: s.changedAt,
  by: s.changeBy || null,
  /* ⚠ נגזר בשרת ולא בהשוואת שמות בלקוח — שם משתנה ביום שאיש
     צוות מעדכן אותו, והשוואה כזו נשברת בשקט (4ס). */
  mine: Boolean(me && String(s.changeById || "") === String(me)),
});
