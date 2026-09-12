/**
 * test_engines.mjs — Automated Test Suite for Masari Pure Calculation Engines
 *
 * Validates:
 *  - matchScore(role)
 *  - gapOf(role)
 *  - cvChecks() & cvScore()
 *  - liChecks() & liScore()
 *  - pfScore()
 *  - readiness()
 *  - swot()
 *  - buildPlan()
 *
 * Architecture Compliance:
 *  - Zero production code modification (reads index.html strictly read-only).
 *  - Zero npm dependencies (runs natively via Node.js built-ins: node:fs, node:vm, node:assert).
 *  - Sandboxed execution mocking minimal browser globals.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '../index.html');

// 1. Read production index.html (read-only)
if (!fs.existsSync(indexPath)) {
  console.error(`[ERROR] Target file not found at: ${indexPath}`);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');

// 2. Extract the application script block
const match = html.match(/<script>\s*(\/\* ===========================================================================[\s\S]*?)<\/script>/);
if (!match || !match[1]) {
  console.error('[ERROR] Could not extract application <script> block from index.html');
  process.exit(1);
}

const scriptContent = match[1];

// 3. Construct minimal sandbox for safe in-memory execution
const mockStorage = new Map();
const mockElement = {
  lang: '',
  dir: '',
  setAttribute: () => {},
  innerHTML: '',
  querySelector: () => null,
  querySelectorAll: () => [],
  classList: { add: () => {}, remove: () => {} }
};

const sandbox = {
  console: {
    log: () => {},
    warn: () => {},
    error: () => {}
  },
  document: {
    documentElement: mockElement,
    getElementById: () => mockElement,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => mockElement,
    body: mockElement
  },
  window: {
    scrollTo: () => {},
    print: () => {},
    addEventListener: () => {},
    localStorage: {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
      clear: () => mockStorage.clear()
    }
  },
  localStorage: {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  },
  navigator: { clipboard: null },
  Intl,
  Date,
  Math,
  JSON,
  structuredClone,
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
  clearTimeout: () => {}
};
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;

// 4. Inject test export hook into memory execution
const exportHook = `
globalThis.__ENGINE_EXPORTS__ = {
  getState: () => state,
  setState: (s) => { state = s; },
  getWeights: () => WEIGHTS,
  BLANK,
  ROLES,
  FIELDS,
  ENTITIES,
  ATABAH,
  matchScore,
  gapOf,
  cvChecks,
  cvScore,
  liChecks,
  liScore,
  pfScore,
  readiness,
  swot,
  buildPlan,
  roleById,
  lvl
};
`;

const context = vm.createContext(sandbox);
vm.runInContext(scriptContent + exportHook, context);

const ctx = sandbox.__ENGINE_EXPORTS__;
if (!ctx) {
  console.error('[ERROR] Failed to bridge engine exports from sandbox context');
  process.exit(1);
}

// 5. Test runner reporting harness
let passed = 0;
let failed = 0;
const results = [];

function test(category, name, fn) {
  // Always reset to clean BLANK state before every test
  const fresh = structuredClone(ctx.BLANK);
  ctx.setState(fresh);
  try {
    fn();
    passed++;
    results.push({ category, name, ok: true });
    console.log(`  ✓ [${category}] ${name}`);
  } catch (err) {
    failed++;
    results.push({ category, name, ok: false, error: err.message });
    console.error(`  ✗ [${category}] ${name}`);
    console.error(`      Error: ${err.message}`);
  }
}

console.log('=================================================================');
console.log('  MASARI (مساري) — Automated Engine Test Suite');
console.log(`  Source: ${path.relative(process.cwd(), indexPath)}`);
console.log('=================================================================\n');

// ---------------------------------------------------------------------------
// 1. matchScore(role) Tests
// ---------------------------------------------------------------------------
console.log('Running matchScore() tests...');
const testRole = ctx.roleById('business-analyst'); // field: "biz", tags: ["i-data","i-numbers","i-people"]

test('matchScore', 'TC-1.1: Perfect match (100% skills, exact field, matching interests) returns 100', () => {
  const s = ctx.getState();
  s.profile.field = 'biz';
  s.profile.direction = 'stay';
  testRole.skills.forEach(sk => { s.profile.skills[sk.id] = 100; });
  s.profile.interests = ['i-data', 'i-numbers']; // 2 tags match out of 3 -> min(1, 2/min(2,3)) = 1.0
  const score = ctx.matchScore(testRole);
  assert.strictEqual(score, 100);
});

test('matchScore', 'TC-1.2: Zero match (0% skills, different field, 0 interests) returns 9', () => {
  const s = ctx.getState();
  s.profile.field = 'health';
  s.profile.direction = 'stay';
  s.profile.skills = {};
  s.profile.interests = [];
  // cov = 0 * 0.6 = 0
  // field = 0.35 * 0.25 = 0.0875
  // inter = 0 * 0.15 = 0
  // total = round(8.75) = 9
  const score = ctx.matchScore(testRole);
  assert.strictEqual(score, 9);
});

test('matchScore', 'TC-1.3: Academic field transition weighting (direction = transition) gives 0.55 field fit', () => {
  const s = ctx.getState();
  s.profile.field = 'health';
  s.profile.direction = 'transition';
  s.profile.skills = {};
  s.profile.interests = [];
  // cov = 0
  // field = 0.55 * 0.25 = 0.1375
  // inter = 0
  // total = round(13.75) = 14
  const score = ctx.matchScore(testRole);
  assert.strictEqual(score, 14);
});

test('matchScore', 'TC-1.4: Role without tags defaults interests fit to 0.5', () => {
  const customRole = {
    id: 'custom',
    field: 'biz',
    tags: [],
    skills: [{ id: 's1', core: true }]
  };
  const s = ctx.getState();
  s.profile.field = 'biz';
  s.profile.skills = { s1: 0 };
  s.profile.interests = [];
  // cov = 0
  // field = 1.0 * 0.25 = 0.25
  // inter = 0.5 * 0.15 = 0.075
  // total = round(32.5) = 33
  const score = ctx.matchScore(customRole);
  assert.strictEqual(score, 33);
});

test('matchScore', 'TC-1.5: Declared weights audit strictly reflects 60% skills, 25% field, 15% interests', () => {
  const w = ctx.getWeights();
  assert.strictEqual(w.skills, 0.60);
  assert.strictEqual(w.field, 0.25);
  assert.strictEqual(w.interests, 0.15);
});

// ---------------------------------------------------------------------------
// 2. gapOf(role) Tests
// ---------------------------------------------------------------------------
console.log('\nRunning gapOf() tests...');

test('gapOf', 'TC-2.1: Skill rated at >= 75% categorizes into have', () => {
  const s = ctx.getState();
  const role = {
    id: 'test',
    skills: [{ id: 'sk1', ar: 'م1', en: 'S1', core: true }]
  };
  s.profile.skills = { sk1: 75 };
  const gap = ctx.gapOf(role);
  assert.strictEqual(gap.have.length, 1);
  assert.strictEqual(gap.dev.length, 0);
  assert.strictEqual(gap.prio.length, 0);
  assert.strictEqual(gap.have[0].id, 'sk1');
});

test('gapOf', 'TC-2.2: Non-core skill rated at < 75% categorizes into dev, not in prio', () => {
  const s = ctx.getState();
  const role = {
    id: 'test',
    skills: [{ id: 'sk1', ar: 'م1', en: 'S1', core: false }]
  };
  s.profile.skills = { sk1: 25 };
  const gap = ctx.gapOf(role);
  assert.strictEqual(gap.have.length, 0);
  assert.strictEqual(gap.dev.length, 1);
  assert.strictEqual(gap.prio.length, 0);
});

test('gapOf', 'TC-2.3: Core skill rated at < 50% categorizes into both dev and prio', () => {
  const s = ctx.getState();
  const role = {
    id: 'test',
    skills: [{ id: 'sk1', ar: 'م1', en: 'S1', core: true }]
  };
  s.profile.skills = { sk1: 25 };
  const gap = ctx.gapOf(role);
  assert.strictEqual(gap.have.length, 0);
  assert.strictEqual(gap.dev.length, 1);
  assert.strictEqual(gap.prio.length, 1);
  assert.strictEqual(gap.prio[0].id, 'sk1');
});

test('gapOf', 'TC-2.4: Core skill rated at exactly 50% categorizes into dev, excluded from prio', () => {
  const s = ctx.getState();
  const role = {
    id: 'test',
    skills: [{ id: 'sk1', ar: 'م1', en: 'S1', core: true }]
  };
  s.profile.skills = { sk1: 50 };
  const gap = ctx.gapOf(role);
  assert.strictEqual(gap.have.length, 0);
  assert.strictEqual(gap.dev.length, 1);
  assert.strictEqual(gap.prio.length, 0); // boundary check: v < 50
});

test('gapOf', 'TC-2.5: Calling gapOf(null) returns empty arrays safely', () => {
  const gap = ctx.gapOf(null);
  assert.deepStrictEqual(gap, { have: [], dev: [], prio: [] });
});

// ---------------------------------------------------------------------------
// 3. cvChecks() and cvScore() Tests
// ---------------------------------------------------------------------------
console.log('\nRunning cvChecks() and cvScore() tests...');

test('cvScore', 'TC-3.1: Blank profile fails all 6 checks and returns cvScore of 0', () => {
  const checks = ctx.cvChecks();
  assert.strictEqual(checks.length, 6);
  assert.strictEqual(checks.every(c => c.ok === false), true);
  assert.strictEqual(ctx.cvScore(), 0);
});

test('cvScore', 'TC-3.2: Complete profile passes all 6 checks and returns cvScore of 100', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  const sweRole = ctx.roleById('swe');
  sweRole.skills.slice(0, 3).forEach(sk => { s.profile.skills[sk.id] = 50; });
  s.profile.summary = 'Graduated with honours, deeply interested in building secure, distributed backends.'; // > 40 chars
  s.profile.major = 'Computer Science';
  s.profile.year = '2024';
  s.profile.exp = 'y1';
  s.projects = [{ title: 'P1', problem: 'Prob', approach: 'App', result: 'Res' }];

  const checks = ctx.cvChecks();
  assert.strictEqual(checks.every(c => c.ok === true), true);
  assert.strictEqual(ctx.cvScore(), 100);
});

test('cvScore', 'TC-3.3: Summary character length threshold (40 chars fails, 41 chars passes)', () => {
  const s = ctx.getState();
  s.profile.summary = '1234567890123456789012345678901234567890'; // 40 chars
  let sumCheck = ctx.cvChecks().find(c => c.id === 'summary');
  assert.strictEqual(sumCheck.ok, false);

  s.profile.summary = '12345678901234567890123456789012345678901'; // 41 chars
  sumCheck = ctx.cvChecks().find(c => c.id === 'summary');
  assert.strictEqual(sumCheck.ok, true);
});

test('cvScore', 'TC-3.4: Named skills threshold (2 skills >= 50% fails, 3 skills >= 50% passes)', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  const sweRole = ctx.roleById('swe');
  s.profile.skills[sweRole.skills[0].id] = 50;
  s.profile.skills[sweRole.skills[1].id] = 50;

  let skillsCheck = ctx.cvChecks().find(c => c.id === 'skills');
  assert.strictEqual(skillsCheck.ok, false);

  s.profile.skills[sweRole.skills[2].id] = 50;
  skillsCheck = ctx.cvChecks().find(c => c.id === 'skills');
  assert.strictEqual(skillsCheck.ok, true);
});

test('cvScore', 'TC-3.5: Incremental scoring steps match expected rounded values', () => {
  const s = ctx.getState();
  // 1 check passed: role
  s.profile.role = 'swe';
  assert.strictEqual(ctx.cvScore(), 17); // 1/6 = 16.67% -> 17

  // 2 checks: role + edu
  s.profile.major = 'CS';
  s.profile.year = '2024';
  assert.strictEqual(ctx.cvScore(), 33); // 2/6 = 33.33% -> 33

  // 3 checks: + exp (coop)
  s.profile.coop = true;
  assert.strictEqual(ctx.cvScore(), 50); // 3/6 = 50% -> 50

  // 4 checks: + proj
  s.projects.push({ title: 'T' });
  assert.strictEqual(ctx.cvScore(), 67); // 4/6 = 66.67% -> 67

  // 5 checks: + summary > 40
  s.profile.summary = 'A'.repeat(45);
  assert.strictEqual(ctx.cvScore(), 83); // 5/6 = 83.33% -> 83
});

// ---------------------------------------------------------------------------
// 4. liChecks() and liScore() Tests
// ---------------------------------------------------------------------------
console.log('\nRunning liChecks() and liScore() tests...');

test('liScore', 'TC-4.1: Discrete scoring steps match 0, 25, 50, 75, 100', () => {
  const s = ctx.getState();
  assert.strictEqual(ctx.liScore(), 0);

  // 1 pass: headline (role)
  s.profile.role = 'swe';
  assert.strictEqual(ctx.liScore(), 25);

  // 2 pass: about (summary > 40)
  s.profile.summary = 'B'.repeat(45);
  assert.strictEqual(ctx.liScore(), 50);

  // 3 pass: exp
  s.profile.exp = 'y1';
  assert.strictEqual(ctx.liScore(), 75);

  // 4 pass: 3 named skills >= 50
  const sweRole = ctx.roleById('swe');
  sweRole.skills.slice(0, 3).forEach(sk => { s.profile.skills[sk.id] = 50; });
  assert.strictEqual(ctx.liScore(), 100);
});

test('liScore', 'TC-4.2: Co-op counts as valid experience for LinkedIn check', () => {
  const s = ctx.getState();
  s.profile.exp = 'none';
  s.profile.coop = true;
  const expCheck = ctx.liChecks().find(c => c.id === 'exp');
  assert.strictEqual(expCheck.ok, true);
});

// ---------------------------------------------------------------------------
// 5. pfScore() Tests
// ---------------------------------------------------------------------------
console.log('\nRunning pfScore() tests...');

test('pfScore', 'TC-5.1: 0 projects returns 0', () => {
  assert.strictEqual(ctx.pfScore(), 0);
});

test('pfScore', 'TC-5.2: 1 project without link returns 40', () => {
  const s = ctx.getState();
  s.projects.push({ title: 'P1', link: '' });
  assert.strictEqual(ctx.pfScore(), 40);
});

test('pfScore', 'TC-5.3: 1 project with link returns 60', () => {
  const s = ctx.getState();
  s.projects.push({ title: 'P1', link: 'https://github.com/project' });
  assert.strictEqual(ctx.pfScore(), 60);
});

test('pfScore', 'TC-5.4: 2 projects without link return 80', () => {
  const s = ctx.getState();
  s.projects.push({ title: 'P1', link: '' });
  s.projects.push({ title: 'P2', link: '' });
  assert.strictEqual(ctx.pfScore(), 80);
});

test('pfScore', 'TC-5.5: 2 projects with at least one link returns 100', () => {
  const s = ctx.getState();
  s.projects.push({ title: 'P1', link: 'https://live.com' });
  s.projects.push({ title: 'P2', link: '' });
  assert.strictEqual(ctx.pfScore(), 100);
});

test('pfScore', 'TC-5.6: Score is capped at 100 regardless of extra projects', () => {
  const s = ctx.getState();
  s.projects.push({ title: 'P1', link: 'https://1.com' });
  s.projects.push({ title: 'P2', link: 'https://2.com' });
  s.projects.push({ title: 'P3', link: 'https://3.com' });
  assert.strictEqual(ctx.pfScore(), 100);
});

// ---------------------------------------------------------------------------
// 6. readiness() Tests
// ---------------------------------------------------------------------------
console.log('\nRunning readiness() tests...');

test('readiness', 'TC-6.1: All zero returns 0', () => {
  assert.strictEqual(ctx.readiness(), 0);
});

test('readiness', 'TC-6.2: All maximum returns 100', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  const swe = ctx.roleById('swe');
  swe.skills.slice(0, 3).forEach(sk => { s.profile.skills[sk.id] = 50; });
  s.profile.summary = 'A'.repeat(45);
  s.profile.major = 'CS';
  s.profile.year = '2024';
  s.profile.exp = 'y1';
  s.projects = [{ title: 'P1', link: 'https://link' }, { title: 'P2' }];
  assert.strictEqual(ctx.readiness(), 100);
});

test('readiness', 'TC-6.3: Weighting verification (CV 45%, LinkedIn 30%, Portfolio 25%)', () => {
  // Only Portfolio active (2 projects + link = 100): 100 * 0.25 = 25
  const s = ctx.getState();
  s.projects = [{ title: 'P1', link: 'https://link' }, { title: 'P2' }];
  assert.strictEqual(ctx.cvScore(), 17); // 1 check: proj
  assert.strictEqual(ctx.liScore(), 0);
  assert.strictEqual(ctx.pfScore(), 100);
  // readiness = round(17 * 0.45 + 0 + 100 * 0.25) = round(7.65 + 25) = 33
  assert.strictEqual(ctx.readiness(), 33);
});

// ---------------------------------------------------------------------------
// 7. swot() Tests
// ---------------------------------------------------------------------------
console.log('\nRunning swot() tests...');

test('swot', 'TC-7.1: Strengths triggers: solid skill base, matching field, real experience, continuous learning', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  s.profile.field = 'cs'; // direct match
  s.profile.exp = 'y1';
  s.profile.courses = '4';
  const swe = ctx.roleById('swe');
  s.profile.skills[swe.skills[0].id] = 80;
  s.profile.skills[swe.skills[1].id] = 90;

  const result = ctx.swot();
  assert.ok(result.S.length >= 4);
  const titles = result.S.map(item => item.t);
  assert.ok(titles.includes('أساس مهاري متين'));
  assert.ok(titles.includes('تخصصك في صميم الدور'));
  assert.ok(titles.includes('خبرة عملية فعلية'));
  assert.ok(titles.includes('تعلّم مستمر'));
});

test('swot', 'TC-7.2: Weaknesses triggers: core skills below half, no experience, empty portfolio', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  s.profile.exp = 'none';
  s.profile.coop = false;
  s.projects = [];
  // swe has core skills: prog, git, web, algo. All at 0.
  const result = ctx.swot();
  const titles = result.W.map(item => item.t);
  assert.ok(titles.includes('مهارات أساسية دون النصف'));
  assert.ok(titles.includes('لا خبرة ولا تدريب مسجّل'));
  assert.ok(titles.includes('معرض أعمالك فارغ'));
});

test('swot', 'TC-7.3: Language parity in English locale', () => {
  const s = ctx.getState();
  s.locale = 'en';
  s.profile.role = 'swe';
  s.profile.field = 'cs';
  const result = ctx.swot();
  assert.ok(result.S.some(item => item.t === 'Your field sits inside the role'));
  assert.ok(result.W.some(item => item.t === 'Your portfolio is empty'));
});

// ---------------------------------------------------------------------------
// 8. buildPlan() Tests
// ---------------------------------------------------------------------------
console.log('\nRunning buildPlan() tests...');

test('buildPlan', 'TC-8.1: Generates valid 4-phase plan with task attributes', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  s.picks.skills = [];
  s.picks.orgs = [];
  ctx.buildPlan();

  const plan = s.plan;
  assert.ok(plan.length > 0);
  plan.forEach(task => {
    assert.ok(task.id && task.id.startsWith('m'));
    assert.ok(task.phase >= 1 && task.phase <= 4);
    assert.ok(typeof task.mins === 'number' && task.mins > 0);
    assert.ok(['high', 'med', 'low'].includes(task.prio));
    assert.ok(task.due && !isNaN(Date.parse(task.due)));
    assert.strictEqual(task.status, 'not_started');
    assert.ok(task.ar && task.en);
  });
});

test('buildPlan', 'TC-8.2: Draft CV task included in Phase 1 if CV not present', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  s.profile.presence.cv = false;
  ctx.buildPlan();
  const cvTask = s.plan.find(t => t.phase === 1 && t.en.includes('Draft a single-column CV'));
  assert.ok(cvTask);
});

test('buildPlan', 'TC-8.3: Draft CV task excluded from Phase 1 if CV already present', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  s.profile.presence.cv = true;
  ctx.buildPlan();
  const cvTask = s.plan.find(t => t.phase === 1 && t.en.includes('Draft a single-column CV'));
  assert.strictEqual(cvTask, undefined);
});

test('buildPlan', 'TC-8.4: User skill picks take precedence over automatic selection', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  s.picks.skills = ['algo', 'test'];
  ctx.buildPlan();
  // Algo is technical skill
  const algoTask = s.plan.find(t => t.en.includes('Data structures'));
  assert.ok(algoTask);
});

test('buildPlan', 'TC-8.5: Selected organization injects research task into Phase 2', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  s.picks.orgs = ['tuwaiq'];
  ctx.buildPlan();
  const orgTask = s.plan.find(t => t.phase === 2 && t.en.includes('Tuwaiq Academy'));
  assert.ok(orgTask);
});

test('buildPlan', 'TC-8.6: Phase 4 contains Atabah platform browsing task with verified URL', () => {
  const s = ctx.getState();
  s.profile.role = 'swe';
  ctx.buildPlan();
  const atabahTask = s.plan.find(t => t.phase === 4 && t.en.includes('Atabah'));
  assert.ok(atabahTask);
  assert.strictEqual(atabahTask.url, ctx.ATABAH.browseUrl);
});

// ---------------------------------------------------------------------------
// Summary Report
// ---------------------------------------------------------------------------
console.log('\n=================================================================');
console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed out of ${passed + failed} Total`);
console.log('=================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All engine unit tests completed successfully with 100% pass rate.\n');
  process.exit(0);
}
