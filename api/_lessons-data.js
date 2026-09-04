/* ============================================================
   נתוני השיעורים — שליפה, מטמון וספירה. צד שרת בלבד.
   ------------------------------------------------------------
   ⚠ הספירה שהמסך מציג היא כל תכלית המסך: כמה מפגשים תוכננו,
     כמה בוטלו, וכמה התקיימו בפועל. שלושת המספרים האלה נגזרים
     כאן ולא בלקוח, כדי ששני מסכים לא יחשבו אותו דבר אחרת.

   ⚠ "טרם דווח" אינו "לא התקיים". מפגש שאיש לא נגע בו נספר
     בנפרד, ואינו מוריד ממניין השיעורים שהתקיימו. אותה הבחנה
     של "טרם סומן" בלוח הנוכחות — ראו shared/lessons-boards.js.
   ============================================================ */

import { allItems, gql } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { LESSON_BOARDS, LESSON_COLS, PLANNED, HAPPENED, CYCLE } from "../shared/lessons-boards.js";

const S = LESSON_COLS.sheets;
const M = LESSON_COLS.meetings;
const E = LESSON_COLS.evals;

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const linked = (i, c) => {
  const x = i.column_values.find((y) => y.id === c);
  return x && x.linked_item_ids && x.linked_item_ids[0] ? String(x.linked_item_ids[0]) : null;
};
const csv = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

/* ---------- גיליונות ---------- */
export async function loadSheets({ force = false } = {}) {
  return cached("lesson-sheets", async () => {
    const items = await allItems(LESSON_BOARDS.sheets);
    return items
      .map((i) => ({
        id: String(i.id),
        subject: String(i.name || "").trim(),
        lecturer: val(i, S.lecturer) || null,
        dayTime: val(i, S.dayTime) || null,
        active: val(i, S.active) === "v",
        /* ⚠ מסומן בלוח, לא ברשימת שמות בקוד */
        guestLecturer: val(i, S.guestLecturer) === "v",
        /* מפגשיו מוצגים גם במסך סימון הנוכחות (אימונים) */
        inDaily: val(i, S.inDaily) === "v",
        /* ⚠ מחיר למפגש — לדוח התשלום. **ריק אינו אפס**: 0 הוא
           מתנדב, וריק הוא "לא סוכם". */
        price: val(i, S.price) === "" ? null : Number(val(i, S.price)),
        payNote: val(i, S.payNote) || null,
        /* ⚠⚠ פרטי אדם חיצוני. נקראים כאן, ו**אינם יוצאים לחניך** —
           ראו `toStudentSheet` ב-api/_lessons-list.js. */
        phone: val(i, S.phone) || null,
        mail: val(i, S.mail) || null,
        contact: val(i, S.contact) || null,
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject, "he"));
  }, { force, ttl: 5 * 60_000 });
}

/* ---------- מפגשים ---------- */
export async function loadMeetings({ force = false } = {}) {
  return cached("lesson-meetings", async () => {
    const items = await allItems(LESSON_BOARDS.meetings);
    return items
      .map((i) => ({
        id: String(i.id),
        sheetId: linked(i, M.sheet),
        date: val(i, M.date),
        day: val(i, M.day),
        planned: val(i, M.planned) || null,
        reason: val(i, M.reason) || null,
        happened: val(i, M.happened) || null, // ⚠ null = טרם דווח
        note: val(i, M.note) || null,
        lecturer: val(i, M.lecturer) || null,
        opinion: val(i, M.opinion) || null,
        /* נוכחות אימון — רשימות מזהים. מי שלא באף אחת: לא סומן. */
        tPresent: csv(val(i, M.tPresent)),
        tAbsent: csv(val(i, M.tAbsent)),
        tKitchen: csv(val(i, M.tKitchen)),
      }))
      .filter((m) => m.sheetId && m.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    /* ⚠ שתי דקות ולא שלושים שניות. הלוח הזה מונה 689 שורות,
       ושליפה מלאה שלו עולה כשתיים-שלוש שניות. עם 30 שניות היא
       נפלה באמצע רצף דיווחים ואחת הלחיצות "נתקעה" בלי סיבה
       גלויה.

       זה בטוח כאן משתי סיבות: כל כתיבה שלנו מתקנת את המטמון
       במקום לבטלו, והנתון עצמו — לו״ז שנקבע מראש — כמעט אינו
       משתנה מחוץ לאפליקציה. */
  }, { force, ttl: 2 * 60_000 });
}

export const invalidateLessons = () => {
  invalidate("lesson-meetings");
  invalidate("lesson-sheets");
};

/* ---------- ספירה ---------- */

/**
 * הספירה של גיליון אחד.
 *
 * ⚠ שלוש קטגוריות ולא שתיים. "טרם דווח" עומד בפני עצמו, אחרת
 *   מפגש שאיש לא נגע בו היה נספר כמפגש שלא התקיים והמספר שהמרצה
 *   מקבל היה נמוך מהאמת.
 */
export function countFor(sheetId, meetings) {
  const mine = meetings.filter((m) => m.sheetId === sheetId);
  const planned = mine.filter((m) => m.planned === PLANNED.yes);
  return {
    total: mine.length,
    planned: planned.length,
    cancelled: mine.filter((m) => m.planned === PLANNED.no).length,
    happened: mine.filter((m) => m.happened === HAPPENED.yes).length,
    missed: mine.filter((m) => m.happened === HAPPENED.no).length,
    /* מתוך המתוכננים בלבד — מפגש מבוטל אינו "ממתין לדיווח" */
    pending: planned.filter((m) => !m.happened).length,
  };
}

/* ---------- חוות דעת ---------- */
export async function loadEvals({ force = false } = {}) {
  return cached("lesson-evals", async () => {
    const items = await allItems(LESSON_BOARDS.evals);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        topic: val(i, E.topic) || null,
        field: val(i, E.field) || null,
        phone: val(i, E.phone) || null,
        opinion: val(i, E.opinion) || null,
        cycle: val(i, E.cycle) || null,
        by: val(i, E.by) || null,
        at: val(i, E.at) || null,
        /* ⚠ תאריך השיעור, לא תאריך הכתיבה. ראו lessons-boards.js. */
        lessonDate: val(i, E.lessonDate) || null,
        meetingId: val(i, E.meetingId) || null,
        avg: Number(val(i, E.avg)) || null,
        votes: Number(val(i, E.votes)) || null,
        manual: Number(val(i, E.manual)) || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, { force });
}

export const invalidateEvals = () => invalidate("lesson-evals");

/** חוות הדעת שנוצרה למפגש הזה, אם יש. */
export function evalForMeeting(meetingId, evals) {
  return evals.find((e) => e.meetingId === String(meetingId)) || null;
}

/**
 * פותח חוות דעת למפגש של מרצה אורח, אם עוד אין לו אחת.
 *
 * ⚠ נקראת כשמסמנים "התקיים". החניכים מדרגים אחרי השיעור, ולכן
 *   השורה נפתחת ריקה מדירוגים וממלאת את עצמה: הממוצע מחושב חי
 *   מלוח הדירוגים בכל שליפה, ולא מהמספר ששמור בשורה. בלי השורה
 *   הזו הדירוג של החניך יושב בלוח ואינו מופיע באף מסך.
 *
 * ⚠ אידמפוטנטית לפי מזהה המפגש — סימון חוזר לא פותח שורה שנייה.
 *
 * ⚠ אינה מוחקת: מפגש שסימונו בוטל משאיר את חוות הדעת. מחיקה
 *   אוטומטית של טקסט שמישהו כתב מסוכנת יותר משורה מיותרת.
 */
export async function ensureEvalForMeeting({ meeting, sheet, by }) {
  const evals = await loadEvals();
  const existing = evalForMeeting(meeting.id, evals);
  if (existing) return { created: false, id: existing.id, name: existing.name };

  /* שם המרצה הוא שם השורה. טרם נרשם — שם זמני שאפשר לזהות לפיו,
     כדי שהדירוגים לא יישארו בלי בית עד שירשם. */
  const name = String(meeting.lecturer || "").trim()
    || `מרצה אורח · ${sheet.subject} · ${meeting.date}`;

  const cols = {
    [E.topic]: `${sheet.subject} · ${meeting.date}`.slice(0, 200),
    [E.field]: { label: sheet.subject },
    [E.cycle]: { label: CYCLE.second },
    [E.meetingId]: String(meeting.id),
    [E.by]: String(by || "").slice(0, 120),
    [E.at]: { date: israelDate() },
  };
  /* ⚠ **התאריך נגזר מהמפגש ואינו נשאל.** זו כל הסיבה שהעמודה
     קיימת: השורה נפתחת מסימון "התקיים", והתאריך כבר ידוע. */
  if (meeting.date) cols[E.lessonDate] = { date: meeting.date };
  const r = ratingFor(meeting.id, await loadRatings());
  if (r) { cols[E.avg] = String(r.avg); cols[E.votes] = String(r.votes); }

  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:true){ id } }`,
    { b: LESSON_BOARDS.evals, n: name, v: JSON.stringify(cols) }
  );
  invalidateEvals();
  return { created: true, id: String(d.create_item.id), name };
}

const israelDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

/* ---------- דירוגי חניכים ---------- */
const RT = LESSON_COLS.ratings;

export async function loadRatings({ force = false } = {}) {
  return cached("lesson-ratings", async () => {
    const items = await allItems(LESSON_BOARDS.ratings);
    return items
      .map((i) => ({
        id: String(i.id),
        meetingId: val(i, RT.meeting),
        studentId: val(i, RT.student),
        score: Number(val(i, RT.score)) || 0,
      }))
      .filter((r) => r.meetingId && r.studentId && r.score >= 1 && r.score <= 10);
  }, { force });
}

export const invalidateRatings = () => invalidate("lesson-ratings");

/** ממוצע הדירוגים למפגש. null כשאין דירוגים. */
export function ratingFor(meetingId, ratings) {
  const mine = ratings.filter((r) => r.meetingId === String(meetingId));
  if (!mine.length) return null;
  const avg = mine.reduce((a, r) => a + r.score, 0) / mine.length;
  return { avg: Math.round(avg * 10) / 10, votes: mine.length };
}

/* ---------- כתיבה ---------- */

/**
 * מעדכן מפגש: התקיים / לא התקיים, ובשיעורי מרצה אורח גם שם
 * המרצה וחוות הדעת. null ב-happened מחזיר ל"טרם דווח".
 *
 * ⚠ אחרי הכתיבה המטמון מתוקן במקום להתבטל.
 *
 *   ביטול המטמון גרר שליפה מחדש של כל 689 המפגשים בלחיצה הבאה,
 *   וכשמדווחים על גיליון שלם זה קרה בכל לחיצה — כמה שניות לכל
 *   סימון. אנחנו יודעים בדיוק מה השתנה, ולכן מתקנים את הרשומה
 *   ומשאירים את השאר.
 */
export async function setMeeting(meetingId, fields) {
  const cols = {};
  if ("happened" in fields) cols[M.happened] = fields.happened ? { label: fields.happened } : {};
  if (fields.note !== undefined) cols[M.note] = String(fields.note || "").slice(0, 2000);
  if (fields.lecturer !== undefined) cols[M.lecturer] = String(fields.lecturer || "").slice(0, 200);
  if (fields.opinion !== undefined) cols[M.opinion] = String(fields.opinion || "").slice(0, 2000);

  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.meetings, i: String(meetingId), v: JSON.stringify(cols) }
  );

  await patchMeeting(meetingId, fields);
}

/**
 * שומר את נוכחות האימון: שלוש רשימות מזהים, מצב מלא ולא פעולות —
 * אותו שיקול כמו בסימון הנוכחות היומי.
 */
export async function setTrainingAttendance(meetingId, { present, absent, kitchen }) {
  const uniq = (a) => [...new Set((a || []).map(String))];
  const p = uniq(present), x = uniq(absent), k = uniq(kitchen);
  const cols = {
    [M.tPresent]: p.join(","),
    [M.tAbsent]: x.join(","),
    [M.tKitchen]: k.join(","),
  };
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.meetings, i: String(meetingId), v: JSON.stringify(cols) }
  );
  /* תיקון המטמון במקום ביטולו */
  const meetings = await loadMeetings();
  const hit = meetings.find((m) => m.id === String(meetingId));
  if (hit) { hit.tPresent = p; hit.tAbsent = x; hit.tKitchen = k; }
  return { present: p.length, absent: x.length, kitchen: k.length };
}

/** מתקן רשומה במטמון בלי לפנות ל-monday */
export async function patchMeeting(meetingId, fields) {
  const meetings = await loadMeetings(); // אותה הפניה ששמורה במטמון
  const hit = meetings.find((m) => m.id === String(meetingId));
  if (!hit) return null;
  for (const k of ["happened", "note", "lecturer", "opinion"]) {
    if (k in fields) hit[k] = fields[k] || null;
  }
  return hit;
}

const HEB_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/**
 * מוסיף מפגש לגיליון קיים.
 *
 * ⚠ שם היום נגזר מהתאריך ולא מתקבל מהלקוח. בקובץ המקור היו שתי
 *   שורות שבהן שם היום לא תאם לתאריך, וגזירה במקום קליטה מונעת
 *   את זה מלהיכנס שוב.
 */
export async function addMeeting({ sheetId, sheetName, date, planned, reason, note }) {
  const day = HEB_DAYS[new Date(date + "T12:00:00Z").getUTCDay()];
  const cols = {
    [M.sheet]: { item_ids: [Number(sheetId)] },
    [M.date]: { date },
    [M.day]: day,
    [M.planned]: { label: planned },
  };
  if (reason) cols[M.reason] = String(reason).slice(0, 200);
  if (note) cols[M.note] = String(note).slice(0, 2000);

  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.meetings, n: `${sheetName} · ${date}`, v: JSON.stringify(cols) }
  );

  const id = String(d.create_item.id);
  /* מוסיפים למטמון במקום לבטל אותו — אותו שיקול כמו ב-setMeeting */
  const meetings = await loadMeetings();
  meetings.push({
    id, sheetId: String(sheetId), date, day,
    planned, reason: reason || null, happened: null,
    note: note || null, lecturer: null, opinion: null,
  });
  meetings.sort((a, b) => a.date.localeCompare(b.date));
  return id;
}

/**
 * עורך מפגש קיים: תאריך, האם יתקיים, סיבה והערות.
 *
 * ⚠ שינוי תאריך גורר גם את שם היום וגם את שם הפריט. השם הוא
 *   המפתח שלפיו הייבוא מזהה כפילויות, ולכן הוא חייב להישאר
 *   תואם לתאריך — אחרת ייבוא חוזר היה יוצר שורה שנייה.
 */
export async function updateMeeting(meetingId, sheetName, fields) {
  const cols = {};
  const patch = {};

  if (fields.date) {
    const day = HEB_DAYS[new Date(fields.date + "T12:00:00Z").getUTCDay()];
    cols[M.date] = { date: fields.date };
    cols[M.day] = day;
    patch.date = fields.date;
    patch.day = day;
  }
  if (fields.planned) { cols[M.planned] = { label: fields.planned }; patch.planned = fields.planned; }
  if (fields.reason !== undefined) {
    cols[M.reason] = String(fields.reason || "").slice(0, 200);
    patch.reason = fields.reason || null;
  }
  if (fields.note !== undefined) {
    cols[M.note] = String(fields.note || "").slice(0, 2000);
    patch.note = fields.note || null;
  }

  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.meetings, i: String(meetingId), v: JSON.stringify(cols) }
  );

  if (fields.date) {
    await gql(
      `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
      { i: String(meetingId), b: LESSON_BOARDS.meetings, n: `${sheetName} · ${fields.date}` }
    );
  }

  /* תיקון המטמון במקום ביטולו — אותו שיקול כמו ב-setMeeting */
  const meetings = await loadMeetings();
  const hit = meetings.find((m) => m.id === String(meetingId));
  if (hit) {
    Object.assign(hit, patch);
    meetings.sort((a, b) => a.date.localeCompare(b.date));
  }
  return hit || null;
}

/** מוחק מפגש. ⚠ בלתי הפיך — הנתון נמחק מהלוח. */
export async function removeMeeting(meetingId) {
  await gql(`mutation{ delete_item(item_id:${Number(meetingId)}){ id } }`);
  const meetings = await loadMeetings();
  const i = meetings.findIndex((m) => m.id === String(meetingId));
  if (i >= 0) meetings.splice(i, 1);
}

/** יוצר גיליון שיעור חדש */
export async function createSheet({ subject, lecturer, dayTime }) {
  const cols = {
    [S.lecturer]: String(lecturer || "").slice(0, 200),
    [S.dayTime]: String(dayTime || "").slice(0, 200),
    [S.active]: { checked: "true" },
  };
  const d = await gql(
    `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: LESSON_BOARDS.sheets, n: subject, v: JSON.stringify(cols) }
  );
  return String(d.create_item.id);
}
