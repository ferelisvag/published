# Builds the GitHub Pages site in docs/ from index.html (the app source, also published as a claude.ai Artifact).
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$docs = Join-Path $root 'docs'
New-Item -ItemType Directory -Force $docs | Out-Null

$app = [IO.File]::ReadAllText((Join-Path $root 'index.html'))
$head = '<!doctype html><html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="BrokeOMeter: βγαίνεις τον μήνα ή όχι; Μηνιαίος προϋπολογισμός με εξαγωγή σε Excel και PDF."><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
[IO.File]::WriteAllText((Join-Path $docs 'index.html'), $head + "`n" + $app + "`n</body></html>`n", [Text.UTF8Encoding]::new($false))

Copy-Item (Join-Path $root 'logo.svg'), (Join-Path $root 'logo-mark.svg') $docs -Force
if (-not (Test-Path (Join-Path $docs '.nojekyll'))) { New-Item -ItemType File (Join-Path $docs '.nojekyll') | Out-Null }
Write-Host "Built docs/index.html"
