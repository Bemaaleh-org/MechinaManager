/* ============================================================
   Service Worker — התראות לטלפון בלבד
   ------------------------------------------------------------
   ⚠⚠ **הוא אינו מטמין דבר, ובכוונה.** Service Worker שמטמין
     קבצים הופך כל דיפלוי לשאלה "איזו גרסה המשתמש רואה", וזו
     בדיוק סוג התקלה שאי אפשר לשחזר: אצל אחד עובד ואצל השני
     לא, ושניהם באותה כתובת. כאן הוא עושה דבר אחד — מקבל
     נקישה ומציג התראה.

   ⚠ **הדחיפה מגיעה ריקה**, וה-SW הוא זה שפונה לשרת ושואל מה
     חדש. כך שום נתון של חניך אינו עובר דרך גוגל או אפל.

   ⚠ **ואם השליפה נכשלת — מוצגת הודעה כללית ולא כלום.** דפדפן
     שמקבל דחיפה ואינו מציג התראה עלול לבטל את ההרשאה, וגרוע
     מזה: המשתמש יודע שמשהו קרה ולא יודע מה.
   ============================================================ */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let title = "מכינת ניר עוז";
    let body = "יש עדכון חדש במערכת";
    let count = 0;

    try {
      const r = await fetch("/api/auth?action=notify", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (r.ok) {
        const d = await r.json();
        const fresh = (d.notes || []).filter((n) => n.fresh);
        count = fresh.length;
        if (count === 1) {
          title = fresh[0].title || title;
          body = fresh[0].body || "";
        } else if (count > 1) {
          title = `${count} עדכונים חדשים`;
          body = fresh.slice(0, 3).map((n) => n.title).join(" · ");
        } else {
          /* ⚠ אין מה להציג — לא מציגים התראה ריקה. */
          return;
        }
      }
    } catch (e) {
      /* נשארים עם ההודעה הכללית */
    }

    await self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      dir: "rtl",
      lang: "he",
      /* ⚠ תג קבוע — התראה חדשה מחליפה את הקודמת ולא מצטברת
         לעשר התראות על אותו דבר. */
      tag: "mechina-notify",
      renotify: true,
      data: { count },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    /* ⚠ חלון פתוח מקבל מיקוד במקום להיפתח שוב — שתי לשוניות
       של אותה אפליקציה הן בדיוק מה שגורם לאנשים לאבד מה שהקלידו. */
    for (const c of all) {
      if (c.url.includes(self.location.origin)) return c.focus();
    }
    return self.clients.openWindow("/");
  })());
});
