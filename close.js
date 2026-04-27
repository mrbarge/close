// ══════════════════════════════════════════════════════════════════════════
// VISUAL ENGINE
// ══════════════════════════════════════════════════════════════════════════
const vc=document.getElementById('vc'),ctx=vc.getContext('2d');
let W=0,H=0;
let visCur=0,visLast=0,visFade=0,visSwitching=false;
let keyMinor=true; // used by visual scenes

function resizeVis(){
  W=vc.width=window.innerWidth;H=vc.height=window.innerHeight;
  visScenes.forEach(s=>s.resize());
}
window.addEventListener('resize',resizeVis);

// ── Noise ──────────────────────────────────────────────────────────────────
const lerp=(a,b,t)=>a+(b-a)*t;
const sm=t=>t*t*(3-2*t);
function h2(x,y){let n=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
function n2(x,y){const xi=x|0,yi=y|0,xf=x-xi,yf=y-yi;return lerp(lerp(h2(xi,yi),h2(xi+1,yi),sm(xf)),lerp(h2(xi,yi+1),h2(xi+1,yi+1),sm(xf)),sm(yf));}
function fbm(x,y,o=4){let v=0,a=.5,f=1,m=0;for(let i=0;i<o;i++){v+=n2(x*f,y*f)*a;m+=a;a*=.5;f*=2;}return v/m;}

// ── SCENE 1: STORM ─────────────────────────────────────────────────────────
const storm=(()=>{
  let rain=[],lightning=null,tGlows=[],sparks=[],T=0;
  const MINOR={sky0:[10,12,22],sky1:[18,24,38],cld:[38,44,62],rain:[155,180,215]};
  const MAJOR={sky0:[15,13,20],sky1:[28,26,38],cld:[50,46,57],rain:[192,184,210]};
  const pal=()=>keyMinor?MINOR:MAJOR;
  function initRain(){rain=[];for(let i=0;i<300;i++)rain.push({x:Math.random()*W,y:Math.random()*H,spd:340+Math.random()*220,len:10+Math.random()*24,op:.07+Math.random()*.18});}
  function drawClouds(){
    const p=pal(),c=p.cld;
    [[.05,.1,.44],[.32,.06,.42],[.62,.09,.4],[.84,.17,.36],[.18,.24,.38],[.5,.21,.46],[.8,.27,.33],[.02,.33,.3],[.38,.38,.42],[.72,.34,.36]].forEach(([cx0,cy0,rx],i)=>{
      const dx=n2(i*3.1+T*.018,i*1.7+50)*.13,dy=n2(i*2.3+T*.011,i*3.1+80)*.04;
      const x=(cx0+dx)*W,y=(cy0+dy)*H,op=.28+n2(i*4.2+T*.02,i*2.8+20)*.32;
      const g=ctx.createRadialGradient(x,y,0,x,y,rx*W);
      g.addColorStop(0,`rgba(${c},${op})`);g.addColorStop(1,`rgba(${c},0)`);
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    });
  }
  function drawLightning(){
    if(!lightning)return;
    ctx.fillStyle=`rgba(255,255,255,${lightning.fl})`;ctx.fillRect(0,0,W,H);lightning.fl=Math.max(0,lightning.fl-.06);
    ctx.lineWidth=12;ctx.lineCap='round';ctx.strokeStyle=`rgba(180,210,255,${lightning.op*.18})`;
    for(const [x1,y1,x2,y2] of lightning.s){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
    ctx.lineWidth=1.5;ctx.strokeStyle=`rgba(225,240,255,${lightning.op})`;
    for(const [x1,y1,x2,y2] of lightning.s){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
    lightning.op=Math.max(0,lightning.op-.04);if(lightning.op<=0)lightning=null;
  }
  function mkBolt(x1,y1,x2,y2,disp,dep,acc){
    if(dep<=0){acc.push([x1,y1,x2,y2]);return;}
    const mx=(x1+x2)/2+(Math.random()-.5)*disp,my=(y1+y2)/2+(Math.random()-.5)*disp*.12;
    mkBolt(x1,y1,mx,my,disp*.52,dep-1,acc);mkBolt(mx,my,x2,y2,disp*.52,dep-1,acc);
    if(dep>1&&Math.random()<.32)mkBolt(mx,my,mx+(Math.random()-.5)*disp*1.6,my+Math.random()*disp*.9,disp*.42,dep-2,acc);
  }
  return{
    resize:initRain,
    draw(dt){
      T+=dt;const p=pal();
      const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgb(${p.sky0})`);g.addColorStop(1,`rgb(${p.sky1})`);
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      drawClouds();
      // Thunder glows
      ctx.save();ctx.globalCompositeOperation='screen';
      for(let i=tGlows.length-1;i>=0;i--){
        const g=tGlows[i];g.op=Math.max(0,g.op-dt*g.decay);
        if(g.op<=0){tGlows.splice(i,1);continue;}
        const gr=ctx.createRadialGradient(g.x,g.y,0,g.x,g.y,g.r);
        gr.addColorStop(0,`rgba(210,218,195,${g.op*.55})`);gr.addColorStop(.4,`rgba(170,182,165,${g.op*.2})`);gr.addColorStop(1,`rgba(0,0,0,0)`);
        ctx.fillStyle=gr;ctx.fillRect(g.x-g.r,g.y-g.r,g.r*2,g.r*2);
      }
      ctx.restore();
      drawLightning();
      ctx.lineWidth=1;
      for(const r of rain){
        r.x+=r.spd*.27*dt;r.y+=r.spd*dt;
        if(r.y>H+r.len){r.y=-r.len;r.x=Math.random()*W;}if(r.x>W+60)r.x=-60;
        ctx.strokeStyle=`rgba(${p.rain},${r.op})`;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-r.len*.27,r.y-r.len);ctx.stroke();
      }
      for(let i=sparks.length-1;i>=0;i--){
        const s=sparks[i];s.y-=s.vy*dt;s.life-=dt;if(s.life<=0){sparks.splice(i,1);continue;}
        const op=s.life/s.ml;ctx.fillStyle=`rgba(215,232,255,${op*.72})`;
        const sz=s.sz*(0.4+0.6*op);ctx.fillRect(s.x-sz/2,s.y-sz/2,sz,sz);
      }
    },
    piano(){const sx=W*.2+Math.random()*W*.6,s=[];mkBolt(sx,0,sx+(Math.random()-.5)*W*.28,H*.68,H*.11,5,s);lightning={s,op:1.1,fl:.38};},
    cello(){
      const x=W*.08+Math.random()*W*.84,y=H*.04+Math.random()*H*.22,r=Math.min(W,H)*(.28+Math.random()*.18);
      tGlows.push({x,y,r,op:.72+Math.random()*.28,decay:.7+Math.random()*.35});
      setTimeout(()=>tGlows.push({x:x+(Math.random()-.5)*W*.22,y:y+Math.random()*H*.1,r:r*.65,op:.42+Math.random()*.2,decay:1.0+Math.random()*.4}),60+Math.random()*180);
    },
    harp(){for(let i=0;i<60;i++)sparks.push({x:Math.random()*W,y:H*.15+Math.random()*H*.7,vy:22+Math.random()*58,sz:1.5+Math.random()*3.5,life:.5+Math.random()*1.5,ml:.5+Math.random()*1.5});},
    setKey(){}
  };
})();

// ── SCENE 2: BIOLUMINESCENCE ───────────────────────────────────────────────
const bio=(()=>{
  let pts=[],blooms=[],T=0;
  const MINOR={r:55,g:75,b:205};const MAJOR={r:28,g:185,b:148};
  const col=()=>keyMinor?MINOR:MAJOR;
  function init(){pts=[];for(let i=0;i<560;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10,ph:Math.random()*Math.PI*2,br:.02+Math.random()*.06,boost:0,sz:1+Math.random()*2.5});}
  return{
    resize:init,
    draw(dt){
      T+=dt;ctx.fillStyle='rgba(0,1,8,.22)';ctx.fillRect(0,0,W,H);
      const c=col();
      for(const p of pts){
        const ang=fbm(p.x*.0014+T*.038,p.y*.0014,2)*Math.PI*6;
        p.vx=lerp(p.vx,Math.cos(ang)*20,dt*.5);p.vy=lerp(p.vy,Math.sin(ang)*20,dt*.5);
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.x<0)p.x+=W;if(p.x>W)p.x-=W;if(p.y<0)p.y+=H;if(p.y>H)p.y-=H;
        p.boost=Math.max(0,p.boost-dt*.45);
        const twk=.55+.45*Math.sin(p.ph+T*1.8),op=Math.min(1,(p.br+p.boost)*twk);
        if(op<.012)continue;
        if(op>.18){const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.sz*9);gr.addColorStop(0,`rgba(${c.r},${c.g},${c.b},${op*.42})`);gr.addColorStop(1,`rgba(${c.r},${c.g},${c.b},0)`);ctx.fillStyle=gr;ctx.fillRect(p.x-p.sz*9,p.y-p.sz*9,p.sz*18,p.sz*18);}
        ctx.fillStyle=`rgba(${c.r},${c.g},${c.b},${op})`;const s=p.sz*(1+op*.6);ctx.fillRect(p.x-s/2,p.y-s/2,s,s);
      }
      for(let i=blooms.length-1;i>=0;i--){
        const b=blooms[i];b.r+=dt*b.spd;b.op=Math.max(0,b.op-dt*.3);
        if(b.op<=0){blooms.splice(i,1);continue;}
        const gr=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
        gr.addColorStop(0,`rgba(${c.r},${c.g},${c.b},${b.op*.55})`);gr.addColorStop(.45,`rgba(${c.r},${c.g},${c.b},${b.op*.12})`);gr.addColorStop(1,`rgba(${c.r},${c.g},${c.b},0)`);
        ctx.fillStyle=gr;ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);
        for(const p of pts){const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<b.r)p.boost=Math.min(1,p.boost+.12);}
      }
    },
    piano(){blooms.push({x:W*.1+Math.random()*W*.8,y:H*.08+Math.random()*H*.84,r:8,spd:75+Math.random()*55,op:.88});},
    cello(){
      const wy=H*.78;for(const p of pts){if(Math.abs(p.y-wy)<H*.18)p.boost=Math.min(1,p.boost+.5+Math.random()*.35);}
      blooms.push({x:W/2,y:H*.85,r:4,spd:130,op:.48});
    },
    harp(){const cx=W*.1+Math.random()*W*.8;for(const p of pts){if(Math.abs(p.x-cx)<W*.14&&Math.random()<.38){p.boost=.65+Math.random()*.4;p.vy-=55+Math.random()*30;}}},
    setKey(){}
  };
})();

// ── SCENE 3: CLOUD CEILING ─────────────────────────────────────────────────
const ceiling=(()=>{
  let oc,octx,ocW=96,ocH=54,idata,buf,T=0,glows=[],rifts=[];
  const MINOR={sky:[12,14,48],thin:[36,40,68],thick:[25,28,48]};
  const MAJOR={sky:[10,20,44],thin:[40,46,65],thick:[28,32,48]};
  const pal=()=>keyMinor?MINOR:MAJOR;
  function init(){
    ocH=Math.round(ocW*(H/W));oc=document.createElement('canvas');oc.width=ocW;oc.height=ocH;
    octx=oc.getContext('2d');idata=octx.createImageData(ocW,ocH);buf=idata.data;
  }
  function updateCloud(){
    const p=pal();
    for(let y=0;y<ocH;y++)for(let x=0;x<ocW;x++){
      const v1=fbm(x*.045+T*.024,y*.045+T*.016,4),v2=fbm(x*.08-T*.014,y*.08+T*.01,3)*.5;
      const d=Math.max(0,Math.min(1,(v1+v2*.5-.18)*2.0)),idx=(y*ocW+x)*4;
      buf[idx]  =lerp(lerp(p.sky[0],p.thin[0],Math.min(d*2,1)),p.thick[0],Math.max(0,d*2-1));
      buf[idx+1]=lerp(lerp(p.sky[1],p.thin[1],Math.min(d*2,1)),p.thick[1],Math.max(0,d*2-1));
      buf[idx+2]=lerp(lerp(p.sky[2],p.thin[2],Math.min(d*2,1)),p.thick[2],Math.max(0,d*2-1));
      buf[idx+3]=255;
    }
    octx.putImageData(idata,0,0);
  }
  return{
    resize:init,
    draw(dt){
      T+=dt;updateCloud();ctx.drawImage(oc,0,0,W,H);
      const p=pal();
      for(let i=glows.length-1;i>=0;i--){
        const g=glows[i];g.op=Math.max(0,g.op-dt*g.decay);if(g.op<=0){glows.splice(i,1);continue;}
        const gr=ctx.createRadialGradient(g.x,g.y,0,g.x,g.y,g.r);
        gr.addColorStop(0,`rgba(255,255,255,${g.op*.72})`);gr.addColorStop(.35,`rgba(200,218,255,${g.op*.32})`);gr.addColorStop(1,`rgba(0,0,0,0)`);
        ctx.fillStyle=gr;ctx.fillRect(g.x-g.r,g.y-g.r,g.r*2,g.r*2);
      }
      for(let i=rifts.length-1;i>=0;i--){
        const r=rifts[i];r.life-=dt;if(r.life<=0){rifts.splice(i,1);continue;}
        const op=Math.sin((r.life/r.ml)*Math.PI)*0.55;
        const gr=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,r.rad);
        gr.addColorStop(0,`rgba(${p.sky},${op})`);gr.addColorStop(.6,`rgba(${p.sky},${op*.3})`);gr.addColorStop(1,`rgba(${p.sky},0)`);
        ctx.fillStyle=gr;ctx.fillRect(r.x-r.rad,r.y-r.rad,r.rad*2,r.rad*2);
      }
    },
    piano(){
      const x=W*.1+Math.random()*W*.8,y=H*.1+Math.random()*H*.8,r=Math.min(W,H)*.42;
      glows.push({x,y,r,op:.92,decay:1.3});
      setTimeout(()=>glows.push({x:W*.1+Math.random()*W*.8,y:H*.1+Math.random()*H*.8,r:r*.6,op:.6,decay:1.6}),75);
    },
    cello(){glows.push({x:W/2,y:H*.9,r:W*.75,op:.38,decay:.8});},
    harp(){rifts.push({x:W*.15+Math.random()*W*.7,y:H*.1+Math.random()*H*.8,rad:90+Math.random()*110,life:2.8,ml:2.8});},
    setKey(){}
  };
})();

const visScenes=[storm,bio,ceiling];

// Visual RAF loop
function visFrame(ts){
  requestAnimationFrame(visFrame);
  const dt=Math.min((ts-visLast)/1000,.05);visLast=ts;
  visScenes[visCur].draw(dt);
  // Subtle freq overlay
  if(audioAnalyser){
    const fd=new Uint8Array(audioAnalyser.frequencyBinCount);audioAnalyser.getByteFrequencyData(fd);
    const bars=80,step=Math.floor(fd.length/bars),bw=W/bars-.5,baseY=H-1;
    ctx.save();ctx.globalAlpha=.1;ctx.fillStyle='rgba(255,255,255,1)';
    for(let i=0;i<bars;i++){let avg=0;for(let j=0;j<step;j++)avg+=fd[i*step+j];avg/=step;ctx.fillRect(i*(bw+.5),baseY-(avg/255)*22,bw,Math.max(1,(avg/255)*22));}
    ctx.restore();
  }
  // Scene transition
  if(visSwitching){visFade=Math.min(1,visFade+dt*6);ctx.fillStyle=`rgba(0,0,0,${visFade})`;ctx.fillRect(0,0,W,H);if(visFade>=1)visSwitching=false;}
  else if(visFade>0){visFade=Math.max(0,visFade-dt*3.5);ctx.fillStyle=`rgba(0,0,0,${visFade})`;ctx.fillRect(0,0,W,H);}
}

function switchVis(n){
  if(n===visCur||visSwitching)return;
  visSwitching=true;visFade=0;
  setTimeout(()=>{
    visCur=n;
    document.querySelectorAll('.vsb').forEach((b,i)=>b.classList.toggle('on',i===n));
    visScenes[n].setKey(keyMinor);
  },190);
}

// About overlay
document.getElementById('about-btn').addEventListener('click',()=>document.getElementById('about').classList.add('open'));
document.getElementById('about-close').addEventListener('click',()=>document.getElementById('about').classList.remove('open'));
document.getElementById('about').addEventListener('click',e=>{if(e.target===document.getElementById('about'))document.getElementById('about').classList.remove('open');});

document.querySelectorAll('.vsb').forEach(b=>b.addEventListener('click',()=>switchVis(+b.dataset.v)));

// ══════════════════════════════════════════════════════════════════════════
// AUDIO ENGINE
// ══════════════════════════════════════════════════════════════════════════
const PIANO_CDN='https://tonejs.github.io/audio/salamander/';
const INST_CDN='https://nbrosowsky.github.io/tonejs-instruments/samples/';
const PIANO_FILES={48:'C3',51:'Ds3',54:'Fs3',57:'A3',60:'C4',63:'Ds4',66:'Fs4',69:'A4',72:'C5'};
function noteToMidi(n){const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];const m=n.match(/^([A-G]#?)(\d)$/);if(!m)return 60;return names.indexOf(m[1])+(parseInt(m[2])+1)*12;}
const CELLO_FILES=['C2','E2','G2','A2','C3','E3','G3','A3','C4','E4','G4','A4'];
const HARP_FILES=['E1','G1','B1','C2','D2','E2','G2','A2','B2','C3','D3','E3','G3','A3','B3','C4','D4','E4','G4','A4','B4','C5','D5','E5'];
const pianoBufs={},celloBufs={},harpBufs={};
let piLoaded=false,celLoaded=false,harLoaded=false;
let AC=null,mGain=null,sRev=null,audioAnalyser=null;
let playing=false;
let schedId=null,piSchedId=null,celSchedId=null,harSchedId=null,keySchedId=null;
const active={drone:0,pad:0,melody:0,texture:0,piano:0,cello:0,harp:0};
const droneRefs=[];

// ── Key system ─────────────────────────────────────────────────────────────
function midiToHz(m){return 440*Math.pow(2,(m-69)/12);}
function buildScale(root,intervals){const notes=[];for(let oct=-2;oct<4;oct++)intervals.forEach(i=>{const n=root+oct*12+i;if(n>=28&&n<=88)notes.push(n);});return[...new Set(notes)].sort((a,b)=>a-b);}
const KEY_DEFS=[
  {name:'D minor',root:50,intervals:[0,2,3,5,7,8,10],pentaI:[0,3,5,7,10]},
  {name:'E minor',root:52,intervals:[0,2,3,5,7,8,10],pentaI:[0,3,5,7,10]},
  {name:'F major',root:53,intervals:[0,2,4,5,7,9,11],pentaI:[0,2,4,7,9]},
  {name:'G minor',root:55,intervals:[0,2,3,5,7,8,10],pentaI:[0,3,5,7,10]},
  {name:'A minor',root:57,intervals:[0,2,3,5,7,8,10],pentaI:[0,3,5,7,10]},
  {name:'C major',root:48,intervals:[0,2,4,5,7,9,11],pentaI:[0,2,4,7,9]},
];
const KEYS=KEY_DEFS.map(d=>({...d,scale:buildScale(d.root,d.intervals),penta:buildScale(d.root,d.pentaI)}));
let keyIdx=0,currentKey=KEYS[0];
const isMinor=()=>currentKey.intervals.includes(3);

function changeKey(){
  if(!playing)return;
  const next=KEYS.filter((_,i)=>i!==keyIdx)[Math.floor(Math.random()*(KEYS.length-1))];
  keyIdx=KEYS.indexOf(next);currentKey=next;
  retuneDrone(next);
  keyMinor=isMinor();visScenes[visCur].setKey(keyMinor);
  const el=document.getElementById('key-name');
  el.textContent=next.name;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');
  keySchedId=setTimeout(changeKey,(180+Math.random()*180)*1000);
}

// ── Audio helpers ──────────────────────────────────────────────────────────
function mkIR(secs,decay){const n=AC.sampleRate*secs,b=AC.createBuffer(2,n,AC.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}const cv=AC.createConvolver();cv.buffer=b;return cv;}
function mkSoft(amt){const n=256,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=x*(Math.PI+amt)/(Math.PI+amt*Math.abs(x));}const ws=AC.createWaveShaper();ws.curve=c;ws.oversample='2x';return ws;}
function mkEcho(dest,dt,fb){const dl=AC.createDelay(2.0);dl.delayTime.value=dt;const fg=AC.createGain();fg.gain.value=fb;dl.connect(fg);fg.connect(dl);dl.connect(dest);return dl;}
function nearestBuf(bm,midi){const ks=Object.keys(bm).map(Number).filter(k=>bm[k]);if(!ks.length)return null;let b=ks[0],bd=Math.abs(midi-b);for(const k of ks){const d=Math.abs(midi-k);if(d<bd){bd=d;b=k;}}return{buf:bm[b],detune:(midi-b)*100};}
const jit=amt=>(Math.random()*2-1)*amt;
const velJ=(v,f=.06)=>Math.max(.05,Math.min(1,v+jit(v*f)));
function swingSeq(ev,tA=.08,vF=.06){return ev.map(e=>({...e,time:Math.max(0,e.time+jit(tA)),vel:velJ(e.vel??0.75,vF)}));}
function transpose(ev){const st=currentKey.root-50;if(st===0)return ev;return ev.map(e=>({...e,midi:Array.isArray(e.midi)?e.midi.map(m=>Math.max(28,Math.min(84,m+st))):Math.max(28,Math.min(84,e.midi+st))}));}

function hitBuf(bm,midis,dest,{v=.8,rel=8,atk=.02,spread=.04,extra=null}={}){
  const now=AC.currentTime,srcs=[];
  midis.forEach((midi,i)=>{
    const s=nearestBuf(bm,midi);if(!s)return;
    const src=AC.createBufferSource();src.buffer=s.buf;src.detune.value=s.detune;
    const swingOff=i===0?0:jit(spread*.28),nv=velJ(v,.05);
    const g=AC.createGain(),t0=now+i*spread+swingOff;
    g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(nv,t0+atk);
    g.gain.setValueAtTime(nv*.85,t0+Math.max(atk+.5,1.5));g.gain.exponentialRampToValueAtTime(.0001,t0+rel);
    src.connect(g);g.connect(dest);if(extra)g.connect(extra);src.start(t0);src.stop(t0+rel+.5);srcs.push({g});
  });
  return()=>{const t=AC.currentTime;srcs.forEach(({g})=>{try{g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,.2);}catch(e){}});};
}
function seqBuf(bm,events,dest,{extra=null,swing=true}={}){
  const evs=swing?swingSeq(events,.07,.055):events,now=AC.currentTime,srcs=[];
  evs.forEach(ev=>{
    const midis=Array.isArray(ev.midi)?ev.midi:[ev.midi],v=ev.vel??0.75,rel=ev.rel??8,atk=ev.atk??.04;
    midis.forEach((midi,i)=>{
      const s=nearestBuf(bm,midi);if(!s)return;
      const src=AC.createBufferSource();src.buffer=s.buf;src.detune.value=s.detune;
      const g=AC.createGain(),t0=now+ev.time+i*.03;
      g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(v,t0+atk);
      g.gain.setValueAtTime(v*.85,t0+Math.max(atk+.5,1.5));g.gain.exponentialRampToValueAtTime(.0001,t0+rel);
      src.connect(g);g.connect(dest);const xd=ev.extra||extra;if(xd)g.connect(xd);src.start(t0);src.stop(t0+rel+.5);srcs.push({g});
    });
  });
  return()=>{const t=AC.currentTime;srcs.forEach(({g})=>{try{g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,.3);}catch(e){}});};
}
const hit=(m,d,o)=>hitBuf(pianoBufs,m,d,o);
const seq=(ev,d,o)=>seqBuf(pianoBufs,ev,d,o);

// ── Piano ──────────────────────────────────────────────────────────────────
function pianoVoice(){const k=currentKey,pool=k.scale.filter(n=>n>=48&&n<=74),pPool=k.penta.filter(n=>n>=50&&n<=72);if(!pool.length||!pPool.length)return[60];const r=Math.random();if(r<.22)return[pPool[0|Math.random()*pPool.length]];if(r<.44){const root=pool[0|Math.random()*Math.min(8,pool.length)];return[root,root+7].filter(n=>n<=84);}if(r<.70){const di=0|Math.random()*Math.max(1,pool.length-4);return[pool[di],pool[Math.min(di+2,pool.length-1)],pool[Math.min(di+4,pool.length-1)]].filter(Boolean);}const di=0|Math.random()*Math.max(1,pool.length-6);return[pool[di],(pool[di+2]||pool[di+1]),(pool[di+4]||pool[di+3]),(pool[di+6]||pool[di+5])].filter(Boolean);}
const PIANO_FX=[
  {name:'studio',fn(out,m,v,sp){const r=mkIR(1.0,1.5);r.connect(out);const d=AC.createGain();d.gain.value=.5;d.connect(out);return hit(m,r,{v:v*1.3,rel:7,spread:sp,extra:d});}},
  {name:'live room',fn(out,m,v,sp){const r=mkIR(1.8,1.7);r.connect(out);const d=AC.createGain();d.gain.value=.35;d.connect(out);return hit(m,r,{v:v*1.4,rel:7,spread:sp,extra:d});}},
];
const PIANO_PHRASES=[
  {name:'Slow descent',dur:38,build(out){const r=mkIR(14,2.5);r.connect(out);return seq(transpose([{midi:62,time:0,vel:.88,rel:13},{midi:60,time:4.5,vel:.80,rel:12},{midi:57,time:9,vel:.85,rel:13},{midi:55,time:13,vel:.76,rel:11},{midi:53,time:17,vel:.81,rel:13},{midi:50,time:21,vel:.72,rel:15}]),r);}},
  {name:'Slow ascent',dur:34,build(out){const r=mkIR(12,2.4);r.connect(out);return seq(transpose([{midi:50,time:0,vel:.72,rel:13},{midi:53,time:3.5,vel:.78,rel:12},{midi:55,time:7,vel:.82,rel:12},{midi:57,time:10.5,vel:.85,rel:12},{midi:60,time:14,vel:.80,rel:13},{midi:62,time:17.5,vel:.76,rel:14}]),r);}},
  {name:'Two-note motif',dur:30,build(out){const r=mkIR(12,2.4);r.connect(out);return seq(transpose([{midi:57,time:0,vel:.88,rel:12},{midi:50,time:2.5,vel:.80,rel:14},{midi:57,time:10,vel:.78,rel:12},{midi:50,time:12.5,vel:.72,rel:16}]),r);}},
  {name:'Hesitant waltz',dur:24,build(out){const r=mkIR(2.2,1.7);r.connect(out);const d=AC.createGain();d.gain.value=.32;d.connect(out);return seq(transpose([{midi:62,time:0,vel:.84,rel:5},{midi:65,time:1.8,vel:.78,rel:4},{midi:64,time:3.0,vel:.76,rel:4},{midi:62,time:5.2,vel:.82,rel:4},{midi:60,time:6.5,vel:.74,rel:5},{midi:57,time:8.5,vel:.80,rel:7},{midi:62,time:12.5,vel:.86,rel:8}]),r,{extra:d});}},
  {name:'Sparse arpeggio',dur:28,build(out){const r=mkIR(10,2.3);r.connect(out);return seq(transpose([{midi:50,time:0,vel:.88,rel:14},{midi:57,time:2.8,vel:.82,rel:13},{midi:62,time:5.6,vel:.85,rel:12},{midi:65,time:8.4,vel:.78,rel:12},{midi:69,time:11.2,vel:.74,rel:11},{midi:74,time:14,vel:.70,rel:13}]),r);}},
  {name:'Glacial spread',dur:30,build(out){const r=mkIR(16,2.7);r.connect(out);return seq(transpose([{midi:50,time:0,vel:.86,rel:18},{midi:57,time:3,vel:.82,rel:17},{midi:62,time:6,vel:.80,rel:16},{midi:65,time:9,vel:.76,rel:15},{midi:69,time:12,vel:.72,rel:15}]),r);}},
  {name:'Falling chords',dur:34,build(out){const r=mkIR(11,2.4);r.connect(out);return seq(transpose([{midi:62,time:0,vel:.86,rel:12},{midi:65,time:1.0,vel:.80,rel:12},{midi:69,time:2.0,vel:.78,rel:12},{midi:58,time:8,vel:.84,rel:12},{midi:62,time:9.0,vel:.78,rel:12},{midi:65,time:10,vel:.76,rel:12},{midi:55,time:16,vel:.82,rel:13},{midi:58,time:17,vel:.76,rel:13},{midi:62,time:18,vel:.74,rel:13}]),r);}},
  {name:'Shimmer sequence',dur:25,build(out){const r=mkIR(10,2.2);r.connect(out);const ru=mkIR(8,2.1);const sg=AC.createGain();sg.gain.value=.3;ru.connect(sg);sg.connect(out);const base=transpose([50,53,57,62,65,69,74].map((m,i)=>({midi:m,time:i*2.8,vel:.85,rel:11})));const up=transpose([50,53,57,62,65,69,74].map((m,i)=>({midi:Math.min(84,m+12),time:i*2.8+.1,vel:.28,rel:10,atk:.2})));const s1=seq(base,r);const s2=seq(up,ru);return()=>{s1();s2();};}},
  {name:'Echo motif',dur:24,build(out){const dl=AC.createDelay(2);dl.delayTime.value=.55;const fb=AC.createGain();fb.gain.value=.4;const r=mkIR(8,2.2);dl.connect(fb);fb.connect(dl);dl.connect(r);r.connect(out);const d=AC.createGain();d.gain.value=.18;d.connect(out);return seq(transpose([{midi:62,time:0,vel:.86,rel:6},{midi:60,time:1.5,vel:.80,rel:6},{midi:57,time:3,vel:.84,rel:8},{midi:62,time:9,vel:.64,rel:6},{midi:60,time:10.5,vel:.58,rel:6},{midi:57,time:12,vel:.62,rel:9}]),dl,{extra:d});}},
  {name:'Nanou fragment',dur:50,build(out){const r=mkIR(18,2.8);r.connect(out);return seq(transpose([{midi:62,time:0,vel:.84,rel:20},{midi:57,time:8,vel:.78,rel:20},{midi:60,time:17,vel:.82,rel:20},{midi:53,time:26,vel:.75,rel:22}]),r);}},
  {name:'Half pair q-qq qq',dur:26,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:65,time:0,vel:.76,rel:4},{midi:62,time:1.4,vel:.80,rel:5},{midi:58,time:5.5,vel:.72,rel:2},{midi:57,time:6.2,vel:.74,rel:2},{midi:55,time:6.6,vel:.80,rel:5},{midi:60,time:10.5,vel:.70,rel:2},{midi:62,time:10.9,vel:.76,rel:4},{midi:57,time:17,vel:.84,rel:20}]),r,{extra:d});}},
  {name:'qqq half qq',dur:22,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:60,time:0,vel:.70,rel:2},{midi:62,time:0.4,vel:.72,rel:2},{midi:65,time:0.8,vel:.78,rel:5},{midi:57,time:5.5,vel:.76,rel:4},{midi:55,time:6.9,vel:.80,rel:5},{midi:60,time:12,vel:.72,rel:2},{midi:62,time:12.4,vel:.84,rel:20}]),r,{extra:d});}},
  {name:'qq quarter qq-q qq',dur:22,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:62,time:0,vel:.76,rel:2},{midi:65,time:0.4,vel:.72,rel:4},{midi:60,time:3.5,vel:.74,rel:3},{midi:58,time:4.2,vel:.78,rel:5},{midi:55,time:7.5,vel:.70,rel:2},{midi:53,time:7.9,vel:.72,rel:2},{midi:55,time:8.6,vel:.80,rel:6},{midi:58,time:12.5,vel:.72,rel:2},{midi:57,time:12.9,vel:.84,rel:18}]),r,{extra:d});}},
  {name:'Low single qq h-qq',dur:24,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:50,time:0,vel:.82,rel:6},{midi:57,time:4.5,vel:.72,rel:2},{midi:60,time:4.9,vel:.76,rel:4},{midi:62,time:8.5,vel:.74,rel:3},{midi:65,time:9.9,vel:.70,rel:2},{midi:67,time:10.3,vel:.78,rel:5},{midi:57,time:16,vel:.84,rel:20}]),r,{extra:d});}},
  {name:'q-qq qq-q qq',dur:20,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:57,time:0,vel:.74,rel:2},{midi:60,time:0.7,vel:.72,rel:2},{midi:62,time:1.1,vel:.80,rel:5},{midi:65,time:5.5,vel:.72,rel:2},{midi:62,time:5.9,vel:.70,rel:2},{midi:60,time:6.6,vel:.78,rel:5},{midi:55,time:11.5,vel:.70,rel:2},{midi:53,time:11.9,vel:.82,rel:20}]),r,{extra:d});}},
  {name:'Descending qq figures',dur:22,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:67,time:0,vel:.76,rel:2},{midi:65,time:0.4,vel:.72,rel:4},{midi:62,time:4,vel:.74,rel:2},{midi:60,time:4.4,vel:.70,rel:4},{midi:58,time:8,vel:.72,rel:2},{midi:57,time:8.4,vel:.76,rel:5},{midi:53,time:13,vel:.84,rel:20}]),r,{extra:d});}},
  {name:'q-qq pairs qqq close',dur:24,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:62,time:0,vel:.78,rel:2},{midi:65,time:0.7,vel:.74,rel:2},{midi:67,time:1.1,vel:.76,rel:5},{midi:60,time:5,vel:.76,rel:4},{midi:57,time:6.4,vel:.80,rel:5},{midi:62,time:10.5,vel:.72,rel:3},{midi:60,time:11.2,vel:.74,rel:4},{midi:57,time:14.5,vel:.70,rel:2},{midi:55,time:14.9,vel:.72,rel:2},{midi:53,time:15.3,vel:.82,rel:20}]),r,{extra:d});}},
  {name:'Low rise qq qqq quarter',dur:18,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:50,time:0,vel:.80,rel:3},{midi:52,time:0.4,vel:.76,rel:5},{midi:55,time:4.5,vel:.70,rel:2},{midi:57,time:4.9,vel:.72,rel:2},{midi:60,time:5.3,vel:.76,rel:5},{midi:62,time:9.5,vel:.74,rel:3},{midi:65,time:10.2,vel:.82,rel:20}]),r,{extra:d});}},
  {name:'Dense qq q-qq qqq qq',dur:22,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:65,time:0,vel:.74,rel:2},{midi:62,time:0.4,vel:.78,rel:4},{midi:60,time:3.5,vel:.70,rel:2},{midi:58,time:4.2,vel:.72,rel:2},{midi:55,time:4.6,vel:.78,rel:5},{midi:57,time:8.5,vel:.68,rel:2},{midi:58,time:8.9,vel:.70,rel:2},{midi:60,time:9.3,vel:.74,rel:4},{midi:57,time:13,vel:.70,rel:2},{midi:55,time:13.4,vel:.80,rel:20}]),r,{extra:d});}},
  {name:'Cross-register bursts',dur:22,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:69,time:0,vel:.74,rel:3},{midi:67,time:0.4,vel:.70,rel:4},{midi:53,time:4.5,vel:.80,rel:3},{midi:55,time:5.2,vel:.76,rel:2},{midi:57,time:5.6,vel:.74,rel:5},{midi:62,time:9.5,vel:.72,rel:2},{midi:65,time:9.9,vel:.68,rel:4},{midi:57,time:13.5,vel:.74,rel:3},{midi:55,time:14.2,vel:.80,rel:20}]),r,{extra:d});}},
  {name:'qq bookends qqq mid',dur:20,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:60,time:0,vel:.76,rel:2},{midi:62,time:0.4,vel:.80,rel:5},{midi:57,time:5.5,vel:.70,rel:2},{midi:58,time:5.9,vel:.72,rel:2},{midi:60,time:6.3,vel:.78,rel:5},{midi:55,time:12,vel:.72,rel:2},{midi:53,time:12.4,vel:.84,rel:20}]),r,{extra:d});}},
  {name:'Half qqq half qq',dur:26,build(out){const r=mkIR(11,2.4);r.connect(out);const d=AC.createGain();d.gain.value=.22;d.connect(out);return seq(transpose([{midi:65,time:0,vel:.76,rel:4},{midi:62,time:1.4,vel:.80,rel:5},{midi:58,time:5.5,vel:.70,rel:2},{midi:60,time:5.9,vel:.72,rel:2},{midi:62,time:6.3,vel:.76,rel:4},{midi:57,time:11,vel:.74,rel:4},{midi:55,time:12.4,vel:.78,rel:5},{midi:60,time:17,vel:.70,rel:2},{midi:62,time:17.4,vel:.84,rel:20}]),r,{extra:d});}},
];
function schedulePiano(){
  if(!playing)return;
  if(piLoaded&&!active.piano&&Math.random()<.72){
    const v=[.65,.88][0|Math.random()*2],sp=[.03,.07,.13,.22][0|Math.random()*4];
    const out=AC.createGain();out.gain.value=.88;out.connect(mGain);
    let dur=8;
    if(Math.random()<.45){const ph=PIANO_PHRASES[0|Math.random()*PIANO_PHRASES.length];ph.build(out);dur=ph.dur;setLog('piano · '+ph.name+' · '+currentKey.name);}
    else{if(Math.random()<.25){const r=mkIR(1.2+Math.random()*.6,1.5);r.connect(out);const echoIn=mkEcho(r,.2+Math.random()*.35,.28+Math.random()*.18);const dryG=AC.createGain();dryG.gain.value=.45;dryG.connect(out);hit(pianoVoice(),echoIn,{v:v*1.3,rel:7,spread:sp,extra:dryG});setLog('piano · echo · '+currentKey.name);}else{const fx=PIANO_FX[0|Math.random()*PIANO_FX.length];fx.fn(out,pianoVoice(),v,sp);setLog('piano · '+fx.name+' · '+currentKey.name);}dur=10;}
    mark('piano',1,'pia');setTimeout(()=>mark('piano',0,'pia'),dur*1000);
  }
  piSchedId=setTimeout(schedulePiano,(18+Math.random()*30)*1000);
}

// ── Cello ──────────────────────────────────────────────────────────────────
const CELLO_PHRASES=[
  {name:'slow descent',dur:30,build(out,k){const pool=k.scale.filter(n=>n>=36&&n<=52);const notes=pool.slice(0,Math.min(4,pool.length)).reverse();const r=mkIR(7,2.0);r.connect(out);const d=AC.createGain();d.gain.value=.3;d.connect(out);return seqBuf(celloBufs,notes.map((m,i)=>({midi:m,time:i*5.0,vel:velJ(.84,.05),rel:18,atk:.5})),r,{extra:d});}},
  {name:'slow ascent',dur:28,build(out,k){const pool=k.scale.filter(n=>n>=36&&n<=52);const notes=pool.slice(0,Math.min(4,pool.length));const r=mkIR(7,2.0);r.connect(out);const d=AC.createGain();d.gain.value=.3;d.connect(out);return seqBuf(celloBufs,notes.map((m,i)=>({midi:m,time:i*4.5,vel:velJ(.82,.05),rel:18,atk:.48})),r,{extra:d});}},
  {name:'two-note motif',dur:36,build(out,k){const pool=k.scale.filter(n=>n>=40&&n<=52);const m1=pool[0|Math.random()*Math.min(3,pool.length)],m2=pool[Math.min(pool.indexOf(m1)+2,pool.length-1)];const r=mkIR(6,1.9);r.connect(out);const d=AC.createGain();d.gain.value=.32;d.connect(out);return seqBuf(celloBufs,[{midi:m1,time:0,vel:velJ(.86,.05),rel:16,atk:.5},{midi:m2,time:4,vel:velJ(.80,.05),rel:16,atk:.48},{midi:m1,time:15,vel:velJ(.82,.05),rel:18,atk:.5},{midi:m2,time:19,vel:velJ(.76,.05),rel:20,atk:.48}],r,{extra:d});}},
  {name:'octave drop',dur:28,build(out,k){const pool=k.scale.filter(n=>n>=45&&n<=60);if(!pool.length)return;const m1=pool[0|Math.random()*pool.length];const m2=Math.max(36,m1-12);const gap=4+Math.random()*4;const r=mkIR(7,2.0);r.connect(out);const d=AC.createGain();d.gain.value=.3;d.connect(out);return seqBuf(celloBufs,[{midi:m1,time:0,vel:velJ(.84,.05),rel:18,atk:.52},{midi:m2,time:gap,vel:velJ(.80,.05),rel:20,atk:.55}],r,{extra:d});}}
];
function playCello(){
  if(!playing||!celLoaded||active.cello)return;
  const k=currentKey,out=AC.createGain();out.gain.value=.90;out.connect(mGain);
  let dur=12;const r2=Math.random();
  if(r2<.4){const ph=CELLO_PHRASES[0|Math.random()*CELLO_PHRASES.length];ph.build(out,k);dur=ph.dur;setLog('cello · '+ph.name+' · '+k.name);}
  else if(r2<.75){const bassPool=k.scale.filter(n=>n>=36&&n<=52);if(!bassPool.length)return;const midi=bassPool[0|Math.random()*Math.min(5,bassPool.length)];const r=mkIR(3.5,1.8);r.connect(out);const d=AC.createGain();d.gain.value=.35;d.connect(out);hitBuf(celloBufs,[midi],r,{v:velJ(.86,.05),rel:16,atk:.55,extra:d});dur=16;setLog('cello · '+k.name);}
  else{const bassPool=k.scale.filter(n=>n>=38&&n<=55);if(bassPool.length<2)return;const i1=0|Math.random()*Math.max(1,bassPool.length-3);const m1=bassPool[i1],m2=bassPool[Math.min(i1+(0|Math.random()*3+1),bassPool.length-1)];const r=mkIR(4,1.9);r.connect(out);const d=AC.createGain();d.gain.value=.3;d.connect(out);seqBuf(celloBufs,[{midi:m1,time:0,vel:velJ(.85,.05),rel:15,atk:.5},{midi:m2,time:1.8+jit(.5),vel:velJ(.80,.05),rel:15,atk:.5}],r,{extra:d});dur=18;setLog('cello · '+k.name);}
  mark('cello',1,'cel');setTimeout(()=>mark('cello',0,'cel'),dur*1000);
}
function scheduleCello(){if(!playing)return;if(Math.random()<.65)playCello();celSchedId=setTimeout(scheduleCello,(22+Math.random()*28)*1000);}

// ── Harp ───────────────────────────────────────────────────────────────────
function playHarp(){
  if(!playing||!harLoaded||active.harp)return;
  const k=currentKey,out=AC.createGain();out.gain.value=.85;out.connect(mGain);
  let dur=14;const r=Math.random();
  if(r<.45){
    const pool=k.penta.filter(n=>n>=45&&n<=69);if(pool.length<3)return;
    const len=3+(0|Math.random()*4),dir=Math.random()<.5?1:-1;
    const start=dir>0?0|Math.random()*Math.max(1,pool.length-len):pool.length-1-(0|Math.random()*Math.max(1,pool.length-len));
    const picked=[];for(let i=0;i<len;i++)picked.push(pool[Math.max(0,Math.min(pool.length-1,start+i*dir))]);
    const gap=1.8+Math.random()*1.2,rv=mkIR(5,1.9);rv.connect(out);const d=AC.createGain();d.gain.value=.28;d.connect(out);
    const haDest=Math.random()<.30?mkEcho(rv,.15+Math.random()*.25,.28+Math.random()*.18):rv;
    seqBuf(harpBufs,picked.map((m,i)=>({midi:m,time:i*gap,vel:velJ(.80,.06),rel:7,atk:.01})),haDest,{extra:d});
    dur=len*(gap+1)+6;setLog('harp · arpeggio · '+k.name);
  } else if(r<.75){
    const bassPool=k.scale.filter(n=>n>=40&&n<=55),midPool=k.penta.filter(n=>n>=55&&n<=72);
    if(!bassPool.length||!midPool.length)return;
    const bassNote=bassPool[0|Math.random()*Math.min(4,bassPool.length)];
    const rv=mkIR(7,2.1);rv.connect(out);const d=AC.createGain();d.gain.value=.25;d.connect(out);
    const events=[{midi:bassNote,time:0,vel:velJ(.88,.05),rel:9,atk:.01}];
    const gap=5+Math.random()*3;
    midPool.slice(0,Math.min(4,midPool.length)).forEach((m,i)=>events.push({midi:m,time:gap+i*1.6,vel:velJ(.75,.06),rel:6,atk:.01}));
    seqBuf(harpBufs,events,rv,{extra:d});dur=18;setLog('harp · phrase · '+k.name);
  } else {
    const bassPool=k.scale.filter(n=>n>=40&&n<=57);if(!bassPool.length)return;
    const midi=bassPool[0|Math.random()*Math.min(5,bassPool.length)];
    const rv=mkIR(6,2.1);rv.connect(out);
    const hpDest=Math.random()<.20?mkEcho(rv,.2+Math.random()*.3,.25+Math.random()*.15):rv;
    seqBuf(harpBufs,[{midi,time:0,vel:velJ(.86,.05),rel:8,atk:.01}],hpDest);
    dur=10;setLog('harp · '+k.name);
  }
  mark('harp',1,'har');setTimeout(()=>mark('harp',0,'har'),dur*1000);
}
function scheduleHarp(){if(!playing)return;if(Math.random()<.60)playHarp();harSchedId=setTimeout(scheduleHarp,(25+Math.random()*35)*1000);}

// ── Synth layers ───────────────────────────────────────────────────────────
function startDrone(){
  [[0,-.15],[0,+.15],[7,-.12],[7,+.12]].forEach(([iv,det])=>{
    const f=midiToHz(currentKey.root-12)*Math.pow(2,iv/12)+det;
    const osc=AC.createOscillator();osc.type='sine';osc.frequency.value=f;
    const lfo=AC.createOscillator(),lg=AC.createGain();lfo.frequency.value=.03+Math.random()*.05;lg.gain.value=.12;
    lfo.connect(lg);lg.connect(osc.frequency);lfo.start();
    const fi=AC.createBiquadFilter();fi.type='lowpass';fi.frequency.value=300;
    const g=AC.createGain();g.gain.setValueAtTime(0,AC.currentTime);g.gain.linearRampToValueAtTime(.14,AC.currentTime+7);
    osc.connect(fi);fi.connect(g);g.connect(sRev);osc.start();droneRefs.push({osc,iv,det});
  });
  mark('drone',1,'syn');
}
function retuneDrone(newKey){const t=AC.currentTime;droneRefs.forEach(({osc,iv,det})=>{osc.frequency.linearRampToValueAtTime(midiToHz(newKey.root-12)*Math.pow(2,iv/12)+det,t+12);});}
function playPad(){
  if(!playing)return;const pool=currentKey.penta.filter(n=>n>=48&&n<=69);if(pool.length<2)return;
  const notes=[...pool].sort(()=>Math.random()-.5).slice(0,3);
  const dur=10+Math.random()*8,atk=3+Math.random()*2,now=AC.currentTime;
  notes.forEach(midi=>{
    const f=midiToHz(midi),f2=f*2.003;const o=AC.createOscillator(),o2=AC.createOscillator();o.type='sine';o.frequency.value=f;o2.type='sine';o2.frequency.value=f2;
    const g=AC.createGain(),g2=AC.createGain();g2.gain.value=.18;
    g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.07,now+atk);g.gain.setValueAtTime(.06,now+dur-3.5);g.gain.linearRampToValueAtTime(0,now+dur);
    o.connect(g);o2.connect(g2);g2.connect(g);g.connect(sRev);o.start(now);o2.start(now);o.stop(now+dur+.1);o2.stop(now+dur+.1);
  });
  mark('pad',1,'syn');setTimeout(()=>mark('pad',0,'syn'),(dur-2)*1000);
}
function playMelody(){
  if(!playing)return;const pool=currentKey.penta.filter(n=>n>=55&&n<=76);if(!pool.length)return;
  const len=3+(0|Math.random()*4);let t=AC.currentTime+.4,total=0;mark('melody',1,'syn');
  for(let i=0;i<len;i++){
    const midi=pool[0|Math.random()*pool.length],f=midiToHz(midi);
    const dur=2.5+Math.random()*4,atk=Math.min(.8,dur*.18),holdEnd=t+Math.max(atk+.2,dur*.68);
    const o=AC.createOscillator(),o2=AC.createOscillator();o.type='sine';o.frequency.value=f;o2.type='triangle';o2.frequency.value=f;
    const g=AC.createGain(),g2=AC.createGain();g2.gain.value=.1;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+atk);g.gain.setValueAtTime(.11,holdEnd);g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(g);o2.connect(g2);g2.connect(g);g.connect(sRev);o.start(t);o2.start(t);o.stop(t+dur+.1);o2.stop(t+dur+.1);
    const step=dur*.76;t+=step;total+=step;
  }
  setTimeout(()=>mark('melody',0,'syn'),(total+3)*1000);
}
function playTexture(){
  if(!playing)return;const n=AC.sampleRate*3,b=AC.createBuffer(1,n,AC.sampleRate);
  const d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  const src=AC.createBufferSource();src.buffer=b;src.loop=true;
  const fi=AC.createBiquadFilter();fi.type='bandpass';fi.Q.value=5;
  const f0=120+Math.random()*200,dur=12+Math.random()*8,now=AC.currentTime;
  fi.frequency.setValueAtTime(f0,now);fi.frequency.linearRampToValueAtTime(f0+200+Math.random()*350,now+dur);
  const g=AC.createGain();g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.05,now+4);g.gain.setValueAtTime(.04,now+dur-4);g.gain.linearRampToValueAtTime(0,now+dur);
  src.connect(fi);fi.connect(g);g.connect(sRev);src.start();src.stop(now+dur);
  mark('texture',1,'syn');setTimeout(()=>mark('texture',0,'syn'),(dur-2.5)*1000);
}
function schedule(){
  if(!playing)return;
  if(!active.pad&&Math.random()<.65)playPad();
  if(!active.melody&&Math.random()<.55)setTimeout(playMelody,Math.random()*4000);
  if(!active.texture&&Math.random()<.40)setTimeout(playTexture,Math.random()*6000);
  schedId=setTimeout(schedule,6000+Math.random()*8000);
}

// ── Utilities ──────────────────────────────────────────────────────────────
function mark(k,v,cls){
  active[k]=v;
  // Fire visual event on layer activation
  if(v&&playing){
    if(k==='piano')visScenes[visCur].piano();
    else if(k==='cello')visScenes[visCur].cello();
    else if(k==='harp')visScenes[visCur].harp();
  }
}
const setLog=s=>{};  // no log display in minimal UI
const setStatus=s=>document.getElementById('status').textContent=s;

// ── Sample loading ─────────────────────────────────────────────────────────
async function tryLoad(url){try{const r=await fetch(url);if(!r.ok)return null;return await AC.decodeAudioData(await r.arrayBuffer());}catch(e){return null;}}
async function loadAllSamples(){
  const total=Object.keys(PIANO_FILES).length+CELLO_FILES.length+HARP_FILES.length;
  let done=0;const tick=()=>{done++;setStatus('Loading · '+done+' / '+total);};
  await Promise.all([
    ...Object.entries(PIANO_FILES).map(async([midi,name])=>{const b=await tryLoad(PIANO_CDN+name+'.mp3');if(b)pianoBufs[+midi]=b;tick();}),
    ...CELLO_FILES.map(async n=>{const b=await tryLoad(INST_CDN+'cello/'+n+'.mp3');if(b)celloBufs[noteToMidi(n)]=b;tick();}),
    ...HARP_FILES.map(async n=>{const b=await tryLoad(INST_CDN+'harp/'+n+'.mp3');if(b)harpBufs[noteToMidi(n)]=b;tick();}),
  ]);
  piLoaded=Object.keys(pianoBufs).length>0;celLoaded=Object.keys(celloBufs).length>0;harLoaded=Object.keys(harpBufs).length>0;
  setStatus('');
}

// ── Play / Stop ────────────────────────────────────────────────────────────
document.getElementById('btn').addEventListener('click',async()=>{
  if(!playing){
    playing=true;document.getElementById('btn').textContent='Stop';document.getElementById('btn').classList.add('active');
    setLog('Starting…');
    AC=new(window.AudioContext||window.webkitAudioContext)();
    mGain=AC.createGain();mGain.gain.setValueAtTime(0,AC.currentTime);mGain.gain.linearRampToValueAtTime(.72,AC.currentTime+2);
    audioAnalyser=AC.createAnalyser();audioAnalyser.fftSize=512;audioAnalyser.smoothingTimeConstant=.88;
    sRev=mkIR(6,2.0);sRev.connect(mGain);mGain.connect(audioAnalyser);audioAnalyser.connect(AC.destination);
    keyIdx=Math.floor(Math.random()*KEYS.length);currentKey=KEYS[keyIdx];
    keyMinor=isMinor();visScenes[visCur].setKey(keyMinor);
    document.getElementById('key-name').textContent=currentKey.name;
    startDrone();
    setTimeout(schedule,3000);
    keySchedId=setTimeout(changeKey,(180+Math.random()*180)*1000);
    loadAllSamples().then(()=>{
      setLog(currentKey.name);
      setTimeout(schedulePiano,(10+Math.random()*15)*1000);
      setTimeout(scheduleCello,(15+Math.random()*20)*1000);
      setTimeout(scheduleHarp,(20+Math.random()*20)*1000);
    });
  } else {
    playing=false;document.getElementById('btn').textContent='Play';document.getElementById('btn').classList.remove('active');
    document.getElementById('key-name').textContent='';setStatus('');
    [schedId,piSchedId,celSchedId,harSchedId,keySchedId].forEach(clearTimeout);
    droneRefs.length=0;Object.keys(active).forEach(k=>active[k]=0);
    if(mGain){mGain.gain.setTargetAtTime(0,AC.currentTime,.4);setTimeout(()=>{try{AC.close();}catch(e){}},2000);}
    audioAnalyser=null;
  }
});

// ── Boot ───────────────────────────────────────────────────────────────────
resizeVis();
requestAnimationFrame(ts=>{visLast=ts;requestAnimationFrame(visFrame);});
