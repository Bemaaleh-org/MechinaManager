/* ============================================================
   GET /api/lessons?action=agenda — הלו״ז מיומן Google
   ------------------------------------------------------------
   היום, ועוד שבועיים קדימה. פתוח לכל מי שמחובר — חניכים
   וצוות כאחד.

   ⚠ קריאה בלבד. אין כאן POST/PUT/DELETE ולא תהיה: היומן
     נערך ב-Google ולא באפליקציה. הזנת ICS ממילא אינה יודעת
     לכתוב.

   ⚠ שני רבדים שונים ולא כפילות: הגאנט מחזיק את המסגרת
     השנתית ("שבוע קליטה"), והיומן את סדר היום שעה-שעה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { cached } from "./_cache.js";
import { parseIcs } from "./_ics.js";
import { todayFor } from "./_attendance-data.js";

/** כמה ימים קדימה — שבועיים, כפי שהוגדר */
export const AGENDA_DAYS = 14;

const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * מושך את היומן ומפרק אותו.
 * ⚠ מטמון קצר — שתי דקות. היומן משתנה במהלך היום והמסך אמור
 *   לשקף אותו, אבל אין טעם למשוך אותו בכל לחיצה.
 */
async function loadAgenda(from, to, { force = false } = {}) {
  return cached(`agenda:${from}`, async () => {
    const url = process.env.GOOGLE_CALENDAR_ICS;
    if (!url) return null;
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`היומן החזיר ${r.status}`);
    return parseIcs(await r.text(), from, to);
  }, { force, ttl: 2 * 60_000 });
}

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן — היומן נערך ב-Google" });
  }

  if (!process.env.GOOGLE_CALENDAR_ICS) {
    return res.status(503).json({
      error: "היומן טרם חובר. חסרה הכתובת הפרטית של היומן ב-GOOGLE_CALENDAR_ICS.",
      setupRequired: true,
    });
  }

  try {
    const today = todayFor(req);
    const to = addDays(today, AGENDA_DAYS - 1);
    const events = (await loadAgenda(today, to)) || [];

    /* יום לכל יום, גם ריק — המסך מציג "אין פעילות" ולא מדלג */
    const days = [];
    for (let i = 0; i < AGENDA_DAYS; i++) {
      const date = addDays(today, i);
      days.push({ date, events: events.filter((e) => e.date === date) });
    }

    res.status(200).json({
      today,
      days,
      count: events.length,
      todayEvents: days[0].events,
    });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[agenda]", e);
    res.status(502).json({ error: "שליפת הלו״ז מהיומן נכשלה" });
  }
}

export default withAuth(handler, { student: true });
