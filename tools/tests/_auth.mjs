/* ============================================================
   רישום זמני לבדיקות
   ------------------------------------------------------------
   מאז שהמנהלים נרשמים בעצמם, סשן שנפתח עם קוד ולא נרשם עדיין
   חסום בכל נקודות הקצה (api/_session.js). הבדיקות נכנסות עם
   קוד, ולכן הן חייבות שהשורה תיראה "רשומה".

   ⚠ **הסיסמה שנכתבת כאן אינה קיימת.** הגיבוב נבנה מ-32 בתים
     אקראיים שנזרקים מיד ואינם נשמרים בשום מקום — אין מחרוזת
     שתפתח את החשבון. זה מכוון: המטרה היא לעבור את הבדיקה
     `isFresh`, ולא ליצור כניסה שנייה לחשבון של מנהל אמיתי.
     סיסמת בדיקה ידועה על שורת מנהל היא פרצה, גם אם זמנית.

   ⚠ תמיד לקרוא ל-restore ב-finally. בלי זה, הרצה שנכשלה
     באמצע משאירה את השורה במצב "רשומה" — והמנהל האמיתי
     יגלה שמסך ההרשמה שלו נעלם ואין לו סיסמה.
   ============================================================ */
import { randomBytes } from "node:crypto";
import { identities, writeIdentity, isFresh } from "../../api/_identity.js";
import { hashPassword } from "../../api/_credentials.js";

export async function tempRegister(...fragments) {
  const all = await identities();
  const undo = [];

  for (const frag of fragments) {
    const row = all.find((r) => r.kind === "staff" && r.name.includes(frag));
    if (!row) throw new Error("לא נמצא איש צוות: " + frag);
    if (!isFresh(row)) continue;            /* כבר רשום — לא נוגעים */
    /* ⚠ הסוד נוצר ונזרק באותה שורה. אין משתנה שמחזיק אותו. */
    await writeIdentity(row, {
      user: "bdika-" + row.id,
      hash: await hashPassword(randomBytes(32).toString("hex")),
    });
    undo.push(row);
  }

  return {
    registered: undo.length,
    restore: async () => {
      for (const row of undo) {
        await writeIdentity(row, { user: "", hash: "", setAt: "" });
      }
    },
  };
}
