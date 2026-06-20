param([string]$In, [string]$Out)

$lines = Get-Content -Path $In -Encoding UTF8

function Format-Inline([string]$t){
  # escape HTML
  $t = $t -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
  # inline code
  $t = [regex]::Replace($t, '`([^`]+)`', { param($m) '<code>' + $m.Groups[1].Value + '</code>' })
  # bold
  $t = [regex]::Replace($t, '\*\*([^*]+)\*\*', { param($m) '<strong>' + $m.Groups[1].Value + '</strong>' })
  # links [text](href)
  $t = [regex]::Replace($t, '\[([^\]]+)\]\(([^)]+)\)', { param($m) '<a href="' + $m.Groups[2].Value + '">' + $m.Groups[1].Value + '</a>' })
  # italic (single * not part of **)
  $t = [regex]::Replace($t, '(?<!\*)\*([^*]+)\*(?!\*)', { param($m) '<em>' + $m.Groups[1].Value + '</em>' })
  return $t
}

$sb = New-Object System.Text.StringBuilder
$inTable = $false
$tableRows = @()

function Flush-Table(){
  if($script:tableRows.Count -eq 0){ return }
  [void]$script:sb.Append('<table>')
  $hdr = $script:tableRows[0]
  # row 1 = header, row 2 = separator (skip), rest = body
  $cells = ($hdr.Trim('|') -split '\|')
  [void]$script:sb.Append('<thead><tr>')
  foreach($c in $cells){ [void]$script:sb.Append('<th>' + (Format-Inline $c.Trim()) + '</th>') }
  [void]$script:sb.Append('</tr></thead><tbody>')
  for($i=2; $i -lt $script:tableRows.Count; $i++){
    $cells = ($script:tableRows[$i].Trim('|') -split '\|')
    [void]$script:sb.Append('<tr>')
    foreach($c in $cells){ [void]$script:sb.Append('<td>' + (Format-Inline $c.Trim()) + '</td>') }
    [void]$script:sb.Append('</tr>')
  }
  [void]$script:sb.Append('</tbody></table>')
  $script:tableRows = @()
}

$inQuote = $false
foreach($raw in $lines){
  $line = $raw.TrimEnd()
  if($line -match '^\s*\|.*\|\s*$'){
    if(-not $inTable){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; $inTable = $true; $tableRows=@() }
    $tableRows += $line.Trim()
    continue
  } elseif($inTable){
    Flush-Table; $inTable=$false
  }

  if($line -eq ''){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; continue }

  if($line -match '^---+\s*$'){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; [void]$sb.Append('<hr>'); continue }

  if($line -match '^### (.*)'){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; [void]$sb.Append('<h3>' + (Format-Inline $Matches[1]) + '</h3>'); continue }
  if($line -match '^## (.*)'){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; [void]$sb.Append('<h2>' + (Format-Inline $Matches[1]) + '</h2>'); continue }
  if($line -match '^# (.*)'){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; [void]$sb.Append('<h1>' + (Format-Inline $Matches[1]) + '</h1>'); continue }

  if($line -match '^> (.*)'){ if(-not $inQuote){ [void]$sb.Append('<blockquote>'); $inQuote=$true }; [void]$sb.Append((Format-Inline $Matches[1]) + '<br>'); continue }

  if($line -match '^(\d+)\. (.*)'){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; [void]$sb.Append('<p class="li">' + $Matches[1] + '. ' + (Format-Inline $Matches[2]) + '</p>'); continue }
  if($line -match '^- (.*)'){ if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }; [void]$sb.Append('<p class="li">• ' + (Format-Inline $Matches[1]) + '</p>'); continue }

  if($inQuote){ [void]$sb.Append('</blockquote>'); $inQuote=$false }
  [void]$sb.Append('<p>' + (Format-Inline $line) + '</p>')
}
if($inTable){ Flush-Table }
if($inQuote){ [void]$sb.Append('</blockquote>') }

$css = @'
<style>
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { font-family: "Malgun Gothic","맑은 고딕",sans-serif; font-size: 11px; color:#1b2330; line-height:1.5; }
h1 { font-size: 22px; border-bottom:3px solid #3aa76d; padding-bottom:6px; color:#1f6f47; margin:0 0 10px; }
h2 { font-size: 16px; background:#eef7f1; border-left:5px solid #3aa76d; padding:5px 9px; margin:20px 0 8px; color:#1f6f47; }
h3 { font-size: 13px; color:#2b6b8f; margin:14px 0 5px; }
p { margin:4px 0; }
p.li { margin:2px 0 2px 8px; }
hr { border:0; border-top:1px solid #d6dde6; margin:14px 0; }
code { background:#eef1f5; color:#b1306b; padding:1px 4px; border-radius:3px; font-family:Consolas,monospace; font-size:10px; }
strong { color:#11203a; }
a { color:#1565c0; text-decoration:none; }
blockquote { background:#fbf7ec; border-left:4px solid #e0b84a; padding:6px 10px; margin:8px 0; color:#5c5230; font-size:10.5px; }
table { border-collapse:collapse; width:100%; margin:8px 0; font-size:10px; }
th,td { border:1px solid #cfd8e3; padding:4px 7px; text-align:left; vertical-align:top; }
th { background:#34495e; color:#fff; font-weight:600; }
tbody tr:nth-child(even){ background:#f4f7fa; }
table { page-break-inside:auto; }
tr { page-break-inside:avoid; }
h2 { page-break-after:avoid; }
</style>
'@

$html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">' + $css + '</head><body>' + $sb.ToString() + '</body></html>'
[System.IO.File]::WriteAllText($Out, $html, (New-Object System.Text.UTF8Encoding $false))
Write-Host "HTML written: $Out"
