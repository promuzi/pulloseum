param([string]$Book, [string]$Jobs, [string]$Out)
$ErrorActionPreference = 'Stop'
$list = Get-Content -LiteralPath $Jobs -Encoding UTF8 -Raw | ConvertFrom-Json
$xl = New-Object -ComObject Excel.Application
try {
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  $xl.ScreenUpdating = $false
  $wbk = $xl.Workbooks.Open($Book)
  $last = $wbk.Worksheets.Item($wbk.Worksheets.Count)
  $ws = $wbk.Worksheets.Add([Type]::Missing, $last)
  $res = @()
  $i = 1
  foreach ($j in $list) {
    $ws.Columns.Item(1).ColumnWidth = [double]$j.width
    $c = $ws.Cells.Item($i, 1)
    $c.WrapText = $true
    $c.Font.Name = 'Malgun Gothic'
    $c.Font.Size = 11
    $c.Font.Bold = [bool]$j.bold
    $c.Value2 = [string]$j.text
    [void]$ws.Rows.Item($i).AutoFit()
    $h = $ws.Rows.Item($i).RowHeight
    $res += [pscustomobject]@{ sheet = $j.sheet; coord = $j.coord; row = $j.row; need = $h; orig = $j.orig }
    $i++
  }
  $sheetsOk = @()
  for ($k = 1; $k -le 6; $k++) { $sheetsOk += $wbk.Worksheets.Item($k).UsedRange.Address() }
  $wbk.Close($false)
  $res | ConvertTo-Json -Depth 3 | Out-File -LiteralPath $Out -Encoding utf8
  "measured " + $res.Count
  "used ranges: " + ($sheetsOk -join ' ')
}
finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
