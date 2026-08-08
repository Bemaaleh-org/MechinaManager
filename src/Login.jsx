/* ============================================================
   מסך כניסה
   ------------------------------------------------------------
   שני שלבים: קוד, ואצל חניך גם בחירת שם מהרשימה.

   ⚠ הקוד נשלח לשרת ולא נשמר בשום מקום בדפדפן. השרת מחזיר
     עוגייה חתומה (HttpOnly) שגם JavaScript לא יכול לקרוא.

   עיצוב: המסך עטוף ב-.kx כמו שאר האפליקציה. כל הטוקנים —
   צבעים, גופן, כיווניות — מוגדרים שם, ובלי העטיפה המסך היה
   נראה כמו דף חיצוני. משתמש במחלקות הקיימות בלבד:
   .top .card .fld .btn .rows .alert — בלי ערכים חדשים.
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
    <div className="kx kx-login">
      <header className="top">
        <div className="top-row">
          <div>
            <h1>מטבח המכינה</h1>
            <div className="sub">עמותת במעלה הדרך</div>
          </div>
          <div className="brand-coin" aria-label="במעלה הדרך">
            <img src={LOGO} alt="לוגו במעלה הדרך" />
          </div>
        </div>
      </header>

      <main className="wrap">
        {notice && (
          <div className="alert a-amber">
            <div style={{ flex: 1 }}><div className="bd" style={{ marginTop: 0 }}>{notice}</div></div>
          </div>
        )}

        {step === "code" ? (
          <form className="card" onSubmit={submitCode}>
            <div className="fld" style={{ marginBottom: err ? 11 : 16 }}>
              <label htmlFor="code">קוד כניסה</label>
              <input id="code" type="password" inputMode="text" autoComplete="one-time-code"
                value={code} disabled={busy} autoFocus
                onChange={(e) => setCode(e.target.value)} placeholder="הזינו את הקוד" />
            </div>

            {err && (
              <div className="alert a-clay">
                <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>
              {busy ? "בודק…" : "כניסה"}
            </button>

            <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600,
                          lineHeight: 1.6, marginTop: 14 }}>
              תורנים נכנסים עם הקוד המשותף. מנהלים — עם הקוד האישי.
            </div>
          </form>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-.2px" }}>מי אתם?</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600,
                            lineHeight: 1.6, marginTop: 6 }}>
                השם משמש לתיעוד הדיווחים. אפשר להחליף אותו בכל עת מתוך האפליקציה.
              </div>
            </div>

            {err && (
              <div className="alert a-clay">
                <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
              </div>
            )}

            <div className="rows">
              {roster.map((r) => (
                <button className="row" key={r.id} disabled={busy}
                  style={{ width: "100%", textAlign: "right" }}
                  onClick={() => pickName(r.name)}>
                  <div className="r-main"><div className="r-name">{r.name}</div></div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
