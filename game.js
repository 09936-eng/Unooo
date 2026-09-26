const COLORS = ["red","yellow","green","blue"];
const COLOR_NAMES = {red:"แดง",yellow:"เหลือง",green:"เขียว",blue:"น้ำเงิน"};
const ACTIONS = ["skip","reverse","draw2"];

let state = {
  playerName:"Dream", players:[], deck:[], discard:[], turn:0, direction:1,
  currentColor:"red", score:0, pendingDraw:0, unoCalled:false, busy:false,
  sound:true, round:1
};

const $ = s => document.querySelector(s);
const screens = ["menuScreen","setupScreen","howScreen","gameScreen"];
function showScreen(id){ screens.forEach(x=>$("#"+x).classList.toggle("active",x===id)); }

function makeDeck(){
  const deck=[];
  for(const color of COLORS){
    deck.push({color,value:"0"});
    for(let n=1;n<=9;n++){ deck.push({color,value:String(n)}); deck.push({color,value:String(n)}); }
    for(const a of ACTIONS){ deck.push({color,value:a}); deck.push({color,value:a}); }
  }
  for(let i=0;i<4;i++){ deck.push({color:"wild",value:"wild"}); deck.push({color:"wild",value:"wild4"}); }
  return shuffle(deck);
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

function cardLabel(c){
  return {skip:"⊘",reverse:"↻",draw2:"+2",wild:"W",wild4:"W+4"}[c.value] ?? c.value;
}
function cardPlayable(c){
  if(state.pendingDraw>0) return c.value==="draw2" || c.value==="wild4";
  return c.color==="wild" || c.color===state.currentColor || c.value===topCard().value;
}
function topCard(){ return state.discard[state.discard.length-1]; }

function deal(){
  state.deck=makeDeck(); state.discard=[]; state.turn=0; state.direction=1;
  state.pendingDraw=0; state.unoCalled=false; state.busy=false;
  state.players=[
    {name:state.playerName,avatar:"🧑",hand:[],human:true},
    {name:"Mina",avatar:"👩",hand:[],human:false},
    {name:"Kai",avatar:"🧑‍💻",hand:[],human:false},
    {name:"Jay",avatar:"🧑‍🎨",hand:[],human:false}
  ];
  for(let r=0;r<7;r++) for(const p of state.players) p.hand.push(state.deck.pop());
  let first=state.deck.pop();
  while(first.color==="wild"){ state.deck.unshift(first); first=state.deck.pop(); }
  state.discard.push(first); state.currentColor=first.color;
  if(first.value==="draw2") state.pendingDraw=2;
  if(first.value==="skip") advanceTurn();
  render();
  setMessage("ตาของคุณ — เลือกการ์ดที่ลงได้");
}

function advanceTurn(){ state.turn=(state.turn+state.direction+state.players.length)%state.players.length; }
function nextTurn(){ advanceTurn(); render(); if(!state.players[state.turn].human) setTimeout(botTurn,650); else {state.busy=false;setMessage("ตาของคุณ — เลือกการ์ดที่ลงได้");} }

function playCard(playerIndex, cardIndex, chosenColor=null){
  const p=state.players[playerIndex], c=p.hand[cardIndex];
  if(!c || !cardPlayable(c) || state.busy) return false;
  p.hand.splice(cardIndex,1); state.discard.push(c);
  if(c.color!=="wild") state.currentColor=c.color;
  if(c.value==="draw2") state.pendingDraw+=2;
  else if(c.value==="wild4") state.pendingDraw+=4;
  if(c.value==="reverse") state.direction*=-1;
  if(c.value==="skip") advanceTurn();
  if(chosenColor) state.currentColor=chosenColor;
  if(p.hand.length===0){ endRound(playerIndex); return true; }
  if(p.hand.length===1 && !p.human){ /* bots auto-UNO */ }
  if(playerIndex===state.turn) nextTurn();
  else render();
  return true;
}

function drawFor(playerIndex){
  if(state.busy) return;
  const p=state.players[playerIndex];
  let amount=state.pendingDraw>0?state.pendingDraw:1;
  for(let i=0;i<amount;i++) p.hand.push(drawOne());
  state.pendingDraw=0;
  render();
  if(playerIndex===state.turn) nextTurn();
}
function drawOne(){
  if(state.deck.length===0){
    const keep=state.discard.pop();
    state.deck=shuffle(state.discard);
    state.discard=[keep];
  }
  return state.deck.pop();
}

function botTurn(){
  if(state.players[state.turn].human || state.busy) return;
  state.busy=true; render();
  const p=state.players[state.turn];
  setMessage(`${p.name} กำลังคิด...`);
  setTimeout(()=>{
    let playable=p.hand.map((c,i)=>({c,i})).filter(x=>cardPlayable(x.c));
    if(playable.length){
      // Prefer action cards, then cards matching current color.
      playable.sort((a,b)=>{
        const wa = ["wild4","draw2","skip","reverse"].includes(a.c.value)?2:0;
        const wb = ["wild4","draw2","skip","reverse"].includes(b.c.value)?2:0;
        return wb-wa;
      });
      const pick=playable[0];
      const chosen=pick.c.color==="wild"?COLORS[Math.floor(Math.random()*COLORS.length)]:null;
      playCard(state.turn,pick.i,chosen);
    }else drawFor(state.turn);
  },700);
}

function endRound(winnerIndex){
  const winner=state.players[winnerIndex];
  const points=state.players.reduce((sum,p)=>sum+p.hand.reduce((s,c)=>s+cardPoints(c),0),0);
  if(winner.human) state.score+=points+100;
  state.busy=true; render();
  $("#resultIcon").textContent=winner.human?"🏆":"🤖";
  $("#resultTitle").textContent=winner.human?"คุณชนะ!":"รอบนี้ "+winner.name+" ชนะ";
  $("#resultText").textContent=winner.human?`เก็บคะแนนเพิ่ม ${points+100} คะแนน`:`ลองอีกครั้งเพื่อเอาคืน ${winner.name}!`;
  $("#resultScore").textContent=state.score;
  setTimeout(()=>$("#resultModal").classList.remove("hidden"),400);
}
function cardPoints(c){
  if(["wild","wild4"].includes(c.value)) return 50;
  if(["draw2","reverse","skip"].includes(c.value)) return 20;
  return Number(c.value);
}

function render(){
  $("#playerLabel").textContent=state.playerName;
  $("#scoreLabel").textContent="🏆 "+state.score;
  $("#handCount").textContent=state.players[0]?.hand.length+" ใบ";
  $("#turnLabel").textContent=state.players[state.turn]?.human?"ตาของคุณ":`ตาของ ${state.players[state.turn]?.name||""}`;
  $("#directionBadge").textContent=state.direction===1?"↻":"↶";
  renderOpponents(); renderDiscard(); renderHand();
}
function renderOpponents(){
  const wrap=$("#opponents"); wrap.innerHTML="";
  state.players.slice(1).forEach(p=>{
    const d=document.createElement("div"); d.className="opponent";
    d.innerHTML=`<div class="avatar">${p.avatar}</div><div><div class="op-name">${p.name}</div><div class="op-count">${p.hand.length} ใบ</div></div>`;
    wrap.appendChild(d);
  });
}
function renderDiscard(){
  const slot=$("#discardPile"); slot.innerHTML="";
  if(!state.discard.length)return;
  slot.appendChild(cardElement(topCard(),false));
  $("#currentColorText").textContent=COLOR_NAMES[state.currentColor];
  $("#currentColorDot").className=""; $("#currentColorDot").classList.add(state.currentColor);
  $("#message").style.opacity=1;
}
function renderHand(){
  const wrap=$("#playerHand"); wrap.innerHTML="";
  const hand=state.players[0]?.hand||[];
  hand.forEach((c,i)=>{
    const el=cardElement(c,true);
    if(!cardPlayable(c) || state.turn!==0 || state.busy) el.classList.add("disabled");
    el.addEventListener("click",()=>handlePlayerCard(i));
    wrap.appendChild(el);
  });
}
function cardElement(c,interactive){
  const el=document.createElement("div");
  el.className=`card ${c.color==="wild"?"wild":c.color}`;
  const oval=document.createElement("div"); oval.className="oval"; oval.textContent=cardLabel(c); el.appendChild(oval);
  const a=document.createElement("small"); a.textContent=cardLabel(c); el.appendChild(a);
  const b=document.createElement("small"); b.textContent=cardLabel(c); el.appendChild(b);
  return el;
}
function setMessage(t){ $("#message").textContent=t; }

function handlePlayerCard(i){
  if(state.turn!==0 || state.busy) return;
  const c=state.players[0].hand[i];
  if(!cardPlayable(c)){ setMessage("ลงใบนี้ไม่ได้ ลองเลือกสีหรือเลขให้ตรงกัน"); return; }
  if(c.color==="wild"){
    state.busy=true;
    $("#colorModal").classList.remove("hidden");
    $("#colorModal").dataset.index=i;
  }else playCard(0,i);
}
document.querySelectorAll(".choice").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const i=Number($("#colorModal").dataset.index);
    const color=btn.dataset.color;
    $("#colorModal").classList.add("hidden");
    state.busy=false;
    playCard(0,i,color);
  });
});

$("#playBtn").onclick=()=>showScreen("setupScreen");
$("#howBtn").onclick=()=>showScreen("howScreen");
$("#closeHowBtn").onclick=()=>showScreen("menuScreen");
$("#backMenuBtn").onclick=()=>showScreen("menuScreen");
$("#startBtn").onclick=()=>{
  state.playerName=($("#playerName").value.trim()||"Dream").slice(0,16);
  state.score=Number(localStorage.getItem("cc_score")||0);
  showScreen("gameScreen"); deal();
};
$("#drawBtn").onclick=()=>{
  if(state.turn!==0 || state.busy)return;
  drawFor(0);
};
$("#unoBtn").onclick=()=>{
  if(state.turn===0 && state.players[0].hand.length===1){
    state.unoCalled=true; setMessage("UNO! 🎉 ตอนนี้เหลือ 1 ใบ!");
    tone(700,.08);
  }else setMessage("กด UNO! เมื่อคุณเหลือการ์ด 1 ใบเท่านั้น");
};
$("#leaveBtn").onclick=()=>{
  state.busy=true; $("#resultModal").classList.add("hidden"); showScreen("menuScreen");
};
$("#againBtn").onclick=()=>{
  $("#resultModal").classList.add("hidden"); state.busy=false; showScreen("gameScreen"); deal();
};
$("#resultMenuBtn").onclick=()=>{
  $("#resultModal").classList.add("hidden"); state.busy=false; localStorage.setItem("cc_score",state.score); showScreen("menuScreen");
};
$("#soundBtn").onclick=()=>{
  state.sound=!state.sound; $("#soundBtn").textContent=state.sound?"🔊":"🔇";
};
function tone(freq,dur){
  if(!state.sound) return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.value=freq;o.type="sine";
    g.gain.setValueAtTime(.04,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur);
  }catch(e){}
}
window.addEventListener("beforeunload",()=>localStorage.setItem("cc_score",state.score));
