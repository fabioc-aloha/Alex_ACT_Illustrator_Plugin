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
for ($i = 0; $i -lt 5; $i++) {
    $lo = $min + (($max - $min) / 5 * $i); $hi = $lo + (($max - $min) / 5)
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
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Bar'; Ascii = 'Horizontal bar'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Grouped Bar'; Ascii = 'Grouped bar'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Stacked Bar (normalize)'; Ascii = 'Stacked 100% bar'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Slope Chart'; Ascii = 'Slope chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Faceted Bar'; Ascii = 'Small multiples'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Comparison'; Flint = 'Waterfall Chart'; Ascii = 'Waterfall'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Line'; Ascii = 'Line chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Area'; Ascii = 'Area chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Sparkline'; Ascii = 'Sparkline'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Trend'; Flint = 'Bar + Line combo'; Ascii = 'Pareto'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Histogram'; Ascii = 'Histogram'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Boxplot'; Ascii = 'Box plot'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Strip Plot'; Ascii = 'Strip plot'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'ECDF Plot'; Ascii = 'ECDF'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Violin Plot'; Ascii = 'Box plot or Histogram'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Distribution'; Flint = 'Density Plot'; Ascii = 'Histogram'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Scatter'; Ascii = 'Scatter plot'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Scatter + size (Bubble)'; Ascii = 'Bubble plot'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Parallel Coordinates'; Ascii = 'Parallel coordinates'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Regression'; Ascii = 'Scatter plot'; Status = 'Approximate' }
    [pscustomobject]@{ Family = 'Relationship'; Flint = 'Connected Scatter'; Ascii = 'Slope chart'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Stacked normalize'; Ascii = 'Stacked 100% bar'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Treemap'; Ascii = 'Treemap'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Funnel'; Ascii = 'Funnel'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Pie'; Ascii = 'Percentage rows or Waffle grid'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Donut'; Ascii = 'Percentage rows or Waffle grid'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Proportion'; Flint = 'Sunburst'; Ascii = 'Treemap'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'Flow'; Flint = 'Sankey'; Ascii = 'Sankey flow'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Flow'; Flint = 'Heatmap'; Ascii = 'Heatmap'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'Flow'; Flint = 'Streamgraph'; Ascii = 'Small multiples'; Status = 'Not viable' }
    [pscustomobject]@{ Family = 'KPI'; Flint = 'Bullet Chart'; Ascii = 'Bullet chart'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'KPI'; Flint = 'KPI Card'; Ascii = 'KPI card'; Status = 'Covered' }
    [pscustomobject]@{ Family = 'KPI'; Flint = 'Gauge Chart'; Ascii = 'Gauge'; Status = 'Covered' }
)
$limits = @(
    [pscustomobject]@{ Form = 'Pie, Donut, Sunburst'; Why = 'angle encodes the value, and a character cell cannot carry a partial angle'; Instead = 'Stacked 100% bar, Percentage rows, or Waffle grid' }
    [pscustomobject]@{ Form = 'Violin, Density'; Why = 'a smooth curve needs sub-character resolution that a monospace grid does not have'; Instead = 'Histogram or Box plot' }
    [pscustomobject]@{ Form = 'Streamgraph'; Why = 'stacked curved baselines become unreadable once each band is quantized to whole cells'; Instead = 'Small multiples' }
    [pscustomobject]@{ Form = 'Connected Scatter'; Why = 'a path between arbitrary points needs line segments at arbitrary angles'; Instead = 'Slope chart for two periods, Line chart for a series' }
    [pscustomobject]@{ Form = 'Regression fit'; Why = 'the fitted line lands between cells at most angles, so the slope reads wrong'; Instead = 'Scatter plot with the coefficient stated in text' }
)
$covered = @($coverage | Where-Object Status -eq 'Covered').Count

$flintEquivalents = @{
    'Horizontal bar'       = [pscustomobject]@{ Type = 'Bar Chart'; Match = 'Exact' }
    'Dot plot'             = [pscustomobject]@{ Type = 'Lollipop Chart'; Match = 'Nearest' }
    'Bullet chart'         = [pscustomobject]@{ Type = 'Bullet Chart'; Match = 'Exact' }
    'Grouped bar'          = [pscustomobject]@{ Type = 'Grouped Bar Chart'; Match = 'Exact' }
    'Slope chart'          = [pscustomobject]@{ Type = 'Slope Chart'; Match = 'Exact' }
    'Waterfall'            = [pscustomobject]@{ Type = 'Waterfall Chart'; Match = 'Exact' }
    'Pareto'               = [pscustomobject]@{ Type = 'Bar Chart'; Match = 'Nearest' }
    'Gauge'                = [pscustomobject]@{ Type = 'Bullet Chart'; Match = 'Nearest' }
    'KPI card'             = [pscustomobject]@{ Type = 'KPI Card'; Match = 'Exact' }
    'Sparkline'            = [pscustomobject]@{ Type = 'Sparkline'; Match = 'Exact' }
    'Column trend'         = [pscustomobject]@{ Type = 'Bar Chart'; Match = 'Exact' }
    'Step line'            = [pscustomobject]@{ Type = 'Line Chart'; Match = 'Nearest' }
    'Small multiples'      = [pscustomobject]@{ Type = 'Line Chart'; Match = 'Exact, faceted' }
    'Line chart'           = [pscustomobject]@{ Type = 'Line Chart'; Match = 'Exact' }
    'Area chart'           = [pscustomobject]@{ Type = 'Area Chart'; Match = 'Exact' }
    'Stacked 100% bar'     = [pscustomobject]@{ Type = 'Stacked Bar Chart'; Match = 'Exact' }
    'Percentage rows'      = [pscustomobject]@{ Type = 'Bar Table'; Match = 'Nearest' }
    'Waffle grid'          = [pscustomobject]@{ Type = 'Stacked Bar Chart'; Match = 'Nearest' }
    'Treemap'              = [pscustomobject]@{ Type = 'No direct type'; Match = 'ASCII only' }
    'Histogram'            = [pscustomobject]@{ Type = 'Histogram'; Match = 'Exact' }
    'Box plot'             = [pscustomobject]@{ Type = 'Boxplot'; Match = 'Exact' }
    'Strip plot'           = [pscustomobject]@{ Type = 'Strip Plot'; Match = 'Exact' }
    'ECDF'                 = [pscustomobject]@{ Type = 'ECDF Plot'; Match = 'Exact' }
    'Scatter plot'         = [pscustomobject]@{ Type = 'Scatter Plot'; Match = 'Exact' }
    'Heatmap'              = [pscustomobject]@{ Type = 'Heatmap'; Match = 'Exact' }
    'Bubble plot'          = [pscustomobject]@{ Type = 'Scatter Plot'; Match = 'Exact, size channel' }
    'Parallel coordinates' = [pscustomobject]@{ Type = 'No direct type'; Match = 'ASCII only' }
    'Funnel'               = [pscustomobject]@{ Type = 'Pyramid Chart'; Match = 'Nearest' }
    'Stage pipeline'       = [pscustomobject]@{ Type = 'Gantt Chart'; Match = 'Nearest' }
    'Sankey flow'          = [pscustomobject]@{ Type = 'No direct type'; Match = 'ASCII only' }
    'Diverging bar'        = [pscustomobject]@{ Type = 'Pyramid Chart'; Match = 'Nearest' }
    'Variance column'      = [pscustomobject]@{ Type = 'Bar Chart'; Match = 'Nearest' }
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
$html.Add('<title>ASCII + Flint Chart Gallery</title>')
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
$html.Add('.comparison{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,.7fr);gap:1rem;align-items:stretch}')
$html.Add('.column{min-width:0}')
$html.Add('.column-label{margin:0 0 .45rem;color:var(--mute);font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}')
$html.Add('.flint-panel{height:calc(100% - 1.15rem);min-height:7rem;display:flex;flex-direction:column;justify-content:center;background:#111c2f;border:1px solid var(--line);border-left:3px solid var(--flint);border-radius:8px;padding:1rem 1.1rem}')
$html.Add('.flint-type{margin:0;color:#fff;font-size:1.15rem;font-weight:700}')
$html.Add('.flint-match{margin:.35rem 0 0;color:var(--flint);font-size:.82rem}')
$html.Add('.tag{display:inline-block;padding:.05rem .5rem;border-radius:999px;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;margin-left:.4rem}')
$html.Add('.real{background:rgba(16,185,129,.15);color:var(--accent)}')
$html.Add('.illustrative{background:rgba(148,163,184,.15);color:var(--mute)}')
$html.Add('.approximate{background:rgba(245,158,11,.15);color:#f59e0b}')
$html.Add('.notviable{background:rgba(148,163,184,.12);color:var(--mute);text-decoration:line-through}')
$html.Add('pre{margin:0;overflow-x:auto;background:#0b1220;border:1px solid var(--line);border-radius:8px;padding:.9rem;color:var(--ink);font:13px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace}')
$html.Add('footer{padding:2rem 1.5rem;color:var(--mute);font-size:.85rem;border-top:1px solid var(--line);margin-top:2rem}')
$html.Add('table{width:100%;border-collapse:collapse;font-size:.88rem}')
$html.Add('th,td{text-align:left;padding:.42rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}')
$html.Add('th{color:var(--mute);font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-size:.72rem}')
$html.Add('@media(max-width:800px){.comparison{grid-template-columns:1fr}.flint-panel{min-height:5.5rem}}')
$html.Add('</style></head><body>')
$html.Add('<header><h1>ASCII + Flint Chart Gallery</h1>')
$html.Add('<p>Compare each terminal-safe ASCII form with its Flint 0.5.0 Vega-Lite equivalent, organized by Illustrator&#39;s seven communication goals.</p>')
$html.Add('<p>Exact matches use the same chart form. Nearest matches preserve the analytical intent where character geometry and graphical marks differ.</p>')
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
        $html.Add('<p class="meta">Best when ' + (HtmlEscape $e.Best) + '. Avoid when ' + (HtmlEscape $e.Avoid) + '.</p>')
        $flint = $flintEquivalents[$e.Form]
        $html.Add('<div class="comparison">')
        $html.Add('<div class="column"><p class="column-label">ASCII</p><pre>' + (HtmlEscape $e.Ascii) + '</pre></div>')
        $html.Add('<div class="column"><p class="column-label">Flint equivalent</p><div class="flint-panel"><p class="flint-type">' + (HtmlEscape $flint.Type) + '</p><p class="flint-match">' + (HtmlEscape $flint.Match) + '</p></div></div>')
        $html.Add('</div>')
        $html.Add('</div>')
    }
}
$html.Add('<h2 id="flint-coverage">Flint coverage</h2>')
$html.Add('<div class="card">')
$html.Add('<p class="meta">Of the ' + $coverage.Count + ' chart types Flint offers, ' + $covered + ' have a direct ASCII counterpart here. The rest are listed so the boundary is explicit rather than discovered halfway through a render.</p>')
$html.Add('<table><thead><tr><th>Flint family</th><th>Flint chart</th><th>ASCII form</th><th>Status</th></tr></thead><tbody>')
foreach ($c in $coverage) {
    $cls = switch ($c.Status) { 'Covered' { 'real' } 'Approximate' { 'approximate' } default { 'notviable' } }
    $html.Add('<tr><td>' + (HtmlEscape $c.Family) + '</td><td>' + (HtmlEscape $c.Flint) + '</td><td>' + (HtmlEscape $c.Ascii) + '</td><td><span class="tag ' + $cls + '">' + $c.Status + '</span></td></tr>')
}
$html.Add('</tbody></table>')
$html.Add('</div>')
$html.Add('<div class="card">')
$html.Add('<h3>Not viable in ASCII</h3>')
$html.Add('<table><thead><tr><th>Form</th><th>Why</th><th>Use instead</th></tr></thead><tbody>')
foreach ($l in $limits) {
    $html.Add('<tr><td>' + (HtmlEscape $l.Form) + '</td><td>' + (HtmlEscape $l.Why) + '</td><td>' + (HtmlEscape $l.Instead) + '</td></tr>')
}
$html.Add('</tbody></table>')
$html.Add('</div>')
$html.Add('</main>')
$html.Add('<footer>Generated by <code>demos/ascii-gallery/build-gallery.ps1</code> from <code>sales-sample.csv</code>. ASCII figures are no wider than 78 characters; Flint counterparts reflect the pinned 0.5.0 Vega-Lite catalog.</footer>')
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
