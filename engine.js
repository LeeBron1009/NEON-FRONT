/* =====================================================
   NEON FRONT 2 － 戰鬥引擎(第 2 部分)
   只處理邏輯。繪圖/輸入在 battle.js(第 3 部分)
   ===================================================== */
let B=null,_raf=0,_last=0;
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function distSeg(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1;
  let t=((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy);t=clamp(t,0,1);
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* ---------- 開始 / 結束 ---------- */
function startBattle(cfg){
  cancelAnimationFrame(_raf);
  const endless=cfg.mode=='endless';
  const st=endless?null:STAGES[cfg.stageIndex];
  B={
    cfg,mode:cfg.mode,stage:st,endless,t:0,over:false,paused:false,speed:1,
    elixir:ELIXIR.start,deck:shuffle(cfg.deck.slice()),hand:[],queue:[],next:null,
    ents:[],towers:[],fx:[],score:0,kills:0,crowns:0,ecrowns:0,
    laser:{charge:0.5},uid:1,
    timeLeft:st?st.time:0,
    pitch:st?st.pitch:ENDLESS.pitch,line:st?st.line:ENDLESS.line,
    ai:null
  };
  B.hand=B.deck.slice(0,4);B.queue=B.deck.slice(4);B.next=B.queue[0];
  makeTowers();
  makeAI();
  $('bPause').textContent='⏸';$('bSpeed').textContent='x1';
  if(typeof initBattleUI==='function')initBattleUI(B);
  _last=performance.now();
  _raf=requestAnimationFrame(_loop);
}
function quitBattle(){cancelAnimationFrame(_raf);B=null;show('modes')}
function finish(win){
  if(B.over)return;B.over=true;
  const r={win,mode:B.mode,stageIndex:B.cfg.stageIndex,score:B.score,time:B.t,kills:B.kills,crowns:Math.min(3,B.crowns)};
  setTimeout(()=>{cancelAnimationFrame(_raf);B=null;onBattleEnd(r)},1300);
}

/* ---------- 塔 ---------- */
function makeTowers(){
  const st=B.stage;
  ['p','e'].forEach(team=>{
    ['king','top','bot'].forEach(kind=>{
      const base=kind=='king'?TOWER.king:TOWER.prin,pos=TOWER_POS[team][kind];
      const hpMul=team=='e'&&st?st.hpMul:1,dmgMul=team=='e'&&st?st.statMul:1;
      const hp=base.hp*hpMul;
      B.towers.push({isTower:true,id:B.uid++,team,kind,x:pos.x,y:pos.y,r:base.r,
        hp,max:hp,baseHp:hp,dmg:base.dmg*dmgMul,rng:base.rng,atk:base.atk,
        cd:rand(0,1),dead:false,respawn:0,hit:0});
    });
  });
}
function towerOf(team,kind){return B.towers.find(t=>t.team==team&&t.kind==kind)}
function nearestTower(e){
  let best=null,bd=1e9;
  for(const t of B.towers){
    if(t.team==e.team||t.dead)continue;
    const d=dist2(e,t);if(d<bd){bd=d;best=t}
  }
  return best;
}
function updateTower(t,dt){
  t.hit=Math.max(0,t.hit-dt);
  if(t.dead){
    if(B.endless&&t.team=='e'){
      t.respawn-=dt;
      if(t.respawn<=0){
        const m=1+ENDLESS.towerGrowth*(B.t/60);
        t.max=t.baseHp*m;t.hp=t.max;t.dead=false;
        B.fx.push({type:'boom',x:t.x,y:t.y,r:90,col:'#00e5ff',t:0,dur:0.8});
      }
    }
    return;
  }
  t.cd-=dt;
  if(t.cd>0)return;
  let best=null,bd=1e9;
  for(const o of B.ents){
    if(o.team==t.team||o.dead)continue;
    const d=dist2(t,o)-o.r;
    if(d<=t.rng&&d<bd){bd=d;best=o}
  }
  if(best){
    t.cd=t.atk;
    B.fx.push({type:'beam',x1:t.x,y1:t.y,x2:best.x,y2:best.y,col:t.team=='p'?'#00e5ff':'#ff5252',t:0,dur:0.14});
    damage(best,t.dmg,t.team);
  }
}

/* ---------- 傷害 ---------- */
function damage(t,amt,src){
  if(t.dead||amt<=0)return;
  const real=Math.min(amt,t.hp);
  t.hp-=amt;t.hit=0.12;
  B.fx.push({type:'dmg',x:t.x+rand(-10,10),y:t.y-t.r,v:Math.round(amt),t:0,dur:0.7});
  if(t.isTower){
    if(src=='p'&&B.endless)B.score+=real*ENDLESS.scoreTowerHit;
    if(t.hp<=0){
      t.hp=0;t.dead=true;
      B.fx.push({type:'boom',x:t.x,y:t.y,r:140,col:t.team=='p'?'#00e5ff':'#ff5252',t:0,dur:1});
      if(t.team=='e'){
        B.crowns+=t.kind=='king'?3:1;
        if(B.endless){B.score+=ENDLESS.scoreTowerKill;t.respawn=ENDLESS.towerRespawn}
      }else B.ecrowns+=t.kind=='king'?3:1;
    }
  }else if(t.hp<=0){
    t.dead=true;
    B.fx.push({type:'boom',x:t.x,y:t.y,r:t.r*2.2,col:t.def.col,t:0,dur:0.5});
    if(src=='p'&&t.team=='e'){B.kills++;if(B.endless)B.score+=t.def.cost*ENDLESS.scoreKill}
  }
}
function aoe(x,y,rad,dmg,team,hitAir){
  B.fx.push({type:'boom',x,y,r:rad,col:team=='p'?'#00e5ff':'#ff7043',t:0,dur:0.4});
  for(const o of B.ents){
    if(o.team==team||o.dead)continue;
    if(o.fly&&!hitAir)continue;
    if(Math.hypot(o.x-x,o.y-y)<=rad+o.r)damage(o,dmg,team);
  }
  for(const t of B.towers){
    if(t.team==team||t.dead)continue;
    if(Math.hypot(t.x-x,t.y-y)<=rad+t.r)damage(t,dmg,team);
  }
}

/* ---------- 單位 ---------- */
function enemyMul(){
  if(B.endless)return 1+ENDLESS.statGrowth*(B.t/60);
  return B.stage.statMul;
}
function spawnUnit(team,id,x,y){
  const d=ALL[id],n=d.cnt||1,mul=team=='e'?enemyMul():1;
  for(let i=0;i<n;i++){
    B.ents.push({
      id:B.uid++,team,def:d,
      x:x+(n>1?rand(-20,20):0),y:y+(n>1?rand(-20,20):0),
      hp:d.hp*mul,max:d.hp*mul,dmg:d.dmg*mul,
      cd:d.atk*0.5,r:d.r,slowT:0,spawnT:0.6,life:d.life||0,
      fly:!!d.fly,dead:false,hit:0,face:team=='p'?Math.PI:0
    });
  }
  B.fx.push({type:'boom',x,y,r:d.r*2.4,col:d.col,t:0,dur:0.4});
}
function canHit(e,o){return !o.fly||e.def.fly||e.def.rng>60}
function findTarget(e){
  const d=e.def;
  if(d.tgt!='tower'){
    let best=null,bd=1e9;const aggro=Math.max(170,d.rng+30);
    for(const o of B.ents){
      if(o.team==e.team||o.dead||!canHit(e,o))continue;
      const dd=dist2(e,o)-o.r-e.r;
      if(dd<aggro&&dd<bd){bd=dd;best=o}
    }
    if(best)return best;
  }
  return nearestTower(e);
}
function steer(e,tg,dt){
  const dx=tg.x-e.x,dy=tg.y-e.y,l=Math.hypot(dx,dy)||1;
  const sp=e.def.spd*(e.slowT>0?0.5:1);
  e.x+=dx/l*sp*dt;e.y+=dy/l*sp*dt;e.face=Math.atan2(dy,dx);
}
function updateUnit(e,dt){
  const d=e.def;
  e.hit=Math.max(0,e.hit-dt);
  if(e.slowT>0)e.slowT-=dt;
  if(e.spawnT>0){e.spawnT-=dt;return}
  if(e.life){e.life-=dt;if(e.life<=0){e.dead=true;B.fx.push({type:'boom',x:e.x,y:e.y,r:40,col:d.col,t:0,dur:0.4});return}}
  e.cd-=dt;

  if(d.fx=='heal'){
    let wounded=null,wr=1,near=null,nd=1e9;
    for(const o of B.ents){
      if(o.team!=e.team||o===e||o.dead||o.def.fx=='building'||o.def.fx=='heal')continue;
      const dd=dist2(e,o);
      if(dd<nd){nd=dd;near=o}
      const ratio=o.hp/o.max;
      if(dd<=d.rng&&ratio<wr){wr=ratio;wounded=o}
    }
    if(wounded&&e.cd<=0){
      wounded.hp=Math.min(wounded.max,wounded.hp+110);e.cd=d.atk;
      B.fx.push({type:'beam',x1:e.x,y1:e.y,x2:wounded.x,y2:wounded.y,col:'#69f0ae',t:0,dur:0.2});
    }
    if(near&&nd<420&&nd>70)steer(e,near,dt);
    return;
  }

  const tg=findTarget(e);
  if(!tg)return;
  const dd=dist2(e,tg)-tg.r-e.r;
  if(dd<=d.rng){
    e.face=Math.atan2(tg.y-e.y,tg.x-e.x);
    if(e.cd<=0){e.cd=d.atk;attack(e,tg)}
  }else if(d.spd>0)steer(e,tg,dt);
}
function attack(e,tg){
  const d=e.def,ranged=d.rng>60;
  if(d.fx=='kamikaze'){aoe(e.x,e.y,d.splash,e.dmg,e.team,true);e.dead=true;return}
  B.fx.push(ranged
    ?{type:'beam',x1:e.x,y1:e.y,x2:tg.x,y2:tg.y,col:d.col,t:0,dur:0.12}
    :{type:'slash',x:tg.x,y:tg.y,col:d.col,t:0,dur:0.2});
  if(d.splash){aoe(tg.x,tg.y,d.splash,e.dmg,e.team,d.fly||ranged)}
  else if(d.fx=='chain'&&!tg.isTower){
    damage(tg,e.dmg,e.team);
    const others=B.ents.filter(o=>o.team!=e.team&&!o.dead&&o!==tg&&Math.hypot(o.x-tg.x,o.y-tg.y)<130&&canHit(e,o))
      .sort((a,b)=>Math.hypot(a.x-tg.x,a.y-tg.y)-Math.hypot(b.x-tg.x,b.y-tg.y)).slice(0,2);
    let prev=tg;
    others.forEach(o=>{
      B.fx.push({type:'beam',x1:prev.x,y1:prev.y,x2:o.x,y2:o.y,col:'#ffd740',t:0,dur:0.2});
      damage(o,e.dmg*0.7,e.team);prev=o;
    });
  }else damage(tg,e.dmg,e.team);
  if(d.fx=='slow'&&!tg.isTower)tg.slowT=2;
}

/* ---------- 碰撞(互相推開) ---------- */
function resolveCollisions(){
  const L=B.ents;
  for(let i=0;i<L.length;i++){
    const a=L[i];if(a.dead)continue;
    for(let j=i+1;j<L.length;j++){
      const b=L[j];if(b.dead||a.fly!==b.fly)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
      if(d>=min||d<0.01)continue;
      const ov=min-d,nx=dx/d,ny=dy/d;
      const ma=a.def.spd==0?1e9:a.r*a.r,mb=b.def.spd==0?1e9:b.r*b.r;
      const wa=mb/(ma+mb),wb=ma/(ma+mb);
      a.x-=nx*ov*wa;a.y-=ny*ov*wa;b.x+=nx*ov*wb;b.y+=ny*ov*wb;
    }
  }
  for(const e of L){
    if(e.dead)continue;
    if(!e.fly){
      for(const t of B.towers){
        if(t.dead)continue;
        const dx=e.x-t.x,dy=e.y-t.y,d=Math.hypot(dx,dy),min=t.r+e.r;
        if(d<min&&d>0.01){e.x=t.x+dx/d*min;e.y=t.y+dy/d*min}
      }
    }
    e.x=clamp(e.x,e.r,FIELD.W-e.r);e.y=clamp(e.y,e.r,FIELD.H-e.r);
  }
}

/* ---------- 玩家:卡牌 / 出兵 ---------- */
function inDeployZone(x,y){
  if(!B)return false;
  if(x<20||x>FIELD.W-20||y<20||y>FIELD.H-20)return false;
  for(const t of B.towers){if(!t.dead&&Math.hypot(t.x-x,t.y-y)<t.r+16)return false}
  let ok=x>=620;
  if(towerOf('e','top').dead&&y<300&&x>=330)ok=true;
  if(towerOf('e','bot').dead&&y>=300&&x>=330)ok=true;
  return ok;
}
function canAfford(i){return B&&B.elixir>=ALL[B.hand[i]].cost}
function playCard(i,x,y){
  if(!B||B.over||B.paused)return false;
  const id=B.hand[i],d=ALL[id];
  if(!d||B.elixir<d.cost||!inDeployZone(x,y))return false;
  B.elixir-=d.cost;
  spawnUnit('p',id,x,y);
  B.queue.push(id);
  B.hand[i]=B.queue.shift();
  B.next=B.queue[0];
  return true;
}

/* ---------- 雷射砲 ---------- */
function fireLaser(ax,ay){
  if(!B||B.over||B.paused||B.laser.charge<1)return false;
  const k=towerOf('p','king');
  let dx=ax-k.x,dy=ay-k.y,l=Math.hypot(dx,dy);
  if(l<12){dx=-1;dy=0;l=1}
  dx/=l;dy/=l;
  const x2=k.x+dx*LASER.length,y2=k.y+dy*LASER.length,hw=LASER.width/2;
  for(const o of B.ents){
    if(o.team=='p'||o.dead)continue;
    if(distSeg(o.x,o.y,k.x,k.y,x2,y2)<=hw+o.r){damage(o,LASER.dmg,'p');o.slowT=1.5}
  }
  for(const t of B.towers){
    if(t.team=='p'||t.dead)continue;
    if(distSeg(t.x,t.y,k.x,k.y,x2,y2)<=hw+t.r)damage(t,LASER.towerDmg,'p');
  }
  B.fx.push({type:'laser',x1:k.x,y1:k.y,x2,y2,w:LASER.width,t:0,dur:0.8});
  B.laser.charge=0;
  return true;
}

/* ---------- 敵方 AI ---------- */
function makeAI(){
  const st=B.stage;
  B.ai={
    elixir:3,wait:st?st.aiDelay:6,want:null,
    hand:st?shuffle(st.deck.slice()).slice(0,4):[],
    queue:st?shuffle(st.deck.slice()).slice(4):[]
  };
  if(st){const all=shuffle(st.deck.slice());B.ai.hand=all.slice(0,4);B.ai.queue=all.slice(4)}
}
function aiPick(){
  const a=B.ai;
  if(B.endless){
    const minutes=B.t/60,maxCost=Math.min(9,3+Math.floor(minutes*1.2));
    const list=ENDLESS.pool.filter(id=>ALL[id].cost<=maxCost&&(id!='boss'||minutes>=5));
    return list[Math.floor(Math.random()*list.length)];
  }
  return a.hand[Math.floor(Math.random()*a.hand.length)];
}
function aiPlace(d){
  const threats=B.ents.filter(o=>o.team=='p'&&!o.dead&&o.x<520);
  let x,y;
  if(threats.length&&Math.random()<0.7){
    const th=threats[Math.floor(Math.random()*threats.length)];
    x=clamp(th.x-rand(40,100),110,540);y=clamp(th.y+rand(-40,40),40,560);
  }else{
    y=(Math.random()<0.5?140:460)+rand(-40,40);x=rand(380,560);
  }
  for(const t of B.towers){
    if(!t.dead&&Math.hypot(t.x-x,t.y-y)<t.r+d.r+4){x+=70}
  }
  return {x:clamp(x,40,590),y:clamp(y,40,560)};
}
function updateAI(dt){
  const a=B.ai,minutes=B.t/60;
  const rate=B.endless?ENDLESS.baseRate+ENDLESS.rateGrowth*minutes:B.stage.aiRate;
  a.elixir=Math.min(ELIXIR.max,a.elixir+ELIXIR.rate*rate*(B.t>ELIXIR.boostAfter?2:1)*dt);
  a.wait-=dt;
  if(a.wait>0)return;
  if(!a.want)a.want=aiPick();
  const d=ALL[a.want];
  if(a.elixir<d.cost)return;
  const p=aiPlace(d);
  spawnUnit('e',a.want,p.x,p.y);
  a.elixir-=d.cost;
  if(!B.endless){
    const i=a.hand.indexOf(a.want);
    a.queue.push(a.want);a.hand[i]=a.queue.shift();
  }
  a.want=null;
  a.wait=rand(1.0,2.8)/(B.endless?1+minutes*0.05:1);
}

/* ---------- 主更新 ---------- */
function updateFx(dt){
  for(const f of B.fx)f.t+=dt;
  B.fx=B.fx.filter(f=>f.t<f.dur);
}
function updateBattle(dt){
  updateFx(dt);
  if(B.paused||B.over)return;
  B.t+=dt;
  B.elixir=Math.min(ELIXIR.max,B.elixir+ELIXIR.rate*(B.t>ELIXIR.boostAfter?2:1)*dt);
  B.laser.charge=Math.min(1,B.laser.charge+dt/LASER.charge);
  if(B.endless)B.score+=ENDLESS.scoreTime*dt;
  else B.timeLeft=Math.max(0,B.timeLeft-dt);

  updateAI(dt);
  for(const t of B.towers)updateTower(t,dt);
  for(const e of B.ents)if(!e.dead)updateUnit(e,dt);
  resolveCollisions();
  B.ents=B.ents.filter(e=>!e.dead);
  checkEnd();
}
function checkEnd(){
  const pk=towerOf('p','king'),ek=towerOf('e','king');
  if(pk.dead){finish(false);return}
  if(B.endless)return;
  if(ek.dead){finish(true);return}
  if(B.timeLeft<=0){
    if(B.crowns!=B.ecrowns){finish(B.crowns>B.ecrowns);return}
    const sum=team=>B.towers.filter(t=>t.team==team).reduce((s,t)=>s+t.hp,0);
    finish(sum('p')>sum('e'));
  }
}

/* ---------- 主迴圈 ---------- */
function _loop(now){
  _raf=requestAnimationFrame(_loop);
  if(!B)return;
  const dt=Math.min(0.05,(now-_last)/1000);_last=now;
  for(let i=0;i<B.speed;i++)updateBattle(dt);
  if(!B)return;
  if(typeof renderBattle==='function')renderBattle(B);
  if(typeof updateHUD==='function')updateHUD(B);
}

/* ---------- 按鈕 ---------- */
$('bPause').onclick=()=>{if(!B)return;B.paused=!B.paused;$('bPause').textContent=B.paused?'▶':'⏸'};
$('bSpeed').onclick=()=>{if(!B)return;B.speed=B.speed==1?2:1;$('bSpeed').textContent='x'+B.speed};
$('bQuit').onclick=()=>{if(B&&confirm('離開戰鬥?'))quitBattle()};
