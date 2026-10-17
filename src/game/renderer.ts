import { assets } from './assets.ts';
import { blockPlaces, blockPlaceById, buildingNames } from '../content/block.ts';
import { dinnerContent as content, P, D, B } from '../content/dinner.ts';
import type { WorldState } from '../core/types.ts';

export class BlockRenderer {
 private ctx:CanvasRenderingContext2D;
 private images=new Map<string,HTMLImageElement>();
 private background=document.createElement('canvas');
 private definitions=new Map(content.actions.map(a=>[a.id,a]));
 private zoom=1;
 private offset={x:0,y:0};
 constructor(private canvas:HTMLCanvasElement){this.ctx=canvas.getContext('2d')!;this.background.width=canvas.width;this.background.height=canvas.height;}
 async load(){
  await Promise.all(Object.entries(assets).map(async([id,asset])=>{const image=new Image();image.src=asset.src;await image.decode();this.images.set(id,image);}));
  const c=this.ctx;c.fillStyle='#e9e8db';c.fillRect(0,0,1300,900);
  this.asset('buildings.courtyard',0,750);
  for(const [id,x]of [['apartment-a',22],['mixed-use',410],['apartment-b',892]] as const)this.asset(`buildings.${id}`,x,70);
  for(const p of blockPlaces){
   if(p.kind==='hall')continue;
   // Adjacent apartments share a wall, not a point where people can interact.
   this.asset(`interiors.${p.interior}`,p.x-64,p.y-112);
   this.label(p.kind==='room'?`${p.room} ${p.name.split('・').at(-1)!.replace('メイベル食品店','食品店').replace('レオ靴修理店','靴修理').replace('放課後の活動室','活動室').replace('の部屋','').replace('フィンチ家','フィンチ家')}`:p.name.replace(/^.*・/,''),p.x,p.y+24,12);
  }
  for(const x of [332,798,1232]){
   for(const y of [305,485])this.asset('buildings.stairs',x-24,y);
   this.line([[x,290],[x,112]],'#869b90',4);
   for(const [floor,y]of [[3,290],[2,470],[1,650]] as const)this.label(`${floor}F`,x,y+23,11);
  }
  for(const [label,x]of [[buildingNames.A,197],[buildingNames.M,625],[buildingNames.B,1085]] as const)this.label(label,x,37,17);
  this.label('共用中庭',650,885,14);
  this.background.getContext('2d')!.drawImage(this.canvas,0,0);
  this.canvas.dataset.assetsReady=String(this.images.size);
 }
 setZoom(value:number){this.zoom=Math.max(1,Math.min(2.2,value));return this.zoom;}
 getZoom(){return this.zoom;}
 private asset(id:string,x:number,y:number,scale=1){const im=this.images.get(id)!;this.ctx.drawImage(im,x,y,im.width*scale,im.height*scale);}
 private label(text:string,x:number,y:number,size=12){const c=this.ctx;c.font=`${size}px "Yu Gothic",sans-serif`;const width=c.measureText(text).width;c.fillStyle='#f6f0e3ed';c.beginPath();c.roundRect(x-width/2-7,y-14,width+14,22,3);c.fill();c.fillStyle='#3b5655';c.textAlign='center';c.fillText(text,x,y+2);}
 private line(points:number[][],color:string,width:number){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x!,y!):c.moveTo(x!,y!));c.stroke();}
 position(id:string,s:WorldState,subtick:number){
  const a=s.actors[id]!,p=blockPlaceById.get(a.locationId)!;
  const movement=s.actions.find(a=>this.definitions.get(a.definitionId)?.movement?.actorId===id);
  let x=p.x,y=p.y;
  if(movement){const def=this.definitions.get(movement.definitionId)!,q=blockPlaceById.get(def.movement!.to)!;const f=Math.min(1,(movement.elapsedTicks+subtick)/def.durationTicks);x+=(q.x-x)*f;y+=(q.y-y)*f;}
  else{const locals=content.actors.filter(a=>s.actors[a.id]!.locationId===p.id&&!s.actions.some(r=>this.definitions.get(r.definitionId)?.movement?.actorId===a.id));x+=(locals.findIndex(a=>a.id===id)-(locals.length-1)/2)*23;
   if((id===D||id===B)&&p.id==='yard'&&s.facts['ben.chasing']){const t=(s.tick+subtick)/12+(id===D?0:1.3);x=p.x+Math.cos(t)*36;y=p.y+Math.sin(t)*12;}}
  return{x,y,moving:!!movement};
 }
 draw(s:WorldState,path:string[],subtick:number){
  const c=this.ctx,player=this.position(P,s,subtick);
  this.offset={x:Math.max(1300*(1-this.zoom),Math.min(0,650-player.x*this.zoom)),y:Math.max(900*(1-this.zoom),Math.min(0,450-player.y*this.zoom))};
  c.save();c.translate(this.offset.x,this.offset.y);c.scale(this.zoom,this.zoom);c.drawImage(this.background,0,0);
  const here=blockPlaceById.get(s.actors[P]!.locationId)!;
  c.strokeStyle='#b96f4e';c.lineWidth=2;c.setLineDash([5,5]);c.strokeRect(here.x-68,here.y-116,136,149);c.setLineDash([]);
  if(path.length)this.line([[player.x,player.y],...path.map(id=>{const p=blockPlaceById.get(id)!;return[p.x,p.y];})],'#b37555aa',3);
  const prop=(id:string,place:string,dx=0,dy=0,scale=.65)=>{const p=blockPlaceById.get(place)!;this.asset(`props.${id}`,p.x-24*scale+dx,p.y-48*scale+dy,scale);};
  prop('cargo','quay',5,s.facts['quay.stable']?0:-30);if(s.facts['quay.stand'])prop('stand','quay',5,12);
  if(s.facts['quay.flag'])prop('flag','quay',48,-35);
  prop(s.facts['garden.open']?'gate-open':'gate-closed','garden',-57,6);
  if(s.facts['toy.ready'])prop('toy','garden',30,-30,.4);
  if(s.facts['meal.ready'])prop('meal','home',37,-22,.5);
  if(s.facts['celia.curtain'])prop('curtain-closed','celia',-39,-70,.65);
  if(s.facts['mabel.locked']||s.facts['mabel.closed'])prop('shutter-closed','market',0,-22,1.1);
  if(s.facts['leo.closed'])prop('shutter-closed','shoe',0,-22,1.1);
  prop('return-box','shoe',52,10,.55);
  for(const [id,obj]of Object.entries(s.objects)){
   const asset=id.includes('loan')?'loanShoes':id.toLowerCase().includes('pot')?'pot':id.includes('package')?'package':id.includes('shoes')?'shoes':undefined;
   if(asset&&obj.quantity>0&&obj.custody.kind==='place'&&blockPlaceById.has(obj.custody.id))prop(asset,obj.custody.id,-35,-22,.48);
   // Custody remains simulation data; sprites never decide whether an object was delivered.
  }
  for(const actor of content.actors){
   const pos=this.position(actor.id,s,subtick),im=this.images.get(`residents.${actor.id===D?'dog':actor.id}`)!;
   const working=s.actions.find(a=>this.definitions.get(a.definitionId)!.actorIds.includes(actor.id)&&!this.definitions.get(a.definitionId)!.concurrent);
   const held=Object.entries(s.objects).some(([,o])=>o.quantity>0&&o.custody.kind==='actor'&&o.custody.id===actor.id);
   let frame=pos.moving?1+Math.floor((s.tick+subtick)/3)%2:working?3:0;
   if(working?.definitionId.includes('dinner')||working?.definitionId.includes('eat'))frame=4;
   if(working?.definitionId.includes('dance')||(actor.id==='C008'&&s.facts['leo.danced']&&s.actors[actor.id]!.locationId==='upstairs'))frame=5;
   if((['C001','C002','C003'].includes(actor.id)&&s.completions[actor.id]&&s.actors[actor.id]!.locationId==='home')||(actor.id==='C007'&&s.facts['celia.ate']))frame=4;
   if(!pos.moving&&held&&!working&&frame===0)frame=3;
   if(actor.id===D)frame=held?3:pos.moving||s.facts['ben.chasing']?Math.floor((s.tick+subtick)/3)%2:2;
   const h=actor.id===D?48:80,scale=actor.id===D?.65:.58;
   if(actor.id===P){c.strokeStyle='#ad5f3d';c.lineWidth=3;c.beginPath();c.ellipse(pos.x,pos.y+4,16,6,0,0,Math.PI*2);c.stroke();}
   c.drawImage(im,frame*64,0,64,h,pos.x-32*scale,pos.y-(h-7)*scale,64*scale,h*scale);
   if(actor.id!==D){const held=Object.entries(s.objects).find(([,o])=>o.quantity>0&&o.custody.kind==='actor'&&o.custody.id===actor.id);if(held){const id=held[0].toLowerCase(),kind=id.includes('puppet')?'puppet':id.includes('pot')?'pot':id.includes('loan')?'loanShoes':id==='shoes'?'shoes':id==='package'?'package':undefined;if(kind)this.asset(`props.${kind}`,pos.x-10,pos.y-24,.42);}}
  }
  c.restore();
 }
 hit(e:MouseEvent){const r=this.canvas.getBoundingClientRect(),scale=Math.min(r.width/1300,r.height/900),ox=(r.width-1300*scale)/2,oy=(r.height-900*scale)/2;const x=((e.clientX-r.left-ox)/scale-this.offset.x)/this.zoom,y=((e.clientY-r.top-oy)/scale-this.offset.y)/this.zoom;const nearest=blockPlaces.toSorted((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]!;return Math.hypot(nearest.x-x,nearest.y-y)<85?nearest.id:undefined;}
}
