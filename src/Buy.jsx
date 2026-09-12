/* ============================================================
   קניות המכינה
   ------------------------------------------------------------
   שתי לשוניות, ושתיהן נחוצות:

   **כל הקניות** — מה שפתוח בשלוש הרשימות במסך אחד. זו הבקשה:
     מי שיוצא לקניות רואה הכול ולא מפספס. ⚠ והשורות **נשארות
     כל אחת בלוח שלה** — המסך קורא, ואינו מעביר שורות בין
     הרשימות. ראו ההערה המפורטת ב-api/_shop-all.js.

   **רשימה כללית** — הרשימה של ראש המכינה: כל מה שצריך לקנות
     ואינו מלאי מטבח ואינו ציוד מכולה.

   ⚠ **`canManage` ו-`canMark` מגיעים מהשרת** ואינם נגזרים
     כאן. כפתור שמופיע ומקבל 403 אחרי שהמשתמש הקליד הוא בדיוק
     מה ש-4יד אוסר.

   ⚠ **הסימון אופטימי, ובכישלון חוזר אחורה ואומר** (4י).
     סימון שנשאר על המסך אחרי שהשרת דחה אותו הוא שקר.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { BUY_STATUS } from "../shared/buy-ids.js";

const YI = {
  cart: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2l2.4 11h10.2l2-7H6.2"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg>,
  check: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4.5 12.5l5 5 10-11"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  trash: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>,
  pen: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h4L20 8l-4-4L4 16v4z"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  box: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8l9-4 9 4-9 4-9-4zM3 8v8l9 4 9-4V8"/></svg>,
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return "";
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
};

/* ⚠ גוון לפי מקור — הוא סיווג ולא מצב, ולכן לא אדום/ירוק (4ג). */
const SRC_TONE = { kitchen: "by-k", container: "by-c", buy: "by-b" };

/* ============================================================
   כל הקניות — שלוש הרשימות במסך אחד
   ============================================================ */
/* ⚠ הנתונים נטענים ב-`BuyPage` ולא כאן: הלשוניות עצמן
   נגזרות מ-`canGeneral` שבאותה תשובה, וטעינה שנייה הייתה
   שואלת את השרת את אותה שאלה פעמיים. */
function AllShopping({ d, say }) {
  const [done, setDone] = useState(() => new Set());
  const [busy, setBusy] = useState(() => new Set());

  /* ⚠ אופטימי: השורה מסומנת מיד והבקשה יוצאת ברקע (4י).
     ⚠ ובכישלון חוזרים אחורה **ואומרים** — סימון שנשאר על
       המסך אחרי שהשרת דחה אותו הוא שקר. */
  const mark = (row) => {
    const key = row.source + ":" + row.id;
    if (busy.has(key)) return;
    setBusy((s) => new Set(s).add(key));
    setDone((s) => new Set(s).add(key));
    api.markShopRow({ source: row.source, id: row.id, status: BUY_STATUS.bought })
      .then(() => say(`"${row.name}" סומן כנקנה`))
      .catch((e) => {
        setDone((s) => { const n = new Set(s); n.delete(key); return n; });
        say(e.message || "הסימון לא נשמר");
      })
      .finally(() => setBusy((s) => { const n = new Set(s); n.delete(key); return n; }));
  };

  const groups = (d.groups || []).filter((g) => g.rows.length);

  return (
    <>
      {/* ⚠ רשימה שנפלה או שטרם הוקמה **נאמרת**. מי שיוצא
          לקניות עם רשימה שחסר בה שליש בשקט הוא בדיוק מה
          שהמסך נועד למנוע (עיקרון 6). */}
      {(d.failed || []).map((f) => (
        <div className="alert a-clay" key={f.key}>
          <YI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">רשימת ה{f.title} לא נטענה</div>
            <div className="bd">מה שפתוח בה אינו מוצג כאן. כדאי לפתוח אותה בנפרד לפני שיוצאים.</div>
          </div>
        </div>
      ))}
      {(d.missing || []).map((m) => (
        <div className="alert a-amber" key={m.key}>
          <YI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">רשימת ה{m.title} טרם הוקמה</div>
            {m.setup && <div className="bd">להקמה: <code>{m.setup}</code></div>}
          </div>
        </div>
      ))}

      {!groups.length ? (
        <div className="empty">
          <div className="e-ico"><YI.cart /></div>
          <b>אין כרגע מה לקנות מהמכולה</b>
          <span>מה שנרשם ברשימת הקניות של המכולה יופיע כאן.</span>
        </div>
      ) : groups.map((g) => (
        <div className="card by-grp" key={g.key}>
          <div className="by-grp-h">
            <span className={"by-chip " + (SRC_TONE[g.key] || "")}>{g.title}</span>
            <b>{g.rows.length}</b>
          </div>
          {g.rows.map((r) => {
            const key = r.source + ":" + r.id;
            const hit = done.has(key);
            return (
              <div className={"by-row" + (hit ? " is-done" : "")} key={key}>
                <div className="by-t">
                  <b>{r.name}</b>
                  <span>
                    {r.qty && <>{r.qty}</>}
                    {r.qty && r.area && " · "}
                    {r.area && <>{r.area}</>}
                    {(r.qty || r.area) && r.date && " · "}
                    {r.date && <>נרשם {dmy(r.date)}</>}
                  </span>
                  {r.detail && <span className="by-d">{r.detail}</span>}
                </div>
                {r.canMark ? (
                  <button className={"by-ok" + (hit ? " on" : "")} onClick={() => mark(r)}
                    disabled={hit} aria-label={"סימון " + r.name + " כנקנה"}>
                    <YI.check />
                  </button>
                ) : (
                  /* ⚠ מי שאינו רשאי רואה למה, ולא כפתור מושבת
                     בלי הסבר. */
                  <span className="by-locked">מסמן {r.markHint || r.sourceTitle}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="tm-sub by-note">
        החלק הזה נלקח מרשימת הקניות של המכולה — מוסיפים אליו ממסך
        המכולה, וסימון כאן נשמר שם.
      </div>
    </>
  );
}

/* ============================================================
   הרשימה הכללית — של ראש המכינה
   ============================================================ */
function GeneralList({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [n, setN] = useState(0);
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [form, setForm] = useState({ name: "", qty: "", detail: "" });

  useEffect(() => {
    let alive = true;
    api.getBuy()
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [n]);
  const reload = () => setN((x) => x + 1);

  const add = () => {
    const name = form.name.trim();
    if (!name) { say("צריך שם לפריט"); return; }
    api.addBuy([{ name, qty: form.qty.trim(), detail: form.detail.trim() }])
      .then(() => {
        say("נוסף לרשימה");
        setForm({ name: "", qty: "", detail: "" });
        setAdding(false);
        reload();
      })
      .catch((e) => say(e.message));
  };

  const setStatus = (row, status) => {
    api.editBuy({ id: row.id, status })
      .then(() => { say(status === BUY_STATUS.bought ? "סומן כנקנה" : "הוחזר לרשימה"); reload(); })
      .catch((e) => say(e.message));
  };

  const remove = (row) => {
    api.deleteBuy(row.id)
      .then(() => { say("הוסר מהרשימה"); reload(); })
      .catch((e) => say(e.message));
  };

  const saveEdit = () => {
    api.editBuy({ id: edit.id, name: edit.name, qty: edit.qty, detail: edit.detail })
      .then((r) => {
        /* ⚠ מה השתנה בפועל ולא "נשמר" (4ש). */
        say(r.changed && r.changed.length ? "עודכן: " + r.changed.join(" · ") : "אין שינוי");
        setEdit(null);
        reload();
      })
      .catch((e) => say(e.message));
  };

  if (err) return (
    <div className={"alert " + (err.setupRequired ? "a-amber" : "a-clay")}>
      <YI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">{err.setupRequired ? "הרשימה טרם הוקמה" : "לא הצלחנו לטעון"}</div>
        <div className="bd">{err.message}</div>
      </div>
    </div>
  );
  if (!d) return <><div className="skel skel-card" /><div className="skel skel-card" /></>;

  if (!d.ready) return (
    <div className="alert a-amber">
      <YI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">הרשימה הכללית טרם הוקמה ב-monday</div>
        <div className="bd">להקמה: <code>{d.setup || "npm run seed:buy"}</code></div>
      </div>
    </div>
  );

  const rows = d.rows || [];
  const open = rows.filter((r) => r.status === BUY_STATUS.open);
  const bought = rows.filter((r) => r.status !== BUY_STATUS.open);

  return (
    <>
      <div className="sec-label">כללי</div>

      {d.canManage && !adding && (
        <button className="btn btn-primary by-add" onClick={() => setAdding(true)}>
          <YI.plus />הוספת פריט
        </button>
      )}

      {adding && (
        <div className="card lift by-form">
          <label className="fld">
            <span>מה צריך לקנות</span>
            <input value={form.name} autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="fld">
            <span>כמה <i>לא חובה</i></span>
            <input value={form.qty} placeholder="למשל: 30 כיסאות · שני שקים"
              onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </label>
          <label className="fld">
            <span>פירוט <i>לא חובה</i></span>
            <textarea rows={2} value={form.detail} placeholder="לאיזה צורך, איפה קונים, עד מתי"
              onChange={(e) => setForm({ ...form, detail: e.target.value })} />
          </label>
          <div className="by-btns">
            <button className="btn btn-primary btn-sm" onClick={add}>הוספה</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>ביטול</button>
          </div>
        </div>
      )}

      {!open.length ? (
        <div className="empty">
          <div className="e-ico"><YI.box /></div>
          <b>הרשימה ריקה</b>
          <span>אין כרגע פריט שממתין לקנייה.</span>
        </div>
      ) : (
        <div className="card by-grp">
          <div className="by-grp-h">
            <span className="by-chip by-b">כללי · ממתין לקנייה</span>
            <b>{open.length}</b>
          </div>
          {open.map((r) => (
            <div className="by-row" key={r.id}>
              {edit && edit.id === r.id ? (
                <div style={{ flex: 1 }}>
                  <label className="fld">
                    <span>מה צריך לקנות</span>
                    <input value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  </label>
                  <label className="fld">
                    <span>כמה</span>
                    <input value={edit.qty}
                      onChange={(e) => setEdit({ ...edit, qty: e.target.value })} />
                  </label>
                  <label className="fld">
                    <span>פירוט</span>
                    <textarea rows={2} value={edit.detail}
                      onChange={(e) => setEdit({ ...edit, detail: e.target.value })} />
                  </label>
                  <div className="by-btns">
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>שמירה</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>ביטול</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="by-t">
                    <b>{r.name}</b>
                    <span>
                      {r.qty && <>{r.qty}</>}
                      {r.qty && r.date && " · "}
                      {r.date && <>נוסף {dmy(r.date)}</>}
                      {r.by && <> · {r.by}</>}
                    </span>
                    {r.detail && <span className="by-d">{r.detail}</span>}
                  </div>
                  <div className="by-acts">
                    {d.canMark && (
                      <button className="by-ok" onClick={() => setStatus(r, BUY_STATUS.bought)}
                        aria-label={"סימון " + r.name + " כנקנה"}><YI.check /></button>
                    )}
                    {d.canManage && (
                      <>
                        <button className="by-icon" aria-label="עריכה"
                          onClick={() => setEdit({ id: r.id, name: r.name, qty: r.qty, detail: r.detail })}>
                          <YI.pen />
                        </button>
                        <button className="by-icon by-del" aria-label="מחיקה"
                          onClick={() => remove(r)}><YI.trash /></button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ⚠ ההיסטוריה נשארת ואינה נמחקת — "מה קנינו בחודש
          שעבר" היא שאלה שנשאלת. מקופלת, כי היא אינה המטלה. */}
      {!!bought.length && (
        <div className="card by-grp">
          <button className="by-hist" onClick={() => setShowDone((v) => !v)}>
            <span>נקנו · {bought.length}</span>
            <b>{showDone ? "הסתרה" : "הצגה"}</b>
          </button>
          {showDone && bought.map((r) => (
            <div className="by-row is-done" key={r.id}>
              <div className="by-t">
                <b>{r.name}</b>
                <span>{r.qty}{r.qty && r.date && " · "}{r.date && dmy(r.date)}</span>
              </div>
              {d.canMark && (
                <button className="by-icon" onClick={() => setStatus(r, BUY_STATUS.open)}>
                  החזרה
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================
   רשימה אחת, בשני חלקים — בלי לשוניות
   ------------------------------------------------------------
   הבקשה (12.9.2026): *"רשימה אחת שמחולקת לשתיים — כללי שאפשר
   ישירות להוסיף אליו, ורשימת מכולה שנלקחת מתוך המכולה."*

   ⚠ **בלי לשוניות, ובכוונה.** לשונית שנייה היא בדיוק המקום שבו
     מפספסים: מי שיוצא לקנות רואה את הראשונה ויוצא. שני חלקים
     באותה גלילה הם רשימה אחת.
   ⚠ **החלק הכללי מוצג לפי `canGeneral` מהשרת** — אחראי המכולה
     ואב הבית רואים את חלק המכולה בלבד (4יד).
   ============================================================ */
export function BuyPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getAllShopping()
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, []);

  /* ⚠ החלק הכללי מגיע מ-GeneralList (עם ההיסטוריה והטופס), ולכן
     מהתשובה המאוחדת נלקח חלק המכולה בלבד — אחרת שורה כללית
     הייתה מוצגת פעמיים. */
  const box = d ? {
    ...d,
    groups: (d.groups || []).filter((g) => g.key === "container"),
    missing: (d.missing || []).filter((m) => m.key === "container"),
    failed: (d.failed || []).filter((f) => f.key === "container"),
  } : null;

  return (
    <>
      <div className="screen-title">קניות המכינה</div>
      <div className="tm-sub">
        רשימה אחת בשני חלקים: <b>כללי</b> — מה שהצוות מוסיף ישירות, ו<b>מכולה</b> —
        מה שנרשם ברשימת הקניות של המכולה.
      </div>

      {d && d.canGeneral && <GeneralList say={say} />}

      <div className="sec-label">מכולה</div>
      {err ? (
        <div className="alert a-clay">
          <YI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">לא הצלחנו לטעון את רשימת המכולה</div>
            <div className="bd">{err.message}</div>
          </div>
        </div>
      ) : !box ? (
        <><div className="skel skel-card" /><div className="skel skel-card" /></>
      ) : <AllShopping d={box} say={say} />}
    </>
  );
}

/* ============================================================
   ⚠ קידומת `by-` — נבדקה ב-grep לפני שנכתבה, כמו שהכלל
     דורש. הקובץ הזה ניתן להסרה בחתיכה אחת.
   ============================================================ */
export const BUY_CSS = `
.by-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-bottom:12px}
.by-form{padding:14px 15px;margin-bottom:12px}
.by-btns{display:flex;gap:9px;margin-top:4px}
.by-btns>*{flex:1}

.by-grp{margin-bottom:12px;overflow:hidden}
.by-grp-h{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:11px 14px;border-bottom:1px solid var(--line)}
.by-grp-h b{font-size:15px;font-weight:900;color:var(--muted);font-variant-numeric:tabular-nums}
.by-chip{font-size:12.5px;font-weight:800;padding:4px 10px;border-radius:999px;
  background:var(--t1-s);color:var(--t1)}
.by-chip.by-k{background:var(--t2-s);color:var(--t2)}
.by-chip.by-c{background:var(--t4-s);color:var(--t4)}
.by-chip.by-b{background:var(--t6-s);color:var(--t6)}

.by-row{display:flex;align-items:flex-start;gap:11px;padding:12px 14px;
  border-bottom:1px solid var(--line);min-height:58px}
.by-row:last-child{border-bottom:none}
.by-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.by-t b{font-size:15px;font-weight:800;color:var(--ink);line-height:1.35}
.by-t span{font-size:12.5px;font-weight:600;color:var(--faint)}
.by-d{font-size:12.5px;font-weight:600;color:var(--muted);line-height:1.6;margin-top:3px}

/* ⚠ השורה שסומנה נשארת במקומה ומתעמעמת, ואינה נעלמת —
   אלמנט שמתפרק אינו מבצע מעבר, ולמשתמש זה נראה כאילו
   הלחיצה לא נקלטה (4לח). */
.by-row.is-done{opacity:.5}
.by-row.is-done .by-t b{text-decoration:line-through}

.by-acts{display:flex;align-items:center;gap:7px;flex-shrink:0}
.kx .by-ok{width:40px;height:40px;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;border-radius:12px;border:1.5px solid var(--line2);
  background:var(--surface);color:var(--muted);transition:all 120ms var(--ease)}
.kx .by-ok.on,.kx .by-ok:disabled{background:var(--t3-s);color:var(--t3);border-color:transparent}
.kx .by-icon{padding:8px 10px;border-radius:11px;border:1.5px solid var(--line2);
  background:var(--surface);color:var(--muted);font-size:12.5px;font-weight:800}
.kx .by-icon.by-del{color:var(--clay)}
.by-locked{font-size:12px;font-weight:700;color:var(--faint);flex-shrink:0;
  align-self:center;text-align:center;max-width:86px;line-height:1.4}

.kx .by-hist{display:flex;align-items:center;justify-content:space-between;width:100%;
  padding:12px 14px;background:transparent;border:none;font-size:13.5px;font-weight:800;
  color:var(--muted)}
.kx .by-hist b{font-size:12.5px;font-weight:800;color:var(--accent)}
.by-note{margin-top:10px}
`;
