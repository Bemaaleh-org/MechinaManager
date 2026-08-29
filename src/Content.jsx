/* ============================================================
   ניהול תוכן — כל הטקסטים במקום אחד
   ------------------------------------------------------------
   ראש המכינה רואה כאן כל בלוק טקסט באפליקציה, יודע איפה הוא
   מופיע, ועורך אותו — בלי מפתח ובלי דיפלוי.

   ⚠ **המסך הזה אינו מקום נוסף לערוך בו.** אותו `TextBlock`
     יושב גם בתוך המסך שאליו הטקסט שייך, וזה המקום הטבעי
     לערוך בו — כשרואים אותו בהקשר. המסך הזה הוא **המפה**: מה
     קיים, מה עוד לא נכתב, ומה שונה מהנוסח המקורי.

   ⚠ **"טרם נכתב" מוצג כאן ורק כאן.** במסכים עצמם בלוק ריק
     פשוט אינו מופיע — מסך שמלא בקופסאות ריקות מלמד להתעלם
     מהן. כאן דווקא חשוב לראות מה חסר.
   ============================================================ */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "./api.js";
import TextBlock from "./TextBlock.jsx";
import ScrollTabs from "./Tabs.jsx";
import { CONTENT, roleKey, LEADER_KEY } from "../shared/content.js";
import { ROLE_INFO, LEADER_INFO } from "./roles-info.js";

const XI = {
  pen: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
  plus: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
};

/* איפה כל בלוק מופיע, בשם שהמשתמש מכיר */
const WHERE = {
  rules: "נהלים במכינה", chores: "תורנויות", year: "הנוכחות שלי",
  requests: "בקשות יציאה", placements: "השיבוצים שלי", teams: "ועדות וסדרות",
  lessons: "שיעורים", budget: "תקציב המטבח", safety: "אירועי בטיחות",
  faults: "תקלות ובעיות", menu: "תפריט ארוחות", weeks: "מובילי שבוע",
  role: "תיאורי התפקידים",
};

export default function ContentPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("screens");
  const [draft, setDraft] = useState(null);

  const load = useCallback(() => {
    api.getChores()
      .then((r) => { setD(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const byKey = useMemo(
    () => new Map((d ? d.texts : []).map((t) => [t.key, t])), [d]);

  if (err) return <><div className="screen-title">ניהול תוכן</div><div className="login-err">{err}</div></>;
  if (!d) return <><div className="screen-title">ניהול תוכן</div><div className="skel" style={{ height: 200 }} /></>;

  if (!d.me.headText) {
    /* ⚠ הכפתור יודע מראש — ראו 4יד. */
    return (
      <>
        <div className="screen-title">ניהול תוכן</div>
        <div className="empty">
          <b>עריכת נוסח נעשית על ידי ראש המכינה</b>
          <span>הטקסטים עצמם גלויים בכל מסך שבו הם מופיעים.</span>
        </div>
      </>
    );
  }

  /* ---------- תיאורי התפקידים ---------- */
  const roles = [
    ...Object.keys(ROLE_INFO).map((r) => ({
      key: roleKey(r), title: r, base: ROLE_INFO[r].desc, where: "role",
    })),
    { key: LEADER_KEY, title: "מוביל שבוע", base: LEADER_INFO.purpose, where: "role" },
  ];

  const save = (key, title, body) =>
    api.saveText({ key, title, body })
      .then(() => { setDraft(null); say("נשמר"); load(); })
      .catch((e) => say(e.message));

  const Row = ({ item, base }) => {
    const live = byKey.get(item.key);
    const open = draft && draft.key === item.key;
    /* ⚠ **"נערך" נגזר מקיום השורה בלוח**, לא מדגל. שורה שנמחקה
       חוזרת לנוסח המקורי מעצמה, בלי לנקות שום סימון. */
    const edited = Boolean(live);
    return (
      <div className="cn-row">
        {open ? (
          <div className="cn-form">
            <div className="fld">
              <label>כותרת</label>
              <input value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="fld">
              <label>הנוסח</label>
              <textarea rows={12} dir="rtl" value={draft.body}
                onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} />
            </div>
            <div className="tm-editor-f">
              <button className="btn btn-primary" disabled={!draft.body.trim()}
                onClick={() => save(draft.key, draft.title, draft.body)}>שמירה</button>
              <button className="btn btn-ghost" onClick={() => setDraft(null)}>ביטול</button>
              {base && (
                /* ⚠ **"חזרה לנוסח המקורי" ולא "מחיקה".** התיאור
                   בקוד עדיין קיים, והשורה בלוח היא דריסה שלו —
                   המילה צריכה לומר מה באמת קורה (4לו). */
                <button className="btn btn-ghost cn-reset"
                  onClick={() => setDraft((p) => ({ ...p, body: base }))}>
                  החזרת הנוסח המקורי
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="cn-m">
              <b>{live ? live.title : item.title}</b>
              <span>
                {WHERE[item.where] || item.where}
                {item.hint ? " · " + item.hint : ""}
              </span>
              {live && <div className="cn-prev">{live.body.slice(0, 120)}…</div>}
            </div>
            <div className="cn-side">
              {edited
                ? <span className="pill p-ok">נכתב</span>
                : <span className="pill">{base ? "נוסח מקורי" : "טרם נכתב"}</span>}
              <button className="btn btn-ghost btn-sm"
                onClick={() => setDraft({
                  key: item.key,
                  title: live ? live.title : item.title,
                  body: live ? live.body : (base || ""),
                })}>
                <XI.pen />{edited ? "עריכה" : "כתיבה"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const TABS = [["screens", "מסכים"], ["roles", "תיאורי תפקידים"]];

  return (
    <>
      <div className="screen-title">ניהול תוכן</div>
      <div className="tm-sub">
        כל הטקסטים באפליקציה. אפשר לערוך אותם גם מתוך המסך שבו הם מופיעים.
      </div>

      <ScrollTabs className="tm-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={"tm-tab" + (tab === k ? " on" : "")}
            onClick={() => { setTab(k); setDraft(null); }}>{label}</button>
        ))}
      </ScrollTabs>

      {tab === "screens" && (
        <>
          <div className="ch-note">
            בלוק שלא נכתב פשוט <b>אינו מופיע</b> במסך שלו — מסך שמלא בקופסאות
            ריקות מלמד להתעלם מהן. כאן דווקא חשוב לראות מה חסר.
          </div>
          {CONTENT.map((c) => <Row key={c.key} item={c} />)}
        </>
      )}

      {tab === "roles" && (
        <>
          <div className="ch-note">
            התיאורים שהמכינה מסרה יושבים בקוד, ומה שנכתב כאן <b>גובר עליהם</b>.
            "החזרת הנוסח המקורי" מחזירה את הטקסט שהיה.
          </div>
          {roles.map((r) => <Row key={r.key} item={r} base={r.base} />)}
        </>
      )}
    </>
  );
}
