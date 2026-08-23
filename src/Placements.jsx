/* ============================================================
   שיבוצי חניכים — מסך המנהל
   ------------------------------------------------------------
   ענפים, סדרות, ועדות וקבוצות — כל אחד בלשונית, ולצידם
   בעלי התפקידים הכלליים (אחראי מכולה, מטבח, לו״ז, אב בית).

   ⚠ אילו שיבוצים קיימים, מה המכסה ומה התקופה — נקבע בלוח
     ההגדרות ב-monday, לא כאן. המסך הזה רק משבץ חניכים.

   שיבוץ "לפי סמסטר" מציג שתי לשוניות סמסטר; החלוקה היא אותה
   חלוקה של הנוכחות, שנקטעת בשבוע האמצע.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { RoleHolders } from "./Mechina.jsx";
import { CATEGORIES, semestersFor } from "../shared/placements.js";

const PI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  users: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.4-1-4.1-2.6-5"/></svg>,
};

function useLoad(fn, deps = []) {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(true);
  const run = React.useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

/* ---------- עריכת המשובצים בשיבוץ+סמסטר אחד ---------- */
function AssignEditor({ def, semester, assigned, roster, say, onDone, onCancel }) {
  const [picked, setPicked] = useState(() => new Set(assigned.map((a) => a.student)));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const list = roster.filter((r) => !q.trim() || r.name.includes(q.trim()));
  const over = def.capacity != null && picked.size > def.capacity;

  const toggle = (id) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const save = () => {
    if (busy) return;
    setBusy(true);
    api.assignPlacement({ placementId: def.id, semester, studentIds: [...picked] })
      .then((r) => { say(`נשמר — ${r.total} משובצים`); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <PI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{def.name} · {semester}</div>

      <div className="card" style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <b className="num" style={{ fontSize: 22 }}>{picked.size}</b>
        <span style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>
          משובצים{def.capacity != null ? ` מתוך מכסה של ${def.capacity}` : ""}
        </span>
        {over && <span className="pill p-low">מעל המכסה</span>}
      </div>

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש חניך" />

      <div className="rows" style={{ maxHeight: "52vh", overflowY: "auto" }}>
        {list.map((r) => {
          const on = picked.has(r.id);
          return (
            <button className="st-row" key={r.id} onClick={() => toggle(r.id)}>
              <div className={"tick" + (on ? " on" : "")}>
                {on && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
              </div>
              <div className="st-main"><div className="st-n">{r.name}</div></div>
            </button>
          );
        })}
      </div>

      <div className="sticky">
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "שומר…" : "שמירת השיבוץ"}
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

/* ---------- כרטיס שיבוץ אחד ---------- */
function PlacementCard({ def, assignments, say, onEdit }) {
  const sems = semestersFor(def.period);
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <b style={{ fontSize: 15.5 }}>{def.name}</b>
        <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 700 }}>{def.period}</span>
        {def.capacity != null && (
          <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 700, marginRight: "auto" }}>
            מכסה {def.capacity}
          </span>
        )}
      </div>

      {sems.map((sem) => {
        const here = assignments.filter((a) => a.placement === def.id && a.semester === sem);
        const over = def.capacity != null && here.length > def.capacity;
        return (
          <button key={sem} className="st-row" style={{ width: "100%", textAlign: "right" }}
            onClick={() => onEdit(def, sem, here)}>
            <div className="st-main">
              {sems.length > 1 && <div className="st-n" style={{ fontSize: 13.5 }}>{sem}</div>}
              <div className="st-m">
                {here.length === 0
                  ? <span>אין משובצים — לחצו לשיבוץ</span>
                  : <span>{here.slice(0, 4).map((a) => a.studentName).join(", ")}
                      {here.length > 4 ? ` ועוד ${here.length - 4}` : ""}</span>}
              </div>
            </div>
            <b className={"num" + (over ? " pill p-low" : "")} style={{ flex: "0 0 auto", fontSize: 15, fontWeight: 800 }}>
              {here.length}{def.capacity != null ? `/${def.capacity}` : ""}
            </b>
            <PI.chev style={{ color: "var(--line2)" }} />
          </button>
        );
      })}
    </div>
  );
}

/* ---------- הדף המלא ---------- */
export function PlacementsPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getPlacements(), []);
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [rolesTab, setRolesTab] = useState(false);
  const [editing, setEditing] = useState(null); // {def, semester, assigned}

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען שיבוצים…</div></div>
  );
  if (err?.setupRequired) return (
    <div className="card" style={{ padding: "22px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}><PI.users /></div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>שיבוצי החניכים עדיין לא חוברו ל-monday</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{err.message}</div>
    </div>
  );
  if (err) return (
    <div className="alert a-clay">
      <PI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את השיבוצים</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (editing) return (
    <AssignEditor def={editing.def} semester={editing.semester} assigned={editing.assigned}
      roster={data.roster || []} say={say}
      onDone={() => { setEditing(null); reload(); }}
      onCancel={() => setEditing(null)} />
  );

  const defs = (data.definitions || []).filter((d) => d.category === cat);

  return (
    <>
      <div className="screen-title">שיבוצי חניכים</div>

      <div className="seg">
        {CATEGORIES.map((c) => (
          <button key={c} className={!rolesTab && cat === c ? "on" : ""}
            onClick={() => { setRolesTab(false); setCat(c); }}>
            {c === "ענף" ? "ענפים" : c === "סדרה" ? "סדרות" : c === "ועדה" ? "ועדות" : "קבוצות"}
          </button>
        ))}
        <button className={rolesTab ? "on" : ""} onClick={() => setRolesTab(true)}>תפקידים</button>
      </div>

      {rolesTab ? (
        <RoleHolders say={say} />
      ) : (
        <>
          {defs.length === 0 && (
            <div className="empty"><div className="e1">אין שיבוצים בקטגוריה הזו</div>
              <div className="e2">מוסיפים שורה בלוח ההגדרות ב-monday והיא תופיע כאן.</div></div>
          )}
          {defs.map((d) => (
            <PlacementCard key={d.id} def={d} assignments={data.assignments || []}
              say={say} onEdit={(def, semester, assigned) => setEditing({ def, semester, assigned })} />
          ))}
        </>
      )}
    </>
  );
}
