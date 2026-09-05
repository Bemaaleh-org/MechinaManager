/* ============================================================
   דחיפה ברגע שקרה משהו — ולא רק בסבב היומי
   ------------------------------------------------------------
   ⚠⚠ **למה זה קיים בנוסף לסבב.**

   ההתראות נגזרות מהמצב ואין להן תור (4כו), ולכן "הרגע שנוצרה
   התראה" אינו קיים — וזו הסיבה ש-`api/_push-run.js` עובר פעם
   ביום ושואל בשם כל אחד מה יש לו.

   אבל **חלק מההתראות כן נולדות ברגע מזוהה**: בקשת יציאה
   שהוכרעה, תקלה שדווחה, הצפה שנשלחה לבעל תפקיד, משימה ששויכה
   למישהו. על אלה אין סיבה לחכות עד מחר — הן בדיוק אלה שדחיפה
   נועדה להן.

   ⚠ **תוכנית Vercel הנוכחית מגבילה משימה מתוזמנת אחת ליום**,
     ולכן "לדחוף כל שעה" אינו על השולחן. דחיפה מהאירוע עצמו
     מגיעה מיד ואינה עולה קריאה אחת מיותרת.

   ------------------------------------------------------------
   ⚠⚠ **הדחיפה לעולם אינה מפילה את הפעולה שגררה אותה.**

   מי שאישר בקשת יציאה ביקש לאשר בקשה. אם שירות הדחיפה של גוגל
   לא זמין באותה שנייה — הבקשה עדיין אושרה, והמשתמש אינו אמור
   לראות שגיאה. לכן כל קריאה כאן היא **fire-and-forget**: היא
   נתפסת, נרשמת ללוג, ואינה נזרקת הלאה.

   ⚠ **ואינה מעכבת את התשובה.** אנחנו לא ממתינים לה — הקריאה
     יוצאת והתשובה חוזרת למשתמש. ב-serverless יש סיכון שהתהליך
     ייסגר לפני שהיא הסתיימה, ולכן: **התראה שלא נשלחה אינה
     אבודה** — הסבב היומי יתפוס אותה, והפעמון ממילא מראה אותה
     ברגע שהמשתמש פותח.

   ⚠ **הדחיפה ריקה, כמו תמיד.** היא נקישה בלבד, וה-Service
     Worker שואל את השרת מה חדש. שום נתון של חניך אינו עובר
     דרך גוגל או אפל (5ה).
   ============================================================ */

import { gql } from "./_monday.js";
import { boardColumn } from "./_board-col.js";
import { AUTH_BOARD } from "../shared/auth-board.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { pushTo, pushReady } from "./_push.js";

const SUBS_COL = "מנויי דחיפה";

/** קורא את המנויים של שורה אחת. תוכן פגום נקרא כרשימה ריקה. */
async function subsOf(board, itemId) {
  const col = await boardColumn(board, SUBS_COL, "long_text");
  if (!col) return { col: null, list: [] };
  const d = await gql(
    `query($b:[ID!],$i:[ID!]){ boards(ids:$b){ items_page(query_params:{ids:$i}, limit:1){
       items{ column_values(ids:[${JSON.stringify(col)}]){ text } } } } }`,
    { b: [board], i: [String(itemId)] });
  const raw = d.boards?.[0]?.items_page?.items?.[0]?.column_values?.[0]?.text || "";
  try {
    const p = JSON.parse(raw);
    return { col, list: Array.isArray(p) ? p : [] };
  } catch { return { col, list: [] }; }
}

async function writeSubs(board, col, itemId, list) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                     create_labels_if_missing:false){ id } }`,
    { b: board, i: String(itemId), v: JSON.stringify({ [col]: JSON.stringify(list) }) });
}

/**
 * דוחף לכל המכשירים של משתמש אחד.
 * `kind`: "student" — לוח המצבה · "staff" — לוח ההרשאות.
 * מחזיר { sent, dropped }. מנוי שפג נמחק מהרשימה.
 */
export async function pushToMember(kind, itemId) {
  if (!pushReady() || !itemId) return { sent: 0, dropped: 0 };
  const board = kind === "staff" ? AUTH_BOARD : MECHINA_BOARDS.roster;
  const { col, list } = await subsOf(board, itemId);
  if (!col || !list.length) return { sent: 0, dropped: 0 };

  let sent = 0;
  const alive = [];
  for (const s of list) {
    const r = await pushTo(s);
    if (r === "ok") { sent++; alive.push(s); }
    /* ⚠ "gone" הוא מכשיר שהסיר את ההרשמה — נמחק. כישלון רגעי
       נשאר, כי הוא כמעט תמיד רשת ולא ביטול. */
    else if (r !== "gone") alive.push(s);
  }
  const dropped = list.length - alive.length;
  if (dropped) await writeSubs(board, col, itemId, alive);
  return { sent, dropped };
}

/* ============================================================
   ⚠ **זו הפונקציה שקוראים לה מהמסלולים**, ולא ל-`pushToMember`
     ישירות: היא בולעת כל שגיאה, ואינה מוחזרת ב-`await` אצל
     הקורא. `why` נכנס ללוג בלבד — הוא לא מגיע לאף מכשיר.
   ============================================================ */
export function nudge(kind, itemId, why = "") {
  if (!pushReady() || !itemId) return;
  pushToMember(kind, itemId)
    .then((r) => {
      if (r.sent) console.log(`[push:now] ${why} → ${r.sent} מכשירים`);
    })
    .catch((e) => console.error("[push:now]", why, e && e.message));
}

/** אותו דבר לכמה נמענים. ⚠ מזהים כפולים נשלחים פעם אחת. */
export function nudgeMany(kind, ids, why = "") {
  for (const id of [...new Set((ids || []).map(String))]) nudge(kind, id, why);
}
