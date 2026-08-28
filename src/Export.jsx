/* ============================================================
   ייצוא לגיליונות Google
   ------------------------------------------------------------
   ⚠ **הגיליון נוצר על ידי המנהל ולא על ידינו.** חשבון שירות
     אינו אדם ואין לו דרייב שאפשר לפתוח; קובץ שהוא ייצור לא
     יופיע לאיש. לכן המסך מסביר את שלושת השלבים ומבקש קישור.

     יתרון שלא תוכנן: הקישור **יציב**. הדוח מתרענן לתוך אותו
     קובץ, ומי ששמר אותו או שלח אותו בוואטסאפ ממשיך לראות
     נתונים עדכניים.

   ⚠ **הכתובת נשמרת בדפדפן ולא בשרת.** היא אינה סוד — מי שאין
     לו גישה לגיליון לא ייכנס אליו גם עם הקישור — והיא נשמרת
     רק כדי שלא יצטרכו להדביק אותה בכל פעם.

   ⚠ **"טרם הוגדר" אינו תקלה.** מערכת בלי חיבור לגוגל עובדת
     במלואה; המסך מסביר מה חסר במקום להציג באנר אדום.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";

const XI = {
  sheet: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>,
  out: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>,
  copy: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

const KEY = "mechina-export-url";

export default function ExportPage({ say }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(null);   /* kind שרץ עכשיו */
  const [done, setDone] = useState(null);
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try { setUrl(localStorage.getItem(KEY) || ""); } catch { /* חלון פרטי */ }
    api.getExportStatus().then(setSt).catch((e) => setErr(e.message));
  }, []);

  /* ⚠ בדיקה לפני כתיבה. כתיבה שנכשלת אחרי שהמנהל כבר לחץ
     "ייצוא" משאירה אותו בלי לדעת אם הבעיה בקישור, בשיתוף או
     בקובץ — שלוש בעיות עם אותה הודעה מגוגל. */
  const probe = () => {
    if (checking || !url.trim()) return;
    setChecking(true); setCheck(null);
    api.checkSheet(url.trim())
      .then((d) => setCheck(d.check || null))
      .catch((e) => say(e.message))
      .finally(() => setChecking(false));
  };

  const run = (kind) => {
    if (busy) return;
    if (!url.trim()) { say("צריך קישור לגיליון"); return; }
    setBusy(kind); setDone(null);
    try { localStorage.setItem(KEY, url.trim()); } catch { /* חלון פרטי */ }
    api.exportToSheet({ kind, url: url.trim() })
      .then((d) => { setDone(d); say("הדוח נכתב לגיליון"); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  if (err) {
    return (
      <>
        <div className="screen-title">ייצוא לגיליונות</div>
        <div className="alert a-clay"><XI.warn />
          <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
        </div>
      </>
    );
  }
  if (!st) return <><div className="screen-title">ייצוא לגיליונות</div><div className="skel skel-card" /></>;

  return (
    <>
      <div className="screen-title">ייצוא לגיליונות</div>

      {/* ---------- טרם הוגדר ----------
          ⚠ מסך הסבר ולא שגיאה. אין כאן שום דבר שבור. */}
      {!st.ready ? (
        <div className="card lift">
          <div className="sec-label" style={{ marginTop: 0 }}>החיבור טרם הוגדר</div>
          <div className="login-lead">
            כדי שהמערכת תוכל לכתוב לגיליונות Google, צריך פעם אחת ליצור
            חשבון שירות ולהזין את המפתח שלו במשתני הסביבה
            (<span className="num">GOOGLE_SA_KEY</span>).
          </div>
          <div className="pf-note">{st.hint}</div>
        </div>
      ) : (
        <>
          {/* ---------- ההוראות ---------- */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="steps">
              <div className="step-row done">
                <div className="step-n">1</div>
                <div className="step-b">
                  <div className="step-t">פותחים גיליון ריק ב-Google Sheets</div>
                  <div className="step-s">אחד לכל דוח, או אחד שמשמש את כולם</div>
                </div>
              </div>
              <div className="step-row on">
                <div className="step-n">2</div>
                <div className="step-b">
                  <div className="step-t">משתפים אותו עם הכתובת הזו, בהרשאת עריכה</div>
                  {/* ⚠ הכתובת בשורה משלה וניתנת להעתקה. מי שיקליד
                      אותה ביד יטעה, וההודעה שיקבל תהיה "הגיליון
                      לא שותף" בלי לומר במה. */}
                  <div className="acct">
                    <span className="num">{st.account}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      navigator.clipboard?.writeText(st.account)
                        .then(() => say("הועתק"))
                        .catch(() => say("לא הצלחתי להעתיק — סמנו ידנית"));
                    }}><XI.copy />העתקה</button>
                  </div>
                </div>
              </div>
              <div className="step-row">
                <div className="step-n">3</div>
                <div className="step-b">
                  <div className="step-t">מדביקים כאן את הכתובת מסרגל הכתובות</div>
                  <div className="step-s">הקישור נשמר, והדוח מתרענן לתוך אותו קובץ</div>
                </div>
              </div>
            </div>

            <div className="fld" style={{ marginTop: 4 }}>
              <label htmlFor="xu">קישור לגיליון</label>
              <input id="xu" value={url} dir="ltr" disabled={Boolean(busy)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                onChange={(e) => { setUrl(e.target.value); setCheck(null); }} />
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: "100%" }}
              disabled={checking || !url.trim()} onClick={probe}>
              {checking ? "בודק…" : "בדיקת הקישור"}
            </button>

            {check && (check.ok ? (
              <div className="alert a-ok" style={{ marginTop: 10, marginBottom: 0 }}>
                <div style={{ flex: 1 }}>
                  <div className="ttl">הגיליון נגיש — "{check.title}"</div>
                  <div className="bd">{check.tabs.length} לשוניות: {
                    check.tabs.slice(0, 6).map((t) => t.title).join(" · ")
                  }{check.tabs.length > 6 ? " …" : ""}</div>
                </div>
              </div>
            ) : (
              /* ⚠ הסיבה **ומה עושים איתה**. "אין גישה" לבדו
                  משאיר את המנהל לנחש בין ארבע אפשרויות. */
              <div className="alert a-amber" style={{ marginTop: 10, marginBottom: 0 }}>
                <XI.warn />
                <div style={{ flex: 1 }}>
                  <div className="ttl">{check.why}</div>
                  <div className="bd">{check.fix}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ---------- הדוחות ---------- */}
          <div className="sec-label">מה לייצא</div>
          <div className="rows" style={{ marginBottom: 14 }}>
            {st.kinds.map((k) => (
              <div className="st-row" key={k.kind} style={{ cursor: "default" }}>
                <div className="tile"><XI.sheet /></div>
                <div className="st-main">
                  <div className="st-n">{k.title}</div>
                  <div className="st-m"><span>נכתב לגיליון שנבחר למעלה</span></div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ width: "auto", padding: "0 16px" }}
                  disabled={Boolean(busy) || !url.trim()}
                  onClick={() => run(k.kind)}>
                  {busy === k.kind ? "כותב…" : "ייצוא"}
                </button>
              </div>
            ))}
          </div>

          {done && (
            <div className="alert a-ok">
              <div style={{ flex: 1 }}>
                <div className="ttl">נכתבו {done.tabs} לשוניות</div>
                <div className="bd">
                  <a href={done.url} target="_blank" rel="noreferrer" className="link-inline">
                    פתיחת הגיליון <XI.out />
                  </a>
                </div>
                {/* ⚠ מדווח מה **לא** נגענו בו. לשונית ישנה של נושא
                    שהוסר נשארת בקובץ, ומי שלא יידע עליה יקרא
                    נתונים מתים. */}
                {done.extra && (
                  <div className="bd" style={{ marginTop: 6 }}>
                    ⚠ נשארו בקובץ לשוניות שאינן חלק מהדוח ולא נגענו בהן:{" "}
                    {done.extra.join(" · ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}
