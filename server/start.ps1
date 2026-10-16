# 풀로세움 서버 켜기 — 이 창을 닫거나 Ctrl+C 하면 서버도 꺼져요.
#   .\server\start.ps1            내 PC에서만(http://localhost:8790/v2/)
#   .\server\start.ps1 -Lan       같은 와이파이의 친구도(처음 한 번 Windows 방화벽 허용 창이 뜨면 직접 '허용')
#   .\server\start.ps1 -Tunnel    인터넷으로 친구 초대(클라우드플레어 빠른 터널 — server\bin\cloudflared.exe 필요, 주소는 켤 때마다 바뀜)
param([switch]$Lan, [switch]$Tunnel, [int]$Port = 8790)
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Write-Host 'Node.js가 없어요 — https://nodejs.org 에서 설치해 주세요'; exit 1 }
$bind = '127.0.0.1'
if ($Lan) {
  $bind = '0.0.0.0'
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { $_.IPAddress }
  foreach ($ip in $ips) { Write-Host ('같은 와이파이 친구 주소: http://' + $ip + ':' + $Port + '/v2/') }
}
if ($Tunnel) {
  $cf = Join-Path $PSScriptRoot 'bin\cloudflared.exe'
  if (-not (Test-Path -LiteralPath $cf)) { Write-Host '터널 프로그램이 없어요: server\bin\cloudflared.exe'; exit 1 }
  Write-Host '터널을 여는 중 — 아래에 https://….trycloudflare.com 주소가 나오면 그 주소를 친구에게 보내요'
  Start-Process -FilePath $cf -ArgumentList @('tunnel', '--no-autoupdate', '--url', ('http://localhost:' + $Port)) -NoNewWindow
}
Write-Host ('내 PC 주소: http://localhost:' + $Port + '/v2/')
& node --no-warnings server/index.mjs --host $bind --port $Port
