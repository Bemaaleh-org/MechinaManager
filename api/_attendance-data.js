/* ============================================================
   נתוני הנוכחות — שליפה, מטמון וחישוב. צד שרת בלבד.
   ------------------------------------------------------------
   מרכז את הקריאות משלושת הלוחות כדי שכל נקודת קצה לא תבנה
   שאילתה משלה. כל החישובים — מכסת חופש, סיכומים, מצב יום —
   יושבים כאן ולא במסכים.

   ⚠ "נוכח" אינו נתון שמור אלא נגזרת: חניך נוכח בכל יום שאין
     לו בו שורת היעדרות. ראו ההסבר המלא ב-shared/mechina-boards.js.
   ============================================================ */

import { allItems, gql } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { parseTestDate } from "./_test-date.js";
import {
  MECHINA_BOARDS, MECHINA_COLS, DAY_KIND, HALF,
  ABSENCE, VACATION_PER_HALF, VACATION_ALLOWED_ON, NON_SCHOOL_KINDS,
} from "../shared/mechina-boards.js";

const CAL = MECHINA_COLS.calendar;
const ABS = MECHINA_COLS.absence;
const MRK = MECHINA_COLS.marked;

const TZ = "Asia/Jerusalem";

/** התאריך של היום בישראל, כמחרוזת YYYY-MM-DD */
export function israelToday(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(at);
}

/**
 * מה נחשב "היום" עבור הבקשה הזו.
 *
 * ⚠ ‎?date=‎ כאן הוא היום שמציגים, ולכן שער הבדיקה נושא שם אחר:
 *   ‎?today=‎. הוא עובר דרך parseTestDate בדיוק כמו במטבח, ולכן
 *   חסום לחלוטין בכל דיפלוי — production וגם preview. באוויר
 *   הפרמטר מתעלם כאילו לא נשלח.
 *
 * ⚠ בלעדיו אי אפשר לבדוק את המסכים לפני 06/09/2026: שנת
 *   הלימודים טרם התחילה, וכל יום בלוח הוא עתידי.
 */
export function todayFor(req) {
  const at = parseTestDate(req?.query?.today);
  return israelToday(at || new Date());
}

const val = (item, colId) => (item.column_values.find((c) => c.id === colId) || {}).text || "";
const linked = (item, colId) => {
  const c = item.column_values.find((x) => x.id === colId);
  return (c && c.linked_item_ids && c.linked_item_ids[0]) ? String(c.linked_item_ids[0]) : null;
};

/* ---------- לוח השנה ----------
   משתנה לעיתים נדירות, ולכן תפוגה ארוכה מ-30 השניות הרגילות.
   שינוי סוג יום בלוח נכנס לתוקף תוך עשר דקות. */
export async function loadCalendar({ force = false } = {}) {
  return cached("mechina-calendar", async () => {
    const items = await allItems(MECHINA_BOARDS.calendar);
    const days = items
      .map((i) => ({
        date: val(i, CAL.date),
        kind: val(i, CAL.kind) || DAY_KIND.regular,
        half: val(i, CAL.half) || null,
      }))
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { days, byDate: new Map(days.map((d) => [d.date, d])) };
  }, { force, ttl: 10 * 60_000 });
}

/* ---------- היעדרויות ---------- */
export async function loadAbsences({ force = false } = {}) {
  return cached("mechina-absences", async () => {
    const items = await allItems(MECHINA_BOARDS.absence);
    return items
      .map((i) => ({
        id: String(i.id),
        studentId: linked(i, ABS.student),
        date: val(i, ABS.date),
        type: val(i, ABS.type),
        detail: val(i, ABS.detail),
        source: val(i, ABS.source),
      }))
      .filter((a) => a.studentId && a.date && a.type);
  }, { force });
}

/* ---------- ימי סימון ---------- */
export async function loadMarked({ force = false } = {}) {
  return cached("mechina-marked", async () => {
    const items = await allItems(MECHINA_BOARDS.marked);
    const map = new Map();
    for (const i of items) {
      const date = val(i, MRK.date);
      if (date) map.set(date, { id: String(i.id), by: val(i, MRK.by), at: val(i, MRK.at) });
    }
    return map;
  }, { force });
}

/** לקרוא אחרי כל כתיבה, כדי שהמסך הבא יראה את המצב האמיתי */
export function invalidateAttendance() {
  invalidate("mechina-absences");
  invalidate("mechina-marked");
}

/* ---------- כללים ---------- */

/** האם מותר לנצל יום חופש בתאריך הזה, ולמה לא */
export function vacationRule(day) {
  if (!day) return { allowed: false, reason: "התאריך אינו בלוח השנה של המכינה" };
  if (VACATION_ALLOWED_ON.includes(day.kind)) return { allowed: true, reason: null };
  return { allowed: false, reason: `יום ${day.kind} — אי אפשר לנצל בו יום חופש` };
}

/** האם ביום הזה בכלל מסמנים נוכחות */
export const isSchoolDay = (day) => Boolean(day) && !NON_SCHOOL_KINDS.includes(day.kind);

/* ---------- סיכום לחניך ---------- */

/**
 * הסיכום שמוצג לחניך ולמנהל.
 *
 * ⚠ המכנה הוא מספר הימים שסומנו בפועל, לא מספר הימים שבלוח.
 *   ראו ההסבר ב-shared/mechina-boards.js — חופשות חג אינן
 *   מסומנות, וכל מכנה שנגזר מהלוח מנפח את המספר.
 */
export function summarize(studentId, { absences, marked, byDate }) {
  const mine = absences.filter((a) => a.studentId === studentId);

  const markedDates = [...marked.keys()].sort();
  const schoolDays = markedDates.length;

  const count = (type) => mine.filter((a) => a.type === type).length;

  /* מכסת חופש לפי מחצית. שבוע האמצע מאפס — ולכן שתי מכסות
     נפרדות ולא מספר אחד. */
  const usedIn = (half) =>
    mine.filter((a) => a.type === ABSENCE.vacation && (byDate.get(a.date) || {}).half === half).length;

  const quota = (half) => {
    const used = usedIn(half);
    return { half, used, left: Math.max(0, VACATION_PER_HALF - used), total: VACATION_PER_HALF };
  };

  const absent = mine.filter((a) => marked.has(a.date)).length;

  return {
    schoolDays,
    present: Math.max(0, schoolDays - absent),
    absent,
    sick: count(ABSENCE.sick),
    justified: count(ABSENCE.justified),
    vacation: count(ABSENCE.vacation),
    quota: [quota(HALF.first), quota(HALF.second)],
  };
}

/* ---------- כתיבה ---------- */

/** רושם שהיום סומן, או מעדכן מי סימן אותו לאחרונה */
export async function stampMarked(date, by, at = new Date()) {
  const marked = await loadMarked();
  const hit = marked.get(date);
  const cols = {
    [MRK.date]: { date },
    [MRK.by]: String(by || "").slice(0, 120),
    [MRK.at]: { date: israelToday(at), time: at.toISOString().slice(11, 19) },
  };

  if (hit) {
    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.marked, i: hit.id, v: JSON.stringify(cols) }
    );
    return hit.id;
  }

  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: MECHINA_BOARDS.marked, n: date, v: JSON.stringify(cols) }
  );
  return d.create_item.id;
}

/** יוצר שורת היעדרות. מחזיר את המזהה. */
export async function createAbsence({ studentId, studentName, date, type, detail, source }) {
  const cols = {
    [ABS.student]: { item_ids: [Number(studentId)] },
    [ABS.date]: { date },
    [ABS.type]: { label: type },
    [ABS.source]: { label: source },
  };
  if (detail) cols[ABS.detail] = String(detail).slice(0, 2000);

  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: MECHINA_BOARDS.absence, n: `${studentName} · ${date}`, v: JSON.stringify(cols) }
  );
  return String(d.create_item.id);
}

/** מסיר שורת היעדרות — משמש כשמסמנים חניך בחזרה כנוכח */
export async function deleteAbsence(id) {
  await gql(`mutation{ delete_item(item_id:${Number(id)}){ id } }`);
}
