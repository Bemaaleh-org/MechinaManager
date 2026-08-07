/* ============================================================
   לקוח monday — צד שרת בלבד
   ------------------------------------------------------------
   הקובץ הזה קורא את MONDAY_TOKEN, ולכן אסור שייובא אי פעם
   מתוך src/. הוא רץ רק בפונקציות שב-api/, שמופעלות על השרת.

   מקומית הטוקן מגיע מ-.env; ב-Vercel מ-Environment Variables.
   ============================================================ */

const ENDPOINT = "https://api.monday.com/v2";

export async function gql(query, variables = {}) {
  const token = process.env.MONDAY_TOKEN;
  if (!token) throw new Error("MONDAY_TOKEN לא מוגדר בסביבה");

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(25000),
      });

      const json = await r.json();
      if (json.errors) {
        // שגיאת סכמה או הרשאה לא תשתפר בניסיון חוזר
        throw new Error("monday: " + JSON.stringify(json.errors));
      }
      return json.data;
    } catch (e) {
      lastError = e;
      if (String(e.message).startsWith("monday:")) throw e;
      // תקלת רשת או timeout — שווה לנסות שוב
    }
  }
  throw new Error("הקריאה ל-monday נכשלה אחרי 3 ניסיונות: " + lastError?.message);
}

/** שולף את כל הפריטים בלוח, כולל דפדוף מעבר ל-500 */
export async function allItems(boardId, extraFields = "") {
  const out = [];
  let cursor = null;

  do {
    const page = cursor
      ? `next_items_page(limit:500, cursor:${JSON.stringify(cursor)})`
      : `boards(ids:[${boardId}]){ items_page(limit:500)`;

    const query = cursor
      ? `{ ${page} { cursor items { id name ${extraFields}
             column_values { id text value ... on BoardRelationValue { linked_item_ids } } } } }`
      : `{ ${page} { cursor items { id name ${extraFields}
             column_values { id text value ... on BoardRelationValue { linked_item_ids } } } } } }`;

    const data = await gql(query);
    const pageData = cursor ? data.next_items_page : data.boards[0].items_page;
    out.push(...pageData.items);
    cursor = pageData.cursor;
  } while (cursor);

  return out;
}
