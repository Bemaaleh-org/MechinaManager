/* ============================================================
   /api/cron?job=weekly   סיכום שבועי בדחיפה
   ------------------------------------------------------------
   ⚠⚠ **הדחיפה היא נקישה, וההודעה נבנית ב-`_notify.js`.**

   `api/_push.js` שולח בלי מטען, וה-Service Worker פונה בעצמו
   ל-`?action=notify` ומציג את מה שמצא (5ה). כלומר משימה
   שדוחפת בלי שקיימת התראה מקבילה מציגה למשתמש **כלום** —
   ולכן `weeklyNote` יושבת ב-`_notify.js` ונבנית מאותו מצב.

   ⚠ **וזו הסיבה שהמשימה הזו כמעט אינה עושה דבר**: כל העבודה
     היא בבונה ההתראות, וכאן רק ההחלטה "היום זה היום" והשליחה.

   ------------------------------------------------------------
   ⚠⚠ **Vercel Cron בתוכנית הזו רץ פעם ביום, ולכן המשימה רצה
     כל יום ובודקת בעצמה אם היום ראשון.**

   `"0 15 * * 0"` היה נכון בתוכנית אחרת; כאן יש הרצה יומית אחת
   (`vercel.json`), והיא כבר תפוסה על ידי סבב הדחיפה. הפתרון
   הוא לא עוד cron אלא בדיקת יום בתוך אותה הרצה.

   ⚠ **ראשון בבוקר ולא שבת בלילה.** הסיכום מדבר על השבוע
     שהסתיים, ומי שמקבל אותו במוצאי שבת עוד לא סיים אותו.

   ⚠ **ו"נשלח השבוע" נשמר**, אחרת הרצה כפולה באותו יום — או
     ניסיון ידני — דוחפת פעמיים.
   ============================================================ */
import { israelToday } from "./_attendance-data.js";
import { boardColumn } from "./_board-col.js";
import { gql } from "./_monday.js";
import { AUTH_BOARD } from "../shared/auth-board.js";

const STAMP_COL = "סיכום שבועי אחרון";

/** יום ראשון בשעון ישראל. ⚠ לא שעת השרת — Vercel רצה ב-UTC (5ב). */
function isSunday(iso) {
  return new Date(iso + "T12:00:00Z").getUTCDay() === 0;
}

/* ⚠ החותמת יושבת על שורה אחת בלוח ההרשאות ולא לכל משתמש: זו
   שאלה של "האם הסבב הזה כבר רץ", ולא של "מי קרא". */
async function readStamp() {
  const col = await boardColumn(AUTH_BOARD, STAMP_COL, "text");
  if (!col) return { col: null, at: "" };
  const d = await gql(
    `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:1){ items{
         id column_values(ids:["${col}"]){ text } } } } }`);
  const item = d.boards?.[0]?.items_page?.items?.[0];
  return {
    col,
    item: item ? String(item.id) : null,
    at: (item && item.column_values[0] && item.column_values[0].text) || "",
  };
}

export default async function weekly(req, res) {
  const today = israelToday();
  const force = String(req.query?.force || "") === "1";

  if (!isSunday(today) && !force) {
    /* ⚠ 200 ולא 204: המשימה רצה והחליטה, וזה מידע. הרצה
       שמסתיימת בשקט נראית כמו הרצה שנפלה. */
    return res.status(200).json({ ok: true, skipped: "לא יום ראשון", today });
  }

  let stamp = { col: null, item: null, at: "" };
  try { stamp = await readStamp(); } catch (e) { console.error("[weekly:stamp]", e.message); }

  if (stamp.at === today && !force) {
    return res.status(200).json({ ok: true, skipped: "כבר נשלח היום", today });
  }

  let targets = 0;
  try {
    const { pushReady } = await import("./_push.js");
    if (!pushReady()) {
      return res.status(200).json({ ok: true, skipped: "דחיפה אינה מוגדרת", today });
    }
    const { nudgeMany } = await import("./_push-now.js");
    const { activeStudents } = await import("./_student-rows.js");
    const { authRows } = await import("./_session.js");
    const { KIND } = await import("../shared/auth-board.js");

    const students = (await activeStudents()).map((s) => s.id);
    const staff = (await authRows())
      .filter((u) => u.active && u.kind !== KIND.trainee && u.kind !== KIND.shared)
      .map((u) => u.id);

    targets = students.length + staff.length;
    /* ⚠ **שתי קבוצות, אותה נקישה.** מה שכל אחד יראה נקבע
       ב-`buildNotes` לפי מי הוא — ראו ההערה בראש. */
    nudgeMany("student", students, "סיכום שבועי");
    nudgeMany("staff", staff, "סיכום שבועי");
  } catch (e) {
    console.error("[weekly]", e);
    return res.status(502).json({ error: "הסבר השבועי נכשל", detail: e.message });
  }

  /* ⚠ החותמת **אחרי** השליחה: כשל באמצע ישאיר את הסבב פתוח
     לניסיון הבא, וזה עדיף על שבוע בלי סיכום. */
  if (stamp.col && stamp.item) {
    try {
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(
           board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
        { b: AUTH_BOARD, i: stamp.item, v: JSON.stringify({ [stamp.col]: today }) });
    } catch (e) { console.error("[weekly:stamp-write]", e.message); }
  }

  /* ============================================================
     ⚠⚠ **מוחזר `targets` ולא `sent`, וזה לא אותו דבר.**

     `nudge` היא fire-and-forget במכוון (5ה) — היא אינה מוחזרת
     ב-await, ולכן אי אפשר לדעת כאן כמה מכשירים באמת קיבלו.
     גרסה ראשונה החזירה `sent: targets`, כלומר **הצהירה
     שארבעים מכשירים קיבלו** בזמן שאיש לא נרשם עדיין לדחיפה.

     מספר שנשמע כמו מדידה ואינו — זו בדיוק התקלה שהמערכת הזו
     מנסה לא לעשות (4יח: "המספר שאומר כמה מהתמונה חסר שייך
     למסך"). כמה באמת נשלחו נרשם בלוג של `nudge`.
     ============================================================ */
  res.status(200).json({
    ok: true, today, targets,
    note: "targets הוא כמה אנשים נוגעה להם הנקישה, לא כמה מכשירים קיבלו — "
      + "מי שלא הפעיל התראות אינו מקבל דבר.",
  });
}
