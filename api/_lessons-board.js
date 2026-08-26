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

   ⚠ הגאנט מכריע. מפגש שנופל על חג, על סופ״ש בית או על סמינר
     מחוץ למכינה אינו נספר ב"מה בא" — הוא עובר לרשימה נפרדת
     עם הסיבה. עד כה הלוח הזה לא שאל את הגאנט בכלל, ו-138
     מפגשים הוצגו כמתקיימים בימים שהגאנט אומר עליהם יום
     כיפור, ראש השנה או בית.

     ⚠ מוצג ולא נמחק. הגאנט עשוי להיות זה שטועה, ומפגש שנעלם
       בלי הסבר נראה כמו תקלה. מי שרואה "הגאנט אומר: יום
       כיפור" יודע מיד מי מהשניים צריך תיקון.

   ⚠ צוות או אחראי לו״ז — אותה הרשאה כמו הגאנט.
   ============================================================ */

import { withAuth } from "./_session.js";
import { loadSheets, loadMeetings } from "./_lessons-data.js";
import { loadGantt } from "./_lessons-gantt.js";
import { eventsByDate, lessonBlock } from "../shared/gantt-days.js";
import { israelToday } from "./_attendance-data.js";
import { parseTestDate } from "./_test-date.js";

/** כמה ימים קדימה ואחורה. שבועיים לכל כיוון. */
const DAYS = 14;

const shift = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function handler(req, res) {
  try {
    const test = parseTestDate(req?.query?.today);
    const today = test
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(test)
      : israelToday();

    const [sheets, meetings, gantt] = await Promise.all([
      loadSheets(), loadMeetings(), loadGantt()]);
    const evIndex = eventsByDate(gantt);
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
        guestLecturer: sh ? sh.guestLecturer : false,
        planned: m.planned,
        happened: m.happened,
        reason: m.reason,
        note: m.note,
        /* ⚠ נגזר מהגאנט בכל שליפה ואינו נשמר: הזזת אירוע
           בגאנט משנה אותו מיד, ושדה שמור היה מתיישן. */
        conflict: lessonBlock(evIndex, m.date),
      };
    };

    /* ⚠ גיליון שכבוי אינו מוצג. הוא הופסק במהלך השנה, ומפגשיו
       שנשארו בלוח אינם מטלה של אף אחד. */
    const live = meetings.filter((m) => {
      const sh = byId.get(m.sheetId);
      return sh && sh.active && m.date;
    });

    const ahead = live
      .filter((m) => m.date >= today && m.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(dress);

    const upcoming = ahead.filter((m) => !m.conflict.blocked);
    /* ⚠ רשימה נפרדת ולא הסתרה. ראו ההערה בראש הקובץ. */
    const clashing = ahead.filter((m) => m.conflict.blocked);

    /* ⚠ רק מה שטרם דווח. מפגש שדווח — בין אם התקיים ובין אם
       לא — כבר טופל, ואין מה לעשות איתו. */
    const unreported = live
      .filter((m) => m.date >= from && m.date < today && !m.happened)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(dress);
      /* ⚠ כאן **לא** מסננים. "האם השיעור התקיים" היא שאלה
         פתוחה גם ביום שהגאנט חוסם: "חג ומועד" בגאנט מכסה גם
         את צום גדליה ואת אסרו חג, שבהם המכינה עובדת. סינון
         היה מוחק מטלה אמיתית בשקט. הסימון מוצג, וההכרעה
         נשארת אצל אחראי הלו״ז. */

    res.status(200).json({
      today, from, to, days: DAYS,
      upcoming,
      clashing,
      unreported,
      counts: {
        upcoming: upcoming.length,
        unreported: unreported.length,
        clashing: clashing.length,
      },
    });
  } catch (e) {
    console.error("[lessons-board]", e);
    res.status(502).json({ error: "שליפת לוח השיעורים נכשלה" });
  }
}

export default withAuth(handler, { scheduler: true });
