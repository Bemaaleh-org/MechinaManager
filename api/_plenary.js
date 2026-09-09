/* ============================================================
   /api/students?action=plenary   מליאות

     GET                       הרשימה. הפתקים — לוועדה בלבד.
     GET  &id=<id>             מליאה אחת, עם בנק הפתקים
     POST { title, date }      מליאה חדשה            — הוועדה
     POST { plenary, text, anon }   פתק               — כל חניך
     PUT  { id, ... }          עריכה, סדר יום, סיכום — הוועדה
     PUT  { noteId, ... }      עריכת פתק / סימון לסדר היום
     DELETE { id } / { noteId }

   ------------------------------------------------------------
   ⚠⚠ **בנק הפתקים אינו יוצא לחניכים.** אין דרך להציג אותו
     בלי לשבור את האנונימיות בפועל: מי שרואה עשרה פתקים ויודע
     מי היה בחדר מזהה מי כתב מה. מה שכן פתוח לכולם — **סדר
     היום** ו**הסיכום**, אחרי שהוועדה בנתה אותם. אותו נימוק
     בדיוק של המשוב להנהלה (5יב).

   ⚠⚠ **פתק אנונימי — האנונימיות בהיעדר הנתון.** שלוש שכבות,
     וכולן נחוצות: אין עמודת כותב בשורה, המסלול אינו נוגע
     ב-`session.itemId`, והתשובה **אינה מחזירה מזהה שורה**
     (5י). המחיר מוצהר במסך.

   ⚠ **פתק נכנס רק כשהתיבה פתוחה.** תיבה סגורה פירושה
     שהוועדה כבר בונה סדר יום, ופתק שייכנס אז לא ייראה —
     וזה נאמר במפורש ולא נופל בשקט (4ט).
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import { activeStudents } from "./_student-rows.js";
import { mayContent, contentHint } from "./_content-team.js";
import {
  PLENARY_BOARDS as B, PLENARY_COLS as C, protocolReady,
  plenaryReady, PLENARY_STATUS, PLENARY_STATUSES,
} from "../shared/plenary-ids.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX = { title: 200, text: 4000, summary: 20000, note: 2000 };
const list = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);

async function loadEvents({ force = false } = {}) {
  return cached("plenary-events", async () => {
    const E = C.events;
    const items = await allItems(B.events);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        date: val(i, E.date) || null,
        status: val(i, E.status) || PLENARY_STATUS.planned,
        owners: list(val(i, E.owners)),
        ownerNames: list(val(i, E.ownerNames)),
        open: val(i, E.open) === "v",
        agenda: val(i, E.agenda),
        protocol: val(i, E.protocol),
        summary: val(i, E.summary),
        summaryBy: val(i, E.summaryBy),
        note: val(i, E.note),
      }))
      .filter((e) => e.title)
      /* החדשה למעלה — המליאה הקרובה היא זו שמסתכלים עליה. */
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, { force });
}

async function loadNotes({ force = false } = {}) {
  return cached("plenary-notes", async () => {
    const N = C.notes;
    const items = await allItems(B.notes);
    return items
      .map((i) => ({
        id: String(i.id),
        plenary: val(i, N.plenary),
        text: val(i, N.text) || String(i.name || "").trim(),
        anon: val(i, N.anon) === "v",
        authorId: val(i, N.authorId),
        authorName: val(i, N.authorName),
        order: num(i, N.order),
        inAgenda: val(i, N.inAgenda) === "v",
        date: val(i, N.date) || null,
      }))
      .filter((n) => n.plenary && n.text)
      /* ⚠ ריק יורד לסוף ולא לראש — פתק בלי סדר אינו הראשון. */
      .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9)
        || String(a.date || "").localeCompare(String(b.date || "")));
  }, { force });
}

const invalidatePlenary = () => {
  invalidate("plenary-events"); invalidate("plenary-notes");
};

/** ⚠ מיפוי מפורש, ושתי גרסאות נפרדות — לא השמטה (עיקרון 4). */
const toPublicEvent = (e, notes) => ({
  id: e.id, title: e.title, date: e.date, status: e.status,
  ownerNames: e.ownerNames,
  agenda: e.agenda,
  /* ⚠⚠ **הפרוטוקול אינו כאן, ובכוונה.** הוא רישום של מי אמר
     מה בחדר — כולל דעות שנאמרו בפה מלא דווקא מפני שהן נשארות
     בין המשתתפים. מה שהמכינה קוראת הוא ה**סיכום**, שנכתב כדי
     להיקרא. שדה שאינו נשלח אינו יכול לדלוף מטעות בתצוגה (4מא). */
  summary: e.summary, summaryBy: e.summaryBy,
  /* ⚠ **כמה פתקים נכנסו לסדר היום** ולא כמה הוגשו: המספר
     השני הוא נתון על הבנק, והבנק אינו של החניכים. */
  agendaCount: notes.filter((n) => n.plenary === e.id && n.inAgenda).length,
  open: e.open,
});

const toTeamNote = (n) => ({
  id: n.id, text: n.text, anon: n.anon,
  /* ⚠ ריק בפתק אנונימי — אין מה לסנן, השדה פשוט אינו בלוח. */
  author: n.anon ? null : (n.authorName || null),
  order: n.order, inAgenda: n.inAgenda, date: n.date,
});

async function handler(req, res, session) {
  if (!plenaryReady()) {
    return res.status(503).json({
      error: "לוחות המליאות טרם הוקמו. הריצו: npm run setup:boards  (או רק: npm run seed:plenary)",
      setupRequired: true,
    });
  }
  const may = await mayContent(session);
  const E = C.events, N = C.notes;

  try {
    /* ============ קריאה ============ */
    if (req.method === "GET") {
      const [events, notes] = await Promise.all([loadEvents(), loadNotes()]);
      const one = String(req.query?.id || "").trim();

      if (one) {
        const e = events.find((x) => x.id === one);
        if (!e) return res.status(404).json({ error: "המליאה אינה נמצאת" });
        const mine = notes.filter((n) => n.plenary === one);
        return res.status(200).json({
          plenary: toPublicEvent(e, notes),
          /* ⚠⚠ בנק הפתקים לוועדה בלבד. ראו ההערה בראש. */
          ...(may.ok ? { notes: mine.map(toTeamNote), owners: e.owners, protocol: e.protocol } : {}),
          canEdit: may.ok,
          /* ⚠ **גם כאן ולא רק ברשימה.** המסך של המליאה הבודדת
             הוא זה שמצייר את הלשונית, ודגל שיושב רק בתשובה
             השנייה פירושו לשונית שלעולם לא תופיע. */
          protocolReady: protocolReady(),
          statuses: PLENARY_STATUSES,
        });
      }

      return res.status(200).json({
        plenaries: events.map((e) => toPublicEvent(e, notes)),
        counts: {
          total: events.length,
          open: events.filter((e) => e.open).length,
          done: events.filter((e) => e.status === PLENARY_STATUS.done).length,
          /* ⚠ **כמה סיכומים חסרים** — המספר שאומר כמה מהתמונה
             אין, ולא רק כמה יש (4יח). */
          noSummary: events.filter((e) =>
            e.status === PLENARY_STATUS.done && !String(e.summary || "").trim()).length,
        },
        statuses: PLENARY_STATUSES,
        canEdit: may.ok,
        editHint: may.ok ? null : contentHint(may),
        /* ⚠ **נשלח מהשרת ואינו נגזר במסך** (4יד): לשונית שתופיע
           ותקבל 503 אחרי שהמשתמש הקליד פרוטוקול שלם היא בדיוק
           מה שהכלל נועד למנוע. */
        protocolReady: protocolReady(),
        /* ⚠ רשימת החניכים נחוצה רק לבחירת אחראים, ולכן לוועדה
           בלבד — מיפוי מפורש של שם ומזהה. */
        ...(may.ok ? {
          roster: (await activeStudents()).map((s) => ({ id: s.id, name: s.name })),
        } : {}),
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ============ פתק חדש — כל חניך ============ */
    if (req.method === "POST" && body?.plenary !== undefined) {
      const pid = clip(body.plenary, 40);
      const events = await loadEvents();
      const e = events.find((x) => x.id === pid);
      if (!e) return res.status(404).json({ error: "המליאה אינה נמצאת" });
      /* ⚠ נאמר במפורש ולא נופל בשקט (4ט). */
      if (!e.open) {
        return res.status(409).json({
          error: `תיבת הפתקים של "${e.title}" סגורה — הוועדה כבר בונה את סדר היום`,
        });
      }
      const text = clip(body.text, MAX.text);
      if (!text) return res.status(400).json({ error: "פתק ריק אינו פתק" });
      const anon = Boolean(body.anon);

      /* ============================================================
         ⚠⚠ **בפתק אנונימי לא נכתב שום דבר על הכותב.**
           לא מזהה, לא שם, ולא "אנונימי" בשדה השם — כל אלה הם
           נתון, וההבטחה כאן היא **היעדר** הנתון (5י).
         ⚠ ושם הפריט הוא תחילת הטקסט, כדי שהלוח ייקרא לאדם.
         ============================================================ */
      const id = await createItem(B.notes, text.slice(0, 60) || "פתק", {
        [N.plenary]: pid,
        [N.text]: text,
        [N.anon]: { checked: anon ? "true" : "false" },
        ...(anon ? {} : {
          [N.authorId]: String(session.itemId || ""),
          [N.authorName]: String(session.name || ""),
        }),
        [N.date]: { date: israelToday() },
      });
      invalidatePlenary();
      /* ⚠⚠ **מזהה חוזר רק בפתק מזוהה.** מזהה שחוזר על פתק
         אנונימי מופיע בלוג הרשת לצד הסשן ששלח אותו, כלומר
         שובר את האנונימיות מחוץ ל-monday (5י). */
      return res.status(200).json({ ok: true, ...(anon ? {} : { id }) });
    }

    /* ============ מכאן — הוועדה בלבד ============ */
    if (!may.ok) return res.status(403).json({ error: contentHint(may) });

    if (req.method === "POST") {
      const title = clip(body?.title, MAX.title);
      if (!title) return res.status(400).json({ error: "אין מליאה בלי שם" });
      const date = clip(body?.date, 12);
      if (date && !DATE_RE.test(date)) return res.status(400).json({ error: "תאריך לא תקין" });

      const id = await createItem(B.events, title, {
        ...(date ? { [E.date]: { date } } : {}),
        [E.status]: { label: PLENARY_STATUS.planned },
        /* ⚠ תיבת הפתקים נפתחת מיד — זו כל התכלית של מליאה
           חדשה, ותיבה סגורה כברירת מחדל הייתה דורשת פעולה
           שנייה שאיש לא יזכור. */
        [E.open]: { checked: "true" },
      });
      invalidatePlenary();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const noteId = clip(body?.noteId, 40);
      if (noteId) {
        const hit = (await loadNotes({ force: true })).find((n) => n.id === noteId);
        /* ⚠ מאומת מול הלוח — `deleteItem` שולחת delete_item בלי
           board_id, וזה החור שנסגר בהצפות (4ס). */
        if (!hit) return res.status(404).json({ error: "הפתק אינו נמצא" });
        await deleteItem(noteId);
        invalidatePlenary();
        return res.status(200).json({ ok: true, noteId });
      }
      const id = clip(body?.id, 40);
      if (!id) return res.status(400).json({ error: "לא צוינה מליאה" });
      const events = await loadEvents({ force: true });
      const e = events.find((x) => x.id === id);
      if (!e) return res.status(404).json({ error: "המליאה אינה נמצאת" });
      /* ⚠ **מליאה עם פתקים אינה נמחקת.** מחיקה שקטה של עשרים
         פתקים היא בדיוק סוג הפעולה שאי אפשר לתקן (4ק). */
      const n = (await loadNotes()).filter((x) => x.plenary === id).length;
      if (n) {
        return res.status(409).json({
          error: `למליאה "${e.title}" ${n} פתקים. אפשר לסמן אותה כבוטלה במקום למחוק`,
        });
      }
      await deleteItem(id);
      invalidatePlenary();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method !== "PUT") return res.status(405).json({ error: "שיטה לא נתמכת" });

    /* ---------- עריכת פתק ---------- */
    const noteId = clip(body?.noteId, 40);
    if (noteId) {
      const hit = (await loadNotes({ force: true })).find((n) => n.id === noteId);
      if (!hit) return res.status(404).json({ error: "הפתק אינו נמצא" });
      const cols = {};
      if (body.text !== undefined) {
        const t = clip(body.text, MAX.text);
        if (!t) return res.status(400).json({ error: "פתק ריק אינו פתק" });
        cols[N.text] = t;
        await renameItem(B.notes, noteId, t.slice(0, 60));
      }
      if (body.inAgenda !== undefined) {
        cols[N.inAgenda] = { checked: body.inAgenda ? "true" : "false" };
      }
      if (body.order !== undefined) {
        const o = Number(body.order);
        if (!Number.isFinite(o)) return res.status(400).json({ error: "סדר לא תקין" });
        cols[N.order] = String(Math.round(o));
      }
      if (Object.keys(cols).length) await setColumns(B.notes, noteId, cols);
      invalidatePlenary();
      return res.status(200).json({ ok: true, noteId });
    }

    /* ---------- עריכת מליאה ---------- */
    const id = clip(body?.id, 40);
    if (!id) return res.status(400).json({ error: "לא צוינה מליאה" });
    const events = await loadEvents({ force: true });
    const e = events.find((x) => x.id === id);
    if (!e) return res.status(404).json({ error: "המליאה אינה נמצאת" });

    const cols = {};
    if (body.date !== undefined) {
      const d = clip(body.date, 12);
      if (d && !DATE_RE.test(d)) return res.status(400).json({ error: "תאריך לא תקין" });
      cols[E.date] = d ? { date: d } : {};
    }
    if (body.status !== undefined) {
      const st = clip(body.status, 40);
      if (!PLENARY_STATUSES.includes(st)) {
        return res.status(400).json({ error: `סטטוס לא מוכר. האפשרויות: ${PLENARY_STATUSES.join(" · ")}` });
      }
      cols[E.status] = { label: st };
    }
    if (body.open !== undefined) cols[E.open] = { checked: body.open ? "true" : "false" };
    if (body.agenda !== undefined) cols[E.agenda] = clip(body.agenda, MAX.summary);
    /* ⚠ **נכתב על ידי מי שרשאי לערוך את המליאה** — הוועדה
       ואחראי המליאה. אותו שער בדיוק של סדר היום; פרוטוקול
       שרק היו״ר יכול לכתוב נשאר ריק ברוב המליאות. */
    if (body.protocol !== undefined) {
      /* ⚠⚠ **העמודה נוספה אחרי ההקמה הראשונה.** בלי השער הזה
         `cols[undefined]` נשלח ל-monday ונופל ב-502 גנרי —
         כלומר "השמירה נכשלה" בלי לומר שחסרה הרצה. עיקרון 6:
         כשל הקמה נראה אחרת מכישלון. */
      if (!protocolReady()) {
        return res.status(503).json({
          error: "עמודת הפרוטוקול טרם הוקמה. הריצו: npm run setup:boards  (או רק: npm run seed:plenary)",
          setupRequired: true,
        });
      }
      cols[E.protocol] = clip(body.protocol, MAX.summary);
    }
    if (body.note !== undefined) cols[E.note] = clip(body.note, MAX.note);
    if (body.summary !== undefined) {
      cols[E.summary] = clip(body.summary, MAX.summary);
      /* ⚠ **מי כתב את הסיכום נרשם.** זו חתימה על מסמך ולא
         מעקב על אדם — אותו נימוק כמו מי סימן בצ׳ק ליסט
         ההובלה (5יא). */
      cols[E.summaryBy] = String(session.name || "");
    }

    /* ⚠ **האחראים מאומתים מול המצבה.** בלי זה אפשר היה לשייך
       מזהה שרירותי, ואז המסך מציג אחראי שאינו קיים (4נ). */
    if (body.owners !== undefined) {
      const want = Array.isArray(body.owners) ? [...new Set(body.owners.map(String))] : [];
      if (want.length > 3) return res.status(400).json({ error: "עד שלושה אחראים למליאה" });
      const roster = await activeStudents();
      const byId = new Map(roster.map((s) => [s.id, s]));
      const bad = want.filter((x) => !byId.has(x));
      if (bad.length) return res.status(400).json({ error: "חניך שאינו פעיל ברשימת האחראים" });
      cols[E.owners] = want.join(",");
      cols[E.ownerNames] = want.map((x) => byId.get(x).name).join(",");
    }

    if (body.title !== undefined) {
      const t = clip(body.title, MAX.title);
      if (!t) return res.status(400).json({ error: "שם ריק" });
      /* ⚠ שלושה ארגומנטים — ראו api/_team-task.js */
      await renameItem(B.events, id, t);
    }
    if (Object.keys(cols).length) await setColumns(B.events, id, cols);
    invalidatePlenary();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[plenary]", e);
    res.status(502).json({ error: "פעולת המליאה נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ student:true — הפתקים הם של החניכים, וזו כל התכלית (4טו). */
export default withAuth(handler, { student: true });
