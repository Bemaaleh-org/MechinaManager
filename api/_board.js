/* ============================================================
   /api/students?action=notices    לוח המודעות ותגובותיו
   /api/students?action=mpoll      סקרי מכינה והצבעות
   /api/students?action=mfeedback  משוב אנונימי להנהלה

   ------------------------------------------------------------
   ⚠⚠ **הקהל הוא הרשאת קריאה בשרת, ולא סינון בתצוגה.**

   מודעה שמופנית ל"צוות" **אינה יוצאת** לחניך — היא אינה
   בתשובה, לא ריקה ולא מוסתרת. סינון בדפדפן היה מסתיר אותה
   בעין ומשאיר אותה בגוף התשובה, כלומר גלויה בכלי פיתוח
   (עיקרון 4).

   ------------------------------------------------------------
   ⚠⚠ **מי מפרסם — לפי סוג המודעה ולא לפי האדם.**

   לוח מודעות שכל אחד מכריז בו כל דבר הופך לוואטסאפ תוך שבוע.
   לוח שרק בעלי תפקידים כותבים בו נועל בדיוק את המקרה הנפוץ
   ביותר: חניך שאיבד משהו, או שרוצה להמליץ על סרט. שניהם
   מצבים אמיתיים, ואף אחד מהם אינו מצדיק תפקיד.

   לכן ההבחנה היא **מה נאמר**, לא **מי אומר**:

     כל חניך     — אבידה ומציאה · המלצה
     בעל תפקיד   — כל הסוגים, ובשם התפקיד שלו
     צוות        — כל הסוגים, וגם לקהל "צוות"

   ⚠ **`OPEN_KIND` הוא הרשימה, והיא נאכפת בשרת גם בעריכה** —
     אחרת אפשר היה לפרסם "המלצה" ואז לשנות אותה ל"הודעה".

   ⚠ **`dutiesOf` הוא המקור לשאלה מי נושא אחריות**, ואין כאן
     רשימת תפקידים שנייה. שלוש הגדרות מקבילות מתפצלות (4מד).

   ------------------------------------------------------------
   ⚠ **תפוגה היא שדה ולא מחיקה.** מודעה שפג תוקפה יורדת מהלוח
     ונשארת קריאה בארכיון. לוח שמוחק בעצמו אינו יכול לענות על
     "מה בעצם נאמר אז", וזו השאלה שבגללה יש לוח.

   ⚠ **ו"נעוץ" הוא של ראש המכינה בלבד** — אחרת כל מודעה תהיה
     נעוצה תוך שבוע, והנעיצה תפסיק לומר משהו.
   ============================================================ */
import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { todayFor } from "./_attendance-data.js";
import { dutiesForStudent } from "./_duty-data.js";
import {
  BOARD_BOARDS as B, BOARD_COLS as C, NOTICE_KIND, NOTICE_TO, boardReady,
} from "../shared/board-ids.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const notReady = (res) =>
  res.status(503).json({
    error: "לוח המודעות טרם הוקם",
    setupRequired: true,
    run: "npm run seed:board",
  });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ---------------- טעינה ---------------- */

export async function loadNotices({ force = false } = {}) {
  if (!boardReady()) return [];
  return cached("notices", async () => {
    const items = await allItems(B.notices);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      kind: status(i, C.notices.kind) || NOTICE_KIND[0],
      body: val(i, C.notices.body) || null,
      to: status(i, C.notices.to) || NOTICE_TO[0],
      date: val(i, C.notices.date) || null,
      until: val(i, C.notices.until) || null,
      pinned: val(i, C.notices.pinned) === "v",
      by: val(i, C.notices.by) || null,
      byId: val(i, C.notices.byId) || null,
      link: val(i, C.notices.link) || null,
    })).filter((n) => n.title);
  }, { force });
}

export async function loadComments({ force = false } = {}) {
  if (!boardReady()) return [];
  return cached("notice-comments", async () => {
    const items = await allItems(B.comments);
    return items.map((i) => ({
      id: String(i.id),
      text: String(i.name || "").trim(),
      post: val(i, C.comments.post),
      date: val(i, C.comments.date) || null,
      by: val(i, C.comments.by) || null,
      byId: val(i, C.comments.byId) || null,
    })).filter((c) => c.text && c.post);
  }, { force });
}

export async function loadMechinaPolls({ force = false } = {}) {
  if (!boardReady()) return { polls: [], votes: [] };
  return cached("mechina-polls", async () => {
    const [p, v] = await Promise.all([allItems(B.polls), allItems(B.votes)]);
    return {
      polls: p.map((i) => ({
        id: String(i.id),
        question: String(i.name || "").trim(),
        options: String(val(i, C.polls.options) || "")
          .split("\n").map((x) => x.trim()).filter(Boolean),
        to: status(i, C.polls.to) || NOTICE_TO[0],
        closes: val(i, C.polls.closes) || null,
        closed: val(i, C.polls.closed) === "v",
        by: val(i, C.polls.by) || null,
      })).filter((x) => x.question),
      votes: v.map((i) => ({
        id: String(i.id),
        poll: val(i, C.votes.poll),
        choice: val(i, C.votes.choice),
        voter: val(i, C.votes.voter),
      })).filter((x) => x.poll && x.voter),
    };
  }, { force });
}

export async function loadMechinaFeedback({ force = false } = {}) {
  if (!boardReady()) return [];
  return cached("mechina-feedback", async () => {
    const items = await allItems(B.feedback);
    return items.map((i) => ({
      id: String(i.id),
      /* ⚠ הטקסט הוא שם הפריט. אין כאן כותב — ראו ההערה בראש. */
      text: String(i.name || "").trim(),
      topic: val(i, C.feedback.topic) || null,
      date: val(i, C.feedback.date) || null,
    })).filter((f) => f.text);
  }, { force });
}

const bust = () => {
  invalidate("notices"); invalidate("notice-comments");
  invalidate("mechina-polls"); invalidate("mechina-feedback");
};

/* ============================================================
   מי רואה מה, ומי מפרסם
   ============================================================ */
/** האם הקהל הזה מיועד לי. ⚠ נבדק בשרת, לא במסך. */
const forMe = (to, session) =>
  to === "כולם" || (session.isStudent ? to === "חניכים" : to === "צוות");

/* ⚠ הסוגים שכל חניך מפרסם — ראו ההערה בראש הקובץ. */
const OPEN_KIND = ["אבידה ומציאה", "המלצה"];

/**
 * מה מותר לי לפרסם. ⚠ **לא רשימת תפקידים שנייה** —
 * `dutiesForStudent` הוא המקור היחיד לשאלה "אילו אחריות נושא
 * החניך" (4מד).
 *
 * מחזיר `kinds`: הרשימה **המלאה** של מה שמותר לי, כדי שהמסך
 * יציג בדיוק אותה. בורר שמציע סוג שהשרת ידחה הוא בדיוק הכשל
 * של 4יד — המשתמש כותב, ואז מקבל 403.
 */
async function mayPost(session) {
  if (!session.isStudent) return { ok: true, as: "צוות", kinds: NOTICE_KIND };
  let as = null;
  try {
    const duties = await dutiesForStudent(String(session.itemId || ""));
    if (duties && duties.length) as = duties[0].label || duties[0].name || null;
  } catch (e) { console.error("[board:duties]", e && e.message); }
  /* ⚠ **כל חניך מפרסם**, והשאלה היא רק מה. `ok` נשאר true גם
     בלי תפקיד — אחרת המסך היה מסתיר את הכפתור מרוב החניכים. */
  return { ok: true, as, kinds: as ? NOTICE_KIND : OPEN_KIND };
}

const mayPin = (session) => Boolean(session.isHead);

/* ============================================================
   לוח המודעות
   ============================================================ */
async function noticeHandler(req, res, session) {
  if (!boardReady()) return notReady(res);
  const today = todayFor(req);

  try {
    if (req.method === "GET") {
      const [all, comments, post] = await Promise.all([
        loadNotices(), loadComments(), mayPost(session),
      ]);
      const mine = all.filter((n) => forMe(n.to, session));
      const live = mine.filter((n) => !n.until || n.until >= today);
      const old = mine.filter((n) => n.to && n.until && n.until < today);

      const withComments = (n) => ({
        ...n,
        /* ⚠ **`mine` נגזר בשרת** ואינו השוואת שמות בלקוח — היא
           נשברת ביום שמישהו משנה את שמו (4ס). */
        mine: Boolean(n.byId) && n.byId === String(session.itemId || ""),
        comments: comments
          .filter((c) => c.post === n.id)
          .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
          .map((c) => ({
            ...c,
            mine: Boolean(c.byId) && c.byId === String(session.itemId || ""),
          })),
      });

      return res.status(200).json({
        ok: true,
        today,
        /* ⚠ **הרשימה שמותרת לי**, ולא הרשימה המלאה. ראו mayPost. */
        kinds: post.kinds,
        audiences: session.isStudent ? ["כולם", "חניכים"] : NOTICE_TO,
        me: {
          id: String(session.itemId || ""),
          post: post.ok,
          as: post.as || null,
          pin: mayPin(session),
          /* ⚠ צוות מוחק כל מודעה; מי שפרסם מוחק את שלו. */
          moderate: !session.isStudent,
        },
        /* ⚠ **נעוץ ראשון, ואז לפי תאריך יורד.** בלי זה הנעיצה
           אינה עושה דבר. */
        notices: live
          .sort((a, b) => Number(b.pinned) - Number(a.pinned)
            || (b.date || "").localeCompare(a.date || ""))
          .map(withComments),
        /* ⚠ **הארכיון מוחזר ואינו נמחק** — ראו ההערה בראש. */
        archive: old
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .map(withComments),
      });
    }

    /* ⚠ let ולא const: הסוג מנורמל אחרי בדיקת ההרשאה. */
    let body = req.body ?? (await readJson(req));

    /* ---------- תגובה ---------- */
    if (req.method === "POST" && body?.post !== undefined) {
      const notice = (await loadNotices()).find((n) => n.id === String(body.post));
      if (!notice) return res.status(404).json({ error: "המודעה אינה נמצאת" });
      /* ⚠ 404 ולא 403: מודעה שאינה לקהל שלי לא תאשר את קיומה. */
      if (!forMe(notice.to, session)) {
        return res.status(404).json({ error: "המודעה אינה נמצאת" });
      }
      const text = String(body?.text || "").trim().slice(0, 1000);
      if (!text) return res.status(400).json({ error: "לא הוזנה תגובה" });

      /* ⚠ **תגובה פתוחה לכל מי שרואה את המודעה**, גם למי שאינו
         מפרסם. זו כל ההבחנה בין לוח מודעות לבין הודעות: אפשר
         לשאול "מתי בדיוק" בלי לפתוח קבוצה בוואטסאפ. */
      const id = await createItem(B.comments, text.slice(0, 200), {
        [C.comments.post]: notice.id,
        [C.comments.date]: { date: today },
        [C.comments.by]: String(session.name || "").slice(0, 120),
        [C.comments.byId]: String(session.itemId || ""),
      });
      bust();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    if (req.method === "POST") {
      const can = await mayPost(session);
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת" });

      /* ⚠ **הסוג נבדק מול הרשימה האישית ולא מול NOTICE_KIND.**
         `fill` בודק שהסוג קיים; כאן נבדק שהוא מותר **לי**. */
      const wanted = String(body?.kind || "").trim() || can.kinds[0];
      if (!can.kinds.includes(wanted)) {
        return res.status(403).json({
          error: `"${wanted}" מפורסם על ידי בעלי תפקידים ועל ידי הצוות. `
            + `מה שפתוח לכולם: ${OPEN_KIND.join(" · ")}.`,
        });
      }
      body = { ...body, kind: wanted };

      const out = {
        [C.notices.date]: { date: today },
        [C.notices.by]: String(session.name || "").slice(0, 120),
        [C.notices.byId]: String(session.itemId || ""),
      };
      const bad = fill(out, body, session);
      if (bad) return res.status(400).json({ error: bad });
      if (!out[C.notices.kind]) out[C.notices.kind] = { label: NOTICE_KIND[0] };
      if (!out[C.notices.to]) out[C.notices.to] = { label: NOTICE_TO[0] };

      const id = await createItem(B.notices, title, out);
      bust();

      /* ⚠ הדחיפה אחרי הכתיבה ואינה זורקת (5ה), וההתראה עצמה
         נבנית ב-_notify — דחיפה בלי התראה מציגה כלום. */
      try {
        const { nudgeMany } = await import("./_push-now.js");
        const { activeStudents } = await import("./_student-rows.js");
        if (out[C.notices.to].label !== "צוות") {
          nudgeMany("student", (await activeStudents()).map((s) => s.id), "מודעה חדשה");
        }
      } catch (e) { console.error("[notices push]", e && e.message); }

      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוינה שורה" });

    /* ---------- תגובה: מחיקה ---------- */
    const comment = (await loadComments()).find((c) => c.id === id);
    if (comment && req.method === "DELETE") {
      const own = comment.byId && comment.byId === String(session.itemId || "");
      if (!own && session.isStudent) {
        return res.status(404).json({ error: "התגובה אינה נמצאת" });
      }
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id });
    }

    const notice = (await loadNotices()).find((n) => n.id === id);
    if (!notice) return res.status(404).json({ error: "המודעה אינה נמצאת" });
    const own = notice.byId && notice.byId === String(session.itemId || "");
    if (!own && session.isStudent) {
      return res.status(404).json({ error: "המודעה אינה נמצאת" });
    }

    if (req.method === "PUT") {
      /* ⚠⚠ **אותה בדיקה גם בעריכה.** בלעדיה אפשר לפרסם "המלצה"
         ואז לשנות אותה ל"הודעה" — כלומר לעקוף את הכלל בשתי
         בקשות במקום באחת. */
      if (body.kind !== undefined) {
        const can = await mayPost(session);
        const k = String(body.kind).trim();
        if (!can.kinds.includes(k)) {
          return res.status(403).json({
            error: `"${k}" מפורסם על ידי בעלי תפקידים ועל ידי הצוות.`,
          });
        }
      }
      const out = {};
      const bad = fill(out, body, session);
      if (bad) return res.status(400).json({ error: bad });
      if (body.pinned !== undefined) {
        /* ⚠ **נעיצה היא של ראש המכינה בלבד** — אחרת כל מודעה
           תהיה נעוצה תוך שבוע, והנעיצה תפסיק לומר משהו. */
        if (!mayPin(session)) {
          return res.status(403).json({ error: "נעיצה היא של ראש המכינה" });
        }
        out[C.notices.pinned] = { checked: body.pinned ? "true" : "false" };
      }
      if (Object.keys(out).length) await setColumns(B.notices, id, out);
      if (body.title !== undefined) {
        const t = String(body.title).trim().slice(0, 200);
        if (!t) return res.status(400).json({ error: "הכותרת ריקה" });
        await renameItem(B.notices, id, t);
      }
      bust();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      /* ⚠ **וגם התגובות שלה.** בלעדיהן נשארות שורות שמצביעות
         על מודעה שאינה קיימת, ואין מסך שמציג אותן — כלומר הן
         לא יימחקו לעולם (4ק). */
      const kids = (await loadComments()).filter((c) => c.post === id);
      for (const k of kids) { try { await deleteItem(k.id); } catch { /* כבר נמחקה */ } }
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id, removed: kids.length });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[notices]", e);
    return res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

function fill(out, b, session) {
  if (b.kind !== undefined) {
    const k = String(b.kind || "").trim();
    if (!NOTICE_KIND.includes(k)) return `"${k}" אינו סוג מוכר`;
    out[C.notices.kind] = { label: k };
  }
  if (b.to !== undefined) {
    const t = String(b.to || "").trim();
    if (!NOTICE_TO.includes(t)) return `"${t}" אינו קהל מוכר`;
    /* ⚠ **חניך אינו מפרסם לצוות.** לא כי זה מסוכן, אלא כי זה
       ערוץ אחר: מה שחניך רוצה לומר לצוות עובר בהצפה, שיש לה
       נמען ואחריות (4מה). */
    if (t === "צוות" && session.isStudent) {
      return "מודעה לצוות מפורסמת על ידי הצוות. מה שרוצים לומר לבעל תפקיד — דרך ההצפות.";
    }
    out[C.notices.to] = { label: t };
  }
  if (b.body !== undefined) out[C.notices.body] = String(b.body || "").trim().slice(0, 6000);
  if (b.link !== undefined) out[C.notices.link] = String(b.link || "").trim().slice(0, 500);
  if (b.until !== undefined) {
    const d = String(b.until || "").trim();
    if (!d) out[C.notices.until] = "";
    else if (!DATE_RE.test(d)) return "תאריך בפורמט YYYY-MM-DD";
    else out[C.notices.until] = { date: d };
  }
  return null;
}

/* ============================================================
   סקרי מכינה
   ------------------------------------------------------------
   ⚠ **אינם חשאיים, ונאמר במסך** — אותו כלל כמו סקרי הוועדות:
     "מי עוד לא הצביע" היא כל התועלת בשאלת תיאום. משוב אנונימי
     הוא המסלול האחר, ובלוח אחר.

   ⚠ **שורה לכל הצבעה, והצבעה חוזרת מחליפה.** אדם אחד, קול אחד.
   ============================================================ */
async function pollHandler(req, res, session) {
  if (!boardReady()) return notReady(res);
  const me = String(session.itemId || "");

  try {
    if (req.method === "GET") {
      const { polls, votes } = await loadMechinaPolls();
      const mine = polls.filter((p) => forMe(p.to, session));
      return res.status(200).json({
        ok: true,
        me: { id: me, manage: !session.isStudent },
        audiences: NOTICE_TO,
        polls: mine.map((p) => {
          const vs = votes.filter((v) => v.poll === p.id);
          return {
            id: p.id, question: p.question, options: p.options,
            to: p.to, closes: p.closes, closed: p.closed, by: p.by,
            /* ⚠ נגזר ואינו נשמר — מונה שמור מתיישן ברגע שמישהו
               מוחק הצבעה בלוח (4כו). */
            results: p.options.map((o) => ({
              option: o, n: vs.filter((v) => v.choice === o).length,
            })),
            total: vs.length,
            mine: (vs.find((v) => String(v.voter) === me) || {}).choice || null,
          };
        }).sort((a, b) => Number(a.closed) - Number(b.closed)
          || (a.closes || "9999").localeCompare(b.closes || "9999")),
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ---------- הצבעה ---------- */
    if (req.method === "POST" && body?.poll !== undefined) {
      const { polls, votes } = await loadMechinaPolls();
      const poll = polls.find((p) => p.id === String(body.poll));
      if (!poll || !forMe(poll.to, session)) {
        return res.status(404).json({ error: "הסקר אינו נמצא" });
      }
      if (poll.closed) return res.status(400).json({ error: "הסקר סגור" });
      const choice = String(body?.choice || "").trim();
      if (!poll.options.includes(choice)) {
        return res.status(400).json({ error: "האפשרות אינה ברשימה" });
      }
      const prev = votes.find((v) => v.poll === poll.id && String(v.voter) === me);
      if (prev) await setColumns(B.votes, prev.id, { [C.votes.choice]: choice });
      else {
        await createItem(B.votes, choice.slice(0, 200), {
          [C.votes.poll]: poll.id, [C.votes.choice]: choice, [C.votes.voter]: me,
        });
      }
      bust();
      return res.status(200).json({ ok: true, choice });
    }

    /* ⚠ **פתיחת סקר מכינה היא של הצוות.** סקר שמופנה לכל
       המכינה הוא בקשה מכל אחד, ולכן היא של מי שרשאי לבקש. */
    if (session.isStudent) {
      return res.status(403).json({ error: "פתיחת סקר למכינה היא של הצוות" });
    }

    if (req.method === "POST") {
      const q = String(body?.question || "").trim().slice(0, 300);
      const options = (Array.isArray(body?.options) ? body.options : [])
        .map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12);
      if (!q) return res.status(400).json({ error: "לא הוזנה שאלה" });
      if (options.length < 2) return res.status(400).json({ error: "צריך לפחות שתי אפשרויות" });
      const to = String(body?.to || NOTICE_TO[0]).trim();
      if (!NOTICE_TO.includes(to)) return res.status(400).json({ error: `"${to}" אינו קהל מוכר` });

      const out = {
        [C.polls.options]: options.join("\n"),
        [C.polls.to]: { label: to },
        [C.polls.by]: String(session.name || "").slice(0, 120),
      };
      if (body.closes) {
        if (!DATE_RE.test(String(body.closes))) {
          return res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" });
        }
        out[C.polls.closes] = { date: String(body.closes) };
      }
      const id = await createItem(B.polls, q, out);
      bust();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין סקר" });
    const { polls } = await loadMechinaPolls();
    if (!polls.some((p) => p.id === id)) {
      return res.status(404).json({ error: "הסקר אינו נמצא" });
    }

    if (req.method === "PUT") {
      if (body.closed !== undefined) {
        await setColumns(B.polls, id, {
          [C.polls.closed]: { checked: body.closed ? "true" : "false" },
        });
      }
      bust();
      return res.status(200).json({ ok: true, id });
    }
    if (req.method === "DELETE") {
      const { votes } = await loadMechinaPolls();
      for (const v of votes.filter((x) => x.poll === id)) {
        try { await deleteItem(v.id); } catch { /* כבר נמחקה */ }
      }
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[mpoll]", e);
    return res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

/* ============================================================
   משוב אנונימי להנהלה
   ------------------------------------------------------------
   ⚠⚠ **אין כאן `session.itemId` בשום מקום במסלול הכתיבה**, ואין
     בלוח עמודת כותב. זו כל התכלית — ראו tools/seed-board.mjs.

   ⚠ **והתשובה אינה מחזירה מזהה שורה**: מזהה שחוזר מופיע בלוג
     הרשת לצד הסשן ששלח אותו, כלומר שובר את האנונימיות מחוץ
     ל-monday.

   ⚠ **המחיר מוצהר**: אי אפשר למחוק "את מה שאני כתבתי", ואי
     אפשר למנוע כפילות. שניהם המחיר של אנונימיות, והם עדיפים
     על אנונימיות למראית עין.

   ⚠ **והקריאה היא של הצוות.** משוב שכל המכינה קוראת אינו
     אנונימי בפועל — מי שכותב על מקרה שקרה לו מזוהה מהתוכן.
   ============================================================ */
async function feedbackHandler(req, res, session) {
  if (!boardReady()) return notReady(res);

  try {
    if (req.method === "GET") {
      if (session.isStudent) {
        /* ⚠ **מיפוי מפורש ולא השמטה**: החניך מקבל את מה שהוא
           צריך כדי לכתוב, ולא רשימה מסוננת בדפדפן (עיקרון 4). */
        return res.status(200).json({ ok: true, canRead: false, feedback: [] });
      }
      const all = await loadMechinaFeedback();
      return res.status(200).json({
        ok: true,
        canRead: true,
        feedback: all.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const text = String(body?.text || "").trim().slice(0, 4000);
      if (!text) return res.status(400).json({ error: "לא הוזן משוב" });
      const topic = String(body?.topic || "").trim().slice(0, 120);

      await createItem(B.feedback, text.slice(0, 200), {
        [C.feedback.topic]: topic,
        [C.feedback.date]: { date: new Date().toISOString().slice(0, 10) },
      });
      bust();
      /* ⚠ בלי מזהה בתשובה — ראו ההערה בראש. */
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      /* ⚠ המחיקה של הצוות, ולא של מי שכתב — כי אי אפשר לדעת מי
         כתב, וזה בדיוק העניין. */
      if (session.isStudent) return res.status(404).json({ error: "המשוב אינו נמצא" });
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין משוב" });
      if (!(await loadMechinaFeedback()).some((f) => f.id === id)) {
        return res.status(404).json({ error: "המשוב אינו נמצא" });
      }
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[mfeedback]", e);
    return res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

export const notices = withAuth(noticeHandler, { student: true });
export const mpoll = withAuth(pollHandler, { student: true });
export const mfeedback = withAuth(feedbackHandler, { student: true });
