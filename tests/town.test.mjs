import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/core/engine.ts';
import {validateState} from '../src/core/validation.ts';
import {dinnerContent as content,route,walkId,P,E,DA,BE,AG} from '../src/content/dinner.ts';
import {residentPlacements} from '../src/content/resident-placements.ts';
import {blockPlaceById,blockPlaces} from '../src/content/block.ts';
import {townBuildings,districts,WORLD_WIDTH,WORLD_HEIGHT} from '../src/content/town-layout.ts';
const defs=new Map(content.actions.map(a=>[a.id,a]));
function stepUntil(s,predicate,limit=1100){for(let i=0;i<limit;i++){if(predicate(s.snapshot()))return;s.step();}assert.ok(predicate(s.snapshot()),'timed out');}
function perform(s,id,extra=6){const a=defs.get(id),n=s.snapshot().nextEventId;assert.ok(a,id);if(a.movement&&a.resources.includes('lift:O'))stepUntil(s,q=>q.reservations['lift:O']===undefined);s.enqueue({kind:'start',actorId:P,actionId:id});s.step(a.durationTicks+extra+1);const events=s.snapshot().events.filter(e=>e.id>=n);assert.ok(events.some(e=>e.type==='engine.action.finished'&&e.payload.actionId===id),`${id}: ${JSON.stringify(events.filter(e=>/abort|reject/.test(e.type)))}`);}
function go(s,to){for(const next of route(s.snapshot().actors[P].locationId,to))perform(s,walkId(P,s.snapshot().actors[P].locationId,next),1);s.step(3);}
function meet(s,who){for(let i=0;i<15;i++){const state=s.snapshot(),loc=state.actors[who].locationId;if(state.actors[P].locationId===loc&&!state.actions.some(a=>defs.get(a.definitionId).movement?.actorId===who))return;go(s,loc);s.step(3);}assert.fail('could not meet '+who);}
function offer(s,id){perform(s,'offer.'+id,12);}
function consent(s){meet(s,E);perform(s,'talk.elias');offer(s,'elias.key');perform(s,'confirm.key.consent');}
function sendBeth(s){go(s,'agnes');perform(s,'talk.agnes');meet(s,BE);perform(s,'tell.agnes');}
test('full-town topology connects six shopping sections, thirty buildings and every cast assignment',()=>{
 assert.equal(townBuildings.length,30);assert.equal(districts.length,6);assert.equal(residentPlacements.length,100);assert.equal(new Set(residentPlacements.map(p=>p.id)).size,100);
 for(const p of residentPlacements){assert.ok(blockPlaceById.has(p.initialLocation),p.id);assert.ok(blockPlaceById.has(p.destination),p.id);assert.ok(p.initialLocation===p.destination||route(p.initialLocation,p.destination).length,p.id);assert.equal(p.implemented,content.actors.some(a=>a.id===p.id),p.id);}
 for(const p of blockPlaces){assert.ok(p.x>=0&&p.x<=WORLD_WIDTH&&p.y>=0&&p.y<=WORLD_HEIGHT,p.id);assert.ok(route('inn',p.id).length||p.id==='inn',p.id);}
 assert.ok(route('inn','shuttle').includes('back.5'));
 assert.ok(blockPlaceById.get('liftGround').links.includes('liftUpper'));
 const s=new Simulation(content);go(s,'liftGround');perform(s,walkId(P,'liftGround','liftUpper'));assert.equal(s.snapshot().actors[P].locationId,'liftUpper');assert.ok(!s.snapshot().facts['quay.stable']);
});
test('key route: consent and actual custody lead to sitting; mother and daughter drink after storage and walking',()=>{
 const s=new Simulation(content);consent(s);go(s,'pawn');perform(s,'tell.coat');s.step(30);perform(s,'tell.keyConsent');perform(s,'take.eliasKey');assert.ok(!s.snapshot().completions[E]);meet(s,E);perform(s,'give.eliasKey');stepUntil(s,q=>q.completions[E]);assert.equal(s.snapshot().actors[E].locationId,'a301');assert.equal(s.snapshot().objects.eliasKey.custody.id,E);
 go(s,'a301');meet(s,DA);perform(s,'tell.entered');stepUntil(s,q=>q.completions[DA]);sendBeth(s);assert.ok(!s.snapshot().completions[BE]);stepUntil(s,q=>q.completions[BE]&&q.completions[AG]);assert.equal(s.snapshot().actors[BE].locationId,'agnes');assert.equal(s.snapshot().objects.eliasCoat.custody.id,'coatBox');assert.ok(s.snapshot().services['pawn.box']);validateState(s.snapshot(),s.content);
});
test('spare-key alternative leaves original in custody, returns loan, and accepts a late key after both households finish',()=>{
 const s=new Simulation(content);meet(s,E);perform(s,'talk.elias');offer(s,'elias.wait');meet(s,E);perform(s,'talk.front');meet(s,DA);perform(s,'tell.front');stepUntil(s,q=>q.completions[E]&&q.completions[DA]);stepUntil(s,q=>q.loans.spareKey.status==='returned');assert.equal(s.snapshot().objects.eliasKey.custody.kind,'object');assert.equal(s.snapshot().objects.spareKey.custody.id,'a301');
 const before=s.snapshot().completions[E];sendBeth(s);stepUntil(s,q=>q.completions[BE]&&q.completions[AG]);consent(s);go(s,'coatBox');perform(s,'box.identify');perform(s,'box.key');go(s,'a301');perform(s,'return.eliasKey');stepUntil(s,q=>q.objects.eliasKey.custody.id===E);assert.deepEqual(s.snapshot().completions[E],before);assert.equal(s.snapshot().actors[BE].locationId,'agnes');assert.equal(s.snapshot().actors[DA].locationId,'doraRest');validateState(s.snapshot(),s.content);
});
test('mother may be visited before key identification; the numbered box preserves later owner identification',()=>{
 const s=new Simulation(content);sendBeth(s);stepUntil(s,q=>q.completions[BE]&&q.completions[AG]);assert.ok(!s.snapshot().facts['key.matched']);assert.ok(!s.snapshot().completions[E]);consent(s);go(s,'coatBox');perform(s,'box.identify');perform(s,'box.key');meet(s,E);perform(s,'give.eliasKey');stepUntil(s,q=>q.completions[E]);assert.equal(s.snapshot().actors[BE].locationId,'agnes');validateState(s.snapshot(),s.content);
});
test('unknown ownership and missing permission cannot take the key; uncommunicated rendezvous does not summon Dora',()=>{
 const s=new Simulation(content);go(s,'pawn');const original=s.snapshot().objects.eliasKey;s.enqueue({kind:'start',actorId:P,actionId:'take.eliasKey'});s.step(30);assert.deepEqual(s.snapshot().objects.eliasKey,original);meet(s,E);offer(s,'elias.wait');s.step(180);assert.ok(!s.snapshot().facts['dora.lent']);assert.equal(s.snapshot().actors[DA].beliefs['front.agreed'],undefined);
});
test('save/resume while Beth is carrying the coat preserves the contained key and all subsequent results',()=>{
 const s=new Simulation(content);sendBeth(s);stepUntil(s,q=>q.objects.eliasCoat.custody.id===BE&&q.actions.some(a=>defs.get(a.definitionId).movement?.actorId===BE));const restored=new Simulation(content);restored.load(s.save());s.step(200);restored.step(200);assert.deepEqual(restored.save(),s.save());assert.equal(s.snapshot().objects.eliasKey.custody.id,'eliasCoat');validateState(s.snapshot(),s.content);
});
