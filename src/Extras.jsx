/* ============================================================
   שלושה מסכים שחולקים את אותם עוזרים
   ------------------------------------------------------------
   בוגרים · אירוח קבוצות · השאלת ציוד

   ⚠ יושבים בקובץ אחד כי שלושתם אותו דפוס בדיוק — רשימה,
     כרטיס, טופס — ולא כי הם קשורים זה לזה. פיצול לשלושה
     קבצים היה משכפל את useLoad ואת מצבי הטעינה שלוש פעמים.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable } from "./excel.js";

const XI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  dl: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  users: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.4-1-4.1-2.6-5"/></svg>,
  home: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/></svg>,
  box: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

const dm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
const dmy = (iso) => (iso ? `${dm(iso)}/${iso.slice(0, 4)}` : "");

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

/* ⚠ כשל טעינה נראה אחרת ממצב ריק — עיקרון 6. */
const Fail = ({ err, onRetry }) => (
  <div className="alert a-clay"><XI.warn />
    <div style={{ flex: 1 }}>
      <div className="ttl">{err.setupRequired ? "הלוח טרם הוקם" : "לא הצלחנו לטעון"}</div>
      <div className="bd">{err.message}</div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>נסו שוב</button>
    </div>
  </div>
);
const Wait = () => <><div className="skel skel-card" /><div className="skel skel-card" /></>;

const Field = ({ label, children, hint }) => (
  <div className="fld">
    <label>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>{hint}</div>}
  </div>
);

const Pick = ({ label, options, value, onChange, disabled }) => (
  <Field label={label}>
    <div className="pick pick-wrap">
      {options.map((o) => (
        <button type="button" key={o} disabled={disabled}
          className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  </Field>
);

/* ============================================================
   בוגרים
   ------------------------------------------------------------
   ⚠ המסך הזה הוא סטטיסטיקה, לא תיק אישי. הוא מציג לאן הבוגרים
     התגייסו ומתי — ואין בו תעודות זהות, מיילים או מידע רפואי,
     גם כשהם קיימים בקבצים אחרים של המכינה.
   ============================================================ */
export function AlumniPage({ say }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => api.getAlumni(), []);
  const [cycle, setCycle] = useState(null);
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState(null);

  if (busy && !data) return <><div className="screen-title">בוגרים</div><Wait /></>;
  if (err) return <><div className="screen-title">בוגרים</div><Fail err={err} onRetry={reload} /></>;
  if (!data) return null;

  if (adding || edit) {
    return <AlumniForm initial={edit} branches={data.branches} cycles={data.cycles} say={say}
      onDone={() => { setAdding(false); setEdit(null); reload(); }}
      onCancel={() => { setAdding(false); setEdit(null); }} />;
  }

  const list = data.alumni.filter((a) => !cycle || a.cycle === cycle);
  const maxBranch = Math.max(...data.byBranch.map((b) => b.n), 1);

  return (
    <>
      <div className="screen-title">בוגרים</div>

      <div className="band">
        <div className="band-h">המחזורים שסיימו</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{data.count}</div>
            <div className="band-l">בוגרים</div>
          </div>
          <div className="band-c">
            <div className="band-n">{data.byBranch.filter((b) => b.key !== "לא ידוע").length}</div>
            <div className="band-l">זרועות</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (data.unknown ? " warn" : " ok")}>{data.unknown}</div>
            <div className="band-l">טרם ידוע</div>
          </div>
        </div>
      </div>

      {/* ---------- פילוח לפי זרוע ----------
          ⚠ פס לכל זרוע ולא עוגה: השוואה בין אורכים מדויקת
            הרבה יותר מהשוואה בין זוויות. */}
      <div className="sec-label">לפי זרוע</div>
      <div className="card" style={{ marginBottom: 14 }}>
        {data.byBranch.map((b) => (
          <div className="brw" key={b.key}>
            <span className="brw-k">{b.key}</span>
            <span className="brw-bar">
              <span style={{ width: `${(b.n / maxBranch) * 100}%` }} />
            </span>
            <b className="num">{b.n}</b>
          </div>
        ))}
      </div>

      {data.cycles.length > 1 && (
        <div className="seg">
          <button className={!cycle ? "on" : ""} onClick={() => setCycle(null)}>הכול</button>
          {data.cycles.map((c) => (
            <button key={c} className={cycle === c ? "on" : ""} onClick={() => setCycle(c)}>{c}</button>
          ))}
        </div>
      )}

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 10 }}
        onClick={() => {
          downloadTable({
            file: "בוגרים", sheet: "בוגרים", title: "בוגרי מכינת ניר עוז",
            header: ["שם", "מחזור", "תפקיד / יחידה", "זרוע", "תאריך גיוס", "מקום מגורים"],
            rows: list.map((a) => [a.name, a.cycle || "", a.unit || "", a.branch || "",
              a.enlist ? dmy(a.enlist) : "", a.city || ""]),
            widths: [20, 12, 28, 14, 13, 16],
          });
          say("הקובץ ירד");
        }}><XI.dl />הורדה לאקסל</button>

      <div className="rows">
        {list.map((a) => (
          <button className="st-row" key={a.id} onClick={() => setEdit(a)}>
            <div className="tile sm"><XI.users /></div>
            <div className="st-main">
              <div className="st-n">{a.name}</div>
              <div className="st-m">
                {a.unit ? <span>{a.unit}</span> : <span className="pill p-new">טרם ידוע</span>}
                {a.branch && <span>· {a.branch}</span>}
                {a.enlist && <span className="num">· {dmy(a.enlist)}</span>}
              </div>
            </div>
            <XI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
          </button>
        ))}
      </div>

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <XI.plus />בוגר חדש
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function AlumniForm({ initial, branches, cycles, say, onDone, onCancel }) {
  const [f, setF] = useState({
    name: initial?.name || "", cycle: initial?.cycle || "מחזור א׳",
    unit: initial?.unit || "", branch: initial?.branch || "",
    enlist: initial?.enlist || "", birthday: initial?.birthday || "",
    city: initial?.city || "", note: initial?.note || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy || !f.name.trim()) return;
    setBusy(true);
    const call = initial ? api.editAlumni({ id: initial.id, ...f }) : api.addAlumni(f);
    call.then(() => { say(initial ? "עודכן" : "הבוגר נוסף"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const ALL_BRANCHES = [...new Set([...(branches || []),
    "חי״ר", "שריון", "תותחנים", "חיל האוויר", "חיל הים", "מודיעין", "רפואה", "חינוך", "אחר"])];

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <XI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת בוגר" : "בוגר חדש"}</div>

      <div className="card">
        <Field label="שם"><input value={f.name} onChange={set("name")} disabled={busy} /></Field>
        <Pick label="מחזור" options={[...new Set([...(cycles || []), "מחזור א׳", "מחזור ב׳"])]}
          value={f.cycle} onChange={(v) => setF({ ...f, cycle: v })} disabled={busy} />
        <Field label="תפקיד / יחידה" hint="ריק = טרם ידוע. עדיף ריק על ניחוש.">
          <input value={f.unit} onChange={set("unit")} disabled={busy} />
        </Field>
        <Pick label="זרוע" options={ALL_BRANCHES} value={f.branch}
          onChange={(v) => setF({ ...f, branch: v })} disabled={busy} />
        <div className="two">
          <Field label="תאריך גיוס">
            <input type="date" value={f.enlist} onChange={set("enlist")} disabled={busy} />
          </Field>
          <Field label="תאריך לידה">
            <input type="date" value={f.birthday} onChange={set("birthday")} disabled={busy} />
          </Field>
        </div>
        <Field label="מקום מגורים"><input value={f.city} onChange={set("city")} disabled={busy} /></Field>
        <Field label="הערה"><input value={f.note} onChange={set("note")} disabled={busy} /></Field>

        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============================================================
   אירוח קבוצות
   ============================================================ */
export function HostingPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getHosting(), []);
  const [form, setForm] = useState(null);

  if (busy && !data) return <><div className="screen-title">אירוח קבוצות</div><Wait /></>;
  if (err) return <><div className="screen-title">אירוח קבוצות</div><Fail err={err} onRetry={reload} /></>;
  if (!data) return null;

  if (form) {
    return <HostingForm initial={form.id ? form : null} options={data.options} say={say}
      onDone={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />;
  }

  return (
    <>
      <div className="screen-title">אירוח קבוצות</div>

      <div className="band">
        <div className="band-h">מצב האירוחים</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{data.counts.upcoming}</div>
            <div className="band-l">אירוחים קרובים</div>
          </div>
          <div className="band-c">
            <div className="band-n">{data.counts.sleeping}</div>
            <div className="band-l">עם לינה</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (data.counts.owed ? " warn" : " ok")}>{data.counts.owed}</div>
            <div className="band-l">מטלות פתוחות</div>
          </div>
        </div>
      </div>

      {data.hosting.length === 0 ? (
        <div className="empty tone-1">
          <div className="e-ico"><XI.home /></div>
          <div className="e1">אין אירוחים רשומים</div>
          <div className="e2">קבוצה שמגיעה למכינה — פותחים לה כרטיס כאן.</div>
        </div>
      ) : (
        <div className="rows">
          {data.hosting.map((h) => {
            const owed = h.status !== "בוטל" && (h.briefed !== "כן" || h.handback !== "כן");
            return (
              <button className={"st-row " + (owed ? "tone-3" : "tone-1")} key={h.id}
                onClick={() => setForm(h)}>
                <div className="tile sm"><XI.home /></div>
                <div className="st-main">
                  <div className="st-n">{h.title}</div>
                  <div className="st-m">
                    <span className={"pill " + (h.status === "בוטל" ? "p-low" : "p-new")}>{h.status || "—"}</span>
                    {h.from && <span className="num">{dm(h.from)}{h.to && h.to !== h.from ? `–${dm(h.to)}` : ""}</span>}
                    {h.people != null && <span>· {h.people} איש</span>}
                    {h.sleeping && <span>· {h.sleeping}</span>}
                  </div>
                  {owed && (
                    <div className="sf-pend">
                      {[h.briefed !== "כן" && "טרם תודרך",
                        h.handback !== "כן" && "המבנים טרם הוחזרו"].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <XI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <XI.plus />אירוח חדש
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function HostingForm({ initial, options, say, onDone, onCancel }) {
  const [f, setF] = useState({
    title: initial?.title || "", org: initial?.org || "",
    contact: initial?.contact || "", phone: initial?.phone || "",
    from: initial?.from || "", to: initial?.to || "",
    people: initial?.people != null ? String(initial.people) : "",
    sleeping: initial?.sleeping || "לא לנים",
    buildings: initial?.buildings || "", meals: initial?.meals || "",
    status: initial?.status || "בתיאום",
    briefed: initial?.briefed || "לא", handback: initial?.handback || "לא",
    note: initial?.note || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy || !f.title.trim()) return;
    setBusy(true);
    const call = initial ? api.editHosting({ id: initial.id, ...f }) : api.addHosting(f);
    call.then(() => { say(initial ? "עודכן" : "האירוח נרשם"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy || !initial) return;
    setBusy(true);
    api.deleteHosting(initial.id)
      .then(() => { say("האירוח נמחק"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <XI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת אירוח" : "אירוח חדש"}</div>

      <div className="card">
        <Field label="כותרת" hint="למשל: בית ספר אמית · שכבת י׳">
          <input value={f.title} onChange={set("title")} disabled={busy} />
        </Field>
        <Field label="הגוף המתארח"><input value={f.org} onChange={set("org")} disabled={busy} /></Field>
        <div className="two">
          <Field label="איש קשר"><input value={f.contact} onChange={set("contact")} disabled={busy} /></Field>
          <Field label="טלפון">
            <input value={f.phone} onChange={set("phone")} disabled={busy} inputMode="tel" placeholder="050-0000000" />
          </Field>
        </div>
        <div className="two">
          <Field label="מתאריך"><input type="date" value={f.from} onChange={set("from")} disabled={busy} /></Field>
          <Field label="עד תאריך"><input type="date" value={f.to} onChange={set("to")} disabled={busy} /></Field>
        </div>
        <div className="two">
          <Field label="מספר משתתפים">
            <input value={f.people} onChange={set("people")} disabled={busy} inputMode="numeric" />
          </Field>
          <div />
        </div>
        <Pick label="לינה" options={options.sleeping} value={f.sleeping}
          onChange={(v) => setF({ ...f, sleeping: v })} disabled={busy} />
        <Field label="מבנים" hint="אילו מבנים נמסרו לשימושם">
          <input value={f.buildings} onChange={set("buildings")} disabled={busy} />
        </Field>
        <Field label="ארוחות" hint="למשל: צהריים וערב ביום הראשון">
          <input value={f.meals} onChange={set("meals")} disabled={busy} />
        </Field>
        <Pick label="סטטוס" options={options.status} value={f.status}
          onChange={(v) => setF({ ...f, status: v })} disabled={busy} />

        {/* ⚠ שתי מטלות בשני קצות האירוח, ולכן שני שדות. */}
        <div className="two">
          <Pick label="תודרך" options={["כן", "לא"]} value={f.briefed}
            onChange={(v) => setF({ ...f, briefed: v })} disabled={busy} />
          <Pick label="המבנים הוחזרו" options={["כן", "לא"]} value={f.handback}
            onChange={(v) => setF({ ...f, handback: v })} disabled={busy} />
        </div>

        <Field label="הערות">
          <textarea value={f.note} onChange={set("note")} disabled={busy} rows={3} />
        </Field>

        <button className="btn btn-primary" disabled={busy || !f.title.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {initial && (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            disabled={busy} onClick={remove}>מחיקת האירוח</button>
        )}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============================================================
   השאלת ציוד
   ============================================================ */
export function LoansPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getLoans(), []);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("open");

  if (busy && !data) return <><div className="screen-title">השאלת ציוד</div><Wait /></>;
  if (err) return <><div className="screen-title">השאלת ציוד</div><Fail err={err} onRetry={reload} /></>;
  if (!data) return null;

  if (form) {
    return <LoanForm initial={form.id ? form : null} directions={data.directions} say={say}
      onDone={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />;
  }

  const shown = filter === "open" ? data.loans.filter((l) => !l.back)
    : filter === "late" ? data.loans.filter((l) => l.late)
    : data.loans;

  return (
    <>
      <div className="screen-title">השאלת ציוד</div>

      <div className="band">
        <div className="band-h">מה בחוץ</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{data.counts.open}</div>
            <div className="band-l">פתוחות</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (data.counts.late ? " warn" : " ok")}>{data.counts.late}</div>
            <div className="band-l">באיחור</div>
          </div>
          <div className="band-c">
            <div className="band-n">{data.counts.ours}</div>
            <div className="band-l">הושאל מאיתנו</div>
          </div>
        </div>
      </div>

      <div className="seg">
        <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>
          פתוחות ({data.counts.open})
        </button>
        <button className={filter === "late" ? "on" : ""} onClick={() => setFilter("late")}>
          באיחור ({data.counts.late})
        </button>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>הכול</button>
      </div>

      {shown.length === 0 ? (
        <div className="empty tone-1">
          <div className="e-ico"><XI.box /></div>
          <div className="e1">{filter === "late" ? "אין השאלות באיחור" : "אין השאלות פתוחות"}</div>
          <div className="e2">ציוד שיוצא או נכנס — פותחים לו כרטיס מעקב.</div>
        </div>
      ) : (
        <div className="rows">
          {shown.map((l) => (
            <button className={"st-row " + (l.late ? "tone-8" : l.back ? "tone-1" : "tone-6")}
              key={l.id} onClick={() => setForm(l)}>
              <div className="tile sm"><XI.box /></div>
              <div className="st-main">
                <div className="st-n">{l.title}</div>
                <div className="st-m">
                  <span className="pill p-new">{l.direction || "—"}</span>
                  {l.party && <span>· {l.party}</span>}
                  {l.due && <span className="num">· להחזרה {dm(l.due)}</span>}
                </div>
                {l.late && <div className="sf-pend">באיחור — טרם חזר</div>}
                {l.back && <div className="st-m"><span>חזר {dmy(l.back)}</span></div>}
              </div>
              <XI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
            </button>
          ))}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <XI.plus />השאלה חדשה
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function LoanForm({ initial, directions, say, onDone, onCancel }) {
  const [f, setF] = useState({
    title: initial?.title || "", party: initial?.party || "",
    direction: initial?.direction || directions[0],
    items: initial?.items || "", out: initial?.out || "",
    due: initial?.due || "", back: initial?.back || "",
    contact: initial?.contact || "", note: initial?.note || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy || !f.title.trim()) return;
    setBusy(true);
    const call = initial ? api.editLoan({ id: initial.id, ...f }) : api.addLoan(f);
    call.then(() => { say(initial ? "עודכן" : "ההשאלה נרשמה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  /* ⚠ "חזר היום" הוא הפעולה השכיחה, ולכן כפתור ולא שדה תאריך
     שצריך למלא. התאריך עדיין ניתן לעריכה למי שמדווח בדיעבד. */
  const markBack = () => {
    const today = new Date().toISOString().slice(0, 10);
    setF((p) => ({ ...p, back: today }));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <XI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת השאלה" : "השאלה חדשה"}</div>

      <div className="card">
        <Field label="כותרת" hint="למשל: אוהלים לבית ספר שדות">
          <input value={f.title} onChange={set("title")} disabled={busy} />
        </Field>
        <Pick label="כיוון" options={directions} value={f.direction}
          onChange={(v) => setF({ ...f, direction: v })} disabled={busy} />
        <div className="two">
          <Field label="הגוף"><input value={f.party} onChange={set("party")} disabled={busy} /></Field>
          <Field label="איש קשר"><input value={f.contact} onChange={set("contact")} disabled={busy} /></Field>
        </div>
        <Field label="הציוד" hint="שורה לכל פריט">
          <textarea value={f.items} onChange={set("items")} disabled={busy} rows={4} />
        </Field>
        <div className="two">
          <Field label="תאריך יציאה"><input type="date" value={f.out} onChange={set("out")} disabled={busy} /></Field>
          <Field label="תאריך החזרה"><input type="date" value={f.due} onChange={set("due")} disabled={busy} /></Field>
        </div>
        <Field label="חזר בפועל" hint="ריק = עדיין בחוץ">
          <input type="date" value={f.back} onChange={set("back")} disabled={busy} />
        </Field>
        {!f.back && (
          <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 13 }}
            disabled={busy} onClick={markBack}>סימון שחזר היום</button>
        )}
        <Field label="הערות"><input value={f.note} onChange={set("note")} disabled={busy} /></Field>

        <button className="btn btn-primary" disabled={busy || !f.title.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}
