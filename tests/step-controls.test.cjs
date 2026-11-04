'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Frozen oracles from openpilot/selfdrive/carrot at this official commit.
const OFFICIAL_SHA = '14c5398fca00d298c2791ecf43f46b3e3fd6cc38';
// web/js/pages/setting.js:781 and web/src/ui/components/numeric_stepper/numeric_stepper.js:18.
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

// web/js/pages/setting.js:846. Server examples in server/tests/test_settings_schema.py
// independently pin 1 -> 31 and 30 -> 31.
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


function loadDemo({ storage = new Map(), storageBlocked = false, hosted = false } = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const startup = 'state.backup=defaultBackup();restorePendingUpdate();render();initNavHistory();checkForUpdate();';
  assert.equal(script.split(startup).length, 2, 'Only browser startup is suppressed');
  const nodes = new Map(), listeners = new Map(), timers = new Map();
  const confirmations = [];
  let confirmAnswer = true, now = 1000, timerId = 0;
  let exportedBlob;
  function listen(owner, type, listener) {
    const key = `${owner}:${type}`;
    if (!listeners.has(key)) listeners.set(key, []);
    listeners.get(key).push(listener);
  }
  function schedule(callback, delay) {
    timers.set(++timerId, { callback, time: now + delay });
    return timerId;
  }
  function advance(ms) {
    const end = now + ms;
    while (timers.size) {
      const [id, timer] = [...timers].sort((a, b) => a[1].time - b[1].time)[0];
      if (timer.time > end) break;
      now = timer.time;
      timers.delete(id);
      timer.callback();
    }
    now = end;
  }
  function element(id = '') {
    if (nodes.has(id)) return nodes.get(id);
    const node = {
      id, hidden: true, textContent: '', innerHTML: '', value: '', style: {}, dataset: {},
      addEventListener(type, listener) { listen(id, type, listener); },
      setAttribute() {}, focus() {}, querySelector() { return element('query-' + id); },
      querySelectorAll() { return []; }, insertAdjacentHTML() {}, classList: { toggle() {}, add() {}, remove() {} },
      click() {}, remove() {},
    };
    nodes.set(id, node);
    return node;
  }
  const document = {
    addEventListener(type, listener) { listen('document', type, listener); },
    getElementById: element, querySelectorAll() { return []; },
    createElement() { return element('download'); }, body: { style: {}, append() {} },
  };
  class TestURL extends URL {}
  TestURL.createObjectURL = blob => { exportedBlob = blob; return 'blob:step-test'; };
  TestURL.revokeObjectURL = () => {};
  class TestDate extends Date { static now() { return now; } }
  const localStorage = {
    getItem(key) { if (storageBlocked) throw new Error('storage blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (storageBlocked) throw new Error('storage blocked'); storage.set(key, String(value)); },
    removeItem(key) { if (storageBlocked) throw new Error('storage blocked'); storage.delete(key); },
  };
  const historyEntries = [];
  const history = {
    get state() { return historyEntries.at(-1); },
    pushState(entry) { historyEntries.push(entry); },
    replaceState(entry) { if (historyEntries.length) historyEntries.pop(); historyEntries.push(entry); },
    back() {
      if (historyEntries.length < 2) return;
      historyEntries.pop();
      dispatch('popstate', null, { state: this.state }, 'window');
    },
  };
  const context = vm.createContext({
    document, Blob, URL: TestURL, Date: TestDate, localStorage, setTimeout: schedule, clearTimeout: id => timers.delete(id),
    confirm(message) { confirmations.push(message); return confirmAnswer; },
    history,
    location: hosted
      ? { origin: 'https://fullmetalsonic.github.io', pathname: '/webcarrot-offline-demo/' }
      : { origin: 'https://example.invalid', pathname: '/' },
    window: { localStorage, addEventListener(type, listener) { listen('window', type, listener); }, scrollTo() {} },
  });
  vm.runInContext(script.replace(startup, ''), context);
  const run = source => vm.runInContext(source, context);
  run("state.backup=defaultBackup();state.tab='drive';initNavHistory()");
  const params = JSON.parse(run('JSON.stringify(PARAMS)'));
  const numeric = params.filter(p => p.name !== 'SoundLanguageSetting' && getSettingControlConfig(p).kind === 'slider');
  function dispatch(type, target, data = {}, owner = 'document') {
    const event = { target, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...data };
    for (const listener of listeners.get(`${owner}:${type}`) || []) listener(event);
    return event;
  }
  const button = dataset => ({ dataset, closest() { return this; }, classList: { add() {}, remove() {} } });
  const click = (dataset, data = {}) => dispatch('click', button(dataset), { detail: 0, ...data });
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
  const param = name => params.find(p => p.name === name);
  async function importText(text) {
    context.fixtureText = text;
    await run('importBackup({name:"fixture.json",text:async()=>fixtureText})');
  }
  async function exportedText() {
    run('exportBackup()');
    return exportedBlob.text();
  }
  function direct(p, value) {
    click({ edit: p.name });
    const input = element('choiceNumber');
    input.value = String(value);
    dispatch('click', element('choiceApply'), {}, 'choiceApply');
  }
  return { run, params, numeric, element, dispatch, click, button, advance, confirmations, param,
    control, card, setRaw, selectStep, press, direct, importText, exportedText,
    importJson: fixture => importText(JSON.stringify(fixture)), confirmAnswer(value) { confirmAnswer = value; },
    async exported() { return JSON.parse(await exportedText()); } };
}

function validInitial(p) {
  return Number.isInteger(Number(p.default)) && p.default >= p.min && p.default <= p.max
    ? Number(p.default) : Number(p.min);
}

test('Embedded settings schema and menu match the frozen official source', () => {
  const demo = loadDemo();
  assert.equal(demo.run('SOURCE_SHA'), OFFICIAL_SHA);
  const schemaDigest = createHash('sha256').update(demo.run('JSON.stringify(SCHEMA)')).digest('hex');
  assert.equal(schemaDigest, '871f4530a79dcc5423e0a63fad12dab1a067a27a4d5bc724d9548a56623df912');
  assert.equal(demo.params.length, 207);
  assert.equal(demo.numeric.length, 102);
  assert.equal(demo.run('Object.values(CAR_CATALOG).flat().length'), 333);
});

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

test('Numeric text dialogs normalize finite input and leave invalid input unchanged on every numeric row', () => {
  const demo = loadDemo();
  for (const p of demo.numeric) {
    demo.setRaw(p.name, validInitial(p));
    demo.selectStep(p, 50);
    demo.click({ edit: p.name });
    const body = demo.element('choiceBody').innerHTML;
    assert.match(body, /<input\b[^>]*\btype="text"/);
    assert.doesNotMatch(body, /type="range"/);
    demo.run('closeChoice()');
    const read = () => demo.run(`state.backup[${JSON.stringify(p.name)}]`);
    for (const value of [p.min + 1, p.min - 1, p.max + 1, p.min + 0.6]) {
      demo.direct(p, value);
      assert.equal(read(), String(normalizeSettingNumericValue(value, p)), `${p.name}: direct ${value}`);
    }
    const previous = read();
    const dirty = demo.run('state.dirty.size');
    for (const invalid of ['', ' ', 'NaN', 'Infinity', '12x']) {
      demo.direct(p, invalid);
      assert.equal(read(), previous, `${p.name}: rejects ${JSON.stringify(invalid)}`);
      assert.equal(demo.run('state.dirty.size'), dirty);
      assert.equal(demo.element('choiceOverlay').hidden, true);
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
    demo.direct(p, value);
    assert.equal(demo.run('state.backup.CenterToFrontRatio'), '31', `direct ${value} -> 31`);
    demo.dispatch('change', { dataset: { raw: p.name }, value: String(value) });
    assert.equal(demo.run('state.backup.CenterToFrontRatio'), '31', `raw ${value} -> 31`);
  }
  for (const value of [0, 31, 40, 60, 69]) {
    demo.direct(p, value);
    assert.equal(demo.run('state.backup.CenterToFrontRatio'), String(value));
  }
  demo.click({ default: p.name });
  assert.equal(demo.run('state.backup.CenterToFrontRatio'), '0');
  assert.ok(demo.control(p).includes('0 · 차량 기본'));
  assert.ok(demo.card(p).includes('default=0 · 차량 기본'));
  assert.equal((await demo.exported()).CenterToFrontRatio, '0');
});

test('Imported gap values stay byte-for-value intact until an explicit edit', async () => {
  const demo = loadDemo(), p = demo.params.find(p => p.name === 'CenterToFrontRatio');
  for (let value = 1; value <= 30; value++) {
    for (const raw of [value, String(value)]) {
      const backup = { CenterToFrontRatio: raw, CenterToFrontRatioEnabled: true, DisableDM: { nested: [false, null] }, FutureUnknown: ['kept'] };
      await demo.importJson(backup);
      demo.selectStep(p, 5);
      demo.run('openChoice("CenterToFrontRatio");closeChoice()');
      assert.deepEqual(await demo.exported(), backup);
      assert.equal(demo.run('state.dirty.size'), 0);
      demo.press(p, 1);
      assert.deepEqual(await demo.exported(), { ...backup, CenterToFrontRatio: String(value + 5 < 31 ? 31 : value + 5) });
    }
  }
});

test('Official additions retain menu paths, detail visibility, search and control kinds', () => {
  const demo = loadDemo();
  assert.equal(demo.param('PaddleMode').max, 3, 'personal fork mode 4 is excluded');
  for (const [name, path] of [
    ['CenterToFrontRatio', ['DRIVING', 'STEER', 'STEER_FEEL']],
    ['TeslaAutoTurnSignals', ['DRIVING', 'START_AUTO', 'BASIC_START']],
    ['CanfdBlinkerControl', ['VEHICLE', 'VEH_CANFD']],
    ['ManualLaneChangeIndicator', ['DRIVING', 'STEER', 'STEER_LANECHANGE']],
    ['CommaPedalEnabled', ['VEHICLE', 'VEH_DEVICE']],
  ]) assert.deepEqual(JSON.parse(demo.run(`JSON.stringify(paramPath(${JSON.stringify(name)}).map(x=>x.id))`)), path);
  for (const name of ['ManualLaneChangeIndicator', 'ModelDesireIndicator', 'ModelPathIndicator', 'CommaPedalEnabled', 'TeslaAutoTurnSignals', 'CanfdBlinkerControl']) {
    const p = demo.param(name);
    assert.ok(demo.control(p).includes('role="switch"'), name);
    assert.equal(p.default, 0);
  }
  assert.deepEqual(JSON.parse(demo.run('JSON.stringify(detailParams("AutoTurnControl").map(p=>p.name))')), ['AutoTurnControl', 'AutoTurnControlRightLaneChange']);
  assert.equal(demo.run('SCHEMA.menu.flatMap(c=>flatten(c)).some(x=>x.names.includes("AutoTurnControlRightLaneChange"))'), false);
  demo.run('handleAction("detail:AutoTurnControl")');
  assert.ok(demo.run('renderSettings()').includes('data-param="AutoTurnControlRightLaneChange"'));
  demo.run('state.search="AutoTurnControlRightLaneChange"');
  assert.ok(demo.run('foundParams().some(p=>p.name==="AutoTurnControlRightLaneChange")'));
  const hud = demo.param('ClusterHudScreenMode');
  assert.equal(hud.max, 7);
  assert.equal(hud.control, 'select');
  assert.ok(demo.control(hud).includes('data-choice="ClusterHudScreenMode"'));
  demo.run('openChoice("ClusterHudScreenMode")');
  assert.deepEqual([...demo.element('choiceBody').innerHTML.matchAll(/data-choice-value="([^"]+)"/g)].map(match => Number(match[1])), [-1, 0, 1, 2, 3, 4, 5, 6, 7]);
  demo.run('closeChoice()');
  for (const value of [6, 7]) {
    demo.click({ choice: 'ClusterHudScreenMode' });
    demo.click({ choiceValue: String(value) });
    assert.equal(demo.run('state.backup.ClusterHudScreenMode'), String(value));
    assert.equal(demo.element('choiceOverlay').hidden, true);
  }
});

test('ATC distance is a 0–500 numeric row and x1 preserves the official stored value', () => {
  const demo = loadDemo(), p = demo.param('AutoTurnControlRightLaneChange');
  assert.deepEqual([p.min, p.max, p.default, p.unit, p.control], [0, 500, 0, 50, 'slider']);
  assert.match(demo.card(p), /data-mult="AutoTurnControlRightLaneChange">x1/);
  demo.press(p, 1);
  // common/atc_params.py maps this stored legacy ON value to 250 metres at runtime.
  assert.equal(demo.run('state.backup.AutoTurnControlRightLaneChange'), '1');
  demo.click({ default: p.name });
  demo.selectStep(p, 50);
  demo.press(p, 1);
  assert.equal(demo.run('state.backup.AutoTurnControlRightLaneChange'), '50');
  demo.direct(p, 901);
  assert.equal(demo.run('state.backup.AutoTurnControlRightLaneChange'), '500');
});

test('Numeric steps remain available with imported fractional, out-of-range and non-numeric values', async () => {
  const demo = loadDemo(), p = demo.param('VEgoStopping');
  for (const [raw, up, down] of [
    [51.625, 53, 51], ['50.625', 52, 50], [9, 10, 10], ['101', 100, 100],
    ['legacy', 51, 49], [null, 51, 49], [{ unsupported: true }, 51, 49],
  ]) {
    const fixture = { [p.name]: raw, FutureUnknown: { exact: 0.123456789012345, list: [false, null] } };
    for (const [sign, expected] of [[1, up], [-1, down]]) {
      await demo.importJson(fixture);
      assert.deepEqual(await demo.exported(), fixture, 'rendering retains the original JSON value');
      demo.press(p, sign);
      assert.deepEqual(await demo.exported(), { ...fixture, [p.name]: String(expected) }, JSON.stringify(raw));
    }
  }
});

test('Unchanged edits keep original types and missing keys; a changed reset requires confirmation', async () => {
  const demo = loadDemo(), p = demo.param('VEgoStopping');
  const fixture = { VEgoStopping: 50, ClusterHudScreenMode: 0, CanfdHDA2: true, VehicleNaviSchoolZoneControl: 'True' };
  await demo.importJson(fixture);
  demo.direct(p, ' 50.1 ');
  demo.click({ default: p.name });
  demo.click({ choice: 'ClusterHudScreenMode' });
  demo.click({ choiceValue: '0' });
  demo.direct(demo.param('StopDistanceCarrot'), 600);
  demo.click({ default: 'StopDistanceCarrot' });
  demo.click({ set: 'CanfdHDA2', value: '1' });
  demo.click({ set: 'VehicleNaviSchoolZoneControl', value: '1' });
  assert.deepEqual(await demo.exported(), fixture);
  assert.equal(demo.run('state.dirty.size'), 0);
  assert.equal(demo.confirmations.length, 0);
  demo.direct(p, 51.6);
  demo.confirmAnswer(false);
  demo.click({ default: p.name });
  assert.deepEqual(await demo.exported(), { ...fixture, VEgoStopping: '52' });
  assert.equal(demo.confirmations.length, 1);
  demo.confirmAnswer(true);
  demo.click({ default: p.name });
  assert.deepEqual(await demo.exported(), { ...fixture, VEgoStopping: '50' });
  assert.equal(demo.confirmations.length, 2);
  demo.click({ set: 'CanfdHDA2', value: '0' });
  demo.click({ set: 'VehicleNaviSchoolZoneControl', value: '0' });
  assert.deepEqual(await demo.exported(), { ...fixture, VEgoStopping: '50', CanfdHDA2: '0', VehicleNaviSchoolZoneControl: '0' });
});

test('Untouched numeric tokens retain precision through import, display and export', async () => {
  const storage = new Map();
  const demo = loadDemo({ storage, hosted: true }), p = demo.param('VEgoStopping');
  const precision = '50.625000000000000000123';
  const future = '{"count":9007199254740993,"array":[false,1.234567890123456789012345,null]}';
  await demo.importText(`{"VEgoStopping":${precision},"FutureUnknown":${future}}`);
  demo.selectStep(p, 5);
  demo.click({ edit: p.name });
  demo.run('closeChoice()');
  const original = await demo.exportedText();
  assert.match(original, new RegExp(`"VEgoStopping"\\s*:\\s*${precision.replace('.', '\\.')}\\s*,`));
  assert.match(original, /"count"\s*:\s*9007199254740993\b/);
  assert.match(original, /\b1\.234567890123456789012345\b/);
  demo.press(p, 1);
  const edited = await demo.exportedText();
  assert.equal(JSON.parse(edited).VEgoStopping, '56');
  assert.match(edited, /"count"\s*:\s*9007199254740993\b/);
  assert.match(edited, /\b1\.234567890123456789012345\b/);
  assert.deepEqual(Object.keys(JSON.parse(edited)), ['VEgoStopping', 'FutureUnknown']);
  demo.run('storePendingUpdate(DEMO_VERSION)');
  const reopened = loadDemo({ storage, hosted: true });
  reopened.run('restorePendingUpdate()');
  assert.equal(await reopened.exportedText(), edited);
  assert.equal(reopened.run('localStorage.getItem(UPDATE_BACKUP_KEY)'), null);
});

// web/src/ui/components/commit_gesture.js defines the timing and 10px movement tolerance.
test('Numeric pointer gestures commit on release or repeat at 900/160 ms without an extra click', () => {
  const demo = loadDemo();
  const target = demo.button({ step: 'StopDistanceCarrot', delta: '1' });
  const pointer = (type, options = {}) => demo.dispatch(type, target, { pointerId: 1, button: 0, clientX: 10, clientY: 10, ...options });
  const echo = () => demo.dispatch('click', target, { detail: 1 });
  const value = () => demo.run('state.backup.StopDistanceCarrot');
  assert.ok(!pointer('pointerdown').defaultPrevented, 'pointerdown leaves browser scrolling available');
  demo.advance(100);
  assert.equal(value(), '600');
  pointer('pointerup');
  assert.equal(value(), '601');
  echo();
  assert.equal(value(), '601');
  pointer('pointerdown');
  demo.advance(899);
  assert.equal(value(), '601');
  demo.advance(1);
  assert.equal(value(), '602');
  demo.advance(159);
  assert.equal(value(), '602');
  demo.advance(1);
  assert.equal(value(), '603');
  demo.advance(160);
  assert.equal(value(), '604');
  pointer('pointerup');
  echo();
  demo.advance(500);
  assert.equal(value(), '604');
  for (const [type, options] of [['pointercancel', {}], ['pointermove', { clientY: 21 }]]) {
    pointer('pointerdown');
    demo.advance(100);
    pointer(type, options);
    pointer('pointerup');
    echo();
    demo.advance(1000);
    assert.equal(value(), '604', type);
  }
  demo.dispatch('click', target, { detail: 0 });
  assert.equal(value(), '605', 'keyboard activation remains available');
});

test('Multiplier preferences survive a reload per row and fail open when storage is blocked', async () => {
  const storage = new Map();
  const original = loadDemo({ storage }), p = original.param('StopDistanceCarrot');
  const before = await original.exported();
  original.selectStep(p, 50);
  assert.deepEqual(await original.exported(), before);
  assert.equal(original.run('state.dirty.size'), 0);
  const reopened = loadDemo({ storage });
  assert.match(reopened.card(p), /data-mult="StopDistanceCarrot">x50/);
  assert.match(reopened.card(reopened.param('VEgoStopping')), /data-mult="VEgoStopping">x1/);
  reopened.press(p, 1);
  assert.equal(reopened.run('state.backup.StopDistanceCarrot'), '650');
  const blocked = loadDemo({ storageBlocked: true });
  blocked.selectStep(p, 5);
  blocked.press(p, 1);
  assert.equal(blocked.run('state.backup.StopDistanceCarrot'), '605');
});

test('Gap levels adapt to vehicle capability while imported and missing values stay intact', async () => {
  const demo = loadDemo(), p = demo.param('CruiseGapLevels');
  for (const [fixture, max] of [[{}, 3], [{ LongitudinalPersonalityMax: '3' }, 3],
    [{ LongitudinalPersonalityMax: '4' }, 4], [{ LongitudinalPersonalityMax: 4 }, 4],
    [{ LongitudinalPersonalityMax: 'invalid', CruiseGapLevels: 4, TFollowGap4: 175 }, 3]]) {
    await demo.importJson(fixture);
    demo.click({ choice: p.name });
    const choices = [...demo.element('choiceBody').innerHTML.matchAll(/data-choice-value="([^"]+)"/g)].map(match => Number(match[1]));
    assert.deepEqual(choices, max === 4 ? [2, 3, 4] : [2, 3]);
    assert.deepEqual(await demo.exported(), fixture);
    demo.click({ choiceValue: '2' });
    assert.deepEqual(await demo.exported(), { ...fixture, CruiseGapLevels: '2' });
    demo.click({ default: p.name });
    assert.deepEqual(await demo.exported(), { ...fixture, CruiseGapLevels: String(max) });
  }
  assert.equal((await loadDemo().exported()).CruiseGapLevels, '3');
});

test('Hyundai, Kia, Genesis, Toyota and Lexus hide the three brand-restricted settings', async () => {
  const demo = loadDemo();
  const names = ['LongTuningKpV', 'LongTuningKf', 'LongTuningKiV'];
  for (const [car, hidden] of [
    [{ CarName: 'HYUNDAI TEST FINGERPRINT' }, true], [{ CarName: 'KIA TEST FINGERPRINT' }, true],
    [{ CarName: 'GENESIS TEST FINGERPRINT' }, true], [{ CarSelected3: 'Toyota RAV4 2023-25' }, true],
    [{ CarSelected3: 'Lexus RX 2020-22' }, true], [{ CarName: 'Toyota RAV4 2023-25' }, true],
    [{ CarName: 'TOYOTA UNKNOWN FINGERPRINT' }, false], [{ CarSelected3: 'Ford Escape 2020-22' }, false], [{}, false],
  ]) {
    const fixture = { ...car, LongTuningKpV: 199, LongTuningKiV: '017', FutureUnknown: 0.123456789012345 };
    await demo.importJson(fixture);
    for (const name of names) {
      demo.element('searchInput').value = name;
      demo.dispatch('input', demo.element('searchInput'));
      assert.equal(demo.element('searchContent').innerHTML.includes(`data-param="${name}"`), !hidden, `${name}: ${JSON.stringify(car)}`);
    }
    assert.deepEqual(await demo.exported(), fixture);
  }
});

test('Cycling and opening a dialog preserve imported keys/types; only explicit edits change exports', async () => {
  const demo = loadDemo();
  const backup = {
    StopDistanceCarrot: 600, CruiseEcoControl: '2', CarrotYouTubeLive: 'True',
    CarrotYouTubeQuality: { nested: [false, 6, null] }, CarrotYouTubeTimestamp: 12,
    FutureUnknown: ['untouched'], UntouchedBoolean: true, UntouchedNull: null,
  };
  await demo.importJson(backup);
  const p = demo.param('StopDistanceCarrot');
  demo.selectStep(p, 5);
  demo.run('openChoice("StopDistanceCarrot")');
  assert.deepEqual(await demo.exported(), backup);
  demo.press(p, 1);
  assert.deepEqual(await demo.exported(), { ...backup, StopDistanceCarrot: '605' });
  demo.click({ default: 'StopDistanceCarrot' });
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
  assert.equal(demo.run('state.backup.ShowModelView'), '3');
});
