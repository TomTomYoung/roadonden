import type { chapterTools } from './dinner.ts';
import type { ActionEffect, ChoiceGuard, Condition } from '../core/types.ts';
import {travelTicks} from './block.ts';
type Tools=typeof chapterTools;
export const seen=(who:string,pid:string,where:string):ActionEffect=>({op:'observe',actorIds:[who],propositionId:pid,locationId:where,sourceId:`own.${pid}`});
/** A journey advances only on a completed, adjacent physical movement. */
export function journey(t:Tools,options:{id:string;actors:string[];leader:string;points:string[];choice:ChoiceGuard;guard:Condition;label:string;player?:boolean;cycle?:boolean;finish?:ActionEffect[];priority?:number}){
 const {c,P,prop,at,all,fact,set,b,ca,here,action,rule,interaction}=t;
 const {id,actors,leader,points,choice,guard,label,player=false,cycle=false,finish=[],priority=70}=options;
 for(let i=0;i<points.length-1;i++){
  const pid=`${id}.step.${i}`;prop(pid,`${label}の経路を本人が確認している。`,i===0);
  c.actors.find(a=>a.id===leader)!.initialBeliefs.push({propositionId:pid,stance:i===0?'believe':'deny',reason:'予定した経路の最初の区間'});
 }
 for(let i=0;i<points.length-1;i++){
  const from=points[i]!,to=points[i+1]!,pid=`${id}.step.${i}`,last=i===points.length-2,next=`${id}.step.${last?0:i+1}`;
  const resources=actors.map(a=>`presence:${a}`);if([from,to].includes('liftGround')&&[from,to].includes('liftUpper'))resources.push('lift:O');
  const effects:ActionEffect[]=[...actors.map(actorId=>({op:'move' as const,actorId,to})),set(pid,false),seen(leader,pid,to)];
  if(!last||cycle)effects.push(set(next),seen(leader,next,to));
  if(last)effects.push(...finish);
  const aid=`${id}.${i}`,physical=all(...actors.map(a=>at(a,from)),fact(pid),guard),text=`${label}：${c.places.find(p=>p.id===to)!.name}へ進む`;
  if(player){interaction(aid,text,{location:from},physical,effects,'同じ道を一緒に通り、到着した場所を確かめた。',travelTicks(from,to));const def=c.actions.find(a=>a.id===aid)!;def.actorIds=[...actors];def.movement={actorId:P,from,to};def.resources=resources;}
  else{action(aid,text,actors,physical,effects,travelTicks(from,to),{movement:{actorId:leader,from,to},resources});rule(leader,aid,ca(here(from),b(pid),choice),priority);}
 }
}
