/* ============================================================
   רשת ביטחון — מסך אחד שקורס לא מלבין את כל האפליקציה
   ------------------------------------------------------------
   ⚠⚠ **בלי זה, כל שגיאת רינדור בכל מסך מוחקת את המסך כולו.**
     זה מה שקרה בפועל: `<I.lock />` על מפתח שאינו קיים הפיל
     את **כל המגירה**, והמשתמש קיבל דף לבן בלי שום רמז למה.

     דף לבן הוא הכשל הגרוע ביותר האפשרי: אין בו הודעה, אין
     ממנו יציאה, ואי אפשר לדווח עליו כי אין מה לתאר. זה
     עיקרון 6 בצורתו הקיצונית — כשל שנראה כמו כלום.

   ⚠ **הגבול נמצא סביב תוכן המסך ולא סביב האפליקציה.** מסגרת
     שעוטפת הכול הייתה מחליפה דף לבן בדף שגיאה לבן — עדיין בלי
     ניווט וללא מוצא. כאן המגירה, הכותרת והניווט **נשארים
     חיים**, ורק גוף המסך מוחלף בהודעה.

   ⚠ **`resetKey` מאפס את המצב במעבר מסך.** בלי זה, מסך אחד
     שקרס היה משאיר את ההודעה על המסך גם אחרי שהמשתמש ניווט
     למקום אחר — כלומר קריסה אחת הייתה נראית כמו אפליקציה
     מתה.

   ⚠ **והשגיאה נרשמת לקונסול ואינה נבלעת.** מפתח שיפתח כלי
     פיתוח חייב לראות את מה שקרה; המשתמש רואה משפט בעברית.
   ============================================================ */
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    /* ⚠ לא נבלע. זה מה שיאפשר להבין מה קרה. */
    console.error("[מסך קרס]", err, info && info.componentStack);
  }

  componentDidUpdate(prev) {
    /* ⚠ מעבר מסך מנקה את השגיאה — אחרת קריסה אחת נראית
       כמו אפליקציה מתה. */
    if (this.state.err && prev.resetKey !== this.props.resetKey) {
      this.setState({ err: null });
    }
  }

  render() {
    if (!this.state.err) return this.props.children;

    return (
      <div className="eb">
        <div className="eb-t">המסך הזה נתקל בתקלה</div>
        <div className="eb-b">
          שאר המערכת עובדת — אפשר לפתוח מסך אחר מהתפריט.
          {this.props.what ? ` (${this.props.what})` : ""}
        </div>
        <div className="eb-m">{String(this.state.err && this.state.err.message || this.state.err)}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => this.setState({ err: null })}>
          לנסות שוב
        </button>
      </div>
    );
  }
}
