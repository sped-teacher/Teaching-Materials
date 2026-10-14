param([string]$dir, [string]$filter = "*.docx")
$w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
try {
  Get-ChildItem -LiteralPath $dir -Filter $filter | Where-Object { $_.Name -notlike '~$*' } | Sort-Object Name | ForEach-Object {
    $d = $w.Documents.Open($_.FullName, $false, $true)
    $n = $d.ComputeStatistics(2)
    $pdf = [IO.Path]::ChangeExtension($_.FullName, ".pdf")
    $d.SaveAs2($pdf, 17); $d.Close(0)
    "{0} | {1} 頁" -f $_.BaseName, $n
  }
} finally { $w.Quit() }
