import type { ActionDefinition, Condition, Content, ResidentDefinition } from '../core/types.ts';

const always: Condition = { op: 'always' };
const at = (actorId: string, locationId: string): Condition => ({ op: 'at', actorId, locationId });
const all = (...conditions: Condition[]): Condition => ({ op: 'all', conditions });
const action = (id: string, label: string, actorIds: string[], options: Partial<ActionDefinition>): ActionDefinition => ({
  id, label, actorIds, durationTicks: 5, startGuard: always, maintainGuard: always, finishGuard: always,
  resources: [], onSuccess: [], onAbort: [], recovery: null, movement: null,
  presentationId: 'debug.action', designStatus: 'provisional', rationale: 'Phase 1の基盤検査用。本編の人物・場面データではない。', ...options,
});
const actor = (id: string, displayName: string, locationId: string): ResidentDefinition => ({
  id, displayName, locationId, kind: id === 'player' ? 'player' : 'fixture', sourceRef: 'doc/foundation-status.md',
  normalLife: '実装基盤の検査役。本編100人には含めない。', goal: '検査用の行為を実際に完了する', initialBeliefs: [], rules: [], goalEvidence: [], postGoalContract: { version: 1, serviceIds: [] },
});
const actors = [actor('player', '主人公', 'loc.yard'), actor('fixture.carrier', '運び手', 'loc.yard'), actor('fixture.recipient', '受取人', 'loc.home'), actor('fixture.worker', '作業者', 'loc.works')];
actors[3]!.goalEvidence = ['fixture.work.finished'];
actors[3]!.postGoalContract.serviceIds = ['service.return'];
actors[3]!.rules = [{ id: 'rule.work', priority: 1, choiceGuard: { op: 'belief', propositionId: 'prop.request', stance: 'believe' }, actionId: 'act.work', retryTicks: 10 }];
const places = [
  { id: 'loc.yard', name: '中庭', x: 0, y: 0, links: ['loc.home', 'loc.works'] },
  { id: 'loc.home', name: '受取所', x: 1, y: 0, links: ['loc.yard'] },
  { id: 'loc.works', name: '作業所', x: 0, y: 1, links: ['loc.yard', 'loc.store'] },
  { id: 'loc.store', name: '返却口', x: 1, y: 1, links: ['loc.works'] },
];
const travel = actors.flatMap(a => places.flatMap(p => p.links.map(to => action(`act.walk.${a.id}.${p.id}.${to}`, `${places.find(x => x.id === to)!.name}へ歩く`, [a.id], {
  durationTicks: 20, startGuard: at(a.id, p.id), movement: { actorId: a.id, from: p.id, to }, onSuccess: [{ op: 'move', actorId: a.id, to }],
}))));
export const foundationContent: Content = {
  version: 'foundation-0.1.0', namespace: 'redesign-v1', tickMs: 100, ticksPerDay: 14400,
  places, actors, resources: ['slot.workbench'], services: ['service.return'],
  propositions: [
    { id: 'prop.request', description: '依頼札に作業の注文が書かれている', initialValue: true },
    { id: 'prop.safe', description: '作業設備が安全な状態にある', initialValue: true },
    { id: 'prop.delivered', description: '包みが受取人へ届いた', initialValue: false },
    { id: 'prop.finished', description: '作業が実際に完了した', initialValue: false },
  ],
  objects: [
    { id: 'obj.package', name: '注文の包み', ownerId: 'fixture.recipient', custody: { kind: 'place', id: 'loc.yard' }, quantity: 1, unit: '包', portable: true, consumable: false },
    { id: 'obj.material', name: '作業用の材料', ownerId: 'fixture.worker', custody: { kind: 'place', id: 'loc.works' }, quantity: 3, unit: '個', portable: true, consumable: true },
  ],
  clues: [
    { id: 'clue.request', locationId: 'loc.yard', propositionId: 'prop.request', visible: always, description: '依頼札を読む' },
    { id: 'clue.safety', locationId: 'loc.works', propositionId: 'prop.safe', visible: always, description: '設備の安全表示を調べる' },
    { id: 'clue.receipt', locationId: 'loc.home', propositionId: 'prop.delivered', visible: always, description: '受取台帳を調べる' },
  ],
  agreements: [{ id: 'agreement.work', version: 1, proposerId: 'player', participantIds: ['player', 'fixture.worker'], terms: '合図を確認してから一緒に作業する。中断時は受け台へ戻す。' }],
  actions: [
    ...travel,
    ...['player', 'fixture.carrier'].map(id => action(`act.take.${id}`, '包みを受け取る', [id], {
      startGuard: all(at(id, 'loc.yard'), { op: 'custody', objectId: 'obj.package', custody: { kind: 'place', id: 'loc.yard' } }),
      resources: [`hand:${id}:right`], onSuccess: [{ op: 'transfer', objectId: 'obj.package', from: { kind: 'place', id: 'loc.yard' }, to: { kind: 'actor', id } }],
    })),
    ...['player', 'fixture.carrier'].map(id => action(`act.deliver.${id}`, '受取人へ包みを渡す', [id], {
      startGuard: all(at(id, 'loc.home'), at('fixture.recipient', 'loc.home'), { op: 'custody', objectId: 'obj.package', custody: { kind: 'actor', id } }),
      resources: [`hand:${id}:right`, 'hand:fixture.recipient:left', 'actor:fixture.recipient'],
      onSuccess: [{ op: 'transfer', objectId: 'obj.package', from: { kind: 'actor', id }, to: { kind: 'actor', id: 'fixture.recipient' } }, { op: 'fact', propositionId: 'prop.delivered', value: true }, { op: 'emit', type: 'fixture.package.received', actorIds: ['fixture.recipient'], locationId: 'loc.home', subjectIds: ['obj.package'] }],
    })),
    action('act.work', '材料を加工する', ['fixture.worker'], {
      durationTicks: 30, startGuard: all(at('fixture.worker', 'loc.works'), { op: 'quantity', objectId: 'obj.material', minimum: 1 }),
      maintainGuard: { op: 'fact', propositionId: 'prop.safe', value: true },
      resources: ['hand:fixture.worker:left', 'hand:fixture.worker:right', 'slot.workbench'],
      onSuccess: [{ op: 'consume', objectId: 'obj.material', quantity: 1, unit: '個' }, { op: 'fact', propositionId: 'prop.finished', value: true }, { op: 'emit', type: 'fixture.work.finished', actorIds: ['fixture.worker'], locationId: 'loc.works', subjectIds: ['obj.material'] }],
      recovery: { durationTicks: 10, retainResources: ['hand:fixture.worker:left', 'slot.workbench'], onSuccess: [{ op: 'emit', type: 'fixture.work.restored', actorIds: ['fixture.worker'], locationId: 'loc.works', subjectIds: [] }] },
    }),
    action('act.stop', '設備を停止する', ['player'], { durationTicks: 1, startGuard: at('player', 'loc.works'), onSuccess: [{ op: 'fact', propositionId: 'prop.safe', value: false }] }),
    action('act.restore', '設備を復旧する', ['player'], { durationTicks: 1, startGuard: at('player', 'loc.works'), onSuccess: [{ op: 'fact', propositionId: 'prop.safe', value: true }] }),
    action('act.borrow-bench', '作業台を借りる', ['player'], { startGuard: at('player', 'loc.works'), resources: ['slot.workbench'], durationTicks: 10 }),
    action('act.agreed-work', '合意した共同作業を試す', ['player', 'fixture.worker'], {
      startGuard: all(at('player', 'loc.works'), at('fixture.worker', 'loc.works'), { op: 'agreement', agreementId: 'agreement.work', version: 1, actorIds: ['player', 'fixture.worker'] }),
      resources: ['slot.workbench'], durationTicks: 10,
    }),
  ],
};
