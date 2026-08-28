/* ============================================================
   /api/students?action=team-task
     POST   { teamId, title, owner?, status?, stage?, due?, note?, link? }
     PUT    { id, ... }        עדכון חלקי
     DELETE { id }             מחיקה

   ⚠⚠ **הלוח הזה משותף, ולוח המשימות האישיות אינו.**
     `api/_duty-tasks.js` נשאר כפי שהוא: הוא דוחה כל סשן צוות
     ומחזיר לחניך את שלו בלבד (4מה). כאן `mayTeam` מרשה לצוות,
     ליו״ר ולחברי הצוות — כי משימת ועדה היא משימה של ועדה.

     שתי נקודות קצה, שתי תשובות, ואף פונקציה שמחזירה את שתיהן.

   ⚠ **`owner` אינו הכותב, לראשונה במאגר.** בלוח האישי הבעלים
     הוא תמיד `session.itemId` ואין מה לאמת. כאן משייכים לאדם
     אחר, ולכן **אימות כפול**: החניך פעיל (`activeStudents`)
     **וגם** משובץ לצוות הזה (`membersOf`). אימות אחד בלבד
     משאיר משימה משויכת למי שאינו בצוות, או למזהה שרירותי.
   ============================================================ */

import { withAuth } from "./_session.js";
import { placementsReady } from "../shared/placements.js";
import { TEAM_BOARDS, TEAM_COLS } from "../shared/team-ids.js";
import {
  teamsReady, loadVocab, loadTeamTasks, teamContext, invalidateTeams,
  createItem, setColumns, deleteItem, renameItem,
} from "./_team-data.js";
import { mayTeam, mayEditTask } from "../shared/team.js";

const T = TEAM_COLS.tasks;
const MAX = { title: 200, note: 4000, link: 500 };

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

/** מזהה מאוצר המילים אל { id, name }, או null */
function resolve(list, id) {
  if (id === null || id === "") return { id: "", name: "" };
  const hit = list.find((v) => v.id === String(id));
  return hit ? { id: hit.id, name: hit.name } : null;
}

async function handler(req, res, session) {
  if (!placementsReady() || !teamsReady()) {
    return res.status(503).json({
      error: "לוחות ניהול הצוותים טרם הוקמו ב-monday", setupRequired: true,
    });
  }
  const body = req.body ?? (await readJson(req));
  const stamp = new Date().toISOString();
  const who = String(session.name || "");
  const meId = String(session.itemId || "");

  try {
    /* ============ יצירה ============ */
    if (req.method === "POST") {
      const teamId = String(body?.teamId || "").trim();
      const ctx = await teamContext(teamId);
      if (!ctx || ctx.unsupported) return res.status(404).json({ error: "הצוות אינו נמצא" });
      const perm = mayTeam(session, ctx);
      if (!perm.write) return res.status(403).json({ error: "הצוות הזה אינו שלך" });

      const title = clip(body?.title, MAX.title);
      if (!title) return res.status(400).json({ error: "אין משימה בלי כותרת" });

      const fields = await build(body, ctx, perm, meId, res);
      if (!fields) return;   /* build כבר ענה */

      const created = await createItem(TEAM_BOARDS.tasks, title, {
        [T.team]: ctx.def.id, [T.teamName]: ctx.def.name,
        ...fields,
        [T.by]: who, [T.byId]: meId, [T.at]: stamp,
      });
      invalidateTeams();
      return res.status(200).json({ ok: true, id: created });
    }

    /* ============ עדכון ============ */
    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      const task = (await loadTeamTasks()).find((t) => t.id === id);
      /* ⚠ 404 ולא 403 גם כאן: 403 מאשר שהשורה קיימת. */
      if (!task) return res.status(404).json({ error: "המשימה אינה נמצאת" });

      const ctx = await teamContext(task.team);
      if (!ctx || ctx.unsupported) return res.status(404).json({ error: "המשימה אינה נמצאת" });
      const perm = mayTeam(session, ctx);
      /* ⚠ **404 למי שאינו בצוות כלל, ו-403 רק למי שכן.**
         403 על מזהה משימה מאשר שהשורה קיימת — וזו בדיוק
         ההבחנה של 4מה. הוועדה עצמה אינה סוד (`?action=team`
         מחזיר עליה 403 ואומר "אינו שלך"), אבל מה יש בתוכה כן.
         הבדיקה תפסה כאן 403 במקום 404. */
      if (!perm.read) return res.status(404).json({ error: "המשימה אינה נמצאת" });
      if (!mayEditTask(perm, task, meId)) {
        return res.status(403).json({
          error: "אפשר לשנות משימה שלך או שיצרת. ליו״ר ולמדריך המלווה יש גישה מלאה",
        });
      }

      if (body?.title !== undefined) {
        const title = clip(body.title, MAX.title);
        if (!title) return res.status(400).json({ error: "אין משימה בלי כותרת" });
        await renameItem(id, title);
      }
      const patch = await build(body, ctx, perm, meId, res, task);
      if (!patch) return;

      if (Object.keys(patch).length) {
        await setColumns(TEAM_BOARDS.tasks, id, {
          ...patch, [T.upBy]: who, [T.upAt]: stamp,
        });
      }
      invalidateTeams();
      return res.status(200).json({ ok: true, id });
    }

    /* ============ מחיקה ============ */
    if (req.method === "DELETE") {
      const id = String(body?.id || req.query?.id || "").trim();
      const task = (await loadTeamTasks()).find((t) => t.id === id);
      if (!task) return res.status(404).json({ error: "המשימה אינה נמצאת" });
      const ctx = await teamContext(task.team);
      const perm = mayTeam(session, ctx || {});
      /* ⚠ אותו כלל כמו ב-PUT: מי שאינו בצוות מקבל 404. */
      if (!perm.read) return res.status(404).json({ error: "המשימה אינה נמצאת" });
      /* ⚠ מחיקה היא manage ולא write. חבר צוות שיטעה ימחק את
         המשימה ולא יוכל להחזיר אותה; שינוי סטטוס ל"בוטלה"
         משאיר עקבות. מי שיצר את המשימה כן מוחק אותה. */
      if (!perm.manage && String(task.byId || "") !== meId) {
        return res.status(403).json({
          error: "מחיקה נעשית על ידי היו״ר, המדריך המלווה או מי שיצר את המשימה",
        });
      }
      await deleteItem(id);
      invalidateTeams();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "רק POST, PUT ו-DELETE נתמכים כאן" });
  } catch (e) {
    console.error("[team-task]", e);
    res.status(502).json({ error: "שמירת המשימה נכשלה" });
  }
}

/* ============================================================
   השדות המשותפים ליצירה ולעדכון
   ------------------------------------------------------------
   מחזיר null **אחרי** שכבר ענה 400 — כדי שהוולידציה תהיה
   כתובה פעם אחת ולא בשתי גרסאות שנפרדות בתיקון הראשון.
   ============================================================ */
async function build(body, ctx, perm, meId, res, existing = null) {
  const vocab = await loadVocab();
  const out = {};

  if (body?.owner !== undefined) {
    const owner = String(body.owner ?? "").trim();
    if (owner === "") {
      /* ⚠ ריק הוא "טרם שויכה" ולא שגיאה — יו״ר פותח רשימה
         ואז מחלק, וזה הסדר הטבעי. */
      out[T.owner] = ""; out[T.ownerName] = "";
    } else {
      /* ⚠ חבר צוות אינו משייך לאחרים. אחרת "המשימות שלי"
         הופכות לכלי להטלת מטלות בין חניכים. */
      if (!perm.manage && owner !== meId) {
        res.status(403).json({
          error: "שיוך משימה לחניך אחר נעשה על ידי היו״ר או המדריך המלווה",
        });
        return null;
      }
      const m = ctx.members.find((x) => x.id === owner);
      if (!m) {
        res.status(400).json({ error: "אפשר לשייך משימה רק למי שמשובץ לצוות הזה" });
        return null;
      }
      if (!m.active) {
        res.status(400).json({ error: m.name + " אינו פעיל במכינה" });
        return null;
      }
      out[T.owner] = m.id; out[T.ownerName] = m.name;
    }
  }

  for (const [field, list, idCol, nameCol, label] of [
    ["status", vocab.statuses, T.status, T.statusName, "סטטוס"],
    ["stage", vocab.stages, T.stage, T.stageName, "שלב"],
  ]) {
    if (body?.[field] === undefined) continue;
    const v = resolve(list, body[field]);
    if (!v) {
      res.status(400).json({
        error: "הערך שנבחר אינו קיים באוצר המילים (" + label + ")",
      });
      return null;
    }
    out[idCol] = v.id; out[nameCol] = v.name;
  }

  if (body?.due !== undefined) {
    const due = String(body.due ?? "").trim();
    if (due && !isDate(due)) {
      res.status(400).json({ error: "תאריך יעד בפורמט YYYY-MM-DD" });
      return null;
    }
    out[T.due] = due ? { date: due } : {};
  }
  if (body?.note !== undefined) out[T.note] = clip(body.note, MAX.note);
  if (body?.link !== undefined) out[T.link] = clip(body.link, MAX.link);

  /* ברירת מחדל ליצירה: הסטטוס הראשון שאינו מארכב ואינו סוגר */
  if (!existing && out[T.status] === undefined) {
    const first = vocab.statuses.find((s) => !s.archived && !s.closes) || vocab.statuses[0];
    if (first) { out[T.status] = first.id; out[T.statusName] = first.name; }
  }
  return out;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

export default withAuth(handler, { student: true });
