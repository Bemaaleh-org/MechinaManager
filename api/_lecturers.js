/* ============================================================
   /api/students?action=lecturers   מאגר מרצים אפשריים

     GET                     כל ההצעות
     POST { name, topic … }  הצעה חדשה — **כל חניך**
     PUT  { id, … }          עריכה. סטטוס והערות — הוועדה
     DELETE { id }           מי שהציע, כל עוד "הצעה"

   ------------------------------------------------------------
   ⚠⚠ **כל חניך מציע, וזו כל התכלית.** מרצה טוב מגיע מהמלצה
     של מישהו שהיה בהרצאה שלו, ומאגר שרק הוועדה מוסיפה לו
     הוא רשימת הקשרים של שלושה אנשים. הוועדה **מטפלת** —
     סטטוס, פרטי קשר, הערות.

   ⚠ **וזה אינו גיליון מרצים.** גיליון הוא שיעור שנקבע, עם
     מפגשים ומחיר וחוות דעת; כאן זו הצעה. ערבוב השניים היה
     מכניס הצעות לדוח התשלום למרצים.

   ⚠ **שם המציע יוצא לכולם, במכוון.** "מי ממליץ" הוא חצי
     מהערך של ההמלצה, ובלעדיו אי אפשר לשאול. זה אינו מעקב
     על חניך — אותו נימוק של "מי לקח" בפניות הגיוס (5כו).
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import { mayContent, contentHint } from "./_content-team.js";
import {
  LECT_BOARDS as B, LECT_COLS as C,
  lecturersReady, LECT_STATUS, LECT_STATUSES, isOpenLect,
} from "../shared/lecturers-ids.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const MAX = { name: 150, topic: 150, about: 4000, contact: 120, notes: 2000 };

async function loadLect({ force = false } = {}) {
  return cached("lecturers", async () => {
    const items = await allItems(B.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        topic: val(i, C.topic),
        about: val(i, C.about),
        phone: val(i, C.phone),
        email: val(i, C.email),
        link: val(i, C.link),
        /* ⚠ ריק = "הצעה". הצעה חדשה אינה נושאת סטטוס, והיא
           בדיוק זו שממתינה (5כו). */
        status: val(i, C.status) || LECT_STATUS.idea,
        byId: val(i, C.byId),
        byName: val(i, C.byName),
        notes: val(i, C.notes),
        date: val(i, C.date) || null,
      }))
      .filter((r) => r.name)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, { force });
}

const invalidateLect = () => invalidate("lecturers");

async function handler(req, res, session) {
  if (!lecturersReady()) {
    return res.status(503).json({
      error: "מאגר המרצים טרם הוקם. הריצו: npm run seed:plenary",
      setupRequired: true,
    });
  }
  const may = await mayContent(session);
  const me = String(session.itemId || "");

  try {
    if (req.method === "GET") {
      const rows = await loadLect();
      return res.status(200).json({
        /* ⚠ מיפוי מפורש — עמודה חדשה בלוח לא תדלוף מעצמה
           (עיקרון 4). פרטי הקשר **כן** יוצאים: זו הצעה של
           חניך על מרצה, ולא נתון פרטי של אדם מהמכינה. */
        lecturers: rows.map((r) => ({
          id: r.id, name: r.name, topic: r.topic, about: r.about,
          phone: r.phone, email: r.email, link: r.link,
          status: r.status, by: r.byName || null, date: r.date,
          /* ⚠ ההערות הפנימיות של הוועדה — לוועדה בלבד. */
          ...(may.ok ? { notes: r.notes } : {}),
          /* ⚠ נגזר בשרת (4יד). */
          mine: Boolean(r.byId && r.byId === me),
          canEdit: may.ok || (r.byId === me && isOpenLect(r.status)),
          canDelete: r.byId === me && r.status === LECT_STATUS.idea,
        })),
        statuses: LECT_STATUSES,
        counts: {
          total: rows.length,
          open: rows.filter((r) => isOpenLect(r.status)).length,
          came: rows.filter((r) => r.status === LECT_STATUS.came).length,
        },
        canManage: may.ok,
        manageHint: may.ok ? null : contentHint(may),
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = clip(body?.name, MAX.name);
      if (!name) return res.status(400).json({ error: "אין הצעה בלי שם" });
      const id = await createItem(B.board, name, {
        [C.topic]: clip(body?.topic, MAX.topic),
        [C.about]: clip(body?.about, MAX.about),
        [C.phone]: clip(body?.phone, MAX.contact),
        [C.email]: clip(body?.email, MAX.contact),
        [C.link]: clip(body?.link, MAX.contact),
        [C.status]: { label: LECT_STATUS.idea },
        [C.byId]: me,
        [C.byName]: String(session.name || ""),
        [C.date]: { date: israelToday() },
      });
      invalidateLect();
      return res.status(200).json({ ok: true, id });
    }

    const id = clip(body?.id, 40);
    if (!id) return res.status(400).json({ error: "לא צוינה הצעה" });
    const rows = await loadLect({ force: true });
    const hit = rows.find((r) => r.id === id);
    if (!hit) return res.status(404).json({ error: "ההצעה אינה נמצאת" });
    const mine = hit.byId === me;

    if (req.method === "DELETE") {
      /* ⚠ **מחיקה למי שהציע, וכל עוד לא נגעו בה.** מרגע
         שהוועדה יצרה קשר, ההצעה כבר אינה רק שלו (5יח).
         ⚠ ו-404 ולא 403 — 403 מאשר שהיא קיימת. */
      if (!mine) return res.status(404).json({ error: "ההצעה אינה נמצאת" });
      if (hit.status !== LECT_STATUS.idea) {
        return res.status(409).json({ error: `ההצעה כבר ב"${hit.status}" — אי אפשר למחוק אותה` });
      }
      await deleteItem(id);
      invalidateLect();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method !== "PUT") return res.status(405).json({ error: "שיטה לא נתמכת" });

    const cols = {};

    /* ---------- הוועדה ---------- */
    if (body.status !== undefined || body.notes !== undefined) {
      if (!may.ok) return res.status(403).json({ error: contentHint(may) });
      if (body.status !== undefined) {
        const st = clip(body.status, 40);
        if (!LECT_STATUSES.includes(st)) {
          return res.status(400).json({ error: `סטטוס לא מוכר. האפשרויות: ${LECT_STATUSES.join(" · ")}` });
        }
        cols[C.status] = { label: st };
      }
      if (body.notes !== undefined) cols[C.notes] = clip(body.notes, MAX.notes);
    }

    /* ---------- מי שהציע, או הוועדה ---------- */
    const touches = ["name", "topic", "about", "phone", "email", "link"]
      .some((k) => body[k] !== undefined);
    if (touches) {
      if (!may.ok && !(mine && isOpenLect(hit.status))) {
        return res.status(404).json({ error: "ההצעה אינה נמצאת" });
      }
      for (const [k, col, max] of [
        ["topic", C.topic, MAX.topic], ["about", C.about, MAX.about],
        ["phone", C.phone, MAX.contact], ["email", C.email, MAX.contact],
        ["link", C.link, MAX.contact],
      ]) {
        if (body[k] !== undefined) cols[col] = clip(body[k], max);
      }
      if (body.name !== undefined) {
        const n = clip(body.name, MAX.name);
        if (!n) return res.status(400).json({ error: "שם ריק" });
        /* ⚠ שלושה ארגומנטים — ראו api/_team-task.js */
        await renameItem(B.board, id, n);
      }
    }

    if (Object.keys(cols).length) await setColumns(B.board, id, cols);
    invalidateLect();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[lecturers]", e);
    res.status(502).json({ error: "פעולת מאגר המרצים נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ student:true — כל חניך מציע, וזו כל התכלית (4טו). */
export default withAuth(handler, { student: true });
