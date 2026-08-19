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
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, vacationRule,
} from "./_attendance-data.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, ABSENCE, REQ_STATUS,
} from "../shared/mechina-boards.js";

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
        detail: val(i, R.detail),
        status: val(i, R.status) || REQ_STATUS.pending,
        decidedBy: val(i, R.by) || null,
        decidedAt: val(i, R.decided) || null,
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
    const [all, rows] = await Promise.all([loadRequests(), studentRows()]);
    const byId = new Map(rows.map((r) => [r.id, r]));

    // ⚠ הסינון כאן. חניך לעולם לא מקבל בקשות של אחרים.
    const mine = session.isManager ? all : all.filter((r) => r.studentId === session.itemId);

    const wanted = req.query?.status ? String(req.query.status) : null;
    const filtered = wanted ? mine.filter((r) => r.status === wanted) : mine;

    res.status(200).json({
      requests: filtered.map((r) => ({
        id: r.id,
        type: r.type,
        date: r.date,
        detail: r.detail || null,
        status: r.status,
        decidedBy: r.decidedBy,
        decidedAt: r.decidedAt,
        // שם החניך נחוץ רק למנהל; לחניך זה תמיד הוא עצמו
        student: session.isManager
          ? (byId.get(r.studentId) ? toPublic(byId.get(r.studentId)) : { id: r.studentId, name: "—" })
          : undefined,
      })),
      count: filtered.length,
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
    const detail = String(body?.detail || "").trim().slice(0, 2000);

    if (!TYPES.includes(type)) return res.status(400).json({ error: "לא נבחר סוג בקשה" });
    if (!DATE_RE.test(date)) return res.status(400).json({ error: "תאריך לא תקין" });

    const [cal, all, rows, absences, marked] = await Promise.all([
      loadCalendar(), loadRequests({ force: true }), studentRows(), loadAbsences(), loadMarked(),
    ]);

    const day = cal.byDate.get(date);
    if (!day) return res.status(400).json({ error: "התאריך אינו בלוח השנה של המכינה" });

    const student = rows.find((r) => r.id === session.itemId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });

    /* היעדרות מוצדקת בלי פירוט אינה ניתנת להכרעה על ידי המנהל */
    if (type === ABSENCE.justified && !detail) {
      return res.status(400).json({ error: "היעדרות מוצדקת מחייבת פירוט" });
    }

    if (type === ABSENCE.vacation) {
      const rule = vacationRule(day);
      if (!rule.allowed) return res.status(400).json({ error: rule.reason });

      const sum = summarize(session.itemId, { absences, marked, byDate: cal.byDate });
      const q = sum.quota.find((x) => x.half === day.half);
      if (!q) return res.status(400).json({ error: "התאריך אינו בתוך מחצית" });

      // בקשות חופש שממתינות באותה מחצית תופסות מהמכסה מראש
      const pendingSameHalf = all.filter((r) =>
        r.studentId === session.itemId && r.type === ABSENCE.vacation &&
        r.status === REQ_STATUS.pending && (cal.byDate.get(r.date) || {}).half === day.half
      ).length;

      if (q.used + pendingSameHalf >= q.total) {
        return res.status(400).json({
          error: `נוצלו כל ${q.total} ימי החופש ב${day.half}` +
                 (pendingSameHalf ? ` (כולל ${pendingSameHalf} בקשות שממתינות)` : ""),
        });
      }
    }

    const dup = all.find((r) =>
      r.studentId === session.itemId && r.date === date && r.status === REQ_STATUS.pending);
    if (dup) return res.status(409).json({ error: "כבר קיימת בקשה שממתינה להחלטה לתאריך הזה" });

    const cols = {
      [R.student]: { item_ids: [Number(session.itemId)] },
      [R.type]: { label: type },
      [R.date]: { date },
      [R.status]: { label: REQ_STATUS.pending },
    };
    if (detail) cols[R.detail] = detail;

    const d = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.requests, n: `${student.name} · ${type} · ${date}`, v: JSON.stringify(cols) }
    );
    invalidateRequests();

    res.status(200).json({ ok: true, id: String(d.create_item.id), status: REQ_STATUS.pending });
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
