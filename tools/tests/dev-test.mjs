/* ============================================================
   אחראי בינה — מצב המפתח
   ------------------------------------------------------------
     npm test -- dev

   ⚠⚠ **ארבע טענות, וכל אחת נועלת כיוון אחר.** אחת לבדה הייתה
     נשארת ירוקה גם אילו הגבול נפל:

       1. כותרת בלי תפקיד → אינה פותחת דבר
       2. תפקיד בלי כותרת → מצב חניך, ו-`isDev` דלוק כדי
          שהבורר יופיע
       3. תפקיד + כותרת   → גישת צוות
       4. הסרת התפקיד     → נסגר **מיד**, גם עם הכותרת דלוקה

     בלי (1) אפשר היה להעניק גישה מהדפדפן; בלי (2) הבורר לא
     היה מופיע ואיש לא היה יכול להיכנס; בלי (4) התפקיד היה
     "דביק" והסרתו בלוח לא הייתה סוגרת.

   ⚠ **הבדיקה משבצת את התפקיד לחשבון הבדיקה ומחזירה ב-`finally`.**
     הוא אינו נספר בשום מונה (4לא), ולכן זה החשבון היחיד שאפשר
     לעשות בו את זה. שיבוץ לחניך אמיתי היה משאיר אותו עם גישת
     צוות אם ההרצה תיפול באמצע.

   ⚠⚠ **וההמתנה היא על תנאי ולא על זמן.** `invalidate()` כאן
     אינו נוגע במטמון של שרת הפיתוח — הוא בתהליך אחר. בלי
     ההמתנה הטענה הראשונה נבדקת על נתון ישן, וזה בדיוק מה
     שקרה באימות הראשון של התכונה הזו.
   ============================================================ */
import { gql } from "../../api/_monday.js";
import { MECHINA_BOARDS } from "../../shared/mechina-boards.js";
import { ROLES_COL, ROLE_DEV, KNOWN_ROLES } from "../../shared/lessons-boards.js";
import { invalidate } from "../../api/_cache.js";

const B = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};

const rows = (await gql(
  `{ boards(ids:[${MECHINA_BOARDS.roster}]){ items_page(limit:500){ items{ id name
     column_values(ids:["${ROLES_COL}"]){ text } } } } }`,
)).boards[0].items_page.items;
const demo = rows.find((r) => String(r.name).includes("בדיקה"));
if (!demo) {
  console.log("✗ אין חשבון בדיקה — npm run seed:demo");
  console.log("0 עברו, 1 נכשלו");
  process.exit(1);
}
const before = String(demo.column_values[0]?.text || "")
  .split(",").map((x) => x.trim()).filter(Boolean);

const setRoles = async (list) => {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }`,
    { b: MECHINA_BOARDS.roster, i: demo.id, v: JSON.stringify({ [ROLES_COL]: { labels: list } }) },
  );
  invalidate("student-rows");
};

let ck = "";
const call = async (p, dev) => {
  const r = await fetch(B + p, {
    headers: { ...(ck ? { cookie: ck } : {}), ...(dev ? { "x-kx-dev": "1" } : {}) },
  });
  const s = r.headers.get("set-cookie"); if (s) ck = s.split(";")[0];
  return { s: r.status, b: await r.json().catch(() => ({})) };
};

/** ⚠ על תנאי ולא על זמן — ראו ההערה בראש הקובץ. */
const until = async (want) => {
  for (let i = 0; i < 40; i++) {
    const m = await call("/api/auth?action=me", true);
    if (m.b.isDev === want) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
};

console.log("\n0 · התפקיד מוכר בקוד");
ok("ROLE_DEV ב-KNOWN_ROLES", KNOWN_ROLES.includes(ROLE_DEV), ROLE_DEV);

const r0 = await fetch(B + "/api/auth?action=signin", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user: "bdika", password: process.env.DEMO_PASS || "mechina2026" }),
});
ck = (r0.headers.get("set-cookie") || "").split(";")[0];
ok("חשבון הבדיקה נכנס", r0.status === 200, String(r0.status));

try {
  /* ============ 1 · כותרת בלי תפקיד ============ */
  console.log("\n1 · הכותרת לבדה אינה פותחת דבר");
  await setRoles(before.filter((x) => x !== ROLE_DEV));
  if (!(await until(false))) console.log("  (מטמון — ממשיך בכל זאת)");
  let m = await call("/api/auth?action=me", true);
  ok("isManager נשאר false", m.b.isManager === false, String(m.b.isManager));
  ok("ו-devMode false", m.b.devMode === false, String(m.b.devMode));
  let st = await call("/api/students?action=list", true);
  ok("ונקודת קצה של מנהל חסומה", st.s === 403, String(st.s));

  /* ============ 2 + 3 · עם התפקיד ============ */
  await setRoles([...before.filter((x) => x !== ROLE_DEV), ROLE_DEV]);
  ok("השרת רואה את התפקיד", await until(true));

  console.log("\n2 · עם התפקיד, בלי כותרת — מצב חניך");
  m = await call("/api/auth?action=me", false);
  /* ⚠ isDev דלוק **גם** במצב חניך: הוא מה שמציג את הבורר.
     בלעדיו אין דרך להיכנס למצב מפתח בכלל. */
  ok("isDev דלוק (הבורר מופיע)", m.b.isDev === true, String(m.b.isDev));
  ok("אבל devMode כבוי", m.b.devMode === false, String(m.b.devMode));
  ok("ו-isManager כבוי", m.b.isManager === false, String(m.b.isManager));
  st = await call("/api/students?action=list", false);
  ok("ונקודת קצה של מנהל חסומה", st.s === 403, String(st.s));

  console.log("\n3 · עם התפקיד ועם כותרת — גישת צוות");
  m = await call("/api/auth?action=me", true);
  ok("devMode דלוק", m.b.devMode === true, String(m.b.devMode));
  ok("isManager דלוק", m.b.isManager === true, String(m.b.isManager));
  /* ⚠ **`isStudent` נשאר true** — הוא עדיין נספר בנוכחות,
     בתורנויות ובמכסות. מה שהשתנה הוא מה הוא רשאי לקרוא. */
  ok("ו-isStudent נשאר true", m.b.isStudent === true, String(m.b.isStudent));
  st = await call("/api/students?action=list", true);
  ok("רשימת החניכים נפתחת", st.s === 200 && (st.b.students || []).length > 0,
    `${st.s} ${(st.b.students || []).length}`);

  /* ⚠⚠ שתי ההבטחות שנפתחו במודע (החלטת ראש המכינה, 15.9.2026).
     הטענה כאן אינה "זה נכון" אלא "זה מה שהוחלט" — מי שיחזיר
     את הגבול יראה אותה נופלת ויידע שהוא משנה החלטה. */
  const pr = await call("/api/students?action=projects", true);
  ok("והפרויקטים של כולם נפתחים", pr.s === 200, `${pr.s} ${(pr.b.projects || []).length}`);
  const dt = await call("/api/students?action=duty-tasks", true);
  ok("וגם משימות בעלי התפקידים", dt.s === 200, `${dt.s} ${(dt.b.tasks || []).length}`);

  /* ============================================================
     ⚠⚠⚠ **החסימה הגורפת של החניכים, ו-`devMode` שעובר אותה.**

     הדיווח (ראש המכינה, 22.9.2026): *"לדף המפתח אין גישה
     לרשימות הציוד השבועיות"*. ההרשאה היתה קיימת —
     `isManager` דלוק — אבל `withAuth(handler)` **בלי אף
     אפשרות** חוסם לפי `isStudent`, ו-`isStudent` נשאר true
     במצב מפתח בכוונה. זו הרשאה שאי אפשר להגיע אליה, אותו
     דפוס של 5לא ו-5לב.

     ⚠ **אלה כל נקודות הקצה שנושאות את החתימה הזו היום:**
       `grep -l "withAuth(handler);" api/_*.js` → ארבע.
       `doctor` אינו כאן כי הוא פיתוח מקומי בלבד ומחזיר
       404 בדיפלוי, ולכן אינו מסך.

     ⚠⚠ **ושני הכיוונים באותה הרצה.** טענה אחת בלבד ("נפתח
       במצב מפתח") הייתה נשארת ירוקה גם אילו החסימה נפלה
       לכל חניך — וזה בדיוק מה שהשורה הזו שומרת עליו.
     ============================================================ */
  const BLANKET = [
    ["/api/students?action=gear-week", "רשימות הציוד השבועיות"],
    ["/api/students?action=trends", "המגמות"],
  ];
  for (const [path, label] of BLANKET) {
    const on = await call(path, true);
    ok(label + " נפתחות במצב מפתח", on.s === 200, String(on.s));
    const off = await call(path, false);
    ok("ו" + label + " חסומות בלעדיו", off.s === 403, String(off.s));
  }

  /* ⚠⚠ **ומפת ההרשאות נשארת סגורה — בכוונה.**
       `devMode` נותן גישת **צוות** (`isManager`), ולא את
       זו של ראש המכינה (`isHead`). דף ההרשאות הוא
       ראש המכינה בלבד (5סב) — והטענה הזו היא מה
       שימנע ממי שירחיב את השער הגורף לפתוח
       אותו בלי לשים לב. */
  const ac = await call("/api/students?action=access", true);
  ok("מפת ההרשאות נשארת סגורה (ראש המכינה בלבד)",
    ac.s === 403, String(ac.s));

  /* ============ 4 · הסרה סוגרת מיד ============ */
  console.log("\n4 · הסרת התפקיד סוגרת מיד, גם עם הכותרת");
  await setRoles(before.filter((x) => x !== ROLE_DEV));
  ok("השרת ראה את ההסרה", await until(false));
  m = await call("/api/auth?action=me", true);
  ok("isManager חזר ל-false", m.b.isManager === false, String(m.b.isManager));
  st = await call("/api/students?action=list", true);
  ok("והמסך נחסם שוב", st.s === 403, String(st.s));
} finally {
  await setRoles(before);
  invalidate("student-rows");
  console.log("\n(שוחזר: " + (before.length ? before.join(" · ") : "ללא תפקידים") + ")");
}

console.log(`\n${pass} עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
