/* ============================================================
   GET  /api/notify            ההתראות של מי שמחובר
   POST /api/notify?seen=...   סימון שנקראו

   ------------------------------------------------------------
   ⚠ ההתראות **נגזרות ואינן נשמרות**. אין לוח "התראות" ואין
     תור הודעות. בכל שליפה נשאלים אותם לוחות שהמסכים שואלים,
     ומה שדורש טיפול הופך לשורה.

     זו החלטה ולא קיצור דרך. תור הודעות שמור מתיישן ברגע
     שמישהו מטפל בתקלה דרך monday: ההתראה נשארת פתוחה ומצביעה
     על משהו שכבר נסגר, והמשתמש לומד להתעלם ממנה. התראה
     שנגזרת מהמצב נעלמת מעצמה כשהמצב משתנה — וזה בדיוק
     ההתנהגות שגורמת לאנשים להמשיך להסתכל.

   ⚠ לכל התראה **נמען לפי תפקיד**, לא "לכולם". אב בית מקבל
     תקלות, אחראי מטבח מקבל חוסרים, אחראי לו״ז מקבל שיעורים
     שלא דווחו. מנהל מקבל את הכול — הוא זה שאמור לדעת שדבר
     לא נופל בין הכיסאות.

   ⚠ חניך מקבל רק מה שנוגע לו אישית: הבקשה שלו הוכרעה, נקבעה
     לו שיחה, שובץ לו תפקיד. לעולם לא נתונים של חניך אחר.

   ⚠ "נקרא" נשמר כחותמת זמן אחת למשתמש (עמודה בלוח ההרשאות
     או במצבת החניכים), ולא שורה לכל התראה. מה שנוצר אחרי
     החותמת הוא חדש. פשוט, ומספיק לתג על הפעמון.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { boardColumn } from "./_board-col.js";
import {
  dutiesForStudent, loadHandovers, loadNotes,
  handoverFor, handoverStamp,
} from "./_duty-data.js";
import { dutyKey } from "../shared/duties.js";
import { israelToday, loadMarked, loadCalendar, isSchoolDay } from "./_attendance-data.js";
import { weeksOfStudent } from "./_leader-weeks.js";
import { AUTH_BOARD, AUTH_COLS } from "../shared/auth-board.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { invalidate } from "./_cache.js";

import { loadFaults } from "./_faults.js";
import { loadIncidents } from "./_safety.js";
import { loadLoans } from "./_loans.js";
import { loadHosting } from "./_hosting.js";
import { loadRequests } from "./_requests.js";
import { loadSheets, loadMeetings, loadEvals } from "./_lessons-data.js";
import { loadGantt } from "./_lessons-gantt.js";
import { loadEquipment } from "./_container-data.js";
import { loadKitchenEquipment } from "./_kitchen-data.js";

import { FAULT_STATUS, FAULT_URGENCY } from "../shared/faults-board.js";
import { missingFor } from "../shared/par.js";
import { mayArea, AREA } from "../shared/container-boards.js";
import { PLANNED, minutesOf } from "../shared/lessons-boards.js";
import { requestStage, REQ_STAGE, REQ_STATUS } from "../shared/mechina-boards.js";
import { guideMap, isGuideOf } from "./_guides.js";
import {
  choresReady, loadSectors, loadRoster, loadLeaderWeeks,
} from "./_chores-data.js";

/** כמה ימים קדימה נחשבים "קרוב" */
const SOON = 7;

/* ============================================================
   ⚠ **השעה בשעון ישראל, ולא בשעון השרת.**

   Vercel רצה ב-UTC. "ערב" שנמדד בשעון השרת מגיע בישראל
   בשלוש לפנות בוקר בקיץ — כלומר תזכורת שנועדה לסוף היום
   מופיעה בלילה שאחריו, ומי שקיבל אותה כבר מאחר.
   ============================================================ */
const israelHour = (at = new Date()) => Number(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false,
  }).format(at));

/** מאיזו שעה תזכורת "סוף היום" מופיעה */
const EVENING_FROM = 18;

const shift = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * התראה אחת.
 * ⚠ ה-id יציב על פני שליפות — הוא נגזר מהתוכן ולא מספר רץ.
 *   בלעדיו "נקרא" היה מתאפס בכל רענון.
 */
const note = (o) => ({
  id: o.id,
  kind: o.kind,
  title: o.title,
  body: o.body || null,
  /* לאיזה מסך לקפוץ */
  tab: o.tab || null,
  /* ⚠ תאריך שממנו נגזר "חדש". ריק = תמיד חדש. */
  when: o.when || null,
  /* ⚠ **חותמת מלאה, כשיש.** `when` הוא תאריך בלבד, והשוואה
     שלו מול `seenAt` נכשלת באותו יום: מי שפתח את הפעמון
     בבוקר ושובץ לתפקיד בצהריים לא היה מקבל תג. */
  at: o.at || null,
  /* גבוה = דורש טיפול היום · רגיל · נמוך = לידיעה */
  level: o.level || "רגיל",
});

/* ============================================================
   הבונים — אחד לכל תחום
   ⚠ כל אחד מחזיר רשימה, וכולם רצים במקביל. אף אחד מהם אינו
     יודע מי המשתמש; הסינון לפי תפקיד נעשה למעלה.
   ============================================================ */

async function faultNotes(today) {
  const all = await loadFaults();
  const open = all.filter((f) => f.status !== FAULT_STATUS.done);
  const urgent = open.filter((f) => f.urgency === FAULT_URGENCY.urgent);
  const out = [];
  /* ⚠ דחוף — שורה לכל אחת. תקלה דחופה היא הדבר היחיד כאן
     שמצדיק להפריע למישהו בשמה. */
  for (const f of urgent) {
    out.push(note({
      id: `fault:${f.id}`, kind: "תקלה", level: "גבוה",
      title: `תקלה דחופה · ${f.title}`,
      body: [f.place, f.reporter].filter(Boolean).join(" · ") || null,
      tab: "faults", when: f.date,
    }));
  }
  /* ⚠ והשאר כמספר אחד. עשרים שורות "תקלה פתוחה" הן רעש
     שגורם לסגור את הפעמון ולא לפתוח אותו. */
  const rest = open.length - urgent.length;
  if (rest > 0) {
    out.push(note({
      id: `faults:open:${rest}`, kind: "תקלה",
      title: `${rest} תקלות פתוחות`,
      body: "ממתינות לטיפול", tab: "faults",
    }));
  }
  return out;
}

async function stockNotes(kind, area) {
  const list = kind === "kitchen"
    ? await loadKitchenEquipment()
    : (await loadEquipment()).filter((x) => x.area === area);
  const low = list.filter((x) => missingFor(x) > 0);
  if (!low.length) return [];
  return [note({
    id: `stock:${kind}:${area || "all"}:${low.length}`, kind: "מלאי",
    title: `${low.length} פריטים מתחת למפתח`,
    body: low.slice(0, 3).map((x) => x.name).join(" · ")
      + (low.length > 3 ? ` ועוד ${low.length - 3}` : ""),
    tab: kind === "kitchen" ? "k-all" : area === AREA.cleaning ? "cleaning" : "container",
  })];
}

async function loanNotes(today) {
  const list = await loadLoans();
  const late = list.filter((x) => !x.back && x.due && x.due < today);
  const due = list.filter((x) => !x.back && x.due && x.due >= today && x.due <= shift(today, SOON));
  const out = [];
  for (const l of late) {
    out.push(note({
      id: `loan:late:${l.id}`, kind: "השאלה", level: "גבוה",
      title: `ציוד באיחור · ${l.title}`,
      body: [l.party, `להחזרה ${l.due}`].filter(Boolean).join(" · "),
      tab: "loans", when: l.due,
    }));
  }
  if (due.length) {
    out.push(note({
      id: `loan:due:${due.length}:${today}`, kind: "השאלה",
      title: `${due.length} השאלות להחזרה השבוע`,
      body: due.slice(0, 3).map((x) => x.title).join(" · "), tab: "loans",
    }));
  }
  return out;
}

async function safetyNotes(today) {
  const list = await loadIncidents();
  const recent = list.filter((x) => x.date && x.date >= shift(today, -14));
  const out = [];
  for (const s of recent) {
    /* ⚠ אירוע שטרם דווח להורים הוא הדבר שנשכח, ולכן הוא
       שנשלח ולא האירוע עצמו. */
    if (s.parents && s.parents !== "לא") continue;
    out.push(note({
      id: `safety:parents:${s.id}`, kind: "בטיחות", level: "גבוה",
      title: `טרם דווח להורים · ${s.title}`,
      body: [s.date, s.severity].filter(Boolean).join(" · "),
      tab: "safety", when: s.date,
    }));
  }
  if (recent.length) {
    out.push(note({
      id: `safety:recent:${recent.length}:${recent[0].id}`, kind: "בטיחות",
      title: `${recent.length} אירועי בטיחות בשבועיים האחרונים`,
      tab: "safety", when: recent[0].date,
    }));
  }
  return out;
}

async function hostingNotes(today) {
  const list = await loadHosting();
  const soon = list.filter((h) => h.from && h.from >= today
    && h.from <= shift(today, SOON) && h.status !== "בוטל");
  return soon.map((h) => note({
    id: `hosting:${h.id}`, kind: "אירוח",
    title: `אירוח קרוב · ${h.title}`,
    body: [h.from, h.people ? `${h.people} איש` : null, h.sleeping]
      .filter(Boolean).join(" · "),
    tab: "hosting", when: h.from,
  }));
}

/* ============================================================
   תזכורת למוביל השבוע — נוכחות שלא סומנה
   ------------------------------------------------------------
   ⚠ **נגזרת מהמצב ואינה תור.** ברגע שמישהו סימן את היום היא
     נעלמת מעצמה, גם אם הסימון נעשה ב-monday (4כו).

   ⚠ **מופיעה בערב ולא בבוקר.** תזכורת שמלווה את המוביל כל
     היום היא רעש: הוא באמת עוד לא סימן, ובצדק. מ-18:00 היא
     הופכת לפעולה.

   ⚠ **ורק בימים שהמכינה סופרת.** יום חופש, סדרה או "לא
     התקיימה שגרת מכינה" אינם ימים שמסמנים בהם, ותזכורת
     עליהם מלמדת להתעלם מהפעמון.

   ⚠ אלה התראות **בתוך האפליקציה**. דחיפה לטלפון או במייל
     דורשת שירות חיצוני ולא נבנתה — ראו 4כו.
   ============================================================ */
async function leaderMarkNotes(session, today) {
  /* ⚠ שער זול ראשון: רוב החניכים אינם מובילים, ובלעדיו כל
     אחד מהם היה שולף שלושה לוחות כל שלוש דקות. */
  if (!session.isStudent) return [];
  const weeks = await weeksOfStudent(session.itemId);
  if (!weeks.length) return [];

  const cal = await loadCalendar();
  const out = [];

  /* ⚠ **כל יום שכבר עבר בשבוע שלו וטרם סומן** — ולא רק היום.
     מוביל שפספס יום שני יגלה את זה ביום חמישי, וזה בדיוק
     הרגע שבו עוד אפשר לתקן. */
  const marked = await loadMarked();
  const missed = [];
  for (const w of weeks) {
    for (const d of cal.days) {
      if (d.date < w.start || d.date > w.end) continue;
      if (d.date > today) continue;
      if (!isSchoolDay(d)) continue;
      /* היום עצמו נחשב רק מהערב */
      if (d.date === today && israelHour() < EVENING_FROM) continue;
      if (!marked.has(d.date)) missed.push(d.date);
    }
  }
  if (!missed.length) return out;

  missed.sort();
  const isToday = missed.includes(today);
  out.push(note({
    /* ⚠ מזהה נגזר מהתוכן ולא מספר רץ — אחרת "נקרא" מתאפס
       בכל רענון (4כו). */
    id: `leader:unmarked:${missed.join(",")}`,
    kind: "נוכחות", level: "גבוה",
    title: isToday && missed.length === 1
      ? "טרם סומנה נוכחות היום"
      : `${missed.length} ימים בשבוע שלכם טרם סומנו`,
    body: missed.length === 1 ? missed[0] : missed.slice(0, 4).join(" · ")
      + (missed.length > 4 ? ` ועוד ${missed.length - 4}` : ""),
    tab: "mark",
    when: missed[missed.length - 1],
  }));
  return out;
}

async function lessonNotes(today) {
  const [sheets, meetings, evals, gantt] = await Promise.all([
    loadSheets(), loadMeetings(), loadEvals(), loadGantt()]);
  const byId = new Map(sheets.map((s) => [s.id, s]));
  const live = meetings.filter((m) => {
    const s = byId.get(m.sheetId);
    return s && s.active && m.date && m.planned !== PLANNED.no;
  });

  const out = [];

  /* ============================================================
     ⚠ **שתי תזכורות ולא אחת, ובשתי נקודות זמן.**

     "12 שיעורים טרם דווחו" הוא מספר שמלמדים להתעלם ממנו תוך
     שבוע. מה שדורש פעולה **עכשיו** הוא מה שקרה היום ומה שקרה
     אתמול, וזה מה שנשלף בנפרד ובעדיפות גבוהה:

       · **בערב** — שיעורי היום שטרם דווחו. מ-18:00, כי לפני
         כן הם עוד מתקיימים.
       · **למחרת** — שיעורי אתמול. זה הרגע שבו עוד זוכרים מה
         היה, ואחריו הדיווח הופך לניחוש.

     הרשימה הארוכה נשארת, ויורדת לעדיפות רגילה — היא הזנב,
     לא המטלה.
     ============================================================ */
  const todayLive = live.filter((m) => m.date === today && !m.happened);
  if (todayLive.length && israelHour() >= EVENING_FROM) {
    const names = [...new Set(todayLive.map((m) => (byId.get(m.sheetId) || {}).subject))];
    out.push(note({
      id: `lessons:today:${today}:${todayLive.length}`, kind: "שיעורים", level: "גבוה",
      title: `${todayLive.length} שיעורים של היום טרם דווחו`,
      body: names.slice(0, 3).join(" · "),
      tab: "lessons", when: today,
    }));
  }

  const yst = shift(today, -1);
  const ystLive = live.filter((m) => m.date === yst && !m.happened);
  if (ystLive.length) {
    const names = [...new Set(ystLive.map((m) => (byId.get(m.sheetId) || {}).subject))];
    out.push(note({
      id: `lessons:yesterday:${yst}:${ystLive.length}`, kind: "שיעורים", level: "גבוה",
      title: `${ystLive.length} שיעורים של אתמול טרם דווחו`,
      body: names.slice(0, 3).join(" · ") + " · עוד זוכרים מה היה",
      tab: "lessons", when: yst,
    }));
  }

  /* ⚠ מה שהתקיים וטרם דווח — הזנב הארוך. **היום ואתמול יורדים
     ממנו**, כדי שאותה מטלה לא תופיע פעמיים בשני ניסוחים. */
  const unreported = live.filter((m) => m.date < yst
    && m.date >= shift(today, -14) && !m.happened);
  if (unreported.length) {
    const names = [...new Set(unreported.map((m) => (byId.get(m.sheetId) || {}).subject))];
    out.push(note({
      /* ⚠ "רגיל" ולא "גבוה": המטלה הדחופה היא היום ואתמול,
         ורשימה של שבועיים שצועקת מאמנת להתעלם. */
      id: `lessons:unreported:${unreported.length}`, kind: "שיעורים", level: "רגיל",
      title: `${unreported.length} שיעורים טרם דווחו`,
      body: names.slice(0, 3).join(" · ") + (names.length > 3 ? ` ועוד ${names.length - 3}` : ""),
      tab: "lessons",
    }));
  }

  /* ⚠ שיעור של מרצה אורח שהתקיים ואין עליו חוות דעת. זו
     הסיבה שמסך חוות הדעת קיים, והיא מתפספסת אם לא מזכירים.

     ⚠ ההצלבה לפי meetingId — חוות דעת נכתבת על **מפגש**
       מסוים ולא על הגיליון. שני שיעורי אורח באותו נושא הם
       שתי חוות דעת. */
  const rated = new Set((evals || []).map((e) => String(e.meetingId || "")));
  const guestDone = live.filter((m) => m.happened === "כן"
    && m.date >= shift(today, -30) && m.date < today
    && (byId.get(m.sheetId) || {}).guestLecturer
    && !rated.has(String(m.id)));
  if (guestDone.length) {
    out.push(note({
      id: `lessons:rate:${guestDone.length}`, kind: "שיעורים",
      title: `${guestDone.length} שיעורי אורח ממתינים לחוות דעת`,
      body: [...new Set(guestDone.map((m) => (byId.get(m.sheetId) || {}).subject))]
        .slice(0, 3).join(" · "),
      tab: "evals",
    }));
  }

  /* ⚠ מה שמחר. לא כל השבוע — רשימה של שבוע נקראת כמו לו״ז
     ומפסיקים להסתכל בה; מחר זה משהו שעושים איתו משהו. */
  const tomorrow = shift(today, 1);
  const next = live.filter((m) => m.date === tomorrow)
    .sort((a, b) => minutesOf((byId.get(a.sheetId) || {}).dayTime)
      - minutesOf((byId.get(b.sheetId) || {}).dayTime));
  if (next.length) {
    out.push(note({
      id: `lessons:tomorrow:${tomorrow}`, kind: "שיעורים", level: "נמוך",
      title: `${next.length} שיעורים מחר`,
      body: next.slice(0, 4).map((m) => (byId.get(m.sheetId) || {}).subject).join(" · "),
      tab: "lessons", when: tomorrow,
    }));
  }

  return out;
}

async function requestNotes(session, today) {
  const [reqs, guides] = await Promise.all([loadRequests(), guideMap()]);
  const out = [];
  const pending = reqs.filter((r) => r.status === REQ_STATUS.pending);
  if (!pending.length) return out;

  /* ⚠ מה שממתין **לו** ולא מה שממתין בכלל. איש צוות שמקבל
     התראה על בקשה שאינה שלו לומד להתעלם מהפעמון.

     ⚠ ראש המכינה מכריע בכל שלב — אותו כלל של מסך הבקשות. */
  const mine = pending.filter((r) => {
    const guide = guides.get(r.studentId) || null;
    if (session.isHead) return true;
    return requestStage(r, Boolean(guide)) === REQ_STAGE.guide
      && isGuideOf(session, guide);
  });
  if (mine.length) {
    out.push(note({
      id: `requests:mine:${mine.length}`, kind: "בקשות", level: "גבוה",
      title: `${mine.length} בקשות יציאה להחלטתך`,
      tab: "requests",
    }));
  }
  return out;
}

/* ============================================================
   ⚠ הצגת קודי איפוס לצוות **הוסרה**.
   ------------------------------------------------------------
   הקוד נשלח למייל של המשתמש בלבד. הוא נשמר בלוח כשסתום חירום
   ואינו מוצג לאיש במסכים — מדריך שרואה קוד איפוס של חניך אחר
   מחזיק מפתח לחשבון שאינו שלו, וזה אינו דבר שצריך להיות מונח
   בפעמון ההתראות.

   ⚠ מי שבאמת נתקע — הקוד נמצא בעמודת "איפוס סיסמה" בלוח.
   ============================================================ */

/* ============================================================
   חניך — רק מה שנוגע לו
   ============================================================ */
async function studentNotes(session, today) {
  const out = [];
  const reqs = (await loadRequests()).filter((r) => r.studentId === session.itemId);

  for (const r of reqs) {
    if (r.status === REQ_STATUS.pending) continue;
    if (!r.decidedAt || r.decidedAt < shift(today, -30)) continue;
    const okay = r.status === "מאושר";
    out.push(note({
      id: `req:${r.id}:${r.status}`, kind: "בקשה",
      level: okay ? "רגיל" : "גבוה",
      title: `בקשת היציאה ${okay ? "אושרה" : "נדחתה"}`,
      body: [r.type, r.date].filter(Boolean).join(" · "),
      tab: "requests", when: r.decidedAt,
    }));
  }

  const pending = reqs.filter((r) => r.status === REQ_STATUS.pending);
  if (pending.length) {
    out.push(note({
      id: `req:pending:${pending.length}`, kind: "בקשה", level: "נמוך",
      title: `${pending.length} בקשות ממתינות לתשובה`,
      tab: "requests",
    }));
  }
  return out;
}


/* ============================================================
   אחריות — שיבוץ לתפקיד, מסמך חפיפה והצפות
   ------------------------------------------------------------
   ⚠ **נגזר מהמצב, כמו כל השאר.** אין כאן "נשלחה התראה": יש
     תפקיד שהחניך נושא, מסמך שהוא טרם אישר, והצפה שטרם השיב
     עליה. ברגע שהוא מטפל — ההתראה נעלמת מעצמה.

   ⚠ **מסמך שנכתב מחדש חוזר להתריע**, כי החותמת כוללת את
     תאריך העדכון. זה מכוון: מסמך חפיפה שעודכן הוא מסמך חדש.

   ⚠ **ההצפה אינה מסומנת "טופלה".** היא נעלמת מהפעמון כשיש
     תשובה, וזה הדבר היחיד שהחניך שולח החוצה. ראו
     api/_duty-notes.js.
   ============================================================ */
async function dutyNotes(session) {
  const duties = await dutiesForStudent(session.itemId);
  if (!duties.length) return [];

  const [docs, notes, read] = await Promise.all([
    loadHandovers(),
    loadNotes(),
    handoverReadSet(session.itemId),
  ]);

  const out = [];
  for (const d of duties) {
    const key = dutyKey(d);

    /* ---- מסמך חפיפה שממתין ---- */
    const doc = handoverFor(docs, d.name);
    if (doc && !read.has(handoverStamp(doc))) {
      out.push(note({
        id: `duty-doc:${key}:${doc.at || ""}`,
        kind: "אחריות",
        title: `מסמך חפיפה ממתין לך — ${d.label}`,
        body: doc.by
          ? `${doc.by} השאיר לך מסמך עם מה שכדאי לדעת לפני שמתחילים`
          : "מי שהיה בתפקיד לפניך השאיר מסמך",
        tab: "duty",
        when: doc.at || null,
        level: "רגיל",
      }));
    }

    /* ---- הצפה מהצוות שטרם נענתה ---- */
    for (const n of notes) {
      if (n.duty !== key || n.reply) continue;
      out.push(note({
        id: `duty-note:${n.id}`,
        kind: "אחריות",
        title: n.title,
        body: n.by ? `${n.by} · ${d.label}` : d.label,
        tab: "duty",
        at: n.at || null,
        level: "רגיל",
      }));
    }
  }
  return out;
}

/* ============================================================
   התורנות שלי
   ------------------------------------------------------------
   ⚠ **החניך מקבל התראה על השיבוץ שלו, ולא על השיבוץ של אחרים.**
     טבלת המעקב אמנם גלויה לכולם, אבל פעמון שמודיע לחניך על
     תורנות של מישהו אחר הוא רעש שמלמד לסגור אותו.

   ⚠ **שער זול לפני כל קריאה.** `_notify` נשאל כל שלוש דקות לכל
     משתמש מחובר, ו-33 חניכים כפול חמישה לוחות הם 165 קריאות
     בשלוש דקות. `isStudent` נבדק ראשון, ואחריו `choresReady`.

   ⚠ **ה-`id` נגזר מהתוכן ולא מספר רץ**, אחרת "נקרא" היה מתאפס
     בכל רענון (4כו).
   ============================================================ */
async function choreNotes(session, today) {
  if (!session.isStudent) return [];
  if (!choresReady()) return [];

  const me = String(session.itemId || "");
  const [sectors, roster, weeks] = await Promise.all([
    loadSectors(), loadRoster(), loadLeaderWeeks(),
  ]);
  const week = weeks.find((w) => w.start <= today && today <= w.end);
  const byId = new Map(sectors.list.map((s) => [s.id, s]));
  const out = [];

  /* ---------- הגזרה של השבוע ---------- */
  if (week) {
    const mine = roster.list.filter((r) => r.week === week.id && r.student === me);
    for (const r of mine) {
      const sec = byId.get(r.sector);
      out.push({
        id: "chore-week-" + week.id + "-" + r.sector,
        tone: "calm",
        title: "התורנות שלך השבוע: " + r.sectorName,
        body: sec && sec.detail ? sec.detail : "גזרת ניקיון בסוף היום",
        tab: "chores",
      });
    }
    /* ⚠ **מוביל שבוע מקבל הודעה משלו.** בלעדיה הוא רואה שאין לו
       תורנות ומניח שנשכח — וזה בדיוק ההפך מהאמת. */
    if (week.leaderIds.map(String).includes(me)) {
      out.push({
        id: "chore-lead-" + week.id,
        tone: "calm",
        title: "השבוע אתם מובילי השבוע",
        body: "מובילי שבוע פטורים מתורנות בשבוע שהם מובילים.",
        tab: "chores",
      });
    }
  }

  /* ---------- תורנות מטבח בימים הקרובים ---------- */
  /* ⚠ שלושה ימים קדימה ולא שבועיים: התראה על תורנות בעוד
     שנים־עשר יום אינה פעולה, והיא מאמנת להתעלם. */
  const soon = roster.list.filter((r) => r.student === me && r.date
    && r.date >= today && r.date <= plusDays(today, 3));
  for (const r of soon) {
    out.push({
      id: "chore-day-" + r.date,
      tone: r.date === today ? "warn" : "calm",
      title: r.date === today
        ? "היום אתם תורני " + r.sectorName
        : "תורנות " + r.sectorName + " ב-" + dmy(r.date),
      body: r.date === today
        ? "הצ׳ק ליסט של היום מחכה במסך התורניות."
        : "יום שלם, ואתם מופרשים מרוב הלו״ז ומתורנות סוף היום.",
      tab: "chores",
    });
  }
  return out;
}

const plusDays = (iso, n) =>
  new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86400000)
    .toISOString().slice(0, 10);
const dmy = (d) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "");

/* ============================================================
   חותמת "נקרא"
   ⚠ עמודה אחת למשתמש, בלוח שממנו הוא מתחבר. אין לוח התראות
     ואין שורה לכל התראה — ראו ההערה בראש הקובץ.
   ============================================================ */
const SEEN_TITLE = "התראות נקראו";

/* ⚠ **היה כאן שאילתת `columns` בכל בקשת פעמון**, בלי מטמון —
   כל שלוש דקות לכל משתמש מחובר. עבר ל-api/_board-col.js, שם
   התוצאה נשמרת. ראו את ההערה שם על מה שהמטמון כן ולא מבטיח. */
const seenColumn = (board) => boardColumn(board, SEEN_TITLE, "text");

/* ⚠ אותה עמודה שמרכז התפקיד כותב אליה — api/_duty-hub.js.
   שתי קריאות לאותה עמודה, ולכן שתיהן עוברות דרך boardColumn
   שמחזיק מטמון. */
async function handoverReadSet(studentId) {
  const col = await boardColumn(MECHINA_BOARDS.roster, "חפיפות שנקראו", "long_text");
  if (!col) return new Set();
  const d = await gql(
    `query($i:[ID!],$c:[String!]){ items(ids:$i){ column_values(ids:$c){ text } } }`,
    { i: [String(studentId)], c: [col] });
  const raw = d.items?.[0]?.column_values?.[0]?.text || "";
  return new Set(raw.split("|").map((x) => x.trim()).filter(Boolean));
}

const boardOf = (session) =>
  session.isStudent ? MECHINA_BOARDS.roster : AUTH_BOARD;

async function readSeen(session) {
  const board = boardOf(session);
  const col = await seenColumn(board);
  const d = await gql(
    `{ items(ids:[${Number(session.itemId)}]){ column_values(ids:["${col}"]){ text } } }`);
  return { col, board, at: (d.items?.[0]?.column_values?.[0]?.text || "").trim() };
}

async function handler(req, res, session) {
  try {
    const today = israelToday();

    if (req.method === "POST") {
      const { col, board } = await readSeen(session);
      const now = new Date().toISOString();
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
        { b: board, i: String(session.itemId), v: JSON.stringify({ [col]: now }) });
      return res.status(200).json({ ok: true, seenAt: now });
    }

    /* ---------- מי מקבל מה ---------- */
    const jobs = [];
    const mgr = Boolean(session.isManager);

    if (session.isStudent) {
      jobs.push(studentNotes(session, today));
      /* ⚠ רק לחניך שנושא אחריות — הבונה עוצר מיד כשאין. בלי
         זה, 33 חניכים היו שולפים ארבעה לוחות כל שלוש דקות. */
      jobs.push(dutyNotes(session));
      jobs.push(choreNotes(session, today));
      /* ⚠ הבונה עוצר מיד כשהחניך אינו מוביל שבוע. */
      jobs.push(leaderMarkNotes(session, today));
    } else {
      jobs.push(requestNotes(session, today));
    }

    /* ⚠ מנהל מקבל את הכול. זה מה שהתבקש, וזה גם נכון: הוא
       האדם שאמור לדעת שדבר לא נפל בין הכיסאות. */
    if (mgr || session.isHouse) {
      jobs.push(faultNotes(today));
      jobs.push(stockNotes("container", AREA.cleaning));
    }
    if (mgr || session.isKitchen) jobs.push(stockNotes("kitchen", null));
    if (mgr || session.isContainer) {
      jobs.push(stockNotes("container", AREA.container));
      jobs.push(loanNotes(today));
    }
    if (mgr || session.isSafety) {
      jobs.push(safetyNotes(today));
      jobs.push(hostingNotes(today));
    }
    if (mgr || session.isScheduler) jobs.push(lessonNotes(today));

    const [lists, seen] = await Promise.all([
      Promise.all(jobs.map((p) => p.catch((e) => {
        /* ⚠ תחום שנופל אינו מפיל את הפעמון. התראה חסרה עדיפה
           על מסך שבור, והשגיאה נרשמת. */
        console.error("[notify] מקור נכשל:", e && e.message);
        return [];
      }))),
      readSeen(session).catch(() => ({ at: "" })),
    ]);

    /* ⚠ מפתח ייחודי: אותה התראה עשויה להגיע משני מקורות אצל
       מנהל שהוא גם בעל תפקיד. */
    const byId = new Map();
    for (const n of lists.flat()) if (!byId.has(n.id)) byId.set(n.id, n);

    const RANK = { "גבוה": 0, "רגיל": 1, "נמוך": 2 };
    const notes = [...byId.values()].sort((a, b) =>
      RANK[a.level] - RANK[b.level] || (b.when || "").localeCompare(a.when || ""));

    /* ⚠ "חדש" = נוצר אחרי החותמת. התראה בלי תאריך נחשבת חדשה
       רק אם מעולם לא נלחץ "נקראו" — אחרת התג לעולם לא היה
       מתאפס. */
    const seenAt = seen.at || "";
    /* ⚠ `at` מדויק לשנייה וגובר; `when` הוא נפילה אחורה
       ליום. בלי ההעדפה הזו, כל מה שקרה **אחרי** הפתיחה באותו
       יום נבלע. */
    const isNew = (n) => {
      if (!seenAt) return true;
      if (n.at) return n.at > seenAt;
      if (n.when) return n.when > seenAt.slice(0, 10);
      return true;
    };

    return res.status(200).json({
      notes: notes.map((n) => ({ ...n, fresh: isNew(n) })),
      count: notes.length,
      unread: notes.filter(isNew).length,
      urgent: notes.filter((n) => n.level === "גבוה").length,
      seenAt: seenAt || null,
      today,
    });
  } catch (e) {
    console.error("[notify]", e);
    res.status(502).json({ error: "טעינת ההתראות נכשלה" });
  }
}

export default withAuth(handler, { student: true });
