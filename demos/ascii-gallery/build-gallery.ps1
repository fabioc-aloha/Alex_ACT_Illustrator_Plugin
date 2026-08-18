# Builds the ASCII chart gallery in Markdown and standalone HTML from one source
# of truth, mirroring the seven communication goals in Illustrator's
# chart-vocabulary skill. Real figures come from sales-sample.csv;
# entries marked illustrative use shaped data because the sample has no such
# structure.

$ErrorActionPreference = 'Stop'
$outRoot = $PSScriptRoot
# The skill reference is generated, never hand-edited, so it cannot drift from the demo.
$refOut = Join-Path $PSScriptRoot '..\..\.github\skills\ascii-chart\references\ascii-gallery.md'
$data = Import-Csv (Join-Path $PSScriptRoot 'sales-sample.csv')

$MAXW = 78

function Bar([double]$value, [double]$max, [int]$width) {
    $filled = [math]::Round($value / $max * $width)
    if ($filled -lt 0) { $filled = 0 }
    if ($filled -gt $width) { $filled = $width }
    ('#' * $filled).PadRight($width, '.')
}
function Money([double]$v) { '$' + $v.ToString('N0') }

$byRegion = $data | Group-Object region | ForEach-Object {
    [pscustomobject]@{ Name = $_.Name; Revenue = ($_.Group | Measure-Object revenue -Sum).Sum }
} | Sort-Object Revenue -Descending
$byProduct = $data | Group-Object product | ForEach-Object {
    [pscustomobject]@{ Name = $_.Name; Revenue = ($_.Group | Measure-Object revenue -Sum).Sum }
} | Sort-Object Revenue -Descending
$byMonth = $data | Group-Object date | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{
        Label   = ([datetime]$_.Name).ToString('MMM')
        Revenue = ($_.Group | Measure-Object revenue -Sum).Sum
        Units   = ($_.Group | Measure-Object units -Sum).Sum
    }
}
$totalRev = ($data | Measure-Object revenue -Sum).Sum
$avgMonth = ($byMonth | Measure-Object Revenue -Average).Average
$maxMonth = ($byMonth | Measure-Object Revenue -Maximum).Maximum

$entries = [System.Collections.Generic.List[object]]::new()
function Add-Entry($goal, $form, $best, $avoid, $source, $ascii) {
    $lower = { param($s) if ($s.Length -gt 0) { $s.Substring(0, 1).ToLower() + $s.Substring(1) } else { $s } }
    # Padding is load-bearing inside a line, never after it; trailing spaces are lint.
    $trimmed = (($ascii -split "`n") | ForEach-Object { $_.TrimEnd() }) -join "`n"
    $entries.Add([pscustomobject]@{
            Goal = $goal; Form = $form; Best = (& $lower $best); Avoid = (& $lower $avoid); Source = $source; Ascii = $trimmed
        })
}

# --- Comparison -------------------------------------------------------------
$maxProd = ($byProduct | Measure-Object Revenue -Maximum).Maximum
Add-Entry 'Comparison' 'Horizontal bar' 'Ranking items; long labels' 'More than 15 rows' 'real' (
    ($byProduct | ForEach-Object { $_.Name.PadRight(10) + (Bar $_.Revenue $maxProd 34) + ' ' + (Money $_.Revenue).PadLeft(9) }) -join "`n"
)

$dotMin = ($byMonth | Measure-Object Revenue -Minimum).Minimum
Add-Entry 'Comparison' 'Dot plot' 'Precise values in a tight range' 'Audience expects bars' 'real' (
    ($byMonth | ForEach-Object {
        $pos = [math]::Round(($_.Revenue - $dotMin) / ($maxMonth - $dotMin) * 32)
        $_.Label.PadRight(5) + ('-' * $pos) + 'o' + ('-' * (32 - $pos)) + ' ' + (Money $_.Revenue).PadLeft(9)
    }) -join "`n"
)

Add-Entry 'Comparison' 'Bullet chart' 'Actual against a target' 'No agreed benchmark' 'real' (
    ($byRegion | ForEach-Object {
        $target = 130000
        $pct = $_.Revenue / $target * 100
        $mark = [math]::Min(33, [math]::Round($_.Revenue / 160000 * 34))
        $track = ('#' * $mark).PadRight(34, '.')
        $track = $track.Substring(0, 27) + '|' + $track.Substring(28)
        $_.Name.PadRight(7) + $track + ' ' + ($pct.ToString('N0') + '%').PadLeft(5)
    }) -join "`n"
)

Add-Entry 'Comparison' 'Grouped bar' 'two or three series per category' 'more than three series' 'real' (
    ($byRegion | ForEach-Object {
        $reg = $_.Name
        $rows = $byProduct | ForEach-Object {
            $prod = $_.Name
            $v = ($data | Where-Object { $_.region -eq $reg -and $_.product -eq $prod } | Measure-Object revenue -Sum).Sum
            '  ' + $prod.PadRight(9) + (Bar $v $maxProd 30) + ' ' + (Money $v).PadLeft(9)
        }
        $reg + "`n" + ($rows -join "`n")
    }) -join "`n"
)

# --- Change Over Time -------------------------------------------------------
$spark = ''
for ($i = 1; $i -lt $byMonth.Count; $i++) {
    $d = $byMonth[$i].Revenue - $byMonth[$i - 1].Revenue
    $spark += if ($d -gt 0) { '/' } elseif ($d -lt 0) { '\' } else { '_' }
}
Add-Entry 'Change Over Time' 'Sparkline' 'Inline trend beside a KPI' 'Exact values matter more than shape' 'real' (
    'Revenue  ' + $spark + '   ' + (Money $byMonth[0].Revenue) + ' -> ' + (Money $byMonth[-1].Revenue) + "`n" +
    'Months   ' + (($byMonth | ForEach-Object { $_.Label.Substring(0, 1) }) -join '')
)

$rows = @()
for ($level = 5; $level -ge 1; $level--) {
    $line = '     '
    foreach ($m in $byMonth) {
        $h = [math]::Round($m.Revenue / $maxMonth * 5)
        $line += if ($h -ge $level) { ' ##   ' } else { '      ' }
    }
    $rows += $line.TrimEnd()
}
$rows += '     ' + (($byMonth | ForEach-Object { ' ' + $_.Label.Substring(0, 2) + '   ' }) -join '')
Add-Entry 'Change Over Time' 'Column trend' 'Discrete periods; magnitude visible' 'Many periods (use sparkline)' 'real' ($rows -join "`n")

$step = @()
foreach ($m in $byMonth) {
    $h = [math]::Round($m.Revenue / $maxMonth * 30)
    $step += $m.Label.PadRight(5) + ('_' * $h) + '|' + ' ' + (Money $m.Revenue).PadLeft(9)
}
Add-Entry 'Change Over Time' 'Step line' 'Values hold then jump' 'Smooth continuous change' 'real' ($step -join "`n")

Add-Entry 'Change Over Time' 'Small multiples' 'comparing trends across categories' 'fewer than four categories' 'real' (
    ($byRegion | ForEach-Object {
        $reg = $_.Name
        $series = $byMonth | ForEach-Object {
            $lbl = $_.Label
            ($data | Where-Object { $_.region -eq $reg -and ([datetime]$_.date).ToString('MMM') -eq $lbl } | Measure-Object revenue -Sum).Sum
        }
        $sp = ''
        for ($i = 1; $i -lt $series.Count; $i++) {
            $d = $series[$i] - $series[$i - 1]
            $sp += if ($d -gt 0) { '/' } elseif ($d -lt 0) { '\' } else { '_' }
        }
        $reg.PadRight(8) + $sp + '   ' + (Money ($series | Measure-Object -Sum).Sum).PadLeft(9)
    }) -join "`n"
)

# --- Proportion -------------------------------------------------------------
$seg = ''
foreach ($r in $byRegion) {
    $w = [math]::Round($r.Revenue / $totalRev * 60)
    $seg += if ($r -eq $byRegion[0]) { '#' * $w } else { '=' * $w }
}
Add-Entry 'Proportion' 'Stacked 100% bar' 'Two to four parts of a whole' 'Many small slices' 'real' (
    $seg.PadRight(60).Substring(0, 60) + "`n" +
    ($byRegion | ForEach-Object { $_.Name + ' ' + ($_.Revenue / $totalRev * 100).ToString('N1') + '%' }) -join '   '
)

Add-Entry 'Proportion' 'Percentage rows' 'Ranked shares needing exact values' 'Shares change over time' 'real' (
    ($byProduct | ForEach-Object {
        $pct = $_.Revenue / $totalRev * 100
        $_.Name.PadRight(10) + (Bar $pct 100 40) + ' ' + ($pct.ToString('N1') + '%').PadLeft(6)
    }) -join "`n"
)

$northCells = [math]::Round($byRegion[0].Revenue / $totalRev * 100)
$waffle = @()
for ($row = 0; $row -lt 5; $row++) {
    $line = ''
    for ($col = 0; $col -lt 20; $col++) {
        $idx = $row * 20 + $col
        $line += if ($idx -lt $northCells) { '#' } else { '.' }
    }
    $waffle += $line
}
Add-Entry 'Proportion' 'Waffle grid' 'Part of a whole as countable units' 'Precise decimals matter' 'real' (
    ($waffle -join "`n") + "`n" + ('# ' + $byRegion[0].Name + ' ' + $northCells + '%   . ' + $byRegion[1].Name + ' ' + (100 - $northCells) + '%')
)

# --- Distribution -----------------------------------------------------------
$rev = $data | ForEach-Object { [double]$_.revenue } | Sort-Object
$min = $rev[0]; $max = $rev[-1]
$buckets = @()
$binWidth = 2000
$bucketStart = [math]::Floor($min / $binWidth) * $binWidth
for ($i = 0; $i -lt 5; $i++) {
    $lo = $bucketStart + ($binWidth * $i); $hi = $lo + $binWidth
    $c = @($rev | Where-Object { $_ -ge $lo -and ($_ -lt $hi -or ($i -eq 4 -and $_ -le $hi)) }).Count
    $buckets += [pscustomobject]@{ Lo = $lo; Count = $c }
}
$maxC = ($buckets | Measure-Object Count -Maximum).Maximum
Add-Entry 'Distribution' 'Histogram' 'Shape of a single variable' 'Fewer than 20 observations' 'real' (
    ($buckets | ForEach-Object { (Money $_.Lo).PadLeft(8) + '  ' + (Bar $_.Count $maxC 30) + ' n=' + $_.Count }) -join "`n"
)

$q1 = $rev[[math]::Floor($rev.Count * 0.25)]
$med = $rev[[math]::Floor($rev.Count * 0.5)]
$q3 = $rev[[math]::Floor($rev.Count * 0.75)]
function Pos([double]$v) { [math]::Round(($v - $min) / ($max - $min) * 44) }
$line = ''
for ($i = 0; $i -le 44; $i++) {
    $line += if ($i -eq (Pos $min) -or $i -eq (Pos $max)) { '|' }
    elseif ($i -eq (Pos $med)) { '+' }
    elseif ($i -eq (Pos $q1) -or $i -eq (Pos $q3)) { '[' }
    elseif ($i -gt (Pos $q1) -and $i -lt (Pos $q3)) { '=' }
    else { '-' }
}
Add-Entry 'Distribution' 'Box plot' 'Spread and outliers at a glance' 'Audience unfamiliar with quartiles' 'real' (
    $line + "`n" + ('min ' + (Money $min) + '   Q1 ' + (Money $q1) + '   med ' + (Money $med) + '   Q3 ' + (Money $q3) + '   max ' + (Money $max))
)

# --- Relationship -----------------------------------------------------------
$grid = @()
$uMin = ($data | Measure-Object units -Minimum).Minimum
$uMax = ($data | Measure-Object units -Maximum).Maximum
for ($row = 8; $row -ge 1; $row--) {
    $line = ''
    for ($col = 0; $col -lt 44; $col++) {
        $hit = $data | Where-Object {
            [math]::Round(([double]$_.units - $uMin) / ($uMax - $uMin) * 43) -eq $col -and
            [math]::Ceiling(([double]$_.revenue - $min) / ($max - $min) * 8) -eq $row
        }
        $line += if ($hit) { '*' } else { ' ' }
    }
    $grid += '|' + $line
}
$grid += '+' + ('-' * 44)
$grid += 'units ->                          revenue on y axis'
Add-Entry 'Relationship' 'Scatter plot' 'Correlation between two measures' 'More than a few hundred points' 'real' ($grid -join "`n")

$cells = @{}
foreach ($r in $data) {
    $k = $r.region + '|' + ([datetime]$r.date).ToString('MMM')
    if (-not $cells.ContainsKey($k)) { $cells[$k] = 0 }
    $cells[$k] += [double]$r.revenue
}
$cMax = ($cells.Values | Measure-Object -Maximum).Maximum
$cMin = ($cells.Values | Measure-Object -Minimum).Minimum
function Ramp([double]$v) {
    $t = ($v - $cMin) / ($cMax - $cMin)
    if ($t -ge 0.8) { '#####' } elseif ($t -ge 0.6) { '####.' } elseif ($t -ge 0.4) { '###..' } elseif ($t -ge 0.2) { '##...' } else { '#....' }
}
Add-Entry 'Relationship' 'Heatmap' 'Two categorical axes, one measure' 'Precise values needed' 'real' (
    ('        ' + (($byMonth | ForEach-Object { $_.Label.PadRight(6) }) -join '')) + "`n" +
    (($byRegion | ForEach-Object {
        $reg = $_.Name
        $reg.PadRight(8) + (($byMonth | ForEach-Object { (Ramp $cells[$reg + '|' + $_.Label]) + ' ' }) -join '')
    }) -join "`n")
)

# --- Flow and Process -------------------------------------------------------
$stages = @(
    [pscustomobject]@{ Name = 'Leads'; Value = 4000 }
    [pscustomobject]@{ Name = 'Qualified'; Value = 2400 }
    [pscustomobject]@{ Name = 'Proposal'; Value = 1100 }
    [pscustomobject]@{ Name = 'Won'; Value = 420 }
)
Add-Entry 'Flow and Process' 'Funnel' 'Stage-by-stage drop-off' 'Stages are not sequential' 'illustrative' (
    ($stages | ForEach-Object {
        $w = [math]::Round($_.Value / $stages[0].Value * 40)
        $pad = [math]::Floor((40 - $w) / 2)
        (' ' * $pad) + ('#' * $w) + '  ' + $_.Name.PadRight(10) + $_.Value.ToString('N0').PadLeft(6)
    }) -join "`n"
)

Add-Entry 'Flow and Process' 'Stage pipeline' 'Steps with hand-offs' 'Branching or looping flows' 'illustrative' (
    '[ Ingest ] -> [ Clean ] -> [ Select ] -> [ Render ] -> [ Verify ]' + "`n" +
    '    ok          ok           ok            ok           WARN'
)

$regionMonth = @{}
foreach ($r in $data) {
    $k = $r.region + '|' + ([datetime]$r.date).ToString('MMM')
    if (-not $regionMonth.ContainsKey($k)) { $regionMonth[$k] = 0 }
    $regionMonth[$k] += [double]$r.revenue
}
$firstLabel = $byMonth[0].Label
$lastLabel = $byMonth[-1].Label
$grandCost = ($data | Measure-Object cost -Sum).Sum

Add-Entry 'Comparison' 'Slope chart' 'two periods and rank changes matter' 'more than about ten rows' 'real' (
    ("        " + $firstLabel.PadRight(26) + $lastLabel) + "`n" +
    (($byRegion | ForEach-Object {
        $a = $regionMonth[$_.Name + '|' + $firstLabel]
        $b = $regionMonth[$_.Name + '|' + $lastLabel]
        $arrow = if ($b -ge $a) { '/' } else { '\' }
        $_.Name.PadRight(7) + (Money $a).PadLeft(8) + ' ' + ($arrow * 16) + ' ' + (Money $b).PadLeft(8)
    }) -join "`n")
)

Add-Entry 'Comparison' 'Waterfall' 'a total is built from sequential moves' 'the steps are not additive' 'real' (
    (& {
        $scale = 40 / $totalRev
        $margin = $totalRev - $grandCost
        $wRev = [math]::Round($totalRev * $scale)
        $wCost = [math]::Round($grandCost * $scale)
        $wMar = [math]::Round($margin * $scale)
        @(
            'Revenue  ' + ('#' * $wRev).PadRight(41) + (Money $totalRev).PadLeft(9)
            'Cost     ' + ((' ' * $wMar) + ('=' * $wCost)).PadRight(41) + ('-' + (Money $grandCost)).PadLeft(9)
            'Margin   ' + ('#' * $wMar).PadRight(41) + (Money $margin).PadLeft(9)
        )
    }) -join "`n"
)

$combos = $data | Group-Object { $_.region + ' ' + $_.product } | ForEach-Object {
    [pscustomobject]@{ Name = $_.Name; Revenue = ($_.Group | Measure-Object revenue -Sum).Sum }
} | Sort-Object Revenue -Descending
Add-Entry 'Comparison' 'Pareto' 'a few categories drive most of the total' 'the distribution is flat' 'real' (
    (& {
        $cum = 0
        $maxC = $combos[0].Revenue
        foreach ($c in $combos) {
            $cum += $c.Revenue
            $pct = $cum / $totalRev * 100
            $c.Name.PadRight(17) + (Bar $c.Revenue $maxC 22) + ' ' + (Money $c.Revenue).PadLeft(9) + '  cum ' + ($pct.ToString('N0') + '%').PadLeft(4)
        }
    }) -join "`n"
)

Add-Entry 'Comparison' 'Gauge' 'one headline number against a scale' 'several measures need comparing' 'real' (
    (& {
        $target = 260000
        $pct = $totalRev / $target * 100
        $mark = [math]::Round($pct / 100 * 40)
        @(
            '0%' + (' ' * 17) + '50%' + (' ' * 16) + '100%'
            '[' + ('=' * $mark) + '>' + ('.' * [math]::Max(0, 39 - $mark)) + ']  ' + $pct.ToString('N0') + '%'
            'Revenue ' + (Money $totalRev) + ' against target ' + (Money $target)
        )
    }) -join "`n"
)

Add-Entry 'Comparison' 'KPI card' 'one measure with trend and delta' 'the reader needs the full series' 'real' (
    (& {
        $delta = ($byMonth[-1].Revenue - $byMonth[0].Revenue) / $byMonth[0].Revenue * 100
        @(
            '+----------------------------+'
            '|  REVENUE                   |'
            '|  ' + (Money $totalRev).PadRight(26) + '|'
            '|  ' + ($spark + '  ' + $delta.ToString('+#,0.0;-#,0.0') + '% vs ' + $firstLabel).PadRight(26) + '|'
            '+----------------------------+'
        )
    }) -join "`n"
)

Add-Entry 'Change Over Time' 'Line chart' 'a continuous series where shape matters' 'categories rather than time' 'real' (
    (& {
        $rows = @()
        $lo = ($byMonth | Measure-Object Revenue -Minimum).Minimum
        $hi = ($byMonth | Measure-Object Revenue -Maximum).Maximum
        for ($lvl = 6; $lvl -ge 1; $lvl--) {
            $line = (Money ($lo + ($hi - $lo) * ($lvl - 1) / 5)).PadLeft(8) + ' |'
            foreach ($m in $byMonth) {
                $h = 1 + [math]::Round(($m.Revenue - $lo) / ($hi - $lo) * 5)
                $line += if ($h -eq $lvl) { '  *  ' } else { '     ' }
            }
            $rows += $line
        }
        $rows += (' ' * 9) + '+' + ('-' * 30)
        $rows += (' ' * 10) + (($byMonth | ForEach-Object { $_.Label.PadRight(5) }) -join '')
        $rows
    }) -join "`n"
)

Add-Entry 'Change Over Time' 'Area chart' 'volume under the line is the point' 'values sit far above zero, which flattens the visible variation as it does here' 'real' (
    (& {
        $rows = @()
        $hi = ($byMonth | Measure-Object Revenue -Maximum).Maximum
        for ($lvl = 6; $lvl -ge 1; $lvl--) {
            $line = (' ' * 8) + '|'
            foreach ($m in $byMonth) {
                $h = [math]::Round($m.Revenue / $hi * 6)
                $line += if ($h -ge $lvl) { ' ####' } else { '     ' }
            }
            $rows += $line
        }
        $rows += (' ' * 8) + '+' + ('-' * 30)
        $rows += (' ' * 9) + (($byMonth | ForEach-Object { $_.Label.PadRight(5) }) -join '')
        $rows
    }) -join "`n"
)

Add-Entry 'Proportion' 'Treemap' 'nested share of a total' 'more than about eight leaves' 'real' (
    (& {
        $widths = $byProduct | ForEach-Object { [math]::Max(10, [math]::Round($_.Revenue / $totalRev * 58)) }
        $edge = '+' + (($widths | ForEach-Object { ('-' * ($_ - 1)) + '+' }) -join '')
        $mid = '|'
        $val = '|'
        for ($i = 0; $i -lt $byProduct.Count; $i++) {
            $mid += $byProduct[$i].Name.PadRight($widths[$i] - 1) + '|'
            $val += ((Money $byProduct[$i].Revenue) + '  ' + ($byProduct[$i].Revenue / $totalRev * 100).ToString('N0') + '%').PadRight($widths[$i] - 1) + '|'
        }
        @($edge, $mid, $val, $edge)
    }) -join "`n"
)

Add-Entry 'Distribution' 'Strip plot' 'every observation should stay visible' 'hundreds of overlapping points' 'real' (
    (& {
        $rows = @()
        foreach ($r in $byRegion) {
            $reg = $r.Name
            $vals = $data | Where-Object region -eq $reg | ForEach-Object { [double]$_.revenue }
            $slots = , ' ' * 44
            foreach ($v in $vals) {
                $i = [math]::Round(($v - $min) / ($max - $min) * 43)
                $slots[$i] = if ($slots[$i] -eq ' ') { 'o' } else { '8' }
            }
            $rows += $reg.PadRight(7) + '|' + ($slots -join '')
        }
        $rows += (' ' * 7) + '+' + ('-' * 44)
        $rows += (' ' * 8) + (Money $min) + ' to ' + (Money $max) + '    8 marks a collision'
        $rows
    }) -join "`n"
)

Add-Entry 'Distribution' 'ECDF' 'the question is what share falls below a value' 'a very small sample' 'real' (
    (& {
        $rows = @()
        for ($p = 100; $p -ge 20; $p -= 20) {
            $line = ($p.ToString() + '%').PadLeft(5) + ' |'
            for ($c = 0; $c -lt 40; $c++) {
                $v = $min + ($max - $min) * $c / 39
                $share = (@($rev | Where-Object { $_ -le $v }).Count / $rev.Count) * 100
                $line += if ($share -ge ($p - 20) -and $share -lt $p) { '_' } else { ' ' }
            }
            $rows += $line
        }
        $rows += (' ' * 6) + '+' + ('-' * 40)
        $rows += (' ' * 7) + (Money $min).PadRight(32) + (Money $max)
        $rows
    }) -join "`n"
)

Add-Entry 'Relationship' 'Bubble plot' 'a third measure sizes each point' 'sizes differ by less than about twice' 'real' (
    (& {
        $rows = @()
        $cMin = ($data | Measure-Object cost -Minimum).Minimum
        $cMax = ($data | Measure-Object cost -Maximum).Maximum
        for ($row = 6; $row -ge 1; $row--) {
            $line = '|'
            for ($col = 0; $col -lt 44; $col++) {
                $hit = $data | Where-Object {
                    [math]::Round(([double]$_.units - $uMin) / ($uMax - $uMin) * 43) -eq $col -and
                    [math]::Ceiling(([double]$_.revenue - $min) / ($max - $min) * 6) -eq $row
                } | Select-Object -First 1
                if ($hit) {
                    $t = ([double]$hit.cost - $cMin) / ($cMax - $cMin)
                    $line += if ($t -ge 0.66) { '@' } elseif ($t -ge 0.33) { 'O' } else { 'o' }
                }
                else { $line += ' ' }
            }
            $rows += $line
        }
        $rows += '+' + ('-' * 44)
        $rows += 'units ->       o low cost    O mid    @ high cost'
        $rows
    }) -join "`n"
)

Add-Entry 'Relationship' 'Parallel coordinates' 'several measures compared per record' 'the measures are derived from each other, which makes every line identical as it does here' 'real' (
    (& {
        $axes = 'revenue', 'units', 'cost'
        $rows = @('        ' + (($axes | ForEach-Object { $_.PadRight(14) }) -join ''))
        foreach ($m in $byMonth) {
            $grp = $data | Where-Object { ([datetime]$_.date).ToString('MMM') -eq $m.Label }
            $line = $m.Label.PadRight(8)
            foreach ($a in $axes) {
                $vals = $data | ForEach-Object { [double]$_.$a }
                $lo = ($vals | Measure-Object -Minimum).Minimum
                $hi = ($vals | Measure-Object -Maximum).Maximum
                $v = ($grp | Measure-Object $a -Average).Average
                $pos = [math]::Round(($v - $lo) / ($hi - $lo) * 11)
                $line += ('-' * $pos) + '*' + ('-' * (11 - $pos)) + '  '
            }
            $rows += $line
        }
        $rows
    }) -join "`n"
)

Add-Entry 'Flow and Process' 'Sankey flow' 'quantities merge or split between stages' 'many crossing links' 'real' (
    (& {
        $band = 20
        $wN = [math]::Round($byRegion[0].Revenue / $totalRev * $band)
        $wS = [math]::Round($byRegion[1].Revenue / $totalRev * $band)
        $lead = 7 + 9 + 1
        @(
            $byRegion[0].Name.PadRight(7) + (Money $byRegion[0].Revenue).PadLeft(9) + ' ' + ('=' * $wN).PadRight($band, '-') + '\'
            (' ' * ($lead + $band + 1)) + '>  Total ' + (Money $totalRev)
            $byRegion[1].Name.PadRight(7) + (Money $byRegion[1].Revenue).PadLeft(9) + ' ' + ('=' * $wS).PadRight($band, '-') + '/'
        )
    }) -join "`n"
)

# --- Deviation --------------------------------------------------------------
Add-Entry 'Deviation' 'Diverging bar' 'Above and below a reference' 'No meaningful midpoint' 'real' (
    ($byMonth | ForEach-Object {
        $d = $_.Revenue - $avgMonth
        $w = [math]::Round([math]::Abs($d) / $maxMonth * 24)
        if ($d -ge 0) { $_.Label.PadRight(5) + (' ' * 24) + '|' + ('#' * $w).PadRight(24) + ' +' + (Money ([math]::Abs($d))) }
        else { $_.Label.PadRight(5) + ('#' * $w).PadLeft(24) + '|' + (' ' * 24) + ' -' + (Money ([math]::Abs($d))) }
    }) -join "`n"
)

Add-Entry 'Deviation' 'Variance column' 'Actual against plan per period' 'No plan exists' 'real' (
    ($byMonth | ForEach-Object {
        $d = $_.Revenue - $avgMonth
        $flag = if ($d -ge 0) { '[OK]  ' } else { '[UNDER]' }
        $_.Label.PadRight(5) + (Money $_.Revenue).PadLeft(9) + '  vs avg ' + (Money $avgMonth).PadLeft(9) + '  ' + (('{0:+#,0;-#,0;0}' -f $d)).PadLeft(9) + '  ' + $flag
    }) -join "`n"
)

# --- Flint coverage ---------------------------------------------------------
$coverage = @(
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Area Chart'; Ascii = 'Area chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Bar Chart'; Ascii = 'Horizontal bar or Column trend'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Bar Table'; Ascii = 'Percentage rows'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Boxplot'; Ascii = 'Box plot'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'KPI'; Flint = 'Bullet Chart'; Ascii = 'Bullet chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Bump Chart'; Ascii = 'Slope chart'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Financial'; Flint = 'Candlestick Chart'; Ascii = 'Table with OHLC columns'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Spatial'; Flint = 'Choropleth'; Ascii = 'Ranked bars or table'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Connected Scatter Plot'; Ascii = 'Slope chart'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Density Plot'; Ascii = 'Histogram'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Donut Chart'; Ascii = 'Percentage rows or Waffle grid'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'ECDF Plot'; Ascii = 'ECDF'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Flow'; Flint = 'Gantt Chart'; Ascii = 'Stage pipeline'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Grouped Bar Chart'; Ascii = 'Grouped bar'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Heatmap'; Ascii = 'Heatmap'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Histogram'; Ascii = 'Histogram'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'KPI'; Flint = 'KPI Card'; Ascii = 'KPI card'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Line Chart'; Ascii = 'Line chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Lollipop Chart'; Ascii = 'Dot plot'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Spatial'; Flint = 'Map'; Ascii = 'Ranked bars or table'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Pie Chart'; Ascii = 'Percentage rows or Waffle grid'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Pyramid Chart'; Ascii = 'Diverging bar (split panels)'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Radar Chart'; Ascii = 'Parallel coordinates'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Range Area Chart'; Ascii = 'Area chart with stated bounds'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Ranged Dot Plot'; Ascii = 'Dot plot'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Regression'; Ascii = 'Scatter plot with coefficient'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Rose Chart'; Ascii = 'Percentage rows'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Scatter Plot'; Ascii = 'Scatter plot or Bubble plot'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Slope Chart'; Ascii = 'Slope chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Sparkline'; Ascii = 'Sparkline'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Stacked Bar Chart'; Ascii = 'Stacked 100% bar'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Streamgraph'; Ascii = 'Small multiples'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Strip Plot'; Ascii = 'Strip plot'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Violin Plot'; Ascii = 'Box plot or Histogram'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Waterfall Chart'; Ascii = 'Waterfall'; Status = 'Covered' }
)
$limits = @(
    [pscustomobject]@{ Form = 'Pie, Donut, Sunburst'; Why = 'angle encodes the value, and a character cell cannot carry a partial angle'; Instead = 'Stacked 100% bar, Percentage rows, or Waffle grid' }
    [pscustomobject]@{ Form = 'Violin, Density'; Why = 'a smooth curve needs sub-character resolution that a monospace grid does not have'; Instead = 'Histogram or Box plot' }
    [pscustomobject]@{ Form = 'Streamgraph'; Why = 'stacked curved baselines become unreadable once each band is quantized to whole cells'; Instead = 'Small multiples' }
    [pscustomobject]@{ Form = 'Connected Scatter'; Why = 'a path between arbitrary points needs line segments at arbitrary angles'; Instead = 'Slope chart for two periods, Line chart for a series' }
    [pscustomobject]@{ Form = 'Regression fit'; Why = 'the fitted line lands between cells at most angles, so the slope reads wrong'; Instead = 'Scatter plot with the coefficient stated in text' }
)
$covered = @($coverage | Where-Object Status -eq 'Covered').Count

$dataFile = Join-Path $env:TEMP 'alex-act-ascii-gallery-data.json'
$specFile = Join-Path $env:TEMP 'alex-act-ascii-gallery-specs.json'
try {
    $data | ConvertTo-Json -Depth 4 | Set-Content -Path $dataFile -Encoding utf8
    & node (Join-Path $PSScriptRoot 'build-flint-specs.mjs') $dataFile $specFile
    if ($LASTEXITCODE -ne 0) { throw "Flint gallery compiler exited with code $LASTEXITCODE" }
    $flintJson = Get-Content $specFile -Raw
    $flintEquivalents = $flintJson | ConvertFrom-Json -AsHashtable
}
finally {
    Remove-Item $dataFile, $specFile -ErrorAction SilentlyContinue
}

# --- Unicode variants -------------------------------------------------------
# The middle rung between ASCII and a real vector chart. Three techniques, each
# buying sub-cell resolution a single ASCII glyph cannot express:
#   block elements  1/8 steps within one cell, for bars and columns
#   braille         a 2x4 dot matrix per cell, so 8x the addressable points
#   box-drawing     connected strokes for stepped and bounded shapes
# Built with [char] codes so the file stays encoding-agnostic.
$BLOCK_V = @([char]0x20, [char]0x2581, [char]0x2582, [char]0x2583, [char]0x2584, [char]0x2585, [char]0x2586, [char]0x2587, [char]0x2588)
$BLOCK_H = @([char]0x20, [char]0x258F, [char]0x258E, [char]0x258D, [char]0x258C, [char]0x258B, [char]0x258A, [char]0x2589, [char]0x2588)
$BLK_FULL = [char]0x2588
$DOTS = @(@(0x01, 0x08), @(0x02, 0x10), @(0x04, 0x20), @(0x40, 0x80))

function UBar([double]$value, [double]$max, [int]$width) {
    $eighths = [int][math]::Round($value / $max * $width * 8)
    $fullCells = [math]::Floor($eighths / 8)
    $rem = $eighths % 8
    $s = ([string]$BLK_FULL * $fullCells)
    if ($rem -gt 0) { $s += $BLOCK_H[$rem] }
    $s.PadRight($width)
}

function USpark([double[]]$values) {
    $lo = ($values | Measure-Object -Minimum).Minimum
    $hi = ($values | Measure-Object -Maximum).Maximum
    ($values | ForEach-Object {
        $BLOCK_V[[int][math]::Round(($_ - $lo) / ($hi - $lo) * 7) + 1]
    }) -join ''
}

function UColumns([double[]]$values, [int]$height, [int]$spacing) {
    $hi = ($values | Measure-Object -Maximum).Maximum
    $rows = @()
    for ($r = $height; $r -ge 1; $r--) {
        $line = ''
        foreach ($v in $values) {
            $eighths = [int][math]::Round($v / $hi * $height * 8)
            $cell = $eighths - (($r - 1) * 8)
            $glyph = if ($cell -ge 8) { $BLK_FULL } elseif ($cell -le 0) { ' ' } else { $BLOCK_V[$cell] }
            $line += ([string]$glyph * 2) + (' ' * $spacing)
        }
        $rows += $line.TrimEnd()
    }
    $rows -join "`n"
}

function UBraille([double[]]$series, [int]$cellsWide, [int]$cellsTall) {
    $dotW = $cellsWide * 2
    $dotH = $cellsTall * 4
    $lo = ($series | Measure-Object -Minimum).Minimum
    $hi = ($series | Measure-Object -Maximum).Maximum
    $grid = New-Object 'int[,]' $cellsTall, $cellsWide
    $yAt = {
        param($x)
        $t = $x / ($dotW - 1) * ($series.Count - 1)
        $i = [math]::Floor($t)
        $f = $t - $i
        $v = if ($i + 1 -lt $series.Count) { $series[$i] * (1 - $f) + $series[$i + 1] * $f } else { $series[$i] }
        [int][math]::Round(($hi - $v) / ($hi - $lo) * ($dotH - 1))
    }
    for ($x = 0; $x -lt $dotW; $x++) {
        $y = & $yAt $x
        $yNext = if ($x + 1 -lt $dotW) { & $yAt ($x + 1) } else { $y }
        $from = [math]::Min($y, $yNext); $to = [math]::Max($y, $yNext)
        for ($yy = $from; $yy -le $to; $yy++) {
            $grid[[math]::Floor($yy / 4), [math]::Floor($x / 2)] = $grid[[math]::Floor($yy / 4), [math]::Floor($x / 2)] -bor $DOTS[$yy % 4][$x % 2]
        }
    }
    $rows = @()
    for ($r = 0; $r -lt $cellsTall; $r++) {
        $line = ''
        for ($c = 0; $c -lt $cellsWide; $c++) {
            $m = $grid[$r, $c]
            $line += if ($m -eq 0) { ' ' } else { [char](0x2800 + $m) }
        }
        $rows += $line.TrimEnd()
    }
    $rows -join "`n"
}

$allRevenue = [double[]]($data | ForEach-Object { [double]$_.revenue })
$monthRevenue = [double[]]($byMonth | ForEach-Object { $_.Revenue })

$unicodeVariants = @{}
function Add-Unicode($form, $technique, $note, $art) {
    # Same rule as Add-Entry: padding is load-bearing inside a line, never after it.
    $trimmed = (($art -split "`n") | ForEach-Object { $_.TrimEnd() }) -join "`n"
    $unicodeVariants[$form] = [pscustomobject]@{ Technique = $technique; Note = $note; Art = $trimmed }
}

Add-Unicode 'Horizontal bar' 'Block elements' 'Eighth-cell bar ends instead of whole characters' (
    ($byProduct | ForEach-Object { $_.Name.PadRight(10) + (UBar $_.Revenue $maxProd 34) + ' ' + (Money $_.Revenue).PadLeft(9) }) -join "`n"
)
Add-Unicode 'Bullet chart' 'Block elements' 'Sub-cell precision against the target marker' (
    (& {
        $maxRegion = ($byRegion | Measure-Object Revenue -Maximum).Maximum
        $byRegion | ForEach-Object {
            $_.Name.PadRight(7) + (UBar $_.Revenue $maxRegion 30) + '|' + ' ' + (Money $_.Revenue).PadLeft(9)
        }
    }) -join "`n"
)
Add-Unicode 'Gauge' 'Block elements' 'Progress resolves to 1/8 of a cell' (
    (& {
        $target = 260000
        $pct = $totalRev / $target * 100
        @(
            '0%' + (' ' * 17) + '50%' + (' ' * 16) + '100%'
            '[' + (UBar $totalRev $target 40) + ']  ' + $pct.ToString('N0') + '%'
            'Revenue ' + (Money $totalRev) + ' against target ' + (Money $target)
        )
    }) -join "`n"
)
Add-Unicode 'Sparkline' 'Block elements' 'Eight levels instead of three slash directions' (
    'Revenue  ' + (USpark $monthRevenue) + '   ' + (Money $byMonth[0].Revenue) + ' -> ' + (Money $byMonth[-1].Revenue) + "`n" +
    'Months   JFMAMJ'
)
Add-Unicode 'Column trend' 'Block elements' 'Column tops land between rows, not on them' (
    (UColumns $monthRevenue 6 2) + "`n" + (($byMonth | ForEach-Object { $_.Label.Substring(0, 2).PadRight(4) }) -join '')
)
Add-Unicode 'Histogram' 'Block elements' 'Bin heights resolve below a full row' (
    (& {
        $bins = @(0, 0, 0, 0, 0, 0)
        foreach ($v in $allRevenue) {
            $i = [math]::Min(5, [int][math]::Floor(($v - $min) / ($max - $min) * 6))
            $bins[$i]++
        }
        $hiBin = ($bins | Measure-Object -Maximum).Maximum
        for ($i = 0; $i -lt 6; $i++) {
            $lowEdge = $min + ($max - $min) * $i / 6
            (Money $lowEdge).PadLeft(8) + ' ' + (UBar $bins[$i] $hiBin 30) + ' ' + $bins[$i]
        }
    }) -join "`n"
)
Add-Unicode 'Line chart' 'Braille' 'Eight vertical positions per row instead of one' (
    (& {
        $art = UBraille $monthRevenue 46 5
        $lines = $art -split "`n"
        $lo = ($monthRevenue | Measure-Object -Minimum).Minimum
        $hi = ($monthRevenue | Measure-Object -Maximum).Maximum
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $v = $hi - ($hi - $lo) * $i / ($lines.Count - 1)
            $lines[$i] = (Money $v).PadLeft(8) + ' |' + $lines[$i]
        }
        $lines += (' ' * 9) + (($byMonth | ForEach-Object { $_.Label.PadRight(8) }) -join '')
        $lines
    }) -join "`n"
)
Add-Unicode 'Area chart' 'Block elements' 'Fills from a nonzero floor so the variation stays visible' (
    (& {
        $lo = ($monthRevenue | Measure-Object -Minimum).Minimum
        $hi = ($monthRevenue | Measure-Object -Maximum).Maximum
        $floor = $lo - ($hi - $lo) * 0.35
        $rows = @()
        for ($r = 6; $r -ge 1; $r--) {
            $line = (' ' * 8) + '|'
            foreach ($v in $monthRevenue) {
                $eighths = [int][math]::Round(($v - $floor) / ($hi - $floor) * 6 * 8)
                $cell = $eighths - (($r - 1) * 8)
                $glyph = if ($cell -ge 8) { $BLK_FULL } elseif ($cell -le 0) { ' ' } else { $BLOCK_V[$cell] }
                $line += ([string]$glyph * 4) + ' '
            }
            $rows += $line.TrimEnd()
        }
        $rows += (' ' * 8) + '+' + ('-' * 29)
        $rows += (' ' * 9) + (($byMonth | ForEach-Object { $_.Label.PadRight(5) }) -join '')
        $rows += (' ' * 9) + 'floor ' + (Money $floor) + ', not zero'
        $rows
    }) -join "`n"
)
Add-Unicode 'ECDF' 'Braille' 'The step edge lands on a dot, not a whole cell' (
    (& {
        $sorted = [double[]]($allRevenue | Sort-Object)
        $curve = @()
        for ($i = 0; $i -lt 40; $i++) {
            $v = $min + ($max - $min) * $i / 39
            $curve += (@($sorted | Where-Object { $_ -le $v }).Count / $sorted.Count) * 100
        }
        $art = UBraille ([double[]]$curve) 40 4
        $lines = $art -split "`n"
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $p = 100 - 25 * $i
            $lines[$i] = ($p.ToString() + '%').PadLeft(5) + ' |' + $lines[$i]
        }
        $lines += (' ' * 6) + '+' + ('-' * 40)
        $lines += (' ' * 7) + (Money $min).PadRight(32) + (Money $max)
        $lines
    }) -join "`n"
)
Add-Unicode 'Scatter plot' 'Braille' 'Each cell carries eight addressable points' (
    (& {
        $pairs = $data | ForEach-Object { [pscustomobject]@{ X = [double]$_.units; Y = [double]$_.revenue } } | Sort-Object X
        $ys = [double[]]($pairs | ForEach-Object { $_.Y })
        $art = UBraille $ys 44 5
        $lines = $art -split "`n"
        $lines += '+' + ('-' * 44)
        $lines += 'units ascending ->'
        $lines
    }) -join "`n"
)
Add-Unicode 'Step line' 'Box-drawing' 'Connected strokes instead of separated underscores' (
    (& {
        $lo = ($monthRevenue | Measure-Object -Minimum).Minimum
        $hi = ($monthRevenue | Measure-Object -Maximum).Maximum
        $H = 6
        $grid = @()
        for ($r = 0; $r -lt $H; $r++) { $grid += , (New-Object 'char[]' 36) }
        for ($r = 0; $r -lt $H; $r++) { for ($c = 0; $c -lt 36; $c++) { $grid[$r][$c] = ' ' } }
        $rowOf = { param($v) [int][math]::Round(($hi - $v) / ($hi - $lo) * ($H - 1)) }
        for ($i = 0; $i -lt $monthRevenue.Count; $i++) {
            $r = & $rowOf $monthRevenue[$i]
            $c0 = $i * 6
            for ($c = $c0; $c -lt [math]::Min(36, $c0 + 6); $c++) { $grid[$r][$c] = [char]0x2500 }
            if ($i -gt 0) {
                $rPrev = & $rowOf $monthRevenue[$i - 1]
                $from = [math]::Min($r, $rPrev); $to = [math]::Max($r, $rPrev)
                for ($y = $from + 1; $y -lt $to; $y++) { $grid[$y][$c0] = [char]0x2502 }
                if ($r -lt $rPrev) { $grid[$r][$c0] = [char]0x256D; $grid[$rPrev][$c0] = [char]0x256F }
                elseif ($r -gt $rPrev) { $grid[$r][$c0] = [char]0x2570; $grid[$rPrev][$c0] = [char]0x256E }
            }
        }
        $out = @()
        for ($r = 0; $r -lt $H; $r++) {
            $v = $hi - ($hi - $lo) * $r / ($H - 1)
            $out += (Money $v).PadLeft(8) + ' |' + (-join $grid[$r]).TrimEnd()
        }
        $out += (' ' * 9) + (($byMonth | ForEach-Object { $_.Label.PadRight(6) }) -join '')
        $out
    }) -join "`n"
)

$SHADE = @([char]0x20, [char]0x2591, [char]0x2592, [char]0x2593, [char]0x2588)
$LIGHT = [char]0x2591
$DIAG_UP = [char]0x2571
$DIAG_DN = [char]0x2572
$ARROW = [char]0x2192
function UShade([double]$v, [double]$hi) { $SHADE[[int][math]::Round($v / $hi * 4)] }

# A bar growing leftward can only close on a half or eighth right-edge block,
# so negative bars round to whole cells while positive bars keep eighth precision.
function UBarLeft([double]$value, [double]$max, [int]$width) {
    $cells = [int][math]::Round($value / $max * $width)
    (([string]$BLK_FULL * $cells)).PadLeft($width)
}

Add-Unicode 'Dot plot' 'Braille' 'The marker lands on a half-cell, so close values separate' (
    (& {
        $lo = ($monthRevenue | Measure-Object -Minimum).Minimum
        $hi = ($monthRevenue | Measure-Object -Maximum).Maximum
        $cellsW = 32
        $byMonth | ForEach-Object {
            $x = [int][math]::Round(($_.Revenue - $lo) / ($hi - $lo) * ($cellsW * 2 - 1))
            $line = ''
            for ($c = 0; $c -lt $cellsW; $c++) {
                $mask = 0x24
                if ([math]::Floor($x / 2) -eq $c) { $mask = if ($x % 2 -eq 0) { 0x47 } else { 0xB8 } }
                $line += [char](0x2800 + $mask)
            }
            $_.Label.PadRight(5) + $line + '  ' + (Money $_.Revenue).PadLeft(8)
        }
    }) -join "`n"
)

Add-Unicode 'Grouped bar' 'Block elements' 'Every bar end resolves to an eighth of a cell' (
    (& {
        $hiCombo = ($combos | Measure-Object Revenue -Maximum).Maximum
        $out = @()
        foreach ($r in $byRegion) {
            $out += $r.Name
            foreach ($p in $byProduct) {
                $v = ($data | Where-Object { $_.region -eq $r.Name -and $_.product -eq $p.Name } |
                    Measure-Object revenue -Sum).Sum
                $out += '  ' + $p.Name.PadRight(9) + (UBar $v $hiCombo 28) + ' ' + (Money $v).PadLeft(8)
            }
        }
        $out
    }) -join "`n"
)

Add-Unicode 'Small multiples' 'Block elements' 'Eight levels per panel instead of three slash directions' (
    (& {
        $byRegion | ForEach-Object {
            $name = $_.Name
            $s = [double[]]($byMonth | ForEach-Object { $regionMonth[$name + '|' + $_.Label] })
            $name.PadRight(8) + (USpark $s) + '   ' + (Money $_.Revenue).PadLeft(9)
        }
    }) -join "`n"
)

Add-Unicode 'Stacked 100% bar' 'Block elements' 'The segment boundary lands mid-cell instead of snapping to one' (
    (& {
        $north = $byRegion[0]
        $width = 60
        $bar = (UBar $north.Revenue $totalRev $width).TrimEnd()
        @(
            $bar + ([string]$LIGHT * ($width - $bar.Length))
            $byRegion[0].Name + ' ' + ($byRegion[0].Revenue / $totalRev * 100).ToString('N1') + '%  ' +
            $byRegion[1].Name + ' ' + ($byRegion[1].Revenue / $totalRev * 100).ToString('N1') + '%'
        )
    }) -join "`n"
)

Add-Unicode 'Percentage rows' 'Block elements' 'A 60.4% row ends past the 60% cell, not on it' (
    (& {
        $byProduct | ForEach-Object {
            $bar = (UBar $_.Revenue $totalRev 40).TrimEnd()
            $_.Name.PadRight(10) + $bar + ([string]$LIGHT * (40 - $bar.Length)) + '  ' +
            ($_.Revenue / $totalRev * 100).ToString('N1') + '%'
        }
    }) -join "`n"
)

Add-Unicode 'Waffle grid' 'Block elements' 'No fidelity gain; a waffle is whole cells by definition and only the glyph weight changes' (
    (& {
        $filled = [int][math]::Round($byRegion[0].Revenue / $totalRev * 100)
        $out = @()
        for ($r = 0; $r -lt 5; $r++) {
            $line = ''
            for ($c = 0; $c -lt 20; $c++) {
                $line += if (($r * 20 + $c) -lt $filled) { $BLK_FULL } else { $LIGHT }
            }
            $out += $line
        }
        $out += [string]$BLK_FULL + ' ' + $byRegion[0].Name + ' ' + $filled + '%   ' +
                [string]$LIGHT + ' ' + $byRegion[1].Name + ' ' + (100 - $filled) + '%'
        $out
    }) -join "`n"
)

Add-Unicode 'Box plot' 'Box-drawing' 'A doubled stroke separates the box from the whiskers without a legend' (
    (& {
        # Same quartiles the ASCII column uses; recomputing them drifted the two apart.
        $w = 46
        $at = { param($v) [int][math]::Round(($v - $min) / ($max - $min) * ($w - 1)) }
        $line = New-Object 'char[]' $w
        for ($i = 0; $i -lt $w; $i++) { $line[$i] = [char]0x2500 }
        for ($i = (& $at $q1); $i -le (& $at $q3); $i++) { $line[$i] = [char]0x2550 }
        $line[0] = [char]0x251C; $line[$w - 1] = [char]0x2524
        $line[(& $at $q1)] = [char]0x255E; $line[(& $at $q3)] = [char]0x2561
        $line[(& $at $med)] = [char]0x256A
        @(
            (-join $line)
            'min ' + (Money $min) + '   Q1 ' + (Money $q1) + '   med ' + (Money $med) +
            '   Q3 ' + (Money $q3) + '   max ' + (Money $max)
        )
    }) -join "`n"
)

Add-Unicode 'Heatmap' 'Block elements' 'One glyph carries the level, so a cell shrinks from five characters to three' (
    (& {
        # Same bucket edges as the ASCII Ramp, so both columns tell one story.
        $out = @(((' ' * 8) + (($byMonth | ForEach-Object { $_.Label.PadRight(4) }) -join '')).TrimEnd())
        foreach ($r in $byRegion) {
            $row = $r.Name.PadRight(8)
            foreach ($m in $byMonth) {
                $t = ($cells[$r.Name + '|' + $m.Label] - $cMin) / ($cMax - $cMin)
                $g = if ($t -ge 0.75) { $SHADE[4] } elseif ($t -ge 0.5) { $SHADE[3] } elseif ($t -ge 0.25) { $SHADE[2] } else { $SHADE[1] }
                $row += ([string]$g * 3) + ' '
            }
            $out += $row.TrimEnd()
        }
        $out
    }) -join "`n"
)

Add-Unicode 'Funnel' 'Block elements' 'Stage widths resolve below a whole character, so small drops stay visible' (
    (& {
        $stages | ForEach-Object {
            $bar = (UBar $_.Value $stages[0].Value 40).TrimEnd()
            $pad = [math]::Floor((40 - $bar.Length) / 2)
            (' ' * $pad) + $bar + '  ' + $_.Name.PadRight(10) + $_.Value.ToString('N0').PadLeft(6)
        }
    }) -join "`n"
)

Add-Unicode 'Stage pipeline' 'Box-drawing' 'Closed boxes and real arrows instead of brackets and hyphens' (
    (& {
        $names = @('Ingest', 'Clean', 'Select', 'Render', 'Verify')
        $marks = @('ok', 'ok', 'ok', 'ok', 'WARN')
        $top = ''; $mid = ''; $bot = ''; $sta = ''
        for ($i = 0; $i -lt $names.Count; $i++) {
            $inner = ' ' + $names[$i] + ' '
            $sep = if ($i -lt $names.Count - 1) { ' ' + $ARROW + ' ' } else { '' }
            $top += [char]0x250C + ([string][char]0x2500 * $inner.Length) + [char]0x2510 + (' ' * $sep.Length)
            $mid += [char]0x2502 + $inner + [char]0x2502 + $sep
            $bot += [char]0x2514 + ([string][char]0x2500 * $inner.Length) + [char]0x2518 + (' ' * $sep.Length)
            $sta += $marks[$i].PadLeft([math]::Floor(($inner.Length + 2 + $marks[$i].Length) / 2)).PadRight($inner.Length + 2 + $sep.Length)
        }
        @($top.TrimEnd(), $mid.TrimEnd(), $bot.TrimEnd(), $sta.TrimEnd())
    }) -join "`n"
)

Add-Unicode 'Slope chart' 'Box-drawing' 'Diagonals span corner to corner, so consecutive cells meet where ASCII slashes leave gaps' (
    (& {
        $out = @((' ' * 8) + $firstLabel.PadRight(26) + $lastLabel)
        foreach ($r in $byRegion) {
            $a = $regionMonth[$r.Name + '|' + $firstLabel]
            $b = $regionMonth[$r.Name + '|' + $lastLabel]
            $g = if ($b -ge $a) { $DIAG_UP } else { $DIAG_DN }
            $out += $r.Name.PadRight(7) + (Money $a).PadLeft(8) + ' ' + ([string]$g * 16) + ' ' + (Money $b).PadLeft(8)
        }
        $out
    }) -join "`n"
)

Add-Unicode 'Waterfall' 'Block elements' 'Step widths resolve to an eighth, so the margin sliver keeps its true length' (
    (& {
        $margin = $totalRev - $grandCost
        $wMar = [math]::Round($margin / $totalRev * 40)
        # No light-shaded eighth glyph exists, so the deduction bar stays whole cells.
        $wCost = [int][math]::Round($grandCost / $totalRev * 40)
        @(
            'Revenue  ' + (UBar $totalRev $totalRev 40) + ' ' + (Money $totalRev).PadLeft(9)
            'Cost     ' + ((' ' * $wMar) + ([string]$LIGHT * $wCost)).PadRight(40) + ' ' + ('-' + (Money $grandCost)).PadLeft(9)
            'Margin   ' + (UBar $margin $totalRev 40) + ' ' + (Money $margin).PadLeft(9)
        )
    }) -join "`n"
)

Add-Unicode 'Pareto' 'Block elements' 'Bar ends resolve to an eighth while the cumulative share stays text' (
    (& {
        $cum = 0
        $maxC = $combos[0].Revenue
        $combos | ForEach-Object {
            $cum += $_.Revenue
            $bar = (UBar $_.Revenue $maxC 22).TrimEnd()
            $_.Name.PadRight(16) + $bar + ([string]$LIGHT * (22 - $bar.Length)) + ' ' +
            (Money $_.Revenue).PadLeft(8) + '  cum ' + ($cum / $totalRev * 100).ToString('N0').PadLeft(3) + '%'
        }
    }) -join "`n"
)

Add-Unicode 'KPI card' 'Box-drawing' 'A closed frame instead of plus signs and hyphens at the corners' (
    (& {
        $w = 28
        $delta = ($byMonth[-1].Revenue - $byMonth[0].Revenue) / $byMonth[0].Revenue * 100
        $rows = @(
            '  REVENUE'
            '  ' + (Money $totalRev)
            '  ' + (USpark $monthRevenue) + '  +' + $delta.ToString('N1') + '% vs ' + $firstLabel
        )
        @([char]0x250C + ([string][char]0x2500 * $w) + [char]0x2510) +
        ($rows | ForEach-Object { [char]0x2502 + $_.PadRight($w) + [char]0x2502 }) +
        @([char]0x2514 + ([string][char]0x2500 * $w) + [char]0x2518)
    }) -join "`n"
)

Add-Unicode 'Treemap' 'Box-drawing' 'Rectangles close properly, so the split reads as area rather than text columns' (
    (& {
        $total = 56
        $wA = [int][math]::Round($byProduct[0].Revenue / $totalRev * $total)
        $wB = $total - $wA
        $h = [char]0x2500
        @(
            [char]0x250C + ([string]$h * $wA) + [char]0x252C + ([string]$h * $wB) + [char]0x2510
            [char]0x2502 + $byProduct[0].Name.PadRight($wA) + [char]0x2502 + $byProduct[1].Name.PadRight($wB) + [char]0x2502
            [char]0x2502 + ((Money $byProduct[0].Revenue) + '  ' + ($byProduct[0].Revenue / $totalRev * 100).ToString('N0') + '%').PadRight($wA) + [char]0x2502 + ((Money $byProduct[1].Revenue) + '  ' + ($byProduct[1].Revenue / $totalRev * 100).ToString('N0') + '%').PadRight($wB) + [char]0x2502
            [char]0x2514 + ([string]$h * $wA) + [char]0x2534 + ([string]$h * $wB) + [char]0x2518
        )
    }) -join "`n"
)

Add-Unicode 'Strip plot' 'Braille' 'Collisions stack as separate dots instead of collapsing into a count' (
    (& {
        $lo = ($allRevenue | Measure-Object -Minimum).Minimum
        $hi = ($allRevenue | Measure-Object -Maximum).Maximum
        $cellsW = 44
        $out = @()
        foreach ($r in $byRegion) {
            $vals = $data | Where-Object { $_.region -eq $r.Name } | ForEach-Object { [double]$_.revenue }
            $counts = @{}
            foreach ($v in $vals) {
                $x = [int][math]::Round(($v - $lo) / ($hi - $lo) * ($cellsW * 2 - 1))
                if (-not $counts.ContainsKey($x)) { $counts[$x] = 0 }
                $counts[$x]++
            }
            $line = ''
            for ($c = 0; $c -lt $cellsW; $c++) {
                $mask = 0
                foreach ($sub in 0, 1) {
                    $x = $c * 2 + $sub
                    if ($counts.ContainsKey($x)) {
                        for ($k = 0; $k -lt [math]::Min(4, $counts[$x]); $k++) {
                            $mask = $mask -bor $DOTS[3 - $k][$sub]
                        }
                    }
                }
                $line += if ($mask -eq 0) { ' ' } else { [char](0x2800 + $mask) }
            }
            $out += $r.Name.PadRight(7) + [char]0x2502 + $line.TrimEnd()
        }
        $out += (' ' * 7) + [char]0x2514 + ([string][char]0x2500 * 44)
        $out += (' ' * 8) + (Money $lo) + ' to ' + (Money $hi) + '    dots stack by count'
        $out
    }) -join "`n"
)

Add-Unicode 'Bubble plot' 'Braille' 'Dot density carries magnitude, so size costs no extra column' (
    (& {
        $rows = 6; $cellsW = 44
        $us = [double[]]($data | ForEach-Object { [double]$_.units })
        $rs = [double[]]($data | ForEach-Object { [double]$_.revenue })
        $cs = [double[]]($data | ForEach-Object { [double]$_.cost })
        $uLo = ($us | Measure-Object -Minimum).Minimum; $uHi = ($us | Measure-Object -Maximum).Maximum
        $rLo = ($rs | Measure-Object -Minimum).Minimum; $rHi = ($rs | Measure-Object -Maximum).Maximum
        $cLo = ($cs | Measure-Object -Minimum).Minimum; $cHi = ($cs | Measure-Object -Maximum).Maximum
        $grid = New-Object 'int[,]' $rows, $cellsW
        for ($i = 0; $i -lt $us.Count; $i++) {
            $x = [int][math]::Round(($us[$i] - $uLo) / ($uHi - $uLo) * ($cellsW - 1))
            $y = [int][math]::Round(($rHi - $rs[$i]) / ($rHi - $rLo) * ($rows - 1))
            $tier = [int][math]::Round(($cs[$i] - $cLo) / ($cHi - $cLo) * 2)
            $mask = @(0x01, 0x07, 0xFF)[$tier]
            $grid[$y, $x] = $grid[$y, $x] -bor $mask
        }
        $out = @()
        for ($r = 0; $r -lt $rows; $r++) {
            $line = ''
            for ($c = 0; $c -lt $cellsW; $c++) {
                $line += if ($grid[$r, $c] -eq 0) { ' ' } else { [char](0x2800 + $grid[$r, $c]) }
            }
            $out += [char]0x2502 + $line.TrimEnd()
        }
        $out += [char]0x2514 + ([string][char]0x2500 * $cellsW)
        $out += 'units ' + $ARROW + '   ' + [char](0x2800 + 0x01) + ' low cost   ' +
                [char](0x2800 + 0x07) + ' mid   ' + [char](0x2800 + 0xFF) + ' high cost'
        $out
    }) -join "`n"
)

Add-Unicode 'Parallel coordinates' 'Braille' 'Each tick lands on a half-cell, so near-equal months stop overlapping' (
    (& {
        $axes = @(
            @{ Name = 'revenue'; Values = [double[]]($byMonth | ForEach-Object { $_.Revenue }) }
            @{ Name = 'units'; Values = [double[]]($byMonth | ForEach-Object { $_.Units }) }
            @{ Name = 'cost'; Values = [double[]]($byMonth | ForEach-Object { $m = $_.Label; ($data | Where-Object { ([datetime]$_.date).ToString('MMM') -eq $m } | Measure-Object cost -Sum).Sum }) }
        )
        $w = 12
        $out = @((' ' * 8) + 'revenue'.PadRight($w + 2) + 'units'.PadRight($w + 2) + 'cost')
        for ($m = 0; $m -lt $byMonth.Count; $m++) {
            $row = $byMonth[$m].Label.PadRight(8)
            foreach ($ax in $axes) {
                $lo = ($ax.Values | Measure-Object -Minimum).Minimum
                $hi = ($ax.Values | Measure-Object -Maximum).Maximum
                $x = [int][math]::Round(($ax.Values[$m] - $lo) / ($hi - $lo) * ($w * 2 - 1))
                $seg = ''
                for ($c = 0; $c -lt $w; $c++) {
                    $mask = 0x24
                    if ([math]::Floor($x / 2) -eq $c) { $mask = if ($x % 2 -eq 0) { 0x47 } else { 0xB8 } }
                    $seg += [char](0x2800 + $mask)
                }
                $row += $seg + '  '
            }
            $out += $row.TrimEnd()
        }
        $out
    }) -join "`n"
)

Add-Unicode 'Sankey flow' 'Box-drawing' 'Real corners and joins instead of backslashes and angle brackets' (
    (& {
        $n = $byRegion[0]; $s = $byRegion[1]
        $wN = [int][math]::Round($n.Revenue / $totalRev * 22)
        $wS = [int][math]::Round($s.Revenue / $totalRev * 22)
        @(
            $n.Name.PadRight(7) + (Money $n.Revenue).PadLeft(9) + ' ' + ([string]$BLK_FULL * $wN) +
                ([string]$LIGHT * (22 - $wN)) + [char]0x2510
            (' ' * 40) + [char]0x251C + [char]0x2500 + ' Total ' + (Money $totalRev)
            $s.Name.PadRight(7) + (Money $s.Revenue).PadLeft(9) + ' ' + ([string]$BLK_FULL * $wS) +
                ([string]$LIGHT * (22 - $wS)) + [char]0x2518
        )
    }) -join "`n"
)

Add-Unicode 'Diverging bar' 'Block elements' 'Growth keeps eighth precision; shortfalls round to whole cells because only right-edge eighths exist' (
    (& {
        $devs = $byMonth | ForEach-Object { $_.Revenue - $avgMonth }
        $peak = ($devs | ForEach-Object { [math]::Abs($_) } | Measure-Object -Maximum).Maximum
        for ($i = 0; $i -lt $byMonth.Count; $i++) {
            $d = $devs[$i]
            $left = if ($d -lt 0) { UBarLeft ([math]::Abs($d)) $peak 24 } else { ' ' * 24 }
            $right = if ($d -ge 0) { UBar $d $peak 24 } else { ' ' * 24 }
            $byMonth[$i].Label.PadRight(5) + $left + [char]0x2502 + $right.TrimEnd().PadRight(24) + ' ' +
            (($(if ($d -ge 0) { '+' } else { '-' }) + (Money ([math]::Abs($d))))).PadLeft(9)
        }
    }) -join "`n"
)

Add-Unicode 'Variance column' 'Block elements' 'A shaded deviation bar replaces the bracketed status word' (
    (& {
        $devs = $byMonth | ForEach-Object { $_.Revenue - $avgMonth }
        $peak = ($devs | ForEach-Object { [math]::Abs($_) } | Measure-Object -Maximum).Maximum
        for ($i = 0; $i -lt $byMonth.Count; $i++) {
            $d = $devs[$i]
            $bar = (UBar ([math]::Abs($d)) $peak 16).TrimEnd()
            $glyph = if ($d -ge 0) { $BLK_FULL } else { $LIGHT }
            $byMonth[$i].Label.PadRight(6) + (Money $byMonth[$i].Revenue).PadLeft(8) + '  vs avg ' +
            (Money $avgMonth).PadLeft(8) + '  ' +
            ($bar -replace [regex]::Escape([string]$BLK_FULL), [string]$glyph).PadRight(16) + ' ' +
            (($(if ($d -ge 0) { '+' } else { '-' }) + [math]::Abs([math]::Round($d)).ToString('N0'))).PadLeft(7)
        }
    }) -join "`n"
)

# Unicode variants get the same width discipline as ASCII; only the glyph set differs.
foreach ($e in $entries) {
    if (-not $unicodeVariants.ContainsKey($e.Form)) { throw "No Unicode variant for form '$($e.Form)'" }
}
foreach ($form in $unicodeVariants.Keys) {
    $v = $unicodeVariants[$form]
    if (-not $v.Art) { throw "Unicode variant '$form' produced no output" }
    foreach ($line in ($v.Art -split "`n")) {
        if ($line.Length -gt $MAXW) { throw "Unicode variant '$form' exceeds $MAXW chars: $($line.Length)" }
    }
    if ($v.Art -match '[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uFF00-\uFF60]') {
        throw "Unicode variant '$form' contains a wide character that breaks the grid"
    }
}

# --- Big Ideas --------------------------------------------------------------
# The input to chart selection: the one-sentence claim the figure has to carry.
# Best-when/avoid-when is the output, the form chosen to carry it. Every claim
# below is checked against sales-sample.csv; an unverifiable claim is a defect.
$bigIdeas = @{
    'Horizontal bar'       = 'Widget A brings in 60% of revenue, half again more than Widget B.'
    'Dot plot'             = 'Monthly revenue rose overall, dipping only in April and June.'
    'Bullet chart'         = 'North clears the regional revenue mark that South falls short of.'
    'Grouped bar'          = 'Widget A leads in both regions, so the product gap is not a regional artifact.'
    'Slope chart'          = 'Both regions grew from January to June and neither changed rank.'
    'Waterfall'            = 'Cost consumes 70% of revenue, leaving a 30% margin.'
    'Pareto'               = 'The top two region-product pairs carry 60% of all revenue.'
    'Gauge'                = 'Revenue reached 95% of the 260,000 target.'
    'KPI card'             = 'Revenue closed at 246,400, up 16.6% since January.'
    'Sparkline'            = 'Revenue trended up across the half year despite two monthly dips.'
    'Column trend'         = 'Every month except April and June beat the month before it.'
    'Step line'            = 'Revenue holds a level for a month at a time rather than moving continuously.'
    'Small multiples'      = 'Both regions follow the same monthly shape at different scales.'
    'Line chart'           = 'Revenue climbed from 36,800 to a May peak of 44,800, then eased.'
    'Area chart'           = 'Monthly revenue grew steadily, but the totals sit far above zero.'
    'Stacked 100% bar'     = 'North holds 57% of revenue against South''s 43%.'
    'Percentage rows'      = 'Widget A holds 60% of revenue against Widget B''s 40%.'
    'Waffle grid'          = 'About 56 of every 100 revenue dollars come from North.'
    'Treemap'              = 'Widget A occupies three fifths of the revenue area.'
    'Histogram'            = 'Most transactions cluster near 10,000 with a thin tail out to 15,100.'
    'Box plot'             = 'The middle half of transactions falls between 8,300 and 12,500.'
    'Strip plot'           = 'South clusters at the low end while North spreads across the full range.'
    'ECDF'                 = 'Half of all transactions come in under about 10,000.'
    'Scatter plot'         = 'Revenue rises with units sold and no transaction breaks the pattern.'
    'Heatmap'              = 'North outsells South in every one of the six months.'
    'Bubble plot'          = 'Higher-revenue transactions carry proportionally higher cost, so margin stays flat.'
    'Parallel coordinates' = 'Revenue, units, and cost move together because each is derived from the others.'
    'Funnel'               = 'Each stage loses a predictable share of the stage before it.'
    'Stage pipeline'       = 'The pipeline clears four stages and flags the fifth for review.'
    'Sankey flow'          = 'Two regional streams merge into a single 246,400 total.'
    'Diverging bar'        = 'Three months ran above the monthly average and three below it.'
    'Variance column'      = 'Monthly revenue stays within about 10% of the half-year average.'
}

foreach ($e in $entries) {
    if (-not $bigIdeas.ContainsKey($e.Form)) { throw "No Big Idea for form '$($e.Form)'" }
}

# A claim naming an entity the figure never plots is the defect a Big Idea exists
# to prevent. Four claims failed this on first write, two of them swapped.
foreach ($e in $entries) {
    if ($e.Source -ne 'real') { continue }
    $claim = $bigIdeas[$e.Form]
    foreach ($entity in 'Widget A', 'Widget B', 'North', 'South') {
        if ($claim -match [regex]::Escape($entity) -and $e.Ascii -notmatch [regex]::Escape($entity)) {
            throw "Big Idea for '$($e.Form)' names '$entity' but the figure never plots it"
        }
    }
}

# --- render markdown --------------------------------------------------------
$goals = 'Comparison', 'Change Over Time', 'Proportion', 'Distribution', 'Relationship', 'Flow and Process', 'Deviation'
$md = [System.Collections.Generic.List[string]]::new()
$md.Add('# ASCII Chart Gallery')
$md.Add('')
$md.Add('An ASCII counterpart to a chart gallery. Every form below is organized by')
$md.Add('the same seven communication goals used by Illustrator''s `chart-vocabulary`')
$md.Add('skill, so the two compose: pick the goal there, render it here when the')
$md.Add('target is a terminal, a log file, a pull request, or a context window.')
$md.Add('')
$md.Add('Figures marked **real** are computed from `demos/ascii-gallery/sales-sample.csv`.')
$md.Add('Figures marked **illustrative** use shaped data because the sample has no')
$md.Add('funnel or process structure; the form is the point, not the numbers.')
$md.Add('')
$md.Add('Regenerate with `pwsh -NoProfile -File demos/ascii-gallery/build-gallery.ps1`.')
$md.Add('')
$md.Add('| Goal | Forms |')
$md.Add('| --- | --- |')
foreach ($g in $goals) {
    $forms = ($entries | Where-Object Goal -eq $g | ForEach-Object { $_.Form }) -join ', '
    $md.Add("| [$g](#" + ($g.ToLower() -replace ' ', '-') + ") | $forms |")
}
$md.Add('')
foreach ($g in $goals) {
    $md.Add("## $g")
    $md.Add('')
    foreach ($e in ($entries | Where-Object Goal -eq $g)) {
        $md.Add("### $($e.Form)")
        $md.Add('')
        $md.Add("**Big Idea.** $($bigIdeas[$e.Form])")
        $md.Add('')
        $md.Add("Best when $($e.Best). Avoid when $($e.Avoid). Data: **$($e.Source)**.")
        $flint = $flintEquivalents[$e.Form]
        $md.Add("Flint equivalent: **$($flint.Type)** ($($flint.Match)).")
        $md.Add('')
        $md.Add('```text')
        foreach ($l in ($e.Ascii -split "`n")) { $md.Add($l) }
        $md.Add('```')
        $md.Add('')
    }
}
$md.Add('## Flint coverage')
$md.Add('')
$md.Add("Of the $($coverage.Count) chart types Flint offers, $covered have a direct ASCII")
$md.Add('counterpart here. The rest are listed so the boundary is explicit rather than')
$md.Add('discovered halfway through a render.')
$md.Add('')
$md.Add('| Flint family | Flint chart | ASCII form | Status |')
$md.Add('| --- | --- | --- | --- |')
foreach ($c in $coverage) { $md.Add("| $($c.Family) | $($c.Flint) | $($c.Ascii) | $($c.Status) |") }
$md.Add('')
$md.Add('### Not viable in ASCII')
$md.Add('')
$md.Add('| Form | Why | Use instead |')
$md.Add('| --- | --- | --- |')
foreach ($l in $limits) { $md.Add("| $($l.Form) | $($l.Why) | $($l.Instead) |") }
$md.Add('')
Set-Content -Path (Join-Path $outRoot 'GALLERY.md') -Value ($md -join "`n") -Encoding utf8
Set-Content -Path $refOut -Value ($md -join "`n") -Encoding utf8

# --- render html ------------------------------------------------------------
function HtmlEscape([string]$s) { $s.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;') }
$html = [System.Collections.Generic.List[string]]::new()
$html.Add('<!DOCTYPE html>')
$html.Add('<html lang="en"><head><meta charset="utf-8">')
$html.Add('<meta name="viewport" content="width=device-width, initial-scale=1">')
$html.Add('<title>ASCII, Unicode, and Flint Chart Gallery</title>')
$html.Add('<script src="https://cdn.jsdelivr.net/npm/vega@6"></script>')
$html.Add('<script src="https://cdn.jsdelivr.net/npm/vega-lite@6"></script>')
$html.Add('<script src="https://cdn.jsdelivr.net/npm/vega-embed@7"></script>')
$html.Add('<style>')
$html.Add(':root{--bg:#0f172a;--card:#1e293b;--ink:#e2e8f0;--mute:#94a3b8;--accent:#10b981;--flint:#38bdf8;--line:#334155}')
$html.Add('*{box-sizing:border-box}')
$html.Add('body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif}')
$html.Add('header{padding:2.5rem 1.5rem 1.5rem;border-bottom:1px solid var(--line)}')
$html.Add('h1{margin:0 0 .5rem;font-size:1.9rem;color:#fff}')
$html.Add('header p{margin:.35rem 0;color:var(--mute);max-width:62ch}')
$html.Add('main{padding:1.5rem;max-width:1440px;margin:0 auto}')
$html.Add('nav{display:flex;flex-wrap:wrap;gap:.5rem;margin:1.25rem 0 2rem}')
$html.Add('nav a{padding:.35rem .8rem;border:1px solid var(--line);border-radius:999px;color:var(--ink);text-decoration:none;font-size:.85rem}')
$html.Add('nav a:hover{border-color:var(--accent);color:var(--accent)}')
$html.Add('h2{margin:2.5rem 0 1rem;font-size:1.3rem;color:var(--accent);border-bottom:1px solid var(--line);padding-bottom:.4rem}')
$html.Add('.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:1rem 1.25rem;margin:0 0 1.25rem}')
$html.Add('.card h3{margin:0 0 .35rem;font-size:1.05rem;color:#fff}')
$html.Add('.meta{margin:0 0 .75rem;color:var(--mute);font-size:.85rem}')
$html.Add('.comparison{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(16rem,.62fr);gap:1rem;align-items:stretch}')
$html.Add('.column:first-child pre{height:calc(100% - 1.15rem)}')
$html.Add('.uni-note{margin:.4rem 0 0;color:var(--mute);font-size:.72rem;line-height:1.35}')
$html.Add('.idea{margin:.1rem 0 .3rem;color:var(--ink);font-size:.95rem;line-height:1.45;border-left:3px solid var(--accent);padding-left:.6rem}')
$html.Add('.idea::before{content:"Big Idea ";color:var(--accent);font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:.1rem}')
$html.Add('.uni-tech{color:#c4b5fd;font-weight:700}')
$html.Add('.column{min-width:0}')
$html.Add('.column:first-child pre{height:calc(100% - 1.15rem)}')
$html.Add('.column-label{margin:0 0 .45rem;color:var(--mute);font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}')
$html.Add('.flint-panel{min-height:7rem;display:flex;flex-direction:column;justify-content:center;background:#f8fafc;border:1px solid var(--line);border-left:3px solid var(--flint);border-radius:8px;padding:.7rem .8rem;overflow:hidden}')
$html.Add('.flint-chart{display:flex;align-items:center;justify-content:center;overflow:hidden}')
$html.Add('.flint-chart svg{display:block;max-width:100%;height:auto}')
$html.Add('.flint-caption{display:flex;align-items:baseline;justify-content:space-between;gap:.75rem;padding:.55rem .3rem .1rem;border-top:1px solid #cbd5e1}')
$html.Add('.flint-type{margin:0;color:#0f172a;font-size:.9rem;font-weight:700}')
$html.Add('.flint-match{margin:0;color:#0369a1;font-size:.75rem;white-space:nowrap}')
$html.Add('.flint-empty{min-height:12rem;align-items:flex-start;padding:1.1rem}')
$html.Add('.tag{display:inline-block;padding:.05rem .5rem;border-radius:999px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;margin-left:.4rem}')
$html.Add('.real{background:rgba(16,185,129,.15);color:var(--accent)}')
$html.Add('.illustrative{background:rgba(148,163,184,.15);color:var(--mute)}')
$html.Add('.approximate{background:rgba(245,158,11,.15);color:#f59e0b}')
$html.Add('.notviable{background:rgba(148,163,184,.12);color:var(--mute);text-decoration:line-through}')
# Cascadia leads the stack because it renders braille at one cell; ui-monospace and
# Consolas substitute a 1.37x glyph that breaks the grid the figures are built on.
$html.Add('pre{margin:0;overflow-x:auto;background:#0b1220;border:1px solid var(--line);border-radius:8px;padding:.9rem;color:var(--ink);font:13px/1.35 "Cascadia Mono","Cascadia Code",ui-monospace,SFMono-Regular,Consolas,monospace}')
$html.Add('footer{padding:2rem 1.5rem;color:var(--mute);font-size:.85rem;border-top:1px solid var(--line);margin-top:2rem}')
$html.Add('table{width:100%;border-collapse:collapse;font-size:.88rem}')
$html.Add('.table-scroll{max-width:100%;overflow-x:auto}')
$html.Add('.table-scroll table{min-width:42rem}')
$html.Add('th,td{text-align:left;padding:.42rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}')
$html.Add('th{color:var(--mute);font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-size:.72rem}')
$html.Add('@media(max-width:1100px){.comparison{grid-template-columns:1fr}.column:first-child pre{height:auto}.flint-empty{min-height:auto}}')
$html.Add('</style></head><body>')
$html.Add('<header><h1>ASCII, Unicode, and Flint Chart Gallery</h1>')
$html.Add('<p>Three rungs of the same ladder, organized by Illustrator&#39;s seven communication goals: terminal-safe ASCII, sub-cell Unicode, and the Flint 0.5.0 Vega-Lite equivalent.</p>')
$html.Add('<p>ASCII runs anywhere. Unicode buys resolution inside a character cell through block elements, braille dot matrices, and box-drawing strokes, at the cost of font and locale assumptions. Flint needs a rendering engine.</p>')
$html.Add('<p>Every form carries a Unicode render, including the few where it buys no fidelity; those say so in the caption, so the comparison stays honest rather than silent. Exact matches use the same chart form. Nearest matches preserve the analytical intent where character geometry and graphical marks differ.</p>')
$html.Add('</header><main>')
$html.Add('<nav>')
foreach ($g in $goals) { $html.Add('<a href="#' + ($g.ToLower() -replace ' ', '-') + '">' + $g + '</a>') }
$html.Add('<a href="#flint-coverage">Flint coverage</a>')
$html.Add('</nav>')
foreach ($g in $goals) {
    $html.Add('<h2 id="' + ($g.ToLower() -replace ' ', '-') + '">' + $g + '</h2>')
    foreach ($e in ($entries | Where-Object Goal -eq $g)) {
        $html.Add('<div class="card">')
        $html.Add('<h3>' + (HtmlEscape $e.Form) + '<span class="tag ' + $e.Source + '">' + $e.Source + '</span></h3>')
        $html.Add('<p class="idea">' + (HtmlEscape $bigIdeas[$e.Form]) + '</p>')
        $html.Add('<p class="meta">Best when ' + (HtmlEscape $e.Best) + '. Avoid when ' + (HtmlEscape $e.Avoid) + '.</p>')
        $flint = $flintEquivalents[$e.Form]
        $uni = $unicodeVariants[$e.Form]
        $html.Add('<div class="comparison">')
        $html.Add('<div class="column"><p class="column-label">ASCII</p><pre>' + (HtmlEscape $e.Ascii) + '</pre></div>')
        $html.Add('<div class="column"><p class="column-label">Unicode</p><pre>' + (HtmlEscape $uni.Art) + '</pre><p class="uni-note"><span class="uni-tech">' + (HtmlEscape $uni.Technique) + '</span> - ' + (HtmlEscape $uni.Note) + '</p></div>')
        if ($flint.spec) {
            $html.Add('<div class="column"><p class="column-label">Flint equivalent</p><div class="flint-panel"><div class="flint-chart" data-form="' + (HtmlEscape $e.Form) + '"></div><div class="flint-caption"><p class="flint-type">' + (HtmlEscape $flint.type) + '</p><p class="flint-match">' + (HtmlEscape $flint.match) + '</p></div></div></div>')
        }
        else {
            $html.Add('<div class="column"><p class="column-label">Flint equivalent</p><div class="flint-panel flint-empty"><p class="flint-type">' + (HtmlEscape $flint.type) + '</p><p class="flint-match">' + (HtmlEscape $flint.match) + '</p></div></div>')
        }
        $html.Add('</div>')
        $html.Add('</div>')
    }
}
$html.Add('<h2 id="flint-coverage">Flint coverage</h2>')
$html.Add('<div class="card">')
$html.Add('<p class="meta">Of the ' + $coverage.Count + ' chart types Flint offers, ' + $covered + ' have a direct ASCII counterpart here. The rest are listed so the boundary is explicit rather than discovered halfway through a render.</p>')
$html.Add('<div class="table-scroll">')
$html.Add('<table><thead><tr><th>Flint family</th><th>Flint chart</th><th>ASCII form</th><th>Status</th></tr></thead><tbody>')
foreach ($c in $coverage) {
    $cls = switch ($c.Status) { 'Covered' { 'real' } 'Approximate' { 'approximate' } default { 'notviable' } }
    $html.Add('<tr><td>' + (HtmlEscape $c.Family) + '</td><td>' + (HtmlEscape $c.Flint) + '</td><td>' + (HtmlEscape $c.Ascii) + '</td><td><span class="tag ' + $cls + '">' + $c.Status + '</span></td></tr>')
}
$html.Add('</tbody></table>')
$html.Add('</div>')
$html.Add('</div>')
$html.Add('<div class="card">')
$html.Add('<h3>Not viable in ASCII</h3>')
$html.Add('<div class="table-scroll">')
$html.Add('<table><thead><tr><th>Form</th><th>Why</th><th>Use instead</th></tr></thead><tbody>')
foreach ($l in $limits) {
    $html.Add('<tr><td>' + (HtmlEscape $l.Form) + '</td><td>' + (HtmlEscape $l.Why) + '</td><td>' + (HtmlEscape $l.Instead) + '</td></tr>')
}
$html.Add('</tbody></table>')
$html.Add('</div>')
$html.Add('</div>')
$html.Add('</main>')
$html.Add('<footer>Generated by <code>demos/ascii-gallery/build-gallery.ps1</code> from <code>sales-sample.csv</code>. ASCII figures are no wider than 78 characters; Flint counterparts reflect the pinned 0.5.0 Vega-Lite catalog.</footer>')
$html.Add('<script>')
$html.Add('const flintSpecs = ' + $flintJson + ';')
$html.Add('Promise.all([...document.querySelectorAll(".flint-chart")].map((container) => vegaEmbed(container, flintSpecs[container.dataset.form].spec, { actions: false, renderer: "svg" }).catch((error) => { container.textContent = "Chart failed to render"; console.error(container.dataset.form, error); })));')
$html.Add('</script>')
$html.Add('</body></html>')
Set-Content -Path (Join-Path $outRoot 'gallery.html') -Value ($html -join "`n") -Encoding utf8

# --- validate ---------------------------------------------------------------
$failures = @()
foreach ($e in $entries) {
    if (-not $flintEquivalents.ContainsKey($e.Form)) { $failures += "$($e.Form): missing Flint equivalent" }
    foreach ($l in ($e.Ascii -split "`n")) {
        if ($l.Length -gt $MAXW) { $failures += "$($e.Form): line $($l.Length) chars exceeds $MAXW" }
        if ($l -match '[^\x20-\x7E]') { $failures += "$($e.Form): non-ASCII character" }
    }
}
Write-Host ("Entries: {0} across {1} goals" -f $entries.Count, $goals.Count)
foreach ($g in $goals) {
    Write-Host ("  {0,-18} {1}" -f $g, (($entries | Where-Object Goal -eq $g).Count))
}
if ($failures) {
    Write-Host ''
    Write-Host 'GALLERY FAILURES:' -ForegroundColor Red
    $failures | Select-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
}
Write-Host ''
Write-Host "GALLERY.md, gallery.html, and the bundled skill reference written. All figures ASCII-only and <= $MAXW chars." -ForegroundColor Green
