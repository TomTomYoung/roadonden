import type { Content } from '../core/types.ts';

export type Building = 'A' | 'M' | 'B' | 'court';
export type BlockPlace = Content['places'][number] & {
  building: Building; floor: number; room: string; kind: 'room' | 'hall' | 'roof' | 'outside';
  interior: string; description: string;
};
export const buildingNames: Record<Building,string> = { A:'アパート A棟', M:'ロードンデン雑居ビル', B:'アパート B棟', court:'棟のあいだ' };
const p=(id:string,name:string,building:Building,floor:number,room:string,x:number,y:number,links:string[],interior:string,description:string,kind:BlockPlace['kind']='room'):BlockPlace=>({id,name,building,floor,room,x,y,links,interior,description,kind});
export const blockPlaces: BlockPlace[] = [
 p('inn','A棟 101・管理人室','A',1,'101',100,610,['a1'],'reception','短期入居者の受付。鍵掛け、引継ぎ帳、預かり棚がある。ここから共同玄関へ出られる。'),
 p('a1','A棟 1階・共同玄関','A',1,'共用',332,650,['inn','street','a2'],'stairs','集合ポストの脇から外階段が上へ続く。二階は201・202号室。','hall'),
 p('a2','A棟 2階・共用廊下','A',2,'共用',332,470,['a1','home','ruth','a3'],'stairs','外階段の踊り場。201号室と202号室の玄関が並ぶ。会話や受渡しは各戸を訪ねてから。','hall'),
 p('home','A棟 201・フィンチ家','A',2,'201',104,430,['a2'],'kitchen','玄関に外履きの空いた場所。小鍋と三人分の食卓、部屋専用の受取棚がある。'),
 p('ruth','A棟 202・ルースの部屋','A',2,'202',232,430,['a2'],'workKitchen','隣室の台所から、同じところを磨く音がする。鍋肌はきれいなのに柄だけが焦げている。'),
 p('a3','A棟 3階・共用廊下','A',3,'共用',332,290,['a2','a301','a302','aRoof'],'stairs','三階の廊下。屋上へ上がる階段と、静かな居室の扉がある。','hall'),
 p('a301','A棟 301・居室前','A',3,'301',104,250,['a3'],'bedroom','生活の気配がする居室前。住人に用件がないときは、共用廊下からそっと通り過ぎる。'),
 p('a302','A棟 302・居室前','A',3,'302',232,250,['a3'],'bedroom','洗濯物と小さな鉢がある居室前。部屋の中へ勝手に入ることはしない。'),
 p('aRoof','A棟 屋上・物干し場','A',4,'屋上',210,112,['a3'],'laundry','屋上の物干し場。干す場所と人が歩く場所が白線で分けられている。','roof'),
 p('street','共用中庭','court',0,'中庭',650,818,['a1','m1','b1','yard','quay'],'courtyard','雑居ビルと二つのアパートに囲まれた中庭。階段、店の入口、搬入路を見渡せる。','outside'),
 p('yard','中庭・犬のいる通路','court',0,'通路',1000,818,['street','garden'],'courtyard','ペット用の共用囲いの手前。追われる犬が通路をぐるりと回っている。','outside'),
 p('garden','中庭・ペット用の囲い','court',0,'囲い',1190,818,['yard'],'petGarden','ペット可のアパートで使う、柵と戸のある囲い。犬がいつも使う玩具が置かれている。','outside'),
 p('m1','雑居ビル 1階・共用ホール','M',1,'共用',798,650,['market','shoe','street','quay','m2'],'stairs','食料品店と靴修理店の前を通るホール。階段で二階の活動室へ上がれる。','hall'),
 p('market','雑居ビル 101・メイベル食品店','M',1,'101',488,610,['m1'],'grocer','冷蔵ケース、注文札、支払済みの取り置き棚。A棟201号室宛ての包みがある。'),
 p('shoe','雑居ビル 102・レオ靴修理店','M',1,'102',662,610,['m1'],'shoeShop','靴修理の作業台。貸し靴は別の棚、返却箱はシャッターの外側。閉店後も返せる。'),
 p('m2','雑居ビル 2階・共用廊下','M',2,'共用',798,470,['m1','upstairs','school','m3'],'stairs','階段を上がると、貸しスタジオと子どもの活動室が向かい合う。','hall'),
 p('upstairs','雑居ビル 201・貸しスタジオ','M',2,'201',488,430,['m2'],'studio','鏡と床の立ち位置の印。レオが店を閉めたあと、踊りを練習する部屋。'),
 p('school','雑居ビル 202・放課後の活動室','M',2,'202',662,430,['m2'],'club','学校帰りの子どもが使う活動室。紙人形、工作机、持ち帰り用の棚がある。'),
 p('m3','雑居ビル 3階・共用廊下','M',3,'共用',798,290,['m2','workshop','theatre','mRoof'],'stairs','小さな工房と小劇場の前。搬入物と人の通路を分ける掲示がある。','hall'),
 p('workshop','雑居ビル 301・共同工房前','M',3,'301',488,250,['m3'],'workshop','布と工具を扱う共同工房の入口。受取棚は通路を塞がない位置に置かれている。'),
 p('theatre','雑居ビル 302・小劇場前','M',3,'302',662,250,['m3'],'theatre','テナント区画を改装した小劇場。袖幕と客席の配置図が入口に掛かっている。'),
 p('mRoof','雑居ビル 屋上・設備脇の通路','M',4,'屋上',650,112,['m3'],'roof','空調機と給水設備の脇に、決められた通路がある。設備の操作は担当者の仕事。','roof'),
 p('quay','雑居ビル 裏口・共同搬入口','court',0,'搬入口',360,818,['street','m1'],'loading','店の搬入用チェーンブロックに、降ろしかけの荷。受け台の場所は空箱で塞がれている。','outside'),
 p('b1','B棟 1階・共同玄関','B',1,'共用',1232,650,['street','post','laundry','b2'],'stairs','アパートB棟の共同玄関。郵便・宅配室と共同ランドリーへ入れる。','hall'),
 p('post','B棟 101・郵便・宅配室','B',1,'101',944,610,['b1'],'mailroom','部屋番号付きの集合ポストと受渡し棚。棟名を省くと同じ部屋番号を取り違える。'),
 p('laundry','B棟 102・共同ランドリー','B',1,'102',1100,610,['b1'],'laundry','洗濯機と回収かご。乾いた予備布と、まだ乾かしている洗濯物は別に置く。'),
 p('b2','B棟 2階・共用廊下','B',2,'共用',1232,470,['b1','celia','lounge','b3'],'stairs','外廊下に窓が面する階。部屋の目隠しと、呼鈴を鳴らして待つ距離が大切になる。','hall'),
 p('celia','B棟 201・セリアの部屋','B',2,'201',944,430,['b2'],'dining','食卓の窓が共用廊下に面している。薄いカーテンと玄関の呼鈴がある。'),
 p('lounge','B棟 202・共用談話室','B',2,'202',1100,430,['b2'],'lounge','待ち合わせに使える椅子と掲示板。部屋番号だけでなく、棟と入口も確かめたい。'),
 p('b3','B棟 3階・共用廊下','B',3,'共用',1232,290,['b2','b301','b302','bRoof'],'stairs','窓と玄関が並ぶ三階。隣室の音がどこから伝わるかを確かめられる通路。','hall'),
 p('b301','B棟 301・居室前','B',3,'301',944,250,['b3'],'bedroom','カーテンのかかった居室前。誰かが休む場所と、共用の通路を分けて使う。'),
 p('b302','B棟 302・居室前','B',3,'302',1100,250,['b3'],'bedroom','玄関脇に小さな受取棚がある。用件は本人が了承した方法で届ける。'),
 p('bRoof','B棟 屋上・共同の鉢置場','B',4,'屋上',1100,112,['b3'],'roofGarden','住民が育てる鉢の並ぶ屋上。大きな鉢と、小さく分けた株が置ける台がある。','roof'),
];
export const blockPlaceById = new Map(blockPlaces.map(p=>[p.id,p]));
export const floorLabel=(floor:number)=>floor===0?'屋外':floor===4?'屋上':`${floor}階`;
export function travelTicks(from:string,to:string):number {
 const a=blockPlaceById.get(from)!,b=blockPlaceById.get(to)!;
 // Vertical edges exist only between a building's consecutive stair landings.
 if(a.building===b.building&&a.floor!==b.floor)return 16;
 return Math.max(5,Math.min(18,Math.round(Math.hypot(a.x-b.x,a.y-b.y)/22)));
}
