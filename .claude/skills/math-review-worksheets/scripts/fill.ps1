param([string]$dir, [string]$filter = "*.docx")
# 每份文件：頁數＋最後一行在頁面上的位置（可用高度的百分比）
$w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
try {
  Get-ChildItem -LiteralPath $dir -Filter $filter | Where-Object { $_.Name -notlike '~$*' } | Sort-Object Name | ForEach-Object {
    $d = $w.Documents.Open($_.FullName, $false, $true)
    $n = $d.ComputeStatistics(2)
    $r = $d.Content; $r.Collapse(0)
    $y = $r.Information(6)
    $ps = $d.PageSetup
    $usable = $ps.PageHeight - $ps.TopMargin - $ps.BottomMargin
    $pct = [math]::Round(100 * ($y - $ps.TopMargin) / $usable)
    "{0} | {1} 頁 | last page filled {2}%" -f $_.BaseName, $n, $pct
    $d.Close(0)
  }
} finally { $w.Quit() }
