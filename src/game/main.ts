import { Simulation } from '../core/engine.ts';
import { FixedClock } from '../core/clock.ts';
import { check } from '../core/conditions.ts';
import { Saves } from '../storage/saves.ts';
import { dinnerContent as content, interactions, greetings, route, walkId, P, D, B } from '../content/dinner.ts';
import type { Interaction } from '../content/dinner.ts';
import type { WorldState } from '../core/types.ts';

const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('town'),ctx=canvas.getContext('2d')!;
const modal=$<HTMLDialogElement>('modal'),body=$('modal-body');
const sim=new Simulation(content),clock=new FixedClock();
const saves=new Saves({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},'roadonden:dinner:v2:');
let state=sim.snapshot(),paused=false,fast=false,path:string[]=[],lastFrame=performance.now(),lastTickTime=lastFrame,seenEvent=0,toastTimer=0,uiSignature='';
const definitions=new Map(content.actions.map(a=>[a.id,a]));
const places=new Map(content.places.map(p=>[p.id,p]));
const descriptions:Record<string,string>={inn:'荷物を置いて、街へ。噴水の辻から、中庭にも市場にも歩いていける。',street:'家々と市場を結ぶ、小さな噴水の辻。水音の向こうで、人の暮らしが続いている。',home:'窓辺に小さな食卓。受取棚と、使える小鍋がある。',yard:'家の横の中庭。庭へ続く木の戸がある。',garden:'塀に囲まれた小さな庭。いつもの玩具が転がっている。',ruth:'磨き布と、大鍋のある台所。交換用の柄も手元にある。',market:'青果店の取り置き棚には、支払済みの注文札が並ぶ。',school:'放課後の工作室。紙人形と、補修用の紙。',shoe:'修理台のある靴店。通常貸出の靴と、返却用の場所がある。',upstairs:'靴店の上の小部屋。床に踊りの練習跡がある。',celia:'通りに面した食卓。窓には目隠し、玄関には小さな呼鈴。',quay:'運河の荷揚げ場。荷を支える人、合図を待つ人、受け台の置き場所。',post:'郵便所前の道。この先の郵便の物語は、まだ実装準備中。'};
const completionWords:Record<string,string>={C001:'「三人の話が聞けてよかった。返すものは、いつもの棚でも受け取れるわ」',C002:'「ようやく家族と食べられたよ」',C003:'「紙人形のお話、二人とも聞いてくれた！」',C004:'「追わずに待てばよかったんだね。庭で落ち着いたよ」',C005:'「包みも届いたし、今日の店じまいはおしまい。棚の受渡し口はそのままよ」',C006:'「返して、ちゃんと話せた。磨いているだけでは伝わらなかったね」',C007:'「落ち着いて食べられたわ。ありがとう」',C008:'「これで踊りの練習ができる。返却箱はいつでも使ってね」',C045:'「荷も下りた。機構は空けたし、次の人にも合図が見える」',C054:'「台は安定している。補助具も片付いたよ」',C064:'「見本と違っていても、僕の話は伝わるんだね」'};
function toast(text:string,error=false){const el=$('toast');el.textContent=text;el.className=`show${error?' error':''}`;window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.remove('show'),6500);}
function button(label:string,fn:()=>void,className=''){const e=document.createElement('button');e.textContent=label;e.className=className;e.onclick=()=>{try{fn();}catch(error){toast(error instanceof Error?error.message:String(error),true);}};return e;}
function paragraph(text:string,parent:HTMLElement=body){const e=document.createElement('p');e.textContent=text;parent.append(e);return e;}
function moving(who:string,s:WorldState=state){return s.actions.find(a=>definitions.get(a.definitionId)?.movement?.actorId===who);}
function occupied(){return state.actions.find(a=>!definitions.get(a.definitionId)!.concurrent&&definitions.get(a.definitionId)!.actorIds.includes(P));}
function syncPause(){clock.setPaused(paused||modal.open||document.hidden);lastFrame=performance.now();$('pause').textContent=paused?'街を動かす':'一時停止';$('running').textContent=modal.open||paused||document.hidden?'街の時間は止まっています':fast?'ここで、少し待っています':'街は動いています';}
function open(title:string,kicker='旅人の手元'){path=[];fast=false;$('modal-title').textContent=title;$('modal-kicker').textContent=kicker;body.replaceChildren();if(!modal.open)modal.showModal();syncPause();}
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
function notebook(){open('旅人の手帳','見聞きしたこと');const known=Object.keys(state.knownCompletions);if(known.length){const e=paragraph(`暮らしが進んだと確かめた人：${known.length}人`);e.className='confirmed';for(const id of known)paragraph(`${content.actors.find(a=>a.id===id)!.displayName} — ${content.actors.find(a=>a.id===id)!.goal}`);}
 const beliefs=Object.values(state.actors[P]!.beliefs).filter(b=>b.stance==='believe').sort((a,b)=>b.acquiredAt-a.acquiredAt);if(!beliefs.length)paragraph('まだ、何も書かれていません。近くの人に話しかけたり、あたりを見たりしてみましょう。');
 for(const b of beliefs){const row=document.createElement('div');row.className='journal-entry';const source=content.actors.find(a=>a.id===b.sourceId)?.displayName;const small=document.createElement('small');const evidence=state.events.find(e=>b.evidenceEventIds.includes(e.id));const where=evidence?places.get(evidence.locationId)?.name:undefined;small.textContent=`${where?where+' ・ ':''}${b.sourceKind==='testimony'?`${source??'住民'}から聞いたこと`:'その場で確かめたこと'}`;row.append(small);paragraph(content.propositions.find(p=>p.id===b.propositionId)!.description,row);body.append(row);}
}
function mapMenu(){open('歩いた道','街の地図');const visited=new Set([content.actors.find(a=>a.id===P)!.locationId]);for(const event of state.events)if(event.type==='engine.effect.move'&&event.actorIds.includes(P)){const effect=JSON.parse(String(event.payload.detail)) as {to:string};visited.add(effect.to);}paragraph('訪れた場所と、そこで見つけた道。場所を選ぶと歩いて向かいます。');const list=document.createElement('div');list.className='stack';for(const id of new Set([...visited,...[...visited].flatMap(id=>places.get(id)!.links)]))list.append(button(`${places.get(id)!.name}${visited.has(id)?'':'（道の先）'}`,()=>{close();walk(id);}));body.append(list);}
function saveMenu(){open('保存・再開');paragraph('街の時間、人物の移動、途中の仕事、聞いた話、貸し借りをまとめて保存します。');for(const slot of [1,2,3] as const){const row=document.createElement('div');row.className='save-row';const label=document.createElement('span');label.textContent=`手動保存 ${slot}`;row.append(label,button('保存',()=>{saves.write(sim,slot);toast(`保存 ${slot} に記録しました。`);}),button('再開',()=>{saves.read(sim,slot);afterLoad();}));body.append(row);}
 const stack=document.createElement('div');stack.className='stack';for(const slot of ['auto','previous'] as const)stack.append(button(slot==='auto'?'最新の自動保存から再開':'一つ前の自動保存から再開',()=>{saves.read(sim,slot);afterLoad();}));
 stack.append(button('セーブをJSONファイルで持ち出す',()=>{const blob=new Blob([saves.export(sim)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='roadonden-dinner-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));body.append(stack);
 const label=document.createElement('label');label.className='file-label';label.textContent='JSONセーブを読み込む';const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files?.[0];if(file){saves.import(sim,await file.text());afterLoad();}}catch(error){toast(`読み込めませんでした：${error instanceof Error?error.message:String(error)}`,true);} };label.append(input);body.append(label);
 paragraph('自動保存は通常速度で約2分遊ぶごと。別の章・旧仕様のセーブは上書きせず、読み込みを断ります。');
 body.append(button('最初から歩き直す',()=>{open('最初から歩き直しますか');paragraph('現在の進行だけを初期状態に戻します。保存枠に残した記録は消えません。');body.append(button('最初から始める',()=>{sim.load(new Simulation(content).save());afterLoad();},'primary'));}));
}
function afterLoad(){state=sim.snapshot();path=[];fast=false;seenEvent=state.nextEventId-1;uiSignature='';close();renderUI();toast('保存した街から再開しました。');}
function help(welcome=false){open(welcome?'街へ、ようこそ':'歩き方','ロードンデン · 夕食編');paragraph('夕方の街を歩く旅人として、住民に話しかけてみてください。誰かの用事を助けても、その人が自分で行動するまで、暮らしは先へ進みません。');paragraph('場所をクリック、または矢印 / WASD で道を歩きます。E で近くの人と会話。持ち物は I、手帳は J。会話や手帳を開いている間は街の時間が止まります。');paragraph('道と家の位置は試作版です。今回は夕食につながる11人と犬が暮らす範囲を遊べます。ほかの89人の物語は実装準備中。');const note=paragraph('まずは噴水の辻へ。ノラの家へ行っても、犬のいる中庭や市場を先に訪ねても構いません。');note.className='welcome-note';body.append(button('街を歩く',close,'primary'));}
function renderUI(){const where=state.actors[P]!.locationId,location=places.get(where)!;const task=occupied();const people=content.actors.filter(a=>a.id!==P&&state.actors[a.id]!.locationId===where&&!moving(a.id));const available=interactions.filter(i=>!i.who&&check(i.visible,state));const observed=content.clues.filter(clue=>clue.locationId===where&&check(clue.visible,state)&&state.actors[P]!.beliefs[clue.propositionId]?.stance==='believe'&&state.facts[clue.propositionId]===true);const signature=JSON.stringify([where,people.map(a=>a.id),available.map(a=>a.id),task?.definitionId,fast,!!moving(P),state.actions.map(a=>a.definitionId),observed.map(c=>c.id)]);
 $('time').textContent=`${String((16+Math.floor((state.tick%14400)/600))%24).padStart(2,'0')}:${String(Math.floor((state.tick%600)/10)).padStart(2,'0')}`;$('day').textContent=`第${Math.floor((state.tick+9600)/14400)+1}日`;
 if(signature===uiSignature)return;uiSignature=signature;$('place-name').textContent=location.name;$('place-description').textContent=descriptions[where]!;
 $('activity').textContent=task?definitions.get(task.definitionId)!.label+'…':fast?'ここで少し待っています。':'足を止めて、あたりを見渡せます。';
 $('people').replaceChildren();for(const person of people){const e=button(person.displayName,()=>talk(person.id),'person');const working=state.actions.find(a=>definitions.get(a.definitionId)!.actorIds.includes(person.id)&&!definitions.get(a.definitionId)!.concurrent);if(working){const small=document.createElement('small');small.textContent=definitions.get(working.definitionId)!.label;e.append(small);}e.disabled=!!moving(P);$('people').append(e);}if(!people.length)paragraph('今は、そばに話せる人がいません。',$('people')).className='empty';
 $('nearby').replaceChildren();for(const i of available){const e=button(i.label,()=>contextAction(i));e.disabled=!!moving(P);$('nearby').append(e);}if(!available.length)paragraph('道の先を見てみよう。',$('nearby')).className='empty';
 $('observations').replaceChildren();for(const clue of observed.slice(-3))paragraph(clue.description,$('observations')).className='empty';$('exits').replaceChildren();for(const id of location.links){const e=button(`${places.get(id)!.name} →`,()=>walk(id));e.disabled=!!task;$('exits').append(e);}
 $('wait').textContent=fast?'待つのをやめる':'少し待つ';$('cancel').hidden=!task||task.definitionId===`hold.${P}`;$('cancel').textContent=task&&definitions.get(task.definitionId)!.movement?'次の道へ進まない':'いまの行動を中断';
}
function tick(){sim.step();state=sim.snapshot();lastTickTime=performance.now();const events=state.events.filter(e=>e.id>seenEvent);seenEvent=state.nextEventId-1;
 for(const event of events){if(event.type==='engine.agreement.accepted'&&!event.actorIds.includes(P)&&event.locationId===state.actors[P]!.locationId)toast(`${content.actors.find(a=>a.id===event.actorIds[0])!.displayName}が提案を受け入れた。`);if(event.type==='engine.action.finished'&&event.actorIds.includes(P)){const i=interactions.find(i=>i.id===event.payload.actionId);if(i)toast(i.id.startsWith('offer.')?`提案した内容：${i.text}`:i.text);}if(event.type==='engine.action.rejected'&&event.actorIds.includes(P)&&state.commandLog.some(c=>c.command.kind==='start'&&c.command.actionId===event.payload.actionId&&c.tick===event.tick)){toast('今は手が空いていないか、状況が変わりました。少し待って、もう一度。');path=[];}
 if(event.type==='engine.information.received'&&event.actorIds.includes(P)&&event.payload.channel==='completion'){toast('その人の暮らしが一歩進んだ。手帳に書き留めた。');fast=false;}}
 if(!occupied()&&path.length&&!state.pending.length)startNextWalk();
 if(state.tick%1200===0)try{saves.autosave(sim);}catch(error){toast(`自動保存できませんでした：${error instanceof Error?error.message:String(error)}`,true);}
 renderUI();}

// Code-native provisional town: geometry used here is the same graph used by the simulation.
const colors=['#a95b3f','#b47554','#557d86','#d09a48','#5d7856','#c28a62','#9f8194','#799c96','#6b6b8e','#8e6e49','#617e72','#b5a056','#b5875b'];
function ellipse(x:number,y:number,rx:number,ry:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(points:number[][],color:string,width:number){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x!,y!):ctx.moveTo(x!,y!));ctx.stroke();}
function tree(x:number,y:number,r:number){line([[x,y],[x,y+24]],'#8b9070',5);ellipse(x,y,r,r*.8,'#acbc89');ellipse(x-r*.28,y-7,r*.75,r*.7,'#bdca9a');}
function house(x:number,y:number,w:number,h:number,roof:string){ellipse(x+8,y+14,w*.64,12,'#869a6d22');ctx.fillStyle='#d7d3b5';ctx.fillRect(x-w/2,y-h,w,h);ctx.fillStyle='#eee6ca';ctx.fillRect(x-w/2+4,y-h+4,w-8,h-4);ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(x-w/2-9,y-h);ctx.lineTo(x,y-h-30);ctx.lineTo(x+w/2+9,y-h);ctx.closePath();ctx.fill();ctx.fillStyle='#647b6f';ctx.fillRect(x-8,y-24,16,24);for(const dx of [-w*.29,w*.29]){ctx.fillStyle='#a4b6a3';ctx.fillRect(x+dx-7,y-h+13,14,16);line([[x+dx,y-h+13],[x+dx,y-h+29]],'#ede6cb',2);}line([[x-w/2,y],[x+w/2,y]],'#b8b79b',2);}
function label(text:string,x:number,y:number){ctx.font='13px "Yu Gothic", sans-serif';const width=ctx.measureText(text).width;ctx.fillStyle='#f7f3e8df';ctx.beginPath();ctx.roundRect(x-width/2-9,y-13,width+18,23,4);ctx.fill();ctx.fillStyle='#536052';ctx.textAlign='center';ctx.fillText(text,x,y+3);}
const staticMap=document.createElement('canvas');staticMap.width=canvas.width;staticMap.height=canvas.height;
function background(){ctx.fillStyle='#e0e5cc';ctx.fillRect(0,0,1120,1020);ctx.fillStyle='#d6ddc0';ctx.fillRect(0,961,1120,59);line([[0,983],[1120,983]],'#a9c3b8',80);for(let x=10;x<1120;x+=74)line([[x,981],[x+32,981]],'#d5e1ce',2);
 for(const p of content.places)for(const other of p.links)if(p.id<other){const q=places.get(other)!;line([[p.x,p.y],[q.x,q.y]],'#c7cdb5',36);line([[p.x,p.y],[q.x,q.y]],'#f0e9d4',29);line([[p.x,p.y],[q.x,q.y]],'#e8e1c9',2);}
 for(let i=0;i<48;i++){const x=28+(i*179)%1070,y=92+(i*263)%820;if(content.places.some(p=>Math.hypot(x-p.x,y-p.y)<105))continue;tree(x,y,14+i%10);}
 house(160,580,85,57,'#9d9d75');house(420,282,94,58,'#ba8e70');house(590,96,83,42,'#9e9c79');house(60,762,75,52,'#ae9c81');house(750,572,112,57,'#b79870');house(1010,576,90,65,'#9a8975');house(1010,325,88,44,'#9a8975');house(750,280,120,58,'#a18c72');house(420,854,90,52,'#9a9c7d');
 line([[123,100],[123,184],[253,184],[253,100]],'#a1ad88',4);line([[122,273],[122,362],[256,362]],'#a1ad88',4);
 ellipse(420,604,35,19,'#b8c3a8');ellipse(420,598,28,15,'#8cafaa');ellipse(420,594,19,9,'#bad1bd');line([[420,592],[420,574]],'#a3b4a1',6);
 ctx.fillStyle='#b8ae8c';ctx.fillRect(680,911,175,25);line([[700,910],[700,826],[771,826]],'#8a8d72',6);line([[767,826],[767,864]],'#787f6c',2);
 for(const p of content.places)label(p.name,p.x,p.y+48);
 staticMap.getContext('2d')!.drawImage(canvas,0,0);
}
function position(id:string,index:number,now:number){const a=state.actors[id]!,p=places.get(a.locationId)!,m=moving(id);let x=p.x,y=p.y;
 if(m){const def=definitions.get(m.definitionId)!,q=places.get(def.movement!.to)!;const fraction=Math.min(1,(m.elapsedTicks+(paused||modal.open?0:Math.min(1,(now-lastTickTime)/100)))/def.durationTicks);x+=(q.x-x)*fraction;y+=(q.y-y)*fraction;}
 else{const locals=content.actors.filter(a=>state.actors[a.id]!.locationId===p.id&&!moving(a.id));const n=locals.findIndex(a=>a.id===id);x+=(n-(locals.length-1)/2)*24;y+=id===P?12:0;
 if((id===D||id===B)&&p.id==='yard'&&state.facts['ben.chasing']){const time=state.tick/12+(paused||modal.open?0:(now-lastTickTime)/1200);x=p.x+Math.cos(time+(id===D?0:1.3))*36;y=p.y+Math.sin(time+(id===D?0:1.3))*15;}}
 return {x,y,color:colors[index%colors.length]!};}
function draw(now:number){ctx.drawImage(staticMap,0,0);ctx.fillStyle='#ac9672';ctx.fillRect(740,state.facts['quay.stable']?890:864,38,25);if(state.facts['quay.stand'])line([[730,918],[730,917],[795,917]],'#6e7e65',6);line(state.facts['garden.open']?[[180,184],[180,162]]:[[180,184],[205,184]],'#9d8264',4);if(state.facts['toy.ready'])ellipse(200,145,5,5,'#bc8c51');if(state.facts['meal.ready']){ellipse(455,316,20,10,'#ac9470');for(const dx of [-10,10])ellipse(455+dx,316,6,4,'#f4edda');}if(path.length){const p=places.get(state.actors[P]!.locationId)!;line([[p.x,p.y],...path.map(id=>{const q=places.get(id)!;return[q.x,q.y];})],'#ba785077',4);}
 content.actors.forEach((actor,index)=>{const {x,y,color}=position(actor.id,index,now);ellipse(x,y+8,11,4,'#4b61452a');if(actor.id===D){ellipse(x,y,10,5,'#a17d56');ellipse(x+7,y-6,5,5,'#af8d63');return;}
 if(actor.id===P){ctx.strokeStyle='#a95b3f';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+8,15,7,0,0,Math.PI*2);ctx.stroke();}
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-7,y-4,14,15,5);ctx.fill();ellipse(x,y-10,6,7,'#d6b38c');ellipse(x,y-15,7,3,color);if(actor.id===P){line([[x+11,y-5],[x+11,y+12]],'#876f4d',2);}
 });}
background();
canvas.onclick=e=>{if(modal.open)return;const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/canvas.width,rect.height/canvas.height),offsetX=(rect.width-canvas.width*scale)/2,offsetY=(rect.height-canvas.height*scale)/2,x=(e.clientX-rect.left-offsetX)/scale,y=(e.clientY-rect.top-offsetY)/scale;const nearest=content.places.toSorted((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]!;if(Math.hypot(nearest.x-x,nearest.y-y)<110){if(nearest.id===state.actors[P]!.locationId){const person=content.actors.find(a=>a.id!==P&&state.actors[a.id]!.locationId===nearest.id&&!moving(a.id));if(person)talk(person.id);}else walk(nearest.id);}};
$('map').onclick=mapMenu;$('inventory').onclick=inventory;$('notebook').onclick=notebook;$('save-menu').onclick=saveMenu;$('help').onclick=()=>help();
$('pause').onclick=()=>{paused=!paused;syncPause();};$('wait').onclick=()=>{fast=!fast;path=[];syncPause();uiSignature='';renderUI();};
$('cancel').onclick=()=>{const a=occupied();if(a){path=[];if(definitions.get(a.definitionId)!.movement)toast('今の道を歩き終えたら、そこで止まります。');else sim.enqueue({kind:'cancel',actorId:P,instanceId:a.id});}};
document.addEventListener('keydown',e=>{if(modal.open||e.repeat)return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key))e.preventDefault();if(key==='escape'){paused=!paused;syncPause();}if(key==='m')mapMenu();if(key==='i')inventory();if(key==='j')notebook();if(key==='e'||key==='enter'){const person=content.actors.find(a=>a.id!==P&&state.actors[a.id]!.locationId===state.actors[P]!.locationId&&!moving(a.id));if(person)talk(person.id);}
 const directions:Record<string,number[]>={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};const dir=directions[key];if(dir){const p=places.get(state.actors[P]!.locationId)!;const candidates=p.links.map(id=>places.get(id)!).map(q=>({q,dot:((q.x-p.x)*dir[0]!+(q.y-p.y)*dir[1]!)/Math.hypot(q.x-p.x,q.y-p.y)})).sort((a,b)=>b.dot-a.dot);if(candidates[0]!.dot>.2)walk(candidates[0]!.q.id);}});
document.addEventListener('visibilitychange',syncPause);
function frame(now:number){const delta=Math.max(0,Math.min(100,now-lastFrame));lastFrame=now;try{clock.advance(delta*(fast?4:1),tick);}catch(error){paused=true;syncPause();toast(`街を一時停止しました：${error instanceof Error?error.message:String(error)}`,true);}draw(now);requestAnimationFrame(frame);}
renderUI();help(true);requestAnimationFrame(frame);
