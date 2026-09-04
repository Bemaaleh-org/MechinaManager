/* ============================================================
   שיבוץ מובילי השבוע — נתונים ונקודת קצה
   ------------------------------------------------------------
   GET  /api/students?action=weeks   43 השבועות והשיבוצים
   POST /api/students?action=weeks   { weekId, studentIds } — מנהל
   PUT  /api/students?action=weeks   { weekId, start, end } — מנהל

   ⚠ ההרשאה "מוביל שבוע" נגזרת מהלוח הזה: חניך הוא מוביל אם
     הוא משובץ בשבוע שהיום נופל בטווחו. הסימון הידני בלוח
     החניכים נשאר כעוקף חירום (OR), לא כמסלול הרגיל.

   ⚠ שבוע שאינו "פתוח לשיבוץ" (חג/סדרה) נחסם לשיבוץ בשרת,
     לא רק בתצוגה. הדגל יושב בלוח — המכינה יכולה לפתוח או
     לסגור שבוע בלי דיפלוי.

   ⚠ בקובץ המקור יש שבועות חופפים (טיול שיושב בתוך שבוע רגיל).
     יובאו כפי שהם; "השבוע הנוכחי" הוא הראשון שהיום בטווחו.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { activeStudents, toPublic } from "./_student-rows.js";
import { todayFor } from "./_attendance-data.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { guideList } from "./_guides.js";

const W = MECHINA_COLS.leaderWeeks;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const linkedAll = (i, c) => {
  const x = i.column_values.find((y) => y.id === c);
  return x && x.linked_item_ids ? x.linked_item_ids.map(String) : [];
};

export async function loadLeaderWeeks({ force = false } = {}) {
  return cached("leader-weeks", async () => {
    const items = await allItems(MECHINA_BOARDS.leaderWeeks);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        num: Number(val(i, W.num)) || 0,
        start: val(i, W.start),
        end: val(i, W.end),
        what: val(i, W.what) || null,
        note: val(i, W.note) || null,
        escort: val(i, W.escort) || null,
        assignable: val(i, W.open) === "v",
        leaderIds: linkedAll(i, W.leaders),
        /* ⚠ דף המובילויות. שני קולות ושני שדות — ראו
           shared/mechina-boards.js. */
        feedback: val(i, W.feedback) || null,
        feedbackBy: val(i, W.feedbackBy) || null,
        feedbackAt: val(i, W.feedbackAt) || null,
        summary: val(i, W.summary) || null,
      }))
      .filter((w) => w.start && w.end)
      .sort((a, b) => a.start.localeCompare(b.start) || a.num - b.num);
  }, { force, ttl: 5 * 60_000 });
}

/** מזהי המובילים של השבוע שהתאריך נופל בו. ריק אם אין. */
export async function leadersForDate(dateIso) {
  const weeks = await loadLeaderWeeks();
  const hit = weeks.find((w) => w.start <= dateIso && dateIso <= w.end);
  return hit ? hit.leaderIds : [];
}

/* ============================================================
   השבועות שחניך מוביל — **כולם**, לא רק הנוכחי
   ------------------------------------------------------------
   ⚠ **זה מה שמחליף את "היום בלבד".** מוביל שבוע יכול לסמן
     נוכחות מראש ולחזור ולתקן — אבל **רק בימים שהם באחריותו**.
     "היום בלבד" הכריח אותו לזכור לסמן בכל ערב, ותיקון של אתמול
     חייב לעבור דרך המנהל.

   ⚠⚠ **וזה גם מה שמעביר את ההרשאה בזמן.** הטווח נגזר מהשבוע
     שבלוח, ולכן ברגע שהשבוע נגמר החניך מפסיק לסמן ימים חדשים
     מעצמו — בלי שאיש יעשה דבר. הוא ממשיך לתקן את **הימים שלו**,
     וזה נכון: הם באחריותו גם בדיעבד.

   ⚠ **הסימון הידני בלוח החניכים אינו נכנס לכאן.** הוא עוקף
     חירום בלי טווח, ולכן הוא נשאר "היום בלבד" — ראו
     api/_attendance-day.js. אחרת חניך שסומן פעם אחת היה מקבל
     הרשאה על **כל** ימי השנה, לנצח.
   ============================================================ */
export async function weeksOfStudent(studentId) {
  if (!studentId) return [];
  const id = String(studentId);
  return (await loadLeaderWeeks())
    .filter((w) => (w.leaderIds || []).map(String).includes(id))
    .map((w) => ({ id: w.id, num: w.num, start: w.start, end: w.end, name: w.name }));
}

/** האם התאריך נופל באחד השבועות שהחניך מוביל */
export async function leadsOn(studentId, dateIso) {
  if (!studentId || !dateIso) return false;
  return (await weeksOfStudent(studentId))
    .some((w) => w.start <= dateIso && dateIso <= w.end);
}

async function handler(req, res, session) {
  if (req.method === "GET") return list(req, res, session);
  if (req.method === "POST") return assign(req, res, session);
  if (req.method === "PUT") return editDates(req, res, session);
  return res.status(405).json({ error: "רק GET, POST ו-PUT נתמכים כאן" });
}

async function list(req, res, session) {
  try {
    if (!session.isManager) {
      return res.status(403).json({ error: "הפעולה מותרת למנהל בלבד" });
    }
    const [weeks, students] = await Promise.all([loadLeaderWeeks(), activeStudents()]);
    const byId = new Map(students.map((s) => [s.id, s]));
    const today = todayFor(req);

    /* כמה פעמים כל חניך כבר שובץ, על פני כל השבועות —
       כדי שהמנהל יראה בבחירה מי כבר הוביל פעם ומי פעמיים */
    const leadCounts = {};
    for (const w of weeks)
      for (const id of w.leaderIds) leadCounts[id] = (leadCounts[id] || 0) + 1;

    res.status(200).json({
      weeks: weeks.map((w) => ({
        ...w,
        leaders: w.leaderIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map(toPublic),
        isCurrent: w.start <= today && today <= w.end,
      })),
      roster: students.map(toPublic),
      /* ⚠ נקרא מלוח המשתמשים לפי תפקיד "מדריך" — מדריך חדש
         יופיע כאן בלי דיפלוי. ראו guideList ב-_guides.js. */
      guides: await guideList(),
      leadCounts,
      today,
    });
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
    console.error("[leader-weeks:list]", e);
    res.status(502).json({ error: "שליפת השיבוץ נכשלה" });
  }
}

async function assign(req, res, session) {
  try {
    if (!session.isManager) {
      return res.status(403).json({ error: "השיבוץ נעשה על ידי מנהל בלבד" });
    }
    const body = req.body ?? (await readJson(req));
    const weekId = String(body?.weekId || "").trim();
    const studentIds = Array.isArray(body?.studentIds) ? body.studentIds.map(String) : null;

    if (!weekId) return res.status(400).json({ error: "לא צוין שבוע" });

    /* ---------- מלווה ----------
       ⚠ קריאה נפרדת: שיבוץ מלווה אינו משנה את המובילים, ולהפך.
         מסך ששולח את שניהם יחד היה מוחק מובילים בכל פעם
         שמישהו מחליף מלווה. */
    if (body.escort !== undefined) {
      const name = String(body.escort || "").trim();
      if (name) {
        const guides = await guideList();
        if (!guides.some((g) => g.name === name)) {
          return res.status(400).json({ error: "המלווה אינו מדריך מוכר" });
        }
      }
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
        { b: MECHINA_BOARDS.leaderWeeks, i: weekId, v: JSON.stringify({ [W.escort]: name }) }
      );
      invalidate("leader-weeks");
      return res.status(200).json({ ok: true, weekId, escort: name || null });
    }

    if (!studentIds) return res.status(400).json({ error: "לא נשלחה רשימת מובילים" });
    if (studentIds.length > 3) {
      return res.status(400).json({ error: "עד שלושה מובילים לשבוע" });
    }

    const [weeks, students] = await Promise.all([loadLeaderWeeks(), activeStudents()]);
    const week = weeks.find((w) => w.id === weekId);
    if (!week) {
      return res.status(404).json({ error: "השבוע אינו נמצא" });
    }
    if (!week.assignable) {
      return res.status(400).json({ error: "שבוע חג/סדרה — אינו פתוח לשיבוץ" });
    }
    const known = new Set(students.map((s) => s.id));
    const clean = [...new Set(studentIds)].filter((id) => known.has(id));
    if (clean.length !== new Set(studentIds).size) {
      return res.status(400).json({ error: "חניך לא מוכר ברשימה" });
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      {
        b: MECHINA_BOARDS.leaderWeeks, i: weekId,
        v: JSON.stringify({ [W.leaders]: { item_ids: clean.map(Number) } }),
      }
    );
    invalidate("leader-weeks");

    res.status(200).json({ ok: true, weekId, count: clean.length });
  } catch (e) {
    console.error("[leader-weeks:assign]", e);
    res.status(502).json({ error: "שמירת השיבוץ נכשלה" });
  }
}

async function editDates(req, res, session) {
  try {
    if (!session.isManager) {
      return res.status(403).json({ error: "עריכת תאריכים נעשית על ידי מנהל בלבד" });
    }
    const body = req.body ?? (await readJson(req));
    const weekId = String(body?.weekId || "").trim();
    const start = String(body?.start || "").trim();
    const end = String(body?.end || "").trim();

    if (!weekId) return res.status(400).json({ error: "לא צוין שבוע" });
    const isoDay = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDay.test(start) || !isoDay.test(end)) {
      return res.status(400).json({ error: "תאריך לא תקין" });
    }
    if (end < start) {
      return res.status(400).json({ error: "תאריך הסיום לפני תאריך ההתחלה" });
    }

    const weeks = await loadLeaderWeeks();
    if (!weeks.some((w) => w.id === weekId)) {
      return res.status(404).json({ error: "השבוע אינו נמצא" });
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      {
        b: MECHINA_BOARDS.leaderWeeks, i: weekId,
        v: JSON.stringify({ [W.start]: { date: start }, [W.end]: { date: end } }),
      }
    );
    invalidate("leader-weeks");

    res.status(200).json({ ok: true, weekId, start, end });
  } catch (e) {
    console.error("[leader-weeks:edit]", e);
    res.status(502).json({ error: "עדכון התאריכים נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
