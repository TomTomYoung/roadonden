import type {chapterTools} from './dinner.ts';
import {IRIS} from './rooms-and-sleep.ts';
import {ROSE,NOAH} from './quiet-neighbours.ts';
import {seen} from './journeys.ts';
type Tools=typeof chapterTools;
export function installBorrowedAlternatives(t:Tools){
 const {c,P,all,any,not,fact,at,held,actor,place,set,transfer,knows,b,ca,cn,accepted,agreement,local,auto,interaction,talk,propose,travel}=t;
 const choiceAny=(...conditions:ReturnType<typeof b>[])=>({op:'any' as const,conditions});
 // A third privacy route: the dry loan is separate from Elsie's wet bedding.
 local('cloth.here','借りた乾いた予備布がアイリスの手元へ届いた。','iris',false,held('privacyCloth',actor(IRIS)));
 local('cloth.mounted','アイリスが了承した窓に乾いた目隠し布を掛け、人影を遮った。','iris');
 local('cloth.released','着替えを終えたアイリスが目隠し布を外して畳み、返却用に置いた。','iris');
 propose('iris.cloth','乾いた予備布を目隠しに使うことを相談する',[IRIS],{who:IRIS},'本人が乾いた布を窓に掛けてから着替える。終わったら帰路の了承を掲示し、布を外して返却用に畳む。',all(knows(IRIS,'sam.route'),knows(P,'iris.privacy'),fact('iris.dressed',false),not(agreement('iris.notice',[P,IRIS])),not(agreement('iris.other',[P,IRIS]))));
 // Keep the pre-existing two routes intact, and select only one changing place.
 for(const id of ['offer.iris.notice','offer.iris.other']){
  const a=c.actions.find(a=>a.id===id)!,g=not(agreement('iris.cloth',[P,IRIS]));a.startGuard=all(a.startGuard,g);a.maintainGuard=all(a.maintainGuard,g);a.finishGuard=all(a.finishGuard,g);const i=t.interactions.find(i=>i.id===id)!;i.visible=all(i.visible,g);
 }
 interaction('cloth.deliver','了承したアイリスへ乾いた予備布を手渡す',{who:IRIS},all(agreement('iris.cloth',[P,IRIS]),held('privacyCloth',actor(P)),{op:'loan',loanId:'privacy',status:'borrowed'},fact('iris.dressed',false)),[transfer('privacyCloth',actor(P),actor(IRIS))],'本人が布を受け取った。掛ける位置は本人が確かめる。');
 auto(IRIS,'cloth.mount','窓へ目隠し布を掛け、足場からの人影を遮る','iris',ca(accepted('iris.cloth'),b('cloth.here'),cn(b('cloth.mounted'))),all(held('privacyCloth',actor(IRIS)),agreement('iris.cloth',[P,IRIS]),fact('cloth.mounted',false)),[transfer('privacyCloth',actor(IRIS),place('iris')),set('cloth.mounted')],20,95);
 auto(IRIS,'iris.changeBehindCloth','乾いた目隠しの内側で外出着に着替える','iris',ca(accepted('iris.cloth'),b('cloth.mounted'),cn(b('iris.dressed'))),all(held('privacyCloth',place('iris')),fact('cloth.mounted'),held('irisClothes',actor(IRIS)),fact('iris.dressed',false)),[set('iris.dressed')],35,95);
 const notice=c.actors.find(a=>a.id===IRIS)!.rules.find(r=>r.actionId==='iris.notice')!;
 notice.choiceGuard={op:'any',conditions:[notice.choiceGuard,ca(accepted('iris.cloth'),b('iris.dressed'),cn(b('iris.returnOpen')))]};
 auto(IRIS,'cloth.release','着替えと窓の合図を終え、布を外して返却用に畳む','iris',ca(accepted('iris.cloth'),b('iris.dressed'),b('iris.returnOpen'),cn(b('cloth.released'))),all(held('privacyCloth',place('iris')),fact('iris.dressed'),fact('iris.returnOpen'),fact('cloth.released',false)),[transfer('privacyCloth',place('iris'),actor(IRIS)),set('cloth.mounted',false),transfer('privacyCloth',actor(IRIS),place('iris')),set('cloth.released')],22,95);
 // Only the ordinary departure rules depend on returning the cloth to the room shelf.
 for(const r of c.actors.find(a=>a.id===IRIS)!.rules){if(r.actionId.startsWith(`walk.${IRIS}.`)&&JSON.stringify(r.choiceGuard).includes('iris.dressed')&&JSON.stringify(r.choiceGuard).includes('iris.out'))r.choiceGuard=ca(r.choiceGuard,choiceAny(cn(accepted('iris.cloth')),b('cloth.released')));}
 interaction('cloth.collect','畳まれた目隠し布を返却のため預かる',{location:'iris'},all(fact('cloth.released'),fact('cloth.mounted',false),held('privacyCloth',place('iris'))),[transfer('privacyCloth',place('iris'),actor(P))],'外出したアイリスを呼び戻さず、地上の予備布棚へ返せる。');

 // Padding is tested by the two listeners in the adjacent room, before a full song.
 local('pad.mounted','了承された当て物が鍵盤の脚へ取り付けられている。','basil');
 local('pad.checked','隣室の二人が、当て物を付けた同じ試奏で床の振動が届かないと確かめた。','martha');
 propose('quiet.pad','防振の当て物を付け、同じ試奏で確かめる',[ROSE,NOAH],{location:'martha'},'主人公が借りた当て物を鍵盤の脚へ敷く。二人は隣室で同じ短い試奏を聞き、効き目を確かめてから練習と休息の約束を決める。',all(at(ROSE,'martha'),at(NOAH,'martha'),knows(P,'quiet.cause'),knows(ROSE,'quiet.cause'),knows(NOAH,'quiet.cause'),not(agreement('quiet.time',[P,ROSE,NOAH]))));
 const time=c.actions.find(a=>a.id==='offer.quiet.time')!,noPadding=not(agreement('quiet.pad',[P,ROSE,NOAH]));time.startGuard=all(time.startGuard,noPadding);time.maintainGuard=all(time.maintainGuard,noPadding);time.finishGuard=all(time.finishGuard,noPadding);const timeOption=t.interactions.find(i=>i.id===time.id)!;timeOption.visible=all(timeOption.visible,noPadding);
 const mounted=all(fact('pad.mounted'),held('vibrationPads',place('basil')));
 interaction('pad.mount','了承された鍵盤の脚へ防振の当て物を敷く',{location:'basil'},all(agreement('quiet.pad',[P,ROSE,NOAH]),held('vibrationPads',actor(P)),held('rosePiano',place('basil')),fact('pad.mounted',false),fact('quiet.songEnded',false)),[transfer('vibrationPads',actor(P),place('basil')),set('pad.mounted')],'取り付けだけでは解決ではない。同じ短い試奏を隣室の二人に確かめてもらおう。',25);
 interaction('pad.test','当て物を付けた同じ試奏を、隣室の二人に聞いてもらう',{location:'basil'},all(agreement('quiet.pad',[P,ROSE,NOAH]),mounted,at(ROSE,'martha'),at(NOAH,'martha'),held('noahClock',actor(NOAH)),fact('pad.checked',false)),[set('pad.checked'),seen(ROSE,'pad.checked','martha'),seen(NOAH,'pad.checked','martha')],'二人は同じ短い試奏の時刻を照合し、隣室へ床の振動が届かないと確かめた。本人たちに結果を聞こう。',32);c.actions.find(a=>a.id==='pad.test')!.resources.push(`presence:${ROSE}`,`presence:${NOAH}`);
 talk('talk.padResult',ROSE,'当て物を付けた試奏の結果を聞く',['pad.checked'],'「同じ曲の出だしでも、今度は床が揺れなかった。これなら、隣で休む時間と重ねられるかしら」');
 propose('quiet.withPad','確認した当て物で一曲を通し、隣室では休む約束をする',[ROSE,NOAH],{location:'martha'},'確認した当て物を付けて一曲を通す。その間ノアは時計を掛け直して休む。弾き終わったことを伝え、演奏を止めてから当て物を返す。',all(at(ROSE,'martha'),at(NOAH,'martha'),knows(P,'pad.checked'),knows(ROSE,'pad.checked'),knows(NOAH,'pad.checked'),mounted));
 travel(ROSE,'basil',ca(accepted('quiet.withPad'),cn(b('quiet.songEnded'))),70);
 auto(ROSE,'rose.paddedSong','確認した当て物を使い、好きな曲を最後まで弾く','basil',ca(accepted('quiet.withPad'),cn(b('quiet.songEnded'))),all(agreement('quiet.withPad',[P,ROSE,NOAH]),mounted,held('rosePiano',place('basil')),fact('pad.checked'),fact('quiet.songEnded',false)),[set('quiet.songEnded')],140,90);
 const sounding=c.propositions.find(p=>p.id==='rose.sounding')!;
 const playing=any(...['rose.retry','quiet.test','rose.song','pad.test','rose.paddedSong'].map(actionId=>({op:'active' as const,actionId})));
 sounding.derived=all(playing,not(mounted));
 t.prop('rose.playing','ローズの部屋で鍵盤が実際に演奏されている。',false,playing);t.clue('rose.playing','basil');
 const paddedRest=all(agreement('quiet.withPad',[P,ROSE,NOAH]),fact('pad.checked'),mounted);
 const rehang=c.actions.find(a=>a.id==='noah.rehang')!;
 rehang.startGuard=all(at(NOAH,'martha'),any(fact('quiet.closed'),paddedRest),held('noahClock',actor(NOAH)),fact('noah.rehung',false));rehang.maintainGuard=rehang.startGuard;rehang.finishGuard=rehang.startGuard;
 const rehangRule=c.actors.find(a=>a.id===NOAH)!.rules.find(r=>r.actionId==='noah.rehang')!;
 rehangRule.choiceGuard=ca(t.here('martha'),choiceAny(b('quiet.closed'),accepted('quiet.withPad')),cn(b('noah.rehung')));
 const lie=c.actions.find(a=>a.id==='noah.lie')!;
 lie.startGuard=all(at(NOAH,'martha'),any(fact('quiet.closed'),paddedRest),fact('noah.clockMounted'),fact('rose.sounding',false),fact('noah.lying',false));lie.maintainGuard=lie.startGuard;lie.finishGuard=lie.startGuard;
 c.propositions.find(p=>p.id==='noah.resting')!.description='時計は動き、約束した静けさが続いたまま、ノアが落ち着いて休んでいる。';
 const restClue=c.clues.find(q=>q.propositionId==='noah.resting')!;restClue.description=c.propositions.find(p=>p.id==='noah.resting')!.description;
 interaction('pad.remove','演奏を終えた鍵盤から当て物を外し、返却のため預かる',{location:'basil'},all(mounted,fact('quiet.songEnded'),fact('quiet.closed'),fact('rose.playing',false)),[transfer('vibrationPads',place('basil'),actor(P)),set('pad.mounted',false)],'演奏は終わり、隣室の休息は続いている。修理棚へ返しても、二人の達成は変わらない。',20);
}
