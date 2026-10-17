import type { chapterTools } from './dinner.ts';

type Tools = typeof chapterTools;
export const NELL='C013', SAM='C014', IRIS='C015', HESTER='C017', FINN='C020', BEE='C021', THEO='C075', OSCAR='C084';

export function registerRoomsAndSleep({person,object,c,actor,place}:Pick<Tools,'person'|'object'|'c'|'actor'|'place'>){
 person(NELL,'ネル ステッチ','nell','便りを読み、返事に添える刺繍を縫い始める','台所で便りを待ちながら針仕事をする',['nell.waits']);
 person(SAM,'サム スート','scaffold','道具を下ろし梯子を返して帰る','換気ダクトの清掃を終え、帰路を探す',['sam.route']);
 person(IRIS,'アイリス ベール','iris','人目を避けて着替え、外出する','足場の人影を避けて窓を閉じている',['iris.privacy']);
 person(HESTER,'ヘスター ダウン','hester','落ち着ける寝具で横になり眠る','寝室と洗濯場、物干し場で枕を探す',['hester.signature']);
 person(FINN,'フィン','vera','保護者に見守られ、安定して眠る','ゆりかごの揺れに引っ掛かりがあり、身体の不快を泣き声で示す');
 person(BEE,'ビー クレイドル','vera','子の眠りを確かめ、温かい茶を飲んで休む','揺らし方を変えながら子を寝かせようとする',['bee.rocking']);
 person(THEO,'テオ プロップ','theatreProps','借用品の返却先と舞台の代用品を整え、点検を終える','小劇場の小道具を管理する',['theo.bundle']);
 person(OSCAR,'オスカー コード','H.hall2','了承を得て呼鈴をつなぎ、鳴ることを確かめて謝る','呼鈴の外側の紐を結び直している',['oscar.accident']);
 object('nellLetter','ネル宛の未開封の便り',NELL,place('mailShelf'));
 object('nellEmbroidery','返事に添える小さな刺繍',NELL,place('nell'));
 object('samTools','サムの清掃道具一式',SAM,place('scaffold'));
 object('samLadder','返却する折畳み梯子',SAM,place('scaffold'));
 object('irisClothes','アイリスの外出着',IRIS,actor(IRIS));
 object('hesterCoat','ヘスターの柔らかな上着',HESTER,place('hester'));
 object('hesterPillow','青い三目の縫い印の枕',HESTER,place('theatreProps'));
 object('stageCloth','舞台工房の予備の端布',THEO,place('theatreProps'));
 object('stageCushion','端布を包んだ舞台用クッション',THEO,{kind:'object',id:'stageCloth'});
 object('cradle','フィンのゆりかご',BEE,place('vera'));c.objects.find(o=>o.id==='cradle')!.portable=false;
 for(const [id,service]of [[NELL,'nell.replyShelf'],[SAM,'sam.toolReturn'],[IRIS,'iris.returnRoute'],[HESTER,'hester.bedsideReturn'],[THEO,'theatre.returnShelf'],[OSCAR,'nell.bell']]){
  c.services.push(service!);c.actors.find(a=>a.id===id)!.postGoalContract.serviceIds.push(service!);
 }
}

export function installRoomsAndSleep(t:Tools){
 const {c,P,all,any,not,fact,at,held,actor,place,set,transfer,emit,together,knows,b,ca,cn,here,accepted,agreement,prop,clue,local,action,rule,auto,interaction,talk,tell,propose,travel,searchLoop,greetings}=t;
 // Nell and Oscar: window contact can finish the letter before any repair.
 prop('nell.waits','ネルは郵便の受渡し棚に届く友人の便りを待っている。',true);
 prop('oscar.accident','オスカーは呼鈴の紐を引っ掛けて外した。本人に話すのをためらっている。',true);
 local('bell.outside','戸の外で引き紐を動かしても、手応えが途中で途切れる。','H.hall2');
 local('bell.inside','側窓から見ると、台所側の呼鈴につながる紐が外れ、引かれても鈴が動かない。','nellWindow');
 local('nell.called','側窓から用件を呼びかける声が台所へ届いた。','nell');clue('nell.called','nellWindow');
 local('bell.fixed','オスカーが内側の紐をつなぎ、呼鈴の接続が戻った。','nell');clue('bell.fixed','H.hall2');
 local('bell.heard','外で紐を引くと、台所の鈴が実際に鳴った。','nell');clue('bell.heard','H.hall2');
 local('oscar.apologized','両側の音を確かめ、オスカーがネルに自分の言葉で謝った。','nell');
 local('nell.received','ネルは未開封の便りを受け取った。','nellWindow');clue('nell.received','nell');
 local('nell.read','ネルが便りを読み終えた。','nell');
 local('nell.sewing','ネルは返事に添える刺繍を縫い始めた。','nell');
 interaction('bell.pull','戸の呼鈴を引いて、手応えを確かめる',{location:'H.hall2'},fact('bell.fixed',false),[set('bell.outside')],'外の紐は動くが、その先の手応えがない。内側はどうなっているだろう。');
 interaction('bell.listen','側窓で、内側の紐と鈴を確かめる',{location:'nellWindow'},knows(P,'bell.outside'),[set('bell.inside')],'内側の輪から紐が外れている。ネルは戸の前の呼びかけに気づいていない。');
 interaction('nell.call','側窓から用件を呼びかける',{location:'nellWindow'},all(fact('nell.called',false),not(agreement('bell.entry',[P,NELL,OSCAR]))),[set('nell.called')],'「どなた？ 窓のほうへ行きますね」');
 travel(NELL,'nellWindow',ca(b('nell.called'),cn(accepted('bell.entry'))),70);
 talk('talk.nell',NELL,'待っている便りと受取りを聞く',['nell.waits'],'「友人の便りを待っているの。受渡し棚に届いていたら、封を開けずに運んでもらえるかしら」');
 propose('nell.delivery','未開封の便りを運ぶ約束をする',[NELL],{who:NELL},'ネル宛と照合して、未開封の便りを本人へ渡す。',knows(P,'nell.waits'));
 interaction('nell.pickup','ネル宛と確かめ、未開封の便りを預かる',{location:'mailShelf'},all(agreement('nell.delivery',[P,NELL]),held('nellLetter',place('mailShelf'))),[transfer('nellLetter',place('mailShelf'),actor(P))],'宛名を確認した。封を開けず、ネルへ運ぶ。');
 interaction('nell.deliver','ネルへ便りを手渡す',{who:NELL},all(agreement('nell.delivery',[P,NELL]),held('nellLetter',actor(P))),[transfer('nellLetter',actor(P),actor(NELL)),set('nell.received'),set('nell.called',false)],'「ありがとう。台所でゆっくり読んで、返事を縫おうと思います」');
 travel(NELL,'nell',ca(b('nell.received'),cn(b('nell.called'))),60);
 auto(NELL,'nell.read','封を開けて友人の便りを読む','nell',ca(b('nell.received'),cn(b('nell.read'))),all(held('nellLetter',actor(NELL)),fact('nell.read',false)),[set('nell.read')],36,80);
 auto(NELL,'nell.sew','返事に添える小さな刺繍を縫い始める','nell',ca(b('nell.read'),cn(b('nell.sewing'))),all(fact('nell.read'),fact('nell.sewing',false),held('nellEmbroidery',place('nell'))),[transfer('nellEmbroidery',place('nell'),actor(NELL)),set('nell.sewing'),emit('life.C013',[NELL],'nell')],40,75);
 talk('talk.oscar',OSCAR,'外で結び直している理由を聞く',['oscar.accident'],'「僕が引っ掛けたんだ。外で直せば、黙って帰れると思って……」');
 tell('tell.bellOutside',OSCAR,'戸の外で紐を引いた手応えを伝える','bell.outside','「外の結び目だけでは、先につながらないのか」');
 tell('tell.bellInside',OSCAR,'台所側の輪から紐が外れていると伝える','bell.inside','「内側を見せてもらう必要があるんだね。ネルさんに話さなくちゃ」');
 propose('oscar.explain','側窓で本人に事情を話すよう勧める',[OSCAR],{who:OSCAR},'オスカーが側窓へ行き、ネルに壊した事情を話してから修理の了承を求める。',all(knows(OSCAR,'bell.inside'),knows(OSCAR,'bell.outside')));
 travel(OSCAR,'nellWindow',ca(accepted('oscar.explain'),cn(accepted('bell.entry'))),80);
 local('oscar.explained','オスカーが紐を外した事情を本人へ話した。','nellWindow');
 action('oscar.explain','壊した経緯をネルへ話す',[OSCAR,NELL],all(at(OSCAR,'nellWindow'),at(NELL,'nellWindow'),agreement('oscar.explain',[P,OSCAR]),fact('oscar.explained',false)),[set('oscar.explained')],24);
 rule(OSCAR,'oscar.explain',ca(here('nellWindow'),accepted('oscar.explain'),cn(b('oscar.explained'))),100);
 propose('bell.entry','二人と、立入りと呼鈴の試験を約束する',[NELL,OSCAR],{location:'nellWindow'},'ネルが台所への修理立入りを認める。オスカーが接続を直し、主人公は外で引き、二人が内側の音を確かめる。',all(together(P,NELL,OSCAR),fact('oscar.explained')));
 for(const who of [NELL,OSCAR])travel(who,'nell',ca(accepted('bell.entry'),cn(b('oscar.apologized'))),90);
 auto(OSCAR,'oscar.connect','内側の輪へ呼鈴の紐をつなぐ','nell',ca(accepted('bell.entry'),cn(b('bell.fixed'))),all(at(NELL,'nell'),agreement('bell.entry',[P,NELL,OSCAR]),fact('bell.fixed',false)),[set('bell.fixed')],28,100);
 interaction('bell.test','外の引き紐で、二人と呼鈴を試す',{location:'H.hall2'},all(fact('bell.fixed'),at(NELL,'nell'),at(OSCAR,'nell'),fact('bell.heard',false)),[set('bell.heard')],'戸の外で引くと、台所から鈴の音と「聞こえました」が返った。',16);
 action('oscar.apologize','鳴った鈴を確かめ、ネルへ謝る',[OSCAR,NELL],all(at(OSCAR,'nell'),at(NELL,'nell'),fact('bell.heard'),fact('oscar.apologized',false)),[set('oscar.apologized'),emit('life.C084',[OSCAR],'nell')],24);
 rule(OSCAR,'oscar.apologize',ca(here('nell'),b('bell.heard'),cn(b('oscar.apologized'))),100);
 travel(OSCAR,'oscar',b('oscar.apologized'),50);

 // Sam and Iris: privacy and the worker's return are separate goals.
 prop('sam.route','サムは清掃道具と折畳み梯子を持って、アイリスの部屋を通るつもりだった。',true);
 prop('iris.privacy','アイリスは足場の人影を避け、着替えて外出したい。帰路に使うとは聞いていない。',true);
 local('sam.waiting','サムは合図が届くまで足場で待ち、窓を覗かないと返事をした。','scaffold');
 local('iris.dressed','アイリスは選んだ場所で着替えを終えた。','iris');clue('iris.dressed','quietRoom');
 local('iris.returnOpen','窓の「戻ってよい」札が出ている。アイリスが帰路の使用を了承した。','iris');clue('iris.returnOpen','scaffold');
 local('sam.externalReady','外梯子の足元と固定索を確かめ、道具を持って降りられる。','dryCloth');clue('sam.externalReady','scaffold');
 local('sam.packed','サムは清掃道具と折畳み梯子を持った。','scaffold');
 local('sam.returned','清掃道具と折畳み梯子が、地上の返却棚へ戻った。','dryCloth');
 local('sam.home','サムは返却を終えて帰宅した。','workerHome');
 local('iris.out','アイリスが着替えを終えて商店街へ出た。','avenue.1');
 local('iris.otherRoom','アイリスは静かな共用室へ着き、内側から仕切りを閉めた。','quietRoom');
 talk('talk.sam',SAM,'道具と帰り道について聞く',['sam.route'],'「清掃は終わったんだ。窓の部屋を通って帰る予定だったけれど、住人に伝わっていないみたいだ」');
 talk('talk.iris',IRIS,'窓を閉めている事情を聞く',['iris.privacy'],'「人影がずっと見えるでしょう。着替えて外へ出たいだけなの。部屋が帰り道だなんて聞いていないわ」');
 tell('tell.samRoute',IRIS,'サムが予定していた帰路を伝える','sam.route','「そういうことだったのね。でも先に着替える時間はほしいわ」');
 propose('sam.wait','窓の合図まで足場で待つ約束をする',[SAM],{who:SAM},'窓を覗かず、アイリスの「戻ってよい」札が出るまで待つ。');
 auto(SAM,'sam.promise','着替えが終わるまで待つと返事をする','scaffold',ca(accepted('sam.wait'),cn(b('sam.waiting'))),fact('sam.waiting',false),[set('sam.waiting')],10,90);
 tell('tell.samWaiting',IRIS,'サムが窓を覗かず待つと返事をしたことを伝える','sam.waiting','「それなら先に着替えて、終わったら窓の札を裏返すわ」');
 propose('iris.notice','先に着替え、終わったら窓で合図する約束をする',[IRIS],{who:IRIS},'サムが外で待つ間に着替える。終わってから本人が窓を開け、帰路の使用を知らせる。',all(knows(IRIS,'sam.waiting'),knows(IRIS,'sam.route'),not(agreement('iris.other',[P,IRIS]))));
 propose('iris.other','静かな共用室で着替えることを相談する',[IRIS],{who:IRIS},'外出着を持って静かな共用室で着替える。出発前に自室の窓へ帰路使用の了承を掲示する。',all(knows(IRIS,'sam.route'),fact('iris.dressed',false),not(agreement('iris.notice',[P,IRIS]))));
 auto(IRIS,'iris.change','仕切りの内側で外出着に着替える','iris',ca(accepted('iris.notice'),b('sam.waiting'),cn(b('iris.dressed'))),all(agreement('iris.notice',[P,IRIS]),fact('sam.waiting'),held('irisClothes',actor(IRIS)),fact('iris.dressed',false)),[set('iris.dressed')],35,90);
 auto(IRIS,'iris.notice','窓へ戻り道の了承を掲示する','iris',{op:'any',conditions:[ca(accepted('iris.notice'),b('iris.dressed'),cn(b('iris.returnOpen'))),ca(accepted('iris.other'),cn(b('iris.returnOpen')))]},fact('iris.returnOpen',false),[set('iris.returnOpen')],10,80);
 travel(IRIS,'quietRoom',ca(accepted('iris.other'),b('iris.returnOpen'),cn(b('iris.dressed'))),70);
 auto(IRIS,'iris.closePrivate','共用室の仕切りを内側から閉める','quietRoom',ca(accepted('iris.other'),cn(b('iris.otherRoom'))),fact('iris.otherRoom',false),[set('iris.otherRoom')],12,85);
 auto(IRIS,'iris.changeElsewhere','人目のない共用室で外出着に着替える','quietRoom',ca(b('iris.otherRoom'),cn(b('iris.dressed'))),all(fact('iris.otherRoom'),held('irisClothes',actor(IRIS)),fact('iris.dressed',false)),[set('iris.dressed')],35,90);
 travel(IRIS,'avenue.1',ca(b('iris.dressed'),cn(b('iris.out'))),60);
 auto(IRIS,'iris.goOut','商店街へ出て、自分の散歩を始める','avenue.1',ca(b('iris.dressed'),cn(b('iris.out'))),all(fact('iris.dressed'),fact('iris.out',false)),[set('iris.out'),emit('life.C015',[IRIS],'avenue.1')],20,70);
 propose('sam.external','外梯子から道具を下ろす方法を相談する',[SAM],{who:SAM},'主人公が地上で外梯子と固定索を確かめる。窓を使わずサムが道具を持って降り、返却棚へ収める。');
 interaction('sam.secure','外梯子の足元と固定索を確かめる',{location:'dryCloth'},all(agreement('sam.external',[P,SAM]),fact('sam.externalReady',false)),[set('sam.externalReady')],'外梯子が動かないことを確かめ、足場へ準備の札を出した。',25);
 auto(SAM,'sam.pack','清掃道具と折畳み梯子をまとめて持つ','scaffold',ca({op:'any',conditions:[b('iris.returnOpen'),b('sam.externalReady')]},cn(b('sam.packed'))),all(any(fact('iris.returnOpen'),fact('sam.externalReady')),held('samTools',place('scaffold')),held('samLadder',place('scaffold'))),[transfer('samTools',place('scaffold'),actor(SAM)),transfer('samLadder',place('scaffold'),actor(SAM)),set('sam.packed')],20,90);
 // Choose the permitted first edge explicitly: the closed window is never a shortcut.
 rule(SAM,`walk.${SAM}.scaffold.dryCloth`,ca(here('scaffold'),b('sam.packed'),b('sam.externalReady')),95);
 rule(SAM,`walk.${SAM}.scaffold.iris`,ca(here('scaffold'),b('sam.packed'),b('iris.returnOpen'),cn(b('sam.externalReady'))),94);
 for(const [from,to]of [['iris','H.hall3'],['H.hall3','H.hall2'],['H.hall2','H.hall1'],['H.hall1','dryCloth']])rule(SAM,`walk.${SAM}.${from}.${to}`,ca(here(from!),b('sam.packed'),cn(b('sam.returned'))),70);
 auto(SAM,'sam.return','道具と折畳み梯子を地上の返却棚へ収める','dryCloth',ca(b('sam.packed'),cn(b('sam.returned'))),all(held('samTools',actor(SAM)),held('samLadder',actor(SAM)),fact('sam.returned',false)),[transfer('samTools',actor(SAM),place('dryCloth')),transfer('samLadder',actor(SAM),place('dryCloth')),set('sam.returned')],22,90);
 travel(SAM,'workerHome',ca(b('sam.returned'),cn(b('sam.home'))),65);
 auto(SAM,'sam.home','道具を返したあとの帰宅を終える','workerHome',ca(b('sam.returned'),cn(b('sam.home'))),fact('sam.home',false),[set('sam.home'),emit('life.C014',[SAM],'workerHome')],16,70);

 // Hester and Theo: verify ownership, retain a stage substitute, allow a late return.
 prop('hester.signature','ヘスターの枕は青い三目の縫い印。戻った品は寝室のベッド脇へ置いてよい。',true);
 prop('theo.bundle','劇場の布包みに青い糸の枕が混じっている。舞台用の共用品だと思っていた。',true);
 clue('hester.signature','hester',[P]);
 local('pillow.string','洗濯物を束ねた紐には、舞台工房R棟の受取札が付いている。','laundry',true);
 local('pillow.identified','テオは縫い印と本人の説明を照合し、枕を返す品と確認した。','theatreProps');
 local('stage.wrapped','予備の端布を包み、舞台用の代わりのクッションを作った。','theatreProps');
 local('stage.tested','テオが舞台用の代用品を押し、寝室の場面で使えると点検した。','theatreProps');
 local('theo.checked','借用品の返却札と舞台の小道具を分け、点検を終えた。','theatreProps');
 local('hester.pillowHere','枕がヘスターの寝室の受取場所へ届いた。','hester',false,held('hesterPillow',place('hester')));
 local('hester.coatReady','ヘスターが自分の上着を畳み、頭を乗せて落ち着けると確かめた。','hester');
 local('hester.bedding','ヘスターは使う寝具をベッドに整えた。','hester');
 local('hester.lying','ヘスターが寝具に頭を乗せて横になった。','hester');
 local('hester.asleep','ヘスターは横になったまま、落ち着いた眠りに入った。','hester');
 talk('talk.hester',HESTER,'探している枕の印を聞く',['hester.signature'],'「青い糸で三目縫ってあるの。見つかったらベッド脇へお願い。寝ていたら起こさないで大丈夫」');
 talk('talk.theo',THEO,'布に混じった枕について聞く',['theo.bundle'],'「布と一緒に来たので、共用品かと思った。持ち主がいるなら、舞台の代わりを作って返すよ」');
 tell('tell.pillow',THEO,'枕の縫い印と寝室への返却先を伝える','hester.signature','「青い三目の縫い印を見てみよう。ヘスターさんの枕だったんだね」');
 auto(THEO,'theo.identify','青い縫い印と返却先を照合する','theatreProps',ca(b('hester.signature'),cn(b('pillow.identified'))),all(held('hesterPillow',place('theatreProps')),fact('pillow.identified',false)),[set('pillow.identified')],18,90);
 auto(THEO,'theo.wrap','舞台工房の予備布を包んで代用品を作る','theatreProps',ca(b('pillow.identified'),cn(b('stage.wrapped'))),all(held('stageCushion',{kind:'object',id:'stageCloth'}),fact('stage.wrapped',false)),[transfer('stageCushion',{kind:'object',id:'stageCloth'},place('theatreProps')),set('stage.wrapped')],24,80);
 auto(THEO,'theo.test','代用品の厚さと形を確かめる','theatreProps',ca(b('stage.wrapped'),cn(b('stage.tested'))),all(held('stageCushion',place('theatreProps')),fact('stage.tested',false)),[set('stage.tested')],20,80);
 auto(THEO,'theo.check','本番用の棚と借用品の返却札を点検する','theatreProps',ca(b('stage.tested'),b('pillow.identified'),cn(b('theo.checked'))),all(fact('stage.tested'),fact('pillow.identified'),fact('theo.checked',false)),[set('theo.checked'),emit('life.C075',[THEO],'theatreProps')],20,80);
 interaction('pillow.take','返却札を確認し、ヘスターの枕を預かる',{location:'theatreProps'},all(fact('theo.checked'),held('hesterPillow',place('theatreProps')),knows(P,'hester.signature')),[transfer('hesterPillow',place('theatreProps'),actor(P))],'舞台には代わりのクッションが残った。枕を寝室へ運べる。');
 interaction('pillow.return','枕を寝室のベッド脇へ戻す',{location:'hester'},all(held('hesterPillow',actor(P)),knows(P,'hester.signature')),[transfer('hesterPillow',actor(P),place('hester'))],'枕を本人の返却場所へ。眠っていれば、声をかけずに戻せる。');
 propose('hester.coat','自分の上着を畳んで試すことを相談する',[HESTER],{who:HESTER},'ヘスター自身が上着を畳んで試す。頭を乗せて落ち着けると分かれば、それで休む。',fact('hester.asleep',false));
 // The sleeper notices their own room; no global message teleports the pillow.
 travel(HESTER,'hester',{op:'any',conditions:[accepted('hester.coat'),b('hester.pillowHere')]},80);
 interaction('tell.pillowReturned','枕がベッド脇に届いたことを伝える',{who:HESTER},all(knows(P,'hester.pillowHere'),fact('hester.asleep',false)),[{op:'inform',speakerId:P,recipientId:HESTER,propositionId:'hester.pillowHere'}],'「ベッド脇へ戻ったのね。部屋に戻って休みます」',2,true);
 auto(HESTER,'hester.fold','自分の上着を畳み、頭の収まりを試す','hester',ca(accepted('hester.coat'),cn(b('hester.coatReady')),cn(b('hester.asleep'))),all(held('hesterCoat',place('hester')),fact('hester.coatReady',false),fact('hester.asleep',false)),[set('hester.coatReady')],28,90);
 auto(HESTER,'hester.bed','選んだ寝具をベッドへ整える','hester',ca({op:'any',conditions:[b('hester.coatReady'),b('hester.pillowHere')]},cn(b('hester.bedding'))),all(any(fact('hester.coatReady'),held('hesterPillow',place('hester'))),fact('hester.bedding',false)),[set('hester.bedding')],14,85);
 auto(HESTER,'hester.lie','寝具に頭を乗せて横になる','hester',ca(b('hester.bedding'),cn(b('hester.lying'))),all(fact('hester.bedding'),fact('hester.lying',false)),[set('hester.lying')],20,80);
 auto(HESTER,'hester.sleep','横になったまま、落ち着いた眠りに入る','hester',ca(b('hester.lying'),cn(b('hester.asleep'))),all(fact('hester.lying'),fact('hester.asleep',false)),[set('hester.asleep'),emit('life.C017',[HESTER],'hester')],50,80);
 searchLoop(HESTER,['hester','laundry','C.roof'],{op:'any',conditions:[accepted('hester.coat'),b('hester.pillowHere'),b('hester.asleep')]});

 // Finn has no plans, dialogue, agreements or movement rules. Bee acts and observes.
 prop('bee.rocking','ビーは泣くたびに揺らす速さを変えているが、ゆりかごが同じ所で引っ掛かる。',true);
 local('cradle.edge','ゆりかごの片脚が敷物の縁に乗り、揺れが途中で引っ掛かる。','vera');
 local('cradle.level','ビーがゆりかごを平らな床へ置き、脚が揃っていると確かめた。','vera');
 local('finn.held','ビーがフィンを自分の腕で抱いている。','vera');
 local('finn.quiet','フィンの身体が落ち着き、呼吸がゆっくりになった。','vera');
 local('finn.sleeping','フィンが眠りに入り、ビーがそばで様子を見ている。','vera');
 local('finn.stable','ビーがしばらく見守り、フィンの安定した眠りを確かめた。','vera');
 local('bee.tea','ビーが自分のために温かい茶を入れ直した。','vera');
 local('bee.rest','ビーは子のそばで椅子に座り、茶を飲んで休んでいる。','vera');
 talk('talk.bee',BEE,'寝かしつけの様子を聞く',['bee.rocking'],'「揺らし方を変えても、同じところで引っ掛かるの。眠れたら私もお茶を入れたいな」');
 interaction('cradle.inspect','ゆりかごの脚と敷物の縁を見る',{location:'vera'},fact('cradle.edge',false),[set('cradle.edge')],'片脚だけが敷物の縁に乗っている。手を出す前に、ビーへ伝えよう。');
 tell('tell.cradle',BEE,'片脚が敷物の縁に乗っていると伝える','cradle.edge','「床のところだったのね。私が位置を直して、様子を見てみるわ」');
 propose('bee.level','平らな床で様子を見ることを相談する',[BEE],{who:BEE},'ビー自身がゆりかごを平らな床へ置き、そばで子の呼吸と眠りを確かめる。',all(knows(BEE,'cradle.edge'),fact('finn.stable',false),not(agreement('bee.hold',[P,BEE]))));
 propose('bee.hold','本人の腕で抱いて落ち着ける方法を相談する',[BEE],{who:BEE},'ビー自身が抱いて寝かせ、眠りが安定するまで見守る。主人公は赤ん坊を運ばない。',all(knows(P,'bee.rocking'),fact('finn.stable',false),not(agreement('bee.level',[P,BEE]))));
 auto(BEE,'bee.level','ゆりかごを平らな床へ置き、脚を確かめる','vera',ca(accepted('bee.level'),cn(b('cradle.level'))),all(at(FINN,'vera'),held('cradle',place('vera')),fact('cradle.level',false)),[set('cradle.level')],25,85);
 auto(BEE,'bee.hold','フィンを自分の腕で抱く','vera',ca(accepted('bee.hold'),cn(b('finn.held'))),all(at(FINN,'vera'),fact('finn.held',false),fact('finn.stable',false)),[set('finn.held')],15,85);
 const safe=any(fact('cradle.level'),fact('finn.held'));
 action('bee.soothe','子の身体と呼吸を見ながら落ち着くのを待つ',[BEE,FINN],all(at(BEE,'vera'),at(FINN,'vera'),safe,fact('finn.quiet',false)),[set('finn.quiet')],35);
 rule(BEE,'bee.soothe',ca(here('vera'),{op:'any',conditions:[b('cradle.level'),b('finn.held')]},cn(b('finn.quiet'))),80);
 action('bee.sleep','眠りに入る子をそばで見守る',[BEE,FINN],all(at(BEE,'vera'),at(FINN,'vera'),safe,fact('finn.quiet'),fact('finn.sleeping',false)),[set('finn.sleeping')],25);
 rule(BEE,'bee.sleep',ca(here('vera'),b('finn.quiet'),cn(b('finn.sleeping'))),80);
 action('bee.watch','しばらく見守り、安定した眠りを確かめる',[BEE,FINN],all(at(BEE,'vera'),at(FINN,'vera'),safe,fact('finn.sleeping'),fact('finn.stable',false)),[set('finn.stable'),emit('life.C020',[FINN],'vera')],55);
 rule(BEE,'bee.watch',ca(here('vera'),b('finn.sleeping'),cn(b('finn.stable'))),80);
 // A holding route also ends safely in the cradle before making hot tea.
 auto(BEE,'bee.layDown','平らな床へゆりかごを寄せ、眠った子をそっと寝かせる','vera',ca(b('finn.stable'),b('finn.held')),all(fact('finn.stable'),fact('finn.held')),[set('cradle.level'),set('finn.held',false)],25,90);
 auto(BEE,'bee.reheat','子のそばで、自分の温かい茶を入れ直す','vera',ca(b('finn.stable'),cn(b('finn.held')),cn(b('bee.tea'))),all(fact('finn.stable'),fact('finn.held',false),fact('bee.tea',false)),[set('bee.tea')],25,75);
 auto(BEE,'bee.rest','子のそばの椅子で、温かい茶を飲んで休む','vera',ca(b('bee.tea'),cn(b('bee.rest'))),all(fact('bee.tea'),fact('finn.stable'),fact('bee.rest',false)),[set('bee.rest'),emit('life.C021',[BEE],'vera')],35,70);
 // The inspected floor condition is told to Bee; looking alone is not consent.
 c.clues.find(q=>q.id==='see.vera.cradle.edge')!.observerIds=[P];
 c.actors.find(a=>a.id===FINN)!.completionObservation=all(at(BEE,'vera'),fact('finn.stable'));
 c.actors.find(a=>a.id===HESTER)!.completionObservation=fact('hester.asleep');
 for(const q of c.clues)if(!q.observerIds)q.observerIds=c.actors.filter(a=>a.id!==FINN).map(a=>a.id);
 Object.assign(greetings,{
  [NELL]:'「戸の呼鈴は聞こえなかったわ。便りを待っていたの」',
  [SAM]:'「道具も梯子も返して帰りたい。窓の帰り道は、住人と相談してからだね」',
  [IRIS]:'「着替えて外へ出たいの。足場の人影が気になるわ」',
  [HESTER]:'「いつもの枕が見つからなくて。洗濯物に混じったのかしら」',
  [FINN]:'フィンはゆりかごで泣いている。保護者のビーがそばで様子を見ている。',
  [BEE]:'「眠りが落ち着いたら、私も温かい茶を飲んでひと息つきたいな」',
  [THEO]:'「舞台の小道具と、持ち主へ返す品を分けておかないと」',
  [OSCAR]:'「外の結び目を直せば鳴ると思ったんだけど。ネルさんには、まだ話せていない」',
 });
}
