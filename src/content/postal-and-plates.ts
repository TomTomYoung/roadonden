import type { chapterTools } from './dinner.ts';
import type { ActionEffect } from '../core/types.ts';

type Tools=typeof chapterTools;
export const HUGH='C012', ABEL='C016', BEATRICE='C090';
const ELIAS='C009',IRIS='C015';

export function registerPostalAndPlates({person,object,c,actor,place}:Pick<Tools,'person'|'object'|'c'|'actor'|'place'>){
 person(HUGH,'ヒュー ペイント','a3','住人と取り付け位置を照合し、二枚の棟名札を正しく戻す','薄い文字が原因だと思い、同じ札を塗り重ねている',['hugh.faint']);
 person(ABEL,'エイベル ロック','postDoor','ベアトリスが自分で扉を開け、通れることを確かめる','郵便室の錠を繰り返し調整する',['abel.lock','abel.keyAdvice']);
 person(BEATRICE,'ベアトリス バッグ','postDoor','自分の担当の郵便を仕分け、一束を受渡し棚へ送り出す','郵便の職員。自分で作業台へ寄り、手の届く位置で仕分けたい',['beatrice.work','beatrice.layout']);
 for(const [who,id]of [[ELIAS,'address.elias'],[IRIS,'address.iris']])c.actors.find(a=>a.id===who)!.initialBeliefs.push({propositionId:id!,stance:'believe',reason:'自分の住所と氏名'});
 object('addressElias','エリアスの住所確認札',ELIAS,actor(ELIAS));
 object('addressIris','アイリスの住所確認札',IRIS,actor(IRIS));
 object('plateA','A棟301の棟名札',HUGH,place('H.hall3'));
 object('plateH','H棟301の棟名札',HUGH,place('a3'));
 object('hughBrush','ヒューの塗装道具',HUGH,actor(HUGH));
 object('abelTools','エイベルの調整道具',ABEL,actor(ABEL));
 object('postalTable','高さと足元を調整できる仕分け台',BEATRICE,place('sorting'));
 object('postalBag','青い受持ち札の郵便袋',BEATRICE,place('envelopes'));
 object('postalBundle','ベアトリスの担当する郵便の束',BEATRICE,{kind:'object',id:'postalBag'});
 for(const [who,id]of [[HUGH,'town.addresses'],[ABEL,'post.frontAccess'],[BEATRICE,'post.sorting']]){c.services.push(id!);c.actors.find(a=>a.id===who)!.postGoalContract.serviceIds.push(id!);}
}

export function installPostalAndPlates(t:Tools){
 const {c,P,all,any,fact,at,held,actor,place,set,transfer,emit,together,knows,b,ca,cn,here,accepted,agreement,prop,clue,local,action,rule,auto,interaction,talk,tell,propose,travel,route,walkId,greetings}=t;
 const observe=(who:string,pid:string,where:string):ActionEffect=>({op:'observe',actorIds:[who],propositionId:pid,locationId:where,sourceId:`own.${pid}`});

 // Address records belong to the residents, and travel as physical pieces of paper.
 prop('hugh.faint','ヒューは配達人が迷う原因を、札の文字が薄いせいだと思っている。',true);
 prop('address.elias','エリアス・モスの住所はA棟301。301の数字だけでなく棟名を付ける。',true);
 prop('address.iris','アイリス・ベールの住所は干し場のあるアパート、H棟301。',true);
 local('plates.aMarks','A棟301前の古い留め跡は、いま掛かるH棟の札と合っていない。','a3');
 local('plates.hMarks','H棟301前の古い留め跡は、いま掛かるA棟の札と合っていない。','H.hall3');
 local('plates.checkedA','ヒューがA棟の名札・本人の確認札・古い留め跡を照合した。','a3');
 local('plates.checkedH','ヒューがH棟の名札・本人の確認札・古い留め跡を照合した。','H.hall3');
 local('plates.installedA','ヒューがA棟301の札を元の留め跡へ取り付けた。','a3');
 local('plates.readA','A棟301の名札と棟名を、ヒューが読み直して確かめた。','a3');
 local('plates.installedH','ヒューがH棟301の札を元の留め跡へ取り付けた。','H.hall3');
 local('plates.done','二棟の301を照合し、正しい棟名札と案内が残った。','H.hall3');clue('plates.done','a3');
 for(const [pid,obj]of [['plates.recordA','addressElias'],['plates.recordH','addressIris'],['plates.carryA','plateA'],['plates.carryH','plateH']]){
  prop(pid!,`ヒューの手元に${c.objects.find(o=>o.id===obj)!.name}がある。`,false,held(obj!,actor(HUGH)));
  for(const p of c.places)clue(pid!,p.id,[HUGH],at(HUGH,p.id));
 }
 talk('talk.hugh',HUGH,'何を塗り直しているのか聞く',['hugh.faint'],'「また301を取り違えたらしい。文字を濃くすれば読めると思うんだけどね」');
 for(const [who,key,pid,obj]of [[ELIAS,'elias','address.elias','addressElias'],[IRIS,'iris','address.iris','addressIris']]){
  prop(`address.signed.${key}`,'本人が住所と名前を確認札へ記し、主人公に渡した。');
  for(const p of c.places)clue(`address.signed.${key}`,p.id,[who!],at(who!,p.id));
  talk(`talk.address.${key}`,who!,'棟名と部屋番号を本人に確かめる',[pid!],key==='elias'?'「A棟の301だよ。塗装の確認札なら、ここで書けるよ」':'「H棟の301です。確認札を書けば、出かけたあとも廊下で照合できるでしょう」');
  propose(`address.${key}`,'住所確認札をヒューへ届ける了承をもらう',[who!],{who:who!},'本人が住所と名前を確認札に記す。主人公はヒューへ現物を届ける。訂正後の札はそれぞれの廊下の受取口へ。',knows(P,pid!));
  interaction(`address.sign.${key}`,'本人に住所を記してもらい、確認札を預かる',{who:who!},all(agreement(`address.${key}`,[P,who!]),held(obj!,actor(who!))),[transfer(obj!,actor(who!),actor(P)),set(`address.signed.${key}`)],'本人が棟名・番号・名前を記し、確認札を渡した。ヒューへ現物を届けよう。',18);
  // Signing is a shared physical action, so the resident cannot work or leave mid-signature.
  c.actions.find(a=>a.id===`address.sign.${key}`)!.actorIds.push(who!);
  rule(who!,`address.sign.${key}`,ca(accepted(`address.${key}`),cn(b(`address.signed.${key}`))),150);
  interaction(`address.give.${key}`,`${key==='elias'?'エリアス':'アイリス'}の住所確認札をヒューへ渡す`,{who:HUGH},held(obj!,actor(P)),[transfer(obj!,actor(P),actor(HUGH))],'ヒューが本人の確認札を受け取った。二棟の名札と取り付け位置を照合できる。');
 }
 interaction('plates.lookA','A棟301の名札と古い留め跡を見る',{location:'a3'},held('plateH',place('a3')),[set('plates.aMarks')],'住人の名札はエリアス。H棟と書かれた札の穴が、古い跡からずれている。');
 interaction('plates.lookH','H棟301の名札と古い留め跡を見る',{location:'H.hall3'},held('plateA',place('H.hall3')),[set('plates.hMarks')],'住人の名札はアイリス。A棟の札が掛かり、古い留め跡と合わない。');
 tell('tell.platesA',HUGH,'A棟の札と留め跡のずれを伝える','plates.aMarks','「文字の濃さではなく、取り付ける場所かもしれないな」');
 tell('tell.platesH',HUGH,'H棟でも札と留め跡が合わないと伝える','plates.hMarks','「二枚を取り違えたのか。本人の確認札と、両方の扉を見直そう」');
 propose('plates.check','本人の確認札を持ち、二棟を照合するよう頼む',[HUGH],{who:HUGH},'ヒューが二棟の廊下で名札・住人の確認札・留め跡を照合する。札を現物で運び戻してから、読める状態か確かめる。',all(knows(HUGH,'plates.aMarks'),knows(HUGH,'plates.hMarks'),held('addressElias',actor(HUGH)),held('addressIris',actor(HUGH))));
 auto(HUGH,'hugh.repaint','薄いと思った文字を塗り重ねる','a3',ca(cn(accepted('plates.check')),cn(ca(b('plates.aMarks'),b('plates.hMarks')))),all(fact('plates.done',false),held('plateH',place('a3'))),[emit('plates.repaint',[HUGH],'a3')],60,5);
 travel(HUGH,'a3',ca(accepted('plates.check'),cn(b('plates.checkedA'))),65);
 auto(HUGH,'hugh.checkA','本人の確認札とA棟の名札・留め跡を照合する','a3',ca(accepted('plates.check'),cn(b('plates.checkedA'))),all(held('addressElias',actor(HUGH)),held('plateH',place('a3')),fact('plates.checkedA',false)),[set('plates.checkedA')],22,90);
 travel(HUGH,'H.hall3',ca(b('plates.checkedA'),cn(b('plates.checkedH'))),70);
 auto(HUGH,'hugh.checkH','本人の確認札とH棟の名札・留め跡を照合する','H.hall3',ca(b('plates.checkedA'),cn(b('plates.checkedH'))),all(held('addressIris',actor(HUGH)),held('plateA',place('H.hall3')),fact('plates.checkedH',false)),[set('plates.checkedH')],22,90);
 auto(HUGH,'hugh.takeA','取り違えたA棟の札を外して持つ','H.hall3',ca(b('plates.checkedH'),cn(b('plates.carryA')),cn(b('plates.installedA'))),held('plateA',place('H.hall3')),[transfer('plateA',place('H.hall3'),actor(HUGH))],16,85);
 travel(HUGH,'a3',ca(b('plates.carryA'),cn(b('plates.installedA'))),80);
 auto(HUGH,'hugh.installA','H棟の札を外し、A棟の札を留め跡へ戻す','a3',ca(b('plates.carryA'),cn(b('plates.installedA'))),all(held('plateA',actor(HUGH)),held('plateH',place('a3')),fact('plates.installedA',false)),[transfer('plateH',place('a3'),actor(HUGH)),transfer('plateA',actor(HUGH),place('a3')),set('plates.installedA')],28,95);
 auto(HUGH,'hugh.readA','A棟301の札を読み直し、本人の確認札を受取口へ残す','a3',ca(b('plates.installedA'),cn(b('plates.readA'))),all(held('plateA',place('a3')),held('addressElias',actor(HUGH)),fact('plates.readA',false)),[transfer('addressElias',actor(HUGH),place('a3')),set('plates.readA')],18,95);
 travel(HUGH,'H.hall3',ca(b('plates.readA'),b('plates.carryH'),cn(b('plates.installedH'))),80);
 auto(HUGH,'hugh.installH','H棟の札を元の留め跡へ戻す','H.hall3',ca(b('plates.carryH'),b('plates.readA'),cn(b('plates.installedH'))),all(held('plateH',actor(HUGH)),fact('plates.installedH',false)),[transfer('plateH',actor(HUGH),place('H.hall3')),set('plates.installedH')],24,90);
 auto(HUGH,'hugh.finish','H棟301の札を読み直し、二棟の訂正を記録する','H.hall3',ca(b('plates.installedH'),b('plates.readA'),cn(b('plates.done'))),all(held('plateA',place('a3')),held('plateH',place('H.hall3')),held('addressIris',actor(HUGH)),fact('plates.done',false)),[transfer('addressIris',actor(HUGH),place('H.hall3')),set('plates.done'),emit('life.C012',[HUGH],'H.hall3')],22,90);

 // The doorway, the employee's work and the repairer's confirmation have distinct ends.
 prop('abel.lock','エイベルは正面の扉が重い原因を、錠の調整不足だと思っている。',true);
 prop('abel.keyAdvice','鍵の通常相談は郵便室の工事とは別。持ち主と鍵の保管先を確かめ、管理当番の予備鍵も照合できる。',true);
 prop('beatrice.work','ベアトリスは青い受持ち札の郵便袋を仕分けたい。袋は2階の封入机へ運ばれている。',true);
 prop('beatrice.layout','ベアトリスは台の下へ膝を入れ、袋と仕分け枠へ無理なく手を伸ばせる配置を望んでいる。',true);
 for(const [id,description,location]of [
  ['post.strain','本人の姿勢で引くと、錠は動くのに扉の下端で抵抗が残った。','postDoor'],
  ['post.scrape','扉を引いた軌跡と床の擦れ跡が重なり、下端が当たることを確かめた。','postDoor'],
  ['post.repaired','エイベルが扉の下端を調整し、床へ擦れないようにした。','postDoor'],
  ['post.open','ベアトリスが自分で正面の扉を引いて開けた。','postDoor'],
  ['post.passed','ベアトリスが自分で開けた正面の扉を通り、仕分け室へ入った。','sorting'],
  ['abel.done','エイベルは本人の通行を見届け、扉の改善を確かめた。','postDoor'],
  ['post.admitted','ベアトリスが実際に1階の仕分け室へ入った。','sorting'],
  ['post.tableMoved','仕分け台を低い位置に合わせ、足元の空間を空けた。','sorting'],
  ['post.reachable','ベアトリス自身が台へ寄り、膝と手の届く範囲を確かめた。','sorting'],
  ['post.sorted','ベアトリスが担当する郵便を自分で仕分け、一束にまとめた。','sorting'],
  ['post.sent','仕分けた一束を受渡し棚へ送り出し、配達先を記録した。','mailShelf'],
 ])local(id!,description!,location!);
 // The repairer watches the passage from the threshold; remote actors receive no cue.
 clue('post.passed','postDoor',[ABEL],at(ABEL,'postDoor'));
 c.clues.find(q=>q.id==='see.postDoor.post.scrape')!.observerIds=[P];
 prop('post.permission','ベアトリスは正面扉の改善と、本人の通常の入館での確認を了承している。',false,any(agreement('post.try',[P,ABEL,BEATRICE]),agreement('post.side',[P,BEATRICE])));clue('post.permission','postDoor');
 local('post.bagHere','青い受持ち札の郵便袋が仕分け台へ届いた。','sorting',false,held('postalBag',place('sorting')));
 local('post.holdingBag','ベアトリスが自分の受持ちの郵便袋を手元に置いた。','sorting',false,held('postalBag',actor(BEATRICE)));
 talk('talk.abel',ABEL,'扉のどこを調整しているのか聞く',['abel.lock'],'「錠はよく回るようになったんだが、まだ重いらしい。本人の開け方を一緒に見たいな」');
 talk('talk.abelKeys',ABEL,'普段の鍵の相談をする',['abel.keyAdvice'],'「この工事とは別に相談していいよ。まず持ち主と保管先を。エリアスさんなら、管理当番の予備鍵も確かめてごらん」');
 talk('talk.beatrice',BEATRICE,'本人の仕事と作業しやすい配置を聞く',['beatrice.work','beatrice.layout'],'「青い札の袋が私の担当です。入口だけでなく、台の下に膝が入り、袋に手が届くようにしたいの」');
 propose('post.try','二人と、本人の開け方で扉を試す',[ABEL,BEATRICE],{location:'postDoor'},'ベアトリスが自分の姿勢で扉を引き、エイベルが抵抗の出る箇所を見る。改善後も本人の通常の入館で通りやすさを確かめる。',all(together(P,ABEL,BEATRICE),knows(P,'beatrice.layout'),fact('post.strain',false)));
 action('beatrice.try','本人が扉を引き、エイベルが抵抗を確かめる',[BEATRICE,ABEL],all(at(BEATRICE,'postDoor'),at(ABEL,'postDoor'),agreement('post.try',[P,ABEL,BEATRICE]),fact('post.strain',false)),[set('post.strain')],28);
 rule(BEATRICE,'beatrice.try',ca(here('postDoor'),accepted('post.try'),cn(b('post.strain'))),110);
 auto(ABEL,'abel.oil','錠を調整し、回り具合を試す','postDoor',ca(cn(accepted('post.try')),cn(b('post.scrape')),cn(b('post.repaired'))),fact('post.repaired',false),[emit('post.lockAdjusted',[ABEL],'postDoor')],55,5);
 interaction('post.inspectBottom','引いた軌跡と扉の下端の擦れを見る',{location:'postDoor'},all(knows(P,'post.strain'),fact('post.repaired',false)),[set('post.scrape')],'錠ではなく、下端が床へ当たっている。本人の引いた軌跡とも一致する。',14);
 tell('tell.postScrape',ABEL,'扉の下端と床の擦れ跡を伝える','post.scrape','「本人の引き方で抵抗が出た位置と同じだ。下端を調整しよう」');
 auto(ABEL,'abel.trim','扉の下端を調整し、床との隙間を確かめる','postDoor',ca(b('post.strain'),b('post.scrape'),b('post.permission'),cn(b('post.repaired'))),all(fact('post.strain'),fact('post.scrape'),fact('post.permission'),held('abelTools',actor(ABEL)),fact('post.repaired',false)),[set('post.repaired')],48,100);
 auto(BEATRICE,'beatrice.open','自分で正面の扉を引いて開ける','postDoor',ca(b('post.repaired'),cn(b('post.open')),{op:'any',conditions:[cn(b('post.sent')),b('post.round.3')]}),all(fact('post.repaired'),fact('post.open',false)),[set('post.open')],16,95);
 rule(BEATRICE,walkId(BEATRICE,'postDoor','sorting'),ca(here('postDoor'),b('post.open'),{op:'any',conditions:[cn(b('post.sent')),b('post.round.3')]}),100);
 auto(ABEL,'abel.confirm','本人の開閉と通行を見届け、修理を記録する','postDoor',ca(b('post.passed'),cn(b('abel.done'))),all(fact('post.passed'),fact('post.repaired'),fact('abel.done',false)),[set('abel.done'),emit('life.C016',[ABEL],'postDoor')],18,90);
 propose('post.side','段差のない別入口を本人と選ぶ',[BEATRICE],{who:BEATRICE},'本人が1階の別入口を使い、仕分け室へ進む。正面の修理も了承し、仕事の後の通常の入館で確認する。',all(knows(P,'beatrice.work'),fact('post.admitted',false)));
 travel(BEATRICE,'postSide',ca(accepted('post.side'),cn(here('sorting')),cn(b('post.admitted')),cn(b('post.repaired'))),50);
 rule(BEATRICE,walkId(BEATRICE,'postSide','sorting'),ca(here('postSide'),accepted('post.side'),{op:'any',conditions:[cn(b('post.sent')),b('post.round.3')]}),80);
 propose('post.table','本人と仕分け台・袋の配置を相談する',[BEATRICE],{who:BEATRICE},'台の高さと足元を整え、本人が手の届く範囲を確かめる。主人公は2階の青い札の郵便袋を未開封のまま運ぶ。',all(at(BEATRICE,'sorting'),knows(P,'beatrice.layout')));
 interaction('post.moveTable','本人と台の高さを合わせ、足元を空ける',{who:BEATRICE},all(at(BEATRICE,'sorting'),agreement('post.table',[P,BEATRICE]),fact('post.tableMoved',false)),[set('post.tableMoved')],'台を低い位置に固定し、足元を空けた。本人が寄って確かめる。',24);
 auto(BEATRICE,'beatrice.reach','台へ寄り、膝と手の届く範囲を確かめる','sorting',ca(accepted('post.table'),b('post.tableMoved'),cn(b('post.reachable'))),all(fact('post.tableMoved'),fact('post.reachable',false)),[set('post.reachable')],22,85);
 interaction('post.takeBag','青い受持ち札を照合し、郵便袋を預かる',{location:'envelopes'},all(agreement('post.table',[P,BEATRICE]),knows(P,'beatrice.work'),held('postalBag',place('envelopes'))),[transfer('postalBag',place('envelopes'),actor(P))],'受持ち札を確かめた。未開封の袋を1階の本人の台へ運ぶ。');
 interaction('post.deliverBag','郵便袋を本人の仕分け台へ届ける',{location:'sorting'},all(agreement('post.table',[P,BEATRICE]),held('postalBag',actor(P))),[transfer('postalBag',actor(P),place('sorting'))],'袋を本人の台へ届けた。仕分けはベアトリスが行う。');
 auto(BEATRICE,'beatrice.takeBag','手の届く位置へ自分の郵便袋を寄せる','sorting',ca(b('post.reachable'),b('post.bagHere'),cn(b('post.sorted'))),all(fact('post.reachable'),held('postalBag',place('sorting'))),[transfer('postalBag',place('sorting'),actor(BEATRICE))],12,80);
 auto(BEATRICE,'beatrice.sort','担当する郵便を仕分け、一束にまとめる','sorting',ca(b('post.holdingBag'),b('post.reachable'),cn(b('post.sorted'))),all(held('postalBag',actor(BEATRICE)),held('postalBundle',{kind:'object',id:'postalBag'}),fact('post.reachable'),fact('post.sorted',false)),[transfer('postalBundle',{kind:'object',id:'postalBag'},actor(BEATRICE)),transfer('postalBag',actor(BEATRICE),place('sorting')),set('post.sorted')],55,85);
 travel(BEATRICE,'mailShelf',ca(b('post.sorted'),cn(b('post.sent'))),75);
 auto(BEATRICE,'beatrice.send','仕分けた一束を受渡し棚へ置き、配達先を記録する','mailShelf',ca(b('post.sorted'),cn(b('post.sent'))),all(held('postalBundle',actor(BEATRICE)),fact('post.sent',false)),[transfer('postalBundle',actor(BEATRICE),place('mailShelf')),set('post.sent'),emit('life.C090',[BEATRICE],'mailShelf')],24,90);

 // Ordinary duty continues without another bundle or another quest. A later repair
 // is tried on the next real entry, without calling the employee back from her goal.
 for(let i=0;i<4;i++){prop(`post.round.${i}`,'ベアトリスが自分の通常の巡回順を確認している。',i===0);c.actors.find(a=>a.id===BEATRICE)!.initialBeliefs.push({propositionId:`post.round.${i}`,stance:i===0?'believe':'deny',reason:'通常の受渡し確認の順序'});}
 const phase=(i:number)=>ca(b('post.sent'),b(`post.round.${i}`));
 function advance(id:string,location:string,from:number,to:number,duration:number){
  const a=`post.round.${from}`,z=`post.round.${to}`;
  auto(BEATRICE,id,from===0?'棚の配達記録を確認し、いつもの外回りへ出る':from===2?'正面入口で、次の入館のために戸を確かめる':'いつもの受渡し確認を続ける',location,phase(from),fact(a),[set(a,false),set(z),observe(BEATRICE,a,location),observe(BEATRICE,z,location)],duration,25);
 }
 function ordinaryTravel(to:string,index:number,avoidFrontExit=false){for(const p of c.places){const next=route(p.id,to,(a,z)=>!(avoidFrontExit&&a==='sorting'&&z==='postDoor'))[0];if(next)rule(BEATRICE,walkId(BEATRICE,p.id,next),ca(here(p.id),phase(index)),20);}}
 ordinaryTravel('mailShelf',0);advance('beatrice.readDispatch','mailShelf',0,1,160);
 ordinaryTravel('back.4',1,true);advance('beatrice.outside','back.4',1,2,8);
 ordinaryTravel('postDoor',2);advance('beatrice.nextEntry','postDoor',2,3,100);
 // A repaired front door takes priority over the side route. No stair is used.
 for(const from of ['postDoor','back.4']){const next=route(from,'postSide')[0]!;rule(BEATRICE,walkId(BEATRICE,from,next),ca(here(from),phase(3),cn(b('post.repaired'))),30);}
 advance('beatrice.continueWork','sorting',3,0,12);
 Object.assign(greetings,{
  [HUGH]:'「301の札を濃く塗ったのに、まだ行き先を間違えるらしいんだ」',
  [ABEL]:'「錠を滑らかにしても重い。本人がどの姿勢で開けるか、確かめてみたい」',
  [BEATRICE]:'「自分の担当の仕分けを進めたいの。入口と、台まで寄れる場所を相談できますか」',
 });
}
