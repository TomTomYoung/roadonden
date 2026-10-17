import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/core/engine.ts';
import {validateState} from '../src/core/validation.ts';
import {dinnerContent as content,playerRoute,walkId,P} from '../src/content/dinner.ts';
import {NELL,OSCAR,SAM,IRIS,HESTER,THEO,FINN,BEE} from '../src/content/rooms-and-sleep.ts';
const defs=new Map(content.actions.map(a=>[a.id,a]));
function until(s,predicate,limit=1600){for(let i=0;i<limit;i++){if(predicate(s.snapshot()))return;s.step();}assert.ok(predicate(s.snapshot()),'timed out: '+JSON.stringify(Object.fromEntries([NELL,OSCAR,SAM,IRIS,HESTER,THEO,FINN,BEE].map(id=>[id,s.snapshot().actors[id].locationId]))));}
function perform(s,id,extra=5){const a=defs.get(id),n=s.snapshot().nextEventId;assert.ok(a,id);s.enqueue({kind:'start',actorId:P,actionId:id});s.step(a.durationTicks+extra+1);const events=s.snapshot().events.filter(e=>e.id>=n);assert.ok(events.some(e=>e.type==='engine.action.finished'&&e.payload.actionId===id),`${id}: ${JSON.stringify(events.filter(e=>/abort|reject/.test(e.type)))}`);}
function go(s,to){for(const next of playerRoute(s.snapshot().actors[P].locationId,to,s.snapshot()))perform(s,walkId(P,s.snapshot().actors[P].locationId,next),1);s.step(3);}
function meet(s,who){for(let i=0;i<18;i++){const q=s.snapshot(),loc=q.actors[who].locationId;if(q.actors[P].locationId===loc&&!q.actions.some(a=>defs.get(a.definitionId).movement?.actorId===who))return;go(s,loc);}assert.fail('could not meet '+who);}
function offer(s,id){perform(s,'offer.'+id,12);}
function reject(s,id){const n=s.snapshot().nextEventId;s.enqueue({kind:'start',actorId:P,actionId:id});s.step(4);assert.ok(s.snapshot().events.some(e=>e.id>=n&&e.type==='engine.action.rejected'&&e.payload.actionId===id),id);}
function callNell(s){go(s,'nellWindow');perform(s,'nell.call');until(s,q=>q.actors[NELL].locationId==='nellWindow');s.step(4);}
function letter(s){meet(s,NELL);perform(s,'talk.nell');offer(s,'nell.delivery');go(s,'mailShelf');perform(s,'nell.pickup');meet(s,NELL);perform(s,'nell.deliver');until(s,q=>q.completions[NELL]);}
function repair(s){go(s,'H.hall2');perform(s,'bell.pull');go(s,'nellWindow');perform(s,'bell.listen');meet(s,OSCAR);perform(s,'talk.oscar');perform(s,'tell.bellOutside');perform(s,'tell.bellInside');offer(s,'oscar.explain');if(!s.snapshot().facts['nell.called'])callNell(s);else go(s,'nellWindow');until(s,q=>q.facts['oscar.explained']);offer(s,'bell.entry');until(s,q=>q.facts['bell.fixed']);go(s,'H.hall2');assert.ok(!s.snapshot().completions[OSCAR]);perform(s,'bell.test');until(s,q=>q.completions[OSCAR]);}
test('window delivery completes Nell independently, then permission and both sides of the bell finish Oscar',()=>{
 const s=new Simulation(content);go(s,'H.hall2');reject(s,walkId(P,'H.hall2','nell'));callNell(s);letter(s);
 const completed=s.snapshot().completions[NELL];assert.ok(!s.snapshot().facts['bell.fixed']);assert.ok(!s.snapshot().completions[OSCAR]);assert.equal(s.snapshot().objects.nellLetter.custody.id,NELL);
 repair(s);assert.deepEqual(s.snapshot().completions[NELL],completed);assert.ok(s.snapshot().facts['bell.heard']);assert.ok(s.snapshot().services['nell.bell']);validateState(s.snapshot(),s.content);
});
test('repair can precede the letter; a repaired bell alone does not complete Nell',()=>{
 const s=new Simulation(content);repair(s);assert.ok(!s.snapshot().completions[NELL]);assert.equal(s.snapshot().objects.nellLetter.custody.id,'mailShelf');letter(s);validateState(s.snapshot(),s.content);
});
test('Sam waits for Iris to finish dressing and physically returns tools through the permitted window route',()=>{
 const s=new Simulation(content);go(s,'scaffold');perform(s,'talk.sam');reject(s,walkId(P,'scaffold','iris'));s.step(80);assert.equal(s.snapshot().actors[SAM].locationId,'scaffold');assert.ok(!s.snapshot().facts['sam.packed']);offer(s,'sam.wait');until(s,q=>q.facts['sam.waiting']);s.step(3);
 go(s,'iris');perform(s,'talk.iris');perform(s,'tell.samRoute');perform(s,'tell.samWaiting');offer(s,'iris.notice');assert.ok(!s.snapshot().completions[IRIS]);until(s,q=>q.completions[SAM]&&q.completions[IRIS]);
 const q=s.snapshot();assert.equal(q.objects.samTools.custody.id,'dryCloth');assert.equal(q.objects.samLadder.custody.id,'dryCloth');assert.ok(q.events.some(e=>e.type==='engine.action.finished'&&e.payload.actionId===walkId(SAM,'scaffold','iris')));assert.ok(!q.facts['sam.externalReady']);assert.ok(q.services['iris.returnRoute']);validateState(q,s.content);
});
test('external descent finishes Sam first, and Iris may choose the private shared room later',()=>{
 const s=new Simulation(content);go(s,'scaffold');perform(s,'talk.sam');offer(s,'sam.external');go(s,'dryCloth');perform(s,'sam.secure');until(s,q=>q.completions[SAM]);const completed=s.snapshot().completions[SAM];assert.ok(!s.snapshot().facts['iris.returnOpen']);assert.ok(!s.snapshot().completions[IRIS]);go(s,'iris');perform(s,'talk.iris');perform(s,'tell.samRoute');offer(s,'iris.other');until(s,q=>q.completions[IRIS]);assert.deepEqual(s.snapshot().completions[SAM],completed);assert.ok(s.snapshot().facts['iris.otherRoom']);assert.ok(s.snapshot().events.some(e=>e.type==='engine.action.finished'&&e.payload.actionId===walkId(SAM,'scaffold','dryCloth')));validateState(s.snapshot(),s.content);
});
function returnPillow(s){go(s,'hester');assert.equal(s.snapshot().actors[P].beliefs['hester.signature'].stance,'believe');go(s,'theatreProps');perform(s,'talk.theo');perform(s,'tell.pillow');until(s,q=>q.completions[THEO]);perform(s,'pillow.take');go(s,'hester');perform(s,'pillow.return');}
test('Theo verifies ownership and a stage substitute; Hester actually lies down and sleeps after delivery',()=>{
 const s=new Simulation(content);go(s,'theatreProps');reject(s,'pillow.take');returnPillow(s);until(s,q=>q.completions[HESTER]);assert.ok(s.snapshot().facts['stage.tested']);assert.equal(s.snapshot().objects.stageCushion.custody.id,'theatreProps');assert.equal(s.snapshot().objects.hesterPillow.custody.id,'hester');assert.ok(s.snapshot().facts['hester.lying']);validateState(s.snapshot(),s.content);
});
test('the coat alternative sleeps first; a late pillow return never wakes or resets Hester',()=>{
 const s=new Simulation(content);meet(s,HESTER);perform(s,'talk.hester');offer(s,'hester.coat');until(s,q=>q.completions[HESTER]);const completed=s.snapshot().completions[HESTER];assert.ok(!s.snapshot().completions[THEO]);returnPillow(s);s.step(80);assert.deepEqual(s.snapshot().completions[HESTER],completed);assert.equal(s.snapshot().actors[HESTER].locationId,'hester');assert.ok(!s.snapshot().actions.some(a=>defs.get(a.definitionId).actorIds.includes(HESTER)));validateState(s.snapshot(),s.content);
});
test('seeing the floor does not inform Bee or give consent; Finn sleeps before Bee rests',()=>{
 const s=new Simulation(content);go(s,'vera');perform(s,'cradle.inspect');assert.equal(s.snapshot().actors[BEE].beliefs['cradle.edge'],undefined);reject(s,'offer.bee.level');perform(s,'tell.cradle');s.step(60);assert.ok(!s.snapshot().facts['cradle.level']);offer(s,'bee.level');until(s,q=>q.completions[FINN]);assert.ok(!s.snapshot().completions[BEE]);until(s,q=>q.completions[BEE]);assert.ok(s.snapshot().completions[FINN].achievedAt<s.snapshot().completions[BEE].achievedAt);assert.equal(s.snapshot().actors[FINN].locationId,'vera');assert.deepEqual(s.snapshot().actors[FINN].beliefs,{});assert.equal(content.actors.find(a=>a.id===FINN).rules.length,0);validateState(s.snapshot(),s.content);
});
test('holding is an alternative; a mid-watch save resumes to sleep, safe laying-down and separate tea',()=>{
 const s=new Simulation(content);go(s,'vera');perform(s,'talk.bee');offer(s,'bee.hold');until(s,q=>q.actions.some(a=>a.definitionId==='bee.watch'&&a.elapsedTicks>8));assert.ok(!s.snapshot().completions[FINN]);assert.ok(!s.snapshot().facts['cradle.edge']);go(s,'D.hall1');const restored=new Simulation(content);restored.load(s.save());s.step(180);restored.step(180);assert.deepEqual(restored.save(),s.save());assert.ok(s.snapshot().completions[FINN]);assert.ok(s.snapshot().completions[BEE]);assert.equal(s.snapshot().facts['finn.held'],false);assert.ok(s.snapshot().facts['cradle.level']);assert.equal(s.snapshot().knownCompletions[FINN],undefined);s.enqueue({kind:'observeCompletion',actorId:P,recipientId:FINN});s.step(3);assert.equal(s.snapshot().knownCompletions[FINN],undefined);go(s,'vera');s.enqueue({kind:'observeCompletion',actorId:P,recipientId:FINN});s.step(3);assert.ok(s.snapshot().knownCompletions[FINN]);assert.deepEqual(s.snapshot().actors[FINN].beliefs,{});assert.ok(!s.snapshot().events.some(e=>e.type==='engine.completion.reported'&&e.actorIds.includes(FINN)));validateState(s.snapshot(),s.content);
});
