param([string]$Src, [string]$Out)
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
if (Test-Path $Out) { Remove-Item $Out }
$z = [System.IO.Compression.ZipFile]::Open($Out, 'Create')
Get-ChildItem $Src -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($Src.Length + 1).Replace('\', '/')
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $_.FullName, $rel)
}
$z.Dispose()
