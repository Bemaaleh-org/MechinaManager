/* ============================================================
   רשימות הציוד השבועיות — כל הוועדות במסך אחד
   ------------------------------------------------------------
   הבקשה: *"רשימות ציוד בנפרד עם אותם הגדרות שצריך להגיש, וזה
   מתווסף לדף חדש — רשימות ציוד שבועיות."*

   ⚠⚠ **מסך שקורא, ולא לוח נוסף.** השורות נשארות בלוח רשומות
     הצוות ושייכות לוועדה, וההגשה נעשית במסך הוועדה. העתק בשני
     מקומות פירושו שהגשה באחד משאירה את השני פתוח — בדיוק
     ההפך ממה שהמסך נועד לעשות (5מ).

   ⚠ **"טרם הגישה" הוא המצב שהמסך קיים בשבילו.** ועדה בלי
     רשימה אינה ועדה שאין לה מה לקנות — היא ועדה שלא הגישה,
     והמספר הזה למעלה (עיקרון 6, 4יח).
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const GI = {
  box: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 8v5M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>,
  clock: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
};

const dmy = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");

export function GearWeekPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [n, setN] = useState(0);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    api.getGearWeek()
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [n]);
  useEffect(load, [load]);

  /* ⚠ **הרשימה לוואטסאפ נבנית מהמסך ולא מהשרת** — מה שנשלח הוא
     בדיוק מה שרואים (5מ). ⚠ ובלי שמות של מי ביקש: השאלה בקופה
     היא מה לקנות (עיקרון 5). */
  const toText = () => {
    const parts = [];
    for (const t of (d.teams || [])) {
      if (!t.sent.length) continue;
      parts.push(`*${t.name}*`);
      for (const x of t.sent) {
        parts.push(`• ${x.title}${x.qty ? ` — ${x.qty}` : ""}${x.extra ? ` (${x.extra})` : ""}`);
      }
      parts.push("");
    }
    return parts.length ? parts.join("\n").trim() : "";
  };

  const copy = () => {
    const txt = toText();
    if (!txt) { say("אין רשימות שהוגשו להעתקה"); return; }
    navigator.clipboard.writeText(txt)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); })
      .catch(() => say("ההעתקה נכשלה"));
  };

  if (err?.setupRequired) return (
    <>
      <div className="screen-title">רשימות ציוד שבועיות</div>
      <div className="alert a-amber">
        <GI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">לוחות הצוותים טרם הוקמו</div>
          <div className="bd">להקמה: <code>npm run setup:boards</code></div>
        </div>
      </div>
    </>
  );
  if (err) return (
    <>
      <div className="screen-title">רשימות ציוד שבועיות</div>
      <div className="alert a-clay">
        <GI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">לא הצלחנו לטעון את הרשימות</div>
          <div className="bd">{err.message}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
            onClick={() => setN((x) => x + 1)}>נסו שוב</button>
        </div>
      </div>
    </>
  );
  if (!d) return (
    <>
      <div className="screen-title">רשימות ציוד שבועיות</div>
      <div className="skel skel-card" /><div className="skel skel-card" />
    </>
  );

  const T = d.totals || {};
  const withSent = (d.teams || []).filter((t) => t.sent.length);
  const withDraft = (d.teams || []).filter((t) => !t.sent.length && t.draft.length);
  const none = (d.teams || []).filter((t) => !t.sent.length && !t.draft.length);

  const row = (x, dim) => (
    <div className={"gw-item" + (dim ? " is-draft" : "")} key={x.id}>
      <div className="gw-t">
        <b>{x.title}</b>
        <span>
          {x.qty != null && <>{x.qty}</>}
          {x.qty != null && x.extra && " · "}
          {x.extra && <>{x.extra}</>}
          {x.date && <> · הוגש {dmy(x.date)}</>}
        </span>
      </div>
      {x.done && <span className="pill p-ok">נקנה</span>}
    </div>
  );

  const card = (t) => (
    <div className="card gw-team" key={t.id}>
      <div className="gw-h">
        <div>
          <b>{t.name}</b>
          {t.chairName && <span className="gw-chair">יו״ר {t.chairName}</span>}
        </div>
        <span className={"pill " + (t.sent.length ? "p-ok" : t.draft.length ? "p-new" : "p-low")}>
          {t.sent.length ? `הוגשו ${t.sent.length}` : t.draft.length ? `${t.draft.length} בטיוטה` : "טרם הגישה"}
        </span>
      </div>
      {t.sent.map((x) => row(x, false))}
      {/* ⚠ טיוטה מוצגת ומעומעמת ואינה מוסתרת — היא אומרת שהוועדה
          כתבה ולא הגישה, וזה מצב אחר מ"אין לה מה לקנות" (4ט). */}
      {t.draft.length > 0 && (
        <>
          <div className="gw-sub">טרם הוגש</div>
          {t.draft.map((x) => row(x, true))}
        </>
      )}
      {t.bought.length > 0 && (
        <div className="gw-sub">נקנו החודש: {t.bought.length}</div>
      )}
    </div>
  );

  return (
    <>
      <div className="screen-title">רשימות ציוד שבועיות</div>

      {/* ⚠ שלושה מספרים שמסכמים לפני הרשימה, ו"טרם הגישו" ראשון —
          הוא מה שקובע למי להזכיר (4יח). */}
      <div className="band">
        <div className="band-h">
          מועד ההגשה הקרוב · יום רביעי {dmy(d.deadline)} בשעה 10:00
        </div>
        <div className="band-grid">
          <div className="band-c">
            <div className={"band-n" + (T.noList ? " warn" : " ok")}>{T.noList || 0}</div>
            <div className="band-l">ועדות שטרם הגישו</div>
          </div>
          <div className="band-c">
            <div className="band-n">{T.sent || 0}</div>
            <div className="band-l">פריטים שהוגשו</div>
          </div>
          <div className="band-c">
            <div className="band-n">{T.drafts || 0}</div>
            <div className="band-l">בטיוטה</div>
          </div>
        </div>
      </div>

      {T.sent > 0 && (
        <button className="btn btn-ghost gw-copy" onClick={copy}>
          {copied ? "הועתק ✓" : "העתקת מה שהוגש לוואטסאפ"}
        </button>
      )}

      {withSent.length === 0 && withDraft.length === 0 ? (
        <div className="empty">
          <div className="e-ico"><GI.box /></div>
          <b>אף ועדה טרם הגישה רשימה</b>
          <span>מה שוועדה תגיש במסך שלה יופיע כאן.</span>
        </div>
      ) : (
        <>
          {withSent.map(card)}
          {withDraft.map(card)}
        </>
      )}

      {/* ⚠ **מי שלא הגישה — ברשימה אחת ולא ככרטיס לכל אחת.**
          אחת־עשרה ועדות ריקות הן אחת־עשרה קופסאות ריקות שמלמדות
          להתעלם מהמסך (4ג). */}
      {none.length > 0 && (
        <div className="card gw-none">
          <div className="gw-none-h"><GI.clock />טרם הגישו</div>
          <div className="gw-none-l">{none.map((t) => t.name).join(" · ")}</div>
        </div>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}

export const GEARWEEK_CSS = `
.gw-team{padding:13px 15px;margin-bottom:10px}
.gw-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
  margin-bottom:9px}
.gw-h b{font-size:15px;font-weight:900;display:block}
.gw-chair{display:block;font-size:11.5px;font-weight:700;color:var(--faint);margin-top:2px}
.gw-item{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
  padding:8px 0;border-top:1px solid var(--line)}
/* ⚠ טיוטה מעומעמת ולא מוסתרת — ראו ההערה ברכיב. */
.gw-item.is-draft{opacity:.6}
.gw-t b{font-size:13.5px;font-weight:800;display:block}
.gw-t span{font-size:11.5px;font-weight:700;color:var(--faint)}
.gw-sub{font-size:11.5px;font-weight:800;color:var(--muted);margin-top:9px}
.kx .gw-copy{width:100%;margin-bottom:12px}
.gw-none{padding:12px 15px}
.gw-none-h{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;
  color:var(--muted);margin-bottom:6px}
.gw-none-l{font-size:12.5px;font-weight:700;color:var(--faint);line-height:1.7}
`;
