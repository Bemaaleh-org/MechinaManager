/* ============================================================
   /api/students?action=group[&group=<id>]
     GET     ראה למטה
     POST    { group, title, body, pinned }   פרסום הודעה לקבוצה
     PUT     { id, title, body, pinned }      עריכת הודעה — שלי או ראש המכינה
     DELETE  { id }                           מחיקת הודעה — שלי או ראש המכינה

   "הקבוצה שלי" — קרוב אחד, שני צדדים:

     חניך    רואה מי המדריך שלו, מי חברי הקבוצה, ואת ההודעות
             שהמדריך פרסם. וגם: **כל הקבוצות** — מי בכל אחת,
             כדי שגם חניך בלי קבוצה משלו ידע איפה כולם.
     מדריך   רואה את אותה קבוצה, עם המספרים החיים של כל חניך
             (נוכחות, מכסת חופש, בקשות פתוחות, שיחה אישית),
             ויכול לפרסם. ראש המכינה וצוות אחר רואים, ולא
             בהכרח מפרסמים.

   ⚠ **הקבוצה, החברות בה והמדריך שלה אינם נתון חדש.** הם כבר
     חיים בלוח ההגדרות ובלוח השיבוץ (shared/placements.js,
     api/_guides.js). מה שנוסף כאן הוא רק לוח הודעות
     (shared/group-ids.js) — ולכן הוא הדבר היחיד שיכול "להיות
     לא מוכן". ראו ההערה שם: GET אינו נופל ב-503 בגללו.
   ============================================================ */

import { withAuth } from "./_session.js";
import { cached, invalidate } from "./_cache.js";
import { allItems } from "./_monday.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { CATEGORY } from "../shared/placements.js";
import { loadDefinitions, membersOf } from "./_placements.js";
import { guideMap, isGuideOf } from "./_guides.js";
import { activeStudents } from "./_student-rows.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, todayFor,
} from "./_attendance-data.js";
import { loadRequests } from "./_requests.js";
import { REQ_STATUS } from "../shared/mechina-boards.js";
import { GROUP_BOARDS, GROUP_COLS, groupReady } from "../shared/group-ids.js";

const M = GROUP_COLS.messages;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const notReady = (res) => res.status(503).json({
  error: "לוח ההודעות לקבוצה טרם הוקם ב-monday. הריצו: node --env-file=.env tools/seed-group.mjs",
  setupRequired: true,
  run: "npm run seed:group",
});

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ============================================================
   ההודעות — קריאה וכתיבה
   ============================================================ */
export async function loadGroupMessages({ force = false } = {}) {
  if (!groupReady()) return [];
  return cached("group-messages", async () => {
    const items = await allItems(GROUP_BOARDS.messages);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        group: val(i, M.group),
        groupName: val(i, M.groupName),
        body: val(i, M.body) || null,
        date: val(i, M.date) || null,
        pinned: val(i, M.pinned) === "v",
        by: val(i, M.by) || null,
        byId: val(i, M.byId) || null,
      }))
      .filter((m) => m.title && m.group);
  }, { force });
}

const bust = () => invalidate("group-messages");

async function messagesFor(groupId) {
  if (!groupReady()) return [];
  return (await loadGroupMessages())
    .filter((m) => m.group === groupId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.date || "").localeCompare(a.date || ""));
}

/* ⚠ אין כאן נתון רגיש — כל מי שרואה את הקבוצה רואה את
   ההודעות שלה. `mine`/`canEdit` נגזרים בשרת כדי שכפתור
   העריכה יידע מראש (4יד). */
const toMessagePublic = (m, session) => {
  const mine = Boolean(m.byId) && m.byId === String(session.itemId || "");
  return {
    id: m.id, title: m.title, body: m.body, pinned: m.pinned,
    by: m.by, date: m.date,
    mine,
    canEdit: mine || Boolean(session.isHead),
  };
};

/* ============================================================
   הקבוצות — מי בכל אחת, ומי המדריך
   ------------------------------------------------------------
   ⚠ **הכול נגזר, ולא נשמר.** מקור האמת הוא לוח ההגדרות
     (קטגוריה "קבוצה") ולוח השיבוץ; guideMap() (api/_guides.js)
     הוא המקור היחיד לשאלה מי המדריך.

   ⚠ **`membersFull` (שורה מלאה מ-activeStudents) נשארת פנימית
     ואינה יוצאת כפי שהיא** — יש בה שדות רגישים (ת"ז, טלפון,
     כתובת) שמותרים רק לצוות ורק דרך מיפוי מפורש (עיקרון 4).
     `toDirectoryEntry` ו-`enrichMembers` הם שני המיפויים
     המפורשים, לשני קהלים שונים.

   ⚠ **activeStudents() ולא assignableStudents()** — חשבון
     הבדיקה נספר כאן בתור חבר קבוצה לצורך תצוגה בלבד; אבל
     "נספר" ו"ניתן לשיבוץ" הן שתי שאלות שונות (4לא), וכאן
     השאלה היא "מי באמת בקבוצה", לא "את מי אפשר לשבץ". שיבוץ
     חשבון הבדיקה לקבוצה למטרות בדיקה נשאר אפשרי דרך מסך
     השיבוצים; כאן הוא פשוט לא נספר, כמו בכל מסך אחר שסופר.

   ⚠ **קבוצה בלי אף חניך משובץ מוצגת עם `guide: null`.** זו
     תכונה קיימת של guideMap() ולא דילוג שנוסף כאן: היא בונה
     קבוצה→מדריך מהיפוך של חניך→מדריך, ולכן קבוצה ריקה אינה
     מייצרת אף רשומה שממנה אפשר להפיק את המדריך שלה. ברגע
     שמשובץ אליה חניך ראשון, המדריך יופיע מעצמו.
   ============================================================ */
async function directoryGroups() {
  const [defs, guides, active] = await Promise.all([
    loadDefinitions(), guideMap(), activeStudents(),
  ]);
  const activeById = new Map(active.map((s) => [s.id, s]));

  const nameToGuide = new Map();
  for (const g of guides.values()) {
    if (g.group && !nameToGuide.has(g.group)) nameToGuide.set(g.group, g);
  }

  const groupDefs = defs.filter((d) => d.category === CATEGORY.group && !d.archived);

  const list = await Promise.all(groupDefs.map(async (d) => {
    const raw = await membersOf(d.id);
    const membersFull = raw
      .map((m) => activeById.get(m.id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, "he", { numeric: true }));
    return {
      id: d.id,
      name: d.name,
      guideRaw: nameToGuide.get(d.name) || null,
      membersFull,
      members: membersFull.map((s) => ({ id: s.id, name: s.name })),
      count: membersFull.length,
    };
  }));

  return list.sort((a, b) => a.name.localeCompare(b.name, "he"));
}

/* מה יוצא לכולם — הספרייה. שמות בלבד, בלי שום נתון אישי. */
const toDirectoryEntry = (g) => ({
  id: g.id,
  name: g.name,
  guide: g.guideRaw ? { name: g.guideRaw.short || g.guideRaw.name } : null,
  members: g.members,
  count: g.count,
});

/** אילו קבוצות מותר לי לפרסם אליהן. מדריך → שלו בלבד. ראש המכינה → הכול. */
const postableIds = (groups, session) => {
  if (session.isStudent) return [];
  if (session.isHead) return groups.map((g) => g.id);
  return groups.filter((g) => isGuideOf(session, g.guideRaw)).map((g) => g.id);
};

/* ============================================================
   ⚠⚠ **הנתון המועשר על חניך נבנה רק כשהמבקש הוא צוות.**

   חניך רואה את הקבוצה שלו — שמות וההודעות — ולעולם לא את
   הנתונים האישיים של חבריו: אחוז נוכחות, מכסת חופש, בקשות
   פתוחות ושיחה אישית. שני מסלולים נפרדים ומפורשים בהמשך הקובץ
   (`memberViewStudent` / `enrichMembers`), לא השמטה של שדות —
   כדי ששדה חדש לא ידלוף בטעות דרך מסלול שנועד לצד השני.
   ============================================================ */
const memberViewStudent = (s, session) => ({
  id: s.id, name: s.name, me: s.id === String(session.itemId || ""),
});

/**
 * הנתון החי, לצוות בלבד. כל מקור נטען פעם אחת ואף אחד מהם
 * אינו מפיל את הרשימה — לוח שנכשל לרגע מדווח ב-`partial`,
 * כמו staffView בפרופיל (עיקרון 6).
 */
async function enrichMembers(membersFull, today) {
  const failed = [];
  const safe = async (name, fn) => {
    try { return await fn(); }
    catch (e) { console.error(`[group:${name}]`, e && e.message); failed.push(name); return null; }
  };

  const [cal, absences, marked, requests] = await Promise.all([
    safe("calendar", loadCalendar),
    safe("absences", loadAbsences),
    safe("marked", loadMarked),
    safe("requests", loadRequests),
  ]);
  const byDate = cal ? cal.byDate : new Map();

  const rows = membersFull.map((s) => {
    let sum = null;
    if (absences && marked) {
      try { sum = summarize(s.id, { absences, marked, byDate }, today); }
      catch (e) { console.error("[group:summarize]", e && e.message); }
    }
    const q = sum ? sum.quota.find((x) => x.half === sum.currentHalf) : null;
    const openRequests = requests
      ? requests.filter((r) => r.studentId === s.id && r.status === REQ_STATUS.pending).length
      : 0;
    const talks = Array.isArray(s.profile && s.profile.talks) ? s.profile.talks : [null, null, null];
    const mine = absences ? absences.filter((a) => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date)) : [];

    return {
      id: s.id,
      name: s.name,
      /* ⚠ אחוז מוצג רק מחמישה ימי סימון ומעלה (4ג) — 0% בתחילת
         שנה הוא מספר נכון חשבונית ושקרי במשמעותו. */
      present: sum ? sum.present : null,
      schoolDays: sum ? sum.schoolDays : null,
      pct: sum && sum.schoolDays >= 5 ? Math.round((sum.present / sum.schoolDays) * 100) : null,
      quotaHalf: sum ? sum.currentHalf : null,
      quotaLeft: q ? q.left : null,
      quotaTotal: q ? q.total : null,
      openRequests,
      roles: s.roles || [],
      /* כמה משלושת תאריכי השיחה האישית כבר נקבעו */
      talksSet: talks.filter(Boolean).length,
      lastAbsence: mine[0] ? { date: mine[0].date, type: mine[0].type } : null,
    };
  });

  return { rows, partial: failed.length ? failed : null };
}

/**
 * הצורה שיוצאת ל-`mine` — לחניך ולצוות, כל אחד עם המיפוי שלו.
 */
async function buildMine(def, session, today, canPostTo) {
  const messages = await messagesFor(def.id);
  const canPost = groupReady() && canPostTo.includes(def.id);
  const base = {
    id: def.id,
    name: def.name,
    guide: def.guideRaw ? { name: def.guideRaw.short || def.guideRaw.name } : null,
    canPost,
    messages: messages.map((m) => toMessagePublic(m, session)),
  };

  if (session.isStudent) {
    return { ...base, members: def.members.map((m) => memberViewStudent(m, session)) };
  }
  const enriched = await enrichMembers(def.membersFull, today);
  return { ...base, members: enriched.rows, partial: enriched.partial };
}

/* ============================================================
   GET
   ============================================================ */
async function get(req, res, session) {
  try {
    const today = todayFor(req);
    const groups = await directoryGroups();
    const canPostTo = postableIds(groups, session);

    const askedId = req.query?.group ? String(req.query.group) : null;
    if (askedId) {
      const def = groups.find((g) => g.id === askedId);
      if (!def) return res.status(404).json({ error: "הקבוצה אינה נמצאת" });
      /* ⚠ חניך שואל רק על הקבוצה שלו — 404 ולא 403, כדי שלא
         לאשר שקבוצה אחרת קיימת. צוות וראש המכינה שואלים על
         כל קבוצה, כי הם כבר רואים את כולן בספרייה. */
      if (session.isStudent && !def.members.some((m) => m.id === session.itemId)) {
        return res.status(404).json({ error: "הקבוצה אינה נמצאת" });
      }
      const mine = await buildMine(def, session, today, canPostTo);
      return res.status(200).json({
        ok: true, today, mine, canPostTo, isStaff: !session.isStudent,
        messagesReady: groupReady(),
      });
    }

    let mine = null;
    if (session.isStudent) {
      const def = groups.find((g) => g.members.some((m) => m.id === session.itemId));
      if (def) mine = await buildMine(def, session, today, canPostTo);
    } else {
      /* מדריך שמלווה יותר מקבוצה אחת מקבל כאן את הראשונה;
         לקבוצות האחרות שלו מגיעים דרך ?group=<id>, בדיוק
         כמו שכל צוות מגיע לכל קבוצה. */
      const led = groups.find((g) => isGuideOf(session, g.guideRaw));
      if (led) mine = await buildMine(led, session, today, canPostTo);
    }

    return res.status(200).json({
      ok: true,
      today,
      mine,
      groups: groups.map(toDirectoryEntry),
      canPostTo,
      isStaff: !session.isStudent,
      messagesReady: groupReady(),
    });
  } catch (e) {
    console.error("[group:get]", e);
    res.status(502).json({ error: "שליפת הקבוצה נכשלה" });
  }
}

/* ============================================================
   POST — פרסום הודעה
   ============================================================ */
async function create(req, res, session) {
  if (!groupReady()) return notReady(res);
  try {
    const body = req.body ?? (await readJson(req));
    const groupId = String(body?.group || "").trim();
    const title = String(body?.title || "").trim().slice(0, 200);
    if (!groupId) return res.status(400).json({ error: "לא צוינה קבוצה" });
    if (!title) return res.status(400).json({ error: "לא הוזן נושא" });

    const groups = await directoryGroups();
    const def = groups.find((g) => g.id === groupId);
    if (!def) return res.status(404).json({ error: "הקבוצה אינה נמצאת" });

    /* ⚠ מדריך פרסום לקבוצה שלו בלבד; ראש המכינה — לכל קבוצה. */
    const allowed = Boolean(session.isHead) || isGuideOf(session, def.guideRaw);
    if (!allowed) {
      return res.status(403).json({
        error: def.guideRaw
          ? `הודעות לקבוצת "${def.name}" מתפרסמות על ידי ${def.guideRaw.short || def.guideRaw.name} או ראש המכינה`
          : `לקבוצת "${def.name}" אין עדיין מדריך משויך — רק ראש המכינה יכול לפרסם אליה`,
      });
    }

    const cols = {
      [M.group]: groupId,
      [M.groupName]: def.name,
      [M.date]: { date: todayFor(req) },
      [M.by]: String(session.name || "").slice(0, 120),
      [M.byId]: String(session.itemId || ""),
    };
    const text = String(body?.body || "").trim().slice(0, 4000);
    if (text) cols[M.body] = text;
    if (body?.pinned) cols[M.pinned] = { checked: "true" };

    const id = await createItem(GROUP_BOARDS.messages, title, cols);
    bust();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[group:create]", e);
    res.status(502).json({ error: "פרסום ההודעה נכשל" });
  }
}
/* ============================================================
   PUT — עריכה: שלי, או ראש המכינה
   ============================================================ */
async function edit(req, res, session) {
  if (!groupReady()) return notReady(res);
  try {
    const body = req.body ?? (await readJson(req));
    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוינה הודעה" });

    const msg = (await loadGroupMessages({ force: true })).find((m) => m.id === id);
    const own = Boolean(msg) && msg.byId === String(session.itemId || "");
    /* ⚠ 404 ולא 403 — 403 היה מאשר שהודעה כזו קיימת (4ס). */
    if (!msg || (!own && !session.isHead)) {
      return res.status(404).json({ error: "ההודעה אינה נמצאת" });
    }

    const cols = {};
    if (body.body !== undefined) cols[M.body] = String(body.body || "").trim().slice(0, 4000);
    if (body.pinned !== undefined) cols[M.pinned] = { checked: body.pinned ? "true" : "false" };
    if (Object.keys(cols).length) await setColumns(GROUP_BOARDS.messages, id, cols);

    if (body.title !== undefined) {
      const t = String(body.title || "").trim().slice(0, 200);
      if (!t) return res.status(400).json({ error: "הנושא ריק" });
      await renameItem(GROUP_BOARDS.messages, id, t);
    }

    bust();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[group:edit]", e);
    res.status(502).json({ error: "עדכון ההודעה נכשל" });
  }
}

/* ============================================================
   DELETE — מחיקה: שלי, או ראש המכינה
   ============================================================ */
async function remove(req, res, session) {
  if (!groupReady()) return notReady(res);
  try {
    const body = req.body ?? (await readJson(req));
    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוינה הודעה" });

    const msg = (await loadGroupMessages({ force: true })).find((m) => m.id === id);
    const own = Boolean(msg) && msg.byId === String(session.itemId || "");
    if (!msg || (!own && !session.isHead)) {
      return res.status(404).json({ error: "ההודעה אינה נמצאת" });
    }

    /* ⚠ deleteItem שולחת delete_item בלי board_id (4ס) — המזהה
       אומת כאן, מול לוח ההודעות ומול מי ששלח, לפני הקריאה. */
    await deleteItem(id);
    bust();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[group:delete]", e);
    res.status(502).json({ error: "מחיקת ההודעה נכשלה" });
  }
}

async function handler(req, res, session) {
  if (req.method === "GET") return get(req, res, session);
  if (req.method === "POST") return create(req, res, session);
  if (req.method === "PUT") return edit(req, res, session);
  if (req.method === "DELETE") return remove(req, res, session);
  return res.status(405).json({ error: "רק GET, POST, PUT ו-DELETE נתמכים כאן" });
}

/* פתוח לחניך ולצוות כאחד — ההבחנה בתוך ה-handler. */
export default withAuth(handler, { student: true });
