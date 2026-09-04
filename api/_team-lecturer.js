/* ============================================================
   /api/students?action=team-lecturer — מרצים של סדרה או ועדה

     POST   { team, name, topic, field, phone, opinion, lessonDate }
     PUT    { id, … }
     DELETE { id }
     PUT    { team, summary }        סיכום הסדרה

   ------------------------------------------------------------
   ⚠ **אותו לוח חוות דעת של המרצים, לא לוח שני.** מרצה שהגיע
     לסדרה הוא אותו מרצה שיכול להגיע גם לשיעור רגיל, ושני
     לוחות היו מייצרים שתי היסטוריות על אותו אדם — ואז השאלה
     "האם כבר עבדנו איתו" מקבלת שתי תשובות.

     מה שמבדיל הוא **עמודת השיוך**: חוות דעת של סדרה נושאת את
     מזהה הסדרה, ומופיעה גם בסדרה וגם ברשימה הכללית.

   ⚠⚠ **מי כותב: חברי הסדרה, לא רק היו״ר.** בקשה מפורשת של
     המכינה — "יש לזה גישה לכל חברי הסדרה". `mayTeam` הוא
     שקובע, בדיוק כמו במשימות (4נ).

   ⚠ **מחיקה — רק של מי שכתב, או של היו״ר והמדריך.** חוות דעת
     היא טקסט שאדם כתב, ולא שורה אנונימית.

   ⚠ **404 ולא 403 על מזהה של צוות אחר** — 403 מאשר שהשורה
     קיימת (4נ).
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { gql } from "./_monday.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { LESSON_BOARDS, LESSON_COLS, CYCLE } from "../shared/lessons-boards.js";
import { PLACEMENT_BOARDS, PLACEMENT_COLS } from "../shared/placements-ids.js";
import { loadEvals, invalidateEvals } from "./_lessons-data.js";
import { teamContext } from "./_team-data.js";
import { mayTeam } from "../shared/team.js";
import { invalidate } from "./_cache.js";

const E = LESSON_COLS.evals;
const D = PLACEMENT_COLS.definitions;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

const israelDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

async function handler(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));

    /* ---------- סיכום הסדרה ---------- */
    if (req.method === "PUT" && body?.summary !== undefined && !body?.id) {
      const teamId = clip(body?.team, 40);
      if (!teamId) return res.status(400).json({ error: "לא צוין צוות" });
      const ctx = await teamContext(teamId);
      if (!ctx) return res.status(404).json({ error: "הצוות אינו נמצא" });
      const perm = mayTeam(session, ctx);
      /* ⚠ **כל חברי הסדרה** ולא רק היו״ר — הסיכום הוא של
         הסדרה, וסיכום שרק אחד יכול לגעת בו אינו סיכום שלה. */
      if (!perm.write) return res.status(403).json({ error: "הצוות הזה אינו שלך" });

      await setColumns(PLACEMENT_BOARDS.definitions, teamId, {
        [D.summary]: clip(body.summary, 6000),
        [D.summaryBy]: actorName(session).slice(0, 120),
      });
      invalidate("placement-defs");
      return res.status(200).json({ ok: true, team: teamId });
    }

    /* ---------- חוות דעת ---------- */
    if (req.method === "POST") {
      const teamId = clip(body?.team, 40);
      if (!teamId) return res.status(400).json({ error: "לא צוין צוות" });
      const ctx = await teamContext(teamId);
      if (!ctx) return res.status(404).json({ error: "הצוות אינו נמצא" });
      const perm = mayTeam(session, ctx);
      if (!perm.write) return res.status(403).json({ error: "הצוות הזה אינו שלך" });

      const name = clip(body?.name, 200);
      if (!name) return res.status(400).json({ error: "לא הוזן שם המרצה" });

      const cols = {
        [E.placement]: ctx.def.id,
        [E.placementName]: ctx.def.name,
        [E.cycle]: { label: CYCLE.second },
        [E.by]: actorName(session).slice(0, 120),
        [E.at]: { date: israelDate() },
      };
      const bad = fill(cols, body, res);
      if (bad) return;

      const id = await createItem(LESSON_BOARDS.evals, name, cols, { labels: true });
      invalidateEvals();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = clip(body?.id, 40);
    if (!id) return res.status(400).json({ error: "לא צוינה חוות דעת" });
    const row = (await loadEvals()).find((x) => x.id === id);
    /* ⚠ 404 גם על חוות דעת שאינה של סדרה — היא אינה שייכת
       למסלול הזה, ו-403 היה מאשר שהיא קיימת. */
    if (!row || !row.placement) return res.status(404).json({ error: "חוות הדעת אינה נמצאת" });

    const ctx = await teamContext(row.placement);
    if (!ctx) return res.status(404).json({ error: "חוות הדעת אינה נמצאת" });
    const perm = mayTeam(session, ctx);
    if (!perm.read) return res.status(404).json({ error: "חוות הדעת אינה נמצאת" });

    /* ⚠ **מי שכתב, או היו״ר והמדריך.** חוות דעת היא טקסט
       שאדם כתב, ולא שורה אנונימית שכל אחד מוחק. */
    const isMine = String(row.by || "") === actorName(session);
    if (!isMine && !perm.manage) {
      return res.status(403).json({
        error: `"${row.name}" נכתבה על ידי ${row.by || "מישהו אחר"}. עריכה ומחיקה הן של הכותב או של יו״ר הצוות`,
      });
    }

    if (req.method === "DELETE") {
      await deleteItem(id);
      invalidateEvals();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const cols = {};
      const bad = fill(cols, body, res);
      if (bad) return;
      if (Object.keys(cols).length) await setColumns(LESSON_BOARDS.evals, id, cols);
      if (body.name !== undefined) {
        const name = clip(body.name, 200);
        if (!name) return res.status(400).json({ error: "שם המרצה ריק" });
        await renameItem(LESSON_BOARDS.evals, id, name);
      }
      invalidateEvals();
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[team-lecturer]", e);
    res.status(502).json({ error: "פעולת המרצים נכשלה" });
  }
}

/**
 * שדות אופציונליים → עמודות.
 * ⚠ מיפוי מפורש ולא פריסה (4ש). מחזירה true אם נשלחה שגיאה.
 */
function fill(cols, body, res) {
  if (body.topic !== undefined) cols[E.topic] = clip(body.topic, 200);
  if (body.phone !== undefined) cols[E.phone] = clip(body.phone, 40);
  if (body.opinion !== undefined) cols[E.opinion] = clip(body.opinion, 2000);
  /* ⚠ תחום חדש מותר להיווצר כאן, כמו במסלול הרגיל של חוות
     הדעת: המכינה מוסיפה תחומים לאורך השנה. */
  if (body.field !== undefined && body.field) cols[E.field] = { label: clip(body.field, 80) };
  if (body.lessonDate !== undefined) {
    const d = clip(body.lessonDate, 10);
    if (!d) cols[E.lessonDate] = "";
    else if (!DATE_RE.test(d)) {
      res.status(400).json({ error: "תאריך השיעור חייב להיות בפורמט YYYY-MM-DD" });
      return true;
    } else cols[E.lessonDate] = { date: d };
  }
  return false;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` — חברי הסדרה הם חניכים. ההרשאה
   האמיתית היא `mayTeam`, שהיא איחוד ולא AND (4נ). */
export default withAuth(handler, { student: true });
