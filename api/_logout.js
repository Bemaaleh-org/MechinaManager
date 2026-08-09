/* ============================================================
   POST /api/logout
   מנקה את עוגיית הסשן. זמין לשני סוגי המשתמשים.

   לא דורש סשן תקף: גם מי שהעוגייה שלו פגה או נפסלה צריך
   שהניקוי יצליח, כדי לא להישאר תקוע עם עוגייה מתה.
   ============================================================ */

import { clearSession } from "./_session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }
  clearSession(res);
  res.status(200).json({ ok: true });
}
