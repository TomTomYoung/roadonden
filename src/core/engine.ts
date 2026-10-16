import type { ActionDefinition, ActionEffect, ActionInstance, Command, Content, Custody, Delivery, EventRecord, SaveFile, Value, WorldState } from './types.ts';
import { check, choose } from './conditions.ts';
import { actionResources, recoveryResources, requireThat, sameCustody, validateCommand, validateContent, validateSave, validateState } from './validation.ts';

const clone = <T>(x: T): T => structuredClone(x);
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
interface Proposal { actionId: string; actorId: string; order: number; ruleId: string | null; retryTicks: number }
export class Simulation {
  readonly content: Content;
  private state: WorldState;
  constructor(input: Content, seed = 1) {
    validateContent(input); this.content = freeze(clone(input));
    requireThat(Number.isSafeInteger(seed) && seed >= 0, '乱数シードが不正です');
    this.state = {
      tick: 0, randomState: seed, nextEventId: 1, nextActionId: 1, nextCommandId: 1,
      actors: Object.fromEntries(input.actors.map(a => [a.id, {
        locationId: a.locationId, beliefs: Object.fromEntries(a.initialBeliefs.map(b => [b.propositionId, {
          propositionId: b.propositionId, stance: b.stance, sourceKind: 'memory', sourceId: a.id,
          evidenceEventIds: [], acquiredAt: 0, revisionReason: b.reason,
        }])), accepted: {}, offered: {}, retryAt: {}, routineMode: 'problem',
      }])),
      objects: Object.fromEntries(input.objects.map(o => [o.id, { ownerId: o.ownerId, custody: clone(o.custody), quantity: o.quantity }])),
      facts: Object.fromEntries(input.propositions.map(p => [p.id, p.initialValue])),
      services: Object.fromEntries(input.services.map(id => [id, false])), actions: [], reservations: {},
      deliveries: [], events: [], completions: {}, knownCompletions: {}, commandLog: [], pending: [],
      loans: Object.fromEntries((input.loans ?? []).map(l => [l.id, { status: l.initiallyBorrowed ? 'borrowed' : 'available', borrowedAt: l.initiallyBorrowed ? 0 : null, returnedAt: null }])),
    };
    this.refreshDerived(); validateState(this.state, this.content);
  }
  snapshot(): WorldState { return clone(this.state); }
  save(): SaveFile { return { schemaVersion: 2, contentVersion: this.content.version, designNamespace: this.content.namespace, state: this.snapshot() }; }
  load(input: unknown): void {
    const candidate = clone(input);
    if (candidate && typeof candidate === 'object' && 'schemaVersion' in candidate && candidate.schemaVersion === 1 && 'contentVersion' in candidate && candidate.contentVersion === 'foundation-0.1.0' && 'state' in candidate && candidate.state && typeof candidate.state === 'object' && !('loans' in candidate.state)) {
      candidate.schemaVersion = 2; Object.assign(candidate.state, { loans: {} });
    }
    validateSave(candidate, this.content); this.state = clone(candidate.state);
  }
  enqueue(command: Command): number {
    validateCommand(command, this.content);
    const entry = { id: this.state.nextCommandId++, tick: this.state.tick + 1, command: clone(command) };
    this.state.commandLog.push(entry); this.state.pending.push(entry); return entry.id;
  }
  step(count = 1): void {
    requireThat(Number.isSafeInteger(count) && count >= 0, '更新回数は非負整数にしてください');
    for (let i = 0; i < count; i++) this.update();
  }
  private definition(id: string): ActionDefinition { return this.content.actions.find(a => a.id === id)!; }
  private event(type: string, actorIds: string[], locationId: string, payload: Record<string, Value> = {}, causalEventIds: number[] = [], subjectIds: string[] = []): EventRecord {
    const e = { id: this.state.nextEventId++, tick: this.state.tick, type, actorIds: [...actorIds], subjectIds: [...subjectIds], locationId, payload, causalEventIds: [...causalEventIds] };
    this.state.events.push(e); return e;
  }
  private moving(actorId: string, s = this.state): boolean {
    return s.actions.some(a => a.phase === 'running' && this.definition(a.definitionId).movement?.actorId === actorId);
  }
  private together(a: string, b: string): boolean { return !this.moving(a) && !this.moving(b) && this.state.actors[a]!.locationId === this.state.actors[b]!.locationId; }
  private queue(eventId: number, recipientId: string, fields: Partial<Delivery>): void {
    this.state.deliveries.push({ dueAt: this.state.tick + 1, recipientId, eventId, kind: 'observation',
      sourceId: recipientId, propositionId: null, stance: null, agreementId: null, version: null, completionActorId: null, ...fields });
  }
  private deliver(): void {
    const due = this.state.deliveries.filter(d => d.dueAt <= this.state.tick);
    this.state.deliveries = this.state.deliveries.filter(d => d.dueAt > this.state.tick);
    for (const d of due) {
      const actor = this.state.actors[d.recipientId]!;
      const receipt = this.event('engine.information.received', [d.recipientId], actor.locationId,
        { sourceEventId: d.eventId, channel: d.kind, sourceId: d.sourceId }, [d.eventId]);
      if (d.kind === 'observation' || d.kind === 'testimony') {
        actor.beliefs[d.propositionId!] = { propositionId: d.propositionId!, stance: d.stance!,
          sourceKind: d.kind, sourceId: d.sourceId, evidenceEventIds: [d.eventId, receipt.id], acquiredAt: this.state.tick,
          revisionReason: d.kind === 'observation' ? 'その場で確かめた' : '発言を聞いた（同意とは別）' };
      } else if (d.kind === 'agreement') actor.offered[d.agreementId!] = d.version!;
      else if (d.kind === 'completion' && d.recipientId === 'player') this.state.knownCompletions[d.completionActorId!] = d.eventId;
    }
  }
  private perceive(): void {
    for (const clue of this.content.clues.filter(x => x.automatic)) {
      if (!check(clue.visible, this.state)) continue;
      const value = this.state.facts[clue.propositionId]; if (typeof value !== 'boolean') continue;
      const stance = value ? 'believe' : 'deny';
      for (const id of clue.observerIds ?? this.content.actors.map(a => a.id)) {
        const actor = this.state.actors[id]!;
        if (actor.locationId !== clue.locationId || this.moving(id) || actor.beliefs[clue.propositionId]?.stance === stance || this.state.deliveries.some(d => d.recipientId === id && d.propositionId === clue.propositionId && d.stance === stance)) continue;
        const e = this.event('engine.observed', [id], actor.locationId, { clueId: clue.id, propositionId: clue.propositionId, value });
        this.queue(e.id, id, { propositionId: clue.propositionId, stance, sourceId: clue.id });
      }
    }
  }
  private refreshDerived(): void {
    for (const p of this.content.propositions) if (p.derived) this.state.facts[p.id] = check(p.derived, this.state);
  }
  private process(command: Command, order: number, proposals: Proposal[], cancellations: Set<number>): void {
    const c = command; const a = this.state.actors[c.actorId]!;
    if (c.kind === 'start') {
      requireThat(this.definition(c.actionId).actorIds.includes(c.actorId), 'その行為の実行者ではありません');
      proposals.push({ actionId: c.actionId, actorId: c.actorId, order, ruleId: null, retryTicks: 1 }); return;
    }
    if (c.kind === 'cancel') {
      const action = this.state.actions.find(x => x.id === c.instanceId);
      requireThat(action && this.definition(action.definitionId).actorIds.includes(c.actorId), '自分の実行中行為だけ中断できます');
      requireThat(action.phase === 'running', '安全な復旧が終わるまで待ってください'); cancellations.add(action.id); return;
    }
    requireThat(!this.moving(c.actorId), '移動中です。到着してから操作してください');
    if (c.kind === 'inspect') {
      const clue = this.content.clues.find(x => x.id === c.clueId)!;
      requireThat(a.locationId === clue.locationId && check(clue.visible, this.state), 'ここからは確かめられません');
      const observed = this.state.facts[clue.propositionId]!;
      requireThat(typeof observed === 'boolean', 'この検査の命題は真偽値である必要があります');
      const e = this.event('engine.observed', [c.actorId], a.locationId, { clueId: clue.id, propositionId: clue.propositionId, value: observed });
      this.queue(e.id, c.actorId, { propositionId: clue.propositionId, stance: observed ? 'believe' : 'deny', sourceId: clue.id });
    } else if (c.kind === 'say') {
      requireThat(this.together(c.actorId, c.recipientId), '相手に届く場所で話してください');
      const belief = a.beliefs[c.propositionId]; requireThat(belief, 'まだ取得していない情報です');
      const e = this.event('engine.spoken', [c.actorId], a.locationId, { recipientId: c.recipientId, propositionId: c.propositionId, stance: belief.stance }, belief.evidenceEventIds);
      this.queue(e.id, c.recipientId, { kind: 'testimony', propositionId: c.propositionId, stance: belief.stance, sourceId: c.actorId });
    } else if (c.kind === 'askCompletion') {
      requireThat(this.together(c.actorId, c.recipientId), '相手に届く場所で尋ねてください');
      const completion = this.state.completions[c.recipientId]; requireThat(completion, '相手はまだ生活の目的を終えていません');
      this.event('engine.completion.reported', [c.recipientId], a.locationId, { recipientId: c.actorId }, [completion.eventId]);
      this.queue(completion.eventId, c.actorId, { kind: 'completion', completionActorId: c.recipientId, sourceId: c.recipientId });
    } else if (c.kind === 'offer') {
      const agreement = this.content.agreements.find(x => x.id === c.agreementId)!;
      requireThat(agreement.proposerId === c.actorId && agreement.participantIds.includes(c.recipientId), 'この約束を提案できる相手ではありません');
      requireThat(this.together(c.actorId, c.recipientId), '相手に届く場所で提案してください');
      const e = this.event('engine.agreement.offered', [c.actorId], a.locationId, { agreementId: agreement.id, version: agreement.version, recipientId: c.recipientId });
      for (const recipientId of new Set([c.actorId, c.recipientId])) this.queue(e.id, recipientId, { kind: 'agreement', agreementId: agreement.id, version: agreement.version, sourceId: c.actorId });
    } else if (c.kind === 'accept') {
      const agreement = this.content.agreements.find(x => x.id === c.agreementId)!;
      requireThat(agreement.participantIds.includes(c.actorId) && a.offered[c.agreementId] === c.version && agreement.version === c.version, 'その版の提案を受け取っていません');
      a.accepted[c.agreementId] = c.version;
      this.event('engine.agreement.accepted', [c.actorId], a.locationId, { agreementId: c.agreementId, version: c.version });
    }
  }
  private release(a: ActionInstance, retain: string[] = []): void {
    for (const r of a.resources) if (!retain.includes(r)) delete this.state.reservations[r];
    a.resources = retain;
  }
  private custodyPlace(custody: Custody, s: WorldState): string | null {
    const seen = new Set<string>(); let at = custody;
    while (at.kind === 'object') { requireThat(!seen.has(at.id), '容器の循環です'); seen.add(at.id); at = s.objects[at.id]!.custody; }
    if (at.kind === 'actor') return s.actors[at.id]!.locationId;
    return at.kind === 'place' ? at.id : null;
  }
  /** Mutate a private candidate only. A failed effect cannot leak a partial transfer or consumption. */
  private physical(s: WorldState, effects: ActionEffect[]): void {
    for (const e of effects) {
      switch (e.op) {
        case 'move': s.actors[e.actorId]!.locationId = e.to; break;
        case 'fact': s.facts[e.propositionId] = e.value; break;
        case 'service': s.services[e.serviceId] = e.active; break;
        case 'emit': break;
        case 'observe': requireThat(e.actorIds.every(id => s.actors[id]!.locationId === e.locationId) && typeof s.facts[e.propositionId] === 'boolean', '観測者がその場にいません'); break;
        case 'inform': requireThat(s.actors[e.speakerId]!.locationId === s.actors[e.recipientId]!.locationId && !this.moving(e.speakerId, s) && !this.moving(e.recipientId, s) && s.actors[e.speakerId]!.beliefs[e.propositionId], '伝える情報を知らないか、相手に届きません'); break;
        case 'offer': {
          const agreement = this.content.agreements.find(a => a.id === e.agreementId)!;
          requireThat(agreement.proposerId === e.speakerId && agreement.participantIds.includes(e.recipientId) && s.actors[e.speakerId]!.locationId === s.actors[e.recipientId]!.locationId && !this.moving(e.speakerId,s) && !this.moving(e.recipientId,s), '提案が相手に届きません'); break;
        }
        case 'accept': {
          const agreement = this.content.agreements.find(a => a.id === e.agreementId)!;
          requireThat(agreement.participantIds.includes(e.actorId) && s.actors[e.actorId]!.offered[e.agreementId] === e.version && agreement.version === e.version, 'この版の提案を受け取っていません');
          s.actors[e.actorId]!.accepted[e.agreementId] = e.version; break;
        }
        case 'loan': {
          const d = this.content.loans!.find(l => l.id === e.loanId)!; const l = s.loans[e.loanId]!;
          if (e.status === 'borrowed') { requireThat(l.status !== 'borrowed', '既に借用されています'); l.borrowedAt = s.tick; l.returnedAt = null; }
          else { requireThat(l.status === 'borrowed' && (sameCustody(s.objects[d.objectId]!.custody, {kind:'place',id:d.returnLocationId}) || sameCustody(s.objects[d.objectId]!.custody, {kind:'actor',id:d.lenderId})), '合意した返却先に現物がありません'); l.returnedAt = s.tick; }
          l.status = e.status; break;
        }
        case 'consume': {
          const o = s.objects[e.objectId]!;
          requireThat(o.quantity >= e.quantity, '必要な数量が足りません');
          requireThat(!Object.values(s.objects).some(child => child.custody.kind === 'object' && child.custody.id === e.objectId), '中身が入った容器は消費できません');
          o.quantity -= e.quantity; if (o.quantity === 0) o.custody = { kind: 'consumed' }; break;
        }
        case 'transfer': {
          const o = s.objects[e.objectId]!;
          requireThat(sameCustody(o.custody, e.from), '品物はもうその場所にありません');
          requireThat(this.content.objects.find(x => x.id === e.objectId)!.portable, '運べない物です');
          requireThat(o.quantity > 0 && this.custodyPlace(e.from, s) === this.custodyPlace(e.to, s), '受渡し相手と品物が同じ場所にいません');
          o.custody = clone(e.to); this.custodyPlace(o.custody, s); break;
        }
      }
    }
  }
  private apply(effects: ActionEffect[], a: ActionInstance): void {
    const candidate = clone(this.state); this.physical(candidate, effects);
    this.state.actors = candidate.actors; this.state.objects = candidate.objects; this.state.facts = candidate.facts; this.state.services = candidate.services; this.state.loans = candidate.loans;
    const definition = this.definition(a.definitionId);
    effects.forEach((e, index) => {
      const effectId = `${a.id}:${a.phase}:${a.abortReason ? 'abort' : 'success'}:${index}`;
      requireThat(!a.appliedEffectIds.includes(effectId), '効果の二重適用です'); a.appliedEffectIds.push(effectId);
      if (e.op === 'inform') {
        const belief = this.state.actors[e.speakerId]!.beliefs[e.propositionId]!;
        const spoken = this.event('engine.spoken', [e.speakerId], this.state.actors[e.speakerId]!.locationId, {recipientId:e.recipientId,propositionId:e.propositionId,stance:belief.stance}, [...belief.evidenceEventIds,a.startEventId]);
        this.queue(spoken.id,e.recipientId,{kind:'testimony',propositionId:e.propositionId,stance:belief.stance,sourceId:e.speakerId});
      } else if (e.op === 'observe') {
        for (const id of e.actorIds) { const value = this.state.facts[e.propositionId] as boolean; const observed = this.event('engine.observed',[id],e.locationId,{clueId:e.sourceId,propositionId:e.propositionId,value},[a.startEventId]); this.queue(observed.id,id,{propositionId:e.propositionId,stance:value?'believe':'deny',sourceId:e.sourceId}); }
      } else if (e.op === 'offer') {
        const agreement = this.content.agreements.find(x => x.id === e.agreementId)!;
        const offered = this.event('engine.agreement.offered',[e.speakerId],this.state.actors[e.speakerId]!.locationId,{agreementId:e.agreementId,version:agreement.version,recipientId:e.recipientId},[a.startEventId]);
        for (const id of new Set([e.speakerId,e.recipientId])) this.queue(offered.id,id,{kind:'agreement',agreementId:e.agreementId,version:agreement.version,sourceId:e.speakerId});
      } else if (e.op === 'accept') this.event('engine.agreement.accepted',[e.actorId],this.state.actors[e.actorId]!.locationId,{agreementId:e.agreementId,version:e.version},[a.startEventId]);
      else if (e.op === 'emit') this.event(e.type, e.actorIds, e.locationId, { instanceId: a.id }, [a.startEventId], e.subjectIds);
      else this.event(`engine.effect.${e.op}`, definition.actorIds, this.state.actors[definition.actorIds[0]!]!.locationId,
        { instanceId: a.id, effectId, detail: JSON.stringify(e) }, [a.startEventId]);
    });
  }
  private abort(a: ActionInstance, reason: string): void {
    const def = this.definition(a.definitionId); a.abortReason = reason;
    this.apply(def.onAbort, a);
    this.event('engine.action.aborted', def.actorIds, this.state.actors[def.actorIds[0]!]!.locationId, { instanceId: a.id, reason }, [a.startEventId]);
    if (def.recovery) { this.release(a, recoveryResources(def)); a.phase = 'recovering'; a.elapsedTicks = 0; }
    else { this.release(a); this.state.actions = this.state.actions.filter(x => x.id !== a.id); }
  }
  private advance(cancellations: Set<number>): void {
    const due: ActionInstance[] = [];
    for (const a of [...this.state.actions]) {
      const def = this.definition(a.definitionId);
      if (a.phase === 'running' && (cancellations.has(a.id) || !check(def.maintainGuard, this.state))) {
        this.abort(a, cancellations.has(a.id) ? '本人からの中断' : '持続条件が失われた'); continue;
      }
      a.elapsedTicks++;
      if (a.elapsedTicks < (a.phase === 'running' ? def.durationTicks : def.recovery!.durationTicks)) continue;
      if (a.phase === 'running' && !check(def.finishGuard, this.state)) this.abort(a, '終了条件が成立していない');
      else due.push(a);
    }
    // Check the interval against other transactions at this boundary, not just array order.
    let remaining = due.filter(a => this.state.actions.includes(a));
    while (remaining.length > 0) {
      let removed = false;
      for (const a of [...this.state.actions]) {
        const projected = clone(this.state);
        try {
          for (const other of remaining) if (other.id !== a.id) {
            const d = this.definition(other.definitionId); this.physical(projected, other.phase === 'running' ? d.onSuccess : d.recovery!.onSuccess);
          }
          if (a.phase === 'running' && !check(this.definition(a.definitionId).maintainGuard, projected)) {
            this.abort(a, '同じ更新内に持続条件が失われる'); remaining = remaining.filter(x => x.id !== a.id); removed = true; break;
          }
        } catch { /* The owning transaction below reports an invalid effect; it is not committed. */ }
      }
      if (!removed) break;
    }
    for (const a of remaining) {
      const def = this.definition(a.definitionId);
      try {
        this.apply(a.phase === 'running' ? def.onSuccess : def.recovery!.onSuccess, a);
        this.event(a.phase === 'running' ? 'engine.action.finished' : 'engine.action.recovered', def.actorIds,
          this.state.actors[def.actorIds[0]!]!.locationId, { instanceId: a.id, actionId: def.id }, [a.startEventId]);
        this.release(a); this.state.actions = this.state.actions.filter(x => x.id !== a.id);
      } catch (error) {
        if (a.phase === 'running') this.abort(a, error instanceof Error ? error.message : '結果を確定できない');
        else { a.elapsedTicks = def.recovery!.durationTicks - 1; this.event('engine.recovery.blocked', def.actorIds, this.state.actors[def.actorIds[0]!]!.locationId, { reason: String(error) }, [a.startEventId]); }
      }
    }
  }
  private start(p: Proposal, startSnapshot: WorldState): void {
    const d = this.definition(p.actionId); const actor = this.state.actors[p.actorId]!;
    if (p.ruleId) actor.retryAt[p.ruleId] = this.state.tick + p.retryTicks;
    const resources = actionResources(d);
    const conflict = resources.find(r => this.state.reservations[r] !== undefined);
    let reason = conflict ? `使用中の資源: ${conflict}` : null;
    if (!check(d.startGuard, startSnapshot) || !check(d.maintainGuard, startSnapshot)) reason = '開始条件または持続条件が成立していない';
    // A result committed this tick may invalidate a proposal. It may not enable a new one.
    if (!check(d.startGuard, this.state) || !check(d.maintainGuard, this.state)) reason = '開始時点で条件が変化した';
    if (d.movement && this.state.actors[d.movement.actorId]!.locationId !== d.movement.from) reason = '移動の出発地点が違う';
    if (reason) { this.event('engine.action.rejected', [p.actorId], actor.locationId, { actionId: d.id, reason, retryAt: this.state.tick + p.retryTicks }); return; }
    const id = this.state.nextActionId++;
    const e = this.event('engine.action.started', d.actorIds, actor.locationId, { instanceId: id, actionId: d.id, ruleId: p.ruleId ?? 'command' });
    const a: ActionInstance = { id, definitionId: d.id, startedAt: this.state.tick, elapsedTicks: 0, phase: 'running', resources, abortReason: null, startEventId: e.id, appliedEffectIds: [] };
    for (const r of resources) this.state.reservations[r] = id;
    this.state.actions.push(a);
  }
  private completeGoals(firstEventId: number): void {
    for (const evidence of [...this.state.events].filter(e => e.id >= firstEventId)) {
      for (const id of evidence.actorIds) {
        const d = this.content.actors.find(a => a.id === id)!;
        if (this.state.completions[id] || !d.goalEvidence.includes(evidence.type)) continue;
        const e = this.event('engine.goal.completed', [id], evidence.locationId, { goalVersion: 1 }, [evidence.id]);
        this.state.completions[id] = { eventId: e.id, evidenceEventIds: [evidence.id], achievedAt: this.state.tick, goalVersion: 1, postGoalContractVersion: d.postGoalContract.version };
        this.state.actors[id]!.routineMode = 'ordinary';
        for (const service of d.postGoalContract.serviceIds) this.state.services[service] = true;
        if (this.state.actors.player!.locationId === evidence.locationId && !this.moving('player')) this.queue(e.id, 'player', { kind: 'completion', completionActorId: id, sourceId: id });
      }
    }
  }
  private update(): void {
    const before = clone(this.state);
    try {
      this.state.tick++; const firstEventId = this.state.nextEventId; this.refreshDerived(); this.deliver(); this.perceive();
      const proposals: Proposal[] = []; const cancellations = new Set<number>();
      const commands = this.state.pending; this.state.pending = [];
      for (const entry of commands) {
        try { this.process(entry.command, entry.id, proposals, cancellations); }
        catch (error) { this.event('engine.command.rejected', [entry.command.actorId], this.state.actors[entry.command.actorId]!.locationId, { commandId: entry.id, reason: error instanceof Error ? error.message : String(error) }); }
      }
      const startSnapshot = clone(this.state);
      let order = this.state.nextCommandId;
      for (const d of [...this.content.actors].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
        const self = startSnapshot.actors[d.id]!;
        const busy = startSnapshot.actions.some(a => !this.definition(a.definitionId).concurrent && this.definition(a.definitionId).actorIds.includes(d.id));
        const r = [...d.rules].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id, 'en')).find(r => ((r.mode ?? 'problem') === self.routineMode || r.mode === 'always') && (!busy || this.definition(r.actionId).concurrent) && !startSnapshot.actions.some(a => a.definitionId === r.actionId) && (self.retryAt[r.id] ?? 0) <= this.state.tick && choose(r.choiceGuard, self));
        if (r) proposals.push({ actorId: d.id, actionId: r.actionId, order: order++, ruleId: r.id, retryTicks: r.retryTicks });
      }
      this.advance(cancellations);
      for (const p of proposals.sort((a, b) => a.order - b.order)) this.start(p, startSnapshot);
      this.completeGoals(firstEventId);
      this.refreshDerived();
    } catch (error) { this.state = before; throw error; }
  }
}
