/* ============================================================
   GET  /api/students?action=profile[&student=<id>]
   POST /api/students?action=profile

   הפרופיל האישי. מי ממלא מה:
     שיבוץ צבאי, מיונים לצבא — החניך ממלא, הצוות רואה.
     שיחה אישית (3 תאריכים)  — הצוות קובע, החניך רואה.

   ⚠ חניך רואה ועורך את שלו בלבד. מנהל מעביר ?student= וקובע
     את תאריכי השיחות. הבדיקות בשרת — לא בתצוגה.

   ⚠ אירועים חריגים אינם כאן בכוונה — יש להם נקודת קצה נפרדת
     שכולה מנהל בלבד, כדי שטעות בקוד תצוגה לעולם לא תדליף
     השעיה לחניך.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { studentRows } from "./_student-rows.js";
import { invalidate } from "./_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";

const C = MECHINA_COLS.roster;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res, session) {
  if (req.method === "GET") return read(req, res, session);
  if (req.method === "POST") return write(req, res, session);
  return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
}

async function resolveTarget(req, session, res) {
  const asked = req.query?.student ? String(req.query.student) : null;
  if (asked && asked !== session.itemId && !session.isManager) {
    res.status(403).json({ error: "אפשר לצפות בפרופיל שלך בלבד" });
    return null;
  }
  const id = asked || session.itemId;
  if (!id) { res.status(400).json({ error: "לא צוין חניך" }); return null; }
  const student = (await studentRows()).find((r) => r.id === id);
  if (!student) { res.status(404).json({ error: "החניך אינו נמצא" }); return null; }
  return student;
}

async function read(req, res, session) {
  try {
    const student = await resolveTarget(req, session, res);
    if (!student) return;
    res.status(200).json({
      id: student.id,
      name: student.name,
      army: student.profile.army,
      tryouts: student.profile.tryouts,
      talks: student.profile.talks,
      canEditArmy: !session.isManager, // החניך ממלא
      canEditTalks: session.isManager, // הצוות קובע
    });
  } catch (e) {
    console.error("[student-profile:read]", e);
    res.status(502).json({ error: "שליפת הפרופיל נכשלה" });
  }
}

async function write(req, res, session) {
  try {
    const student = await resolveTarget(req, session, res);
    if (!student) return;

    const body = req.body ?? (await readJson(req));
    const cols = {};

    if (body.army !== undefined || body.tryouts !== undefined) {
      /* ⚠ שדות החניך. מנהל אינו כותב אותם — הם עדות של החניך
         עצמו, ועריכת צוות הייתה מטשטשת מי אמר מה. */
      if (session.isManager) {
        return res.status(403).json({ error: "שיבוץ ומיונים ממולאים על ידי החניך" });
      }
      if (body.army !== undefined) cols[C.army] = String(body.army).trim().slice(0, 250);
      if (body.tryouts !== undefined) cols[C.tryouts] = String(body.tryouts).trim().slice(0, 250);
    }

    if (body.talks !== undefined) {
      /* ⚠ תאריכי השיחה האישית — הצוות בלבד */
      if (!session.isManager) {
        return res.status(403).json({ error: "תאריכי השיחה נקבעים על ידי הצוות" });
      }
      if (!Array.isArray(body.talks) || body.talks.length !== 3) {
        return res.status(400).json({ error: "נדרשים שלושה תאריכים (או ריק)" });
      }
      const talkCols = [C.talk1, C.talk2, C.talk3];
      body.talks.forEach((t, i) => {
        if (t && !DATE_RE.test(String(t))) throw Object.assign(new Error("תאריך לא תקין"), { code: 400 });
        cols[talkCols[i]] = t ? { date: String(t) } : {};
      });
    }

    if (!Object.keys(cols).length) {
      return res.status(400).json({ error: "לא נשלח שדה לעדכון" });
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.roster, i: student.id, v: JSON.stringify(cols) }
    );
    invalidate("student-rows");

    res.status(200).json({ ok: true, id: student.id });
  } catch (e) {
    if (e.code === 400) return res.status(400).json({ error: e.message });
    console.error("[student-profile:write]", e);
    res.status(502).json({ error: "עדכון הפרופיל נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
