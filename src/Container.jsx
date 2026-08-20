/* ============================================================
   ציוד המכינה — מכולה וניקיון
   ------------------------------------------------------------
   קובץ נפרד: תחום משלו, לא מטבח ולא נוכחות. הדף מוצג לאחראי
   המכולה (התפקיד נקבע במסך "בעלי תפקידים") — וההרשאה נאכפת
   בשרת בכל נקודת קצה.

   ⚠ מסך אחד לשני התחומים, לפי prop אחד (area). מכולה וניקיון
     הם אותה טבלה בדיוק עם אותן פעולות; שני עותקים של המסך היו
     נפרדים זה מזה בתיקון הראשון שנעשה רק באחד מהם.

   שלושה חלקים: הציוד עצמו (מתכלה / תמידי, עריכה, הוספה
   ומחיקה), המפתח — כמה צריך להיות מכל פריט — ורשימת קניות
   שנבנית ידנית או אוטומטית מהחוסרים ביחס למפתח.
   ============================================================ */

import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable, shareText } from "./excel.js";
import { AREA, missingFor } from "../shared/container-boards.js";

/* מה שמשתנה בין שני התחומים: כותרת, תמונה וניסוחים.
   ⚠ המסך עצמו זהה — אותה טבלה, אותו מפתח, אותה רשימת קניות. */
const AREA_LOOK = {
  [AREA.container]: {
    title: "ציוד מכולה", photo: "/photos/container.jpg",
    loading: "טוען את המכולה", file: "ציוד-מכולה", shopFile: "רשימת-קניות-מכולה",
  },
  [AREA.cleaning]: {
    title: "ציוד ניקיון", photo: null,
    loading: "טוען את ציוד הניקיון", file: "ציוד-ניקיון", shopFile: "רשימת-קניות-ניקיון",
  },
};

const CI = {
  box: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
  cart: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  dl: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  share: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="m8.3 10.8 7.4-3.6M8.3 13.2l7.4 3.6"/></svg>,
};

function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);
  const run = useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e.message || "הטעינה נכשלה"); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

const Loading = ({ what }) => (
  <div className="empty" style={{ paddingTop: 60 }}><div className="e1">{what}…</div></div>
);

function LoadFail({ msg, onRetry }) {
  return (
    <div className="alert a-clay">
      <CI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הנתונים</div>
        <div className="bd">{msg} — מה שמוצג כאן אינו מעודכן ואסור להסתמך עליו.</div>
        {onRetry && <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>נסו שוב</button>}
      </div>
    </div>
  );
}

/* ---------- שורת ציוד — עריכה במקום ---------- */
function EquipRow({ item, say, onChanged }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: item.name, qty: item.qty, kind: item.kind,
    par: item.par == null ? "" : String(item.par),
  });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const missing = missingFor(item);

  const save = () => {
    if (busy || !f.name.trim()) return;
    setBusy(true);
    api.editEquip({ itemId: item.id, name: f.name.trim(), qty: f.qty, kind: f.kind, par: f.par })
      .then(() => { say("נשמר"); setOpen(false); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const remove = () => {
    if (busy) return;
    setBusy(true);
    api.deleteEquip(item.id)
      .then(() => { say("הפריט נמחק"); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button className="st-row" style={{ borderBottom: "none" }} onClick={() => setOpen(!open)}>
        <div className="st-main">
          <div className="st-n">{item.name}</div>
          <div className="st-m">
            <span className={"pill " + (item.kind === "מתכלה" ? "p-new" : "p-ok")}>{item.kind}</span>
            {item.par != null && <span>מפתח {item.par}</span>}
            {missing > 0 && <span className="pill p-low">חסר {missing}</span>}
          </div>
        </div>
        <b className="num" style={{ fontSize: 15, fontWeight: 800, flex: "0 0 auto" }}>
          {item.qty || "—"}
        </b>
        <CI.chev style={{ transform: open ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
      </button>

      {open && (
        <div style={{ padding: "0 13px 13px" }}>
          <div className="two">
            <div className="fld">
              <label>שם</label>
              <input value={f.name} disabled={busy}
                onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div className="fld">
              <label>כמות</label>
              <input value={f.qty} disabled={busy}
                onChange={(e) => setF({ ...f, qty: e.target.value })} />
            </div>
          </div>
          <div className="two">
            <div className="fld">
              <label>סוג</label>
              <div className="pick">
                {["מתכלה", "תמידי"].map((k) => (
                  <button type="button" key={k} className={f.kind === k ? "on" : ""} disabled={busy}
                    onClick={() => setF({ ...f, kind: k })}>{k}</button>
                ))}
              </div>
            </div>
            <div className="fld">
              <label>מפתח — כמה צריך להיות</label>
              <input value={f.par} disabled={busy} inputMode="numeric" placeholder="ריק = ללא מפתח"
                onChange={(e) => setF({ ...f, par: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy} onClick={save}>
              {busy ? "…" : "שמירה"}
            </button>
            {confirmDel ? (
              <button className="btn btn-clay btn-sm" style={{ flex: 1 }} disabled={busy} onClick={remove}>
                למחוק לצמיתות?
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: "var(--clay)" }}
                onClick={() => setConfirmDel(true)}>מחיקה</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- בניית רשימת קניות ----------
   preset — כמויות שכבר מולאו מראש (id → כמות). כך "רשימה
   מהחוסרים" נכנסת לאותו מסך במקום להיות מסלול שני משלה. */
function ShoppingBuilder({ equipment, area, say, onDone, onCancel, preset = null, title }) {
  const [picked, setPicked] = useState(preset || {}); // id → qty
  const [extra, setExtra] = useState([]); // {name, qty}
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const list = equipment.filter((x) => !q.trim() || x.name.includes(q.trim()));
  const count = Object.keys(picked).length + extra.filter((x) => x.name.trim()).length;

  const submit = () => {
    if (busy || !count) return;
    setBusy(true);
    const items = [
      ...Object.entries(picked).map(([id, qty]) => ({
        name: (equipment.find((x) => x.id === id) || {}).name, qty,
      })),
      ...extra.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), qty: x.qty })),
    ];
    api.addShopping(items, area)
      .then((r) => { say(`נוצרה רשימה — ${r.created} פריטים`); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <CI.chev style={{ transform: "rotate(180deg)" }} />ביטול
      </button>
      <div className="screen-title">{title || "רשימת קניות חדשה"}</div>

      <div className="sec-label">מהציוד הקיים · הקלידו כמות לבחירה</div>
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש ציוד" />
      <div className="rows" style={{ maxHeight: "40vh", overflowY: "auto" }}>
        {list.map((x) => (
          <div className="st-row" key={x.id}>
            <div className="st-main">
              <div className="st-n">{x.name}</div>
              <div className="st-m">
                <span>במלאי: {x.qty || "—"}</span>
                {x.par != null && <span>· מפתח {x.par}</span>}
              </div>
            </div>
            <input value={picked[x.id] || ""} placeholder="כמות" inputMode="numeric"
              style={{ width: 76, minHeight: 40, background: "var(--bg)",
                       border: "1px solid var(--line2)", borderRadius: 9,
                       padding: "0 10px", fontSize: 14, textAlign: "center" }}
              onChange={(e) => {
                const v = e.target.value;
                setPicked((p) => {
                  const n = { ...p };
                  if (v.trim()) n[x.id] = v; else delete n[x.id];
                  return n;
                });
              }} />
          </div>
        ))}
      </div>

      <div className="sec-label">פריטים חדשים</div>
      {extra.map((x, i) => (
        <div className="two" key={i} style={{ marginBottom: 8 }}>
          <input placeholder="שם המוצר" value={x.name}
            style={{ minHeight: 46, background: "var(--surface)", border: "1px solid var(--line2)",
                     borderRadius: 11, padding: "0 13px", fontSize: 15 }}
            onChange={(e) => setExtra((p) => p.map((y, j) => j === i ? { ...y, name: e.target.value } : y))} />
          <input placeholder="כמות" value={x.qty}
            style={{ minHeight: 46, background: "var(--surface)", border: "1px solid var(--line2)",
                     borderRadius: 11, padding: "0 13px", fontSize: 15 }}
            onChange={(e) => setExtra((p) => p.map((y, j) => j === i ? { ...y, qty: e.target.value } : y))} />
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 14 }}
        onClick={() => setExtra((p) => [...p, { name: "", qty: "" }])}>
        <CI.plus />שורה חדשה
      </button>

      <button className="btn btn-primary" disabled={busy || !count} onClick={submit}>
        {busy ? "יוצר…" : `יצירת הרשימה (${count === 1 ? "פריט אחד" : count + " פריטים"})`}
      </button>
    </>
  );
}

/* ---------- מפתח: כמה צריך להיות מכל פריט ----------
   ⚠ המפתח נשמר בלוח ולא בקוד — המכינה משנה אותו מדי חודש בלי
     דיפלוי. שמירה קורית ביציאה מהשדה, כדי שאפשר יהיה למלא
     עשרות שורות ברצף בלי ללחוץ "שמירה" בכל אחת. */
function ParTab({ equipment, short, say, onChanged }) {
  const [draft, setDraft] = useState({}); // id → מה שהוקלד וטרם נשמר
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState("");

  const valueOf = (x) => (x.id in draft ? draft[x.id] : (x.par == null ? "" : String(x.par)));

  const commit = (x) => {
    const v = draft[x.id];
    if (v === undefined) return;
    const same = v.trim() === (x.par == null ? "" : String(x.par));
    if (same) { setDraft((d) => { const n = { ...d }; delete n[x.id]; return n; }); return; }
    setBusyId(x.id);
    api.editEquip({ itemId: x.id, par: v.trim() })
      .then(() => { setDraft((d) => { const n = { ...d }; delete n[x.id]; return n; }); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  const list = equipment.filter((x) => !q.trim() || x.name.includes(q.trim()));
  const totalMissing = short.reduce((s, x) => s + x.missing, 0);

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          המפתח הוא הכמות שצריכה להיות במלאי. מה שחסר ביחס אליו הופך
          לרשימת קניות בלחיצה אחת — בסוף כל חודש.
        </div>
      </div>

      {short.length > 0 ? (
        <div className="alert a-amber" style={{ marginBottom: 12 }}>
          <CI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">
              {short.length === 1 ? "פריט אחד מתחת למפתח" : `${short.length} פריטים מתחת למפתח`}
            </div>
            <div className="bd">
              {short.slice(0, 3).map((s) => `${s.item.name} (${s.missing})`).join(" · ")}
              {short.length > 3 ? ` ועוד ${short.length - 3}` : ""}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 12, textAlign: "center",
                                       fontSize: 13.5, fontWeight: 700, color: "var(--muted)" }}>
          {equipment.some((x) => x.par != null)
            ? "אין חוסרים — כל הפריטים במפתח או מעליו"
            : "עדיין לא הוגדר מפתח לאף פריט"}
        </div>
      )}

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש פריט" />

      <div className="grp-h">
        <span>כמות במלאי · מפתח</span>
        <span>{totalMissing ? `סה״כ חסר: ${totalMissing}` : "הקלידו מפתח"}</span>
      </div>

      <div className="rows">
        {list.map((x) => {
          const miss = missingFor(x);
          return (
            <div className="st-row" key={x.id}>
              <div className="st-main">
                <div className="st-n">{x.name}</div>
                <div className="st-m">
                  <span>במלאי: {x.qty || "—"}</span>
                  {miss > 0 && <span className="pill p-low">חסר {miss}</span>}
                  {miss === 0 && x.par != null && <span className="pill p-ok">מלא</span>}
                </div>
              </div>
              <input value={valueOf(x)} inputMode="numeric" placeholder="מפתח"
                disabled={busyId === x.id}
                style={{ width: 78, minHeight: 40, background: "var(--bg)",
                         border: "1px solid var(--line2)", borderRadius: 9,
                         padding: "0 10px", fontSize: 14, textAlign: "center" }}
                onChange={(e) => setDraft((d) => ({ ...d, [x.id]: e.target.value }))}
                onBlur={() => commit(x)}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- הדף המלא ---------- */
export function ContainerPage({ say, area = AREA.container }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => api.getContainer(area), [area]);
  const [sub, setSub] = useState("equip");
  const [kindFilter, setKindFilter] = useState(null);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [building, setBuilding] = useState(null); // null | "manual" | "missing"
  const [nf, setNf] = useState({ name: "", qty: "", kind: "תמידי", par: "" });
  const [savingNew, setSavingNew] = useState(false);

  const look = AREA_LOOK[area] || AREA_LOOK[AREA.container];

  /* ⚠ המסך מוחלף כשעוברים בין מכולה לניקיון — הסינון והחיפוש
     של התחום הקודם היו נשארים ומסתירים חצי מהרשימה. */
  useEffect(() => {
    setSub("equip"); setKindFilter(null); setQ("");
    setAdding(false); setBuilding(null);
  }, [area]);

  if (busy && !data) return <Loading what={look.loading} />;
  if (err) return <LoadFail msg={err} onRetry={reload} />;
  if (!data) return null;

  /* פריטים שחסרים ביחס למפתח, ובכמה */
  const short = data.equipment
    .map((x) => ({ item: x, missing: missingFor(x) }))
    .filter((x) => x.missing > 0);

  if (building) {
    const preset = building === "missing"
      ? Object.fromEntries(short.map((s) => [s.item.id, String(s.missing)]))
      : null;
    return <ShoppingBuilder equipment={data.equipment} area={area} say={say} preset={preset}
      title={building === "missing" ? "רשימת חוסרים לפי מפתח" : "רשימת קניות חדשה"}
      onCancel={() => setBuilding(null)}
      onDone={() => { setBuilding(null); setSub("shop"); reload(); }} />;
  }

  const addNew = () => {
    if (savingNew || !nf.name.trim()) return;
    setSavingNew(true);
    api.addEquip({ name: nf.name.trim(), qty: nf.qty, kind: nf.kind, par: nf.par, area })
      .then(() => { say("הציוד נוסף"); setAdding(false); setNf({ name: "", qty: "", kind: "תמידי", par: "" }); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setSavingNew(false));
  };

  const equipment = data.equipment
    .filter((x) => !kindFilter || x.kind === kindFilter)
    .filter((x) => !q.trim() || x.name.includes(q.trim()));
  const open = data.shopping.filter((x) => x.status === "פתוח");
  const bought = data.shopping.filter((x) => x.status !== "פתוח");

  const setStatus = (item, status) => {
    api.setShoppingStatus({ itemId: item.id, status })
      .then(() => reload())
      .catch((e) => say(e.message));
  };

  return (
    <>
      {look.photo ? (
        /* המכולה האמיתית — הציור שעל הדופן שלה, כרקע הכותרת */
        <div className="photo-head" style={{ backgroundImage: `url(${look.photo})` }}>
          <div className="pht">{look.title}</div>
        </div>
      ) : (
        <div className="screen-title">{look.title}</div>
      )}

      <div className="seg">
        <button className={sub === "equip" ? "on" : ""} onClick={() => setSub("equip")}>
          ציוד ({data.counts.total})
        </button>
        <button className={sub === "par" ? "on" : ""} onClick={() => setSub("par")}>
          מפתח{short.length ? ` (${short.length})` : ""}
        </button>
        <button className={sub === "shop" ? "on" : ""} onClick={() => setSub("shop")}>
          קניות{data.counts.openShopping ? ` (${data.counts.openShopping})` : ""}
        </button>
      </div>

      {sub === "equip" && (
        <>
          <div className="seg">
            <button className={!kindFilter ? "on" : ""} onClick={() => setKindFilter(null)}>הכול</button>
            <button className={kindFilter === "מתכלה" ? "on" : ""} onClick={() => setKindFilter("מתכלה")}>
              מתכלה ({data.counts.consumable})
            </button>
            <button className={kindFilter === "תמידי" ? "on" : ""} onClick={() => setKindFilter("תמידי")}>
              תמידי ({data.counts.permanent})
            </button>
          </div>

          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש ציוד" />

          <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
            onClick={() => {
              downloadTable({
                file: look.file,
                sheet: "ציוד",
                title: `${look.title} — מכינת ניר עוז`,
                header: ["פריט", "כמות", "סוג", "מפתח", "חסר"],
                rows: data.equipment.map((x) => {
                  const m = missingFor(x);
                  return [x.name, x.qty || "", x.kind || "", x.par ?? "", m > 0 ? m : ""];
                }),
                widths: [28, 12, 10, 9, 8],
              });
              say("הקובץ ירד");
            }}><CI.dl />הורדת כל הציוד לאקסל</button>

          {adding && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="two">
                <div className="fld">
                  <label>שם הציוד</label>
                  <input value={nf.name} autoFocus disabled={savingNew}
                    onChange={(e) => setNf({ ...nf, name: e.target.value })} />
                </div>
                <div className="fld">
                  <label>כמות</label>
                  <input value={nf.qty} disabled={savingNew}
                    onChange={(e) => setNf({ ...nf, qty: e.target.value })} />
                </div>
              </div>
              <div className="two">
                <div className="fld">
                  <label>סוג</label>
                  <div className="pick">
                    {["מתכלה", "תמידי"].map((k) => (
                      <button type="button" key={k} className={nf.kind === k ? "on" : ""}
                        onClick={() => setNf({ ...nf, kind: k })}>{k}</button>
                    ))}
                  </div>
                </div>
                <div className="fld">
                  <label>מפתח (לא חובה)</label>
                  <input value={nf.par} disabled={savingNew} inputMode="numeric"
                    onChange={(e) => setNf({ ...nf, par: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" disabled={savingNew || !nf.name.trim()} onClick={addNew}>
                {savingNew ? "מוסיף…" : "הוספת הציוד"}
              </button>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setAdding(false)}>ביטול</button>
            </div>
          )}

          <div className="rows">
            {equipment.map((x) => <EquipRow key={x.id} item={x} say={say} onChanged={reload} />)}
            {equipment.length === 0 && (
              <div className="led-empty">אין ציוד תואם</div>
            )}
          </div>

          <div className="sticky">
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <CI.plus />ציוד חדש
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}

      {sub === "par" && (
        <>
          <ParTab equipment={data.equipment} short={short} say={say} onChanged={reload} />

          <div className="sticky">
            <button className="btn btn-primary" disabled={!short.length}
              onClick={() => setBuilding("missing")}>
              <CI.cart />{short.length
                ? `רשימת קניות מהחוסרים (${short.length})`
                : "אין חוסרים לרשימה"}
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}

      {sub === "shop" && (
        <>
          {open.length === 0 ? (
            <div className="empty">
              <div className="e1">אין רשימת קניות פתוחה</div>
              <div className="e2">בנו רשימה מהציוד הקיים או מפריטים חדשים.</div>
            </div>
          ) : (
            <>
              {/* שיתוף הוא הדרך הנוחה לרשימת קניות — נפתח ישר
                  בוואטסאפ בטלפון; במחשב הטקסט מועתק. אקסל לצידו. */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={async () => {
                    const today = new Date().toLocaleDateString("he-IL");
                    const heading = `רשימת קניות — ${area} (${today})`;
                    const text = heading + "\n" +
                      open.map((x) => `· ${x.name}${x.qty ? " — " + x.qty : ""}`).join("\n");
                    try {
                      const how = await shareText({ title: heading, text });
                      if (how === "copied") say("הרשימה הועתקה — הדביקו בוואטסאפ");
                    } catch { say("השיתוף נכשל"); }
                  }}><CI.share />שיתוף הרשימה</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={() => {
                    downloadTable({
                      file: look.shopFile,
                      sheet: "רשימת קניות",
                      title: `רשימת קניות — ${area}`,
                      header: ["פריט", "כמות", "ביקש"],
                      rows: open.map((x) => [x.name, x.qty || "", x.by || ""]),
                      widths: [26, 12, 16],
                    });
                    say("הקובץ ירד");
                  }}><CI.dl />אקסל</button>
              </div>
              <div className="grp-h"><span>{open.length} פריטים לקנייה</span><span>לחיצה = נקנה</span></div>
              <div className="rows">
                {open.map((x) => (
                  <button className="st-row" key={x.id} onClick={() => setStatus(x, "נקנה")}>
                    <div className="tick" />
                    <div className="st-main">
                      <div className="st-n">{x.name}</div>
                      <div className="st-m"><span>{x.qty || ""}</span>{x.by && <span>· {x.by}</span>}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {bought.length > 0 && (
            <>
              <div className="sec-label">נקנו</div>
              <div className="rows">
                {bought.slice(0, 20).map((x) => (
                  <button className="st-row" key={x.id} onClick={() => setStatus(x, "פתוח")}>
                    <div className="tick on"><span style={{ color: "#fff", fontWeight: 900 }}>✓</span></div>
                    <div className="st-main">
                      <div className="st-n" style={{ color: "var(--faint)", textDecoration: "line-through" }}>
                        {x.name}
                      </div>
                      <div className="st-m"><span>{x.qty || ""}</span></div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="sticky">
            <button className="btn btn-primary" onClick={() => setBuilding("manual")}>
              <CI.cart />רשימת קניות חדשה
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}
    </>
  );
}
