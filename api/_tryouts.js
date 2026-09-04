/* ============================================================
   /api/students?action=tryouts — המיונים לצבא

     GET                     המיונים שלי · או של כולם (צוות ויו״ר)
     POST   { name, date, status, track, note }    מיון חדש
     PUT    { id, … }                              עריכה
     DELETE { id }                                 מחיקה

   ------------------------------------------------------------
   ⚠⚠ **הבעלות היא של החניך, וזו לא החלטה טכנית.**

   `army` ו-`tryouts` בפרופיל תמיד מולאו על ידי החניך על עצמו
   (`canEditArmy: !session.isManager`), והמיונים הם בדיוק אותו
   נתון — רק בשורות במקום במחרוזת אחת. עריכה מבחוץ הופכת את
   השדה למשהו אחר לגמרי: לא "מה שהחניך מספר על עצמו" אלא "מה
   שהצוות רשם עליו". לכן **כתיבה היא של החניך בלבד**, גם לראש
   המכינה, וגם ליו״ר הוועדה.

   מה שכן נפתח: **קריאה של הכול** לצוות וליו״ר ועדת הגיוסים.
   זו כל הבקשה — "שיוכלו לקחת את המידע ולעשות איתו דברים".

   ⚠ **404 ולא 403 על מיון של חניך אחר.** 403 מאשר שהשורה
     קיימת (4מה).

   ⚠ **מי היו״ר נקבע מתיבה בלוח ולא משם מקובע בקוד.** ראו
     ההערה ב-shared/placements-ids.js.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { TRYOUT_BOARD, TRYOUT_COLS as T, TRYOUT_STATUS, tryoutsReady } from "../shared/tryouts-ids.js";
import { activeStudents } from "./_student-rows.js";
import { loadDefinitions } from "./_placements.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const isDate = (x) => /^\d{4}-\d{2}-\d{2}$/.test(String(x || ""));

export async function loadTryouts({ force = false } = {}) {
  if (!tryoutsReady()) return [];
  return cached("tryouts", async () => {
    const items = await allItems(TRYOUT_BOARD.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        student: val(i, T.student),
        studentName: val(i, T.studentName),
        date: val(i, T.date) || null,
        status: val(i, T.status) || null,
        track: val(i, T.track) || null,
        note: val(i, T.note) || null,
      }))
      .filter((x) => x.name && x.student)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")
        || a.studentName.localeCompare(b.studentName, "he"));
  }, { force });
}

/**
 * האם המשתמש רשאי לראות את המיונים של **כולם**.
 * ⚠ צוות, או יו״ר של ועדה שסומנה בלוח כוועדת גיוסים.
 */
async function maySeeAll(session) {
  if (!session.isStudent) return { all: true, why: "צוות" };
  try {
    const defs = await loadDefinitions();
    const mine = defs.filter((d) => d.army && String(d.chair || "") === String(session.itemId));
    if (mine.length) return { all: true, why: "יו״ר " + mine.map((d) => d.name).join(", ") };
  } catch (e) {
    /* ⚠ כשל בטעינת ההגדרות אינו פותח גישה — ואינו מפיל את
       המסך: החניך רואה את שלו, כמו כל חניך. */
    console.error("[tryouts:maySeeAll]", e);
  }
  return { all: false, why: null };
}

async function handler(req, res, session) {
  if (!tryoutsReady()) {
    /* עיקרון 6: כשל הקמה נראה אחרת מ"אין מיונים". */
    return res.status(503).json({ error: "לוח המיונים טרם הוקם", setupRequired: true });
  }

  const body = ["POST", "PUT", "DELETE"].includes(req.method)
    ? (req.body ?? (await readJson(req))) : {};

  try {
    const perm = await maySeeAll(session);

    /* ---------------- קריאה ---------------- */
    if (req.method === "GET") {
      const all = await loadTryouts();
      const mine = all.filter((x) => String(x.student) === String(session.itemId));

      if (!perm.all) {
        return res.status(200).json({
          tryouts: mine, mine: true, canSeeAll: false,
          statuses: TRYOUT_STATUS,
        });
      }

      /* ⚠ **סיכום מחושב בשרת** — שלושה מסכים שיחשבו אותו
         בדפדפן יראו שלושה מספרים שונים ברגע שאחד מהם יתעדכן. */
      const students = await activeStudents();
      const byStudent = new Map(students.map((s) => [String(s.id), []]));
      for (const t of all) {
        if (byStudent.has(String(t.student))) byStudent.get(String(t.student)).push(t);
      }

      const perStudent = students.map((s) => {
        const list = byStudent.get(String(s.id)) || [];
        return {
          id: s.id, name: s.name,
          count: list.length,
          /* ⚠ **"טרם ניגש" אינו "לא עבר".** חניך בלי אף מיון
             הוא מצב שלישי, ואיחודו עם "לא עבר" היה הופך את
             הטבלה לשקרית בדיוק במקום שבו מסתכלים עליה. */
          passed: list.filter((x) => x.status === "עבר").length,
          waiting: list.filter((x) => x.status === "ממתין לתשובה").length,
          planned: list.filter((x) => x.status === "מתוכנן").length,
          last: list[0] || null,
        };
      }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "he"));

      const byStatus = {};
      for (const st of TRYOUT_STATUS) byStatus[st] = all.filter((x) => x.status === st).length;

      return res.status(200).json({
        tryouts: all, mine: false, canSeeAll: true, seeAllWhy: perm.why,
        statuses: TRYOUT_STATUS,
        summary: {
          total: all.length,
          students: perStudent.filter((s) => s.count > 0).length,
          /* ⚠ מוחזר גם כמה **לא** ניגשו — המספר שאומר כמה
             מהתמונה חסר שייך למסך (4יח). */
          none: perStudent.filter((s) => s.count === 0).length,
          byStatus,
        },
        perStudent,
      });
    }

    /* ---------------- כתיבה: החניך על עצמו בלבד ---------------- */
    if (!session.isStudent) {
      return res.status(403).json({
        error: "המיונים ממולאים על ידי החניך על עצמו. הצוות רואה אותם ואינו עורך אותם",
      });
    }

    if (req.method === "POST") {
      const name = String(body?.name || "").trim().slice(0, 200);
      if (!name) return res.status(400).json({ error: "לא הוזן שם המיון" });

      const cols = { [T.student]: String(session.itemId), [T.studentName]: String(session.name || "") };
      const bad = fill(cols, body, res);
      if (bad) return;

      const id = await createItem(TRYOUT_BOARD.board, name, cols);
      invalidate("tryouts");
      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין מיון" });
    const row = (await loadTryouts()).find((x) => x.id === id);
    /* ⚠ 404 גם על מיון של חניך אחר — 403 מאשר שהשורה קיימת. */
    if (!row || String(row.student) !== String(session.itemId)) {
      return res.status(404).json({ error: "המיון אינו נמצא" });
    }

    if (req.method === "PUT") {
      const cols = {};
      const bad = fill(cols, body, res);
      if (bad) return;
      if (Object.keys(cols).length) await setColumns(TRYOUT_BOARD.board, id, cols);
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 200);
        if (!name) return res.status(400).json({ error: "שם המיון ריק" });
        await renameItem(TRYOUT_BOARD.board, id, name);
      }
      invalidate("tryouts");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      await deleteItem(id);
      invalidate("tryouts");
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[tryouts]", e);
    res.status(502).json({ error: "פעולת המיונים נכשלה" });
  }
}

/**
 * שדות אופציונליים → עמודות.
 * ⚠ מיפוי מפורש ולא פריסה, כדי שעמודה חדשה בלוח לא תיפתח
 *   לכתיבה מעצמה (4ש). מחזירה true אם כבר נשלחה שגיאה.
 */
function fill(cols, body, res) {
  if (body.date !== undefined) {
    const d = String(body.date || "").trim();
    if (!d) cols[T.date] = "";
    else if (!isDate(d)) { res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" }); return true; }
    else cols[T.date] = { date: d };
  }
  if (body.status !== undefined) {
    const st = String(body.status || "").trim();
    if (!st) cols[T.status] = "";
    /* ⚠ תווית שאינה בלוח נדחית ברעש ולא נוצרת בשקט. */
    else if (!TRYOUT_STATUS.includes(st)) {
      res.status(400).json({ error: `"${st}" אינו מצב מוכר. האפשרויות: ${TRYOUT_STATUS.join(" · ")}` });
      return true;
    } else cols[T.status] = { label: st };
  }
  if (body.track !== undefined) cols[T.track] = String(body.track || "").trim().slice(0, 200);
  if (body.note !== undefined) cols[T.note] = String(body.note || "").trim().slice(0, 2000);
  return false;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` — חניך חייב להגיע לכאן, זה המסך שלו.
   ההפרדה בין קריאה לכתיבה נעשית בתוך ה-handler (4טו). */
export default withAuth(handler, { student: true });
