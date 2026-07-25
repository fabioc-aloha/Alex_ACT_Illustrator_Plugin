#!/usr/bin/env node
// Language check — this repo is US English. See `.github/copilot-instructions.md`
// ("Language — US English") for the rule and the one deliberate exception.
//
//   node scripts/check-language.mjs           check the payload
//   node scripts/check-language.mjs --all     include gitignored local/ copies
//
// Exit 0 = clean. Exit 1 = at least one British spelling or common misspelling
// outside the documented exceptions.
//
// Three exceptions are encoded, all deliberate:
//   1. The `[behaviour]` commit severity tag. It is an identifier, not prose —
//      it appears in every commit in this repo's history and in the Alex ACT
//      Plugin Mall's own automated commits. Changing it is a [constitutional]
//      decision, not a typo fix.
//   2. The "Language — US English" section of `.github/copilot-instructions.md`,
//      which necessarily spells out the forms this repo does NOT use.
//   3. This file. Its dictionary is made of the words it looks for, so scanning
//      itself would report every entry as a defect.
//
// No dependencies. Node 22+.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INCLUDE_LOCAL = process.argv.includes('--all');

const BRITISH = {
  colour: 'color', colours: 'colors', coloured: 'colored', colouring: 'coloring',
  recolour: 'recolor', recolouring: 'recoloring', behaviour: 'behavior',
  behaviours: 'behaviors', behavioural: 'behavioral', favour: 'favor', favours: 'favors',
  favourite: 'favorite', favoured: 'favored', honour: 'honor', labour: 'labor',
  neighbour: 'neighbor', flavour: 'flavor', humour: 'humor', rumour: 'rumor',
  vapour: 'vapor', armour: 'armor', endeavour: 'endeavor', harbour: 'harbor',
  odour: 'odor', rigour: 'rigor', vigour: 'vigor', centre: 'center', centres: 'centers',
  centred: 'centered', centring: 'centering', theatre: 'theater', metre: 'meter',
  metres: 'meters', litre: 'liter', fibre: 'fiber', calibre: 'caliber', sombre: 'somber',
  spectre: 'specter', lustre: 'luster', manoeuvre: 'maneuver', catalogue: 'catalog',
  catalogues: 'catalogs', catalogued: 'cataloged', analogue: 'analog',
  organise: 'organize', organised: 'organized', organisation: 'organization',
  realise: 'realize', realised: 'realized', recognise: 'recognize', recognised: 'recognized',
  apologise: 'apologize', criticise: 'criticize', emphasise: 'emphasize',
  minimise: 'minimize', maximise: 'maximize', optimise: 'optimize', optimised: 'optimized',
  standardise: 'standardize', summarise: 'summarize', utilise: 'utilize',
  visualise: 'visualize', customise: 'customize', customised: 'customized',
  normalise: 'normalize', normalised: 'normalized', prioritise: 'prioritize',
  categorise: 'categorize', characterise: 'characterize', specialise: 'specialize',
  generalise: 'generalize', initialise: 'initialize', initialised: 'initialized',
  serialise: 'serialize', synchronise: 'synchronize', authorise: 'authorize',
  analyse: 'analyze', analysed: 'analyzed', analysing: 'analyzing', paralyse: 'paralyze',
  licence: 'license', defence: 'defense', offence: 'offense', pretence: 'pretense',
  labelled: 'labeled', labelling: 'labeling', modelled: 'modeled', modelling: 'modeling',
  cancelled: 'canceled', travelled: 'traveled', travelling: 'traveling',
  fuelled: 'fueled', signalled: 'signaled', totalled: 'totaled', marvellous: 'marvelous',
  jewellery: 'jewelry', counsellor: 'counselor', enrolment: 'enrollment',
  fulfil: 'fulfill', skilful: 'skillful', wilful: 'willful', instalment: 'installment',
  grey: 'gray', greyed: 'grayed', tyre: 'tire', kerb: 'curb', plough: 'plow',
  draught: 'draft', cheque: 'check', aluminium: 'aluminum', sulphur: 'sulfur',
  storey: 'story', whilst: 'while', amongst: 'among', amidst: 'amid', learnt: 'learned',
  spelt: 'spelled', dreamt: 'dreamed', burnt: 'burned', leapt: 'leaped', spilt: 'spilled',
  programme: 'program', judgement: 'judgment', acknowledgement: 'acknowledgment',
  ageing: 'aging', artefact: 'artifact', artefacts: 'artifacts', enquire: 'inquire',
  enquiry: 'inquiry', speciality: 'specialty', orientated: 'oriented',
  mediaeval: 'medieval', practise: 'practice', sceptic: 'skeptic', sceptical: 'skeptical',
};

const TYPOS = {
  seperate: 'separate', seperated: 'separated', seperator: 'separator',
  occured: 'occurred', occurence: 'occurrence', recieve: 'receive', recieved: 'received',
  definately: 'definitely', accomodate: 'accommodate', neccessary: 'necessary',
  necesary: 'necessary', existance: 'existence', publically: 'publicly',
  refered: 'referred', refering: 'referring', transfered: 'transferred',
  comittee: 'committee', commitee: 'committee', wich: 'which', thier: 'their',
  freind: 'friend', beleive: 'believe', acheive: 'achieve', acheived: 'achieved',
  sucess: 'success', succesful: 'successful', succesfully: 'successfully',
  buisness: 'business', calender: 'calendar', changable: 'changeable',
  collegue: 'colleague', concious: 'conscious', embarass: 'embarrass',
  enviroment: 'environment', familar: 'familiar', foriegn: 'foreign',
  goverment: 'government', gaurd: 'guard', harrass: 'harass', independant: 'independent',
  knowlege: 'knowledge', liason: 'liaison', maintainance: 'maintenance',
  millenium: 'millennium', noticable: 'noticeable', occassion: 'occasion',
  persistant: 'persistent', posession: 'possession', prefered: 'preferred',
  priviledge: 'privilege', questionaire: 'questionnaire', reccomend: 'recommend',
  recomend: 'recommend', relevent: 'relevant', religous: 'religious',
  remeber: 'remember', resistence: 'resistance', responsability: 'responsibility',
  similiar: 'similar', sincerly: 'sincerely', speach: 'speech', supercede: 'supersede',
  suprise: 'surprise', tendancy: 'tendency', threshhold: 'threshold',
  tommorrow: 'tomorrow', truely: 'truly', unfortunatly: 'unfortunately',
  untill: 'until', useing: 'using', vaccum: 'vacuum', wierd: 'weird',
  writting: 'writing', arguement: 'argument', compatability: 'compatibility',
  consistant: 'consistent', dependancy: 'dependency', hierachy: 'hierarchy',
  paramter: 'parameter', recuring: 'recurring', reccuring: 'recurring',
  udpate: 'update', usefull: 'useful', wether: 'whether',
};

const EXT = ['.md', '.json', '.mjs', '.js', '.html', '.css', '.yml', '.yaml'];
const SKIP_DIR = ['node_modules', '.git', '.playwright-mcp', 'assets'];
// Exception 3: this file is the dictionary; scanning it reports every entry.
const SKIP_FILE = ['LICENSE', 'check-language.mjs'];

// Exception 2: the section of the instructions that defines the rule.
const RULE_FILE = '.github/copilot-instructions.md';
const RULE_SECTION = '### Language — US English';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIR.includes(e)) continue;
    if (e === 'local' && !INCLUDE_LOCAL) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.some((x) => e.endsWith(x)) && !SKIP_FILE.includes(e)) out.push(p);
  }
  return out;
}

const ALL = { ...BRITISH, ...TYPOS };
const RE = new RegExp(`\\b(${Object.keys(ALL).sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');

/** Lines belonging to the rule-defining section, which must spell out what NOT to use. */
function ruleSectionLines(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === RULE_SECTION);
  if (start === -1) return new Set();
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,3} /.test(lines[i])) { end = i; break; }
  }
  return new Set(Array.from({ length: end - start }, (_, k) => start + k + 1));
}

const hits = [];
const files = walk(ROOT);
for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join('/');
  const text = readFileSync(f, 'utf8');
  const exempt = rel === RULE_FILE ? ruleSectionLines(text) : new Set();
  text.split(/\r?\n/).forEach((line, i) => {
    if (exempt.has(i + 1)) return;
    RE.lastIndex = 0;
    let m;
    while ((m = RE.exec(line)) !== null) {
      // Exception 1: the [behaviour] commit severity tag.
      if (line.slice(Math.max(0, m.index - 1), m.index + m[1].length + 1) === `[${m[1]}]`) continue;
      hits.push({ rel, line: i + 1, found: m[1], want: ALL[m[1].toLowerCase()] });
    }
  });
}

console.log(`      scanned ${files.length} files${INCLUDE_LOCAL ? ' (including local/)' : ''}`);
for (const h of hits) console.log(`FAIL  ${h.rel}:${h.line}  ${h.found} → ${h.want}`);

if (hits.length === 0) {
  console.log('OK    no British spellings or common misspellings found');
  console.log('\nPASS  US English clean.');
  process.exit(0);
}
console.log(`\nFAIL  ${hits.length} finding(s). See "Language — US English" in .github/copilot-instructions.md.`);
process.exit(1);
