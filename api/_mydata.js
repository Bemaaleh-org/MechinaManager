/* ============================================================
   /api/students?action=mydata   מה המערכת מחזיקה עליי
   ------------------------------------------------------------
   ⚠⚠ **זה מסך של הצהרה, לא של ייצוא.** התכלית אינה לתת קובץ
     אלא לענות על שאלה שחניך שואל בצדק: "מה בעצם רשום עליי
     כאן, ומי רואה את זה".

   ולכן כל פריט נושא שלושה דברים ולא אחד:
     **מה** — הנתון עצמו
     **מאיפה** — מי הזין אותו: אני, הצוות, או שהמערכת גזרה
     **מי רואה** — אני בלבד · המדריך שלי · כל הצוות

   ⚠ **"מי רואה" נכתב ביד לכל מקור, ואינו נגזר.** אין במערכת
     נתון שאומר "מי רשאי לקרוא את השדה הזה" — ההרשאות פזורות
     בעשרות מודולים. הצהרה שנגזרת חצי-נכון גרועה מהצהרה
     שנכתבה בעיון, כי היא **נראית** סמכותית. אותו נימוק בדיוק
     כמו מפת ההרשאות (5ד), ששם נאמר במפורש מה אי אפשר לגזור.

   ⚠⚠ **ומה שהמערכת אינה קוראת — נאמר שהיא אינה קוראת.** בלוח
     המצבה יש כתובת מלאה, שמות ההורים, טלפוניהם, קופת חולים
     ובעיה רפואית. הם שם כי המכינה שמה אותם, והמערכת **אינה**
     קוראת אותם ואינה מחזירה אותם (4פ, 4יג). זה נאמר במסך
     במפורש — כי חניך שרואה רשימה קצרה מניח שיש עוד, והוא צודק
     שיש עוד; מה שהוא צריך לדעת הוא שאנחנו לא נוגעים בזה.

   ------------------------------------------------------------
   ⚠ **הכול על עצמי בלבד, ואין כאן פרמטר של מזהה.** נקודת קצה
     שמקבלת "על מי" היא נקודת קצה שאפשר לבקש בה מישהו אחר.
     הזהות מגיעה מהסשן, נקודה.

   ⚠ **הצוות מקבל 400 ולא 403.** אין כאן שאלה של הרשאה — פשוט
     אין מה להחזיר: התיק של איש צוות הוא חשבון הכניסה שלו
     בלבד, וזה כבר בפרופיל.
   ============================================================ */
import { withAuth } from "./_session.js";
import { israelToday } from "./_attendance-data.js";

/** פריט אחד בהצהרה. */
const F = (label, value, from, who, note) => ({
  label,
  /* ⚠ ריק מוחזר כ-null ומוצג כ"לא הוזן" — לא כמחרוזת ריקה
     שנראית כמו תקלת תצוגה (4ט). */
  value: value === "" || value === undefined ? null : value,
  from, who, note: note || null,
});

const FROM = { me: "אני", staff: "הצוות", derived: "נגזר מהמערכת" };
const WHO = {
  me: "אני בלבד",
  guide: "אני והמדריך שלי",
  staff: "אני וכל הצוות",
  all: "כל המכינה",
};

async function handler(req, res, session) {
  if (!session.isStudent) {
    return res.status(400).json({
      error: "המסך הזה מציג מה רשום על חניך. לאיש צוות רשומים רק פרטי הכניסה, "
        + "והם נמצאים בפרופיל.",
    });
  }

  const me = String(session.itemId || "");
  const today = israelToday();
  const groups = [];
  const failed = [];

  const add = async (title, fn) => {
    try {
      const items = (await fn()).filter(Boolean);
      if (items.length) groups.push({ title, items });
    } catch (e) {
      /* ⚠ מקור שנופל **נספר ומדווח** — הצהרה חלקית שנראית מלאה
         היא בדיוק ההפך ממה שהמסך הזה נועד לו. */
      console.error("[mydata:" + title + "]", e && e.message);
      failed.push(title);
    }
  };

  /* ---------- הזהות ---------- */
  await add("הזהות שלי", async () => {
    const { studentRows } = await import("./_student-rows.js");
    const row = (await studentRows()).find((r) => r.id === me);
    if (!row) return [];
    const { phoneHe } = await import("../shared/mechina-boards.js");
    return [
      F("שם", row.name, FROM.staff, WHO.all),
      /* ⚠⚠ **מוצגת חלקית גם לבעליה.** תעודת הזהות היא סוד
         הכניסה הראשונה (4כח), ומסך שמציג אותה במלואה הוא מסך
         שמישהו יצלם מעבר לכתף. ארבע ספרות מספיקות כדי לזהות
         שזו אכן שלך, וזו כל התכלית כאן. */
      F("תעודת זהות", row.tz ? "•••••" + String(row.tz).slice(-4) : null,
        FROM.staff, WHO.staff,
        "מוצגת חלקית — היא גם סיסמת הכניסה הראשונה"),
      F("תאריך לידה", row.dob, FROM.staff, WHO.staff),
      F("מגדר", row.gender, FROM.staff, WHO.staff),
      /* ⚠ monday מחזירה 972527043037 — נכון טכנית ובלתי קריא (4פ). */
      F("טלפון", phoneHe(row.phone), FROM.staff, WHO.staff),
      F("אימייל אישי", row.mail, FROM.staff, WHO.staff,
        /* ⚠ שתי עמודות בשם דומה בלוח, והחלפה ביניהן משנה
           למישהו את חשבון הכניסה (4פ). */
        "נפרד מהאימייל שאיתו נכנסים למערכת"),
      F("עיר מגורים", row.city, FROM.staff, WHO.staff),
      F("אלרגיה או רגישות", row.allergy, FROM.staff, WHO.staff,
        "מוצגת לצוות — זו כל הסיבה שהיא רשומה"),
      F("הגדרה דתית", row.religion, FROM.staff, WHO.staff),
      F("מידת חולצה", row.shirt, FROM.staff, WHO.staff),
    ];
  });

  /* ---------- חשבון הכניסה ---------- */
  await add("חשבון הכניסה", async () => {
    /* ⚠⚠ **`identities()` ולא `authRows()`.** לחניך אין שורה
       בלוח ההרשאות — הזהות שלו יושבת על שורת המצבה, ו-
       `identities` הוא המקום היחיד שמאחד את שני המקורות.
       גרסה ראשונה כאן קראה מ-`authRows` והחזירה רשימה ריקה
       **בשקט**: הקבוצה פשוט לא הופיעה, וזה נראה כאילו אין
       לחניך חשבון כניסה. */
    const { identities } = await import("./_identity.js");
    const row = (await identities()).find((r) => String(r.id) === me);
    if (!row) return [];
    return [
      F("שם משתמש", row.user, FROM.me, WHO.staff),
      F("אימייל לכניסה ולאיפוס", row.email, FROM.me, WHO.staff),
      /* ⚠⚠ **הסיסמה אינה נשמרת בשום מקום** — מה שיושב בלוח הוא
         תוצאת scrypt עם מלח אקראי (4כח). זה נאמר, ולא מושמט:
         חניך שלא רואה "סיסמה" ברשימה מניח שהיא שם ופשוט לא
         מוצגת. */
      F("סיסמה", row.hash ? "נשמרת כגיבוב scrypt בלבד" : "טרם נקבעה",
        FROM.me, WHO.me,
        "הסיסמה עצמה אינה נשמרת בשום מקום — לא לצוות, לא למפתח ולא לנו"),
    ];
  });

  /* ---------- נוכחות ---------- */
  await add("הנוכחות שלי", async () => {
    const { loadAbsences, summarize, loadMarked, loadCalendar } =
      await import("./_attendance-data.js");
    const [abs, marked, cal] = await Promise.all([
      loadAbsences(), loadMarked(), loadCalendar(),
    ]);
    /* ⚠ `byDate` ולא `calendar` — זו החתימה, וכל שאר הקוראים
       משתמשים בה. שם שדה שגוי כאן היה מחזיר אפסים בשקט. */
    const s = summarize(me, { absences: abs, marked, byDate: cal.byDate }, today);
    const mine = (abs || []).filter((a) => String(a.studentId) === me);
    return [
      F("ימי לימוד שסומנו", s.schoolDays, FROM.derived, WHO.staff),
      F("ימים שנכחתי", s.present, FROM.derived, WHO.staff),
      F("היעדרויות", s.absent, FROM.derived, WHO.staff),
      /* ⚠ **אחוז אינו מוצג מתחת לסף.** "0% נוכחות" ביום השני
         הוא מספר נכון חשבונית ושקרי במשמעותו, והוא הדבר הראשון
         שחניך רואה על עצמו (4ג). */
      F("אחוז נוכחות",
        s.schoolDays >= 5 ? Math.round((s.present / s.schoolDays) * 100) + "%" : null,
        FROM.derived, WHO.staff,
        s.schoolDays >= 5 ? null : "מוצג מחמישה ימים מסומנים ומעלה"),
      /* ⚠ **המחצית ולא השנה.** ימי החופש נקבעים למחצית ופגים
         בסופה, ומספר שנתי הוא בדיוק המספר שאי אפשר לתכנן לפיו. */
      F("ימי חופש שנותרו במחצית הנוכחית",
        (s.quota.find((x) => x.half === s.currentHalf) || s.quota[0] || {}).left,
        FROM.derived, WHO.staff),
      F("בקשות יציאה שהגשתי", mine.length || null, FROM.me, WHO.guide,
        "המדריך ממליץ, וראש המכינה מכריע — והשלב עצמו אינו מוצג לחניך"),
    ];
  });

  /* ---------- שיבוצים ותפקידים ---------- */
  await add("השיבוצים והתפקידים שלי", async () => {
    const { loadAssignments, loadDefinitions } = await import("./_placements.js");
    const [asg, defs] = await Promise.all([loadAssignments(), loadDefinitions()]);
    const byId = new Map(defs.map((d) => [d.id, d]));
    const mine = asg.filter((a) => String(a.student) === me)
      .map((a) => (byId.get(a.placement) || {}).name)
      .filter(Boolean);
    const { studentRows } = await import("./_student-rows.js");
    const row = (await studentRows()).find((r) => r.id === me);
    return [
      F("ענפים, ועדות וסדרות", mine.length ? mine.join(" · ") : null,
        FROM.staff, WHO.all, "השיבוצים גלויים לכל המכינה"),
      F("תפקידים", (row && row.roles || []).join(" · ") || null,
        FROM.staff, WHO.all),
    ];
  });

  /* ---------- המיונים ---------- */
  await add("מיונים ושיבוץ צה״ל", async () => {
    const { loadTryouts } = await import("./_tryouts.js");
    const { studentRows } = await import("./_student-rows.js");
    const [rows, roster] = await Promise.all([loadTryouts(), studentRows()]);
    const mine = rows.filter((t) => String(t.student) === me);
    const row = roster.find((r) => r.id === me);
    return [
      F("מיונים שרשמתי", mine.length || null, FROM.me, WHO.staff,
        /* ⚠ הבעלות אצל החניך — גם ראש המכינה אינו עורך (5ד). */
        "אני היחיד שכותב כאן. גם ראש המכינה אינו עורך את זה"),
      F("חיל", row && row.armyCorps, FROM.me, WHO.staff),
      F("פירוט תפקיד", row && row.armyRole, FROM.me, WHO.staff),
    ];
  });

  /* ---------- מה שהמערכת אינה נוגעת בו ---------- */
  await add("מה שהמערכת אינה קוראת", async () => [
    /* ⚠⚠ ההצהרה החשובה במסך. ראו ההערה בראש הקובץ. */
    F("כתובת מגורים מלאה", "בלוח, ואינה נקראת", FROM.staff, "אף אחד באפליקציה"),
    F("שמות ההורים וטלפוניהם", "בלוח, ואינם נקראים", FROM.staff, "אף אחד באפליקציה"),
    F("קופת חולים ובעיה רפואית", "בלוח, ואינם נקראים", FROM.staff, "אף אחד באפליקציה",
      "האפליקציה אינה שולפת את השדות האלה בשום מסלול"),
  ]);

  /* ---------- מה שהמערכת אינה שומרת בכלל ---------- */
  await add("מה שאינו נשמר כלל", async () => [
    F("מי ביצע איזו תורנות", "אינו נשמר", FROM.derived, "אף אחד",
      /* ⚠ עיקרון 5 — הבטחה שניתנה לחניכים, לא החלטה טכנית. */
      "הבטחה שניתנה לחניכים: אין שדה שמזהה מי ביצע מה"),
    F("המשימות שלי במרכז התפקיד", "הצוות אינו רואה אותן", FROM.me, WHO.me,
      "גם למנהל אין מסלול קריאה אליהן (4מה)"),
    F("הפרויקטים שלי", "הצוות אינו רואה אותם", FROM.me, WHO.me,
      "כולל התקציב והמשימות שבתוכם (5ח)"),
    F("משוב אנונימי ששלחתי", "אין דרך לקשר אותו אליי", FROM.me, "אף אחד",
      "בלוח אין עמודת כותב, והתשובה אינה מחזירה מזהה שורה"),
  ]);

  res.status(200).json({
    ok: true,
    today,
    name: session.name || null,
    groups,
    /* ⚠ מוחזר מה נכשל, ולא רק מה הצליח (עיקרון 6). */
    ...(failed.length ? { failed } : {}),
    legend: { from: FROM, who: WHO },
  });
}

export default withAuth(handler, { student: true });
