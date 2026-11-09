'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Frozen oracles from openpilot/selfdrive/carrot at this official commit.
const OFFICIAL_SHA = '0df83618f196357165a29218c9a588b0131c7d20';
// web/js/pages/setting.js:781 and web/src/ui/components/numeric_stepper/numeric_stepper.js:18.
// Official config.py UNIT_CYCLE; this is the actual increment, not p.unit times it.
const EXPECTED_STEPS = [1, 2, 5, 10, 50, 100];
const SETTING_CONTROL_KINDS = ["toggle", "segmented", "select", "slider"];
const WEEKLY_TOGGLES = ['ManualTurnIndicator', 'TeslaCanTrafficStop', 'TeslaManualLaneSignals', 'TeslaModelDesireSignals', 'TeslaModelPathSignals'];

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


function loadDemo({ storage = new Map(), storageBlocked = false, session = new Map(), sessionFailure = {}, hosted = false, startup: executeStartup = false, navEntries = [] } = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const startup = 'initializeBackup();render();initNavHistory();checkForUpdate();';
  assert.equal(script.split(startup).length, 2, 'Only browser startup is suppressed');
  const nodes = new Map(), listeners = new Map(), timers = new Map();
  const confirmations = [], downloads = [], navigations = [];
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
      id, hidden: true, disabled: false, textContent: '', innerHTML: '', value: '', style: {}, dataset: {}, isConnected: true,
      addEventListener(type, listener) { listen(id, type, listener); },
      setAttribute() {}, focus() {}, querySelector() { return element('query-' + id); },
      querySelectorAll() { return []; }, insertAdjacentHTML() {}, classList: { toggle() {}, add() {}, remove() {} },
      click() { if (this.download) downloads.push({ name: this.download, blob: exportedBlob }); }, remove() {},
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
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const localStorage = {
    getItem(key) { if (storageBlocked) throw new Error('storage blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (storageBlocked) throw new Error('storage blocked'); storage.set(key, String(value)); },
    removeItem(key) { if (storageBlocked) throw new Error('storage blocked'); storage.delete(key); },
  };
  const sessionStorage = {
    getItem(key) { if (sessionFailure.read) throw new Error('session read blocked'); return session.get(key) ?? null; },
    setItem(key, value) { if (sessionFailure.write) throw new Error('session quota exceeded'); session.set(key, String(value)); },
    removeItem(key) { if (sessionFailure.remove) throw new Error('session removal blocked'); session.delete(key); },
  };
  const historyEntries = structuredClone(navEntries);
  const history = {
    get state() { return historyEntries.at(-1); },
    pushState(entry) { historyEntries.push(entry); },
    replaceState(entry) { if (historyEntries.length) historyEntries.pop(); historyEntries.push(entry); },
    back() {
      if (historyEntries.length < 2) return;
      historyEntries.pop();
      dispatch('popstate', null, { state: this.state }, 'window');
    },
    go(delta) { while (delta++ < 0 && historyEntries.length > 1) historyEntries.pop(); dispatch('popstate', null, { state: this.state }, 'window'); },
  };
  const context = vm.createContext({
    document, Blob, URL: TestURL, Date: TestDate, localStorage, sessionStorage, AbortController, crypto: require('node:crypto').webcrypto,
    fetch: async () => ({ ok: true, json: async () => ({ tag_name: 'v1.0.0', assets: [] }) }),
    setTimeout: schedule, clearTimeout: id => timers.delete(id),
    confirm(message) { confirmations.push(message); return confirmAnswer; },
    history,
    location: { ...(hosted
      ? { origin: 'https://fullmetalsonic.github.io', pathname: '/webcarrot-offline-demo/' }
      : { origin: 'https://example.invalid', pathname: '/' }), assign(url) { navigations.push(url); } },
    window: { localStorage, sessionStorage, addEventListener(type, listener) { listen('window', type, listener); }, scrollTo() {} },
  });
  vm.runInContext(executeStartup ? script : script.replace(startup, ''), context);
  const run = source => vm.runInContext(source, context);
  if (!executeStartup) run("initializeBackup();state.tab='drive';initNavHistory()");
  const params = JSON.parse(run('JSON.stringify(PARAMS)'));
  const numeric = params.filter(p => p.name !== 'SoundLanguageSetting' && getSettingControlConfig(p).kind === 'slider');
  function dispatch(type, target, data = {}, owner = 'document') {
    const event = { target, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...data };
    event.completion = Promise.all((listeners.get(`${owner}:${type}`) || []).map(listener => listener(event)));
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
  function chooseFile(file) {
    const input = element('fileInput');
    input.files = file ? [file] : [];
    input.value = file?.name || '';
    return dispatch('change', input, {}, 'fileInput').completion;
  }
  async function importText(text, name = 'fixture.json') {
    await chooseFile({ name, text: async () => text });
  }
  async function exportedText() {
    const before = downloads.length;
    click({ action: 'export' });
    assert.equal(downloads.length, before + 1, 'export action creates one actual Blob download');
    return downloads.at(-1).blob.text();
  }
  function direct(p, value) {
    click({ edit: p.name });
    const input = element('choiceNumber');
    input.value = String(value);
    dispatch('click', element('choiceApply'), {}, 'choiceApply');
  }
  return { run, params, numeric, element, dispatch, click, button, advance, confirmations, downloads, navigations, session, sessionFailure, historyEntries, param,
    control, card, setRaw, selectStep, press, direct, chooseFile, importText, exportedText,
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
  assert.equal(schemaDigest, '3934387ed6e9112675b369421a1972cb273fab1fbafd19e2943a6c7150bd0574');
  assert.equal(demo.params.length, 212);
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

test('Weekly additions retain the official menu order, full descriptions and warnings through navigation', () => {
  const demo = loadDemo();
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /\.setting-descr\{[^}]*line-height:1\.7[;}]/, 'official description row spacing');
  demo.click({ action: 'cat:DRIVING' });
  assert.match(demo.element('screen').innerHTML, /data-action="group:START_AUTO"/);
  assert.match(demo.element('screen').innerHTML, /data-action="group:STEER"/);
  for (const [group, sections] of [
    ['START_AUTO', [
      ['시작 동작', ['AlwaysLateral', 'TeslaAutoTurnSignals', ...WEEKLY_TOGGLES.slice(1), 'AutoEngage', 'DisableMinSteerSpeed']],
      ['오토크루즈', ['AutoCruiseControl', 'SoftHoldOnCancel', 'AutoGasTokSpeed', 'AutoGasCancelSpeed', 'AutoGasSyncSpeed', 'CruiseOnDist']],
    ]],
    ['STEER', [
      ['차로 변경 (자동 턴)', ['LaneChangeNeedTorque', 'LaneChangeDelay', 'LaneChangeBsd', 'LaneLineCheck', 'AutoBlinkerControl',
        'ManualLaneChangeIndicator', 'ManualTurnIndicator', 'ModelDesireIndicator', 'ModelPathIndicator', 'BlinkerLatchedTurn',
        'LaneChangeLeverWait', 'AutoTurnControl', 'AutoTurnControlSpeedTurn', 'AutoTurnControlTurnEnd', 'AutoTurnMapChange']],
    ]],
  ]) {
    demo.click({ action: 'group:' + group });
    const screen = demo.element('screen').innerHTML;
    for (const [title, names] of sections) {
      const section = screen.split(`<h2 class="section-title">${title}</h2>`)[1]?.split('<h2 class="section-title">')[0];
      assert.ok(section, group + ': ' + title);
      assert.deepEqual([...section.matchAll(/data-param="([^"]+)"/g)].map(match => match[1]), names);
    }
  }
  for (const name of WEEKLY_TOGGLES) {
    const expectedPath = name === 'ManualTurnIndicator' ? ['DRIVING', 'STEER', 'STEER_LANECHANGE'] : ['DRIVING', 'START_AUTO', 'BASIC_START'];
    assert.deepEqual(JSON.parse(demo.run(`JSON.stringify(paramPath(${JSON.stringify(name)}).map(x=>x.id))`)), expectedPath);
    demo.click({ action: 'search' });
    const input = demo.element('searchInput');
    input.value = name;
    demo.dispatch('input', input);
    assert.match(demo.element('searchContent').innerHTML, new RegExp(`data-param="${name}"`));
    demo.click({ action: 'detail:' + name });
    assert.match(demo.element('screen').innerHTML, /<span class="risk">주의<\/span>/);
    assert.ok(demo.element('screen').innerHTML.includes(`<p class="setting-descr">${demo.run(`esc(BY_NAME.get(${JSON.stringify(name)}).descr)`)}</p>`), name + ': complete warning/description');
  }
  for (const [name, revisedText] of [
    ['ManualLaneChangeIndicator', '0.3초 뒤를 예측'],
    ['AlwaysLateral', '세 손가락 접촉마다'],
    ['TeslaAutoTurnSignals', '실차 검증 전 일반 도로에서 사용하지 마세요.'],
    ['HyundaiCameraSCC', '계기판용 순정 SCC MAIN 상태와 캐럿의 활성 선택을 분리'],
  ]) {
    demo.click({ action: 'detail:' + name });
    const card = demo.element('screen').innerHTML;
    assert.ok(card.includes(revisedText), name + ': revised description');
    assert.ok(card.includes(`<p class="setting-descr">${demo.run(`esc(BY_NAME.get(${JSON.stringify(name)}).descr)`)}</p>`), name + ': complete description');
  }
  assert.deepEqual([...demo.element('screen').innerHTML.matchAll(/data-set="HyundaiCameraSCC" data-value="([^"]+)"/g)].map(match => Number(match[1])), [0, 1, 2, 3]);
  demo.click({ set: 'HyundaiCameraSCC', value: '2' });
  assert.match(demo.control(demo.param('HyundaiCameraSCC')), /class="active" data-set="HyundaiCameraSCC" data-value="2"/);
});

test('Weekly default-off toggle controls edit only their own key through production clicks', async () => {
  const demo = loadDemo();
  const defaults = await demo.exported();
  for (const name of WEEKLY_TOGGLES) {
    const p = demo.param(name);
    assert.deepEqual([p.min, p.max, p.default, p.risk], [0, 1, 0, 'high'], name);
    assert.equal(defaults[name], '0');
    assert.doesNotMatch(demo.card(p), /data-(?:mult|choice|step|edit)=/);
    for (const value of ['1', '0']) {
      const control = demo.control(p);
      assert.match(control, new RegExp(`role="switch" aria-checked="${value === '0'}"`));
      const toggle = control.match(/data-set="([^"]+)" data-value="([^"]+)"/);
      assert.deepEqual(toggle.slice(1), [name, value]);
      demo.click({ set: toggle[1], value: toggle[2] });
      assert.deepEqual(await demo.exported(), { ...defaults, [name]: value });
    }
  }
});

test('Weekly toggle imports preserve missing keys, original types, nested values and precision until edited', async () => {
  const demo = loadDemo();
  const text = '{"ManualTurnIndicator":1,"TeslaCanTrafficStop":"True","TeslaManualLaneSignals":false,"TeslaModelDesireSignals":{"nested":[false,null,9007199254740993],"ratio":1.234567890123456789012345},"TeslaModelPathSignals":null,"VEgoStopping":50.625000000000000000123,"FutureUnknown":{"values":["001",true,null],"exact":9.876543210987654321}}';
  const fixture = JSON.parse(text);
  for (const name of WEEKLY_TOGGLES) {
    await demo.importText(text);
    demo.click({ action: 'cat:DRIVING' });
    demo.click({ action: 'group:START_AUTO' });
    demo.click({ action: 'group:STEER' });
    demo.click({ action: 'detail:' + name });
    assert.deepEqual(await demo.exported(), fixture, name + ': display leaves every raw value intact');
    assert.equal(demo.run('state.dirty.size'), 0);
    const toggle = demo.control(demo.param(name)).match(/data-set="([^"]+)" data-value="([^"]+)"/);
    demo.click({ set: toggle[1], value: toggle[2] });
    assert.deepEqual(await demo.exported(), { ...fixture, [name]: toggle[2] }, name + ': only explicit edit changes the key');
    const exported = await demo.exportedText();
    assert.match(exported, /"VEgoStopping"\s*:\s*50\.625000000000000000123\b/);
    assert.match(exported, /"exact"\s*:\s*9\.876543210987654321\b/);
    if (name !== 'TeslaModelDesireSignals') {
      assert.match(exported, /9007199254740993\b/);
      assert.match(exported, /1\.234567890123456789012345\b/);
    }
  }
  await demo.importJson({ FutureUnknown: { untouched: [false, null] } });
  for (const name of WEEKLY_TOGGLES) {
    demo.click({ action: 'detail:' + name });
    assert.match(demo.element('screen').innerHTML, /data-missing/);
  }
  assert.deepEqual(await demo.exported(), { FutureUnknown: { untouched: [false, null] } }, 'viewing missing default-off toggles never inserts them');
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

test('Unchanged stored values keep original types; explicit missing-key edits and changed resets are deliberate', async () => {
  const demo = loadDemo(), p = demo.param('VEgoStopping');
  const fixture = { VEgoStopping: 50, ClusterHudScreenMode: 0, CanfdHDA2: true, VehicleNaviSchoolZoneControl: 'True' };
  await demo.importJson(fixture);
  demo.direct(p, ' 50.1 ');
  demo.click({ default: p.name });
  demo.click({ choice: 'ClusterHudScreenMode' });
  demo.click({ choiceValue: '0' });
  demo.click({ edit: 'StopDistanceCarrot' });
  demo.dispatch('click', demo.element('choiceCancel'), {}, 'choiceCancel');
  assert.deepEqual(await demo.exported(), fixture, 'viewing and canceling a missing default does not add it');
  demo.direct(demo.param('StopDistanceCarrot'), 600);
  demo.click({ default: 'StopDistanceCarrot' });
  demo.click({ set: 'CanfdHDA2', value: '1' });
  demo.click({ set: 'VehicleNaviSchoolZoneControl', value: '1' });
  const explicit = { ...fixture, StopDistanceCarrot: '600' };
  assert.deepEqual(await demo.exported(), explicit, 'applying a missing setting writes the requested default');
  assert.equal(demo.run('state.dirty.size'), 1);
  assert.equal(demo.confirmations.length, 0);
  demo.direct(p, 51.6);
  demo.confirmAnswer(false);
  demo.click({ default: p.name });
  assert.deepEqual(await demo.exported(), { ...explicit, VEgoStopping: '52' });
  assert.equal(demo.confirmations.length, 1);
  demo.confirmAnswer(true);
  demo.click({ default: p.name });
  assert.deepEqual(await demo.exported(), { ...explicit, VEgoStopping: '50' });
  assert.equal(demo.confirmations.length, 2);
  demo.click({ set: 'CanfdHDA2', value: '0' });
  demo.click({ set: 'VehicleNaviSchoolZoneControl', value: '0' });
  assert.deepEqual(await demo.exported(), { ...explicit, VEgoStopping: '50', CanfdHDA2: '0', VehicleNaviSchoolZoneControl: '0' });
});

test('Untouched numeric tokens retain precision through import, display and export', async () => {
  const storage = new Map(), session = new Map();
  const demo = loadDemo({ storage, session, hosted: true }), p = demo.param('VEgoStopping');
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
  const reopened = loadDemo({ storage, session, hosted: true });
  reopened.run('restorePendingUpdate()');
  assert.equal(await reopened.exportedText(), edited);
  assert.equal(reopened.run('sessionStorage.getItem(UPDATE_BACKUP_KEY)'), null);
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

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function beginImport(demo, name = 'pending.json') {
  const read = deferred();
  return { ...read, done: demo.chooseFile({ name, text: () => read.promise }) };
}

function backupStatus(demo) {
  return demo.element('backupStatus').innerHTML + demo.run('renderTools()');
}

test('Actual file input commits the last selected file when reads finish in reverse order', async () => {
  const demo = loadDemo(), first = beginImport(demo, 'A.json'), last = beginImport(demo, 'B.json');
  last.resolve('{"StopDistanceCarrot":"800","BOnly":true}');
  await last.done;
  first.resolve('{"StopDistanceCarrot":"400","AOnly":true}');
  await first.done;
  assert.deepEqual(await demo.exported(), { StopDistanceCarrot: '800', BOnly: true });
  assert.match(demo.element('toast').textContent, /B\.json|내보냄/);
  assert.equal(demo.element('fileInput').value, '');
});

test('A failed last selection cannot revive an older in-flight import', async () => {
  const demo = loadDemo();
  await demo.importText('{"StopDistanceCarrot":"700","Keep":9007199254740993}', 'committed.json');
  const before = await demo.exportedText();
  const old = beginImport(demo, 'A.json'), latest = beginImport(demo, 'B.json');
  latest.resolve('{broken');
  await latest.done;
  old.resolve('{"StopDistanceCarrot":"400","Stale":true}');
  await old.done;
  assert.equal(await demo.exportedText(), before);
  assert.equal(demo.run('state.dirty.size'), 0);
});

test('An import in progress blocks download, value edits, reset and new-demo actions', async () => {
  const demo = loadDemo();
  await demo.importJson({ StopDistanceCarrot: '700', Keep: [true, null] });
  const pending = beginImport(demo);
  demo.click({ action: 'export' });
  assert.equal(demo.downloads.length, 0, 'no download can misrepresent the pending file as loaded');
  demo.click({ set: 'StopDistanceCarrot', value: '750' });
  demo.click({ default: 'StopDistanceCarrot' });
  demo.click({ action: 'new' });
  assert.equal(demo.run('state.backup.StopDistanceCarrot'), '700');
  assert.equal(demo.run('state.dirty.size'), 0);
  pending.resolve('{"StopDistanceCarrot":"800","New":false}');
  await pending.done;
  assert.deepEqual(await demo.exported(), { StopDistanceCarrot: '800', New: false });
});

test('Read failures retain the last committed bytes and display an uncommitted-file warning', async () => {
  const demo = loadDemo();
  await demo.importText('{"StopDistanceCarrot":700,"exact":1.234567890123456789}', 'kept.json');
  const before = await demo.exportedText(), failed = beginImport(demo, 'unreadable.json');
  failed.reject(new Error('read failed'));
  await failed.done;
  assert.match(demo.element('toast').textContent, /실패|불러오지/);
  assert.equal(await demo.exportedText(), before);
  const tools = backupStatus(demo);
  assert.match(tools, /kept\.json/);
  assert.match(tools, /unreadable\.json/);
  assert.match(tools, /실패|미반영|불러오지|유지/);
});

test('Replacing a dataset closes numeric editors and rejects their old history entries', async () => {
  const demo = loadDemo();
  await demo.importJson({ StopDistanceCarrot: '600' });
  demo.click({ edit: 'StopDistanceCarrot' });
  demo.element('choiceNumber').value = '650';
  const oldEntry = structuredClone(demo.historyEntries.at(-1));
  await demo.importJson({ StopDistanceCarrot: '800', NewFile: true });
  assert.equal(demo.element('choiceOverlay').hidden, true);
  demo.dispatch('click', demo.element('choiceApply'), {}, 'choiceApply');
  demo.dispatch('popstate', null, { state: oldEntry }, 'window');
  assert.equal(demo.element('choiceOverlay').hidden, true, 'history never revives an editor for a different dataset');
  assert.equal(demo.run('state.choice'), null);
  assert.deepEqual(await demo.exported(), { StopDistanceCarrot: '800', NewFile: true });
});

test('Replacing a dataset invalidates the car confirmation and stale update dialog', async () => {
  const demo = loadDemo({ hosted: true });
  await demo.importJson({ CarSelected3: 'original car' });
  demo.click({ action: 'car' });
  demo.run('chooseCar("Ford Escape 2020-22")');
  const carEntry = structuredClone(demo.historyEntries.at(-1));
  demo.run('updateState.latest="99.0.0";updateState.assetUrl="https://github.com/fullmetalsonic/webcarrot-offline-demo/releases/download/v99.0.0/webcarrot-offline-demo.html";renderUpdateDialog()');
  const updateEntry = structuredClone(demo.historyEntries.at(-1));
  await demo.importJson({ CarSelected3: 'new car', Keep: true });
  assert.equal(demo.element('carModal').hidden, true);
  assert.equal(demo.element('updateOverlay').hidden, true);
  demo.dispatch('click', demo.element('confirmYes'), {}, 'confirmYes');
  for (const entry of [carEntry, updateEntry]) demo.dispatch('popstate', null, { state: entry }, 'window');
  assert.equal(demo.element('carModal').hidden, true);
  assert.equal(demo.element('updateOverlay').hidden, true);
  assert.deepEqual(await demo.exported(), { CarSelected3: 'new car', Keep: true });
});

test('Ordinary refresh restores raw tokens, types, absent keys, large unknown data and explicit edits', async () => {
  const session = new Map(), demo = loadDemo({ session, startup: true });
  const payload = 'future'.repeat(12000);
  const raw = `{"StopDistanceCarrot":700,"VEgoStopping":50.625000000000000000123,"Future":{"integer":9007199254740993,"ratio":1.234567890123456789012345,"nested":[true,false,null," 001 ","${payload}"]},"Null":null,"Toggle":true}`;
  await demo.importText(raw, '설정 원본.json');
  demo.click({ set: 'StopDistanceCarrot', value: '750' });
  const before = await demo.exportedText();
  demo.dispatch('pagehide', null, {}, 'window');
  const refreshed = loadDemo({ session, startup: true });
  assert.equal(await refreshed.exportedText(), before);
  assert.match(before, /50\.625000000000000000123/);
  assert.match(before, /9007199254740993/);
  assert.match(before, /1\.234567890123456789012345/);
  assert.equal(refreshed.run('state.dirty.has("StopDistanceCarrot")'), true);
  assert.match(backupStatus(refreshed), /설정 원본\.json/);
  assert.equal(Object.hasOwn(await refreshed.exported(), 'PathOffset'), false);
});

test('Session quota failures preserve memory and downloads and warn before leaving', async () => {
  const sessionFailure = { write: true }, demo = loadDemo({ sessionFailure, startup: true });
  await demo.importText('{"StopDistanceCarrot":700,"Unknown":9007199254740993}', 'quota.json');
  demo.click({ set: 'StopDistanceCarrot', value: '750' });
  assert.match(backupStatus(demo), /저장|보관|복구/);
  assert.match(backupStatus(demo), /실패|못|불가|초과|차단/);
  assert.equal((await demo.exported()).StopDistanceCarrot, '750');
  assert.match(await demo.exportedText(), /9007199254740993/);
  const leave = demo.dispatch('beforeunload', null, {}, 'window');
  assert.equal(leave.defaultPrevented, true, 'unsaved in-memory work requests the browser leave warning');
  sessionFailure.write = false;
  demo.click({ set: 'StopDistanceCarrot', value: '760' });
  const refreshed = loadDemo({ session: demo.session, startup: true });
  assert.equal((await refreshed.exported()).StopDistanceCarrot, '760');
});

test('Corrupt or unreadable session drafts never silently export defaults and can recover via import or new', async () => {
  for (const [raw, sessionFailure] of [['{bad', {}], ['null', {}], ['{"format":1,"json":"[]"}', {}], [null, { read: true }]]) {
    const session = new Map(raw === null ? [] : [['webcarrot-offline-demo:backup-draft:v1', raw]]);
    const demo = loadDemo({ session, sessionFailure, startup: true });
    demo.click({ action: 'export' });
    demo.click({ set: 'StopDistanceCarrot', value: '750' });
    assert.equal(demo.downloads.length, 0, 'unreadable draft is not silently replaced by an exportable default dataset');
    assert.match(backupStatus(demo), /복구|손상|읽|확인/);
    sessionFailure.read = false;
    await demo.importText('{"StopDistanceCarrot":"720","Recovered":true}', 'recover.json');
    assert.deepEqual(await demo.exported(), { StopDistanceCarrot: '720', Recovered: true });
  }
  const demo = loadDemo({ session: new Map([['webcarrot-offline-demo:backup-draft:v1', '{bad']]), startup: true });
  demo.click({ action: 'new' });
  assert.equal(Object.keys(await demo.exported()).length, 212);
});

test('A stale tab pagehide cannot replace another tab update handoff or draft', async () => {
  const storage = new Map(), oneSession = new Map(), twoSession = new Map();
  const one = loadDemo({ storage, session: oneSession, hosted: true, startup: true });
  await one.importJson({ StopDistanceCarrot: '700', One: true });
  one.run('storePendingUpdate("99.0.0")');
  const two = loadDemo({ storage, session: twoSession, hosted: true, startup: true });
  await two.importJson({ StopDistanceCarrot: '900', Two: true });
  two.run('storePendingUpdate("99.0.0")');
  const sharedBefore = JSON.stringify([...storage]);
  one.click({ set: 'StopDistanceCarrot', value: '750' });
  one.dispatch('pagehide', null, {}, 'window');
  two.dispatch('pagehide', null, {}, 'window');
  assert.equal(JSON.stringify([...storage]), sharedBefore, 'pagehide does not write to another tab shared handoff');
  assert.deepEqual(await loadDemo({ storage, session: oneSession, hosted: true, startup: true }).exported(), { StopDistanceCarrot: '750', One: true });
  assert.deepEqual(await loadDemo({ storage, session: twoSession, hosted: true, startup: true }).exported(), { StopDistanceCarrot: '900', Two: true });
});

test('Explicit gap correction writes raw 4 to 3 while view and cancel retain the raw value', async () => {
  const demo = loadDemo();
  const fixture = { LongitudinalPersonalityMax: '3', CruiseGapLevels: 4, Unknown: null };
  await demo.importJson(fixture);
  demo.click({ choice: 'CruiseGapLevels' });
  demo.dispatch('click', demo.element('choiceCancel'), {}, 'choiceCancel');
  assert.deepEqual(await demo.exported(), fixture);
  demo.click({ choice: 'CruiseGapLevels' });
  demo.click({ choiceValue: '3' });
  assert.deepEqual(await demo.exported(), { ...fixture, CruiseGapLevels: '3' });
  await demo.importJson(fixture);
  demo.click({ default: 'CruiseGapLevels' });
  assert.deepEqual(await demo.exported(), { ...fixture, CruiseGapLevels: '3' });
});

test('Exports use a distinct official source identifier, original filename and collision-free timestamps', async () => {
  const demo = loadDemo();
  await demo.importText('{"StopDistanceCarrot":700}', '../원본 설정?.json');
  await demo.exportedText();
  await demo.exportedText();
  const names = demo.downloads.map(item => item.name);
  assert.notEqual(names[0], names[1], 'same-millisecond exports have distinct filenames');
  for (const name of names) {
    assert.match(name, /webcarrot_official/);
    assert.match(name, /0df83618/);
    assert.match(name, /원본_설정/);
    assert.doesNotMatch(name, /[\\/<>:"|?*]/);
  }
  assert.match(backupStatus(demo), /\.\.\/원본 설정\?\.json/);
});

test('Unknown-only flat objects remain valid and wrapper-shaped objects are preserved with a warning', async () => {
  const demo = loadDemo();
  const flat = { FutureA: '001', FutureB: 50, FutureC: true, FutureD: null };
  await demo.importJson(flat);
  assert.deepEqual(await demo.exported(), flat);
  for (const wrapper of [{ params: { StopDistanceCarrot: '700' } }, { backup: { StopDistanceCarrot: 700 }, version: 2 }]) {
    await demo.importJson(wrapper);
    assert.match(demo.element('toast').textContent + demo.element('backupStatus').innerHTML, /중첩|래퍼|wrapper|구조/);
    assert.deepEqual(await demo.exported(), wrapper, 'warning never unwraps or discards an unknown object');
  }
});

test('New demo and canceled file selection preserve deliberate lifecycle boundaries', async () => {
  const session = new Map(), demo = loadDemo({ session, startup: true });
  await demo.importJson({ StopDistanceCarrot: 700, Unknown: 'keep' });
  const before = await demo.exportedText();
  await demo.chooseFile(null);
  assert.equal(await demo.exportedText(), before, 'canceling the native chooser changes nothing');
  demo.confirmAnswer(false);
  demo.click({ action: 'new' });
  assert.equal(await demo.exportedText(), before);
  demo.confirmAnswer(true);
  demo.click({ action: 'new' });
  const defaults = await demo.exportedText();
  assert.equal(Object.keys(JSON.parse(defaults)).length, 212);
  assert.equal(Object.hasOwn(JSON.parse(defaults), 'Unknown'), false);
  assert.equal(await loadDemo({ session, startup: true }).exportedText(), defaults, 'explicit new demo replaces the saved draft');
});

test('JSON edge tokens survive actual import events and malformed replacements leave committed data intact', async () => {
  const demo = loadDemo();
  const raw = String.raw`{"__proto__":{"kept":true},"constructor":"own","duplicate":1,"duplicate":9007199254740993,"negativeZero":-0,"huge":1e400,"exponent":1.234567890123456789e-300,"escaped":"  \uD55C\uAE00 quotes\" and slash\\ and comma, colon: brace}  ","StopDistanceCarrot":"700"}`;
  await demo.importText(raw);
  const before = await demo.exportedText();
  for (const token of ['9007199254740993', '-0', '1e400', '1.234567890123456789e-300']) assert.ok(before.includes(token), token);
  assert.equal(Object.hasOwn(JSON.parse(before), '__proto__'), true);
  assert.equal(JSON.parse(before).constructor, 'own');
  for (const malformed of ['null', '[]', 'true', '17', '"text"', '{"bad":NaN}', '{"bad":1,}', '{"bad":"unterminated}']) {
    await demo.importText(malformed, 'invalid.json');
    assert.match(demo.element('toast').textContent, /실패|불러오지/);
    assert.equal(await demo.exportedText(), before, malformed);
  }
});

test('A pointer gesture in flight cannot edit a newly imported dataset or a new demo', async () => {
  for (const replacement of ['import', 'new']) {
    const demo = loadDemo();
    await demo.importJson({ StopDistanceCarrot: '700', Unknown: true });
    const target = demo.button({ step: 'StopDistanceCarrot', delta: '1' });
    demo.dispatch('pointerdown', target, { pointerId: 7, button: 0, clientX: 0, clientY: 0 });
    if (replacement === 'import') await demo.importJson({ StopDistanceCarrot: '900', Replacement: true });
    else demo.click({ action: 'new' });
    const committed = await demo.exportedText();
    demo.advance(1500);
    demo.dispatch('pointerup', target, { pointerId: 7 });
    // Keep the VM target connected to also exercise the dataset guard for an overdue click echo.
    demo.dispatch('click', target, { detail: 1 });
    assert.equal(await demo.exportedText(), committed, replacement + ': held timer, release and synthetic click cannot replay an old edit');
  }
});

test('Stored BOOL coercion and inferred BOOL controls follow the official restore service without changing raw types', async () => {
  const demo = loadDemo();
  // Pinned params-service.py _coerce_bool: string true/1/yes/on, otherwise scalar truthiness.
  // VehicleNaviSchoolZoneControl and SoftHoldOnCancel are native BOOL; these two display keys infer BOOL.
  for (const name of ['VehicleNaviSchoolZoneControl', 'SoftHoldOnCancel', 'ShowPathEnd', 'ShowRouteInfo']) {
    const p = demo.param(name);
    assert.deepEqual([p.min, p.max], [0, 1]);
    for (const raw of ['yes', 'ON', 'true', '1', 'false', 'off', '0', 'unexpected', 2, -1, 0, true, false]) {
      const expected = typeof raw === 'string' ? ['true', '1', 'yes', 'on'].includes(raw.toLowerCase()) : Boolean(raw);
      const fixture = { [name]: raw, Unknown: { original: true } };
      await demo.importJson(fixture);
      assert.match(demo.control(p), new RegExp(`aria-checked="${expected}"`), name + ': ' + JSON.stringify(raw));
      assert.deepEqual(await demo.exported(), fixture, 'display keeps the original token/type');
      demo.click({ set: name, value: expected ? '0' : '1' });
      assert.deepEqual(await demo.exported(), { ...fixture, [name]: expected ? '0' : '1' });
    }
  }
});

test('Native INT binary controls do not present invalid boolean strings as a successfully restored ON value', async () => {
  const demo = loadDemo(), p = demo.param('CanfdHDA2');
  // Native INT in pinned common/params_keys.h; official restore int(value) rejects "True"/"yes".
  for (const raw of ['True', 'yes', 'false', 'legacy', '0x1', '0b1', '']) {
    const fixture = { CanfdHDA2: raw, Unknown: null };
    await demo.importJson(fixture);
    assert.doesNotMatch(demo.control(p), /aria-checked="true"/, raw + ': no misleading ON state');
    assert.match(demo.card(p), /유효|형식|복원|정수|지원하지/, 'invalid integer backup is visibly marked');
    assert.deepEqual(await demo.exported(), fixture);
    demo.click({ set: p.name, value: '1' });
    assert.deepEqual(await demo.exported(), { ...fixture, CanfdHDA2: '1' });
  }
  for (const [raw, restored] of [[0.5, 0], [1.5, 2], [-0.5, 0]]) {
    const fixture = { CanfdHDA2: raw, Unknown: null };
    await demo.importJson(fixture);
    assert.equal(demo.run('controlValue(BY_NAME.get("CanfdHDA2"))'), restored, 'native INT restore rounds ties to even');
    assert.deepEqual(await demo.exported(), fixture);
    demo.click({ set: p.name, value: '1' });
    assert.deepEqual(await demo.exported(), { ...fixture, CanfdHDA2: '1' });
  }
});

test('Repeated imports of the same filename clear only the committed dataset edits and chooser cancel keeps a pending read', async () => {
  const demo = loadDemo();
  await demo.importText('{"StopDistanceCarrot":700,"First":true}', 'same.json');
  demo.click({ set: 'StopDistanceCarrot', value: '750' });
  assert.equal(demo.run('state.dirty.size'), 1);
  const pending = beginImport(demo, 'same.json');
  await demo.chooseFile(null);
  pending.resolve('{"StopDistanceCarrot":800,"Second":true}');
  await pending.done;
  assert.deepEqual(await demo.exported(), { StopDistanceCarrot: 800, Second: true });
  assert.equal(demo.run('state.dirty.size'), 0);
  await demo.importText('{"StopDistanceCarrot":900,"Third":true}', 'same.json');
  assert.deepEqual(await demo.exported(), { StopDistanceCarrot: 900, Third: true });
});

test('Pending import blocks old car confirmation and hosted update navigation without losing the last backup', async () => {
  const demo = loadDemo({ hosted: true });
  await demo.importJson({ CarSelected3: 'original car', StopDistanceCarrot: '700' });
  demo.click({ action: 'car' });
  demo.run('chooseCar("Ford Escape 2020-22");updateState.latest="99.0.0";updateState.assetUrl="https://github.com/fullmetalsonic/webcarrot-offline-demo/releases/download/v99.0.0/webcarrot-offline-demo.html"');
  const pending = beginImport(demo);
  demo.dispatch('click', demo.element('confirmYes'), {}, 'confirmYes');
  demo.click({ action: 'applyHostedUpdate' });
  demo.click({ action: 'saveUpdateBackup' });
  assert.equal(demo.run('state.backup.CarSelected3'), 'original car');
  assert.equal(demo.navigations.length, 0);
  assert.equal(demo.downloads.length, 0);
  pending.resolve('{"CarSelected3":"replacement car"}');
  await pending.done;
  assert.deepEqual(await demo.exported(), { CarSelected3: 'replacement car' });
});

test('Hosted update refuses navigation after storage failure and retains the exportable in-memory data', async () => {
  const demo = loadDemo({ sessionFailure: { write: true }, hosted: true, startup: true });
  await demo.importText('{"StopDistanceCarrot":"700","Unknown":9007199254740993}', 'unsaved.json');
  demo.run('updateState.latest="99.0.0";updateState.assetUrl="https://github.com/fullmetalsonic/webcarrot-offline-demo/releases/download/v99.0.0/webcarrot-offline-demo.html"');
  demo.click({ action: 'applyHostedUpdate' });
  assert.equal(demo.navigations.length, 0);
  assert.match(demo.element('toast').textContent, /못|실패|백업|내보내/);
  assert.match(await demo.exportedText(), /9007199254740993/);
});

test('Explicit defaults insert missing keys while viewing and canceled edits leave them absent', async () => {
  const demo = loadDemo(), fixture = { Unknown: { exact: true } };
  for (const [name, value] of [['StopDistanceCarrot', '600'], ['CanfdHDA2', '0'], ['ShowModelView', '0'], ['CruiseGapLevels', '3']]) {
    await demo.importJson(fixture);
    demo.click({ action: 'detail:' + name });
    assert.deepEqual(await demo.exported(), fixture);
    demo.click({ default: name });
    assert.deepEqual(await demo.exported(), { ...fixture, [name]: value });
  }
  await demo.importJson(fixture);
  demo.click({ set: 'CanfdHDA2', value: '0' });
  assert.deepEqual(await demo.exported(), { ...fixture, CanfdHDA2: '0' });
  for (const raw of ['True', '0x1', '']) {
    await demo.importJson({ CanfdHDA2: raw });
    demo.click({ set: 'CanfdHDA2', value: '0' });
    assert.deepEqual(await demo.exported(), { CanfdHDA2: '0' }, 'explicit OFF canonicalizes an invalid stored integer');
  }
});

test('Draft metadata corruption is blocked and cleanup failures never destroy restored raw data', async () => {
  const key = 'webcarrot-offline-demo:backup-draft:v1', session = new Map();
  const seed = loadDemo({ session, hosted: true, startup: true });
  await seed.importText('{"StopDistanceCarrot":700,"Unknown":9007199254740993}', 'saved.json');
  const valid = JSON.parse(session.get(key));
  for (const patch of [{ format: 2 }, { id: '' }, { revision: -1 }, { sourceName: {} }, { imported: 'yes' },
    { sourceRecognized: -1 }, { dirty: [1] }, { dirty: ['missing'] }, { json: '{bad' }, { json: '[]' }]) {
    const corrupt = new Map([[key, JSON.stringify({ ...valid, ...patch })]]);
    const demo = loadDemo({ session: corrupt, startup: true });
    demo.click({ action: 'export' });
    assert.equal(demo.downloads.length, 0, JSON.stringify(patch));
    assert.match(backupStatus(demo), /손상|확인|복원|차단/);
  }
  seed.run('storePendingUpdate(DEMO_VERSION)');
  session.delete(key); // Exercise the real startup handoff path when no ordinary draft is available.
  const removeFailure = loadDemo({ session, sessionFailure: { remove: true }, hosted: true, startup: true });
  assert.match(backupStatus(removeFailure), /정리|실패|못/);
  assert.match(await removeFailure.exportedText(), /9007199254740993/);
});
