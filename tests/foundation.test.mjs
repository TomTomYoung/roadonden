import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/core/engine.ts';
import { FixedClock } from '../src/core/clock.ts';
import { validateContent, validateState } from '../src/core/validation.ts';
import { choose } from '../src/core/conditions.ts';
import { foundationContent } from '../src/content/foundation.ts';
import { Saves } from '../src/storage/saves.ts';

const content = () => structuredClone(foundationContent);
const create = () => new Simulation(content());
function run(s, actionId, actorId = 'player') {
  s.enqueue({ kind: 'start', actorId, actionId }); s.step(s.content.actions.find(a => a.id === actionId).durationTicks + 1);
}
function walk(s, to, actorId = 'player') { run(s, `act.walk.${actorId}.${s.snapshot().actors[actorId].locationId}.${to}`, actorId); }
function inspect(s, clueId, actorId = 'player') { s.enqueue({ kind: 'inspect', actorId, clueId }); s.step(2); }
function speak(s, recipientId, propositionId = 'prop.request', actorId = 'player') { s.enqueue({ kind: 'say', actorId, recipientId, propositionId }); s.step(2); }
function instruct(s) { inspect(s, 'clue.request'); walk(s, 'loc.works'); speak(s, 'fixture.worker'); }
const memoryStore = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };

test('fixture is valid and does not impersonate any of the 100 residents', () => {
  validateContent(foundationContent); const s = create(); validateState(s.snapshot(), s.content);
  assert.equal(s.content.actors.filter(a => a.kind === 'resident').length, 0);
  assert.equal(s.content.tickMs, 100);
});
test('validator rejects unknown operators, physical knowledge in decisions, bad references and quantities', () => {
  for (const corrupt of [
    c => c.actions[0].startGuard = { op: 'mystery' },
    c => c.actors[3].rules[0].choiceGuard = { op: 'fact', propositionId: 'prop.request', value: true },
    c => c.actions[0].onSuccess[0].to = 'loc.missing',
    c => c.objects[0].quantity = -1,
    c => c.actions[0].durationTicks = 0,
    c => c.actors.push(structuredClone(c.actors[0])),
    c => c.actions.find(a => a.id === 'act.work').onSuccess[0].unit = 'kg',
  ]) { const c = content(); corrupt(c); assert.throws(() => new Simulation(c)); }
});
test('choice guard has only self knowledge; unknown is different from denial', () => {
  const self = create().snapshot().actors.player;
  assert.equal(choose({ op: 'belief', propositionId: 'prop.safe', stance: 'deny' }, self), false);
  assert.equal(choose({ op: 'belief', propositionId: 'prop.safe', stance: 'believe' }, self), false);
});
test('world truth, inspection, testimony and autonomous action are separate steps', () => {
  const s = create(); s.step(10);
  assert.equal(s.snapshot().facts['prop.request'], true);
  assert.deepEqual(s.snapshot().actors['fixture.worker'].beliefs, {});
  assert.equal(s.snapshot().actions.length, 0);
  s.enqueue({ kind: 'inspect', actorId: 'player', clueId: 'clue.request' }); s.step();
  assert.equal(s.snapshot().actors.player.beliefs['prop.request'], undefined);
  s.step(); assert.equal(s.snapshot().actors.player.beliefs['prop.request'].sourceKind, 'observation');
  walk(s, 'loc.works');
  s.enqueue({ kind: 'say', actorId: 'player', recipientId: 'fixture.worker', propositionId: 'prop.request' }); s.step();
  assert.equal(s.snapshot().actions.length, 0); s.step();
  assert.equal(s.snapshot().actors['fixture.worker'].beliefs['prop.request'].sourceKind, 'testimony');
  assert.equal(s.snapshot().actions[0].elapsedTicks, 0);
  assert.deepEqual(s.snapshot().completions, {});
});
test('unseen clues, unknown information and remote speech are rejected without gaining knowledge', () => {
  const s = create();
  s.enqueue({ kind: 'inspect', actorId: 'player', clueId: 'clue.receipt' });
  s.enqueue({ kind: 'say', actorId: 'player', recipientId: 'fixture.carrier', propositionId: 'prop.request' }); s.step(2);
  assert.deepEqual(s.snapshot().actors.player.beliefs, {});
  inspect(s, 'clue.request'); speak(s, 'fixture.worker');
  assert.deepEqual(s.snapshot().actors['fixture.worker'].beliefs, {});
  assert.equal(s.snapshot().events.filter(e => e.type === 'engine.command.rejected').length, 3);
});
test('transfer conflict reserves the whole object and does not duplicate it', () => {
  const s = create();
  s.enqueue({ kind: 'start', actorId: 'player', actionId: 'act.take.player' });
  s.enqueue({ kind: 'start', actorId: 'fixture.carrier', actionId: 'act.take.fixture.carrier' }); s.step(6);
  assert.deepEqual(s.snapshot().objects['obj.package'].custody, { kind: 'actor', id: 'player' });
  assert.equal(s.snapshot().events.filter(e => e.type === 'engine.effect.transfer').length, 1);
  assert.deepEqual(s.snapshot().reservations, {}); validateState(s.snapshot(), s.content);
});
test('request order decides new reservations, existing action retains priority', () => {
  const s = create(); s.enqueue({ kind: 'start', actorId: 'fixture.carrier', actionId: 'act.take.fixture.carrier' }); s.step();
  s.enqueue({ kind: 'start', actorId: 'player', actionId: 'act.take.player' }); s.step(6);
  assert.equal(s.snapshot().objects['obj.package'].custody.id, 'fixture.carrier');
});
test('reservation failure never retains a subset of the requested resources', () => {
  const c = content(); c.actors[0].locationId = 'loc.works'; const s = new Simulation(c);
  s.enqueue({ kind: 'start', actorId: 'fixture.worker', actionId: 'act.work' });
  s.enqueue({ kind: 'start', actorId: 'player', actionId: 'act.borrow-bench' }); s.step();
  assert.equal(s.snapshot().reservations['actor:player'], undefined);
  assert.ok(s.snapshot().reservations['slot.workbench']); validateState(s.snapshot(), s.content);
});
test('movement consumes time, blocks interactions and survives intermediate save', () => {
  const s = create(); s.enqueue({ kind: 'start', actorId: 'player', actionId: 'act.walk.player.loc.yard.loc.home' }); s.step(10);
  assert.equal(s.snapshot().actors.player.locationId, 'loc.yard');
  assert.equal(s.snapshot().actions[0].elapsedTicks, 9);
  s.enqueue({ kind: 'inspect', actorId: 'player', clueId: 'clue.request' }); s.step();
  assert.equal(s.snapshot().deliveries.length, 0);
  const restored = create(); restored.load(s.save()); s.step(10); restored.step(10);
  assert.deepEqual(restored.snapshot(), s.snapshot()); assert.equal(s.snapshot().actors.player.locationId, 'loc.home');
});
test('receiving an item never telepathically updates a distant actor', () => {
  const s = create(); run(s, 'act.take.player'); walk(s, 'loc.home'); run(s, 'act.deliver.player');
  assert.equal(s.snapshot().facts['prop.delivered'], true);
  assert.deepEqual(s.snapshot().actors['fixture.carrier'].beliefs, {});
  assert.equal(s.snapshot().objects['obj.package'].ownerId, 'fixture.recipient');
  inspect(s, 'clue.receipt'); walk(s, 'loc.yard'); speak(s, 'fixture.carrier', 'prop.delivered');
  assert.equal(s.snapshot().actors['fixture.carrier'].beliefs['prop.delivered'].stance, 'believe');
});
test('a failed multi-effect transaction does not partially transfer or consume anything', () => {
  const c = content(); const a = c.actions.find(a => a.id === 'act.take.player');
  a.onSuccess.push({ op: 'consume', objectId: 'obj.material', quantity: 999, unit: '個' });
  const s = new Simulation(c); run(s, a.id);
  assert.equal(s.snapshot().objects['obj.package'].custody.kind, 'place');
  assert.equal(s.snapshot().objects['obj.material'].quantity, 3);
  assert.equal(s.snapshot().events.some(e => e.type === 'engine.effect.transfer'), false);
  assert.deepEqual(s.snapshot().reservations, {});
});
test('cancel enters recovery, retains safety locks, then releases them without completing the goal', () => {
  const s = create(); run(s, 'act.walk.player.loc.yard.loc.works');
  s.enqueue({ kind: 'start', actorId: 'fixture.worker', actionId: 'act.work' }); s.step(5);
  const action = s.snapshot().actions[0];
  s.enqueue({ kind: 'cancel', actorId: 'fixture.worker', instanceId: action.id }); s.step();
  const state = s.snapshot(); assert.equal(state.actions[0].phase, 'recovering');
  assert.ok(state.reservations['slot.workbench']); assert.equal(state.reservations['hand:fixture.worker:right'], undefined);
  assert.equal(state.objects['obj.material'].quantity, 3);
  s.enqueue({ kind: 'start', actorId: 'player', actionId: 'act.borrow-bench' }); s.step();
  assert.ok(s.snapshot().events.some(e => e.type === 'engine.action.rejected'));
  s.step(9); assert.equal(s.snapshot().actions.length, 0); assert.deepEqual(s.snapshot().reservations, {});
  assert.deepEqual(s.snapshot().completions, {}); validateState(s.snapshot(), s.content);
});
test('a broken maintain condition on the finishing tick cannot complete the action in either array order', () => {
  for (const reversed of [false, true]) {
    const c = content(); c.actors[0].locationId = 'loc.works'; c.actions.find(a => a.id === 'act.stop').durationTicks = 30;
    const s = new Simulation(c); const commands = [{ kind: 'start', actorId: 'fixture.worker', actionId: 'act.work' }, { kind: 'start', actorId: 'player', actionId: 'act.stop' }];
    if (reversed) commands.reverse(); commands.forEach(x => s.enqueue(x)); s.step(31);
    assert.equal(s.snapshot().facts['prop.safe'], false); assert.equal(s.snapshot().facts['prop.finished'], false);
    assert.equal(s.snapshot().objects['obj.material'].quantity, 3); assert.deepEqual(s.snapshot().completions, {});
    assert.equal(s.snapshot().actions[0].phase, 'recovering'); validateState(s.snapshot(), s.content);
  }
});
test('after cancellation and physical recovery the same work can be retried normally', () => {
  const c = content(); c.actors[0].locationId = 'loc.works'; const s = new Simulation(c);
  s.enqueue({ kind: 'start', actorId: 'fixture.worker', actionId: 'act.work' }); s.step(5); run(s, 'act.stop'); s.step(10);
  run(s, 'act.restore'); run(s, 'act.work', 'fixture.worker');
  assert.ok(s.snapshot().completions['fixture.worker']); assert.equal(s.snapshot().objects['obj.material'].quantity, 2);
});
test('save during recovery preserves locks, remaining work and subsequent effects exactly once', () => {
  const s = create(); s.enqueue({ kind: 'start', actorId: 'fixture.worker', actionId: 'act.work' }); s.step(5);
  s.enqueue({ kind: 'cancel', actorId: 'fixture.worker', instanceId: s.snapshot().actions[0].id }); s.step(4);
  const restored = create(); restored.load(s.save());
  s.step(7); restored.step(7); run(s, 'act.work', 'fixture.worker'); run(restored, 'act.work', 'fixture.worker');
  assert.deepEqual(s.snapshot(), restored.snapshot()); assert.equal(s.snapshot().objects['obj.material'].quantity, 2);
});
test('goal is recorded only after execution, is irreversible and enables the agreed normal service', () => {
  const s = create(); instruct(s); s.step(29);
  assert.deepEqual(s.snapshot().completions, {}); s.step();
  assert.ok(s.snapshot().completions['fixture.worker']); assert.equal(s.snapshot().services['service.return'], true);
  const completion = s.snapshot().completions['fixture.worker']; s.step(100);
  assert.deepEqual(s.snapshot().completions['fixture.worker'], completion);
  assert.equal(s.snapshot().events.filter(e => e.type === 'engine.goal.completed').length, 1);
  assert.equal(s.snapshot().objects['obj.material'].quantity, 2); validateState(s.snapshot(), s.content);
});
test('offscreen completion is not in the notebook until the player asks a local witness', () => {
  const s = create(); run(s, 'act.work', 'fixture.worker'); s.step(2);
  assert.ok(s.snapshot().completions['fixture.worker']); assert.deepEqual(s.snapshot().knownCompletions, {});
  walk(s, 'loc.works'); s.enqueue({ kind: 'askCompletion', actorId: 'player', recipientId: 'fixture.worker' }); s.step(2);
  assert.ok(s.snapshot().knownCompletions['fixture.worker']); validateState(s.snapshot(), s.content);
});
test('witnessed achievement reaches the notebook on the next information-delivery boundary', () => {
  const c = content(); c.actors[0].locationId = 'loc.works'; const s = new Simulation(c); run(s, 'act.work', 'fixture.worker');
  assert.deepEqual(s.snapshot().knownCompletions, {}); s.step(); assert.ok(s.snapshot().knownCompletions['fixture.worker']);
});
test('hearing a plan is not consent; a joint action requires every participant accepting that version', () => {
  const c = content(); c.actors[0].locationId = 'loc.works'; const s = new Simulation(c);
  s.enqueue({ kind: 'accept', actorId: 'fixture.worker', agreementId: 'agreement.work', version: 1 }); s.step();
  assert.deepEqual(s.snapshot().actors['fixture.worker'].accepted, {});
  s.enqueue({ kind: 'offer', actorId: 'player', recipientId: 'fixture.worker', agreementId: 'agreement.work' }); s.step(2);
  assert.equal(s.snapshot().actors['fixture.worker'].offered['agreement.work'], 1);
  assert.deepEqual(s.snapshot().actors['fixture.worker'].accepted, {});
  run(s, 'act.agreed-work'); assert.ok(s.snapshot().events.some(e => e.type === 'engine.action.rejected'));
  for (const actorId of ['player','fixture.worker']) s.enqueue({ kind: 'accept', actorId, agreementId: 'agreement.work', version: 1 }); s.step();
  run(s, 'act.agreed-work'); assert.ok(s.snapshot().events.some(e => e.type === 'engine.action.finished' && e.payload.actionId === 'act.agreed-work'));
});
test('pending commands and information delivery both survive save/load', () => {
  const s = create(); s.enqueue({ kind: 'inspect', actorId: 'player', clueId: 'clue.request' }); s.step();
  s.enqueue({ kind: 'start', actorId: 'player', actionId: 'act.take.player' });
  const restored = create(); restored.load(s.save()); s.step(20); restored.step(20);
  assert.deepEqual(restored.snapshot(), s.snapshot()); validateState(s.snapshot(), s.content);
});
test('rendering frame chunks do not change simulation results; paused/hidden intervals do not catch up', () => {
  const a = create(), b = create(); const ac = new FixedClock(), bc = new FixedClock(); ac.setPaused(false); bc.setPaused(false);
  a.enqueue({ kind: 'start', actorId: 'fixture.worker', actionId: 'act.work' }); b.enqueue({ kind: 'start', actorId: 'fixture.worker', actionId: 'act.work' });
  for (let i = 0; i < 240; i++) ac.advance(1000 / 60, () => a.step());
  for (let i = 0; i < 40; i++) bc.advance(100, () => b.step());
  assert.deepEqual(a.snapshot(), b.snapshot()); ac.setPaused(true); ac.advance(1e6, () => a.step());
  assert.equal(a.snapshot().tick, 40); ac.setPaused(false); ac.advance(100, () => a.step()); assert.equal(a.snapshot().tick, 41);
});
test('command log can reproduce a whole delivery and information route', () => {
  const s = create(); run(s, 'act.take.player'); walk(s, 'loc.home'); run(s, 'act.deliver.player'); inspect(s, 'clue.receipt'); walk(s, 'loc.yard'); speak(s, 'fixture.carrier', 'prop.delivered');
  const target = s.snapshot(); const replay = create();
  while (replay.snapshot().tick < target.tick) { const tick = replay.snapshot().tick + 1; target.commandLog.filter(e => e.tick === tick).forEach(e => replay.enqueue(e.command)); replay.step(); }
  assert.deepEqual(replay.snapshot(), target);
});
test('malformed, unknown-version, wrong-content and inconsistent saves leave the current game intact', () => {
  const s = create(); run(s, 'act.take.player'); const original = s.snapshot();
  const bad = [save => save.schemaVersion = 999, save => save.contentVersion = 'old', save => save.designNamespace = 'old-design',
    save => save.state.objects['obj.package'].quantity = -1, save => save.state.objects['obj.package'].custody = { kind: 'actor', id: 'missing' },
    save => save.state.reservations['object:obj.package'] = 999, save => save.state.nextEventId = 1,
    save => save.state.actors.player.beliefs['prop.safe'] = { propositionId: 'prop.safe', stance: 'believe', sourceKind: 'testimony', sourceId: 'player', evidenceEventIds: [], acquiredAt: 0, revisionReason: 'bad' },
    save => save.state.knownCompletions['fixture.worker'] = 999, save => save.state.actors.player.accepted['agreement.work'] = 1,
    save => save.state.commandLog[0].command.kind = 'evil', save => save.state.objects['obj.package'].custody = { kind: 'object', id: 'obj.package' },
  ];
  for (const damage of bad) { const save = s.save(); damage(save); assert.throws(() => s.load(save)); assert.deepEqual(s.snapshot(), original); }
  assert.throws(() => new Saves(memoryStore()).import(s, '{broken')); assert.deepEqual(s.snapshot(), original);
});
test('manual slots, two autosave generations and unavailable storage report truthful results', () => {
  const s = create(); const store = memoryStore(); const saves = new Saves(store); saves.write(s, 1); saves.autosave(s);
  s.step(3); saves.write(s, 2); saves.autosave(s); s.step(2); saves.write(s, 3);
  saves.read(s, 1); assert.equal(s.snapshot().tick, 0); saves.read(s, 2); assert.equal(s.snapshot().tick, 3);
  saves.read(s, 3); assert.equal(s.snapshot().tick, 5); saves.read(s, 'previous'); assert.equal(s.snapshot().tick, 0);
  saves.read(s, 'auto'); assert.equal(s.snapshot().tick, 3);
  const full = new Saves({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
  assert.throws(() => full.write(s, 1), /quota/); assert.throws(() => full.read(s, 1), /セーブがありません/);
});
test('snapshots are detached; malformed commands cannot mutate or queue state', () => {
  const s = create(); const state = s.snapshot(); state.objects['obj.package'].quantity = 999;
  assert.equal(s.snapshot().objects['obj.package'].quantity, 1);
  const initial = s.snapshot(); assert.throws(() => s.enqueue({ kind: 'start', actorId: 'player', actionId: 'missing' }));
  assert.deepEqual(s.snapshot(), initial);
});

test('schema 1 foundation saves migrate explicitly without mapping fixture people to real residents', () => {
  const s=create();s.step(10);const old=s.save();old.schemaVersion=1;delete old.state.loans;
  const restored=create();restored.load(old);assert.deepEqual(restored.snapshot(),s.snapshot());assert.equal(restored.save().schemaVersion,2);
});
