(() => {
"use strict";

const $=id=>document.getElementById(id);
const board=$("board");

const COMPONENTS=[
 ["IC Power","🔲","MÓVIL","IC-01"],["USB-C","🔌","MÓVIL","USB-02"],["Batería","🔋","MÓVIL","BAT-03"],
 ["Pantalla","📱","MÓVIL","LCD-04"],["Cámara","📷","MÓVIL","CAM-05"],["Altavoz","🔊","MÓVIL","SPK-06"],
 ["Joy-Con","🎮","CONSOLA","JOY-07"],["HDMI","🖥️","CONSOLA","HDM-08"],["Ventilador","🌀","CONSOLA","FAN-09"],
 ["Lector","💿","CONSOLA","DRV-10"],["Joystick","🕹️","CONSOLA","JOY-11"],["Fuente","⚡","CONSOLA","PWR-12"],
 ["RAM","🧠","PC","RAM-13"],["SSD","💾","PC","SSD-14"],["CPU","🔳","PC","CPU-15"],
 ["GPU","🎞️","PC","GPU-16"],["Ventilador CPU","🌀","PC","FAN-17"],["Fuente ATX","⚡","PC","ATX-18"]
];

const state={difficulty:"easy",
 level:1,tiles:[],selected:null,busy:false,score:0,pairs:0,moves:0,streak:0,
 mixes:3,seconds:0,timer:null,gameOver:false,musicOn:true,muted:false,volume:1.25,
 audio:null,masterGain:null,compressor:null,musicTimer:null,trackIndex:0,trackStep:0
};




/* ---------- THEMATIC BACKGROUNDS ---------- */
const THEMATIC_BACKGROUNDS=[
 "workshop-01.jpg","mobile-01.jpg","pc-01.jpg","console-01.jpg",
 "electronics-01.jpg","advanced-01.jpg","gamer-01.jpg",
 "creative-01.jpg","future-01.jpg"
];
let lastBackground="";
function applyThematicBackground(){
 const level=Math.max(1,Number(state.level)||1);
 const difficulty=state.difficulty||"easy";
 const pools={
   easy:["workshop-01.jpg","mobile-01.jpg","creative-01.jpg"],
   normal:["pc-01.jpg","electronics-01.jpg","gamer-01.jpg","workshop-01.jpg"],
   hard:["console-01.jpg","advanced-01.jpg","future-01.jpg","electronics-01.jpg"]
 };
 const pool=pools[difficulty]||[
   "workshop-01.jpg","mobile-01.jpg","pc-01.jpg","console-01.jpg",
   "electronics-01.jpg","advanced-01.jpg","gamer-01.jpg",
   "creative-01.jpg","future-01.jpg"
 ];
 let choices=pool.filter(x=>x!==lastBackground);
 if(!choices.length)choices=pool;
 const chosen=choices[Math.floor(Math.random()*choices.length)];
 lastBackground=chosen;

 const url=new URL(`assets/backgrounds/${chosen}`, window.location.href).href;
 const img=new Image();
 img.onload=()=>{
   document.documentElement.style.setProperty("--repair-bg-image",`url("${url}")`);
   document.body.style.setProperty("--repair-bg-image",`url("${url}")`);
   document.body.classList.remove("background-changing");
   void document.body.offsetWidth;
   document.body.classList.add("background-changing");
 };
 img.onerror=()=>{
   console.warn("No se pudo cargar el fondo temático:",url);
   document.body.style.setProperty("--repair-bg-image","none");
 };
 img.src=url;
}

/* ---------- AMBIENT BACKGROUND ---------- */
function initAmbientBackground(){
 const canvas=document.getElementById("ambientBg");
 if(!canvas)return;
 const ctx=canvas.getContext("2d");
 let w=0,h=0,dpr=1,raf=0;
 const particles=Array.from({length:42},(_,i)=>({
   x:Math.random(),y:Math.random(),r:.5+Math.random()*2,
   speed:.00004+Math.random()*.00009,
   drift:(Math.random()-.5)*.00012,
   phase:Math.random()*Math.PI*2
 }));
 function resize(){
   dpr=Math.min(window.devicePixelRatio||1,2);
   w=innerWidth;h=innerHeight;
   canvas.width=w*dpr;canvas.height=h*dpr;
   canvas.style.width=w+"px";canvas.style.height=h+"px";
   ctx.setTransform(dpr,0,0,dpr,0,0);
 }
 function frame(t){
   const difficulty=state.difficulty||"easy";
   const hue=difficulty==="hard"?350:difficulty==="normal"?190:180;
   ctx.clearRect(0,0,w,h);

   // Slow moving technical glow.
   const gx=w*(.5+Math.sin(t*.00012)*.22);
   const gy=h*(.42+Math.cos(t*.00009)*.16);
   const g=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.max(w,h)*.55);
   g.addColorStop(0,`hsla(${hue},70%,55%,.075)`);
   g.addColorStop(.45,`hsla(${hue},60%,40%,.025)`);
   g.addColorStop(1,"transparent");
   ctx.fillStyle=g;ctx.fillRect(0,0,w,h);

   // Tiny drifting repair-energy particles.
   particles.forEach(p=>{
     p.y-=p.speed*(1+t*.0000005);
     p.x+=Math.sin(t*.00025+p.phase)*p.drift;
     if(p.y<-.03){p.y=1.03;p.x=Math.random()}
     const x=p.x*w,y=p.y*h;
     ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);
     ctx.fillStyle=`hsla(${hue},75%,72%,${.12+p.r*.08})`;ctx.fill();
   });

   // Very subtle horizontal CRT/technical scan.
   const scan=(t*.035)%h;
   const grad=ctx.createLinearGradient(0,scan-35,0,scan+35);
   grad.addColorStop(0,"rgba(90,210,240,0)");
   grad.addColorStop(.5,"rgba(90,210,240,.035)");
   grad.addColorStop(1,"rgba(90,210,240,0)");
   ctx.fillStyle=grad;ctx.fillRect(0,scan-35,w,70);

   raf=requestAnimationFrame(frame);
 }
 addEventListener("resize",resize);
 resize();raf=requestAnimationFrame(frame);
}

let lastMoveAlertShown=false;
let lastMoveAlertTimer=null;

function playLastMoveAlert(){
  try{
    if(typeof sfx==="function"){ sfx("lastMove"); return; }
  }catch(_){}
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C)return;
    const ac=window.__repairMahjongAudio||(window.__repairMahjongAudio=new C());
    if(ac.state==="suspended")ac.resume();
    const now=ac.currentTime;
    [880,1174].forEach((freq,n)=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.type="sine";o.frequency.value=freq;
      g.gain.setValueAtTime(.0001,now+n*.09);
      g.gain.exponentialRampToValueAtTime(.16,now+n*.09+.025);
      g.gain.exponentialRampToValueAtTime(.0001,now+n*.09+.32);
      o.connect(g).connect(ac.destination);o.start(now+n*.09);o.stop(now+n*.09+.34);
    });
  }catch(_){}
}

function showLastMoveAlert(){
  const el=document.getElementById("lastMovePopup");
  if(!el||lastMoveAlertShown)return;
  lastMoveAlertShown=true;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  playLastMoveAlert();
  clearTimeout(lastMoveAlertTimer);
  lastMoveAlertTimer=setTimeout(()=>el.classList.remove("show"),3000);
}

function tileFrom(comp,id,x,y,z){
 return {id,name:comp[0],icon:comp[1],cat:comp[2],code:comp[3],x,y,z};
}

// A fixed Mahjong-like layout. Each position is represented explicitly.
// Pair generation guarantees a valid removal order, so the initial board
// can never be unsolvable because of random assignment.
function layout(){
 const level=state.difficulty||"easy";
 const out=[];
 const add=(x,y,z=0)=>out.push({x,y,z});

 if(level==="easy"){
   // Easy still teaches the real Mahjong rule: there are layers,
   // but only one small raised center so the player can learn it.
   for(let y=0;y<6;y++) for(let x=0;x<8;x++) add(x,y,0);
   for(let y=2;y<4;y++) for(let x=2;x<6;x++) add(x+.22,y+.22,1);
   add(3.22,2.22,2); add(4.22,2.22,2);
 }else if(level==="normal"){
   const cells=new Map();
   const put=(x,y,z)=>{const k=`${x},${y},${z}`;if(!cells.has(k)){cells.set(k,1);add(x,y,z)}};
   for(let y=0;y<6;y++) for(let x=0;x<8;x++) put(x,y,0);
   for(let y=1;y<5;y++) for(let x=1;x<7;x++) if((x+y)%2===0) put(x+.22,y+.22,1);
   for(let x=2;x<6;x++) put(x+.22,2.22,1),put(x+.22,3.22,1);
   put(3.44,2.44,2);put(4.44,2.44,2);put(3.44,3.44,2);put(4.44,3.44,2);
 }else{
   const cells=new Map();
   const put=(x,y,z)=>{const k=`${x},${y},${z}`;if(!cells.has(k)){cells.set(k,1);add(x,y,z)}};
   for(let y=0;y<6;y++) for(let x=0;x<8;x++) put(x,y,0);
   for(let y=1;y<5;y++) for(let x=1;x<7;x++) put(x+.22,y+.22,1);
   for(let y=2;y<4;y++) for(let x=2;x<6;x++) put(x+.44,y+.44,2);
   put(3.66,2.66,3);put(4.66,2.66,3);put(3.66,3.66,3);put(4.66,3.66,3);
 }
 return out;
}
function shuffled(a){
 for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 return a;
}

function overlap(a,b){
 return Math.abs(a.x-b.x)<1 && Math.abs(a.y-b.y)<1;
}

function free(i,arr=state.tiles){
 const t=arr[i]; if(!t)return false;
 // Any tile above that overlaps this tile blocks it.
 for(let j=0;j<arr.length;j++){
   const o=arr[j];
   if(o && o.z>t.z && overlap(t,o)) return false;
 }
 // Mahjong-style side blocking: if same layer has both left and right
 // occupied, the tile is blocked; one open side is enough.
 let left=false,right=false;
 for(let j=0;j<arr.length;j++){
   const o=arr[j]; if(!o||j===i||o.z!==t.z)continue;
   if(Math.abs(o.y-t.y)<1 && Math.abs(o.x-t.x)<1.05){
     if(o.x<t.x)left=true; else if(o.x>t.x)right=true;
   }
 }
 return !(left&&right);
}

function legalPairs(){
 const map=new Map(), result=[];
 for(let i=0;i<state.tiles.length;i++){
   if(!state.tiles[i]||!free(i))continue;
   const n=state.tiles[i].name;
   if(map.has(n)) result.push([map.get(n),i]);
   else map.set(n,i);
 }
 return result;
}

function availableMoves(){return legalPairs().length}

function generateBoard(){
 const base=layout();
 const pos=base.map(p=>({...p}));

 // Randomize the board geometry using symmetry transformations. This keeps
 // the same difficulty/topology while making every new level feel different.
 const maxX=Math.max(...pos.map(p=>p.x));
 const maxY=Math.max(...pos.map(p=>p.y));
 const mode=Math.floor(Math.random()*8);
 pos.forEach(p=>{
   const x=p.x,y=p.y;
   if(mode===1){p.x=maxX-x}
   else if(mode===2){p.y=maxY-y}
   else if(mode===3){p.x=maxX-x;p.y=maxY-y}
   else if(mode===4){p.x=maxX-x;p.y=y}
   else if(mode===5){p.x=x;p.y=maxY-y}
   else if(mode===6){const tx=p.x;p.x=maxX-p.y;p.y=tx}
   else if(mode===7){const tx=p.x;p.x=p.y;p.y=maxY-tx}
 });

 const result=new Array(pos.length);

 // Pair positions are kept within the same physical layer so the existing
 // blocking topology remains valid. The PAIR ORDER itself is randomized,
 // which changes the components visible at each location every new game.
 const groups=new Map();
 pos.forEach((p,i)=>{
   const k=p.z;
   if(!groups.has(k))groups.set(k,[]);
   groups.get(k).push(i);
 });

 const pairSlots=[];
 for(const [,indices] of [...groups.entries()].sort((a,b)=>Number(a[0])-Number(b[0]))){
   const shuffledIndices=shuffled(indices.slice());
   for(let n=0;n<shuffledIndices.length;n+=2){
     if(shuffledIndices[n+1]!==undefined)
       pairSlots.push([shuffledIndices[n],shuffledIndices[n+1]]);
   }
 }

 const componentPool=[];
 const pairCount=pairSlots.length;
 for(let i=0;i<pairCount;i++){
   componentPool.push(COMPONENTS[i%COMPONENTS.length]);
 }
 const randomizedComponents=shuffled(componentPool.slice());

 pairSlots.forEach(([i1,i2],pairNo)=>{
   const c=randomizedComponents[pairNo];
   const p1=pos[i1],p2=pos[i2];
   const first=Math.random()<.5;
   result[i1]=tileFrom(c,pairNo*2+(first?0:1),p1.x,p1.y,p1.z);
   result[i2]=tileFrom(c,pairNo*2+(first?1:0),p2.x,p2.y,p2.z);
 });

 return result;
}

function fmt(sec){
 const m=String(Math.floor(sec/60)).padStart(2,"0"),s=String(sec%60).padStart(2,"0");return `${m}:${s}`;
}

const TRACKS=[{name:"Neon Circuit",tempo:118,pattern:[110,165,220,165,110,196,247,196]},{name:"Pixel Highway",tempo:126,pattern:[98,147,196,147,123,185,247,185]},{name:"Arcade Workshop",tempo:108,pattern:[82,123,164,123,92,138,184,138]}];
function initAudio(){
 if(state.audio)return;
 const C=window.AudioContext||window.webkitAudioContext;
 if(!C)return;
 state.audio=new C();

 state.masterGain=state.audio.createGain();
 state.compressor=state.audio.createDynamicsCompressor();

 // Strong master amplification, followed by compression to avoid clipping.
 state.masterGain.gain.value=2.8;
 state.compressor.threshold.value=-18;
 state.compressor.knee.value=12;
 state.compressor.ratio.value=6;
 state.compressor.attack.value=.003;
 state.compressor.release.value=.16;

 state.masterGain.connect(state.compressor);
 state.compressor.connect(state.audio.destination);
}
function tone(freq,dur,type="sine",gain=.08,when=0){
 if(state.muted||!state.audio)return;
 const a=state.audio,t=a.currentTime+when;
 const o=a.createOscillator(),g=a.createGain();
 o.type=type;
 o.frequency.setValueAtTime(freq,t);

 // Wider usable gain range. The master compressor handles peaks.
 const level=Math.min(.85,gain*state.volume);
 g.gain.setValueAtTime(level,t);
 g.gain.exponentialRampToValueAtTime(.001,t+dur);

 o.connect(g).connect(state.masterGain||a.destination);
 o.start(t);
 o.stop(t+dur+.02);
}
function sfx(k){initAudio();if(!state.audio||state.muted)return;const p={select:[[620,.06,"sine",.07]],bad:[[180,.11,"square",.07],[130,.12,"square",.06]],pair:[[660,.07,"triangle",.08],[880,.09,"triangle",.09],[1320,.16,"sine",.07]],reward:[[660,.07,"square",.07],[880,.07,"square",.08],[1100,.09,"triangle",.09],[1540,.18,"sine",.07]],mix:[[360,.06,"sine",.06],[520,.07,"triangle",.07],[740,.09,"triangle",.08]],lastMove:[[880,.07,"sine",.09],[1174,.10,"triangle",.10],[1568,.16,"sine",.07]],win:[[660,.08,"triangle",.08],[880,.08,"triangle",.09],[1100,.1,"triangle",.1],[1320,.22,"sine",.08]],fail:[[260,.1,"sawtooth",.07],[180,.2,"triangle",.06]]}[k]||[];p.forEach((x,i)=>tone(x[0],x[1],x[2],x[3],i*.07))}
function musicTick(){if(state.muted||!state.musicOn)return;initAudio();if(!state.audio)return;const t=TRACKS[state.trackIndex],n=t.pattern[state.trackStep++%t.pattern.length];tone(n,.12,"square",.025);tone(n*2,.08,"triangle",.012,.06)}
function startMusic(){clearInterval(state.musicTimer);if(state.musicOn){const t=TRACKS[state.trackIndex];state.musicTimer=setInterval(musicTick,Math.round(60000/t.tempo/2))}}
function changeTrack(d){state.trackIndex=(state.trackIndex+d+TRACKS.length)%TRACKS.length;state.trackStep=0;if($("trackName"))$("trackName").textContent=TRACKS[state.trackIndex].name;startMusic()}
function updateResources(){
 $("streakTop").textContent=`${state.streak}/5`;
 $("streakSide").textContent=`${state.streak}/5`;
 $("mixTop").textContent=`${state.mixes}/3`;
 $("mixSide").textContent=`${state.mixes}/3`;
 $("mixButtonCount").textContent=`${state.mixes}/3`;
 $("mixBtn").disabled=state.mixes<=0||state.busy||state.gameOver;
}

function updateMoveStatus(){
 const n=availableMoves(),el=$("moveStatus");
 if(n===0){
   el.textContent="⚠️ SIN MOVIMIENTOS";
   el.className="move-center zero-moves no-moves";
 }else if(n===1){
   el.textContent="⚠️ ÚLTIMO MOVIMIENTO";
   el.className="move-center last-move";
 }else{
   el.textContent=`Movimientos disponibles: ${n}`;
   el.className="move-center";
 }
 return n;
}

function render(){
 board.innerHTML="";
 if(!state.tiles.length){board.innerHTML="<div style=\"color:#8fa6b0;text-align:center;padding-top:300px;font-weight:800\">Cargando tablero…</div>";return;}
 const scale=86,ox=90;
 state.tiles.forEach((t,i)=>{
   if(!t)return;
   const b=document.createElement("button");
   b.className="tile layered"+(free(i)?"":" blocked")+(state.selected===i?" selected":"");
   b.dataset.id=i;
   b.dataset.z=state.tiles[i].z;
   const tz=state.tiles[i].z||0;
   b.style.transform=`translate(${tz*2}px,${tz*2}px)`;

   b.disabled=state.busy||!free(i);
   b.style.left=(ox+t.x*scale+t.z*8)+"px";
   b.style.top=(38+t.y*scale+t.z*8)+"px";
   b.style.zIndex=20+t.z;
   b.innerHTML=`<span class="tag">${t.cat}</span><span class="icon">${t.icon}</span><span class="name">${t.name}</span><span class="sub">${t.code}</span>`;
   b.onclick=()=>pick(i);
   board.appendChild(b);
 });
 $("remaining").textContent=state.tiles.filter(Boolean).length;
 $("score").textContent=state.score;
 $("pairs").textContent=state.pairs;
 $("moves").textContent=state.moves;
 $("level").textContent=state.level;
 updateResources();
 updateMoveStatus();

 const _remainingMoves=availableMoves();
 if(_remainingMoves===1 && !lastMoveAlertShown) showLastMoveAlert();
 else if(_remainingMoves>1) lastMoveAlertShown=false;
}

function message(txt){$("message").textContent=txt}

function pick(i){
 if(state.gameOver||state.busy||!state.tiles[i]||!free(i))return;
 initAudio();
 if(state.selected===null){
   state.selected=i;sfx("select");message("Selecciona su pareja idéntica");render();return;
 }
 if(state.selected===i){state.selected=null;render();return}
 const a=state.selected,b=i;
 if(state.tiles[a].name!==state.tiles[b].name){
   state.streak=0;state.selected=null;sfx("bad");message("No coinciden · racha reiniciada");render();return;
 }
 state.busy=true;state.selected=null;state.moves++;
 state.pairs++;state.streak=Math.min(5,state.streak+1);
 state.score+=100+Math.max(0,state.streak-1)*25;
 sfx("pair");message(`¡Pareja reparada! · Racha ${state.streak}/5`);
 const nodes=[
   board.querySelector(`[data-id="${a}"]`),
   board.querySelector(`[data-id="${b}"]`)
 ].filter(Boolean);
 const ta=state.tiles[a],tb=state.tiles[b];

 // Calculate the visual midpoint and make each card travel exactly to it.
 const midX=90+((ta.x+tb.x)/2)*86+8;
 const midY=38+((ta.y+tb.y)/2)*86+8;
 const leftNode=nodes[0],rightNode=nodes[1];
 if(leftNode&&rightNode){
   const dx=midX-(90+ta.x*86+8);
   const dx2=midX-(90+tb.x*86+8);
   leftNode.classList.add("removing","pair-merge-left");
   rightNode.classList.add("removing","pair-merge-right");
   leftNode.style.setProperty("--merge-x",`${dx}px`);
   rightNode.style.setProperty("--merge-x",`${dx2}px`);
 }

 const fused=document.createElement("div");
 fused.className="pair-fused";
 fused.style.left=`${midX}px`;
 fused.style.top=`${midY}px`;
 fused.innerHTML=`<span class="fused-icon">${ta.icon}</span><span class="fused-name">${ta.name}</span>`;
 board.appendChild(fused);

 // Small repair sparks radiate from the fusion point.
 for(let s=0;s<10;s++){
   const spark=document.createElement("span");
   spark.className="pair-spark";
   const angle=(Math.PI*2*s/10)+(Math.random()-.5)*.35;
   const dist=24+Math.random()*38;
   spark.style.left=`${midX}px`; spark.style.top=`${midY}px`;
   spark.style.setProperty("--sx",`${Math.cos(angle)*dist}px`);
   spark.style.setProperty("--sy",`${Math.sin(angle)*dist}px`);
   board.appendChild(spark);
   setTimeout(()=>spark.remove(),650);
 }
 setTimeout(()=>fused.remove(),610);
 setTimeout(()=>{
   state.tiles[a]=null;state.tiles[b]=null;
   if(state.streak===5){
     if(state.mixes<3){
       state.mixes++;
       sfx("reward");
       message(`🔥 ¡5 parejas seguidas! +1 mezcla · ${state.mixes}/3`);
     }else message("🔥 ¡5 parejas! Mezclas al máximo (3/3)");
     state.streak=0;
   }
   state.busy=false;render();checkEnd();
 },450);
}

function mix(){
 if(state.gameOver||state.busy)return;
 if(state.mixes<=0){
   message("⚠️ No quedan mezclas. Consigue 5 parejas seguidas.");
   render();return;
 }

 const before=state.tiles.map(t=>t?{...t}:null);
 const active=before.filter(Boolean);
 const slots=before.map((t,i)=>t?i:null).filter(i=>i!==null);
 const freeSlots=slots.filter(i=>free(i,before));
 if(active.length<2||freeSlots.length<2){
   message("No hay suficientes fichas para mezclar."); return;
 }

 // IMPORTANT: Mix must create a DIFFERENT playable pair, not merely shuffle
 // cards while leaving the same available pair(s).
 const oldPairs=legalPairs();
 const oldNames=new Set(oldPairs.map(p=>before[p[0]].name));

 const identities=active.map(t=>({
   id:t.id,name:t.name,icon:t.icon,cat:t.cat,code:t.code
 }));

 const build=(arr)=>{
   const test=new Array(before.length).fill(null);
   slots.forEach((slot,n)=>{
     const src=arr[n],p=before[slot];
     test[slot]={...src,x:p.x,y:p.y,z:p.z};
   });
   return test;
 };

 const legalPairsFor=(arr)=>{
   const map=new Map(),result=[];
   for(let i=0;i<arr.length;i++){
     if(!arr[i]||!free(i,arr))continue;
     const name=arr[i].name;
     if(map.has(name))result.push([map.get(name),i]);
     else map.set(name,i);
   }
   return result;
 };

 const score=(test)=>{
   const pairs=legalPairsFor(test);
   let fresh=0;
   for(const [i,j] of pairs){
     const name=test[i].name;
     // Fresh means this component wasn't a playable pair before.
     if(!oldNames.has(name)) fresh++;
   }
   return fresh*10000+pairs.length*100+Math.random();
 };

 let candidate=null,best=-1;

 // Try many distributions and keep the one that exposes the most NEW pairs.
 for(let attempt=0;attempt<7000;attempt++){
   const test=build(shuffled(identities.map(t=>({...t}))));
   const s=score(test);
   if(s>best){
     const pairs=legalPairsFor(test);
     if(pairs.some(([i,j])=>!oldNames.has(test[i].name))){
       best=s;candidate=test;
       if(s>=10100)break;
     }
   }
 }

 // Guaranteed fallback: deliberately place an identical pair on two currently
 // free positions. This is the key difference from the previous implementation.
 if(!candidate){
   const groups=new Map();
   identities.forEach(t=>{
     if(!groups.has(t.name))groups.set(t.name,[]);
     groups.get(t.name).push(t);
   });

   const pairOptions=[...groups.entries()]
     .filter(([,g])=>g.length>=2)
     .sort((a,b)=>Number(oldNames.has(a[0]))-Number(oldNames.has(b[0])));

   for(const [name,pair] of pairOptions){
     if(oldNames.has(name))continue;

     const s1=freeSlots[0],s2=freeSlots[1];
     const test=new Array(before.length).fill(null);
     test[s1]={...pair[0],x:before[s1].x,y:before[s1].y,z:before[s1].z};
     test[s2]={...pair[1],x:before[s2].x,y:before[s2].y,z:before[s2].z};

     const used=new Set([pair[0].id,pair[1].id]);
     const rest=shuffled(identities.filter(t=>!used.has(t.id)).map(t=>({...t})));
     const restSlots=slots.filter(i=>i!==s1&&i!==s2);
     restSlots.forEach((slot,n)=>{
       const p=before[slot],src=rest[n];
       test[slot]={...src,x:p.x,y:p.y,z:p.z};
     });

     if(legalPairsFor(test).some(([i,j])=>test[i].name===name)){
       candidate=test;break;
     }
   }
 }

 if(!candidate){
   message("No se ha podido crear una nueva pareja.");
   return;
 }

 state.busy=true;
 state.selected=null;
 board.classList.add("mixing-board");
 sfx("mix");
 message("🔀 Mezclando fichas para buscar nuevas parejas…");

 setTimeout(()=>{
   state.tiles=candidate;
   state.mixes--;
   state.streak=0;
   state.busy=false;
   render();
   board.classList.remove("mixing-board");
   message(`🔀 ¡Mezcla completada! ${availableMoves()} parejas disponibles · quedan ${state.mixes}/3`);
   checkEnd();
 },420);
}

function checkEnd(){
 if(state.tiles.every(t=>!t)){
   state.gameOver=true;clearInterval(state.timer);clearInterval(state.musicTimer);sfx("win");
   setTimeout(showVictory,120);return;
 }
 const n=updateMoveStatus();
 if(n===0 && state.moves>0){
   clearInterval(state.timer);sfx("fail");
   $("finalMoves").textContent=state.moves;$("finalPairs").textContent=state.pairs;$("finalScore").textContent=state.score;
   $("noMovesModal").classList.remove("hidden");message("⚠️ Sin movimientos");
 }
}

function recordsKey(){return `repairMahjongTimesL${state.level}`}
function getRecords(){try{return JSON.parse(localStorage.getItem(recordsKey())||"[]")}catch{return[]}}
function saveRecord(){
 const r=getRecords();r.push(state.seconds);r.sort((a,b)=>a-b);const top=r.slice(0,5);localStorage.setItem(recordsKey(),JSON.stringify(top));return top
}
function showVictory(){
 const r=saveRecord(),rank=r.indexOf(state.seconds)+1;
 $("modalIcon").textContent="🏆";$("modalTitle").textContent="¡TABLERO DESPEJADO!";
 $("modalText").textContent=`Has completado el nivel ${state.level}. ¡Buen trabajo!`;
 $("resultTime").textContent=fmt(state.seconds);$("resultScore").textContent=state.score;$("resultRank").textContent="#"+rank;
 $("recordsList").innerHTML=r.map((v,i)=>`<div class="record ${i===rank-1?"best":""}"><span>${i+1}. ${i===0?"🥇":i===1?"🥈":i===2?"🥉":"🏅"}</span><b>${fmt(v)}</b></div>`).join("");
 $("nextText").textContent=`Nivel ${state.level+1}: tablero algo más exigente y nuevos componentes.`;
 $("modal").classList.remove("hidden");
}

function newGame(){
 applyThematicBackground();
 lastMoveAlertShown=false; clearTimeout(lastMoveAlertTimer);
 clearInterval(state.timer);clearInterval(state.musicTimer);
 state.tiles=generateBoard();state.selected=null;state.busy=false;state.score=0;state.pairs=0;state.moves=0;
 state.streak=0;state.mixes=3;state.seconds=0;state.gameOver=false;
 $("timer").textContent="00:00";$("modal").classList.add("hidden");$("noMovesModal").classList.add("hidden");
 state.timer=setInterval(()=>{state.seconds++;$("timer").textContent=fmt(state.seconds)},1000);
 render();message("Selecciona una ficha libre");startMusic();
}

if($("retryBtn"))$("retryBtn").onclick=()=>newGame();
if($("newFromFailBtn"))$("newFromFailBtn").onclick=()=>{state.level=1;newGame()};
if($("prevTrack"))$("prevTrack").onclick=()=>changeTrack(-1);
if($("nextTrack"))$("nextTrack").onclick=()=>changeTrack(1);
document.querySelectorAll(".difficulty-btn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".difficulty-btn").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    state.difficulty=btn.dataset.difficulty;
    newGame();
  };
});
$("mixBtn").onclick=mix;
$("newBtn").onclick=()=>{state.level=1;newGame()};
$("nextBtn").onclick=()=>{state.level++;newGame()};
$("volume").oninput=e=>{
 state.volume=Number(e.target.value);
 if(state.masterGain)state.masterGain.gain.setTargetAtTime(
   state.volume<=0?0:2.8,
   state.audio.currentTime,
   .015
 );
};
$("muteBtn").onclick=()=>{state.muted=!state.muted;$("muteBtn").textContent=state.muted?"🔇 Silenciado":"🔊 Sonido";if(!state.muted)initAudio()};
$("musicBtn").onclick=()=>{state.musicOn=!state.musicOn;$("musicBtn").textContent=state.musicOn?"🎵 Música":"🎵 Música OFF";if(state.musicOn)startMusic();else clearInterval(state.musicTimer)};
$("volume").value=state.volume;

initAmbientBackground();
newGame();
})();