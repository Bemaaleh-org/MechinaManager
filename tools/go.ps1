# ============================================================
# הפעלה — פקודה אחת, בלי גיט ובלי שלבים
# ------------------------------------------------------------
#   לחיצה כפולה על start.cmd, או:  npm run go
#
# מה זה עושה, לפי הסדר:
#   1. מסנכרן את המחשב לענף main שבגיטהאב
#   2. מתקין חבילות אם צריך
#   3. מקים את הלוחות ב-monday אם טרם הוקמו — ודוחף את
#      קבצי המזהים בחזרה, כדי שלא יישארו כשינוי מקומי
#   4. פותח חלון סנכרון אוטומטי ברקע
#   5. מריץ את localhost ופותח את הדפדפן
#
# ⚠ **שינוי מקומי אינו נמחק — הוא נכנס ל-git stash.** קבצי
#   ה-ids מחוללים ומשתנים בכל הרצת seed, וברגע שהם "מלוכלכים"
#   כל pull נחסם. זה בדיוק מה שתקע את העמדה. stash הוא הפיך
#   (git stash list), ומחיקה אינה.
#
# ⚠ **וקומיט מקומי שאינו בענן אינו הולך לאיבוד** — לפני
#   האיפוס נשמר ענף גיבוי בשם backup-<תאריך>, ונאמר על כך.
# ============================================================

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Set-Location (Join-Path $PSScriptRoot "..")

$BRANCH = "main"
$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"

function Say($t, $c = "White") { Write-Host $t -ForegroundColor $c }
function Head($t) {
    Write-Host ""
    Say ("=" * 54) DarkGray
    Say ("  " + $t) Cyan
    Say ("=" * 54) DarkGray
}

Head "1 / 5   סנכרון מגיטהאב"

# ⚠ רשת שנופלת כאן אינה סיבה לעצור. אם כבר יש עותק מקומי,
#   עדיף להריץ אותו מאשר לא להריץ כלום — הרבה מהעבודה אינה
#   דורשת את הקומיט האחרון.
$online = $true
git fetch origin $BRANCH --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    $online = $false
    Say "  ! אין חיבור לגיטהאב — ממשיך עם מה שיש במחשב." Yellow
}

if ($online) {
    $dirty = git status --porcelain
    if ($dirty) {
        Say "  יש שינויים מקומיים. שומר אותם בצד (git stash):" Yellow
        foreach ($line in $dirty) { Say ("     " + $line) DarkGray }
        git stash push -u -q -m "auto-$stamp"
        Say "  ✓ נשמרו. לראות אותם: git stash list" DarkGray
    }

    # ⚠ קומיט מקומי שאינו בענן — ענף גיבוי לפני האיפוס.
    $cur = git rev-parse --abbrev-ref HEAD
    $ahead = git log "origin/$BRANCH..HEAD" --oneline 2>$null
    if ($ahead -and $cur -ne "HEAD") {
        $bk = "backup-$cur-$stamp"
        git branch $bk 2>$null | Out-Null
        Say "  ! היו כאן קומיטים שאינם בענן. נשמרו בענף: $bk" Yellow
    }

    git checkout -B $BRANCH "origin/$BRANCH" --quiet
    $msg = git log -1 --pretty=format:"%s"
    Say ("  ✓ מסונכרן ל-" + $BRANCH + ": " + $msg) Green
}

Head "2 / 5   חבילות"

if (-not (Test-Path "node_modules")) {
    Say "  מתקין (פעם ראשונה, לוקח דקה)..." DarkGray
    npm.cmd install --silent
    if ($LASTEXITCODE -ne 0) { Say "  ✗ ההתקנה נכשלה." Red; Read-Host "Enter לסגירה"; exit 1 }
}
Say "  ✓ מותקן" Green

# ⚠ בלי .env אין טוקן, ואז גם ההקמה וגם השרת נופלים בשגיאה
#   שאינה מסבירה את עצמה. עוצרים כאן ואומרים בדיוק מה חסר.
if (-not (Test-Path ".env")) {
    Say ""
    Say "  ✗ חסר קובץ .env בתיקייה הזו." Red
    Say "    צריך שיהיו בו שתי שורות:" Red
    Say "      MONDAY_TOKEN=..." DarkGray
    Say "      SESSION_SECRET=..." DarkGray
    Read-Host "Enter לסגירה"
    exit 1
}

Head "3 / 5   לוחות monday"

node tools/boards-ready.mjs
if ($LASTEXITCODE -ne 0) {
    Say ""
    Say "  מקים את מה שחסר..." Yellow
    npm.cmd run setup:boards
    if ($LASTEXITCODE -ne 0) {
        Say ""
        Say "  ✗ ההקמה נכשלה. השרת יעלה בכל מקרה, והמסכים החדשים" Red
        Say "    יאמרו 'טרם הוקם' עד שזה יסתדר." Red
        Say ""
    } else {
        # ⚠ **דוחף את קבצי המזהים מיד.** בלי זה הם נשארים
        #   שינוי מקומי, וזה חוסם כל pull עתידי — בדיוק הלולאה
        #   שהעמדה נתקעה בה.
        $changed = git status --porcelain -- shared/
        if ($changed -and $online) {
            Say "  דוחף את קבצי המזהים לענן..." DarkGray
            git add shared/
            git commit -q -m "הקמת הלוחות מהעמדה המקומית"
            git push -q origin "HEAD:$BRANCH"
            if ($LASTEXITCODE -eq 0) { Say "  ✓ נדחפו" Green }
            else { Say "  ! הדחיפה נכשלה — הקומיט קיים מקומית." Yellow }
        }
    }
}

Head "4 / 5   סנכרון אוטומטי ברקע"

# ⚠ חלון נפרד ולא job: הפלט שלו הוא כל התועלת — רואים מתי
#   ירדה עבודה חדשה. job שקט נראה בדיוק כמו job שמת.
Start-Process powershell -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "watch-pull.ps1")
) -WindowStyle Minimized
Say "  ✓ חלון סנכרון פתוח (ממוזער). כל דחיפה תרד לכאן לבד." Green

Head "5 / 5   השרת"

Say "  http://localhost:5173" Cyan
Say "  לעצירה: Ctrl+C" DarkGray
Say ""

# ⚠ פותח את הדפדפן רק אחרי שהשרת באמת עונה. פתיחה מיד
#   נותנת "לא ניתן להתחבר", והמשתמש מסיק שזה נשבר.
Start-Job -ScriptBlock {
    for ($i = 0; $i -lt 40; $i++) {
        try {
            Invoke-WebRequest "http://localhost:5173/" -UseBasicParsing -TimeoutSec 2 | Out-Null
            Start-Process "http://localhost:5173/"
            return
        } catch { Start-Sleep -Milliseconds 500 }
    }
} | Out-Null

npm.cmd run dev
