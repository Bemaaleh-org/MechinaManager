/* ============================================================
   GET /api/lessons?action=list

   כל גיליונות השיעור עם הספירה של כל אחד.

   ⚠ צוות או אחראי לו״ז. חניך רגיל אינו רואה את המסך הזה —
     ההרשאה נאכפת ב-withAuth ולא בתצוגה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { loadSheets, loadMeetings, countFor } from "./_lessons-data.js";
import { mayEdit } from "../shared/edit-rights.js";

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  try {
    const [sheets, meetings] = await Promise.all([loadSheets(), loadMeetings()]);

    const list = sheets.map((s) => ({ ...s, counts: countFor(s.id, meetings) }));

    /* סיכום כללי — אותם מספרים שבדאשבורד שבקובץ המקור */
    const totals = list.reduce((a, s) => ({
      total: a.total + s.counts.total,
      planned: a.planned + s.counts.planned,
      cancelled: a.cancelled + s.counts.cancelled,
      happened: a.happened + s.counts.happened,
      pending: a.pending + s.counts.pending,
    }), { total: 0, planned: 0, cancelled: 0, happened: 0, pending: 0 });

    res.status(200).json({
      sheets: list,
      count: list.length,
      totals,
      canEdit: mayEdit(session, "scheduler"),
    });
  } catch (e) {
    console.error("[lessons-list]", e);
    res.status(502).json({ error: "שליפת גיליונות השיעור נכשלה" });
  }
}

export default withAuth(handler, { scheduler: true, edit: "scheduler" });
