# Corre los gates UNO POR UNO con un techo de memoria real.
#
# Por que existe: varios checks (director-editor-check, director-edit-check) crecen sin limite en
# memoria NATIVA de @napi-rs/canvas. --max-old-space-size NO los frena: solo limita el heap de V8 y
# esta memoria vive afuera (medido: con tope de 4096 el proceso llego igual a 6229 MB).
#
# Con 15 GB de RAM, un proceso asi se come el limite de commit de Windows y CUELGA LA MAQUINA
# entera: pantalla negra, parpadeo (se muere el DWM), apps caidas, apagado forzado.
#
# Este guardian mata el check que se pase del techo y sigue con el siguiente, asi un gate con fuga
# te da un FAIL en vez de un reinicio a lo bruto.
#
#   .\tools\gates-guard.ps1                 # techo 6 GB
#   .\tools\gates-guard.ps1 -LimiteMB 4000  # techo mas apretado

param(
  [int]$LimiteMB = 6000,
  [int]$SondeoSeg = 2
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

# El orden es el de "npm run gates".
$gates = @(
  'tools/urvid1-test.mjs', 'tools/urvid1-text-check.mjs', 'tools/urvid1-apca-check.mjs',
  'tools/urvid1-qa.mjs', 'tools/urvid1-prefit-check.mjs', 'tools/urvid1-keep-check.mjs',
  'tools/urvid1-layout-check.mjs', 'tools/urvid1-playbook-check.mjs', 'tools/urvid1-quality-check.mjs',
  'tools/urvid1-datakit-check.mjs', 'tools/urvid1-brand-check.mjs', 'tools/urvid1-reveal-check.mjs',
  'tools/kinetic-test.mjs', 'tools/aemotion-test.mjs', 'tools/template-test.mjs',
  'tools/director-independence-check.mjs', 'tools/director-test.mjs', 'tools/director-pagemodel-check.mjs',
  'tools/director-guion-check.mjs', 'tools/director-storyboard-check.mjs', 'tools/director-timeline-check.mjs',
  'tools/director-edit-check.mjs', 'tools/director-editor-check.mjs', 'tools/director-elementos-check.mjs',
  'render3d/demo/verificar.mjs'
)

$fallados = @()
$matados  = @()

foreach ($g in $gates) {
  if (-not (Test-Path $g)) { Write-Host "SKIP  $g (no existe)" -ForegroundColor DarkGray; continue }

  $p = Start-Process -FilePath 'node' -ArgumentList $g -NoNewWindow -PassThru
  $pico = 0
  $excedido = $false

  while (-not $p.HasExited) {
    Start-Sleep -Seconds $SondeoSeg
    try { $pr = Get-Process -Id $p.Id -ErrorAction Stop } catch { break }
    $mb = [int]($pr.PagedMemorySize64 / 1MB)
    if ($mb -gt $pico) { $pico = $mb }
    if ($mb -gt $LimiteMB) {
      Write-Host "MATADO  $g  ->  $mb MB (techo $LimiteMB MB)" -ForegroundColor Red
      try { Stop-Process -Id $p.Id -Force } catch {}
      $excedido = $true
      $matados += "$g ($mb MB)"
      break
    }
  }

  if ($excedido) { continue }

  $p.WaitForExit()
  if ($p.ExitCode -ne 0) {
    Write-Host "FAIL  $g  (exit $($p.ExitCode), pico $pico MB)" -ForegroundColor Yellow
    $fallados += $g
  } else {
    Write-Host "ok    $g  (pico $pico MB)" -ForegroundColor Green
  }
}

Write-Host ''
if ($matados.Count)  { Write-Host "Pasados de memoria ($($matados.Count)):" -ForegroundColor Red;    $matados  | ForEach-Object { Write-Host "  - $_" } }
if ($fallados.Count) { Write-Host "Con fallas ($($fallados.Count)):"        -ForegroundColor Yellow; $fallados | ForEach-Object { Write-Host "  - $_" } }
if (-not $matados.Count -and -not $fallados.Count) { Write-Host 'Todos los gates pasaron.' -ForegroundColor Green }

# vite build queda afuera a proposito: corrrelo aparte una vez que los gates esten en verde.
if ($matados.Count -or $fallados.Count) { exit 1 }
