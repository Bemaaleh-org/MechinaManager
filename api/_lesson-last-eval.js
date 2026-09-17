/* ============================================================
   GET /api/lessons?action=last-eval
   ------------------------------------------------------------
   חוות הדעת האחרונה, לכרטיס במסך הבית של הצוות.

   הבקשה: *"בדף הבית שיהיה שחוות דעת האחרונה תופיע אצל הצוות
   בדף הבית עד שיש חוות דעת חדשה, עם הדירוג והחוות דעת
   המילולית, נגזרת מחוות דעת הכללית."*

   ⚠⚠ **"עד שיש חדשה" = תמיד האחרונה, ואין דגל "נקרא".**
     חוות דעת אינה התראה: היא אינה משהו שמטפלים בו ואז הוא
     נעלם. הכרטיס מציג את העדכנית ביותר, והיא מתחלפת מעצמה
     כשנכתבת אחת אחריה — בדיוק כמו התראה שנגזרת מהמצב (4כו).

   ⚠ **כללית בלבד** (`placement` ריק). חוות דעת של סדרה שייכת
     לצוות שלה ומופיעה במסך שלו; `placement` הוא מה שמבדיל
     ביניהן על אותו לוח (5ד).

   ⚠⚠ **ורק כשיש טקסט.** שורה נפתחת כדי שדירוגי
     החניכים ייאספו אליה, וההערה נכתבת אחרי כן — אם
     בכלל. כרטיס שיציג שורה בלי מילה הוא רעש שמפסיקים
     לראות, והבקשה היא במפורש "החוות דעת המילולית".

   ⚠ **`score` לעולם לא לבד.** הוא מגיע עם `source` — הצבעות
     חניכים או ציון ידני — ועם `votes`. ממוצע של 23 חניכים
     וציון שמדריך אחד זכר הם שני דברים, וזו כל הסיבה שיש שתי
     עמודות (4ב). ומספר בלי מניין אינו אומר אם הוא של הכיתה
     או של שני אנשים (5כו).

   ⚠⚠ **ואין כאן מונה, בכוונה.** 31 מתוך 32 חוות הדעת הכלליות
     הן המיובאות של מחזור א׳, ו**אין להן תאריך כלל** — כלומר
     הן אינן יכולות להיות "האחרונה", אבל הן בהחלט קיימות.
     `total` שהיה מחזיר 1 נקרא כמו "יש חוות דעת אחת במערכת",
     וזה פשוט לא נכון. מספר שנראה כמו מדידה ואינו — 4יח.

   ⚠ **הדירוג חי מלוח הדירוגים** ולא מהשדה השמור, כמו ב-
     `?action=evals`: חניך שדירג אחרי שחוות הדעת נכתבה נספר.
   ============================================================ */

import { withAuth } from "./_session.js";
import { lessonRights } from "./_lesson-rights.js";
import { loadEvals, loadRatings, ratingFor } from "./_lessons-data.js";

/* ⚠ קיצור לכרטיס. הטקסט המלא במסך חוות הדעת — כרטיס בית
   שנושא שלוש פסקאות דוחף למטה את כל מה שמתחתיו. */
const MAX = 400;

async function handler(req, res, session) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "רק GET נתמך כאן" });
  }

  const g = await lessonRights(session);
  if (!g.read) return res.status(403).json({ error: g.hint });

  try {
    const [evals, ratings] = await Promise.all([loadEvals(), loadRatings()]);

    /* ⚠ כללית · עם טקסט · ועם תאריך שאפשר למיין לפיו. */
    const pool = evals.filter((e) => !e.placement && e.opinion && (e.at || e.lessonDate));

    if (!pool.length) {
      /* ⚠ "אין עדיין" הוא מצב תקין ונאמר ככזה — לא שגיאה,
         ולא כרטיס ריק שנראה כמו תקלה (עיקרון 6). */
      return res.status(200).json({ latest: null });
    }

    /* ⚠ **לפי מתי נכתבה ולא מתי היה השיעור.** "האחרונה" היא
       המידע החדש ביותר; חוות דעת שנכתבה היום על שיעור מלפני
       חודש היא בדיוק מה שהצוות טרם ראה. `lessonDate` הוא
       נתון אחר ומוצג לצידו (5ג). */
    const key = (e) => e.at || e.lessonDate || "";
    const latest = pool.reduce((a, b) => (key(b) > key(a) ? b : a));

    const live = latest.meetingId ? ratingFor(latest.meetingId, ratings) : null;
    const students = live || (latest.votes ? { avg: latest.avg, votes: latest.votes } : null);
    const text = String(latest.opinion || "");

    /* ⚠ מיפוי מפורש ולא פריסה: לוח חוות הדעת נושא **טלפון של
       מרצה חיצוני**, ו-`...latest` היה מוציא אותו למסך הבית
       (עיקרון 4, ואותה אזהרה שכתובה ב-lessons-boards.js). */
    res.status(200).json({
      latest: {
        id: latest.id,
        name: latest.name,
        topic: latest.topic,
        field: latest.field,
        at: latest.at,
        lessonDate: latest.lessonDate,
        by: latest.by,
        opinion: text.slice(0, MAX),
        /* ⚠ כדי שהמסך יאמר "יש עוד" ולא יחתוך בלי לומר. */
        truncated: text.length > MAX,
        score: students ? students.avg : latest.manual,
        source: students ? "students" : latest.manual != null ? "manual" : null,
        votes: students ? students.votes : null,
      },
    });
  } catch (e) {
    console.error("[last-eval]", e);
    res.status(502).json({ error: "טעינת חוות הדעת נכשלה" });
  }
}

/* ⚠ `student: true` הוא השער, וההכרעה ב-`lessonRights` — אחראי
   הלו״ז וועדת קבוצה ותוכן הם חניכים (4כב, 5לד). */
export default withAuth(handler, { student: true });
