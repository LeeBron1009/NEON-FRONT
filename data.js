/* ========== 場地常數 ========== */
const FIELD={W:1200,H:600};
const TOWER={
  king:{hp:4000,dmg:90,rng:230,atk:1.0,r:42},
  prin:{hp:2500,dmg:70,rng:210,atk:0.9,r:32}
};
// 玩家在右邊,敵人在左邊
const TOWER_POS={
  p:{king:{x:1110,y:300},top:{x:930,y:140},bot:{x:930,y:460}},
  e:{king:{x:90, y:300},top:{x:270,y:140},bot:{x:270,y:460}}
};
const ELIXIR={max:10,start:5,rate:1/2.8,boostAfter:120}; // 每秒回復;120秒後2倍
const LASER={charge:40,dmg:900,towerDmg:450,width:46,length:1400};

/* ========== 我方角色 ========== */
// cost聖水 hp dmg rng(射程px) spd(px/s) atk(攻擊間隔秒) r(半徑) cnt(一次出幾隻)
// fly空中 tgt:'tower'只打塔 splash範圍 fx:slow/heal/kamikaze/chain
const UNITS=[
 {id:'nano',  n:'奈米蜂群',e:'💠',col:'#4dd0ff',cost:2,hp:140, dmg:28, rng:26, spd:85, atk:0.9,r:11,cnt:3,desc:'3 隻小型機器人,便宜好用'},
 {id:'blade', n:'光刃兵',  e:'⚔️',col:'#7cffb2',cost:3,hp:520, dmg:85, rng:30, spd:70, atk:1.1,r:16,desc:'標準近戰'},
 {id:'drone', n:'無人機',  e:'🛸',col:'#ffe066',cost:3,hp:260, dmg:55, rng:150,spd:90, atk:1.0,r:14,fly:1,desc:'空中遠程'},
 {id:'rail',  n:'磁軌炮手',e:'🎯',col:'#ff6b9a',cost:4,hp:380, dmg:120,rng:260,spd:55, atk:1.6,r:15,desc:'超長射程'},
 {id:'mech',  n:'重裝機甲',e:'🤖',col:'#ff9e57',cost:5,hp:1900,dmg:140,rng:34, spd:45, atk:1.5,r:22,tgt:'tower',desc:'只攻擊塔,血量高'},
 {id:'quant', n:'量子術士',e:'🔮',col:'#c58bff',cost:4,hp:420, dmg:95, rng:180,spd:60, atk:1.5,r:15,splash:55,desc:'範圍傷害'},
 {id:'bike',  n:'閃電摩托',e:'🏍️',col:'#ffee58',cost:3,hp:450, dmg:70, rng:30, spd:130,atk:0.9,r:15,desc:'速度極快'},
 {id:'giant', n:'護盾巨像',e:'🛡️',col:'#80cbc4',cost:6,hp:3200,dmg:120,rng:34, spd:35, atk:1.6,r:26,desc:'超厚血量的坦克'},
 {id:'orbit', n:'軌道衛星',e:'🛰️',col:'#f48fb1',cost:5,hp:600, dmg:150,rng:300,spd:40, atk:2.2,r:17,fly:1,splash:60,desc:'空中遠程範圍'},
 {id:'core',  n:'星核之神',e:'🌟',col:'#fff176',cost:8,hp:3800,dmg:260,rng:200,spd:45, atk:1.8,r:28,splash:80,desc:'傳說級,超強範圍'},
 // ----- 新角色 -----
 {id:'flame', n:'電漿噴射兵',e:'🔥',col:'#ff7043',cost:4,hp:700, dmg:60, rng:90, spd:60, atk:0.5,r:16,splash:45,desc:'近距離高速範圍傷害'},
 {id:'frost', n:'冰凍機器人',e:'🧊',col:'#81d4fa',cost:3,hp:600, dmg:40, rng:120,spd:60, atk:1.3,r:16,fx:'slow',desc:'命中的敵人會減速'},
 {id:'volt',  n:'雷霆戰士',e:'⚡',col:'#ffd740',cost:4,hp:560, dmg:90, rng:140,spd:65, atk:1.2,r:15,fx:'chain',desc:'閃電連鎖攻擊 3 個目標'},
 {id:'medic', n:'修復機',  e:'💚',col:'#69f0ae',cost:3,hp:420, dmg:0,  rng:120,spd:60, atk:1.0,r:15,fx:'heal',desc:'治療附近友軍'},
 {id:'ninja', n:'暗影刺客',e:'🥷',col:'#b0bec5',cost:3,hp:300, dmg:210,rng:26, spd:140,atk:1.0,r:13,desc:'高傷害但很脆弱'},
 {id:'mine',  n:'自爆機器人',e:'💣',col:'#ff5252',cost:2,hp:200, dmg:520,rng:24, spd:110,atk:0.1,r:12,fx:'kamikaze',splash:60,desc:'衝上去自爆'},
 {id:'dragon',n:'龍型戰機',e:'🐉',col:'#ff4081',cost:5,hp:1100,dmg:130,rng:90, spd:80, atk:1.2,r:20,fly:1,splash:50,desc:'空中範圍攻擊'},
 {id:'aegis', n:'防禦無人塔',e:'🗼',col:'#40c4ff',cost:4,hp:1200,dmg:100,rng:200,spd:0,  atk:1.0,r:20,fx:'building',life:25,desc:'原地防守的砲台,25 秒後消失'}
];
// 敵方專屬(也會出現在 AI 牌組)
const ENEMY_ONLY=[
 {id:'virus', n:'病毒粒子',e:'🦠',col:'#76ff03',cost:2,hp:150, dmg:30, rng:26, spd:80, atk:0.9,r:11,cnt:4,desc:'成群出現'},
 {id:'bug',   n:'程式蟲',  e:'🐛',col:'#ffab40',cost:3,hp:600, dmg:70, rng:30, spd:70, atk:1.0,r:16,desc:''},
 {id:'spider',n:'駭客蜘蛛',e:'🕷️',col:'#ff5252',cost:4,hp:900, dmg:110,rng:40, spd:85, atk:1.0,r:18,desc:''},
 {id:'ghost', n:'幽靈封包',e:'👻',col:'#b388ff',cost:4,hp:700, dmg:100,rng:160,spd:70, atk:1.4,r:16,fly:1,splash:50,desc:''},
 {id:'tank',  n:'暗黑戰車',e:'🚜',col:'#90a4ae',cost:6,hp:3000,dmg:150,rng:36, spd:40, atk:1.6,r:26,tgt:'tower',desc:''},
 {id:'boss',  n:'AI 核心', e:'👁️',col:'#ff1744',cost:9,hp:6500,dmg:300,rng:150,spd:35, atk:2.0,r:34,splash:90,desc:'最終 Boss'}
];
const ALL={}; [...UNITS,...ENEMY_ONLY].forEach(u=>ALL[u.id]=u);
const DEFAULT_DECK=['nano','blade','drone','rail','mech','quant','bike','frost'];

/* ========== 闖關 ========== */
// aiRate:敵方聖水速度倍率 aiDelay:開局延遲 hpMul:敵塔血量倍率 statMul:敵兵數值倍率
const STAGES=[
 {n:'數據草坪',   d:'新手練習賽',     pitch:['#0d3b2a','#124d36'],line:'#7cffb2',deck:['virus','bug','nano','blade','drone','bug','virus','blade'],aiRate:0.7,aiDelay:12,hpMul:0.8,statMul:0.9,time:180},
 {n:'電路球場',   d:'敵人開始成群',   pitch:['#0b2a4a','#0f3d66'],line:'#4dd0ff',deck:['virus','bug','spider','drone','nano','bike','blade','rail'],aiRate:0.8,aiDelay:10,hpMul:1.0,statMul:1.0,time:180},
 {n:'霓虹體育館', d:'小心遠程火力',   pitch:['#2a0b3a','#401060'],line:'#c58bff',deck:['rail','quant','ghost','spider','bug','drone','mech','virus'],aiRate:0.85,aiDelay:8,hpMul:1.1,statMul:1.05,time:180},
 {n:'冰霜競技場', d:'減速與控場',     pitch:['#0b2f3a','#12506a'],line:'#81d4fa',deck:['frost','ghost','tank','volt','spider','nano','dragon','blade'],aiRate:0.9,aiDelay:8,hpMul:1.2,statMul:1.1,time:180},
 {n:'熔岩球場',   d:'高傷害爆發',     pitch:['#3a1208','#5a1c0c'],line:'#ff7043',deck:['flame','ninja','mine','giant','bike','quant','tank','bug'],aiRate:0.95,aiDelay:6,hpMul:1.3,statMul:1.15,time:180},
 {n:'暗網深淵',   d:'幽靈與戰車來襲', pitch:['#12121f','#221a38'],line:'#b388ff',deck:['ghost','tank','spider','orbit','medic','ghost','mech','virus'],aiRate:1.0,aiDelay:5,hpMul:1.5,statMul:1.2,time:180},
 {n:'量子核心',   d:'強敵齊聚',       pitch:['#1b0b3a','#35106a'],line:'#e040fb',deck:['core','dragon','volt','giant','medic','ninja','orbit','mine'],aiRate:1.1,aiDelay:4,hpMul:1.7,statMul:1.3,time:180},
 {n:'終局:AI 核心',d:'最終挑戰',       pitch:['#3a0a14','#14041f'],line:'#ff1744',deck:['boss','tank','core','ghost','dragon','medic','giant','spider'],aiRate:1.25,aiDelay:3,hpMul:2.0,statMul:1.4,time:240}
];

/* ========== 無盡模式 ========== */
const ENDLESS={
  pitch:['#0a1a3a','#12306a'],line:'#00e5ff',
  pool:['virus','bug','spider','ghost','tank','nano','blade','drone','rail','quant','bike','flame','frost','volt','ninja','mine','dragon','giant','core','boss'],
  baseRate:0.7,        // 起始敵方聖水速度
  rateGrowth:0.06,     // 每分鐘增加
  statGrowth:0.12,     // 每分鐘敵兵數值 +12%
  towerGrowth:0.15,    // 每分鐘敵塔血量 +15%(重生時)
  scoreKill:10,        // 擊殺得分 = 聖水費用 * 10
  scoreTowerHit:0.1,   // 對塔造成每 1 傷害得 0.1 分
  scoreTowerKill:500,  // 摧毀敵塔
  scoreTime:1,         // 每存活 1 秒
  towerRespawn:25      // 敵塔被摧毀後多久重生(秒)
};

/* ========== 共用:發光六角圖示(卡片與場上用同一個函式) ========== */
function hexPath(ctx,x,y,r){ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath()}
function drawHex(ctx,x,y,r,col,emoji,glow){
  ctx.save();
  ctx.shadowColor=col;ctx.shadowBlur=glow==null?14:glow;
  ctx.fillStyle='#0b1430';ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,r*0.14);
  hexPath(ctx,x,y,r);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.font=(r*1.1)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(emoji,x,y+r*0.05);
  ctx.restore();
}
function makeIcon(def,px){
  const d=window.devicePixelRatio||1,c=document.createElement('canvas');
  c.width=c.height=px*d;c.style.width=c.style.height=px+'px';
  const g=c.getContext('2d');g.scale(d,d);
  drawHex(g,px/2,px/2,px/2-5,def.col,def.e,8);
  return c;
}
