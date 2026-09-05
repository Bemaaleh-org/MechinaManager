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
import { israelToday, loadMarked, loadCalendar, isSchoolDay, loadAbsences } from "./_attendance-data.js";
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
   משימות פרויקט שעבר היעד
   ------------------------------------------------------------
   ⚠⚠ **ההתראה של החניך על עצמו, ולא של אף אחד אחר.** הפרויקטים
     שלו אינם נגישים לצוות (ראו api/_projects.js), וגם ההתראה
     עליהם נבנית רק בשבילו — היא לעולם אינה נכנסת לפעמון של
     מנהל, גם לא במקרה.

   ⚠ **שורה אחת ולא שורה למשימה.** חמש משימות באיחור הן חמש
     שורות בפעמון, וזה בדיוק מה שמלמד לסגור אותו (4כו).

   ⚠ **ו"היום" אינו איחור.** משימה שהיעד שלה היום עדיין אפשרית,
     וההתראה עליה היא לחץ ולא עזרה.
   ============================================================ */
async function projectNotes(session, today) {
  if (!session.isStudent) return [];
  const out = [];
  try {
    const { loadProjects, loadProjectTasks } = await import("./_projects.js");
    const me = String(session.itemId);
    const projects = (await loadProjects()).filter(
      (p) => !p.archived
        && (String(p.owner) === me || p.partners.map(String).includes(me)));
    if (!projects.length) return [];

    const ids = new Set(projects.map((p) => p.id));
    const tasks = (await loadProjectTasks()).filter((t) => ids.has(t.project));
    const late = tasks.filter((t) => !t.done && t.due && t.due < today);

    if (late.length) {
      const names = [...new Set(late.map((t) => {
        const p = projects.find((x) => x.id === t.project);
        return p ? p.name : null;
      }).filter(Boolean))];
      out.push(note({
        id: `proj:late:${late.length}`, kind: "פרויקט", level: "רגיל",
        title: late.length === 1
          ? "משימה בפרויקט עברה את היעד"
          : `${late.length} משימות בפרויקטים עברו את היעד`,
        body: names.slice(0, 3).join(" · "),
        tab: "projects",
      }));
    }

    /* ⚠ יעד הפרויקט עצמו — קרוב, ולא עבר. אחרי שעבר זו כבר
       שאלה אחרת ("להאריך או לסגור"), והפעמון אינו המקום לה. */
    const soon = projects.filter(
      (p) => p.due && p.due >= today && p.due <= shift(today, 7));
    for (const p of soon) {
      out.push(note({
        id: `proj:due:${p.id}:${p.due}`, kind: "פרויקט", level: "נמוך",
        title: `יעד הפרויקט "${p.name}" בשבוע הקרוב`,
        body: p.due, tab: "projects", when: p.due,
      }));
    }
  } catch (e) {
    /* ⚠ תחום שנופל אינו מפיל את הפעמון (4כו). */
    console.error("[notify:projects]", e && e.message);
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



/* ============================================================
   שבוע ההובלה — לפני שהוא מתחיל, ובזמן שהוא רץ
   ------------------------------------------------------------
   ⚠⚠ **ההתראה החשובה כאן היא זו שמגיעה לפני השבוע.** מוביל
     שמגלה ביום ראשון בבוקר שהוא מוביל השבוע כבר איחר את כל
     ההכנה — וההכנה מראש היא כל התכלית של המסך.

   ⚠ **וזה מדויק לפי הטווח שבלוח ואינו דגל שמישהו מדליק** —
     ההתראה מופיעה ונעלמת מעצמה כשהתאריך חוצה את הקו, בלי שאיש
     יעשה דבר ובלי דיפלוי (5ב).

   ⚠ **שער זול ראשון.** `_notify` נשאל כל שלוש דקות לכל משתמש
     מחובר; חניך שאינו מוביל שבוע יוצא בשורה הראשונה, לפני
     שנקרא ולו לוח אחד.
   ============================================================ */
async function leadWeekNotes(session, today) {
  if (!session.isStudent) return [];
  if (!session.leadsAnyWeek) return [];
  const out = [];
  try {
    const { leadReady } = await import("../shared/lead-ids.js");
    if (!leadReady()) return [];
    const { weeksOfStudent } = await import("./_leader-weeks.js");
    const { loadChecklist, loadLeadLog } = await import("./_lead-week.js");

    const mine = await weeksOfStudent(session.itemId);
    if (!mine.length) return [];

    /* ⚠ **שבעה ימים קדימה ולא יותר.** התראה על שבוע הובלה בעוד
       חודשיים אינה פעולה, והיא מאמנת להתעלם (4צ). */
    const soon = mine.filter((w) => w.start > today && w.start <= shift(today, 7));
    for (const w of soon) {
      out.push(note({
        id: `lead:soon:${w.id}`, kind: "הובלה", level: "רגיל",
        title: `שבוע ההובלה שלך מתחיל ב-${w.start}`,
        body: "אפשר להיכנס עכשיו ולעבור על הצ׳ק ליסט",
        tab: "lead-week", when: w.start,
      }));
    }

    const now = mine.find((w) => w.start <= today && today <= w.end);
    if (!now) return out;

    const [list, log] = await Promise.all([loadChecklist(), loadLeadLog()]);
    const tasks = list.filter((t) => !t.archived && (!t.week || t.week === now.id));
    const done = new Set(log
      .filter((r) => r.kind === "משימה" && r.week === now.id)
      .map((r) => r.ref));
    const left = tasks.filter((t) => !done.has(t.id));

    /* ⚠ **מה שנשאר, כמספר אחד.** עשרים שורות "משימה פתוחה" הן
       רעש שגורם לסגור את הפעמון ולא לפתוח אותו (4כו). */
    if (left.length) {
      /* ⚠ ביום האחרון זה כבר דחוף: מה שלא ייסגר היום עובר
         למובילים הבאים כבעיה שלהם. */
      const last = now.end === today;
      out.push(note({
        id: `lead:left:${now.id}:${left.length}`, kind: "הובלה",
        level: last ? "גבוה" : "רגיל",
        title: last
          ? `היום היום האחרון בשבוע שלך — ${left.length} בצ׳ק ליסט טרם סומנו`
          : `${left.length} בצ׳ק ליסט שבוע ההובלה טרם סומנו`,
        body: left.slice(0, 3).map((t) => t.title).join(" · "),
        tab: "lead-week",
      }));
    }

    /* ⚠ **המסירה נבדקת ביום האחרון ולא אחריו.** אחרי שהשבוע
       נגמר, התראה עליה היא נזיפה על משהו שאי אפשר עוד לעשות
       בזמן — והיא נשארת פתוחה לנצח. */
    if (now.end === today) {
      const { loadLeaderWeeks } = await import("./_leader-weeks.js");
      const week = (await loadLeaderWeeks()).find((w) => w.id === now.id);
      if (week && !String(week.summary || "").trim()) {
        out.push(note({
          id: `lead:sum:${now.id}`, kind: "הובלה", level: "רגיל",
          title: "השבוע נגמר — כדאי לכתוב סיכום ומסירה",
          body: "הסיכום הולך לצוות, והמסירה למובילים הבאים",
          tab: "lead-week",
        }));
      }
    }
  } catch (e) {
    console.error("[notify:lead]", e && e.message);
  }
  return out;
}

/* ============================================================
   הסיכומים שהמובילים שלחו לצוות
   ------------------------------------------------------------
   ⚠ **נגזר מהחותמת ואינו תור.** "נשלח בשבעת הימים האחרונים"
     נעלם מעצמו, ואילו רשימת "טרם נקראו" הייתה נשארת פתוחה עד
     שמישהו יסמן — כלומר לנצח (4כו).

   ⚠ **וזו הסיבה שיש חותמת בכלל**: מוביל שכתב סיכום ואינו יודע
     אם מישהו קיבל אותו לא יכתוב את הבא.
   ============================================================ */
async function leadSummaryNotes(session, today) {
  if (session.isStudent) return [];
  const out = [];
  try {
    const { loadLeaderWeeks } = await import("./_leader-weeks.js");
    const col = MECHINA_COLS.leaderWeeks.summarySent;
    /* ⚠ העמודה נוספה על ידי seed-lead. בלעדיה הבונה שותק
       ואינו מפיל את הפעמון (עיקרון 6). */
    if (!col) return [];

    const since = shift(today, -7);
    const d = await gql(
      `{ boards(ids:[${MECHINA_BOARDS.leaderWeeks}]){ items_page(limit:200){ items {
           id column_values(ids:["${col}"]){ text } } } } }`);
    const rows = d.boards?.[0]?.items_page?.items || [];
    const weeks = await loadLeaderWeeks();
    const sentAt = (id) => {
      const r = rows.find((i) => String(i.id) === String(id));
      return (r && r.column_values[0] && r.column_values[0].text) || null;
    };

    for (const w of weeks) {
      const at = sentAt(w.id);
      if (!at || at < since || !String(w.summary || "").trim()) continue;
      out.push(note({
        id: `lead:sent:${w.id}:${at}`, kind: "הובלה", level: "רגיל",
        title: `סיכום שבוע ${w.num || w.name} נשלח על ידי המובילים`,
        body: String(w.summary).slice(0, 120),
        tab: "week-leaders", when: at,
      }));
    }
  } catch (e) {
    console.error("[notify:lead-sum]", e && e.message);
  }
  return out;
}

/* ============================================================
   לוח המודעות
   ------------------------------------------------------------
   ⚠⚠ **"חדש" נגזר מהתאריך ולא מתור, ולכן נעלם מעצמו.** רשימת
     "טרם נקראו" הייתה נשארת פתוחה עד שמישהו יסמן — כלומר
     לנצח, וזה בדיוק מה שמאמן להתעלם מהפעמון (4כו).

   ⚠ **והקהל נאכף כאן שוב.** `buildNotes` רץ גם בסבב הדחיפה,
     שאין בו מסך שיסנן — מודעה לצוות שתיכנס לפעמון של חניך היא
     דליפה, ולא באג תצוגה.

   ⚠ **שורה אחת למודעה ולא מונה אחד.** בניגוד לתקלות, מודעה
     היא בדיוק הדבר שבשבילו נפתח הפעמון — "3 מודעות חדשות" הוא
     מספר שמחייב לפתוח מסך כדי לדעת אם הוא מעניין.
   ============================================================ */
async function noticeNotes(session, today) {
  const out = [];
  try {
    const { boardReady } = await import("../shared/board-ids.js");
    if (!boardReady()) return [];
    const { loadNotices } = await import("./_board.js");

    /* ⚠ אותה פונקציה של הקהל, ולא העתק שלה — שני עותקים היו
       מתפצלים ביום שמישהו מוסיף קהל שלישי. */
    const forMe = (to) => to === "כולם"
      || (session.isStudent ? to === "חניכים" : to === "צוות");

    const fresh = (await loadNotices())
      .filter((n) => forMe(n.to)
        && n.date && n.date >= shift(today, -5)
        && (!n.until || n.until >= today));

    for (const n of fresh.slice(0, 5)) {
      out.push(note({
        id: `notice:${n.id}`,
        kind: "לוח מודעות",
        /* ⚠ נעוץ הוא החלטה מפורשת של ראש המכינה, ולכן הוא
           רמת "גבוה" — זו כל המשמעות של נעיצה. */
        level: n.pinned ? "גבוה" : "רגיל",
        title: n.title,
        body: [n.kind, n.by].filter(Boolean).join(" · "),
        tab: "board",
        when: n.date,
      }));
    }
  } catch (e) {
    console.error("[notify:notices]", e && e.message);
  }
  return out;
}

/* ============================================================
   הסיכום השבועי
   ------------------------------------------------------------
   ⚠⚠ **זו ההודעה שהדחיפה השבועית מציגה.** הדחיפה עצמה ריקה
     (5ה), וה-Service Worker פונה ל-`?action=notify` ומציג את מה
     שמצא — כלומר בלי הבונה הזה, הדחיפה השבועית מציגה כלום.

   ⚠ **הסיכום מדבר על השבוע שהסתיים**, ולכן הוא מופיע ביום
     ראשון ושני בלבד. התראה שנשארת פתוחה כל השבוע היא בדיוק
     מה שמאמן לסגור את הפעמון (4כו).

   ⚠ **ולחניך ולצוות זו אותה התראה בשני תכנים.** לחניך: מה
     נוגע לו. לצוות: מה במכינה. שני מפתחות שונים, כדי שחניך
     שהוא גם בעל תפקיד לא יקבל שתיהן.

   ⚠⚠ **ואין כאן שום מספר על חניך אחר**, גם לא לצוות: הסיכום
     הוא על המכינה. אותה הבטחה של מסך המגמות (api/_trends.js).
   ============================================================ */
async function weeklyNote(session, today) {
  /* ⚠ ראשון ושני בלבד — ראו ההערה. `israelDay` ולא שעת השרת. */
  const dow = new Date(today + "T12:00:00Z").getUTCDay();
  if (dow > 1) return [];

  const out = [];
  try {
    const last = shift(today, -(dow + 7));
    const end = shift(last, 6);

    if (session.isStudent) {
      const [abs, marked, cal] = await Promise.all([
        loadAbsences(), loadMarked(), loadCalendar(),
      ]);
      const me = String(session.itemId);
      const days = [...marked.keys()].filter((d) => d >= last && d <= end
        && isSchoolDay(cal.byDate.get(d)));
      if (!days.length) return [];
      const here = days.filter((d) => marked.get(d).present.has(me)).length;
      const mine = abs.filter((a) => String(a.studentId) === me
        && a.date >= last && a.date <= end);
      out.push(note({
        id: `weekly:me:${last}`, kind: "סיכום שבועי", level: "רגיל",
        title: `השבוע שעבר: נכחת ב-${here} מתוך ${days.length} ימי לימוד`,
        body: mine.length
          ? `${mine.length} היעדרויות מאושרות`
          : "בלי היעדרויות מאושרות",
        tab: "year", when: end,
      }));
      return out;
    }

    /* ---------- לצוות: על המכינה ---------- */
    const [marked, cal, abs, faults, meetings] = await Promise.all([
      loadMarked(), loadCalendar(), loadAbsences(),
      loadFaults().catch(() => []),
      loadMeetings().catch(() => []),
    ]);
    const days = [...marked.keys()].filter((d) => d >= last && d <= end
      && isSchoolDay(cal.byDate.get(d)));
    if (!days.length) return [];

    const { activeStudents } = await import("./_student-rows.js");
    const n = (await activeStudents()).length || 1;
    const total = days.reduce((a, d) => a + marked.get(d).present.size, 0);
    const pct = Math.round((total / (days.length * n)) * 100);

    const wAbs = abs.filter((a) => a.date >= last && a.date <= end).length;
    const wFaults = faults.filter((f) => f.date >= last && f.date <= end).length;
    const undone = meetings.filter((m) => m.date >= last && m.date <= end
      && m.happened === null).length;

    out.push(note({
      id: `weekly:staff:${last}`, kind: "סיכום שבועי", level: "רגיל",
      title: `סיכום השבוע: ${pct}% נוכחות ב-${days.length} ימים`,
      body: [
        `${wAbs} היעדרויות מאושרות`,
        `${wFaults} תקלות חדשות`,
        /* ⚠ "טרם דווח" הוא המספר שמצריך פעולה, ולכן הוא
           מוצג גם כשהוא 0 — כדי ש-0 יאמר משהו (4ח). */
        undone ? `${undone} מפגשים טרם דווחו` : "כל המפגשים דווחו",
      ].join(" · "),
      tab: "trends", when: end,
    }));
  } catch (e) {
    console.error("[notify:weekly]", e && e.message);
  }
  return out;
}
/* ============================================================
   בניית ההתראות של משתמש אחד
   ------------------------------------------------------------
   ⚠⚠ **מיוצאת כי גם סבב הדחיפה קורא לה** (`_push-run.js`).
     שני מקומות שבונים התראות בנפרד היו מתפצלים ביום הראשון,
     והדחיפה הייתה מודיעה על משהו שהמסך אינו מראה — או להפך.

   ⚠ **אינה נוגעת בחותמת "נקרא".** היא בונה **מה יש**, ולא
     "מה חדש"; מי שקורא לה מחליט מול מה להשוות. הפעמון משווה
     מול החותמת, והדחיפה מול הדחיפה הקודמת — שתי שאלות שונות
     על אותם נתונים.
   ============================================================ */
export async function buildNotes(session, today = israelToday()) {
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
      /* ⚠ הפרויקטים שלו בלבד, ולעולם לא בפעמון של מנהל —
         ולכן הבונה הזה יושב **רק** בענף של החניך. */
      jobs.push(projectNotes(session, today));
      /* ⚠ הבונה עוצר בשורה הראשונה כשהחניך אינו מוביל שבוע. */
      jobs.push(leadWeekNotes(session, today));
    } else {
      jobs.push(requestNotes(session, today));
      /* ⚠ **לכל הצוות ולא לראש המכינה בלבד.** הסיכום מופנה
         לצוות כולו, וזו כל הסיבה שהמוביל טורח לכתוב אותו. */
      jobs.push(leadSummaryNotes(session, today));
    }

    /* ⚠ **מחוץ לשני הענפים, כי הלוח פונה לשניהם.** הקהל נאכף
       בתוך הבונה עצמו — ראו ההערה שם. */
    jobs.push(noticeNotes(session, today));
    /* ⚠ **מחוץ לשני הענפים** — הבונה עצמו מפצל לפי מי המשתמש,
       כי זו אותה התראה בשני תכנים. */
    jobs.push(weeklyNote(session, today));

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

    const [lists] = await Promise.all([
      Promise.all(jobs.map((p) => p.catch((e) => {
        /* ⚠ תחום שנופל אינו מפיל את הפעמון. התראה חסרה עדיפה
           על מסך שבור, והשגיאה נרשמת. */
        console.error("[notify] מקור נכשל:", e && e.message);
        return [];
      }))),
    ]);

    /* ⚠ מפתח ייחודי: אותה התראה עשויה להגיע משני מקורות אצל
       מנהל שהוא גם בעל תפקיד. */
    const byId = new Map();
    for (const n of lists.flat()) if (!byId.has(n.id)) byId.set(n.id, n);

    const RANK = { "גבוה": 0, "רגיל": 1, "נמוך": 2 };
    return [...byId.values()].sort((a, b) =>
      RANK[a.level] - RANK[b.level] || (b.when || "").localeCompare(a.when || ""));
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

    /* ⚠ **הבנייה משותפת לפעמון ולסבב הדחיפה** (`buildNotes`).
       שני מקומות שבונים התראות היו מתפצלים ביום הראשון, ואז
       הדחיפה מודיעה על משהו שהמסך אינו מראה. */
    const [notes, seen] = await Promise.all([
      buildNotes(session, today),
      readSeen(session).catch(() => ({ at: "" })),
    ]);

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
