import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/core/engine.ts';
import {Saves} from '../src/storage/saves.ts';
import {blockPlaces,blockPlaceById} from '../src/content/block.ts';
import {dinnerContent as content,route,walkId,P,N,D} from '../src/content/dinner.ts';

function walk(s,to){for(const next of route(s.snapshot().actors[P].locationId,to)){const id=walkId(P,s.snapshot().actors[P].locationId,next),a=content.actions.find(a=>a.id===id);s.enqueue({kind:'start',actorId:P,actionId:id});s.step(a.durationTicks+2);}s.step(3);}
test('every room is reachable through a real entrance; upper floors connect only through adjacent landings',()=>{
 assert.equal(blockPlaces.length,327);
 for(const p of blockPlaces){assert.ok(p.id==='inn'||route('inn',p.id).length>0,p.id);for(const id of p.links){const q=blockPlaceById.get(id);assert.ok(q.links.includes(p.id));if(p.building===q.building&&p.floor!==q.floor&&!([p.id,q.id].every(id=>id.startsWith('lift')))){assert.equal(Math.abs(p.floor-q.floor),1);assert.ok(['hall','roof'].includes(p.kind)&&['hall','roof'].includes(q.kind));}if(p.building!==q.building)assert.ok((p.kind==='outside'&&(q.floor===1||q.kind==='outside'))||(q.kind==='outside'&&(p.floor===1||p.kind==='outside')));}}
 assert.deepEqual(route('home','market'),['a2','a1','street','m1','market']);
 assert.deepEqual(route('shoe','upstairs'),['m1','m2','upstairs']);
 assert.deepEqual(route('home','ruth'),['a2','ruth']);
});
test('Nora cannot be heard or spoken to from the floor below or from the shared corridor',()=>{
 const s=new Simulation(content);s.step(5);
 for(const place of ['a1','a2']){
  walk(s,place);s.enqueue({kind:'start',actorId:P,actionId:'talk.nora'});s.step(20);
  assert.equal(s.snapshot().actors[P].beliefs['order.details'],undefined);
  assert.ok(s.snapshot().events.some(e=>e.type==='engine.action.rejected'&&e.payload.actionId==='talk.nora'));
 }
 walk(s,'home');s.enqueue({kind:'start',actorId:P,actionId:'talk.nora'});s.step(20);
 assert.equal(s.snapshot().actors[P].beliefs['order.details'].sourceId,N);
});
test('a save in the middle of a staircase keeps remaining duration and arrival, without teleporting',()=>{
 const s=new Simulation(content);walk(s,'a1');const id=walkId(P,'a1','a2');s.enqueue({kind:'start',actorId:P,actionId:id});s.step(5);
 assert.equal(s.snapshot().actors[P].locationId,'a1');assert.ok(s.snapshot().actions.some(a=>a.definitionId===id));
 const restored=new Simulation(content);restored.load(s.save());s.step(30);restored.step(30);
 assert.deepEqual(restored.save(),s.save());assert.equal(s.snapshot().actors[P].locationId,'a2');
});
test('old block and dinner saves keep separate slots and fail import without replacing the block world',()=>{
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const s=new Simulation(content),old=s.save();old.contentVersion='dinner-0.2.0';
 data.set('roadonden:dinner:v2:manual:1',JSON.stringify(old));
 const oldBlock={...old,contentVersion:'block-0.3.0'};data.set('roadonden:block:v3:manual:1',JSON.stringify(oldBlock));
 const saves=new Saves(store,'roadonden:town:v4:');saves.write(s,1);const before=s.save();
 assert.throws(()=>saves.import(s,JSON.stringify(oldBlock)));assert.throws(()=>saves.import(s,JSON.stringify(old)));assert.deepEqual(s.save(),before);
 assert.equal(JSON.parse(data.get('roadonden:dinner:v2:manual:1')).contentVersion,'dinner-0.2.0');
 assert.equal(JSON.parse(data.get('roadonden:block:v3:manual:1')).contentVersion,'block-0.3.0');
 assert.equal(JSON.parse(data.get('roadonden:town:v4:manual:1')).contentVersion,'town-0.4.0');
 assert.match(readFileSync('legacy/block-0.3.0.html','utf8'),/roadonden:block:v3:/);
 assert.match(readFileSync('legacy/dinner-0.2.0.html','utf8'),/roadonden:dinner:v2:/);
});
test('all pixel assets have unique identities, valid dimensions and complete character frames',()=>{
 const {assets}=JSON.parse(readFileSync('public/pixel-assets/manifest.json','utf8'));
 assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
 for(const a of assets){const text=readFileSync(`public/pixel-assets/${a.file}`,'utf8');assert.ok(text.includes(`viewBox="0 0 ${a.width} ${a.height}"`));assert.doesNotMatch(text,/<script|https?:\/\/(?!www.w3.org)/);if(a.id.startsWith('residents.'))assert.equal(a.width,a.states.length*64);}
 for(const actor of content.actors)assert.ok(assets.some(a=>a.id===`residents.${actor.id===D?'dog':actor.id}`),actor.id);
 for(const p of blockPlaces)assert.ok(assets.some(a=>a.id===`interiors.${p.interior}`),p.id);
});
test('the adapted canon retains all one hundred identities and references without rewriting the original',()=>{
 const adapted=readFileSync('doc/adaptation/residents-001-100.md','utf8');
 const source=['001-048','049-100'].map(x=>readFileSync(`doc/sources/residents-${x}.md`,'utf8')).join('\n');
 const headings=s=>[...s.matchAll(/^## (C\d{3}) ([^\n]+)$/gm)].map(m=>m[1]+' '+m[2]);
 assert.equal(headings(adapted).length,100);assert.deepEqual(headings(adapted),headings(source));
 for(const match of adapted.matchAll(/C\d{3}/g))assert.ok(headings(adapted).some(h=>h.startsWith(match[0]+' ')),match[0]);
 assert.doesNotMatch(adapted,/通船|水門番|船頭|桟橋|産業革命/);
});
