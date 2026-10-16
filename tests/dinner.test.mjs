import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/core/engine.ts';
import { validateState } from '../src/core/validation.ts';
import { dinnerContent as content, route, walkId, P,N,O,K,B,M,R,C,L,W,T,F,D } from '../src/content/dinner.ts';
const create=()=>new Simulation(content);
function perform(s,id,extra=7) {
 const a=content.actions.find(a=>a.id===id);assert.ok(a,id);const before=s.snapshot().nextEventId;
 s.enqueue({kind:'start',actorId:P,actionId:id});s.step(a.durationTicks+1+extra);
 const events=s.snapshot().events.filter(e=>e.id>=before);
 assert.ok(events.some(e=>e.type==='engine.action.finished'&&e.payload.actionId===id),`${id}: ${JSON.stringify(events.filter(e=>/reject|abort/.test(e.type)))}`);
}
function go(s,to) {let from=s.snapshot().actors[P].locationId;for(const next of route(from,to)){perform(s,walkId(P,from,next),0);from=next;}s.step(3);}
function offer(s,id){perform(s,`offer.${id}`,10);}
function check(s){validateState(s.snapshot(),s.content);}
function familyOthers(s,early=false){
 go(s,'quay');perform(s,`tell.dinner.${O}`);perform(s,'quay.clear');perform(s,'quay.flag');offer(s,'quay');s.step(85);
 assert.equal(s.snapshot().facts['quay.stable'],true);assert.ok(s.snapshot().completions[W]);assert.ok(s.snapshot().completions[T]);assert.ok(!s.snapshot().completions[O]);
 go(s,'school');perform(s,`tell.dinner.${K}`);offer(s,early?'school.tomorrow':'school.trial');s.step(100);
 assert.ok(!s.snapshot().completions[K]);assert.equal(!!s.snapshot().completions[F],!early);
}
function noraPlan(s){go(s,'home');perform(s,'talk.nora');}
function permission(s){offer(s,'delivery');perform(s,'talk.permission');go(s,'market');perform(s,'tell.order');perform(s,'tell.permission');}
function deliver(s){noraPlan(s);permission(s);perform(s,'take.package');go(s,'home');perform(s,'deliver.package');s.step(50);}
function dog(s){go(s,'yard');offer(s,'ben.stop');s.step(10);perform(s,'garden.open');go(s,'garden');perform(s,'toy.place');s.step(90);assert.ok(s.snapshot().completions[B]);}
function borrowed(s){noraPlan(s);offer(s,'loan.nora');go(s,'shoe');perform(s,'talk.leo');offer(s,'loan.leo');perform(s,'borrow.shoes');go(s,'home');perform(s,'give.loanShoes');}
function finishDinner(s){s.step(200);assert.ok(s.snapshot().facts['dinner.done']);for(const id of [N,O,K])assert.ok(s.snapshot().completions[id]);check(s);}

test('T01 actual delivery: cooked food and homecoming do not count until the shared dinner ends',()=>{
 const s=create();deliver(s);assert.equal(s.snapshot().facts['meal.ready'],true);assert.deepEqual(s.snapshot().completions,{});
 familyOthers(s);finishDinner(s);assert.ok(!s.snapshot().completions[B]);assert.ok(!s.snapshot().completions[R]);assert.ok(!s.snapshot().completions[L]);
 assert.ok(!s.snapshot().completions[M]);go(s,'market');perform(s,'tell.receipt');s.step(30);assert.ok(s.snapshot().completions[M]);check(s);
});
test('T01 actual dog route: return shoes, Nora walks to collect, then cooks without the big pot',()=>{
 const s=create();noraPlan(s);dog(s);perform(s,'pickup.shoes');go(s,'home');perform(s,'give.shoes');s.step(170);
 assert.equal(s.snapshot().facts['meal.ready'],true);assert.equal(s.snapshot().objects.bigPot.custody.id,R);familyOthers(s);finishDinner(s);
});
test('T01 / T06 actual loan route survives Leo closing and Nora finishing; original dog problem remains',()=>{
 const s=create();borrowed(s);go(s,'shoe');offer(s,'leo.box');s.step(120);assert.ok(s.snapshot().completions[L]);
 familyOthers(s);finishDinner(s);assert.ok(!s.snapshot().completions[B]);assert.equal(s.snapshot().loans.shoes.status,'borrowed');
 go(s,'home');perform(s,'pickup.loan');go(s,'shoe');perform(s,'return.loan');assert.equal(s.snapshot().loans.shoes.status,'returned');check(s);
});
test('Mabel can lock up, deliver herself, observe receipt and return to close',()=>{
 const s=create();noraPlan(s);permission(s);offer(s,'mabel.delivery');s.step(230);
 assert.equal(s.snapshot().facts['ingredients.received'],true);assert.equal(s.snapshot().facts['meal.ready'],true);assert.ok(s.snapshot().completions[M]);assert.equal(s.snapshot().actors[M].locationId,'market');check(s);
});
test('T06 early Kit departure leaves Ralph unresolved and lets him try with the player after dinner',()=>{
 const s=create();deliver(s);familyOthers(s,true);finishDinner(s);assert.ok(!s.snapshot().completions[F]);
 go(s,'school');offer(s,'school.trial');s.step(70);assert.ok(s.snapshot().completions[F]);assert.equal(s.snapshot().actors[K].locationId,'home');assert.equal(s.snapshot().objects.kitPuppet.custody.id,K);check(s);
});
test('T03 dog toy alone, closed gate, and shoe recovery alone do not finish dog care',()=>{
 const s=create();go(s,'yard');perform(s,'garden.open');go(s,'garden');perform(s,'toy.place');s.step(70);assert.equal(s.snapshot().actors[D].locationId,'yard');assert.ok(!s.snapshot().completions[B]);
 go(s,'yard');offer(s,'ben.stop');s.step(70);assert.ok(s.snapshot().completions[B]);check(s);
 const q=create();go(q,'yard');offer(q,'ben.stop');q.step(30);assert.equal(q.snapshot().actors[D].locationId,'yard');assert.ok(!q.snapshot().completions[B]);perform(q,'dog.takeShoe');assert.ok(!q.snapshot().completions[B]);check(q);
});
test('T06 after dinner Ruth returns and speaks, Celia eats privately, Ben still settles the dog',()=>{
 const s=create();deliver(s);familyOthers(s,true);finishDinner(s);const completed=s.snapshot().completions[N];
 go(s,'ruth');offer(s,'ruth.explain');s.step(130);assert.ok(s.snapshot().completions[R]);assert.equal(s.snapshot().loans.pot.status,'returned');assert.deepEqual(s.snapshot().completions[N],completed);
 go(s,'celia');offer(s,'celia.privacy');s.step(70);assert.ok(s.snapshot().completions[C]);dog(s);check(s);
});
test('T07 cargo takeover leaves the player physically occupied until the stand takes the load',()=>{
 const s=create();go(s,'quay');perform(s,'quay.clear');perform(s,'quay.flag');perform(s,'quay.takeover');
 const from=s.snapshot().actors[P].locationId;s.enqueue({kind:'start',actorId:P,actionId:walkId(P,from,'market')});s.step(30);assert.equal(s.snapshot().actors[P].locationId,'quay');assert.equal(s.snapshot().facts['quay.playerHolding'],true);
 offer(s,'quay');s.step(100);assert.equal(s.snapshot().facts['quay.playerHolding'],false);go(s,'market');check(s);
});
test('Celia company really occupies the player; interruption postpones her meal and retry works',()=>{
 const s=create();go(s,'celia');offer(s,'celia.company');s.enqueue({kind:'start',actorId:P,actionId:'celia.role.company'});s.step(12);
 const a=s.snapshot().actions.find(a=>a.definitionId==='celia.role.company');assert.ok(a);s.enqueue({kind:'cancel',actorId:P,instanceId:a.id});s.step(3);assert.ok(!s.snapshot().completions[C]);
 perform(s,'celia.role.company');assert.ok(s.snapshot().completions[C]);check(s);
});
test('repair paths consume finite materials once, then perform and return',()=>{
 const s=create();go(s,'ruth');offer(s,'ruth.repair');s.step(130);assert.ok(s.snapshot().completions[R]);assert.equal(s.snapshot().objects.handle.quantity,0);
 go(s,'school');offer(s,'school.repair');s.step(100);assert.ok(s.snapshot().completions[F]);assert.equal(s.snapshot().objects.paper.quantity,2);s.step(50);assert.equal(s.snapshot().objects.paper.quantity,2);check(s);
});
test('save/load preserves a real walk, cargo hold, cooking and remaining dinner exactly',()=>{
 const s=create();s.enqueue({kind:'start',actorId:P,actionId:walkId(P,'inn','street')});s.step(8);
 for(const ticks of [30,50]){const restored=create();restored.load(s.save());restored.step(ticks);s.step(ticks);assert.deepEqual(s.snapshot(),restored.snapshot());check(s);}
 noraPlan(s);permission(s);perform(s,'take.package');go(s,'home');perform(s,'deliver.package',0);s.step(12);
 const r=create();r.load(s.save());s.step(60);r.step(60);assert.deepEqual(s.snapshot(),r.snapshot());check(s);
});

test('T05 switching from borrowed shoes to delivery keeps the loan and permits return after closure',()=>{
 const s=create();noraPlan(s);offer(s,'loan.nora');go(s,'shoe');perform(s,'talk.leo');offer(s,'loan.leo');perform(s,'borrow.shoes');offer(s,'leo.box');
 go(s,'home');permission(s);perform(s,'take.package');go(s,'home');perform(s,'deliver.package');s.step(60);
 assert.equal(s.snapshot().objects.loanShoes.custody.id,P);assert.equal(s.snapshot().loans.shoes.status,'borrowed');assert.ok(s.snapshot().completions[L]);
 go(s,'shoe');perform(s,'return.loan');assert.equal(s.snapshot().loans.shoes.status,'returned');familyOthers(s,true);finishDinner(s);check(s);
});
test('T05 competing couriers cannot duplicate the package or close twice for repeated receipt reports',()=>{
 const s=create();noraPlan(s);permission(s);offer(s,'mabel.delivery');
 s.enqueue({kind:'start',actorId:P,actionId:'take.package'});s.step(220);
 assert.equal(s.snapshot().objects.package.quantity,0);assert.equal(s.snapshot().objects.package.custody.kind,'consumed');assert.equal(s.snapshot().events.filter(e=>e.type==='engine.effect.consume'&&String(e.payload.detail).includes('package')).length,1);
 go(s,'home');s.step(5);go(s,'market');perform(s,'tell.receipt');perform(s,'tell.receipt');s.step(30);
 assert.equal(s.snapshot().events.filter(e=>e.type==='engine.goal.completed'&&e.actorIds.includes(M)).length,1);check(s);
});
test('T02 / T17 the dinner interval is required; a midway save and leaving afterwards preserve completion',()=>{
 const s=create();deliver(s);familyOthers(s);let i=0;while(!s.snapshot().actions.some(a=>a.definitionId==='family.dinner')&&i++<150)s.step();
 assert.ok(s.snapshot().actions.some(a=>a.definitionId==='family.dinner'));for(const who of [N,O,K])assert.ok(!s.snapshot().completions[who]);
 const copy=create();copy.load(s.save());s.step(100);copy.step(100);assert.deepEqual(s.snapshot(),copy.snapshot());
 s.enqueue({kind:'start',actorId:N,actionId:walkId(N,'home','street')});s.step(30);assert.equal(s.snapshot().actors[N].locationId,'street');assert.ok(s.snapshot().completions[N]);check(s);
});
test('T06 / T14 completed Leo can agree a new loan through ordinary service and accept box returns',()=>{
 const s=create();go(s,'shoe');offer(s,'leo.box');s.step(100);noraPlan(s);offer(s,'loan.nora');go(s,'upstairs');perform(s,'talk.leo');offer(s,'loan.leo');go(s,'shoe');perform(s,'borrow.shoes');perform(s,'return.loan');perform(s,'borrow.shoes');perform(s,'return.loan');assert.ok(s.snapshot().completions[L]);check(s);
});
test('all eleven named residents are reachable in one continuous world, without resetting the family',()=>{
 const s=create();deliver(s);familyOthers(s,true);finishDinner(s);go(s,'market');perform(s,'tell.receipt');go(s,'school');offer(s,'school.trial');s.step(80);dog(s);go(s,'ruth');offer(s,'ruth.repair');s.step(130);go(s,'celia');offer(s,'celia.callers');perform(s,'celia.role.callers');go(s,'shoe');offer(s,'leo.box');s.step(120);
 assert.deepEqual(Object.keys(s.snapshot().completions).sort(),[N,O,K,B,M,R,C,L,W,T,F].sort());assert.equal(s.snapshot().events.filter(e=>e.type==='engine.goal.completed').length,11);check(s);
});
test('T07 taking over before any preparation still lets workers prepare and release the player',()=>{
 const s=create();noraPlan(s);go(s,'quay');perform(s,`tell.dinner.${O}`);perform(s,'quay.takeover');s.step(50);assert.equal(s.snapshot().actors[O].locationId,'quay');assert.equal(s.snapshot().facts['quay.playerHolding'],true);
 const restored=create();restored.load(s.save());offer(s,'quay');offer(restored,'quay');s.step(140);restored.step(140);assert.deepEqual(s.snapshot(),restored.snapshot());assert.equal(s.snapshot().facts['quay.stable'],true);assert.equal(s.snapshot().facts['quay.playerHolding'],false);go(s,'market');check(s);
});
test('invalid loan history and foreign content saves are rejected without replacing the current world',()=>{
 const s=create();const before=s.snapshot();for(const corrupt of [save=>save.state.loans.shoes.status='returned',save=>save.state.loans.pot.borrowedAt=999,save=>save.contentVersion='foundation-0.1.0']){const data=s.save();corrupt(data);assert.throws(()=>s.load(data));assert.deepEqual(s.snapshot(),before);}
});
