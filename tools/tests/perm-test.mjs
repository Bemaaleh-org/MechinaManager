/* בדיקת שלוש ההרשאות: תפריט לכולם, שיחה למדריך, מיקום "אחר". */
import { gql } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { MECHINA_BOARDS as MB, MECHINA_COLS as MC } from "../../shared/mechina-boards.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : "")); c ? pass++ : fail++; };
const jar = () => { let c = ""; return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } }; };
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) }, ...(b ? { body: JSON.stringify(b) } : {}) });
  j.set(r); const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) } } catch { return { s: r.status, b: t.slice(0, 160) } }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const us = (await gql(`{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:100){items{id name column_values(ids:["${AUTH_COLS.code}"]){id text}}} } }`))
  .boards[0].items_page.items;
const code = (t) => cv(us.find((x) => x.name.includes(t)), AUTH_COLS.code);

const roster = (await gql(`{ boards(ids:[${MB.roster}]){ items_page(limit:100){items{id name column_values(ids:["${MC.roster.tz}","${MC.roster.active}"]){id text}}} } }`))
  .boards[0].items_page.items.filter((x) => cv(x, MC.roster.tz) && cv(x, MC.roster.active) === "v");
/* ============================================================
   ⚠ **הבדיקה בוחרת את החניך לפי המדריך שלו, ולא לפי מיקומו
     בלוח.** קודם נלקח `roster[0]`, וההנחה השקטה הייתה
     ש"נעם אינו המדריך שלו" — הנחה שהחזיקה עד ששיבוץ אחד השתנה
     ואז הבדיקה נכשלה על התנהגות **נכונה**.

     עכשיו: `own` הוא המדריך של החניך, `other` הוא מדריך אחר,
     ושניהם נגזרים מהנתונים. אם אין שני מדריכים — הבדיקה
     אומרת זאת ונעצרת, במקום לטעון טענה שאינה בודקת כלום.
   ============================================================ */
const { guideMap } = await import("../../api/_guides.js");
const gm = await guideMap();
const withGuide = roster.filter((x) => gm.get(String(x.id)));
const st = withGuide.find((x) => {
  const mine = gm.get(String(x.id));
  return [...gm.values()].some((g) => g.userId !== mine.userId);
}) || roster[0];
const ownGuide = gm.get(String(st.id)) || null;
const otherGuide = [...new Map([...gm.values()].map((g) => [g.userId, g])).values()]
  .find((g) => !ownGuide || g.userId !== ownGuide.userId) || null;
console.log(`נבדק: ${st.name} · מדריך: ${ownGuide ? ownGuide.short : "—"}`
  + ` · מדריך אחר: ${otherGuide ? otherGuide.short : "—"}`);

console.log("=== תפריט זמין לכולם ===");
const S = jar();
let r = await call(S, "POST", "/api/students?action=login", { tz: cv(st, MC.roster.tz) });
ok("חניך נכנס", r.s === 200, r.b.error);
r = await call(S, "GET", "/api/kitchen?action=menu");
ok("ורואה את התפריט", r.s === 200, r.s === 200 ? `${r.b.dishes.length} מנות` : r.b.error);
ok("אבל canEdit=false", r.s === 200 && r.b.canEdit === false, String(r.b.canEdit));
r = await call(S, "POST", "/api/kitchen?action=menu", { name: "נסיון", baseHeads: 35, items: "x 1" });
ok("וכתיבה נחסמת", r.s === 403, `${r.s} ${r.b.error || ""}`);

console.log("\n=== השיחה האישית — המדריך בלבד ===");
const D = jar();
/* ⚠ מנהל שטרם בחר שם וסיסמה חסום בכל נקודות הקצה מאז שנוספה
   ההרשמה. הרישום כאן זמני, הסיסמה שנוצרת אינה קיימת, והשחזור
   בסוף חובה. ראו tools/tests/_auth.mjs. */
const reg = await tempRegister("דני לויט", "רועי",
  ...[ownGuide?.short, otherGuide?.short].filter(Boolean));
await call(D, "POST", "/api/auth?action=login", { code: code("דני לויט") });
const R = jar();
await call(R, "POST", "/api/auth?action=login", { code: code("רועי") });
/* ⚠ שתי הזהויות נבחרות לפי הנתונים ולא לפי שם קשיח. */
const OWN = jar(), OTHER = jar();
if (ownGuide) await call(OWN, "POST", "/api/auth?action=login", { code: code(ownGuide.short) });
if (otherGuide) await call(OTHER, "POST", "/api/auth?action=login", { code: code(otherGuide.short) });

const P = "/api/students?action=profile&student=" + st.id;
r = await call(R, "POST", P, { talks: ["2026-10-02", "", ""] });
ok("מנהל רגיל נחסם", r.s === 403, `${r.s} ${r.b.error || ""}`);
if (otherGuide) {
  r = await call(OTHER, "POST", P, { talks: ["2026-10-02", "", ""] });
  ok(`מדריך אחר (${otherGuide.short}) נחסם`, r.s === 403, `${r.s} ${r.b.error || ""}`);
} else {
  ok("אין מדריך שני — אי אפשר לבדוק חסימת מדריך זר", false, "בדקו את לוח השיבוצים");
}
/* ⚠ והצד החיובי: המדריך **של** החניך כן קובע. בלי זה, בדיקה
   שחוסמת את כולם הייתה עוברת. */
if (ownGuide) {
  r = await call(OWN, "POST", P, { talks: ["2026-10-03", "", ""] });
  ok(`והמדריך של החניך (${ownGuide.short}) כן`, r.s === 200, `${r.s} ${r.b.error || ""}`);
}
r = await call(D, "POST", P, { talks: ["2026-10-01", "", ""] });
ok("ראש המכינה כן — אינו נחסם לעולם", r.s === 200, r.b.error);
const g = await call(D, "GET", P);
ok("והתאריך נשמר", (g.b.talks || [])[0] === "2026-10-01", JSON.stringify(g.b.talks));

console.log("\n=== מיקום תקלה ===");
/* ⚠ הרשימה נצרכת ישירות מ-shared גם בשרת וגם במסך, ולכן
   נבדקת שם ולא בתשובת ה-API. */
const { FAULT_PLACE } = await import("../../shared/faults-board.js");
ok("\"אחר\" ברשימה", FAULT_PLACE.includes("אחר"), FAULT_PLACE.join(" · "));
ok("ו\"מגורי צוות\" ברשימה", FAULT_PLACE.includes("מגורי צוות"));
/* והשרת מקבל אותו בפועל */
r = await call(D, "POST", "/api/students?action=faults",
  { title: "בדיקה — מיקום אחר", place: "אחר", urgency: "רגיל" });
ok("השרת מקבל מיקום \"אחר\"", r.s === 200, `${r.s} ${r.b.error || ""}`);
if (r.s === 200) await call(D, "DELETE", "/api/students?action=faults", { id: r.b.id });

console.log("\n=== ניקוי ===");
await call(D, "POST", P, { talks: ["", "", ""] });
const after = await call(D, "GET", P);
ok("השיחות נוקו", ((after.b.talks || []).filter(Boolean).length) === 0,
  JSON.stringify(after.b.talks));

console.log(`\nעברו ${pass} · נכשלו ${fail}`);

await reg.restore();
