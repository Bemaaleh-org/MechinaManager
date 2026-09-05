/* ============================================================
   /api/students?action=team-entry     רשומות הצוות
   /api/students?action=team-poll      סקרים והצבעות
   /api/students?action=team-feedback  משוב אנונימי

   ------------------------------------------------------------
   ⚠ **אותה הרשאה בדיוק כמו במשימות הצוות** (`mayTeam`): צוות,
     המדריך המלווה, היו״ר וחברי הצוות. השער אינו דגל ב-`withAuth`
     כי השאלה היא איחוד — אותו דפוס כמו `mayArea` (4כב).

   ⚠ **403 על הצוות, 404 על מזהה שורה.** הוועדה עצמה אינה סוד;
     מה שבתוכה כן (4נ).

   ------------------------------------------------------------
   ⚠⚠ **המשוב האנונימי יושב בלוח נפרד שאין בו עמודת כותב.**

   אנונימיות שנשענת על "השדה נשאר ריק" אינה אנונימיות — היא
   הבטחה שאפשר לשבור בטעות, בעדכון אחד. כאן אין מה לשבור: הלוח
   מחזיק צוות, תאריך וטקסט, וזה הכול.

   ⚠ **וגם כאן אין `session.itemId` בשום מקום במסלול הכתיבה.**
     מי שיוסיף אותו — שובר הבטחה, לא מוסיף תכונה. זה אותו כלל
     של "אין שדה שמזהה מי ביצע תורנות" (עיקרון 5).

   ⚠ **המחיר מוצהר**: אי אפשר למחוק משוב מסוים "של מי שכתב
     אותו", ואי אפשר למנוע כפילות. שתי אלה הן בדיוק המחיר של
     אנונימיות, והן עדיפות על אנונימיות למראית עין.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import {
  TEAM_BOARDS as B, TEAM_COLS as C, TEAM_ENTRY_KIND, teamExtrasReady,
} from "../shared/team-ids.js";
import { mayTeam } from "../shared/team.js";
import { teamContext } from "./_team-data.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------------- טעינה ---------------- */

export async function loadTeamEntries({ force = false } = {}) {
  if (!teamExtrasReady()) return [];
  return cached("team-entries", async () => {
    const items = await allItems(B.entries);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      team: val(i, C.entries.team),
      kind: status(i, C.entries.kind) || TEAM_ENTRY_KIND[0],
      date: val(i, C.entries.date) || null,
      body: val(i, C.entries.body) || null,
      extra: val(i, C.entries.extra) || null,
      qty: num(i, C.entries.qty),
      amount: num(i, C.entries.amount),
      done: val(i, C.entries.done) === "v",
      by: val(i, C.entries.by) || null,
    })).filter((e) => e.title && e.team);
  }, { force });
}

export async function loadTeamFeedback({ force = false } = {}) {
  if (!teamExtrasReady()) return [];
  return cached("team-feedback", async () => {
    const items = await allItems(B.feedback);
    return items.map((i) => ({
      id: String(i.id),
      /* ⚠ הטקסט הוא שם הפריט. אין כאן כותב — ראו ההערה למעלה. */
      text: String(i.name || "").trim(),
      team: val(i, C.feedback.team),
      date: val(i, C.feedback.date) || null,
    })).filter((f) => f.text && f.team);
  }, { force });
}

export async function loadTeamPolls({ force = false } = {}) {
  if (!teamExtrasReady()) return { polls: [], votes: [] };
  return cached("team-polls", async () => {
    const [pItems, vItems] = await Promise.all([allItems(B.polls), allItems(B.votes)]);
    return {
      polls: pItems.map((i) => ({
        id: String(i.id),
        question: String(i.name || "").trim(),
        team: val(i, C.polls.team),
        /* ⚠ אפשרות בשורה — טקסט חופשי, ולא רשימה סגורה בקוד. */
        options: String(val(i, C.polls.options) || "")
          .split("\n").map((x) => x.trim()).filter(Boolean),
        closes: val(i, C.polls.closes) || null,
        closed: val(i, C.polls.closed) === "v",
        by: val(i, C.polls.by) || null,
      })).filter((p) => p.question && p.team),
      votes: vItems.map((i) => ({
        id: String(i.id),
        poll: val(i, C.votes.poll),
        choice: val(i, C.votes.choice),
        voter: val(i, C.votes.voter),
      })).filter((v) => v.poll && v.voter),
    };
  }, { force });
}

const bust = () => {
  invalidate("team-entries"); invalidate("team-feedback"); invalidate("team-polls");
};

/** הצוות, אם מותר לי לגעת בו. אחרת { error, code }. */
async function gate(teamId, session, needWrite) {
  const ctx = await teamContext(String(teamId || ""));
  if (!ctx) return { error: "הצוות אינו נמצא", code: 404 };
  const perm = mayTeam(session, ctx);
  if (!perm.read) return { error: "הצוות הזה אינו שלך", code: 403 };
  if (needWrite && !perm.write) return { error: "אין הרשאת כתיבה בצוות הזה", code: 403 };
  return { ctx, perm };
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const notReady = (res) =>
  res.status(503).json({ error: "לוחות הצוותים המורחבים טרם הוקמו", setupRequired: true });

/* ============================================================
   רשומות — פרוטוקול, אירוע, קישור, ציוד, חפיפה, כסף
   ============================================================ */
async function entryHandler(req, res, session) {
  if (!teamExtrasReady()) return notReady(res);
  const body = req.body ?? (await readJson(req));

  const fill = (out, b) => {
    if (b.kind !== undefined) {
      const k = String(b.kind || "").trim();
      if (!TEAM_ENTRY_KIND.includes(k)) return `"${k}" אינו סוג רשומה מוכר`;
      out[C.entries.kind] = { label: k };
    }
    if (b.date !== undefined) {
      const d = String(b.date || "").trim();
      if (!d) out[C.entries.date] = "";
      else if (!DATE_RE.test(d)) return "תאריך בפורמט YYYY-MM-DD";
      else out[C.entries.date] = { date: d };
    }
    if (b.body !== undefined) out[C.entries.body] = String(b.body || "").trim().slice(0, 6000);
    if (b.extra !== undefined) out[C.entries.extra] = String(b.extra || "").trim().slice(0, 500);
    if (b.done !== undefined) out[C.entries.done] = { checked: b.done ? "true" : "false" };
    for (const [key, col, max] of [["qty", C.entries.qty, 100000], ["amount", C.entries.amount, 10000000]]) {
      if (b[key] === undefined) continue;
      const raw = String(b[key] ?? "").trim();
      /* ⚠ ריק אינו אפס — "לא נקבע" ו"אפס" הם שני מצבים. */
      if (!raw) { out[col] = ""; continue; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > max) return "מספר לא תקין";
      out[col] = String(Math.round(n * 100) / 100);
    }
    return null;
  };

  try {
    if (req.method === "POST") {
      const g = await gate(body?.team, session, true);
      if (g.error) return res.status(g.code).json({ error: g.error });
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת" });

      const out = {
        [C.entries.team]: g.ctx.def.id,
        [C.entries.by]: String(session.name || "").slice(0, 120),
      };
      const bad = fill(out, body);
      if (bad) return res.status(400).json({ error: bad });
      if (!out[C.entries.kind]) out[C.entries.kind] = { label: TEAM_ENTRY_KIND[0] };

      const id = await createItem(B.entries, title, out);
      bust();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוינה רשומה" });
    const row = (await loadTeamEntries()).find((x) => x.id === id);
    if (!row) return res.status(404).json({ error: "הרשומה אינה נמצאת" });
    /* ⚠ 404 ולא 403 — מזהה של צוות אחר אינו מאשר שהשורה קיימת. */
    const g = await gate(row.team, session, true);
    if (g.error) return res.status(g.code === 403 ? 404 : g.code).json({ error: "הרשומה אינה נמצאת" });

    if (req.method === "PUT") {
      const out = {};
      const bad = fill(out, body);
      if (bad) return res.status(400).json({ error: bad });
      if (Object.keys(out).length) await setColumns(B.entries, id, out);
      if (body.title !== undefined) {
        const t = String(body.title).trim().slice(0, 200);
        if (!t) return res.status(400).json({ error: "הכותרת ריקה" });
        await renameItem(B.entries, id, t);
      }
      bust();
      return res.status(200).json({ ok: true, id });
    }
    if (req.method === "DELETE") {
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[team-entry]", e);
    res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

/* ============================================================
   סקרים
   ------------------------------------------------------------
   ⚠ **שורה לכל הצבעה.** שני חברים שמצביעים באותה שנייה היו
     דורסים זה את זה אילו ההצבעות היו JSON על הסקר.

   ⚠ **הצבעה חוזרת מחליפה את הקודמת ואינה מוסיפה שנייה** —
     אחרת אדם אחד סופר פעמיים.

   ⚠ **הסקר אינו חשאי.** "איזה תאריך מתאים" היא שאלת תיאום,
     ולדעת מי עוד לא הצביע זו כל התועלת. משוב אנונימי הוא
     המסלול האחר, ובלוח אחר.
   ============================================================ */
async function pollHandler(req, res, session) {
  if (!teamExtrasReady()) return notReady(res);
  const body = req.body ?? (await readJson(req));
  const me = String(session.itemId || "");

  try {
    if (req.method === "POST" && body?.poll === undefined) {
      const g = await gate(body?.team, session, true);
      if (g.error) return res.status(g.code).json({ error: g.error });
      const q = String(body?.question || "").trim().slice(0, 300);
      const options = (Array.isArray(body?.options) ? body.options : [])
        .map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12);
      if (!q) return res.status(400).json({ error: "לא הוזנה שאלה" });
      /* ⚠ סקר עם אפשרות אחת אינו סקר. */
      if (options.length < 2) return res.status(400).json({ error: "צריך לפחות שתי אפשרויות" });

      const out = {
        [C.polls.team]: g.ctx.def.id,
        [C.polls.options]: options.join("\n"),
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

    /* ---------- הצבעה ---------- */
    if (req.method === "POST") {
      const { polls, votes } = await loadTeamPolls();
      const poll = polls.find((p) => p.id === String(body.poll));
      if (!poll) return res.status(404).json({ error: "הסקר אינו נמצא" });
      const g = await gate(poll.team, session, true);
      if (g.error) return res.status(g.code === 403 ? 404 : g.code).json({ error: "הסקר אינו נמצא" });
      if (poll.closed) return res.status(400).json({ error: "הסקר סגור" });

      const choice = String(body?.choice || "").trim();
      if (!poll.options.includes(choice)) {
        return res.status(400).json({ error: "האפשרות אינה ברשימה" });
      }
      /* ⚠ הצבעה קודמת מוחלפת — אדם אחד, קול אחד. */
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

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין סקר" });
    const { polls } = await loadTeamPolls();
    const poll = polls.find((p) => p.id === id);
    if (!poll) return res.status(404).json({ error: "הסקר אינו נמצא" });
    const g = await gate(poll.team, session, true);
    if (g.error) return res.status(g.code === 403 ? 404 : g.code).json({ error: "הסקר אינו נמצא" });

    if (req.method === "PUT") {
      if (body.closed !== undefined) {
        await setColumns(B.polls, id, { [C.polls.closed]: { checked: body.closed ? "true" : "false" } });
      }
      bust();
      return res.status(200).json({ ok: true, id });
    }
    if (req.method === "DELETE") {
      /* ⚠ מוחקים גם את ההצבעות — אחרת הן יתומות ואין להן מסך. */
      const { votes } = await loadTeamPolls();
      for (const v of votes.filter((x) => x.poll === id)) {
        try { await deleteItem(v.id); } catch { /* כבר נמחקה */ }
      }
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[team-poll]", e);
    res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

/* ============================================================
   משוב אנונימי
   ------------------------------------------------------------
   ⚠⚠ **אין כאן `session.itemId` בשום מקום.** לא בכתיבה, לא
     בקריאה ולא במחיקה. זו כל התכלית — ראו ההערה בראש הקובץ.

   ⚠ **כל חניך יכול לכתוב לכל ועדה**, ולא רק חבריה: משוב על
     אירוע שהוועדה הפיקה מגיע ממי שהיה באירוע.

   ⚠ **המחיקה היא של הוועדה** (מי שרשאי לכתוב בה), ולא של מי
     שכתב — כי אי אפשר לדעת מי כתב, וזה בדיוק העניין.
   ============================================================ */
async function feedbackHandler(req, res, session) {
  if (!teamExtrasReady()) return notReady(res);
  const body = req.body ?? (await readJson(req));

  try {
    if (req.method === "POST") {
      /* ⚠ **בכוונה בלי `gate` על כתיבה**: מי שנותן משוב אינו
         חבר הוועדה. מה שכן נבדק — שהצוות קיים. */
      const ctx = await teamContext(String(body?.team || ""));
      if (!ctx) return res.status(404).json({ error: "הצוות אינו נמצא" });
      const text = String(body?.text || "").trim().slice(0, 3000);
      if (!text) return res.status(400).json({ error: "לא הוזן משוב" });

      await createItem(B.feedback, text.slice(0, 200), {
        [C.feedback.team]: ctx.def.id,
        [C.feedback.date]: { date: new Date().toISOString().slice(0, 10) },
      });
      bust();
      /* ⚠ לא מחזירים מזהה — הוא היה מאפשר לקשר בין התשובה
         לבין מי ששלח אותה, דרך הלוג של הרשת. */
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין משוב" });
      const row = (await loadTeamFeedback()).find((x) => x.id === id);
      if (!row) return res.status(404).json({ error: "המשוב אינו נמצא" });
      const g = await gate(row.team, session, true);
      if (g.error) return res.status(g.code === 403 ? 404 : g.code).json({ error: "המשוב אינו נמצא" });
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[team-feedback]", e);
    res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

export const teamEntry = withAuth(entryHandler, { student: true });
export const teamPoll = withAuth(pollHandler, { student: true });
export const teamFeedback = withAuth(feedbackHandler, { student: true });
