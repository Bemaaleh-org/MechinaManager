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
import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { LEVELS, subjectKey, parseSubject, SUBJECT } from "../shared/access-rules.js";
import { roleAccess, STAFF_KINDS, RULES } from "../shared/access-map.js";
import { ROLE_INFO } from "./roles-info.js";

const AI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  ok: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  no: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
};

/* ============================================================
   התאמה ידנית — מה שראש המכינה סוגר
   ------------------------------------------------------------
   הבקשה: *"שלכל אחד יש את כל דפי המכינה ומנהל המכינה בוחר איזה
   הרשאות לתת לו, בכלל לא, צפייה, עריכה, אפשר לתת גם לתפקיד
   ספציפי וגם לכל משתמש."*

   ⚠⚠⚠ **וזה נאמר במסך, לא רק בקוד: ההתאמה רק מצמצמת.**
     "מלא" אינה פותחת מסך שהמערכת סוגרת — היא רק מבטלת את
     ההתאמה. מסך שיבטיח יותר מזה הוא בדיוק "מסך שמשקר על
     אבטחה" שהכלל של המסך הזה נועד למנוע (5ד).

   ⚠ **רשימת המסכים נגזרת מהשרת** (`allScreens`), שנגזרת
     מהרשימות הסטטיות ומ-`DUTIES`. מסך שיתווסף מופיע כאן
     מעצמו — ואם היינו כותבים אותו כאן, זו הייתה רשימה
     שנייה (4מד).

   ⚠ **וההשהיה נאמרת.** הכללים נטענים עם מטמון של חמש דקות,
     ושינוי שאינו נכנס מיד נראה כמו כפתור שלא עבד.
   ============================================================ */
function CustomAccess({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [n, setN] = useState(0);
  const [kind, setKind] = useState(SUBJECT.role);
  const [who, setWho] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let live = true;
    api.getAccessRules()
      .then((r) => { if (live) { setD(r); setErr(null); } })
      .catch((e) => { if (live) setErr(e); });
    return () => { live = false; };
  }, [n]);

  if (err) return (
    <div className={"alert " + (err.setupRequired ? "a-amber" : "a-clay")}>
      <AI.no />
      <div style={{ flex: 1 }}>
        <div className="ttl">{err.setupRequired ? "הלוח טרם הוקם" : "לא הצלחנו לטעון"}</div>
        <div className="bd">{err.message}</div>
      </div>
    </div>
  );
  if (!d) return <div className="skel skel-card" />;

  /* ⚠ **הבוררים מגיעים מהשרת**, מאותה תשובה — שאילתה נוספת
     במסך היא רשימה שנייה שעלולה להיפרד מזו שהשרת מאמת
     מולה (4מד), והיא גם קריאה נוספת בכל פתיחת לשונית (4צ). */
  const roles = d.roles || [];
  const students = d.people || [];

  const subject = kind === SUBJECT.kind ? subjectKey(SUBJECT.kind, who)
    : who ? subjectKey(kind, who) : "";

  const nameOf = (key) => {
    const p = parseSubject(key);
    if (!p) return key;
    if (p.kind === SUBJECT.kind) return p.id === "staff" ? "כל הצוות" : "כל החניכים";
    if (p.kind === SUBJECT.role) return p.id;
    const st = students.find((r) => String(r.id) === p.id);
    /* ⚠ השם נגזר מהמזהה ואינו נשמר — שם שמור אינו מתעדכן
       כשחניך משנה שם (5ח). */
    return st ? st.name : "חניך " + p.id;
  };

  const set = (screen, level) => {
    if (!subject) { say("בחרו קודם למי"); return; }
    setBusy(screen);
    api.setAccessRule({ subject, screen, level })
      .then(() => { setN((x) => x + 1); say("נשמר"); })
      .catch((e) => say(e.message || "השמירה נכשלה"))
      .finally(() => setBusy(""));
  };

  const current = (screen) => {
    const hit = (d.rules || []).find((r) => r.subject === subject && r.screen === screen);
    return hit ? hit.level : "edit";
  };

  const shown = (d.screens || []).filter((s) =>
    !q.trim() || s.label.includes(q.trim()) || s.tab.includes(q.trim()));

  const mine = (d.rules || []).filter((r) => !subject || r.subject === subject);

  return (
    <>
      {/* ⚠ **מה שלא נטען נאמר** — בורר ריק בלי מילה נראה כמו
          מכינה בלי תפקידים (4מא). */}
      {(d.partial || []).length > 0 && (
        <div className="note-warn">
          לא נטענו: {d.partial.join(" · ")}. הבורר שלהם יופיע ריק.
        </div>
      )}

      <div className="ac-note">
        כאן ראש המכינה <b>סוגר</b> מסכים — לתפקיד שלם או לאדם אחד.
        ⚠ <b>ההתאמה רק מצמצמת</b>: "מלא" אינה פותחת מסך שהמערכת סוגרת ממילא,
        היא רק מבטלת את הסגירה. הרשאה שאין בקוד לא נפתחת משורה בלוח.
        {" "}שינוי נכנס לתוקף תוך {d.cacheMinutes || 5} דקות.
      </div>

      {/* ---------- למי ---------- */}
      <div className="card cx-who">
        <div className="cx-h">למי</div>
        <div className="seg cx-seg">
          <button className={kind === SUBJECT.role ? "on" : ""}
            onClick={() => { setKind(SUBJECT.role); setWho(""); }}>תפקיד</button>
          <button className={kind === SUBJECT.user ? "on" : ""}
            onClick={() => { setKind(SUBJECT.user); setWho(""); }}>אדם</button>
          <button className={kind === SUBJECT.kind ? "on" : ""}
            onClick={() => { setKind(SUBJECT.kind); setWho("student"); }}>קבוצה</button>
        </div>

        {kind === SUBJECT.kind ? (
          <select className="in" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="student">כל החניכים</option>
            <option value="staff">כל הצוות</option>
          </select>
        ) : kind === SUBJECT.role ? (
          <select className="in" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">בחרו תפקיד…</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <select className="in" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">בחרו חניך…</option>
            {students.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
        {!roles.length && kind === SUBJECT.role && (
          <div className="cx-why">לא נמצאו תפקידים בלוח החניכים.</div>
        )}
      </div>

      {/* ---------- ההתאמות הקיימות ---------- */}
      {mine.length > 0 && (
        <>
          <div className="sec-label">
            התאמות קיימות
            <span className="sec-more">{mine.length}</span>
          </div>
          <div className="card cx-list">
            {mine.map((r) => (
              <div className="cx-r" key={r.id}>
                <span className="cx-n">
                  {nameOf(r.subject)}
                  <i> · {(d.screens || []).find((s) => s.tab === r.screen)?.label || r.screen}</i>
                </span>
                <span className={"pill " + (r.level === "none" ? "p-bad" : "p-new")}>
                  {(d.levels || []).find((l) => l.key === r.level)?.label || r.level}
                </span>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
                  onClick={() => {
                    setBusy(r.id);
                    api.deleteAccessRule(r.id)
                      .then(() => { setN((x) => x + 1); say("ההתאמה הוסרה"); })
                      .catch((e) => say(e.message))
                      .finally(() => setBusy(""));
                  }} disabled={busy === r.id}>הסרה</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------- המסכים ---------- */}
      {!subject ? (
        <div className="cx-why" style={{ textAlign: "center", padding: "18px 0" }}>
          בחרו למי, והמסכים יופיעו כאן.
        </div>
      ) : (
        <>
          <div className="sec-label">
            כל דפי המכינה
            <span className="sec-more">{shown.length}</span>
          </div>
          <input className="in" placeholder="חיפוש מסך…" value={q}
            onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 9 }} />
          <div className="card cx-list">
            {shown.map((s) => {
              const cur = current(s.tab);
              return (
                <div className="cx-r cx-sc" key={s.tab}>
                  <span className="cx-n">
                    {s.label}
                    {/* ⚠ **מסך בלי פעולה משלו נאמר.** חסימה שלו מסתירה
                        אותו מהניווט ואינה חוסמת מסלול — והצהרה שאינה
                        מדויקת גרועה מהיעדר הצהרה (5ד). */}
                    {!s.api && <i> · הסתרה בלבד</i>}
                  </span>
                  <div className="cx-lv">
                    {LEVELS.map((l) => (
                      <button key={l} className={cur === l ? "on" : ""}
                        disabled={busy === s.tab}
                        onClick={() => set(s.tab, l)}>
                        {(d.levels || []).find((x) => x.key === l)?.label || l}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default function Access({ isHead = false, say }) {
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
        {/* ⚠ **ללא ראש מכינה אין לשונית.** השרת מחזיר 403 על
            `?action=access`, ולשונית שנפתחת לשגיאה היא 4יד. */}
        {isHead && (
          <button className={tab === "custom" ? "on" : ""} onClick={() => setTab("custom")}>
            התאמה ידנית
          </button>
        )}
      </div>

      {tab === "custom" && isHead && <CustomAccess say={say} />}

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
