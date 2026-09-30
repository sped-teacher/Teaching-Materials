param(
  [Parameter(Mandatory)][string]$Lessons,   # lessons.tsv（課次<TAB>課名<TAB>生字）
  [Parameter(Mandatory)][string]$ImgDir,    # capture_chars.js 存圖的資料夾
  [Parameter(Mandatory)][string]$OutDir,    # 輸出資料夾（例：Desktop\國五\五下字詞單）
  [string[]]$Only,                          # 只做某幾課，例：-Only L03,L07
  [switch]$Pdf                              # 另存 PDF 供檢查
)
# 用格線已統一的範本產生字詞單：≤18 字用 template18、19~21 字用 template21
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$assets = Join-Path $here '..\assets'
New-Item -ItemType Directory -Force $OutDir | Out-Null
$work = Join-Path ([IO.Path]::GetTempPath()) ('wordlist_' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory $work | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem

$made = @()
foreach ($line in [IO.File]::ReadAllLines((Resolve-Path $Lessons), [Text.Encoding]::UTF8)) {
  if (-not $line.Trim()) { continue }
  $L, $title, $chars = $line.Split("`t")
  if ($Only -and ($Only -notcontains $L)) { continue }
  $n = [int]$L.Substring(1)
  $count = [Globalization.StringInfo]::new($chars.Trim()).LengthInTextElements
  if ($count -gt 21) { Write-Warning "$L 有 $count 字，範本最多 21 字，略過"; continue }
  $tpl = if ($count -le 18) { 'template18.docx' } else { 'template21.docx' }
  $dir = Join-Path $work $L
  [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $assets $tpl), $dir)
  & node (Join-Path $here 'fill_template.js') $dir $n $title $chars.Trim() $ImgDir $L
  if ($LASTEXITCODE -ne 0) { throw "$L 產生失敗" }
  $name = "字詞0$n.docx"   # 沿用老師的檔名：字詞01…字詞09、字詞010…字詞012
  $out = Join-Path $OutDir $name
  & (Join-Path $here 'repack.ps1') -Src $dir -Out $out
  $made += $out
}

# 檢查：標題欄每格都是一行、頁數；需要時輸出 PDF
$w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
try {
  foreach ($f in $made) {
    $d = $w.Documents.Open($f, $false, $true)
    $lines = @(1..3 | ForEach-Object { $r = $d.Tables(1).Cell(1, $_).Range; $r.MoveEnd(1, -1) | Out-Null; $r.ComputeStatistics(1) })
    $warn = if (($lines | Measure-Object -Maximum).Maximum -gt 1) { '  ⚠ 標題欄換行，課名或生字太長' } else { '' }
    "{0}  頁數={1}  標題欄行數={2}{3}" -f (Split-Path $f -Leaf), $d.ComputeStatistics(2), ($lines -join ','), $warn
    if ($Pdf) { $d.ExportAsFixedFormat(($f -replace '\.docx$', '.pdf'), 17) }
    $d.Close($false)
  }
} finally { $w.Quit(); Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
