/* ============================================================
   GET  /api/students?action=profile[&student=<id>]
   POST /api/students?action=profile

   הפרופיל האישי. מי ממלא מה:
     שיבוץ צבאי, מיונים לצבא — החניך ממלא, הצוות רואה.
     שיחה אישית (3 תאריכים)  — הצוות קובע, החניך רואה.

   ⚠ חניך רואה ועורך את שלו בלבד. מנהל מעביר ?student= וקובע
     את תאריכי השיחות. הבדיקות בשרת — לא בתצוגה.

   ⚠ אירועים חריגים אינם כאן בכוונה — יש להם נקודת קצה נפרדת
     שכולה מנהל בלבד, כדי שטעות בקוד תצוגה לעולם לא תדליף
     השעיה לחניך.

   ------------------------------------------------------------
   ⚠ **הבלוק `staff` — כל מה שידוע על החניך, לצוות בלבד.**
     שיבוצים, בקשות יציאה, שבועות שהוביל, תפקידים ופרטי זיהוי.
     המדריך היה צריך לפתוח ארבעה מסכים ואת monday כדי להרכיב
     את התמונה הזו, וזו בדיוק הסיבה שהיא לא הורכבה.

     הוא נבנה **רק אחרי** `session.isManager`, ואינו קיים
     בתשובה לחניך — לא ריק, לא null: פשוט אינו שם. שדה שאינו
     נשלח אינו יכול לדלוף מטעות בתצוגה.

   ⚠ **תעודת זהות ותאריך לידה נכללים.** הם כבר גלויים לכל
     הצוות בלוח החניכים ב-monday, ולכן המסך אינו מרחיב חשיפה —
     הוא חוסך פתיחה של הלוח. אם יוחלט לצמצם, המקום היחיד
     לעשות זאת הוא כאן.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { studentRows } from "./_student-rows.js";
import { invalidate } from "./_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { guideMap, isGuideOf } from "./_guides.js";
import { loadRequests } from "./_requests.js";
import { loadLeaderWeeks } from "./_leader-weeks.js";
import { placementsFor } from "./_placements.js";
import { identities } from "./_identity.js";
import { phoneHe } from "../shared/mechina-boards.js";

const C = MECHINA_COLS.roster;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res, session) {
  if (req.method === "GET") return read(req, res, session);
  if (req.method === "POST") return write(req, res, session);
  return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
}

async function resolveTarget(req, session, res) {
  const asked = req.query?.student ? String(req.query.student) : null;
  if (asked && asked !== session.itemId && !session.isManager) {
    res.status(403).json({ error: "אפשר לצפות בפרופיל שלך בלבד" });
    return null;
  }
  const id = asked || session.itemId;
  if (!id) { res.status(400).json({ error: "לא צוין חניך" }); return null; }
  const student = (await studentRows()).find((r) => r.id === id);
  if (!student) { res.status(404).json({ error: "החניך אינו נמצא" }); return null; }
  return student;
}

async function read(req, res, session) {
  try {
    const student = await resolveTarget(req, session, res);
    if (!student) return;
    const guide = (await guideMap()).get(student.id) || null;
    const talksEditable = isGuideOf(session, guide) || Boolean(session.isHead);
    res.status(200).json({
      id: student.id,
      name: student.name,
      army: student.profile.army,
      tryouts: student.profile.tryouts,
      talks: student.profile.talks,
      canEditArmy: !session.isManager, // החניך ממלא
      /* ⚠ המדריך של החניך בלבד, וראש המכינה. מנהל אחר יראה
         את התאריכים ולא יוכל לשנותם — וחשוב שהמסך ידע את זה
         מראש, אחרת הוא מציע עריכה שתיחסם ב-403. */
      canEditTalks: talksEditable,
      talksBy: guide ? (guide.short || guide.name) : null,
      /* ⚠ נבנה רק לצוות, ואינו קיים בתשובה לחניך. ראו ההערה
         בראש הקובץ. */
      ...(session.isManager ? { staff: await staffView(student, guide) } : {}),
    });
  } catch (e) {
    console.error("[student-profile:read]", e);
    res.status(502).json({ error: "שליפת הפרופיל נכשלה" });
  }
}

/* ============================================================
   התמונה המלאה — לצוות בלבד
   ------------------------------------------------------------
   ⚠ כל מקור נטען במקביל ואף אחד מהם אינו מפיל את המסך. לוח
     שטרם הוקם, או תקלה רגעית ב-monday, מחזירים רשימה ריקה
     ומסומנים ב-`partial` — כדי שהמסך יוכל לומר "לא נטען"
     במקום להציג "אין שיבוצים" על חניך שיש לו חמישה.
   ============================================================ */
async function staffView(student, guide) {
  const failed = [];
  const safe = async (name, fn) => {
    try { return await fn(); }
    catch (e) {
      console.error(`[student-profile:${name}]`, e && e.message);
      failed.push(name);
      return null;
    }
  };

  const [placements, requests, weeks, ident] = await Promise.all([
    safe("placements", () => placementsFor(student.id)),
    safe("requests", async () =>
      (await loadRequests()).filter((r) => r.studentId === student.id)),
    safe("weeks", async () =>
      (await loadLeaderWeeks()).filter((w) => (w.leaderIds || []).includes(student.id))),
    safe("identity", async () =>
      (await identities()).find((r) => r.kind === "student" && r.id === student.id) || null),
  ]);

  return {
    /* ---------- מי הוא ---------- */
    tz: student.tz || null,
    /* ============================================================
       ⚠ **פרטי קשר — בבלוק הצוות בלבד.**

       הם כבר גלויים לכל הצוות בלוח החניכים ב-monday, ולכן המסך
       אינו מרחיב חשיפה — הוא חוסך פתיחה של הלוח (4מא). הבלוק
       הזה נבנה **רק אחרי `session.isManager`** ואינו קיים בכלל
       בתשובה לחניך.

       ⚠ ומה שלא כאן ולא יהיה: כתובת מלאה, פרטי ההורים,
         קופת חולים ובעיה רפואית. הם בלוח, והמערכת אינה קוראת
         אותם (4יג).
       ============================================================ */
    phone: phoneHe(student.phone) || null,
    mail: student.mail || null,
    city: student.city || null,
    allergy: student.allergy || null,
    religion: student.religion || null,
    shirt: student.shirt || null,
    dob: student.dob || null,
    gender: student.gender || null,
    active: student.active,
    /* ⚠ חשבון בדיקה מסומן במפורש. מדריך שיראה אותו ברשימה
       צריך לדעת שהוא אינו חניך. */
    demo: Boolean(student.demo),
    group: guide ? guide.group || null : null,
    guide: guide ? (guide.short || guide.name) : null,
    roles: student.roles || [],
    leader: Boolean(student.leader),

    /* ---------- הכניסה למערכת ----------
       ⚠ הסיסמה לא קיימת כאן ולא בשום מקום — רק האם נבחרה.
         "טרם נרשם" הוא המידע שהמדריך צריך; הסיסמה אינה. */
    account: ident ? {
      registered: Boolean(ident.user && ident.hash),
      user: ident.user || null,
      email: ident.email || null,
      setAt: ident.setAt || null,
    } : null,

    /* ---------- מה הוא עושה ---------- */
    placements: placements || [],
    /* ⚠ **מיפוי מפורש.** שדה שיתווסף ללוח הבקשות לא ידלוף
       מעצמו למסך — עיקרון 4. */
    requests: (requests || []).map((r) => ({
      id: r.id, type: r.type, date: r.date, endDate: r.endDate,
      status: r.status, detail: r.detail || null,
      decidedBy: r.decidedBy, decidedAt: r.decidedAt,
      guideDecision: r.guideDecision, guideBy: r.guideBy,
    })),
    weeks: (weeks || []).map((w) => ({
      id: w.id, num: w.num, name: w.name,
      start: w.start, end: w.end, what: w.what,
    })),

    /* ⚠ מה **לא** נטען. בלי זה, כשל טעינה נראה בדיוק כמו
       "אין נתונים", וזה ההבדל בין מדריך שמרים טלפון לבין
       מדריך שמניח שהכול בסדר. */
    partial: failed.length ? failed : null,
  };
}

async function write(req, res, session) {
  try {
    const student = await resolveTarget(req, session, res);
    if (!student) return;

    const body = req.body ?? (await readJson(req));
    const cols = {};

    if (body.army !== undefined || body.tryouts !== undefined) {
      /* ⚠ שדות החניך. מנהל אינו כותב אותם — הם עדות של החניך
         עצמו, ועריכת צוות הייתה מטשטשת מי אמר מה. */
      if (session.isManager) {
        return res.status(403).json({ error: "שיבוץ ומיונים ממולאים על ידי החניך" });
      }
      if (body.army !== undefined) cols[C.army] = String(body.army).trim().slice(0, 250);
      if (body.tryouts !== undefined) cols[C.tryouts] = String(body.tryouts).trim().slice(0, 250);
    }

    if (body.talks !== undefined) {
      /* ---------- השיחה האישית ----------
         ⚠ המדריך של הקבוצה בלבד, ולא כל איש צוות. השיחה
           האישית היא בין החניך למדריך שלו; מי שקובע לה תאריך
           הוא מי שיושב בה.

         ⚠ ראש המכינה אינו נחסם — אותו כלל כמו בבקשות היציאה.
           חניך שאינו משובץ לקבוצה, או מדריך שיצא לחופשה, לא
           יכולים להשאיר את השיחה תקועה בלי שאיש יוכל לקבוע לה
           תאריך. */
      const guide = (await guideMap()).get(student.id) || null;
      const mine = isGuideOf(session, guide);
      if (!mine && !session.isHead) {
        return res.status(403).json({
          error: guide
            ? `תאריכי השיחה נקבעים על ידי ${guide.short || guide.name}`
            : "תאריכי השיחה נקבעים על ידי המדריך של החניך",
        });
      }
      if (!Array.isArray(body.talks) || body.talks.length !== 3) {
        return res.status(400).json({ error: "נדרשים שלושה תאריכים (או ריק)" });
      }
      const talkCols = [C.talk1, C.talk2, C.talk3];
      body.talks.forEach((t, i) => {
        if (t && !DATE_RE.test(String(t))) throw Object.assign(new Error("תאריך לא תקין"), { code: 400 });
        cols[talkCols[i]] = t ? { date: String(t) } : {};
      });
    }

    if (!Object.keys(cols).length) {
      return res.status(400).json({ error: "לא נשלח שדה לעדכון" });
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.roster, i: student.id, v: JSON.stringify(cols) }
    );
    invalidate("student-rows");

    res.status(200).json({ ok: true, id: student.id });
  } catch (e) {
    if (e.code === 400) return res.status(400).json({ error: e.message });
    console.error("[student-profile:write]", e);
    res.status(502).json({ error: "עדכון הפרופיל נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
