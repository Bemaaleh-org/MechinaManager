/* ============================================================
   /api/students?action=recruit    פניות גיוס

   GET                      כל הפניות + מונים + הקישור לשיתוף
   PUT  { id, status, ... } עדכון פנייה (ועדת הגיוסים והצוות)
   DELETE { id }            מחיקת פנייה (ספאם בלבד)

   ------------------------------------------------------------
   ⚠⚠⚠ **הכתיבה לכאן אינה עוברת דרך המערכת הזו.**

   פנייה נכנסת מ**טופס monday** — קישור ציבורי שיושב באתר
   מועצת המכינות, באינסטגרם ובטיקטוק, וכל אדם באינטרנט ממלא
   אותו בלי חשבון ובלי כניסה. הטופס כותב ישירות ללוח, ו-monday
   מטפלת בקבלה, בהצפה ובהגנה מפני בוטים.

   **וזו החלטה ולא קיצור דרך.** נקודת קצה ציבורית שכותבת
   ללוח, במערכת שכל כולה מאחורי `withAuth`, היא משטח התקפה
   חדש שדורש הגבלת קצב, קפצ׳ה, ואימות שאין לו סשן להישען
   עליו — כל זה כדי לשכפל דבר ש-monday כבר עושה. מה שהמערכת
   הזו מוסיפה הוא **הטיפול**: מי לקח, מה נענה, ומה עוד פתוח.

   ⚠ ולכן אין כאן POST. אין מסלול שיוצר פנייה, ואם ייכתב אחד
     — הוא חייב `withAuth` כמו כל השאר.

   ------------------------------------------------------------
   ⚠ **מי רואה: הצוות וּועדת הגיוסים.**

   הוועדה אינה שם בקוד אלא **תיבה בלוח ההגדרות**
   (`PLACEMENT_COLS.definitions.army`) — בלוח יש גם "ועדת
   ידיעת הארץ והכנה לצבא" וגם "ועדת גיוסים", ומחר המכינה
   תאחד או תפצל אותן (5ד). ⚠ **והחברים ולא רק היו״ר**: פניות
   מטופלות על ידי הוועדה, ויו״ר לבדו הוא צוואר בקבוק.

   ⚠ **פרטי הפונה הם של אדם מחוץ למכינה.** שם, טלפון ואימייל
     של נער בן 17 שרק שאל שאלה — ולכן הם אינם יוצאים לאף
     חניך שאינו בוועדה, ואין להם מסלול שני (עיקרון 4).
   ============================================================ */
import { withAuth, actorName } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, deleteItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import { loadDefinitions } from "./_placements.js";
import { teamsForStudent } from "./_team-data.js";
import {
  RECRUIT_BOARDS as B, RECRUIT_COLS as C,
  RECRUIT_STATUS, RECRUIT_STATUSES, recruitReady,
} from "../shared/recruit-ids.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ⚠ `value === null` הוא המבחן לריק בעמודת סטטוס, ולא
   `text === ""` — המשבצת הריקה של monday היא אינדקס 5,
   ו-`text` מחזיר את שם התווית שיושבת עליה (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};

const notReady = (res) =>
  res.status(503).json({
    error: "לוח פניות הגיוס טרם הוקם",
    setupRequired: true,
    run: "npm run seed:recruit",
  });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ---------------- טעינה ---------------- */
export async function loadRecruit({ force = false } = {}) {
  if (!recruitReady()) return [];
  return cached("recruit", async () => {
    const items = await allItems(B.board);
    return items.map((i) => ({
      id: String(i.id),
      name: String(i.name || "").trim(),
      phone: val(i, C.phone) || null,
      email: val(i, C.email) || null,
      kind: status(i, C.kind) || null,
      message: val(i, C.message) || null,
      source: status(i, C.source) || null,
      /* ⚠ ריק = "חדשה". פנייה שנכנסה מהטופס אינה נושאת סטטוס,
         והיא בדיוק זו שממתינה — ברירת מחדל אחרת הייתה מסתירה
         אותה מהרשימה שהוועדה פותחת. */
      status: status(i, C.status) || RECRUIT_STATUS.fresh,
      owner: val(i, C.owner) || null,
      ownerId: val(i, C.ownerId) || null,
      handledAt: val(i, C.handledAt) || null,
      notes: val(i, C.notes) || null,
      date: val(i, C.date) || null,
    })).filter((r) => r.name || r.phone || r.email);
  }, { force });
}

/* ============================================================
   מי רשאי
   ------------------------------------------------------------
   ⚠ איחוד ולא דגל: דגלי `withAuth` הם AND, והשאלה כאן היא
     "צוות **או** מישהו בוועדת הגיוסים". אותו דפוס של `mayArea`
     (4כב) ו-`mayTeam` (4נ).
   ============================================================ */
export async function mayRecruit(session) {
  if (!session.isStudent) return { ok: true, why: "צוות" };
  try {
    const defs = await loadDefinitions();
    const army = defs.filter((d) => d.army && !d.archived);
    if (!army.length) return { ok: false, why: null };

    /* יו״ר של ועדת גיוסים */
    const chaired = army.filter((d) => String(d.chair || "") === String(session.itemId));
    if (chaired.length) return { ok: true, why: "יו״ר " + chaired[0].name };

    /* ⚠ **וגם חבר בוועדה.** פניות מטופלות על ידי הוועדה, ויו״ר
       לבדו הוא צוואר בקבוק — וגם נקודת כשל ביום שהוא במיונים. */
    const ids = new Set(army.map((d) => d.id));
    const mine = await teamsForStudent(session.itemId);
    const inTeam = mine.find((t) => ids.has(t.id));
    if (inTeam) return { ok: true, why: "חבר " + inTeam.name };
  } catch (e) {
    /* ⚠ כשל בטעינת ההגדרות אינו פותח גישה. */
    console.error("[recruit:may]", e && e.message);
  }
  return { ok: false, why: null };
}

/* ============================================================
   ⚠ מיפוי מפורש. הלוח נושא פרטי קשר של אדם מחוץ למכינה,
     ופריסה הייתה מוציאה כל עמודה שתתווסף לו מעצמה (עיקרון 4).
   ============================================================ */
const view = (r, me) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email,
  kind: r.kind,
  message: r.message,
  source: r.source,
  status: r.status,
  owner: r.owner,
  handledAt: r.handledAt,
  notes: r.notes,
  date: r.date,
  /* ⚠ נגזר בשרת כדי שהכפתור יידע מראש (4יד). */
  mine: Boolean(r.ownerId && r.ownerId === me),
});

async function handler(req, res, session) {
  if (!recruitReady()) return notReady(res);

  const may = await mayRecruit(session);
  if (!may.ok) {
    return res.status(403).json({
      error: "פניות הגיוס מנוהלות על ידי ועדת הגיוסים",
    });
  }

  try {
    const me = String(session.itemId || "");

    if (req.method === "GET") {
      const rows = await loadRecruit();
      /* החדשה למעלה — פנייה שנכנסה היום היא זו שממתינה. */
      const list = [...rows].sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || "")) || Number(b.id) - Number(a.id));

      const by = (s) => list.filter((r) => r.status === s).length;
      /* ⚠ **הפילוח לפי מקור הוא כל התועלת התפעולית כאן** —
         הוא אומר איזה ערוץ באמת מביא אנשים, וזו השאלה שבגללה
         מפרסמים בטיקטוק. נגזר ואינו נשמר. */
      const sources = {};
      for (const r of list) if (r.source) sources[r.source] = (sources[r.source] || 0) + 1;

      return res.status(200).json({
        ok: true,
        enquiries: list.map((r) => view(r, me)),
        counts: {
          total: list.length,
          fresh: by(RECRUIT_STATUS.fresh),
          working: by(RECRUIT_STATUS.working),
          answered: by(RECRUIT_STATUS.answered),
          irrelevant: by(RECRUIT_STATUS.irrelevant),
        },
        sources: Object.entries(sources)
          .map(([name, n]) => ({ name, n }))
          .sort((a, b) => b.n - a.n),
        statuses: RECRUIT_STATUSES,
        me: { id: me, why: may.why },
      });
    }

    if (req.method === "PUT") {
      const body = req.body ?? (await readJson(req));
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה פנייה" });

      const rows = await loadRecruit({ force: true });
      const hit = rows.find((r) => r.id === id);
      if (!hit) return res.status(404).json({ error: "הפנייה אינה נמצאת" });

      const cols = {};
      const changed = [];

      if (body.status !== undefined) {
        const s = String(body.status || "").trim();
        if (!RECRUIT_STATUSES.includes(s)) {
          return res.status(400).json({ error: `"${s}" אינו מצב מוכר` });
        }
        if (s !== hit.status) {
          cols[C.status] = { label: s };
          changed.push(s);
          /* ⚠ **מי לקח נרשם בשם, וזו החלוקה בתוך הוועדה.**
             זה ההפך מעיקרון 5 ובמכוון: שם אינו מעקב על חניך
             אלא "מי מדבר עם הבחור הזה", ובלעדיו שניים
             מתקשרים לאותו אדם. אותו נימוק כמו מי סימן בצ׳ק
             ליסט ההובלה (5יא). */
          if (s !== RECRUIT_STATUS.fresh && !hit.ownerId) {
            cols[C.owner] = actorName(session).slice(0, 120);
            cols[C.ownerId] = me;
          }
          /* ⚠ תאריך הטיפול נחתם בסגירה ונמחק כשהיא נפתחת —
             תאריך שנשאר על פנייה שחזרה להיות פתוחה משקר. */
          const closing = s === RECRUIT_STATUS.answered || s === RECRUIT_STATUS.irrelevant;
          cols[C.handledAt] = closing ? { date: israelToday() } : {};
        }
      }

      if (body.notes !== undefined) {
        cols[C.notes] = String(body.notes || "").trim().slice(0, 4000);
        changed.push("הערות");
      }

      /* ⚠ **שחרור הפנייה — מי שלקח בטעות מחזיר אותה.** בלי זה
         פנייה נעולה על מי שנעדר, והוועדה תפתח שורה כפולה. */
      if (body.release === true) {
        cols[C.owner] = "";
        cols[C.ownerId] = "";
        changed.push("שוחררה");
      }

      if (!Object.keys(cols).length) {
        return res.status(400).json({ error: "לא נשלח מה לעדכן" });
      }
      await setColumns(B.board, id, cols);
      invalidate("recruit");
      return res.status(200).json({ ok: true, id, changed });
    }

    /* ⚠ **מחיקה היא לספאם ולא לפנייה שטופלה.** פנייה שנענתה
       היא ההיסטוריה של הגיוס — כמה פנו, מאיפה, ומה שאלו —
       ומחיקתה מוחקת בדיוק את המספר שבגללו הלוח קיים.
       ⚠ ולכן היא חסומה על כל מה שאינו "לא רלוונטי" (4ק). */
    if (req.method === "DELETE") {
      const body = req.body ?? (await readJson(req));
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה פנייה" });

      const hit = (await loadRecruit({ force: true })).find((r) => r.id === id);
      if (!hit) return res.status(404).json({ error: "הפנייה אינה נמצאת" });
      if (hit.status !== RECRUIT_STATUS.irrelevant) {
        return res.status(409).json({
          error: `מחיקה היא לספאם בלבד. לסמן "${RECRUIT_STATUS.irrelevant}" קודם — פנייה שנענתה היא ההיסטוריה של הגיוס.`,
        });
      }
      await deleteItem(id);
      invalidate("recruit");
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[recruit]", e);
    return res.status(502).json({ error: "פעולת פניות הגיוס נכשלה" });
  }
}

/* ⚠ `{student:true}` פותח לחניכים, וההרשאה האמיתית היא
   `mayRecruit` בתוך ההנדלר — `withAuth` אינו יכול לבטא
   "צוות או חבר בוועדה שסומנה בלוח" (4כב). */
export default withAuth(handler, { student: true });
