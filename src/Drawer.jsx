/* ============================================================
   תפריט המבורגר — מגירת ניווט צדית
   ------------------------------------------------------------
   רכיב אחד לשלושת השלדים: מנהל, תורן וחניך. כל שלד מרכיב את
   רשימת הפריטים שלו ומוסר אותה כ-props — למגירה אין ידע על
   תפקידים והרשאות, והאכיפה ממילא בשרת.

   items: מערך של פריטי ניווט { key, label, icon, on, badge, go }
          או כותרת קבוצה { sec: "טקסט" }.
   user:  { name, role, onIdentity?, onLogout } — מוצג בתחתית.
          onIdentity פותח את מסך הזהות (במטבח); בלעדיו השורה
          היא תצוגה בלבד.
   ============================================================ */

import React, { useEffect } from "react";

/* שלושת הקווים — הכפתור שפותח את המגירה, מיובא ע"י השלדים */
export const MenuIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </svg>
);

const DIcon = {
  x: (p) => (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.3" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  out: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 4H5v16h4" /><path d="M13 8l4 4-4 4M17 12H8" /></svg>
  ),
};

const initials = (name) =>
  String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("");

export function Drawer({ open, onClose, logo, title, subtitle, items, user }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="תפריט ניווט">
        <div className="drawer-h">
          {logo && (
            <span className="drawer-logo"><img src={logo} alt="" /></span>
          )}
          <div className="drawer-t">
            <b>{title}</b>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button className="drawer-x" onClick={onClose} aria-label="סגירת התפריט">
            <DIcon.x />
          </button>
        </div>

        <nav className="drawer-list">
          {items.map((it, i) =>
            it.sec !== undefined ? (
              <div className="drawer-sec" key={"sec" + i}>{it.sec}</div>
            ) : (
              <button key={it.key} className={"drawer-item" + (it.on ? " on" : "")}
                onClick={() => { onClose(); it.go(); }}>
                {it.icon && it.icon()}
                <span className="drawer-lab">{it.label}</span>
                {it.badge ? <span className="bdg num">{it.badge}</span> : null}
              </button>
            )
          )}
        </nav>

        {user && (
          <div className="drawer-foot">
            <button className="drawer-id" disabled={!user.onIdentity}
              onClick={user.onIdentity ? () => { onClose(); user.onIdentity(); } : undefined}>
              <span className="drawer-av">{initials(user.name)}</span>
              <span className="drawer-who">
                <b>{user.name}</b>
                <span>{user.role}</span>
              </span>
            </button>
            <button className="drawer-out" onClick={user.onLogout}>
              <DIcon.out />התנתקות
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
