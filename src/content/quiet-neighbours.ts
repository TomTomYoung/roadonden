import type {chapterTools} from './dinner.ts';
import {seen} from './journeys.ts';
type Tools=typeof chapterTools;
export const ROSE='C023',NOAH='C024';
export function registerQuietNeighbours({person,object,c,actor,place}:Pick<Tools,'person'|'object'|'c'|'actor'|'place'>){
 person(ROSE,'ローズ キー','basil','一曲を通し、隣人の休息を妨げていないことを確かめる','弱く弾けばよいと思い、壁の音を拍子と受け取る',['rose.rhythm']);
 person(NOAH,'ノア チック','martha','時計を正しく掛け、取り決めの守られた部屋で休む','時計を掛け直して振動の原因を探す',['noah.clockWorry']);
 object('rosePiano','ローズの鍵盤楽器',ROSE,place('basil'));c.objects.find(o=>o.id==='rosePiano')!.portable=false;
 object('noahClock','ノアの掛け時計',NOAH,place('martha'));
 object('quietNotice','二人が残す練習と休息の約束札',ROSE,actor(ROSE));
 for(const [who,id]of [[ROSE,'quiet.practice'],[NOAH,'quiet.clock']]){c.services.push(id!);c.actors.find(a=>a.id===who)!.postGoalContract.serviceIds.push(id!);}
}
export function installQuietNeighbours(t:Tools){
 const {c,P,all,any,fact,at,held,actor,place,set,transfer,emit,knows,b,ca,cn,here,accepted,agreement,prop,clue,local,action,rule,auto,interaction,talk,propose,travel,greetings}=t;
 prop('rose.rhythm','ローズは壁を叩く音を拍子だと思い、弱く弾けば隣室へ響かないと考えている。',true);
 prop('noah.clockWorry','ノアは壁の振動を時計の掛け方のせいだと思っている。',true);
 local('noah.clockMounted','ノアの掛け時計が壁の正しい位置へ掛かっている。','martha',true);
 for(const [id,text,loc]of [
  ['quiet.clockOff','ノアが時計を壁から外し、自分の手に持っている。','martha'],['quiet.tested','時計を外した状態でも、隣の鍵盤の試奏と床の振動が一致した。','martha'],
  ['quiet.cause','二人が隣室で聞いた振動と試奏の時刻を照合した。','martha'],['quiet.songEnded','ローズが約束した一曲を通し、演奏を終えた。','basil'],
  ['quiet.closed','ローズが練習を終えたと本人へ伝え、休息中は弾かない約束札を残した。','martha'],['noah.rehung','ノアが時計の掛け位置と動きを確かめた。','martha'],
  ['noah.lying','ノアが時計の音を聞きながら寝床に入った。','martha'],['noah.resting','時計は動き、隣の演奏が止まったまま、ノアが落ち着いて休んでいる。','martha'],
  ['rose.respected','一曲を終えたローズが、約束の守られた隣人の休息を確かめた。','martha']])local(id!,text!,loc!);
 prop('rose.sounding','鍵盤の演奏が床と壁を通して隣室に伝わっている。',false,any({op:'active',actionId:'rose.retry'},{op:'active',actionId:'quiet.test'},{op:'active',actionId:'rose.song'}));
 clue('rose.sounding','basil');clue('rose.sounding','martha');
 prop('noah.knocking','時計を掛け直す作業音が、隣のローズには拍子のように聞こえる。',false,{op:'active',actionId:'noah.retry'});clue('noah.knocking','basil');clue('noah.knocking','martha');
 talk('talk.rose',ROSE,'壁の音と弾き方について聞く',['rose.rhythm'],'「隣から拍子を合わせてくれるの。もっと弱く弾けば、きっと気にならないでしょう」');
 talk('talk.noah',NOAH,'時計を掛け直している理由を聞く',['noah.clockWorry'],'「掛け方が悪いのかな。外して確かめても、壁が響く気がするんだ」',fact('noah.resting',false));
 propose('quiet.noah','時計を外して、隣人と聞こえ方を確かめる',[NOAH],{who:NOAH},'ノアが時計を外して持つ。ローズを部屋へ迎え、主人公が隣室で弾く短い音と振動を二人で確かめる。',all(knows(P,'rose.rhythm'),knows(P,'noah.clockWorry'),fact('quiet.tested',false)));
 propose('quiet.rose','隣室で自分の演奏の響きを確かめてもらう',[ROSE],{who:ROSE},'主人公が了承した短い試奏を行う間、ローズ本人がノアの部屋で床と壁の振動を確かめる。',all(knows(P,'noah.clockWorry'),agreement('quiet.noah',[P,NOAH]),fact('quiet.tested',false)));
 auto(ROSE,'rose.retry','弱く弾き直し、壁からの音を待つ','basil',cn(accepted('quiet.rose')),all(fact('quiet.tested',false),held('rosePiano',place('basil'))),[emit('quiet.weakAttempt',[ROSE],'basil')],50,5);
 auto(NOAH,'noah.retry','時計の掛け具を揺らし、壁の音を調べる','martha',cn(accepted('quiet.noah')),all(held('noahClock',place('martha')),fact('quiet.tested',false)),[emit('quiet.clockAttempt',[NOAH],'martha')],55,5);
 auto(NOAH,'noah.unhook','時計を壁から外し、自分の手に持つ','martha',ca(accepted('quiet.noah'),cn(b('quiet.clockOff'))),all(held('noahClock',place('martha')),fact('quiet.clockOff',false)),[transfer('noahClock',place('martha'),actor(NOAH)),set('noah.clockMounted',false),set('quiet.clockOff')],18,95);
 travel(ROSE,'martha',ca(accepted('quiet.rose'),cn(b('quiet.cause'))),70);
 interaction('quiet.test','隣室の二人に、了承された短い試奏を聞いてもらう',{location:'basil'},all(agreement('quiet.noah',[P,NOAH]),agreement('quiet.rose',[P,ROSE]),at(ROSE,'martha'),at(NOAH,'martha'),held('noahClock',actor(NOAH)),held('rosePiano',place('basil')),fact('quiet.tested',false)),[set('quiet.tested'),seen(ROSE,'quiet.tested','martha'),seen(NOAH,'quiet.tested','martha')],'時計を外して持つ二人が、隣室で試奏の時刻と振動を確かめた。本人たちの話を聞こう。',32);
 c.actions.find(a=>a.id==='quiet.test')!.resources.push(`presence:${ROSE}`,`presence:${NOAH}`);
 action('quiet.compare','二人で試奏の時刻と、時計を外した壁の振動を照合する',[ROSE,NOAH],all(at(ROSE,'martha'),at(NOAH,'martha'),fact('quiet.tested'),held('noahClock',actor(NOAH)),fact('quiet.cause',false)),[set('quiet.cause')],22);
 rule(ROSE,'quiet.compare',ca(here('martha'),b('quiet.tested'),cn(b('quiet.cause'))),95);
 talk('talk.quietResult',ROSE,'隣室で二人が確かめたことを聞く',['quiet.cause'],'「時計を外していても、鍵盤と同じ時刻に床が響いたわ。拍子ではなく、掛け直す音だったのね」');
 propose('quiet.time','一曲のあとを休息の時間にする約束をする',[ROSE,NOAH],{location:'martha'},'今はノアが起きている間に一曲を通し、その後は練習を休む。ローズは終わったと伝えて約束札を残す。ノアが時計を掛け直して休む間は弾かない。',all(at(ROSE,'martha'),at(NOAH,'martha'),knows(P,'quiet.cause'),knows(ROSE,'quiet.cause'),knows(NOAH,'quiet.cause')));
 travel(ROSE,'basil',ca(accepted('quiet.time'),cn(b('quiet.songEnded'))),70);
 auto(ROSE,'rose.song','約束した時間に、好きな曲を最後まで弾く','basil',ca(accepted('quiet.time'),cn(b('quiet.songEnded'))),all(agreement('quiet.time',[P,ROSE,NOAH]),held('rosePiano',place('basil')),fact('quiet.songEnded',false),fact('noah.lying',false)),[set('quiet.songEnded')],85,90);
 travel(ROSE,'martha',ca(b('quiet.songEnded'),cn(b('quiet.closed'))),70);
 action('quiet.closePractice','一曲を終えたことを伝え、休息中は弾かない札を残す',[ROSE,NOAH],all(at(ROSE,'martha'),at(NOAH,'martha'),fact('quiet.songEnded'),fact('rose.sounding',false),held('quietNotice',actor(ROSE)),fact('quiet.closed',false)),[transfer('quietNotice',actor(ROSE),place('martha')),{op:'inform',speakerId:ROSE,recipientId:NOAH,propositionId:'quiet.songEnded'},set('quiet.closed')],18);
 rule(ROSE,'quiet.closePractice',ca(here('martha'),b('quiet.songEnded'),cn(b('quiet.closed'))),95);
 auto(NOAH,'noah.rehang','時計の掛け具を固定し、動きを確かめて掛け直す','martha',ca(b('quiet.closed'),cn(b('noah.rehung'))),all(fact('quiet.closed'),held('noahClock',actor(NOAH)),fact('noah.rehung',false)),[transfer('noahClock',actor(NOAH),place('martha')),set('noah.clockMounted'),set('noah.rehung')],24,90);
 auto(NOAH,'noah.lie','時計の音を聞きながら寝床に入る','martha',ca(b('noah.rehung'),cn(b('noah.lying'))),all(fact('quiet.closed'),fact('noah.clockMounted'),fact('rose.sounding',false),fact('noah.lying',false)),[set('noah.lying')],20,80);
 auto(NOAH,'noah.rest','取り決めが守られた部屋で、落ち着いて休む','martha',ca(b('noah.lying'),cn(b('noah.resting'))),all(fact('noah.lying'),fact('noah.clockMounted'),fact('rose.sounding',false),fact('noah.resting',false)),[set('noah.resting'),emit('life.C024',[NOAH],'martha')],50,80);
 auto(ROSE,'rose.confirm','一曲の後の隣人の休息を、起こさず確かめる','martha',ca(b('noah.resting'),cn(b('rose.respected'))),all(at(NOAH,'martha'),fact('noah.resting'),fact('quiet.songEnded'),fact('rose.sounding',false),fact('rose.respected',false)),[set('rose.respected'),emit('life.C023',[ROSE],'martha')],18,80);
 travel(ROSE,'basil',b('rose.respected'),50);
 c.actors.find(a=>a.id===NOAH)!.completionObservation=fact('noah.resting');
 Object.assign(greetings,{[ROSE]:'「弱く弾けば大丈夫でしょう。隣からも拍子が聞こえるの」',[NOAH]:'「時計を掛け直して、いつもの音を聞きながら休みたいんだ」'});
}
