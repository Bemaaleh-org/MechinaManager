/* ============================================================
   GET /api/lessons?action=board

   לוח השיעורים של אחראי הלו״ז: מה בא בשבועיים הקרובים, ומה
   כבר עבר ועדיין לא דווח.

   ⚠ אין כאן שום נתון חדש. הכול נשלף מהגיליונות ומהמפגשים
     שלהם, וכל סימון חוזר לאותו מקום. זו תצוגה, לא מאגר —
     "מה שאין בגיליון אינו קיים", וגיליון שישתנה משנה גם כאן.

   ⚠ "טרם דווח" הוא null ולא "לא". מפגש שאיש לא נגע בו אינו
     מפגש שלא התקיים, וזו בדיוק הרשימה שהמסך הזה קיים בשבילה.
     ראו HAPPENED ב-shared/lessons-boards.js.

   ⚠ **"מתוכנן" בגיליון מכריע, לפני הכול.** אחראי הלו״ז כבר
     סימן לכל מפגש אם הוא מתקיים, וכתב סיבה כשלא — "שבוע
     קליטה", "יום כיפור", "סדרת ניווטים". 269 מתוך 688
     המפגשים מסומנים "לא", והלוח הציג את כולם כאילו הם
     מתקיימים. זו הייתה התלונה: "מסע בתרבות היהודית" הוצג
     ב-7/9 כשהגיליון אומר במפורש שהוא מתחיל ב-14/9.

   ⚠ הגאנט הוא **רשת שנייה ולא ראשונה**. הוא תפס 80 מתוך
     אותם 269 — פחות משליש — כי הוא יודע על חגים ולא על
     "יום מיון" או "לתאם מחדש". מה שהוא כן מוסיף: 62 מפגשים
     שהגיליון אומר עליהם שהם מתקיימים והגאנט אומר שזה חג.
     שם באמת צריך מישהו להסתכל.

     ⚠ אלה מוצגים ולא נמחקים. הגאנט עשוי להיות זה שטועה, ומי
       שרואה "הגאנט אומר: יום כיפור" יודע מיד מי מהשניים
       צריך תיקון.

   ⚠ המיון הוא לפי תאריך **ואז לפי שעה**. בלי זה אימונים של
     7:00 הופיעו אחרי מליאה של 20:00, והלוח לא נראה כמו
     הגיליון שממנו הוא נבנה.

   ⚠ מפגש שנופל ביום אחר מזה שכתוב בגיליון מסומן (offDay).
     זה קורה באמת — שיעור השלמה שהוזז — ולכן מסומן ולא מתוקן.

   ⚠ צוות או אחראי לו״ז — אותה הרשאה כמו הגאנט.
   ============================================================ */

import { withAuth } from "./_session.js";
import { weeksOfStudent } from "./_leader-weeks.js";
import { loadSheets, loadMeetings } from "./_lessons-data.js";
import {
  timeOf, dayOf, minutesOf, hebDayOf, PLANNED,
} from "../shared/lessons-boards.js";
import { israelToday } from "./_attendance-data.js";
import { parseTestDate } from "./_test-date.js";

/** כמה ימים קדימה ואחורה. שבועיים לכל כיוון. */
const DAYS = 14;

const shift = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ============================================================
   ⚠⚠ **השער כאן הוא איחוד, ולכן הוא בקוד ולא בדגל של `withAuth`.**

   דגלי `withAuth` הם AND, והשאלה כאן היא "צוות **או** אחראי
   לו״ז **או** מי שמוביל שבוע כלשהו". אותו דפוס בדיוק כמו
   `mayArea` (4כב) ו-`mayTeam` (4נ).

   ⚠ **ולמה לא `{scheduler:true}`:** הדגל הזה בודק
   `session.isLeader`, שפירושו **מוביל היום**. מוביל של השבוע
   הבא קיבל 403 על לוח השיעורים — בדיוק הבאג שתועד ב-5ב לגבי
   סימון הנוכחות, שחוזר כאן. השאלה הנכונה היא `leadsAnyWeek`,
   ו**איזה תאריך** מותר נבדק בתוך נקודת הקצה.

   ⚠⚠ **ובמכוון לא הרחבנו את `{scheduler:true}` עצמו.** הוא
   שומר גם על `?action=pay` — דוח התשלום למרצים — ומוביל שבוע
   אינו אמור לראות כמה משלמים למרצה. שער אחד רחב לשתי שאלות
   שונות הוא בדיוק איך נפתחת גישה שאיש לא התכוון אליה.
   ============================================================ */
const mayBoard = (session) =>
  Boolean(session.isManager || session.isScheduler
    || session.isLeader || session.leadsAnyWeek);

const BLOCKED = "לוח השיעורים פתוח לצוות, לאחראי הלו״ז ולמובילי השבוע.";

async function handler(req, res, session) {
  if (!mayBoard(session)) return res.status(403).json({ error: BLOCKED });

  try {
    const test = parseTestDate(req?.query?.today);
    const today = test
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(test)
      : israelToday();

    /* ⚠ **הגאנט אינו נקרא כאן, בכוונה.** היה כאן חיבור שסימן
       מפגש כ"מתנגש" עם אירוע בגאנט, והוא הוסר: אין קשר בין
       השניים. מה שקובע אם מפגש מתקיים הוא עמודת "מתוכנן"
       שבגיליון, שאחראי הלו״ז ממלא — ורק היא. */
    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);
    const byId = new Map(sheets.map((s) => [s.id, s]));

    const from = shift(today, -DAYS);
    const to = shift(today, DAYS);

    const dress = (m) => {
      const sh = byId.get(m.sheetId) || null;
      return {
        id: m.id,
        date: m.date,
        day: m.day,
        sheetId: m.sheetId,
        subject: sh ? sh.subject : "—",
        /* המרצה של המפגש גובר על זה של הגיליון: שיעור אורח
           נושא מרצה משלו. */
        lecturer: m.lecturer || (sh ? sh.lecturer : null),
        dayTime: sh ? sh.dayTime : null,
        /* השעה מנותחת מהגיליון — היא הדבר שמסדר את היום */
        time: sh ? timeOf(sh.dayTime) : null,
        /* ⚠ המפגש ביום אחר מזה שכתוב בגיליון. קורה בהשלמות
           ובשיעורים שהוזזו, ולכן מסומן ולא "מתוקן". */
        offDay: Boolean(sh && dayOf(sh.dayTime) && hebDayOf(m.date)
          && dayOf(sh.dayTime) !== hebDayOf(m.date)),
        guestLecturer: sh ? sh.guestLecturer : false,
        planned: m.planned,
        happened: m.happened,
        reason: m.reason,
        note: m.note,
      };
    };

    /* ⚠ גיליון שכבוי אינו מוצג. הוא הופסק במהלך השנה, ומפגשיו
       שנשארו בלוח אינם מטלה של אף אחד. */
    const live = meetings.filter((m) => {
      const sh = byId.get(m.sheetId);
      return sh && sh.active && m.date;
    });

    /* ⚠ תאריך, ואז שעה. שיעור בלי שעה בגיליון יורד לסוף היום
       ולא נדחף לראשו. */
    const byDateThenTime = (a, b) =>
      a.date.localeCompare(b.date)
      || minutesOf(a.dayTime) - minutesOf(b.dayTime)
      || a.subject.localeCompare(b.subject, "he");

    /* ⚠ "מתוכנן: לא" הוא הצהרה מפורשת של אחראי הלו״ז, ולא
       ניחוש. ריק נחשב מתוכנן — מפגש שאיש לא נגע בו אמור
       להתקיים, וזו ברירת המחדל של הגיליון. */
    const off = (m) => m.planned === PLANNED.no;

    const ahead = live
      .filter((m) => m.date >= today && m.date <= to)
      .map(dress)
      .sort(byDateThenTime);

    /* ⚠ מה שהגיליון אומר שמתקיים — **כולל** מה שהגאנט חולק
       עליו. הגיליון הוא הצהרה מפורשת של אחראי הלו״ז לגבי
       המפגש הזה; הגאנט הוא אירוע כללי על היום. שיעור בצום
       גדליה שסומן "מתוכנן: כן" באמת מתקיים, והדחיקה שלו
       מהרשימה הסתירה שיעור אמיתי.

       ההתנגשות מסומנת על השורה ונספרת — אבל אינה מכריעה. */
    const upcoming = ahead.filter((m) => !off(m));
    /* ⚠ מבוטל בגיליון — לא נעלם, אבל גם לא "שיעור קרוב".
       הסיבה שנכתבה בגיליון היא כל מה שצריך לדעת עליו. */
    const cancelled = ahead.filter(off);

    /* ⚠ רק מה שטרם דווח. מפגש שדווח — בין אם התקיים ובין אם
       לא — כבר טופל, ואין מה לעשות איתו. */
    const unreported = live
      /* ⚠ מפגש שסומן "לא מתוכנן" אינו "טרם דווח" — אין עליו
         מה לדווח. זו הצהרה של אחראי הלו״ז עצמו, ולא גזירה
         שלנו מהגאנט (ראו ההערה על הגאנט בראש הקובץ). */
      .filter((m) => m.date >= from && m.date < today && !m.happened
        && m.planned !== PLANNED.no)
      .map(dress)
      /* ⚠ הפוך: האחרון ראשון. מה שקרה אתמול נזכר טוב יותר
         ממה שקרה לפני שבועיים, וקל יותר לדווח עליו. */
      .sort((a, b) => -byDateThenTime(a, b));
      /* ⚠ כאן **לא** מסננים. "האם השיעור התקיים" היא שאלה
         פתוחה גם ביום שהגאנט חוסם: "חג ומועד" בגאנט מכסה גם
         את צום גדליה ואת אסרו חג, שבהם המכינה עובדת. סינון
         היה מוחק מטלה אמיתית בשקט. הסימון מוצג, וההכרעה
         נשארת אצל אחראי הלו״ז. */

    /* ============================================================
       ⚠ **מה שמותר לי נקבע בשרת ונשלח, ולא נגזר במסך.**
         מוביל שבוע מדווח על מפגשים **בשבוע שלו בלבד** (ראו
         _lesson-mark.js), וכפתור שיציע לו לסמן יום של מישהו
         אחר יקבל 403 אחרי הלחיצה — בדיוק מה שאין לעשות (4יד).

       ⚠ צוות ואחראי לו״ז אינם מוגבלים, ולכן `markWeeks` ריק
         אצלם ו-`markAll` דולק. שני שדות ולא אחד: "מותר לי הכול"
         ו"מותר לי בטווחים האלה" הן שתי תשובות שונות. */
    const markAll = !session.isStudent || Boolean(session.isScheduler);
    const markWeeks = markAll ? [] : await weeksOfStudent(session.itemId);
    /* ⚠ הסימון הידני בלוח החניכים — "היום בלבד", כמו בנוכחות. */
    const markToday = !markAll && Boolean(session.isLeader);

    res.status(200).json({
      today, from, to, days: DAYS,
      upcoming,
      cancelled,
      unreported,
      markAll,
      markWeeks: markWeeks.map((w) => ({ start: w.start, end: w.end, num: w.num })),
      markToday,
      counts: {
        upcoming: upcoming.length,
        unreported: unreported.length,
        cancelled: cancelled.length,
        offDay: upcoming.filter((m) => m.offDay).length,
      },
    });
  } catch (e) {
    console.error("[lessons-board]", e);
    res.status(502).json({ error: "שליפת לוח השיעורים נכשלה" });
  }
}

/* ⚠ `{student:true}` הוא השער הרחב, וההרשאה האמיתית היא
   `mayBoard` שלמעלה. `edit:"scheduler"` נשאר — הוא מגביל
   **כתיבה** בלבד, והלוח הזה הוא קריאה. */
export default withAuth(handler, { student: true, edit: "scheduler" });
