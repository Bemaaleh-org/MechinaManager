/* ============================================================
   /api/students?action=stu-lessons   שיעורי חניך

     GET                          המועדים, השיבוצים, ומי כבר עשה
     POST   { date, kind, studentId, topic }   שיבוץ
     PUT    { id, ... }           עריכה, וסימון "התקיים"
     DELETE { id }                ביטול שיבוץ

   ------------------------------------------------------------
   ⚠⚠ **הרשימה גלויה לכולם, והעריכה של ועדת קבוצה ותוכן.**
     חניך שואל "מתי אני" ו"מי כבר עשה", ושתי השאלות שייכות
     לו. השיבוץ עצמו הוא עבודה של הוועדה — `mayContent`.

   ⚠⚠ **הלוח הזה אינו גיליון מרצים, ובכוונה.** הוא אינו מופיע
     ב"גיליונות שיעורים", אין לו מחיר למפגש ואין לו חוות דעת
     על מרצה חיצוני. חניך שמלמד אינו מרצה שמזמינים, וערבוב
     השניים היה מכניס 66 שורות לדוח התשלום למרצים.

   ⚠ **המועדים נגזרים מהגאנט ואינם נשמרים** — ראו ההסבר
     המלא ב-shared/stulesson.js, ולמה זו אינה החזרה של הקשר
     שנדחה ב-4מב.

   ⚠ **"שובץ" ו"התקיים" הם שני דברים.** שיבוץ לעתיד אינו
     "עשה", ורשימה שתסמן אותו כעשה תשאיר חניך בלי שיעור.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { activeStudents } from "./_student-rows.js";
import { loadGantt } from "./_lessons-gantt.js";
import { israelToday } from "./_attendance-data.js";
import { mayContent, contentHint } from "./_content-team.js";
import {
  STU_BOARDS as B, STU_COLS as C, stuLessonReady, HAPPENED, HAPPENED_LABELS,
} from "../shared/stulesson-ids.js";
import {
  STU_KIND, STU_KINDS, stuSlots, doneMap, dowOf, DOW_HE, STU_DOWS,
} from "../shared/stulesson.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX = { topic: 200, note: 2000 };

async function loadStu({ force = false } = {}) {
  return cached("stu-lessons", async () => {
    const items = await allItems(B.board);
    return items
      .map((i) => ({
        id: String(i.id),
        studentId: val(i, C.student),
        studentName: val(i, C.studentName),
        kind: val(i, C.kind),
        date: val(i, C.date),
        topic: val(i, C.topic),
        /* ⚠ **שלושה מצבים.** ריק = טרם, ולא "לא התקיים" —
           שיעור עתידי אינו שיעור שבוטל (4ח). */
        happened: val(i, C.happened) === HAPPENED.yes ? true
          : val(i, C.happened) === HAPPENED.no ? false : null,
        note: val(i, C.note),
        by: val(i, C.by),
      }))
      .filter((r) => r.studentId && r.kind && r.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, { force });
}

const invalidateStu = () => invalidate("stu-lessons");

async function handler(req, res, session) {
  if (!stuLessonReady()) {
    return res.status(503).json({
      error: "לוח שיעורי החניך טרם הוקם. הריצו: npm run seed:stulesson",
      setupRequired: true,
    });
  }

  const may = await mayContent(session);
  /* ⚠ קריאה פתוחה לכולם; ההרשאה חוסמת כתיבה בלבד. */
  if (req.method !== "GET" && !may.ok) {
    return res.status(403).json({ error: contentHint(may) });
  }

  try {
    const today = israelToday();

    if (req.method === "GET") {
      const [rows, roster, gantt] = await Promise.all([
        loadStu(), activeStudents(), loadGantt(),
      ]);

      /* ⚠ הטווח הוא **הגאנט עצמו** ולא שנה קלנדרית: הוא מגדיר
         מתי המכינה פועלת, וכל מועד מחוצה לו אינו מועד. */
      const dates = gantt.map((e) => e.start).concat(gantt.map((e) => e.end)).filter(Boolean).sort();
      const from = dates[0] || today;
      const to = dates[dates.length - 1] || today;
      const slots = stuSlots(gantt, from, to);

      const byDateKind = new Map();
      for (const r of rows) byDateKind.set(`${r.date}|${r.kind}`, r);

      const done = doneMap(rows);
      const mine = String(session.itemId || "");

      return res.status(200).json({
        today,
        kinds: STU_KINDS,
        dows: STU_DOWS.map((w) => DOW_HE[w]),
        /* ⚠ **מועד חסום מוחזר ומסומן ואינו נמחק.** רשימה של
           שמונה מועדים בשנה בלי הסבר נראית כמו מסך שבור (4כ). */
        slots: slots.map((s) => ({
          ...s,
          taken: STU_KINDS
            .filter((k) => byDateKind.has(`${s.date}|${k}`))
            .map((k) => {
              const r = byDateKind.get(`${s.date}|${k}`);
              return { kind: k, id: r.id, student: r.studentName, happened: r.happened };
            }),
        })),
        rows: rows.map((r) => ({
          id: r.id, studentId: r.studentId, student: r.studentName,
          kind: r.kind, date: r.date, topic: r.topic,
          happened: r.happened, note: r.note,
          /* ⚠ נגזר בשרת (4יד). */
          mine: r.studentId === mine,
        })),
        /* ============================================================
           ⚠ **הטבלה של 66 האפשרויות** — כל חניך כפול שני
             הסוגים. שורה לכל חניך, ותא לכל סוג: `planned`
             (שובץ) ו-`done` (התקיים) בנפרד, כי הם שני דברים.
           ⚠ ומ-`activeStudents` — חשבון הבדיקה אינו נספר (4לא).
           ============================================================ */
        students: roster.map((s) => {
          const e = done.get(s.id) || {};
          return {
            id: s.id, name: s.name, me: s.id === mine,
            kinds: Object.fromEntries(STU_KINDS.map((k) =>
              [k, e[k] || { planned: false, done: false, date: null }])),
          };
        }),
        counts: {
          students: roster.length,
          /* ⚠ המכנה הוא 66 ולא 33: כל חניך אמור לעשות את שניהם. */
          total: roster.length * STU_KINDS.length,
          planned: rows.length,
          done: rows.filter((r) => r.happened === true).length,
          /* ⚠ **כמה מועדים פנויים** — המספר שאומר אם בכלל אפשר
             להשלים את מה שחסר, וזו השאלה של הוועדה (4יח). */
          openSlots: slots.filter((s) => !s.blocked && s.date >= today)
            .reduce((a, s) => a + STU_KINDS.filter((k) => !byDateKind.has(`${s.date}|${k}`)).length, 0),
        },
        canEdit: may.ok,
        editHint: may.ok ? null : contentHint(may),
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "DELETE") {
      const id = clip(body?.id, 40);
      if (!id) return res.status(400).json({ error: "לא צוין שיבוץ" });
      const hit = (await loadStu({ force: true })).find((r) => r.id === id);
      /* ⚠ מאומת מול הלוח ולא נמחק לפי מזהה שנשלח — `deleteItem`
         שולחת delete_item בלי board_id (4ס). */
      if (!hit) return res.status(404).json({ error: "השיבוץ אינו נמצא" });
      await deleteItem(id);
      invalidateStu();
      return res.status(200).json({ ok: true, id });
    }

    /* ---------- שדות משותפים ליצירה ולעריכה ---------- */
    const kind = body?.kind === undefined ? null : clip(body.kind, 40);
    if (kind !== null && !STU_KINDS.includes(kind)) {
      return res.status(400).json({ error: `סוג לא מוכר. האפשרויות: ${STU_KINDS.join(" · ")}` });
    }
    const date = body?.date === undefined ? null : clip(body.date, 12);
    if (date !== null && !DATE_RE.test(date)) {
      return res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" });
    }

    if (req.method === "POST") {
      if (!kind || !date) return res.status(400).json({ error: "צריך תאריך וסוג" });
      const studentId = clip(body?.studentId, 40);
      if (!studentId) return res.status(400).json({ error: "לא נבחר חניך" });

      const roster = await activeStudents();
      const st = roster.find((s) => s.id === studentId);
      if (!st) return res.status(400).json({ error: "החניך אינו פעיל או אינו קיים" });

      const rows = await loadStu({ force: true });
      /* ⚠ **תא אחד, שיבוץ אחד.** שני חניכים לאותו תאריך ואותו
         סוג הם שני שיעורים באותה משבצת — כמעט תמיד טעות. */
      if (rows.some((r) => r.date === date && r.kind === kind)) {
        return res.status(409).json({ error: "המשבצת הזו כבר תפוסה" });
      }
      /* ⚠ **ואותו חניך פעם אחת לכל סוג.** הרשימה כולה קיימת
         כדי לוודא שכל אחד עשה את שניהם; שיבוץ כפול מסתיר
         חניך שעוד לא שובץ. */
      const dup = rows.find((r) => r.studentId === studentId && r.kind === kind);
      if (dup) {
        return res.status(409).json({
          error: `${st.name} כבר משובץ ל"${kind}" בתאריך ${dup.date}`,
        });
      }

      const id = await createItem(B.board, `${st.name} · ${kind} · ${date}`, {
        [C.student]: st.id, [C.studentName]: st.name,
        [C.kind]: { label: kind },
        [C.date]: { date },
        [C.topic]: clip(body?.topic, MAX.topic),
        [C.by]: String(session.name || ""),
      });
      invalidateStu();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method !== "PUT") return res.status(405).json({ error: "שיטה לא נתמכת" });

    const id = clip(body?.id, 40);
    if (!id) return res.status(400).json({ error: "לא צוין שיבוץ" });
    const rows = await loadStu({ force: true });
    const hit = rows.find((r) => r.id === id);
    if (!hit) return res.status(404).json({ error: "השיבוץ אינו נמצא" });

    const cols = {};
    if (date && date !== hit.date) {
      if (rows.some((r) => r.id !== id && r.date === date && r.kind === (kind || hit.kind))) {
        return res.status(409).json({ error: "המשבצת הזו כבר תפוסה" });
      }
      cols[C.date] = { date };
    }
    if (kind && kind !== hit.kind) cols[C.kind] = { label: kind };
    if (body.topic !== undefined) cols[C.topic] = clip(body.topic, MAX.topic);
    if (body.note !== undefined) cols[C.note] = clip(body.note, MAX.note);

    /* ⚠ **`happened` הוא שלושה מצבים ולא תיבה.** `null` מחזיר
       ל"טרם", ולא ל"לא התקיים" — הפרש שהוא כל הסיבה שהעמודה
       היא status ולא checkbox. */
    if (body.happened !== undefined) {
      const v = body.happened;
      if (v === null || v === "") cols[C.happened] = { label: "" };
      else if (v === true || v === HAPPENED.yes) cols[C.happened] = { label: HAPPENED.yes };
      else if (v === false || v === HAPPENED.no) cols[C.happened] = { label: HAPPENED.no };
      else return res.status(400).json({ error: `ערך לא מוכר. האפשרויות: ${HAPPENED_LABELS.join(" · ")}` });
    }

    if (Object.keys(cols).length) await setColumns(B.board, id, cols);
    /* ⚠ שלושה ארגומנטים — ראו api/_team-task.js */
    if (cols[C.date] || cols[C.kind]) {
      await renameItem(B.board, id,
        `${hit.studentName} · ${kind || hit.kind} · ${date || hit.date}`);
    }
    invalidateStu();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[stu-lessons]", e);
    res.status(502).json({ error: "פעולת שיעורי החניך נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ student:true — כל חניך רואה את הרשימה, וזו כל התכלית (4טו). */
export default withAuth(handler, { student: true });

/* ⚠ מיוצאת כדי שמסך הבית יוכל לומר "השיעור הבא שלך" בלי
   מסלול שני ללוח — אותו שיקול של loadDishesForSearch. */
export { loadStu as loadStuLessons };
