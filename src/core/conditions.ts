import type { ActorState, ChoiceGuard, Condition, WorldState } from './types.ts';
import { sameCustody } from './validation.ts';

/** A decision receives ONLY the actor's own knowledge, consent and current location. */
export function choose(g: ChoiceGuard, self: Readonly<ActorState>): boolean {
  switch (g.op) {
    case 'always': return true;
    case 'belief': return self.beliefs[g.propositionId]?.stance === g.stance;
    case 'here': return self.locationId === g.locationId;
    case 'accepted': return self.accepted[g.agreementId] === g.version;
    case 'offered': return self.offered[g.agreementId] === g.version;
    case 'all': return g.conditions.every(c => choose(c, self));
    case 'any': return g.conditions.some(c => choose(c, self));
    case 'not': return !choose(g.condition, self);
  }
}
export function check(g: Condition, s: Readonly<WorldState>): boolean {
  switch (g.op) {
    case 'always': return true;
    case 'all': return g.conditions.every(c => check(c, s));
    case 'any': return g.conditions.some(c => check(c, s));
    case 'not': return !check(g.condition, s);
    case 'fact': return s.facts[g.propositionId] === g.value;
    case 'at': return s.actors[g.actorId]?.locationId === g.locationId;
    case 'together': return g.actorIds.length > 0 && g.actorIds.every(id => s.actors[id]?.locationId === s.actors[g.actorIds[0]!]!.locationId);
    case 'custody': return !!s.objects[g.objectId] && sameCustody(s.objects[g.objectId]!.custody, g.custody);
    case 'quantity': return (s.objects[g.objectId]?.quantity ?? -1) >= g.minimum;
    case 'belief': return s.actors[g.actorId]?.beliefs[g.propositionId]?.stance === g.stance;
    case 'agreement': return g.actorIds.every(id => s.actors[id]?.accepted[g.agreementId] === g.version);
    case 'offered': return s.actors[g.actorId]?.offered[g.agreementId] === g.version;
    case 'loan': return s.loans[g.loanId]?.status === g.status;
    case 'during': return s.tick >= g.from && s.tick < g.until;
    case 'event': return s.events.some(e => e.type === g.type && e.actorIds.includes(g.actorId));
    case 'active': return s.actions.some(a => a.definitionId === g.actionId && a.phase === 'running');
    case 'reserved': return s.reservations[g.resourceId] !== undefined;
  }
}
