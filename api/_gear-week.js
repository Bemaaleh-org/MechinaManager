/* ============================================================
   רשימות הציוד השבועיות — כל הוועדות במסך אחד
   ------------------------------------------------------------
     GET ?action=gear-week      הכול, לפי ועדה

   הבקשה: *"תוציא משם את היו״רים של הוועדות ותפריד את זה, ואותם
   תהפוך לרשימות ציוד בנפרד עם אותם הגדרות שצריך להגיש, וזה
   מתווסף לדף חדש — רשימות ציוד שבועיות."*

   ⚠⚠ **מסך שקורא, ולא העברת שורות.** השורות נשארות בלוח רשומות
     הצוות ושייכות לוועדה — בדיוק כמו במסך קניות המכינה (5מ).
     העתק בשני מקומות פירושו שהגשה באחד משאירה את השני פתוח,
     וזה ההפך המדויק ממה שהמסך נועד לעשות.

   ⚠ **וההגשה נשארת אצל הוועדה** (`?action=team-entry`): כאן
     רואים מה הוגש ומה עוד לא, ומי שמגיש הוא היו״ר או הצוות
     במסך הוועדה. שני מסלולי הגשה היו שני מקורות אמת (5מט).

   ⚠ **הדדליין מגיע מ-`shared/team.js`** (`nextBuyDeadline`) ולא
     מחושב כאן — אותו מספר שהפעמון מזכיר לפיו (4מד).

   ⚠⚠ **צוות בלבד.** הרשימות האלה הן מה שמישהו לוקח איתו לקניות,
     והן נושאות את שמות מי שביקש — `isManager` הוא כל כניסת
     צוות, וזה הרף הנכון כאן (אותו רף של קניות המכינה).
   ============================================================ */
import { withAuth } from "./_session.js";
import { loadDefinitions } from "./_placements.js";
import { teamsReady } from "./_team-data.js";
import { loadTeamEntries } from "./_team-extras.js";
import { TEAM_BUY_KIND, TEAM_CATEGORIES, nextBuyDeadline, israelHourNow } from "../shared/team.js";
import { israelToday } from "./_attendance-data.js";

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "מתודה לא נתמכת" });
  /* ⚠ ההודעה אומרת מי כן רשאי ולא "אין הרשאה" (4כב). */
  if (!session.isManager) {
    return res.status(403).json({ error: "רשימות הציוד השבועיות מוצגות לצוות המכינה" });
  }
  /* ⚠ כשל הקמה נראה אחרת מ"אין רשימות" (עיקרון 6). */
  if (!teamsReady()) {
    return res.status(503).json({
      error: "לוחות הצוותים טרם הוקמו ב-monday. הריצו: npm run setup:boards",
      setupRequired: true,
    });
  }

  try {
    const today = israelToday();
    const [defs, entries] = await Promise.all([loadDefinitions(), loadTeamEntries()]);

    /* ⚠ ועדות, סדרות וצוותים מזדמנים — `TEAM_CATEGORIES` הוא המקור
       היחיד, ולא רשימה שנייה שתתפצל ממנו (4ס). ⚠ ומארכב יורד. */
    const teams = defs
      .filter((d) => TEAM_CATEGORIES.includes(d.category) && !d.archived);

    const rows = entries.filter((e) => e.kind === TEAM_BUY_KIND);

    /* ⚠ **שלושה מצבים ולא שניים** (4ט):
         טיוטה  — נכתבה וטרם הוגשה (`date` ריק)
         הוגשה  — `date` = יום ההגשה
         נקנתה  — `done`
       "טרם הוגשה" אינו "אין מה לקנות", וזה בדיוק מה שהמסך
       הזה קיים בשבילו. */
    const list = teams.map((t) => {
      const mine = rows.filter((e) => String(e.team) === String(t.id));
      const draft = mine.filter((e) => !e.date && !e.done);
      const sent = mine.filter((e) => e.date && !e.done);
      const bought = mine.filter((e) => e.done);
      /* ⚠ מיפוי מפורש ולא פריסה — שדה חדש בלוח הרשומות לא
         ידלוף לכאן מעצמו (עיקרון 4). */
      const map = (e) => ({
        id: e.id, title: e.title, qty: e.qty, extra: e.extra,
        date: e.date, done: e.done, by: e.by, team: String(t.id), teamName: t.name,
      });
      return {
        id: String(t.id),
        name: t.name,
        category: t.category,
        chairName: t.chairName || null,
        draft: draft.map(map),
        sent: sent.map(map),
        bought: bought.map(map),
        /* ⚠ **מתי הוגש לאחרונה** — הוועדה שלא הגישה החודש היא
           מה שמחפשים כאן, ותאריך אומר את זה בלי לספור. */
        lastSent: sent.concat(bought).map((e) => e.date).filter(Boolean).sort().pop() || null,
      };
    }).sort((a, b) =>
      /* ⚠ מי שיש לו מה שהוגש קודם — זה מה שיוצאים איתו לקניות. */
      (b.sent.length > 0) - (a.sent.length > 0)
      || (b.draft.length > 0) - (a.draft.length > 0)
      || a.name.localeCompare(b.name, "he"));

    const totals = {
      teams: list.length,
      /* ⚠ **כמה ועדות לא הגישו כלום** — המספר שאומר כמה מהתמונה
         חסר שייך למסך ולא רק ללוג (4יח). */
      noList: list.filter((t) => !t.sent.length && !t.draft.length).length,
      drafts: list.reduce((a, t) => a + t.draft.length, 0),
      sent: list.reduce((a, t) => a + t.sent.length, 0),
    };

    res.status(200).json({
      teams: list,
      totals,
      deadline: nextBuyDeadline(today, israelHourNow()),
      today,
    });
  } catch (e) {
    console.error("[gear-week]", e);
    res.status(502).json({ error: "שליפת רשימות הציוד נכשלה" });
  }
}

export default withAuth(handler);
