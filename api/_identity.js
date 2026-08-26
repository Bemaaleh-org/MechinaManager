/* ============================================================
   שכבת הזהות — מי המשתמש, ואיפה השורה שלו
   ------------------------------------------------------------
   ⚠ צוות וחניכים יושבים בשני לוחות שונים, אבל שאלת הזהות
     זהה: "מי מחזיק בשם המשתמש הזה". הקובץ הזה מאחד את שני
     המקורות לרשימה אחת, כדי שמסלול הכניסה, מסלול השכחתי
     ומסלול קביעת הסיסמה יהיו קוד אחד ולא שלושה זוגות.

   ⚠ שם משתמש הוא **ייחודי על פני שני הלוחות**. חניך ואיש
     צוות באותו שם היו הופכים את הכניסה להגרלה.

   ⚠ הקריאה כאן תמיד טרייה (force). שינוי סיסמה חייב לתפוס
     מיד; מטמון של עשר דקות על אימות הוא בדיוק הפער שדרכו
     נכנסים עם סיסמה שבוטלה.
   ============================================================ */

import { gql } from "./_monday.js";
import { AUTH_BOARD, AUTH_COLS, KIND } from "../shared/auth-board.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { CRED_COLS } from "../shared/cred-ids.js";
import { normalizeUser } from "./_credentials.js";

const S = CRED_COLS.staff;
const T = CRED_COLS.student;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const ids = (o) => Object.values(o).map((x) => `"${x}"`).join(",");

/**
 * כל בעלי הזהות — צוות וחניכים יחד.
 * ⚠ שדה `board` נשמר על כל שורה, כי הכתיבה חוזרת ללוח שממנו
 *   היא נקראה. בלעדיו כל עדכון היה צריך לנחש.
 */
export async function identities() {
  const [staff, students] = await Promise.all([
    gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:200){ items{
        id name column_values(ids:[${ids(S)},"${AUTH_COLS.kind}","${AUTH_COLS.active}","${AUTH_COLS.code}"]){ id text } } } } }`),
    gql(`{ boards(ids:[${MECHINA_BOARDS.roster}]){ items_page(limit:200){ items{
        id name column_values(ids:[${ids(T)},"${MECHINA_COLS.roster.tz}","${MECHINA_COLS.roster.active}"]){ id text } } } } }`),
  ]);

  const out = [];

  for (const i of staff.boards[0].items_page.items) {
    const kind = val(i, AUTH_COLS.kind);
    /* ⚠ "קוד משותף" אינו אדם ולכן אין לו זהות אישית. */
    if (kind === KIND.shared) continue;
    out.push({
      board: AUTH_BOARD, cols: S, kind: "staff",
      id: String(i.id), name: String(i.name || "").trim(),
      user: normalizeUser(val(i, S.user)),
      hash: val(i, S.pass), email: val(i, S.email).trim().toLowerCase(),
      reset: val(i, S.reset), setAt: val(i, S.setAt),
      active: val(i, AUTH_COLS.active) === "v",
      secret: val(i, AUTH_COLS.code),
    });
  }

  for (const i of students.boards[0].items_page.items) {
    const tz = val(i, MECHINA_COLS.roster.tz).replace(/\D/g, "");
    if (!tz) continue;
    out.push({
      board: MECHINA_BOARDS.roster, cols: T, kind: "student",
      id: String(i.id), name: String(i.name || "").trim(),
      user: normalizeUser(val(i, T.user)),
      hash: val(i, T.pass), email: val(i, T.email).trim().toLowerCase(),
      reset: val(i, T.reset), setAt: val(i, T.setAt),
      active: val(i, MECHINA_COLS.roster.active) === "v",
      secret: tz,
    });
  }

  return out;
}

/**
 * ⚠ "טרם נקבעה זהות" = אין שם משתמש **ואין** גיבוב. שני
 *   התנאים, כי משתמש שקבע שם וטרם קבע סיסמה הוא מצב שבור
 *   שעדיף לזהות כשבור ולא כ"חדש".
 */
export const isFresh = (row) => !row.user && !row.hash;

/** לפי שם משתמש, על פני שני הלוחות */
export const byUser = (list, raw) => {
  const u = normalizeUser(raw);
  return u ? list.find((r) => r.user && r.user === u) || null : null;
};

/** לפי אימייל */
export const byEmail = (list, raw) => {
  const e = String(raw || "").trim().toLowerCase();
  return e ? list.find((r) => r.email && r.email === e) || null : null;
};

/** האם שם המשתמש תפוס בידי מישהו אחר */
export const userTaken = (list, raw, selfId) => {
  const u = normalizeUser(raw);
  return Boolean(u && list.some((r) => r.user === u && r.id !== String(selfId)));
};

/** כתיבה חזרה ללוח שממנו השורה נקראה */
export async function writeIdentity(row, patch) {
  const cols = {};
  if (patch.user !== undefined) cols[row.cols.user] = normalizeUser(patch.user);
  if (patch.hash !== undefined) cols[row.cols.pass] = String(patch.hash || "");
  if (patch.email !== undefined) cols[row.cols.email] = String(patch.email || "").trim().toLowerCase();
  if (patch.reset !== undefined) cols[row.cols.reset] = String(patch.reset || "");
  if (patch.setAt !== undefined) cols[row.cols.setAt] = String(patch.setAt || "");
  if (!Object.keys(cols).length) return;
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
    { b: row.board, i: row.id, v: JSON.stringify(cols) });
}
