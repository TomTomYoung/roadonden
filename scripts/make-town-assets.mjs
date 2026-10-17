import {mkdir,writeFile} from 'node:fs/promises';
const root='public/pixel-assets',entries=[];
// Art is authored on a two-dimensional pixel grid. SVG only stores the pixel runs.
// Original smooth source assets remain in public/assets; no resampling filter is used.
const palette={ink:'#3d4647',wood:'#aa7953',woodLight:'#d3a475',cream:'#eddfba',light:'#f6edcf',green:'#65886d',leaf:'#92aa72',teal:'#709a99',dark:'#435e66',red:'#b46a57',gold:'#d8ae59',blue:'#7b93ad',pink:'#c79591'};
class Pixels{
 constructor(w,h){this.w=w;this.h=h;this.rows=Array.from({length:h},()=>Array(w).fill(null));}
 rect(x,y,w,h,color){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(yy>=0&&yy<this.h&&xx>=0&&xx<this.w)this.rows[yy][xx]=color;return this;}
 dot(x,y,color){return this.rect(x,y,1,1,color);}
 line(x0,y0,x1,y1,color){let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,error=dx+dy;for(;;){this.dot(x0,y0,color);if(x0===x1&&y0===y1)break;const e=2*error;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}return this;}
 box(x,y,w,h,color,inside){this.rect(x,y,w,h,color);if(w>2&&h>2)this.rect(x+1,y+1,w-2,h-2,inside);return this;}
 svg(scale=4){let runs='';for(let y=0;y<this.h;y++){for(let x=0;x<this.w;){const color=this.rows[y][x];let end=x+1;while(end<this.w&&this.rows[y][end]===color)end++;if(color)runs+=`<rect x="${x*scale}" y="${y*scale}" width="${(end-x)*scale}" height="${scale}" fill="${color}"/>`;x=end;}}return runs;}
}
async function save(dir,id,p,usage,states=['static'],scale=4){await mkdir(`${root}/${dir}`,{recursive:true});const width=p.w*scale,height=p.h*scale;await writeFile(`${root}/${dir}/${id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${p.svg(scale)}</svg>`);entries.push({id:`${dir}.${id}`,file:`${dir}/${id}.svg`,width,height,pixelWidth:p.w,pixelHeight:p.h,pixelScale:scale,usage,states,source:'scripts/make-town-assets.mjs',license:'Project original'});}
const colors=[['#cdb28b','#708e88'],['#b0bbb5','#657e8d'],['#d4c5a2','#a28070'],['#c3b4ae','#946d73'],['#b9bf9e','#7c8c6c'],['#d2b59b','#a67f58']];
for(const [id,width,skin]of [['apartment-a',350,0],['mixed-use',430,1],['apartment-b',388,2],...colors.map((_,i)=>[`town-${i}`,360,i])]){
 const p=new Pixels(width/2,315),[wall,trim]=colors[skin];
 p.rect(0,12,p.w,295,wall).rect(0,8,p.w,7,trim).rect(0,305,p.w,8,trim);
 for(let yy=18;yy<305;yy+=9)for(let xx=2+(yy%18?8:0);xx<p.w-3;xx+=18)p.rect(xx,yy,12,1,'#b19d872c');
 for(const yy of [30,120,210]){p.rect(7,yy,p.w-48,64,'#e7d8b6').rect(7,yy+64,p.w-14,13,'#969d90').rect(7,yy+64,p.w-14,2,'#e9d9b5').rect(p.w-34,yy,26,78,'#8e9d98');for(let x=9;x<p.w-14;x+=10)p.rect(x,yy+72,1,7,trim);p.rect(7,yy+72,p.w-14,2,trim);}
 p.rect(10,0,38,8,trim).rect(p.w-51,0,37,8,trim).rect(10,2,35,2,'#d9dfc1');p.rect(p.w-8,17,2,286,'#778b88');
 await save('buildings',id,p,'ドット絵の外壁・三層の床・廊下・屋上',['static'],2);
}
let p=new Pixels(12,38);p.rect(0,0,12,38,'#8d9f99');for(let y=2;y<38;y+=3)p.rect(1,y,10,1,'#d3cfaf');p.line(1,36,10,1,'#506d70');p.line(10,36,1,1,'#506d70');await save('buildings','stairs',p,'階段');
p=new Pixels(325,38);p.rect(0,0,325,38,'#bdc6aa');for(let y=0;y<38;y+=8)p.rect(0,y,325,1,'#adb99d');for(let x=0;x<325;x+=12)p.rect(x,0,1,38,'#b1bda0');for(let x=12;x<320;x+=45)p.rect(x,3,20,5,'#7b8c64').rect(x+2,1,6,5,'#9bac7a').rect(x+9,0,8,6,'#829d66');await save('buildings','courtyard',p,'中庭の舗装と植栽');
const kinds=['reception','kitchen','workKitchen','grocer','shoeShop','club','studio','dining','bedroom','lounge','mailroom','laundry','workshop','theatre','roof','roofGarden','petGarden','courtyard','loading','stairs','pawn','storage','bakery','mill','loom','kiln','elevator','stage','library','printing','bus'];
function window(p){p.box(2,2,11,7,palette.dark,palette.teal).rect(7,3,1,5,palette.light).rect(3,5,9,1,palette.light).rect(2,9,11,1,palette.wood);}
function shelf(p){p.box(22,2,8,11,palette.wood,palette.dark);for(let y=4;y<12;y+=4){p.rect(23,y,6,1,palette.woodLight);p.rect(24,y-2,2,2,palette.cream).rect(27,y-2,2,2,palette.red);}}
function table(p){p.rect(4,17,24,2,palette.woodLight).rect(4,19,24,4,palette.wood).rect(5,23,2,5,palette.wood).rect(25,23,2,5,palette.wood);}
function pot(p,x,y){p.rect(x+1,y,6,1,palette.dark).rect(x,y+1,8,4,palette.teal).rect(x-1,y+1,1,2,palette.dark).rect(x+8,y+1,1,2,palette.dark).rect(x+1,y+4,6,1,palette.dark);}
for(const kind of kinds){const p=new Pixels(32,30);p.rect(0,0,32,30,'#e8d8b5').rect(0,15,32,15,'#d1b589');for(let y=17;y<30;y+=4)p.rect(0,y,32,1,'#c3a57c');window(p);shelf(p);
 if(['reception','workshop','workKitchen','club','pawn','storage','printing','mill','loom'].includes(kind))table(p);
 if(['kitchen','workKitchen','bakery'].includes(kind)){p.rect(1,11,30,6,'#83978a').box(2,12,9,4,palette.cream,palette.teal).box(15,12,8,4,palette.cream,palette.dark);pot(p,15,10);}
 if(kind==='reception'){p.rect(6,15,8,2,palette.light).rect(20,12,6,5,palette.dark).rect(21,13,4,2,palette.teal).rect(3,25,7,3,palette.green);}
 if(kind==='bedroom'){p.box(2,12,20,17,palette.wood,'#7e9b8d').rect(4,13,16,5,palette.light).rect(4,19,16,8,'#a8ba95').rect(4,22,16,2,'#739b87').rect(25,15,5,11,palette.wood);}
 if(['dining','lounge'].includes(kind)){p.rect(7,17,19,7,palette.woodLight).rect(9,24,2,4,palette.wood).rect(23,24,2,4,palette.wood).box(10,18,5,4,palette.light,palette.cream).box(19,18,5,4,palette.light,palette.cream).rect(13,26,8,3,palette.green);}
 if(kind==='grocer'){table(p);for(let x=5;x<28;x+=6)p.rect(x,13,5,4,palette.wood).rect(x+1,12,3,3,x%3?palette.gold:palette.red);p.box(1,23,29,6,palette.dark,palette.teal);}
 if(kind==='shoeShop'){table(p);for(let x=5;x<29;x+=10)p.rect(x,13,3,4,palette.dark).rect(x+3,15,5,2,palette.wood);p.box(3,25,8,4,palette.dark,palette.gold);}
 if(kind==='club'){p.rect(5,13,7,4,palette.light).rect(23,14,4,3,palette.blue).rect(8,10,2,3,palette.red).rect(9,8,2,2,palette.woodLight).rect(19,13,2,3,palette.green);}
 if(kind==='studio'){p.box(2,2,28,13,palette.dark,'#a8bfc0').line(4,12,13,3,palette.light).line(17,12,26,3,palette.light).rect(2,12,28,1,palette.wood);for(const x of [7,23])p.rect(x,24,4,1,palette.wood).rect(x+1,22,1,4,palette.wood);}
 if(kind==='laundry'){for(const x of [2,18])p.box(x,10,12,16,palette.dark,palette.light).box(x+2,14,8,8,palette.teal,palette.dark).rect(x+4,16,4,4,'#a8bfbd');p.rect(0,4,32,1,palette.wood).rect(3,5,6,5,palette.gold).rect(22,5,7,3,palette.green);}
 if(['mailroom','storage','library'].includes(kind)){p.rect(1,2,30,15,palette.wood);for(let y=3;y<16;y+=5)for(let x=2;x<29;x+=6)p.box(x,y,5,4,palette.cream,kind==='library'?palette.green:palette.teal);p.box(3,21,12,7,palette.wood,palette.cream).box(19,20,10,7,palette.wood,palette.gold);}
 if(['theatre','stage'].includes(kind)){p.rect(1,2,30,21,palette.dark).rect(1,2,5,21,palette.red).rect(26,2,5,21,palette.red).rect(3,2,2,19,'#8a5260').rect(28,2,2,19,'#8a5260').rect(6,19,20,4,palette.woodLight);for(const x of [4,13,22])p.rect(x,26,6,3,palette.green);}
 if(['roof','roofGarden','petGarden','courtyard'].includes(kind)){p.rect(0,0,32,30,'#bbc2a3');for(let y=4;y<29;y+=8)p.rect(0,y,32,1,'#a1b18e');for(const x of [3,14,25])p.rect(x,22,5,6,palette.wood).rect(x+2,11,1,12,palette.green).rect(x,14,6,4,palette.green).rect(x-1,10,4,5,palette.leaf);}
 if(kind==='loading'){p.rect(2,3,28,2,palette.dark).rect(4,5,2,20,palette.dark).rect(27,5,2,20,palette.dark).rect(15,5,1,13,palette.dark).box(10,17,12,9,palette.wood,palette.woodLight).line(11,18,20,24,palette.wood);}
 if(kind==='workshop'){p.box(4,10,10,7,palette.dark,palette.teal).rect(6,12,6,1,palette.cream).rect(20,12,7,3,palette.wood).line(23,7,23,14,palette.dark).line(20,10,26,10,palette.dark);}
 if(kind==='pawn'){p.rect(6,10,5,7,palette.blue).rect(4,11,2,4,palette.blue).rect(11,11,2,4,palette.blue).rect(17,14,2,2,palette.gold).rect(19,15,5,1,palette.gold);}
 if(kind==='bakery'){p.box(18,3,12,12,palette.dark,palette.wood).rect(21,9,6,4,palette.dark).rect(3,23,26,4,palette.wood);for(let x=5;x<28;x+=7)p.rect(x,21,5,3,palette.gold).rect(x+1,20,3,1,palette.cream);}
 if(kind==='mill'){p.box(7,10,12,7,palette.dark,palette.teal).rect(12,5,2,6,palette.dark).rect(5,7,18,1,palette.dark).rect(4,8,6,3,palette.gold).rect(19,8,6,3,palette.gold);}
 if(kind==='loom'){p.rect(5,3,2,14,palette.wood).rect(25,3,2,14,palette.wood).rect(5,4,22,2,palette.woodLight);for(let x=8;x<25;x+=2)p.rect(x,6,1,11,palette.light);p.rect(8,12,17,3,palette.teal);}
 if(kind==='kiln'){p.box(7,5,18,23,palette.dark,palette.red).box(9,13,14,12,palette.wood,palette.dark).rect(12,20,7,3,palette.gold);}
 if(kind==='elevator'){p.box(6,2,20,26,palette.dark,palette.teal).box(8,4,16,23,palette.light,'#98aeab').rect(15,4,1,23,palette.dark).rect(28,12,2,3,palette.gold);}
 if(kind==='printing'){p.box(8,8,16,10,palette.dark,palette.teal).rect(10,6,12,5,palette.light).rect(10,15,12,3,palette.dark).rect(11,18,10,5,palette.light);}
 if(kind==='bus'){p.rect(3,9,27,14,palette.teal).rect(5,7,21,3,palette.light);for(let x=6;x<27;x+=7)p.rect(x,11,5,5,palette.dark);p.rect(3,20,27,2,palette.gold).rect(7,23,4,3,palette.dark).rect(24,23,4,3,palette.dark);}
 await save('interiors',kind,p,`ドット絵の内装: ${kind}`);}
const shirts=['#658d85','#b5745c','#7c87a4','#b39857','#a07c91','#71875e','#6c99a8','#a48466'];
const skins=['#d7ab80','#bd8e69','#e5bf95','#b67f5d','#d0a789'];
for(const [index,id]of ['player',...Array.from({length:100},(_,i)=>`C${String(i+1).padStart(3,'0')}`)].entries()){
 const p=new Pixels(96,20),top=id==='player'?'#b35e48':shirts[index%shirts.length],skin=skins[index%skins.length],hair=['#4d4743','#775b48','#aca392','#353e43'][index%4],child=[3,4,20,60,63,64,68].includes(index);
 for(let frame=0;frame<6;frame++){const x=frame*16,hy=child?6:3,by=hy+5;const leg=frame===4?17:16,step=frame===1?-1:frame===2?1:0;p.rect(x+4,19,9,1,'#52665b55');p.rect(x+5,leg,3,3,'#465764').rect(x+9,leg,3,3,'#465764');if(frame===1||frame===2){p.rect(x+5+step,18,3,1,palette.dark).rect(x+9-step,18,3,1,palette.dark);}p.rect(x+4,by,9,child?6:8,top).rect(x+5,by+1,1,5,'#ffffff22').rect(x+6,hy,5,5,skin).rect(x+5,hy-1,7,2,hair).rect(x+5,hy,1,3,hair).dot(x+9,hy+2,palette.dark);
 if(index%5===0)p.rect(x+6,by+1,5,6,palette.cream);if(index%7===0)p.rect(x+4,hy-1,9,1,top).rect(x+6,hy-3,5,2,top);
 if(frame===3)p.rect(x+3,by+4,3,2,skin).rect(x+11,by+4,3,2,skin).rect(x+6,by+4,5,3,palette.woodLight);else if(frame===5)p.line(x+3,by+2,x+1,hy,skin).line(x+13,by+2,x+15,hy-1,skin);else p.rect(x+3,by+2,2,4,skin).rect(x+13,by+2,2,4,skin);
 if(frame===4)p.rect(x+4,17,4,2,'#465764').rect(x+10,17,4,2,'#465764');if(id==='player')p.rect(x+2,by+3,3,5,palette.gold);
 }
 if(id==='C020'){
  p.rows=Array.from({length:20},()=>Array(96).fill(null));
  for(let f=0;f<6;f++){const x=f*16;p.rect(x+3,11,10,6,palette.cream).rect(x+6,10,6,7,palette.teal).rect(x+8,12,5,3,palette.light).rect(x+2,10,5,5,skin).rect(x+3,9,3,1,hair).rect(x+4,12,f===4?2:1,1,palette.dark);if(f<3)p.dot(x+4,14,palette.red);p.rect(x+11,15,3,1,palette.cream);}
 }
 await save('residents',id,p,'人物。個別の配色・髪・服装と6姿勢。シナリオ実装人数とは別。',id==='C020'?['cry','unsettled','quiet','held','asleep','rest']:['idle','walk-a','walk-b','work','sit','dance']);
}
p=new Pixels(64,12);for(let f=0;f<4;f++){const x=f*16;p.rect(x+3,6,9,4,'#b18d64').rect(x+10,4,4,4,'#caab7b').rect(x+10,3,2,3,'#87694f').dot(x+13,5,palette.dark).rect(x+4,10,2,2,'#87694f').rect(x+10,10,2,2,'#87694f').line(x+3,7,x+1,f%2?3:5,'#87694f');if(f===3)p.rect(x+12,8,4,2,palette.dark);}await save('residents','dog',p,'犬の4姿勢',['idle','walk','look','carry-shoe']);
const props=['cargo','stand','flag','gate-open','gate-closed','toy','meal','curtain-closed','shutter-closed','return-box','loanShoes','shoes','pot','package','puppet','key','coat','tea','chair','mail','bicycle','tree','lamp','flower','pillow','cushion','letter','ladder','rope','toolbag','cradle','rug','bell'];
for(const id of props){const p=new Pixels(16,16);
 if(['cargo','package','return-box','mail'].includes(id)){p.box(2,5,12,10,palette.wood,palette.woodLight).rect(7,6,2,8,palette.cream).rect(3,9,10,1,palette.cream);if(id==='return-box')p.rect(4,7,8,2,palette.dark);}
 else if(id==='stand'||id==='chair'){p.rect(2,8,12,3,palette.woodLight).rect(3,11,2,5,palette.wood).rect(11,11,2,5,palette.wood);if(id==='chair')p.rect(3,3,10,4,palette.wood);}
 else if(id==='flag')p.rect(3,1,1,15,palette.wood).rect(4,1,9,6,palette.blue).rect(4,7,6,1,palette.blue);
 else if(id.startsWith('gate')){p.rect(1,4,2,12,palette.wood).rect(13,4,2,12,palette.wood);const end=id==='gate-open'?6:14;p.rect(2,7,end-2,2,palette.woodLight).rect(2,12,end-2,2,palette.woodLight);for(let x=4;x<end;x+=3)p.rect(x,6,1,9,palette.wood);}
 else if(id==='toy')p.rect(4,8,8,6,palette.gold).rect(3,10,10,3,palette.gold);
 else if(id==='meal'||id==='tea'){p.rect(1,10,14,4,palette.wood);p.rect(3,6,4,4,palette.light).rect(10,6,4,4,palette.teal).rect(4,3,1,2,palette.cream).rect(11,3,1,2,palette.cream);}
 else if(id.includes('curtain')){p.rect(0,0,16,16,palette.gold);for(let x=2;x<16;x+=4)p.rect(x,0,1,16,palette.woodLight);}
 else if(id.includes('shutter')){p.rect(0,0,16,16,'#7b8c8d');for(let y=2;y<16;y+=3)p.rect(0,y,16,1,'#a2aeaa');}
 else if(id==='loanShoes'||id==='shoes'){for(const x of [1,9])p.rect(x,7,3,7,palette.dark).rect(x+3,11,3,3,id==='shoes'?palette.wood:palette.blue);}
 else if(id==='pot')pot(p,4,7);
 else if(id==='puppet'){p.rect(7,3,3,3,palette.woodLight).rect(6,6,5,5,palette.red).rect(3,7,11,1,palette.red).rect(7,11,1,5,palette.wood);}
 else if(id==='key')p.box(2,5,5,5,palette.gold,palette.dark).rect(6,7,8,2,palette.gold).rect(11,9,1,2,palette.gold).rect(13,9,1,2,palette.gold);
 else if(id==='coat')p.rect(4,3,8,12,palette.blue).rect(2,4,2,7,palette.blue).rect(12,4,2,7,palette.blue).rect(7,4,1,10,palette.dark);
 else if(id==='pillow'||id==='cushion'){p.box(1,7,14,7,id==='pillow'?palette.teal:palette.wood,id==='pillow'?palette.light:palette.gold).rect(3,8,10,1,palette.cream);for(let x=3;x<8;x+=2)p.dot(x,12,id==='pillow'?palette.blue:palette.red);}
 else if(id==='letter')p.box(1,5,14,9,palette.wood,palette.light).line(2,6,8,10,palette.woodLight).line(8,10,14,6,palette.woodLight).rect(11,6,2,2,palette.pink);
 else if(id==='ladder'){p.rect(3,0,2,16,palette.wood).rect(11,0,2,16,palette.wood);for(let y=2;y<16;y+=4)p.rect(5,y,6,1,palette.woodLight);}
 else if(id==='rope'){for(let x=2;x<14;x+=4)p.box(x,7,4,5,palette.woodLight,palette.dark);p.rect(1,12,14,1,palette.cream);}
 else if(id==='toolbag')p.box(1,7,14,8,palette.dark,palette.teal).box(5,4,6,4,palette.dark,palette.cream).rect(3,5,1,6,palette.wood).rect(11,2,2,8,palette.woodLight).rect(10,2,4,2,palette.dark);
 else if(id==='cradle'){p.rect(1,6,14,7,palette.wood).rect(2,7,12,4,palette.light);for(let x=2;x<15;x+=3)p.rect(x,4,1,9,palette.woodLight);p.rect(1,14,14,1,palette.wood).rect(2,13,2,1,palette.wood).rect(12,13,2,1,palette.wood);}
 else if(id==='rug'){p.rect(0,7,16,8,palette.red).rect(1,8,14,1,palette.cream).rect(1,13,14,1,palette.cream);for(let x=2;x<15;x+=3)p.rect(x,10,1,2,palette.gold);}
 else if(id==='bell')p.rect(5,3,6,6,palette.gold).rect(3,8,10,2,palette.gold).rect(7,10,2,2,palette.wood).rect(7,0,1,3,palette.wood).rect(7,12,1,4,palette.cream);
 else if(id==='tree')p.rect(7,9,2,7,palette.wood).rect(3,3,10,7,palette.green).rect(5,1,6,3,palette.leaf).rect(1,5,14,3,palette.green);
 else if(id==='lamp')p.rect(7,3,1,13,palette.dark).rect(4,2,7,2,palette.dark).rect(5,0,5,2,palette.gold);
 else if(id==='flower')p.rect(3,10,10,6,palette.wood).rect(5,6,1,4,palette.green).rect(10,5,1,5,palette.green).rect(4,4,3,3,palette.pink).rect(9,3,3,3,palette.gold);
 else if(id==='bicycle')p.box(0,10,6,5,palette.dark,'#b9c8ac').box(10,10,6,5,palette.dark,'#b9c8ac').line(3,12,7,7,palette.red).line(7,7,13,12,palette.red).line(3,12,13,12,palette.red).rect(10,4,1,5,palette.dark).rect(9,4,4,1,palette.dark);
 await save('props',id,p,`ドット絵の小道具: ${id}`);
}
await writeFile(`${root}/manifest.json`,JSON.stringify({version:'town-pixel-0.5.0',notes:'Integer-grid original pixel art; source SVGs in public/assets are preserved. 100 resident sheets do not imply 100 implemented scenarios.',assets:entries},null,2)+'\n');
let imports='',mapping='';for(const [i,e]of entries.entries()){imports+=`import asset${i} from '../../${root}/${e.file}';\n`;mapping+=`  '${e.id}': {src:asset${i},width:${e.width},height:${e.height}},\n`;}
await writeFile('src/game/assets.ts',imports+`\nexport const assets:Record<string,{src:string;width:number;height:number}> = {\n${mapping}};\n`);
console.log(`Generated ${entries.length} pixel assets.`);
