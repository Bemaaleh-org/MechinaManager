/* ============================================================
   GET  /api/attendance?action=requests    רשימת הבקשות
   POST /api/attendance?action=requests    הגשת בקשה חדשה

   ⚠ חניך רואה את הבקשות שלו בלבד. הסינון בשרת — לא בתצוגה.
     בקשות יציאה נושאות סיבות אישיות ("אבל במשפחה", "מחלה"),
     ואין סיבה שחניך יקרא את אלה של חבריו.

   ⚠ מכסת החופש והכלל "רק ביום שגרה" נבדקים כאן, בשרת. המסך
     חוסם אותם מראש כדי שהחניך לא יגיש לחינם — אבל החסימה
     האמיתית היא זו, אחרת קריאה ישירה לכתובת עוקפת אותה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { studentRows, toPublic } from "./_student-rows.js";
import { gql, allItems, uploadFile } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, vacationRule,
} from "./_attendance-data.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, ABSENCE, REQ_STATUS, REQ_STAGE, requestStage,
} from "../shared/mechina-boards.js";
import { guideMap, isGuideOf } from "./_guides.js";

const R = MECHINA_COLS.requests;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = [ABSENCE.vacation, ABSENCE.sick, ABSENCE.justified];

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const linked = (i, c) => {
  const x = i.column_values.find((y) => y.id === c);
  return x && x.linked_item_ids && x.linked_item_ids[0] ? String(x.linked_item_ids[0]) : null;
};

export async function loadRequests({ force = false } = {}) {
  return cached("mechina-requests", async () => {
    const items = await allItems(MECHINA_BOARDS.requests);
    return items
      .map((i) => ({
        id: String(i.id),
        studentId: linked(i, R.student),
        type: val(i, R.type),
        date: val(i, R.date),
        endDate: val(i, R.endDate) || val(i, R.date),
        hasFile: Boolean(val(i, R.file)),
        detail: val(i, R.detail),
        status: val(i, R.status) || REQ_STATUS.pending,
        decidedBy: val(i, R.by) || null,
        decidedAt: val(i, R.decided) || null,
        guideDecision: val(i, R.guide) || null,
        guideBy: val(i, R.guideBy) || null,
        guideAt: val(i, R.guideAt) || null,
      }))
      .filter((r) => r.studentId && r.date && r.type)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, { force });
}

export const invalidateRequests = () => invalidate("mechina-requests");

async function handler(req, res, session) {
  if (req.method === "GET") return list(req, res, session);
  if (req.method === "POST") return create(req, res, session);
  return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
}

/* ---------- קריאה ---------- */
async function list(req, res, session) {
  try {
    const [all, rows, guides] = await Promise.all([
      loadRequests(), studentRows(), guideMap(),
    ]);
    const byId = new Map(rows.map((r) => [r.id, r]));

    // ⚠ הסינון כאן. חניך לעולם לא מקבל בקשות של אחרים.
    const mine = session.isManager ? all : all.filter((r) => r.studentId === session.itemId);

    const wanted = req.query?.status ? String(req.query.status) : null;
    const filtered = wanted ? mine.filter((r) => r.status === wanted) : mine;

    res.status(200).json({
      requests: filtered.map((r) => {
        const guide = guides.get(r.studentId) || null;
        const stage = requestStage(r, Boolean(guide));
        return {
          id: r.id,
          type: r.type,
          date: r.date,
          endDate: r.endDate,
          hasFile: r.hasFile,
          detail: r.detail || null,
          status: r.status,
          decidedBy: r.decidedBy,
          decidedAt: r.decidedAt,
          /* ---- שני השלבים ----
             ⚠ השלב נגזר, לא נשמר. ראו requestStage. */
          stage,
          guideName: guide ? guide.short : null,
          groupName: guide ? guide.group : null,
          guideDecision: r.guideDecision,
          guideBy: r.guideBy,
          guideAt: r.guideAt,
          /* האם *המשתמש הזה* יכול להכריע עכשיו. תצוגה בלבד —
             ההרשאה נאכפת שוב ב-decide. */
          canDecide:
            (stage === REQ_STAGE.guide && isGuideOf(session, guide)) ||
            (stage === REQ_STAGE.head && Boolean(session.isHead)),
          // שם החניך נחוץ רק למנהל; לחניך זה תמיד הוא עצמו
          student: session.isManager
            ? (byId.get(r.studentId) ? toPublic(byId.get(r.studentId)) : { id: r.studentId, name: "—" })
            : undefined,
        };
      }),
      count: filtered.length,
      /* כמה ממתינות *להחלטתי* — מה שממלא את המונה במסך */
      mine: mine.filter((r) => {
        const g = guides.get(r.studentId) || null;
        const st = requestStage(r, Boolean(g));
        return (st === REQ_STAGE.guide && isGuideOf(session, g)) ||
               (st === REQ_STAGE.head && Boolean(session.isHead));
      }).length,
      pending: mine.filter((r) => r.status === REQ_STATUS.pending).length,
    });
  } catch (e) {
    console.error("[requests:list]", e);
    res.status(502).json({ error: "שליפת הבקשות נכשלה" });
  }
}

/* ---------- הגשה ---------- */
async function create(req, res, session) {
  try {
    if (session.isManager) {
      return res.status(403).json({ error: "בקשת יציאה מוגשת על ידי חניך" });
    }

    const body = req.body ?? (await readJson(req));
    const type = String(body?.type || "");
    const date = String(body?.date || "").trim();
    /* ⚠ בקשה יכולה להשתרע על כמה ימים. ריק = יום אחד. */
    const endDate = String(body?.endDate || date).trim();
    const detail = String(body?.detail || "").trim().slice(0, 2000);

    if (!TYPES.includes(type)) return res.status(400).json({ error: "לא נבחר סוג בקשה" });
    if (!DATE_RE.test(date) || !DATE_RE.test(endDate)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }
    if (endDate < date) return res.status(400).json({ error: "תאריך הסיום לפני תאריך ההתחלה" });

    const [cal, all, rows, absences, marked] = await Promise.all([
      loadCalendar(), loadRequests({ force: true }), studentRows(), loadAbsences(), loadMarked(),
    ]);

    /* ימי הלימוד שבטווח — עליהם הבקשה חלה בפועל */
    const span = cal.days.filter((d) => d.date >= date && d.date <= endDate);
    if (!span.length) return res.status(400).json({ error: "הטווח אינו בלוח השנה של המכינה" });
    if (span.length > 21) return res.status(400).json({ error: "בקשה מוגבלת לשלושה שבועות" });

    const student = rows.find((r) => r.id === session.itemId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });

    /* היעדרות מוצדקת בלי פירוט אינה ניתנת להכרעה על ידי המנהל */
    if (type === ABSENCE.justified && !detail) {
      return res.status(400).json({ error: "היעדרות מוצדקת מחייבת פירוט" });
    }

    if (type === ABSENCE.vacation) {
      /* ⚠ כל יום בטווח חייב לעמוד בכלל, והמכסה נבדקת על סך הימים */
      for (const d of span) {
        const rule = vacationRule(d);
        if (!rule.allowed) {
          return res.status(400).json({ error: `${d.date.split("-").reverse().join("/")}: ${rule.reason}` });
        }
      }
      const sum = summarize(session.itemId, { absences, marked, byDate: cal.byDate });
      const perHalf = {};
      for (const d of span) perHalf[d.half] = (perHalf[d.half] || 0) + 1;

      for (const [half, needed] of Object.entries(perHalf)) {
        const q = sum.quota.find((x) => x.half === half);
        if (!q) return res.status(400).json({ error: "התאריך אינו בתוך מחצית" });
        const pendingSameHalf = all
          .filter((r) => r.studentId === session.itemId && r.type === ABSENCE.vacation &&
                         r.status === REQ_STATUS.pending)
          .reduce((n, r) => n + cal.days.filter((d) =>
            d.date >= r.date && d.date <= r.endDate && d.half === half).length, 0);
        if (q.used + pendingSameHalf + needed > q.total) {
          return res.status(400).json({
            error: `הבקשה דורשת ${needed} ימי חופש ב${half}, ונשארו ${Math.max(0, q.total - q.used - pendingSameHalf)}`,
          });
        }
      }
    }

    /* חפיפה עם בקשה ממתינה קיימת */
    const overlap = all.find((r) =>
      r.studentId === session.itemId && r.status === REQ_STATUS.pending &&
      r.date <= endDate && r.endDate >= date);
    if (overlap) return res.status(409).json({ error: "כבר קיימת בקשה שממתינה להחלטה בתאריכים האלה" });

    /* ---------- אישור מחלה ---------- */
    let fileBuf = null, fileName = null, fileMime = null;
    if (body?.fileData) {
      if (type !== ABSENCE.sick) {
        return res.status(400).json({ error: "אישור מחלה מצורף לבקשת מחלה בלבד" });
      }
      fileName = String(body.fileName || "אישור-מחלה").replace(/[^\w.֐-׿-]/g, "_").slice(0, 80);
      fileMime = String(body.fileMime || "application/octet-stream").slice(0, 60);
      try { fileBuf = Buffer.from(String(body.fileData), "base64"); } catch { fileBuf = null; }
      if (!fileBuf || !fileBuf.length) return res.status(400).json({ error: "הקובץ לא נקרא" });
      /* ⚠ מעל ~4MB גוף הבקשה נחסם על ידי Vercel עוד קודם */
      if (fileBuf.length > 3.5 * 1024 * 1024) {
        return res.status(400).json({ error: "הקובץ גדול מדי — עד 3.5MB" });
      }
    }

    const label = date === endDate ? date : `${date} – ${endDate}`;
    const cols = {
      [R.student]: { item_ids: [Number(session.itemId)] },
      [R.type]: { label: type },
      [R.date]: { date },
      [R.status]: { label: REQ_STATUS.pending },
    };
    if (endDate !== date) cols[R.endDate] = { date: endDate };
    if (detail) cols[R.detail] = detail;

    const d = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.requests, n: `${student.name} · ${type} · ${label}`, v: JSON.stringify(cols) }
    );
    const id = String(d.create_item.id);

    /* הקובץ עולה אחרי יצירת השורה. כשל בהעלאה לא מוחק את הבקשה —
       המסך מודיע והחניך יכול לנסות שוב או למסור ידנית. */
    let fileUploaded = false;
    if (fileBuf) {
      try {
        await uploadFile(id, R.file, fileName, fileBuf, fileMime);
        fileUploaded = true;
      } catch (e2) {
        console.error("[requests:file]", e2.message);
      }
    }

    invalidateRequests();
    res.status(200).json({
      ok: true, id, status: REQ_STATUS.pending,
      days: span.length,
      fileUploaded: fileBuf ? fileUploaded : null,
    });
  } catch (e) {
    console.error("[requests:create]", e);
    res.status(502).json({ error: "שליחת הבקשה נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
