import { blockPlaces, blockPlaceById, travelTicks } from './block.ts';
import { registerRoomsAndSleep, installRoomsAndSleep, FINN, SAM, OSCAR } from './rooms-and-sleep.ts';
import { registerPostalAndPlates, installPostalAndPlates, BEATRICE } from './postal-and-plates.ts';
import {registerNightwatch,installNightwatch} from './nightwatch-and-routes.ts';
import {registerQuietNeighbours,installQuietNeighbours} from './quiet-neighbours.ts';
import { check } from '../core/conditions.ts';
import type { WorldState } from '../core/types.ts';
import type { ActionDefinition, ActionEffect, ChoiceGuard, Condition, Content, Custody, ResidentDefinition } from '../core/types.ts';

// Original character IDs and motives are retained. Times, geometry and dialogue are provisional.
export const P = 'player', N = 'C001', O = 'C002', K = 'C003', B = 'C004', M = 'C005', R = 'C006', C = 'C007', L = 'C008', W = 'C045', T = 'C054', F = 'C064', D = 'animal.dog.nora';
const yes: Condition = { op: 'always' };
export const all = (...conditions: Condition[]): Condition => ({ op: 'all', conditions });
export const any = (...conditions: Condition[]): Condition => ({ op: 'any', conditions });
export const not = (condition: Condition): Condition => ({ op: 'not', condition });
export const fact = (propositionId: string, value = true): Condition => ({ op: 'fact', propositionId, value });
export const at = (actorId: string, locationId: string): Condition => ({ op: 'at', actorId, locationId });
const held = (objectId: string, custody: Custody): Condition => ({ op: 'custody', objectId, custody });
const actor = (id: string): Custody => ({ kind: 'actor', id });
const place = (id: string): Custody => ({ kind: 'place', id });
const set = (propositionId: string, value = true): ActionEffect => ({ op: 'fact', propositionId, value });
const transfer = (objectId: string, from: Custody, to: Custody): ActionEffect => ({ op: 'transfer', objectId, from, to });
const emit = (type: string, actorIds: string[], locationId: string): ActionEffect => ({ op: 'emit', type, actorIds, locationId, subjectIds: [] });
const together = (...actorIds: string[]): Condition => ({ op: 'together', actorIds });
const knows = (actorId: string, propositionId: string): Condition => ({ op: 'belief', actorId, propositionId, stance: 'believe' });
const b = (propositionId: string, value = true): ChoiceGuard => ({ op: 'belief', propositionId, stance: value ? 'believe' : 'deny' });
const ca = (...conditions: ChoiceGuard[]): ChoiceGuard => ({ op: 'all', conditions });
const cn = (condition: ChoiceGuard): ChoiceGuard => ({ op: 'not', condition });
const here = (locationId: string): ChoiceGuard => ({ op: 'here', locationId });
const accepted = (agreementId: string): ChoiceGuard => ({ op: 'accepted', agreementId, version: 1 });
const agreement = (agreementId: string, actorIds: string[]): Condition => ({ op: 'agreement', agreementId, version: 1, actorIds });

export const dinnerContent: Content = {
  version: 'town-0.7.0', namespace: 'redesign-v1', tickMs: 100, ticksPerDay: 14400,
  places: blockPlaces, propositions: [], actors: [], objects: [], resources: ['table:home','work:quay','lift:O'], services: ['home.receipt','market.shelf','shoe.box'], clues: [], loans: [], agreements: [], actions: [],
};
const c = dinnerContent;
function prop(id: string, description: string, initialValue = false, derived?: Condition) { c.propositions.push({ id, description, initialValue, ...(derived ? { derived } : {}) }); }
function clue(id: string, locationId: string, observerIds?: string[], visible: Condition = yes) { c.clues.push({ id: `see.${locationId}.${id}`, locationId, propositionId: id, visible, description: c.propositions.find(p => p.id === id)!.description, automatic: true, ...(observerIds ? {observerIds} : {}) }); }
function local(id: string, description: string, location: string, initial = false, derived?: Condition) { prop(id,description,initial,derived); clue(id,location); }
function person(id: string,name: string,locationId: string,goal: string,normalLife: string,memories: string[] = []) {
  const a: ResidentDefinition = { id,displayName:name,kind:id===P?'player':id===D?'animal':'resident',locationId,
    sourceRef: id===P?'doc/01-product-spec.md':id===D?'doc/04-world-and-scenarios.md':`doc/adaptation/residents-001-100.md#${id.toLowerCase()}-${name.replaceAll(' ','-')}`,
    normalLife,goal,initialBeliefs:memories.map(propositionId=>({propositionId,stance:'believe',reason:'本人の用件・記憶'})),rules:[],goalEvidence:id===P||id===D?[]:[id===N||id===O||id===K?'family.dinner':`life.${id}`],postGoalContract:{version:1,serviceIds:id===N?['home.receipt']:id===M?['market.shelf']:id===L?['shoe.box']:[]} };
  c.actors.push(a); return a;
}
function object(id:string,name:string,ownerId:string,custody:Custody,quantity=1,consumable=false) { c.objects.push({id,name,ownerId,custody,quantity,unit:consumable?'束':'点',portable:true,consumable}); }
function action(id:string,label:string,actorIds:string[],startGuard:Condition,onSuccess:ActionEffect[],durationTicks=12,extra:Partial<ActionDefinition>={}) {
  const a:ActionDefinition = {id,label,actorIds,durationTicks,startGuard,maintainGuard:startGuard,finishGuard:startGuard,resources:[],onSuccess,onAbort:[],recovery:null,movement:null,presentationId:id,designStatus:'provisional',rationale:'集合住宅版の生活動線を検証する試作の所要時間・位置',...extra};
  c.actions.push(a);return a;
}
function rule(who:string,id:string,choiceGuard:ChoiceGuard,priority=50,mode:'problem'|'ordinary'|'always'='always') {
  c.actors.find(a=>a.id===who)!.rules.push({id:`rule.${id}.${who}.${c.actors.find(a=>a.id===who)!.rules.length}`,actionId:id,choiceGuard,priority,retryTicks:6,mode});
}
function auto(who:string,id:string,label:string,location:string,choiceGuard:ChoiceGuard,guard:Condition,effects:ActionEffect[],duration=12,priority=50,extra:Partial<ActionDefinition>={}) {
  action(id,label,[who],all(at(who,location),guard),effects,duration,extra); rule(who,id,ca(here(location),choiceGuard),priority);
}
export interface Interaction { id:string; label:string; who?:string; location?:string; visible:Condition; text:string }
export const interactions:Interaction[]=[];
function interaction(id:string,label:string,where:{who?:string;location?:string},guard:Condition,effects:ActionEffect[],text:string,duration=8,concurrent=false) {
  const proximity = where.who ? together(P,where.who) : at(P,where.location!);
  const physical=concurrent?yes:fact('quay.playerHolding',false);
  action(id,label,[P],all(proximity,guard,physical),effects,duration,{concurrent,resources:where.who?[`presence:${where.who}`]:[]});
  interactions.push({id,label,...where,visible:all(proximity,guard,physical),text});
}
function talk(id:string,who:string,label:string,props:string[],text:string,guard:Condition=yes) {
  interaction(id,label,{who},all(guard,...props.map(pid=>knows(who,pid))),props.map(propositionId=>({op:'inform',speakerId:who,recipientId:P,propositionId})),text,2,true);
}
function tell(id:string,who:string,label:string,pid:string,text:string) { interaction(id,label,{who},knows(P,pid),[{op:'inform',speakerId:P,recipientId:who,propositionId:pid}],text,2,true); }
function propose(id:string,label:string,participants:string[],where:{who?:string;location?:string},terms:string,guard:Condition=yes) {
  c.agreements.push({id,version:1,proposerId:P,participantIds:[P,...participants],terms});
  interaction(`offer.${id}`,label,where,all(guard,not(agreement(id,[P,...participants]))),participants.map(recipientId=>({op:'offer',speakerId:P,recipientId,agreementId:id})),terms,2,true);
  for (const who of [P,...participants]) {
    const aid=`accept.${id}.${who}`;
    action(aid,`${label}：返答する`,[who],all({op:'offered',actorId:who,agreementId:id,version:1},not(agreement(id,[who]))),[{op:'accept',actorId:who,agreementId:id,version:1}],2,{concurrent:true});
    rule(who,aid,ca({op:'offered',agreementId:id,version:1},cn(accepted(id))),200);
  }
}

prop('dinner.plan','ノラは今夜、家族三人で食べて今日の話を聞きたい。',true);
prop('order.details','メイベル食品店に支払済みの野菜の包みが取り置かれている。',true);
prop('ruth.reason','ルースは借りた大鍋の柄を焦がしたと伝えたい。',true);
prop('ralph.worry','ラルフは見本と違う紙人形では話が伝わらないと思っている。',true);
prop('leo.policy','貸し靴はシャッター外の返却箱へ。閉店後も利用できる。',true);
local('delivery.allowed','ノラは注文の代理受取りを了承した。','home',false,agreement('delivery',[P,N]));
local('package.collected','取り置き棚の包みは受取り済みになっている。','market');
local('ingredients.received','ノラは野菜の包みを実際に受け取った。','home');
local('meal.ready','小鍋の料理ができた。食卓で家族を待っている。','home');
local('dinner.done','三人で食べ、キットの紙人形と今日の話を楽しんだ。','home');
local('nora.shoes','ノラの手元に履ける靴がある。','home',false,any(held('shoes',actor(N)),held('loanShoes',actor(N))));
local('family.here','三人が食卓にそろった。','home',false,all(at(N,'home'),at(O,'home'),at(K,'home')));
local('home.package','受取棚に野菜の包みが置かれている。','home',false,held('package',place('home')));
local('home.shoes','受取棚に元の外履きが置かれている。','home',false,held('shoes',place('home')));
local('loan.held','ノラは貸し靴を持っている。','home',false,held('loanShoes',actor(N)));
local('mabel.locked','メイベル食品店は外出のため施錠されている。','market');
local('mabel.closed','メイベルは受領を確認し、店じまいを終えた。','market');
local('mabel.package','メイベルが配達する包みを持っている。','market',false,held('package',actor(M)));
prop('mabel.empty','メイベルの配達用の手荷物はなくなった。',false,not(held('package',actor(M))));clue('mabel.empty','home',undefined,at(M,'home'));
local('ben.chasing','ベンが追うと、犬は遊びだと思って逃げる。','yard',true);
local('dog.looksback','立ち止まると犬も止まり、こちらを振り返った。','yard');
local('garden.open','共用囲いの入口が開いている。','yard');clue('garden.open','garden');
local('toy.ready','いつもの玩具が共用囲いの入口から見えるところにある。','garden');clue('toy.ready','yard',undefined,fact('garden.open'));
local('dog.inside','犬が共用囲いの中に入った。','garden',false,at(D,'garden'));clue('dog.inside','yard',undefined,fact('garden.open'));
local('dog.dropped','犬は靴を口から放した。','garden');clue('dog.dropped','yard',undefined,fact('garden.open'));
local('dog.settled','ベンが追わずに囲いの戸を閉め、犬が落ち着いた。','garden');
local('ruth.paused','ルースは鍋を磨く手を止めた。','ruth');
local('ruth.repaired','大鍋の柄を取り替えた。','ruth');
local('ruth.returned','ルースは鍋を返し、柄を焦がした事情を話した。','home');
local('celia.curtain','食卓の目隠しが下りている。','celia');
local('celia.ate','セリアは自分の食事を済ませた。','celia');
local('leo.box','返却箱と閉店後の案内が店先に設けられた。','shoe');
local('leo.closed','レオが靴店の戸締まりを終えた。','shoe');
local('leo.danced','レオは二階のスタジオで踊りの練習を始めた。','upstairs');
local('quay.clear','受け台を置く場所が空いている。','quay');
local('quay.flag','同じ青い合図札が三人に見える場所に出ている。','quay');
local('quay.agreed','三人が合図と中止条件を確認した。','quay',false,agreement('quay',[P,O,W,T]));
local('quay.stand','タッサが受け台を置き、脚を確かめた。','quay');
local('quay.owenHolding','オーウェンが荷を支えている。','quay',true);
local('quay.playerHolding','主人公が荷を支えている。両手を離せない。','quay');
local('quay.stable','荷は受け台に載り、誰も手で支えていない。','quay');
local('quay.winchFree','パーシーは機構を空け、共通の合図を掲示した。','quay');
local('quay.toolsAway','タッサは補助具を収めた。','quay');
local('school.understood','試演で紙人形の話が伝わると確かめられた。','school');
local('school.repaired','紙人形の傷んだ一か所を補修した。','school');
local('school.portioned','持ち帰る紙人形と、残して仕上げる分を分けた。','school');
local('school.canGo','キットは自分の紙人形を持ち帰れる。','school',false,held('kitPuppet',actor(K)));
local('school.kitHere','キットは活動室にいる。','school',false,at(K,'school'));
local('school.playerHere','主人公は活動室にいる。','school',false,at(P,'school'));

person(P,'あなた','inn','街を歩き、住民の暮らしに関わる','短期入居でA棟の管理人室を訪れた人');
person(N,'ノラ フィンチ','home','三人で夕食を食べ、話を聞く','家族との時間を楽しむ',['dinner.plan','order.details']);
person(O,'オーウェン フィンチ','quay','帰宅して家族と夕食をとる','雑居ビルの共同搬入口で荷下ろしを手伝う');
person(K,'キット フィンチ','school','自作の紙人形を家族に見せながら食べる','放課後に雑居ビル202の活動室で紙人形を作る');
person(B,'ベン ハート','yard','犬を共用囲いへ戻し落ち着かせる','犬の世話をする');
person(M,'メイベル グリーン','market','最後の取り置きの受領を知り店じまいする','雑居ビル101で食料品店を営む',['order.details']);
person(R,'ルース クレイ','ruth','借りた鍋を返して事情を話す','隣人と貸し借りする',['ruth.reason']);
person(C,'セリア ウッド','celia','落ち着いて自分の食事をする','B棟201で、自分の距離感を守って暮らす');
person(L,'レオ ブーツ','shoe','靴店を閉めて踊りを練習する','靴の修理と貸出を行う',['leo.policy']);
person(W,'パーシー リフト','quay','荷を降ろし機構を空け合図を残す','共同搬入口の巻上げ設備を扱う');
person(T,'タッサ リグ','quay','受け台を整え荷の安定後に補助具を収める','三階の共同工房から受け台を貸し出し、搬入を手伝う');
person(F,'ラルフ パペット','school','自分の紙人形で話が伝わると確かめる','紙人形を作る',['ralph.worry']);
person(D,'ノラの犬','yard','慣れた共用囲いで落ち着く','ベンに追いかけ遊びを誘う');
object('shoes','ノラの外履き',N,actor(D));object('loanShoes','レオの貸し靴',L,place('shoe'));
object('package','支払済みの野菜の包み',N,place('market'),1,true);
object('smallPot','ノラの小鍋',N,place('home'));
object('bigPot','借りた大鍋',N,actor(R));object('handle','交換用の柄',R,place('ruth'),1,true);
object('toy','犬のいつもの玩具',N,place('garden'));
object('kitPuppet','キットの紙人形',K,place('school'));object('ralphPuppet','ラルフの紙人形',F,actor(F));object('paper','補修用の紙',F,place('school'),3,true);
object('cargo','降ろしかけの荷',W,place('quay'));object('stand','荷物の受け台',T,place('quay'));object('basket','脇の保管籠',T,place('quay'));object('clutter','受け台の場所にある空箱',T,place('quay'));object('flag','青い合図札',W,place('quay'));
c.loans!.push({id:'shoes',objectId:'loanShoes',lenderId:L,borrowerId:N,returnLocationId:'shoe',policy:'帰宅後は家の棚から運び、閉店後もシャッター外の返却箱へ。'});
c.loans!.push({id:'pot',objectId:'bigPot',lenderId:N,borrowerId:R,returnLocationId:'home',policy:'ノラへ現物を返し、柄のことを話す。',initiallyBorrowed:true});

export const E='C009',DA='C010',BE='C011',AG='C025';
person(E,'エリアス モス','a1','自分の部屋へ入り椅子に座る','玄関と中庭で鍵を探す',['elias.coat','elias.wantsHome']);
person(DA,'ドーラ モス','inn','エリアスの入室を確かめ、夜回りを終えて休む','管理当番として表と裏を回る',['dora.spare']);
person(BE,'ベス ペイン','pawn','預かり先を決め、母と茶を飲む','番号付きの預かり品店を営む',['beth.foundKey']);
person(AG,'アグネス ペイン','agnes','娘と同じ卓で茶を飲み、休む','こもれび荘で娘の帰りを待つ',['agnes.waits']);
object('eliasCoat','内ポケットを縫い直したエリアスの上着',E,place('pawn'));
object('eliasKey','上着に入っていたエリアスの鍵',E,{kind:'object',id:'eliasCoat'});
object('spareKey','ドーラの予備鍵',DA,actor(DA));
c.services.push('pawn.box','elias.keyReturn');
c.actors.find(a=>a.id===BE)!.postGoalContract.serviceIds.push('pawn.box');
c.actors.find(a=>a.id===E)!.postGoalContract.serviceIds.push('elias.keyReturn');
c.loans!.push({id:'spareKey',objectId:'spareKey',lenderId:DA,borrowerId:E,returnLocationId:'a301',policy:'入室後、A棟301の施錠された返却口へ。管理当番を休息から呼び戻さない。'});

registerRoomsAndSleep({person,object,c,actor,place});
registerPostalAndPlates({person,object,c,actor,place});
registerNightwatch({person,object,c,actor,place});
registerQuietNeighbours({person,object,c,actor,place});
c.resources.push(...c.actors.map(a=>`presence:${a.id}`));
// Walks reserve the moving person. No teleporting, no other actor controlled by the UI.
export function walkId(who:string,from:string,to:string) { return `walk.${who}.${from}.${to}`; }
for(const who of c.actors.map(a=>a.id).filter(id=>id!==FINN)) for(const from of c.places) for(const toId of from.links) {
  const to=c.places.find(p=>p.id===toId)!;
  const gate = (from.id==='yard'&&toId==='garden')||(from.id==='garden'&&toId==='yard');
  const guard=all(at(who,from.id),who===P?fact('quay.playerHolding',false):yes,who===O?fact('quay.owenHolding',false):yes,gate?any(fact('garden.open'),fact('dog.settled')):yes,
    [from.id,toId].includes('scaffold')&&[from.id,toId].includes('iris')?fact('iris.returnOpen'):yes,
    who===SAM&&from.id==='scaffold'?fact(toId==='iris'?'iris.returnOpen':'sam.externalReady'):yes,
    toId==='nell'&&(who===P||who===OSCAR)?any(fact('bell.fixed'),agreement('bell.entry',[P,'C013',OSCAR])):yes,
    who===BEATRICE&&!(blockPlaceById.get(from.id)!.floor<=1&&blockPlaceById.get(toId)!.floor<=1)?not(yes):yes,
    who===BEATRICE&&from.id==='postDoor'&&toId==='sorting'?all(fact('post.repaired'),fact('post.open')):yes,
    who===BEATRICE&&from.id==='postSide'&&toId==='sorting'?agreement('post.side',[P,BEATRICE]):yes);
  const effects:ActionEffect[]=[{op:'move',actorId:who,to:toId}];
  if(who===BEATRICE&&toId==='sorting'&&(from.id==='postDoor'||from.id==='postSide'))effects.push(set('post.admitted'));
  if(who===BEATRICE&&from.id==='postDoor'&&toId==='sorting')effects.push(set('post.passed'),set('post.open',false),emit('post.selfEntry',[BEATRICE],'sorting'));
  action(walkId(who,from.id,toId),`${to.name}へ${who===BEATRICE?'車椅子で進む':'歩く'}`,[who],guard,effects,travelTicks(from.id,toId),{movement:{actorId:who,from:from.id,to:toId},resources:[`presence:${who}`,...([from.id,toId].includes('liftGround')&&[from.id,toId].includes('liftUpper')?['lift:O']:[])]});
}
const placeIndex=new Map(c.places.map(p=>[p.id,p]));
const pathsTo=new Map<string,Map<string,string>>();
export function route(from:string,to:string,passable?:(from:string,to:string)=>boolean):string[] {
 if(!placeIndex.has(from)||!placeIndex.has(to))return [];
 let next=passable?undefined:pathsTo.get(to);
 if(!next){next=new Map();const queue=[to],seen=new Set([to]);for(let i=0;i<queue.length;i++)for(const id of placeIndex.get(queue[i]!)!.links)if(!seen.has(id)&&(!passable||passable(id,queue[i]!))){seen.add(id);next.set(id,queue[i]!);queue.push(id);}if(!passable)pathsTo.set(to,next);}
 const result:string[]=[];let at=from;while(at!==to){const hop=next.get(at);if(!hop)return [];result.push(hop);at=hop;}return result;
}
function travel(who:string,to:string,guard:ChoiceGuard,priority=20) { for(const from of c.places) { const next=route(from.id,to)[0];if(next)rule(who,walkId(who,from.id,next),ca(here(from.id),guard),priority); } }

// Nora, the paid order and two independent kinds of shoes.
talk('talk.nora',N,'夕食の予定を聞く',['dinner.plan','order.details'],'「今夜は201号室で三人そろって食べたいの。雑居ビル一階の食品店に包みを取り置いてもらってあるわ。外履きは犬が中庭へ持っていってしまって……」');
propose('delivery','包みを代わりに受け取る許可をもらう',[N],{who:N},'注文は支払済みの野菜一包み。代理受取りと、ノラへの配達を了承する。',knows(P,'order.details'));
talk('talk.permission',N,'代理受取りの了承を確かめる',['delivery.allowed'],'「お願い。メイベルには、支払済みの野菜一包みと伝えてね」',fact('delivery.allowed'));
tell('tell.order',M,'ノラの注文内容を伝える','order.details','「ノラの野菜の包みね。ここに取り置いてあるわ」');
tell('tell.permission',M,'ノラの代理受取りの了承を伝える','delivery.allowed','「ノラが了承しているのね。届けたら、受け取ったと教えてちょうだい」');
interaction('take.package','取り置きの包みを預かる',{who:M},all(knows(M,'delivery.allowed'),knows(M,'order.details'),held('package',place('market'))),[transfer('package',place('market'),actor(P)),set('package.collected')],'包みを預かった。届けた後は受領の返事をメイベルへ。');
interaction('deliver.package','野菜の包みを手渡す',{who:N},held('package',actor(P)),[transfer('package',actor(P),actor(N)),set('ingredients.received')],'ノラが包みを受け取った。料理を始められる。');
interaction('shelf.package','留守の受取棚に包みを置く',{location:'home'},all(held('package',actor(P)),not(at(N,'home'))),[transfer('package',actor(P),place('home'))],'包みを受取棚へ置いた。受領の返事は、ノラが受け取ってから。');
tell('tell.receipt',M,'ノラが包みを受け取ったと伝える','ingredients.received','「受け取ったのね。これで今日の店じまいができるわ」');
propose('mabel.delivery','メイベル自身に配達を頼む',[M],{who:M},'店を施錠して包みを運ぶ。ノラの受領を確かめた後で店じまいを終える。',all(knows(M,'delivery.allowed'),held('package',place('market'))));
auto(M,'mabel.take','配達する包みを持つ','market',ca(accepted('mabel.delivery'),cn(b('package.collected'))),held('package',place('market')),[transfer('package',place('market'),actor(M)),set('package.collected')]);
auto(M,'mabel.lock','外出前に店を施錠する','market',ca(b('mabel.package'),cn(b('mabel.locked'))),all(held('package',actor(M)),fact('mabel.locked',false)),[set('mabel.locked')]);
travel(M,'home',ca(accepted('mabel.delivery'),b('mabel.package'),b('mabel.locked'),cn(b('mabel.empty'))));
auto(M,'mabel.deliver','ノラに包みを手渡す','home',accepted('mabel.delivery'),all(held('package',actor(M)),at(N,'home')),[transfer('package',actor(M),actor(N)),set('ingredients.received')]);
auto(M,'mabel.shelf','ノラの受取棚に包みを置く','home',accepted('mabel.delivery'),all(held('package',actor(M)),not(at(N,'home'))),[transfer('package',actor(M),place('home'))]);
travel(M,'market',ca(b('mabel.empty'),b('ingredients.received')));
auto(M,'mabel.close','受領を確認して店じまいを終える','market',ca(b('ingredients.received'),cn(b('mabel.closed'))),fact('mabel.closed',false),[set('mabel.closed'),emit('life.C005',[M],'market')],20);
auto(N,'nora.shelf','受取棚の包みを受け取る','home',b('home.package'),held('package',place('home')),[transfer('package',place('home'),actor(N)),set('ingredients.received')],8,90);
auto(N,'nora.ownShoes','棚の外履きを受け取る','home',b('home.shoes'),held('shoes',place('home')),[transfer('shoes',place('home'),actor(N))],8,90);
for(const obj of ['shoes','loanShoes']) interaction(`give.${obj}`,`${obj==='shoes'?'外履き':'貸し靴'}を渡す`,{who:N},held(obj,actor(P)),[transfer(obj,actor(P),actor(N))],'ノラに靴を手渡した。');
interaction('shelf.shoes','ノラの外履きを受取棚に返す',{location:'home'},held('shoes',actor(P)),[transfer('shoes',actor(P),place('home'))],'外履きをいつもの受取棚へ返した。');
travel(N,'market',ca(b('nora.shoes'),cn(b('ingredients.received')),cn(b('package.collected'))));
auto(N,'nora.collect','取り置いた野菜を受け取る','market',b('nora.shoes'),held('package',place('market')),[transfer('package',place('market'),actor(N)),set('package.collected'),set('ingredients.received'),{op:'observe',actorIds:[N],propositionId:'ingredients.received',locationId:'market',sourceId:'own.receipt'}],12,80);
// Receipt at the shop is visible to Mabel only while she is physically present.
clue('ingredients.received','market',undefined,all(at(N,'market'),held('package',actor(N))));
travel(N,'home',b('package.collected'));
auto(N,'nora.cook','小鍋で夕食を作る','home',ca(b('ingredients.received'),cn(b('meal.ready'))),all(held('package',actor(N)),fact('meal.ready',false)),[{op:'consume',objectId:'package',quantity:1,unit:'束'},set('meal.ready')],40,70);
auto(N,'nora.releaseLoan','使い終えた貸し靴を返却用の棚へ置く','home',ca(b('loan.held'),b('ingredients.received')),held('loanShoes',actor(N)),[transfer('loanShoes',actor(N),place('home'))],8,85);
propose('loan.nora','ノラに貸し靴を提案する',[N],{who:N},'レオの通常貸出の靴を借りる。帰宅後、シャッター外の返却箱へ戻す。');
talk('talk.leo',L,'貸出と返却先について聞く',['leo.policy'],'「貸し靴はあの棚。ノラが使うなら構わない。返却は店先の箱へ。閉店後も使えるよ」');
propose('loan.leo','ノラの貸し靴を借りる約束をする',[L],{who:L},'ノラに貸し靴一足を貸す。主人公が運び、閉店後も店先へ返せる。',agreement('loan.nora',[P,N]));
interaction('borrow.shoes','合意した貸し靴を預かる',{location:'shoe'},all(agreement('loan.nora',[P,N]),agreement('loan.leo',[P,L]),held('loanShoes',place('shoe')),not({op:'loan',loanId:'shoes',status:'borrowed'})),[transfer('loanShoes',place('shoe'),actor(P)),{op:'loan',loanId:'shoes',status:'borrowed'}],'借りた靴を預かった。所有者はレオ、使う人はノラ。返却先は店先の箱。');
interaction('pickup.loan','返却用の棚から貸し靴を預かる',{location:'home'},held('loanShoes',place('home')),[transfer('loanShoes',place('home'),actor(P))],'使い終えた貸し靴を預かった。');
interaction('return.loan','貸し靴をシャッター外の返却箱へ返す',{location:'shoe'},all(held('loanShoes',actor(P)),{op:'loan',loanId:'shoes',status:'borrowed'}),[transfer('loanShoes',actor(P),place('shoe')),{op:'loan',loanId:'shoes',status:'returned'}],'貸し靴を返した。レオをスタジオから呼び戻す必要はない。');
for(const who of [O,K]) tell(`tell.dinner.${who}`,who,'ノラの夕食の予定を伝える','dinner.plan','「三人で食べるんだね。ここが片付いたら帰るよ」');
action('family.dinner','食卓で食べ、紙人形の話を聞く',[N,O,K],all(at(N,'home'),at(O,'home'),at(K,'home'),fact('meal.ready'),fact('dinner.done',false),held('kitPuppet',actor(K))),[set('dinner.done'),emit('family.dinner',[N,O,K],'home')],65,{resources:['table:home']});
rule(N,'family.dinner',ca(here('home'),b('family.here'),b('meal.ready'),cn(b('dinner.done'))),40);

// Ben and the dog: the garden, stopping pursuit, and toy are separate prerequisites.
interaction('dog.watch','追わずに立ち止まって犬を見る',{location:'yard'},fact('dog.settled',false),[set('dog.looksback')],'犬も止まり、こちらを振り返った。ベンが追うとまた走り出す。',20);
propose('ben.stop','ベンに、いったん追うのをやめようと提案する',[B],{who:B},'追いかけずに待つ。囲いの戸を開け、いつもの玩具へ犬を誘う。');
auto(B,'ben.stop','追うのをやめて待つ','yard',ca(accepted('ben.stop'),b('ben.chasing')),fact('ben.chasing'),[set('ben.chasing',false)],8,70);
interaction('garden.open','囲いの戸を開ける',{location:'yard'},fact('garden.open',false),[set('garden.open')],'囲いの戸を開けた。');
interaction('toy.place','玩具を共用囲いの入口から見える場所へ置く',{location:'garden'},fact('toy.ready',false),[set('toy.ready')],'共用囲いにあった、いつもの玩具を見える位置へ置いた。');
rule(D,walkId(D,'yard','garden'),ca(here('yard'),b('ben.chasing',false),b('garden.open'),b('toy.ready')),70);
const dogwalk=c.actions.find(a=>a.id===walkId(D,'yard','garden'))!;dogwalk.startGuard=all(dogwalk.startGuard,fact('ben.chasing',false),fact('toy.ready'));dogwalk.maintainGuard=dogwalk.startGuard;dogwalk.finishGuard=dogwalk.startGuard;
auto(D,'dog.drop','共用囲いで靴を放す','garden',cn(b('dog.dropped')),held('shoes',actor(D)),[transfer('shoes',actor(D),place('garden')),set('dog.dropped')],8,70);
// Shoe recovery alone is intentionally not Ben's completion.
interaction('dog.takeShoe','止まった犬から外履きをそっと受け取る',{location:'yard'},all(fact('ben.chasing',false),held('shoes',actor(D))),[transfer('shoes',actor(D),actor(P))],'外履きは回収できた。犬を共用囲いへ戻す世話はまだ残っている。');
auto(D,'dog.noShoe','玩具のそばに落ち着く','garden',cn(b('dog.dropped')),all(not(held('shoes',actor(D))),fact('dog.dropped',false)),[set('dog.dropped')],8,65);
rule(B,walkId(B,'yard','garden'),ca(here('yard'),b('dog.inside'),b('dog.dropped'),b('ben.chasing',false)),60);
auto(B,'ben.close','犬を追わずに囲いの戸を閉める','garden',ca(b('dog.inside'),b('dog.dropped'),cn(b('dog.settled'))),all(at(D,'garden'),fact('dog.dropped'),fact('ben.chasing',false),fact('dog.settled',false)),[set('garden.open',false),set('dog.settled'),emit('life.C004',[B],'garden')],15);
interaction('pickup.shoes','囲いに置かれた外履きを拾う',{location:'garden'},held('shoes',place('garden')),[transfer('shoes',place('garden'),actor(P))],'ノラの外履きを拾った。');

// The quay: physical support remains until the same load rests on a stable stand.
for(const who of [O,P]) {
 const pid=who===O?'quay.owenHolding':'quay.playerHolding';
 action(`hold.${who}`,'荷を両手で支える',[who],all(at(who,'quay'),fact(pid)),[],1_000_000,{resources:[`hand:${who}:left`,`hand:${who}:right`]});
 rule(who,`hold.${who}`,ca(here('quay'),b(pid)),120);
}
interaction('quay.takeover','オーウェンの代わりに荷を支える',{location:'quay'},fact('quay.owenHolding'),[set('quay.owenHolding',false),set('quay.playerHolding')],'荷を支えた。受け台へ降ろすまで、両手を離して歩けない。',12);
interaction('quay.clear','空箱を脇へ寄せて受け台の場所を空ける',{location:'quay'},fact('quay.clear',false),[transfer('clutter',place('quay'),{kind:'object',id:'basket'}),set('quay.clear')],'空箱を脇の保管籠へ寄せ、受け台の場所を空けた。',18);
interaction('quay.flag','青い合図札を三人から見える位置に出す',{location:'quay'},fact('quay.flag',false),[set('quay.flag')],'共通の合図札を出した。合図と中止条件を三人と確認しよう。');
propose('quay','三人と、同じ合図と中止条件を確認する',[O,W,T],{location:'quay'},'青札でゆっくり下ろす。受け台が動く、声が届かない、誰かが中止を求めたら支えたまま待つ。');
// The player may take over before preparation. The other workers can still do their jobs.
auto(T,'tassa.clear','受け台の場所の空箱を脇へ寄せる','quay',ca(accepted('quay'),b('quay.clear',false)),fact('quay.clear',false),[transfer('clutter',place('quay'),{kind:'object',id:'basket'}),set('quay.clear')],18,80);
auto(W,'percy.flag','合意した青い合図札を出す','quay',ca(accepted('quay'),b('quay.flag',false)),fact('quay.flag',false),[set('quay.flag')],12,80);
auto(T,'tassa.stand','受け台を据えて脚を確かめる','quay',ca(b('quay.clear'),accepted('quay'),cn(b('quay.stand'))),all(fact('quay.clear'),agreement('quay',[P,O,W,T]),fact('quay.stand',false)),[set('quay.stand')],20,70);
action('quay.lower','合図を合わせ、荷を受け台へ移す',[W,T],all(at(W,'quay'),at(T,'quay'),fact('quay.flag'),fact('quay.stand'),agreement('quay',[P,O,W,T]),any(fact('quay.owenHolding'),fact('quay.playerHolding')),fact('quay.stable',false)),[transfer('cargo',place('quay'),{kind:'object',id:'stand'}),set('quay.stable'),set('quay.owenHolding',false),set('quay.playerHolding',false)],30,{resources:['work:quay']});
rule(W,'quay.lower',ca(here('quay'),b('quay.flag'),b('quay.stand'),b('quay.agreed'),cn(b('quay.stable'))),65);
auto(W,'percy.finish','機構を空け、共通の合図を掲示する','quay',ca(b('quay.stable'),cn(b('quay.winchFree'))),all(fact('quay.stable'),fact('quay.winchFree',false)),[set('quay.winchFree'),emit('life.C045',[W],'quay')],18);
auto(T,'tassa.finish','補助具を収納する','quay',ca(b('quay.stable'),cn(b('quay.toolsAway'))),all(fact('quay.stable'),fact('quay.toolsAway',false)),[set('quay.toolsAway'),emit('life.C054',[T],'quay')],18);
travel(O,'home',ca(b('quay.stable'),b('quay.owenHolding',false),b('dinner.plan')));

// The paper puppets: a real short performance or an agreed split, not a remote completion.
talk('talk.ralph',F,'紙人形のことを聞く',['ralph.worry'],'「見本と少し違うんだ。これじゃ、話が伝わらないかもしれない」');
propose('school.trial','短い場面を演じて確かめようと提案する',[F],{who:F},'見本と違っても、短い場面を一度演じ、見ている人に伝わるか確かめる。');
propose('school.repair','傷んだ一か所を補修して試そうと提案する',[F],{who:F},'手元の紙を一束使い、傷んだ部分だけ直す。直した後は試演して確かめる。');
propose('school.tomorrow','続きは明日、持ち帰る分を分けようと提案する',[K,F],{location:'school'},'残りは明日仕上げる。キットの紙人形を分けて持ち帰り、ラルフの分はここに残す。',all(at(K,'school'),at(F,'school')));
auto(F,'ralph.patch','傷んだ紙人形を補修する','school',ca(accepted('school.repair'),cn(b('school.repaired'))),all(fact('school.repaired',false),{op:'quantity',objectId:'paper',minimum:1}),[{op:'consume',objectId:'paper',quantity:1,unit:'束'},set('school.repaired')],20,80);
const trialChoice:ChoiceGuard={op:'any',conditions:[accepted('school.trial'),b('school.repaired')]};
for(const spectator of [K,P]) {
 const id=`ralph.trial.${spectator}`;
 action(id,'紙人形で短い場面を演じる',[F,spectator],all(at(F,'school'),at(spectator,'school'),fact('school.understood',false),any(agreement('school.trial',[P,F]),fact('school.repaired')),spectator===P?not(at(K,'school')):yes),[set('school.understood'),emit('life.C064',[F],'school')],25);
 rule(F,id,ca(here('school'),trialChoice,cn(b('school.understood')),b(spectator===K?'school.kitHere':'school.playerHere'),...(spectator===P?[b('school.kitHere',false)]:[])),60);
}
action('school.partition','持ち帰る紙人形を分ける',[K,F],all(at(K,'school'),at(F,'school'),held('kitPuppet',place('school')),any(fact('school.understood'),agreement('school.tomorrow',[P,K,F]))),[transfer('kitPuppet',place('school'),actor(K)),set('school.portioned')],12);
rule(K,'school.partition',ca(here('school'),cn(b('school.portioned')),{op:'any',conditions:[b('school.understood'),accepted('school.tomorrow')]}),55);
travel(K,'home',ca(b('school.canGo'),b('dinner.plan')));

// Ruth's apology is an actual return and conversation, including after dinner.
propose('ruth.explain','磨く手を止めて、事情を話そうと提案する',[R],{who:R},'大鍋はそのまま返し、柄を焦がした事情をノラへ自分の言葉で伝える。');
propose('ruth.repair','交換用の柄で直してから返そうと提案する',[R],{who:R},'ルースの了承のうえ、手元の交換用の柄を使う。その後、ノラへ返して事情を話す。');
auto(R,'ruth.pause','鍋を磨く手を止める','ruth',{op:'any',conditions:[accepted('ruth.explain'),accepted('ruth.repair')]},fact('ruth.paused',false),[set('ruth.paused')],8,80);
auto(R,'ruth.repair','大鍋の柄を取り替える','ruth',ca(b('ruth.paused'),accepted('ruth.repair'),cn(b('ruth.repaired'))),all(fact('ruth.repaired',false),{op:'quantity',objectId:'handle',minimum:1}),[{op:'consume',objectId:'handle',quantity:1,unit:'束'},set('ruth.repaired')],30,70);
travel(R,'home',ca(b('ruth.paused'),{op:'any',conditions:[accepted('ruth.explain'),b('ruth.repaired')]}));
action('ruth.return','鍋を返し、柄の事情を話す',[R,N],all(at(R,'home'),at(N,'home'),held('bigPot',actor(R)),fact('ruth.returned',false)),[transfer('bigPot',actor(R),actor(N)),{op:'loan',loanId:'pot',status:'returned'},{op:'inform',speakerId:R,recipientId:N,propositionId:'ruth.reason'},set('ruth.returned'),emit('life.C006',[R],'home')],25);
rule(R,'ruth.return',ca(here('home'),b('ruth.paused'),cn(b('ruth.returned'))),60);

// Celia eats for herself. The companion / caller role must actually be maintained.
propose('celia.privacy','目隠しを下ろして食事にしようと提案する',[C],{who:C},'窓の目隠しを下ろす。セリアは自分の席で、落ち着いて食べる。');
propose('celia.company','セリアの席で食事に付き合うと申し出る',[C],{who:C},'セリアが望むなら、食事の間ここで一緒に過ごす。途中で離れたら、待ってからやり直せる。');
propose('celia.callers','食事の間、来客の用件を受けると申し出る',[C],{who:C},'主人公が玄関で用件を預かる間、セリアは食べる。主人公が離れたら食事をいったん止める。');
auto(C,'celia.curtain','窓の目隠しを下ろす','celia',ca(accepted('celia.privacy'),cn(b('celia.curtain'))),fact('celia.curtain',false),[set('celia.curtain')],12,70);
for(const role of ['company','callers']) {
 interaction(`celia.role.${role}`,role==='company'?'食事の間、一緒に席にいる':'食事の間、玄関で用件を預かる',{location:'celia'},all(agreement(`celia.${role}`,[P,C]),fact('celia.ate',false)),[],'ここでしばらく過ごす。用事があれば中断して、あとから再開できる。',55);
 const playerRole=c.actions.find(a=>a.id===`celia.role.${role}`)!;
 playerRole.maintainGuard=all(at(P,'celia'),agreement(`celia.${role}`,[P,C]));playerRole.finishGuard=playerRole.maintainGuard;
 const roleActive:Condition={op:'active',actionId:`celia.role.${role}`};
 action(`celia.eat.${role}`,'落ち着いて食事をする',[C],all(at(C,'celia'),at(P,'celia'),roleActive,fact('celia.ate',false)),[set('celia.ate'),emit('life.C007',[C],'celia')],32);
 rule(C,`celia.eat.${role}`,ca(here('celia'),accepted(`celia.${role}`),cn(b('celia.ate'))),50);
}
auto(C,'celia.eat.privacy','目隠しの内側で食事をする','celia',ca(b('celia.curtain'),cn(b('celia.ate'))),all(fact('celia.curtain'),fact('celia.ate',false)),[set('celia.ate'),emit('life.C007',[C],'celia')],32,60);

// Leo's own evening is independent of Daniel's long boots and of the loan-shoe return.
propose('leo.box','返却箱と案内を用意して閉店しようと提案する',[L],{who:L},'ダニエルの長靴は返却箱へ。案内を出して閉店し、二階のスタジオで踊りを練習できる。貸し靴の返却口も残す。');
auto(L,'leo.box','返却箱と閉店後の案内を用意する','shoe',ca(accepted('leo.box'),cn(b('leo.box'))),fact('leo.box',false),[set('leo.box')],18,70);
auto(L,'leo.close','靴店を施錠する','shoe',ca(b('leo.box'),cn(b('leo.closed'))),fact('leo.closed',false),[set('leo.closed')],15,60);
travel(L,'upstairs',b('leo.closed'),50);
auto(L,'leo.dance','二階のスタジオで踊りの練習を始める','upstairs',ca(b('leo.closed'),cn(b('leo.danced'))),fact('leo.danced',false),[set('leo.danced'),emit('life.C008',[L],'upstairs')],30);

export const greetings:Record<string,string>={
 [N]:'「夕食の支度をしたいの。二人にも今夜のことを伝えられるかしら」',
 [O]:'「A棟の201へ帰りたいんだけど、搬入口の荷を支えている。台が来るまで、ここを離れられないんだ」',
 [K]:'「活動室で作った紙人形を、家で見せたい。ラルフと持ち帰る分を決めたら、A棟へ帰れるんだけど」',
 [B]:'「戻っておいで！ ……追うほど逃げるんだ。共用囲いにはいつもの玩具があるんだけど」',
 [M]:'「最後の取り置きが、ちゃんと届いたと分かったら店じまいできるわ」',
 [R]:'「借りた大鍋の柄を焦がしてしまって。磨いても、なかなか……」',
 [C]:'「この窓、共用廊下に面しているでしょう。通る人のたびに片付けてしまって。落ち着いて食べたいだけなの」',
 [L]:'「返る長靴を待っているんだ。シャッターを下ろせたら、二階の貸しスタジオで踊りの練習をしたい」',
 [W]:'「この荷を下ろして機構を空けたい。合図をそろえて、受け台へ移そう」',
 [T]:'「台を置く場所が空けば準備できる。下ろす人と支える人が同じ合図を見なくちゃ」',
 [F]:'「見本と少し違うんだ。この紙人形で、話が伝わるだろうか」',
 [D]:'犬は外履きをくわえ、追いかけ遊びを待っている。',
};

// Closed rooms: ownership, a communicated rendezvous, real keys and a shared tea.
prop('elias.coat','エリアスの上着は紺色で、内ポケットを白い糸で縫い直してある。',true);
prop('elias.wantsHome','エリアスは自分のA棟301へ帰り、椅子に座りたい。',true);
prop('dora.spare','ドーラはA棟301の予備鍵を管理している。',true);
prop('beth.foundKey','預かった紺色の上着の内ポケットから鍵が出た。',true);
prop('agnes.waits','アグネスは起きていて、娘ベスと茶を飲むのを待っている。',true);
local('key.matched','縫い直した内ポケットと本人の説明を照合し、鍵の持ち主を確かめた。','pawn');
local('key.stored','上着と預かり記録を番号付き保管箱へ移した。','coatBox');clue('key.stored','pawn');
local('beth.closed','受取先を残し、ベスは店じまいを終えた。','pawn');
local('tea.done','母娘が同じ茶の卓で、互いの話を聞きながら茶を飲んだ。','agnes');
local('elias.unlocked','エリアスが自分で鍵を使い、部屋の扉を開けた。','a301');
local('elias.entered','エリアスは自分の椅子に座り、帰宅を終えた。','a301');
local('dora.rested','ドーラは入室を確認し、夜回りを終えて休んだ。','doraRest');
prop('front.agreed','エリアスは管理人室で待ち、ドーラから予備鍵を借りると約束した。',false,agreement('elias.wait',[P,E]));
prop('key.consent','エリアスは本人確認のうえ、上着の鍵を代理で受け取ることを了承した。',false,agreement('elias.key',[P,E]));
prop('elias.hasKey','エリアスは自分の鍵か管理人の予備鍵を手元に持っている。',false,any(held('eliasKey',actor(E)),held('spareKey',actor(E))));
// A person notices their own carried object; others still need local observation/testimony.
for(const location of c.places)clue('elias.hasKey',location.id,[E],at(E,location.id));
local('beth.atTable','ベスが母の茶の卓へ来た。','agnes',false,at(BE,'agnes'));
local('dora.lent','ドーラはエリアスへ予備鍵を渡した。','inn');
local('elias.boxKey','エリアスの鍵がA棟301の返却口に届いている。','a301',false,held('eliasKey',place('a301')));
local('elias.ownKey','エリアスが元の鍵を受け取っている。','a301',false,held('eliasKey',actor(E)));

talk('talk.elias',E,'最後に上着を着たときのことを聞く',['elias.coat','elias.wantsHome'],'「白い糸で縫った内ポケットの上着を、商店街のベスの店に預けたよ。鍵を落としたのは、そのあとかな……」');
talk('talk.dora',DA,'予備鍵と見回りについて聞く',['dora.spare'],'「予備鍵は私が持っています。エリアスさんを探して裏へ出ると、今度は表へ戻ったと聞くのです」');
talk('talk.beth',BE,'上着と鍵の預かり状況を聞く',['beth.foundKey'],'「紺の上着から鍵が出てきたの。持ち主を確かめたい。母はもう寝たかしら……」');
talk('talk.agnes',AG,'娘を待っているのか聞く',['agnes.waits'],'「まだ起きていますよ。ベスと茶を飲みたいの。忙しいと思うと、声をかけづらくて」');
propose('elias.key','鍵の本人確認と代理受取りを申し出る',[E],{who:E},'エリアスの説明と上着を照合して鍵を預かる。本人へ渡すか、先に帰宅した場合はA棟301の返却口へ届ける。',knows(P,'elias.coat'));
propose('elias.wait','管理人室で待ち、予備鍵を借りる約束をする',[E],{who:E},'エリアスは管理人室で待つ。主人公がドーラへ待合せを伝え、本人が来てから予備鍵を借りる。鍵は入室後、A棟301の返却口へ。');
for(const location of c.places){clue('key.consent',location.id,[E],all(at(E,location.id),agreement('elias.key',[P,E])));clue('front.agreed',location.id,[E],all(at(E,location.id),agreement('elias.wait',[P,E])));}
talk('confirm.key.consent',E,'鍵の受取りの了承を確かめる',['key.consent'],'「本人確認ができたら、鍵をお願い。先に部屋へ帰れたら、玄関の返却口に入れておいて」',agreement('elias.key',[P,E]));
talk('talk.front',E,'待合せの場所を確かめる',['front.agreed'],'「管理人室で待つよ。ドーラさんへ伝えてもらえるかな」',agreement('elias.wait',[P,E]));
tell('tell.front',DA,'エリアスが管理人室で待つと伝える','front.agreed','「本人が待っているのですね。管理人室へ戻ります」');
tell('tell.coat',BE,'上着の持ち主と内ポケットの特徴を伝える','elias.coat','「白い糸の内ポケットね。現物と照合してみるわ」');
tell('tell.keyConsent',BE,'鍵の代理受取りの了承を伝える','key.consent','「エリアスさんの了承もあるのね。確認できた鍵を受け取ってください」');
tell('tell.agnes',BE,'母が起きて茶を待っていると伝える','agnes.waits','「起きて待ってくれているのね。受取場所を残してから、母に会いに行くわ」');
tell('tell.entered',DA,'エリアスが椅子に座ったと伝える','elias.entered','「部屋へ帰れたのですね。見回りを終えて、私も休めます」');

auto(BE,'beth.compare','内ポケットと本人の説明を照合する','pawn',ca(b('elias.coat'),cn(b('key.matched'))),all(fact('key.matched',false),held('eliasCoat',place('pawn'))),[set('key.matched')],22,80);
interaction('take.eliasKey','本人確認済みの鍵を預かる',{who:BE},all(fact('key.matched'),knows(BE,'key.consent'),held('eliasKey',{kind:'object',id:'eliasCoat'}),held('eliasCoat',place('pawn'))),[transfer('eliasKey',{kind:'object',id:'eliasCoat'},actor(P))],'エリアスの鍵を預かった。本人へ渡すか、帰宅後の返却口へ。');
local('beth.carrying','ベスは上着を保管箱へ運んでいる。','pawn',false,held('eliasCoat',actor(BE)));clue('beth.carrying','coatBox',[BE]);
auto(BE,'beth.prepareStore','上着と記録を保管箱へ運ぶために持つ','pawn',ca(b('agnes.waits'),cn(b('key.stored')),cn(b('beth.carrying'))),all(fact('key.stored',false),held('eliasCoat',place('pawn'))),[transfer('eliasCoat',place('pawn'),actor(BE))],12,70);
travel(BE,'coatBox',ca(b('beth.carrying'),cn(b('key.stored'))),75);
auto(BE,'beth.store','上着と記録を番号付き保管箱へ収める','coatBox',ca(b('beth.carrying'),cn(b('key.stored'))),all(fact('key.stored',false),held('eliasCoat',actor(BE))),[transfer('eliasCoat',actor(BE),place('coatBox')),set('key.stored')],25,85);
travel(BE,'pawn',ca(b('key.stored'),cn(b('beth.closed'))),70);
auto(BE,'beth.close','受取案内を出して店じまいする','pawn',ca(b('key.stored'),cn(b('beth.closed'))),fact('beth.closed',false),[set('beth.closed')],18,60);
travel(BE,'agnes',ca(b('beth.closed'),b('agnes.waits')),60);
interaction('box.identify','預かり記録と内ポケットを照合する',{location:'coatBox'},all(knows(P,'elias.coat'),knows(P,'key.consent'),held('eliasCoat',place('coatBox')),fact('key.matched',false)),[set('key.matched')],'番号と縫い直したポケットが一致した。ベスを母の部屋から呼び戻す必要はない。',18);
interaction('box.key','保管箱から確認した鍵を預かる',{location:'coatBox'},all(fact('key.matched'),knows(P,'key.consent'),held('eliasCoat',place('coatBox')),held('eliasKey',{kind:'object',id:'eliasCoat'})),[transfer('eliasKey',{kind:'object',id:'eliasCoat'},actor(P))],'保管記録を残して鍵を預かった。');
interaction('give.eliasKey','元の鍵をエリアスへ手渡す',{who:E},held('eliasKey',actor(P)),[transfer('eliasKey',actor(P),actor(E))],'エリアスは自分の鍵を受け取った。部屋へ帰るところを見届けよう。');
interaction('return.eliasKey','元の鍵を301号室の返却口へ届ける',{location:'a301'},all(held('eliasKey',actor(P)),fact('elias.entered')),[transfer('eliasKey',actor(P),place('a301'))],'元の鍵を本人の返却口へ。帰宅をやり直してもらう必要はない。');
travel(E,'inn',ca(accepted('elias.wait'),cn(b('elias.hasKey')),cn(b('elias.entered'))),80);
travel(DA,'inn',ca(b('front.agreed'),cn(b('dora.lent')),cn(b('elias.entered'))),80);
action('dora.lend','本人へ予備鍵を渡し、返却口を確認する',[DA,E],all(at(DA,'inn'),at(E,'inn'),knows(DA,'front.agreed'),agreement('elias.wait',[P,E]),held('spareKey',actor(DA)),not(held('eliasKey',actor(E))),fact('elias.entered',false)),[transfer('spareKey',actor(DA),actor(E)),{op:'loan',loanId:'spareKey',status:'borrowed'},set('dora.lent')],18);
rule(DA,'dora.lend',ca(here('inn'),b('front.agreed'),cn(b('dora.lent')),cn(b('elias.entered'))),100);
travel(E,'a301',ca(b('elias.hasKey'),cn(b('elias.entered'))),100);
auto(E,'elias.unlock','自分の鍵で扉を開ける','a301',ca(b('elias.hasKey'),cn(b('elias.unlocked'))),all(any(held('eliasKey',actor(E)),held('spareKey',actor(E))),fact('elias.unlocked',false)),[set('elias.unlocked')],12,90);
auto(E,'elias.sit','上着掛けの隣の椅子に座り、帰宅を終える','a301',ca(b('elias.unlocked'),cn(b('elias.entered'))),all(fact('elias.unlocked'),fact('elias.entered',false)),[set('elias.entered'),emit('life.C009',[E],'a301')],30,80);
local('elias.hasSpare','エリアスは予備鍵を持っている。','a301',false,held('spareKey',actor(E)));
auto(E,'elias.returnSpare','借りた予備鍵を玄関の返却口へ戻す','a301',ca(b('elias.entered'),b('elias.hasSpare')),held('spareKey',actor(E)),[transfer('spareKey',actor(E),place('a301')),{op:'loan',loanId:'spareKey',status:'returned'}],8,75);
auto(E,'elias.receiveKey','届いた元の鍵を返却口から受け取る','a301',ca(b('elias.entered'),b('elias.boxKey')),held('eliasKey',place('a301')),[transfer('eliasKey',place('a301'),actor(E))],8,85);
travel(DA,'a301',ca(b('dora.lent'),cn(b('elias.entered'))),70);
travel(DA,'doraRest',ca(b('elias.entered'),cn(b('dora.rested'))),90);
auto(DA,'dora.rest','見回りを記録して椅子で休む','doraRest',ca(b('elias.entered'),cn(b('dora.rested'))),all(fact('elias.entered'),fact('dora.rested',false)),[set('dora.rested'),emit('life.C010',[DA],'doraRest')],35,80);
action('mother.tea','母娘が同じ卓で茶を飲み、今日の話をする',[BE,AG],all(at(BE,'agnes'),at(AG,'agnes'),fact('beth.closed'),fact('key.stored'),fact('tea.done',false)),[set('tea.done'),emit('life.C011',[BE],'agnes'),emit('life.C025',[AG],'agnes')],55);
rule(AG,'mother.tea',ca(here('agnes'),b('beth.atTable'),cn(b('tea.done'))),80);
// Their search really follows connected paths. A communicated rendezvous stops it.
function searchLoop(who:string,points:string[],stop:ChoiceGuard){
 for(let index=0;index<points.length;index++){
  const pid=`search.${who}.${index}`,next=`search.${who}.${(index+1)%points.length}`,location=points[index]!;
  prop(pid,`${c.actors.find(a=>a.id===who)!.displayName}は次の捜索先を確かめている。`,index===0);
  c.actors.find(a=>a.id===who)!.initialBeliefs.push({propositionId:pid,stance:index===0?'believe':'deny',reason:'自分の捜索順序'});
  const selfObserve=(propositionId:string):ActionEffect=>({op:'observe',actorIds:[who],propositionId,locationId:location,sourceId:`own.search.${who}`});
  auto(who,`search.pause.${who}.${index}`,'足元とポケットを調べ、次の場所を思い出す',location,ca(b(pid),cn(stop)),fact(pid),[set(pid,false),set(next),selfObserve(pid),selfObserve(next)],70,10);
  travel(who,location,ca(b(pid),cn(stop)),10);
 }
}
searchLoop(E,['a1','street','quay'],{op:'any',conditions:[accepted('elias.wait'),accepted('elias.key'),b('elias.hasKey'),b('elias.entered'),ca(accepted('address.elias'),cn(b('address.signed.elias')))]});
searchLoop(DA,['inn','quay','street'],{op:'any',conditions:[b('front.agreed'),b('elias.entered')]});
Object.assign(greetings,{
 [E]:'「鍵が見つからない。表でドーラさんを探すと、今度は裏へ回ったって……」',
 [DA]:'「エリアスさんの帰宅を確かめたら、私も夜回りを終えたいのです」',
 [BE]:'「上着のポケットから鍵が出たの。どなたの品か、もう一度照合しなくちゃ」',
 [AG]:'「ベスは忙しいでしょうね。でも今夜は、一緒に茶を飲めたら」',
});

// Chapter modules use the same evidence, ownership and path machinery as dinner.
export const chapterTools={person,object,c,P,yes,all,any,not,fact,at,held,actor,place,set,transfer,emit,together,knows,b,ca,cn,here,accepted,agreement,prop,clue,local,action,rule,auto,interaction,talk,tell,propose,travel,searchLoop,greetings,route,walkId};
installPostalAndPlates(chapterTools);
installNightwatch(chapterTools);
installQuietNeighbours(chapterTools);
installRoomsAndSleep(chapterTools);
const movementDefinitions=new Map(c.actions.filter(a=>a.movement?.actorId===P).map(a=>[a.id,a]));
// Route preview respects today's doors. Every edge is checked again when walked.
export function playerRoute(from:string,to:string,state:WorldState){
 return route(from,to,(a,b)=>check(movementDefinitions.get(walkId(P,a,b))!.startGuard,{...state,actors:{...state.actors,[P]:{...state.actors[P]!,locationId:a}}}));
}
