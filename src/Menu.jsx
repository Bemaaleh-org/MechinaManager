/* ============================================================
   תפריט ומנות
   ------------------------------------------------------------
   אחראי המטבח כותב מנה פעם אחת — מצרכים לכמות אנשים אחת —
   ומשם כל כמות אחרת היא הכפלה. בוחרים מנות, מזינים כמה אוכלים,
   ומקבלים רשימת מצרכים מאוחדת מול המלאי.

   ⚠ הבדיקה מול המלאי היא התראה, לא חסימה. שם מצרך אינו תמיד
     שם הפריט בלוח, וההתאמה חלקית — "חסר" כאן פירושו "בדקו".
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable, shareText } from "./excel.js";
import { parseItems, scaleItems, mergeItems, DEFAULT_BASE } from "../shared/dishes.js";

const MI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  dish: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 13h18a9 9 0 0 0-18 0z"/><path d="M2 17h20M12 4v-.01"/></svg>,
  cart: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

const qty = (n) => (n == null ? "לפי הטעם" : String(Math.round(n * 100) / 100));

function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);
  const run = React.useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
      .catch((e) => { if (live) setErr(e); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

export function MenuPage({ say }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => api.getMenu(), []);
  const [sub, setSub] = useState("plan");
  const [editing, setEditing] = useState(null);
  const [picked, setPicked] = useState([]);
  const [heads, setHeads] = useState(String(DEFAULT_BASE));

  if (busy && !data) return <><div className="screen-title">תפריט ארוחות</div>
    <div className="skel skel-card" /><div className="skel skel-card" /></>;
  if (err) return (
    <>
      <div className="screen-title">תפריט ארוחות</div>
      <div className="alert a-clay"><MI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">{err.setupRequired ? "לוח המנות טרם הוקם" : "לא הצלחנו לטעון"}</div>
          <div className="bd">{err.message}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
        </div>
      </div>
    </>
  );
  if (!data) return null;

  if (editing) {
    return <DishForm initial={editing.id ? editing : null}
      defaultBase={data.defaultBase} say={say}
      onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />;
  }

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <div className="screen-title">תפריט ארוחות</div>

      <div className="seg">
        <button className={sub === "plan" ? "on" : ""} onClick={() => setSub("plan")}>תכנון ארוחה</button>
        <button className={sub === "dishes" ? "on" : ""} onClick={() => setSub("dishes")}>
          המנות ({data.counts.dishes})
        </button>
      </div>

      {sub === "dishes" && (
        <>
          {data.dishes.length === 0 ? (
            <div className="empty tone-3">
              <div className="e-ico"><MI.dish /></div>
              <div className="e1">עדיין אין מנות</div>
              <div className="e2">
                מוסיפים מנה פעם אחת עם המצרכים לכמות אנשים אחת, ומשם כל כמות אחרת מחושבת לבד.
              </div>
            </div>
          ) : (
            <div className="rows">
              {data.dishes.map((d) => (
                <button className="st-row" key={d.id} onClick={() => setEditing(d)}>
                  <div className="tile sm"><MI.dish /></div>
                  <div className="st-main">
                    <div className="st-n">{d.name}</div>
                    <div className="st-m">
                      <span>מצרכים ל-{d.baseHeads}</span>
                      <span>· {parseItems(d.items).length} מצרכים</span>
                    </div>
                  </div>
                  <MI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
                </button>
              ))}
            </div>
          )}

          <div className="sticky">
            <button className="btn btn-primary" onClick={() => setEditing({})}>
              <MI.plus />מנה חדשה
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}

      {sub === "plan" && (
        <Planner dishes={data.dishes} picked={picked} onToggle={toggle}
          heads={heads} setHeads={setHeads} meals={data.meals} say={say}
          onReload={reload} />
      )}
    </>
  );
}

/* ---------- תכנון ארוחה ---------- */
function Planner({ dishes, picked, onToggle, heads, setHeads, meals, say, onReload }) {
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const n = Number(heads) || 0;

  /* ⚠ תצוגה מקדימה מקומית, מאותה נוסחה של השרת (shared/dishes).
     היא מיידית; הבדיקה מול המלאי מגיעה מהשרת. */
  const preview = picked.length && n > 0
    ? mergeItems(picked
        .map((id) => dishes.find((d) => d.id === id))
        .filter(Boolean)
        .map((d) => scaleItems(parseItems(d.items), d.baseHeads, n)))
    : [];

  const check = () => {
    if (!picked.length) { say("בחרו מנה אחת לפחות"); return; }
    if (!(n > 0)) { say("הזינו מספר סועדים"); return; }
    setBusy(true);
    api.planMenu({ dishIds: picked, heads: n })
      .then((r) => setPlan(r))
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const toShopping = () => {
    if (!plan) return;
    const short = plan.items.filter((i) => i.short > 0 || !i.known);
    if (!short.length) { say("אין מה להוסיף — הכול במלאי"); return; }
    setBusy(true);
    api.addKitchenShopping(
      short.map((i) => ({
        name: i.name,
        qty: i.short > 0 ? `${qty(i.short)}${i.unit ? " " + i.unit : ""}`
          : `${qty(i.qty)}${i.unit ? " " + i.unit : ""}`,
      })),
      "אוכל"
    )
      .then(() => { say(`${short.length} פריטים נוספו לרשימת הקניות`); onReload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="fld">
          <label>כמה אוכלים</label>
          <input value={heads} onChange={(e) => setHeads(e.target.value)} inputMode="numeric" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            הכמויות מוכפלות מהמנה. מצרך שנכתב בלי כמות נשאר "לפי הטעם".
          </div>
        </div>
      </div>

      <div className="sec-label">בחירת מנות ({picked.length})</div>
      {dishes.length === 0 ? (
        <div className="empty tone-3">
          <div className="e-ico"><MI.dish /></div>
          <div className="e1">אין מנות לבחור</div>
          <div className="e2">הוסיפו מנה בלשונית "המנות".</div>
        </div>
      ) : (
        /* ---------- כרטיסייה לכל מנה ----------
           ⚠ הכרטיס מראה את המצרכים **בכמות שנבחרה**, לא בכמות
             שנשמרה. זו כל התועלת: מי שמתכנן ל-17 רוצה לראות
             2.92 קילו, לא "6 קילו ל-35" ולחשב בראש.

           ⚠ ולכן גם מנה שלא נבחרה מציגה את הכמות המחושבת —
             ההחלטה אם לקחת אותה תלויה בדיוק במספר הזה. */
        <div className="dish-grid">
          {dishes.map((d) => {
            const on = picked.includes(d.id);
            const items = n > 0
              ? scaleItems(parseItems(d.items), d.baseHeads, n)
              : parseItems(d.items);
            return (
              <button className={"dish-card" + (on ? " on" : "")} key={d.id}
                onClick={() => onToggle(d.id)}>
                <div className="dish-top">
                  <div className={"tick" + (on ? " on" : "")}>
                    {on && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                  <div className="dish-nm">
                    <b>{d.name}</b>
                    <span>{n > 0 ? `מצרכים ל-${n} סועדים` : `מצרכים ל-${d.baseHeads}`}</span>
                  </div>
                  <MI.dish style={{ color: on ? "var(--accent)" : "var(--line2)", flex: "0 0 auto" }} />
                </div>

                {items.length > 0 && (
                  <div className="dish-items">
                    {items.map((it, i) => (
                      <span className="dish-it" key={i}>
                        {it.name}
                        <b>{qty(it.qty)}{it.unit ? ` ${it.unit}` : ""}</b>
                      </span>
                    ))}
                  </div>
                )}

                {d.how && <div className="dish-how">{d.how}</div>}
              </button>
            );
          })}
        </div>
      )}

      {preview.length > 0 && (
        <>
          <div className="sec-label">מה צריך · {n} סועדים</div>
          <div className="card" style={{ marginBottom: 12 }}>
            {preview.map((it, i) => (
              <div className="ing" key={i}>
                <span className="ing-n">{it.name}</span>
                <b className="num">{qty(it.qty)}{it.unit ? ` ${it.unit}` : ""}</b>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" disabled={busy} onClick={check}>
            {busy ? "בודק…" : "בדיקה מול המלאי"}
          </button>
        </>
      )}

      {plan && (
        <>
          <div className="sec-label">מול המלאי</div>
          <div className="band" style={{ marginTop: 0 }}>
            <div className="band-grid">
              <div className="band-c">
                <div className="band-n">{plan.counts.items}</div>
                <div className="band-l">מצרכים</div>
              </div>
              <div className="band-c">
                <div className={"band-n" + (plan.counts.short ? " warn" : " ok")}>{plan.counts.short}</div>
                <div className="band-l">חסרים</div>
              </div>
              <div className="band-c">
                <div className="band-n">{plan.counts.unknown}</div>
                <div className="band-l">לא נמצאו במלאי</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            {plan.items.map((it, i) => (
              <div className={"ing" + (it.short > 0 ? " short" : !it.known ? " unk" : "")} key={i}>
                <span className="ing-n">
                  {it.name}
                  {/* ⚠ שלושה מצבים ולא שניים: יש · חסר · לא נמצא.
                      "לא נמצא" אינו "חסר" — ייתכן שהוא במלאי
                      בשם אחר, וזו בדיקה של אדם. */}
                  {it.short > 0 && <span className="pill p-low">חסר {qty(it.short)}</span>}
                  {!it.known && <span className="pill p-new">לא נמצא במלאי</span>}
                </span>
                <b className="num">
                  {qty(it.qty)}{it.unit ? ` ${it.unit}` : ""}
                  {it.known && <span className="ing-have"> · יש {it.have}</span>}
                </b>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" disabled={busy} onClick={toShopping}>
            <MI.cart />הוספת החסרים לרשימת הקניות
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }}
            onClick={() => {
              downloadTable({
                file: "מצרכים", sheet: "מצרכים",
                title: `מצרכים ל-${plan.heads} סועדים · ${plan.dishes.map((d) => d.name).join(", ")}`,
                header: ["מצרך", "כמות", "יחידה", "במלאי", "חסר"],
                rows: plan.items.map((i) => [i.name, i.qty ?? "לפי הטעם", i.unit || "",
                  i.known ? i.have : "לא נמצא", i.short || ""]),
                widths: [26, 10, 10, 10, 8],
              });
              say("הקובץ ירד");
            }}>הורדה לאקסל</button>
          <div style={{ height: 40 }} />
        </>
      )}
    </>
  );
}

/* ---------- טופס מנה ---------- */
function DishForm({ initial, defaultBase, say, onDone, onCancel }) {
  /* ⚠ בלי "סוג". מנה היא שם, כמות אנשים ומצרכים — סיווג
     שאיש אינו מסנן לפיו הוא שדה שצריך למלא בלי סיבה. */
  const [f, setF] = useState({
    name: initial?.name || "",
    baseHeads: String(initial?.baseHeads || defaultBase),
    items: initial?.items || "", how: initial?.how || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const parsed = parseItems(f.items);

  const save = () => {
    if (busy || !f.name.trim()) return;
    setBusy(true);
    const call = initial
      ? api.editDish({ dishId: initial.id, ...f })
      : api.addDish(f);
    call.then(() => { say(initial ? "המנה עודכנה" : "המנה נוספה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy || !initial) return;
    setBusy(true);
    api.deleteDish(initial.id)
      .then(() => { say("המנה נמחקה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <MI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת מנה" : "מנה חדשה"}</div>

      <div className="card">
        <div className="fld">
          <label>שם המנה</label>
          <input value={f.name} onChange={set("name")} disabled={busy} placeholder="למשל: שניצל" />
        </div>

        <div className="fld">
          <label>המצרכים למטה הם עבור כמה אנשים</label>
          <input value={f.baseHeads} onChange={set("baseHeads")} disabled={busy} inputMode="numeric" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            ⚠ זה המספר שכל הכמויות מתייחסות אליו. כמות אחרת מחושבת ממנו בהכפלה.
          </div>
        </div>

        <div className="fld">
          <label>מצרכים</label>
          <textarea value={f.items} onChange={set("items")} disabled={busy} rows={6}
            placeholder={"שורה לכל מצרך, למשל:\nחזה עוף 6 קילו\nביצים 20\nמלח"} />
          {parsed.length > 0 && (
            <div className="ing-prev">
              {parsed.map((it, i) => (
                <span key={i}>{it.name} <b>{qty(it.qty)}</b>{it.unit ? ` ${it.unit}` : ""}</span>
              ))}
            </div>
          )}
        </div>

        <div className="fld">
          <label>הוראות הכנה</label>
          <textarea value={f.how} onChange={set("how")} disabled={busy} rows={5} />
        </div>

        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {initial && (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            disabled={busy} onClick={remove}>מחיקת המנה</button>
        )}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}
