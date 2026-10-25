const $=id=>document.getElementById(id);
const SAVE_KEY='nf2_save';
function loadSave(){
  let s={};try{s=JSON.parse(localStorage.getItem(SAVE_KEY))||{}}catch(e){}
  return Object.assign({clear:0,deck:DEFAULT_DECK.slice(),best:0},s);
}
let save=loadSave();
function persist(){localStorage.setItem(SAVE_KEY,JSON.stringify(save))}
function resetSave(){if(confirm('確定清除所有進度?')){localStorage.removeItem(SAVE_KEY);save=loadSave();alert('已清除')}}

function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  $(id).classList.add('on');$('end').classList.remove('on');
  if(id=='stages')buildStages();
  if(id=='deck')buildDeck();
  if(id=='modes')$('bestTxt').textContent='最高分:'+save.best.toLocaleString();
}

/* ---- 關卡 ---- */
function buildStages(){
  const m=$('map');m.innerHTML='';
  STAGES.forEach((s,i)=>{
    const d=document.createElement('div');
    d.className='stage'+(i>save.clear?' lock':'');
    const stars='★'.repeat(Math.min(5,Math.ceil((i+1)*5/STAGES.length)))+'☆'.repeat(5-Math.min(5,Math.ceil((i+1)*5/STAGES.length)));
    d.innerHTML=`<div class="no">${i+1}</div><b>${s.n}</b><small>${s.d}</small><small>難度 <span class="star">${stars}</span> ${i<save.clear?'✅ 已通關':''}</small><div class="row"></div>`;
    const row=d.querySelector('.row');
    [...new Set(s.deck)].slice(0,6).forEach(id=>row.appendChild(makeIcon(ALL[id],34)));
    d.onclick=()=>launch({mode:'campaign',stageIndex:i});
    m.appendChild(d);
  });
}
function goEndless(){launch({mode:'endless',stageIndex:-1})}

function launch(cfg){
  if(save.deck.length!=8){alert('請先到「編輯牌組」選滿 8 張卡');show('deck');return}
  cfg.deck=save.deck.slice();
  if(typeof startBattle!=='function'){alert('還沒載入戰鬥引擎。\n請放入第 2 部分 engine.js 與第 3 部分 battle.js');return}
  show('game');
  startBattle(cfg);
}

/* ---- 牌組 ---- */
function buildDeck(){
  const slots=$('slots');slots.innerHTML='';
  for(let i=0;i<8;i++){
    const s=document.createElement('div');s.className='slot';
    const id=save.deck[i];
    if(id){s.appendChild(makeIcon(ALL[id],54));s.insertAdjacentHTML('beforeend',`<div class="cost">${ALL[id].cost}</div>`);
      s.onclick=()=>{save.deck.splice(i,1);persist();buildDeck()}}
    else s.textContent='+';
    slots.appendChild(s);
  }
  const avg=save.deck.length?(save.deck.reduce((a,id)=>a+ALL[id].cost,0)/save.deck.length).toFixed(1):'0';
  $('deckInfo').textContent=`已選 ${save.deck.length}/8 張｜平均聖水 ${avg}｜點下面的卡加入,點上面的卡移除`;
  const pool=$('pool');pool.innerHTML='';
  UNITS.forEach(u=>{
    const c=document.createElement('div');c.className='pc'+(save.deck.includes(u.id)?' sel':'');
    c.appendChild(makeIcon(u,64));
    c.insertAdjacentHTML('beforeend',`<div class="cost">${u.cost}</div><span class="nm">${u.n}</span>`);
    c.title=u.desc;
    c.onclick=()=>{
      const k=save.deck.indexOf(u.id);
      if(k>=0)save.deck.splice(k,1);
      else if(save.deck.length<8)save.deck.push(u.id);
      persist();buildDeck();
    };
    pool.appendChild(c);
  });
}

/* ---- 圖鑑 ---- */
function dexItem(u){
  const d=document.createElement('div');
  d.appendChild(makeIcon(u,56));
  const t=document.createElement('div');
  t.innerHTML=`<b>${u.n}</b> <span class="star">💧${u.cost}</span><br>HP ${u.hp}｜傷害 ${u.dmg}｜射程 ${u.rng}${u.fly?'｜空中':''}${u.splash?'｜範圍':''}${u.tgt?'｜只打塔':''}${u.cnt?'｜x'+u.cnt:''}<br>${u.desc||''}`;
  d.appendChild(t);return d;
}
UNITS.forEach(u=>$('dexU').appendChild(dexItem(u)));
ENEMY_ONLY.forEach(u=>$('dexE').appendChild(dexItem(u)));

/* ---- 戰鬥結束(由 engine.js 呼叫) ---- */
function onBattleEnd(r){
  // r = {win, mode, stageIndex, score, time, kills, crowns}
  if(r.mode=='campaign'&&r.win&&r.stageIndex>=save.clear){save.clear=r.stageIndex+1}
  let newBest=false;
  if(r.mode=='endless'&&r.score>save.best){save.best=r.score;newBest=true}
  persist();
  if(r.mode=='endless'){
    $('endT').textContent='♾ 無盡結束';$('endT').style.color='#ffd54a';
    $('endP').innerHTML=`得分:<b>${Math.floor(r.score).toLocaleString()}</b>${newBest?' 🎉 新紀錄!':''}<br>存活 ${Math.floor(r.time)} 秒｜擊殺 ${r.kills}`;
  }else{
    $('endT').textContent=r.win?'🏆 勝利':'💥 失敗';
    $('endT').style.color=r.win?'#7cffb2':'#ff5c7a';
    $('endP').innerHTML=`摧毀塔數:${r.crowns}/3<br>${r.win?(r.stageIndex+1<STAGES.length?'下一關已解鎖!':'你已通關全部關卡!'):'再試一次吧'}`;
  }
  $('end').classList.add('on');
}
