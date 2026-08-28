/* ============================================================
   /api/students?action=duty-notes
     GET     צוות: מה נשלח · חניך: מה נשלח אליו
     POST    { duty, scope?, title, body? }   צוות שולח הצפה
     PUT     { id, reply }                    החניך משיב
     DELETE  { id }                           צוות מסיר הצפה

   ============================================================
   הגבול, ולמה הוא כזה
   ------------------------------------------------------------
   לצוות יש **תיבת יוצא, לא מראה**. ההבחנה הזו היא כל התכונה:

     · כל מה שהצוות יכול לעשות זורם החוצה — לכתוב הצפה.
     · הדבר היחיד שזורם פנימה הוא תשובה שהחניך **בחר** לשלוח,
       בכפתור.
     · אין מצב "טופל", אין חותמת קריאה ואין מונה. מספר הוא
       תחילתו של דירוג, ודירוג הוא מעקב.

   ⚠ **ההצפה מופנית לתפקיד ולא לאדם.** הצוות בוחר "אחראי
     מטבח", והשרת פותר את נושא התפקיד בזמן הקריאה. שלוש
     תוצאות, וכולן רצויות: אין במסך רשימת חניכים ולכן אין
     מאיפה שתצמח עמודה "לפי אדם"; הפנייה היא על האחריות ולא
     על הבנאדם, וזו השפה של המכינה; והצפה נשארת נכונה גם אם
     התפקיד עבר לחניך אחר בשבוע שאחרי.

   ⚠ המחיר אמיתי ומוצהר: איש צוות לא יידע אם ההצפה טופלה,
     ויצטרך לשאול. זה המחיר הנכון — הוא מחזיר את הבדיקה
     לשיחה, וזה בדיוק מה שההבטחה הבטיחה.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { DUTY_BOARDS, DUTY_COLS } from "../shared/duty-ids.js";
import {
  loadNotes, invalidateNotes, dutiesForStudent,
  setColumns, createItem, deleteItem,
} from "./_duty-data.js";
import { dutyKey } from "../shared/duties.js";

const N = DUTY_COLS.notes;
const stamp = () => new Date().toISOString();

async function handler(req, res, session) {
  if (!DUTY_BOARDS.notes) {
    return res.status(503).json({
      error: "לוח ההצפות טרם הוקם ב-monday", setupRequired: true,
    });
  }

  try {
    if (req.method === "GET") {
      const all = await loadNotes();
      if (session.isStudent) {
        const mine = new Set((await dutiesForStudent(session.itemId)).map(dutyKey));
        return res.status(200).json({
          notes: all.filter((n) => mine.has(n.duty)).map(toStudent),
          canSend: false,
        });
      }
      /* ============================================================
         ⚠ **ההערה כאן אמרה "הצוות רואה מה **הוא** שלח", והקוד
           החזיר את הכול.** התיקון הוא בהערה ולא בקוד, ובכוונה:
           ההצפה מופנית **לתפקיד**, ואיש צוות שלא יראה שמישהו
           כבר הציף את אותו דבר יציף אותו שוב. שתי הצפות זהות
           לאותו חניך הן בדיוק מה שהערוץ הזה נועד למנוע.

         ⚠ **אבל `mine` נגזר ונשלח**, כדי שכפתור המחיקה יופיע
           רק על מה שאני שלחתי. הוא נגזר כאן ולא בדפדפן: השוואת
           שמות בלקוח הייתה נשברת ביום שאיש צוות משנה את שמו,
           והכפתור היה מופיע על הצפה של מישהו אחר.

         שום דבר מעבר לזה: אין מצב משימה, אין חותמת קריאה, אין
         מונה ואין רשימת חניכים. ראו ההערה בראש הקובץ.
         ============================================================ */
      const me = actorName(session);
      return res.status(200).json({
        notes: all.map((n) => ({ ...toStaff(n), mine: n.by === me })),
        canSend: true,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      if (session.isStudent) {
        return res.status(403).json({ error: "הצפה נשלחת על ידי הצוות" });
      }
      const duty = String(body?.duty || "").trim();
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!duty) return res.status(400).json({ error: "לא נבחרה אחריות" });
      if (!title) return res.status(400).json({ error: "לא הוזן נושא" });

      const id = await createItem(DUTY_BOARDS.notes, title, {
        [N.duty]: duty,
        [N.by]: actorName(session).slice(0, 120),
        [N.at]: stamp(),
        ...(body?.body ? { [N.body]: String(body.body).trim().slice(0, 3000) } : {}),
      });
      invalidateNotes();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      /* ---------- תשובת החניך ---------- */
      if (!session.isStudent) {
        return res.status(403).json({ error: "התשובה נשלחת על ידי בעל התפקיד" });
      }
      const id = String(body?.id || "").trim();
      const reply = String(body?.reply || "").trim().slice(0, 3000);
      if (!id) return res.status(400).json({ error: "לא צוינה הצפה" });
      if (!reply) return res.status(400).json({ error: "לא הוזנה תשובה" });

      const note = (await loadNotes()).find((n) => n.id === id);
      const mine = new Set((await dutiesForStudent(session.itemId)).map(dutyKey));
      /* ⚠ 404 ולא 403 — ראו api/_duty-tasks.js */
      if (!note || !mine.has(note.duty)) {
        return res.status(404).json({ error: "ההצפה אינה נמצאת" });
      }
      await setColumns(DUTY_BOARDS.notes, id, {
        [N.reply]: reply, [N.replyAt]: stamp(),
      });
      invalidateNotes();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      if (session.isStudent) {
        return res.status(403).json({ error: "הסרת הצפה נעשית על ידי הצוות" });
      }
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה הצפה" });

      /* ============================================================
         ⚠⚠ **כאן היה חור אמיתי.** הבדיקה היחידה הייתה
           `!session.isStudent`, ו-`deleteItem` שולחת
           `delete_item(item_id:…)` **בלי `board_id`** — כלומר כל
           איש צוות יכול היה למחוק **כל שורה בכל לוח במערכת**
           בכך שישלח מזהה שרירותי לנקודת הקצה הזו. חניך, שיעור,
           יום נוכחות, בקשת יציאה.

           כשזה ישב במסך אחד זה היה חבוי; מרגע שכפתור המחיקה
           יושב בתוך כל כרטיס תפקיד ובכל ועדה, זה מסלול פתוח.

         ⚠ המזהה מאומת מול **לוח ההצפות** ומול **מי ששלח**.
           404 ולא 403 — 403 מאשר שהשורה קיימת.
         ============================================================ */
      const note = (await loadNotes()).find((n) => n.id === id);
      if (!note || note.by !== actorName(session)) {
        return res.status(404).json({ error: "ההצפה אינה נמצאת" });
      }
      await deleteItem(id);
      invalidateNotes();
      return res.status(200).json({ ok: true, id });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[duty-notes]", e);
    res.status(502).json({ error: "פעולת ההצפות נכשלה" });
  }
}

/* ⚠ שני מיפויים מפורשים ונפרדים, ולא השמטה — אותו דפוס של
   בקשות היציאה. שדה חדש בלוח לא ידלוף לאף אחד מהצדדים. */
const toStudent = (n) => ({
  id: n.id, duty: n.duty, title: n.title,
  by: n.by, at: n.at, body: n.body,
  reply: n.reply, replyAt: n.replyAt,
});

const toStaff = (n) => ({
  id: n.id, duty: n.duty, title: n.title,
  by: n.by, at: n.at, body: n.body,
  /* התשובה חוזרת — היא נשלחה במפורש. */
  reply: n.reply, replyAt: n.replyAt,
  /* ⚠ ואין כאן `done`, אין `owner` ואין שום מונה.
     `mine` נוסף על גבי המיפוי הזה ב-GET, ולא בתוכו — הוא
     תלוי בזהות הקורא ולא בשורה. */
});

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ פתוח לחניך ולצוות כאחד; ההפרדה בין מה שכל צד רשאי לעשות
   נעשית בתוך ה-handler לפי `session.isStudent`. */
export default withAuth(handler, { student: true });
