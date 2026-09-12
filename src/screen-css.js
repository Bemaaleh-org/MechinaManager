/* ============================================================
   ה-CSS של המסכים החדשים — מקום אחד לצירוף
   ------------------------------------------------------------
   ⚠ **למה לא הכול ב-`src/styles.js`.** הקובץ ההוא כבר 3,900
     שורות ומרחב שמות אחד, ובדיוק בגללו נתפסו כאן שלוש
     התנגשויות קידומת ("לפני קידומת חדשה — grep"). מסך שנולד
     עם ה-CSS שלו בקובץ שלו נשאר ניתן להסרה בחתיכה אחת, ואי
     אפשר להתנגש בו בטעות ממסך אחר.

   ⚠ **והצירוף כאן ולא ב-`App.jsx`.** ה-`<style>` מוזרק בחמישה
     מקומות שונים (מסך הכניסה, ההקמה, השלד), ומי שיוסיף מסך
     ויעדכן ארבעה מהם יקבל מסך שנראה תקין בכניסה ושבור אחריה.
     כאן זו שורה אחת.

   ⚠ **הסדר: אחרי `CSS`.** שכבת ההרמה ושכבת ההעדפות יושבות
     בסופו של `styles.js` ודורסות את מה שמעליהן; מסך שייטען
     לפניהן יאבד את מצב הלילה.
   ============================================================ */

import { CSS } from "./styles.js";
import { LAUNDRY_CSS } from "./Laundry.jsx";
import { QUOTES_CSS } from "./Quotes.jsx";
import { MISHMAR_CSS } from "./Mishmar.jsx";
import { ARCHIVE_CSS } from "./Archive.jsx";
import { GROUP_CSS } from "./Group.jsx";
import { RECRUIT_CSS } from "./Recruit.jsx";

import { MENU_CSS } from "./Menu.jsx";
import { DUTYTODAY_CSS } from "./DutyToday.jsx";
import { ABSENT_CSS } from "./AbsentToday.jsx";
import { BUGS_CSS } from "./Bugs.jsx";
import { STULESSON_CSS } from "./StuLessons.jsx";
import { PLENARY_CSS } from "./Plenary.jsx";
import { LESSONCHANGES_CSS } from "./LessonChanges.jsx";
import { BUY_CSS } from "./Buy.jsx";
import { NAVBAR_CSS } from "./NavBar.jsx";

export const ALL_CSS = CSS + LAUNDRY_CSS + QUOTES_CSS + MISHMAR_CSS + ARCHIVE_CSS
  + GROUP_CSS + RECRUIT_CSS + MENU_CSS + DUTYTODAY_CSS + ABSENT_CSS + BUGS_CSS + STULESSON_CSS + PLENARY_CSS
  + LESSONCHANGES_CSS + BUY_CSS + NAVBAR_CSS;
