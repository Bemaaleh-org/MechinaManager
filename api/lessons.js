/* ============================================================
   /api/lessons — שיעורים במכינה
     ?action=list    GET    כל הגיליונות והספירה שלהם
     ?action=sheet   GET    גיליון אחד ומפגשיו
     ?action=sheet   POST   יצירת גיליון חדש
     ?action=mark    POST   דיווח אם מפגש התקיים
     ?action=meeting POST   הוספת מפגש ידנית לגיליון
     ?action=gantt   GET    הגאנט השנתי
     ?action=report  GET    נתוני הדוח החודשי
     ?action=rate    GET/POST  דירוג שיעורים על ידי חניכים
     ?action=evals   GET    חוות דעת על מרצים
     ?action=evals   POST   הוספת חוות דעת

   ⚠ כל המודולים כאן עטופים ב-{scheduler:true} — צוות או אחראי
     לו״ז. חניך רגיל מקבל 403 גם דרך הנתב, וגם בקריאה ישירה.
   ============================================================ */

import { router } from "./_router.js";
import list from "./_lessons-list.js";
import sheet from "./_lesson-sheet.js";
import mark from "./_lesson-mark.js";
import meeting from "./_lesson-meeting.js";
import evals from "./_lesson-evals.js";
import gantt from "./_lessons-gantt.js";
import report from "./_lesson-report.js";
import rate from "./_lesson-rate.js";

export default router({ list, sheet, mark, meeting, evals, gantt, report, rate });
