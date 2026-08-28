/* ============================================================
   /api/students?action=duty-tasks
     GET     ?duty=<מפתח>        המשימות שלי לאחריות הזו
     POST    { duty, title, due?, note? }        משימה חדשה
     PUT     { id, done?/title?/due?/note? }     עדכון
     DELETE  { id }                              מחיקה

   ============================================================
   ⚠ **זו נקודת הקצה היחידה במאגר שבה `isManager` אינו מרחיב
     גישה.** בכל שאר המערכת מנהל רואה יותר; כאן הוא רואה בדיוק
     כלום, ולא בטעות.

     ההבטחה לחניכים היא אוטונומיה — אותה הבטחה שבגללה אין
     שדה "מי ביצע" בתורנויות (עיקרון 5). מעקב צמוד אחרי משימות
     שהחניך כתב לעצמו הוא בדיוק מה שהיא שוללת.

     לצוות יש ערוץ, ולא מראה: `api/_duty-notes.js` נותן לו
     לכתוב **החוצה**, והדבר היחיד שחוזר פנימה הוא תשובה
     שהחניך בחר לשלוח.

   ⚠ **הקורא הבא יראה בזה באג.** אל תוסיפו כאן ענף `isManager`,
     אל תוסיפו מונה, ואל תוסיפו נקודת קצה שמחזירה משימות של
     מישהו אחר. `scratchpad/duty-privacy-test.mjs` נועל את זה.

   ⚠ ומה שאי אפשר להסתיר: הלוח יושב ב-monday, ולאיש צוות עם
     גישה ללוח יש גישה אליו. אין כאן טריק שסוגר את זה. מה
     שהמערכת כן מבטיחה: היא אינה בונה כלי מעקב — אין מסך, אין
     נקודת קצה, אין מונה ואין חותמת ביצוע. עמודת הבעלים
     מחזיקה **מזהה בלבד ולא שם**, כדי שהלוח ייקרא כרשימה של
     תפקיד ולא כיומן של אדם.
   ============================================================ */

import { withAuth } from "./_session.js";
import { israelToday } from "./_attendance-data.js";
import { DUTY_BOARDS, DUTY_COLS } from "../shared/duty-ids.js";
import {
  loadTasks, invalidateTasks, dutiesForStudent,
  setColumns, renameItem, createItem, deleteItem,
} from "./_duty-data.js";
import { dutyKey } from "../shared/duties.js";

const T = DUTY_COLS.tasks;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** האחריות שהחניך באמת נושא, כמפתחות */
async function myKeys(session) {
  const ds = await dutiesForStudent(session.itemId);
  return new Set(ds.map(dutyKey));
}

async function handler(req, res, session) {
  if (!DUTY_BOARDS.tasks) {
    return res.status(503).json({
      error: "לוח המשימות טרם הוקם ב-monday", setupRequired: true,
    });
  }
  /* ⚠ חניך בלבד. לאיש צוות אין משימות אישיות, וגם אין לו
     מה לחפש כאן — ראו ההערה בראש הקובץ. */
  if (!session.isStudent) {
    return res.status(403).json({ error: "המשימות שייכות לבעלי התפקידים" });
  }

  try {
    const mine = await myKeys(session);

    if (req.method === "GET") {
      const want = String(req.query?.duty || "").trim();
      const all = await loadTasks();
      /* ⚠ הסינון לפי `owner` ולא לפי `duty` בלבד: חניך אחר
         שנושא את אותו תפקיד אינו רואה את המשימות שלי. */
      let list = all.filter((t) => t.owner === String(session.itemId));
      if (want) list = list.filter((t) => t.duty === want);
      /* ⚠ מיפוי מפורש. עמודה חדשה בלוח לא תדלוף מעצמה. */
      return res.status(200).json({
        tasks: list.map((t) => ({
          id: t.id, duty: t.duty, title: t.title,
          done: t.done, due: t.due, note: t.note, at: t.at,
        })),
        counts: {
          open: list.filter((t) => !t.done).length,
          done: list.filter((t) => t.done).length,
          /* ⚠ באיחור = יעד שעבר ולא בוצע. זה מה שמניע פעולה. */
          late: list.filter((t) => !t.done && t.due && t.due < israelToday()).length,
        },
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const duty = String(body?.duty || "").trim();
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה משימה" });
      /* ⚠ אי אפשר לכתוב משימה לאחריות שאינך נושא. בלי זה,
         חניך היה יכול לשתול משימות ברשימה של תפקיד אחר. */
      if (!mine.has(duty)) {
        return res.status(403).json({ error: "האחריות הזו אינה שלך" });
      }
      const due = datePatch(body?.due);
      if (due === false) return res.status(400).json({ error: "תאריך יעד לא תקין" });

      const id = await createItem(DUTY_BOARDS.tasks, title, {
        [T.duty]: duty,
        [T.owner]: String(session.itemId),
        [T.at]: israelToday(),
        ...(due ? { [T.due]: { date: due } } : {}),
        ...(body?.note ? { [T.note]: String(body.note).trim().slice(0, 2000) } : {}),
      });
      invalidateTasks();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT" || req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה משימה" });
      const task = (await loadTasks()).find((t) => t.id === id);
      /* ⚠ **404 ולא 403** על משימה של חניך אחר. 403 מאשר
         לשואל שהשורה קיימת, וזו דליפה בפני עצמה. */
      if (!task || task.owner !== String(session.itemId)) {
        return res.status(404).json({ error: "המשימה אינה נמצאת" });
      }

      if (req.method === "DELETE") {
        await deleteItem(id);
        invalidateTasks();
        return res.status(200).json({ ok: true, id });
      }

      const cols = {};
      if (body.done !== undefined) cols[T.done] = { checked: body.done ? "true" : "false" };
      if (body.note !== undefined) cols[T.note] = String(body.note || "").trim().slice(0, 2000);
      if (body.due !== undefined) {
        const due = datePatch(body.due);
        if (due === false) return res.status(400).json({ error: "תאריך יעד לא תקין" });
        /* מחרוזת ריקה מנקה את היעד */
        cols[T.due] = due ? { date: due } : {};
      }
      if (Object.keys(cols).length) await setColumns(DUTY_BOARDS.tasks, id, cols);
      if (body.title !== undefined) {
        const title = String(body.title).trim().slice(0, 200);
        if (!title) return res.status(400).json({ error: "שם משימה ריק" });
        await renameItem(DUTY_BOARDS.tasks, id, title);
      }
      invalidateTasks();
      return res.status(200).json({ ok: true, id });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[duty-tasks]", e);
    res.status(502).json({ error: "פעולת המשימות נכשלה" });
  }
}

/** null = בלי יעד · מחרוזת = יעד · false = פסול */
function datePatch(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const s = String(raw).trim();
  return DATE_RE.test(s) ? s : false;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` פותח את העטיפה לכל חניך מחובר. השמירה
   האמיתית היא `owner === session.itemId` בתוך ה-handler. */
export default withAuth(handler, { student: true });
