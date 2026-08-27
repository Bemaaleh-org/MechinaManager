/* ============================================================
   שלב הקמה — הדבקה, תצוגה מקדימה, אישור, ותיקון
   ------------------------------------------------------------
   ⚠ **תמיד רואים לפני שכותבים.** הקלט הוא הדבקה מ-Excel של
     אדם, ופרסור שגוי שנכתב ישר ללוח הוא 33 שורות למחוק ביד.

   ⚠ **מה שלא נקלט מוצג עם הסיבה.** שורה שנעלמה בשקט היא
     חניך שלא קיים ואיש לא יידע עד ספטמבר.

   ⚠ **הכול ניתן לתיקון אחרי הייבוא.** נתונים אמיתיים תמיד
     מגיעים עם טעות קטנה — רווח כפול, ספרה חסרה, תאריך הפוך.
     בלי תיקון מהמסך, כל טעות כזו שולחת את המנהל ל-monday,
     וזה בדיוק מה שהאפליקציה נועדה למנוע.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { PARSERS } from "../shared/import-parse.js";

const II = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  x: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
};

/** איך מציגים שורה מהתצוגה המקדימה — לכל שלב הצורה שלו */
const SHOW = {
  students: (r) => [r.name, r.tz, r.gender].filter(Boolean),
  gantt: (r) => [r.name, r.start === r.end ? r.start : `${r.start} – ${r.end}`, r.type],
  sheets: (r) => [r.subject, r.lecturer, r.dayTime, r.guest ? "אורח" : null].filter(Boolean),
  groups: (r) => [r.name, r.category, r.cap ? `מכסה ${r.cap}` : null].filter(Boolean),
};

export function CycleImport({ cycle, step, say, onBack, onDone }) {
  const def = PARSERS[step];
  const [text, setText] = useState("");
  const [prev, setPrev] = useState(null);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(null);
  const [edit, setEdit] = useState(null);
  /* ⚠ שורות שנדחו על ידי monday בכתיבה עצמה. הן שונות מ-bad
     (שנדחו בפרסור) — כאן הפרסור הצליח והלוח סירב, ובלי הצגה
     הן נעלמות בשקט: "נוספו 32" כשהמנהל הדביק 33. */
  const [rejected, setRejected] = useState([]);

  const loadExisting = () =>
    api.importRows(cycle.id, step).then(setExisting).catch((e) => say(e.message));
  useEffect(() => { loadExisting(); }, [step]); // eslint-disable-line

  const preview = () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    api.importPreview(cycle.id, step, text)
      .then(setPrev).catch((e) => say(e.message)).finally(() => setBusy(false));
  };

  const commit = () => {
    if (busy) return;
    setBusy(true);
    api.importCommit(cycle.id, step, text)
      .then((d) => {
        const bad = d.failed || [];
        setRejected(bad);
        say(bad.length ? `נוספו ${d.created} · ${bad.length} נדחו` : `נוספו ${d.created}`);
        setPrev(null);
        /* ⚠ הטקסט נשאר כשהיו דחיות, כדי שאפשר יהיה לתקן
           ולנסות שוב בלי להדביק מחדש. */
        if (!bad.length) setText("");
        loadExisting();
        if (d.created > 0 && onDone) onDone();
      })
      .catch((e) => say(e.message)).finally(() => setBusy(false));
  };

  const removeRow = (id) => {
    setBusy(true);
    api.importDelete(cycle.id, step, id)
      .then(() => { say("נמחק"); loadExisting(); })
      .catch((e) => say(e.message)).finally(() => setBusy(false));
  };

  const saveEdit = () => {
    setBusy(true);
    api.importEdit({ cycleId: cycle.id, step, ...edit })
      .then(() => { say("עודכן"); setEdit(null); loadExisting(); })
      .catch((e) => say(e.message)).finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <II.chev style={{ transform: "rotate(180deg)" }} />חזרה למחזור
      </button>
      <div className="screen-title">{def.title}</div>
      <div className="cy-lead">{def.hint}</div>

      {/* ============ ההדבקה ============ */}
      <div className="card lift">
        <div className="fld">
          <label>הדביקו כאן</label>
          <textarea rows={7} value={text} disabled={busy} dir="rtl"
            placeholder={def.sample}
            onChange={(e) => { setText(e.target.value); setPrev(null); }} />
          <div className="fld-hint">
            אפשר להעתיק ישירות מ-Excel או מגוגל שיטס — עמודה לכל שדה.
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={preview}>
          {busy ? "בודק…" : "בדיקה לפני הוספה"}
        </button>
      </div>

      {/* ============ התצוגה המקדימה ============ */}
      {prev && (
        <>
          <div className="sec-label">מה ייווצר</div>
          <div className="card">
            <div className="imp-sum">
              <span className="ok"><b>{prev.rows.length}</b> חדשים</span>
              {prev.duplicates > 0 && <span><b>{prev.duplicates}</b> כבר קיימים</span>}
              {prev.bad.length > 0 && <span className="bad"><b>{prev.bad.length}</b> לא נקלטו</span>}
            </div>

            {prev.rows.length > 0 && (
              <div className="imp-rows">
                {prev.rows.map((r, i) => (
                  <div className="imp-r" key={i}>
                    <span className="imp-n num">{i + 1}</span>
                    {SHOW[step](r).map((c, j) => (
                      <span className={"imp-c" + (j === 0 ? " first" : "")} key={j}>{c}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ⚠ מה שלא נקלט, עם הסיבה. שורה שנעלמת בשקט היא
                חניך שלא קיים ואיש לא יידע עד ספטמבר. */}
            {prev.bad.length > 0 && (
              <div className="imp-bad">
                <div className="imp-bad-h"><II.warn />לא נקלטו — יש לתקן בהדבקה ולנסות שוב</div>
                {prev.bad.map((b, i) => (
                  <div className="imp-b" key={i}>
                    <span className="imp-bl num">שורה {b.line}</span>
                    <span className="imp-bt">{b.text}</span>
                    <span className="imp-bw">{b.why}</span>
                  </div>
                ))}
              </div>
            )}

            {prev.rows.length > 0 ? (
              <button className="btn btn-primary" style={{ marginTop: 13 }}
                disabled={busy} onClick={commit}>
                {busy ? "מוסיף…" : `הוספת ${prev.rows.length} שורות`}
              </button>
            ) : (
              <div className="imp-none">אין מה להוסיף — הכול כבר קיים או שלא נקלט.</div>
            )}
          </div>
        </>
      )}

      {/* ============ מה שהלוח דחה ============
          ⚠ אלה שורות שהפרסור הצליח עליהן ו-monday סירבה — לרוב
            תווית שאינה קיימת בעמודה. בלי הצגה הן נעלמות, והמנהל
            רואה "נוספו 32" אחרי שהדביק 33. */}
      {rejected.length > 0 && (
        <>
          <div className="sec-label">הלוח דחה</div>
          <div className="imp-bad" style={{ marginBottom: 14 }}>
            <div className="imp-bad-h"><II.warn />{rejected.length} שורות לא נכתבו</div>
            {rejected.map((f, i) => (
              <div className="imp-b" key={i}>
                <span className="imp-bt">{SHOW[step](f.row).join(" · ")}</span>
                <span className="imp-bw">{f.why}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============ מה שכבר בפנים ============ */}
      {existing && (
        <>
          <div className="sec-label">
            כבר במחזור · {existing.count}
          </div>
          {existing.live && (
            <div className="cy-warn" style={{ marginBottom: 10 }}>
              <II.warn />
              <div>זה המחזור <b>הפעיל</b>. תיקון כאן משנה נתונים שהמערכת עובדת איתם עכשיו.</div>
            </div>
          )}
          <div className="card">
            {existing.count === 0 && <div className="led-empty">עדיין ריק</div>}
            {existing.rows.map((r) => (
              <div className="imp-e" key={r.id}>
                {edit && edit.id === r.id ? (
                  /* ---------- תיקון ---------- */
                  <div className="imp-edit">
                    <div className="fld">
                      <label>שם</label>
                      <input value={edit.name} disabled={busy}
                        onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                    </div>
                    {Object.entries(r.fields).map(([k]) => (
                      <div className="fld" key={k}>
                        <label>{k}</label>
                        <input value={edit[k] ?? ""} disabled={busy}
                          onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                      </div>
                    ))}
                    <div className="imp-acts">
                      <button className="btn btn-primary btn-sm" disabled={busy}
                        onClick={saveEdit}>שמירה</button>
                      <button className="btn btn-ghost btn-sm" disabled={busy}
                        onClick={() => setEdit(null)}>ביטול</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="imp-e-main"
                      onClick={() => setEdit({ id: r.id, name: r.name, ...r.fields })}>
                      <span className="imp-e-n">{r.name}</span>
                      <span className="imp-e-f">
                        {Object.values(r.fields).filter(Boolean).join(" · ") || "—"}
                      </span>
                    </button>
                    <button className="imp-e-x" disabled={busy}
                      aria-label="מחיקה" onClick={() => removeRow(r.id)}><II.x /></button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="cy-note" style={{ marginTop: 8 }}>
            לחיצה על שורה פותחת אותה לתיקון. הכול ניתן לשינוי כאן, בלי לפתוח את monday.
          </div>
        </>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}
