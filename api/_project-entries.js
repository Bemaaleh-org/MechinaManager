/* ============================================================
   /api/students?action=project-entry — שלבים ויומן הפרויקט

     POST   { project, kind, title, date, body, order }
     PUT    { id, … }        עריכה · שלב אפשר לסמן כהושלם
     DELETE { id }

   ------------------------------------------------------------
   ⚠⚠ **לוח אחד לשני סוגים, כי הם אותה צורה.** "אבן דרך" ו"רשומת
     יומן" הן שתיהן שורה שכותרתה טקסט, שייכת לפרויקט, נושאת
     תאריך וגוף. מה שמבדיל הוא עמודת `kind` — בדיוק כמו לוח
     ההגדרות של השיבוצים שמחזיק ענפים, ועדות וסדרות.

     ⚠ וזה **ההפך** מהמקרה של duty.tasks מול team.tasks (4נ):
       שם שני לוחות דומים הם הפוכים בבעלות ולכן נשארים נפרדים.
       כאן זו אותה בעלות ואותו מסלול קריאה בדיוק.

   ⚠ **הצוות חסום כאן כמו בכל הפרויקטים.** אותה שורה, אותו
     נימוק — ראו api/_projects.js.

   ⚠ **שלב שהושלם אינו נמחק.** הוא נשאר עם `done`, כי "הגענו
     לשם" הוא חלק מהסיפור של הפרויקט ולא רעש.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems, uploadFile } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import {
  PROJECT_BOARDS as B, PROJECT_COLS as C, ENTRY_KIND, projectsReady,
} from "../shared/projects-ids.js";
import { loadProjects, mineProject } from "./_projects.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** מזהי הנכסים בעמודת הקובץ, ושמותיהם. */
function filesOf(item, colId) {
  if (!colId) return [];
  const col = (item.column_values || []).find((x) => x.id === colId);
  if (!col || !col.value) return [];
  let want = [];
  try {
    want = (JSON.parse(col.value).files || [])
      .map((f) => ({
        id: String(f.assetId ?? f.asset_id ?? ""),
        name: String(f.name || "קובץ"),
      }))
      .filter((f) => f.id);
  } catch { return []; }
  const assets = item.assets || [];
  return want.map((f) => {
    const hit = assets.find((a) => String(a.id) === f.id);
    return { ...f, url: hit ? hit.public_url : null };
  });
}

/* ============================================================
   ⚠ **גבול גודל, ובשרת.**
     קובץ נשלח כ-base64 בגוף הבקשה, ו-base64 מנפח בשליש. שני
     מגה הם התמונה שיוצאת מטלפון; מעבר לזה הבקשה נופלת אצל
     Vercel בשגיאה שלא מסבירה כלום, ולכן היא נחסמת כאן עם
     הודעה שאפשר לפעול לפיה.
   ============================================================ */
const MAX_BYTES = 2 * 1024 * 1024;

export async function loadEntries({ force = false } = {}) {
  if (!projectsReady() || !B.entries) return [];
  return cached("project-entries", async () => {
    /* ⚠ `assets` נשלף כאן כדי שיהיה URL לקובץ. הוא מחזיר את
       **כל** הקבצים של השורה מכל העמודות, ולכן ההצלבה נעשית
       מול המזהים שבעמודה שלנו (5ג). */
    const items = await allItems(B.entries, "assets { id public_url }");
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      project: val(i, C.entries.project),
      kind: status(i, C.entries.kind) || ENTRY_KIND[0],
      date: val(i, C.entries.date) || null,
      body: val(i, C.entries.body) || null,
      done: val(i, C.entries.done) === "v",
      order: Number(val(i, C.entries.order)) || 0,
      /* ⚠ **הקבצים נקראים מ-`value` של עמודת הקובץ ולא מ-`assets`.**
         `assets` מחזיר את כל הקבצים של השורה מכל העמודות, וכאן
         יש עמודה אחת — אבל הכלל נשמר, כי עמודה שנייה שתיווסף
         מחר הייתה מדליפה קבצים לכאן בשקט (5ג). */
      files: filesOf(i, C.entries.files),
    })).filter((e) => e.title && e.project);
  }, { force });
}

export const invalidateEntries = () => invalidate("project-entries");

async function handler(req, res, session) {
  if (!projectsReady() || !B.entries) {
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

  const fill = (out, b) => {
    if (b.kind !== undefined) {
      const k = String(b.kind || "").trim();
      if (!ENTRY_KIND.includes(k)) return `"${k}" אינו סוג רשומה מוכר`;
      out[C.entries.kind] = { label: k };
    }
    if (b.date !== undefined) {
      const d = String(b.date || "").trim();
      if (!d) out[C.entries.date] = "";
      else if (!DATE_RE.test(d)) return "תאריך בפורמט YYYY-MM-DD";
      else out[C.entries.date] = { date: d };
    }
    if (b.body !== undefined) out[C.entries.body] = String(b.body || "").trim().slice(0, 4000);
    if (b.done !== undefined) out[C.entries.done] = { checked: b.done ? "true" : "false" };
    if (b.order !== undefined) {
      const n = Number(b.order);
      out[C.entries.order] = Number.isFinite(n) ? String(n) : "";
    }
    return null;
  };

  try {
    if (req.method === "POST") {
      const p = await mineProject(body?.project, me);
      if (!p) return res.status(404).json({ error: "הפרויקט אינו נמצא" });
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת" });

      const out = { [C.entries.project]: p.id };
      const bad = fill(out, body);
      if (bad) return res.status(400).json({ error: bad });
      if (!out[C.entries.kind]) out[C.entries.kind] = { label: ENTRY_KIND[0] };

      const id = await createItem(B.entries, title, out);

      /* ⚠ העלאה אחרי היצירה, וכישלון בה אינו מפיל את הרשומה —
         היא כבר נשמרה, והקובץ אפשר להוסיף שוב. */
      let fileUploaded = false;
      const bad2 = await attach(id, body, res);
      if (bad2 === "sent") return;
      fileUploaded = Boolean(bad2);

      invalidateEntries();
      return res.status(200).json({ ok: true, id: String(id), fileUploaded });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוינה רשומה" });
    const row = (await loadEntries()).find((x) => x.id === id);
    /* ⚠ 404 גם כשהשורה קיימת אך אינה בפרויקט שלו (4מה). */
    if (!row || !(await mineProject(row.project, me))) {
      return res.status(404).json({ error: "הרשומה אינה נמצאת" });
    }

    if (req.method === "PUT") {
      const out = {};
      const bad = fill(out, body);
      if (bad) return res.status(400).json({ error: bad });
      if (Object.keys(out).length) await setColumns(B.entries, id, out);
      const up = await attach(id, body, res);
      if (up === "sent") return;
      if (body.title !== undefined) {
        const t = String(body.title).trim().slice(0, 200);
        if (!t) return res.status(400).json({ error: "הכותרת ריקה" });
        await renameItem(B.entries, id, t);
      }
      invalidateEntries();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      /* ⚠ שלב שנמחק משאיר משימות שמצביעות עליו. הן אינן
         נמחקות — הן חוזרות ל"בלי שלב", וזה מצב תקין. מחיקת
         משימות של מישהו כתופעת לוואי היא בדיוק מה שאין לעשות. */
      await deleteItem(id);
      invalidateEntries();
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[project-entry]", e);
    res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

/* ============================================================
   צירוף קובץ לרשומה
   ------------------------------------------------------------
   מחזיר `true` אם הועלה, `false` אם לא נשלח קובץ, ו-`"sent"` אם
   כבר נשלחה שגיאה לקורא.

   ⚠ **הקובץ נשלח כ-base64 בגוף הבקשה**, כמו בתקלות. זו אינה
     הדרך היעילה, אבל היא היחידה שאינה דורשת סוד נוסף ושירות
     אחסון חיצוני — והשאלה הזו כבר נשאלה והוחלט לא לפתוח אותה.
   ============================================================ */
async function attach(id, body, res) {
  if (!body?.fileData || !C.entries.files) return false;
  try {
    const buf = Buffer.from(String(body.fileData), "base64");
    if (buf.length > MAX_BYTES) {
      res.status(400).json({
        error: "הקובץ גדול מ-2MB. אפשר לצלם באיכות נמוכה יותר, או להעלות במקום זה קישור.",
      });
      return "sent";
    }
    await uploadFile(id, C.entries.files,
      String(body.fileName || "file").slice(0, 120), buf,
      String(body.fileMime || "application/octet-stream"));
    return true;
  } catch (e) {
    console.error("[project-entry:file]", e);
    return false;
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
