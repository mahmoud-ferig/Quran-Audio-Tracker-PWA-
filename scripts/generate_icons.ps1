Add-Type -AssemblyName System.Drawing

function Build-Icon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Emerald background rounded
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 5, 150, 105))
    $g.FillRectangle($brush, 0, 0, $size, $size)

    # Gold circle
    $goldColor = [System.Drawing.Color]::FromArgb(255, 245, 158, 11)
    $penWidth = [float]($size * 0.04)
    $goldPen = New-Object System.Drawing.Pen $goldColor, $penWidth
    $pad = [int]($size * 0.12)
    $g.DrawEllipse($goldPen, $pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad))

    # White inner circle
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $innerPad = [int]($size * 0.3)
    $g.FillEllipse($whiteBrush, $innerPad, $innerPad, ($size - 2 * $innerPad), ($size - 2 * $innerPad))

    # Center emerald dot
    $centerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 5, 150, 105))
    $dotPad = [int]($size * 0.42)
    $g.FillEllipse($centerBrush, $dotPad, $dotPad, ($size - 2 * $dotPad), ($size - 2 * $dotPad))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created icon: $outputPath"
}

$dest = "d:\dev\open-source\quranPlayer\public"
Build-Icon 192 "$dest\pwa-192x192.png"
Build-Icon 512 "$dest\pwa-512x512.png"
Build-Icon 180 "$dest\apple-touch-icon.png"
Build-Icon 64  "$dest\favicon-64x64.png"
