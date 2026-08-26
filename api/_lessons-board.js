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

   ⚠ צוות או אחראי לו״ז — אותה הרשאה כמו הגאנט.
   ============================================================ */

import { withAuth } from "./_session.js";
import { loadSheets, loadMeetings } from "./_lessons-data.js";
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

    const upcoming = live
      .filter((m) => m.date >= today && m.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(dress);

    /* ⚠ רק מה שטרם דווח. מפגש שדווח — בין אם התקיים ובין אם
       לא — כבר טופל, ואין מה לעשות איתו. */
    const unreported = live
      .filter((m) => m.date >= from && m.date < today && !m.happened)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(dress);

    res.status(200).json({
      today, from, to, days: DAYS,
      upcoming,
      unreported,
      counts: { upcoming: upcoming.length, unreported: unreported.length },
    });
  } catch (e) {
    console.error("[lessons-board]", e);
    res.status(502).json({ error: "שליפת לוח השיעורים נכשלה" });
  }
}

export default withAuth(handler, { scheduler: true });
