# ============================================================
# סנכרון אוטומטי מהענן — מריצים פעם אחת ומשאירים פתוח
# ------------------------------------------------------------
#   npm run sync
#
# בודק כל 15 שניות אם נדחפה עבודה חדשה לענף, ומושך אותה
# אוטומטית. שרת הפיתוח (vite) קולט את הקבצים שהשתנו ומרענן
# את הדפדפן לבד — ככה עבודה שנעשית בסשן ענן מופיעה
# ב-localhost בלי שום pull ידני.
#
# בטיחות:
#   - מושך רק fast-forward (--ff-only): לעולם לא דורס עבודה
#     מקומית ולא יוצר מיזוגים אוטומטיים.
#   - אם יש שינויים מקומיים לא שמורים — עוצר ומחכה, עם הודעה.
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
Set-Location (Join-Path $PSScriptRoot "..")

$branch = git rev-parse --abbrev-ref HEAD
Write-Host ""
Write-Host "  מעקב אחרי הענף: $branch" -ForegroundColor Cyan
Write-Host "  כל דחיפה מהענן תופיע כאן ותיכנס ל-localhost אוטומטית." -ForegroundColor Cyan
Write-Host "  לעצירה: Ctrl+C" -ForegroundColor DarkGray
Write-Host ""

$warned = $false
while ($true) {
    git fetch origin $branch --quiet 2>$null

    $local  = git rev-parse "HEAD" 2>$null
    $remote = git rev-parse "origin/$branch" 2>$null

    if ($local -and $remote -and ($local -ne $remote)) {
        $dirty = git status --porcelain 2>$null
        if ($dirty) {
            if (-not $warned) {
                Write-Host "  ! יש שינויים מקומיים לא שמורים — לא מושך עד שיטופלו." -ForegroundColor Yellow
                $warned = $true
            }
        } else {
            $warned = $false
            $out = git pull --ff-only origin $branch 2>&1
            if ($LASTEXITCODE -eq 0) {
                $msg = git log -1 --pretty=format:"%s"
                Write-Host ("  ✓ {0}  {1}" -f (Get-Date -Format "HH:mm:ss"), $msg) -ForegroundColor Green
            } else {
                Write-Host "  ! המשיכה נכשלה — ההיסטוריות התפצלו. יש לטפל ידנית." -ForegroundColor Red
                Write-Host ($out | Out-String) -ForegroundColor DarkGray
                Start-Sleep -Seconds 60
            }
        }
    }
    Start-Sleep -Seconds 15
}
