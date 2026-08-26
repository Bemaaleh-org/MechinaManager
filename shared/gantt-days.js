/* ============================================================
   קריאת הגאנט לפי יום — מקור אחד לכל מי ששואל "מה יש היום"
   ------------------------------------------------------------
   ⚠ הקובץ הזה נולד מתקלה: תקציב המטבח גזר את סוג היום מהגאנט,
     ולוח השיעורים לא שאל את הגאנט בכלל. התוצאה הייתה 138
     מפגשים שהוצגו כמתקיימים בימים שהגאנט אומר עליהם יום
     כיפור, ראש השנה או סופ״ש בית.

     שני מסכים ששואלים את אותה שאלה חייבים לשאול אותה באותו
     קוד. כל כלל חדש — "גם יום זיכרון אין בו שיעורים" — נכתב
     כאן פעם אחת ומשתקף בשניהם.

   ⚠ פונקציות טהורות בלבד. השליפה מ-monday נשארת בצד השרת.
   ============================================================ */

/** יום בשבוע לפי תאריך ISO, ללא תלות באזור הזמן של המכשיר */
export const dow = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
export const isFriday = (iso) => dow(iso) === 5;
export const isSaturday = (iso) => dow(iso) === 6;

export const prevDay = (iso) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/* ------------------------------------------------------------
   הביטויים
   ⚠ שמות האירועים נכתבים ביד בגאנט, ולכן ההתאמה היא על טקסט.
     זה לא אידיאלי — אבל סוג האירוע בלוח מבחין רק בין פעילות,
     שבת וחג, והשאר נמצא בשם בלבד.
   ------------------------------------------------------------ */
/* ⚠ הביטוי הועתק **כפי שהוא** מתקציב המטבח ולא הורחב. הרחבה
   שלו הייתה משנה בשקט את חישוב התקציב לימים שכבר חושבו, וכסף
   לא משנים בדרך אגב.

   ⚠ ידוע ולא תוקן: אירוע בשם "בית (לא בטוח, תלוי ארועים
     בקיבוץ)" אינו נתפס כאן, כי ^בית$ דורש התאמה מדויקת.
     ימים כאלה מחושבים בתקציב כשגרה. ההכרעה אצל המנהל. */
export const HOME_RE = /סופ״ש בית|סופ"ש בית|^בית$|יום בית/;
export const SERIES_RE = /סדרה|סדרת|מסע/;
/** יציאה מהמכינה: סמינר, טיול, כנס — אין בהם שיעורי מערכת */
export const AWAY_RE = /סמינר|כנס|טיול|שבתון|מחנה/;

export const dayEvents = (index, iso) => index.get(iso) || [];
const anyMatch = (events, re) => (events || []).some((e) => re.test(e.name || ""));

/** תאריך → אירועי הגאנט שחלים עליו */
export function eventsByDate(gantt) {
  const map = new Map();
  for (const e of gantt || []) {
    const from = e.start, to = e.end || e.start;
    if (!from) continue;
    for (let d = new Date(from + "T12:00:00Z"); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso).push(e);
    }
  }
  return map;
}

/* ============================================================
   האם מתקיימים שיעורים ביום הזה
   ------------------------------------------------------------
   ⚠ מחזיר סיבה ולא רק "לא". מפגש שנעלם בלי הסבר נראה כמו
     תקלה, ומי שרואה "הגאנט אומר: יום כיפור" יודע מיד אם
     הגאנט צודק או שהוא זה שצריך תיקון.

   ⚠ הסדר הוא ההכרעה, כמו בתקציב: חג גובר על הכול, אחריו בית,
     אחריו יציאה מהמכינה, ואחרי הכול שבת.

   ⚠ "סדרה" אינה חוסמת. בסדרה יש לימודים, רק לא לפי המערכת
     הרגילה — וחסימה שלה הייתה מסתירה מפגשים אמיתיים.
   ============================================================ */
export function lessonBlock(index, iso) {
  const events = dayEvents(index, iso);

  const holiday = events.find((e) => e.type === "חג ומועד");
  if (holiday) return { blocked: true, reason: holiday.name, kind: "חג" };

  /* ⚠ שבת נבדקת גם דרך יום שישי שלפניה: "סופ״ש בית" נרשם
     בגאנט על שישי ונמשך לשבת, בדיוק כמו בתקציב. */
  const friday = isSaturday(iso) ? prevDay(iso) : iso;
  const weekend = isSaturday(iso) ? dayEvents(index, friday) : [];
  const home = [...events, ...weekend].find((e) => HOME_RE.test(e.name || ""));
  if (home) return { blocked: true, reason: home.name, kind: "בית" };

  const away = events.find((e) => AWAY_RE.test(e.name || "") && !SERIES_RE.test(e.name || ""));
  if (away) return { blocked: true, reason: away.name, kind: "יציאה" };

  const shabbat = events.find((e) => e.type === "שבת");
  if (shabbat) return { blocked: true, reason: shabbat.name, kind: "שבת" };
  if (isSaturday(iso)) return { blocked: true, reason: "שבת", kind: "שבת" };

  return { blocked: false, reason: null, kind: null };
}
