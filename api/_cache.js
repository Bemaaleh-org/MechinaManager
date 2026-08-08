/* ============================================================
   מטמון קצר-מועד בזיכרון המופע
   ------------------------------------------------------------
   הופרד מ-_session.js כדי שיהיה מנגנון אחד ולא שניים. שכבת
   האימות ושיבוץ התורנויות משתמשות בו באותה תפוגה.

   30 שניות: מספיק כדי שרוב הבקשות לא יקראו מ-monday, וקצר
   מספיק כדי ששינוי בלוח ייכנס לתוקף תוך חצי דקה.

   ⚠ המטמון חי בזיכרון של מופע השרת. Vercel עשויה להריץ כמה
     מופעים, ולכל אחד מטמון משלו — לכן חצי הדקה היא הגבול
     העליון לכל מופע בנפרד, ולא הבטחה גלובלית.
   ============================================================ */

export const CACHE_MS = 30_000;

/**
 * עוטף פונקציית טעינה במטמון לפי מפתח.
 * @param {string} key   מזהה לוגי של הנתון
 * @param {Function} load  הפונקציה שקוראת מהמקור
 * @param {{force?: boolean, ttl?: number}} opts
 */
const store = new Map();

export async function cached(key, load, { force = false, ttl = CACHE_MS } = {}) {
  const now = Date.now();
  const hit = store.get(key);
  if (!force && hit && now - hit.at < ttl) return hit.value;

  const value = await load();
  store.set(key, { at: now, value });
  return value;
}

/** ניקוי ידני — משמש בבדיקות */
export const invalidate = (key) => (key ? store.delete(key) : store.clear());
