/* ============================================================
   /api/lessons?action=pay — דוח תשלום למרצים

     GET  ?month=YYYY-MM   חודש אחד, לפי מרצה ולפי שיעור
     GET                   השנה כולה, חודש-חודש
     PUT  { id, price, payNote }   מחיר למפגש בגיליון

   ------------------------------------------------------------
   ⚠ **מחיר ל*מפגש*, ולא לחודש ולא לשנה.** מה שקובע כמה מגיע
     הוא כמה מפגשים באמת התקיימו, וזה בדיוק מה שאחראי הלו״ז
     מסמן ממילא. תעריף חודשי היה מנתק את התשלום מהעבודה.

   ⚠⚠ **רק מפגש שסומן "התקיים" נספר.** `happened === null` הוא
     **מצב שלישי** — "טרם דווח" — ולא "לא התקיים" (4ח). מפגש
     שלא דווח אינו כסף שמגיע ואינו כסף שלא מגיע: הוא פשוט לא
     ידוע, והדוח **אומר כמה כאלה יש**. סכום שנראה סופי בזמן
     ששליש מהחודש טרם דווח הוא בדיוק המספר שמסתכלים עליו כדי
     להחליט — ומחליטים לפיו לא נכון.

   ⚠ **וגיליון בלי מחיר מדווח ואינו מושמט.** אותו כלל כמו
     `unpriced` בשווי המלאי (4לג): "₪4,200" לבד נקרא כסך הכול
     כשהוא סך של מחצית.

   ⚠ **צוות בלבד.** עלויות אינן נתון של חניך (עיקרון 4),
     והכתיבה מצומצמת לראש המכינה ולאחראי הלו״ז (4ע).
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { loadSheets, loadMeetings, invalidateLessons } from "./_lessons-data.js";
import { loadCalendar } from "./_attendance-data.js";
import { LESSON_BOARDS, LESSON_COLS, PLANNED } from "../shared/lessons-boards.js";
import { mayEdit } from "../shared/edit-rights.js";

const S = LESSON_COLS.sheets;

/** מפגש נספר לתשלום רק אם דווח שהתקיים. */
const counted = (m) => m.happened === "כן";

async function handler(req, res, session) {
  if (req.method === "GET") return report(req, res, session);
  if (req.method === "PUT") return setPrice(req, res, session);
  return res.status(405).json({ error: "רק GET ו-PUT נתמכים כאן" });
}

async function report(req, res, session) {
  try {
    const [sheets, meetings, cal] = await Promise.all([
      loadSheets(), loadMeetings(), loadCalendar(),
    ]);

    const wanted = String(req.query?.month || "").trim();
    const months = [...new Set(cal.days.map((d) => d.date.slice(0, 7)))].sort();

    const byId = new Map(sheets.map((s) => [s.id, s]));
    /* ⚠ גיליון כבוי אינו בדוח: מפגשיו שנשארו בלוח אינם מטלה
       של אף אחד, ואינם כסף (4ח). */
    const live = meetings.filter((m) => {
      const sh = byId.get(m.sheetId);
      return sh && sh.active && m.date && m.planned !== PLANNED.no;
    });

    /** סיכום של קבוצת מפגשים */
    const sum = (list) => {
      const rows = new Map();
      let total = 0, unreported = 0, unpriced = 0, unpricedHeld = 0;

      for (const m of list) {
        const sh = byId.get(m.sheetId);
        const key = sh.id;
        if (!rows.has(key)) {
          rows.set(key, {
            sheetId: sh.id, subject: sh.subject, lecturer: sh.lecturer || null,
            price: sh.price, payNote: sh.payNote || null,
            held: 0, pending: 0, amount: 0,
          });
        }
        const row = rows.get(key);
        if (counted(m)) row.held++;
        /* ⚠ `null` בלבד הוא "טרם דווח". "לא התקיים" הוא תשובה. */
        else if (!m.happened) { row.pending++; unreported++; }
      }

      for (const row of rows.values()) {
        if (row.price == null) {
          if (row.held) { unpriced++; unpricedHeld += row.held; }
          row.amount = null;
          continue;
        }
        row.amount = Math.round(row.price * row.held * 100) / 100;
        total += row.amount;
      }

      return {
        rows: [...rows.values()]
          .filter((r) => r.held || r.pending)
          .sort((a, b) => (b.amount || 0) - (a.amount || 0)
            || a.subject.localeCompare(b.subject, "he")),
        total: Math.round(total * 100) / 100,
        /* ⚠ שלושת המספרים שאומרים כמה מהתמונה חסר. בלעדיהם
           `total` נקרא כסופי. */
        unreported,
        unpriced,
        unpricedHeld,
      };
    };

    if (wanted) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(wanted)) {
        return res.status(400).json({ error: "חודש בפורמט YYYY-MM" });
      }
      const inMonth = live.filter((m) => m.date.startsWith(wanted));
      return res.status(200).json({
        month: wanted, months,
        ...sum(inMonth),
        canEdit: mayEdit(session, "scheduler"),
      });
    }

    /* ---- השנה כולה, חודש-חודש ---- */
    const perMonth = months.map((mo) => {
      const s2 = sum(live.filter((m) => m.date.startsWith(mo)));
      return {
        month: mo, total: s2.total, unreported: s2.unreported,
        unpriced: s2.unpriced, lecturers: s2.rows.length,
      };
    }).filter((m) => m.total || m.unreported || m.lecturers);

    const all = sum(live);
    return res.status(200).json({
      months, perMonth,
      year: { total: all.total, unreported: all.unreported, unpriced: all.unpriced },
      /* ⚠ הרשימה לשנה כולה — לדעת מי חסר מחיר, ולא רק כמה. */
      rows: all.rows,
      canEdit: mayEdit(session, "scheduler"),
    });
  } catch (e) {
    console.error("[lesson-pay:report]", e);
    res.status(502).json({ error: "שליפת דוח התשלום נכשלה" });
  }
}

async function setPrice(req, res) {
  try {
    const body = req.body ?? (await readJson(req));
    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין גיליון" });

    const sheet = (await loadSheets()).find((x) => x.id === id);
    if (!sheet) return res.status(404).json({ error: "הגיליון אינו נמצא" });

    const cols = {};
    if (body.price !== undefined) {
      /* ⚠ **ריק אינו אפס.** מחיר 0 פירושו "מתנדב"; מחיר חסר
         פירושו "לא סוכם". שני מצבים שונים לגמרי, ואיחודם היה
         מסתיר בדיוק את מה שהדוח צריך לצעוק (4לג). */
      const raw = String(body.price ?? "").trim();
      if (!raw) cols[S.price] = "";
      else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 1000000) {
          return res.status(400).json({ error: "מחיר לא תקין" });
        }
        cols[S.price] = String(Math.round(n * 100) / 100);
      }
    }
    if (body.payNote !== undefined) {
      cols[S.payNote] = String(body.payNote || "").trim().slice(0, 300);
    }
    if (!Object.keys(cols).length) {
      return res.status(400).json({ error: "לא נשלח מה לעדכן" });
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                       create_labels_if_missing:false){ id } }`,
      { b: LESSON_BOARDS.sheets, i: id, v: JSON.stringify(cols) });
    invalidateLessons();
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[lesson-pay:price]", e);
    res.status(502).json({ error: "עדכון המחיר נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { scheduler: true, edit: "scheduler" });
