/* ============================================================
   /api/students?action=duty
     GET   מרכז התפקיד — כל מה שבעל תפקיד צריך, בקריאה אחת
     POST  { duty }   אישור קריאת מסמך החפיפה

   ⚠ **קריאה אחת ולא ארבע.** מסך שטוען משימות, הצפות, חפיפה
     וקיצורים בארבע בקשות נפרדות נוחת בארבעה שלבים, והתוכן
     קופץ מתחת לאצבע. אותו שיקול של הפרופיל המלא (4מא).

   ⚠ **החפיפה גלויה למי שנושא את התפקיד, גם לפני שאישר.**
     היא לא סוד — היא הדבר שהוא צריך כדי להתחיל.

   ⚠ אישור הקריאה יושב **בשורת החניך עצמו** בלוח המצבה, ולא
     בלוח נפרד: זה מצב אישי של המשתמש על עצמו, ולא רישום
     שמישהו אחר צורך. אותו דפוס של "התראות נקראו".
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { invalidate } from "./_cache.js";
import { israelToday } from "./_attendance-data.js";
import {
  dutiesForStudent, loadTasks, loadNotes, loadHandovers,
  handoverFor, handoverStamp,
} from "./_duty-data.js";
import { dutyKey } from "../shared/duties.js";
import { boardColumn } from "./_board-col.js";

/* ⚠ נמצאת לפי כותרת ונוצרת אם חסרה — אותו דפוס של "התראות
   נקראו". עמודה שמזהה שלה מקובע בקוד מחייבת מחולל ודיפלוי. */
const READ_COL = "חפיפות שנקראו";

async function readSet(studentId) {
  const col = await boardColumn(MECHINA_BOARDS.roster, READ_COL, "long_text");
  if (!col) return { col: null, set: new Set() };
  const d = await gql(
    `query($i:[ID!],$c:[String!]){ items(ids:$i){ column_values(ids:$c){ id text } } }`,
    { i: [String(studentId)], c: [col] });
  const raw = d.items?.[0]?.column_values?.[0]?.text || "";
  return { col, set: new Set(raw.split("|").map((s) => s.trim()).filter(Boolean)) };
}

async function handler(req, res, session) {
  if (!session.isStudent) {
    return res.status(403).json({ error: "מרכז התפקיד שייך לבעלי התפקידים" });
  }

  try {
    const duties = await dutiesForStudent(session.itemId);

    if (req.method === "POST") {
      const body = req.body ?? (await readJson(req));
      const want = String(body?.duty || "").trim();
      const docs = await loadHandovers();
      const doc = handoverFor(docs, want);
      if (!doc) return res.status(404).json({ error: "אין מסמך חפיפה לאחריות הזו" });

      const { col, set } = await readSet(session.itemId);
      if (!col) return res.status(502).json({ error: "לא נמצאה עמודת האישורים" });
      set.add(handoverStamp(doc));
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
        { b: MECHINA_BOARDS.roster, i: String(session.itemId),
          v: JSON.stringify({ [col]: [...set].join(" | ") }) });
      invalidate("student-rows");
      return res.status(200).json({ ok: true, duty: want });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
    }

    /* ⚠ חניך בלי אף אחריות אינו טוען ארבעה לוחות לחינם. */
    if (!duties.length) {
      return res.status(200).json({ duties: [], hasAny: false });
    }

    const [tasks, notes, docs, read] = await Promise.all([
      loadTasks(), loadNotes(), loadHandovers(), readSet(session.itemId),
    ]);
    const today = israelToday();
    const myTasks = tasks.filter((t) => t.owner === String(session.itemId));

    return res.status(200).json({
      hasAny: true,
      duties: duties.map((d) => {
        const key = dutyKey(d);
        const mine = myTasks.filter((t) => t.duty === key);
        const doc = handoverFor(docs, d.name);
        const inbox = notes.filter((n) => n.duty === key);
        return {
          key,
          name: d.name,
          label: d.label,
          short: d.short,
          tone: d.tone,
          icon: d.icon,
          scope: d.scope || null,
          scopeName: d.scopeName || null,
          category: d.category || null,
          /* המסכים שהאחריות פותחת — אותה רשימה שמזינה את המגירה */
          tabs: d.tabs,
          tasks: mine.map((t) => ({
            id: t.id, title: t.title, done: t.done,
            due: t.due, note: t.note, at: t.at,
          })),
          counts: {
            open: mine.filter((t) => !t.done).length,
            done: mine.filter((t) => t.done).length,
            late: mine.filter((t) => !t.done && t.due && t.due < today).length,
          },
          /* ⚠ המסמך המלא, ולא רק "יש/אין": המסך פותח אותו
             במקום, ובקשה שנייה הייתה מוסיפה המתנה בדיוק ברגע
             שהחניך רוצה לקרוא. */
          handover: doc ? {
            by: doc.by, phone: doc.phone, cycle: doc.cycle, at: doc.at,
            doing: doc.doing, challenges: doc.challenges,
            keep: doc.keep, improve: doc.improve, extra: doc.extra,
            /* ⚠ נגזר מהמצב ואינו נשמר כדגל: מסמך שנכתב מחדש
               חוזר להיות "לא נקרא" מעצמו. */
            read: read.set.has(handoverStamp(doc)),
          } : null,
          notes: inbox.map((n) => ({
            id: n.id, title: n.title, by: n.by, at: n.at,
            body: n.body, reply: n.reply, replyAt: n.replyAt,
          })),
        };
      }),
    });
  } catch (e) {
    console.error("[duty-hub]", e);
    res.status(502).json({ error: "טעינת מרכז התפקיד נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
