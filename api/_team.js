/* ============================================================
   /api/students?action=team
     GET  ?id=<placementId>   כל מסך הצוות בקריאה אחת
     GET  (בלי id)            הצוותים שאני רשאי להיכנס אליהם

   ⚠ **קריאה אחת ולא ארבע.** מסך שנפתח בארבע בקשות מציג ארבעה
     שלבי טעינה ונשבר בארבע דרכים; זה גם מה שנעשה ב-`?action=duty`.

   ⚠ **המונים נגזרים בכל קריאה** ואינם נשמרים. סטטוס שמישהו
     יסמן בלוח כ"סוגר" משנה את אחוז ההתקדמות של כל הצוותים
     מיד ולמפרע — עיקרון 1 ו-4כו.

   ⚠ **`warnings` הוא חלק מהתשובה ולא לוג.** אוצר מילים בלי
     אף סטטוס סוגר, `kind` לא-מוכר, סטטוס שאינו נפתר — כולם
     דברים שהמסך חייב לומר. עיקרון 6: מצב שבור נראה אחרת
     ממצב ריק.
   ============================================================ */

import { withAuth } from "./_session.js";
import { placementsReady } from "../shared/placements.js";
import {
  teamsReady, loadVocab, loadTeamTasks, teamContext, teamsForStudent,
  closingIds, israelToday,
} from "./_team-data.js";
import { loadDefinitions } from "./_placements.js";
import { mayTeam, mayEditTask, progressOf, isLate, isTeamCategory } from "../shared/team.js";

/* ⚠ מיפוי מפורש ולא השמטה: עמודה חדשה בלוח לא תדלוף מעצמה */
const toTask = (t, closing, today) => ({
  id: t.id, title: t.title,
  owner: t.owner, ownerName: t.ownerName,
  status: t.status, statusName: t.statusName,
  stage: t.stage, stageName: t.stageName,
  due: t.due, note: t.note, link: t.link,
  by: t.by, byId: t.byId, at: t.at, upBy: t.upBy, upAt: t.upAt,
  done: closing.has(String(t.status)),
  late: isLate(t, closing, today),
});

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "רק GET נתמך כאן" });
  if (!placementsReady()) {
    return res.status(503).json({ error: "לוחות השיבוצים טרם הוקמו ב-monday", setupRequired: true });
  }
  if (!teamsReady()) {
    return res.status(503).json({ error: "לוחות ניהול הצוותים טרם הוקמו ב-monday", setupRequired: true });
  }

  try {
    const id = String(req.query?.id || "").trim();

    /* ---------- הרשימה: לאן מותר לי להיכנס ---------- */
    if (!id) {
      const defs = (await loadDefinitions()).filter((d) => isTeamCategory(d.category));
      const tasks = await loadTeamTasks();
      const vocab = await loadVocab();
      const closing = closingIds(vocab);
      const today = israelToday();

      const mine = session.isStudent
        ? new Set((await teamsForStudent(session.itemId)).map((t) => t.id))
        : null;

      const out = [];
      for (const d of defs) {
        /* ⚠ מוארכב מוסתר מהרשימה ונשאר נגיש בכניסה ישירה —
           קישור שנשלח בוואטסאפ לא אמור להישבר בגלל ארכוב. */
        if (d.archived) continue;
        if (mine && !mine.has(d.id)) continue;
        const mineTasks = tasks.filter((t) => t.team === d.id);
        out.push({
          id: d.id, name: d.name, category: d.category,
          chair: d.chair, chairName: d.chairName, lead: d.lead,
          progress: progressOf(mineTasks, closing),
          late: mineTasks.filter((t) => isLate(t, closing, today)).length,
          isChair: session.isStudent && d.chair === String(session.itemId),
        });
      }
      return res.status(200).json({
        teams: out.sort((a, b) => a.name.localeCompare(b.name, "he")),
        canManage: !session.isStudent,
      });
    }

    /* ---------- צוות אחד ---------- */
    const ctx = await teamContext(id);
    if (!ctx) return res.status(404).json({ error: "הצוות אינו נמצא" });
    if (ctx.unsupported) {
      return res.status(400).json({
        error: `ניהול משימות קיים לוועדה ולסדרה, ו"${ctx.def.name}" הוא ${ctx.def.category}`,
      });
    }

    const perm = mayTeam(session, ctx);
    if (!perm.read) {
      /* ⚠ 403 ולא 404: הוועדה עצמה אינה סוד — היא מופיעה
         בפרופיל של כל מי שמשובץ אליה. מה שסודי הוא התוכן. */
      return res.status(403).json({ error: "הצוות הזה אינו שלך" });
    }

    const [vocab, all] = await Promise.all([loadVocab(), loadTeamTasks()]);
    const closing = closingIds(vocab);
    const today = israelToday();
    const rows = all.filter((t) => t.team === ctx.def.id);

    /* ⚠ סטטוס שאינו נפתר — מדווח ולא נעלם, ונספר כפתוח */
    const known = new Set([...vocab.statuses, ...vocab.stages].map((v) => v.id));
    const orphan = rows.filter((t) => t.status && !known.has(String(t.status)));

    const warnings = [];
    if (closing.size === 0) {
      warnings.push('אין אף סטטוס שמסומן "נחשב סגור" בלוח אוצר המילים, ולכן אי אפשר לחשב התקדמות');
    }
    if (vocab.unknown.length) {
      warnings.push(`${vocab.unknown.length} שורות באוצר המילים בלי סוג מוכר: ${vocab.unknown.map((u) => u.name).join(" · ")}`);
    }
    if (orphan.length) {
      warnings.push(`${orphan.length} משימות נושאות סטטוס שכבר אינו קיים, והן נספרות כפתוחות`);
    }
    const dead = ctx.members.filter((m) => !m.active);
    if (dead.length && perm.manage) {
      warnings.push(`בצוות ${dead.length} משובצים שאינם פעילים: ${dead.map((m) => m.name).join(" · ")}`);
    }
    /* ⚠ ועדה בלי משובצים — הבורר "באחריות" ריק, וזה נראה כמו
       תקלה. האמירה המפורשת שולחת למסך שבו מתקנים את זה, ולא
       משאירה את המנהל להסיק. */
    if (!ctx.members.length) {
      warnings.push(perm.manage
        ? 'אין חניכים משובצים לצוות הזה, ולכן אי אפשר עדיין לשייך משימות. השיבוץ נעשה במסך "שיבוצי חניכים"'
        : "אין חניכים משובצים לצוות הזה");
    }

    const tasks = rows.map((t) => ({
      ...toTask(t, closing, today),
      mayEdit: mayEditTask(perm, t, session.itemId),
    }));

    /* פירוט לפי אדם — התכלית של הלוח הזה */
    const byOwner = ctx.members.map((m) => {
      const his = rows.filter((t) => t.owner === m.id);
      return { ...m, ...progressOf(his, closing), late: his.filter((t) => isLate(t, closing, today)).length };
    });
    const unassigned = rows.filter((t) => !t.owner);

    return res.status(200).json({
      team: {
        id: ctx.def.id, name: ctx.def.name, category: ctx.def.category,
        period: ctx.def.period, capacity: ctx.def.capacity,
        desc: ctx.def.desc, hours: ctx.def.hours,
        lead: ctx.def.lead, chair: ctx.def.chair, chairName: ctx.def.chairName,
        archived: ctx.def.archived,
      },
      me: { id: String(session.itemId || ""), ...perm },
      members: ctx.members,
      vocab: {
        /* מארכב מוסתר מהבורר ונשאר נפתר לתצוגה */
        statuses: vocab.statuses.map((s) => ({ id: s.id, name: s.name, closes: s.closes, archived: s.archived })),
        stages: vocab.stages.map((s) => ({ id: s.id, name: s.name, archived: s.archived })),
        closing: [...closing],
      },
      tasks: tasks.sort((a, b) =>
        (a.done === b.done ? 0 : a.done ? 1 : -1)
        || (a.due || "9999").localeCompare(b.due || "9999")
        /* ⚠ `at` כאן הוא ISO מלא ולא תאריך בלבד — הוא שובר
           השוויון, ולכן אסור למיין איתו רשימה מעורבת עם הלוח
           האישי, ששם `at` הוא תאריך בלבד. */
        || String(a.at || "").localeCompare(String(b.at || ""))),
      counts: {
        ...progressOf(rows, closing),
        late: rows.filter((t) => isLate(t, closing, today)).length,
        unassigned: unassigned.length,
      },
      byOwner,
      warnings,
    });
  } catch (e) {
    console.error("[team]", e);
    res.status(502).json({ error: "טעינת הצוות נכשלה" });
  }
}

export default withAuth(handler, { student: true });
