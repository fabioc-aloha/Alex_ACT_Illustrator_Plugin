# ASCII Chart Gallery

An ASCII counterpart to a chart gallery. Every form below is organized by
the same seven communication goals used by Illustrator's `chart-vocabulary`
skill, so the two compose: pick the goal there, render it here when the
target is a terminal, a log file, a pull request, or a context window.

Figures marked **real** are computed from `demos/ascii-gallery/sales-sample.csv`.
Figures marked **illustrative** use shaped data because the sample has no
funnel or process structure; the form is the point, not the numbers.

Regenerate with `pwsh -NoProfile -File demos/ascii-gallery/build-gallery.ps1`.

| Goal | Forms |
| --- | --- |
| [Comparison](#comparison) | Horizontal bar, Dot plot, Bullet chart, Grouped bar, Slope chart, Waterfall, Pareto, Gauge, KPI card |
| [Change Over Time](#change-over-time) | Sparkline, Column trend, Step line, Small multiples, Line chart, Area chart |
| [Proportion](#proportion) | Stacked 100% bar, Percentage rows, Waffle grid, Treemap |
| [Distribution](#distribution) | Histogram, Box plot, Strip plot, ECDF |
| [Relationship](#relationship) | Scatter plot, Heatmap, Bubble plot, Parallel coordinates |
| [Flow and Process](#flow-and-process) | Funnel, Stage pipeline, Sankey flow |
| [Deviation](#deviation) | Diverging bar, Variance column |

## Comparison

### Horizontal bar

Best when ranking items; long labels. Avoid when more than 15 rows. Data: **real**.
Flint equivalent: **Bar Chart** (Exact).

```text
Widget A  ##################################  $148,800
Widget B  ######################............   $97,600
```

### Dot plot

Best when precise values in a tight range. Avoid when audience expects bars. Data: **real**.
Flint equivalent: **Lollipop Chart** (Nearest).

```text
Jan  o--------------------------------   $36,800
Feb  ---------o-----------------------   $39,000
Mar  ----------------------o----------   $42,300
Apr  ---------------o-----------------   $40,600
May  --------------------------------o   $44,800
Jun  ------------------------o--------   $42,900
```

### Bullet chart

Best when actual against a target. Avoid when no agreed benchmark. Data: **real**.
Flint equivalent: **Bullet Chart** (Exact).

```text
North  ###########################|##....  107%
South  #######################....|......   83%
```

### Grouped bar

Best when two or three series per category. Avoid when more than three series. Data: **real**.
Flint equivalent: **Grouped Bar Chart** (Exact).

```text
North
  Widget A #################.............   $83,300
  Widget B ###########...................   $55,800
South
  Widget A #############.................   $65,500
  Widget B ########......................   $41,800
```

### Slope chart

Best when two periods and rank changes matter. Avoid when more than about ten rows. Data: **real**.
Flint equivalent: **Slope Chart** (Exact).

```text
        Jan                       Jun
North   $20,800 ////////////////  $24,400
South   $16,000 ////////////////  $18,500
```

### Waterfall

Best when a total is built from sequential moves. Avoid when the steps are not additive. Data: **real**.
Flint equivalent: **Waterfall Chart** (Exact).

```text
Revenue  ########################################  $246,400
Cost                 ============================ -$172,480
Margin   ############                               $73,920
```

### Pareto

Best when a few categories drive most of the total. Avoid when the distribution is flat. Data: **real**.
Flint equivalent: **Bar Chart** (Nearest).

```text
North Widget A   ######################   $83,300  cum  34%
South Widget A   #################.....   $65,500  cum  60%
North Widget B   ###############.......   $55,800  cum  83%
South Widget B   ###########...........   $41,800  cum 100%
```

### Gauge

Best when one headline number against a scale. Avoid when several measures need comparing. Data: **real**.
Flint equivalent: **Bullet Chart** (Nearest).

```text
0%                 50%                100%
[======================================>.]  95%
Revenue $246,400 against target $260,000
```

### KPI card

Best when one measure with trend and delta. Avoid when the reader needs the full series. Data: **real**.
Flint equivalent: **KPI Card** (Exact).

```text
+----------------------------+
|  REVENUE                   |
|  $246,400                  |
|  //\/\  +16.6% vs Jan      |
+----------------------------+
```

## Change Over Time

### Sparkline

Best when inline trend beside a KPI. Avoid when exact values matter more than shape. Data: **real**.
Flint equivalent: **Sparkline** (Exact).

```text
Revenue  //\/\   $36,800 -> $42,900
Months   JFMAMJ
```

### Column trend

Best when discrete periods; magnitude visible. Avoid when many periods (use sparkline). Data: **real**.
Flint equivalent: **Bar Chart** (Exact).

```text
                  ##    ##    ##    ##
      ##    ##    ##    ##    ##    ##
      ##    ##    ##    ##    ##    ##
      ##    ##    ##    ##    ##    ##
      ##    ##    ##    ##    ##    ##
      Ja    Fe    Ma    Ap    Ma    Ju
```

### Step line

Best when values hold then jump. Avoid when smooth continuous change. Data: **real**.
Flint equivalent: **Line Chart** (Nearest).

```text
Jan  _________________________|   $36,800
Feb  __________________________|   $39,000
Mar  ____________________________|   $42,300
Apr  ___________________________|   $40,600
May  ______________________________|   $44,800
Jun  _____________________________|   $42,900
```

### Small multiples

Best when comparing trends across categories. Avoid when fewer than four categories. Data: **real**.
Flint equivalent: **Line Chart** (Exact, faceted).

```text
North   //\/\    $139,100
South   //\/\    $107,300
```

### Line chart

Best when a continuous series where shape matters. Avoid when categories rather than time. Data: **real**.
Flint equivalent: **Line Chart** (Exact).

```text
 $44,800 |                      *
 $43,200 |                           *
 $41,600 |            *
 $40,000 |                 *
 $38,400 |       *
 $36,800 |  *
         +------------------------------
          Jan  Feb  Mar  Apr  May  Jun
```

### Area chart

Best when volume under the line is the point. Avoid when values sit far above zero, which flattens the visible variation as it does here. Data: **real**.
Flint equivalent: **Area Chart** (Exact).

```text
        |           ####      #### ####
        | #### #### #### #### #### ####
        | #### #### #### #### #### ####
        | #### #### #### #### #### ####
        | #### #### #### #### #### ####
        | #### #### #### #### #### ####
        +------------------------------
         Jan  Feb  Mar  Apr  May  Jun
```

## Proportion

### Stacked 100% bar

Best when two to four parts of a whole. Avoid when many small slices. Data: **real**.
Flint equivalent: **Stacked Bar Chart** (Exact).

```text
##################################==========================
North 56.5% South 43.5%
```

### Percentage rows

Best when ranked shares needing exact values. Avoid when shares change over time. Data: **real**.
Flint equivalent: **Bar Table** (Nearest).

```text
Widget A  ########################................  60.4%
Widget B  ################........................  39.6%
```

### Waffle grid

Best when part of a whole as countable units. Avoid when precise decimals matter. Data: **real**.
Flint equivalent: **Stacked Bar Chart** (Nearest).

```text
####################
####################
################....
....................
....................
# North 56%   . South 44%
```

### Treemap

Best when nested share of a total. Avoid when more than about eight leaves. Data: **real**.
Flint equivalent: **No direct type** (ASCII only).

```text
+----------------------------------+----------------------+
|Widget A                          |Widget B              |
|$148,800  60%                     |$97,600  40%          |
+----------------------------------+----------------------+
```

## Distribution

### Histogram

Best when shape of a single variable. Avoid when fewer than 20 observations. Data: **real**.
Flint equivalent: **Histogram** (Exact).

```text
  $6,200  ##########################.... n=6
  $7,980  #################............. n=4
  $9,760  ############################## n=7
 $11,540  #############................. n=3
 $13,320  #################............. n=4
```

### Box plot

Best when spread and outliers at a glance. Avoid when audience unfamiliar with quartiles. Data: **real**.
Flint equivalent: **Boxplot** (Exact).

```text
|---------[=========+==========[------------|
min $6,200   Q1 $8,300   med $10,200   Q3 $12,500   max $15,100
```

### Strip plot

Best when every observation should stay visible. Avoid when hundreds of overlapping points. Data: **real**.
Flint equivalent: **Strip Plot** (Exact).

```text
North  |          o  oo oo o          o  o   o o o o
South  |o  8ooo          o o  o o o o
       +--------------------------------------------
        $6,200 to $15,100    8 marks a collision
```

### ECDF

Best when the question is what share falls below a value. Avoid when a very small sample. Data: **real**.
Flint equivalent: **ECDF Plot** (Exact).

```text
 100% |                               ________
  80% |                     __________
  60% |               ______
  40% |     __________
  20% |_____
      +----------------------------------------
       $6,200                          $15,100
```

## Relationship

### Scatter plot

Best when correlation between two measures. Avoid when more than a few hundred points. Data: **real**.
Flint equivalent: **Scatter Plot** (Exact).

```text
|                                       * * *
|                                 *   *
|                            * *
|                      * * *
|                 * *
|             ** *
|      *   *
|   ***
+--------------------------------------------
units ->                          revenue on y axis
```

### Heatmap

Best when two categorical axes, one measure. Avoid when precise values needed. Data: **real**.
Flint equivalent: **Heatmap** (Exact).

```text
        Jan   Feb   Mar   Apr   May   Jun
North   ###.. ####. ##### ####. ##### #####
South   #.... #.... ##... #.... ##... ##...
```

### Bubble plot

Best when a third measure sizes each point. Avoid when sizes differ by less than about twice. Data: **real**.
Flint equivalent: **Scatter Plot** (Exact, size channel).

```text
|                                     @ @ @ @
|                              @  @
|                      O O O O
|                OO O
|          o  oo
|   oooo
+--------------------------------------------
units ->       o low cost    O mid    @ high cost
```

### Parallel coordinates

Best when several measures compared per record. Avoid when the measures are derived from each other, which makes every line identical as it does here. Data: **real**.
Flint equivalent: **No direct type** (ASCII only).

```text
        revenue       units         cost
Jan     ----*-------  ----*-------  ----*-------
Feb     ----*-------  ----*-------  ----*-------
Mar     -----*------  -----*------  -----*------
Apr     -----*------  -----*------  -----*------
May     ------*-----  ------*-----  ------*-----
Jun     ------*-----  ------*-----  ------*-----
```

## Flow and Process

### Funnel

Best when stage-by-stage drop-off. Avoid when stages are not sequential. Data: **illustrative**.
Flint equivalent: **Pyramid Chart** (Nearest).

```text
########################################  Leads      4,000
        ########################  Qualified  2,400
              ###########  Proposal   1,100
                  ####  Won          420
```

### Stage pipeline

Best when steps with hand-offs. Avoid when branching or looping flows. Data: **illustrative**.
Flint equivalent: **Gantt Chart** (Nearest).

```text
[ Ingest ] -> [ Clean ] -> [ Select ] -> [ Render ] -> [ Verify ]
    ok          ok           ok            ok           WARN
```

### Sankey flow

Best when quantities merge or split between stages. Avoid when many crossing links. Data: **real**.
Flint equivalent: **No direct type** (ASCII only).

```text
North   $139,100 ===========---------\
                                      >  Total $246,400
South   $107,300 =========-----------/
```

## Deviation

### Diverging bar

Best when above and below a reference. Avoid when no meaningful midpoint. Data: **real**.
Flint equivalent: **Pyramid Chart** (Nearest).

```text
Jan                        ##|                         -$4,267
Feb                         #|                         -$2,067
Mar                          |#                        +$1,233
Apr                          |                         -$467
May                          |##                       +$3,733
Jun                          |#                        +$1,833
```

### Variance column

Best when actual against plan per period. Avoid when no plan exists. Data: **real**.
Flint equivalent: **Bar Chart** (Nearest).

```text
Jan    $36,800  vs avg   $41,067     -4,267  [UNDER]
Feb    $39,000  vs avg   $41,067     -2,067  [UNDER]
Mar    $42,300  vs avg   $41,067     +1,233  [OK]
Apr    $40,600  vs avg   $41,067       -467  [UNDER]
May    $44,800  vs avg   $41,067     +3,733  [OK]
Jun    $42,900  vs avg   $41,067     +1,833  [OK]
```

## Flint coverage

Of the 33 chart types Flint offers, 24 have a direct ASCII
counterpart here. The rest are listed so the boundary is explicit rather than
discovered halfway through a render.

| Flint family | Flint chart | ASCII form | Status |
| --- | --- | --- | --- |
| Comparison | Bar | Horizontal bar | Covered |
| Comparison | Grouped Bar | Grouped bar | Covered |
| Comparison | Stacked Bar (normalize) | Stacked 100% bar | Covered |
| Comparison | Slope Chart | Slope chart | Covered |
| Comparison | Faceted Bar | Small multiples | Covered |
| Comparison | Waterfall Chart | Waterfall | Covered |
| Trend | Line | Line chart | Covered |
| Trend | Area | Area chart | Covered |
| Trend | Sparkline | Sparkline | Covered |
| Trend | Bar + Line combo | Pareto | Approximate |
| Distribution | Histogram | Histogram | Covered |
| Distribution | Boxplot | Box plot | Covered |
| Distribution | Strip Plot | Strip plot | Covered |
| Distribution | ECDF Plot | ECDF | Covered |
| Distribution | Violin Plot | Box plot or Histogram | Not viable |
| Distribution | Density Plot | Histogram | Not viable |
| Relationship | Scatter | Scatter plot | Covered |
| Relationship | Scatter + size (Bubble) | Bubble plot | Covered |
| Relationship | Parallel Coordinates | Parallel coordinates | Covered |
| Relationship | Regression | Scatter plot | Approximate |
| Relationship | Connected Scatter | Slope chart | Not viable |
| Proportion | Stacked normalize | Stacked 100% bar | Covered |
| Proportion | Treemap | Treemap | Covered |
| Proportion | Funnel | Funnel | Covered |
| Proportion | Pie | Percentage rows or Waffle grid | Not viable |
| Proportion | Donut | Percentage rows or Waffle grid | Not viable |
| Proportion | Sunburst | Treemap | Not viable |
| Flow | Sankey | Sankey flow | Covered |
| Flow | Heatmap | Heatmap | Covered |
| Flow | Streamgraph | Small multiples | Not viable |
| KPI | Bullet Chart | Bullet chart | Covered |
| KPI | KPI Card | KPI card | Covered |
| KPI | Gauge Chart | Gauge | Covered |

### Not viable in ASCII

| Form | Why | Use instead |
| --- | --- | --- |
| Pie, Donut, Sunburst | angle encodes the value, and a character cell cannot carry a partial angle | Stacked 100% bar, Percentage rows, or Waffle grid |
| Violin, Density | a smooth curve needs sub-character resolution that a monospace grid does not have | Histogram or Box plot |
| Streamgraph | stacked curved baselines become unreadable once each band is quantized to whole cells | Small multiples |
| Connected Scatter | a path between arbitrary points needs line segments at arbitrary angles | Slope chart for two periods, Line chart for a series |
| Regression fit | the fitted line lands between cells at most angles, so the slope reads wrong | Scatter plot with the coefficient stated in text |

