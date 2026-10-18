import { assets } from './assets.ts';
import { blockPlaces, blockPlaceById } from '../content/block.ts';
import { dinnerContent as content, P, D, B } from '../content/dinner.ts';
import { WORLD_WIDTH, WORLD_HEIGHT, districts, townBuildings } from '../content/town-layout.ts';
import type { WorldState } from '../core/types.ts';

function objectArt(id:string){
 const special:Record<string,string>={plateA:'plate-a',plateH:'plate-h',addressElias:'address-card',addressIris:'address-card',postalBag:'mailbag',postalBundle:'mail-bundle',abelTools:'toolbag',hughBrush:'toolbag',hesterPillow:'pillow',hesterCoat:'coat',stageCushion:'cushion',nellLetter:'letter',samTools:'toolbag',samLadder:'ladder',cradle:'cradle',irisClothes:'coat',eliasCoat:'coat'};
 const lower=id.toLowerCase();return special[id]??(lower.includes('puppet')?'puppet':lower.includes('loan')?'loanShoes':lower.includes('pot')?'pot':lower.includes('package')?'package':lower.includes('shoes')?'shoes':lower.includes('key')?'key':undefined);
}

export class BlockRenderer {
 private ctx:CanvasRenderingContext2D;
 private images=new Map<string,HTMLImageElement>();
 private background=document.createElement('canvas');
 private definitions=new Map(content.actions.map(a=>[a.id,a]));
 private zoom=1;
 private offset={x:0,y:0};
 private center={x:650,y:450};
 private following=false;
 private dragged=false;
 private pointer:{id:number;x:number;y:number;startX:number;startY:number}|null=null;
 constructor(private canvas:HTMLCanvasElement){
  this.ctx=canvas.getContext('2d')!;this.background.width=WORLD_WIDTH;this.background.height=WORLD_HEIGHT;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};this.dragged=false;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{const p=this.pointer;if(!p||p.id!==e.pointerId)return;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>5)this.dragged=true;if(this.dragged){const scale=canvas.getBoundingClientRect().width/canvas.width;this.following=false;this.center.x-=(e.clientX-p.x)/scale/this.zoom;this.center.y-=(e.clientY-p.y)/scale/this.zoom;this.clampCenter();}p.x=e.clientX;p.y=e.clientY;});
  canvas.addEventListener('pointerup',()=>{this.pointer=null;});canvas.addEventListener('pointercancel',()=>{this.pointer=null;this.dragged=true;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=this.screenPoint(e);const wx=(p.x-this.offset.x)/this.zoom,wy=(p.y-this.offset.y)/this.zoom;this.setZoom(this.zoom*(e.deltaY<0?1.25:.8));this.following=false;this.center={x:wx+(650-p.x)/this.zoom,y:wy+(this.canvas.height/2-p.y)/this.zoom};this.clampCenter();},{passive:false});
 }
 async load(){
  await Promise.all(Object.entries(assets).map(async([id,asset])=>{const image=new Image();image.src=asset.src;await image.decode();this.images.set(id,image);}));
  const visible=this.ctx;this.ctx=this.background.getContext('2d')!;const c=this.ctx;c.imageSmoothingEnabled=false;
  c.fillStyle='#bcc7a9';c.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  for(let y=0;y<WORLD_HEIGHT;y+=24)for(let x=(y%48?12:0);x<WORLD_WIDTH;x+=48){c.fillStyle=(x+y)%96?'#b7c2a4':'#b2bea0';c.fillRect(x,y,4,4);}
  // Three continuous lanes, connected by side streets between the building rows.
  for(const [y,h]of [[900,80],[1050,140],[2220,80]]){c.fillStyle='#a3ada2';c.fillRect(0,y!,WORLD_WIDTH,h!);c.fillStyle='#e5d9b5';c.fillRect(0,y!+4,WORLD_WIDTH,5);c.fillRect(0,y!+h!-9,WORLD_WIDTH,5);for(let x=12;x<WORLD_WIDTH;x+=64){c.fillStyle='#bac1b0';c.fillRect(x,y!+h!/2,28,2);}}
  for(const [i,d]of districts.entries()){
   c.fillStyle='#a3ada2';c.fillRect(d.x-24,930,48,190);c.fillRect(i*1240+800,1120,60,1140);
   c.fillStyle='#d3d2b8';c.fillRect(i*1240+790,1200,8,1000);c.fillRect(i*1240+862,1200,8,1000);
   for(let x=i*1240+80;x<i*1240+1200;x+=180){this.asset('props.tree',x,1000,.75);this.asset('props.lamp',x+80,1000,.75);}
   for(let x=i*1240+140;x<i*1240+1100;x+=245){this.asset('props.bicycle',x,805,.65);this.asset('props.flower',x+64,780,.75);}
   for(let j=0;j<7;j++) {c.fillStyle='#ede5c8';c.fillRect(i*1240+802+j*8,1090,4,60);}
   this.label(d.name,d.x,1240,30);
  }
  this.asset('buildings.courtyard',0,750);
  for(const b of townBuildings){
   const kind=b.id==='A'?'apartment-a':b.id==='M'?'mixed-use':b.id==='B'?'apartment-b':`town-${b.skin}`;
   this.asset(`buildings.${kind}`,b.x,b.y);
   if(b.id==='V')for(const id of ['postDoor','postSide']){const door=blockPlaceById.get(id)!;this.line([[door.x,door.y+30],[door.x,940]],'#a3ada2',24);}
   for(const place of blockPlaces.filter(p=>p.building===b.id)){
    if(place.kind==='hall'){if(place.floor>1)this.asset('buildings.stairs',place.x-24,place.y+15);this.label(`${place.floor}F`,place.x,place.y+22,11);continue;}
    if(place.interior==='postalEntrance')this.asset(`interiors.${place.interior}`,place.x-40,place.y-70,.625);
    else if(place.kind==='roof')this.asset(`interiors.${place.interior}`,place.x-32,place.y-72,.5);
    else this.asset(`interiors.${place.interior}`,place.x-64,place.y-112);
    const title=place.name.split('・').at(-1)!;
    this.label(place.kind==='roof'?'屋上':place.interior==='postalEntrance'?title:`${place.room} ${title.length>10?title.slice(0,9)+'…':title}`,place.x,place.y+24,11);
   }
   const entrance=blockPlaces.find(p=>p.building===b.id&&p.floor===1&&p.kind==='hall')!;
   if(!b.original&&b.id!=='V'){this.line([[entrance.x,entrance.y+30],[entrance.x,b.y>1000?2260:940]],'#a3ada2',24);}
   this.label(b.name,b.x+b.width/2,b.y-44,17);
  }
  this.asset('interiors.petGarden',1126,706);this.label('ペット用の囲い',1190,842,12);this.label('共用中庭',650,885,14);
  this.ctx=visible;this.canvas.dataset.assetsReady=String(this.images.size);
 }
 private clampCenter(){const halfW=650/this.zoom,halfH=this.canvas.height/2/this.zoom;this.center.x=Math.max(halfW,Math.min(WORLD_WIDTH-halfW,this.center.x));this.center.y=WORLD_HEIGHT<halfH*2?WORLD_HEIGHT/2:Math.max(halfH,Math.min(WORLD_HEIGHT-halfH,this.center.y));}
 setZoom(value:number){this.zoom=Math.max(1300/WORLD_WIDTH,Math.min(3,value));const height=Math.min(900,Math.round(WORLD_HEIGHT*this.zoom));if(this.canvas.height!==height){this.canvas.height=height;this.canvas.style.aspectRatio=`1300 / ${height}`;}this.clampCenter();return this.zoom;}
 getZoom(){return this.zoom;}
 overview(){this.following=false;this.setZoom(1300/WORLD_WIDTH);this.center={x:WORLD_WIDTH/2,y:WORLD_HEIGHT/2};}
 follow(){this.following=true;this.setZoom(Math.max(1,this.zoom));}
 focus(x:number,y:number){this.following=false;this.setZoom(1);this.center={x,y};this.clampCenter();}
 drawMini(canvas:HTMLCanvasElement,s:WorldState){const c=canvas.getContext('2d')!,sx=canvas.width/WORLD_WIDTH,sy=canvas.height/WORLD_HEIGHT;c.fillStyle='#bbc5aa';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#889c8e';for(const y of [940,1120,2260])c.fillRect(0,y*sy,canvas.width,3);for(const b of townBuildings){c.fillStyle=b.original?'#7b9388':'#9e8e70';c.fillRect(b.x*sx,b.y*sy,b.width*sx,b.height*sy);}c.strokeStyle='#f5efcf';c.lineWidth=1;c.strokeRect((this.center.x-650/this.zoom)*sx,(this.center.y-this.canvas.height/2/this.zoom)*sy,1300/this.zoom*sx,this.canvas.height/this.zoom*sy);const p=this.position(P,s,0);c.fillStyle='#a63f34';c.fillRect(p.x*sx-3,p.y*sy-3,6,6);}
 miniFocus(canvas:HTMLCanvasElement,e:MouseEvent){const r=canvas.getBoundingClientRect();this.focus((e.clientX-r.left)/r.width*WORLD_WIDTH,(e.clientY-r.top)/r.height*WORLD_HEIGHT);}
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
  if(this.following){this.center={x:player.x,y:player.y};this.clampCenter();}
  this.offset={x:650-this.center.x*this.zoom,y:this.canvas.height/2-this.center.y*this.zoom};
  this.canvas.dataset.camera=JSON.stringify({zoom:this.zoom,x:this.offset.x,y:this.offset.y,following:this.following});
  c.imageSmoothingEnabled=false;c.fillStyle='#d9dfc8';c.fillRect(0,0,1300,this.canvas.height);
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
  if(s.facts['tea.done'])prop('tea','agnes',24,-20,.5);
  if(s.facts['bee.tea'])prop('tea','vera',42,-24,.45);
  prop(s.facts['post.open']?'post-door-open':'post-door-closed','postDoor',-6,-31,.75);
  prop('post-door-open','postSide',-6,-31,.75);
  if(s.facts['post.repaired'])prop('flag','postDoor',32,-28,.3);
  const desk=blockPlaceById.get('sorting')!;c.fillStyle='#d1b589';c.fillRect(desk.x-56,desk.y-40,112,48);c.fillStyle='#c3a57c';for(let y=desk.y-38;y<desk.y+8;y+=16)c.fillRect(desk.x-56,y,112,4);
  prop('postal-table','sorting',18,s.facts['post.tableMoved']?0:-18,.85);
  if(!s.facts['post.tableMoved'])prop('cargo','sorting',18,12,.4);
  prop('rug','vera',s.facts['cradle.level']?-40:2,10,.75);
  prop('bell','H.hall2',-14,-44,.5);
  if(s.facts['bell.fixed'])prop('rope','H.hall2',-14,-25,.45);
  prop('ladder','scaffold',48,4,.75);if(s.facts['sam.externalReady'])prop('rope','scaffold',38,-40,.5);
  if(s.facts['iris.returnOpen'])prop('flag','iris',-48,-52,.45);
  if(s.facts['hester.coatReady']&&!s.facts['hester.pillowHere'])prop('cushion','hester',-27,-48,.5);
  if(s.facts['celia.curtain'])prop('curtain-closed','celia',-39,-70,.65);
  if(s.facts['mabel.locked']||s.facts['mabel.closed'])prop('shutter-closed','market',0,-22,1.1);
  if(s.facts['leo.closed'])prop('shutter-closed','shoe',0,-22,1.1);
  prop('return-box','shoe',52,10,.55);
  for(const [id,obj]of Object.entries(s.objects)){
   const asset=objectArt(id);
   if(asset&&obj.quantity>0&&obj.custody.kind==='place'&&blockPlaceById.has(obj.custody.id))prop(asset,obj.custody.id,id==='cradle'?12:-35,id==='cradle'?8:-22,id==='cradle'?.85:.48);
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
   if(['C009','C010','C011','C025'].includes(actor.id)&&s.completions[actor.id]&&!pos.moving)frame=4;
   if(actor.id==='C021'&&s.facts['bee.rest'])frame=4;
   if(actor.id==='C013'&&s.facts['nell.sewing']&&!pos.moving)frame=3;
   if(!pos.moving&&held&&!working&&frame===0)frame=3;
   if(actor.id===D)frame=held?3:pos.moving||s.facts['ben.chasing']?Math.floor((s.tick+subtick)/3)%2:2;
   if(actor.id==='C020'){
    frame=s.facts['finn.sleeping']?4:s.facts['finn.held']?3:s.facts['finn.quiet']?2:Math.floor((s.tick+subtick)/8)%2;
    if(s.facts['finn.held']){const bee=this.position('C021',s,subtick);pos.x=bee.x+8;pos.y=bee.y-12;}else{const room=blockPlaceById.get('vera')!;pos.x=room.x+19;pos.y=room.y-10;}
   }
   const h=actor.id===D?48:80,scale=actor.id===D?.75:.5;
   if(actor.id===P){c.fillStyle='#ad5f3d';c.fillRect(pos.x-17,pos.y+3,34,4);c.fillStyle='#fff1c9';c.fillRect(pos.x-6,pos.y-52,12,4);c.fillRect(pos.x-3,pos.y-48,6,4);}
   if(actor.id==='C017'&&s.facts['hester.lying']&&!pos.moving){const bed=blockPlaceById.get('hester')!;c.save();c.translate(bed.x-22,bed.y-30);c.rotate(-Math.PI/2);c.drawImage(im,0,0,64,80,-16,-20,32,40);c.restore();}
   else c.drawImage(im,frame*64,0,64,h,pos.x-32*scale,pos.y-(h-7)*scale,64*scale,h*scale);
   if(actor.id!==D){const priority=['plateA','plateH','postalBundle','postalBag'];const carried=Object.entries(s.objects).sort(([a],[b])=>(priority.includes(a)?priority.indexOf(a):9)-(priority.includes(b)?priority.indexOf(b):9)).find(([id,o])=>objectArt(id)&&o.quantity>0&&o.custody.kind==='actor'&&o.custody.id===actor.id);if(carried){const kind=objectArt(carried[0]);if(kind)this.asset(`props.${kind}`,pos.x-10,pos.y-24,.42);}}
  }
  c.restore();
 }
 private screenPoint(e:MouseEvent){const r=this.canvas.getBoundingClientRect(),scale=Math.min(r.width/1300,r.height/this.canvas.height),ox=(r.width-1300*scale)/2,oy=(r.height-this.canvas.height*scale)/2;return {x:(e.clientX-r.left-ox)/scale,y:(e.clientY-r.top-oy)/scale};}
 hit(e:MouseEvent){if(this.dragged){this.dragged=false;return;}const p=this.screenPoint(e),x=(p.x-this.offset.x)/this.zoom,y=(p.y-this.offset.y)/this.zoom;let nearest:typeof blockPlaces[number]|undefined,distance=Infinity;for(const place of blockPlaces){const d=Math.hypot(place.x-x,place.y-y);if(d<distance){distance=d;nearest=place;}}return distance<75?nearest?.id:undefined;}
}
