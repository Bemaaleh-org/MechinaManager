/* ============================================================
   /api/students?action=bugs   באגים והערות לשיפור

     GET                       כל הדיווחים
     POST   { kind, title, where, detail }   דיווח חדש
     PUT    { id, ... }        עריכה — המדווח, או סטטוס ותשובה לצוות
     DELETE { id }             מחיקה — המדווח, כל עוד "חדש"

   ------------------------------------------------------------
   ⚠⚠ **הרשימה פתוחה לכל המכינה, וזו כל התכלית.** חניך שלא
     יראה שכבר דיווחו על אותו כפתור שבור ידווח עליו שוב, ומי
     שקורא יקבל שמונה שורות על דבר אחד — בדיוק התקלה שנפתרה
     בלוח התקלות (5כד).

   ⚠⚠ **ושם המדווח אינו יוצא לחניכים.** די בכותרת ובמסך כדי
     לדעת שכבר דווח; שם היה הופך את הרשימה ליומן של מי מתלונן
     על מה (עיקרון 5). הצוות **כן** רואה שם — באג שאי אפשר
     לשאול עליו שאלת המשך הוא באג שאי אפשר לשחזר, וזה אותו
     נימוק בדיוק של "מי לקח" בפניות הגיוס (5כו).

   ⚠ **סטטוס ותשובה הם של הצוות.** המדווח עורך את **הדיווח**
     שלו — מה קרה ואיפה — ומוחק אותו רק כל עוד הוא "חדש":
     ברגע שמישהו התחיל לטפל, הדיווח כבר אינו רק שלו (5יח).

   ⚠ **404 ולא 403** על דיווח של מישהו אחר — 403 מאשר שהוא
     קיים (4מה).
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import {
  BUG_BOARDS as B, BUG_COLS as C,
  bugsReady, BUG_KIND, BUG_KINDS, BUG_STATUS, BUG_STATUSES, isOpenBug,
} from "../shared/bugs-ids.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const MAX = { title: 200, where: 120, detail: 4000, reply: 2000 };

async function loadBugs({ force = false } = {}) {
  return cached("bugs", async () => {
    const items = await allItems(B.board);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        kind: val(i, C.kind) || BUG_KIND.bug,
        where: val(i, C.where),
        detail: val(i, C.detail),
        /* ⚠ ריק = "חדש". דיווח חדש אינו נושא סטטוס, והוא בדיוק
           זה שממתין; ברירת מחדל אחרת הייתה מסתירה אותו (5כו). */
        status: val(i, C.status) || BUG_STATUS.fresh,
        reporter: val(i, C.reporter),
        reporterId: val(i, C.reporterId),
        date: val(i, C.date) || null,
        reply: val(i, C.reply),
      }))
      .filter((x) => x.title)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, { force });
}

const invalidateBugs = () => invalidate("bugs");

/** ⚠ מיפוי מפורש, ושני מיפויים נפרדים — לא השמטה (עיקרון 4). */
const toStudent = (b, mine) => ({
  id: b.id, title: b.title, kind: b.kind, where: b.where,
  detail: b.detail, status: b.status, date: b.date, reply: b.reply,
  mine,
  /* ⚠ נגזר בשרת: הכפתור מופיע רק על מה שאני שלחתי, והשוואת
     שמות בלקוח הייתה נשברת ביום שמישהו משנה את שמו (4ס). */
  canEdit: mine && isOpenBug(b.status),
  canDelete: mine && b.status === BUG_STATUS.fresh,
});

const toStaff = (b) => ({ ...toStudent(b, false), reporter: b.reporter, mine: false });

async function handler(req, res, session) {
  if (!bugsReady()) {
    return res.status(503).json({
      error: "לוח הבאגים טרם הוקם. הריצו: npm run seed:bugs",
      setupRequired: true,
    });
  }
  const staff = Boolean(session.isManager);
  const me = String(session.itemId || "");

  try {
    if (req.method === "GET") {
      const all = await loadBugs();
      const rows = staff
        ? all.map((b) => ({ ...toStaff(b), mine: b.reporterId === me }))
        : all.map((b) => toStudent(b, b.reporterId === me));
      return res.status(200).json({
        bugs: rows,
        kinds: BUG_KINDS, statuses: BUG_STATUSES,
        counts: {
          open: all.filter((b) => isOpenBug(b.status)).length,
          mine: all.filter((b) => b.reporterId === me).length,
          done: all.filter((b) => b.status === BUG_STATUS.done).length,
        },
        /* ⚠ מהשרת ולא נגזר במסך (4יד). */
        canManage: staff,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const title = clip(body?.title, MAX.title);
      if (!title) return res.status(400).json({ error: "אין דיווח בלי כותרת" });
      const kind = clip(body?.kind, 40) || BUG_KIND.bug;
      if (!BUG_KINDS.includes(kind)) {
        return res.status(400).json({ error: `סוג לא מוכר. האפשרויות: ${BUG_KINDS.join(" · ")}` });
      }
      const id = await createItem(B.board, title, {
        [C.kind]: { label: kind },
        [C.where]: clip(body?.where, MAX.where),
        [C.detail]: clip(body?.detail, MAX.detail),
        [C.status]: { label: BUG_STATUS.fresh },
        /* ⚠ שם **ומזהה**: השם לצוות, והמזהה הוא מה שקובע בעלות.
           שם לבדו אינו מתעדכן כשמישהו משנה שם (4מו). */
        [C.reporter]: String(session.name || ""),
        [C.reporterId]: me,
        [C.date]: { date: israelToday() },
      });
      invalidateBugs();
      return res.status(200).json({ ok: true, id });
    }

    const id = clip(body?.id, 40);
    if (!id) return res.status(400).json({ error: "לא צוין דיווח" });
    const all = await loadBugs({ force: true });
    const hit = all.find((b) => b.id === id);
    /* ⚠ 404 ולא 403 גם לצוות — שורה שאינה קיימת אינה קיימת. */
    if (!hit) return res.status(404).json({ error: "הדיווח אינו נמצא" });
    const mine = hit.reporterId === me;

    if (req.method === "DELETE") {
      if (!mine) return res.status(404).json({ error: "הדיווח אינו נמצא" });
      if (hit.status !== BUG_STATUS.fresh) {
        return res.status(409).json({ error: `הדיווח כבר ${hit.status} — אי אפשר למחוק אותו` });
      }
      await deleteItem(hit.id);
      invalidateBugs();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method !== "PUT") return res.status(405).json({ error: "שיטה לא נתמכת" });

    const cols = {};

    /* ---------- מה שהצוות משנה ---------- */
    if (body.status !== undefined || body.reply !== undefined) {
      if (!staff) return res.status(403).json({ error: "סטטוס ותשובה נקבעים על ידי הצוות" });
      if (body.status !== undefined) {
        const st = clip(body.status, 40);
        if (!BUG_STATUSES.includes(st)) {
          return res.status(400).json({ error: `סטטוס לא מוכר. האפשרויות: ${BUG_STATUSES.join(" · ")}` });
        }
        cols[C.status] = { label: st };
      }
      if (body.reply !== undefined) cols[C.reply] = clip(body.reply, MAX.reply);
    }

    /* ---------- מה שהמדווח משנה ---------- */
    const touchesReport = ["title", "kind", "where", "detail"].some((k) => body[k] !== undefined);
    if (touchesReport) {
      if (!mine) return res.status(404).json({ error: "הדיווח אינו נמצא" });
      if (!isOpenBug(hit.status)) {
        return res.status(409).json({ error: `הדיווח כבר ${hit.status} — הוא כבר אינו נערך` });
      }
      if (body.kind !== undefined) {
        const k = clip(body.kind, 40);
        if (!BUG_KINDS.includes(k)) return res.status(400).json({ error: "סוג לא מוכר" });
        cols[C.kind] = { label: k };
      }
      if (body.where !== undefined) cols[C.where] = clip(body.where, MAX.where);
      if (body.detail !== undefined) cols[C.detail] = clip(body.detail, MAX.detail);
      if (body.title !== undefined) {
        const t = clip(body.title, MAX.title);
        if (!t) return res.status(400).json({ error: "כותרת ריקה" });
        /* ⚠ שלושה ארגומנטים — ראו api/_team-task.js */
        await renameItem(B.board, id, t);
      }
    }

    if (Object.keys(cols).length) await setColumns(B.board, id, cols);
    invalidateBugs();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[bugs]", e);
    res.status(502).json({ error: "פעולת הדיווח נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ student:true — הדיווח נועד בדיוק לחניכים, ובלי זה
   `withAuth` חוסם אותם כברירת מחדל (4טו). */
export default withAuth(handler, { student: true });
