/* ============================================================
   מסך כניסה
   ------------------------------------------------------------
   שם משתמש וסיסמה — מסלול אחד לכולם.

   ⚠ **דלת אחת בלבד.** קודם היה לצוות מסך נפרד מאחורי קישור
     "כניסת צוות עם קוד", וזו הייתה טעות אמיתית: מי שנכנס פעם
     אחת עם קוד לא ידע מה להקליד בפעם הבאה, כי המסך שראה
     בכניסה הראשונה לא היה המסך הרגיל. מסך כניסה שמלמד דבר
     אחד ודורש דבר אחר הוא מסך שבור.

   ⚠ **כניסה ראשונה — הסוד שבלוח בשני השדות.** חניך מקליד את
     תעודת הזהות פעמיים; איש צוות מקליד את הקוד פעמיים. מיד
     אחריה נבחרים שם משתמש, סיסמה ואימייל קבועים. הדלת נפתחת
     פעם אחת עם משהו שאינו סוד, ונסגרת מיד.

   ⚠ הסיסמה נשלחת בגוף הבקשה ואינה נשמרת בשום מקום בדפדפן.
     השרת מחזיר עוגייה חתומה (HttpOnly) שגם JavaScript לא קורא.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";

const LI = {
  eye: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.7"/></svg>,
  eyeOff: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4l16 16"/><path d="M9.6 6.1A9.6 9.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1M6.4 8.2A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1 0 1.9-.1 2.7-.4"/></svg>,
  back: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 5l7 7-7 7"/></svg>,
};

/** שדה סיסמה עם כפתור הצגה */
function Secret({ id, label, value, onChange, disabled, hint, autoFocus, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} type={show ? "text" : "password"} value={value}
          disabled={disabled} autoFocus={autoFocus} autoComplete={autoComplete || "current-password"}
          onChange={(e) => onChange(e.target.value)} />
        {/* ⚠ הצגת הסיסמה היא בקשה נפוצה ולגיטימית: מי שמקליד
            סיסמה ארוכה בטלפון טועה, ומי שרואה אותה טועה פחות. */}
        <button type="button" className="pw-eye" tabIndex={-1}
          aria-label={show ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          onClick={() => setShow((v) => !v)}>
          {show ? <LI.eyeOff /> : <LI.eye />}
        </button>
      </div>
      {hint && <div className="fld-hint">{hint}</div>}
    </div>
  );
}

export default function Login({ notice, onDone }) {
  /* signin · forgot · enter · reset */
  const [view, setView] = useState("signin");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  /* ⚠ הקוד מהמייל, אחרי שאומת. נשמר כדי שלא יידרש להקליד
     אותו שוב במסך הסיסמה. */
  const [okCode, setOkCode] = useState(null);
  const [codeName, setCodeName] = useState(null);

  const go = (v) => { if (!busy) { setView(v); setErr(null); setMsg(null); } };

  const run = (p, after) => {
    setBusy(true); setErr(null); setMsg(null);
    p.then(after).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  };

  const doSignin = (e) => {
    e.preventDefault();
    if (busy || !user.trim() || !password) return;
    run(api.signin(user.trim(), password), () => { setPassword(""); onDone(); });
  };

  const doForgot = (e) => {
    e.preventDefault();
    if (busy || !user.trim()) return;
    run(api.forgot(user.trim()), (d) => { setMsg(d.message); setView("enter"); });
  };

  /* ⚠ הקוד נבדק לפני שמציגים שדות סיסמה. מי שהקליד קוד שגוי
     אמור לדעת מיד, ולא אחרי שכבר בחר סיסמה. */
  const doCheckCode = (e) => {
    e.preventDefault();
    const c = code.trim();
    if (busy || c.length < 6) return;
    run(api.checkReset(user.trim(), c), (d) => {
      setOkCode(c); setCodeName(d.name || null); setView("reset");
    });
  };

  const doReset = (e) => {
    e.preventDefault();
    if (busy || !password || password !== password2) return;
    run(api.resetPassword(user.trim(), okCode, password), () => {
      setPassword(""); setPassword2(""); setCode(""); setOkCode(null);
      setMsg("הסיסמה הוחלפה. אפשר להיכנס.");
      setView("signin");
    });
  };

  return (
    <div className="kx kx-login">
      <main className="wrap">
        <img className="login-mark" src="/logo-mark.png" alt="במעלה הדרך" />
        <div className="login-title">מכינת ניר עוז</div>
        <div className="login-sub">מערכת הניהול</div>

        {notice && (
          <div className="alert a-amber">
            <div style={{ flex: 1 }}><div className="bd" style={{ marginTop: 0 }}>{notice}</div></div>
          </div>
        )}
        {err && (
          <div className="alert a-clay">
            <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
          </div>
        )}
        {msg && view === "signin" && (
          <div className="alert a-ok">
            <div style={{ flex: 1 }}><div className="ttl">{msg}</div></div>
          </div>
        )}

        {/* ============ כניסה ============ */}
        {view === "signin" && (
          <form className="card lift" onSubmit={doSignin}>
            <div className="fld">
              <label htmlFor="u">שם משתמש או אימייל</label>
              <input id="u" type="text" autoComplete="username" autoFocus
                value={user} disabled={busy}
                onChange={(e) => setUser(e.target.value)} />

            </div>
            <Secret id="p" label="סיסמה" value={password} onChange={setPassword}
              disabled={busy} />

            {/* ⚠ ההסבר על הכניסה הראשונה כאן ולא בהודעת שגיאה:
                מי שנכנס בפעם הראשונה לא אמור לגלות את הכלל
                אחרי שנכשל.

                ⚠ ושתי השורות מפורשות. "הקוד בשני השדות" לבדו
                  לא אומר לאיש צוות שזו כניסה חד-פעמית, ואחר
                  כך הוא מחפש איפה מקלידים קוד שוב. */}
            <div className="login-note">
              <b>כניסה ראשונה?</b>
              <span>חניך — תעודת הזהות בשני השדות</span>
              <span>צוות — קוד הכניסה בשני השדות</span>
              <span className="dim">מיד אחר כך בוחרים שם משתמש, סיסמה ואימייל קבועים.</span>
            </div>

            <button className="btn btn-primary" type="submit"
              disabled={busy || !user.trim() || !password}>
              {busy ? "בודק…" : "כניסה"}
            </button>

            <button type="button" className="link-btn" disabled={busy}
              onClick={() => go("forgot")}>שכחתי סיסמה</button>
          </form>
        )}

        {/* ============ שכחתי ============ */}
        {view === "forgot" && (
          <form className="card lift" onSubmit={doForgot}>
            <div className="login-lead">
              מזינים שם משתמש או אימייל, ואנחנו שולחים קוד בן שש ספרות לתיבה
              הרשומה. הקוד בתוקף לשעה.
            </div>
            <div className="fld">
              <label htmlFor="fu">שם משתמש או אימייל</label>
              <input id="fu" type="text" autoFocus value={user} disabled={busy}
                onChange={(e) => setUser(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !user.trim()}>
              {busy ? "שולח…" : "שליחת קוד למייל"}
            </button>
            <button type="button" className="link-btn" disabled={busy}
              onClick={() => go("signin")}>חזרה לכניסה</button>
          </form>
        )}

        {/* ============ הזנת הקוד ============ */}
        {view === "enter" && (
          <form className="card lift" onSubmit={doCheckCode}>
            <div className="login-done" style={{ paddingBottom: 10 }}>
              <div className="ld-mark">✉</div>
              <b>הקוד נשלח</b>
              <span>{msg}</span>
            </div>
            <div className="fld">
              <label htmlFor="cd">הקוד מהמייל</label>
              {/* ⚠ inputMode numeric פותח מקלדת ספרות בטלפון,
                  ו-dir=ltr כדי שהספרות לא יתהפכו בעברית. */}
              <input id="cd" autoFocus value={code} disabled={busy}
                inputMode="numeric" maxLength={6} dir="ltr"
                className="code-in" placeholder={"–".repeat(6)}
                autoComplete="one-time-code"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            <button className="btn btn-primary" type="submit"
              disabled={busy || code.trim().length < 6}>
              {busy ? "בודק…" : "המשך"}
            </button>
            <button type="button" className="link-btn" disabled={busy}
              onClick={() => { setCode(""); go("forgot"); }}>
              לא הגיע? שליחה מחדש
            </button>
          </form>
        )}

        {/* ============ סיסמה חדשה ואישורה ============ */}
        {view === "reset" && (
          <form className="card lift" onSubmit={doReset}>
            <div className="login-lead">
              {codeName ? `שלום ${codeName.split(" ")[0]}, ` : ""}הקוד אומת. בחרו סיסמה חדשה.
            </div>
            <Secret id="np" label="סיסמה חדשה" value={password} onChange={setPassword}
              disabled={busy} autoFocus autoComplete="new-password"
              hint="לפחות שמונה תווים" />
            <Secret id="np2" label="שוב, לוודא" value={password2} onChange={setPassword2}
              disabled={busy} autoComplete="new-password" />
            {password2 && password !== password2 && (
              <div className="fld-bad" style={{ marginTop: -8, marginBottom: 12 }}>
                הסיסמאות אינן זהות
              </div>
            )}
            <button className="btn btn-primary" type="submit"
              disabled={busy || !password || password !== password2}>
              {busy ? "שומר…" : "קביעת הסיסמה"}
            </button>
          </form>
        )}

      </main>
      <div className="login-foot">במעלה הדרך · מכינת ניר עוז</div>
    </div>
  );
}
