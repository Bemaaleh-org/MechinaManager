/* ============================================================
   POST /api/lessons?action=mark   { meetingId, happened, note }

   מדווח אם מפגש התקיים בפועל.

   happened: "כן" | "לא" | null
   ⚠ null מחזיר את המפגש ל"טרם דווח" — וזה מצב שלישי אמיתי,
     לא קיצור ל"לא התקיים". מפגש שאיש לא נגע בו אינו מוריד
     ממניין השיעורים שהמרצה העביר.

   ⚠ **ראש המכינה, אחראי הלו״ז, וועדה שנושאת גיליונות**
     — והועדה במפגשים של הגיליונות שלה בלבד. הכול
     מ-`lessonRights`, ואין כאן שער שני — ראו ההערה מתחת.
     הבדיקה בשרת ונקראת טרי בכל בקשה: חניך שהוסר
     מהועדה או מהתפקיד נחסם מיד (4יט).
   ============================================================ */

import { withAuth } from "./_session.js";
import { lessonRights } from "./_lesson-rights.js";
import { HAPPENED } from "../shared/lessons-boards.js";
import {
  loadMeetings, loadSheets, setMeeting, syncEvalLecturer,
} from "./_lessons-data.js";

const VALUES = [HAPPENED.yes, HAPPENED.no];

/* ============================================================
   ⚠⚠⚠ **היה כאן שער שני, והוא סתר את הראשון**
   (דיווח ראש המכינה, 16.9.2026: *"לגבי ההרשאות של
   קבוצה ותוכן משום מה הם לא מצליחים לרשום את שם
   המרצה שמגיע"*).

   `mayMark` בדק `isManager || isScheduler || isLeader || leadsAnyWeek`
   **לפני** ש-`lessonRights` נקראה בכלל, והוא אינו כולל את
   הועדה. כל ששת חברי ועדת קבוצה ותוכן — היו״ר בכללם —
   הם חניכים בלי תפקיד אחראי הלו״ז, ולכן קיבלו **403
   מיידי** על כל שלושת המסלולים שעוברים דרך כאן:
   "התקיים", **"שם המרצה שהגיע"**, והערת חוות הדעת.

   ⚠⚠ וההערה שלושים שורות מתחת אמרה את ההפך במפורש —
     "והועדה כן נכנסה … שער אחד: `lessonRights`". הכוונה
     הייתה כתובה, והשער השני פשוט נשאר מאחור. זה בדיוק
     5לא ו-5לד: שני מימושים לאותה שאלה, וההפרש מתגלה
     רק כשמישהו מתלונן.

   ⚠ **והוא גם לא הוסיף הגנה.** מי שעבר אותו ואינו ראש
     המכינה, אחראי הלו״ז או ועדה — מדריך, רואה חשבון,
     מוביל שבוע — נחסם במילא ב-`rights.write` שלוש שורות
     מתחת. כל מה שהוא שינה בפועל הוא **איזו הודעה** הם
     רואים — וההודעה הייתה גם שגויה: היא הבטיחה
     למובילי השבוע דיווח שהוסר מהם ב-5לד.

   **השער הוא `lessonRights` ורק הוא**, כמו בכל שאר מסלולי
   הלו״ז, והוא מצומצם לפי גיליון שלוש שורות למטה.
   ============================================================ */

async function handler(req, res, session) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const meetingId = String(body?.meetingId || "").trim();
    const happened = body?.happened === null || body?.happened === undefined
      ? null
      : String(body.happened);

    if (!meetingId) return res.status(400).json({ error: "לא צוין מפגש" });
    if (happened !== null && !VALUES.includes(happened)) {
      return res.status(400).json({ error: `ערך לא מוכר: ${happened}` });
    }

    /* ⚠ מהמטמון ולא force. שליפה טרייה כאן משכה את כל 689
       המפגשים בכל לחיצה על "התקיים", וזו הייתה כל האיטיות.
       אם המפגש אינו במטמון — ורק אז — נשלף מחדש. */
    let meetings = await loadMeetings();
    let meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) {
      meetings = await loadMeetings({ force: true });
      meeting = meetings.find((m) => m.id === meetingId);
    }
    if (!meeting) return res.status(404).json({ error: "המפגש אינו נמצא" });

    /* ============================================================
       ⚠⚠⚠ **מובילי שבוע ירדו מכאן לגמרי** (החלטת ראש המכינה,
       10.9.2026): *"תוריד באופן מוחלט את ההרשאות של מובילי שבוע
       לגבי סימון שיעורים האם התקיים או לא התקיים, זה מעכשיו
       יתבצע אך ורק על ידי אחראי לו״ז בלבד."*

       מה שהיה כאן: `{scheduler:true}` פתח את נקודת הקצה גם
       למוביל שבוע, ובדיקת טווח הגבילה אותו למפגשים של השבועות
       שהוא מוביל — הכלל של 4ע ו-5ב. **זה בוטל.** הבדיקה כולה
       ירדה, ואיתה הייבוא של `weeksOfStudent`.

       ⚠ **הם עדיין רואים את לוח השיעורים** (`mayBoard` ב-
         `_lessons-board.js` לא השתנה) — מוביל שבוע צריך לדעת
         מה הלו״ז. מה שנסגר הוא הדיווח.

       ⚠ **ו-`canMark` מוחזר ללוח** כדי שהכפתור לא יופיע ויקבל
         403 אחרי הלחיצה (4יד).

       ⚠ **והוועדה כן נכנסה** — היא זו שמסמנת "התקיים" לפני
         שהיא כותבת חוות דעת (5כח). שער אחד: `lessonRights`.
       ============================================================ */
    const rights = await lessonRights(session);
    if (!rights.write) return res.status(403).json({ error: rights.hint });

    /* ⚠⚠ **והוועדה מסמנת רק במפגשים של הגיליונות שלה.**
       `rights.write` לבדו הוא בוליאני גורף — הוא היה מאפשר
       לסמן "התקיים" באימונים ובתנ״ך. הגיליון נלקח **מהמפגש**
       ולא מגוף הבקשה, בדיוק כמו התחום בציוד המכולה (4כב).
       ⚠ 404 ולא 403 — 403 מאשר שהמפגש קיים. */
    if (rights.limited) {
      const sheet = (await loadSheets()).find((x) => x.id === meeting.sheetId);
      if (!sheet || !rights.mayWrite(sheet)) {
        return res.status(404).json({ error: "המפגש אינו נמצא" });
      }
    }

    const fields = { happened };
    if (body?.note !== undefined) fields.note = body.note;
    if (body?.lecturer !== undefined) fields.lecturer = body.lecturer;
    /* ⚠⚠ **פרטי הקשר על המפגש, ולא על חוות הדעת**
       (17.9.2026): מרצה שתואם לעוד שלושה חודשים צריך
       להירשם עכשיו, וחוות דעת שתשב ריקה ברשימה
       שלושה חודשים היא בדיוק מה שמלמד להתעלם
       מהרשימה. כשהיא תיפתח — הפרטים יועתקו אליה. */
    if (body?.phone !== undefined) fields.phone = body.phone;
    if (body?.mail !== undefined) fields.mail = body.mail;
    if (body?.opinion !== undefined) fields.opinion = body.opinion;

    await setMeeting(meetingId, fields);

    /* ============================================================
       ⚠⚠⚠ **סימון "התקיים" אינו פותח חוות דעת** (בקשת
       ראש המכינה, 17.9.2026: *"כשמכניסים שם מרצה אז זה לא
       יפתח חוות דעת אוטומטית אלא אם לחצו על פתיחת חוות דעת"*).

       עד כאן כל סימון "התקיים" בגיליון "מרצה מתחלף" פתח
       שורת חוות דעת ריקה. התוצאה: רשימת חוות הדעת התמלאה
       בשורות שאיש לא ביקש — וברשימה כזו מפסיקים להבחין במה
       שבאמת נכתב. פתיחה היא עכשיו פעולה מפורשת במסך.

       ⚠ **והדירוגים אינם אובדים.** הם נשמרים בלוח הדירוגים
         לפי מפגש, ו-`ensureEvalForMeeting` מעתיקה את הממוצע ואת
         מניין המדרגים כשהשורה נפתחת בפועל — גם כעבור חודש.
         מה שהשתנה הוא מתי השורה נולדת, ולא אם הנתון נשמר.

       ⚠ **ושם המרצה כן ממשיך לזרום** — `syncEvalLecturer` למטה
         מעדכנת שורה שכבר קיימת, כדי שהשם שהועלה עכשיו
         יופיע בחוות הדעת מעצמו.
       ============================================================ */
    let evalRow = null;
    if (body?.lecturer !== undefined) {
      try {
        evalRow = await syncEvalLecturer(meetingId, String(body.lecturer || "").trim());
      } catch (e) {
        console.error("[lesson-mark:eval-name]", e);
      }
    }

    res.status(200).json({
      ok: true, id: meetingId, happened, date: meeting.date,
      lecturer: meeting.lecturer, opinion: meeting.opinion,
      phone: meeting.phone ?? null, mail: meeting.mail ?? null,
      evalId: evalRow ? evalRow.id : null,
      /* ⚠ שורה אינה נפתחת עוד מעצמה — ראו מעל. */
      evalCreated: false,
      evalRenamed: Boolean(evalRow && evalRow.renamed),
    });
  } catch (e) {
    console.error("[lesson-mark]", e);
    res.status(502).json({ error: "עדכון המפגש נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { student: true });
