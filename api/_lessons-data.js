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
import { LESSON_BOARDS, LESSON_COLS, PLANNED, HAPPENED } from "../shared/lessons-boards.js";

const S = LESSON_COLS.sheets;
const M = LESSON_COLS.meetings;
const E = LESSON_COLS.evals;

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const linked = (i, c) => {
  const x = i.column_values.find((y) => y.id === c);
  return x && x.linked_item_ids && x.linked_item_ids[0] ? String(x.linked_item_ids[0]) : null;
};

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
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, { force });
}

export const invalidateEvals = () => invalidate("lesson-evals");

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
