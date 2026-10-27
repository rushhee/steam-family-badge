# Packages the Firefox build into dist/steam-family-badge-v<version>-firefox.zip.
# Firefox needs background.scripts instead of a service worker, so it uses manifest.firefox.json.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'manifest.firefox.json') -Raw | ConvertFrom-Json
$out = Join-Path $root "dist\steam-family-badge-v$($manifest.version)-firefox.zip"
$stage = Join-Path ([IO.Path]::GetTempPath()) "sfb-firefox-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $stage | Out-Null
try {
  'background.js', 'content.js', 'content.css', 'popup.html', 'popup.js' |
    ForEach-Object { Copy-Item (Join-Path $root $_) $stage }
  Copy-Item (Join-Path $root 'manifest.firefox.json') (Join-Path $stage 'manifest.json')
  New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
  if (Test-Path $out) { Remove-Item $out }
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $out
  Write-Host "Built $out"
} finally {
  Remove-Item $stage -Recurse -Force
}
