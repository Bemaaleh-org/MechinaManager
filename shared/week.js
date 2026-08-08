/* ============================================================
   חישוב השבוע הנוכחי לפי שעון ישראל
   ------------------------------------------------------------
   השבוע מתחיל ביום ראשון 00:00 ומסתיים בשבת 23:59, בשעון
   Asia/Jerusalem — ולא לפי שעון השרת. שרת ב-Vercel רץ ב-UTC,
   ובלי ההמרה הזו מוצאי שבת בישראל היו נחשבים לשבוע הקודם.

   מבנה המזהה:
     אותו חודש    2-8.8.2026
     חוצה חודש    30.8-5.9.2026
     חוצה שנה     27.12.2026-2.1.2027
   ============================================================ */

const TZ = "Asia/Jerusalem";
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** התאריך והיום בשבוע בישראל, לרגע נתון */
function israelParts(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dow: DOW[get("weekday")],
  };
}

/** אות היום כפי שהיא בלוחות המשימות. שבת מחזירה null — אין בה משימות. */
export function israelDayLetter(at = new Date()) {
  return ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", null][israelParts(at).dow];
}

/** ראשון ושבת של השבוע שבו נמצא הרגע הנתון */
export function weekBounds(at = new Date()) {
  const p = israelParts(at);
  const base = Date.UTC(p.year, p.month - 1, p.day);
  const sunday = new Date(base);
  sunday.setUTCDate(sunday.getUTCDate() - p.dow);
  const saturday = new Date(base);
  saturday.setUTCDate(saturday.getUTCDate() + (6 - p.dow));
  return { sunday, saturday };
}

/** מזהה השבוע, כמחרוזת יציבה שנשמרת בעמודת "שבוע" */
export function weekId(at = new Date()) {
  const { sunday, saturday } = weekBounds(at);
  const d = (x) => x.getUTCDate();
  const m = (x) => x.getUTCMonth() + 1;
  const y = (x) => x.getUTCFullYear();

  if (y(sunday) !== y(saturday)) {
    // חוצה שנה: שני התאריכים במלואם
    return `${d(sunday)}.${m(sunday)}.${y(sunday)}-${d(saturday)}.${m(saturday)}.${y(saturday)}`;
  }
  if (m(sunday) !== m(saturday)) {
    // חוצה חודש: החודש מופיע בשני הצדדים, השנה פעם אחת
    return `${d(sunday)}.${m(sunday)}-${d(saturday)}.${m(saturday)}.${y(saturday)}`;
  }
  // אותו חודש: היום הראשון בלבד, ואז התאריך המלא
  return `${d(sunday)}-${d(saturday)}.${m(saturday)}.${y(saturday)}`;
}
