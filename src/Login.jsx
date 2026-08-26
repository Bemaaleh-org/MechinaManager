/* ============================================================
   מסך כניסה
   ------------------------------------------------------------
   שם משתמש וסיסמה — מסלול אחד לכולם.

   ⚠ **כניסה ראשונה של חניך**: שם המשתמש והסיסמה הם שניהם
     תעודת הזהות, ומיד אחריה הוא בוחר שם וסיסמה קבועים. הדלת
     נפתחת פעם אחת עם משהו שאינו סוד, ונסגרת מיד.

   ⚠ הסיסמה נשלחת בגוף הבקשה ואינה נשמרת בשום מקום בדפדפן.
     השרת מחזיר עוגייה חתומה (HttpOnly) שגם JavaScript לא קורא.

   ⚠ מסלול הקוד של הצוות **נשאר**. המכינה עוברת לשמות משתמש
     בהדרגה, ומי שטרם קיבל אחד לא אמור להיתקע בחוץ. הוא מוסתר
     מאחורי קישור ולא מוצג כאפשרות שווה — ראו את ההערה למטה.
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
  /* signin · forgot · sent · reset · code */
  const [view, setView] = useState("signin");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  /* ---------- קישור איפוס מהמייל ---------- */
  const [token, setToken] = useState(null);
  const [tokenName, setTokenName] = useState(null);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("reset");
    if (!t) return;
    setToken(t); setView("reset");
    api.checkReset(t)
      .then((d) => setTokenName(d.name || null))
      .catch((e) => { setErr(e.message); setView("signin"); setToken(null); });
  }, []);

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
    run(api.forgot(user.trim()), (d) => { setMsg(d.message); setView("sent"); });
  };

  const doReset = (e) => {
    e.preventDefault();
    if (busy || !password) return;
    run(api.resetPassword(token, password), () => {
      setPassword("");
      history.replaceState({}, "", location.pathname);
      setToken(null); setMsg("הסיסמה הוחלפה. אפשר להיכנס."); setView("signin");
    });
  };

  const doCode = (e) => {
    e.preventDefault();
    if (busy || !code.trim()) return;
    run(api.login(code.trim()), () => { setCode(""); onDone(); });
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
              <label htmlFor="u">שם משתמש</label>
              <input id="u" type="text" autoComplete="username" autoFocus
                value={user} disabled={busy}
                onChange={(e) => setUser(e.target.value)} />

            </div>
            <Secret id="p" label="סיסמה" value={password} onChange={setPassword}
              disabled={busy} />

            {/* ⚠ ההסבר על הכניסה הראשונה כאן ולא בהודעת שגיאה:
                חניך שנכנס בפעם הראשונה לא אמור לגלות את הכלל
                אחרי שנכשל. שורה אחת, לא אחת מתחת לכל שדה. */}
            <div className="login-note">
              כניסה ראשונה של חניך — תעודת הזהות בשני השדות
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
              מזינים שם משתמש או אימייל, ואנחנו שולחים דרך לקבוע סיסמה חדשה.
            </div>
            <div className="fld">
              <label htmlFor="fu">שם משתמש או אימייל</label>
              <input id="fu" type="text" autoFocus value={user} disabled={busy}
                onChange={(e) => setUser(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !user.trim()}>
              {busy ? "שולח…" : "שליחת קישור לאיפוס"}
            </button>
            <button type="button" className="link-btn" disabled={busy}
              onClick={() => go("signin")}>חזרה לכניסה</button>
          </form>
        )}

        {/* ============ נשלח ============ */}
        {view === "sent" && (
          <div className="card lift">
            <div className="login-done">
              <div className="ld-mark">✓</div>
              <b>הבקשה נקלטה</b>
              <span>{msg}</span>
            </div>
            <button type="button" className="btn btn-ghost"
              onClick={() => go("signin")}>חזרה לכניסה</button>
          </div>
        )}

        {/* ============ קביעת סיסמה מקישור ============ */}
        {view === "reset" && (
          <form className="card lift" onSubmit={doReset}>
            <div className="login-lead">
              {tokenName ? `שלום ${tokenName.split(" ")[0]}, ` : ""}בחרו סיסמה חדשה.
            </div>
            <Secret id="np" label="סיסמה חדשה" value={password} onChange={setPassword}
              disabled={busy} autoFocus autoComplete="new-password"
              hint="לפחות שמונה תווים" />
            <button className="btn btn-primary" type="submit" disabled={busy || !password}>
              {busy ? "שומר…" : "קביעת הסיסמה"}
            </button>
          </form>
        )}

        {/* ============ קוד צוות ============
            ⚠ נשאר לתקופת המעבר. מוסתר מאחורי קישור ולא מוצג
              כאפשרות שווה, כדי שמי שכבר יש לו שם משתמש לא
              יחזור לקוד מתוך הרגל. */}
        {view === "code" && (
          <form className="card lift" onSubmit={doCode}>
            <div className="login-lead">
              כניסה עם הקוד הישן של הצוות, עד שיינתן שם משתמש.
            </div>
            <Secret id="c" label="קוד כניסה" value={code} onChange={setCode}
              disabled={busy} autoFocus autoComplete="one-time-code" />
            <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>
              {busy ? "בודק…" : "כניסה"}
            </button>
            <button type="button" className="link-btn" disabled={busy}
              onClick={() => go("signin")}>חזרה לכניסה</button>
          </form>
        )}

        {view === "signin" && (
          <button type="button" className="login-alt" disabled={busy}
            onClick={() => go("code")}>כניסת צוות עם קוד</button>
        )}
      </main>
      <div className="login-foot">במעלה הדרך · מכינת ניר עוז</div>
    </div>
  );
}
