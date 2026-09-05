/* ============================================================
   /api/students?action=tryouts — מיונים ושיבוצים

     GET                     המיונים שלי · או של כולם (צוות ויו״ר)
     POST   { name, date, status, track, note }    מיון חדש
     PUT    { id, … }                              עריכת מיון
     PUT    { corps, role }                        השיבוץ שלי
     DELETE { id }                                 מחיקה

   ------------------------------------------------------------
   ⚠⚠ **מיון ושיבוץ הם שני דברים, ובאותו מסך.**

   מיונים הם **רבים** — שורה לכל אחד, לאורך השנה. שיבוץ הוא
   **אחד**: התוצאה. הם יושבים באותו מסך כי זו אותה שאלה
   ("לאן אני הולך בצבא") ובשני לוחות שונים כי הם שני נתונים
   שונים — המיונים בלוח משלהם, והשיבוץ על שורת החניך במצבה.

   ⚠ **השיבוץ הוא חיל ולא תפקיד**, כמו בבוגרים ומאותה רשימה.
     תפקידים ספציפיים הם רשימה בלי סוף שאי אפשר לספור עליה
     כלום; החיל הוא מה שנספר, והפירוט החופשי יושב לצידו.

   ------------------------------------------------------------
   ⚠⚠ **הבעלות היא של החניך, וזו לא החלטה טכנית.**

   `army` ו-`tryouts` בפרופיל תמיד מולאו על ידי החניך על עצמו
   (`canEditArmy: !session.isManager`), והמיונים הם בדיוק אותו
   נתון — רק בשורות במקום במחרוזת אחת. עריכה מבחוץ הופכת את
   השדה למשהו אחר לגמרי: לא "מה שהחניך מספר על עצמו" אלא "מה
   שהצוות רשם עליו". לכן **כתיבה היא של החניך בלבד**, גם לראש
   המכינה, וגם ליו״ר הוועדה.

   מה שכן נפתח: **קריאה של הכול** לצוות וליו״ר ועדת הגיוסים.
   זו כל הבקשה — "שיוכלו לקחת את המידע ולעשות איתו דברים".

   ⚠ **404 ולא 403 על מיון של חניך אחר.** 403 מאשר שהשורה
     קיימת (4מה).

   ⚠ **מי היו״ר נקבע מתיבה בלוח ולא משם מקובע בקוד.** ראו
     ההערה ב-shared/placements-ids.js.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems, gql } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { TRYOUT_BOARD, TRYOUT_COLS as T, TRYOUT_STATUS, tryoutsReady } from "../shared/tryouts-ids.js";
import { activeStudents, studentRows } from "./_student-rows.js";
import { loadDefinitions } from "./_placements.js";
import { MECHINA_BOARDS, MECHINA_COLS, armyPlacementReady } from "../shared/mechina-boards.js";

const R = MECHINA_COLS.roster;

/* ============================================================
   רשימת החילות — **נקראת מהעמודה שאליה כותבים**
   ------------------------------------------------------------
   ⚠ לא מרשימה בקוד ולא מלוח הבוגרים בזמן ריצה: מה ש-monday
     תקבל נקבע על ידי התוויות של העמודה הזו, ואימות מול מקור
     אחר היה מאשר ערך שהכתיבה תדחה — או ההפך, דוחה ערך תקין.
     `tools/seed-army.mjs` הוא שמסנכרן אותה עם לוח הבוגרים,
     פעם אחת ובמכוון.
   ⚠ כשל בקריאה מחזיר רשימה ריקה ואינו מפיל את המסך; אימות
     הכתיבה נופל אז ברעש ואינו פותח שער.
   ============================================================ */
/* ============================================================
   ⚠⚠ **תווית מושבתת יורדת מהרשימה.**

   הדרך היחידה להוריד תווית מ-monday בלי למחוק נתונים היא
   להשבית אותה (update_status_column דורס את כל הרשימה, ותווית
   שנעלמת מוחקת בשקט את הערך של כל שורה שיושבת עליה). מי שקורא
   רק את `labels` מקבל גם את המושבתות — כלומר ממשיך להציע לבחור
   בדיוק את מה שמישהו הוריד ביד, ובלי שום סימן שמשהו לא בסדר.

   ההשבתה יושבת ב-`deactivated_labels` (מערך של מזהי תוויות),
   ולא בתוך `labels_colors`.
   ============================================================ */
const activeLabels = (settingsStr) => {
  const st = JSON.parse(settingsStr || "{}");
  const off = new Set((st.deactivated_labels || []).map(String));
  return Object.entries(st.labels || {})
    .filter(([id, t]) => t && !off.has(String(id)))
    .map(([, t]) => String(t));
};

async function corpsLabels({ force = false } = {}) {
  if (!armyPlacementReady()) return [];
  return cached("army-corps", async () => {
    const d = await gql(`{ boards(ids:[${MECHINA_BOARDS.roster}]){ columns{ id settings_str } } }`);
    const col = (d.boards[0].columns || []).find((c) => c.id === R.armyCorps);
    return col ? activeLabels(col.settings_str) : [];
  }, { force, ttl: 10 * 60_000 });
}

/** השיבוץ של שורת חניך אחת, בצורה שהמסך מקבל. */
const placementOf = (row) => ({
  corps: (row && row.armyCorps) || null,
  role: (row && row.armyRole) || null,
});

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ============================================================
   ⚠⚠⚠ **`text` של עמודת סטטוס משקר על תא ריק.**

   ל-monday יש "משבצת ריקה" קבועה בעמודת סטטוס — **אינדקס 5**.
   תא בלי בחירה מחזיר `value: null` אבל `text` של **התווית
   שיושבת על 5**, אם יש כזו. וזה לא באג נדיר: הוא הופיע ברגע
   שנוצרה עמודת החילות, ו**כל 35 החניכים הופיעו כמשובצים
   ל"חיל האוויר"** — התווית החמישית ברשימה.

   ⚠ **ואי אפשר לפנות את המשבצת.** ניסינו: מחיקת התווית שעל 5
     ויצירתה מחדש מחזירה אותה **בדיוק ל-5**, כי monday נותנת
     תמיד את המפתח הפנוי הנמוך ביותר. שליחת `id` חדש נדחית
     ב-"For new labels no id should be provided".

   ⚠ **ולא רק בקריאה:** ניקוי תא סטטוס במחרוזת ריקה כותב
     `index:5` **במפורש** — כלומר "למחוק את הבחירה" קובע אותה.
     הניקוי הנכון הוא `null`.

   לכן: **`value === null` הוא המבחן לריק, ולא `text === ""`.**
   `text` נכון ומדויק לכל תא שיש בו בחירה אמיתית, ולכן הוא
   נשאר מקור השם — רק הריק נגזר מ-`value`.

   ⚠ כל עמודת סטטוס חדשה שתיקרא כאן חייבת את אותו טיפול.
     `tools/seed-army.mjs` ו-`tools/seed-tryouts.mjs` כבר
     מדלגים על מפתח 5 ביצירה, אבל זה עוזר רק ללוחות חדשים —
     לא לעמודות שכבר קיימות ולא לעמודות שהמכינה בנתה ביד.
   ============================================================ */
const statusOf = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const isDate = (x) => /^\d{4}-\d{2}-\d{2}$/.test(String(x || ""));

export async function loadTryouts({ force = false } = {}) {
  if (!tryoutsReady()) return [];
  return cached("tryouts", async () => {
    const items = await allItems(TRYOUT_BOARD.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        student: val(i, T.student),
        studentName: val(i, T.studentName),
        date: val(i, T.date) || null,
        /* ⚠ **מצב ריק הוא ריק.** לפני התיקון "לא הגיע" ישבה על
           מפתח 5, ולכן כל מיון בלי מצב נקרא "לא הגיע" — טענה
           על החניך שהוא מעולם לא עשה. ראו ההערה מעל. */
        status: statusOf(i, T.status) || null,
        track: val(i, T.track) || null,
        note: val(i, T.note) || null,
      }))
      .filter((x) => x.name && x.student)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")
        || a.studentName.localeCompare(b.studentName, "he"));
  }, { force });
}

/**
 * האם המשתמש רשאי לראות את המיונים של **כולם**.
 * ⚠ צוות, או יו״ר של ועדה שסומנה בלוח כוועדת גיוסים.
 */
async function maySeeAll(session) {
  if (!session.isStudent) return { all: true, why: "צוות" };
  try {
    const defs = await loadDefinitions();
    const mine = defs.filter((d) => d.army && String(d.chair || "") === String(session.itemId));
    if (mine.length) return { all: true, why: "יו״ר " + mine.map((d) => d.name).join(", ") };
  } catch (e) {
    /* ⚠ כשל בטעינת ההגדרות אינו פותח גישה — ואינו מפיל את
       המסך: החניך רואה את שלו, כמו כל חניך. */
    console.error("[tryouts:maySeeAll]", e);
  }
  return { all: false, why: null };
}

async function handler(req, res, session) {
  if (!tryoutsReady()) {
    /* עיקרון 6: כשל הקמה נראה אחרת מ"אין מיונים". */
    return res.status(503).json({ error: "לוח המיונים טרם הוקם", setupRequired: true });
  }

  const body = ["POST", "PUT", "DELETE"].includes(req.method)
    ? (req.body ?? (await readJson(req))) : {};

  try {
    const perm = await maySeeAll(session);

    /* ---------------- קריאה ---------------- */
    if (req.method === "GET") {
      const all = await loadTryouts();
      const mine = all.filter((x) => String(x.student) === String(session.itemId));

      const [corpsList, rows] = await Promise.all([corpsLabels(), studentRows()]);
      const meRow = rows.find((r) => String(r.id) === String(session.itemId));

      if (!perm.all) {
        return res.status(200).json({
          tryouts: mine, mine: true, canSeeAll: false,
          statuses: TRYOUT_STATUS,
          /* ⚠ **`placementReady` נשלח במפורש.** בורר חילות ריק
             בלי המילה הזו נראה בדיוק כמו מכינה שאין בה חילות
             (עיקרון 6). */
          placementReady: armyPlacementReady(),
          corpsList,
          placement: placementOf(meRow),
          /* ⚠ **הרישום הישן מוצג ואינו נמחק.** "שאיפות ומיונים"
             יצא מהפרופיל, ומה שהחניך כבר הקליד שם היה נעלם
             מהמסך בלי שאיש יידע. הוא מוצג פעם אחת, מסומן
             כישן, וניתן להעתקה למקום החדש. */
          legacy: meRow && (meRow.profile.army || meRow.profile.tryouts)
            ? { army: meRow.profile.army || "", tryouts: meRow.profile.tryouts || "" }
            : null,
        });
      }

      /* ⚠ **סיכום מחושב בשרת** — שלושה מסכים שיחשבו אותו
         בדפדפן יראו שלושה מספרים שונים ברגע שאחד מהם יתעדכן. */
      const students = await activeStudents();
      const byStudent = new Map(students.map((s) => [String(s.id), []]));
      for (const t of all) {
        if (byStudent.has(String(t.student))) byStudent.get(String(t.student)).push(t);
      }

      const perStudent = students.map((s) => {
        const list = byStudent.get(String(s.id)) || [];
        return {
          id: s.id, name: s.name,
          count: list.length,
          /* ⚠ **"טרם ניגש" אינו "לא עבר".** חניך בלי אף מיון
             הוא מצב שלישי, ואיחודו עם "לא עבר" היה הופך את
             הטבלה לשקרית בדיוק במקום שבו מסתכלים עליה. */
          /* ⚠ שלוש התוצאות שהחניך מדווח על עצמו. "טרם ניגשתי"
             אינו כישלון ואינו הצלחה — הוא נספר בנפרד. */
          accepted: list.filter((x) => x.status === "ניגשתי והתקבלתי").length,
          advanced: list.filter((x) => x.status === "ניגשתי ועברתי לשלב הבא").length,
          rejected: list.filter((x) => x.status === "ניגשתי ולא התקבלתי").length,
          /* ⚠ **השיבוץ הוא של החניך ולא של המיון**, ולכן הוא
             כאן ולא ברשימת המיונים. */
          placement: placementOf(s),
          last: list[0] || null,
        };
      }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "he"));

      const byStatus = {};
      for (const st of TRYOUT_STATUS) byStatus[st] = all.filter((x) => x.status === st).length;

      return res.status(200).json({
        tryouts: all, mine: false, canSeeAll: true, seeAllWhy: perm.why,
        statuses: TRYOUT_STATUS,
        placementReady: armyPlacementReady(),
        corpsList,
        placement: placementOf(meRow),
        /* ⚠ **הצוות רואה שיבוצים ואינו עורך אותם** — אותו כלל
           בדיוק כמו במיונים. */
        byCorps: corpsCount(students),
        summary: {
          total: all.length,
          students: perStudent.filter((s) => s.count > 0).length,
          /* ⚠ מוחזר גם כמה **לא** ניגשו — המספר שאומר כמה
             מהתמונה חסר שייך למסך (4יח). */
          none: perStudent.filter((s) => s.count === 0).length,
          /* ⚠ וגם כמה **טרם שובצו** — המספר שאומר כמה מהתמונה
             חסר שייך למסך, לא ללוג (4יח). */
          placed: students.filter((s) => s.armyCorps).length,
          unplaced: students.filter((s) => !s.armyCorps).length,
          byStatus,
        },
        perStudent,
      });
    }

    /* ---------------- כתיבה: החניך על עצמו בלבד ---------------- */
    if (!session.isStudent) {
      return res.status(403).json({
        error: "המיונים ממולאים על ידי החניך על עצמו. הצוות רואה אותם ואינו עורך אותם",
      });
    }

    if (req.method === "POST") {
      const name = String(body?.name || "").trim().slice(0, 200);
      if (!name) return res.status(400).json({ error: "לא הוזן שם המיון" });

      const cols = { [T.student]: String(session.itemId), [T.studentName]: String(session.name || "") };
      const bad = fill(cols, body, res);
      if (bad) return;

      const id = await createItem(TRYOUT_BOARD.board, name, cols);
      invalidate("tryouts");
      return res.status(200).json({ ok: true, id: String(id) });
    }

    /* ============================================================
       PUT בלי `id` הוא **השיבוץ**, לא מיון.
       ⚠ אותה בעלות בדיוק: החניך על עצמו, וגם ראש המכינה חסום.
       ============================================================ */
    if (req.method === "PUT" && body?.id === undefined
        && (body?.corps !== undefined || body?.role !== undefined)) {
      return setPlacement(req, res, session, body);
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין מיון" });
    const row = (await loadTryouts()).find((x) => x.id === id);
    /* ⚠ 404 גם על מיון של חניך אחר — 403 מאשר שהשורה קיימת. */
    if (!row || String(row.student) !== String(session.itemId)) {
      return res.status(404).json({ error: "המיון אינו נמצא" });
    }

    if (req.method === "PUT") {
      const cols = {};
      const bad = fill(cols, body, res);
      if (bad) return;
      if (Object.keys(cols).length) await setColumns(TRYOUT_BOARD.board, id, cols);
      if (body.name !== undefined) {
        const name = String(body.name).trim().slice(0, 200);
        if (!name) return res.status(400).json({ error: "שם המיון ריק" });
        await renameItem(TRYOUT_BOARD.board, id, name);
      }
      invalidate("tryouts");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      await deleteItem(id);
      invalidate("tryouts");
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[tryouts]", e);
    res.status(502).json({ error: "פעולת המיונים נכשלה" });
  }
}

/* ============================================================
   שמירת השיבוץ — חיל אחד, ופירוט תפקיד לצידו
   ============================================================ */
async function setPlacement(req, res, session, body) {
  if (!armyPlacementReady()) {
    /* עיקרון 6: כשל הקמה נראה אחרת מ"אין חילות". */
    return res.status(503).json({
      error: "עמודות השיבוץ טרם הוקמו בלוח. מריצים npm run seed:army פעם אחת.",
      setupRequired: true,
    });
  }

  const cols = {};
  if (body.corps !== undefined) {
    const c = String(body.corps || "").trim();
/* ============================================================
       ⚠⚠⚠ **מנקים עמודת סטטוס ב-`null`, ולעולם לא במחרוזת ריקה.**

       `""` **אינו** מנקה תא סטטוס — הוא כותב בו `{"index":5}`
       במפורש, כלומר בוחר את המשבצת הריקה של monday. אם יושבת
       שם תווית (וזה המצב כאן, "טרם שובץ"), התא נשאר עם `value`
       שאינו `null` ועם `text` של אותה תווית — ו"מחקתי את
       השיבוץ" הופך ל"שובצתי לתווית מוזרה".

       `null` מנקה באמת: `value` חוזר ל-`null`, וזה מה שכל
       הקריאה נשענת עליו (ראו ההערה ב-api/_student-rows.js).
       ============================================================ */
    if (!c) cols[R.armyCorps] = null;
    else {
      const known = await corpsLabels();
      /* ⚠ תווית שאינה בלוח נדחית ברעש ולא נוצרת בשקט. וההודעה
         אומרת מה כן אפשר — "השיבוץ נכשל" לבדה אינה עוזרת. */
      if (!known.includes(c)) {
        return res.status(400).json({
          error: `"${c}" אינו ברשימת החילות. הוספת חיל היא בידי המנהל.`,
          corpsList: known,
        });
      }
      cols[R.armyCorps] = { label: c };
    }
  }
  /* ⚠ **פירוט התפקיד הוא טקסט חופשי ובכוונה.** רשימת תפקידים
     סגורה מתיישנת בכל מחזור, והחניך יודע לתאר לאן הוא הולך
     טוב יותר מכל רשימה שנקבע. */
  if (body.role !== undefined) cols[R.armyRole] = String(body.role || "").trim().slice(0, 200);

  if (!Object.keys(cols).length) return res.status(400).json({ error: "לא נשלח מה לעדכן" });

  await setColumns(MECHINA_BOARDS.roster, String(session.itemId), cols);
  invalidate("student-rows");
  return res.status(200).json({ ok: true });
}

/** כמה חניכים בכל חיל — למסך של הצוות. */
function corpsCount(students) {
  const m = new Map();
  for (const s of students) {
    if (!s.armyCorps) continue;
    m.set(s.armyCorps, (m.get(s.armyCorps) || 0) + 1);
  }
  return [...m.entries()].map(([corps, n]) => ({ corps, n }))
    .sort((a, b) => b.n - a.n || a.corps.localeCompare(b.corps, "he"));
}

/**
 * שדות אופציונליים → עמודות.
 * ⚠ מיפוי מפורש ולא פריסה, כדי שעמודה חדשה בלוח לא תיפתח
 *   לכתיבה מעצמה (4ש). מחזירה true אם כבר נשלחה שגיאה.
 */
function fill(cols, body, res) {
  if (body.date !== undefined) {
    const d = String(body.date || "").trim();
    if (!d) cols[T.date] = "";
    else if (!isDate(d)) { res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" }); return true; }
    else cols[T.date] = { date: d };
  }
  if (body.status !== undefined) {
    const st = String(body.status || "").trim();
    /* ⚠ `null` ולא `""` — ראו ההערה ב-setPlacement. */
    if (!st) cols[T.status] = null;
    /* ⚠ תווית שאינה בלוח נדחית ברעש ולא נוצרת בשקט. */
    else if (!TRYOUT_STATUS.includes(st)) {
      res.status(400).json({ error: `"${st}" אינו מצב מוכר. האפשרויות: ${TRYOUT_STATUS.join(" · ")}` });
      return true;
    } else cols[T.status] = { label: st };
  }
  if (body.track !== undefined) cols[T.track] = String(body.track || "").trim().slice(0, 200);
  if (body.note !== undefined) cols[T.note] = String(body.note || "").trim().slice(0, 2000);
  return false;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` — חניך חייב להגיע לכאן, זה המסך שלו.
   ההפרדה בין קריאה לכתיבה נעשית בתוך ה-handler (4טו). */
export default withAuth(handler, { student: true });
