import { Simulation } from '../core/engine.ts';
import { FixedClock } from '../core/clock.ts';
import { check } from '../core/conditions.ts';
import { Saves } from '../storage/saves.ts';
import { dinnerContent as content, interactions, greetings, route, walkId, P } from '../content/dinner.ts';
import type { Interaction } from '../content/dinner.ts';
import { blockPlaceById, buildingNames, floorLabel } from '../content/block.ts';
import { BlockRenderer } from './renderer.ts';
import type { WorldState } from '../core/types.ts';

const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('town'),renderer=new BlockRenderer(canvas);
const modal=$<HTMLDialogElement>('modal'),body=$('modal-body');
const sim=new Simulation(content),clock=new FixedClock();
const saves=new Saves({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},'roadonden:block:v3:');
let state=sim.snapshot(),paused=false,fast=false,path:string[]=[],lastFrame=performance.now(),lastTickTime=lastFrame,seenEvent=0,toastTimer=0,uiSignature='';
const definitions=new Map(content.actions.map(a=>[a.id,a]));
const places=new Map(content.places.map(p=>[p.id,p]));
const completionWords:Record<string,string>={C001:'「三人の話が聞けてよかった。返すものは、いつもの棚でも受け取れるわ」',C002:'「ようやく家族と食べられたよ」',C003:'「紙人形のお話、二人とも聞いてくれた！」',C004:'「追わずに待てばよかったんだね。共用囲いで落ち着いたよ」',C005:'「包みも届いたし、今日の店じまいはおしまい。棚の受渡し口はそのままよ」',C006:'「返して、ちゃんと話せた。磨いているだけでは伝わらなかったね」',C007:'「落ち着いて食べられたわ。ありがとう」',C008:'「これで踊りの練習ができる。返却箱はいつでも使ってね」',C045:'「荷も下りた。機構は空けたし、次の人にも合図が見える」',C054:'「台は安定している。補助具も片付いたよ」',C064:'「見本と違っていても、僕の話は伝わるんだね」'};
function toast(text:string,error=false){const el=$('toast');el.textContent=text;el.className=`show${error?' error':''}`;window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.remove('show'),6500);}
function button(label:string,fn:()=>void,className=''){const e=document.createElement('button');e.textContent=label;e.className=className;e.onclick=()=>{try{fn();}catch(error){toast(error instanceof Error?error.message:String(error),true);}};return e;}
function paragraph(text:string,parent:HTMLElement=body){const e=document.createElement('p');e.textContent=text;parent.append(e);return e;}
function moving(who:string,s:WorldState=state){return s.actions.find(a=>definitions.get(a.definitionId)?.movement?.actorId===who);}
function occupied(){return state.actions.find(a=>!definitions.get(a.definitionId)!.concurrent&&definitions.get(a.definitionId)!.actorIds.includes(P));}
function syncPause(){clock.setPaused(paused||modal.open||document.hidden);lastFrame=performance.now();$('pause').textContent=paused?'街を動かす':'一時停止';$('running').textContent=modal.open||paused||document.hidden?'街の時間は止まっています':fast?'ここで、少し待っています':'街は動いています';}
function open(title:string,kicker='入居者の手元'){path=[];fast=false;$('modal-title').textContent=title;$('modal-kicker').textContent=kicker;body.replaceChildren();if(!modal.open)modal.showModal();syncPause();}
function close(){modal.close();syncPause();canvas.focus();}
$('close-modal').onclick=close;modal.addEventListener('cancel',e=>{e.preventDefault();close();});
function act(i:Interaction){close();fast=false;sim.enqueue({kind:'start',actorId:P,actionId:i.id});toast('声と手が届くところで、試してみる。');}
function talk(who:string){if(moving(P)||moving(who)){toast('歩き終えてから声をかけよう。');return;}const person=content.actors.find(a=>a.id===who)!;open(person.displayName,'声をかける');paragraph(state.completions[who]?completionWords[who]??greetings[who]!:greetings[who]??person.normalLife);
 if(state.completions[who]&&!state.knownCompletions[who])sim.enqueue({kind:'askCompletion',actorId:P,recipientId:who});
 const options=document.createElement('div');options.className='stack';
 for(const i of interactions.filter(i=>i.who===who&&check(i.visible,state)))options.append(button(i.label,()=>act(i)));
 if(!options.children.length)paragraph('今は、様子を見守ろう。');body.append(options,button('話を終える',close,'subtle'));
}
function contextAction(i:Interaction){open(i.label,'あたりを見る');paragraph(i.text.startsWith('「')?'相手に声をかけてみよう。':`ここで「${i.label}」を試せます。`);body.append(button('やってみる',()=>act(i),'primary'));}
function walk(to:string){if(state.facts['quay.playerHolding']){toast('荷を支えている。受け台へ下ろすまでは離れられない。');return;}if(occupied()){toast('いまの行動が終わってから歩こう。');return;}path=route(state.actors[P]!.locationId,to);fast=false;if(path.length)startNextWalk();}
function startNextWalk(){if(!path.length||occupied())return;const from=state.actors[P]!.locationId,to=path.shift()!,id=walkId(P,from,to),a=definitions.get(id)!;if(!check(a.startGuard,state)){path=[];toast('戸が閉じている。入口でできることを探してみよう。');return;}sim.enqueue({kind:'start',actorId:P,actionId:id});}
function inventory(){open('持ち物');const held=content.objects.filter(o=>state.objects[o.id]!.custody.kind==='actor'&&(state.objects[o.id]!.custody as {id:string}).id===P);if(!held.length)paragraph('いま、預かっているものはありません。');for(const o of held){const row=document.createElement('div');row.className='journal-entry';paragraph(o.name,row);const owner=content.actors.find(a=>a.id===o.ownerId)!.displayName;const sub=document.createElement('small');sub.textContent=`持ち主：${owner}　数量：${state.objects[o.id]!.quantity}`;row.append(sub);body.append(row);}for(const l of content.loans??[])if(l.id==='shoes'&&state.loans[l.id]?.status==='borrowed'&&state.actors[P]!.accepted['loan.leo'])paragraph(`貸出の約束：${l.policy}`);paragraph('手渡しや返却は、相手や返却場所のそばで行えます。');}
function notebook(){open('暮らしの手帳','見聞きしたこと');const known=Object.keys(state.knownCompletions);if(known.length){const e=paragraph(`暮らしが進んだと確かめた人：${known.length}人`);e.className='confirmed';for(const id of known)paragraph(`${content.actors.find(a=>a.id===id)!.displayName} — ${content.actors.find(a=>a.id===id)!.goal}`);}
 const beliefs=Object.values(state.actors[P]!.beliefs).filter(b=>b.stance==='believe').sort((a,b)=>b.acquiredAt-a.acquiredAt);if(!beliefs.length)paragraph('まだ、何も書かれていません。近くの人に話しかけたり、あたりを見たりしてみましょう。');
 for(const b of beliefs){const row=document.createElement('div');row.className='journal-entry';const source=content.actors.find(a=>a.id===b.sourceId)?.displayName;const small=document.createElement('small');const evidence=state.events.find(e=>b.evidenceEventIds.includes(e.id));const where=evidence?places.get(evidence.locationId)?.name:undefined;small.textContent=`${where?where+' ・ ':''}${b.sourceKind==='testimony'?`${source??'住民'}から聞いたこと`:'その場で確かめたこと'}`;row.append(small);paragraph(content.propositions.find(p=>p.id===b.propositionId)!.description,row);body.append(row);}
}
function mapMenu(){open('歩いた部屋と道','棟と階の地図');const visited=new Set([content.actors.find(a=>a.id===P)!.locationId]);for(const event of state.events)if(event.type==='engine.effect.move'&&event.actorIds.includes(P)){const effect=JSON.parse(String(event.payload.detail)) as {to:string};visited.add(effect.to);}paragraph('訪れた場所と、そこで見つけた道。場所を選ぶと廊下と階段を通って歩きます。別の階や部屋にいる人とは、同じ場所に着いてから話せます。');const list=document.createElement('div');list.className='stack';for(const id of new Set([...visited,...[...visited].flatMap(id=>places.get(id)!.links)]))list.append(button(`${places.get(id)!.name}${visited.has(id)?'':'（道の先）'}`,()=>{close();walk(id);}));body.append(list);}
function saveMenu(){open('保存・再開');paragraph('街の時間、人物の移動、途中の仕事、聞いた話、貸し借りをまとめて保存します。');for(const slot of [1,2,3] as const){const row=document.createElement('div');row.className='save-row';const label=document.createElement('span');label.textContent=`手動保存 ${slot}`;row.append(label,button('保存',()=>{saves.write(sim,slot);toast(`保存 ${slot} に記録しました。`);}),button('再開',()=>{saves.read(sim,slot);afterLoad();}));body.append(row);}
 const stack=document.createElement('div');stack.className='stack';for(const slot of ['auto','previous'] as const)stack.append(button(slot==='auto'?'最新の自動保存から再開':'一つ前の自動保存から再開',()=>{saves.read(sim,slot);afterLoad();}));
 stack.append(button('セーブをJSONファイルで持ち出す',()=>{const blob=new Blob([saves.export(sim)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='roadonden-block-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));body.append(stack);
 const label=document.createElement('label');label.className='file-label';label.textContent='JSONセーブを読み込む';const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files?.[0];if(file){saves.import(sim,await file.text());afterLoad();}}catch(error){toast(`読み込めませんでした：${error instanceof Error?error.message:String(error)}`,true);} };label.append(input);body.append(label);
 paragraph('自動保存は通常速度で約2分遊ぶごと。旧・街歩き版とは保存枠が別です。旧版のセーブは旧版から再開できます。');const legacy=document.createElement('a');legacy.href='legacy/dinner-0.2.0.html';legacy.textContent='旧・街歩き版を開く（旧セーブ用）';body.append(legacy);
 body.append(button('最初から歩き直す',()=>{open('最初から歩き直しますか');paragraph('現在の進行だけを初期状態に戻します。保存枠に残した記録は消えません。');body.append(button('最初から始める',()=>{sim.load(new Simulation(content).save());afterLoad();},'primary'));}));
}
function afterLoad(){state=sim.snapshot();path=[];fast=false;seenEvent=state.nextEventId-1;uiSignature='';close();renderUI();toast('保存した街から再開しました。');}
function help(welcome=false){open(welcome?'棟と棟のあいだへ':'歩き方','ロードンデン · 集合住宅編');paragraph('短期入居で訪れた、二つのアパートと一棟の雑居ビル。共用廊下や階段を歩き、住民や店の人に声をかけてみてください。誰かを助けても、その人が自分で行動するまで、暮らしは先へ進みません。');paragraph('部屋や道をクリック、または矢印 / WASD で移動します。E で近くの人と会話。持ち物は I、手帳は J。＋であなたの周りを拡大できます。会話や手帳を開いている間は時間が止まります。');paragraph('今回は夕食につながる11人と犬が暮らす範囲を遊べます。工房・小劇場・郵便室など、ほかの89人の物語は準備中です。');const note=paragraph('A棟の階段を上がると、201号室のフィンチ家。中庭へ出て、犬や食品店を先に訪ねても構いません。');note.className='welcome-note';body.append(button('街を歩く',close,'primary'));}
function renderUI(){const where=state.actors[P]!.locationId,location=places.get(where)!;const task=occupied();const people=content.actors.filter(a=>a.id!==P&&state.actors[a.id]!.locationId===where&&!moving(a.id));const available=interactions.filter(i=>!i.who&&check(i.visible,state));const observed=content.clues.filter(clue=>clue.locationId===where&&check(clue.visible,state)&&state.actors[P]!.beliefs[clue.propositionId]?.stance==='believe'&&state.facts[clue.propositionId]===true);const signature=JSON.stringify([where,people.map(a=>a.id),available.map(a=>a.id),task?.definitionId,fast,!!moving(P),state.actions.map(a=>a.definitionId),observed.map(c=>c.id)]);
 $('time').textContent=`${String((16+Math.floor((state.tick%14400)/600))%24).padStart(2,'0')}:${String(Math.floor((state.tick%600)/10)).padStart(2,'0')}`;$('day').textContent=`第${Math.floor((state.tick+9600)/14400)+1}日`;
 if(signature===uiSignature)return;uiSignature=signature;$('place-name').textContent=location.name;$('place-description').textContent=blockPlaceById.get(where)!.description;$('location-level').textContent=`${buildingNames[blockPlaceById.get(where)!.building]} / ${floorLabel(blockPlaceById.get(where)!.floor)}`;canvas.dataset.location=where;
 $('activity').textContent=task?definitions.get(task.definitionId)!.label+'…':fast?'ここで少し待っています。':'足を止めて、あたりを見渡せます。';
 $('people').replaceChildren();for(const person of people){const e=button(person.displayName,()=>talk(person.id),'person');const working=state.actions.find(a=>definitions.get(a.definitionId)!.actorIds.includes(person.id)&&!definitions.get(a.definitionId)!.concurrent);if(working){const small=document.createElement('small');small.textContent=definitions.get(working.definitionId)!.label;e.append(small);}e.disabled=!!moving(P);$('people').append(e);}if(!people.length)paragraph('今は、そばに話せる人がいません。',$('people')).className='empty';
 $('nearby').replaceChildren();for(const i of available){const e=button(i.label,()=>contextAction(i));e.disabled=!!moving(P);$('nearby').append(e);}if(!available.length)paragraph('道の先を見てみよう。',$('nearby')).className='empty';
 $('observations').replaceChildren();for(const clue of observed.slice(-3))paragraph(clue.description,$('observations')).className='empty';$('exits').replaceChildren();for(const id of location.links){const e=button(`${places.get(id)!.name} →`,()=>walk(id));e.dataset.locationId=id;e.disabled=!!task;$('exits').append(e);}
 $('wait').textContent=fast?'待つのをやめる':'少し待つ';$('cancel').hidden=!task||task.definitionId===`hold.${P}`;$('cancel').textContent=task&&definitions.get(task.definitionId)!.movement?'次の道へ進まない':'いまの行動を中断';
}
function tick(){sim.step();state=sim.snapshot();lastTickTime=performance.now();const events=state.events.filter(e=>e.id>seenEvent);seenEvent=state.nextEventId-1;
 for(const event of events){if(event.type==='engine.agreement.accepted'&&!event.actorIds.includes(P)&&event.locationId===state.actors[P]!.locationId)toast(`${content.actors.find(a=>a.id===event.actorIds[0])!.displayName}が提案を受け入れた。`);if(event.type==='engine.action.finished'&&event.actorIds.includes(P)){const i=interactions.find(i=>i.id===event.payload.actionId);if(i)toast(i.id.startsWith('offer.')?`提案した内容：${i.text}`:i.text);}if(event.type==='engine.action.rejected'&&event.actorIds.includes(P)&&state.commandLog.some(c=>c.command.kind==='start'&&c.command.actionId===event.payload.actionId&&c.tick===event.tick)){toast('今は手が空いていないか、状況が変わりました。少し待って、もう一度。');path=[];}
 if(event.type==='engine.information.received'&&event.actorIds.includes(P)&&event.payload.channel==='completion'){toast('その人の暮らしが一歩進んだ。手帳に書き留めた。');fast=false;}}
 if(!occupied()&&path.length&&!state.pending.length)startNextWalk();
 if(state.tick%1200===0)try{saves.autosave(sim);}catch(error){toast(`自動保存できませんでした：${error instanceof Error?error.message:String(error)}`,true);}
 renderUI();}

canvas.onclick=e=>{if(modal.open)return;const id=renderer.hit(e);if(!id)return;if(id===state.actors[P]!.locationId){const person=content.actors.find(a=>a.id!==P&&state.actors[a.id]!.locationId===id&&!moving(a.id));if(person)talk(person.id);}else walk(id);};
$('zoom-in').onclick=()=>{renderer.setZoom(renderer.getZoom()+.6);};
$('zoom-out').onclick=()=>{renderer.setZoom(renderer.getZoom()-.6);};
$('zoom-reset').onclick=()=>{renderer.setZoom(1);};
$('map').onclick=mapMenu;$('inventory').onclick=inventory;$('notebook').onclick=notebook;$('save-menu').onclick=saveMenu;$('help').onclick=()=>help();
$('pause').onclick=()=>{paused=!paused;syncPause();};$('wait').onclick=()=>{fast=!fast;path=[];syncPause();uiSignature='';renderUI();};
$('cancel').onclick=()=>{const a=occupied();if(a){path=[];if(definitions.get(a.definitionId)!.movement)toast('今の道を歩き終えたら、そこで止まります。');else sim.enqueue({kind:'cancel',actorId:P,instanceId:a.id});}};
document.addEventListener('keydown',e=>{if(modal.open||e.repeat)return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key))e.preventDefault();if(key==='escape'){paused=!paused;syncPause();}if(key==='m')mapMenu();if(key==='i')inventory();if(key==='j')notebook();if(key==='e'||key==='enter'){const person=content.actors.find(a=>a.id!==P&&state.actors[a.id]!.locationId===state.actors[P]!.locationId&&!moving(a.id));if(person)talk(person.id);}
 const directions:Record<string,number[]>={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};const dir=directions[key];if(dir){const p=places.get(state.actors[P]!.locationId)!;const candidates=p.links.map(id=>places.get(id)!).map(q=>({q,dot:((q.x-p.x)*dir[0]!+(q.y-p.y)*dir[1]!)/Math.hypot(q.x-p.x,q.y-p.y)})).sort((a,b)=>b.dot-a.dot);if(candidates[0]!.dot>.2)walk(candidates[0]!.q.id);}});
document.addEventListener('visibilitychange',syncPause);
function frame(now:number){const delta=Math.max(0,Math.min(100,now-lastFrame));lastFrame=now;try{clock.advance(delta*(fast?4:1),tick);}catch(error){paused=true;syncPause();toast(`街を一時停止しました：${error instanceof Error?error.message:String(error)}`,true);}renderer.draw(state,path,paused||modal.open||document.hidden?0:Math.min(1,(now-lastTickTime)/100));requestAnimationFrame(frame);}
renderer.load().then(()=>{renderUI();help(true);requestAnimationFrame(frame);}).catch(error=>toast(`素材を読み込めませんでした：${String(error)}`,true));
