/* ============================================================
   מפתחות VAPID להתראות דחיפה
   ------------------------------------------------------------
   ⚠⚠ **ואין כאן שום ספק חיצוני.** זה ההבדל המהותי מהמייל:
     Resend נחסם על אימות דומיין, ו-SMTP דרש חשבון Workspace
     וסיסמת אפליקציה. דחיפה לדפדפן עובדת מול שירות הדחיפה של
     הדפדפן עצמו (גוגל באנדרואיד, אפל ב-iOS), והזיהוי שלנו מולו
     הוא **זוג מפתחות שנוצר כאן, מקומית**, עם `node:crypto`.

     אין חשבון, אין תשלום, אין חבילה חיצונית, ואין דומיין לאמת.

   ⚠ **המפתח הפרטי הוא סוד.** הוא נכנס ל-`.env` ולמשתני Vercel
     בלבד — לעולם לא לקוד, לא להערה ולא לקומיט (עיקרון 2).

   ⚠ **המפתח הציבורי אינו סוד** והוא נשלח לדפדפן — בלעדיו אי
     אפשר להירשם לדחיפה.

   ⚠⚠ **החלפת המפתחות מבטלת את כל ההרשמות הקיימות.** מנוי
     שנוצר מול מפתח אחד אינו תקף מול אחר, וכל המשתמשים יצטרכו
     לאשר מחדש. מריצים את זה **פעם אחת**.

   הרצה: node tools/seed-push.mjs
   ============================================================ */
import { generateKeyPairSync, createPublicKey } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });

/* המפתח הציבורי בפורמט הגולמי (65 בתים, מתחיל ב-0x04) —
   זה מה ש-`applicationServerKey` בדפדפן מצפה לו. */
const der = publicKey.export({ type: "spki", format: "der" });
const rawPublic = der.subarray(der.length - 65).toString("base64url");

/* המפתח הפרטי כ-PKCS8, כדי שאפשר יהיה לטעון אותו בחתימה. */
const pkcs8 = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64url");

console.log("\n============================================================");
console.log("  מפתחות VAPID נוצרו. להוסיף ל-.env ולמשתני הסביבה ב-Vercel:");
console.log("============================================================\n");
console.log("VAPID_PUBLIC=" + rawPublic);
console.log("VAPID_PRIVATE=" + pkcs8);
console.log("VAPID_SUBJECT=mailto:achim@bemaaleh.com");
console.log("\n⚠ המפתח הפרטי הוא סוד. לא לקוד, לא להערה, לא לקומיט.");
console.log("⚠ הרצה חוזרת מבטלת את כל ההרשמות הקיימות — פעם אחת בלבד.\n");

/* בדיקת שפיות: הציבורי נגזר באמת מהפרטי */
const back = createPublicKey(privateKey).export({ type: "spki", format: "der" });
console.log(back.subarray(back.length - 65).toString("base64url") === rawPublic
  ? "אימות: זוג המפתחות תואם."
  : "!! זוג המפתחות אינו תואם — לא להשתמש.");
