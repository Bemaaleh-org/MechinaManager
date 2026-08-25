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

import { withAuth, actorName } from "./_session.js";
import { studentRows } from "./_student-rows.js";
import { gql } from "./_monday.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, israelToday,
  vacationRule, createAbsence, invalidateAttendance,
} from "./_attendance-data.js";
import { loadRequests, invalidateRequests } from "./_requests.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, ABSENCE, ABSENCE_SOURCE, REQ_STATUS,
  REQ_STAGE, requestStage,
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

    /* ⚠ בקשה שכבר הוכרעה לא משנה כיוון. מנהל שני שפותח את המסך
       הישן ולוחץ לא הופך החלטה של הראשון בלי שאיש יידע. */
    if (request.status !== REQ_STATUS.pending) {
      return res.status(409).json({
        error: `הבקשה כבר ${request.status}` + (request.decidedBy ? ` על ידי ${request.decidedBy}` : ""),
      });
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
    if (stage === REQ_STAGE.guide && !session.isHead) {
      if (!isGuideOf(session, guide)) {
        return res.status(403).json({
          error: `הבקשה ממתינה להמלצת ${guide.name}`,
        });
      }
      return recommend({ res, session, request, decision, guide });
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

    if (decision === "approve") {
      if (!span.length) return res.status(400).json({ error: "הטווח אינו בלוח השנה של המכינה" });

      if (request.type === ABSENCE.vacation) {
        for (const d of span) {
          const rule = vacationRule(d);
          if (!rule.allowed) return res.status(400).json({ error: rule.reason });
        }
        const sum = summarize(request.studentId, { absences, marked, byDate: cal.byDate });
        const perHalf = {};
        for (const d of span) perHalf[d.half] = (perHalf[d.half] || 0) + 1;
        for (const [half, needed] of Object.entries(perHalf)) {
          const q = sum.quota.find((x) => x.half === half);
          if (!q) return res.status(400).json({ error: "התאריך אינו בתוך מחצית" });
          if (q.left < needed) {
            return res.status(400).json({ error: `הבקשה דורשת ${needed} ימי חופש ב${half}, ונשארו ${q.left}` });
          }
        }
      }

      for (const d of span) {
        const already = absences.find(
          (a) => a.studentId === request.studentId && a.date === d.date);
        if (already) { skipped++; continue; }
        await createAbsence({
          studentId: request.studentId,
          studentName: student.name,
          date: d.date,
          type: request.type,
          detail: request.detail,
          source: ABSENCE_SOURCE.request,
        });
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
        }),
      }
    );

    invalidateRequests();
    invalidateAttendance();

    res.status(200).json({
      ok: true, id: requestId, status, stage: REQ_STAGE.done,
      absenceCreated: created > 0,
      daysCreated: created,
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
async function recommend({ res, session, request, decision, guide }) {
  const label = decision === "approve" ? REQ_STATUS.approved : REQ_STATUS.rejected;

  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    {
      b: MECHINA_BOARDS.requests, i: request.id,
      v: JSON.stringify({
        [R.guide]: { label },
        [R.guideBy]: actorName(session).slice(0, 120),
        [R.guideAt]: { date: israelToday() },
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
