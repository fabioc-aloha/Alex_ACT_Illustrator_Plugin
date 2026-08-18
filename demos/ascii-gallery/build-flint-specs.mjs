import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [dataPath, outputPath] = process.argv.slice(2);
if (!dataPath || !outputPath) {
  throw new Error('Usage: node build-flint-specs.mjs <data.json> <output.json>');
}

const runtimeRoot = process.env.ALEX_ACT_ILLUSTRATOR_RUNTIME_ROOT
  || join(homedir(), '.copilot', 'plugin-data', 'alex-act-illustrator-plugin', 'runtime');
const packageRoot = join(runtimeRoot, 'node_modules', 'flint-chart');
const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
if (packageJson.version !== '0.5.0') {
  throw new Error(`Expected flint-chart 0.5.0, found ${packageJson.version || '(missing)'}`);
}

const { assembleVegaLite } = await import(pathToFileURL(join(packageRoot, 'dist', 'index.js')));
const rows = JSON.parse(readFileSync(dataPath, 'utf8')).map((row) => ({
  ...row,
  revenue: Number(row.revenue),
  units: Number(row.units),
  cost: Number(row.cost),
}));

function sumBy(fields, valueField = 'revenue') {
  const groups = new Map();
  for (const row of rows) {
    const key = fields.map((field) => row[field]).join('\u0000');
    const current = groups.get(key) || Object.fromEntries(fields.map((field) => [field, row[field]]));
    current[valueField] = (current[valueField] || 0) + row[valueField];
    groups.set(key, current);
  }
  return [...groups.values()];
}

function monthLabel(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

const byMonth = sumBy(['date']).map((row) => ({ ...row, month: monthLabel(row.date) }));
const byRegion = sumBy(['region']);
const byProduct = sumBy(['product']);
const byRegionProduct = sumBy(['region', 'product']);
const byRegionMonth = sumBy(['region', 'date']).map((row) => ({ ...row, month: monthLabel(row.date) }));
const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
const averageMonth = byMonth.reduce((sum, row) => sum + row.revenue, 0) / byMonth.length;
const target = 260000;

function compile(chartType, data, semanticTypes, encodings, chartProperties) {
  const assembled = assembleVegaLite({
    data: { values: data },
    semantic_types: semanticTypes,
    chart_spec: {
      chartType,
      encodings,
      baseSize: { width: 420, height: 210 },
      canvasSize: { width: 480, height: 250 },
      ...(chartProperties ? { chartProperties } : {}),
    },
  });
  return Object.fromEntries(Object.entries(assembled).filter(([key]) => !key.startsWith('_')));
}

function exact(type, data, semantics, encodings, properties) {
  return { type, match: 'Exact', spec: compile(type, data, semantics, encodings, properties) };
}

function nearest(type, data, semantics, encodings, properties) {
  return { type, match: 'Nearest', spec: compile(type, data, semantics, encodings, properties) };
}

function partial(type, detail, data, semantics, encodings, properties) {
  return { type, match: `Partial: ${detail}`, spec: compile(type, data, semantics, encodings, properties) };
}

function unsupported() {
  return { type: 'No direct type', match: 'ASCII only', spec: null };
}

const productShares = byProduct.map((row) => ({
  ...row,
  'Share (%)': Math.round(row.revenue / totalRevenue * 1000) / 10,
}));
const regionShares = byRegion.map((row) => ({ ...row, all: 'Revenue', share: row.revenue / totalRevenue }));
const monthlyVariance = byMonth.map((row) => ({
  ...row,
  delta: row.revenue - averageMonth,
  direction: row.revenue >= averageMonth ? 'Above average' : 'Below average',
}));
const slopeRows = byRegionMonth.filter((row) => row.date === byMonth[0].date || row.date === byMonth.at(-1).date);
const waterfallRows = [
  { step: 'Revenue', value: totalRevenue },
  { step: 'Cost', value: -totalCost },
  { step: 'Margin', value: totalRevenue - totalCost },
];
const pipelineRows = [
  { stage: 'Ingest', start: '2024-01-01', end: '2024-01-08' },
  { stage: 'Clean', start: '2024-01-08', end: '2024-01-15' },
  { stage: 'Select', start: '2024-01-15', end: '2024-01-22' },
  { stage: 'Render', start: '2024-01-22', end: '2024-01-29' },
  { stage: 'Verify', start: '2024-01-29', end: '2024-02-05' },
];

const specs = {
  'Horizontal bar': exact('Bar Chart', byProduct, { product: 'Category', revenue: 'Amount' }, { y: { field: 'product' }, x: { field: 'revenue' } }, { includeZero_x: true }),
  'Dot plot': nearest('Lollipop Chart', byMonth, { month: 'Month', revenue: 'Amount' }, { y: { field: 'month' }, x: { field: 'revenue' } }, { includeZero_x: true }),
  'Bullet chart': exact('Bullet Chart', byRegion.map((row) => ({ ...row, target: 130000 })), { region: 'Region', revenue: 'Amount', target: 'Amount' }, { y: { field: 'region' }, x: { field: 'revenue' }, goal: { field: 'target' } }),
  'Grouped bar': exact('Grouped Bar Chart', byRegionProduct, { region: 'Region', product: 'Category', revenue: 'Amount' }, { x: { field: 'region' }, y: { field: 'revenue' }, group: { field: 'product' } }, { includeZero_y: true }),
  'Slope chart': exact('Slope Chart', slopeRows.map((row) => ({ ...row, month: monthLabel(row.date) })), { month: 'Month', region: 'Region', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'revenue' }, color: { field: 'region' }, detail: { field: 'region' } }),
  Waterfall: exact('Waterfall Chart', waterfallRows, { step: 'Category', value: 'Profit' }, { x: { field: 'step' }, y: { field: 'value' } }, { includeZero_y: true }),
  Pareto: partial('Bar Chart', 'bars only', byRegionProduct.map((row) => ({ ...row, label: `${row.region} ${row.product}` })), { label: 'Category', revenue: 'Amount' }, { y: { field: 'label', sortBy: 'x', sortOrder: 'descending' }, x: { field: 'revenue' } }, { includeZero_x: true }),
  Gauge: nearest('Bullet Chart', [{ metric: 'Revenue', value: totalRevenue, goal: target }], { metric: 'Category', value: 'Amount', goal: 'Amount' }, { y: { field: 'metric' }, x: { field: 'value' }, goal: { field: 'goal' } }),
  'KPI card': partial('KPI Card', 'no trend', [{ metric: 'Revenue', value: totalRevenue, goal: target }], { metric: 'Category', value: 'Amount', goal: 'Amount' }, { metric: { field: 'metric' }, value: { field: 'value' }, goal: { field: 'goal' } }),
  Sparkline: exact('Sparkline', byMonth, { month: 'Month', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'revenue' } }),
  'Column trend': exact('Bar Chart', byMonth, { month: 'Month', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'revenue' } }, { includeZero_y: true }),
  'Step line': nearest('Line Chart', byMonth, { month: 'Month', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'revenue' } }, { interpolate: 'step-after', showPoints: true, includeZero_y: false }),
  'Small multiples': { type: 'Line Chart', match: 'Exact, faceted', spec: compile('Line Chart', byRegionMonth, { month: 'Month', region: 'Region', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'revenue' }, row: { field: 'region' } }, { includeZero_y: false }) },
  'Line chart': exact('Line Chart', byMonth, { month: 'Month', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'revenue' } }, { showPoints: true, includeZero_y: false }),
  'Area chart': exact('Area Chart', byMonth, { month: 'Month', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'revenue' } }, { includeZero_y: true }),
  'Stacked 100% bar': exact('Stacked Bar Chart', regionShares, { all: 'Category', region: 'Region', share: 'Percentage' }, { y: { field: 'all' }, x: { field: 'share' }, color: { field: 'region' } }, { stackMode: 'normalize', includeZero_x: true }),
  'Percentage rows': nearest('Bar Table', productShares, { product: 'Category', 'Share (%)': 'Quantity' }, { y: { field: 'product' }, x: { field: 'Share (%)' } }, { includeZero_x: true }),
  'Waffle grid': nearest('Stacked Bar Chart', regionShares, { all: 'Category', region: 'Region', share: 'Percentage' }, { y: { field: 'all' }, x: { field: 'share' }, color: { field: 'region' } }, { stackMode: 'normalize', includeZero_x: true }),
  Treemap: unsupported(),
  Histogram: exact('Histogram', rows, { revenue: 'Amount' }, { x: { field: 'revenue' } }, { binCount: 5 }),
  'Box plot': exact('Boxplot', rows.map((row) => ({ ...row, group: 'All sales' })), { group: 'Category', revenue: 'Amount' }, { x: { field: 'group' }, y: { field: 'revenue' } }, { showOutliers: false, includeZero_y: false }),
  'Strip plot': exact('Strip Plot', rows, { region: 'Region', revenue: 'Amount' }, { x: { field: 'revenue' }, y: { field: 'region' }, color: { field: 'region' } }),
  ECDF: exact('ECDF Plot', rows, { region: 'Region', revenue: 'Amount' }, { x: { field: 'revenue' }, color: { field: 'region' } }),
  'Scatter plot': exact('Scatter Plot', rows, { units: 'Quantity', revenue: 'Amount' }, { x: { field: 'units' }, y: { field: 'revenue' } }),
  Heatmap: exact('Heatmap', byRegionMonth, { month: 'Month', region: 'Region', revenue: 'Amount' }, { x: { field: 'month' }, y: { field: 'region' }, color: { field: 'revenue' } }),
  'Bubble plot': { type: 'Scatter Plot', match: 'Exact, size channel', spec: compile('Scatter Plot', rows, { units: 'Quantity', revenue: 'Amount', cost: 'Amount', region: 'Region' }, { x: { field: 'units' }, y: { field: 'revenue' }, size: { field: 'cost' }, color: { field: 'region' } }) },
  'Parallel coordinates': unsupported(),
  Funnel: nearest('Bar Chart', [
    { stage: 'Leads', value: 4000 },
    { stage: 'Qualified', value: 2400 },
    { stage: 'Proposal', value: 1100 },
    { stage: 'Won', value: 420 },
  ], { stage: 'Category', value: 'Quantity' }, { y: { field: 'stage', sortBy: 'x', sortOrder: 'descending' }, x: { field: 'value' } }, { includeZero_x: true }),
  'Stage pipeline': partial('Gantt Chart', 'sequence only', pipelineRows, { stage: 'Category', start: 'Date', end: 'Date' }, { y: { field: 'stage' }, x: { field: 'start' }, x2: { field: 'end' } }),
  'Sankey flow': unsupported(),
  'Diverging bar': nearest('Bar Chart', monthlyVariance.map((row) => ({ ...row, month: monthLabel(row.date) })), { month: 'Month', delta: 'Profit', direction: 'Category' }, { y: { field: 'month' }, x: { field: 'delta' }, color: { field: 'direction' } }, { includeZero_x: true }),
  'Variance column': nearest('Bar Chart', monthlyVariance.map((row) => ({ ...row, month: monthLabel(row.date) })), { month: 'Month', delta: 'Profit', direction: 'Category' }, { x: { field: 'month' }, y: { field: 'delta' }, color: { field: 'direction' } }, { includeZero_y: true }),
};

writeFileSync(outputPath, JSON.stringify(specs), 'utf8');