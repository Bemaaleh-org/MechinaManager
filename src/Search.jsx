/* ============================================================
   חיפוש רוחבי
   ------------------------------------------------------------
   ⚠⚠ **הפתיחה היא כפתור בסרגל העליון, והתוצאות הן שכבה מעל
     המסך** — לא מסך משלו. חיפוש שדורש לנווט אליו הוא חיפוש
     שאיש לא ישתמש בו, וזו בדיוק הסיבה שהוא מבוקש.

   ⚠ **התוצאה הכי שימושית היא מסך ולא שורה.** רוב החיפושים כאן
     אינם "איפה כתוב X" אלא "איפה המסך של Y", ולכן קבוצת
     "מסך" מגיעה ראשונה מהשרת ובניקוד גבוה.

   ------------------------------------------------------------
   ⚠⚠ **ההשהיה אינה קישוט.** בלעדיה כל הקלדה יוצרת בקשה, וכל
     בקשה נוגעת בשמונה לוחות ב-monday. 250ms הם ההבדל בין
     חיפוש לבין הצפה של ה-API.

   ⚠ **ותשובה שאיחרה נזרקת.** בקשה שיצאה על "תרב" עשויה לחזור
     **אחרי** זו שיצאה על "תרבות", ואז המסך מציג תוצאות של
     מחרוזת שהמשתמש כבר מחק. הבדיקה היא מול המחרוזת הנוכחית,
     ולא מונה בקשות.
   ============================================================ */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api.js";

const SI = {
  find: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>),
  x: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M6 6l12 12M18 6L6 18" /></svg>),
};

export function SearchButton({ onClick }) {
  return (
    <button className="top-ico" onClick={onClick} aria-label="חיפוש">
      <SI.find />
    </button>
  );
}

export default function SearchOverlay({ onClose, onGo }) {
  const [q, setQ] = useState("");
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const latest = useRef("");

  useEffect(() => { if (input.current) input.current.focus(); }, []);

  /* ⚠ Escape סוגר. מי שפתח בטעות צריך דרך לצאת בלי לחפש את X. */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = useCallback((text) => {
    latest.current = text;
    if (text.trim().length < 2) { setD(null); setErr(null); return; }
    setBusy(true);
    api.search(text.trim())
      .then((x) => {
        /* ⚠ תשובה שאיחרה — ראו ההערה בראש. */
        if (latest.current !== text) return;
        setD(x); setErr(null);
      })
      .catch((e) => { if (latest.current === text) setErr(e.message); })
      .finally(() => { if (latest.current === text) setBusy(false); });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 250);
    return () => clearTimeout(t);
  }, [q, run]);

  const go = (r) => { onGo(r.tab); onClose(); };

  return (
    <div className="sr-wrap" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sr-panel">
        <div className="sr-bar">
          <SI.find />
          <input ref={input} value={q} placeholder="חיפוש במערכת"
            onChange={(e) => setQ(e.target.value)} />
          <button className="sr-x" onClick={onClose} aria-label="סגירה"><SI.x /></button>
        </div>

        <div className="sr-body scroll-y">
          {/* ⚠ מצב "קצר מדי" הוא מצב משלו ואינו "אין תוצאות" —
              אחרת מי שהקליד אות אחת חושב שאין במערכת כלום. */}
          {q.trim().length < 2 && (
            <div className="sr-hint">
              אפשר לחפש מסך, שיעור, מודעה, ועדה, פריט ציוד או תקלה.
              <br />לפחות שתי אותיות.
            </div>
          )}

          {err && <div className="banner-bad" style={{ margin: 12 }}>{err}</div>}

          {q.trim().length >= 2 && !err && !d && busy && (
            <div className="sr-hint">מחפש…</div>
          )}

          {d && d.total === 0 && (
            <div className="sr-hint">לא נמצא כלום עבור "{d.q}".</div>
          )}

          {/* ⚠ **רשימה חלקית אומרת שהיא חלקית** (עיקרון 6). */}
          {d && d.partial > 0 && (
            <div className="note-warn" style={{ margin: "10px 12px" }}>
              {d.partial === 1 ? "מקור אחד לא נטען" : `${d.partial} מקורות לא נטענו`} —
              ייתכן שחסרות תוצאות.
            </div>
          )}

          {d && d.groups.map((g) => (
            <div className="sr-grp" key={g.kind}>
              <div className="sr-grp-h">{g.kind}</div>
              {g.items.map((r, i) => (
                <button className="sr-row" key={r.kind + (r.id || i)} onClick={() => go(r)}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="sr-t">{r.title}</div>
                    {r.sub && <div className="sr-s">{r.sub}</div>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
