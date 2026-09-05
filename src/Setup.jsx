/* ============================================================
   כניסה ראשונה — בחירת שם משתמש וסיסמה
   ------------------------------------------------------------
   ⚠ המסך הזה אינו ניתן לדילוג, והשרת הוא זה שאוכף: סשן במצב
     `setup` חסום בכל נקודת קצה חוץ מזו. מסך שמונע ניווט הוא
     הצעה; שרת שחוסם הוא הבטחה.

   ⚠ שלושה שלבים במסילה אחת ולא טופס אחד ארוך. הכניסה הראשונה
     היא הרגע שבו הכי קל לוותר, והמסילה אומרת כמה נשאר.

   ⚠ האימייל **חובה**. בלעדיו איפוס סיסמה דורש שאיש צוות יהיה
     זמין למסור קוד ביד — וזה בדיוק הרגע שבו אף אחד לא זמין.
     כתובת אחת בהתחלה חוסכת את זה לכל השנה.
   ============================================================ */

import React, { useState } from "react";
import { BRAND } from "./brand.js";
import { api } from "./api.js";

const SI = {
  eye: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.7"/></svg>,
  eyeOff: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4l16 16"/><path d="M9.6 6.1A9.6 9.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1M6.4 8.2A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1 0 1.9-.1 2.7-.4"/></svg>,
};

/** חוזק הסיסמה — ⚠ מדד עזר, לא שער. השער בשרת. */
function strength(p) {
  if (!p) return { n: 0, t: "", cls: "" };
  let n = 0;
  if (p.length >= 8) n++;
  if (p.length >= 12) n++;
  if (/[a-zA-Z]/.test(p) && /\d/.test(p)) n++;
  if (/[^\w\s]/.test(p) || /[֐-׿]/.test(p)) n++;
  const t = ["קצרה מדי", "בסדר", "טובה", "חזקה", "חזקה מאוד"][n];
  return { n, t, cls: n <= 1 ? "weak" : n === 2 ? "mid" : "good" };
}

export default function Setup({ name, onDone, onSignOut }) {
  const [step, setStep] = useState(0);
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [email, setEmail] = useState("");
  /* ⚠ ולידציה מקלה בכוונה. השרת בודק אותו דבר, וטופס שדוחה
     כתובת תקינה בגלל תבנית קפדנית מדי גרוע מטופס שמקבל
     כתובת שגויה — את השנייה אפשר לתקן. */
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const first = String(name || "").split(" ")[0];
  const st = strength(pw);
  const match = pw && pw === pw2;

  const save = () => {
    if (busy || !user.trim() || !match) return;
    setBusy(true); setErr(null);
    api.saveAccount({ user: user.trim(), password: pw, email: email.trim() })
      .then(() => onDone())
      .catch((e) => {
        setErr(e.message);
        /* ⚠ שגיאה בשם המשתמש מחזירה לשלב שלו ולא משאירה את
           המשתמש בשלב האחרון עם הודעה שאינה שייכת אליו. */
        if (/שם המשתמש|תפוס/.test(e.message)) setStep(0);
        else if (/סיסמה/.test(e.message)) setStep(1);
      })
      .finally(() => setBusy(false));
  };

  const STEPS = [
    { t: "שם משתמש", s: "בשם הזה נכנסים מכאן והלאה" },
    { t: "סיסמה", s: "לפחות שמונה תווים" },
    { t: "אימייל", s: "חובה — לשם יישלח קוד אם תשכחו סיסמה" },
  ];

  return (
    <div className="kx kx-login">
      <main className="wrap">
        <img className={"login-mark" + (BRAND.hasWordmark ? " login-lockup" : "")}
          src={BRAND.lockup} alt={BRAND.motto + " · " + BRAND.name} />
        <div className="login-title">{first ? `שלום ${first}` : "ברוכים הבאים"}</div>
        <div className="login-sub">כניסה ראשונה · בוחרים שם משתמש וסיסמה</div>

        {err && (
          <div className="alert a-clay">
            <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
          </div>
        )}

        <div className="card lift">
          {/* ---------- המסילה ---------- */}
          <div className="steps" style={{ marginBottom: 16 }}>
            {STEPS.map((x, i) => (
              <div className={"step-row " + (i < step ? "done" : i === step ? "on" : "")}
                key={x.t}>
                <div className="step-n">{i < step ? "✓" : i + 1}</div>
                <div className="step-b">
                  <div className="step-t">{x.t}</div>
                  <div className="step-s">{x.s}</div>
                </div>
              </div>
            ))}
          </div>

          {step === 0 && (
            <>
              <div className="fld">
                <label htmlFor="su">שם משתמש</label>
                <input id="su" autoFocus value={user} disabled={busy}
                  autoComplete="username"
                  onChange={(e) => setUser(e.target.value)} />
                <div className="fld-hint">אותיות, ספרות, נקודה או קו תחתון · 3–24 תווים</div>
              </div>
              <button className="btn btn-primary" disabled={busy || user.trim().length < 3}
                onClick={() => { setErr(null); setStep(1); }}>המשך</button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="fld">
                <label htmlFor="sp">סיסמה</label>
                <div className="pw">
                  <input id="sp" type={show ? "text" : "password"} autoFocus
                    value={pw} disabled={busy} autoComplete="new-password"
                    onChange={(e) => setPw(e.target.value)} />
                  <button type="button" className="pw-eye" tabIndex={-1}
                    aria-label={show ? "הסתרה" : "הצגה"}
                    onClick={() => setShow((v) => !v)}>
                    {show ? <SI.eyeOff /> : <SI.eye />}
                  </button>
                </div>
                {/* ⚠ המדד אומר מילה ולא רק צובע פס. */}
                {pw && (
                  <div className={"pwm " + st.cls}>
                    <span className="pwm-bar"><i style={{ width: `${(st.n / 4) * 100}%` }} /></span>
                    <span className="pwm-t">{st.t}</span>
                  </div>
                )}
              </div>
              <div className="fld">
                <label htmlFor="sp2">שוב, לוודא</label>
                <input id="sp2" type={show ? "text" : "password"} value={pw2}
                  disabled={busy} autoComplete="new-password"
                  onChange={(e) => setPw2(e.target.value)} />
                {pw2 && !match && <div className="fld-bad">הסיסמאות אינן זהות</div>}
              </div>
              <button className="btn btn-primary" disabled={busy || !match || pw.length < 8}
                onClick={() => { setErr(null); setStep(2); }}>המשך</button>
              <button className="link-btn" disabled={busy}
                onClick={() => setStep(0)}>חזרה</button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="fld">
                <label htmlFor="se">אימייל <b className="req">חובה</b></label>
                <input id="se" type="email" autoFocus value={email} disabled={busy}
                  autoComplete="email" placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)} />
                {email.trim() && !emailOk
                  ? <div className="fld-bad">הכתובת אינה נראית תקינה</div>
                  : <div className="fld-hint">
                      ⚠ בלי אימייל אי אפשר לאפס סיסמה. לכאן יישלח קוד
                      אם תשכחו אותה — וזה השימוש היחיד שלו.
                    </div>}
              </div>
              <button className="btn btn-primary" disabled={busy || !emailOk} onClick={save}>
                {busy ? "שומר…" : "סיום"}
              </button>
              <button className="link-btn" disabled={busy}
                onClick={() => setStep(1)}>חזרה</button>
            </>
          )}
        </div>

        <button type="button" className="login-alt" disabled={busy}
          onClick={onSignOut}>יציאה</button>
      </main>
      <div className="login-foot">במעלה הדרך · מכינת ניר עוז</div>
    </div>
  );
}
