/* ============================================================
   /api/students?action=mishmar    משמר — הערב ולו״ז המפגשים שלו

   GET                       כל המשמרים שאני רואה, עם המפגשים
   GET    &id=<משמר>         משמר אחד
   POST   { title, date, … }            פתיחת משמר
   POST   { mishmar, title, … }         הוספת מפגש ללו״ז
   POST   { session, score }            דירוג 1–10 (חניך)
   POST   { session, fileData, … }      העלאת דף עזר
   PUT    { id, … }                     עריכת המשמר וסיכום הערב
   PUT    { session, … }                עריכת מפגש, "מה היה", דירוג פתוח
   DELETE { id, force? }                מחיקת משמר (409 כשיש מפגשים)
   DELETE { session }                   מחיקת מפגש

   ------------------------------------------------------------
   משמר הוא ערב לימוד ארוך שהמכינה מקיימת מדי פעם, וצוות מזדמן
   ("צוות משמר") מארגן אותו. המסך הוא **הרשומה של הערב** — מה
   תוכנן, מה היה, דפי העזר, ומה החניכים חשבו על כל מפגש — וזה
   מה שחניך חוזר אליו אחרי חודש.

   ------------------------------------------------------------
   ⚠⚠ **מי מארגן — נגזר, לא נשמר.**

     צוות · אחראי לו״ז · חבר או יו״ר של הצוות המזדמן שמקושר
     למשמר. הקישור הוא מזהה הגדרת שיבוץ (`team`), וההרשאה
     עוברת דרך `mayTeam` על `teamContext` — אותו שער בדיוק של
     מסך הצוותים (4נ). חניך שהוסר מהצוות מאבד את העריכה מיד,
     בלי שאיש ייגע במשמר.

   ⚠ **"בתכנון" אינו יוצא לחניך שאינו מארגן.** לא מוסתר במסך
     — אינו בתשובה (עיקרון 4). מארגן רואה אותו כדי לבנות את
     הלו״ז לפני הפרסום.

   ⚠ **הדירוג — אותו לוח של דירוגי השיעורים.** `meeting` בלוח
     הדירוגים הוא טקסט חופשי, ומזהה מפגש משמר הוא מזהה monday
     שאינו יכול להתנגש עם מזהה מפגש גיליון. לוח דירוגים שני היה
     מכפיל את `loadRatings` ואת מסך הדירוג. ⚠ ולכן `sessions`
     של משמר יכולות להיכנס לארכיון השיעורים דרך `loadSessions`.

   ⚠ **`canRate` נגזר בשרת** (`sessionRatable`): חניך · המפגש
     פתוח לדירוג · תאריך המשמר עבר · המשמר לא בוטל. מסך שיציע
     דירוג שהשרת ידחה הוא הכשל של 4יד.

   ⚠ **תיאור ו"מה היה" הן שתי עמודות** — מה שתכננו ומה שקרה,
     ואי אפשר להבדיל ביניהם כשהם בשדה אחד (4ב).

   ⚠ **מחיקת מפגש מוחקת גם את הדירוגים שלו.** שורת דירוג שמצביעה
     על מזהה שאינו קיים לא תופיע בשום מסך ולא תימחק לעולם (4ק).

   ⚠ **תחום שנופל אינו מפיל את המסך.** לוח הדירוגים או לוח
     השיבוצים שנכשלים נרשמים ב-`partial` ומדווחים — ולא נעלמים
     בשקט כאילו אין דירוגים ואין צוותים (עיקרון 6, 4מא).
   ============================================================ */
import { withAuth } from "./_session.js";
import { allItems, uploadFile } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { todayFor } from "./_attendance-data.js";
import { mayTeam } from "../shared/team.js";
import { teamContext, teamsForStudent } from "./_team-data.js";
import { loadDefinitions } from "./_placements.js";
import { CATEGORY } from "../shared/placements.js";
import { loadRatings, ratingFor, invalidateRatings } from "./_lessons-data.js";
import { LESSON_BOARDS, LESSON_COLS } from "../shared/lessons-boards.js";
import {
  MISHMAR_BOARDS as B, MISHMAR_COLS as C, MISHMAR_STATUS, SESSION_KIND, mishmarReady,
} from "../shared/mishmar-ids.js";

const RT = LESSON_COLS.ratings;

/* ⚠ הראשונה היא ברירת המחדל, האחרונה היא ביטול — לפי הסדר
   ב-shared/mishmar-ids.js, ולא שם מוקלד כאן פעמיים. */
const STATUS_PLANNING = MISHMAR_STATUS[0];
const STATUS_CANCELLED = MISHMAR_STATUS[MISHMAR_STATUS.length - 1];

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const checked = (i, c) => val(i, c) === "v";
/* ⚠ ריק אינו אפס, ו-NaN אינו מספר — שניהם null (4נ). */
const num = (i, c) => {
  const t = val(i, c);
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_FILE = 8 * 1024 * 1024;

const notReady = (res) =>
  res.status(503).json({
    error: "לוחות המשמר טרם הוקמו",
    setupRequired: true,
    run: "npm run seed:mishmar",
  });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/**
 * כל הקבצים של עמודת קובץ אחת, עם כתובת להצגה.
 * ⚠ כמו `photoOf` ב-_faults.js, אבל **כל** ההתאמות ולא הראשונה:
 *   למפגש יכולים להיות מצגת, דף מקורות ותמונה. ה-`value` של
 *   העמודה מחזיק את מזהי הנכסים, ו-`assets` של הפריט (נשלף
 *   במפורש) מחזיק את הכתובות.
 */
function filesOf(item, colId) {
  const col = (item.column_values || []).find((x) => x.id === colId);
  if (!col || !col.value) return [];
  let ids = [];
  try {
    const files = JSON.parse(col.value).files || [];
    ids = files.map((f) => String(f.assetId ?? f.asset_id ?? "")).filter(Boolean);
  } catch { return []; }
  const assets = item.assets || [];
  return ids
    .map((id) => assets.find((a) => String(a.id) === id))
    .filter(Boolean)
    .map((a) => ({ id: String(a.id), name: String(a.name || "קובץ"), url: a.public_url || null }));
}

/* ---------------- טעינה ---------------- */

export async function loadMishmarim({ force = false } = {}) {
  if (!mishmarReady()) return [];
  return cached("mishmar-events", async () => {
    const items = await allItems(B.events);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      date: val(i, C.events.date) || null,
      theme: val(i, C.events.theme) || null,
      team: val(i, C.events.team) || null,
      teamName: val(i, C.events.teamName) || null,
      place: val(i, C.events.place) || null,
      start: val(i, C.events.start) || null,
      end: val(i, C.events.end) || null,
      summary: val(i, C.events.summary) || null,
      status: status(i, C.events.status) || STATUS_PLANNING,
      by: val(i, C.events.by) || null,
      byId: val(i, C.events.byId) || null,
    })).filter((e) => e.title);
  }, { force });
}

export async function loadSessions({ force = false } = {}) {
  if (!mishmarReady()) return [];
  return cached("mishmar-sessions", async () => {
    /* ⚠ assets נשלף במפורש: לעמודת קובץ יש רק שם ב-text,
       והכתובת מגיעה רק מכאן. */
    const items = await allItems(B.sessions, "assets { id name public_url }");
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      mishmar: val(i, C.sessions.mishmar),
      time: val(i, C.sessions.time) || null,
      minutes: num(i, C.sessions.minutes),
      lecturer: val(i, C.sessions.lecturer) || null,
      place: val(i, C.sessions.place) || null,
      kind: status(i, C.sessions.kind) || SESSION_KIND[0],
      desc: val(i, C.sessions.desc) || null,
      summary: val(i, C.sessions.summary) || null,
      files: filesOf(i, C.sessions.files),
      order: num(i, C.sessions.order),
      openRate: checked(i, C.sessions.openRate),
    })).filter((s) => s.title && s.mishmar);
  }, { force });
}

const bust = () => { invalidate("mishmar-events"); invalidate("mishmar-sessions"); };

/* ⚠ שעה, ואז סדר, ואז שם. מפגש בלי שעה יורד לסוף — כמו בלוח
   השיעורים (4כג). */
const bySchedule = (a, b) =>
  (a.time || "99:99").localeCompare(b.time || "99:99")
  || ((a.order ?? 1e9) - (b.order ?? 1e9))
  || a.title.localeCompare(b.title, "he");

/* ============================================================
   מי רשאי מה
   ============================================================ */

/** ניתן לדרג: פתוח · המשמר כבר היה · לא בוטל. טהור, לבדיקות. */
export function sessionRatable(session, event, today) {
  if (!session || !event) return false;
  if (!session.openRate) return false;
  if (!event.date || event.date > String(today || "")) return false;
  if (event.status === STATUS_CANCELLED) return false;
  return true;
}

/**
 * האם אני מארגן את המשמר הזה.
 * ⚠ `memo` הוא מפה לבקשה אחת: רשימה של עשרה משמרים של אותו
 *   צוות שואלת את `teamContext` פעם אחת ולא עשר.
 * ⚠ כישלון בשליפת הצוות הוא "לא" ונרשם ללוג — ולא 502 על מסך
 *   שרובו קריאה.
 */
export async function mayOrganize(session, event, memo) {
  if (session.isManager || session.isScheduler) return true;
  const team = String((event && event.team) || "");
  if (!team) return false;
  const m = memo || new Map();
  if (!m.has(team)) {
    m.set(team, teamContext(team)
      .then((ctx) => Boolean(ctx && !ctx.unsupported && mayTeam(session, ctx).write))
      .catch((e) => { console.error("[mishmar:team]", e && e.message); return false; }));
  }
  return m.get(team);
}

/** ⚠ "בתכנון" יוצא רק למי שמארגן. נבדק בשרת, לא במסך. */
async function visible(session, event, memo) {
  if (!session.isStudent) return true;
  if (event.status !== STATUS_PLANNING) return true;
  return mayOrganize(session, event, memo);
}

/** הצוותים המזדמנים שאפשר לקשר למשמר — כל הפעילים לצוות ולאחראי
    הלו״ז, ולחניך רק אלה שהוא חבר או יו״ר בהם. */
async function adhocTeamsFor(session) {
  if (session.isManager || session.isScheduler) {
    const defs = await loadDefinitions();
    return defs.filter((d) => d.category === CATEGORY.adhoc && !d.archived)
      .map((d) => ({ id: d.id, name: d.name }));
  }
  const mine = await teamsForStudent(session.itemId);
  return mine.filter((t) => t.category === CATEGORY.adhoc)
    .map((t) => ({ id: t.id, name: t.name }));
}

/** הגדרת צוות מזדמן לפי מזהה, או null. ⚠ ולא כל הגדרה — ועדה
    קבועה אינה מארגנת משמר דרך המסך הזה. */
async function adhocDef(id) {
  const defs = await loadDefinitions();
  return defs.find((d) => d.id === String(id) && d.category === CATEGORY.adhoc) || null;
}

/* ============================================================
   מיפוי מפורש לתשובה
   ⚠ `byId` נשאר בפנים. שדה חדש בלוח אינו יוצא מעצמו.
   ============================================================ */
const eventView = (e, { canEdit, sessions }) => ({
  id: e.id,
  title: e.title,
  date: e.date,
  theme: e.theme,
  team: e.team,
  teamName: e.teamName,
  place: e.place,
  start: e.start,
  end: e.end,
  summary: e.summary,
  status: e.status,
  by: e.by,
  canEdit,
  sessions,
});

function sessionView(s, { event, session, ratings, today }) {
  const r = ratingFor(s.id, ratings);
  const me = String(session.itemId || "");
  const mine = session.isStudent
    ? ratings.find((x) => x.meetingId === s.id && x.studentId === me) : null;
  return {
    id: s.id,
    title: s.title,
    time: s.time,
    minutes: s.minutes,
    lecturer: s.lecturer,
    place: s.place,
    kind: s.kind,
    desc: s.desc,
    summary: s.summary,
    files: s.files,
    order: s.order,
    openRate: s.openRate,
    avg: r ? r.avg : null,
    votes: r ? r.votes : 0,
    myScore: mine ? mine.score : null,
    canRate: Boolean(session.isStudent) && sessionRatable(s, event, today),
  };
}

/**
 * כל המשמרים שאני רואה, עם המפגשים שלהם.
 * ⚠ `partial` אומר איזה מקור נכשל — דירוגים שלא נטענו אינם
 *   "אין דירוגים".
 */
async function buildEvents(session, today, { only = null } = {}) {
  const partial = [];
  const [events, sessions, ratings] = await Promise.all([
    loadMishmarim(),
    loadSessions(),
    loadRatings().catch((e) => { console.error("[mishmar:ratings]", e && e.message); partial.push("ratings"); return []; }),
  ]);
  const memo = new Map();
  const out = [];
  for (const e of events) {
    if (only && e.id !== only) continue;
    if (!(await visible(session, e, memo))) continue;
    /* ⚠ צפייה בלבד: withAuth חוסם את הכתיבה ממילא; הכפתור לא
       מוצע כדי שלא ייראה כמו מערכת שבורה (4ע). */
    const canEdit = !session.viewOnly && await mayOrganize(session, e, memo);
    const kids = sessions.filter((s) => s.mishmar === e.id).sort(bySchedule)
      .map((s) => sessionView(s, { event: e, session, ratings, today }));
    out.push(eventView(e, { canEdit, sessions: kids }));
  }
  return { list: out, partial };
}

/* ============================================================
   אימות שדות
   ⚠ מיפוי מפורש ולא פריסה: שדה שאינו ברשימה אינו נכתב. מחרוזת
     ריקה מנקה; שדה שלא נשלח אינו נוגע בקיים.
   ============================================================ */
function fillEvent(out, b) {
  if (b.date !== undefined) {
    const d = String(b.date || "").trim();
    if (!d) out[C.events.date] = "";
    else if (!DATE_RE.test(d)) return "תאריך בפורמט YYYY-MM-DD";
    else out[C.events.date] = { date: d };
  }
  if (b.theme !== undefined) out[C.events.theme] = String(b.theme || "").trim().slice(0, 200);
  if (b.place !== undefined) out[C.events.place] = String(b.place || "").trim().slice(0, 200);
  for (const k of ["start", "end"]) {
    if (b[k] === undefined) continue;
    const t = String(b[k] || "").trim();
    if (t && !TIME_RE.test(t)) return "שעה בפורמט HH:MM";
    out[C.events[k]] = t;
  }
  if (b.status !== undefined) {
    const s = String(b.status || "").trim();
    if (!MISHMAR_STATUS.includes(s)) return `"${s}" אינו מצב מוכר`;
    out[C.events.status] = { label: s };
  }
  if (b.summary !== undefined) out[C.events.summary] = String(b.summary || "").trim().slice(0, 8000);
  return null;
}

function fillSession(out, b) {
  if (b.time !== undefined) {
    const t = String(b.time || "").trim();
    if (t && !TIME_RE.test(t)) return "שעה בפורמט HH:MM";
    out[C.sessions.time] = t;
  }
  for (const k of ["minutes", "order"]) {
    if (b[k] === undefined) continue;
    const raw = String(b[k] ?? "").trim();
    if (!raw) { out[C.sessions[k]] = ""; continue; }
    const n = Number(raw);
    /* ⚠ `Number("שעה")` הוא NaN, וכל השוואה מולו false — האכיפה
       הייתה מתבטלת בשקט (4נ). */
    if (!Number.isInteger(n) || n < 0 || n > 1440) {
      return k === "minutes" ? "משך בדקות — מספר שלם" : "סדר — מספר שלם";
    }
    out[C.sessions[k]] = String(n);
  }
  if (b.lecturer !== undefined) out[C.sessions.lecturer] = String(b.lecturer || "").trim().slice(0, 200);
  if (b.place !== undefined) out[C.sessions.place] = String(b.place || "").trim().slice(0, 200);
  if (b.kind !== undefined) {
    const k = String(b.kind || "").trim();
    if (!SESSION_KIND.includes(k)) return `"${k}" אינו סוג מפגש מוכר`;
    out[C.sessions.kind] = { label: k };
  }
  if (b.desc !== undefined) out[C.sessions.desc] = String(b.desc || "").trim().slice(0, 8000);
  if (b.summary !== undefined) out[C.sessions.summary] = String(b.summary || "").trim().slice(0, 8000);
  if (b.openRate !== undefined) {
    out[C.sessions.openRate] = { checked: b.openRate ? "true" : "false" };
  }
  return null;
}

/* ============================================================
   הצוות המקושר — מי רשאי לקשר, ואל מה
   ------------------------------------------------------------
   ⚠ חניך מקשר רק לצוות שהוא חבר בו — אחרת אפשר היה "להעביר"
     משמר לצוות אחר ולנעול את מי שכתב אותו בחוץ, או להפך.
   ⚠ ניתוק מצוות הוא של הצוות ואחראי הלו״ז: חבר צוות שמנתק
     מאבד את ההרשאה שלו באותה בקשה.
   ============================================================ */
async function resolveTeam(session, teamId) {
  const staffish = session.isManager || session.isScheduler;
  if (!teamId) {
    if (!staffish) return { error: "ניתוק משמר מהצוות המארגן נעשה על ידי הצוות או אחראי הלו״ז", code: 403 };
    return { def: null };
  }
  const def = await adhocDef(teamId);
  if (!def) return { error: "הצוות המארגן חייב להיות צוות מזדמן מלוח השיבוצים", code: 400 };
  if (!staffish && !(await mayOrganize(session, { team: def.id }))) {
    return { error: "אפשר לקשר משמר רק לצוות מזדמן שאתה חבר בו", code: 403 };
  }
  return { def };
}

const organizerHint = (e) =>
  `עריכת המשמר היא של הצוות, אחראי הלו״ז${e.teamName ? ` וחברי "${e.teamName}"` : ""}`;

/**
 * מוחק מפגש **ואת הדירוגים שלו**. ⚠ מזהי הדירוגים באים מלוח
 * הדירוגים עצמו ומסוננים לפי מזהה המפגש המאומת — `deleteItem`
 * שולחת בלי board_id, ומזהה שלא אומת הוא מסלול פתוח (4ס).
 */
async function removeSession(sessionId) {
  let removed = 0;
  try {
    const ratings = await loadRatings({ force: true });
    for (const r of ratings.filter((x) => x.meetingId === sessionId)) {
      try { await deleteItem(r.id); removed++; } catch { /* כבר נמחק */ }
    }
  } catch (e) { console.error("[mishmar:ratings-del]", e && e.message); }
  await deleteItem(sessionId);
  if (removed) invalidateRatings();
  return removed;
}

/* ============================================================
   הנתב
   ============================================================ */
async function handler(req, res, session) {
  if (!mishmarReady()) return notReady(res);

  try {
    const today = todayFor(req);
    const me = String(session.itemId || "");

    /* ---------- קריאה ---------- */
    if (req.method === "GET") {
      const only = String(req.query?.id || "").trim() || null;
      const { list, partial } = await buildEvents(session, today, { only });

      if (only) {
        /* ⚠ 404 ולא 403: משמר בתכנון שאינו שלי לא יאשר את קיומו. */
        if (!list.length) return res.status(404).json({ error: "המשמר אינו נמצא" });
        return res.status(200).json({
          ok: true, today, event: list[0],
          me: { id: me, isStudent: Boolean(session.isStudent) },
          partial,
        });
      }

      let teams = [];
      try { teams = await adhocTeamsFor(session); }
      catch (e) { console.error("[mishmar:teams]", e && e.message); partial.push("teams"); }

      const canCreate = !session.viewOnly
        && Boolean(session.isManager || session.isScheduler || teams.length);

      return res.status(200).json({
        ok: true,
        today,
        /* ⚠ קרוב — היום ומעלה, מהקרוב לרחוק. שהיו — מהאחרון אחורה. */
        upcoming: list.filter((e) => e.date && e.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.start || "").localeCompare(b.start || "")),
        past: list.filter((e) => !e.date || e.date < today)
          .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
        teams,
        canCreate,
        statuses: MISHMAR_STATUS,
        kinds: SESSION_KIND,
        me: { id: me, isStudent: Boolean(session.isStudent) },
        partial,
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ============================================================
       דירוג מפגש — חניך
       ⚠ אותה שורה בדיוק של api/_lesson-rate.js: שם השורה הוא
         מפתח הכפילות, ודירוג חוזר מעדכן ולא מוסיף.
       ============================================================ */
    if (req.method === "POST" && body?.session !== undefined && body?.score !== undefined) {
      if (!session.isStudent) return res.status(403).json({ error: "הדירוג נעשה על ידי חניכים" });
      const score = Number(body.score);
      if (!Number.isInteger(score) || score < 1 || score > 10) {
        return res.status(400).json({ error: "דירוג הוא מספר שלם בין 1 ל-10" });
      }
      const s = (await loadSessions()).find((x) => x.id === String(body.session));
      const e = s && (await loadMishmarim()).find((x) => x.id === s.mishmar);
      if (!s || !e || !(await visible(session, e))) {
        return res.status(404).json({ error: "המפגש אינו נמצא" });
      }
      if (!s.openRate) return res.status(400).json({ error: "המפגש אינו פתוח לדירוג" });
      if (!sessionRatable(s, e, today)) {
        return res.status(400).json({ error: "אפשר לדרג רק אחרי שהמשמר התקיים" });
      }

      const ratings = await loadRatings({ force: true });
      const existing = ratings.find((r) => r.meetingId === s.id && r.studentId === me);
      if (existing) {
        await setColumns(LESSON_BOARDS.ratings, existing.id, { [RT.score]: String(score) });
      } else {
        await createItem(LESSON_BOARDS.ratings,
          `${s.title} · ${e.date} · ${session.name}`.slice(0, 200), {
            [RT.meeting]: s.id,
            [RT.student]: me,
            [RT.score]: String(score),
            [RT.date]: { date: e.date },
          });
      }
      invalidateRatings();
      const r = ratingFor(s.id, await loadRatings({ force: true })) || { avg: score, votes: 1 };
      return res.status(200).json({ ok: true, session: s.id, score, avg: r.avg, votes: r.votes });
    }

    /* ============================================================
       העלאת דף עזר — מארגן
       ============================================================ */
    if (req.method === "POST" && body?.session !== undefined && body?.fileData !== undefined) {
      const s = (await loadSessions()).find((x) => x.id === String(body.session));
      const e = s && (await loadMishmarim()).find((x) => x.id === s.mishmar);
      if (!s || !e || !(await visible(session, e))) {
        return res.status(404).json({ error: "המפגש אינו נמצא" });
      }
      if (!(await mayOrganize(session, e))) return res.status(403).json({ error: organizerHint(e) });

      const buf = Buffer.from(String(body.fileData || ""), "base64");
      if (!buf.length) return res.status(400).json({ error: "הקובץ ריק" });
      if (buf.length > MAX_FILE) return res.status(400).json({ error: "הקובץ גדול מדי — עד 8MB" });

      await uploadFile(s.id, C.sessions.files,
        String(body.fileName || "קובץ").trim().slice(0, 150) || "קובץ",
        buf, String(body.fileMime || "application/octet-stream"));
      bust();
      const fresh = (await loadSessions({ force: true })).find((x) => x.id === s.id);
      return res.status(200).json({ ok: true, session: s.id, files: fresh ? fresh.files : [] });
    }

    /* ============================================================
       הוספת מפגש — מארגן
       ============================================================ */
    if (req.method === "POST" && body?.mishmar !== undefined) {
      const e = (await loadMishmarim()).find((x) => x.id === String(body.mishmar));
      if (!e || !(await visible(session, e))) return res.status(404).json({ error: "המשמר אינו נמצא" });
      if (!(await mayOrganize(session, e))) return res.status(403).json({ error: organizerHint(e) });

      const title = String(body.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת למפגש" });
      const out = {
        [C.sessions.mishmar]: e.id,
        [C.sessions.kind]: { label: SESSION_KIND[0] },
      };
      const bad = fillSession(out, body);
      if (bad) return res.status(400).json({ error: bad });

      const id = await createItem(B.sessions, title, out);
      bust();
      return res.status(200).json({ ok: true, id: String(id), mishmar: e.id });
    }

    /* ============================================================
       פתיחת משמר
       ⚠ חניך פותח משמר **רק בשם צוות מזדמן שהוא חבר בו** — זו
         הדרך היחידה שבה ההרשאה נגזרת מאותו מקום שאוכף אותה.
       ============================================================ */
    if (req.method === "POST") {
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת" });

      const teamId = String(body?.team || "").trim();
      if (!teamId && !(session.isManager || session.isScheduler)) {
        return res.status(403).json({
          error: "משמר נפתח על ידי הצוות, אחראי הלו״ז, או צוות מזדמן שמארגן אותו — יש לבחור צוות",
        });
      }
      const team = teamId ? await resolveTeam(session, teamId) : { def: null };
      if (team.error) return res.status(team.code).json({ error: team.error });

      const out = {
        [C.events.status]: { label: STATUS_PLANNING },
        [C.events.by]: String(session.name || "").slice(0, 120),
        [C.events.byId]: me,
        [C.events.team]: team.def ? team.def.id : "",
        [C.events.teamName]: team.def ? team.def.name : "",
      };
      const bad = fillEvent(out, body);
      if (bad) return res.status(400).json({ error: bad });
      if (!out[C.events.date]) return res.status(400).json({ error: "לא הוזן תאריך למשמר" });

      const id = await createItem(B.events, title, out);
      bust();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    /* ============================================================
       מפגש — עריכה ומחיקה
       ============================================================ */
    if (body?.session !== undefined) {
      const s = (await loadSessions()).find((x) => x.id === String(body.session));
      const e = s && (await loadMishmarim()).find((x) => x.id === s.mishmar);
      /* ⚠ 404 ולא 403 — מפגש של משמר שאיני רואה לא יאשר את קיומו. */
      if (!s || !e || !(await visible(session, e))) {
        return res.status(404).json({ error: "המפגש אינו נמצא" });
      }
      if (!(await mayOrganize(session, e))) return res.status(403).json({ error: organizerHint(e) });

      if (req.method === "PUT") {
        const out = {};
        const bad = fillSession(out, body);
        if (bad) return res.status(400).json({ error: bad });
        if (Object.keys(out).length) await setColumns(B.sessions, s.id, out);
        if (body.title !== undefined) {
          const t = String(body.title || "").trim().slice(0, 200);
          if (!t) return res.status(400).json({ error: "הכותרת ריקה" });
          await renameItem(B.sessions, s.id, t);
        }
        bust();
        return res.status(200).json({ ok: true, session: s.id });
      }
      if (req.method === "DELETE") {
        const ratingsRemoved = await removeSession(s.id);
        bust();
        return res.status(200).json({ ok: true, session: s.id, ratingsRemoved });
      }
      return res.status(405).json({ error: "מתודה לא נתמכת" });
    }

    /* ============================================================
       משמר — עריכה ומחיקה
       ============================================================ */
    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין משמר" });
    const e = (await loadMishmarim()).find((x) => x.id === id);
    if (!e || !(await visible(session, e))) return res.status(404).json({ error: "המשמר אינו נמצא" });
    if (!(await mayOrganize(session, e))) return res.status(403).json({ error: organizerHint(e) });

    if (req.method === "PUT") {
      const out = {};
      if (body.team !== undefined) {
        const team = await resolveTeam(session, String(body.team || "").trim());
        if (team.error) return res.status(team.code).json({ error: team.error });
        out[C.events.team] = team.def ? team.def.id : "";
        out[C.events.teamName] = team.def ? team.def.name : "";
      }
      const bad = fillEvent(out, body);
      if (bad) return res.status(400).json({ error: bad });
      /* ⚠ תאריך אינו ניתן למחיקה — משמר בלי תאריך אינו "קרוב"
         ואינו "היה", ולא יופיע באף רשימה. */
      if (out[C.events.date] === "") return res.status(400).json({ error: "למשמר חייב להיות תאריך" });
      if (Object.keys(out).length) await setColumns(B.events, e.id, out);
      if (body.title !== undefined) {
        const t = String(body.title || "").trim().slice(0, 200);
        if (!t) return res.status(400).json({ error: "הכותרת ריקה" });
        await renameItem(B.events, e.id, t);
      }
      bust();
      return res.status(200).json({ ok: true, id: e.id });
    }

    if (req.method === "DELETE") {
      const kids = (await loadSessions()).filter((s) => s.mishmar === e.id);
      /* ⚠ מחיקה שקטה של לו״ז שלם היא בדיוק סוג הפעולה שאי אפשר
         לתקן (4ק). ההודעה אומרת כמה יש, והמסך מאשר במפורש. */
      if (kids.length && !body.force) {
        return res.status(409).json({
          error: `בלו״ז של המשמר יש ${kids.length} מפגשים. מחיקת המשמר תמחק גם אותם ואת הדירוגים שלהם.`,
          sessions: kids.length,
        });
      }
      let ratingsRemoved = 0;
      for (const k of kids) {
        try { ratingsRemoved += await removeSession(k.id); } catch { /* כבר נמחק */ }
      }
      await deleteItem(e.id);
      bust();
      return res.status(200).json({ ok: true, id: e.id, removed: kids.length, ratingsRemoved });
    }
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    if (/תאריך בדיקה/.test(String(e && e.message))) return res.status(400).json({ error: e.message });
    console.error("[mishmar]", e);
    return res.status(502).json({ error: "פעולת המשמר נכשלה" });
  }
}

/* ⚠ {student:true} פותח לחניכים; ההרשאה האמיתית בתוך ההנדלר —
   מי מארגן נגזר מהצוות המקושר, ו-withAuth אינו יכול לבטא
   "או־או" (4כב). */
export default withAuth(handler, { student: true });
