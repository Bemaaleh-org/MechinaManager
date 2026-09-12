/* ============================================================
   POST /api/attendance?action=recost   תיקון ימי החופש שנגבו

     { requestId, days }

   ------------------------------------------------------------
   הבקשה שהניעה את זה: *"אני רוצה שהצוות בבקשות יציאה יוכל
   לשנות את מספר ימי החופש שנלקחו **גם בדיעבד**, כי לפעמים יש
   טעויות שם."*

   ⚠⚠ **וזו אינה הכרעה מחדש.** `redo` שב-`_request-decide.js`
     הופך אישור לדחייה — מוחק את שורות ההיעדרות ומחזיר את
     החניך לנוכח. כאן **ההחלטה עומדת בעינה**: החניך היה בחופש,
     שורות ההיעדרות נשארות בדיוק כפי שהן, ומה שמשתנה הוא
     **המחיר במכסה בלבד**.

     שתי פעולות ולא אחת עם דגל, מאותו טעם שחוזר בכל המאגר:
     "לתקן טעות הקלדה בספירה" ו"לבטל חופשה" הן שתי כוונות
     שונות, ומסך שיציע אותן כאותו כפתור יגרום למישהו לעשות
     את השנייה כשהתכוון לראשונה.

   ⚠⚠ **ולכן ההרשאה כאן רחבה מזו של `redo`, במפורש.**
     `redo` הוא ראש המכינה בלבד — הוא הופך החלטה. תיקון ספירה
     הוא **הצוות**, כפי שנתבקש: זו טעות תפעולית שמי שראה אותה
     צריך לתקן, ולא להמתין לראש המכינה. ⚠ מי שירצה לצמצם —
     שורה אחת ב-`mayRecost`.

   ⚠ **הגבול העליון נשאר החישוב** (`vacationCost`), בדיוק כמו
     בהכרעה: גבייה מעבר למה שהיציאה באמת לקחה היא כמעט תמיד
     טעות הקלדה שיורדת ממכסה שאי אפשר להשיב. אפס מותר.

   ⚠ **המחיר יושב על השורות ולא על הבקשה.** `MECHINA_COLS
     .absence.cost` הוא מקור האמת של המכסה (5כד), ותיקון
     שהיה נכתב על הבקשה בלבד היה סותר את מה ש-`summarize`
     סופרת — שני מספרים על אותה שאלה.
   ============================================================ */

import { chargeCeiling, chargeNoun } from "./_request-charge.js";
import { isChargeable } from "../shared/mechina-boards.js";
import { withAuth, actorName } from "./_session.js";
import { studentRows } from "./_student-rows.js";
import { setColumns } from "./_items.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, invalidateAttendance,
} from "./_attendance-data.js";
import { loadRequests, invalidateRequests } from "./_requests.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, ABSENCE, ABSENCE_SOURCE, REQ_STATUS,
  vacationCost,
} from "../shared/mechina-boards.js";

const ABS = MECHINA_COLS.absence;

/** ⚠ הצוות, ולא ראש המכינה בלבד — ראו הבלוק שבראש הקובץ. */
const mayRecost = (session) => !session.isStudent && !session.viewOnly;

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }
  if (!mayRecost(session)) {
    return res.status(403).json({ error: "תיקון ימי החופש נעשה על ידי הצוות" });
  }

  /* ⚠ **בלי העמודה אין מה לתקן, וזה נאמר.** בלוח בלי `cost`
     הקוד סופר שורות (5כד), ותיקון היה נכתב לשום מקום — כלומר
     מסך שאומר "נשמר" על משהו שאבד (עיקרון 6). */
  if (!ABS.cost) {
    return res.status(503).json({
      error: "עמודת ימי החופש בהיעדרויות טרם הוקמה. הריצו: npm run setup:boards",
      setupRequired: true,
    });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const requestId = String(body?.requestId || "").trim();
    if (!requestId) return res.status(400).json({ error: "לא צוינה בקשה" });

    const [requests, cal, rows, absences, marked] = await Promise.all([
      loadRequests({ force: true }), loadCalendar(), studentRows(),
      loadAbsences({ force: true }), loadMarked(),
    ]);

    const request = requests.find((r) => r.id === requestId);
    if (!request) return res.status(404).json({ error: "הבקשה אינה נמצאת" });

    /* ⚠ **רק בקשה שאושרה, ורק חופש.** בקשה שנדחתה לא גבתה
       דבר, ומחלה או היעדרות מוצדקת אינן במכסה כלל — "תיקון"
       עליהן היה מספר שאינו קיים. */
    if (request.status !== REQ_STATUS.approved) {
      return res.status(409).json({
        error: `תיקון מספר הימים אפשרי לבקשה שאושרה. הבקשה הזו ${request.status}`,
      });
    }
    /* ⚠ מאז 12.9.2026 גם מחלה ומוצדקת — המכריע קובע כמה ימים
       נספרים, ומי שראה טעות מתקן. */
    if (!isChargeable(request.type)) {
      return res.status(400).json({
        error: `${request.type} — אין בה ימים לתקן`,
      });
    }

    const student = rows.find((s) => s.id === request.studentId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });

    const endDate = request.endDate || request.date;

    /* ⚠ **אותן שורות בדיוק שההכרעה יצרה** — חניך, טווח,
       ו-`source === בקשה`. שורה שמוביל השבוע סימן ביד היא
       עובדה על היום ולא תוצאה של הבקשה (5ל). */
    const mine = absences
      .filter((a) => a.studentId === request.studentId
        && a.date >= request.date && a.date <= endDate
        && a.source === ABSENCE_SOURCE.request)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (!mine.length) {
      return res.status(404).json({
        error: "לא נמצאו שורות היעדרות של הבקשה הזו בלוח השנה",
      });
    }

    /* ⚠ **`cost` ריק נספר כ-1** — אותו כלל בדיוק של `summarize`
       (5כד), ולא 0. שורה שנוצרה לפני שהעמודה נוספה נכתבה
       בעולם שבו יום = יום. */
    const priceOf = (a) => (Number.isFinite(Number(a.cost)) ? Number(a.cost) : 1);
    const before = mine.reduce((n, a) => n + priceOf(a), 0);

    const auto = chargeCeiling(request, cal);
    /* ⚠ בקשה ישנה בלי שעות אינה ניתנת לחישוב, והתקרה נופלת
       למספר השורות — שזה בדיוק מה שהעולם הישן גבה. */
    const max = auto == null ? mine.length : auto;

    if (body?.days === undefined || String(body.days).trim() === "") {
      return res.status(400).json({ error: "לא צוין מספר ימים", before, max });
    }
    const days = Number(body.days);
    if (!Number.isInteger(days) || days < 0 || days > max) {
      return res.status(400).json({
        error: `${chargeNoun(request.type)} — מספר שלם בין 0 ל-${max}`,
        before, max,
      });
    }

    if (days === before) {
      /* ⚠ התשובה אומרת מה השתנה **בפועל** (4ש). */
      return res.status(200).json({ ok: true, changed: false, before, after: before, max });
    }

    /* ⚠ **בדיקת מכסה על ההפרש בלבד.** הימים שכבר נגבו מהבקשה
       הזו כלולים ב-`used`, ולכן השוואה של `days` המלא מול
       `left` הייתה חוסמת גם הקטנה של המספר. */
    /* ⚠ מכסה — לחופש בלבד. */
    if (days > before && request.type === ABSENCE.vacation) {
      const sum = summarize(request.studentId, { absences, marked, byDate: cal.byDate });
      const half = (cal.byDate.get(request.date) || {}).half;
      const q = half && sum.quota.find((x) => x.half === half);
      if (!q) return res.status(400).json({ error: "התאריך אינו בתוך מחצית" });
      if (q.left < days - before) {
        return res.status(400).json({
          error: `העלאה ל-${days} דורשת עוד ${days - before} ימים ב${half}, ונשארו ${q.left}`,
          before, max,
        });
      }
    }

    /* ⚠ **הימים הראשונים עולים 1 והשאר 0** — אותה חלוקה בדיוק
       של ההכרעה, כדי ששני המסלולים ייראו אותו דבר בלוח. */
    let left = days;
    let touched = 0;
    for (const a of mine) {
      const price = Math.min(1, left);
      if (priceOf(a) !== price) {
        await setColumns(MECHINA_BOARDS.absence, a.id, { [ABS.cost]: String(price) });
        touched++;
      }
      left -= price;
    }

    invalidateAttendance();
    invalidateRequests();

    res.status(200).json({
      ok: true,
      changed: true,
      requestId,
      student: student.name,
      before,
      after: days,
      max,
      rows: mine.length,
      touched,
      by: actorName(session),
    });
  } catch (e) {
    console.error("[request-recost]", e);
    res.status(502).json({ error: "תיקון ימי החופש נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{student:true}` הוא השער, וההכרעה ב-`mayRecost` — הדגלים
   של `withAuth` הם AND והשאלה כאן היא "צוות", שהוא שלילת
   `isStudent`. `viewOnly` נחסם ממילא בכל בקשה שאינה GET (4ע). */
export default withAuth(handler, { student: true });
