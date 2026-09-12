/* ============================================================
   POST /api/attendance?action=decide   { requestId, decision }
   decision: "approve" | "reject"

   ⚠ שני שלבים, ואותה נקודת קצה לשניהם. מי המחליט נקבע מהשלב
     שהבקשה נמצאת בו, לא ממה שהדפדפן שולח:

       אצל המדריך      → המדריך של הקבוצה, או ראש המכינה
       אצל ראש המכינה  → ראש המכינה בלבד

     ⚠ ראש המכינה אינו כפוף לשלב. הוא מכריע גם לפני שהמדריך
       המליץ, וההכרעה שלו סוגרת את הבקשה.

     המדריך *ממליץ*: גם דחייה שלו מעבירה את הבקשה הלאה, כדי
     שראש המכינה יראה את כל התמונה. שורת ההיעדרות נוצרת
     בהכרעה הסופית בלבד — המלצה אינה משנה דבר בלוח השנה.

   ⚠ שאר אנשי הצוות רואים כל בקשה ואת השלב שלה, ואינם מכריעים.
     מנהל אינו ראש מכינה: התפקיד יושב בעמודה בלוח המשתמשים.

   אישור בקשה יוצר את שורת ההיעדרות בו ברגע. זה החיבור היחיד
   בין השניים — אין הקלדה כפולה ואין מצב שבו בקשה מאושרת אינה
   מופיעה בלוח השנתי של החניך.

   ⚠ הכללים נבדקים שוב כאן, בזמן ההחלטה, ולא רק בזמן ההגשה.
     חניך יכול להגיש שלוש בקשות חופש כשלכל אחת בנפרד יש מכסה;
     אישור שלושתן היה חורג. הבדיקה בהגשה נועדה לחסוך לו הגשה
     לחינם — הבדיקה שקובעת היא זו.

   ⚠ שורת היעדרות שכבר קיימת לאותו יום אינה נדרסת. הבקשה
     מאושרת, אבל לא נוצרת שורה שנייה — עדיף מצב גלוי מאשר
     כפילות שקטה בלוח השנתי.
   ============================================================ */

import { chargeCeiling, chargeNoun } from "./_request-charge.js";
import { guideDaysReady, isChargeable } from "../shared/mechina-boards.js";
import { withAuth, actorName } from "./_session.js";
import { nudge } from "./_push-now.js";
import { studentRows } from "./_student-rows.js";
import { gql } from "./_monday.js";
import { deleteItem } from "./_items.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, israelToday,
  vacationRule, createAbsence, invalidateAttendance,
} from "./_attendance-data.js";
import { loadRequests, invalidateRequests } from "./_requests.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, ABSENCE, ABSENCE_SOURCE, REQ_STATUS,
  REQ_STAGE, requestStage,
  vacationCost,
} from "../shared/mechina-boards.js";
import { guideMap, isGuideOf } from "./_guides.js";

const R = MECHINA_COLS.requests;

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const requestId = String(body?.requestId || "").trim();
    const decision = String(body?.decision || "");

    if (!requestId) return res.status(400).json({ error: "לא צוינה בקשה" });
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ error: "החלטה לא מוכרת" });
    }

    const [requests, cal, rows, absences, marked, guides] = await Promise.all([
      loadRequests({ force: true }), loadCalendar(), studentRows(),
      loadAbsences({ force: true }), loadMarked(), guideMap(),
    ]);

    const request = requests.find((r) => r.id === requestId);
    if (!request) return res.status(404).json({ error: "הבקשה אינה נמצאת" });

    /* ============================================================
       ⚠⚠ **הכרעה מחדש — אפשרית, אבל רק במפורש**
       ------------------------------------------------------------
       הכלל המקורי נשאר בתוקף במלואו: מנהל שני שפותח מסך ישן
       ולוחץ **אינו** הופך החלטה של הראשון בלי שאיש יידע. מה
       שנפתח הוא מסלול אחר לגמרי — `redo: true`, שנשלח מכפתור
       שכתוב עליו "שינוי ההחלטה" ורק אחרי אישור.

       ⚠ **ראש המכינה בלבד.** המדריך ממליץ, והוא אינו הופך
         הכרעה שכבר ניתנה (4א).

       ⚠ **וההיעדרויות מתהפכות איתה.** אישור שהופך לדחייה מוחק
         את שורות ההיעדרות שנוצרו ממנו — אחרת החניך נשאר נעדר
         ביום שהבקשה שלו נדחתה, והמכסה שלו נשארת מחויבת.
       ============================================================ */
    const redo = Boolean(body?.redo);
    const wasDecided = request.status !== REQ_STATUS.pending;
    if (wasDecided && !redo) {
      return res.status(409).json({
        error: `הבקשה כבר ${request.status}` + (request.decidedBy ? ` על ידי ${request.decidedBy}` : ""),
      });
    }
    if (wasDecided && !session.isHead) {
      return res.status(403).json({ error: "שינוי החלטה שכבר ניתנה נעשה על ידי ראש המכינה" });
    }

    const student = rows.find((r) => r.id === request.studentId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });

    /* ---------- מי רשאי להכריע עכשיו ----------
       ⚠ ההרשאה נגזרת מהשלב ומהשיוך, לא ממה שנשלח. איש צוות
         שיקרא לכתובת ישירות ייעצר כאן. */
    const guide = guides.get(request.studentId) || null;
    const stage = requestStage(request, Boolean(guide));

    /* ⚠ ראש המכינה מכריע בכל שלב, גם לפני שהמדריך המליץ. השלב
       הראשון הוא סדר עבודה ולא שער: ההחלטה שלו בסופו של דבר,
       והוא לא אמור להמתין להמלצה כשהוא כבר יודע את התשובה.
       ההמלצה שדולגה נשארת ריקה — ולא מומצאת בדיעבד. */
    if (!wasDecided && stage === REQ_STAGE.guide && !session.isHead) {
      if (!isGuideOf(session, guide)) {
        return res.status(403).json({
          error: `הבקשה ממתינה להמלצת ${guide.name}`,
        });
      }
      return recommend({ res, session, request, decision, guide, cal, body });
    }

    if (!session.isHead) {
      return res.status(403).json({
        error: "רק ראש המכינה מכריע בבקשות יציאה",
      });
    }

    /* ⚠ בקשה יכולה להשתרע על כמה ימים. האישור יוצר שורת היעדרות
       לכל יום לימודים בטווח — לא רק לראשון. */
    const endDate = request.endDate || request.date;
    const span = cal.days.filter((d) => d.date >= request.date && d.date <= endDate);
    let created = 0, skipped = 0;
    /* כמה ימים נגבו/נספרו בפועל — חופש, מחלה ומוצדקת (12.9.2026). */
    let charge = null;

    /* ============================================================
       ⚠ **קודם מוחקים את מה שההחלטה הקודמת יצרה, ואז מחליטים.**

       שורות ההיעדרות מזוהות לפי חניך, טווח התאריכים של הבקשה,
       ו-`source === request` — כלומר שורות שנוצרו מבקשה ולא
       שורות שמישהו סימן ביד בסימון היומי. שורה ידנית היא עובדה
       על היום ולא תוצאה של הבקשה, ומחיקתה הייתה מוחקת סימון
       שמוביל השבוע עשה.

       ⚠ **מוחק גם כשההחלטה החדשה היא "אשר".** הזרימה למטה
         יוצרת מחדש, ובלי המחיקה `already` היה מדלג על כל יום
         ומספר הימים היה שקרי.
     ============================================================ */
    let removed = 0;
    if (wasDecided && request.status === REQ_STATUS.approved) {
      for (const a of absences) {
        if (a.studentId !== request.studentId) continue;
        if (a.date < request.date || a.date > endDate) continue;
        if (a.source !== ABSENCE_SOURCE.request) continue;
        await deleteItem(a.id);
        removed++;
      }
    }
    /* ⚠ הרשימה שבזיכרון כבר אינה נכונה אחרי המחיקה, והזרימה
       למטה בודקת מולה `already`. */
    const live = removed
      ? absences.filter((a) => !(a.studentId === request.studentId
        && a.date >= request.date && a.date <= endDate
        && a.source === ABSENCE_SOURCE.request))
      : absences;

    if (decision === "approve") {
      if (!span.length) return res.status(400).json({ error: "הטווח אינו בלוח השנה של המכינה" });

      if (isChargeable(request.type)) {
        if (request.type === ABSENCE.vacation) {
          for (const d of span) {
            const rule = vacationRule(d);
            if (!rule.allowed) return res.status(400).json({ error: rule.reason });
          }
        }
        /* ⚠ התקרה — שעות לחופש, ימים בטווח למחלה ולמוצדקת. */
        const auto = chargeCeiling(request, cal);
        if (auto == null) {
          return res.status(400).json({ error: "לא ניתן לחשב את משך היציאה — בדקו תאריכים ושעות" });
        }

        /* ============================================================
           ⚠⚠ **המכריע בוחר כמה ימים לגבות, והברירה היא החישוב.**

           היציאה עשויה להיות 26 שעות — כלומר שני ימים לפי הכלל —
           והמדריך מכיר את הקושי להגיע ובוחר לגבות אחד. זו החלטה
           שלו, ועד היום לא הייתה לה שום דרך ביטוי: הוא היה מאשר
           ומקווה, או דוחה בקשה שהיא בסדר.

           ⚠ **אפס מותר.** "אני מאשר ולא גובה" הוא מצב אמיתי —
             חתונה של אח, לוויה, יום מיון. בלעדיו המדריך היה
             נאלץ לרשום את זה כ"מוצדקת", וזה נתון אחר.

           ⚠ **אבל לא יותר מהחישוב.** גבייה מעבר למה שהיציאה
             באמת לקחה אינה החלטה שקולה אלא כמעט תמיד טעות
             הקלדה, והיא יורדת ממכסה שהחניך אינו יכול להשיב.
           ============================================================ */
        /* ⚠ ברירת המחדל: מה שהמדריך הציע, אם הציע ואם הוא בתוך
           התקרה — אחרת החישוב. ראש המכינה משנה רק כשהוא מתכוון. */
        charge = request.guideDays != null && request.guideDays <= auto ? request.guideDays : auto;
        if (body?.days !== undefined && String(body.days).trim() !== "") {
          const n = Number(body.days);
          if (!Number.isInteger(n) || n < 0 || n > auto) {
            return res.status(400).json({
              error: `${chargeNoun(request.type)} — מספר שלם בין 0 ל-${auto}`,
              suggested: auto,
            });
          }
          charge = n;
        }

        /* ⚠ מכסה — לחופש בלבד. למחלה ולמוצדקת אין מכסה. */
        if (request.type === ABSENCE.vacation) {
        const sum = summarize(request.studentId, { absences, marked, byDate: cal.byDate });
        /* ⚠ החיוב נזקף למחצית של תאריך היציאה — כמו בהגשה. */
        const half = (cal.byDate.get(request.date) || {}).half;
        const q = half && sum.quota.find((x) => x.half === half);
        if (!q) return res.status(400).json({ error: "התאריך אינו בתוך מחצית" });
        if (q.left < charge) {
          return res.status(400).json({ error: `הבקשה עולה ${charge} ימי חופש ב${half}, ונשארו ${q.left}` });
        }
        }
      }

      /* ============================================================
         ⚠⚠ **שורה לכל יום לימודים, ומחיר רק על הראשונות.**

         לנוכחות הנתון הנכון הוא "לא היה" בכל יום שבטווח, ולכן
         נוצרת שורה לכל אחד מהם. למכסה הנתון הנכון הוא `charge`.
         שני המספרים אינם זהים, ולכן `cost` על השורה: הימים
         הראשונים עולים 1 והשאר 0.

         ⚠ **ולא "שורה אחת ששווה שלוש".** יום בלי שורה נראה
           בנוכחות כאילו החניך היה כאן, וזו טענה שגויה עליו.
         ============================================================ */
      let left = charge;
      for (const d of span) {
        const already = live.find(
          (a) => a.studentId === request.studentId && a.date === d.date);
        if (already) { skipped++; continue; }
        /* ⚠ חופש, מחלה ומוצדקת — המחיר לפי הבחירה (12.9.2026). */
        const priced = charge != null;
        const price = priced ? Math.min(1, left) : 1;
        await createAbsence({
          studentId: request.studentId,
          studentName: student.name,
          date: d.date,
          type: request.type,
          detail: request.detail,
          source: ABSENCE_SOURCE.request,
          cost: price,
        });
        if (priced) left -= price;
        created++;
      }
    }

    const status = decision === "approve" ? REQ_STATUS.approved : REQ_STATUS.rejected;
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      {
        b: MECHINA_BOARDS.requests, i: requestId,
        v: JSON.stringify({
          [R.status]: { label: status },
          [R.by]: actorName(session).slice(0, 120),
          [R.decided]: { date: israelToday() },
          /* ⚠ **הכרעה חדשה מנקה את הערר.** ערר שנשאר על שורה
             שכבר הוכרעה שוב נראה כמו ערר שממתין, וזו התראה על
             משהו שכבר טופל (4כו). */
          ...(R.appeal ? { [R.appeal]: "" } : {}),
          ...(R.appealAt ? { [R.appealAt]: {} } : {}),
        }),
      }
    );

    /* ⚠ **דחיפה ברגע ההכרעה, ולא מחר.** זו ההתראה שהחניך באמת
       מחכה לה — הוא ביקש לצאת ורוצה לדעת אם אושר. fire-and-forget:
       אינה נזרקת, אינה מעכבת את התשובה, ואם היא נכשלת הסבב היומי
       והפעמון ממילא יראו את זה. ראו api/_push-now.js. */
    nudge("student", request.studentId, "בקשה הוכרעה");

    invalidateRequests();
    invalidateAttendance();

    res.status(200).json({
      ok: true, id: requestId, status, stage: REQ_STAGE.done,
      absenceCreated: created > 0,
      daysCreated: created,
      /* ⚠ כמה שורות היעדרות בוטלו — המסך אומר זאת במילים.
         "ההחלטה שונתה" בלי המספר משאיר את המכריע לנחש. */
      daysRemoved: removed,
      redecided: wasDecided,
      /* ⚠ כמה ימי חופש נגבו בפועל — המסך אומר את זה במילים.
         "אושר" בלי המספר משאיר את החניך לגלות אותו במכסה. */
      charged: charge,
      /* ⚠ הסוג — כדי שההודעה תאמר "נגבו ימי חופש" או "נספרו". */
      type: request.type,
      /* ימים שכבר הייתה בהם היעדרות — המסך מודיע ולא שותק */
      alreadyAbsent: decision === "approve" && skipped > 0,
    });
  } catch (e) {
    console.error("[request-decide]", e);
    res.status(502).json({ error: "עדכון הבקשה נכשל" });
  }
}

/* ------------------------------------------------------------
   שלב ראשון — המלצת המדריך.
   ⚠ אינה נוגעת בעמודת הסטטוס ואינה יוצרת היעדרות. היא רק
     מסמנת מה המדריך חושב, ומעבירה את הבקשה לראש המכינה.
   ------------------------------------------------------------ */
async function recommend({ res, session, request, decision, guide, cal, body }) {
  const label = decision === "approve" ? REQ_STATUS.approved : REQ_STATUS.rejected;

  /* ============================================================
     ⚠⚠ **המדריך מציע כמה ימים — יחד עם ההמלצה לאשר.**
     "שהמדריך וראש המכינה יחליטו" (12.9.2026): המדריך מכיר את
     החניך ויודע שהמחלה הייתה יום ולא שלושה. ההצעה נשמרת על
     הבקשה ומוצגת לראש המכינה כברירת המחדל שלו — והוא מכריע.

     ⚠ **אותה תקרה בדיוק של ההכרעה** (`chargeCeiling`). הצעה
       שההכרעה הייתה דוחה היא הצעה שמלמדת להתעלם מההצעות.
     ⚠ **המלצה לדחות מנקה את ההצעה** — מספר ימים על בקשה שהמדריך
       ממליץ לדחות הוא סתירה בתוך אותה שורה.
     ============================================================ */
  let proposed = null;
  if (decision === "approve" && isChargeable(request.type)
      && body?.days !== undefined && String(body.days).trim() !== "") {
    const max = chargeCeiling(request, cal);
    const n = Number(body.days);
    if (max == null || !Number.isInteger(n) || n < 0 || n > max) {
      return res.status(400).json({
        error: `${chargeNoun(request.type)} — מספר שלם בין 0 ל-${max ?? 0}`,
        suggested: max,
      });
    }
    proposed = n;
  }

  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    {
      b: MECHINA_BOARDS.requests, i: request.id,
      v: JSON.stringify({
        [R.guide]: { label },
        [R.guideBy]: actorName(session).slice(0, 120),
        [R.guideAt]: { date: israelToday() },
        /* ⚠ טקסט — "" מנקה (אין כאן מלכודת אינדקס 5, שהיא של
           עמודות סטטוס בלבד, 5ז). */
        ...(guideDaysReady() ? { [R.guideDays]: proposed == null ? "" : String(proposed) } : {}),
      }),
    }
  );

  invalidateRequests();

  res.status(200).json({
    ok: true,
    id: request.id,
    stage: REQ_STAGE.head,
    /* ⚠ הסטטוס לא זז. המסך אמור לומר "הועברה", לא "אושרה". */
    status: REQ_STATUS.pending,
    guideDecision: label,
    guideName: guide.name,
    guideDays: proposed,
    absenceCreated: false,
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
