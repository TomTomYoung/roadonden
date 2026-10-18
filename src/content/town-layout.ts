import type { BlockPlace } from './block.ts';

export const WORLD_WIDTH=7540, WORLD_HEIGHT=2420;
export const districts=[
 {id:'west',name:'西口・中庭通り',x:650,color:'#788e75'},
 {id:'market',name:'パン屋前・市場通り',x:1890,color:'#bc8665'},
 {id:'craft',name:'工房通り',x:3130,color:'#788e98'},
 {id:'theatre',name:'劇場前通り',x:4370,color:'#aa7b86'},
 {id:'post',name:'郵便坂・東商店街',x:5610,color:'#8e9672'},
 {id:'east',name:'東口・停留所通り',x:6850,color:'#aa9363'},
] as const;
export interface TownBuilding {id:string;name:string;x:number;y:number;width:number;height:number;district:string;skin:number;original?:boolean}
export const townBuildings:TownBuilding[]=[
 {id:'A',name:'アパート A棟',x:22,y:70,width:350,height:630,district:'west',skin:0,original:true},
 {id:'M',name:'ロードンデン雑居ビル',x:410,y:70,width:430,height:630,district:'west',skin:1,original:true},
 {id:'B',name:'アパート B棟',x:892,y:70,width:388,height:630,district:'west',skin:2,original:true},
];
type Room=[string,string,string];
type BuildingSpec=[string,string,number,number,number,Room[]];
// Six rooms per building: two at each level, with a separate common stair and roof.
const specifications:BuildingSpec[]=[
 ['C','こもれび荘',0,0,1,[['agnes','アグネスの台所','dining'],['doraRest','管理当番の休憩室','lounge'],['hester','ヘスターの寝室','bedroom'],['alfRoom','アルフの寝室','bedroom'],['basil','ローズの楽器部屋','studio'],['martha','ノアの寝室','bedroom']]],
 ['D','あかり荘',0,2,1,[['vera','ビーとフィンの居間','dining'],['mary','親子の寝室','bedroom'],['pearl','静かな寝室','bedroom'],['milo','近所の居間','lounge'],['agnesGuest','家族の訪問室','dining'],['quietRoom','静かな共用室','bedroom']]],
 ['E','時計屋横の預かり店',1,0,0,[['pawn','ベスの預かり品店','pawn'],['coatBox','番号付き保管箱','storage'],['clockShop','時計の修理室','workshop'],['pawnOffice','預かり記録室','reception'],['sewing','街の仕立て室','workshop'],['fabricStore','乾いた布の保管室','storage']]],
 ['F','パン屋と粉の仕事場',1,1,0,[['bakery','ジャイルズのパン屋','bakery'],['bakeryShelf','パン屋の受取棚','storage'],['mill','製粉・計量室','mill'],['grain','穀物の乾燥保管室','storage'],['kitchen','共同厨房','kitchen'],['breadTable','パンを食べる席','dining']]],
 ['G','飲料店と裏の修理棚',1,2,0,[['drinks','飲料店の売場','grocer'],['barrels','返却樽と修理棚','workshop'],['teaShop','路地の喫茶室','dining'],['awning','ひさしの道具室','storage'],['stallStore','屋台の保管室','storage'],['shopOffice','商店街の共同事務所','reception']]],
 ['H','干し場のあるアパート',1,0,1,[['elsie','エルシーの洗濯室','laundry'],['dryCloth','乾いた予備布の棚','storage'],['nell','ネルの台所','workKitchen'],['nellWindow','ネルの側窓','lounge'],['iris','アイリスの部屋','bedroom'],['scaffold','外壁の作業足場','workshop']]],
 ['I','花壇横のアパート',1,2,1,[['josie','花壇側の住戸','bedroom'],['heidi','南側の居間','lounge'],['stan','通り側の住戸','bedroom'],['faye','裏庭側の住戸','bedroom'],['porterRest','運び手の休憩室','lounge'],['guestWest','西側の客間','bedroom']]],
 ['J','織りと機械の共同工房',2,0,0,[['loom','織機の作業場','loom'],['machine','機械調整の区画','workshop'],['pattern','図案机','workshop'],['heated','加熱加工室','kiln'],['water','水の受取場','laundry'],['workRest','工房の休憩室','lounge']]],
 ['K','工具と木工のビル',2,1,0,[['wood','木工台','workshop'],['tools','工具箱の作業台','workshop'],['instruments','計器修理室','workshop'],['finished','材料と完成品の棚','storage'],['tassaBench','タッサの補助具置場','workshop'],['workersRoom','職人の談話室','lounge']]],
 ['L','共同搬入センター',2,2,0,[['freightLow','昇降機・下の荷受け','loading'],['cartGarage','台車の整備庫','workshop'],['freightHigh','昇降機・上の荷受け','loading'],['partition','仕切りと合図の区画','storage'],['freightOffice','搬入の記録室','reception'],['cargoStore','搬入品の保管室','storage']]],
 ['N','裏通りの職人アパート',2,0,1,[['washBoots','長靴の洗い場','laundry'],['netDry','ネットの乾燥棚','storage'],['modelBoat','模型船の試験台','workshop'],['fisherRoom','道具の補修室','workshop'],['workerHome','職人の住戸','bedroom'],['workerKitchen','共用台所','kitchen']]],
 ['O','昇降機のあるアパート',2,2,1,[['liftOld','エレベーター・旧待合','lounge'],['liftGround','共用エレベーター・1階','elevator'],['liftUpper','共用エレベーター・2階','elevator'],['liftNew','新入口の待合','lounge'],['upperHome','上階の居室','bedroom'],['liftOffice','設備当番室','reception']]],
 ['Q','街の小劇場',3,0,0,[['theatreDoor','劇場入口','theatre'],['audience','客席と通路','theatre'],['stage','舞台','stage'],['wings','舞台袖','theatre'],['dressing','控室','lounge'],['script','台本の確認室','workshop']]],
 ['R','舞台工房',3,1,0,[['theatreProps','小道具の保管室','storage'],['curtain','幕と引き綱の区画','theatre'],['lighting','照明の作業場','workshop'],['costume','衣装の縫製室','workshop'],['cleaning','清掃用具室','storage'],['rehearsal','稽古室','studio']]],
 ['S','放課後の制作室',3,2,0,[['clubStage','発表用の幕','theatre'],['clubCraft','工作机','club'],['clubDrink','飲み物台','kitchen'],['clubDry','絵を乾かす棚','workshop'],['clubBooks','本棚とビー玉の台','library'],['clubExit','退出当番の机','reception']]],
 ['T','劇場前のアパート',3,0,1,[['pickupFront','迎えの正面待合','lounge'],['pickupBack','裏通りの待合','lounge'],['actorHome','出演者の住戸','bedroom'],['audienceHome','観客の住戸','bedroom'],['readerRoom','読書室','library'],['visitorRoom','訪問者の客間','bedroom']]],
 ['U','遊び場のあるアパート',3,2,1,[['playRoom','子どもの遊び場','club'],['familyTable','家族の食卓','dining'],['childRoom','子ども部屋','bedroom'],['sharedKitchen','共用台所','kitchen'],['clubStorage','作品の保管室','storage'],['clubLounge','親子の談話室','lounge']]],
 ['V','郵便と宅配のセンター',4,0,0,[['postDoor','郵便室・正面入口','mailroom'],['postSide','郵便室・段差のない別入口','mailroom'],['sorting','仕分け台','mailroom'],['envelopes','封入の机','workshop'],['mailShelf','配達と受渡しの棚','storage'],['postRest','配達当番の休憩室','lounge']]],
 ['W','印刷と管理のビル',4,1,0,[['print','印刷机','printing'],['proof','訂正と照合の机','workshop'],['management','管理事務所','reception'],['accounts','会計と貸出帳','reception'],['notice','掲示の相談室','lounge'],['archive','街の記録室','library']]],
 ['X','本と手紙の店',4,2,0,[['bookshop','本と便箋の売場','library'],['letterDesk','手紙を書く机','workshop'],['letterRoom','返事を待つ部屋','lounge'],['meeting','待ち合わせ室','lounge'],['reading','本を読む部屋','library'],['postalTools','修理の道具置場','workshop']]],
 ['Y','郵便坂アパート',4,0,1,[['beatrice','ベアトリスの住戸','bedroom'],['oscar','オスカーの仕事部屋','workshop'],['eastFamily','家族の住戸','dining'],['eastBedroom','静かな寝室','bedroom'],['eastLounge','東側の談話室','lounge'],['eastGuest','東側の客間','bedroom']]],
 ['Z','並木道のアパート',4,2,1,[['gardenRoom','庭に面した居間','lounge'],['plantRoom','鉢の世話をする部屋','roofGarden'],['eastHome1','並木の住戸・201','bedroom'],['eastHome2','並木の住戸・202','bedroom'],['eastHome3','並木の住戸・301','bedroom'],['eastHome4','並木の住戸・302','bedroom']]],
 ['AA','東口の短期滞在棟',5,0,0,[['stayDesk','短期滞在の受付','reception'],['packing','荷造りの部屋','storage'],['stay1','短期滞在室・201','bedroom'],['stay2','短期滞在室・202','bedroom'],['stay3','短期滞在室・301','bedroom'],['stay4','短期滞在室・302','bedroom']]],
 ['AB','旅支度と肖像のビル',5,1,0,[['portrait','肖像を描く場所','studio'],['dispatch','保管・別送の受付','mailroom'],['luggage','荷物の保管室','storage'],['cartStore','荷車の待機室','loading'],['travelLounge','旅人の談話室','lounge'],['travelRoom','旅支度の部屋','bedroom']]],
 ['AC','東口の送迎待合',5,2,0,[['shuttle','送迎便の乗場','bus'],['booking','送迎便の予約窓口','reception'],['waiting','出発の待合','lounge'],['handover','当番の引継ぎ室','reception'],['driverRest','送迎係の休憩室','bedroom'],['shuttleOffice','送迎の時刻表室','reception']]],
 ['AD','東口アパート',5,0,1,[['travellerHome','帰ってきた人の住戸','bedroom'],['hostKitchen','共同の食卓','dining'],['hostRoom','管理人の休息室','bedroom'],['plantGround','鉢の地上受取場所','roofGarden'],['packingHome','出発する人の住戸','bedroom'],['smallPlants','株分けの作業室','roofGarden']]],
 ['AE','並木の終わりのアパート',5,2,1,[['returnRoom','帰宅後の居間','lounge'],['spareRoom','滞在の予備室','bedroom'],['eastEndHome','東端の住戸','bedroom'],['commonTable','近所の食卓','dining'],['plantRoofRoom','屋上の園芸道具室','storage'],['sunRoom','日当たりのよい部屋','lounge']]],
];
export function extendTown(places:BlockPlace[],names:Record<string,string>){
 const add=(id:string,name:string,building:string,floor:number,room:string,x:number,y:number,interior:string,description:string,kind:BlockPlace['kind']='room')=>{places.push({id,name,building,floor,room,x,y,interior,description,kind,links:[]});};
 const byId=new Map(places.map(p=>[p.id,p]));
 const link=(a:string,b:string)=>{const x=places.find(p=>p.id===a)!,y=places.find(p=>p.id===b)!;if(!x.links.includes(b))x.links.push(b);if(!y.links.includes(a))y.links.push(a);};
 for(const [i,d]of districts.entries()){
  names[d.id]=d.name;
  for(const [lane,y,label]of [['avenue',1120,'商店街'],['back',940,'店の裏通り'],['south',2260,'南側の住宅路']] as const){
   add(`${lane}.${i}`,`${d.name}・${label}`,d.id,0,'屋外',d.x,y,'courtyard',`${d.name}の${label}。商店街の表口、裏の搬入口と住宅への道がつながっている。`,'outside');
   if(i)link(`${lane}.${i-1}`,`${lane}.${i}`);
  }
  add(`cross.${i}`,`${d.name}・脇道`,d.id,0,'交差点',i*1240+830,1330,'courtyard','商店街からアパート群へ曲がる道。帰宅する人と配送の道を見渡せる。','outside');
  link(`avenue.${i}`,`back.${i}`);link(`avenue.${i}`,`cross.${i}`);link(`cross.${i}`,`south.${i}`);
 }
 link('street','back.0');
 for(const [index,[id,name,section,column,row,rooms]]of specifications.entries()){
  const x=section*1240+30+column*405,y=row?1510:70,w=360,h=630;
  townBuildings.push({id,name,x,y,width:w,height:h,district:districts[section]!.id,skin:index%6});names[id]=name;
  for(let floor=1;floor<=3;floor++){
   const yy=y+580-(floor-1)*180,hall=`${id}.hall${floor}`;
   add(hall,`${name}・${floor}階共用廊下`,id,floor,'共用',x+327,yy,'stairs',`${name}の${floor}階。各室の扉と、上下階へ続く共用階段。`,'hall');
   if(floor>1)link(`${id}.hall${floor-1}`,hall);
   for(let col=0;col<2;col++){
    const room=rooms[(floor-1)*2+col]!,number=`${floor}0${col+1}`;
    add(room[0],`${name} ${number}・${room[1]}`,id,floor,number,x+78+col*135,yy-40,room[2],`${room[1]}。${floor}階の共用廊下から出入りし、荷物の保管場所と人の通路を分けて使う。`);
    link(hall,room[0]);
   }
  }
  add(`${id}.roof`,`${name}・屋上`,id,4,'屋上',x+180,y+42,'roofGarden','共用の屋上。物干しと鉢を置く範囲を、歩く通路から分けてある。','roof');link(`${id}.hall3`,`${id}.roof`);
  link(`${id}.hall1`,`${row?'south':'back'}.${section}`);
 }
 // A second street entrance makes the residential lanes loops rather than dead ends.
 link('back.1','pawn');link('back.1','bakery');link('back.2','freightLow');link('back.3','theatreDoor');link('back.4','postDoor');link('back.4','postSide');link('back.5','shuttle');
 // The passenger lift exists independently of the goods lift and is usable from day one.
 link('liftGround','liftUpper');
 // Postal work is on the ground floor, reachable through either actual entrance.
 // Keep stable place IDs for letters and later postal scenarios.
 const postal=(id:string)=>places.find(p=>p.id===id)!;
 const unlink=(a:string,b:string)=>{postal(a).links=postal(a).links.filter(id=>id!==b);postal(b).links=postal(b).links.filter(id=>id!==a);};
 for(const [a,b]of [['postDoor','V.hall1'],['postSide','V.hall1'],['sorting','V.hall2'],['mailShelf','V.hall3'],['V.hall1','back.4']])unlink(a!,b!);
 for(const [id,entrance,label]of [['sorting','postDoor','仕分け台'],['mailShelf','postSide','配達と受渡しの棚']]){
  const room=postal(id!),door=postal(entrance!);room.x=door.x;room.y=door.y;room.floor=1;room.room=door.room;room.name=`郵便と宅配のセンター ${room.room}・${label}`;
  room.description=id==='sorting'?'1階の仕分け室。車椅子で台へ寄れる空間と高さ、本人の郵便袋を確かめる。':'1階の受渡し棚。仕分け室から段差なく運べる。ネルの便りと、職員が仕分けた束は別の現物。';
  door.y+=150;door.kind='outside';door.room=id==='sorting'?'正面入口':'別入口';door.name=`郵便と宅配のセンター・${door.room}`;door.interior='postalEntrance';
 }
 postal('postDoor').description='郵便室の正面入口。錠は動くが、引く扉の下端が床に擦れている。開け方は本人と一緒に確かめる。';
 postal('postSide').description='1階の仕分け室へ通じる段差のない別入口。本人と入口を相談すれば、正面扉の修理を待たず仕事へ進める。';
 link('postDoor','sorting');link('postSide','sorting');link('sorting','mailShelf');link('mailShelf','V.hall1');
 // The scaffold has a resident-controlled window and a separate outside descent.
 const scaffold=places.find(p=>p.id==='scaffold')!,hall=places.find(p=>p.id==='H.hall3')!;
 scaffold.links=scaffold.links.filter(id=>id!==hall.id);hall.links=hall.links.filter(id=>id!==scaffold.id);
 link('scaffold','iris');link('scaffold','dryCloth');
 scaffold.description='H棟3階の外壁足場。居室側の窓はアイリスの了承が必要。地上の予備布棚へ降りる外梯子は、道具を持って降りる前に固定する。';
 places.find(p=>p.id==='nellWindow')!.description='H棟201の台所へ声が届く側窓。戸の呼鈴とは別に、住人へ用件を伝えられる。';
 byId.get('a301')!.name='A棟 301・エリアスの部屋';
 byId.get('a301')!.description='エリアスの住戸。入室の用件は本人と確認する。玄関には鍵の返却口があり、椅子と上着掛けが見える。';
 byId.get('street')!.description='最初の三棟が囲む中庭。北の裏通りから長い商店街へ出られる。南にはこもれび荘とあかり荘がある。';
 byId.get('inn')!.description='短期入居者の受付。管理当番のドーラが使う引継ぎ帳、鍵掛け、預かり棚がある。';
}
