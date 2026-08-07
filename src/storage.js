/* ============================================================
   שכבת האחסון — מצב ביניים מתוכנן
   ------------------------------------------------------------
   קריאה:  המוצרים והתנועות מגיעים מ-monday.
           הרשימות, המשתמשים והתורנויות עדיין מקומיים.
   כתיבה:  דיווח יומי וביטול נכתבים ל-monday דרך api.js.
           השאר עדיין נשמר ב-localStorage.

   מרגע שהתנועות נקראות מ-monday, שני תורנים על שני מכשירים
   רואים את אותה תמונה.

   App.jsx לא יודע דבר מכל זה — החוזה נשאר get/set.
   ============================================================ */

import { SEED_USERS, SEED_DUTY } from "./seeds.js";

/** מצב ריק שלם, למקרה שאין עדיין שום דבר שמור מקומית */
const emptyShell = () => ({
  v: 1,
  products: [],
  moves: [],
  lists: [],
  users: SEED_USERS.map((u) => ({ ...u })),
  duty: { ...SEED_DUTY },
  countDraft: null,
  lastCountAt: null,
});

const readLocal = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

async function fetchJson(path, field) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} החזיר ${r.status}`);
  const body = await r.json();
  if (!Array.isArray(body[field])) throw new Error(`תשובה לא צפויה מ-${path}`);
  return body[field];
}

export const storage = {
  async get(key) {
    const local = readLocal(key);

    let products, moves, lists;
    try {
      // קודם מוודאים שהרשימות החיות מעודכנות לפי החוסרים הנוכחיים.
      // אידמפוטנטי, ולכן בטוח להריץ בכל טעינה. אם הוא נכשל — ממשיכים
      // לטעון בכל זאת, ומציגים את הרשימות כפי שהן.
      try {
        await fetch("/api/lists-sync", { method: "POST" });
      } catch (e) {
        console.error("[storage] סנכרון הרשימות נכשל:", e.message);
      }

      // שאר השליפות במקביל — הטלפון לא מחכה לאחת ואז לשנייה
      [products, moves, lists] = await Promise.all([
        fetchJson("/api/catalog", "products"),
        fetchJson("/api/moves", "moves"),
        fetchJson("/api/lists", "lists"),
      ]);
    } catch (e) {
      console.error("[storage] שליפת הנתונים נכשלה:", e.message);
      // יש נתונים מקומיים מטעינה קודמת — מציגים אותם, עדיף על מסך תקוע
      if (local) return { value: JSON.stringify(local) };
      // אין כלום: מחזירים קטלוג ריק ולא נתוני דמו. עדיף מסך ריק
      // מאשר תורן שמדווח פחת על מוצר שלא קיים במטבח.
      return { value: JSON.stringify(emptyShell()) };
    }

    // "נספר השבוע" נגזר מהתנועות עצמן ולא נשמר בנפרד — כך גם הוא
    // רב-משתמשי: תורן שסופר בטלפון שלו, החבר רואה שזה בוצע.
    const lastCountAt = moves
      .filter((m) => m.type === "count" && !m.cancelled && m.ts)
      .reduce((max, m) => (m.ts > max ? m.ts : max), 0) || null;

    // monday היא מקור האמת למוצרים, לתנועות ולרשימות.
    // נשארים מקומיים: המשתמשים, התורנויות וטיוטת הספירה.
    const merged = { ...(local || emptyShell()), products, moves, lists, lastCountAt };
    return { value: JSON.stringify(merged) };
  },

  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // כשל שמירה לא אמור להפיל את המסך שהתורן עובד מולו
    }
  },
};
