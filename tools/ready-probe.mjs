/* ============================================================
   בדיקת מוכנות בתהליך נקי
   ------------------------------------------------------------
   מדפיס JSON: אילו שלבים אינם מוכנים. נועד להיות **מורץ**
   מ-boards-ready.mjs ולא מיובא ממנו.

   ⚠⚠ **למה תהליך נפרד ולא `import(...?v=)`.** מחרוזת השאילתה
     מבטלת את המטמון של המודול שנטען — **ולא של מה שהוא
     מייבא**. `shared/budget-boards.js` מייצא את
     `diningHeadsReady` אבל קורא את המספר מ-`budget-ids.js`,
     ו-seed:dining כותב את **השני**. התהליך שכבר טען פעם את
     budget-ids.js המשיך לראות אותו ריק לנצח, וההקמה נעצרה על
     שלב שהצליח באמת.

     זה חל על כל קובץ שמייבא קובץ אחר, כלומר על כל מי שיצטרף
     לרשימה מחר. תהליך חדש הוא הדבר היחיד שמבטיח גרף מודולים
     נקי לגמרי.
   ============================================================ */
import { STEPS } from "./boards-ready.mjs";

const bad = [];
for (const s of STEPS) {
  try {
    const m = await import("../" + s.ids);
    const fn = m[s.ready];
    if (typeof fn !== "function") { bad.push({ ...s, why: "אין " + s.ready + "()" }); continue; }
    if (!fn()) bad.push({ ...s, why: "טרם הוקם" });
  } catch (e) {
    bad.push({ ...s, why: String(e?.message || e).split("\n")[0] });
  }
}
process.stdout.write(JSON.stringify(bad));
