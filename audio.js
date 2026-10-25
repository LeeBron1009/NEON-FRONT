/* =====================================================
   NEON FRONT 2 － 音效 / 音樂 / 粒子特效(第 4 部分)
   載入順序:放在 battle.js 之後
   ===================================================== */
(function(){
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null,master,sfxBus,musBus,noiseBuf,intensity=0,musicOn=false;
let S={sfx:true,bgm:true};
try{Object.assign(S,JSON.parse(localStorage.getItem('nf2_audio')||'{}'))}catch(e){}
const saveS=()=>localStorage.setItem('nf2_audio',JSON.stringify(S));

/* ---------- 音訊基礎 ---------- */
function init(){
  if(!AC)return;
  if(ctx){if(ctx.state=='suspended')ctx.resume();return}
  ctx=new AC();
  const comp=ctx.createDynamicsCompressor();
  master=ctx.createGain();master.gain.value=.8;
  master.connect(comp);comp.connect(ctx.destination);
  sfxBus=ctx.createGain();sfxBus.gain.value=S.sfx?1:0;sfxBus.connect(master);
  musBus=ctx.createGain();musBus.gain.value=S.bgm?.55:0;musBus.connect(master);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  startMusic();
}
function tone(f,dur,type,vol,slide,delay,bus){
  if(!ctx)return;
  const t=ctx.currentTime+(delay||0),o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type||'sine';
  o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(vol,t+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(bus||sfxBus);
  o.start(t);o.stop(t+dur+0.05);
}
function noise(dur,vol,ftype,f0,f1,delay,bus){
  if(!ctx)return;
  const t=ctx.currentTime+(delay||0),s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=noiseBuf;fl.type=ftype||'lowpass';
  fl.frequency.setValueAtTime(f0,t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(fl);fl.connect(g);g.connect(bus||sfxBus);
  s.start(t,Math.random(),dur+0.05);
}
const lastPlay={};
function ok(k,ms){const n=performance.now();if(n-(lastPlay[k]||0)<ms)return false;lastPlay[k]=n;return true}
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)};

/* ---------- 音效庫 ---------- */
const SFXLIB={
  click(){tone(900,.05,'square',.07,600)},
  pick(){tone(500,.07,'triangle',.12,800)},
  deny(){tone(150,.16,'sawtooth',.12,90)},
  deploy(){tone(260,.18,'sine',.22,620);tone(520,.12,'triangle',.1,1040,.04);noise(.08,.07,'highpass',3000,6000)},
  deployE(){tone(200,.15,'sine',.08,380)},
  pew(f){tone(f,.12,'square',.05,f*.4)},
  zap(){noise(.1,.08,'bandpass',2500,800);tone(1200,.08,'sawtooth',.05,300)},
  heal(){tone(880,.12,'sine',.1,1320);tone(1320,.14,'sine',.08,1760,.06)},
  hit(){noise(.06,.12,'lowpass',2500,500);tone(180,.06,'square',.06,90)},
  aoe(){noise(.35,.22,'lowpass',2200,150);tone(110,.3,'sine',.22,45)},
  death(){tone(400,.22,'square',.07,70);noise(.15,.08,'lowpass',2000,300)},
  tower(){noise(1.1,.5,'lowpass',3000,60);tone(90,1,'sine',.5,25);tone(60,.8,'sawtooth',.14,30,.05)},
  respawn(){tone(300,.4,'sine',.15,900)},
  ready(){tone(880,.15,'sine',.14);tone(1320,.25,'sine',.14,null,.12)},
  aim(){tone(200,.3,'sawtooth',.05,400)},
  laser(){tone(1200,.9,'sawtooth',.18,80);tone(90,.9,'sine',.35,40);noise(.9,.28,'bandpass',4000,300)},
  start(){tone(200,.5,'sawtooth',.1,800);tone(400,.5,'triangle',.1,1200,.1)},
  boost(){tone(400,.5,'sawtooth',.1,1200);tone(800,.4,'triangle',.08,1600,.15)},
  warn(){tone(600,.12,'square',.08);tone(600,.12,'square',.08,null,.2)},
  win(){[523,659,784,1047].forEach((f,i)=>tone(f,.25,'triangle',.18,null,i*.13));[523,659,784].forEach(f=>tone(f,.9,'sine',.12,null,.55))},
  lose(){[392,330,262,196].forEach((f,i)=>tone(f,.35,'sawtooth',.1,f*.9,i*.2))}
};
function SFX(name,arg){
  if(!ctx||!S.sfx)return;
  if(name=='pew'||name=='hit'){if(!ok(name,45))return}
  if(name=='death'||name=='aoe'){if(!ok(name,70))return}
  SFXLIB[name]&&SFXLIB[name](arg);
}
window.SFX=SFX;

/* ---------- 背景音樂(程式合成) ---------- */
const BPM=112,STEP=60/BPM/4;
const PROG=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];
const mf=m=>440*Math.pow(2,(m-69)/12);
let nextT=0,stepI=0,timer=null;
function playStep(i,t){
  const d=Math.max(0,t-ctx.currentTime);
  const bar=Math.floor(i/16)%4,s=i%16,ch=PROG[bar];
  if(s==0)ch.forEach(m=>tone(mf(m-12),STEP*16,'sawtooth',.018,null,d,musBus));
  const n=ch[[0,1,2,1][s%4]]+(s%8>=4?12:0);
  tone(mf(n+12),STEP*1.6,'square',intensity?.03:.018,null,d,musBus);
  if(intensity){
    if(s%4==0){tone(mf(ch[0]-24),STEP*3,'sawtooth',.08,null,d,musBus);tone(150,.15,'sine',.22,40,d,musBus)}
    if(s==4||s==12)noise(.12,.1,'bandpass',2500,1200,d,musBus);
    if(s%2==1)noise(.03,.04,'highpass',7000,7000,d,musBus);
  }
}
function schedule(){
  if(!ctx||!musicOn)return;
  while(nextT<ctx.currentTime+.15){playStep(stepI,nextT);nextT+=STEP;stepI++}
}
function startMusic(){
  if(timer)return;
  musicOn=true;nextT=ctx.currentTime+.1;stepI=0;
  timer=setInterval(schedule,30);
}
document.addEventListener('visibilitychange',()=>{
  if(!ctx)return;
  if(document.hidden)ctx.suspend();else ctx.resume();
});

/* ---------- 開關按鈕 ---------- */
const ui=document.createElement('div');
ui.style.cssText='position:fixed;right:8px;top:8px;z-index:60;display:flex;gap:6px';
ui.innerHTML='<button id="aSfx" class="btn" style="padding:4px 10px;font-size:15px"></button><button id="aBgm" class="btn" style="padding:4px 10px;font-size:15px"></button>';
document.body.appendChild(ui);
function refreshUI(){
  $('aSfx').textContent=S.sfx?'🔊':'🔇';$('aBgm').textContent=S.bgm?'🎵':'🚫';
  if(sfxBus)sfxBus.gain.value=S.sfx?1:0;
  if(musBus)musBus.gain.value=S.bgm?.55:0;
}
$('aSfx').onclick=()=>{init();S.sfx=!S.sfx;saveS();refreshUI();SFX('click')};
$('aBgm').onclick=()=>{init();S.bgm=!S.bgm;saveS();refreshUI()};
refreshUI();
document.addEventListener('pointerdown',e=>{
  init();
  if(e.target.closest&&e.target.closest('.btn,.stage,.pc,.slot,#tools button')&&!e.target.closest('#aSfx'))SFX('click');
},true);

/* ---------- 粒子 / 螢幕效果 ---------- */
const gg=$('cv').getContext('2d'),cvEl=$('cv');
const PT=[],MOTE=[];
let flash=0,shakeAt=0,lastT=performance.now();
for(let i=0;i<36;i++)MOTE.push({x:Math.random()*1200,y:Math.random()*600,vx:rand(-8,8),vy:rand(-14,-4),s:rand(1,2.6)});
function burst(x,y,col,n,spd,life,size,grav){
  for(let i=0;i<n;i++){
    const a=Math.random()*6.283,s=spd*(0.3+Math.random()*0.7);
    PT.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life*(0.6+Math.random()*0.6),max:life,col,size:size*(0.6+Math.random()*0.8),grav:grav||0});
  }
  while(PT.length>500)PT.shift();
}
function shake(px){
  const n=performance.now();if(n-shakeAt<120)return;shakeAt=n;
  const f=[];for(let i=0;i<7;i++)f.push({transform:`translate(${rand(-px,px)}px,${rand(-px,px)}px)`});
  f.push({transform:'none'});
  cvEl.animate(f,{duration:320});
}

/* ---------- 偵測戰鬥事件 ---------- */
const seen=new WeakSet();
let pv={charge:0,min:0,boost:false,aim:false};
function onFx(f){
  if(f.type=='beam'){
    if(f.col=='#69f0ae')SFX('heal');
    else if(f.col=='#ffd740'){SFX('zap');burst(f.x2,f.y2,f.col,6,120,.3,2.5)}
    else{SFX('pew',500+hash(f.col)%350);burst(f.x2,f.y2,f.col,4,90,.25,2)}
  }else if(f.type=='slash'){
    SFX('hit');burst(f.x,f.y,f.col,6,110,.25,2.5);
  }else if(f.type=='boom'){
    if(f.silent)return;
    if(f.dur>=1){SFX('tower');shake(11);flash=.35;burst(f.x,f.y,f.col,60,260,.9,4,60);burst(f.x,f.y,'#ffffff',25,320,.5,3)}
    else if(f.dur>=.8){SFX('respawn');burst(f.x,f.y,f.col,30,160,.7,3)}
    else if(f.dur>=.5){SFX('death');burst(f.x,f.y,f.col,16,150,.5,3,50)}
    else{SFX('aoe');shake(3);burst(f.x,f.y,f.col,22,200,.5,3)}
  }else if(f.type=='laser'){
    SFX('laser');shake(12);flash=.55;
    for(let i=0;i<46;i++){
      const t=Math.random(),x=f.x1+(f.x2-f.x1)*t,y=f.y1+(f.y2-f.y1)*t;
      burst(x,y,i%2?'#00e5ff':'#ffffff',1,130,.6,3);
    }
  }
}
function scanFx(b){
  for(const f of b.fx){if(!seen.has(f)){seen.add(f);onFx(f)}}
  if(b.laser.charge>=1&&pv.charge<1)SFX('ready');
  pv.charge=b.laser.charge;
  const m=Math.floor(b.t/60);
  if(b.endless&&m>pv.min&&b.t>5){SFX('warn');flash=.2}
  pv.min=m;
  const bo=b.t>ELIXIR.boostAfter;
  if(bo&&!pv.boost)SFX('boost');
  pv.boost=bo;
  let a=false;try{a=!!aim}catch(e){}
  if(a&&!pv.aim)SFX('aim');
  pv.aim=a;
}
function overlay(b){
  const now=performance.now(),dt=Math.min(.05,(now-lastT)/1000);lastT=now;
  const run=!b.paused;
  gg.save();
  // 背景漂浮光點
  gg.fillStyle=b.line;gg.globalAlpha=.22;
  for(const m of MOTE){
    if(run){m.x+=m.vx*dt;m.y+=m.vy*dt;if(m.y<-5){m.y=605;m.x=Math.random()*1200}if(m.x<-5)m.x=1205;if(m.x>1205)m.x=-5}
    gg.beginPath();gg.arc(m.x,m.y,m.s,0,7);gg.fill();
  }
  // 高速/飛行單位尾跡
  if(run)for(const e of b.ents){
    if(e.spawnT>0)continue;
    if(e.def.spd>=100&&Math.random()<.6)PT.push({x:e.x,y:e.y,vx:0,vy:0,life:.3,max:.3,col:e.def.col,size:e.r*.5,grav:0});
    else if(e.fly&&Math.random()<.2)PT.push({x:e.x+rand(-4,4),y:e.y-4,vx:0,vy:12,life:.35,max:.35,col:e.def.col,size:2,grav:0});
  }
  // 粒子
  gg.globalCompositeOperation='lighter';
  for(let i=PT.length-1;i>=0;i--){
    const p=PT[i];
    if(run){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.grav*dt;p.vx*=.985}
    if(p.life<=0){PT.splice(i,1);continue}
    const a=p.life/p.max;
    gg.globalAlpha=Math.min(1,a*1.2);gg.fillStyle=p.col;
    gg.beginPath();gg.arc(p.x,p.y,Math.max(.6,p.size*(.4+a*.6)),0,7);gg.fill();
  }
  gg.globalCompositeOperation='source-over';
  // 閃光
  if(flash>0){
    gg.globalAlpha=Math.min(.7,flash);gg.fillStyle='#fff';gg.fillRect(0,0,1200,600);
    if(run)flash=Math.max(0,flash-dt*2.2);
  }
  gg.restore();
}

/* ---------- 掛到原本的函式上 ---------- */
const _render=renderBattle;
renderBattle=function(b){scanFx(b);_render(b);overlay(b)};

const _spawn=spawnUnit;
spawnUnit=function(team,id,x,y){
  _spawn(team,id,x,y);
  const f=B.fx[B.fx.length-1];if(f)f.silent=true;
  const c=ALL[id].col;
  if(team=='p'){SFX('deploy');burst(x,y,c,18,150,.5,3)}
  else{SFX('deployE');burst(x,y,'#ff3d57',10,110,.4,2.5)}
};

const _play=playCard;
playCard=function(i,x,y){
  const r=_play(i,x,y);
  if(!r)SFX('deny');
  return r;
};

const _drag=startDrag;
startDrag=function(i,ev){
  if(B&&!B.over&&!B.paused){
    if(B.elixir<ALL[B.hand[i]].cost)SFX('deny');else SFX('pick');
  }
  return _drag(i,ev);
};

const _start=startBattle;
startBattle=function(cfg){
  _start(cfg);
  PT.length=0;flash=0;
  pv={charge:B.laser.charge,min:0,boost:false,aim:false};
  intensity=1;SFX('start');
};

const _fin=finish;
finish=function(win){
  const was=B&&B.over;
  _fin(win);
  if(B&&!was){SFX(win?'win':'lose');if(win)flash=.5;else shake(10)}
};

const _quit=quitBattle;
quitBattle=function(){_quit();intensity=0};

const _show=show;
show=function(id){_show(id);intensity=(id=='game')?1:0};

/* ---------- 勝利彩帶 ---------- */
const _end=onBattleEnd;
onBattleEnd=function(r){
  _end(r);intensity=0;
  if(!r.win)return;
  const c=document.createElement('canvas');
  c.width=innerWidth;c.height=innerHeight;
  c.style.cssText='position:fixed;inset:0;z-index:40;pointer-events:none';
  document.body.appendChild(c);
  const x=c.getContext('2d'),cols=['#00e5ff','#b04dff','#ffd54a','#ff3d57','#7cffb2'];
  const P=[];for(let i=0;i<140;i++)P.push({x:Math.random()*c.width,y:-20-Math.random()*c.height*.5,vy:rand(120,260),vx:rand(-60,60),s:rand(5,10),col:cols[i%5],rot:Math.random()*6});
  const t0=performance.now();
  (function f(now){
    const t=(now-t0)/1000;x.clearRect(0,0,c.width,c.height);
    P.forEach(p=>{p.x+=p.vx/60;p.y+=p.vy/60;p.rot+=.1;x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.fillStyle=p.col;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()});
    if(t<4)requestAnimationFrame(f);else c.remove();
  })(t0);
};
})();
