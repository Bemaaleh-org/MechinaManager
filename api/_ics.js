/* ============================================================
   קריאת יומן Google בפורמט iCal
   ------------------------------------------------------------
   ⚠ קריאה בלבד, מעצם הפורמט: הזנת ICS אינה יודעת לכתוב חזרה
     ליומן. זו בדיוק ההתנהגות שנדרשה — האפליקציה מציגה את
     הלו״ז ולא נוגעת בו. מי שמשנה, משנה ביומן עצמו.

   ⚠ הכתובת היא סוד ויושבת ב-GOOGLE_CALENDAR_ICS שבסביבה, לא
     בקוד: מי שמחזיק אותה קורא את כל היומן (עיקרון 2).
   ============================================================ */

/** שורות ICS מפוצלות באמצע; המשך מסומן ברווח בתחילת השורה. */
function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

/** "20260901" או "20260901T120000" → ISO מקומי */
function parseDt(value, params) {
  const v = String(value || "").trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  const allDay = !hh || (params.VALUE === "DATE");
  if (allDay) return { date: `${y}-${mo}-${d}`, allDay: true, time: null };

  /* ⚠ שעה ב-UTC מומרת לשעון ישראל. שעה עם TZID כבר מגיעה
     בשעון המקומי של היומן — הוא כולו Asia/Jerusalem. */
  if (z) {
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss || 0));
    const local = new Date(utc.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    const p = (n) => String(n).padStart(2, "0");
    return {
      date: `${local.getFullYear()}-${p(local.getMonth() + 1)}-${p(local.getDate())}`,
      allDay: false,
      time: `${p(local.getHours())}:${p(local.getMinutes())}`,
    };
  }
  return { date: `${y}-${mo}-${d}`, allDay: false, time: `${hh}:${mm}` };
}

const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dowOf = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();

/* אותיות היום ב-RRULE */
const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/**
 * פורש אירוע חוזר על חלון תאריכים.
 * ⚠ תומך ב-DAILY/WEEKLY/MONTHLY עם INTERVAL, COUNT, UNTIL
 *   ו-BYDAY. חוקים נדירים יותר לא נפרשים — עדיף אירוע חסר
 *   מאשר אירוע שגוי בתאריך שלא היה בו.
 */
function expand(ev, from, to) {
  if (!ev.rrule) return [ev.start.date];
  const r = Object.fromEntries(
    ev.rrule.split(";").map((p) => p.split("=")).filter((x) => x.length === 2));
  const freq = r.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(freq)) return [ev.start.date];

  const interval = Math.max(1, Number(r.INTERVAL) || 1);
  const count = Number(r.COUNT) || 0;
  const until = r.UNTIL ? (parseDt(r.UNTIL, {}) || {}).date : null;
  const days = r.BYDAY ? r.BYDAY.split(",").map((d) => BYDAY[d.slice(-2)]).filter((n) => n !== undefined) : null;

  const out = [];
  let cur = ev.start.date;
  let made = 0;
  /* גבול קשיח — יומן פגום לא יסובב אותנו לנצח */
  for (let guard = 0; guard < 2000; guard++) {
    if (cur > to) break;
    if (until && cur > until) break;
    if (count && made >= count) break;

    const ok = !days || days.includes(dowOf(cur));
    if (ok) {
      made++;
      if (cur >= from && !ev.exdates.includes(cur)) out.push(cur);
    }

    if (freq === "DAILY") cur = addDays(cur, interval);
    else if (freq === "WEEKLY") cur = addDays(cur, days ? 1 : 7 * interval);
    else {
      const d = new Date(cur + "T12:00:00Z");
      d.setUTCMonth(d.getUTCMonth() + interval);
      cur = d.toISOString().slice(0, 10);
    }
  }
  return out;
}

/**
 * מפרק ICS לרשימת אירועים בחלון [from, to], ממוינים.
 * מחזיר { date, time, allDay, name, location, endTime }
 */
export function parseIcs(text, from, to) {
  const src = unfold(String(text || ""));
  const blocks = src.split("BEGIN:VEVENT").slice(1);
  const out = [];

  for (const raw of blocks) {
    const body = raw.split("END:VEVENT")[0];
    const ev = { exdates: [] };

    for (const line of body.split("\n")) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const left = line.slice(0, i);
      const value = line.slice(i + 1).trim();
      const [key, ...paramParts] = left.split(";");
      const params = Object.fromEntries(
        paramParts.map((p) => p.split("=")).filter((x) => x.length === 2));

      if (key === "DTSTART") ev.start = parseDt(value, params);
      else if (key === "DTEND") ev.end = parseDt(value, params);
      else if (key === "SUMMARY") ev.name = value.replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
      else if (key === "LOCATION") ev.location = value.replace(/\\,/g, ",").trim();
      else if (key === "RRULE") ev.rrule = value;
      else if (key === "STATUS") ev.status = value;
      else if (key === "EXDATE") {
        for (const one of value.split(",")) {
          const p = parseDt(one, params);
          if (p) ev.exdates.push(p.date);
        }
      }
    }

    if (!ev.start || !ev.name) continue;
    if (ev.status === "CANCELLED") continue;

    for (const date of expand(ev, from, to)) {
      if (date < from || date > to) continue;
      out.push({
        date,
        allDay: ev.start.allDay,
        time: ev.start.time,
        endTime: ev.end && !ev.end.allDay ? ev.end.time : null,
        name: ev.name,
        location: ev.location || null,
      });
    }
  }

  return out.sort((a, b) =>
    a.date.localeCompare(b.date)
    || (a.allDay === b.allDay ? 0 : a.allDay ? -1 : 1)
    || String(a.time).localeCompare(String(b.time)));
}
