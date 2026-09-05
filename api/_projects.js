/* ============================================================
   /api/students?action=projects — הפרויקטים של החניך

     GET                                   הפרויקטים שלי, מלאים
     POST   { name, kind, about, … }       פרויקט חדש
     PUT    { id, … }                      עריכה
     DELETE { id }                         מחיקה (רק אם ריק)

   ------------------------------------------------------------
   ⚠⚠⚠ **הצוות אינו רואה כאן דבר — וזו לא מגבלה טכנית.**

   זו נקודת הקצה **השנייה** במערכת שבה `isManager` אינו מרחיב
   גישה אלא מבטל אותה, אחרי משימות בעלי התפקידים (4מה). והנימוק
   זהה: פרויקט הוא המקום שבו חניך מנסה דברים. הוא מתכנן תקציב
   שאולי לא יסתדר, כותב משימות שאולי לא יבוצעו, ומשנה מטרה
   באמצע. ברגע שהוא יודע שמישהו קורא — הוא כותב אחרת, וזה כבר
   לא כלי עבודה אלא דוח.

   ⚠ **הכלל נאכף כאן, בשורה אחת, לפני כל דבר אחר** — ולא
     בסינון בכל מסלול בנפרד. מסלול שייכתב מחר מוגן מעצמו.

   ⚠ **ומה שאי אפשר להסתיר**: הלוחות יושבים ב-monday, ולאיש
     צוות עם גישה ללוח יש גישה אליהם. אין טריק שסוגר את זה. מה
     שהמערכת כן מבטיחה: היא אינה בונה כלי לקרוא אותם, ועמודת
     הבעלים מחזיקה **מזהה בלבד ולא שם** — הלוח נקרא כרשימת
     פרויקטים, לא כיומן של אדם.

   ------------------------------------------------------------
   ⚠ **404 ולא 403 על פרויקט של מישהו אחר.** 403 מאשר שהשורה
     קיימת (4מה).

   ⚠ **פרויקט קבוצתי הוא מצב רגיל.** `partners` מחזיק מזהי
     חניכים, וכל שותף רואה ועורך. השותפים נבחרים על ידי
     הבעלים מתוך `assignableStudents` — ומאומתים בשרת, אחרת
     אפשר היה לשתף מזהה שרירותי ולראות מה יש בו.

   ⚠ **התקציב נגזר ואינו נשמר.** "כמה תוכנן" הוא מספר על
     הפרויקט; "כמה יצא בפועל" הוא סכום התנועות. שני מספרים
     שנשמרים בנפרד נפרדים זה מזה ביום הראשון (4יז).
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { assignableStudents } from "./_student-rows.js";
import {
  PROJECT_BOARDS as B, PROJECT_COLS as C,
  PROJECT_STATUS, PROJECT_KIND, MONEY_KIND, MONEY_CAT, ENTRY_KIND,
  PROJECT_CLOSED, projectsReady,
} from "../shared/projects-ids.js";
import { loadEntries } from "./_project-entries.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס, ולא `text` —
   תווית שיושבת על אינדקס 5 מוחזרת לכל תא ריק (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const num = (i, c) => {
  const t = val(i, c);
  return t === "" ? null : Number(t);
};
const ids = (t) => String(t || "").split(",").map((x) => x.trim()).filter(Boolean);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------------- טעינה ---------------- */

export async function loadProjects({ force = false } = {}) {
  if (!projectsReady()) return [];
  return cached("projects", async () => {
    const items = await allItems(B.projects);
    return items.map((i) => ({
      id: String(i.id),
      name: String(i.name || "").trim(),
      owner: val(i, C.projects.owner),
      partners: ids(val(i, C.projects.partners)),
      status: status(i, C.projects.status) || null,
      kind: status(i, C.projects.kind) || null,
      about: val(i, C.projects.about) || null,
      goal: val(i, C.projects.goal) || null,
      start: val(i, C.projects.start) || null,
      due: val(i, C.projects.due) || null,
      budget: num(i, C.projects.budget),
      archived: val(i, C.projects.archived) === "v",
      /* ⚠⚠ **שיתוף הוא בחירה של החניך, ולא הרשאה בשרת.** הצוות
         עדיין אינו יכול לקרוא את הפרויקטים — מה שהוא רואה הוא
         רק מה שסומן כאן במפורש, ורק דרך המסלול של בקשות
         התקציב. שתי החלטות נפרדות: */
      shared: Boolean(C.projects.shared) && val(i, C.projects.shared) === "v",
      shareNote: (C.projects.shareNote && val(i, C.projects.shareNote)) || null,
      legacy: Boolean(C.projects.legacy) && val(i, C.projects.legacy) === "v",
    })).filter((p) => p.name && p.owner);
  }, { force });
}

export async function loadProjectTasks({ force = false } = {}) {
  if (!projectsReady()) return [];
  return cached("project-tasks", async () => {
    const items = await allItems(B.tasks);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      project: val(i, C.tasks.project),
      done: val(i, C.tasks.done) === "v",
      due: val(i, C.tasks.due) || null,
      owner: val(i, C.tasks.owner) || null,
      note: val(i, C.tasks.note) || null,
      /* ריק = "בלי שלב", וזה מצב תקין ולא חסר. */
      stage: (C.tasks.stage && val(i, C.tasks.stage)) || null,
      /* ⚠ עומק אחד בלבד — ראו tools/seed-projects2.mjs. */
      parent: (C.tasks.parent && val(i, C.tasks.parent)) || null,
    })).filter((t) => t.title && t.project);
  }, { force });
}

export async function loadProjectMoney({ force = false } = {}) {
  if (!projectsReady()) return [];
  return cached("project-money", async () => {
    const items = await allItems(B.budget);
    return items.map((i) => ({
      id: String(i.id),
      title: String(i.name || "").trim(),
      project: val(i, C.budget.project),
      kind: status(i, C.budget.kind) || MONEY_KIND[0],
      amount: num(i, C.budget.amount),
      date: val(i, C.budget.date) || null,
      note: val(i, C.budget.note) || null,
      category: (C.budget.category && status(i, C.budget.category)) || null,
    })).filter((m) => m.title && m.project);
  }, { force });
}

const invalidateAll = () => {
  invalidate("projects"); invalidate("project-tasks");
  invalidate("project-money"); invalidate("project-entries");
};

/** האם החניך שייך לפרויקט — בעלים או שותף. */
const mine = (p, id) =>
  String(p.owner) === String(id) || p.partners.map(String).includes(String(id));

/**
 * הפרויקט, אם החניך שייך אליו. אחרת null.
 * ⚠ מיוצא כדי שכל מסלולי הבן ישתמשו **באותה** בדיקת שייכות.
 *   שתי גרסאות שלה נפרדות זו מזו בתיקון הראשון, וזו בדיקת
 *   הרשאה — לא נוחות.
 */
export async function mineProject(projectId, studentId) {
  const p = (await loadProjects()).find((x) => x.id === String(projectId || ""));
  return p && mine(p, studentId) ? p : null;
}

/* ============================================================
   תבניות פרויקט
   ------------------------------------------------------------
   ⚠ **בקוד ולא בלוח, ובכוונה.** תבנית אינה נתון של המכינה אלא
     נקודת פתיחה — והיא נועדה להיערך מיד אחרי היצירה. אילו ישבה
     בלוח, כל שינוי בה היה "מה שמישהו קבע" במקום הצעה.

   ⚠ **חניך שמתחיל מדף ריק לרוב לא מתחיל.** זו כל התכלית: שלוש
     משימות ראשונות ושלושה שלבים, שאפשר למחוק בשנייה.
   ============================================================ */
const TEMPLATES = [
  {
    key: "event", name: "אירוע",
    about: "ערב, טקס, יום שיא — משהו עם תאריך ואורחים",
    stages: ["תכנון וגיבוש רעיון", "הפקה — ציוד, מקום, כיבוד", "היום עצמו", "סיכום ולקחים"],
    tasks: ["להחליט תאריך ומקום", "לבנות תקציב", "לחלק תפקידים בצוות",
      "לפרסם לחניכים", "לסכם מה עבד ומה לא"],
  },
  {
    key: "community", name: "יוזמה קהילתית",
    about: "פעילות בקיבוץ או בסביבה — עם שותפים מחוץ למכינה",
    stages: ["להבין מה צריך", "לגייס שותפים", "הרצה ראשונה", "המשכיות"],
    tasks: ["לדבר עם מי שזה נוגע לו", "לבדוק מה כבר קיים",
      "לקבוע פגישה עם גורם בקיבוץ", "להריץ פעם אחת ולראות"],
  },
  {
    key: "business", name: "עסק קטן",
    about: "משהו שמוכר או מגייס כסף",
    stages: ["רעיון ובדיקת היתכנות", "הקמה", "מכירה ראשונה", "תפעול שוטף"],
    tasks: ["לחשב כמה זה עולה לייצר", "לקבוע מחיר", "לבדוק על מי זה עובד",
      "למכור פעם אחת"],
  },
  {
    key: "learn", name: "למידה או מחקר",
    about: "להעמיק בנושא ולהעביר אותו הלאה",
    stages: ["לבחור שאלה", "ללמוד", "להעביר"],
    tasks: ["לנסח את השאלה במשפט אחד", "למצוא שלושה מקורות",
      "לסכם בכתב", "להעביר לקבוצה"],
  },
];

/* ============================================================
   הסיכום — נגזר, ואינו נשמר
   ============================================================ */
function summarize(p, tasks, money, entries = []) {
  const t = tasks.filter((x) => x.project === p.id);
  const m = money.filter((x) => x.project === p.id);
  const st = entries.filter((x) => x.project === p.id && x.kind === "שלב");

  const done = t.filter((x) => x.done).length;
  /* ⚠ **בלי משימות `pct` הוא `null` ולא 0.** 0% נראה כמו נתון
     ("לא התקדמתי") בעוד שהאמת היא "אין עדיין מה למדוד" —
     אותו כלל בדיוק כמו התקדמות ועדה (4נ) ואחוז נוכחות (4ג). */
  const pct = t.length ? Math.round((done / t.length) * 100) : null;

  const sum = (kind) => m.filter((x) => x.kind === kind)
    .reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const spent = Math.round(sum("הוצאה") * 100) / 100;
  const income = Math.round(sum("הכנסה") * 100) / 100;

  /* ⚠ **תנועה בלי סכום נספרת ומדווחת ואינה מושמטת בשקט** —
     היא בדיוק המקום שבו הסכום מפסיק להתאים למה שקרה (4ט). */
  const noAmount = m.filter((x) => x.amount == null).length;

  return {
    tasks: t.length, tasksDone: done, pct,
    open: t.length - done,
    /* ⚠ "עבר היעד" נספר רק על מה שטרם בוצע. */
    late: t.filter((x) => !x.done && x.due && x.due < todayIso()).length,
    spent, income,
    /* ⚠ ריק אינו אפס: תקציב שלא הוזן אינו "אפס שקלים". */
    left: p.budget == null ? null : Math.round((p.budget - spent + income) * 100) / 100,
    over: p.budget != null && spent - income > p.budget,
    noAmount,
    /* ⚠ **פירוט לפי קטגוריה — רק להוצאות.** "כמה עלו החומרים"
       היא שאלה; "כמה נכנס מחומרים" אינה. */
    byCategory: MONEY_CAT
      .map((c) => ({
        category: c,
        amount: Math.round(m.filter((x) => x.kind === "הוצאה" && x.category === c)
          .reduce((a, x) => a + (Number(x.amount) || 0), 0) * 100) / 100,
      }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    stages: st.length,
    stagesDone: st.filter((x) => x.done).length,
    closed: PROJECT_CLOSED.includes(p.status || ""),
  };
}

const todayIso = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ============================================================
   ההנדלר
   ============================================================ */
async function handler(req, res, session) {
  if (!projectsReady()) {
    /* עיקרון 6: כשל הקמה נראה אחרת מ"אין פרויקטים". */
    return res.status(503).json({ error: "לוחות הפרויקטים טרם הוקמו", setupRequired: true });
  }

  /* ⚠⚠ השורה שמחזיקה את כל ההבטחה. ראו ההערה בראש הקובץ. */
  if (!session.isStudent) {
    return res.status(403).json({
      error: "הפרויקטים שייכים לחניכים. הצוות אינו רואה אותם — גם לא ראש המכינה.",
    });
  }

  const me = String(session.itemId);
  const body = ["POST", "PUT", "DELETE"].includes(req.method)
    ? (req.body ?? (await readJson(req))) : {};

  try {
    if (req.method === "GET") return list(res, me);
    if (req.method === "POST") return create(res, me, body);
    if (req.method === "PUT") return edit(res, me, body);
    if (req.method === "DELETE") return remove(res, me, body);
    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[projects]", e);
    res.status(502).json({ error: "פעולת הפרויקטים נכשלה" });
  }
}

async function list(res, me) {
  const [projects, tasks, money, entries, students] = await Promise.all([
    loadProjects(), loadProjectTasks(), loadProjectMoney(), loadEntries(), assignableStudents(),
  ]);
  const byId = new Map(students.map((s) => [String(s.id), s.name]));
  const ours = projects.filter((p) => mine(p, me));

  const full = ours.map((p) => ({
    ...p,
    /* ⚠ שם השותף נגזר בשרת מהמזהה, ואינו נשמר בלוח. שם שמור
       אינו מתעדכן כשחניך משנה שם. */
    partnerNames: p.partners.map((id) => byId.get(String(id)) || "חניך שאינו פעיל"),
    isOwner: String(p.owner) === me,
    tasks: tasks.filter((t) => t.project === p.id)
      .map((t) => ({ ...t, ownerName: t.owner ? (byId.get(String(t.owner)) || null) : null }))
      .sort((a, b) => Number(a.done) - Number(b.done)
        || (a.due || "9999").localeCompare(b.due || "9999")),
    money: money.filter((m) => m.project === p.id)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    /* ⚠ שלבים לפי `order` ואז תאריך: שני שלבים באותו שבוע הם
       מצב רגיל, והסדר ביניהם הוא החלטה של החניך ולא של הלוח. */
    stages: entries.filter((e) => e.project === p.id && e.kind === "שלב")
      .sort((a, b) => a.order - b.order || (a.date || "9999").localeCompare(b.date || "9999")),
    /* היומן הפוך — האחרון למעלה. */
    journal: entries.filter((e) => e.project === p.id && e.kind === "יומן")
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    sum: summarize(p, tasks, money, entries),
  })).sort((a, b) => Number(a.archived) - Number(b.archived)
    || Number(a.sum.closed) - Number(b.sum.closed)
    || (a.due || "9999").localeCompare(b.due || "9999")
    || a.name.localeCompare(b.name, "he"));

  /* ============================================================
     ⚠⚠ **הארכיון — מה שחניכים בחרו במפורש להשאיר.**

     "מה עשו לפנינו" הוא בדיוק מה שחסר למכינה בין מחזורים, וגם
     בדיוק המקום שבו קל לשבור הבטחה. לכן:

       · **רק פרויקטים שסומנו `legacy`** — ברירת המחדל כבויה,
         ואין מסלול שבו מישהו אחר מדליק אותה.
       · **מיפוי מפורש ומצומצם** — שם, סוג, על מה, מטרה, וסטטוס.
         **בלי היומן, בלי התקציב, בלי המשימות ובלי השותפים.**
         אלה הדברים שנכתבו מתוך הנחה שאיש אינו קורא.
       · **בלי שם הבעלים.** מה שעניין את המחזור הבא הוא מה
         נעשה, לא מי עשה — וזו גם ההפחתה שמאפשרת לשתף בכלל.

     ⚠ ומה שנשאר מהמחזור הנוכחי אינו מוצג כאן: אלה הפרויקטים
       של החניך עצמו, והוא רואה אותם ממילא למעלה.
     ============================================================ */
  const legacy = projects
    .filter((p) => p.legacy && !ours.some((x) => x.id === p.id))
    .map((p) => ({
      id: p.id, name: p.name, kind: p.kind, status: p.status,
      about: p.about, goal: p.goal,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));

  return res.status(200).json({
    projects: full,
    legacy,
    statuses: PROJECT_STATUS, kinds: PROJECT_KIND, moneyKinds: MONEY_KIND,
    categories: MONEY_CAT, entryKinds: ENTRY_KIND,
    templates: TEMPLATES.map((t) => ({ key: t.key, name: t.name, about: t.about })),
    /* ⚠ רשימת הבחירה לשותפים — `assignableStudents`, ובלי עצמי. */
    students: students.filter((s) => String(s.id) !== me)
      .map((s) => ({ id: String(s.id), name: s.name })),
  });
}

/** שדות אופציונליים → עמודות. מיפוי מפורש (4ש). */
async function fill(cols, body, me, res) {
  const P = C.projects;
  if (body.status !== undefined) {
    const v = String(body.status || "").trim();
    if (!v) cols[P.status] = null;
    else if (!PROJECT_STATUS.includes(v)) {
      res.status(400).json({ error: `"${v}" אינו סטטוס מוכר` }); return true;
    } else cols[P.status] = { label: v };
  }
  if (body.kind !== undefined) {
    const v = String(body.kind || "").trim();
    if (!v) cols[P.kind] = null;
    else if (!PROJECT_KIND.includes(v)) {
      res.status(400).json({ error: `"${v}" אינו סוג מוכר` }); return true;
    } else cols[P.kind] = { label: v };
  }
  for (const [k, col, max] of [["about", P.about, 4000], ["goal", P.goal, 2000]]) {
    if (body[k] !== undefined) cols[col] = String(body[k] || "").trim().slice(0, max);
  }
  for (const [k, col] of [["start", P.start], ["due", P.due]]) {
    if (body[k] === undefined) continue;
    const d = String(body[k] || "").trim();
    if (!d) cols[col] = "";
    else if (!DATE_RE.test(d)) { res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" }); return true; }
    else cols[col] = { date: d };
  }
  if (body.budget !== undefined) {
    const raw = String(body.budget ?? "").trim();
    /* ⚠ ריק אינו אפס: 0 הוא "בלי תקציב", וריק הוא "לא נקבע". */
    if (!raw) cols[P.budget] = "";
    else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 10000000) {
        res.status(400).json({ error: "תקציב לא תקין" }); return true;
      }
      cols[P.budget] = String(Math.round(n * 100) / 100);
    }
  }
  if (body.archived !== undefined) {
    cols[P.archived] = { checked: body.archived ? "true" : "false" };
  }
  /* ============================================================
     ⚠⚠ **שני שיתופים נפרדים, ובכוונה.**

     `shared` — "הצוות רואה את הפרויקט הזה עכשיו", לבקשת תקציב
     או ליווי. `legacy` — "המחזור הבא יוכל לקרוא עליו".

     אלה שתי החלטות שונות לגמרי: חניך יכול לרצות עזרה עכשיו
     ולא לרצות שהפרויקט יישאר לתמיד, ולהפך. תיבה אחת לשתיהן
     הייתה מכריחה אותו לוותר על אחת מהן.

     ⚠ ושתיהן **של החניך**. אין מסלול שבו הצוות מדליק אותן.
     ============================================================ */
  if (body.shared !== undefined && P.shared) {
    cols[P.shared] = { checked: body.shared ? "true" : "false" };
  }
  if (body.shareNote !== undefined && P.shareNote) {
    cols[P.shareNote] = String(body.shareNote || "").trim().slice(0, 2000);
  }
  if (body.legacy !== undefined && P.legacy) {
    cols[P.legacy] = { checked: body.legacy ? "true" : "false" };
  }
  /* ⚠ **העברת בעלות** — הבעלים בלבד, והוא נבדק אצל הקורא.
     החניך שמקבל חייב להיות שותף כבר: העברה למי שאינו בפרויקט
     הייתה מוציאה את הפרויקט מידי שניהם. */
  if (body.owner !== undefined) {
    const to = String(body.owner || "").trim();
    const known = new Set((await assignableStudents()).map((s) => String(s.id)));
    if (!known.has(to)) { res.status(400).json({ error: "חניך לא מוכר" }); return true; }
    cols[P.owner] = to;
  }
  if (body.partners !== undefined) {
    const want = Array.isArray(body.partners) ? body.partners.map(String) : [];
    /* ⚠⚠ **השותפים מאומתים בשרת.** בלי זה אפשר היה לשתף מזהה
       שרירותי — ואז לקרוא כל פרויקט במערכת דרך "אני שותף בו". */
    const known = new Set((await assignableStudents()).map((s) => String(s.id)));
    const clean = [...new Set(want)].filter((id) => id !== String(me));
    if (clean.some((id) => !known.has(id))) {
      res.status(400).json({ error: "חניך לא מוכר ברשימת השותפים" }); return true;
    }
    cols[P.partners] = clean.join(",");
  }
  return false;
}

async function create(res, me, body) {
  const name = String(body?.name || "").trim().slice(0, 200);
  if (!name) return res.status(400).json({ error: "לא הוזן שם הפרויקט" });

  const cols = { [C.projects.owner]: me };
  if (await fill(cols, body, me, res)) return;
  /* ⚠ ברירת מחדל מפורשת: פרויקט בלי סטטוס אינו מצב שימושי. */
  if (!cols[C.projects.status]) cols[C.projects.status] = { label: PROJECT_STATUS[0] };

  const id = await createItem(B.projects, name, cols);

  /* ============================================================
     ⚠ **התבנית נוצרת אחרי הפרויקט, וכישלון בה אינו מפיל אותו.**
       החניך ביקש לפתוח פרויקט; השלבים והמשימות הם נקודת פתיחה.
       פרויקט שנוצר וחזרה עליו שגיאה הוא בדיוק המצב שבו לוחצים
       שוב ומקבלים שניים.
     ============================================================ */
  const tpl = TEMPLATES.find((t) => t.key === String(body?.template || ""));
  if (tpl && B.entries) {
    try {
      let n = 1;
      for (const st of tpl.stages) {
        await createItem(B.entries, st, {
          [C.entries.project]: String(id),
          [C.entries.kind]: { label: ENTRY_KIND[0] },
          [C.entries.order]: String(n++),
        });
      }
      for (const t of tpl.tasks) {
        await createItem(B.tasks, t, { [C.tasks.project]: String(id) });
      }
    } catch (e) { console.error("[projects:template]", e); }
  }

  invalidateAll();
  return res.status(200).json({ ok: true, id: String(id), template: tpl ? tpl.key : null });
}

async function edit(res, me, body) {
  const id = String(body?.id || "").trim();
  if (!id) return res.status(400).json({ error: "לא צוין פרויקט" });
  const p = (await loadProjects()).find((x) => x.id === id);
  /* ⚠ 404 ולא 403 — 403 מאשר שהשורה קיימת. */
  if (!p || !mine(p, me)) return res.status(404).json({ error: "הפרויקט אינו נמצא" });

  /* ⚠ **שותף עורך את הפרויקט, ואינו משנה את רשימת השותפים
     ואינו מוחק.** אחרת שותף אחד יכול להוציא את השאר. */
  if (body.partners !== undefined && String(p.owner) !== me) {
    return res.status(403).json({ error: "רשימת השותפים נקבעת על ידי מי שפתח את הפרויקט" });
  }
  /* ============================================================
     ⚠⚠ **העברת בעלות — הבעלים בלבד, ורק לשותף קיים.**

     בלי שתי המגבלות האלה שותף יכול היה לקחת לעצמו את הפרויקט,
     או להעביר אותו למישהו שאינו בו — ואז הוא יוצא מידי כולם
     ואיש לא יכול לפתוח אותו. וזה בדיוק סוג התקלה שאין ממנה
     דרך חזרה מהמסך.

     ⚠ **והבעלים הקודם נשאר שותף**, אחרת הוא מאבד גישה לפרויקט
       שהוא בנה ברגע שהעביר אותו.
     ============================================================ */
  if (body.owner !== undefined) {
    if (String(p.owner) !== me) {
      return res.status(403).json({ error: "העברת הבעלות היא בידי מי שפתח את הפרויקט" });
    }
    const to = String(body.owner || "").trim();
    if (!p.partners.map(String).includes(to)) {
      return res.status(400).json({
        error: "אפשר להעביר את הפרויקט רק למי שכבר שותף בו. קודם מוסיפים אותו כשותף.",
      });
    }
    /* הבעלים היוצא נכנס לשותפים, והנכנס יוצא מהם. */
    body.partners = [...p.partners.filter((x) => String(x) !== to), me];
  }

  const cols = {};
  if (await fill(cols, body, me, res)) return;
  if (Object.keys(cols).length) await setColumns(B.projects, id, cols);
  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 200);
    if (!name) return res.status(400).json({ error: "שם הפרויקט ריק" });
    await renameItem(B.projects, id, name);
  }
  invalidateAll();
  return res.status(200).json({ ok: true, id });
}

async function remove(res, me, body) {
  const id = String(body?.id || "").trim();
  if (!id) return res.status(400).json({ error: "לא צוין פרויקט" });
  const p = (await loadProjects()).find((x) => x.id === id);
  if (!p || !mine(p, me)) return res.status(404).json({ error: "הפרויקט אינו נמצא" });
  /* ⚠ **הבעלים בלבד מוחק.** */
  if (String(p.owner) !== me) {
    return res.status(403).json({ error: "מחיקה היא בידי מי שפתח את הפרויקט" });
  }

  /* ============================================================
     ⚠⚠ **המחיקה גוררת את הכול — ובכוונה.**

     קודם פרויקט עם תוכן פשוט **לא נמחק**, וההודעה הציעה ארכיון.
     זה הגן על נתונים, אבל השאיר את החניך בלי דרך למחוק פרויקט
     שהוא פתח בטעות — והארכיון אינו מחיקה, הוא הסתרה.

     עכשיו הוא נמחק תמיד, **וגם כל מה שתלוי בו**: המשימות,
     תנועות התקציב, השלבים והיומן. בלי הגרירה הזו הם נשארים
     בלוח כיתומים שאינם מופיעים בשום מסך — ולכן גם אי אפשר
     למחוק אותם מהמסך. הם רק נצברים.

     ⚠ **המסך אומר כמה ייעלם לפני שהוא שואל.** "בטוח?" על
       פעולה שמוחקת עשרים שורות אינה שאלה שאפשר לענות עליה.

     ⚠ **הבעלים בלבד** — נבדק למעלה. שותף מוחק את עצמו מהשותפים,
       לא את הפרויקט של מישהו אחר.

     ⚠ **וכישלון במחיקת שורה תלויה אינו עוצר את השאר.** עדיף
       שורה יתומה אחת מאשר מחיקה שנעצרה באמצע — ויש
       `npm run projects:orphans` בדיוק בשבילה.
     ============================================================ */
  const [tasks, money, entries] = await Promise.all([
    loadProjectTasks(), loadProjectMoney(), loadEntries(),
  ]);
  const kids = [
    ...tasks.filter((x) => x.project === id),
    ...money.filter((x) => x.project === id),
    ...entries.filter((x) => x.project === id),
  ];
  let failed = 0;
  for (const k of kids) {
    try { await deleteItem(k.id); } catch { failed++; }
  }
  await deleteItem(id);
  invalidateAll();
  return res.status(200).json({
    ok: true, id, removed: kids.length - failed,
    /* ⚠ מדווח ואינו שותק — שורה שנשארה היא שורה שצריך לדעת עליה. */
    ...(failed ? { failed } : {}),
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` — חניך חייב להגיע לכאן, זה המסך שלו.
   הצוות נחסם **בתוך** ההנדלר, בשורה אחת. */
export default withAuth(handler, { student: true });
