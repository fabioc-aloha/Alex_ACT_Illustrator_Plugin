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

const byMonth = sumBy(['date']);
const byRegion = sumBy(['region']);
const byProduct = sumBy(['product']);
const byRegionProduct = sumBy(['region', 'product']);
const byRegionMonth = sumBy(['region', 'date']);
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

function unsupported() {
  return { type: 'No direct type', match: 'ASCII only', spec: null };
}

const productShares = byProduct.map((row) => ({ ...row, share: row.revenue / totalRevenue }));
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
  'Horizontal bar': exact('Bar Chart', byProduct, { product: 'Category', revenue: 'Amount' }, { y: { field: 'product' }, x: { field: 'revenue' } }),
  'Dot plot': nearest('Lollipop Chart', byMonth, { date: 'YearMonth', revenue: 'Amount' }, { y: { field: 'date' }, x: { field: 'revenue' } }),
  'Bullet chart': exact('Bullet Chart', byRegion.map((row) => ({ ...row, target: 130000 })), { region: 'Region', revenue: 'Amount', target: 'Amount' }, { y: { field: 'region' }, x: { field: 'revenue' }, goal: { field: 'target' } }),
  'Grouped bar': exact('Grouped Bar Chart', byRegionProduct, { region: 'Region', product: 'Category', revenue: 'Amount' }, { x: { field: 'region' }, y: { field: 'revenue' }, group: { field: 'product' } }),
  'Slope chart': exact('Slope Chart', slopeRows, { date: 'YearMonth', region: 'Region', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'revenue' }, color: { field: 'region' }, detail: { field: 'region' } }),
  Waterfall: exact('Waterfall Chart', waterfallRows, { step: 'Category', value: 'Profit' }, { x: { field: 'step' }, y: { field: 'value' } }),
  Pareto: nearest('Bar Chart', byRegionProduct.map((row) => ({ ...row, label: `${row.region} ${row.product}` })), { label: 'Category', revenue: 'Amount' }, { x: { field: 'label' }, y: { field: 'revenue' } }),
  Gauge: nearest('Bullet Chart', [{ metric: 'Revenue', value: totalRevenue, goal: target }], { metric: 'Category', value: 'Amount', goal: 'Amount' }, { y: { field: 'metric' }, x: { field: 'value' }, goal: { field: 'goal' } }),
  'KPI card': exact('KPI Card', [{ metric: 'Revenue', value: totalRevenue, goal: target }], { metric: 'Category', value: 'Amount', goal: 'Amount' }, { metric: { field: 'metric' }, value: { field: 'value' }, goal: { field: 'goal' } }),
  Sparkline: exact('Sparkline', byMonth, { date: 'YearMonth', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'revenue' } }),
  'Column trend': exact('Bar Chart', byMonth, { date: 'YearMonth', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'revenue' } }),
  'Step line': nearest('Line Chart', byMonth, { date: 'YearMonth', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'revenue' } }, { interpolate: 'step-after', showPoints: true }),
  'Small multiples': { type: 'Line Chart', match: 'Exact, faceted', spec: compile('Line Chart', byRegionMonth, { date: 'YearMonth', region: 'Region', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'revenue' }, row: { field: 'region' } }) },
  'Line chart': exact('Line Chart', byMonth, { date: 'YearMonth', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'revenue' } }, { showPoints: true }),
  'Area chart': exact('Area Chart', byMonth, { date: 'YearMonth', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'revenue' } }),
  'Stacked 100% bar': exact('Stacked Bar Chart', regionShares, { all: 'Category', region: 'Region', share: 'Percentage' }, { x: { field: 'all' }, y: { field: 'share' }, color: { field: 'region' } }, { stackMode: 'normalize' }),
  'Percentage rows': nearest('Bar Table', productShares, { product: 'Category', share: 'Percentage' }, { y: { field: 'product' }, x: { field: 'share' } }),
  'Waffle grid': nearest('Stacked Bar Chart', regionShares, { all: 'Category', region: 'Region', share: 'Percentage' }, { x: { field: 'all' }, y: { field: 'share' }, color: { field: 'region' } }, { stackMode: 'normalize' }),
  Treemap: unsupported(),
  Histogram: exact('Histogram', rows, { revenue: 'Amount' }, { x: { field: 'revenue' } }),
  'Box plot': exact('Boxplot', rows, { region: 'Region', revenue: 'Amount' }, { x: { field: 'region' }, y: { field: 'revenue' }, color: { field: 'region' } }),
  'Strip plot': exact('Strip Plot', rows, { region: 'Region', revenue: 'Amount' }, { x: { field: 'revenue' }, y: { field: 'region' }, color: { field: 'region' } }),
  ECDF: exact('ECDF Plot', rows, { region: 'Region', revenue: 'Amount' }, { x: { field: 'revenue' }, color: { field: 'region' } }),
  'Scatter plot': exact('Scatter Plot', rows, { units: 'Quantity', revenue: 'Amount' }, { x: { field: 'units' }, y: { field: 'revenue' } }),
  Heatmap: exact('Heatmap', byRegionMonth, { date: 'YearMonth', region: 'Region', revenue: 'Amount' }, { x: { field: 'date' }, y: { field: 'region' }, color: { field: 'revenue' } }),
  'Bubble plot': { type: 'Scatter Plot', match: 'Exact, size channel', spec: compile('Scatter Plot', rows, { units: 'Quantity', revenue: 'Amount', cost: 'Amount', region: 'Region' }, { x: { field: 'units' }, y: { field: 'revenue' }, size: { field: 'cost' }, color: { field: 'region' } }) },
  'Parallel coordinates': unsupported(),
  Funnel: nearest('Pyramid Chart', [
    { stage: 'Leads', value: 4000 },
    { stage: 'Qualified', value: 2400 },
    { stage: 'Proposal', value: 1100 },
    { stage: 'Won', value: 420 },
  ], { stage: 'Category', value: 'Quantity' }, { y: { field: 'stage' }, x: { field: 'value' }, color: { field: 'stage' } }),
  'Stage pipeline': nearest('Gantt Chart', pipelineRows, { stage: 'Category', start: 'Date', end: 'Date' }, { y: { field: 'stage' }, x: { field: 'start' }, x2: { field: 'end' } }),
  'Sankey flow': unsupported(),
  'Diverging bar': nearest('Pyramid Chart', monthlyVariance, { date: 'YearMonth', delta: 'Profit', direction: 'Category' }, { y: { field: 'date' }, x: { field: 'delta' }, color: { field: 'direction' } }),
  'Variance column': nearest('Bar Chart', monthlyVariance, { date: 'YearMonth', delta: 'Profit', direction: 'Category' }, { x: { field: 'date' }, y: { field: 'delta' }, color: { field: 'direction' } }),
};

writeFileSync(outputPath, JSON.stringify(specs), 'utf8');