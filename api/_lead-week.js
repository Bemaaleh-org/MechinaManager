/* ============================================================
   /api/students?action=lead-week      שבוע ההובלה — הקונסולה
   /api/students?action=lead-activity  בנק הפעילויות

   ------------------------------------------------------------
   ⚠⚠ **מי נכנס לכאן: מי שמוביל שבוע כלשהו השנה, ואיש הצוות.**

   `session.isLeader` הוא "מוביל **היום**" ו-`leadsAnyWeek` הוא
   "משובץ לשבוע כלשהו". שער שנשען על הראשון סוגר את המסך בפני
   מוביל השבוע הבא — כלומר בפני האדם היחיד שצריך אותו לפני
   שהשבוע מתחיל. זו בדיוק התקלה של 5ב, וההכנה מראש היא כל
   התכלית של המסך הזה.

   ⚠ **ומה שמותר לגעת בו נגזר מהתאריך ולא מדגל.** מוביל עורך
     את **השבועות שלו** — כולל אחרי שהסתיימו, כי הם באחריותו גם
     בדיעבד — ואינו נוגע בשבוע של אחרים. ההרשאה עוברת מעצמה
     בחצות, בלי שאיש יעשה דבר ובלי דיפלוי.

   ------------------------------------------------------------
   ⚠⚠ **הצ׳ק ליסט: תבנית אחת, וסימון שהוא שורה.**

   שורה בלוח הצ׳ק ליסט בלי `שבוע` היא **הגדרה** — מה צריך
   לעשות בכל שבוע הובלה. שורה עם `שבוע` היא משימה של אותו שבוע
   בלבד, שהמובילים הוסיפו לעצמם. אותו לוח, שני תפקידים.

   הסימון אינו עמודה על המשימה אלא **שורה בלוח הביצוע**, כי
   התבנית משותפת לכל השבועות: עמודת "בוצע" על שורת התבנית
   הייתה נכונה לשבוע אחד ושקרית לכל השאר.

   ⚠ **קיום שורה = בוצע**, ואין מצב שלישי שקוף (4צ).
   ⚠ **ואידמפוטנטי**: שני מובילים שלוחצים כמעט יחד שולחים אותה
     כוונה ומקבלים אותה תוצאה (עיקרון 5).

   ------------------------------------------------------------
   ⚠ **החלוקה בין השניים היא שם על שורת הביצוע** ולא עמודה על
     התבנית. "מי לקח מה" משתנה בין שבוע לשבוע, ושדה על ההגדרה
     היה נכון לשבוע אחרון בלבד. וזה **מזהה ושם** — ההפך מלוח
     המשימות האישיות (4מה) ואותו כלל כמו לוח הצוותים (4נ).
   ============================================================ */
import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { todayFor } from "./_attendance-data.js";
import { loadLeaderWeeks, weeksOfStudent } from "./_leader-weeks.js";
import { assignableStudents } from "./_student-rows.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import {
  LEAD_BOARDS as B, LEAD_COLS as C,
  LEAD_WHEN, ACTIVITY_KIND, LEAD_LOG_KIND, leadReady,
} from "../shared/lead-ids.js";

const W = MECHINA_COLS.leaderWeeks;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס (5ז). `text`
   מחזיר את שם התווית שיושבת על אינדקס 5 גם כשאין בחירה. */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const notReady = (res) =>
  res.status(503).json({
    error: "לוחות שבוע ההובלה טרם הוקמו",
    setupRequired: true,
    run: "npm run seed:lead",
  });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ---------------- טעינה ---------------- */

export async function loadChecklist({ force = false } = {}) {
  if (!leadReady()) return [];
  return cached("lead-checklist", async () => {
    const items = await allItems(B.checklist);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      /* ריק = תבנית לכל שבוע */
      week: val(i, C.checklist.week) || null,
      when: status(i, C.checklist.when) || LEAD_WHEN[1],
      body: val(i, C.checklist.body) || null,
      order: num(i, C.checklist.order) ?? 500,
      archived: val(i, C.checklist.archived) === "v",
      by: val(i, C.checklist.by) || null,
    })).filter((t) => t.title);
  }, { force });
}

export async function loadLeadLog({ force = false } = {}) {
  if (!leadReady()) return [];
  return cached("lead-log", async () => {
    const items = await allItems(B.log);
    return items.map((i) => ({
      id: String(i.id),
      kind: status(i, C.log.kind) || LEAD_LOG_KIND[0],
      /* ⚠ **השם נשמר על שורת הביצוע ואינו נשלף מהבנק בכל
         קריאה.** פעילות שהוסתרה עדיין צריכה להיקרא בהיסטוריה,
         וזו הסיבה שמחיקה בבנק היא הסתרה. */
      title: String(i.name || "").trim(),
      ref: val(i, C.log.ref),
      week: val(i, C.log.week),
      date: val(i, C.log.date) || null,
      owner: val(i, C.log.owner) || null,
      ownerName: val(i, C.log.ownerName) || null,
      note: val(i, C.log.note) || null,
    })).filter((r) => r.ref && r.week);
  }, { force });
}

export async function loadActivities({ force = false } = {}) {
  if (!leadReady()) return [];
  return cached("lead-activities", async () => {
    const items = await allItems(B.activities);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      kind: status(i, C.activities.kind) || ACTIVITY_KIND[0],
      body: val(i, C.activities.body) || null,
      minutes: num(i, C.activities.minutes),
      people: num(i, C.activities.people),
      gear: val(i, C.activities.gear) || null,
      link: val(i, C.activities.link) || null,
      by: val(i, C.activities.by) || null,
      archived: val(i, C.activities.archived) === "v",
    })).filter((a) => a.title);
  }, { force });
}

const bust = () => {
  invalidate("lead-checklist"); invalidate("lead-log"); invalidate("lead-activities");
};

/* ============================================================
   מי רשאי
   ------------------------------------------------------------
   ⚠ **איחוד ולא דגל.** דגלי `withAuth` הם AND, והשאלה כאן היא
     "צוות **או** מי שמוביל שבוע כלשהו" — אותו דפוס בדיוק כמו
     `mayArea` (4כב) ו-`mayTeam` (4נ).
   ============================================================ */
function mayEnter(session) {
  return Boolean(!session.isStudent || session.leadsAnyWeek || session.isLeader);
}

/** האם השבוע הזה באחריותי לעריכה. הצוות אינו עורך — הוא קורא. */
async function mayEditWeek(session, weekId) {
  if (session.isStudent) {
    const mine = await weeksOfStudent(session.itemId);
    return mine.some((w) => String(w.id) === String(weekId));
  }
  /* ⚠ **ראש המכינה בלבד מקרב הצוות.** שבוע ההובלה הוא הכלי של
     המובילים, ואיש צוות שמסמן במקומם הופך אותו מכלי לרישום —
     אותו נימוק כמו הצ׳ק ליסט בתורנויות (4צ). */
  return Boolean(session.isHead);
}

/** מי עורך את **התבנית**: ראש המכינה בלבד. זו הגדרה, לא ביצוע. */
const mayEditTemplate = (session) => Boolean(session.isHead);

/* ============================================================
   השבוע להצגה
   ------------------------------------------------------------
   ⚠ **ברירת המחדל היא השבוע שהתאריך נופל בו, ואם אין —
     השבוע הבא שלי.** מוביל שנכנס ביום חמישי לפני השבוע שלו
     מקבל מסך ריק אם ברירת המחדל היא "היום", וזה בדיוק המצב
     שההכנה מראש נועדה לו.
   ============================================================ */
function pickWeek(weeks, mine, today, asked) {
  if (asked) {
    const hit = weeks.find((w) => String(w.id) === String(asked));
    /* ⚠ מזהה שאינו קיים נופל חזרה ואינו זורק — קישור ישן צריך
       להחזיר מסך עובד (4ר). */
    if (hit) return hit;
  }
  const now = mine.find((w) => w.start <= today && today <= w.end);
  if (now) return weeks.find((w) => w.id === now.id);
  const next = mine.filter((w) => w.start > today).sort((a, b) => a.start.localeCompare(b.start))[0];
  if (next) return weeks.find((w) => w.id === next.id);
  const last = mine.filter((w) => w.end < today).sort((a, b) => b.start.localeCompare(a.start))[0];
  if (last) return weeks.find((w) => w.id === last.id);
  return weeks.find((w) => w.start <= today && today <= w.end)
    || weeks.find((w) => w.start > today) || null;
}

/* ============================================================
   הקונסולה
   ============================================================ */
async function weekHandler(req, res, session) {
  if (!leadReady()) return notReady(res);
  if (!mayEnter(session)) {
    return res.status(403).json({ error: "המסך הזה מיועד למובילי שבוע ולצוות" });
  }

  if (req.method === "GET") return weekView(req, res, session);

  const body = req.body ?? (await readJson(req));
  try {
    if (req.method === "POST") return await weekWrite(req, res, session, body);
    if (req.method === "PUT") return await weekEdit(req, res, session, body);
    if (req.method === "DELETE") return await weekDelete(req, res, session, body);
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[lead-week]", e);
    return res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

async function weekView(req, res, session) {
  const today = todayFor(req);
  const [weeks, checklist, log, students] = await Promise.all([
    loadLeaderWeeks(), loadChecklist(), loadLeadLog(), assignableStudents(),
  ]);
  const mine = session.isStudent ? await weeksOfStudent(session.itemId) : weeks;
  const asked = String(req.query?.week || "").trim();
  const week = pickWeek(weeks, mine, today, asked);

  if (!week) {
    /* ⚠ מצב ריק אמיתי ומצב כשל הם שני מסכים (עיקרון 6). כאן
       אין שבועות בלוח כלל — וזה מה שנאמר. */
    return res.status(200).json({
      ok: true, week: null, weeks: [], today,
      me: { id: String(session.itemId || ""), edit: false, template: mayEditTemplate(session) },
    });
  }

  const byId = new Map(students.map((s) => [s.id, s]));
  const leaders = (week.leaderIds || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((s) => ({ id: s.id, name: s.name }));

  const wLog = log.filter((r) => r.week === week.id);
  const doneBy = new Map(wLog.filter((r) => r.kind === "משימה").map((r) => [r.ref, r]));

  /* ⚠ התבנית והמשימות של השבוע באותה רשימה — למוביל אין הבחדה
     בין "מה תמיד עושים" ל"מה הוספנו", ושתי רשימות היו מחייבות
     אותו לקרוא שתיהן כדי לדעת מה נשאר. `own` אומר מה ניתן
     למחוק, וזה כל ההבדל שמעניין אותו. */
  const tasks = checklist
    .filter((t) => !t.archived && (!t.week || t.week === week.id))
    .sort((a, b) => (LEAD_WHEN.indexOf(a.when) - LEAD_WHEN.indexOf(b.when))
      || (a.order - b.order) || a.title.localeCompare(b.title, "he"))
    .map((t) => {
      const hit = doneBy.get(t.id);
      return {
        id: t.id, title: t.title, when: t.when, body: t.body,
        own: Boolean(t.week),
        done: Boolean(hit),
        doneAt: hit ? hit.date : null,
        /* ⚠ מי סימן — זו החלוקה בין השניים, וזו כל התכלית. */
        byId: hit ? hit.owner : null,
        by: hit ? hit.ownerName : null,
      };
    });

  const doneN = tasks.filter((t) => t.done).length;

  /* ⚠ שימושי הפעילויות בשבוע הזה, וגם ההיסטוריה הכללית —
     "מה עשינו" ו"מה כבר נשחק" הן שתי שאלות. */
  const used = wLog.filter((r) => r.kind === "פעילות")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  /* ⚠ **המסירה של השבוע הקודם**, ולא רק שלי. זו כל התכלית של
     מסירת משמרת: מי שנכנס לשבוע צריך לדעת מה נשאר פתוח.

     ⚠ **וקריאה אחת ללוח ולא שתיים** — `loadLeaderWeeks` אינה
       מחזירה את שתי העמודות האלה (הן נוספו אחריה), אבל שתי
       קריאות לאותו לוח באותה בקשה הן בזבוז שנראה תמים
       ומצטבר בכל טעינת מסך. */
  const rows = await allItems(MECHINA_BOARDS.leaderWeeks);
  const rowOf = (id) => rows.find((i) => String(i.id) === String(id));
  const handoverOf = (id) => { const r = rowOf(id); return r ? (val(r, W.handover) || null) : null; };
  const sentOf = (id) => { const r = rowOf(id); return r ? (val(r, W.summarySent) || null) : null; };

  const idx = weeks.findIndex((w) => w.id === week.id);
  const prev = idx > 0 ? weeks[idx - 1] : null;

  res.status(200).json({
    ok: true,
    today,
    me: {
      id: String(session.itemId || ""),
      edit: await mayEditWeek(session, week.id),
      template: mayEditTemplate(session),
      staff: !session.isStudent,
    },
    week: {
      id: week.id, num: week.num, name: week.name,
      start: week.start, end: week.end,
      what: week.what, note: week.note, escort: week.escort,
      leaders,
      summary: week.summary,
      summarySent: sentOf(week.id),
      handover: handoverOf(week.id),
      /* ⚠ המשוב **נקרא ואינו נערך** כאן — הוא של הצוות, ודף
         המובילשיות הוא המקום שלו (5ד). */
      feedback: week.feedback,
      feedbackBy: week.feedbackBy,
    },
    /* ⚠ הקודם, גם כשהוא לא שלי. */
    prev: prev
      ? { id: prev.id, num: prev.num, name: prev.name, handover: handoverOf(prev.id) }
      : null,
    tasks,
    counts: {
      total: tasks.length,
      done: doneN,
      left: tasks.length - doneN,
      /* ⚠ `null` ולא 0 כשאין משימות כלל — 0% נראה כמו "לא
         התקדמתי" בעוד שהאמת היא "אין מה למדוד" (4ג, 5ח). */
      pct: tasks.length ? Math.round((doneN / tasks.length) * 100) : null,
    },
    used: used.map((r) => ({
      id: r.id, ref: r.ref, title: r.title, date: r.date, note: r.note, by: r.ownerName,
    })),
    /* ⚠ **התבנית המלאה — לראש המכינה בלבד, וכולל המוסתרות.**
       מי שעורך את הרשימה צריך לראות גם מה הוסתר, אחרת "הסתרה"
       היא מחיקה שאי אפשר לבטל. לכל השאר השדה אינו קיים בתשובה
       כלל — לא ריק (4מא). */
    ...(mayEditTemplate(session) ? {
      template: checklist
        .filter((t) => !t.week)
        .sort((a, b) => (LEAD_WHEN.indexOf(a.when) - LEAD_WHEN.indexOf(b.when))
          || (a.order - b.order) || a.title.localeCompare(b.title, "he"))
        .map((t) => ({
          id: t.id, title: t.title, when: t.when, body: t.body,
          order: t.order, archived: t.archived,
        })),
    } : {}),
    /* ⚠ **כל השבועות מוחזרים**, לא רק שלי: מוביל שרוצה לראות
       מה עשה השבוע שעבר צריך להגיע לשם. מיפוי מפורש — תאריכים
       ומספר בלבד (4ר). */
    weeks: weeks.map((w) => ({
      id: w.id, num: w.num, name: w.name, start: w.start, end: w.end,
      mine: mine.some((m) => String(m.id) === w.id),
    })),
    when: LEAD_WHEN,
  });
}

/* ---------------- כתיבה ---------------- */

async function weekWrite(req, res, session, body) {
  /* ============================================================
     שורת תבנית — לכל שבועות ההובלה, ולא לשבוע אחד
     ------------------------------------------------------------
     ⚠ **נבדק לפני שנדרש שבוע**, כי לתבנית אין שבוע. סדר הפוך
       היה מחזיר "לא צוין שבוע" על פעולה שאין לה שבוע מעצם
       טבעה — הודעה נכונה חשבונית וחסרת פשר.

     ⚠ **ראש המכינה בלבד.** זו הגדרה של המכינה ולא ביצוע של
       שבוע, וזה אותו כלל של הנהלים בתורנויות: עריכת נוסח היא
       של ראש המכינה, עריכת ביצוע היא של מי שמבצע (4צ).
     ============================================================ */
  if (body?.template === true) {
    if (!mayEditTemplate(session)) {
      return res.status(403).json({ error: "הצ׳ק ליסט הקבוע נערך על ידי ראש המכינה" });
    }
    const title = String(body?.title || "").trim().slice(0, 200);
    if (!title) return res.status(400).json({ error: "לא הוזנה משימה" });
    const when = String(body?.when || "").trim();
    if (when && !LEAD_WHEN.includes(when)) {
      return res.status(400).json({ error: `"${when}" אינו מופיע ברשימה` });
    }
    const id = await createItem(B.checklist, title, {
      /* ⚠ **`week` נשאר ריק, וזה מה שהופך את השורה לתבנית.**
         מחרוזת ריקה ולא null — עמודת טקסט, לא סטטוס (5ז נוגע
         לסטטוס בלבד). */
      [C.checklist.week]: "",
      [C.checklist.when]: { label: when || LEAD_WHEN[1] },
      [C.checklist.body]: String(body?.body || "").trim().slice(0, 3000),
      [C.checklist.order]: String(Number(body?.order) || 500),
      [C.checklist.by]: String(session.name || "").slice(0, 120),
    });
    bust();
    return res.status(200).json({ ok: true, id: String(id), template: true });
  }

  const weekId = String(body?.week || "").trim();
  if (!weekId) return res.status(400).json({ error: "לא צוין שבוע" });
  const weeks = await loadLeaderWeeks();
  const week = weeks.find((w) => w.id === weekId);
  if (!week) return res.status(404).json({ error: "השבוע אינו נמצא" });
  if (!(await mayEditWeek(session, weekId))) {
    return res.status(403).json({ error: "אפשר לערוך רק שבוע שאתה מוביל" });
  }

  /* --- סימון משימה: קיום שורה = בוצע, ואידמפוטנטי --- */
  if (body?.task !== undefined) {
    const taskId = String(body.task);
    const list = await loadChecklist();
    const task = list.find((t) => t.id === taskId);
    if (!task) return res.status(404).json({ error: "המשימה אינה נמצאת" });
    if (task.week && task.week !== weekId) {
      return res.status(404).json({ error: "המשימה אינה נמצאת" });
    }

    const log = await loadLeadLog();
    const hit = log.find((r) => r.kind === "משימה" && r.ref === taskId && r.week === weekId);

    if (body.done === false) {
      if (hit) await deleteItem(hit.id);
      bust();
      return res.status(200).json({ ok: true, task: taskId, done: false });
    }
    /* ⚠ כבר מסומן — מחזירים 200 ולא שגיאה. שני מובילים שלוחצים
       כמעט יחד שולחים אותה כוונה ומקבלים אותה תוצאה. */
    if (hit) return res.status(200).json({ ok: true, task: taskId, done: true, by: hit.ownerName });

    await createItem(B.log, task.title.slice(0, 200), {
      [C.log.kind]: { label: "משימה" },
      [C.log.ref]: taskId,
      [C.log.week]: weekId,
      [C.log.date]: { date: todayFor(req) },
      [C.log.owner]: String(session.itemId || ""),
      [C.log.ownerName]: String(session.name || "").slice(0, 120),
    });
    bust();
    return res.status(200).json({ ok: true, task: taskId, done: true, by: session.name });
  }

  /* --- רישום פעילות שנעשתה --- */
  if (body?.activity !== undefined) {
    const act = (await loadActivities()).find((a) => a.id === String(body.activity));
    if (!act) return res.status(404).json({ error: "הפעילות אינה נמצאת" });
    const date = String(body.date || "").trim() || todayFor(req);
    if (!DATE_RE.test(date)) return res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" });

    const id = await createItem(B.log, act.title.slice(0, 200), {
      [C.log.kind]: { label: "פעילות" },
      [C.log.ref]: act.id,
      [C.log.week]: weekId,
      [C.log.date]: { date },
      [C.log.owner]: String(session.itemId || ""),
      [C.log.ownerName]: String(session.name || "").slice(0, 120),
      [C.log.note]: String(body.note || "").trim().slice(0, 2000),
    });
    bust();
    return res.status(200).json({ ok: true, id: String(id) });
  }

  /* --- משימה שהמובילים מוסיפים לשבוע שלהם --- */
  const title = String(body?.title || "").trim().slice(0, 200);
  if (!title) return res.status(400).json({ error: "לא הוזנה משימה" });
  const when = String(body?.when || "").trim();
  if (when && !LEAD_WHEN.includes(when)) {
    return res.status(400).json({ error: `"${when}" אינו מופיע ברשימה` });
  }
  const id = await createItem(B.checklist, title, {
    [C.checklist.week]: weekId,
    [C.checklist.when]: { label: when || LEAD_WHEN[1] },
    [C.checklist.body]: String(body?.body || "").trim().slice(0, 3000),
    [C.checklist.order]: String(Number(body?.order) || 900),
    [C.checklist.by]: String(session.name || "").slice(0, 120),
  });
  bust();
  return res.status(200).json({ ok: true, id: String(id) });
}

/* ============================================================
   מסירת משמרת, סיכום לצוות, ותבנית
   ------------------------------------------------------------
   ⚠⚠ **הסיכום והמסירה הם שני שדות ושני נמענים.** הסיכום מופנה
     לצוות ומתאר מה היה; המסירה מופנית למובילים הבאים ומתארת מה
     נשאר פתוח. שדה אחד לשניהם הוא מסמך שאיש משניהם אינו קורא.
   ============================================================ */
async function weekEdit(req, res, session, body) {
  /* --- עריכת שורת תבנית: ראש המכינה בלבד --- */
  if (body?.template !== undefined) {
    if (!mayEditTemplate(session)) {
      return res.status(403).json({ error: "עריכת הצ׳ק ליסט היא של ראש המכינה" });
    }
    const id = String(body.template);
    const row = (await loadChecklist()).find((t) => t.id === id);
    if (!row) return res.status(404).json({ error: "השורה אינה נמצאת" });
    const out = {};
    if (body.when !== undefined) {
      const w = String(body.when).trim();
      if (!LEAD_WHEN.includes(w)) return res.status(400).json({ error: `"${w}" אינו ברשימה` });
      out[C.checklist.when] = { label: w };
    }
    if (body.body !== undefined) out[C.checklist.body] = String(body.body).trim().slice(0, 3000);
    if (body.order !== undefined) {
      const n = Number(body.order);
      if (!Number.isFinite(n)) return res.status(400).json({ error: "סדר חייב להיות מספר" });
      out[C.checklist.order] = String(Math.round(n));
    }
    if (body.archived !== undefined) {
      out[C.checklist.archived] = { checked: body.archived ? "true" : "false" };
    }
    if (Object.keys(out).length) await setColumns(B.checklist, id, out);
    if (body.title !== undefined) {
      const t = String(body.title).trim().slice(0, 200);
      if (!t) return res.status(400).json({ error: "הכותרת ריקה" });
      await renameItem(B.checklist, id, t);
    }
    bust();
    return res.status(200).json({ ok: true, id });
  }

  const weekId = String(body?.week || "").trim();
  if (!weekId) return res.status(400).json({ error: "לא צוין שבוע" });
  const week = (await loadLeaderWeeks()).find((w) => w.id === weekId);
  if (!week) return res.status(404).json({ error: "השבוע אינו נמצא" });
  if (!(await mayEditWeek(session, weekId))) {
    return res.status(403).json({ error: "אפשר לערוך רק שבוע שאתה מוביל" });
  }

  const out = {};
  if (body.handover !== undefined) {
    out[W.handover] = String(body.handover).trim().slice(0, 6000);
  }
  if (body.summary !== undefined) {
    out[W.summary] = String(body.summary).trim().slice(0, 6000);
  }
  /* ⚠ **השליחה לצוות היא חותמת ולא דגל.** תאריך אומר מתי, ודגל
     בוליאני אינו אומר דבר חוץ מ"פעם". */
  if (body.send) {
    if (!String(week.summary || "").trim() && !String(body.summary || "").trim()) {
      return res.status(400).json({ error: "אין סיכום לשלוח" });
    }
    out[W.summarySent] = { date: todayFor(req) };
  }
  if (!Object.keys(out).length) return res.status(400).json({ error: "לא נשלח דבר לעדכון" });

  await setColumns(MECHINA_BOARDS.leaderWeeks, weekId, out);
  invalidate("leader-weeks");

  /* ⚠ הדחיפה היא **אחרי** הכתיבה ואינה זורקת — התראה שנכשלה
     אינה סיבה להיכשל בשמירה (5ה). */
  /* ============================================================
     ⚠⚠ **הדחיפה היא נקישה, וההודעה עצמה נבנית ב-`_notify.js`.**

     `_push.js` שולח בלי מטען, וה-Service Worker פונה בעצמו
     ל-`?action=notify` ומציג את מה שמצא (5ה). כלומר דחיפה בלי
     התראה מקבילה מציגה למשתמש בדיוק כלום — ולכן `leadSummaryNotes`
     נוסף שם באותו שינוי, ולא כתוספת נחמדה.

     ⚠ **ואינה זורקת ואינה מעכבת את השמירה.** התראה שנכשלה אינה
       סיבה להיכשל בכתיבה שכבר הצליחה.
     ============================================================ */
  if (body.send) {
    try {
      const { nudgeMany } = await import("./_push-now.js");
      const { authRows } = await import("./_session.js");
      const staff = (await authRows())
        .filter((u) => u.active && u.kind !== "חניך")
        .map((u) => u.id);
      nudgeMany("staff", staff, "סיכום שבוע ההובלה נשלח");
    } catch (e) { console.error("[lead-week push]", e && e.message); }
  }
  return res.status(200).json({ ok: true, week: weekId, sent: Boolean(body.send) });
}

async function weekDelete(req, res, session, body) {
  const id = String(body?.id || "").trim();
  if (!id) return res.status(400).json({ error: "לא צוינה שורה" });

  /* --- שורת ביצוע (רישום פעילות) --- */
  const log = (await loadLeadLog()).find((r) => r.id === id);
  if (log) {
    if (!(await mayEditWeek(session, log.week))) {
      return res.status(404).json({ error: "השורה אינה נמצאת" });
    }
    await deleteItem(id);
    bust();
    return res.status(200).json({ ok: true, id });
  }

  /* --- משימה של השבוע. תבנית נמחקת רק על ידי ראש המכינה --- */
  const task = (await loadChecklist()).find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: "השורה אינה נמצאת" });
  if (!task.week) {
    if (!mayEditTemplate(session)) {
      return res.status(403).json({ error: "מחיקת שורת תבנית היא של ראש המכינה" });
    }
  } else if (!(await mayEditWeek(session, task.week))) {
    return res.status(404).json({ error: "השורה אינה נמצאת" });
  }

  /* ⚠ **וגם שורות הביצוע שלה.** בלעדיהן נשארות שורות שמצביעות
     על משימה שאינה קיימת, ואין מסך שמציג אותן — כלומר הן לא
     יימחקו לעולם (4ק). */
  const kids = (await loadLeadLog()).filter((r) => r.kind === "משימה" && r.ref === id);
  for (const k of kids) { try { await deleteItem(k.id); } catch { /* כבר נמחקה */ } }
  await deleteItem(id);
  bust();
  return res.status(200).json({ ok: true, id, removed: kids.length });
}

/* ============================================================
   בנק הפעילויות
   ------------------------------------------------------------
   ⚠⚠ **הלוח אינו במחזור, וזו כל התכלית.** מוביל שבוע מתחיל מדף
     ריק, ומה שהמחזור הקודם המציא הולך לאיבוד. לוח שמשוכפל ריק
     בכל שנה מבטל את הסיבה שהוא קיים (4מז).

   ⚠ **כל מי שנכנס למסך מוסיף**, לא רק מי שמוביל השבוע: פעילות
     טובה עולה לרוב אחרי שהיא כבר רצה.

   ⚠ **ומחיקה היא הסתרה** — פעילות שנמחקת משאירה את שורות
     השימוש שלה מצביעות לשומקום, וההיסטוריה של "מה כבר עשינו"
     היא בדיוק מה שהמאגר קיים בשבילו.
   ============================================================ */
async function activityHandler(req, res, session) {
  if (!leadReady()) return notReady(res);
  if (!mayEnter(session)) {
    return res.status(403).json({ error: "המסך הזה מיועד למובילי שבוע ולצוות" });
  }

  try {
    if (req.method === "GET") {
      const [acts, log] = await Promise.all([loadActivities(), loadLeadLog()]);
      const uses = log.filter((r) => r.kind === "פעילות");
      const byRef = new Map();
      for (const u of uses) {
        const cur = byRef.get(u.ref) || { n: 0, last: null };
        cur.n += 1;
        if (!cur.last || (u.date || "") > cur.last) cur.last = u.date;
        byRef.set(u.ref, cur);
      }
      return res.status(200).json({
        ok: true,
        kinds: ACTIVITY_KIND,
        /* ⚠ המוסתרות אינן מוחזרות לבחירה, אבל **כן** נספרות
           בהיסטוריה — שורת שימוש שמצביעה על פעילות מוסתרת
           עדיין אומרת מה עשינו. */
        activities: acts.filter((a) => !a.archived).map((a) => ({
          ...a,
          /* ⚠ נגזר ואינו נשמר: מונה שמור מתיישן ברגע שמישהו
             מוחק שורת שימוש בלוח (4כו). */
          uses: (byRef.get(a.id) || {}).n || 0,
          lastUsed: (byRef.get(a.id) || {}).last || null,
        })),
        archivedCount: acts.filter((a) => a.archived).length,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזן שם לפעילות" });
      const kind = String(body?.kind || "").trim();
      if (kind && !ACTIVITY_KIND.includes(kind)) {
        return res.status(400).json({ error: `"${kind}" אינו סוג מוכר` });
      }
      const out = {
        [C.activities.kind]: { label: kind || ACTIVITY_KIND[0] },
        [C.activities.by]: String(session.name || "").slice(0, 120),
      };
      const bad = fillActivity(out, body);
      if (bad) return res.status(400).json({ error: bad });
      const id = await createItem(B.activities, title, out);
      bust();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוינה פעילות" });
    const row = (await loadActivities()).find((a) => a.id === id);
    if (!row) return res.status(404).json({ error: "הפעילות אינה נמצאת" });

    if (req.method === "PUT") {
      const out = {};
      if (body.kind !== undefined) {
        const k = String(body.kind).trim();
        if (!ACTIVITY_KIND.includes(k)) return res.status(400).json({ error: `"${k}" אינו סוג מוכר` });
        out[C.activities.kind] = { label: k };
      }
      if (body.archived !== undefined) {
        out[C.activities.archived] = { checked: body.archived ? "true" : "false" };
      }
      const bad = fillActivity(out, body);
      if (bad) return res.status(400).json({ error: bad });
      if (Object.keys(out).length) await setColumns(B.activities, id, out);
      if (body.title !== undefined) {
        const t = String(body.title).trim().slice(0, 200);
        if (!t) return res.status(400).json({ error: "השם ריק" });
        await renameItem(B.activities, id, t);
      }
      bust();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      /* ⚠ **הסתרה ולא מחיקה.** שורות השימוש נושאות את המזהה,
         והיסטוריה שמצביעה לשומקום היא בדיוק מה שהמאגר קיים
         כדי למנוע. ההודעה אומרת מה קרה. */
      const used = (await loadLeadLog()).filter((r) => r.kind === "פעילות" && r.ref === id);
      if (used.length) {
        await setColumns(B.activities, id, { [C.activities.archived]: { checked: "true" } });
        bust();
        return res.status(200).json({
          ok: true, id, archived: true, uses: used.length,
          message: `הפעילות הוסתרה ולא נמחקה — היא רצה ${used.length} פעמים, וההיסטוריה נשמרת.`,
        });
      }
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[lead-activity]", e);
    return res.status(502).json({ error: "הפעולה נכשלה" });
  }
}

function fillActivity(out, b) {
  if (b.body !== undefined) out[C.activities.body] = String(b.body || "").trim().slice(0, 6000);
  if (b.gear !== undefined) out[C.activities.gear] = String(b.gear || "").trim().slice(0, 500);
  if (b.link !== undefined) out[C.activities.link] = String(b.link || "").trim().slice(0, 500);
  for (const [key, col, max] of [
    ["minutes", C.activities.minutes, 1440],
    ["people", C.activities.people, 500],
  ]) {
    if (b[key] === undefined) continue;
    const raw = String(b[key] ?? "").trim();
    /* ⚠ ריק אינו אפס — "לא צוין" ו"אפס דקות" הם שני מצבים (4ט). */
    if (!raw) { out[col] = ""; continue; }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > max) return "מספר לא תקין";
    out[col] = String(Math.round(n));
  }
  return null;
}

export const leadWeek = withAuth(weekHandler, { student: true });
export const leadActivity = withAuth(activityHandler, { student: true });
