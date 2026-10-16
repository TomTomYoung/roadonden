/** All simulation time is integer ticks. No DOM, wall clock or rendering state lives here. */
export type Stance = 'believe' | 'deny' | 'uncertain';
export type Value = string | number | boolean;
export type Custody = { kind: 'actor' | 'place' | 'object'; id: string } | { kind: 'consumed' };
export interface Belief {
  propositionId: string; stance: Stance;
  sourceKind: 'observation' | 'testimony' | 'inference' | 'memory';
  sourceId: string; evidenceEventIds: number[]; acquiredAt: number; revisionReason: string;
}
export type ChoiceGuard =
  | { op: 'always' }
  | { op: 'belief'; propositionId: string; stance: Stance }
  | { op: 'here'; locationId: string }
  | { op: 'accepted'; agreementId: string; version: number }
  | { op: 'all' | 'any'; conditions: ChoiceGuard[] }
  | { op: 'not'; condition: ChoiceGuard };
export type Condition =
  | { op: 'always' }
  | { op: 'all' | 'any'; conditions: Condition[] }
  | { op: 'not'; condition: Condition }
  | { op: 'fact'; propositionId: string; value: Value }
  | { op: 'at'; actorId: string; locationId: string }
  | { op: 'custody'; objectId: string; custody: Custody }
  | { op: 'quantity'; objectId: string; minimum: number }
  | { op: 'belief'; actorId: string; propositionId: string; stance: Stance }
  | { op: 'agreement'; agreementId: string; version: number; actorIds: string[] }
  | { op: 'during'; from: number; until: number }
  | { op: 'event'; type: string; actorId: string }
  | { op: 'active'; actionId: string }
  | { op: 'reserved'; resourceId: string };
export type Effect =
  | { op: 'move'; actorId: string; to: string }
  | { op: 'transfer'; objectId: string; from: Custody; to: Custody }
  | { op: 'consume'; objectId: string; quantity: number; unit: string }
  | { op: 'fact'; propositionId: string; value: Value }
  | { op: 'emit'; type: string; actorIds: string[]; locationId: string; subjectIds: string[] }
  | { op: 'service'; serviceId: string; active: boolean };
export interface ActionDefinition {
  id: string; label: string; actorIds: string[]; durationTicks: number;
  startGuard: Condition; maintainGuard: Condition; finishGuard: Condition;
  resources: string[]; onSuccess: Effect[]; onAbort: Effect[];
  recovery: { durationTicks: number; retainResources: string[]; onSuccess: Effect[] } | null;
  movement: { actorId: string; from: string; to: string } | null;
  presentationId: string; designStatus: 'provisional'; rationale: string;
}
export interface ResidentDefinition {
  id: string; displayName: string; kind: 'player' | 'resident' | 'fixture';
  locationId: string; sourceRef: string; normalLife: string; goal: string;
  initialBeliefs: { propositionId: string; stance: Stance; reason: string }[];
  rules: { id: string; priority: number; choiceGuard: ChoiceGuard; actionId: string; retryTicks: number }[];
  goalEvidence: string[]; postGoalContract: { version: number; serviceIds: string[] };
}
export interface Content {
  version: string; namespace: 'redesign-v1'; tickMs: 100; ticksPerDay: number;
  places: { id: string; name: string; x: number; y: number; links: string[] }[];
  propositions: { id: string; description: string; initialValue: Value }[];
  actors: ResidentDefinition[];
  objects: { id: string; name: string; ownerId: string; custody: Custody; quantity: number; unit: string; portable: boolean; consumable: boolean }[];
  resources: string[]; services: string[];
  clues: { id: string; locationId: string; propositionId: string; visible: Condition; description: string }[];
  agreements: { id: string; version: number; proposerId: string; participantIds: string[]; terms: string }[];
  actions: ActionDefinition[];
}
export interface ActorState {
  locationId: string; beliefs: Record<string, Belief>; accepted: Record<string, number>;
  offered: Record<string, number>; retryAt: Record<string, number>;
  routineMode: 'problem' | 'ordinary';
}
export interface ObjectState { ownerId: string; custody: Custody; quantity: number }
export interface EventRecord {
  id: number; tick: number; type: string; actorIds: string[]; subjectIds: string[];
  locationId: string; payload: Record<string, Value>; causalEventIds: number[];
}
export interface ActionInstance {
  id: number; definitionId: string; startedAt: number; elapsedTicks: number;
  phase: 'running' | 'recovering'; resources: string[]; abortReason: string | null;
  startEventId: number; appliedEffectIds: string[];
}
export interface Completion { eventId: number; evidenceEventIds: number[]; achievedAt: number; goalVersion: number; postGoalContractVersion: number }
export type Delivery = {
  dueAt: number; recipientId: string; eventId: number;
  kind: 'observation' | 'testimony' | 'agreement' | 'completion';
  propositionId: string | null; stance: Stance | null; sourceId: string;
  agreementId: string | null; version: number | null; completionActorId: string | null;
};
export type Command =
  | { kind: 'start'; actorId: string; actionId: string }
  | { kind: 'cancel'; actorId: string; instanceId: number }
  | { kind: 'inspect'; actorId: string; clueId: string }
  | { kind: 'say'; actorId: string; recipientId: string; propositionId: string }
  | { kind: 'askCompletion'; actorId: string; recipientId: string }
  | { kind: 'offer'; actorId: string; recipientId: string; agreementId: string }
  | { kind: 'accept'; actorId: string; agreementId: string; version: number };
export interface CommandRecord { id: number; tick: number; command: Command }
export interface WorldState {
  tick: number; randomState: number; nextEventId: number; nextActionId: number; nextCommandId: number;
  actors: Record<string, ActorState>; objects: Record<string, ObjectState>; facts: Record<string, Value>;
  services: Record<string, boolean>; actions: ActionInstance[]; reservations: Record<string, number>;
  deliveries: Delivery[]; events: EventRecord[]; completions: Record<string, Completion>;
  knownCompletions: Record<string, number>; commandLog: CommandRecord[]; pending: CommandRecord[];
}
export interface SaveFile { schemaVersion: 1; contentVersion: string; designNamespace: 'redesign-v1'; state: WorldState }
