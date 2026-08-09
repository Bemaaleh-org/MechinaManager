/* ============================================================
   /api/duty — שיבוץ תורנויות. קריאה בלבד.
     ?action=today   GET   תורני היום
     ?action=week    GET   שיבוץ השבוע כולו
   ============================================================ */

import { router } from "./_router.js";
import today from "./_duty-today.js";
import week from "./_duty-week.js";

export default router({ today, week });
