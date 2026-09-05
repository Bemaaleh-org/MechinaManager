import React, { useState, useEffect, useCallback } from "react";
import { CSS } from "./styles.js";
/* ⚠ **הלוגו היה בשלושה מקומות**: base64 ב-src/logo.js, קובץ
   ב-public, ומחרוזת נתיב בכל מסך. החלפת לוגו נגמרה בכך ששניים
   מהמסכים התעדכנו והשניים האחרים לא. src/brand.js הוא המקור
   היחיד, ו-src/logo.js נמחק (48KB של base64 בחבילה). */
import { BRAND } from "./brand.js";
import { api, setUnauthorizedHandler } from "./api.js";
import Login from "./Login.jsx";
import Setup from "./Setup.jsx";
import { CyclesPage } from "./Cycles.jsx";
import { ProfilePage } from "./Profile.jsx";
import BoardPage from "./Board.jsx";
import MyDataPage from "./MyData.jsx";
import TrendsPage from "./Trends.jsx";
import SearchOverlay, { SearchButton } from "./Search.jsx";
import ExportPage from "./Export.jsx";
import { MechinaApp, MechinaStaff, WeekLeadersPage, RoleHoldersPage } from "./Mechina.jsx";
import { LessonsPage, LessonsBoard, LESSON_TABS } from "./Lessons.jsx";
import { AlumniPage, HostingPage, LoansPage } from "./Extras.jsx";
import { MenuPage } from "./Menu.jsx";
import { ContainerPage } from "./Container.jsx";
import { BudgetPage } from "./Budget.jsx";
import { GanttPage } from "./Gantt.jsx";
import { AgendaPage, TodayAgenda } from "./Agenda.jsx";
import { PlacementsPage } from "./Placements.jsx";
import TeamsPage from "./Teams.jsx";
import ChoresPage from "./Chores.jsx";
import RulesPage from "./Rules.jsx";
import TryoutsPage from "./Tryouts.jsx";
import AccessPage from "./Access.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import ContentPage from "./Content.jsx";
import { SafetyPage } from "./Safety.jsx";
import { FaultsPage } from "./Faults.jsx";
import { KitchenPage } from "./Kitchen.jsx";
import { useNotify, NotifyBell, NotifyPanel } from "./Notify.jsx";
import { Drawer, Hamburger } from "./Drawer.jsx";
import { testDate } from "./testDate.js";

/* ============================================================
   ניהול מכינת ניר עוז — שלד האפליקציה
   ------------------------------------------------------------
   הקובץ הזה מחזיק את שער הכניסה, הניווט והמסגרת בלבד. כל תחום
   יושב בקובץ משלו: המטבח ב-Kitchen.jsx, ציוד המכינה
   ב-Container.jsx, הנוכחות ב-Mechina.jsx והשיעורים
   ב-Lessons.jsx. שניים מהם — המטבח וציוד המכינה — חולקים מסך
   אחד ב-Equipment.jsx.

   ⚠ בעבר ישבו כאן גם כל מסכי מלאי המטבח, ואיתם מצב מקומי
     שנשמר ב-localStorage. הם הוסרו: המלאי נוהל בקוד לצד
     monday, ושתי מקורות אמת לאותו נתון הם באג שממתין לקרות.
     מה שיש היום קורא מ-monday בזמן ריצה, בלי שכבת אחסון
     בדפדפן.
   ============================================================ */

/* ---------- icons ---------- */
const I = {
  home: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  day: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  count: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>,
  cart: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>,
  gear: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="6" rx="1.6"/><rect x="3" y="14" width="18" height="6" rx="1.6"/><path d="M7 7h.01M7 17h.01"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  x: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  clock: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/></svg>,
  download: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  /* ⚠ נוסף עבור מסך "מי רשאי למה". `<I.lock />` על מפתח שאינו
     קיים אינו נופל ב-vite build — הוא מפיל את **כל המגירה**
     בדפדפן ב"Element type is invalid", כלומר מסך לבן לכל
     איש צוות. ראו tools/check-icons.mjs. */
  lock: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="10.5" width="16" height="10.5" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
  book: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5z"/><path d="M4 17.5h16"/></svg>,
  note: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h14v18l-7-4-7 4V3z"/></svg>,
  star: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>,
  cal: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  box: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
  bell: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>,
  users: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.4-1-4.1-2.6-5"/></svg>,
  edit: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
};

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

const hebDate = (d = new Date()) =>
  DAYS[d.getDay()] + ", " + d.getDate() + " ב" + MONTHS[d.getMonth()];

/* ============================================================
   שער הכניסה
   ------------------------------------------------------------
   בודק מול השרת מי מחובר. אין סשן — מסך כניסה. השרת ניתק
   באמצע העבודה — חזרה למסך הכניסה עם ההסבר שהשרת נתן.

   הזהות מגיעה מהסשן בלבד — גם בשרת וגם על המסך.
   ============================================================ */
export default function App() {
  const [auth, setAuth] = useState(undefined); // undefined=בודק, null=לא מחובר
  const [notice, setNotice] = useState(null);

  const check = useCallback(() => {
    api.me()
      .then((m) => { setAuth(m); setNotice(null); })
      .catch(() => setAuth(null));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((msg) => { setAuth(null); setNotice(msg); });
    check();
    return () => setUnauthorizedHandler(null);
  }, [check]);

  if (auth === undefined) {
    return (<><style>{CSS}</style><div className="kx">
      <div className="empty" style={{ paddingTop: 100 }}><div className="e1">רגע…</div></div>
    </div></>);
  }

  if (auth === null) {
    return (<><style>{CSS}</style>
      <Login notice={notice} onDone={check} />
    </>);
  }

  /* התנתקות יזומה לא מציגה הודעה — המשתמש יודע שלחץ עליה.
     ההודעות במסך הכניסה שמורות למה שקרה בלי שביקש: הקוד הוחלף,
     תוקף פג, הרשאה כובתה. */
  const signedOut = () => { setAuth(null); setNotice(null); };

  /* ============================================================
     ⚠ כניסה ראשונה — לפני כל דבר אחר.
       השרת חוסם ממילא כל נקודת קצה לסשן במצב setup (ראו
       withAuth), ולכן המסך הזה אינו "הצעה" אלא ההשתקפות של
       מה שכבר נאכף. בלעדיו המשתמש היה רואה מסך שכל נתון בו
       נכשל ב-403 בלי להבין למה.
     ============================================================ */
  if (auth.setup) {
    return (<><style>{CSS}</style>
      <Setup name={auth.name} onDone={check}
        onSignOut={() => api.logout().catch(() => {}).finally(() => setAuth(null))} />
    </>);
  }

  /* ⚠ חניך מקבל שלד משלו. השרת דוחה סשן חניך מנקודות הקצה של
     המטבח, ולכן טאב מטבח אצלו היה מוביל למסך שגיאה בלבד. */
  if (auth.isStudent) {
    return (<><style>{CSS}</style>
      <MechinaApp auth={auth} onSignedOut={signedOut} />
    </>);
  }

  return <Staff auth={auth} onSignedOut={signedOut} />;
}

/* ============================================================
   המסגרת של הצוות והתורנים
   ------------------------------------------------------------
   כותרת, מגירת ניווט, פעמון ההתראות ובורר התחומים. אין כאן
   נתונים — כל מסך טוען את שלו.
   ============================================================ */
function Staff({ auth, onSignedOut }) {
  const isMgr = auth.isManager;
  /* מנהל נוחת בלוח הבית; תורן נוחת ישר בציוד האוכל, שהוא
     כמעט כל מה שהוא עושה כאן. */
  const [section, setSection] = useState(isMgr ? "dash" : "kitchen");
  /* התחום שמסך הציוד מציג — אוכל או חד״פ במטבח, מכולה או
     ניקיון בציוד המכינה. שני מצבים נפרדים, אחרת מעבר בין
     התחומים היה גורר את התחום של המסך השני. */
  /* ⚠ null = אוכל וחד״פ יחד, וזו ברירת המחדל. */
  /* ⚠ ההתראות נטענות גם כשהפעמון סגור — התג הוא כל התכלית. */
  const notify = useNotify(true);
  const [kArea, setKArea] = useState(null);
  const [cArea, setCArea] = useState("מכולה");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [userOpen, setUserOpen] = useState(false);

  /* פעמון המנהל: בקשות היציאה שממתינות. נבדק בטעינה ומדי דקה
     וחצי — התראה, לא זמן-אמת. */
  /* ⚠ שתי רשימות ולא אחת. מאז שיש שני שלבים, "ממתינה" אינה
     "ממתינה לי": איש צוות שאינו המדריך של הקבוצה ואינו ראש
     המכינה אינו מכריע בכלום, ופעמון שמצלצל לו על בקשה שאינו
     יכול לגעת בה הוא רעש. הפעמון וכרטיס תשומת הלב הולכים לפי
     mineList; המונה במסך הבית מציג את שתיהן. */
  const [pendingList, setPendingList] = useState([]);
  const mineList = pendingList.filter((r) => r.canDecide);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  /* ניווט פנימי מהמגירה ומהפעמון: לאיזה תת-מסך לפתוח את התחום */
  const [staffNav, setStaffNav] = useState({ sub: null, n: 0 });
  const [lessonsNav, setLessonsNav] = useState({ sub: null, n: 0 });
  /* ⚠ באיזו לשונית אנחנו בפועל, לא לאיזו ניווטנו. חמישה
     פריטים בתפריט נשאו active:false קבוע, ולכן המגירה לא סימנה
     את הדף שנמצאים בו — הסימון היה קיים בעיצוב ולא בנתונים. */
  const [staffSub, setStaffSub] = useState("students");
  const [lessonsSub, setLessonsSub] = useState("sheets");
  const [rolesNav, setRolesNav] = useState({ sub: null, n: 0 });

  useEffect(() => {
    if (!isMgr) return;
    let live = true;
    const check = () => api.getRequests("ממתין")
      .then((r) => { if (live) setPendingList(r.requests || []); })
      .catch(() => { /* התראה בלבד — כשל שקט */ });
    check();
    const t = setInterval(check, 90_000);
    return () => { live = false; clearInterval(t); };
  }, [isMgr]);

  /* ⚠ אייקון לכל אחד מארבעת מסכי השיעורים. מסך בלי ערך במפה
     מקבל ברירת מחדל ואינו נעלם (4יא). */
  const LESSON_ICON = {
    board: <I.day />, sheets: <I.book />, evals: <I.star />, pay: <I.note />,
  };

  const say = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2400); }, []);

  const goStaff = (sub) => { setSection("mechina"); setStaffNav((p) => ({ sub, n: p.n + 1 })); };
  const goLessons = (sub) => { setSection("lessons"); setLessonsNav((p) => ({ sub, n: p.n + 1 })); };
  /* ⚠ "leaders" ולא "roles": מובילי השבוע הם מסך עצמאי מאז
     שהופרדו מבעלי התפקידים. */
  const goRoles = (sub) => { setSection("leaders"); setRolesNav((p) => ({ sub, n: p.n + 1 })); };
  const goKitchen = (a) => { setKArea(a); setSection("kitchen"); };
  const goContainer = (a) => { setCArea(a); setSection("container"); };
  const openRequests = () => { setNotifOpen(false); goStaff("requests"); };

  /* ============================================================
     יעד חיפוש → מסך במעטפת הצוות
     ------------------------------------------------------------
     ⚠⚠ **המעטפות אינן חולקות שמות מסכים, וזה ידוע.** מעטפת
       החניך היא `tab` שטוח; מעטפת הצוות מפוצלת לחלקים
       (`mechina` + תת-מסך, `lessons` + תת-מסך). השרת מחזיר
       שם אחד — שם המסך כפי שהחניך מכיר אותו — והמיפוי מכאן
       הוא של המעטפת הזו בלבד.

     ⚠ **ויעד שאין לו מיפוי אינו עושה כלום ואינו נופל.** מסך
       חדש שיתווסף לחיפוש ולא לכאן ישאיר את המשתמש במקומו —
       וזה עדיף על ניווט לדף שגוי (עיקרון 6 בגרסה שקטה).

     ⚠ ואין כאן פרויקטים, מיונים או המובילשיות: הם מסכים של
       החניך על עצמו, ולצוות אין להם מקבילה (5ח, 5ד).
     ============================================================ */
  const goSearch = (tab) => {
    const direct = new Set([
      "profile", "board", "agenda", "gantt", "chores", "menu", "rules",
      "faults", "safety", "budget", "teams", "placements", "hosting", "loans",
    ]);
    if (direct.has(tab)) { setSection(tab); return; }
    if (tab === "home") { setSection("dash"); return; }
    if (tab === "students" || tab === "year" || tab === "requests") {
      goStaff(tab === "students" ? "students" : tab === "year" ? "students" : "requests");
      return;
    }
    if (tab === "l-board") { goLessons("board"); return; }
    if (tab === "l-sheets") { goLessons("sheets"); return; }
    if (tab === "l-evals") { goLessons("evals"); return; }
    if (tab === "lead-week" || tab === "leadership") { goRoles("weeks"); return; }
    if (tab === "k-all") { goKitchen(null); return; }
    if (tab === "container") { goContainer("מכולה"); return; }
    if (tab === "cleaning") { goContainer("ניקיון"); return; }
    /* יעד לא מוכר — נשארים במקום. */
  };

  /* ⚠ **החיווי במסך, לא רק בשרת.** מי שכל כפתור שילחץ עליו
     יחזיר 403 צריך לדעת מראש שזה מכוון ולא תקלה — אחרת הוא
     יסיק שהמערכת שבורה וידווח על באג. */
  const user = {
    name: auth.name || "תורן",
    role: auth.viewOnly ? "צפייה בלבד" : (isMgr ? "צוות" : "תורנות מטבח"),
  };

  const kitchenItems = [
    /* ⚠ פריט אחד ולא שניים. אוכל וחד״פ חולקים לוח אחד ורשימת
       קניות אחת, וההפרדה למסכים רק אילצה לעבור ביניהם באמצע
       ספירת מלאי. המסנן שבתוך המסך מפריד כשצריך. */
    { key: "k-all", label: "אוכל וחד״פ", icon: <I.cart />,
      active: section === "kitchen", onClick: () => goKitchen(null) },
    /* ⚠ תקציב הוא נתון כספי — מנהל בלבד, והשרת אוכף */
    { key: "k-menu", label: "תפריט ארוחות", icon: <I.book />,
      active: section === "menu", onClick: () => setSection("menu") },
    ...(isMgr ? [{ key: "k-budget", label: "תקציב המטבח", icon: <I.count />,
      active: section === "budget", onClick: () => setSection("budget") }] : []),
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="kx">
        {/* ⚠ רצועה קבועה ולא הודעה חד-פעמית: ההגבלה חלה בכל
            מסך ובכל רגע, ומי שיגלול הלאה ישכח אותה. */}
        {auth.viewOnly && (
          <div className="ro-bar">
            החשבון שלכם מוגדר <b>לצפייה בלבד</b> — כל המערכת פתוחה לקריאה,
            ושמירה אינה אפשרית.
          </div>
        )}
        <header className="top">
          <div className="top-row">
            <Hamburger onClick={() => setDrawerOpen(true)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1>ניהול מכינת ניר עוז</h1>
              <div className="sub">{hebDate(new Date())}</div>
            </div>
            {/* ⚠ **בסרגל ולא במסך.** חיפוש שדורשים לנווט אליו
                הוא חיפוש שאיש לא ישתמש בו. */}
            <SearchButton onClick={() => setSearchOpen(true)} />
            <NotifyBell notify={notify} open={notifOpen}
              onToggle={() => setNotifOpen((v) => !v)} />
            <div className="brand-coin" aria-label="במעלה הדרך">
              <img src={BRAND.mark} alt={"לוגו " + BRAND.motto} />
            </div>
            <button className="who" onClick={() => setUserOpen(true)}>
              <span className="dot" />{user.name.split(" ")[0]}
            </button>
          </div>
        </header>

        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
          logo={BRAND.mark} title="ניהול מכינת ניר עוז"
          subtitle={`מכינת ניר עוז${auth.cycle ? " · " + auth.cycle : ""}`}
          user={user}
          onLogout={() => api.logout().catch(() => {}).finally(onSignedOut)}
          groups={isMgr ? [
            { items: [
              { key: "dash", label: "מסך הבית", icon: <I.home />, active: section === "dash",
                onClick: () => setSection("dash") },
              { key: "profile", label: "הפרופיל שלי", icon: <I.users />,
                active: section === "profile", onClick: () => setSection("profile") },
              /* ⚠ **אותו מסך בדיוק של החניך** — עיקרון 4יט. מה
                 שמשתנה הוא מה שהשרת מחזיר: הצוות רואה גם מודעות
                 לצוות, וגם את המשוב האנונימי. */
              { key: "board", label: "לוח מודעות", icon: <I.note />,
                active: section === "board", onClick: () => setSection("board") },
              /* ⚠ **לאיש צוות זו לשונית "מה חדש" בלבד** — אין
                 עליו נתונים במערכת מלבד חשבון הכניסה, והשרת
                 מחזיר 400 מפורש שאומר בדיוק את זה. */
              { key: "news", label: "מה חדש", icon: <I.note />,
                active: section === "news", onClick: () => setSection("news") },
              /* ⚠ **צוות בלבד, והמסך אומר במפורש שאין בו מספרים
                 על אנשים.** ראו api/_trends.js. */
              { key: "trends", label: "מגמות", icon: <I.check />,
                active: section === "trends", onClick: () => setSection("trends") },
            ] },
            { label: "מטבח וחד״א", items: kitchenItems },
            { label: "חניכים ונוכחות", items: [
              { key: "a-students", label: "חניכים", icon: <I.users />,
                active: section === "mechina" && staffSub === "students", onClick: () => goStaff("students") },
              { key: "a-mark", label: "סימון יומי", icon: <I.check />,
                active: section === "mechina" && staffSub === "mark", onClick: () => goStaff("mark") },
              { key: "a-requests", label: "בקשות יציאה", icon: <I.note />, badge: mineList.length,
                active: section === "mechina" && staffSub === "requests",
                onClick: () => goStaff("requests") },
            ] },
            /* ============================================================
               ⚠ **"מובילי שבוע" ו"בעלי תפקידים" הופרדו לגמרי.**

               הם נראו כמו שני צדדים של אותו דבר ואינם: מוביל
               שבוע נגזר משיבוץ בלוח השבועות ומתחלף כל שבוע,
               ובעל תפקיד נקבע בעמודת התפקידים ונשאר כל השנה.
               עד עכשיו שניהם היו שתי לשוניות של מסך אחד בשם
               "תפקידים במכינה", ובפועל השנייה כמעט לא נפתחה.
               ============================================================ */
            { label: "תפקידים", items: [
              { key: "a-leaders", label: "מובילי שבוע", icon: <I.day />,
                active: section === "leaders", onClick: () => goRoles("weeks") },
              { key: "a-roles", label: "בעלי תפקידים", icon: <I.users />,
                active: section === "roles", onClick: () => setSection("roles") },
            ] },
            { label: "חניכים ושיבוצים", items: [
              /* ⚠ **התפקידים הקבועים כבר אינם כאן.** הייתה
                 במסך הזה לשונית "תפקידים" שהציגה את אותו רכיב
                 בדיוק — שני מקומות לחפש בהם את אותו דבר. */
              { key: "a-place", label: "שיבוצי חניכים", icon: <I.users />, active: section === "placements",
                onClick: () => setSection("placements") },
              /* ⚠ אב הבית ואחראי המטבח מגיעים לאותו מסך בדיוק
                 מהמעטפת שלהם ב-Mechina.jsx — עיקרון 4יט. */
              { key: "a-chores", label: "תורנויות", icon: <I.check />, active: section === "chores",
                onClick: () => setSection("chores") },
              { key: "a-rules", label: "נהלים במכינה", icon: <I.book />, active: section === "rules",
                onClick: () => setSection("rules") },
            ] },
            /* ⚠ קטגוריה משלה: הצבא הוא נושא שלם ולא פריט תחת
               "חניכים". היום יש בו מסך אחד, ומחר יהיו בו יותר. */
            { label: "צבא", items: [
              /* ⚠ **גלוי לכל הצוות, ולא רק ליו״ר הוועדה.** המסך
                 קורא בלבד, והשרת קובע מי רואה את הכול — לפי
                 תיבה בלוח ולא לפי שם בקוד. */
              { key: "a-tryouts", label: "מיונים ושיבוצים", icon: <I.users />,
                active: section === "tryouts", onClick: () => setSection("tryouts") },
            ] },
            /* ============================================================
               ⚠ **"ניהול" — מה שמגדיר את המערכת, ולא מה שמפעיל
                 אותה.** שלושת המסכים כאן אינם עבודה יומיומית:
                 מי בצוותים, מי רשאי למה, ומה כתוב במסכים.
               ============================================================ */
            { label: "ניהול", items: [
              { key: "a-teams", label: "ניהול צוותים", icon: <I.users />, active: section === "teams",
                onClick: () => setSection("teams") },
              /* ⚠ **צוות בלבד.** אין כאן סוד — כל שורה גלויה
                 ממילא — אבל זה מסך תפעולי של הצוות. */
              { key: "a-access", label: "הרשאות", icon: <I.lock />,
                active: section === "access", onClick: () => setSection("access") },
              /* ⚠ ראש המכינה בלבד — עריכת נוסח היא שינוי של
                 מה שכתוב במכינה, לא של מסך. */
              ...(auth.isHead ? [{ key: "a-content", label: "ניהול תוכן", icon: <I.note />,
                active: section === "content", onClick: () => setSection("content") }] : []),
            ] },
            { label: "לו״ז", items: [
              { key: "agenda", label: "הלו״ז שלי", icon: <I.day />,
                active: section === "agenda", onClick: () => setSection("agenda") },
              { key: "gantt", label: "גאנט שנתי", icon: <I.cal />,
                active: section === "gantt", onClick: () => setSection("gantt") },
            ] },
            /* ============================================================
               ⚠ **ארבעה דפים, ולא דף אחד עם ארבע לשוניות.**
                 השמות והסדר מגיעים מ-`LESSON_TABS` שב-Lessons.jsx —
                 אותו מקור שמזין את `DUTIES` ואת המגירה של החניך.
                 קודם ישבו כאן שני קישורים בלבד ("גיליונות" ו"חוות
                 דעת"), והלוח והתשלום היו נגישים רק למי שידע שיש
                 רצועה פנימית בפנים.
               ============================================================ */
            { label: "שיעורים", items: LESSON_TABS.map((t) => ({
              key: t.tab, label: t.label, icon: LESSON_ICON[t.sub] || <I.book />,
              active: section === "lessons" && lessonsSub === t.sub,
              onClick: () => goLessons(t.sub),
            })) },
            /* ⚠ הבוגרים אינם בטיחות ואינם תחזוקה. הם קטגוריה
               בפני עצמה — מי שכבר סיים את המכינה. */
            { label: "בוגרים ומחזורים", items: [
              { key: "alumni", label: "בוגרי המכינה", icon: <I.users />,
                active: section === "alumni", onClick: () => setSection("alumni") },
              /* ⚠ ראש המכינה בלבד. השרת אוכף; זו תצוגה. */
              ...(auth.isHead ? [{ key: "cycles", label: "מחזורים", icon: <I.cal />,
                active: section === "cycles", onClick: () => setSection("cycles") }] : []),
              /* ⚠ צוות, לא ראש מכינה בלבד. הדוחות הם כלי עבודה
                 ולא פעולה מבנית, והשרת אוכף `manager`. */
              { key: "export", label: "ייצוא לגיליונות", icon: <I.download />,
                active: section === "export", onClick: () => setSection("export") },
            ] },
            { label: "בטיחות ותחזוקה", items: [
              { key: "safety", label: "אירועי בטיחות", icon: <I.warn />, active: section === "safety",
                onClick: () => setSection("safety") },
              { key: "hosting", label: "אירוח קבוצות", icon: <I.home />,
                active: section === "hosting", onClick: () => setSection("hosting") },
              { key: "faults", label: "תקלות ובעיות", icon: <I.gear />, active: section === "faults",
                onClick: () => setSection("faults") },
              /* ⚠ ציוד הניקיון עבר לכאן מקבוצת המכולה. הוא
                 באחריות אב הבית, בדיוק כמו התקלות — ולא של
                 אחראי המכולה. */
              { key: "c-clean", label: "ציוד ניקיון", icon: <I.box />,
                active: section === "container" && cArea === "ניקיון", onClick: () => goContainer("ניקיון") },
            ] },
            /* ⚠ ההשאלות יושבות עם המכולה: הציוד שיוצא ונכנס
               הוא אותו ציוד שבמכולה, ואותו אדם אחראי עליו. */
            { label: "מכולה והשאלת ציוד", items: [
              { key: "c-container", label: "מכולה", icon: <I.box />,
                active: section === "container" && cArea === "מכולה", onClick: () => goContainer("מכולה") },
              { key: "loans", label: "השאלת ציוד", icon: <I.box />,
                active: section === "loans", onClick: () => setSection("loans") },
            ] },
          ] : [
            { label: "המטבח", items: kitchenItems },
          ]} />

        {/* ⚠ פאנל אחד לכל התחומים, ולא רק לבקשות היציאה.
            ראו api/_notify.js: מה שדורש טיפול נגזר מהמצב. */}
        {/* ⚠ **שכבה מעל המסך ולא ניווט.** מי שסוגר את החיפוש
            חוזר בדיוק לאן שהיה, ומי שבוחר תוצאה מנווט. */}
        {searchOpen && (
          <SearchOverlay onClose={() => setSearchOpen(false)} onGo={goSearch} />
        )}

        {notifOpen && (
          <NotifyPanel notify={notify} onClose={() => setNotifOpen(false)}
            onGo={(tab) => {
              const go = {
                requests: () => goStaff("requests"),
                faults: () => setSection("faults"),
                safety: () => setSection("safety"),
                hosting: () => setSection("hosting"),
                loans: () => setSection("loans"),
                lessons: () => goLessons("board"),
                evals: () => goLessons("evals"),
                "k-all": () => goKitchen(null),
                container: () => goContainer("מכולה"),
                cleaning: () => goContainer("ניקיון"),
              }[tab];
              if (go) go();
            }} />
        )}

        <main className="wrap">
          {/* ============================================================
              ⚠⚠ **הגבול עוטף את גוף המסך ולא את האפליקציה.**
                מסגרת שעוטפת הכול הייתה מחליפה דף לבן בדף שגיאה
                לבן — עדיין בלי ניווט וללא מוצא. כאן המגירה,
                הכותרת והפעמון נשארים חיים, ורק גוף המסך מוחלף.

              ⚠ `resetKey={section}` מנקה את השגיאה במעבר מסך:
                בלעדיו קריסה אחת הייתה נראית כמו אפליקציה מתה.
              ============================================================ */}
          <ErrorBoundary resetKey={section} what={section}>
          {section === "dash" && isMgr && (
            <ManagerDash pendingList={pendingList} cycle={auth.cycle} goStaff={goStaff} goLessons={goLessons}
              goKitchen={goKitchen} goContainer={goContainer}
              goPlacements={() => setSection("placements")}
              goSafety={() => setSection("safety")}
              goFaults={() => setSection("faults")}
              goGantt={() => setSection("gantt")}
              goBudget={() => setSection("budget")}
              goAgenda={() => setSection("agenda")} />
          )}

          {section === "kitchen" && <KitchenPage say={say} area={kArea} />}
          {section === "menu" && <MenuPage say={say} />}
          {section === "profile" && <ProfilePage say={say} />}
          {section === "board" && <BoardPage say={say} />}
          {section === "news" && <MyDataPage say={say} isStudent={false} sub0="news" />}
          {section === "trends" && <TrendsPage say={say} />}
          {section === "alumni" && <AlumniPage say={say} />}
          {section === "cycles" && auth.isHead && <CyclesPage say={say} />}
          {section === "export" && <ExportPage say={say} />}
          {section === "hosting" && <HostingPage say={say} />}
          {section === "loans" && <LoansPage say={say} />}

          {/* ⚠ ההרשאה נאכפת בשרת; הבדיקה כאן היא תצוגה בלבד. */}
          {section === "mechina" && isMgr && (
            <MechinaStaff say={say} key={staffNav.n} sub0={staffNav.sub || undefined}
              isHead={Boolean(auth.isHead)}
              onSub={setStaffSub} />
          )}
          {/* ⚠ `solo` — הרצועה הפנימית ירדה, וכל דף נפתח לבדו.
              `key` מאלץ מונטאז' מחדש כשעוברים בין הדפים, אחרת
              מצב פנימי של דף אחד (גיליון פתוח, חודש שנבחר) היה
              נשאר על המסך הבא. */}
          {section === "lessons" && isMgr && (
            <LessonsPage say={say} solo
              key={(lessonsNav.sub || "sheets") + ":" + lessonsNav.n}
              sub0={lessonsNav.sub || undefined} onSub={setLessonsSub} />
          )}
          {/* ⚠ שני מסכים נפרדים, ולא שתי לשוניות של אחד. */}
          {section === "leaders" && isMgr && (
            <WeekLeadersPage say={say} key={rolesNav.n} sub0={rolesNav.sub || undefined} />
          )}
          {section === "roles" && isMgr && <RoleHoldersPage say={say} />}
          {section === "placements" && isMgr && <PlacementsPage say={say} />}
          {/* ⚠ go מועבר: בלעדיו הכפתור "למרכז התפקיד" במסך
              הצוות לא עושה כלום, **בלי שגיאה** — Teams.jsx מגן
              ב-go && go(...). מנהל אינו יו״ר ולכן הוא לא יגיע
              לשם, אבל תנאי שמסתיר כשל הוא בדיוק מה שנשכח. */}
          {section === "chores" && <ChoresPage say={say} />}
          {section === "rules" && <RulesPage say={say} />}
          {section === "tryouts" && <TryoutsPage say={say} />}
          {/* ⚠ **"מובילשיות" ו"תשלום למרצים" כבר אינם מסכים
              עצמאיים בתפריט.** הראשון הוא לשונית של "מובילי
              שבוע", והשני לשונית של "שיעורים במכינה" — כל אחד
              נשען על המסך שממנו נגזרים הנתונים שלו. */}
          {section === "access" && <AccessPage />}
          {section === "content" && auth.isHead && <ContentPage say={say} />}
          {section === "teams" && isMgr && <TeamsPage say={say} go={() => setSection("roles")} />}
          {section === "safety" && isMgr && <SafetyPage say={say} />}
          {section === "faults" && isMgr && <FaultsPage say={say} />}
          {section === "agenda" && <AgendaPage />}

          {section === "gantt" && <GanttPage say={say} />}

          {section === "budget" && isMgr && <BudgetPage say={say} />}

          {section === "container" && isMgr && <ContainerPage say={say} area={cArea} />}
          </ErrorBoundary>
        </main>

        {toast && <div className="toast">{toast}</div>}
        {userOpen && (
          <UserModal auth={auth} say={say} onSignedOut={onSignedOut} close={() => setUserOpen(false)} />
        )}
      </div>
    </>
  );
}

/* ====================== מסך הבית — מנהל ======================
   שלוש רצועות: פתיח על תמונת המכינה, מספרי היום בגדול, ומה
   שדורש טיפול עכשיו. כל מספר וכל שורה הם קיצור דרך למסך המלא.

   ⚠ כל שליפה נכשלת בשקט ומורידה את הרכיב שלה בלבד — מסך
     הבית לעולם לא נופל בגלל תחום אחד (או תחום שטרם הוקם). */
function ManagerDash({ pendingList, cycle, goStaff, goLessons, goKitchen, goContainer,
  goPlacements, goSafety, goFaults, goGantt, goBudget, goAgenda }) {
  /* ⚠ מה שממתין *לי*, מתוך כל מה שממתין. ראו ההערה למעלה. */
  const mineList = pendingList.filter((r) => r.canDecide);
  const [today, setToday] = useState(null);
  const [gantt, setGantt] = useState(null);
  const [faults, setFaults] = useState(null);   // {open, urgent}
  const [kitchen, setKitchen] = useState(null); // {missing, openShopping}
  const [budget, setBudget] = useState(null);   // {month, total, head}
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    api.getStudents()
      .then((r) => { if (live) setToday(r.today); })
      .catch(() => { if (live) setFailed(true); });
    api.getGantt()
      .then((r) => { if (live) setGantt(r.events); })
      .catch(() => {});
    api.getFaults()
      .then((r) => {
        if (!live) return;
        const openList = (r.faults || []).filter((x) => x.status !== "טופלה");
        setFaults({
          open: openList.length,
          urgent: openList.filter((x) => x.urgency === "דחוף").length,
        });
      })
      .catch(() => {});
    api.getBudget()
      .then((r) => { if (live) setBudget({ month: r.month, total: r.total, head: r.headcount }); })
      .catch(() => {});
    Promise.all([api.getKitchen("אוכל"), api.getKitchen("חד״פ")])
      .then(([a, b]) => {
        if (!live) return;
        setKitchen({
          missing: (a.counts?.missing || 0) + (b.counts?.missing || 0),
          openShopping: (a.counts?.openShopping || 0) + (b.counts?.openShopping || 0),
        });
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 5) return "לילה טוב";
    if (h < 12) return "בוקר טוב";
    if (h < 17) return "צהריים טובים";
    if (h < 21) return "ערב טוב";
    return "לילה טוב";
  };

  const iso = testDate() || new Date().toISOString().slice(0, 10);
  const upcoming = (gantt || []).filter((e) => e.end >= iso && e.type !== "שבת").slice(0, 4);

  /* ---------- מה דורש טיפול עכשיו ----------
     נבנה מהנתונים שכן הגיעו; תחום שלא נטען פשוט לא תורם שורה. */
  const attn = [];
  if (today && today.kind && !today.marked) {
    attn.push({ key: "mark", cls: "clay", t: "הנוכחות של היום טרם סומנה",
      s: "לחצו לסימון", go: () => goStaff("mark") });
  }
  /* ⚠ רק מה שהמשתמש הזה יכול להכריע. בקשה שממתינה למדריך אינה
     משימה של ראש המכינה, ולהפך. */
  if (mineList.length > 0) {
    attn.push({ key: "req", cls: "amber",
      t: mineList.length === 1 ? "בקשת יציאה ממתינה להחלטתך"
        : `${mineList.length} בקשות יציאה ממתינות להחלטתך`,
      s: mineList.slice(0, 2).map((r) => r.student ? r.student.name : "").filter(Boolean).join(", ")
        + (mineList.length > 2 ? ` ועוד ${mineList.length - 2}` : ""),
      go: () => goStaff("requests") });
  }
  if (faults && faults.urgent > 0) {
    attn.push({ key: "faults", cls: "clay",
      t: faults.urgent === 1 ? "תקלה דחופה פתוחה" : `${faults.urgent} תקלות דחופות פתוחות`,
      s: "לחצו לרשימת התקלות", go: goFaults });
  }
  if (kitchen && kitchen.missing > 0) {
    attn.push({ key: "kitchen", cls: "amber",
      t: `${kitchen.missing} פריטי מטבח מתחת למפתח`,
      s: "אפשר להפוך לרשימת קניות בלחיצה", go: () => goKitchen(null) });
  }

  const statTiles = [
    {
      key: "att", tone: "tone-1", ico: <I.check />, go: () => goStaff("mark"),
      cls: today && today.kind && !today.marked ? "warn" : "good",
      v: !today ? "…" : !today.kind ? "—" : today.marked ? (today.present ?? 0) : "!",
      l: "נוכחות היום",
      s: !today ? "טוען" : !today.kind ? "אין לימודים היום"
        : today.marked ? `${today.absent || 0} חסרים` : "טרם סומנה",
    },
    {
      key: "req", tone: "tone-2", ico: <I.note />, go: () => goStaff("requests"),
      cls: mineList.length ? "warn" : "good",
      v: pendingList.length, l: "בקשות יציאה",
      s: mineList.length ? `${mineList.length} להחלטתך`
        : pendingList.length ? "בתהליך אצל אחרים" : "אין ממתינות",
    },
    {
      key: "faults", tone: "tone-8", ico: <I.gear />, go: goFaults,
      cls: faults ? (faults.urgent ? "warn" : faults.open ? "" : "good") : "",
      v: faults ? faults.open : "—", l: "תקלות פתוחות",
      s: faults ? (faults.urgent ? `${faults.urgent} דחופות` : faults.open ? "בטיפול" : "אין תקלות")
        : "טרם חובר",
    },
    {
      key: "kitchen", tone: "tone-3", ico: <I.cart />, go: () => goKitchen(null),
      cls: kitchen ? (kitchen.missing ? "warn" : "good") : "",
      v: kitchen ? kitchen.missing : "—", l: "חוסרים במטבח",
      s: kitchen ? (kitchen.missing ? "מתחת למפתח" : "המלאי מלא") : "טרם חובר",
    },
    {
      key: "budget", tone: "tone-6", ico: <I.count />, go: goBudget, cls: "",
      v: budget ? Math.round(budget.total).toLocaleString("he-IL") : "—",
      l: "תקציב החודש (₪)",
      s: budget ? `${budget.head} סועדים` : "טרם חובר",
    },
  ];

  const navTiles = [
    { key: "n-food", tone: "tone-3", l: "אוכל וחד״פ", icon: <I.cart />, go: () => goKitchen(null) },
    { key: "n-place", tone: "tone-5", l: "שיבוצי חניכים", icon: <I.users />, go: goPlacements },
    { key: "n-students", tone: "tone-2", l: "חניכים", icon: <I.note />, go: () => goStaff("students") },
    { key: "n-lessons", tone: "tone-1", l: "גיליונות מרצים", icon: <I.book />, go: () => goLessons("sheets") },
    { key: "n-gantt", tone: "tone-7", l: "גאנט שנתי", icon: <I.cal />, go: goGantt },
    { key: "n-budget", tone: "tone-6", l: "תקציב המטבח", icon: <I.count />, go: goBudget },
    { key: "n-faults", tone: "tone-8", l: "תקלות ובעיות", icon: <I.gear />, go: goFaults },
    { key: "n-safety", tone: "tone-4", l: "אירועי בטיחות", icon: <I.warn />, go: goSafety },
    { key: "n-container", tone: "tone-7", l: "ציוד מכולה", icon: <I.box />, go: () => goContainer("מכולה") },
  ];

  return (
    <>
      {/* ---------- הפתיח ---------- */}
      <div className="hero2">
        <img src="/photos/dash.jpg" alt="חניכי המכינה על הדשא" />
        <div className="h2-veil" />
        {/* ⚠ שם המחזור מהשרת ולא מהקוד — ראו api/_cycle.js. */}
        <div className="h2-cap">מכינת ניר עוז{cycle ? ` · ${cycle}` : ""}</div>
        <div className="h2-txt">
          <div className="h2-greet">{greet()}</div>
          <div className="h2-date">{hebDate(new Date())}</div>
        </div>
      </div>

      <TodayAgenda onOpen={goAgenda} />

      {failed && (
        <div className="alert a-clay" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="ttl">חלק מהנתונים לא נטענו</div>
            <div className="bd">מה שמוצג עלול להיות חלקי. בדקו חיבור ורעננו.</div>
          </div>
        </div>
      )}

      {/* ---------- מספרי היום ---------- */}
      <div className="stat-grid">
        {statTiles.map((t) => (
          /* ⚠ הגוון הוא של התחום ולא של המצב. אדום נשמר למספר
             עצמו כשמשהו דורש טיפול — אילו גם האריח היה מאדים,
             מסך עם שתי בעיות היה נראה כמו אזעקה. */
          <button key={t.key} className={`stat-tile ${t.cls} ${t.tone || ""}`} onClick={t.go}>
            <span className="tile sm">{t.ico}</span>
            <span className="sv num">{t.v}</span>
            <span className="sl">{t.l}</span>
            <span className="ss">{t.s}</span>
          </button>
        ))}
      </div>

      {/* ---------- לוח השיעורים ----------
          ⚠ אחראי הלו״ז נכנס למסך הבית כדי לדעת מה עליו היום.
            הלוח כאן, ולא רק בתוך השיעורים, כי מה שטרם דווח
            נשכח בדיוק כשלא רואים אותו. */}
      <div className="sec-label">לוח השיעורים</div>
      <LessonsBoard compact onAll={() => goLessons("board")}
        onOpenSheet={() => goLessons("board")} />

      {/* ---------- דורש טיפול ---------- */}
      {attn.length > 0 ? (
        <>
          <div className="sec-label">דורש טיפול</div>
          <div className="attn">
            {attn.map((a) => (
              <button key={a.key} className={"attn-row " + a.cls} onClick={a.go}>
                <div style={{ flex: 1 }}>
                  <div className="attn-t">{a.t}</div>
                  {a.s && <div className="attn-s">{a.s}</div>}
                </div>
                <I.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="attn-calm">
          <b>הכול מסודר</b>
          <span>אין דבר שממתין להחלטה או לטיפול</span>
        </div>
      )}

      {/* ---------- הלו״ז הקרוב ---------- */}
      {upcoming.length > 0 && (
        <>
          <div className="sec-label">בלו״ז השנתי</div>
          <div className="gantt-strip">
            {upcoming.map((e, i) => (
              <button key={i} className={"gantt-chip" + (e.start <= iso ? " now" : "")}
                onClick={goGantt}>
                {e.start <= iso ? `עכשיו · ${e.name}` : e.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ---------- ניווט מהיר ---------- */}
      <div className="sec-label">כל המערכת</div>
      <div className="navgrid">
        {navTiles.map((t) => (
          <button key={t.key} className={"nav-tile " + (t.tone || "")} onClick={t.go}>
            <span className="nav-ico">{t.icon}</span>
            <b>{t.l}</b>
            {t.key === "n-students" && pendingList.length > 0 && (
              <span className="nav-badge num">{pendingList.length}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/* ⚠ כאן היה בורר משתמשים: רשימת שמות שכל לחיצה עליה "החליפה
   זהות". מרגע שהאכיפה עברה לשרת הוא לא החליף דבר. הוסר.

   הזהות מגיעה מהסשן. תורן יכול להחליף את השם שבחר; מנהל לא —
   שמו נקבע לפי הקוד האישי שאיתו נכנס. */
function UserModal({ auth, say, onSignedOut, close }) {
  const [out, setOut] = useState(false);
  const [picking, setPicking] = useState(false);
  const [roster, setRoster] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const signOut = () => {
    if (out) return;
    setOut(true);
    api.logout().finally(() => onSignedOut());
  };

  const openPicker = () => {
    setErr(null);
    api.me()
      .then((m) => { setRoster(m.roster || []); setPicking(true); })
      .catch((e) => setErr(e.message));
  };

  const choose = (name) => {
    if (busy) return;
    setBusy(true); setErr(null);
    api.setMyName(name)
      .then(() => { say("השם עודכן ל" + name); close(); window.location.reload(); })
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="scrim" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h3>הזהות שלי</h3><button onClick={close}><I.x /></button></div>
        <div className="sheet-b">
          <div className="card" style={{ marginBottom: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 700, marginBottom: 3 }}>
              {auth?.isManager ? "מנהל" : "תורן"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-.3px" }}>
              {auth?.name || "תורן"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>
              {auth?.isManager
                ? "השם נקבע לפי הקוד האישי שאיתו נכנסת."
                : "השם משמש לתיעוד הדיווחים. אפשר להחליף אותו."}
            </div>
          </div>

          {err && <div className="login-err" style={{ marginBottom: 12 }}>{err}</div>}

          {!auth?.isManager && !picking && (
            <button className="btn btn-ghost" style={{ marginBottom: 9 }} onClick={openPicker}>
              שינוי שם
            </button>
          )}

          {picking && (
            <>
              <div className="sec-label" style={{ marginTop: 0 }}>בחרו שם</div>
              <div className="login-roster" style={{ marginBottom: 14 }}>
                {roster.map((r) => (
                  <button key={r.id} className="login-name" disabled={busy}
                    onClick={() => choose(r.name)}>
                    {r.name}
                    {r.name === auth?.name && <span style={{ color: "var(--ok)", marginRight: 8 }}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          <button className="btn btn-ghost" disabled={out} onClick={signOut}>
            {out ? "מתנתק…" : "התנתקות"}
          </button>
        </div>
      </div>
    </div>
  );
}
