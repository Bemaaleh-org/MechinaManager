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
  PROJECT_STATUS, PROJECT_KIND, MONEY_KIND, PROJECT_CLOSED, projectsReady,
} from "../shared/projects-ids.js";

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
    })).filter((m) => m.title && m.project);
  }, { force });
}

const invalidateAll = () => {
  invalidate("projects"); invalidate("project-tasks"); invalidate("project-money");
};

/** האם החניך שייך לפרויקט — בעלים או שותף. */
const mine = (p, id) =>
  String(p.owner) === String(id) || p.partners.map(String).includes(String(id));

/* ============================================================
   הסיכום — נגזר, ואינו נשמר
   ============================================================ */
function summarize(p, tasks, money) {
  const t = tasks.filter((x) => x.project === p.id);
  const m = money.filter((x) => x.project === p.id);

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
  const [projects, tasks, money, students] = await Promise.all([
    loadProjects(), loadProjectTasks(), loadProjectMoney(), assignableStudents(),
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
    sum: summarize(p, tasks, money),
  })).sort((a, b) => Number(a.archived) - Number(b.archived)
    || Number(a.sum.closed) - Number(b.sum.closed)
    || (a.due || "9999").localeCompare(b.due || "9999")
    || a.name.localeCompare(b.name, "he"));

  return res.status(200).json({
    projects: full,
    statuses: PROJECT_STATUS, kinds: PROJECT_KIND, moneyKinds: MONEY_KIND,
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
  invalidateAll();
  return res.status(200).json({ ok: true, id: String(id) });
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

  /* ⚠⚠ **פרויקט עם תוכן אינו נמחק — הוא מארכב.** מחיקה שקטה
     של עשרים משימות ותנועות תקציב היא בדיוק סוג הפעולה שאי
     אפשר לתקן, וההודעה אומרת כמה יש ומה לעשות במקום (4ק). */
  const [tasks, money] = await Promise.all([loadProjectTasks(), loadProjectMoney()]);
  const t = tasks.filter((x) => x.project === id).length;
  const m = money.filter((x) => x.project === id).length;
  if (t || m) {
    return res.status(400).json({
      error: `בפרויקט יש ${t} משימות ו-${m} תנועות תקציב. אפשר להעביר אותו לארכיון — `
        + "הוא יורד מהרשימה והכול נשמר.",
      tasks: t, money: m,
    });
  }
  await deleteItem(id);
  invalidateAll();
  return res.status(200).json({ ok: true, id });
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
