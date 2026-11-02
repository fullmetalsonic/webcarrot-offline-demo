'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Frozen official WebCarrot control/step oracle; unchanged at 4a555c75.
// https://github.com/ajouatom/openpilot/blob/05c1678033c1c778f0386fba00c1e105bb26c427/openpilot/selfdrive/carrot/web/js/pages/setting.js#L779
// https://github.com/ajouatom/openpilot/blob/05c1678033c1c778f0386fba00c1e105bb26c427/openpilot/selfdrive/carrot/web/src/ui/components/numeric_stepper/numeric_stepper.js#L18
// Official config.py UNIT_CYCLE; this is the actual increment, not p.unit times it.
const EXPECTED_STEPS = [1, 2, 5, 10, 50, 100];
const SETTING_CONTROL_KINDS = ["toggle", "segmented", "select", "slider"];

function getSettingControlConfig(p) {
  // A parameter pins its control with a "control" field in
  // carrot_settings.json; otherwise the kind is inferred from its range below.
  const override = SETTING_CONTROL_KINDS.includes(p?.control) ? { kind: p.control } : {};
  const min = Number(p?.min);
  const max = Number(p?.max);
  const unit = Math.max(1, Number(p?.unit) || 1);
  const optionCount = Number.isFinite(min) && Number.isFinite(max) ? Math.floor(max - min + 1) : 0;
  let kind = override.kind || "slider";

  if (!override.kind) {
    if (min === 0 && max === 1) {
      kind = "toggle";
    } else if (Number.isInteger(min) && Number.isInteger(max) && optionCount >= 2 && optionCount <= 4) {
      kind = "segmented";
    } else if (Number.isInteger(min) && Number.isInteger(max) && optionCount > 4 && optionCount <= 8) {
      kind = "select";
    } else {
      kind = "slider";
    }
  }

  return { kind, min, max, unit, optionCount };
}

function clampValue(value, min, max) {
  let next = value;
  if (Number.isFinite(min)) next = Math.max(next, min);
  if (Number.isFinite(max)) next = Math.min(next, max);
  return next;
}

function nextStepValue(options = {}) {
  const step = Number(options.step);
  const sign = Number(options.sign);
  const min = Number(options.min);
  const max = Number(options.max);

  let current = Number(options.current);
  if (!Number.isFinite(current)) current = Number(options.fallback);
  if (!Number.isFinite(current)) current = Number.isFinite(min) ? min : 0;
  if (!Number.isFinite(step) || !Number.isFinite(sign)) return current;

  let next = clampValue(current + sign * step, min, max);
  // Matches the long-standing renderer rule: only snap to whole numbers when
  // the parameter and the step are themselves whole numbers.
  if (Number.isInteger(min) && Number.isInteger(max) && Number.isInteger(step)) {
    next = Math.round(next);
  }
  return next;
}

// New official gap normalization, verbatim from the selected source renderer:
// https://github.com/ajouatom/openpilot/blob/4a555c75b81c4ba80bfbf2260007a6baa645fcac/openpilot/selfdrive/carrot/web/js/pages/setting.js#L846
// Server examples independently pin 1 -> 31 and 30 -> 31:
// https://github.com/ajouatom/openpilot/blob/4a555c75b81c4ba80bfbf2260007a6baa645fcac/openpilot/selfdrive/carrot/server/tests/test_settings_schema.py#L622
function normalizeSettingNumericValue(raw, p, previous = null) {
  const text = String(raw).trim();
  if (!text || !Number.isFinite(Number(text))) return null;
  const min = Number(p.min);
  const max = Number(p.max);
  let next = Math.max(min, Math.min(max, Number(text)));
  if (Number.isInteger(min) && Number.isInteger(max)) next = Math.round(next);
  const nonzeroMin = Number(p.nonzero_min);
  if (next > 0 && next < nonzeroMin) {
    next = previous !== null && next < previous ? 0 : nonzeroMin;
  }
  return next;
}


function loadDemo() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const startup = 'state.backup=defaultBackup();restorePendingUpdate();render();initNavHistory();checkForUpdate();';
  assert.equal(script.split(startup).length, 2, 'Only browser startup is suppressed');
  const nodes = new Map(), listeners = new Map();
  let exportedBlob;
  function element(id = '') {
    if (nodes.has(id)) return nodes.get(id);
    const node = {
      id, hidden: true, textContent: '', innerHTML: '', value: '', style: {}, dataset: {},
      addEventListener() {}, setAttribute() {}, focus() {}, querySelector() { return element('query-' + id); },
      querySelectorAll() { return []; }, insertAdjacentHTML() {}, classList: { toggle() {} }, click() {}, remove() {},
    };
    nodes.set(id, node);
    return node;
  }
  const document = {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    getElementById: element, querySelectorAll() { return []; },
    createElement() { return element('download'); }, body: { style: {}, append() {} },
  };
  class TestURL extends URL {}
  TestURL.createObjectURL = blob => { exportedBlob = blob; return 'blob:step-test'; };
  TestURL.revokeObjectURL = () => {};
  const context = vm.createContext({
    document, Blob, URL: TestURL, setTimeout() {}, clearTimeout() {}, confirm() { return true; },
    history: { pushState() {}, replaceState() {}, go() {}, back() {} },
    location: { origin: 'https://example.invalid', pathname: '/' },
    window: { addEventListener() {}, scrollTo() {} },
  });
  vm.runInContext(script.replace(startup, ''), context);
  const run = source => vm.runInContext(source, context);
  run("state.backup=defaultBackup();state.tab='drive'");
  const params = JSON.parse(run('JSON.stringify(PARAMS)'));
  const numeric = params.filter(p => p.name !== 'SoundLanguageSetting' && getSettingControlConfig(p).kind === 'slider');
  function dispatch(type, target) { for (const listener of listeners.get(type) || []) listener({ target }); }
  const click = dataset => dispatch('click', { closest() { return { dataset }; } });
  const control = p => run(`settingControl(BY_NAME.get(${JSON.stringify(p.name)}))`);
  const card = p => run(`settingCard(BY_NAME.get(${JSON.stringify(p.name)}))`);
  function setRaw(name, value) { run(`state.backup[${JSON.stringify(name)}]=${JSON.stringify(String(value))}`); }
  function selectStep(p, factor) {
    for (let i = 0; i < EXPECTED_STEPS.length; i++) {
      const match = card(p).match(/data-mult="[^"]+">x(\d+)<\/button>/);
      assert.ok(match, p.name + ': numeric multiplier button exists');
      if (Number(match[1]) === factor) return;
      click({ mult: p.name });
    }
    assert.fail(p.name + ': cannot select x' + factor);
  }
  function press(p, sign) {
    const values = [...control(p).matchAll(/data-delta="([^"]+)"/g)].map(match => Number(match[1]));
    assert.equal(values.length, 2, p.name + ': two step buttons for a valid value');
    click({ step: p.name, delta: String(values[sign > 0 ? 1 : 0]) });
  }
  return { context, run, params, numeric, element, dispatch, click, control, card, setRaw, selectStep, press,
    exported: async () => JSON.parse(await exportedBlob.text()) };
}

function validInitial(p) {
  return Number.isInteger(Number(p.default)) && p.default >= p.min && p.default <= p.max
    ? Number(p.default) : Number(p.min);
}

test('All numeric rows expose the official six-step cycle, including narrow ranges', () => {
  const demo = loadDemo();
  for (const p of demo.numeric) {
    demo.setRaw(p.name, validInitial(p));
    for (const factor of [...EXPECTED_STEPS, EXPECTED_STEPS[0]]) {
      assert.ok(demo.card(p).includes(`data-mult="${p.name}">x${factor}</button>`), p.name + ': x' + factor);
      demo.click({ mult: p.name });
    }
  }
  for (const p of demo.params.filter(p => !demo.numeric.some(n => n.name === p.name))) {
    assert.ok(!demo.card(p).includes(`data-mult="${p.name}"`), p.name + ': choices/toggles have no multiplier');
  }
});

test('Production +/- clicks match the official oracle for every numeric row, factor and bound', () => {
  const demo = loadDemo();
  for (const p of demo.numeric) {
    for (const factor of EXPECTED_STEPS) {
      demo.setRaw(p.name, validInitial(p));
      demo.selectStep(p, factor);
      for (const current of new Set([p.min, p.min + 1, Math.round((p.min + p.max) / 2), p.max - 1, p.max])) {
        for (const sign of [-1, 1]) {
          demo.setRaw(p.name, current);
          const deltas = [...demo.control(p).matchAll(/data-delta="([^"]+)"/g)].map(match => Number(match[1]));
          assert.deepEqual(deltas, [-factor, factor], p.name + ': label is the actual increment');
          demo.press(p, sign);
          const stepped = nextStepValue({ current, fallback: p.default, step: factor, sign, min: p.min, max: p.max });
          const expected = normalizeSettingNumericValue(stepped, p, current);
          assert.equal(demo.run(`Number(state.backup[${JSON.stringify(p.name)}])`), expected,
            `${p.name} x${factor} ${current} ${sign > 0 ? '+' : '-'}`);
        }
      }
    }
  }
});

test('Numeric dialogs accept non-unit-multiple integers while preserving range and integer validation', () => {
  const demo = loadDemo();
  for (const p of demo.numeric) {
    demo.setRaw(p.name, validInitial(p));
    demo.selectStep(p, 50);
    demo.run(`openChoice(${JSON.stringify(p.name)})`);
    const body = demo.element('choiceBody').innerHTML;
    assert.deepEqual([...body.matchAll(/step="([^"]+)"/g)].map(match => match[1]), ['1', '1'], p.name);
    const value = p.min + 1;
    const expected = normalizeSettingNumericValue(value, p);
    demo.element('choiceNumber').value = String(value);
    demo.run('applyChoice()');
    assert.equal(demo.run(`Number(state.backup[${JSON.stringify(p.name)}])`), expected, p.name + ': direct integer with official gap rule');
    for (const invalid of ['', 'NaN', String(p.min - 1), String(p.max + 1), String(value + 0.5)]) {
      demo.run(`openChoice(${JSON.stringify(p.name)})`);
      demo.element('choiceNumber').value = invalid;
      demo.run('applyChoice()');
      assert.equal(demo.run(`Number(state.backup[${JSON.stringify(p.name)}])`), expected, p.name + ': rejects ' + invalid);
    }
  }
});

test('Center of gravity ratio matches fixed upstream gap boundaries and explicit-entry examples', async () => {
  const demo = loadDemo(), p = demo.params.find(p => p.name === 'CenterToFrontRatio');
  assert.deepEqual([p.min, p.nonzero_min, p.max, p.default], [0, 31, 69, 0]);
  // Fixed expectations also check the frozen oracle rather than deriving every
  // expectation from the same normalization algorithm as production.
  for (const [factor, upFromZero, downFromMax] of [[1, 31, 68], [2, 31, 67], [5, 31, 64], [10, 31, 59], [50, 50, 0], [100, 69, 0]]) {
    demo.selectStep(p, factor);
    for (const [current, sign, expected] of [[0, 1, upFromZero], [0, -1, 0], [31, -1, 0], [69, -1, downFromMax], [69, 1, 69]]) {
      demo.setRaw(p.name, current);
      demo.press(p, sign);
      assert.equal(demo.run('Number(state.backup.CenterToFrontRatio)'), expected, `${current} ${sign} x${factor}`);
    }
  }
  demo.selectStep(p, 10);
  demo.setRaw(p.name, 40);
  demo.press(p, -1);
  assert.equal(demo.run('state.backup.CenterToFrontRatio'), '0', '40 - 10 skips the forbidden gap to zero');
  for (let value = 1; value <= 30; value++) {
    demo.run('openChoice("CenterToFrontRatio")');
    demo.element('choiceNumber').value = String(value);
    demo.run('applyChoice()');
    assert.equal(demo.run('state.backup.CenterToFrontRatio'), '31', `direct ${value} -> 31`);
    demo.dispatch('change', { dataset: { raw: p.name }, value: String(value) });
    assert.equal(demo.run('state.backup.CenterToFrontRatio'), '31', `raw ${value} -> 31`);
  }
  for (const value of [0, 31, 40, 60, 69]) {
    demo.run('openChoice("CenterToFrontRatio")');
    demo.element('choiceNumber').value = String(value);
    demo.run('applyChoice()');
    assert.equal(demo.run('state.backup.CenterToFrontRatio'), String(value));
  }
  demo.click({ default: p.name });
  assert.equal(demo.run('state.backup.CenterToFrontRatio'), '0');
  assert.ok(demo.control(p).includes('0 · 차량 기본'));
  assert.ok(demo.card(p).includes('기본값: 0 · 차량 기본'));
  demo.run('exportBackup()');
  assert.equal((await demo.exported()).CenterToFrontRatio, '0');
});

test('Imported gap values stay byte-for-value intact until an explicit edit', async () => {
  const demo = loadDemo(), p = demo.params.find(p => p.name === 'CenterToFrontRatio');
  for (let value = 1; value <= 30; value++) {
    for (const raw of [value, String(value)]) {
      const backup = { CenterToFrontRatio: raw, CenterToFrontRatioEnabled: true, DisableDM: { nested: [false, null] }, FutureUnknown: ['kept'] };
      demo.context.fixture = backup;
      await demo.run('importBackup({name:"old.json",text:async()=>JSON.stringify(fixture)})');
      demo.selectStep(p, 5);
      demo.run('openChoice("CenterToFrontRatio");closeChoice();exportBackup()');
      assert.deepEqual(await demo.exported(), backup);
      assert.equal(demo.run('state.dirty.size'), 0);
      demo.press(p, 1);
      demo.run('exportBackup()');
      assert.deepEqual(await demo.exported(), { ...backup, CenterToFrontRatio: String(value + 5 < 31 ? 31 : value + 5) });
    }
  }
});

test('Official additions retain menu paths, detail visibility, search and control kinds', () => {
  const demo = loadDemo();
  assert.equal(demo.params.length, 206);
  assert.equal(demo.numeric.length, 101, '99 previous numeric rows plus two additions; explicit HUD select remains select');
  assert.equal(demo.params.find(p => p.name === 'PaddleMode').max, 3, 'personal fork mode 4 is excluded');
  for (const [name, path] of [
    ['CenterToFrontRatio', ['DRIVING', 'STEER', 'STEER_FEEL']],
    ['TeslaAutoTurnSignals', ['DRIVING', 'START_AUTO', 'BASIC_START']],
    ['CanfdBlinkerControl', ['VEHICLE', 'VEH_CANFD']],
    ['ManualLaneChangeIndicator', ['DRIVING', 'STEER', 'STEER_LANECHANGE']],
  ]) assert.deepEqual(JSON.parse(demo.run(`JSON.stringify(paramPath(${JSON.stringify(name)}).map(x=>x.id))`)), path);
  for (const name of ['ManualLaneChangeIndicator', 'ModelDesireIndicator', 'ModelPathIndicator', 'AutoTurnControlRightLaneChange', 'TeslaAutoTurnSignals', 'CanfdBlinkerControl']) {
    const p = demo.params.find(p => p.name === name);
    assert.ok(demo.control(p).includes('role="switch"'), name);
    assert.equal(p.default, 0);
  }
  assert.deepEqual(JSON.parse(demo.run('JSON.stringify(detailParams("AutoTurnControl").map(p=>p.name))')), ['AutoTurnControl', 'AutoTurnControlRightLaneChange']);
  assert.equal(demo.run('SCHEMA.menu.flatMap(c=>flatten(c)).some(x=>x.names.includes("AutoTurnControlRightLaneChange"))'), false);
  demo.run('handleAction("detail:AutoTurnControl")');
  assert.ok(demo.run('renderSettings()').includes('data-param="AutoTurnControlRightLaneChange"'));
  demo.run('state.search="AutoTurnControlRightLaneChange"');
  assert.ok(demo.run('foundParams().some(p=>p.name==="AutoTurnControlRightLaneChange")'));
  const hud = demo.params.find(p => p.name === 'ClusterHudScreenMode');
  assert.equal(hud.max, 7);
  assert.equal(hud.control, 'select');
  assert.ok(demo.control(hud).includes('data-choice="ClusterHudScreenMode"'));
  demo.run('openChoice("ClusterHudScreenMode")');
  assert.deepEqual([...demo.element('choiceBody').innerHTML.matchAll(/data-choice-value="([^"]+)"/g)].map(match => Number(match[1])), [-1, 0, 1, 2, 3, 4, 5, 6, 7]);
  for (const value of [6, 7]) {
    demo.run('openChoice("ClusterHudScreenMode")');
    demo.click({ choiceValue: String(value) });
    demo.run('applyChoice()');
    assert.equal(demo.run('state.backup.ClusterHudScreenMode'), String(value));
  }
});

test('Cycling and opening a dialog preserve imported keys/types; only explicit edits change exports', async () => {
  const demo = loadDemo();
  const backup = {
    StopDistanceCarrot: 600, CruiseEcoControl: '2', CarrotYouTubeLive: 'True',
    CarrotYouTubeQuality: { nested: [false, 6, null] }, CarrotYouTubeTimestamp: 12,
    FutureUnknown: ['untouched'], UntouchedBoolean: true, UntouchedNull: null,
  };
  demo.context.fixture = backup;
  await demo.run('importBackup({name:"fixture.json",text:async()=>JSON.stringify(fixture)})');
  const p = demo.params.find(p => p.name === 'StopDistanceCarrot');
  demo.selectStep(p, 5);
  demo.run('openChoice("StopDistanceCarrot");exportBackup()');
  assert.deepEqual(await demo.exported(), backup);
  demo.press(p, 1);
  demo.run('exportBackup()');
  assert.deepEqual(await demo.exported(), { ...backup, StopDistanceCarrot: '605' });
  demo.click({ default: 'StopDistanceCarrot' });
  demo.run('exportBackup()');
  assert.deepEqual(await demo.exported(), { ...backup, StopDistanceCarrot: '600' });
});

test('Search input remains mounted while filtering and existing choice/toggle edits still work', () => {
  const demo = loadDemo(), input = demo.element('searchInput'), screen = demo.element('screen');
  screen.innerHTML = 'mounted-search-input';
  demo.run("state.stage='search'");
  for (const value of ['ㅈ', '주', '주ㅎ', '주행', '주행']) {
    input.value = value;
    demo.dispatch('input', input);
    assert.strictEqual(demo.element('searchInput'), input);
    assert.equal(input.value, value);
    assert.equal(screen.innerHTML, 'mounted-search-input');
  }
  demo.click({ set: 'OnnxBsdEnabled', value: '1' });
  assert.equal(demo.run('state.backup.OnnxBsdEnabled'), '1');
  demo.run('openChoice("ShowModelView")');
  demo.click({ choiceValue: '3' });
  demo.run('applyChoice()');
  assert.equal(demo.run('state.backup.ShowModelView'), '3');
});
