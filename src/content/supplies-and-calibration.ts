import type {chapterTools} from './dinner.ts';
import {seen} from './journeys.ts';
type Tools=typeof chapterTools;
export const GILES='C026',ELSIE='C034',LENA='C057';
export function registerSupplies({person,object,c,place}:Pick<Tools,'person'|'object'|'c'|'actor'|'place'>){
 person(GILES,'ジャイルズ クラスト','bakery','食べられる初釜を焼き、客が受け取って食べたことを確かめる','焼け跡を粉の配合のせいだと思っている',['bread.flourWorry']);
 person(ELSIE,'エルシー リネン','bakeYard','洗った寝具を乾かして畳み、今日の洗濯を終える','排気口へ寝具を寄せて干し直している',['elsie.warmth','cloth.policy']);
 person(LENA,'レナ メジャー','instruments','指定された基準で三つの計器を確認し、返却棚へ分けて試験を終える','三つの時計を互いの基準として合わせ直している',['lena.loop','pad.policy','gauge.policy']);
 for(const [id,name,who,where]of [
  ['beddingA','洗った寝具の一束目',ELSIE,'bakeYard'],['beddingB','洗った寝具の二束目',ELSIE,'bakeYard'],['privacyCloth','貸出用の乾いた目隠し布',ELSIE,'dryCloth'],['coverCloth','貸出用の乾いた覆い布',ELSIE,'dryCloth'],
  ['vibrationPads','鍵盤の脚に敷く防振用の当て物',LENA,'finished'],['ovenGauge','固定目盛と取付穴を照合する確認具',LENA,'finished'],['referenceClock','指定先と照合して持ち帰る基準時計',LENA,'instruments'],['repairOrder','基準時計の指定を記した依頼票',LENA,'instruments'],['calibrationReport','三つの計器の確認記録',LENA,'instruments'],
  ['clockA','預かり時計・青札',LENA,'instruments'],['clockB','預かり時計・赤札',LENA,'instruments'],['clockC','預かり時計・緑札',LENA,'instruments'],['postalClock','依頼主が指定した郵便室の時計',LENA,'postDoor'],['ovenDial','取付位置のずれた窯の目盛板',GILES,'bakery'],['breadNotice','初釜と通常の受取りの案内札',GILES,'bakery']
 ] as const)object(id,name,who,place(where));
 c.objects.find(o=>o.id==='postalClock')!.portable=false;
 object('firstFlour','店にある初釜一回分の粉',GILES,place('bakery'),1,true);
 object('breadSample','初釜の試食分',GILES,place('bakery'),1,true);
 object('breadStock','初釜の残りの切り分け分',GILES,place('bakery'),3,true);
 for(const id of ['breadSample','breadStock'])c.objects.find(o=>o.id===id)!.unit='切れ';
 c.objects.find(o=>o.id==='firstFlour')!.unit='釜分';
 for(const [id,objectId,lenderId,returnLocationId,policy]of [
  ['privacy','privacyCloth',ELSIE,'dryCloth','目隠しに使う乾いた予備布。使用者の了承を得て設置し、畳んで地上の返却口へ。'],
  ['padding','vibrationPads',LENA,'finished','双方が了承した試奏で確かめる。演奏を止めて取り外し、計器とは別の貸出棚へ。'],
  ['ovenGauge','ovenGauge',LENA,'finished','窯の固定目盛と取付穴を照合する確認具。使用後は貸出棚へ。']
 ] as const)c.loans!.push({id,objectId,lenderId,borrowerId:'player',returnLocationId,policy});
 for(const [who,id]of [[GILES,'bakery.counter'],[ELSIE,'laundry.returnShelf'],[LENA,'instruments.supplyShelf']]){c.services.push(id!);c.actors.find(a=>a.id===who)!.postGoalContract.serviceIds.push(id!);}
}
export function installSupplies(t:Tools){
 const {c,P,yes,all,any,not,fact,at,held,actor,place,set,transfer,emit,knows,b,ca,cn,here,accepted,agreement,prop,clue,local,action,rule,auto,interaction,talk,tell,propose,travel,greetings}=t;
 prop('elsie.warmth','エルシーは寝具を排気口へ近づけるほど乾くと思っている。',true);
 prop('bread.flourWorry','ジャイルズは同じ場所の焼け過ぎを新しい粉のせいだと思っている。',true);
 local('heat.traced','寝具の位置で排気が滞り、パン屋と干し場の空気の通りがつながっている。','bakeYard');c.clues.at(-1)!.observerIds=[P];
 local('heat.compared','二人が排気口の布と通り道を直接見比べた。','bakeYard');
 const clear=all(not(held('beddingA',place('bakeYard'))),not(held('beddingB',place('bakeYard'))));
 local('heat.clear','寝具が排気口から離れ、空気の通り道が空いた。','bakeYard',false,clear);clue('heat.clear','smallDry');clue('heat.clear','bakery');
 local('heat.checked','ジャイルズが空いた排気の通りを実際に確かめた。','bakeYard');clue('heat.checked','bakery');
 local('elsie.collected','エルシーが排気口の寝具を二束とも自分の手に戻した。','bakeYard');
 local('elsie.finished','二束の寝具が乾いて畳まれ、エルシーが今日の洗濯を終えた。','dryCloth');
 talk('talk.elsie',ELSIE,'暖かい場所へ干し直す理由を聞く',['elsie.warmth'],'「暖かいほうへ寄せているのに、なかなか乾かないの。寝具とは別に、乾いた貸出用の布もありますよ」');
 talk('talk.giles',GILES,'粉を替えて焼き直す理由を聞く',['bread.flourWorry'],'「配合を替えても同じ端が焼け過ぎるんだ。次の一釜の粉は店にあるよ」');
 interaction('heat.inspect','排気口の布と空気の通りを調べる',{location:'bakeYard'},yes,[set('heat.traced')],'寝具が排気口に寄り、通り道を狭めている。二人に現場で確かめてもらおう。',15);
 for(const [who,key]of [[ELSIE,'elsie'],[GILES,'giles']] as const){tell(`tell.heat.${key}`,who,'排気口の布と空気の通りを伝える','heat.traced','「自分でもその位置で確かめてみましょう」');propose(`heat.${key}`,key==='elsie'?'パン屋と確かめ、少量ずつ干すことを相談する':'干し場で排気の通りを一緒に確かめる',[who],{who},'二人が現場で布と空気の通りを確かめる。寝具を一束ずつ干し、排気口と人の通路を空ける。',knows(who,'heat.traced'));travel(who,'bakeYard',ca(accepted(`heat.${key}`),cn(b('heat.compared'))),70);}
 auto(ELSIE,'elsie.retry','寝具の端を掛け直し、まだ湿っている所を確かめる','bakeYard',cn(accepted('heat.elsie')),all(held('beddingA',place('bakeYard')),fact('heat.compared',false)),[emit('laundry.stillDamp',[ELSIE],'bakeYard')],65,3);
 auto(GILES,'giles.retry','残った焼け跡を見て、配合のメモを書き直す','bakery',cn(accepted('heat.giles')),fact('bread.baked',false),[emit('bakery.recipeRetry',[GILES],'bakery')],65,3);
 action('heat.compare','布の位置と排気の通りを二人で見比べる',[ELSIE,GILES],all(at(ELSIE,'bakeYard'),at(GILES,'bakeYard'),agreement('heat.elsie',[P,ELSIE]),agreement('heat.giles',[P,GILES]),held('beddingA',place('bakeYard')),fact('heat.compared',false)),[set('heat.compared')],28);rule(ELSIE,'heat.compare',ca(here('bakeYard'),accepted('heat.elsie'),cn(b('heat.compared'))),100);
 auto(ELSIE,'elsie.collect','排気口の寝具を二束とも取り、通りを空ける','bakeYard',ca(b('heat.compared'),cn(b('elsie.collected'))),all(fact('heat.compared'),held('beddingA',place('bakeYard')),held('beddingB',place('bakeYard'))),[transfer('beddingA',place('bakeYard'),actor(ELSIE)),transfer('beddingB',place('bakeYard'),actor(ELSIE)),set('elsie.collected')],25,90);
 auto(GILES,'giles.checkVent','布のなくなった排気口で通りを確かめる','bakeYard',ca(b('heat.compared'),b('heat.clear'),cn(b('heat.checked'))),all(fact('heat.clear'),fact('heat.checked',false)),[set('heat.checked')],22,90);
 travel(GILES,'bakery',ca(b('heat.checked'),cn(b('bread.baked'))),65);
 for(const [key,previous]of [['A',null],['B','A']] as const){
  const id=`bedding${key}`;for(const stage of ['hung','dry','taken','folded'])local(`elsie.${key}.${stage}`,`寝具${key==='A'?'一束目':'二束目'}：${{hung:'通路を空けた物干しに掛かった',dry:'風を通す時間を置き、乾きを確かめた',taken:'乾いた束を物干しから取り込んだ',folded:'乾いた寝具を畳んで棚へ収めた'}[stage]}。`,stage==='folded'?'dryCloth':'smallDry');
  auto(ELSIE,`elsie.hang.${key}`,'通路を空けた物干しへ一束だけ掛ける','smallDry',ca(b('elsie.collected'),...(previous?[b(`elsie.${previous}.taken`)]:[]),cn(b(`elsie.${key}.hung`))),all(held(id,actor(ELSIE)),not(held(`bedding${key==='A'?'B':'A'}`,place('smallDry'))),...(previous?[fact(`elsie.${previous}.taken`)]:[]),fact(`elsie.${key}.hung`,false)),[transfer(id,actor(ELSIE),place('smallDry')),set(`elsie.${key}.hung`)],18,90);
  auto(ELSIE,`elsie.dry.${key}`,'風を通し、寝具の内側まで乾きを確かめる','smallDry',ca(b(`elsie.${key}.hung`),cn(b(`elsie.${key}.dry`))),all(held(id,place('smallDry')),fact('heat.clear'),fact(`elsie.${key}.dry`,false)),[set(`elsie.${key}.dry`)],65,90);
  auto(ELSIE,`elsie.take.${key}`,'乾いた寝具を物干しから取り込む','smallDry',ca(b(`elsie.${key}.dry`),cn(b(`elsie.${key}.taken`))),all(held(id,place('smallDry')),fact(`elsie.${key}.dry`),fact(`elsie.${key}.taken`,false)),[transfer(id,place('smallDry'),actor(ELSIE)),set(`elsie.${key}.taken`)],15,90);
  auto(ELSIE,`elsie.fold.${key}`,'乾いた寝具を畳んで洗濯室の棚へ収める','dryCloth',ca(b(`elsie.${key}.taken`),cn(b(`elsie.${key}.folded`))),all(held(id,actor(ELSIE)),fact(`elsie.${key}.dry`),fact(`elsie.${key}.folded`,false)),[transfer(id,actor(ELSIE),place('dryCloth')),set(`elsie.${key}.folded`)],25,90);
 }
 travel(ELSIE,'smallDry',ca(b('elsie.collected'),cn(b('elsie.B.taken'))),70);travel(ELSIE,'dryCloth',ca(b('elsie.B.taken'),cn(b('elsie.finished'))),70);
 auto(ELSIE,'elsie.finish','二束を確認して洗濯を終え、予備布の返却口を残す','dryCloth',ca(b('elsie.A.folded'),b('elsie.B.folded'),cn(b('elsie.finished'))),all(fact('elsie.A.folded'),fact('elsie.B.folded'),fact('elsie.finished',false)),[set('elsie.finished'),emit('life.C034',[ELSIE],'dryCloth')],18,95);travel(ELSIE,'elsie',b('elsie.finished'),50);

 // The designated external reference, not agreement among the shop clocks, ends calibration.
 prop('lena.loop','レナは別々にずれた三つの時計を、互いの基準として合わせ直している。',true);
 local('lena.orderRead','依頼票には「郵便室の正面入口の時計で確認」と指定されている。','instruments');c.clues.at(-1)!.observerIds=[P];
 local('lena.internalAgreement','三つの表示を一時的に揃えても、指定先との照合は済んでいない。','instruments');
 local('lena.referenceTaken','レナが指定先で照合する基準時計を持った。','instruments');
 local('lena.referenceVerified','レナが依頼票の指定した郵便室の時計を直接確かめ、持参時計を照合した。','postDoor');
 local('lena.packed','レナは確認済みの三つの計器と記録を返却用にまとめた。','instruments');
 local('lena.finished','確認した計器と記録を返却棚へ分け、店の試験を終えた。','finished');
 talk('talk.lena',LENA,'三つの時計を合わせ直す理由を聞く',['lena.loop'],'「青を赤へ、赤を緑へと合わせても、またずれるの。依頼では何を基準にする約束だったかしら」');
 interaction('lena.readOrder','依頼票の基準時計の指定を読む',{location:'instruments'},held('repairOrder',place('instruments')),[set('lena.orderRead')],'指定は郵便室の正面入口の時計。店内の三つが揃うこととは別だ。');
 tell('tell.lenaOrder',LENA,'依頼票が指定する郵便室の時計を伝える','lena.orderRead','「三つを見比べる前に、指定された時計で確かめるのね」');
 propose('lena.reference','指定された時計を本人が確かめることを相談する',[LENA],{who:LENA},'基準時計を持って郵便室の正面入口へ行き、依頼票の時計と照合してから三つを調整する。',knows(LENA,'lena.orderRead'));
 auto(LENA,'lena.retry','三つの表示を互いに合わせ直す','instruments',cn(accepted('lena.reference')),fact('lena.referenceVerified',false),[set('lena.internalAgreement'),emit('instruments.testTone',[LENA],'instruments')],65,3);
 auto(LENA,'lena.takeReference','依頼票を確認し、照合用の時計を持つ','instruments',ca(accepted('lena.reference'),cn(b('lena.referenceTaken'))),all(held('referenceClock',place('instruments')),fact('lena.referenceTaken',false)),[transfer('referenceClock',place('instruments'),actor(LENA)),set('lena.referenceTaken')],18,90);
 travel(LENA,'postDoor',ca(b('lena.referenceTaken'),cn(b('lena.referenceVerified'))),70);
 auto(LENA,'lena.verifyReference','指定された郵便室の時計と、持参した基準時計を照合する','postDoor',ca(b('lena.referenceTaken'),cn(b('lena.referenceVerified'))),all(held('postalClock',place('postDoor')),held('referenceClock',actor(LENA)),agreement('lena.reference',[P,LENA]),fact('lena.referenceVerified',false)),[set('lena.referenceVerified')],40,95);
 travel(LENA,'instruments',ca(b('lena.referenceVerified'),cn(b('lena.packed'))),70);
 for(const key of ['A','B','C']){local(`lena.${key}.checked`,`レナが時計${key}を指定先で確認した基準へ合わせ、照合結果を記録した。`,'instruments');auto(LENA,`lena.calibrate.${key}`,'持ち帰った基準で計器を一つずつ調整し、結果を記す','instruments',ca(b('lena.referenceVerified'),cn(b(`lena.${key}.checked`))),all(held(`clock${key}`,place('instruments')),held('referenceClock',actor(LENA)),fact('lena.referenceVerified'),fact(`lena.${key}.checked`,false)),[set(`lena.${key}.checked`)],30,90);}
 auto(LENA,'lena.pack','確認済みの三つの計器と結果をまとめる','instruments',ca(...['A','B','C'].map(k=>b(`lena.${k}.checked`)),cn(b('lena.packed'))),all(...['A','B','C'].map(k=>fact(`lena.${k}.checked`)),held('calibrationReport',place('instruments')),fact('lena.packed',false)),[...['clockA','clockB','clockC','calibrationReport'].map(id=>transfer(id,place('instruments'),actor(LENA))),set('lena.packed')],22,95);
 travel(LENA,'finished',ca(b('lena.packed'),cn(b('lena.finished'))),70);
 auto(LENA,'lena.finish','確認した計器と記録を分けて棚へ置き、試験を終える','finished',ca(b('lena.packed'),cn(b('lena.finished'))),all(...['clockA','clockB','clockC','calibrationReport'].map(id=>held(id,actor(LENA))),fact('lena.finished',false)),[...['clockA','clockB','clockC','calibrationReport','referenceClock'].map(id=>transfer(id,actor(LENA),place('finished'))),set('lena.finished'),emit('life.C057',[LENA],'finished')],25,95);travel(LENA,'workersRoom',b('lena.finished'),50);

 // These are ordinary loans, available independently of the lenders' unfinished work.
 for(const [key,pid,who,obj,shelf,description,request]of [
  ['privacy','cloth.policy',ELSIE,'privacyCloth','dryCloth','目隠し用の乾いた予備布は寝具と別。使用者の了承を得て掛け、畳んで地上の返却口へ戻せる。','アイリス用に乾いた予備布を借りる'],
  ['padding','pad.policy',LENA,'vibrationPads','finished','当て物は計器と別の通常貸出。双方の了承のもとで試し、演奏終了後に取り外して貸出棚へ返せる。','ローズ用に防振の当て物を借りる'],
  ['ovenGauge','gauge.policy',LENA,'ovenGauge','finished','固定目盛と取付穴を比べる確認具は通常貸出。時計の比較作業が終わるのを待たず使い、貸出棚へ返せる。','パン屋用に目盛の確認具を借りる']
 ] as const){
  prop(pid,description,true);clue(pid,shelf,[P]);talk(`talk.loan.${key}`,who,`${key==='privacy'?'予備布':key==='padding'?'当て物':'確認具'}の貸出と返却先を聞く`,[pid],`「${description}」`);
  propose(`loan.${key}`,request,[who],{who},description,knows(P,pid));
  const finished=fact(who===ELSIE?'elsie.finished':'lena.finished');
  interaction(`borrow.${key}`,`貸出台帳に記し、${c.objects.find(o=>o.id===obj)!.name}を預かる`,{location:shelf},all(knows(P,pid),any(agreement(`loan.${key}`,[P,who]),finished),held(obj,place(shelf)),not({op:'loan',loanId:key,status:'borrowed'})),[transfer(obj,place(shelf),actor(P)),{op:'loan',loanId:key,status:'borrowed'}],description);
  interaction(`return.${key}`,`${c.objects.find(o=>o.id===obj)!.name}を返却口へ戻す`,{location:shelf},all(held(obj,actor(P)),{op:'loan',loanId:key,status:'borrowed'}),[transfer(obj,actor(P),place(shelf)),{op:'loan',loanId:key,status:'returned'}],'現物を返し、返却を記録した。終えた仕事を貸主にやり直してもらう必要はない。');
 }

 // Giles keeps the first flour batch. A successful oven and an actual eater are separate.
 local('bread.marks','違う配合の残りにも同じ焼け跡があり、窯の目盛板に取付けのずれ跡がある。','bakery');c.clues.at(-1)!.observerIds=[P];
 for(const [pid,label]of [['bread.gaugeHere','確認具がジャイルズの手元にある'],['bread.dialFixed','本人が確認具で固定目盛と取付穴を照合し、目盛板を付け直した'],['bread.traditional','本人が従来の焼き色・底の響き・試し生地で窯の状態を確かめた'],['bread.baked','一釜を焼き、食べられる焼き上がりを本人が確かめた'],['bread.eaten','客が受け取った初釜の一切れを実際に食べた'],['bread.finished','客が食べたことを確かめ、ジャイルズが初釜の仕事を終えた']])local(pid!,label!+'。','bakery');
 local('bread.sampleServed','初釜の試食分が客へ手渡された。','bakery');
 interaction('bread.inspect','残った焼け跡と窯の目盛板を見比べる',{location:'bakery'},yes,[set('bread.marks')],'配合より、同じ位置の焼け方と取付跡が気になる。本人に伝えよう。');
 tell('tell.breadMarks',GILES,'同じ焼け跡と目盛板のずれを伝える','bread.marks','「粉を替えるだけでは変わらないわけだ。固定目盛で確かめるか、昔の確かめ方を使おう」');
 propose('bread.traditional','従来の焼き具合の確かめ方を使うことを相談する',[GILES],{who:GILES},'本人が焼き色と底の響き、試し生地で窯の状態を確かめる。目盛板の修正を待たず初釜を焼ける。',all(knows(GILES,'bread.marks'),fact('bread.baked',false)));
 propose('bread.gauge','借りた確認具で本人に目盛を確かめてもらう',[GILES],{who:GILES},'ジャイルズが固定目盛と取付穴を照合する。確認具は通常の貸出で、レナの時計の仕事とは別。',all(knows(GILES,'bread.marks'),fact('bread.dialFixed',false)));
 interaction('bread.giveGauge','目盛の確認具をジャイルズへ手渡す',{who:GILES},all(agreement('bread.gauge',[P,GILES]),held('ovenGauge',actor(P))),[transfer('ovenGauge',actor(P),actor(GILES)),set('bread.gaugeHere'),seen(GILES,'bread.gaugeHere','bakery')],'本人が現物を受け取った。目盛と取付穴を確かめる。');
 auto(GILES,'bread.fixDial','確認具と固定目盛を合わせ、目盛板を付け直す','bakery',ca(accepted('bread.gauge'),b('bread.gaugeHere'),cn(b('bread.dialFixed'))),all(held('ovenGauge',actor(GILES)),held('ovenDial',place('bakery')),fact('bread.dialFixed',false)),[set('bread.dialFixed'),transfer('ovenGauge',actor(GILES),place('bakery'))],35,95);
 interaction('bread.collectGauge','使い終えた目盛の確認具を返却のため預かる',{location:'bakery'},all(fact('bread.dialFixed'),held('ovenGauge',place('bakery'))),[transfer('ovenGauge',place('bakery'),actor(P))],'確認具を預かった。目盛板は直ったまま、貸出棚へ返せる。');
 auto(GILES,'bread.checkTraditional','試し生地と焼き色で、従来の窯の状態を確かめる','bakery',ca(accepted('bread.traditional'),b('heat.checked'),cn(b('bread.traditional'))),all(fact('heat.checked'),fact('bread.traditional',false)),[set('bread.traditional')],30,90);
 auto(GILES,'bread.bake','店にある一回分の粉で初釜を焼き、火の通りを確かめる','bakery',ca(b('heat.checked'),{op:'any',conditions:[b('bread.dialFixed'),b('bread.traditional')]},cn(b('bread.baked'))),all(fact('heat.checked'),fact('heat.clear'),any(fact('bread.dialFixed'),fact('bread.traditional')),held('firstFlour',place('bakery')),{op:'quantity',objectId:'firstFlour',minimum:1},fact('bread.baked',false)),[{op:'consume',objectId:'firstFlour',quantity:1,unit:'釜分'},set('bread.baked')],80,85);
 propose('bread.taste','焼き上がった初釜を一切れ味わう約束をする',[GILES],{who:GILES},'ジャイルズが初釜を切り分けて渡す。客は受け取り、実際に食べてから感想を伝える。',fact('bread.baked'));
 action('bread.serve','初釜を切り分け、客へ一切れ手渡す',[GILES,P],all(at(GILES,'bakery'),at(P,'bakery'),agreement('bread.taste',[P,GILES]),fact('bread.baked'),held('breadSample',place('bakery')),fact('bread.sampleServed',false)),[transfer('breadSample',place('bakery'),actor(P)),set('bread.sampleServed')],15);rule(GILES,'bread.serve',ca(here('bakery'),accepted('bread.taste'),cn(b('bread.sampleServed'))),90);
 interaction('bread.eat','受け取った初釜を、店先でゆっくり味わう',{location:'bakery'},all(fact('bread.baked'),held('breadSample',actor(P)),fact('bread.eaten',false)),[{op:'consume',objectId:'breadSample',quantity:1,unit:'切れ'},set('bread.eaten')],'一切れを食べた。焼き上がりと味のことを本人に話せる。',28);
 action('bread.finish','食べた客の感想を聞き、初釜を終えて受取棚を開く',[GILES,P],all(at(GILES,'bakery'),at(P,'bakery'),fact('bread.eaten'),fact('bread.finished',false)),[set('bread.finished'),emit('life.C026',[GILES],'bakery')],20);rule(GILES,'bread.finish',ca(here('bakery'),b('bread.eaten'),cn(b('bread.finished'))),95);
 interaction('bread.ordinary','案内札に従い、残りの一切れを店先で味わう',{location:'bakery'},all(fact('bread.finished'),held('breadStock',place('bakery')),{op:'quantity',objectId:'breadStock',minimum:1}),[{op:'consume',objectId:'breadStock',quantity:1,unit:'切れ'},emit('bakery.ordinaryServing',[P],'bakery')],'残りの一切れを味わった。数量がなくなれば、この初釜の受取りは終わる。',24);
 Object.assign(greetings,{[ELSIE]:'「布を暖かいほうへ寄せても、まだ湿っているの」',[GILES]:'「粉の配合を替えても、同じ場所が焼け過ぎるんだ」',[LENA]:'「三つを互いに合わせ直しても、また違ってしまうの」'});
}
