/* ============================================================
   /api/moves — תנועות מלאי
     ?action=read     GET    יומן התנועות
     ?action=commit   POST   דיווח יומי
     ?action=cancel   POST   ביטול דיווח
     ?action=count    POST   ספירה שבועית

   read ו-commit יושבים באותו מודול (_moves.js) ומופרדים בו
   לפי המתודה, בדיוק כפי שהיה.
   ============================================================ */

import { router } from "./_router.js";
import moves from "./_moves.js";
import cancel from "./_move-cancel.js";
import count from "./_count.js";

export default router({ read: moves, commit: moves, cancel, count });
