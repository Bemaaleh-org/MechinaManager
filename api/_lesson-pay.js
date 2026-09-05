/* ============================================================
   /api/lessons?action=pay — דוח תשלום למרצים

     GET  ?month=YYYY-MM   חודש אחד, לפי מרצה ולפי שיעור
     GET                   השנה כולה, חודש-חודש
     PUT  { id, price, payNote }   מחיר למפגש בגיליון
     PUT  { id, noPay }            הוצאת שיעור מהדוח, והחזרתו
     POST { subject, lecturer, date, price }   שיעור מזדמן

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
import {
  loadSheets, loadMeetings, invalidateLessons, createSheet, addMeeting, setMeeting,
} from "./_lessons-data.js";
import { loadCalendar } from "./_attendance-data.js";
import {
  LESSON_BOARDS, LESSON_COLS, PLANNED, HAPPENED, payFilterReady,
} from "../shared/lessons-boards.js";
import { mayEdit } from "../shared/edit-rights.js";

const S = LESSON_COLS.sheets;

/** מפגש נספר לתשלום רק אם דווח שהתקיים. */
const counted = (m) => m.happened === "כן";

/* ============================================================
   ⚠⚠⚠ **מוביל שבוע אינו רואה את דוח התשלום, וזה נאכף כאן ולא
     ב-`withAuth`.**

   `{ scheduler: true }` מרשה במפורש גם ל-`session.isLeader`
   (api/_session.js) — "מובילי השבוע נוספו להרשאת השיעורים
   בהחלטת המכינה: דיווח קיום מפגשים והעלאת חוות דעת". זה נכון
   לדיווח, ו**אינו** נכון לדוח שמראה כמה משלמים לכל מרצה: זו
   החלטה תקציבית שנשארת אצל הצוות ואצל אחראי הלו״ז (5ו).

   ⚠⚠ **והבדיקה שנועלת את זה עברה בטעות במשך סשן שלם.**
     `leader-test` בחר שבוע לפי "שני ימי לימוד", ורק ביום שבו
     התאריך של המערכת נפל **בתוך** אותו שבוע התברר ש-
     `isLeader` דולק והדוח נפתח. כלומר הטענה הייתה ירוקה מסיבה
     שגויה — בדיוק הכשל שסעיף "בדיקה שנשענת על סדר שורות"
     מזהיר ממנו, בגרסה של תלות בתאריך.

   ⚠ **הבדיקה היא `isScheduler` או צוות, ולא שלילת `isLeader`.**
     שלילה הייתה נשברת ביום שאחראי הלו״ז יהיה גם מוביל שבוע —
     והוא חניך, ולכן זה מצב שקורה.
   ============================================================ */
function mayPay(session) {
  return Boolean(!session.isStudent || session.isScheduler);
}

async function handler(req, res, session) {
  if (!mayPay(session)) {
    return res.status(403).json({
      error: "דוח התשלום למרצים פתוח לצוות ולאחראי הלו״ז. "
        + "מוביל שבוע מדווח על קיום מפגשים, ואינו רואה כסף.",
    });
  }
  if (req.method === "GET") return report(req, res, session);
  if (req.method === "PUT") return setPrice(req, res, session);
  if (req.method === "POST") return addOneOff(req, res, session);
  return res.status(405).json({ error: "רק GET, POST ו-PUT נתמכים כאן" });
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
       של אף אחד, ואינם כסף (4ח).
       ⚠⚠ וגיליון שסומן "מחוץ לדוח התשלום" יורד מכאן **וממשיך
         לחיות בכל מסך אחר** — זו עמודה של הדוח ולא של השיעור. */
    const live = meetings.filter((m) => {
      const sh = byId.get(m.sheetId);
      return sh && sh.active && !sh.noPay && m.date && m.planned !== PLANNED.no;
    });

    /* ============================================================
       ⚠⚠ **מה שהוצא מוצג, ואינו נעלם.**

       הוצאה שקטה היא בדיוק סוג הדבר שאיש לא יזכור בעוד חודשיים,
       ואז מרצה שכן צריך תשלום פשוט אינו בדוח — ואין שום סימן
       לכך. הרשימה יושבת בתחתית המסך עם כפתור החזרה, ולצד כל
       שורה **כמה מפגשים התקיימו בה** — כדי שההחלטה תיראה.
       ============================================================ */
    const heldOf = (sheetId) => meetings.filter(
      (m) => m.sheetId === sheetId && m.date && m.planned !== PLANNED.no && counted(m)).length;
    const excluded = sheets
      .filter((sh) => sh.active && sh.noPay)
      .map((sh) => ({
        sheetId: sh.id, subject: sh.subject, lecturer: sh.lecturer || null,
        price: sh.price, held: heldOf(sh.id),
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject, "he"));

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
        excluded,
        canEdit: mayEdit(session, "scheduler"),
        ...excludeGate(session),
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
      excluded,
      canEdit: mayEdit(session, "scheduler"),
      ...excludeGate(session),
    });
  } catch (e) {
    console.error("[lesson-pay:report]", e);
    res.status(502).json({ error: "שליפת דוח התשלום נכשלה" });
  }
}

/* ============================================================
   מי רשאי להוציא שיעור מהדוח
   ------------------------------------------------------------
   ⚠⚠ **הצוות, ולא אחראי הלו״ז.** זו אינה חזרה על `canEdit`:
     `mayEdit(session, "scheduler")` פותח את **המחיר** גם
     לאחראי הלו״ז — שהוא חניך — וזה נכון, כי הוא זה שמסכם עם
     המרצים. הוצאת שיעור מהדוח היא החלטה תקציבית, ולא תפעולית,
     והיא נשארת אצל הצוות.

   ⚠ `session.isManager` פירושו **כל כניסת צוות** ולא ראש
     המכינה בלבד (`_session.js`). זו בחירה, ואותה בחירה כמו
     ברשימת הזרועות (4טז): הרשאה שרק אדם אחד מחזיק נתקעת ברגע
     שהוא בחופשה.

   ⚠ **וההודעה אומרת מי כן רשאי**, לא "אין הרשאה" (4ע).
   ============================================================ */
const mayExclude = (session) => !session.isStudent;

const excludeGate = (session) => ({
  canExclude: mayExclude(session),
  /* ⚠ עיקרון 6: העמודה שטרם הוקמה אינה נראית כמו "אין מה
     להוציא". המסך אומר מה להריץ, ואינו מציג כפתור מת. */
  excludeReady: payFilterReady(),
});

async function setPrice(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));
    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין גיליון" });

    const sheet = (await loadSheets()).find((x) => x.id === id);
    if (!sheet) return res.status(404).json({ error: "הגיליון אינו נמצא" });

    const cols = {};

    /* ---------- הוצאה מהדוח והחזרה ---------- */
    if (body.noPay !== undefined) {
      if (!mayExclude(session)) {
        return res.status(403).json({
          error: "הוצאת שיעור מדוח התשלום היא בידי הצוות. אפשר לעדכן כאן מחיר.",
        });
      }
      if (!payFilterReady()) {
        return res.status(503).json({
          error: "עמודת \"מחוץ לדוח התשלום\" טרם הוקמה בלוח. מריצים npm run seed:army פעם אחת.",
          setupRequired: true,
        });
      }
      /* ⚠ **תיבה ולא מחיקה, ולכן הפיכה.** "לתמיד" כאן פירושו
         שהשיעור לא יחזור לדוח מעצמו — ולא שאי אפשר להתחרט.
         מחיקה אמיתית של גיליון הייתה מוחקת גם את מפגשיו, את
         חוות הדעת ואת הדירוגים שלו. */
      cols[S.noPay] = { checked: body.noPay ? "true" : "false" };
    }

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

/* ============================================================
   שיעור מזדמן — מרצה שהגיע פעם אחת
   ------------------------------------------------------------
   ⚠⚠ **גיליון ומפגש אמיתיים, ולא "שורה בדוח".** הדוח כולו נגזר
     מהגיליונות ומהמפגשים שלהם (4ח), ואין בו שום נתון משלו.
     שורה שהייתה חיה רק בדוח הייתה המקום הראשון שבו הסכום מפסיק
     להיות ניתן לבדיקה מול מה שבאמת קרה.

     לכן שיעור מזדמן הוא בדיוק מה שהוא: **גיליון עם מפגש אחד**,
     שסומן "התקיים". הוא מופיע בלוח השיעורים, בגיליונות,
     ובחוות הדעת — כמו כל שיעור אחר, כי הוא כן היה.

   ⚠ **המחיר חובה כאן, ואינו יכול להישאר ריק.** בגיליון קבוע
     "ריק" פירושו "טרם סוכם" וזה מצב לגיטימי שנמשך חודשים; שיעור
     מזדמן נרשם **אחרי** שהוא כבר קרה, ומי שרושם אותו יודע כמה
     הוא עלה. ריק כאן הוא שכחה, לא מצב.

   ⚠ **המפגש נוצר `planned: כן` ומיד `happened: כן`.** שתי
     קריאות ולא אחת, כי `addMeeting` אינו מקבל `happened` —
     והוספת פרמטר שם הייתה משנה את המסלול שכל שאר המערכת
     משתמשת בו.

   ⚠ **הצוות בלבד** — אותו שער כמו ההוצאה מהדוח, ומאותו טעם:
     זו רשומה תקציבית. `mayExclude`.
   ============================================================ */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function addOneOff(req, res, session) {
  try {
    if (!mayExclude(session)) {
      return res.status(403).json({
        error: "הוספת שיעור מזדמן היא בידי הצוות.",
      });
    }
    const body = req.body ?? (await readJson(req));

    const subject = String(body?.subject || "").trim().slice(0, 200);
    if (!subject) return res.status(400).json({ error: "לא הוזן שם השיעור" });

    const date = String(body?.date || "").trim();
    if (!DATE_RE.test(date)) return res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" });

    const raw = String(body?.price ?? "").trim();
    if (!raw) return res.status(400).json({ error: "שיעור מזדמן נרשם אחרי שהתקיים — צריך לציין כמה הוא עלה" });
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) {
      return res.status(400).json({ error: "מחיר לא תקין" });
    }

    const lecturer = String(body?.lecturer || "").trim().slice(0, 200);

    /* ⚠ שם כפול נחסם: כל המסכים מזהים גיליון בעין לפי שמו, ושני
       גיליונות באותו שם הם בדיוק המקום שבו מדווחים על הלא-נכון. */
    const sheets = await loadSheets({ force: true });
    if (sheets.some((x) => x.subject === subject)) {
      return res.status(409).json({ error: `כבר קיים גיליון בשם "${subject}".` });
    }

    const sheetId = await createSheet({ subject, lecturer, dayTime: "" });
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){
         change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                       create_labels_if_missing:false){ id } }`,
      { b: LESSON_BOARDS.sheets, i: sheetId,
        v: JSON.stringify({ [S.price]: String(Math.round(price * 100) / 100) }) });

    const meetingId = await addMeeting({
      sheetId, sheetName: subject, date, planned: PLANNED.yes,
      note: "שיעור מזדמן",
    });
    /* ⚠ הוא כבר קרה — אחרת הוא היה נספר ב"טרם דווחו" ומנפח
       בדיוק את המספר שהדוח קיים בשבילו. */
    await setMeeting(meetingId, { happened: HAPPENED.yes });

    invalidateLessons();
    return res.status(200).json({ ok: true, sheetId, meetingId });
  } catch (e) {
    console.error("[lesson-pay:oneOff]", e);
    res.status(502).json({ error: "הוספת השיעור נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { scheduler: true, edit: "scheduler" });
