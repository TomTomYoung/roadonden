import type {chapterTools} from './dinner.ts';
import {journey,seen} from './journeys.ts';
type Tools=typeof chapterTools;
export const ALF='C018',PIP='C019',CALEB='C022',HARRIET='C044';
export const patrolPoints=['inn','a1','a2','a1','street','b1','b2','b1','street','a1','inn'];
const liftPoints=['liftGround','liftUpper','O.hall2','liftNew','O.hall2','liftUpper','liftGround'];
export function registerNightwatch({person,object,c,actor,place}:Pick<Tools,'person'|'object'|'c'|'actor'|'place'>){
 person(ALF,'アルフ ベル','inn','勤務を引き継ぎ、寝床へ帰って眠る','交代を知らせる手持ちベルを鳴らし続ける',['watch.alfMeaning']);
 person(PIP,'ピップ ラウンド','street','引継ぎを受け、自分で一巡し、引継ぎ帳へ記録する','古い巡回図を辿り、鐘を継続の合図と取り違える',['watch.pipMeaning']);
 person(CALEB,'カレブ マップ','liftOld','変更された経路を自分で歩き、訂正図を掲示する','改装前の入口と消えた目印を探している',['caleb.oldMap']);
 person(HARRIET,'ハリエット フェリー','liftGround','希望する利用者に付き添い、往復の案内を終える','新しい乗場と上階を空のまま往復している',['lift.service']);
 for(const [id,name,who,custody]of [
  ['watchBell','夜回りの手持ちベル',ALF,actor(ALF)],['watchLantern','当番の巡回灯',ALF,actor(ALF)],['watchBook','範囲と受渡しを記す引継ぎ帳',ALF,place('inn')],
  ['calebMap','カレブの原図と訂正用紙',CALEB,actor(CALEB)],['patrolCopy','当番が読める巡回図の写し',CALEB,{kind:'object' as const,id:'calebMap'}],['liftSigns','入口の案内札と取付道具',HARRIET,actor(HARRIET)]
 ] as const)object(id,name,who,custody);
 for(const [who,id]of [[ALF,'watch.handover'],[PIP,'watch.patrol'],[CALEB,'town.correctedMap'],[HARRIET,'lift.guidance']]){c.services.push(id!);c.actors.find(a=>a.id===who)!.postGoalContract.serviceIds.push(id!);}
}
export function installNightwatch(t:Tools){
 const {c,P,yes,all,not,fact,at,held,actor,place,set,transfer,emit,knows,b,ca,cn,here,accepted,agreement,prop,clue,local,action,rule,auto,interaction,talk,tell,propose,travel,searchLoop,route,greetings}=t;
 const either=(...conditions:ReturnType<typeof b>[])=>({op:'any' as const,conditions});
 prop('watch.alfMeaning','アルフの鐘は交代してほしい合図。管理人室で灯りと巡回範囲を渡したい。',true);
 prop('watch.pipMeaning','ピップは鐘を「先輩の巡回を続ける」の合図と思い、古い図の行き止まりを往復している。',true);
 for(const [id,text,loc]of [
  ['watch.clarified','二人が直接話し、鐘の意味と交代する場所を確かめた。','inn'],['watch.handed','引継ぎ帳の範囲を読み合わせ、巡回灯とベルをピップへ渡した。','inn'],
  ['watch.learned','ピップが現在の巡回路を確かめた。','inn'],['watch.lap','ピップが決めた範囲を実際に一巡して戻った。','inn'],['watch.recorded','ピップが一巡の結果を引継ぎ帳に記した。','inn'],
  ['alf.lying','アルフが自分の寝床に横になった。','alfRoom'],['alf.asleep','勤務を引き継いだアルフが落ち着いて眠っている。','alfRoom']])local(id!,text!,loc!);
 talk('talk.alf',ALF,'鐘を何の合図にしているか聞く',['watch.alfMeaning'],'「交代してほしくて鳴らしているんだ。管理人室で灯りと巡回範囲を渡せたら、もう眠りたいよ」',fact('alf.asleep',false));
 talk('talk.pip',PIP,'鐘と古い巡回図について聞く',['watch.pipMeaning'],'「鐘が鳴る間は先輩の番だと思っていました。図の角を曲がっても行き止まりで……」');
 propose('watch.alfMeet','ピップの受け取り方を伝え、管理人室で待ってもらう',[ALF],{who:ALF},'二人が管理人室で直接話す。持ち物と巡回範囲を実際に渡すまで交代は終わらない。',all(knows(P,'watch.pipMeaning'),fact('watch.handed',false)));
 propose('watch.pipMeet','交代の呼びかけだと伝え、管理人室へ来てもらう',[PIP],{who:PIP},'ピップが管理人室へ行き、先輩本人と鐘の意味と担当範囲を確かめる。',all(knows(P,'watch.alfMeaning'),fact('watch.handed',false)));
 auto(ALF,'alf.ring','交代を呼ぶベルを鳴らす','inn',cn(accepted('watch.alfMeet')),all(fact('watch.handed',false),held('watchBell',actor(ALF))),[emit('watch.bell',[ALF],'inn')],55,5);
 travel(ALF,'inn',ca(accepted('watch.alfMeet'),cn(b('watch.handed'))),60);
 travel(PIP,'inn',ca(accepted('watch.pipMeet'),cn(b('watch.handed'))),60);
 searchLoop(PIP,['street','b1','b2'],accepted('watch.pipMeet'));
 action('watch.clarify','二人で鐘の意味と引継ぎ場所を話し直す',[ALF,PIP],all(at(ALF,'inn'),at(PIP,'inn'),agreement('watch.alfMeet',[P,ALF]),agreement('watch.pipMeet',[P,PIP]),fact('watch.clarified',false)),[{op:'inform',speakerId:ALF,recipientId:PIP,propositionId:'watch.alfMeaning'},{op:'inform',speakerId:PIP,recipientId:ALF,propositionId:'watch.pipMeaning'},set('watch.clarified')],22);
 rule(ALF,'watch.clarify',ca(here('inn'),accepted('watch.alfMeet'),cn(b('watch.clarified'))),90);
 action('watch.handover','範囲を読み合わせ、灯り・ベル・引継ぎ帳を渡す',[ALF,PIP],all(at(ALF,'inn'),at(PIP,'inn'),fact('watch.clarified'),held('watchLantern',actor(ALF)),held('watchBell',actor(ALF)),held('watchBook',place('inn')),fact('watch.handed',false)),[transfer('watchLantern',actor(ALF),actor(PIP)),transfer('watchBell',actor(ALF),actor(PIP)),transfer('watchBook',place('inn'),actor(PIP)),set('watch.handed')],32);
 rule(ALF,'watch.handover',ca(here('inn'),b('watch.clarified'),cn(b('watch.handed'))),95);
 travel(ALF,'alfRoom',ca(b('watch.handed'),cn(b('alf.asleep'))),60);
 auto(ALF,'alf.lie','引継ぎを終え、自分の寝床へ横になる','alfRoom',ca(b('watch.handed'),cn(b('alf.lying'))),all(fact('watch.handed'),fact('alf.lying',false)),[set('alf.lying')],20,80);
 auto(ALF,'alf.sleep','落ち着いた寝息で眠る','alfRoom',ca(b('alf.lying'),cn(b('alf.asleep'))),all(fact('alf.lying'),fact('alf.asleep',false)),[set('alf.asleep'),emit('life.C018',[ALF],'alfRoom')],55,80);
 c.actors.find(a=>a.id===ALF)!.completionObservation=fact('alf.asleep');
 propose('watch.walk','巡回範囲をピップと一度歩いて確かめる',[PIP],{who:PIP},'管理人室からA棟2階、中庭、B棟2階を回って戻る。その後ピップ自身が一巡して記録する。訂正図の完成は待たない。',all(at(PIP,'inn'),fact('watch.handed'),fact('watch.learned',false)));
 journey(t,{id:'watch.guide',actors:[P,PIP],leader:PIP,points:patrolPoints,choice:{op:'always'},guard:all(agreement('watch.walk',[P,PIP]),fact('watch.handed'),fact('watch.learned',false)),label:'ピップと巡回路を確かめる',player:true,finish:[set('watch.learned'),seen(PIP,'watch.learned','inn')]});
 interaction('map.takeCopy','掲示された案内に従い、当番用の写しを預かる',{location:'notice'},all(fact('caleb.posted'),held('patrolCopy',place('notice'))),[transfer('patrolCopy',place('notice'),actor(P))],'カレブは当番用の写しを置いている。管理人室のピップへ現物を届けられる。');
 interaction('map.givePip','訂正された巡回図の写しをピップへ渡す',{who:PIP},held('patrolCopy',actor(P)),[transfer('patrolCopy',actor(P),actor(PIP))],'ピップが写しを受け取った。読んで道順を確かめる。');
 prop('watch.hasMap','ピップの手元に訂正図の写しがある。',false,held('patrolCopy',actor(PIP)));for(const p of c.places)clue('watch.hasMap',p.id,[PIP],at(PIP,p.id));
 auto(PIP,'pip.readMap','訂正図の目印と巡回範囲を読み合わせる','inn',ca(b('watch.hasMap'),cn(b('watch.learned'))),all(held('patrolCopy',actor(PIP)),fact('caleb.posted'),fact('watch.learned',false)),[set('watch.learned')],24,90);
 journey(t,{id:'watch.patrol',actors:[PIP],leader:PIP,points:patrolPoints,choice:ca(b('watch.handed'),b('watch.learned'),cn(b('watch.lap'))),guard:all(fact('watch.handed'),fact('watch.learned'),fact('watch.lap',false),held('watchLantern',actor(PIP))),label:'自分の担当を巡回する',cycle:true,finish:[set('watch.lap'),seen(PIP,'watch.lap','inn')]});
 auto(PIP,'pip.record','最初の一巡を引継ぎ帳へ記し、帳面を棚へ戻す','inn',ca(b('watch.lap'),cn(b('watch.recorded'))),all(fact('watch.lap'),held('watchBook',actor(PIP)),fact('watch.recorded',false)),[transfer('watchBook',actor(PIP),place('inn')),set('watch.recorded'),set('watch.lap',false),seen(PIP,'watch.lap','inn'),emit('life.C019',[PIP],'inn')],30,95);
 auto(PIP,'pip.ordinaryRecord','通常の巡回を帳面へ記し、次の当番仕事へ戻る','inn',ca(b('watch.lap'),b('watch.recorded')),all(fact('watch.lap'),held('watchBook',place('inn'))),[set('watch.lap',false),seen(PIP,'watch.lap','inn'),emit('watch.regularRound',[PIP],'inn')],100,90);

 prop('caleb.oldMap','カレブは改装前の入口を信じ、消えた目印を探している。',true);
 prop('lift.service','共用エレベーターは新入口から利用できる。ハリエットは希望する利用者に一往復付き添える。',true);
 local('lift.oldSign','旧待合の掲示は、現在は閉じた側の入口を指している。','liftOld');
 local('lift.newSign','新入口の札と上階の目印が、現在の乗場を示している。','liftGround');
 for(const id of ['lift.oldSign','lift.newSign'])c.clues.find(q=>q.propositionId===id)!.observerIds=[P];
 for(const [id,text,loc]of [
  ['lift.signposted','ハリエットが旧待合の案内を新入口へ向けて直した。','liftOld'],['lift.requested','カレブが本人の希望を話し、ハリエットと往復を約束した。','liftGround'],
  ['lift.roundDone','希望した利用者が案内係と上階を確かめ、同じ入口へ戻った。','liftGround'],['lift.guided','ハリエットが実際の往復を終えて案内記録を残した。','liftGround'],
  ['caleb.liftChecked','カレブが新入口と上階の目印を自分で通り、地上へ戻った。','liftGround'],['caleb.drawn','カレブが自分で歩いた経路を原図へ書き足した。','inn'],['caleb.posted','カレブが訂正図と当番用の写しを掲示先へ置いた。','notice']])local(id!,text!,loc!);
 clue('lift.signposted','liftGround');
 talk('talk.caleb',CALEB,'古い図と消えた目印について聞く',['caleb.oldMap'],'「この角に入口があったはずだ。図を裏返して見ても、同じところへ戻ってしまう」');
 talk('talk.harriet',HARRIET,'今の乗場と案内について聞く',['lift.service'],'「新しい入口で待っているのですが、利用者が来ないんです。希望があれば上階まで付き添って戻れますよ」');
 interaction('lift.inspectOld','旧待合の掲示と閉じた入口を調べる',{location:'liftOld'},yes,[set('lift.oldSign')],'昔の矢印の先は壁になっている。新入口の実際の札と照合しよう。');
 interaction('lift.inspectNew','新入口の札と上階の目印を調べる',{location:'liftGround'},yes,[set('lift.newSign')],'新しい矢印は、この共用エレベーターと上階の緑の目印を示している。');
 tell('tell.liftOld',HARRIET,'旧待合に昔の矢印が残っていると伝える','lift.oldSign','「利用者はそこにいたのですね。新しい札と確かめ直しましょう」');
 tell('tell.liftNew',HARRIET,'新入口の札と目印を伝える','lift.newSign','「いま使える入口はこちらです。旧待合にも同じ案内を置きます」');
 propose('lift.signs','旧待合の案内を直すことを相談する',[HARRIET],{who:HARRIET},'ハリエットが旧待合へ行き、札を付け直して新入口へ戻る。乗車そのものは案内修正前から可能。',all(knows(HARRIET,'lift.oldSign'),knows(HARRIET,'lift.newSign')));
 travel(HARRIET,'liftOld',ca(accepted('lift.signs'),cn(b('lift.signposted'))),80);
 auto(HARRIET,'harriet.signs','旧待合の矢印と入口の札を取り付け直す','liftOld',ca(accepted('lift.signs'),cn(b('lift.signposted'))),all(held('liftSigns',actor(HARRIET)),fact('lift.signposted',false)),[set('lift.signposted')],25,95);
 travel(HARRIET,'liftGround',ca(b('lift.signposted'),cn(b('lift.requested')),cn(accepted('lift.playerTrip')),cn(b('lift.guided'))),65);
 tell('tell.liftService',CALEB,'案内係のいる新入口と通常の利用方法を伝える','lift.service','「新入口の目印を、案内係と自分で確かめたい」');
 propose('caleb.harriet','案内係と新入口から往復することを相談する',[CALEB],{who:CALEB},'カレブが新入口へ行き、ハリエットへ希望を直接話す。上階の目印を確かめて地上へ戻る。',all(knows(CALEB,'lift.service'),fact('caleb.liftChecked',false),not(agreement('caleb.walk',[P,CALEB]))));
 propose('caleb.walk','確認した入口からカレブと一緒に歩く',[CALEB],{who:CALEB},'主人公と旧待合から新入口、上階の目印へ歩き、地上へ戻る。案内係の達成は別。',all(knows(P,'lift.oldSign'),knows(P,'lift.newSign'),fact('caleb.liftChecked',false),not(agreement('caleb.harriet',[P,CALEB]))));
 travel(CALEB,'liftOld',ca(accepted('caleb.walk'),b('caleb.guide.step.0'),cn(b('caleb.liftChecked'))),60);
 travel(CALEB,'liftGround',ca(accepted('caleb.harriet'),cn(b('lift.requested')),cn(b('caleb.liftChecked'))),65);
 searchLoop(CALEB,['liftOld','O.hall1'],either(accepted('caleb.walk'),accepted('caleb.harriet')));
 journey(t,{id:'caleb.guide',actors:[P,CALEB],leader:CALEB,points:['liftOld','O.hall1',...liftPoints],choice:{op:'always'},guard:all(agreement('caleb.walk',[P,CALEB]),fact('caleb.liftChecked',false)),label:'カレブと目印を確かめる',player:true,finish:[set('caleb.liftChecked'),seen(CALEB,'caleb.liftChecked','liftGround')]});
 action('lift.request','本人の行き先を聞き、案内係と往復を約束する',[CALEB,HARRIET],all(at(CALEB,'liftGround'),at(HARRIET,'liftGround'),agreement('caleb.harriet',[P,CALEB]),fact('lift.signposted'),fact('lift.requested',false)),[set('lift.requested')],18);
 rule(CALEB,'lift.request',ca(here('liftGround'),accepted('caleb.harriet'),cn(b('lift.requested')),cn(b('caleb.liftChecked'))),100);
 journey(t,{id:'lift.calebTrip',actors:[HARRIET,CALEB],leader:HARRIET,points:liftPoints,choice:ca(b('lift.requested'),cn(b('lift.roundDone'))),guard:all(fact('lift.requested'),fact('lift.roundDone',false)),label:'利用者と上階を確かめて戻る',finish:[set('lift.roundDone'),set('caleb.liftChecked'),seen(HARRIET,'lift.roundDone','liftGround'),seen(CALEB,'caleb.liftChecked','liftGround')]});
 propose('lift.playerTrip','上階の待合まで付き添ってもらう',[HARRIET],{who:HARRIET},'主人公自身が希望する利用者として上階の待合へ行き、案内係と地上へ戻る。',all(at(HARRIET,'liftGround'),fact('lift.signposted'),fact('lift.requested',false),fact('lift.roundDone',false)));
 journey(t,{id:'lift.playerTrip',actors:[P,HARRIET],leader:HARRIET,points:liftPoints,choice:{op:'always'},guard:all(agreement('lift.playerTrip',[P,HARRIET]),fact('lift.requested',false),fact('lift.roundDone',false)),label:'ハリエットと往復する',player:true,finish:[set('lift.roundDone'),seen(HARRIET,'lift.roundDone','liftGround')]});
 auto(HARRIET,'harriet.finish','往復の記録を残し、通常の案内へ戻る','liftGround',ca(b('lift.roundDone'),cn(b('lift.guided'))),all(fact('lift.roundDone'),fact('lift.guided',false)),[set('lift.guided'),emit('life.C044',[HARRIET],'liftGround')],18,100);
 // Waiting leaves time to speak at either landing before the next empty trip.
 prop('lift.emptyReady','ハリエットが乗場で待ち、次の空の往復へ向かう。');
 for(const [from,to]of [['liftGround','liftUpper'],['liftUpper','liftGround']]){
  auto(HARRIET,`harriet.wait.${from}`,'乗場で利用者を待つ',from!,ca(cn(accepted('lift.signs')),cn(b('lift.oldSign')),cn(b('lift.emptyReady'))),all(not(agreement('lift.signs',[P,HARRIET])),fact('lift.emptyReady',false)),[set('lift.emptyReady'),seen(HARRIET,'lift.emptyReady',from!)],40,4);
  const id=`harriet.empty.${from}`;action(id,'利用者を待ちながら乗場を往復する',[HARRIET],all(at(HARRIET,from!),not(agreement('lift.signs',[P,HARRIET])),fact('lift.emptyReady')),[{op:'move',actorId:HARRIET,to:to!},set('lift.emptyReady',false),seen(HARRIET,'lift.emptyReady',to!)],24,{movement:{actorId:HARRIET,from:from!,to:to!},resources:[`presence:${HARRIET}`,'lift:O']});rule(HARRIET,id,ca(here(from!),cn(accepted('lift.signs')),cn(b('lift.oldSign')),b('lift.emptyReady')),3);
 }
 // The posted patrol copy comes from a second actual survey of A/B's halls.
 const survey=['liftGround',...route('liftGround','inn'),...patrolPoints.slice(1)];
 prop('caleb.surveyed','カレブは新入口に加え、A棟・B棟・中庭の巡回範囲を自分の足で確かめた。');clue('caleb.surveyed','inn');
 journey(t,{id:'caleb.survey',actors:[CALEB],leader:CALEB,points:survey,choice:ca(b('caleb.liftChecked'),cn(b('caleb.surveyed'))),guard:all(fact('caleb.liftChecked'),fact('caleb.surveyed',false)),label:'原図の巡回範囲を実地確認する',finish:[set('caleb.surveyed'),seen(CALEB,'caleb.surveyed','inn')]});
 auto(CALEB,'caleb.draw','歩いた目印とつながる道を原図へ書き足す','inn',ca(b('caleb.surveyed'),cn(b('caleb.drawn'))),all(held('calebMap',actor(CALEB)),fact('caleb.surveyed'),fact('caleb.drawn',false)),[set('caleb.drawn')],32,90);
 travel(CALEB,'notice',ca(b('caleb.drawn'),cn(b('caleb.posted'))),65);
 auto(CALEB,'caleb.post','訂正図を掲示し、当番用の写しを受取口へ置く','notice',ca(b('caleb.drawn'),cn(b('caleb.posted'))),all(held('calebMap',actor(CALEB)),held('patrolCopy',{kind:'object',id:'calebMap'}),fact('caleb.posted',false)),[transfer('calebMap',actor(CALEB),place('notice')),transfer('patrolCopy',{kind:'object',id:'calebMap'},place('notice')),set('caleb.posted'),emit('life.C022',[CALEB],'notice')],25,90);
 Object.assign(greetings,{[ALF]:'「交代のつもりで鐘を鳴らしているのに、来てもらえないんだ」',[PIP]:'「初めての夜回りです。鐘も道順も、まだよく分からなくて」',[CALEB]:'「古い入口はこの角だったはず。自分で歩いて、図を直したい」',[HARRIET]:'「新しい乗場はこちらです。どなたか旧待合で待っていませんか」'});
}
