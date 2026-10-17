import type { ActionDefinition, ActionEffect, Command, Content, Custody, SaveFile, WorldState } from './types.ts';

export function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function record(x: unknown, path: string): asserts x is Record<string, unknown> {
  requireThat(x !== null && typeof x === 'object' && !Array.isArray(x), `${path}: オブジェクトが必要です`);
}
function array(x: unknown, path: string): asserts x is unknown[] { requireThat(Array.isArray(x), `${path}: 配列が必要です`); }
function str(x: unknown, path: string): asserts x is string {
  requireThat(typeof x === 'string' && x.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(x), `${path}: 文字列が不正です`);
}
function int(x: unknown, path: string, min = 0): asserts x is number { requireThat(Number.isSafeInteger(x) && (x as number) >= min, `${path}: ${min}以上の整数が必要です`); }
function val(x: unknown, path: string) { requireThat(typeof x === 'string' || typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)), `${path}: 値が不正です`); }
function stance(x: unknown) { requireThat(['believe', 'deny', 'uncertain'].includes(x as string), '認識の stance が不正です'); }
function strings(x: unknown, path: string): asserts x is string[] { array(x, path); x.forEach(v => str(v, path)); }
function unique(xs: string[], label: string) { requireThat(new Set(xs).size === xs.length, `${label}: IDが重複しています`); }
function ref(id: unknown, xs: { id: string }[], label: string) { str(id, label); requireThat(xs.some(x => x.id === id), `${label}: 未定義の参照 ${id}`); }
function bool(x: unknown, label: string) { requireThat(typeof x === 'boolean', `${label}: 真偽値が必要です`); }
function sameKeys(x: Record<string, unknown>, keys: string[], label: string) {
  requireThat(Object.keys(x).sort().join('|') === [...keys].sort().join('|'), `${label}: フィールドが不足または未知です`);
}
export function sameCustody(a: Custody, b: Custody): boolean { return a.kind === b.kind && (a.kind === 'consumed' || (b.kind !== 'consumed' && a.id === b.id)); }
function custody(x: unknown, c: Content) {
  record(x, 'custody');
  switch (x.kind) {
    case 'actor': ref(x.id, c.actors, 'custody.actor'); break;
    case 'place': ref(x.id, c.places, 'custody.place'); break;
    case 'object': ref(x.id, c.objects, 'custody.object'); break;
    case 'consumed': break;
    default: throw new Error(`custody: 未知の種別 ${String(x.kind)}`);
  }
  sameKeys(x, x.kind === 'consumed' ? ['kind'] : ['kind', 'id'], 'custody');
}
function guard(x: unknown, c: Content, choice = false, depth = 0) {
  requireThat(depth < 32, '条件の入れ子が深すぎます'); record(x, 'condition');
  const actor = (id: unknown) => ref(id, c.actors, 'condition.actor');
  switch (x.op) {
    case 'always': return;
    case 'all': case 'any': array(x.conditions, 'conditions'); x.conditions.forEach(y => guard(y, c, choice, depth + 1)); return;
    case 'not': guard(x.condition, c, choice, depth + 1); return;
    case 'belief': ref(x.propositionId, c.propositions, 'condition.proposition'); stance(x.stance); if (!choice) actor(x.actorId); return;
    case 'here': requireThat(choice, 'hereは判断専用です'); ref(x.locationId, c.places, 'condition.place'); return;
    case 'accepted': requireThat(choice, 'acceptedは判断専用です'); ref(x.agreementId, c.agreements, 'condition.agreement'); int(x.version, 'version', 1); return;
    case 'offered': ref(x.agreementId, c.agreements, 'condition.agreement'); int(x.version, 'version', 1); if (!choice) actor(x.actorId); return;
  }
  requireThat(!choice, `判断規則から世界状態は読めません: ${String(x.op)}`);
  switch (x.op) {
    case 'fact': ref(x.propositionId, c.propositions, 'condition.proposition'); val(x.value, 'condition.value'); break;
    case 'at': actor(x.actorId); ref(x.locationId, c.places, 'condition.place'); break;
    case 'together': strings(x.actorIds, 'together.actors'); requireThat(x.actorIds.length > 0, '同席者が必要です'); x.actorIds.forEach(actor); break;
    case 'custody': ref(x.objectId, c.objects, 'condition.object'); custody(x.custody, c); break;
    case 'quantity': ref(x.objectId, c.objects, 'condition.object'); int(x.minimum, 'minimum'); break;
    case 'agreement': ref(x.agreementId, c.agreements, 'condition.agreement'); int(x.version, 'version', 1); strings(x.actorIds, 'actorIds'); x.actorIds.forEach(actor); break;
    case 'loan': ref(x.loanId, c.loans ?? [], 'condition.loan'); requireThat(['available','borrowed','returned'].includes(x.status as string), '貸借状態が不正です'); break;
    case 'during': int(x.from, 'from'); int(x.until, 'until', 1); requireThat(x.until > x.from, '時間区間が逆転しています'); break;
    case 'event': str(x.type, 'event.type'); actor(x.actorId); break;
    case 'active': ref(x.actionId, c.actions, 'condition.action'); break;
    case 'reserved': str(x.resourceId, 'resourceId'); requireThat(allResources(c).includes(x.resourceId), '未定義の予約資源'); break;
    default: throw new Error(`未知の条件演算子: ${String(x.op)}`);
  }
}
function effect(x: unknown, c: Content) {
  record(x, 'effect');
  switch (x.op) {
    case 'move': ref(x.actorId, c.actors, 'effect.actor'); ref(x.to, c.places, 'effect.place'); break;
    case 'transfer': ref(x.objectId, c.objects, 'effect.object'); custody(x.from, c); custody(x.to, c); requireThat((x.to as Custody).kind !== 'consumed', '消費にはconsumeを使ってください'); break;
    case 'consume': {
      ref(x.objectId, c.objects, 'effect.object'); int(x.quantity, 'quantity', 1); str(x.unit, 'unit');
      const o = c.objects.find(o => o.id === x.objectId)!;
      requireThat(o.consumable && o.unit === x.unit, '消費できない物または単位の不一致'); break;
    }
    case 'fact': ref(x.propositionId, c.propositions, 'effect.proposition'); val(x.value, 'effect.value'); requireThat(!c.propositions.find(p => p.id === x.propositionId)!.derived, '観測用の導出命題は直接書き換えられません'); break;
    case 'emit': strings(x.actorIds, 'event.actorIds'); x.actorIds.forEach(id => ref(id, c.actors, 'event.actor')); strings(x.subjectIds, 'event.subjectIds'); str(x.type, 'event.type'); requireThat(!x.type.startsWith('engine.'), 'engine.*は予約された出来事名です'); ref(x.locationId, c.places, 'event.place'); break;
    case 'service': str(x.serviceId, 'serviceId'); requireThat(c.services.includes(x.serviceId), '未定義のサービス'); bool(x.active, 'active'); break;
    case 'inform': ref(x.speakerId, c.actors, 'speaker'); ref(x.recipientId, c.actors, 'recipient'); ref(x.propositionId, c.propositions, 'proposition'); break;
    case 'observe': strings(x.actorIds, 'observers'); x.actorIds.forEach(id => ref(id, c.actors, 'observer')); ref(x.propositionId, c.propositions, 'proposition'); ref(x.locationId, c.places, 'observation.place'); str(x.sourceId, 'source'); break;
    case 'offer': ref(x.speakerId, c.actors, 'speaker'); ref(x.recipientId, c.actors, 'recipient'); ref(x.agreementId, c.agreements, 'agreement'); break;
    case 'accept': ref(x.actorId, c.actors, 'actor'); ref(x.agreementId, c.agreements, 'agreement'); int(x.version, 'version', 1); break;
    case 'loan': ref(x.loanId, c.loans ?? [], 'loan'); requireThat(['borrowed','returned'].includes(x.status as string), '貸借の効果が不正です'); break;
    default: throw new Error(`未知の効果: ${String(x.op)}`);
  }
}
export function effectResources(e: ActionEffect): string[] {
  switch (e.op) {
    case 'move': return [`actor:${e.actorId}`];
    case 'transfer': return [`object:${e.objectId}`, ...[e.from, e.to].filter(x => x.kind === 'actor').map(x => `actor:${(x as { id: string }).id}`)];
    case 'consume': return [`object:${e.objectId}`];
    case 'fact': return [`fact:${e.propositionId}`];
    case 'service': return [`service:${e.serviceId}`];
    case 'emit': return [];
    case 'observe': case 'inform': case 'offer': case 'accept': return [];
    case 'loan': return [`loan:${e.loanId}`];
  }
}
export function actionResources(a: ActionDefinition): string[] {
  return [...new Set([...(a.concurrent ? [] : a.actorIds.map(id => `actor:${id}`)), ...a.resources,
    ...[...a.onSuccess, ...a.onAbort, ...(a.recovery?.onSuccess ?? [])].flatMap(effectResources)])].sort();
}
export function recoveryResources(a: ActionDefinition): string[] {
  return [...new Set([...a.actorIds.map(id => `actor:${id}`), ...(a.recovery?.retainResources ?? []), ...(a.recovery?.onSuccess.flatMap(effectResources) ?? [])])].sort();
}
export function allResources(c: Content): string[] {
  return [...c.resources, ...c.actors.flatMap(a => [`actor:${a.id}`, `hand:${a.id}:left`, `hand:${a.id}:right`]),
    ...c.objects.map(o => `object:${o.id}`), ...c.propositions.map(p => `fact:${p.id}`), ...c.services.map(id => `service:${id}`), ...(c.loans ?? []).map(l => `loan:${l.id}`)];
}
export function validateContent(input: unknown): asserts input is Content {
  record(input, 'content'); const c = input as unknown as Content;
  requireThat(c.namespace === 'redesign-v1' && c.tickMs === 100, '名前空間または固定時計が不正です');
  str(c.version, 'content.version'); int(c.ticksPerDay, 'ticksPerDay', 1);
  for (const key of ['places', 'propositions', 'actors', 'objects', 'clues', 'agreements', 'actions'] as const) {
    array(c[key], key); c[key].forEach(x => { record(x, key); str(x.id, `${key}.id`); }); unique(c[key].map(x => x.id), key);
  }
  strings(c.resources, 'resources'); strings(c.services, 'services'); unique(allResources(c), 'resources');
  requireThat(c.actors.filter(a => a.kind === 'player' && a.id === 'player').length === 1, 'playerが一人必要です');
  for (const p of c.places) {
    str(p.name, 'place.name'); requireThat(Number.isFinite(p.x) && Number.isFinite(p.y), '二次元座標が不正です');
    strings(p.links, 'place.links'); p.links.forEach(id => { ref(id, c.places, 'place.link'); requireThat(c.places.find(q => q.id === id)!.links.includes(p.id), '場所の接続は双方向にしてください'); });
  }
  c.propositions.forEach(p => {
    str(p.description, 'proposition.description'); val(p.initialValue, 'proposition.initialValue');
    if (p.derived) {
      guard(p.derived, c);
      const independent = (g: Content['actions'][number]['startGuard']): boolean => {
        if (g.op === 'all' || g.op === 'any') return g.conditions.every(independent);
        if (g.op === 'not') return independent(g.condition);
        return g.op !== 'fact' || !c.propositions.find(p => p.id === g.propositionId)!.derived;
      };
      requireThat(independent(p.derived), '導出命題同士の連鎖・循環は未対応です');
    }
  });
  for (const a of c.actors) {
    str(a.displayName, 'actor.name'); ref(a.locationId, c.places, 'actor.place'); str(a.sourceRef, 'sourceRef'); str(a.normalLife, 'normalLife'); str(a.goal, 'goal');
    requireThat(['player', 'resident', 'fixture', 'animal'].includes(a.kind), '人物種別が不正です');
    if (a.kind === 'resident') requireThat(/^C(00[1-9]|0[1-9]\d|100)$/.test(a.id), '住民IDが不正です');
    array(a.initialBeliefs, 'initialBeliefs'); a.initialBeliefs.forEach(b => { record(b, 'belief'); ref(b.propositionId, c.propositions, 'belief'); stance(b.stance); str(b.reason, 'memory.reason'); });
    array(a.rules, 'rules'); unique(a.rules.map(r => r.id), 'rules');
    a.rules.forEach(r => { str(r.id, 'rule.id'); int(r.priority, 'priority'); int(r.retryTicks, 'retryTicks', 1); requireThat(r.mode === undefined || ['problem','ordinary','always'].includes(r.mode), '規則の生活モードが不正です'); ref(r.actionId, c.actions, 'rule.action'); requireThat(c.actions.find(x => x.id === r.actionId)!.actorIds.includes(a.id), '他人だけの行為を規則で選択できません'); guard(r.choiceGuard, c, true); });
    strings(a.goalEvidence, 'goalEvidence'); requireThat(a.goalEvidence.every(t => !t.startsWith('engine.')), '内部イベントを生活の達成に使えません');
    if (a.completionObservation) guard(a.completionObservation,c);
    record(a.postGoalContract, 'postGoalContract'); int(a.postGoalContract.version, 'postGoalContract.version', 1); strings(a.postGoalContract.serviceIds, 'postGoalContract.serviceIds'); a.postGoalContract.serviceIds.forEach(id => requireThat(c.services.includes(id), '未定義の達成後サービス'));
  }
  for (const o of c.objects) { str(o.name, 'object.name'); ref(o.ownerId, c.actors, 'object.owner'); custody(o.custody, c); int(o.quantity, 'quantity'); str(o.unit, 'unit'); bool(o.portable, 'portable'); bool(o.consumable, 'consumable'); }
  for (const a of c.agreements) { int(a.version, 'agreement.version', 1); ref(a.proposerId, c.actors, 'proposer'); strings(a.participantIds, 'participants'); unique(a.participantIds, 'participants'); a.participantIds.forEach(id => ref(id, c.actors, 'participant')); requireThat(a.participantIds.includes(a.proposerId), '提案者は参加者である必要があります'); str(a.terms, 'terms'); }
  for (const clue of c.clues) { ref(clue.locationId, c.places, 'clue.place'); ref(clue.propositionId, c.propositions, 'clue.proposition'); str(clue.description, 'clue.description'); guard(clue.visible, c); if (clue.observerIds) clue.observerIds.forEach(id => ref(id, c.actors, 'clue.observer')); }
  if (c.loans) { array(c.loans, 'loans'); unique(c.loans.map(l => l.id), 'loans'); for (const l of c.loans) { ref(l.objectId, c.objects, 'loan.object'); ref(l.lenderId, c.actors, 'loan.lender'); ref(l.borrowerId, c.actors, 'loan.borrower'); ref(l.returnLocationId, c.places, 'loan.return'); str(l.policy, 'loan.policy'); requireThat(c.objects.find(o => o.id === l.objectId)!.ownerId === l.lenderId, '貸主と所有者が一致しません'); } }
  for (const a of c.actions) {
    str(a.label, 'action.label'); strings(a.actorIds, 'action.actors'); requireThat(a.actorIds.length > 0, '実行者が必要です'); unique(a.actorIds, 'action.actors'); a.actorIds.forEach(id => ref(id, c.actors, 'action.actor'));
    int(a.durationTicks, 'durationTicks', 1); strings(a.resources, 'action.resources'); a.resources.forEach(r => requireThat(allResources(c).includes(r), `未定義の資源 ${r}`));
    [a.startGuard, a.maintainGuard, a.finishGuard].forEach(g => guard(g, c));
    for (const effects of [a.onSuccess, a.onAbort]) { array(effects, 'effects'); effects.forEach(e => effect(e, c)); }
    // Conversation may hold someone's presence while leaving their hands/work available.
    // Movement holds the same resource, so an NPC cannot walk away mid-utterance.
    if (a.concurrent) requireThat(!a.movement && !a.recovery && a.resources.every(r => c.actors.some(actor => r === `presence:${actor.id}`)) && [...a.onSuccess,...a.onAbort].every(e => !['move','transfer','consume','loan'].includes(e.op)), '同時会話で物理作業を行えません');
    requireThat(a.designStatus === 'provisional', '試作値の出典を指定してください'); str(a.rationale, 'rationale'); str(a.presentationId, 'presentationId');
    if (a.recovery !== null) { record(a.recovery, 'recovery'); int(a.recovery.durationTicks, 'recovery.durationTicks', 1); strings(a.recovery.retainResources, 'retainResources'); array(a.recovery.onSuccess, 'recovery.effects'); a.recovery.onSuccess.forEach(e => effect(e, c)); a.recovery.retainResources.forEach(r => requireThat(actionResources(a).includes(r), '未確保の資源を復旧時に保持できません')); }
    if (a.movement !== null) { record(a.movement, 'movement'); ref(a.movement.actorId, c.actors, 'movement.actor'); requireThat(a.actorIds.includes(a.movement.actorId), '移動者が実行者に含まれていません'); ref(a.movement.from, c.places, 'movement.from'); ref(a.movement.to, c.places, 'movement.to'); requireThat(c.places.find(p => p.id === a.movement!.from)!.links.includes(a.movement.to), '移動経路が接続されていません'); requireThat(a.onSuccess.some(e => e.op === 'move' && e.actorId === a.movement!.actorId && e.to === a.movement!.to), '移動終了効果が必要です'); }
  }
}
export function validateCommand(x: unknown, c: Content): asserts x is Command {
  record(x, 'command'); ref(x.actorId, c.actors, 'command.actor');
  switch (x.kind) {
    case 'start': ref(x.actionId, c.actions, 'command.action'); break;
    case 'cancel': int(x.instanceId, 'instanceId', 1); break;
    case 'inspect': ref(x.clueId, c.clues, 'command.clue'); break;
    case 'say': ref(x.recipientId, c.actors, 'recipient'); ref(x.propositionId, c.propositions, 'proposition'); break;
    case 'askCompletion': case 'observeCompletion': ref(x.recipientId, c.actors, 'recipient'); break;
    case 'offer': ref(x.recipientId, c.actors, 'recipient'); ref(x.agreementId, c.agreements, 'agreement'); break;
    case 'accept': ref(x.agreementId, c.agreements, 'agreement'); int(x.version, 'version', 1); break;
    default: throw new Error(`未知のコマンド: ${String(x.kind)}`);
  }
}
export function validateState(input: unknown, c: Content): asserts input is WorldState {
  record(input, 'state'); const s = input as unknown as WorldState;
  sameKeys(input, ['tick','randomState','nextEventId','nextActionId','nextCommandId','actors','objects','facts','services','actions','reservations','deliveries','events','completions','knownCompletions','commandLog','pending','loans'], 'state');
  for (const k of ['tick','randomState','nextEventId','nextActionId','nextCommandId'] as const) int(s[k], k, k.startsWith('next') ? 1 : 0);
  for (const k of ['actors','objects','facts','services','reservations','completions','knownCompletions','loans'] as const) record(s[k], k);
  for (const k of ['actions','deliveries','events','commandLog','pending'] as const) array(s[k], k);
  sameKeys(s.actors, c.actors.map(a => a.id), 'actors'); sameKeys(s.objects, c.objects.map(o => o.id), 'objects'); sameKeys(s.facts, c.propositions.map(p => p.id), 'facts'); sameKeys(s.services, c.services, 'services');
  Object.values(s.facts).forEach(v => val(v, 'fact')); Object.values(s.services).forEach(v => bool(v, 'service'));
  sameKeys(s.loans, (c.loans ?? []).map(l => l.id), 'loans');
  for (const [id, l] of Object.entries(s.loans)) { record(l, 'loan'); requireThat(['available','borrowed','returned'].includes(l.status), '貸借状態が不正です'); if (l.borrowedAt !== null) { int(l.borrowedAt, 'borrowedAt'); requireThat(l.borrowedAt <= s.tick, '未来の貸借'); } if (l.returnedAt !== null) { int(l.returnedAt, 'returnedAt'); requireThat(l.borrowedAt !== null && l.returnedAt >= l.borrowedAt && l.returnedAt <= s.tick, '返却時刻が不正です'); } requireThat((l.status === 'available') === (l.borrowedAt === null) && (l.status === 'returned') === (l.returnedAt !== null), '貸借記録が一致しません'); const d = c.loans!.find(x => x.id === id)!; if (l.status === 'returned') requireThat(sameCustody(s.objects[d.objectId]!.custody, {kind:'place',id:d.returnLocationId}) || sameCustody(s.objects[d.objectId]!.custody, {kind:'actor',id:d.lenderId}), '返却先が一致しません'); }
  let previousId = 0; let previousTick = 0;
  for (const e of s.events) {
    record(e, 'event'); int(e.id, 'event.id', previousId + 1); int(e.tick, 'event.tick', previousTick); requireThat(e.tick <= s.tick, '未来のイベント'); previousId = e.id; previousTick = e.tick;
    str(e.type, 'event.type'); strings(e.actorIds, 'event.actors'); e.actorIds.forEach(id => ref(id, c.actors, 'event.actor')); strings(e.subjectIds, 'event.subjects'); ref(e.locationId, c.places, 'event.place'); record(e.payload, 'payload'); Object.values(e.payload).forEach(v => val(v, 'payload'));
    array(e.causalEventIds, 'event.causes'); e.causalEventIds.forEach(id => requireThat(s.events.some(p => p.id === id && p.id < e.id), '因果元の出来事がありません'));
  }
  requireThat(s.nextEventId > previousId, '次のイベント番号が重複します');
  const startedInstances = s.events.filter(e => e.type === 'engine.action.started');
  const startIds = startedInstances.map(e => { int(e.payload.instanceId, 'started.instanceId', 1); return e.payload.instanceId; });
  requireThat(new Set(startIds).size === startIds.length, '開始した行為番号が重複しています');
  requireThat(s.nextActionId === Math.max(0, ...startIds) + 1, '次の行為番号が履歴と一致しません');
  for (const [id, a] of Object.entries(s.actors)) {
    record(a, 'actor'); ref(a.locationId, c.places, 'actor.place'); requireThat(['problem','ordinary'].includes(a.routineMode), '生活状態が不正です');
    for (const k of ['beliefs','accepted','offered','retryAt'] as const) record(a[k], `actor.${k}`);
    for (const [pid, b] of Object.entries(a.beliefs)) {
      record(b, 'belief'); ref(pid, c.propositions, 'belief.proposition'); requireThat(b.propositionId === pid, '認識IDが一致しません'); stance(b.stance); int(b.acquiredAt, 'acquiredAt'); requireThat(b.acquiredAt <= s.tick, '未来の認識');
      requireThat(['memory','observation','testimony','inference'].includes(b.sourceKind), '認識の出典が不正です'); str(b.sourceId, 'belief.source'); str(b.revisionReason, 'revisionReason'); array(b.evidenceEventIds, 'evidence');
      b.evidenceEventIds.forEach(eid => requireThat(s.events.some(e => e.id === eid && e.tick <= b.acquiredAt), '認識の証拠イベントがありません'));
      if (b.sourceKind !== 'memory') {
        const evidence = b.evidenceEventIds.map(eid => s.events.find(e => e.id === eid)!);
        const source = evidence.find(e => b.sourceKind === 'observation'
          ? e.type === 'engine.observed' && e.actorIds.includes(id) && e.payload.clueId === b.sourceId && e.payload.propositionId === pid && (e.payload.value ? 'believe' : 'deny') === b.stance
          : e.type === 'engine.spoken' && e.actorIds.includes(b.sourceId) && e.payload.recipientId === id && e.payload.propositionId === pid && e.payload.stance === b.stance);
        requireThat(source && evidence.some(e => e.type === 'engine.information.received' && e.actorIds.includes(id) && e.tick === b.acquiredAt && e.payload.sourceEventId === source.id), '認識の取得経路がありません');
        requireThat(b.sourceKind !== 'inference', '推論による認識生成はまだ未対応です');
      } else requireThat(b.sourceId === id && b.acquiredAt === 0 && c.actors.find(x => x.id === id)!.initialBeliefs.some(x => x.propositionId === pid && x.stance === b.stance), '初期記憶が定義と一致しません');
    }
    for (const k of ['accepted','offered'] as const) for (const [aid, version] of Object.entries(a[k])) { ref(aid, c.agreements, k); int(version, 'agreement.version', 1); requireThat(version <= c.agreements.find(x => x.id === aid)!.version, '未知の約束版'); }
    for (const [aid, version] of Object.entries(a.accepted)) requireThat(a.offered[aid] === version, '知らない約束を受諾しています');
    for (const [aid, version] of Object.entries(a.accepted)) requireThat(s.events.some(e => e.type === 'engine.agreement.accepted' && e.actorIds.includes(id) && e.payload.agreementId === aid && e.payload.version === version), '受諾の出来事がありません');
    for (const [aid, version] of Object.entries(a.offered)) requireThat(s.events.some(e => e.type === 'engine.information.received' && e.actorIds.includes(id) && s.events.some(source => source.id === e.payload.sourceEventId && source.type === 'engine.agreement.offered' && source.payload.agreementId === aid && source.payload.version === version)), '提案を受け取った出来事がありません');
    for (const [rid, retry] of Object.entries(a.retryAt)) { requireThat(c.actors.find(x => x.id === id)!.rules.some(r => r.id === rid), '未知の再試行規則'); int(retry, 'retryAt'); }
  }
  for (const [id, o] of Object.entries(s.objects)) {
    record(o, 'object'); requireThat(o.ownerId === c.objects.find(x => x.id === id)!.ownerId, '所有者が不正です'); custody(o.custody, c); int(o.quantity, 'object.quantity');
    requireThat((o.quantity === 0) === (o.custody.kind === 'consumed'), '数量と消費状態が一致しません');
    const seen = new Set([id]); let at = o.custody;
    while (at.kind === 'object') { requireThat(!seen.has(at.id), '物の収納先が循環しています'); seen.add(at.id); const parent = s.objects[at.id]; requireThat(parent && parent.custody.kind !== 'consumed', '収納先が消費済みです'); at = parent.custody; }
  }
  const locked: Record<string, number> = {}; const instanceIds = new Set<number>();
  for (const a of s.actions) {
    record(a, 'action'); int(a.id, 'instance.id', 1); requireThat(!instanceIds.has(a.id) && a.id < s.nextActionId, '行為の採番が不正です'); instanceIds.add(a.id); ref(a.definitionId, c.actions, 'action.definition');
    const d = c.actions.find(x => x.id === a.definitionId)!;
    requireThat(a.phase === 'running' || (a.phase === 'recovering' && d.recovery), '行為の段階が不正です'); int(a.startedAt, 'startedAt'); requireThat(a.startedAt <= s.tick, '未来の行為'); int(a.elapsedTicks, 'elapsedTicks'); requireThat(a.elapsedTicks < (a.phase === 'running' ? d.durationTicks : d.recovery!.durationTicks), '終了済み行為が残っています');
    strings(a.resources, 'action.resources'); unique(a.resources, 'action.resources'); requireThat([...a.resources].sort().join('|') === (a.phase === 'running' ? actionResources(d) : recoveryResources(d)).join('|'), '予約が行為定義と一致しません');
    requireThat(s.events.some(e => e.id === a.startEventId && e.tick === a.startedAt && e.type === 'engine.action.started' && e.payload.instanceId === a.id && e.payload.actionId === a.definitionId), '行為開始の証拠がありません');
    strings(a.appliedEffectIds, 'appliedEffectIds'); requireThat(a.abortReason === null || typeof a.abortReason === 'string', '中断理由が不正です');
    if (a.phase === 'running') requireThat(a.abortReason === null && a.appliedEffectIds.length === 0 && a.elapsedTicks === s.tick - a.startedAt, '実行中行為の進行が不正です');
    else requireThat(typeof a.abortReason === 'string' && JSON.stringify(a.appliedEffectIds) === JSON.stringify(d.onAbort.map((_, i) => `${a.id}:running:abort:${i}`)) && s.events.some(e => e.type === 'engine.action.aborted' && e.payload.instanceId === a.id && Math.min(s.tick - e.tick, d.recovery!.durationTicks - 1) === a.elapsedTicks), '復旧の進行または適用済み効果が不正です');
    for (const r of a.resources) { requireThat(locked[r] === undefined, `資源の二重予約: ${r}`); locked[r] = a.id; }
  }
  requireThat(JSON.stringify(Object.entries(locked).sort()) === JSON.stringify(Object.entries(s.reservations).sort()), '予約台帳が実行中行為と一致しません');
  for (const [id, completion] of Object.entries(s.completions)) {
    ref(id, c.actors, 'completion.actor'); record(completion, 'completion'); const actor = c.actors.find(a => a.id === id)!;
    const e = s.events.find(e => e.id === completion.eventId); requireThat(e?.type === 'engine.goal.completed' && e.actorIds.includes(id) && e.tick === completion.achievedAt, '達成の出来事がありません');
    requireThat(completion.goalVersion === 1 && completion.postGoalContractVersion === actor.postGoalContract.version, '達成の版が不正です'); array(completion.evidenceEventIds, 'completion.evidence'); requireThat(completion.evidenceEventIds.length > 0, '生活実行の証拠がありません');
    completion.evidenceEventIds.forEach(eid => requireThat(s.events.some(e => e.id === eid && e.actorIds.includes(id) && actor.goalEvidence.includes(e.type) && e.tick <= completion.achievedAt), '生活実行の証拠が不正です'));
    requireThat(s.actors[id]!.routineMode === 'ordinary', '達成後の通常生活へ移行していません');
  }
  for (const [id, eid] of Object.entries(s.knownCompletions)) requireThat(s.completions[id]?.eventId === eid && s.events.some(e => e.type === 'engine.information.received' && e.actorIds.includes('player') && e.payload.sourceEventId === eid), '主人公の達成確認に取得経路がありません');
  for (const d of s.deliveries) {
    record(d, 'delivery'); int(d.dueAt, 'delivery.dueAt', s.tick + 1); ref(d.recipientId, c.actors, 'delivery.recipient'); requireThat(s.events.some(e => e.id === d.eventId), '配送元イベントがありません'); str(d.sourceId, 'delivery.source');
    switch (d.kind) {
      case 'observation': case 'testimony': ref(d.propositionId, c.propositions, 'delivery.proposition'); stance(d.stance); break;
      case 'agreement': ref(d.agreementId, c.agreements, 'delivery.agreement'); int(d.version, 'delivery.version', 1); requireThat(d.version === c.agreements.find(a => a.id === d.agreementId)!.version, '配送する約束の版が不正です'); break;
      case 'completion': requireThat(s.completions[d.completionActorId ?? '']?.eventId === d.eventId, '達成通知が不正です'); break;
      default: throw new Error('配送種別が不正です');
    }
  }
  let lastCommand = 0; let lastCommandTick = 0;
  for (const entry of s.commandLog) { record(entry, 'commandLog'); int(entry.id, 'command.id', lastCommand + 1); int(entry.tick, 'command.tick', lastCommandTick); requireThat(entry.tick <= s.tick + 1, '未来のコマンド'); validateCommand(entry.command, c); lastCommand = entry.id; lastCommandTick = entry.tick; }
  requireThat(s.nextCommandId > lastCommand, 'コマンド番号が重複します');
  const pendingIds = new Set<number>();
  for (const entry of s.pending) { record(entry, 'pending'); requireThat(!pendingIds.has(entry.id), '保留コマンドが重複しています'); pendingIds.add(entry.id); requireThat(entry.tick === s.tick + 1 && JSON.stringify(s.commandLog.find(x => x.id === entry.id)) === JSON.stringify(entry), '保留コマンドが履歴と一致しません'); }
}
export function validateSave(input: unknown, c: Content): asserts input is SaveFile {
  record(input, 'save'); sameKeys(input, ['schemaVersion','contentVersion','designNamespace','state'], 'save');
  requireThat(input.schemaVersion === 2, '未対応のセーブ形式です。現在の状態は変更していません');
  requireThat(input.contentVersion === c.version && input.designNamespace === c.namespace, '別のコンテンツ版・人物体系のセーブは読み込めません');
  validateState(input.state, c);
}
