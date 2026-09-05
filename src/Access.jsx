/* ============================================================
   מי רשאי למה — מפת ההרשאות
   ------------------------------------------------------------
   ⚠⚠ **המסך הזה נגזר מהכללים ואינו טבלה שנכתבה ביד.**

   טבלת הרשאות ידנית מתיישנת ביום שמישהו משנה דגל אחד — ואז
   היא לא סתם חסרה, היא **משקרת על אבטחה**. מסך שאומר "מדריך
   אינו עורך תקציב" בזמן שהוא כן, גרוע ממסך שלא קיים.

   המסכים מגיעים מ-`DUTIES`, העריכה מ-`EDIT_AREA`, ושניהם הם
   בדיוק המקורות שהמערכת עובדת לפיהם. תפקיד שיתווסף ל-`DUTIES`
   מופיע כאן מעצמו.

   ⚠ **ומה שאי אפשר לגזור נאמר במפורש.** דגלי `withAuth` פזורים
     בעשרות מודולים ואין להם רשימה אחת, ולכן מה שמוצג עליהם
     מסומן כתמצית ולא כחוזה. הצהרה שגויה גרועה מהיעדר הצהרה.

   ⚠ **צוות בלבד.** זו לא מפת סודות — כל שורה בה גלויה ממילא —
     אבל היא מסך תפעולי של הצוות, ואין לה מה לעשות אצל חניך.
   ============================================================ */
import React, { useState } from "react";
import { roleAccess, STAFF_KINDS, RULES } from "../shared/access-map.js";
import { ROLE_INFO } from "./roles-info.js";

const AI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  ok: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  no: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
};

export default function Access() {
  const [tab, setTab] = useState("staff");
  const roles = roleAccess();

  return (
    <>
      <div className="screen-title">הרשאות</div>
      <div className="ac-note">
        המסך הזה <b>נבנה מהכללים עצמם</b> ולא מטבלה שמישהו כתב: המסכים מגיעים
        מהגדרת התפקידים, והעריכה מכלל ההרשאות שהשרת אוכף. תפקיד שיתווסף —
        יופיע כאן מעצמו.
      </div>

      <div className="seg">
        <button className={tab === "staff" ? "on" : ""} onClick={() => setTab("staff")}>צוות</button>
        <button className={tab === "roles" ? "on" : ""} onClick={() => setTab("roles")}>תפקידי חניכים</button>
        <button className={tab === "rules" ? "on" : ""} onClick={() => setTab("rules")}>גבולות</button>
      </div>

      {tab === "staff" && STAFF_KINDS.map((k) => (
        <div className="card ac-c" key={k.key}>
          <div className="ac-h">
            <b>{k.name}</b>
            <span>{k.from}</span>
          </div>
          {k.note && <div className="ac-note-s">{k.note}</div>}
          <ul className="ac-l">
            {k.can.map((x, i) => <li key={i} className="yes"><AI.ok />{x}</li>)}
            {k.cannot.map((x, i) => <li key={"n" + i} className="no"><AI.no />{x}</li>)}
          </ul>
        </div>
      ))}

      {tab === "roles" && roles.map((r) => (
        <RoleCard key={r.name} r={r} />
      ))}

      {tab === "rules" && (
        <>
          <div className="ac-note">
            כללים שחלים על כולם. כל אחד מהם נובע מהחלטה של המכינה או מבאג
            אמיתי, ולא מנוחות.
          </div>
          {RULES.map((x, i) => (
            <div className="card ac-c" key={i}>
              <div className="ac-h"><b>{x.title}</b><span>{x.ref}</span></div>
              <div className="ac-body">{x.body}</div>
            </div>
          ))}
        </>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}

function RoleCard({ r }) {
  const [open, setOpen] = useState(false);
  /* ⚠ **התיאור של המכינה מוצג בנפרד ומסומן.** הוא מה שהאדם
     *עושה*; המסכים והעריכה הם מה שהמערכת *פותחת לו*. שני
     דברים, וההבחנה חייבת להישאר ברורה (4יא). */
  const info = ROLE_INFO[r.name];

  return (
    <div className="card ac-c">
      <button className="ac-h ac-btn" onClick={() => setOpen(!open)}>
        <b>{r.name}</b>
        <span>{r.derived}</span>
        <AI.chev style={{ transform: open ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
      </button>

      <div className="ac-tags">
        {r.screens.length
          ? r.screens.map((s) => <span key={s} className="pill p-cool">{s}</span>)
          : <span className="pill p-idle">אינו פותח מסך משלו</span>}
        {r.edits.map((e) => <span key={e.key} className="pill p-ok">עורך: {e.who}</span>)}
      </div>

      {open && (
        <div className="ac-open">
          {/* ============================================================
              מרכז התפקיד — כפי שהוא נראה אצל החניך
              ------------------------------------------------------------
              ⚠ **אותו מקור בדיוק** (`DUTIES`): הכותרת, הגוון
                והמסכים הם מה שהחניך רואה במרכז התפקיד שלו. אילו
                נכתבה כאן רשימה שנייה, היא הייתה מתיישנת ביום
                שמישהו מוסיף מסך — ואז המסך הזה משקר על הרשאות,
                וזה בדיוק מה שהוא נבנה כדי למנוע.

              ⚠⚠ **ומה שאינו כאן, אינו כאן בכוונה:** המשימות,
                תיבת ההצפות ומסמך החפיפה **אינם מוצגים לצוות**.
                זו נקודת הקצה היחידה במערכת שבה `isManager` אינו
                מרחיב גישה, וזו הבטחה שניתנה לחניכים (4מה). המסך
                אומר את זה במפורש במקום להשמיט בשקט — השמטה
                שקטה נראית כמו באג, ומישהו "יתקן" אותה.
              ============================================================ */}
          <div className="ac-sub">מרכז התפקיד — מה שנפתח לבעל התפקיד</div>
          <div className={"duty-hero tone-" + (r.tone ?? 1)} style={{ marginBottom: 10 }}>
            <div className="duty-hero-t">
              <div style={{ minWidth: 0 }}>
                <div className="duty-hero-n">{r.name}</div>
                <div className="duty-hero-s">{r.derived}</div>
              </div>
            </div>
          </div>
          {r.screens.length > 0 && (
            <div className={"duty-links tone-" + (r.tone ?? 1)} style={{ marginBottom: 10 }}>
              {r.screens.map((x) => (
                <div className="duty-link" key={x}><span className="ic"><AI.chev /></span>{x}</div>
              ))}
            </div>
          )}
          <div className="ac-body" style={{ color: "var(--muted)", marginBottom: 12 }}>
            המשימות של בעל התפקיד, תיבת ההצפות ומסמך החפיפה שלו <b>אינם
            מוצגים כאן ואינם נגישים לצוות</b> — גם לא לראש המכינה. לצוות יש
            תיבת יוצא (הצפה לתפקיד), לא מעקב.
          </div>

          {/* ⚠ מוצג רק כשיש — כותרת מעל ריק נראית כמו תקלה (4מא). */}
          {info && info.perms && (
            <>
              <div className="ac-sub">מה התפקיד פותח</div>
              <div className="ac-body">{info.perms}</div>
            </>
          )}
          {info && info.desc && (
            <>
              <div className="ac-sub">מה האדם עושה — בנוסח של המכינה</div>
              <div className="ac-body">{info.desc}</div>
            </>
          )}
          {!info && (
            <div className="ac-body" style={{ color: "var(--faint)" }}>
              לתפקיד הזה אין עדיין תיאור. הוא מופיע כאן בכל מקרה — תפקיד
              בלי תיאור אינו נעלם.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
