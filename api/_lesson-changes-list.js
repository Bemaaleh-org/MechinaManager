/* ============================================================
   GET /api/lessons?action=changes   מה השתנה בלו״ז לאחרונה
   ------------------------------------------------------------
   הרשימה שמאחורי ההתראה בראש מסך הבית של אחראי הלו״ז: מה זז,
   מה בוטל, מה נוסף ומה נמחק — כדי שהוא יעדכן את היומן החיצוני.

   ⚠ **הקריאה היא `lessonRights.read`** — צוות, אחראי הלו״ז
     וועדת קבוצה ותוכן, בדיוק אותו קהל שרשאי לשנות. שער נפרד
     כאן היה הופך את הרשימה למסלול שני אל שורות הגיליון (5יג).

   ⚠ **מיפוי מפורש** (`toChange`): שורת הגיליון נושאת טלפון
     ואימייל של מרצה חיצוני ומחיר למפגש (עיקרון 4).

   ⚠ **מה ששיניתי בעצמי חוזר עם `mine: true` ואינו מסונן.**
     במסך זו תזכורת מועילה — "אתה הזזת את זה, עדכנת ביומן?" —
     ומה שכן יורד הוא **ההתראה** בפעמון, שהיא זו שמרגישה
     כרעש כשהיא מודיעה לך על פעולה שהרגע עשית (5כה).
   ============================================================ */

import { withAuth } from "./_session.js";
import { lessonRights } from "./_lesson-rights.js";
import { loadSheets } from "./_lessons-data.js";
import { changesSince, toChange } from "./_lesson-changes.js";
import { changeLogReady, CHANGE_DAYS } from "../shared/lessons-boards.js";

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "רק GET נתמך כאן" });

  const rights = await lessonRights(session);
  if (!rights.read) return res.status(403).json({ error: rights.readHint });

  /* ⚠ **כשל הקמה נראה אחרת מ"אין שינויים"** (עיקרון 6). רשימה
     ריקה כאן הייתה טענה שקרית: אין רישום, לא אין שינויים. */
  if (!changeLogReady()) {
    return res.status(200).json({
      ready: false,
      changes: [],
      days: CHANGE_DAYS,
      hint: "יומן השינויים טרם הוקם. הריצו: npm run setup:boards",
    });
  }

  try {
    const sheets = await loadSheets();
    const me = String(session.itemId || "");
    const changes = changesSince(sheets).map((s) => toChange(s, me));
    res.status(200).json({ ready: true, days: CHANGE_DAYS, changes });
  } catch (e) {
    console.error("[lesson-changes-list]", e);
    res.status(502).json({ error: "טעינת השינויים נכשלה" });
  }
}

/* ⚠ `{student:true}` הוא השער, וההכרעה ב-`lessonRights` — חבר
   ועדת קבוצה ותוכן הוא חניך (4כב). */
export default withAuth(handler, { student: true });
