/* ============================================================
   /api/students — חניכי המכינה
     ?action=login   POST   תעודת זהות → סשן חניך
     ?action=list    GET    רשימת החניכים וסיכומיהם (מנהל בלבד)
     ?action=year    GET    הלוח השנתי של חניך אחד
     ?action=leader  POST   סימון ידני של מוביל (עוקף חירום, מנהל)
     ?action=weeks   GET/POST שיבוץ מובילי השבוע (מנהל בלבד)
     ?action=role    POST   קביעת תפקידים לחניך (מנהל בלבד)
     ?action=profile GET/POST  הפרופיל האישי
     ?action=incident GET/POST אירועים חריגים (מנהל בלבד)
     ?action=placements GET/POST שיבוצי חניכים — ענפים, ועדות,
                        סדרות וקבוצות. חניך רואה את שלו בלבד.
     ?action=team    GET    מסך ניהול הצוות: ועדה או סדרה
     ?action=team-task POST/PUT/DELETE  משימות הצוות
     ?action=team-admin GET/POST/PUT    הגדרות הצוותים ואוצר המילים
     ?action=edit    PUT    עריכת נתוני חניך ⚠ ראש מכינה בלבד
     ?action=leadership GET/PUT  דף המובילויות
                     ⚠ רק שבועות שכבר הסתיימו. משוב — הצוות;
                       סיכום — מי שהוביל.
     ?action=tryouts GET/POST/PUT/DELETE  מיונים לצבא
                     ⚠ כתיבה — החניך על עצמו בלבד. קריאה של
                       כולם — צוות ויו״ר ועדת הגיוסים.

   ⚠ login אינו דורש סשן, ולכן הקובץ הזה אינו נעטף ב-withAuth —
     כל מודול מביא את ההגנה שלו, בדיוק כמו ב-api/auth.js.
     list מוגן ב-{manager:true} ו-year ב-{student:true}, ושניהם
     נשארים מוגנים גם דרך הנתב.
   ============================================================ */

import { router } from "./_router.js";
import login from "./_student-login.js";
import list from "./_students-list.js";
import year from "./_student-year.js";
import leader from "./_student-leader.js";
import role from "./_student-role.js";
import weeks from "./_leader-weeks.js";
import profile from "./_student-profile.js";
import incident from "./_student-incidents.js";
import placements from "./_placements.js";
import placementsSetup from "./_placements-setup.js";
import cycles from "./_cycles-api.js";
import importStep from "./_cycle-import.js";
import safety from "./_safety.js";
import safetySetup from "./_safety-setup.js";
import faults from "./_faults.js";
import faultsSetup from "./_faults-setup.js";
import alumni from "./_alumni.js";
import hosting from "./_hosting.js";
/* ---- אחריות: מרכז התפקיד, משימות והצפות ----
   ⚠ ארבעה actions ואפס פונקציות Vercel חדשות. כל מודול נושא
     את ה-withAuth שלו — הנתב אינו עוטף. */
import duty from "./_duty-hub.js";
import dutyTasks from "./_duty-tasks.js";
import dutyNotes from "./_duty-notes.js";
import chair from "./_placement-chair.js";
/* ---- ניהול צוותים: ועדות וסדרות ----
   ⚠ לוח אחר, מסלול קריאה אחר ומסך אחר מאשר duty-tasks.
     ההפרדה היא ההבטחה עצמה — ראו shared/team.js. */
/* ⚠ עריכת נתוני חניך על ידי ראש המכינה — מה שהצוות מנהל,
   ולא מה שהחניך הזין על עצמו. */
import edit from "./_student-edit.js";
/* ⚠ מיונים לצבא — שורה לכל מיון, ולא מחרוזת אחת בפרופיל.
   הבעלות נשארת אצל החניך; יו״ר ועדת הגיוסים והצוות קוראים. */
import tryouts from "./_tryouts.js";
/* ⚠ דף המובילויות — **רק מה שכבר עבר**, גם אם יש שיבוץ עתידי. */
import leadership from "./_leadership.js";
import team from "./_team.js";
import teamTask from "./_team-task.js";
import teamAdmin from "./_team-admin.js";

export default router({ login, list, year, leader, weeks, role, profile, incident, placements, "placements-setup": placementsSetup, safety, "safety-setup": safetySetup, faults, "faults-setup": faultsSetup, alumni, hosting, cycles, import: importStep,
  duty, "duty-tasks": dutyTasks, "duty-notes": dutyNotes, chair,
  team, "team-task": teamTask, "team-admin": teamAdmin, edit, tryouts, leadership });
