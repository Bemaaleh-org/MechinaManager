/* ============================================================
   /api/students?action=project-task     משימות בפרויקט
   /api/students?action=project-money    תנועות תקציב בפרויקט

     POST   { project, title, … }   הוספה
     PUT    { id, … }               עריכה
     DELETE { id }                  מחיקה

   ------------------------------------------------------------
   ⚠⚠ **הצוות חסום כאן בדיוק כמו ב-`_projects.js`.** ראו ההערה
     בראשו: זו נקודת הקצה השנייה במערכת שבה `isManager` אינו
     מרחיב גישה אלא מבטל אותה.

   ⚠ **השייכות נבדקת דרך הפרויקט ולא דרך השורה.** שורת משימה
     נושאת מזהה פרויקט, והשאלה היחידה היא האם החניך שייך לאותו
     פרויקט. בדיקה על השורה עצמה הייתה מחייבת עמודת בעלים
     שנייה שיכולה לסתור את הראשונה.

   ⚠ **404 ולא 403** על משימה של פרויקט שאינו שלו — 403 מאשר
     שהשורה קיימת (4מה).

   ⚠ **שני מסלולים בקובץ אחד, ולא שניים.** הם חולקים את בדיקת
     השייכות ואת הניקוי, ופיצול היה מייצר שתי גרסאות שלה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { assignableStudents } from "./_student-rows.js";
import {
  PROJECT_BOARDS as B, PROJECT_COLS as C, MONEY_KIND, projectsReady,
} from "../shared/projects-ids.js";
import { loadProjects, loadProjectTasks, loadProjectMoney } from "./_projects.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const invalidateAll = () => {
  invalidate("projects"); invalidate("project-tasks"); invalidate("project-money");
};

const mine = (p, id) =>
  String(p.owner) === String(id) || p.partners.map(String).includes(String(id));

/** הפרויקט, אם החניך שייך אליו. אחרת null. */
async function projectOf(projectId, me) {
  const p = (await loadProjects()).find((x) => x.id === String(projectId));
  return p && mine(p, me) ? p : null;
}

function makeHandler(kind) {
  const isTask = kind === "task";
  const board = isTask ? B.tasks : B.budget;
  const cols = isTask ? C.tasks : C.budget;
  const load = isTask ? loadProjectTasks : loadProjectMoney;
  const what = isTask ? "המשימה" : "התנועה";

  /** שדות → עמודות. מיפוי מפורש. מחזיר true אם נשלחה שגיאה. */
  async function fill(out, body, me, res) {
    if (isTask) {
      if (body.done !== undefined) out[cols.done] = { checked: body.done ? "true" : "false" };
      if (body.owner !== undefined) {
        const id = String(body.owner || "").trim();
        if (!id) out[cols.owner] = "";
        else {
          /* ⚠ **באחריות מי — מאומת בשרת.** מזהה שרירותי היה
             מייצר שיוך לאדם שאינו בפרויקט. */
          const known = new Set((await assignableStudents()).map((s) => String(s.id)));
          if (!known.has(id)) { res.status(400).json({ error: "חניך לא מוכר" }); return true; }
          out[cols.owner] = id;
        }
      }
    } else {
      if (body.kind !== undefined) {
        const v = String(body.kind || "").trim();
        if (!MONEY_KIND.includes(v)) {
          res.status(400).json({ error: `"${v}" אינו סוג תנועה מוכר` }); return true;
        }
        out[cols.kind] = { label: v };
      }
      if (body.amount !== undefined) {
        const raw = String(body.amount ?? "").trim();
        /* ⚠ ריק אינו אפס. תנועה בלי סכום מדווחת בסיכום ואינה
           מושמטת — היא המקום שבו המספר מפסיק להתאים למציאות. */
        if (!raw) out[cols.amount] = "";
        else {
          const n = Number(raw);
          if (!Number.isFinite(n) || n < 0 || n > 10000000) {
            res.status(400).json({ error: "סכום לא תקין" }); return true;
          }
          out[cols.amount] = String(Math.round(n * 100) / 100);
        }
      }
    }
    const dateCol = isTask ? cols.due : cols.date;
    const dateKey = isTask ? "due" : "date";
    if (body[dateKey] !== undefined) {
      const d = String(body[dateKey] || "").trim();
      if (!d) out[dateCol] = "";
      else if (!DATE_RE.test(d)) { res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" }); return true; }
      else out[dateCol] = { date: d };
    }
    if (body.note !== undefined) out[cols.note] = String(body.note || "").trim().slice(0, 2000);
    return false;
  }

  return async function handler(req, res, session) {
    if (!projectsReady()) {
      return res.status(503).json({ error: "לוחות הפרויקטים טרם הוקמו", setupRequired: true });
    }
    /* ⚠⚠ אותה שורה בדיוק כמו ב-_projects.js. */
    if (!session.isStudent) {
      return res.status(403).json({
        error: "הפרויקטים שייכים לחניכים. הצוות אינו רואה אותם — גם לא ראש המכינה.",
      });
    }

    const me = String(session.itemId);
    const body = req.body ?? (await readJson(req));

    try {
      if (req.method === "POST") {
        const p = await projectOf(body?.project, me);
        if (!p) return res.status(404).json({ error: "הפרויקט אינו נמצא" });
        const title = String(body?.title || "").trim().slice(0, 200);
        if (!title) return res.status(400).json({ error: `לא הוזן שם ${what}` });

        const out = { [cols.project]: p.id };
        if (await fill(out, body, me, res)) return;
        if (!isTask && !out[cols.kind]) out[cols.kind] = { label: MONEY_KIND[0] };

        const id = await createItem(board, title, out);
        invalidateAll();
        return res.status(200).json({ ok: true, id: String(id) });
      }

      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: `לא צוינה ${what}` });
      const row = (await load()).find((x) => x.id === id);
      /* ⚠ 404 גם כשהשורה קיימת אך אינה בפרויקט שלו. */
      if (!row || !(await projectOf(row.project, me))) {
        return res.status(404).json({ error: `${what} אינה נמצאת` });
      }

      if (req.method === "PUT") {
        const out = {};
        if (await fill(out, body, me, res)) return;
        if (Object.keys(out).length) await setColumns(board, id, out);
        if (body.title !== undefined) {
          const title = String(body.title).trim().slice(0, 200);
          if (!title) return res.status(400).json({ error: "השם ריק" });
          await renameItem(board, id, title);
        }
        invalidateAll();
        return res.status(200).json({ ok: true, id });
      }

      if (req.method === "DELETE") {
        await deleteItem(id);
        invalidateAll();
        return res.status(200).json({ ok: true, id });
      }

      return res.status(405).json({ error: "מתודה לא נתמכת" });
    } catch (e) {
      console.error("[project-" + kind + "]", e);
      res.status(502).json({ error: "הפעולה נכשלה" });
    }
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export const projectTask = withAuth(makeHandler("task"), { student: true });
export const projectMoney = withAuth(makeHandler("money"), { student: true });
