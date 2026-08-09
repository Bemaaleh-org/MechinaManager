/* ============================================================
   מסך כניסה
   ------------------------------------------------------------
   במרכז: הלוגו, שדה הקוד וכפתור הכניסה. שום דבר מעבר.
   אצל חניך מתווסף שלב שני — בחירת שם מרשימת החניכים.

   ⚠ הקוד נשלח לשרת ולא נשמר בשום מקום בדפדפן. השרת מחזיר
     עוגייה חתומה (HttpOnly) שגם JavaScript לא יכול לקרוא.

   הלוגו הוא אייקון ה-PWA — העיגול בלבד, בלי הכיתוב
   "במעלה הדרך", שממילא חוזר בשם האפליקציה.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";

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
      <main className="wrap">
        <img className="login-mark" src="/icon-512.png" alt="במעלה הדרך" />

        {/* הודעות אמיתיות בלבד: קוד שהוחלף, תוקף שפג, הרשאה שכובתה */}
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

        {step === "code" ? (
          <form className="card" onSubmit={submitCode}>
            <div className="fld">
              <label htmlFor="code">קוד כניסה</label>
              <input id="code" type="password" inputMode="text" autoComplete="one-time-code"
                value={code} disabled={busy} autoFocus
                onChange={(e) => setCode(e.target.value)} placeholder="הזינו את הקוד" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>
              {busy ? "בודק…" : "כניסה"}
            </button>
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
