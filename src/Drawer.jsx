/* ============================================================
   מגירת ניווט — שלושת הקווים
   ------------------------------------------------------------
   רכיב אחד לכל המשתמשים: מנהל, תורן וחניך מזינים אליו רשימת
   יעדים משלהם, והוא רק מציג ומנווט. אין כאן שום ידיעה על
   הרשאות — מי שמרכיב את הרשימה כבר החליט מה מוצג.

   הניווט התחתון נשאר: הוא הגישה המהירה לארבעת היעדים
   התכופים, והמגירה היא המפה המלאה — כולל מסכים שאין להם
   מקום בסרגל, והיציאה.
   ============================================================ */

import React, { useEffect } from "react";

export function Hamburger({ onClick }) {
  return (
    <button className="hamb" aria-label="תפריט" onClick={onClick}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

/**
 * groups: [{ label?, items: [{ key, label, icon, active, badge?, onClick }] }]
 */
export function Drawer({ open, onClose, logo, title, subtitle, groups, user, onLogout }) {
  /* Escape סוגר; הגלילה של הדף נעצרת כשהמגירה פתוחה */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <nav className="drawer" onClick={(e) => e.stopPropagation()} aria-label="ניווט ראשי">
        <div className="drawer-h">
          <div className="drawer-brand">
            {logo && <img src={logo} alt="" />}
            <div>
              <b>{title}</b>
              {subtitle && <span>{subtitle}</span>}
            </div>
          </div>
          <button className="drawer-x" aria-label="סגירה" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.3" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {groups.map((g, i) => (
            <div className="drawer-group" key={g.label || i}>
              {g.label && <div className="drawer-gl">{g.label}</div>}
              {g.items.map((it) => (
                <button key={it.key}
                  className={"drawer-item" + (it.active ? " on" : "")}
                  onClick={() => { onClose(); it.onClick(); }}>
                  {it.icon}
                  <span>{it.label}</span>
                  {it.badge > 0 && <b className="drawer-badge num">{it.badge}</b>}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="drawer-f">
          {user && (
            <div className="drawer-user">
              <b>{user.name}</b>
              {user.role && <span>{user.role}</span>}
            </div>
          )}
          {onLogout && (
            <button className="drawer-out" onClick={() => { onClose(); onLogout(); }}>
              יציאה מהמערכת
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
