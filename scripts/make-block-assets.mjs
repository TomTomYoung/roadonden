import { mkdir, writeFile } from 'node:fs/promises';
// Editable vector source. All dimensions are native viewBox dimensions, never stretched.
const root='public/assets';
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const rect=(x,y,w,h,fill,rx=0,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
const path=(d,fill='none',stroke='#4a5656',width=2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const text=(t,x,y,size=10,fill='#56615b')=>`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${fill}">${t}</text>`;
const entries=[];
async function save(dir,id,w,h,body,usage,states=['static']){await mkdir(`${root}/${dir}`,{recursive:true});await writeFile(`${root}/${dir}/${id}.svg`,svg(w,h,body));entries.push({id:`${dir}.${id}`,file:`${dir}/${id}.svg`,width:w,height:h,usage,states,source:'Original procedural SVG; scripts/make-block-assets.mjs',license:'Project original'});}
const wall=`<defs><pattern id="brick" width="36" height="18" patternUnits="userSpaceOnUse">${path('M0 0H36M0 9H36M18 0V9M0 9V18M36 9V18','none','#0000000d',1)}</pattern></defs>`;
for(const [id,w,color,trim] of [['apartment-a',350,'#d8c3a4','#748f88'],['mixed-use',430,'#b8c6c6','#687e89'],['apartment-b',388,'#d9d5bc','#aa8c76']]){
 let s=wall+rect(0,24,w,590,color,3)+rect(0,24,w,590,'url(#brick)')+rect(0,17,w,13,trim)+rect(0,610,w,14,trim);
 for(const y of [60,240,420]){s+=rect(13,y,w-26,132,'#353e431c')+rect(17,y+4,w-95,123,'#f0e6d2')+rect(17,y+128,w-34,28,'#b7b3a0');for(let x=20;x<w-35;x+=25)s+=path(`M${x} ${y+147}v12`,'none',trim,2);s+=path(`M14 ${y+145}H${w-14}`,'none',trim,4);s+=rect(w-68,y,50,156,'#98a3a0');}
 s+=rect(20,0,80,17,trim)+rect(w-103,0,74,17,trim)+rect(w-92,32,65,15,'#d9e0da')+path(`M${w-17} 24V610`,'none','#778a84',3);
 await save('buildings',id,w,630,s,'建物全体の壁・床スラブ・外廊下・階段室');
}
let court=rect(0,0,1300,150,'#c4c7b5')+path('M0 98H1300M0 100H1300','none','#a9af9f',2);
for(let x=0;x<1300;x+=48)court+=path(`M${x} 0V150`,'none','#b8bba9',1);
for(let x=60;x<1290;x+=190)court+=rect(x,12,86,27,'#839980',3)+circle(x+18,11,16,'#9caf85')+circle(x+47,10,18,'#a7b48e')+circle(x+72,15,13,'#96a882');
court+=rect(58,84,100,15,'#a38d71',2)+rect(65,99,5,14,'#6e7871')+rect(143,99,5,14,'#6e7871')+path('M190 0V150M500 0V150M890 0V150','none','#f2e8cd',3);
await save('buildings','courtyard',1300,150,court,'棟間の舗装・植栽・ベンチ・搬入区分');
let stairs=rect(0,0,48,154,'#adb6af');for(let y=5;y<150;y+=13)stairs+=path(`M3 ${y}H45`,'none','#d5d9cc',3);stairs+=path('M6 145L40 7M41 145L7 7','none','#697b75',2);await save('buildings','stairs',48,154,stairs,'階段・手すり・段差');
const desk=rect(15,56,98,25,'#b49570',3)+rect(20,80,5,18,'#836e55')+rect(103,80,5,18,'#836e55');
const window=rect(7,8,45,29,'#719699',1)+path('M29 8V37M7 22H52','none','#d9dccc',2);
const shelf=rect(83,10,38,41,'#9a866b',2)+path('M86 23H118M86 36H118','none','#e1d0af',2);
const kitchen=window+shelf+rect(7,44,114,27,'#9ba69b')+rect(8,46,37,19,'#d6dad0')+circle(25,55,6,'#7e8b86')+rect(54,47,24,17,'#e2e1d2')+circle(66,55,6,'#4f6668')+rect(61,45,11,10,'#7c9591',2)+path('M60 49H56M73 49H77','none','#455756',2);
const interiors={
 reception:window+shelf+desk+rect(22,46,32,10,'#f0e8cf')+rect(77,40,20,17,'#5d7275')+path('M87 57V62','none','#596967',3)+rect(14,91,37,18,'#688a7a',3),
 kitchen:kitchen+rect(37,88,58,23,'#ba9670',4)+circle(48,99,7,'#ebe1c9')+circle(81,99,7,'#ebe1c9')+circle(64,95,6,'#739a86'),
 workKitchen:kitchen+desk+rect(42,43,32,17,'#6d8b91',4)+rect(74,47,21,5,'#5e4a3d')+path('M45 39Q50 30 58 38','none','#c7c6ab',2),
 grocer:window+rect(72,8,48,33,'#607d79',3)+rect(75,11,42,27,'#a6bcb0')+desk+rect(20,45,26,17,'#8b9270')+circle(25,50,4,'#b77d54')+circle(35,52,4,'#dcaf65')+rect(53,44,27,14,'#af946f')+rect(86,48,20,8,'#e2d6b9')+rect(15,92,98,13,'#708b7c'),
 shoeShop:shelf+desk+path('M22 42v12h29q6-9-8-10l-9-9z','#745746')+path('M75 42v12h29q6-9-8-10l-9-9z','#b49065')+rect(14,90,31,18,'#c4ae83',2)+text('RETURN',17,103,6),
 club:window+shelf+desk+rect(21,44,28,13,'#f5e2ac')+path('M26 43l8-15 8 15z','#bd8661')+circle(34,27,5,'#d8b18c')+rect(74,43,29,15,'#b6c7b8')+path('M88 31v21M80 42h16','none','#6c8890',3)+rect(14,91,41,17,'#b6a286',2),
 studio:rect(8,8,112,52,'#a4b9b6',2,'#7e9893')+path('M12 52L76 12M45 58L111 13','none','#cdd9ca',3)+path('M8 50H120','none','#9c8369',4)+path('M24 92h13M30 86v12M91 92h13M97 86v12','none','#c0a17b',2)+rect(13,99,35,8,'#6e7d77'),
 dining:window+path('M6 8h10v31H6M43 8h10v31H43','#e5c098','#aa927a',1)+rect(78,11,41,30,'#c8b49a')+rect(27,65,75,32,'#b7946f',3)+circle(50,78,11,'#eee4ca')+rect(85,53,13,9,'#7e9b95',2)+rect(48,99,35,15,'#83988c',4),
 bedroom:window+rect(12,50,76,60,'#8b9f95',4)+rect(17,55,66,20,'#e8d7b7',3)+rect(18,79,66,25,'#bcc4ae')+rect(96,13,25,69,'#b5a085',2)+circle(110,48,2,'#6d796e'),
 lounge:window+shelf+rect(12,62,45,39,'#8da59a',5)+rect(70,62,45,39,'#ac987e',5)+rect(50,81,30,25,'#c6b18d',4)+rect(58,70,14,12,'#ebe1c7'),
 mailroom:rect(10,9,108,53,'#7d8f89',2)+Array.from({length:12},(_,i)=>rect(14+(i%4)*26,13+Math.floor(i/4)*16,22,12,'#c5cdb8',1)+path(`M${17+(i%4)*26} ${17+Math.floor(i/4)*16}h16`,'none','#788b83',1)).join('')+rect(13,75,103,30,'#b59c78')+rect(20,66,31,20,'#cbbb99',1)+rect(70,67,31,15,'#d4c3a1'),
 laundry:rect(8,28,48,66,'#d8dfd2',3)+circle(32,59,17,'#627f84')+circle(32,59,12,'#b0c4bd')+rect(70,28,48,66,'#d8dfd2',3)+circle(94,59,17,'#627f84')+circle(94,59,12,'#b0c4bd')+path('M8 15H120','none','#7d8d7f',2)+rect(18,15,25,27,'#d7b17b')+rect(80,15,28,23,'#9fae99'),
 workshop:shelf+desk+rect(17,28,37,27,'#7f9996',3)+path('M23 35H45M24 41H45M24 47H45','none','#d3c6a8',2)+rect(77,37,34,18,'#bc9c75')+path('M89 17v22M79 27h20','none','#676e60',3),
 theatre:rect(8,10,112,80,'#5e6d70')+path('M8 10h22v80H8M98 10h22v80H98','#b28072','none')+path('M8 10Q64 48 120 10','#b28072','none')+rect(28,72,72,16,'#b59f7e')+[16,48,80].map(x=>rect(x,96,26,15,'#708c89',4)).join(''),
 roof:rect(14,35,58,63,'#b7c7c2',4)+path('M14 53H72M14 81H72M24 35V98M62 35V98','none','#829995',2)+rect(84,62,31,35,'#8ca09a',2)+circle(99,80,11,'#5e7776')+path('M16 23h56','none','#728b85',3),
 roofGarden:[22,64,106].map((x,i)=>rect(x-10,77,20,26,'#b38c69',2)+path(`M${x} 79V40`,'none','#6e8f6f',3)+circle(x-8,52,10,'#8ca47d')+circle(x+8,42,12,'#a1b18c')).join(''),
 petGarden:rect(3,12,122,96,'#b1c19a',5)+path('M4 18v88h120V18','none','#7e9784',3)+[14,32,50,78,96,114].map(x=>path(`M${x} 88v20`,'none','#7e9784',2)).join('')+circle(98,60,7,'#ca9e57')+rect(13,43,32,29,'#b19675',3)+path('M10 44L29 30 48 44','#789286','none'),
 courtyard:rect(8,72,111,23,'#9b8a70',3)+rect(14,94,6,16,'#6b7d71')+rect(106,94,6,16,'#6b7d71')+rect(11,16,35,29,'#879b79')+circle(28,17,17,'#a1b588'),
 loading:rect(5,8,116,101,'#b9beb1')+path('M12 98V20H113V98','none','#627e7b',6)+path('M65 22V51','none','#748783',2)+path('M60 51q0 12 10 4','none','#556e70',3)+rect(13,83,33,23,'#b89e78')+rect(86,84,28,22,'#c2af8e'),
 stairs:rect(3,8,122,103,'#bbc4b9')+Array.from({length:7},(_,i)=>path(`M14 ${20+i*12}h98`,'none','#e3e5d7',4)).join('')+path('M19 103L108 13','none','#708780',3),
};
for(const [id,body] of Object.entries(interiors))await save('interiors',id,128,120,rect(0,0,128,120,'#ece3ce')+path('M0 111H128','none','#b5ab96',2)+body,`${id}の室内・家具・手掛かり`);
const props={
 package:rect(7,16,34,27,'#c7ad83',2)+path('M7 24H41M24 16V43','none','#f0e2bf',4),
 shoes:path('M5 20v18h17q8-8-5-9l-4-9zM28 14v18h17q8-8-5-9l-4-9z','#7b6250'),
 loanShoes:path('M5 20v18h17q8-8-5-9l-4-9zM28 14v18h17q8-8-5-9l-4-9z','#b19467'),
 pot:rect(9,21,29,22,'#7c989c',6)+path('M9 27H3M38 27H45M16 18H31','none','#5c767b',3),
 'return-box':rect(5,17,38,29,'#b9a27e',2)+rect(8,12,32,8,'#d9c5a0')+path('M13 28H35','none','#5e7b72',3),
 flag:path('M12 7V45M14 8H40V28H14','none','#5d7474',3)+rect(15,9,24,17,'#739da5')+path('M19 19l5 4 10-10','none','#f8efcf',3),
 stand:rect(4,17,40,8,'#8a9c8b',2)+path('M10 25V44M38 25V44M10 35H38','none','#69837b',4),
 cargo:rect(5,13,38,30,'#b69c75',2)+path('M5 25H43M24 13V43','none','#d6c39d',4),
 meal:circle(24,28,20,'#eee5cf')+circle(24,28,15,'#b8a071')+circle(18,25,5,'#7e9f71')+circle(29,31,5,'#bb7c58')+path('M13 10q-6-7 0-10M28 9q-6-6 0-9','none','#e6e3cf',2),
 puppet:circle(24,11,7,'#e0b28b')+path('M20 19L12 37H36L28 19z','#b38c58')+path('M24 38V48M17 23L7 18M31 23L40 16','none','#7c8c7b',2),
 toy:circle(24,28,14,'#cca054')+path('M15 17q19 8 18 20M10 29q15-1 24-10','none','#efcf83',3),
 'gate-closed':path('M5 7V46M43 7V46M6 14H42M6 39H42M14 15V39M24 15V39M34 15V39','none','#748e80',3),
 'gate-open':path('M5 7V46M43 7V46M7 14L23 5V31L7 39M14 12V34','none','#748e80',3),
 'curtain-closed':rect(4,4,40,40,'#c5aa87')+path('M9 5V44M18 5V44M30 5V44M40 5V44','none','#a38e73',2),
 'shutter-closed':rect(3,4,42,40,'#849993')+Array.from({length:7},(_,i)=>path(`M4 ${9+i*5}H44`,'none','#b9c6b9',2)).join(''),
};
for(const [id,body]of Object.entries(props))await save('props',id,48,48,body,id+'の現物・設備状態');
const residents=[['player','#547c7b','#354f58','#b78865'],['C001','#b87962','#606c60','#b58a69'],['C002','#547480','#47555d','#c19a76'],['C003','#d1aa58','#717d70','#b28460'],['C004','#799a77','#5f746b','#ae805b'],['C005','#6e8e77','#5c6d66','#bc926e'],['C006','#aa8d9f','#6a7077','#bd9679'],['C007','#819ba3','#566f7c','#bca185'],['C008','#a37773','#5c7176','#b28667'],['C045','#b48d58','#60727a','#b8936e'],['C054','#779c95','#5b7274','#bb936f'],['C064','#9c9e70','#73796a','#b7906e']];
for(const [id,top,bottom,skin]of residents){let body='';for(let i=0;i<6;i++){const child=['C003','C004','C064'].includes(id),headY=child?29:20,bodyY=headY+9,legY=child?58:57;let pose='';
 pose+=`<ellipse cx="32" cy="74" rx="16" ry="4" fill="#43565022"/>`;
 if(i===4)pose+=path(`M25 ${legY}l-9 9M36 ${legY}l12 9`, 'none',bottom,7);else pose+=path(`M26 ${legY}l${i===1?-7:i===2?5:0} 15M37 ${legY}l${i===2?-7:i===1?5:0} 15`,'none',bottom,7);
 pose+=rect(21,bodyY,23,child?25:31,top,6)+circle(32,headY,10,skin)+path(`M22 ${headY-2}q2-16 19-4v-5q-17-9-20 9`, '#5b5650','none');
 if(['C001','C005','C006'].includes(id))pose+=rect(25,bodyY+5,15,21,'#d8c5a1',2);
 if(i===3)pose+=path(`M22 ${bodyY+7}l-6 14 16 2M43 ${bodyY+7}l5 14-16 2`,'none',skin,5);
 else if(i===5)pose+=path(`M22 ${bodyY+6}L10 ${headY-3}M43 ${bodyY+6}L54 ${headY-7}`,'none',skin,5);
 else pose+=path(`M22 ${bodyY+7}l-5 ${i===1?8:17}M43 ${bodyY+7}l5 ${i===2?8:17}`,'none',skin,5);
 if(id==='player')pose+=rect(11,bodyY+12,12,20,'#c2ad83',3)+path(`M13 ${bodyY+12}q4-9 8 0`,'none','#897b63',2);
 if(id==='C004'||id==='C045')pose+=path(`M20 ${headY-6}q12-15 24 0H17`,top,'none');
 body+=`<g transform="translate(${i*64} 0)">${pose}</g>`;}
 await save('residents',id,384,80,body,'人物の服装・姿勢（左から待機・歩行2枚・作業/運搬・着席・踊り）',['idle','walk-a','walk-b','work','sit','dance']);}
let dog='';for(let i=0;i<4;i++)dog+=`<g transform="translate(${i*64} 0)"><ellipse cx="30" cy="43" rx="22" ry="4" fill="#43565022"/>${rect(14,22,33,18,'#b49470',7)}${circle(46,20,10,'#c4a57d')}${path('M40 12l-3 15 9-6','#876e56','none')}${path(`M20 38l${i%2?5:-3} 7M40 37l${i%2?-4:4} 8M16 27L7 ${i%2?15:22}`,'none','#8e785c',4)}${circle(50,18,1.7,'#454d47')}${i===3?path('M48 30h14v7H48','#76604c'):''}</g>`;
await save('residents','dog',256,48,dog,'犬の待機・歩行・振り返り・靴をくわえる姿',['idle','walk','look','carry-shoe']);
await writeFile(`${root}/manifest.json`,JSON.stringify({version:'block-assets-0.3.0',notes:'All original editable SVG. No external fetch; embedded in standalone build. Ratio preserved. Audio not included.',assets:entries},null,2)+'\n');
let imports='',mapping='';for(const [i,e]of entries.entries()){imports+=`import asset${i} from '../../public/assets/${e.file}';\n`;mapping+=`  '${e.id}': {src:asset${i},width:${e.width},height:${e.height}},\n`;}
await writeFile('src/game/assets.ts',imports+`\nexport const assets:Record<string,{src:string;width:number;height:number}> = {\n${mapping}};\n`);
console.log(`Generated ${entries.length} vector assets and the build catalog.`);
