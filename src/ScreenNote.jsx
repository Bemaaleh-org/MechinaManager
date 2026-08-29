/* ============================================================
   הערת מסך — בלוק טקסט שראש המכינה כותב, בכל מסך
   ------------------------------------------------------------
   ⚠ **בלוק שלא נכתב אינו מוצג בכלל.** לא ריק, לא מסגרת, ולא
     "טרם הוזן" — מסך שמלא בקופסאות ריקות מלמד להתעלם מהן.
     היכן שכן חשוב לראות מה חסר הוא מסך "ניהול תוכן", ורק שם.

   ⚠ **וגם כפתור העריכה מוצג רק לראש המכינה.** מי שאינו רשאי
     לא רואה שום רמז שיש כאן משהו לערוך — ומי שכן, עורך במקום
     שבו הוא רואה את הטקסט בהקשר, ולא במסך אחר.

   ⚠ **קריאה אחת ומטמון מקומי.** `?action=view` מחזיר את כל
     הטקסטים ממילא; הרכיב קורא אותו בלי `admin=1`, וכישלון
     פשוט לא מציג כלום ואינו מפיל את המסך שמארח אותו.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import TextBlock from "./TextBlock.jsx";

export default function ScreenNote({ name, say }) {
  const [block, setBlock] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    api.getChores()
      .then((r) => {
        if (!alive) return;
        setBlock((r.texts || []).find((t) => t.key === name) || null);
        setCanEdit(Boolean(r.me && r.me.headText));
      })
      /* ⚠ נכשל בשקט: טקסט הסבר שלא נטען אינו סיבה להפיל מסך. */
      .catch(() => {});
    return () => { alive = false; };
  }, [name, n]);

  if (!block) return null;
  return (
    <div className="scr-note">
      <TextBlock block={block} canEdit={canEdit} say={say}
        onSaved={() => setN((x) => x + 1)} />
    </div>
  );
}
