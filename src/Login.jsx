/* ============================================================
   מסך כניסה
   ------------------------------------------------------------
   שני שלבים: קוד, ואצל חניך גם בחירת שם מהרשימה.

   ⚠ הקוד נשלח לשרת ולא נשמר בשום מקום בדפדפן. השרת מחזיר
     עוגייה חתומה (HttpOnly) שגם JavaScript לא יכול לקרוא.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { LOGO } from "./logo.js";

export default function Login({ notice, onDone }) {
  const [step, setStep] = useState("code"); // code | name
  const [code, setCode] = useState("");
  const [roster, setRoster] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submitCode = (e) => {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true); setErr(null);
    api.login(code.trim())
      .then((r) => {
        setCode(""); // לא משאירים את הקוד בזיכרון המסך
        if (r.needsName) { setRoster(r.roster || []); setStep("name"); }
        else onDone();
      })
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  const pickName = (name) => {
    if (busy) return;
    setBusy(true); setErr(null);
    api.setMyName(name)
      .then(() => onDone())
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="login">
      <div className="login-box">
        <img className="login-logo" src={LOGO} alt="במעלה הדרך" />
        <h1 className="login-h">מטבח המכינה</h1>

        {notice && <div className="login-notice">{notice}</div>}

        {step === "code" ? (
          <form onSubmit={submitCode}>
            <label className="login-lbl" htmlFor="code">קוד כניסה</label>
            <input id="code" className="login-input" type="password" inputMode="text"
              autoComplete="one-time-code" value={code} disabled={busy}
              onChange={(e) => setCode(e.target.value)} placeholder="הזינו את הקוד" autoFocus />
            {err && <div className="login-err">{err}</div>}
            <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>
              {busy ? "בודק…" : "כניסה"}
            </button>
            <div className="login-hint">
              תורנים נכנסים עם הקוד המשותף. מנהלים — עם הקוד האישי.
            </div>
          </form>
        ) : (
          <>
            <div className="login-lbl">מי אתם?</div>
            <div className="login-hint" style={{ marginTop: 0, marginBottom: 12 }}>
              השם משמש לתיעוד הדיווחים. אפשר להחליף אותו בכל עת מתוך האפליקציה.
            </div>
            {err && <div className="login-err">{err}</div>}
            <div className="login-roster">
              {roster.map((r) => (
                <button key={r.id} className="login-name" disabled={busy}
                  onClick={() => pickName(r.name)}>{r.name}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
