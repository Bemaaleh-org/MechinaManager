/* ============================================================
   GET    /api/attendance?action=requests    רשימת הבקשות
   POST   /api/attendance?action=requests    הגשת בקשה חדשה
   PUT    /api/attendance?action=requests    עריכת בקשה ממתינה — החניך
   DELETE /api/attendance?action=requests    ביטול בקשה ממתינה — החניך

   ⚠ חניך רואה את הבקשות שלו בלבד. הסינון בשרת — לא בתצוגה.
     בקשות יציאה נושאות סיבות אישיות ("אבל במשפחה", "מחלה"),
     ואין סיבה שחניך יקרא את אלה של חבריו.

   ⚠ מכסת החופש והכלל "רק ביום שגרה" נבדקים כאן, בשרת. המסך
     חוסם אותם מראש כדי שהחניך לא יגיש לחינם — אבל החסימה
     האמיתית היא זו, אחרת קריאה ישירה לכתובת עוקפת אותה.

   ------------------------------------------------------------
   ⚠ **עריכה וביטול — לבקשה ממתינה בלבד, ועל ידי מי שהגיש.**
     בקשה שהוכרעה אינה נערכת: השינוי היה הופך החלטה שכבר
     ניתנה להחלטה על משהו אחר. מי שצריך לשנות מגיש בקשה חדשה.

   ⚠ **עריכה של הפרטים המהותיים מאפסת את המלצת המדריך.**
     המדריך המליץ על תאריך מסוים ושעות מסוימות; בקשה שהתאריך
     שלה השתנה היא בקשה אחרת, וההמלצה שנשארה עליה הייתה
     מטעה את ראש המכינה. פירוט וקובץ אינם מאפסים — הם
     מוסיפים מידע ואינם משנים את מה שביקשו.

   ⚠ **קובץ מצורף לכל סוג בקשה, ולא למחלה בלבד.** גם היעדרות
     מוצדקת (הזמנה לאירוע, זימון) וגם חופש יכולים לבוא עם
     מסמך, והדרישה "מחלה בלבד" שלחה אותם לוואטסאפ.
   ============================================================ */

import { withAuth } from "./_session.js";
import { studentRows, toPublic } from "./_student-rows.js";
import { gql, allItems, uploadFile } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, deleteItem } from "./_items.js";
import { nudge } from "./_push-now.js";
import {
  loadCalendar, loadAbsences, loadMarked, summarize, vacationRule, israelToday,
} from "./_attendance-data.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, ABSENCE, REQ_STATUS, REQ_STAGE, requestStage,
  vacationCost, appealReady,
} from "../shared/mechina-boards.js";
import { guideMap, isGuideOf } from "./_guides.js";

const R = MECHINA_COLS.requests;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TYPES = [ABSENCE.vacation, ABSENCE.sick, ABSENCE.justified];
/* ⚠ מעל ~4MB גוף הבקשה נחסם על ידי Vercel עוד קודם */
const MAX_FILE = 3.5 * 1024 * 1024;

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const linked = (i, c) => {
  const x = i.column_values.find((y) => y.id === c);
  return x && x.linked_item_ids && x.linked_item_ids[0] ? String(x.linked_item_ids[0]) : null;
};

/* ⚠ הקובץ מזוהה דרך `value` של עמודת הקובץ (assetId), ולא
   `assets[0]` — אותו לקח כמו בתקלות (api/_faults.js). */
function fileOf(item, colId) {
  const col = (item.column_values || []).find((x) => x.id === colId);
  if (!col || !col.value) return null;
  let ids = [];
  try {
    const files = JSON.parse(col.value).files || [];
    ids = files.map((f) => String(f.assetId ?? f.asset_id ?? "")).filter(Boolean);
  } catch { return null; }
  if (!ids.length) return null;
  const hit = (item.assets || []).find((a) => ids.includes(String(a.id)));
  return hit ? hit.public_url : null;
}

export async function loadRequests({ force = false } = {}) {
  return cached("mechina-requests", async () => {
    const items = await allItems(MECHINA_BOARDS.requests, "assets { id public_url }");
    return items
      .map((i) => ({
        id: String(i.id),
        studentId: linked(i, R.student),
        type: val(i, R.type),
        date: val(i, R.date),
        endDate: val(i, R.endDate) || val(i, R.date),
        hasFile: Boolean(val(i, R.file)),
        fileUrl: fileOf(i, R.file),
        detail: val(i, R.detail),
        outAt: val(i, R.outAt) || null,
        backAt: val(i, R.backAt) || null,
        status: val(i, R.status) || REQ_STATUS.pending,
        decidedBy: val(i, R.by) || null,
        decidedAt: val(i, R.decided) || null,
        guideDecision: val(i, R.guide) || null,
        guideBy: val(i, R.guideBy) || null,
        guideAt: val(i, R.guideAt) || null,
        /* ⚠ ריק עד שהעמודות יוקמו, והכול עובד בלעדיהן. */
        appeal: R.appeal ? (val(i, R.appeal) || null) : null,
        appealAt: R.appealAt ? (val(i, R.appealAt) || null) : null,
      }))
      .filter((r) => r.studentId && r.date && r.type)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, { force });
}

export const invalidateRequests = () => invalidate("mechina-requests");

async function handler(req, res, session) {
  if (req.method === "GET") return list(req, res, session);
  if (req.method === "POST") return create(req, res, session);
  if (req.method === "PUT") return edit(req, res, session);
  if (req.method === "DELETE") return withdraw(req, res, session);
  return res.status(405).json({ error: "רק GET, POST, PUT ו-DELETE נתמכים כאן" });
}

/* ---------- קריאה ---------- */
async function list(req, res, session) {
  try {
    const [all, rows, guides] = await Promise.all([
      loadRequests(), studentRows(), guideMap(),
    ]);
    const byId = new Map(rows.map((r) => [r.id, r]));

    // ⚠ הסינון כאן. חניך לעולם לא מקבל בקשות של אחרים.
    const mine = session.isManager ? all : all.filter((r) => r.studentId === session.itemId);

    const wanted = req.query?.status ? String(req.query.status) : null;
    const filtered = wanted ? mine.filter((r) => r.status === wanted) : mine;

    res.status(200).json({
      requests: filtered.map((r) => {
        const guide = guides.get(r.studentId) || null;
        const stage = requestStage(r, Boolean(guide));

        /* ⚠ לחניך יוצאת תשובה אחת: ממתין, מאושר או נדחה. השלבים
           הפנימיים — מי המדריך שלו, מה הוא המליץ, האם הבקשה
           כבר עברה הלאה — הם עניין של הצוות. חניך שיראה
           "המדריך המליץ לדחות" יתחיל לנהל משא ומתן על שלב
           שאינו סופי, ובקשה שנדחתה בסוף תיראה כאילו נדחתה
           פעמיים. מיפוי מפורש ונפרד, לא השמטה — כדי ששדה חדש
           לא ידלוף לכאן מעצמו. */
        if (!session.isManager) {
          return {
            id: r.id,
            type: r.type,
            date: r.date,
            endDate: r.endDate,
            hasFile: r.hasFile,
            fileUrl: r.fileUrl,
            detail: r.detail || null,
            outAt: r.outAt, backAt: r.backAt,
            status: r.status,
            decidedBy: r.decidedBy,
            decidedAt: r.decidedAt,
            /* ⚠ **גם לחניך.** כמה עלתה לו היציאה הוא נתון עליו,
               לא על אחרים, והוא הדבר שהוא ישאל עליו ראשון. */
            cost: r.type === ABSENCE.vacation
              ? vacationCost(r.date, r.outAt, r.endDate, r.backAt) : null,
            /* ⚠ נגזר בשרת כדי שהכפתור יידע מראש (4יד). */
            canEdit: r.status === REQ_STATUS.pending,
            /* ============================================================
               ⚠⚠ **ערר — רק על בקשה שהוכרעה, ורק פעם אחת.**

               בקשה שנדחתה הייתה סוף הדרך במערכת, והשיחה עברה
               לוואטסאפ. הערר מחזיר אותה, ואינו משנה את
               ההחלטה: "נדחה" עם ערר פתוח הוא עדיין "נדחה",
               והחניך אינו יוצא.

               ⚠ **ואי אפשר לערור פעמיים על אותה החלטה.** ערר
                 שני על אותה שורה דורס את הראשון, וראש המכינה
                 מקבל טקסט אחר ממה שקרא אתמול. הכפתור נסגר עד
                 שתתקבל הכרעה חדשה, שמנקה את הערר.
               ============================================================ */
            appeal: r.appeal,
            appealAt: r.appealAt,
            canAppeal: appealReady()
              && r.status !== REQ_STATUS.pending && !r.appeal,
          };
        }

        return {
          id: r.id,
          type: r.type,
          date: r.date,
          endDate: r.endDate,
          hasFile: r.hasFile,
          fileUrl: r.fileUrl,
          detail: r.detail || null,
          /* ⚠ **שעות היציאה והחזרה יוצאות גם לצוות.** הן היו
             במיפוי של החניך בלבד, והמדריך — שבשבילו הן נאספו —
             לא ראה אותן. */
          outAt: r.outAt, backAt: r.backAt,
          /* ⚠ **המחיר נגזר בשרת ונשלח.** הוא נבדק בשרת בכל
             מקרה, ומסך שיחשב אותו בעצמו הוא הגדרה שנייה שתתפצל
             מהראשונה בתיקון הבא — אותה מלכודת של canEdit (4יד).
             null לכל מה שאינו חופש: למחלה אין מחיר במכסה. */
          cost: r.type === ABSENCE.vacation
            ? vacationCost(r.date, r.outAt, r.endDate, r.backAt) : null,
          status: r.status,
          decidedBy: r.decidedBy,
          decidedAt: r.decidedAt,
          /* ---- שני השלבים. ⚠ השלב נגזר, לא נשמר. ---- */
          stage,
          guideName: guide ? guide.short : null,
          groupName: guide ? guide.group : null,
          guideDecision: r.guideDecision,
          guideBy: r.guideBy,
          guideAt: r.guideAt,
          /* ⚠ ראש המכינה מכריע בכל שלב — ראו _request-decide.
             תצוגה בלבד; ההרשאה נאכפת שוב שם. */
          canDecide: stage !== REQ_STAGE.done &&
            (Boolean(session.isHead) ||
             (stage === REQ_STAGE.guide && isGuideOf(session, guide))),
          /* ⚠ באיזה כובע המשתמש הזה מחליט כאן. ראש מכינה מכריע
             תמיד, גם בשלב המדריך — ולכן אצלו הכפתור אומר
             "אישור" ולא "ממליץ לאשר". */
          /* ⚠ הערר מוצג לצוות במלואו — הוא נכתב אליהם. */
          appeal: r.appeal,
          appealAt: r.appealAt,
          /* ⚠ **הכרעה מחדש היא של ראש המכינה בלבד.** המדריך
             ממליץ; הוא אינו הופך החלטה שכבר ניתנה (4א). */
          canRedecide: Boolean(session.isHead) && stage === REQ_STAGE.done,
          decideAs: session.isHead ? "head"
            : (stage === REQ_STAGE.guide && isGuideOf(session, guide)) ? "guide" : null,
          student: byId.get(r.studentId)
            ? toPublic(byId.get(r.studentId))
            : { id: r.studentId, name: "—" },
        };
      }),
      count: filtered.length,
      /* כמה ממתינות *להחלטתי* — מה שממלא את המונה במסך */
      mine: mine.filter((r) => {
        const g = guides.get(r.studentId) || null;
        const st = requestStage(r, Boolean(g));
        return st !== REQ_STAGE.done &&
          (Boolean(session.isHead) ||
           (st === REQ_STAGE.guide && isGuideOf(session, g)));
      }).length,
      pending: mine.filter((r) => r.status === REQ_STATUS.pending).length,
    });
  } catch (e) {
    console.error("[requests:list]", e);
    res.status(502).json({ error: "שליפת הבקשות נכשלה" });
  }
}

/* ============================================================
   הכללים — פעם אחת, להגשה ולעריכה
   ------------------------------------------------------------
   ⚠ **אותה פונקציה בדיוק לשני המסלולים.** שתי גרסאות היו
     נפרדות זו מזו בתיקון הראשון: בקשה שאסור להגיש אבל מותר
     לערוך אליה היא בדיוק החור שדרכו עוקפים מכסה.

   ⚠ `excludeId` — בעריכה הבקשה עצמה אינה נספרת מול עצמה:
     לא כחפיפה ולא כימי חופש שכבר ממתינים.

   מחזירה `{ error }` או `{ fields, span }`.
   ============================================================ */
async function validate({ body, session, excludeId = null }) {
  const type = String(body?.type || "");
  const date = String(body?.date || "").trim();
  /* ⚠ בקשה יכולה להשתרע על כמה ימים. ריק = יום אחד. */
  const endDate = String(body?.endDate || date).trim();
  const detail = String(body?.detail || "").trim().slice(0, 2000);
  const outAt = String(body?.outAt || "").trim();
  const backAt = String(body?.backAt || "").trim();

  if (!TYPES.includes(type)) return { error: "לא נבחר סוג בקשה" };

  /* ============================================================
     ⚠ **שעת יציאה ושעת חזרה — חובה בכל בקשה.**

     זו השאלה התפעולית האמיתית: מתי הוא יוצא ומתי הוא חוזר.
     בלעדיהן המדריך שואל בוואטסאפ בדיוק את מה שהטופס אמור
     היה לתפוס, והתשובה נשארת שם ולא בבקשה.

     ⚠ **הבדיקה בשרת ולא רק ב-`<input type="time">`.** שדה
       שעה בדפדפן ישן מוגש כטקסט חופשי, ובקשה ישירה עוקפת
       אותו לגמרי.

     ⚠ **ואין השוואה בין השעות.** יציאה ב-20:00 וחזרה ב-08:00
       היא לינה בבית, לא טעות — והשוואה נאיבית הייתה חוסמת
       בדיוק את הבקשה הנפוצה ביותר.
     ============================================================ */
  if (!TIME_RE.test(outAt) || !TIME_RE.test(backAt)) {
    return { error: "יש להזין שעת יציאה ושעת חזרה, בפורמט HH:MM" };
  }
  if (!DATE_RE.test(date) || !DATE_RE.test(endDate)) return { error: "תאריך לא תקין" };
  if (endDate < date) return { error: "תאריך הסיום לפני תאריך ההתחלה" };

  const [cal, all, rows, absences, marked] = await Promise.all([
    loadCalendar(), loadRequests({ force: true }), studentRows(), loadAbsences(), loadMarked(),
  ]);

  /* ימי הלימוד שבטווח — עליהם הבקשה חלה בפועל */
  const span = cal.days.filter((d) => d.date >= date && d.date <= endDate);
  if (!span.length) return { error: "הטווח אינו בלוח השנה של המכינה" };
  if (span.length > 21) return { error: "בקשה מוגבלת לשלושה שבועות" };

  const student = rows.find((r) => r.id === session.itemId);
  if (!student) return { error: "החניך אינו נמצא", status: 404 };

  /* ============================================================
     ⚠ **מחלה ומוצדקת מחייבות פירוט, ויום חופש לא.**

     יום חופש הוא זכות במכסה ואינו דורש נימוק — דרישת הסבר
     עליו הופכת אותו לבקשת רשות. מחלה והיעדרות מוצדקת, לעומת
     זאת, הן בדיוק המקרים שבהם המנהל **מכריע**, ובקשה בלי
     פירוט אינה ניתנת להכרעה: הוא יצטרך לחזור לחניך ולשאול,
     וזה יום נוסף שבו הבקשה תלויה.
     ============================================================ */
  if ((type === ABSENCE.justified || type === ABSENCE.sick) && !detail) {
    return {
      error: type === ABSENCE.sick
        ? "בקשה בשל מחלה מחייבת פירוט — מה קרה ומה נדרש"
        : "היעדרות מוצדקת מחייבת פירוט",
    };
  }

  const others = all.filter((r) => r.studentId === session.itemId && r.id !== excludeId);

  const cost = vacationCost(date, outAt, endDate, backAt);

  if (type === ABSENCE.vacation) {
    /* ⚠ כל יום בטווח חייב לעמוד בכלל */
    for (const d of span) {
      const rule = vacationRule(d);
      if (!rule.allowed) {
        return { error: `${d.date.split("-").reverse().join("/")}: ${rule.reason}` };
      }
    }
    if (cost == null) return { error: "לא ניתן לחשב את משך היציאה — בדקו תאריכים ושעות" };

    /* ============================================================
       ⚠⚠ **המכסה נמדדת בשעות ולא בתאריכים שהטווח נוגע בהם.**

       יציאה ב-8.9 ב-08:00 וחזרה ב-9.9 ב-08:00 נגעה בשני
       תאריכים ולכן עלתה שני ימי חופש — בעוד שהיא 24 שעות
       בדיוק, כלומר יום אחד. מתוך מכסה של שלושה למחצית, זו
       טעות של שליש.

       ⚠ **והחיוב נזקף למחצית של תאריך היציאה.** בקשה שחוצה
         את שבוע האמצע היא מקרה נדיר, ופיצול של יום אחד בין
         שתי מכסות אינו ניתן להסבר למי שקורא את המספר.
       ============================================================ */
    const sum = summarize(session.itemId, { absences, marked, byDate: cal.byDate });
    const half = (cal.byDate.get(date) || {}).half;
    const q = half && sum.quota.find((x) => x.half === half);
    if (!q) return { error: "התאריך אינו בתוך מחצית" };

    /* ⚠ בקשה ממתינה **שומרת** את הימים שלה. אחרת אפשר להגיש
       שלוש בקשות של שלושה ימים ולקבל אישור לכולן. וברגע
       שבקשה נדחית או מבוטלת היא מפסיקה להיות ממתינה, והימים
       חוזרים מעצמם — אין מה "להחזיר". */
    const held = others
      .filter((r) => r.type === ABSENCE.vacation && r.status === REQ_STATUS.pending
        && (cal.byDate.get(r.date) || {}).half === half)
      .reduce((n, r) => n + (vacationCost(r.date, r.outAt, r.endDate, r.backAt) ?? 1), 0);

    if (q.used + held + cost > q.total) {
      return {
        error: `הבקשה עולה ${cost} ימי חופש ב${half}, ונשארו ${Math.max(0, q.total - q.used - held)}`,
      };
    }
  }

  /* חפיפה עם בקשה ממתינה קיימת */
  const overlap = others.find((r) =>
    r.status === REQ_STATUS.pending && r.date <= endDate && r.endDate >= date);
  if (overlap) return { error: "כבר קיימת בקשה שממתינה להחלטה בתאריכים האלה", status: 409 };

  return { fields: { type, date, endDate, detail, outAt, backAt }, span, student, cost };
}

/* ---------- הקובץ המצורף ---------- */
function fileFrom(body) {
  if (!body?.fileData) return null;
  const name = String(body.fileName || "מסמך").replace(/[^\w.֐-׿-]/g, "_").slice(0, 80);
  const mime = String(body.fileMime || "application/octet-stream").slice(0, 60);
  let buf = null;
  try { buf = Buffer.from(String(body.fileData), "base64"); } catch { buf = null; }
  if (!buf || !buf.length) return { error: "הקובץ לא נקרא" };
  if (buf.length > MAX_FILE) return { error: "הקובץ גדול מדי — עד 3.5MB" };
  return { name, mime, buf };
}

/* הקובץ עולה אחרי כתיבת השורה. כשל בהעלאה לא מוחק את הבקשה —
   המסך מודיע והחניך יכול לנסות שוב או למסור ידנית. */
async function attach(id, file) {
  if (!file) return null;
  try {
    await uploadFile(id, R.file, file.name, file.buf, file.mime);
    return true;
  } catch (e2) {
    console.error("[requests:file]", e2.message);
    return false;
  }
}

const label = (date, endDate) => (date === endDate ? date : `${date} – ${endDate}`);

/* ---------- הגשה ---------- */
async function create(req, res, session) {
  try {
    if (session.isManager) {
      return res.status(403).json({ error: "בקשת יציאה מוגשת על ידי חניך" });
    }

    const body = req.body ?? (await readJson(req));
    const v = await validate({ body, session });
    if (v.error) return res.status(v.status || 400).json({ error: v.error });
    const { fields: f, span, student } = v;

    const file = fileFrom(body);
    if (file && file.error) return res.status(400).json({ error: file.error });

    const cols = {
      [R.student]: { item_ids: [Number(session.itemId)] },
      [R.type]: { label: f.type },
      [R.date]: { date: f.date },
      [R.status]: { label: REQ_STATUS.pending },
      [R.outAt]: f.outAt,
      [R.backAt]: f.backAt,
    };
    if (f.endDate !== f.date) cols[R.endDate] = { date: f.endDate };
    if (f.detail) cols[R.detail] = f.detail;

    const d = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.requests, n: `${student.name} · ${f.type} · ${label(f.date, f.endDate)}`, v: JSON.stringify(cols) }
    );
    const id = String(d.create_item.id);
    const fileUploaded = await attach(id, file);

    invalidateRequests();
    res.status(200).json({
      ok: true, id, status: REQ_STATUS.pending,
      days: span.length,
      /* ⚠ `days` הוא כמה ימי לימוד הטווח נוגע בהם, ו-`cost` הוא
         כמה ימי חופש הוא עולה. מאז שהמכסה נמדדת בשעות אלה שני
         מספרים שונים, ומספר אחד לשניהם היה מטעה בשניהם (4יח). */
      cost: v.cost,
      fileUploaded,
    });
  } catch (e) {
    console.error("[requests:create]", e);
    res.status(502).json({ error: "שליחת הבקשה נכשלה" });
  }
}

/* ---------- מי שהגיש, ורק כשהיא ממתינה ---------- */
async function ownPending(body, session, res) {
  const id = String(body?.id || "").trim();
  if (!id) { res.status(400).json({ error: "לא צוינה בקשה" }); return null; }
  const all = await loadRequests({ force: true });
  const r = all.find((x) => x.id === id);
  /* ⚠ 404 ולא 403 על בקשה של חניך אחר — 403 מאשר שהיא קיימת. */
  if (!r || r.studentId !== String(session.itemId)) {
    res.status(404).json({ error: "הבקשה אינה נמצאת" }); return null;
  }
  if (r.status !== REQ_STATUS.pending) {
    res.status(409).json({
      error: `הבקשה כבר ${r.status}${r.decidedBy ? ` על ידי ${r.decidedBy}` : ""} — לשינוי מגישים בקשה חדשה`,
    });
    return null;
  }
  return r;
}

/* ============================================================
   ערר על בקשה שהוכרעה
   ------------------------------------------------------------
   ⚠ **החניך שהגיש בלבד**, ו-404 ולא 403 על בקשה של אחר.
   ⚠ **רק על בקשה שהוכרעה** — על בקשה ממתינה אין על מה לערור,
     והיא ניתנת לעריכה ממילא.
   ⚠ **ופעם אחת להכרעה.** ערר שני דורס את הראשון, וראש המכינה
     מקבל טקסט אחר ממה שקרא אתמול. הכרעה חדשה מנקה את הערר,
     ואז אפשר שוב.
   ============================================================ */
async function appeal(body, session, res) {
  if (!appealReady()) {
    return res.status(503).json({
      error: "עמודות הערר טרם הוקמו. הריצו: npm run setup:boards  (או רק: npm run seed:appeal)",
      setupRequired: true,
    });
  }
  const id = String(body?.id || "").trim();
  if (!id) return res.status(400).json({ error: "לא צוינה בקשה" });

  const all = await loadRequests({ force: true });
  const r = all.find((x) => x.id === id);
  if (!r || r.studentId !== String(session.itemId)) {
    return res.status(404).json({ error: "הבקשה אינה נמצאת" });
  }
  if (r.status === REQ_STATUS.pending) {
    return res.status(409).json({
      error: "הבקשה עדיין ממתינה — אפשר לערוך אותה במקום לערור",
    });
  }
  if (r.appeal) {
    return res.status(409).json({
      error: "כבר הוגש ערר על הבקשה הזו, והוא ממתין להכרעה",
    });
  }
  const text = String(body.appeal || "").trim().slice(0, 2000);
  if (!text) return res.status(400).json({ error: "ערר בלי נימוק אינו ערר" });

  await setColumns(MECHINA_BOARDS.requests, id, {
    [R.appeal]: text,
    [R.appealAt]: { date: israelToday() },
  });
  invalidateRequests();

  return res.status(200).json({ ok: true, id, appeal: text });
}

/* ---------- עריכה ---------- */
async function edit(req, res, session) {
  try {
    if (session.isManager) {
      return res.status(403).json({ error: "בקשת יציאה נערכת על ידי החניך שהגיש אותה" });
    }
    const body = req.body ?? (await readJson(req));

    /* ============================================================
       ⚠⚠ **ערר — מסלול נפרד, לפני `ownPending`.**

       `ownPending` דוחה בכוונה כל בקשה שהוכרעה — לשינוי מגישים
       בקשה חדשה. הערר הוא בדיוק ההפך: הוא קיים **רק** על בקשה
       שהוכרעה, ולכן הוא אינו יכול לעבור דרך אותו שער.

       ⚠ **והוא אינו נוגע בסטטוס ואינו נוגע בהיעדרויות.**
         "נדחה" עם ערר פתוח הוא עדיין "נדחה", והחניך אינו יוצא.
         מה שהוא עושה הוא להחזיר את הבקשה לתשומת הלב של ראש
         המכינה, שרשאי להכריע מחדש — או לא.
       ============================================================ */
    if (body?.appeal !== undefined) return appeal(body, session, res);

    const r = await ownPending(body, session, res);
    if (!r) return;

    /* ⚠ שדה שלא נשלח נשאר כפי שהוא. הבדיקה רצה על התמונה
       המלאה — הקיים בתוספת מה שהשתנה — כי המכסה והחפיפה
       נמדדות על הבקשה כולה ולא על השדה שהוקלד. */
    const merged = {
      type: body.type ?? r.type,
      date: body.date ?? r.date,
      endDate: body.endDate ?? r.endDate,
      detail: body.detail ?? r.detail,
      outAt: body.outAt ?? r.outAt,
      backAt: body.backAt ?? r.backAt,
    };
    const v = await validate({ body: merged, session, excludeId: r.id });
    if (v.error) return res.status(v.status || 400).json({ error: v.error });
    const { fields: f, span, student } = v;

    const file = fileFrom(body);
    if (file && file.error) return res.status(400).json({ error: file.error });

    const cols = {};
    const changed = [];
    if (f.type !== r.type) { cols[R.type] = { label: f.type }; changed.push("סוג"); }
    if (f.date !== r.date) { cols[R.date] = { date: f.date }; changed.push("תאריך"); }
    if (f.endDate !== r.endDate) {
      cols[R.endDate] = f.endDate === f.date ? "" : { date: f.endDate };
      changed.push("תאריך סיום");
    }
    if ((f.detail || "") !== (r.detail || "")) { cols[R.detail] = f.detail; changed.push("פירוט"); }
    if (f.outAt !== r.outAt) { cols[R.outAt] = f.outAt; changed.push("שעת יציאה"); }
    if (f.backAt !== r.backAt) { cols[R.backAt] = f.backAt; changed.push("שעת חזרה"); }

    /* ⚠ **שינוי מהותי מאפס את המלצת המדריך** — ראו ההערה בראש.
       הסטטוס נשאר "ממתין", והבקשה חוזרת לשלב הראשון. */
    const essential = ["סוג", "תאריך", "תאריך סיום", "שעת יציאה", "שעת חזרה"];
    const resetGuide = Boolean(r.guideDecision) && changed.some((c) => essential.includes(c));
    if (resetGuide) {
      cols[R.guide] = null;
      cols[R.guideBy] = "";
      cols[R.guideAt] = "";
    }

    if (Object.keys(cols).length) await setColumns(MECHINA_BOARDS.requests, r.id, cols);
    if (cols[R.type] || cols[R.date] || cols[R.endDate]) {
      await renameItem(MECHINA_BOARDS.requests, r.id,
        `${student.name} · ${f.type} · ${label(f.date, f.endDate)}`);
    }
    const fileUploaded = await attach(r.id, file);
    if (file) changed.push("מסמך");

    invalidateRequests();
    /* ⚠ המדריך מקבל נקישה כשההמלצה שלו התאפסה — הבקשה חזרה
       אליו, והוא לא יידע זאת אחרת עד הסבב היומי. */
    if (resetGuide) {
      try {
        const guide = (await guideMap()).get(r.studentId);
        if (guide) nudge("staff", guide.userId, "בקשה נערכה");
      } catch (e2) { console.error("[requests:nudge]", e2 && e2.message); }
    }

    res.status(200).json({
      ok: true, id: r.id, changed, days: span.length, cost: v.cost,
      guideReset: resetGuide,
      fileUploaded,
    });
  } catch (e) {
    console.error("[requests:edit]", e);
    res.status(502).json({ error: "עדכון הבקשה נכשל" });
  }
}

/* ---------- ביטול ---------- */
async function withdraw(req, res, session) {
  try {
    if (session.isManager) {
      return res.status(403).json({ error: "בקשת יציאה מבוטלת על ידי החניך שהגיש אותה" });
    }
    const body = req.body ?? (await readJson(req));
    const r = await ownPending(body, session, res);
    if (!r) return;
    /* ⚠ המזהה אומת מול לוח הבקשות ומול המגיש לפני `deleteItem`,
       שנשלחת בלי `board_id` (4ס). */
    await deleteItem(r.id);
    invalidateRequests();
    res.status(200).json({ ok: true, id: r.id });
  } catch (e) {
    console.error("[requests:withdraw]", e);
    res.status(502).json({ error: "ביטול הבקשה נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
