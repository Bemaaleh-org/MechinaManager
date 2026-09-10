/* ============================================================
   GET /api/lessons?action=list

   כל גיליונות השיעור עם הספירה של כל אחד.

   ⚠ צוות · אחראי הלו״ז · **ועדת קבוצה ותוכן**. חניך רגיל אינו
     רואה את המסך הזה. ⚠ והשער עבר מ-`withAuth` ל-`lessonRights`
     כי השאלה היא איחוד ודגלי `withAuth` הם AND — ראו
     `api/_lesson-rights.js`.
   ============================================================ */

import { withAuth } from "./_session.js";
import { loadSheets, loadMeetings, countFor } from "./_lessons-data.js";
import { lessonRights } from "./_lesson-rights.js";

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  const rights = await lessonRights(session);
  if (!rights.read) return res.status(403).json({ error: rights.readHint });

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
      canEdit: rights.write,
      editHint: rights.write ? null : rights.hint,
    });
  } catch (e) {
    console.error("[lessons-list]", e);
    res.status(502).json({ error: "שליפת גיליונות השיעור נכשלה" });
  }
}

/* ⚠ `{student:true}` הוא השער, וההכרעה ב-`lessonRights` — חבר
   ועדת קבוצה ותוכן הוא חניך, ו-`{scheduler:true}` היה חוסם אותו
   לפני שהמודול נשאל בכלל (4כב). */
export default withAuth(handler, { student: true });
