/* =====================================================
   NEON FRONT 2 － 繪圖 / 拖曳 / 雷射瞄準 / HUD(第 3 部分)
   ===================================================== */
const cv=$('cv'),g=cv.getContext('2d');
let drag=null,aim=null,_bound=false;
const _ui={cards:[],ids:[],nextId:null};

/* ---------- 座標轉換 ---------- */
function toField(e){
  const r=cv.getBoundingClientRect();
  return{x:(e.clientX-r.left)/r.width*FIELD.W,y:(e.clientY-r.top)/r.height*FIELD.H,
         over:e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom};
}

/* ---------- 球場底圖(只畫一次) ---------- */
function buildPitch(b){
  const c=document.createElement('canvas');c.width=FIELD.W;c.height=FIELD.H;
  const p=c.getContext('2d');
  for(let i=0;i<12;i++){p.fillStyle=i%2?b.pitch[0]:b.pitch[1];p.fillRect(i*100,0,100,FIELD.H)}
  p.strokeStyle='rgba(255,255,255,.045)';p.lineWidth=1;
  for(let x=0;x<=FIELD.W;x+=50){p.beginPath();p.moveTo(x,0);p.lineTo(x,FIELD.H);p.stroke()}
  for(let y=0;y<=FIELD.H;y+=50){p.beginPath();p.moveTo(0,y);p.lineTo(FIELD.W,y);p.stroke()}
  p.save();
  p.strokeStyle=b.line;p.lineWidth=3;p.shadowColor=b.line;p.shadowBlur=10;p.globalAlpha=.85;
  p.strokeRect(24,24,1152,552);
  p.beginPath();p.moveTo(600,24);p.lineTo(600,576);p.stroke();
  p.beginPath();p.arc(600,300,84,0,7);p.stroke();
  p.beginPath();p.arc(600,300,5,0,7);p.fillStyle=b.line;p.fill();
  p.strokeRect(24,170,150,260);p.strokeRect(1026,170,150,260);
  p.strokeRect(24,235,60,130);p.strokeRect(1116,235,60,130);
  p.beginPath();p.arc(124,300,84,-0.65,0.65);p.stroke();
  p.beginPath();p.arc(1076,300,84,Math.PI-0.65,Math.PI+0.65);p.stroke();
  [[24,24,0,Math.PI/2],[1176,24,Math.PI/2,Math.PI],[1176,576,Math.PI,Math.PI*1.5],[24,576,Math.PI*1.5,Math.PI*2]]
    .forEach(a=>{p.beginPath();p.arc(a[0],a[1],18,a[2],a[3]);p.stroke()});
  p.restore();
  const rg=p.createRadialGradient(600,300,150,600,300,720);
  rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(1,'rgba(0,0,0,.5)');
  p.fillStyle=rg;p.fillRect(0,0,FIELD.W,FIELD.H);
  return c;
}

/* ---------- 初始化 UI ---------- */
function fillCard(el,id){
  const d=ALL[id];el.innerHTML='';
  el.appendChild(makeIcon(d,52));
  el.insertAdjacentHTML('beforeend',`<div class="n">${d.n}</div><div class="cost">${d.cost}</div>`);
}
function initBattleUI(b){
  b._bg=buildPitch(b);
  drag=null;aim=null;$('ghost').style.display='none';
  const hand=$('hand');hand.innerHTML='';
  _ui.cards=[];_ui.ids=[null,null,null,null];_ui.nextId=null;
  for(let i=0;i<4;i++){
    const el=document.createElement('div');el.className='card';
    el.addEventListener('pointerdown',ev=>startDrag(i,ev));
    hand.appendChild(el);_ui.cards.push(el);
  }
  $('nextCard').innerHTML='';
  bindOnce();
  updateHUD(b);
}

/* ---------- 輸入 ---------- */
function startDrag(i,ev){
  if(!B||B.over||B.paused)return;
  ev.preventDefault();
  const id=B.hand[i];
  if(B.elixir<ALL[id].cost){ // 聖水不夠:抖動提示
    const el=_ui.cards[i];el.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'none'}],{duration:180});
    return;
  }
  const f=toField(ev);
  drag={i,id,x:f.x,y:f.y,over:f.over};
  _ui.cards[i].classList.add('drag');
  const gh=$('ghost');gh.innerHTML='';gh.appendChild(makeIcon(ALL[id],64));
  moveGhost(ev);
}
function moveGhost(ev){
  const gh=$('ghost'),f=toField(ev);
  drag.x=f.x;drag.y=f.y;drag.over=f.over;
  gh.style.left=ev.clientX+'px';gh.style.top=ev.clientY+'px';
  gh.style.display=f.over?'none':'block';
}
function bindOnce(){
  if(_bound)return;_bound=true;
  window.addEventListener('pointermove',ev=>{
    if(drag)moveGhost(ev);
    if(aim){const f=toField(ev);aim.x=f.x;aim.y=f.y}
  });
  window.addEventListener('pointerup',ev=>{
    if(drag){
      const f=toField(ev);
      if(f.over&&B)playCard(drag.i,f.x,f.y);
      _ui.cards[drag.i]&&_ui.cards[drag.i].classList.remove('drag');
      $('ghost').style.display='none';drag=null;
    }
    if(aim){
      const f=toField(ev),br=$('laserBtn').getBoundingClientRect();
      const onBtn=ev.clientX>=br.left&&ev.clientX<=br.right&&ev.clientY>=br.top&&ev.clientY<=br.bottom;
      if(!onBtn&&B)fireLaser(f.x,f.y);
      aim=null;
    }
  });
  window.addEventListener('pointercancel',()=>{
    if(drag){_ui.cards[drag.i]&&_ui.cards[drag.i].classList.remove('drag');$('ghost').style.display='none';drag=null}
    aim=null;
  });
  $('laserBtn').addEventListener('pointerdown',ev=>{
    if(!B||B.over||B.paused||B.laser.charge<1)return;
    ev.preventDefault();
    const f=toField(ev);aim={x:f.x,y:f.y};
  });
}

/* ---------- HUD ---------- */
function fmtTime(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function updateHUD(b){
  if(b.endless){
    $('hTimer').textContent='⏱ '+fmtTime(b.t);
    $('hScore').textContent='分數 '+Math.floor(b.score).toLocaleString();
    $('hCrown').textContent='擊殺 '+b.kills;
  }else{
    $('hTimer').textContent=(b.t>ELIXIR.boostAfter?'⚡x2 ':'')+fmtTime(b.timeLeft);
    $('hScore').textContent=b.stage.n;
    $('hCrown').textContent='👑 '+Math.min(3,b.crowns)+' : '+Math.min(3,b.ecrowns);
  }
  $('elixFill').style.width=(b.elixir/ELIXIR.max*100)+'%';
  $('elixNum').textContent='💧 '+Math.floor(b.elixir)+' / '+ELIXIR.max;
  for(let i=0;i<4;i++){
    const el=_ui.cards[i];if(!el)continue;
    if(_ui.ids[i]!==b.hand[i]){_ui.ids[i]=b.hand[i];fillCard(el,b.hand[i])}
    const ok=b.elixir>=ALL[b.hand[i]].cost;
    el.classList.toggle('can',ok);el.classList.toggle('no',!ok);
  }
  if(_ui.nextId!==b.next){
    _ui.nextId=b.next;const nc=$('nextCard');nc.innerHTML='';nc.appendChild(makeIcon(ALL[b.next],44));
  }
  const lb=$('laserBtn');
  lb.querySelector('.fill').style.height=(b.laser.charge*100)+'%';
  lb.classList.toggle('ready',b.laser.charge>=1);
}

/* ---------- 繪圖:單位 / 塔 ---------- */
function ellipse(x,y,rx,ry){g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill()}
function drawUnit(e,t){
  const d=e.def,hr=e.r*1.2+3;
  const bob=d.spd>0&&e.spawnT<=0?Math.sin(t*10+e.id)*1.5:0;
  const lift=e.fly?16:0;
  g.fillStyle='rgba(0,0,0,.35)';
  ellipse(e.x,e.y+e.r*0.6,hr*0.9,hr*0.4);
  const y=e.y-lift+bob;
  g.save();
  let sc=1;
  if(e.spawnT>0){g.globalAlpha=0.5;sc=1+e.spawnT*0.6}
  const tc=e.team=='p'?'#00e5ff':'#ff3d57';
  g.strokeStyle=tc;g.lineWidth=2;g.shadowColor=tc;g.shadowBlur=8;
  g.globalAlpha*=0.8;
  g.beginPath();g.arc(e.x,y,hr*sc+4,0,7);g.stroke();
  g.globalAlpha=e.spawnT>0?0.5:1;g.shadowBlur=0;
  drawHex(g,e.x,y,hr*sc,d.col,d.e,e.hit>0?26:10);
  if(e.hit>0){g.fillStyle='rgba(255,255,255,.45)';hexPath(g,e.x,y,hr);g.fill()}
  if(e.slowT>0){g.strokeStyle='#b3e5fc';g.setLineDash([4,3]);g.beginPath();g.arc(e.x,y,hr+8,0,7);g.stroke();g.setLineDash([])}
  g.restore();
  if(e.hp<e.max||d.fx=='building'){
    const w=Math.max(30,hr*2.2),bx=e.x-w/2,by=y-hr-12;
    g.fillStyle='rgba(0,0,0,.6)';g.fillRect(bx,by,w,5);
    g.fillStyle=e.team=='p'?'#00e5ff':'#ff3d57';g.fillRect(bx,by,w*Math.max(0,e.hp/e.max),5);
    if(d.fx=='building'&&e.life){g.fillStyle='#ffd54a';g.fillRect(bx,by+6,w*Math.max(0,e.life/d.life),3)}
  }
}
const TOWER_EMOJI={p:{king:'🏰',top:'🏯',bot:'🏯'},e:{king:'🏭',top:'🏗️',bot:'🏗️'}};
function drawTower(t){
  const col=t.team=='p'?'#00e5ff':'#ff3d57';
  if(t.dead){
    g.save();g.globalAlpha=.55;
    drawHex(g,t.x,t.y,t.r,'#555a66','💥',0);
    g.restore();
    if(B.endless&&t.team=='e'){
      g.fillStyle='#fff';g.font='bold 15px sans-serif';g.textAlign='center';
      g.fillText('重生 '+Math.ceil(t.respawn)+'s',t.x,t.y+t.r+22);
    }
    return;
  }
  g.save();
  g.fillStyle=col+'22';g.strokeStyle=col;g.lineWidth=2;g.shadowColor=col;g.shadowBlur=14;
  g.beginPath();g.arc(t.x,t.y,t.r+10,0,7);g.fill();g.stroke();
  g.restore();
  drawHex(g,t.x,t.y,t.r,col,TOWER_EMOJI[t.team][t.kind],t.hit>0?34:16);
  if(t.hit>0){g.fillStyle='rgba(255,255,255,.4)';hexPath(g,t.x,t.y,t.r);g.fill()}
  const w=t.kind=='king'?96:78,bx=t.x-w/2,by=t.y-t.r-24;
  g.fillStyle='rgba(0,0,0,.65)';g.fillRect(bx,by,w,9);
  g.fillStyle=col;g.fillRect(bx,by,w*Math.max(0,t.hp/t.max),9);
  g.strokeStyle='#fff6';g.lineWidth=1;g.strokeRect(bx,by,w,9);
  g.fillStyle='#fff';g.font='bold 11px sans-serif';g.textAlign='center';
  g.fillText(Math.ceil(t.hp),t.x,by-3);
}

/* ---------- 繪圖:特效 ---------- */
function drawFx(f){
  const p=f.t/f.dur,a=1-p;
  g.save();
  if(f.type=='beam'){
    g.globalAlpha=a;g.strokeStyle=f.col;g.lineWidth=3;g.shadowColor=f.col;g.shadowBlur=10;
    g.beginPath();g.moveTo(f.x1,f.y1);g.lineTo(f.x2,f.y2);g.stroke();
  }else if(f.type=='slash'){
    g.globalAlpha=a;g.strokeStyle=f.col;g.lineWidth=3;
    g.beginPath();g.moveTo(f.x-10,f.y-10);g.lineTo(f.x+10,f.y+10);g.moveTo(f.x+10,f.y-10);g.lineTo(f.x-10,f.y+10);g.stroke();
  }else if(f.type=='boom'){
    const r=f.r*(0.3+0.7*p);
    g.globalAlpha=a;g.strokeStyle=f.col;g.fillStyle=f.col;g.lineWidth=3;
    g.shadowColor=f.col;g.shadowBlur=12;
    g.beginPath();g.arc(f.x,f.y,r,0,7);g.stroke();
    g.globalAlpha=a*0.18;g.fill();
  }else if(f.type=='dmg'){
    g.globalAlpha=a;g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=3;
    g.font='bold 15px sans-serif';g.textAlign='center';
    g.strokeText(f.v,f.x,f.y-p*34);g.fillText(f.v,f.x,f.y-p*34);
  }else if(f.type=='laser'){
    const dx=f.x2-f.x1,dy=f.y2-f.y1,ang=Math.atan2(dy,dx),len=Math.hypot(dx,dy);
    g.translate(f.x1,f.y1);g.rotate(ang);
    const w=f.w*(0.35+0.65*a);
    g.globalAlpha=a*0.55;g.fillStyle='#00e5ff';g.shadowColor='#00e5ff';g.shadowBlur=30;
    g.fillRect(0,-w/2,len,w);
    g.globalAlpha=a;g.fillStyle='#fff';g.fillRect(0,-w/6,len,w/3);
  }
  g.restore();
}

/* ---------- 繪圖:拖曳預覽 / 雷射瞄準 ---------- */
function drawDeployZone(b){
  const pulse=0.09+0.04*Math.sin(b.t*5+performance.now()/200);
  g.fillStyle=`rgba(0,229,255,${pulse})`;
  g.fillRect(620,0,580,600);
  if(towerOf('e','top').dead)g.fillRect(330,0,290,300);
  if(towerOf('e','bot').dead)g.fillRect(330,300,290,300);
  g.strokeStyle='rgba(0,229,255,.5)';g.setLineDash([8,6]);g.lineWidth=2;
  g.beginPath();g.moveTo(620,0);g.lineTo(620,600);g.stroke();g.setLineDash([]);
}
function drawDragPreview(){
  if(!drag||!drag.over)return;
  const d=ALL[drag.id],ok=inDeployZone(drag.x,drag.y);
  const col=ok?'#69f0ae':'#ff5252';
  g.save();
  g.strokeStyle=col;g.fillStyle=col;g.lineWidth=2;g.setLineDash([6,5]);
  g.globalAlpha=0.8;
  g.beginPath();g.arc(drag.x,drag.y,d.rng+d.r,0,7);g.stroke();
  g.setLineDash([]);g.globalAlpha=0.12;g.fill();
  g.globalAlpha=ok?0.9:0.4;
  const n=d.cnt||1;
  for(let i=0;i<n;i++){
    const ox=n>1?Math.cos(i*2.1)*16:0,oy=n>1?Math.sin(i*2.1)*16:0;
    drawHex(g,drag.x+ox,drag.y+oy,d.r*1.2+3,d.col,d.e,ok?14:0);
  }
  g.restore();
}
function drawLaserAim(b){
  if(!aim)return;
  const k=towerOf('p','king');
  let dx=aim.x-k.x,dy=aim.y-k.y,l=Math.hypot(dx,dy);
  if(l<12){dx=-1;dy=0;l=1}
  dx/=l;dy/=l;
  const x2=k.x+dx*LASER.length,y2=k.y+dy*LASER.length,ang=Math.atan2(dy,dx);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,0,FIELD.W,FIELD.H);
  g.save();
  g.translate(k.x,k.y);g.rotate(ang);
  const gr=g.createLinearGradient(0,0,LASER.length,0);
  gr.addColorStop(0,'rgba(0,229,255,.45)');gr.addColorStop(1,'rgba(0,229,255,.12)');
  g.fillStyle=gr;g.fillRect(0,-LASER.width/2,LASER.length,LASER.width);
  g.strokeStyle='#fff';g.globalAlpha=.8;g.setLineDash([12,8]);g.lineWidth=2;
  g.beginPath();g.moveTo(0,0);g.lineTo(LASER.length,0);g.stroke();
  g.restore();
  const hw=LASER.width/2;
  g.save();g.strokeStyle='#ff3d57';g.lineWidth=3;g.shadowColor='#ff3d57';g.shadowBlur=12;
  for(const o of b.ents){
    if(o.team=='p'||o.dead)continue;
    if(distSeg(o.x,o.y,k.x,k.y,x2,y2)<=hw+o.r){g.beginPath();g.arc(o.x,o.y-(o.fly?16:0),o.r*1.2+10,0,7);g.stroke()}
  }
  for(const t of b.towers){
    if(t.team=='p'||t.dead)continue;
    if(distSeg(t.x,t.y,k.x,k.y,x2,y2)<=hw+t.r){g.beginPath();g.arc(t.x,t.y,t.r+14,0,7);g.stroke()}
  }
  g.restore();
}

/* ---------- 主繪圖 ---------- */
function renderBattle(b){
  g.clearRect(0,0,FIELD.W,FIELD.H);
  g.drawImage(b._bg,0,0);
  if(drag)drawDeployZone(b);
  for(const t of b.towers)if(t.dead)drawTower(t);
  for(const t of b.towers)if(!t.dead)drawTower(t);
  const ground=b.ents.filter(e=>!e.fly).sort((a,c)=>a.y-c.y);
  const air=b.ents.filter(e=>e.fly).sort((a,c)=>a.y-c.y);
  ground.forEach(e=>drawUnit(e,b.t));
  air.forEach(e=>drawUnit(e,b.t));
  for(const f of b.fx)drawFx(f);
  drawDragPreview();
  drawLaserAim(b);

  g.textAlign='center';g.fillStyle='#fff';g.shadowColor='#00e5ff';g.shadowBlur=14;g.font='bold 34px sans-serif';
  if(b.t>ELIXIR.boostAfter&&b.t<ELIXIR.boostAfter+3){g.fillText('⚡ 聖水加倍!',600,90)}
  if(b.endless&&b.t>5&&b.t%60<2.5){g.fillText('⚠ 敵人變強了 Lv.'+(Math.floor(b.t/60)+1),600,90)}
  g.shadowBlur=0;
  if(b.paused){
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(0,0,FIELD.W,FIELD.H);
    g.fillStyle='#fff';g.font='bold 56px sans-serif';g.fillText('⏸ 暫停',600,320);
  }
  if(b.over){
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,FIELD.W,FIELD.H);
  }
}
