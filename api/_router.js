/* ============================================================
   נתב פנימי לפונקציות מאוחדות
   ------------------------------------------------------------
   תוכנית Hobby של Vercel מגבילה ל-12 פונקציות. במקום לאחד את
   הקוד עצמו לקבצי ענק, כל נקודת קצה נשארה במודול משלה בשם
   שמתחיל ב-_ (Vercel לא סופרת אותם), ומעליהם יושב נתב דק
   שבוחר לפי ?action=.

   ⚠ הנתב לא נוגע באימות. כל מודול נשאר עטוף כפי שהיה —
     withAuth, withAuth({manager:true}), או בלי עטיפה בכלל
     כמו logout. ההתנהגות זהה לחלוטין למצב שלפני האיחוד.
   ============================================================ */

export function router(routes) {
  return async function handler(req, res) {
    const action = req.query?.action;
    const handle = action && Object.prototype.hasOwnProperty.call(routes, action)
      ? routes[action]
      : null;

    if (!handle) {
      return res.status(404).json({
        error: action ? `פעולה לא מוכרת: ${action}` : "לא צוינה פעולה",
      });
    }
    return handle(req, res);
  };
}
