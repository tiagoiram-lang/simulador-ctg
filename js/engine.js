/* Motor de simulação do traçado (FCF, TOCO, FC materna) */
const DT = 0.5; // segundos por amostra
const MIN = 60;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const ss = x => x<=0?0:x>=1?1:x*x*(3-2*x);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const NOSC=12,OSC_LO=0.8,OSC_HI=20,OSC_BETA=0.3,VSCALE=.25; // calibração CTU-UHB
const DEF = {baseline:140,varAmp:12,accelPerHour:6,accelAmp:20,cycling:false,cInt:200,cDur:70,cAmp:50,tone:12,toneRamp:30,
  decelType:'none',decelProb:0,decelDepth:30,varInDecel:1,sinus:0,sinusCpm:4,maternal:false,showMhr:false,mhrBase:88,mhrPush:false,
  ramp:20,varRamp:8,pushing:false,loss:0,mhrCapture:false};

class Engine{
  constructor(params,seed=7){
    this.r=mulberry(seed); this.p={...DEF,...params}; this.t=0;
    this.F=[]; this.T=[]; this.M=[]; this.TF=[]; this.cStarts=[];
    this.b=this.p.baseline; this.va=this.p.varAmp; this.tn=this.p.tone;
    this.cs=[]; this.ds=[]; this.as=[]; this.timers=[]; this.pro=null; this.proLog=[];
    this.dlog=[]; this.alog=[]; this.clog=[]; this.marks=[]; this.decelHook=null; this.gap=0; this.curDrop=0; this.inContr=0; this.qNow=false;
    this.nextC = this.p.cInt>0 ? this.r()*this.p.cInt : Infinity;
    this.nextA = this.expo(0);
    // variabilidade calibrada com a base CTU-UHB: espectro ~1/f² entre 0,5 e 20 ciclos/min
    this.osc=[...Array(NOSC)].map((_,k)=>{const o={k,ph:this.r()*6.283};this.rband(o);return o});
    this.mosc=[...Array(4)].map(()=>({f:this.rf(),w:.5+this.r(),ph:this.r()*6.283}));
    this.jit=0; this.quietUntil=0; this.nextQuiet=600+this.r()*1500;
  }
  rf(){return (1.5+this.r()*6)/60}
  rband(o){const lo=OSC_LO*Math.pow(OSC_HI/OSC_LO,o.k/NOSC),hi=OSC_LO*Math.pow(OSC_HI/OSC_LO,(o.k+1)/NOSC);const cpm=lo*Math.pow(hi/lo,this.r());o.f=cpm/60;o.w=Math.pow(cpm,-OSC_BETA)*(.7+.6*this.r())}
  expo(from){const rate=this.p.accelPerHour/3600;return rate>0?from-Math.log(1-this.r())/rate:Infinity}
  set(o){
    const prev=this.p.cInt, prevA=this.p.accelPerHour; Object.assign(this.p,o);
    if('cInt' in o && o.cInt!==prev){
      if(this.p.cInt<=0) this.nextC=Infinity;
      else if(prev<=0||!isFinite(this.nextC)) this.nextC=this.t+this.r()*this.p.cInt*.5;
      else if(this.nextC>this.t+this.p.cInt*1.2) this.nextC=this.t+this.p.cInt*(.5+.5*this.r());
    }
    if('accelPerHour' in o && o.accelPerHour!==prevA) this.nextA=this.expo(this.t);
  }
  at(dt,fn){this.timers.push({t:this.t+dt,fn})}
  mark(label){const n=this.marks.length+1;this.marks.push({t:this.t,n,label});return n}
  startPro(o){this.pro={s:this.t,drop:o.drop,fall:o.fall||40,vf:o.vf??1,vfLate:o.vfLate??(o.vf??1),rec:null,recDur:o.recDur||70};this.proLog.push({s:this.t,e:null})}
  recover(delay=60){if(this.pro&&this.pro.rec==null)this.pro.rec=this.t+delay}
  mkDecel(c){
    let d=null;
    if(this.decelHook) d=this.decelHook(c,this);
    else{
      const p=this.p,r=this.r;
      if(p.decelType!=='none'&&r()<=p.decelProb){
        const depth=p.decelDepth*(.8+.4*r());
        if(p.decelType==='early') d={k:'g',s:c.s+c.d*.05,d:c.d*.9,depth:Math.min(depth,30),type:'precoce'};
        else if(p.decelType==='late') d={k:'g',s:c.s+c.d*.3+10,d:c.d*1.05,depth,type:'tardia'};
        else if(p.decelType==='variable') d={k:'v',s:c.s+c.d*(.15+.25*r()),f:7+r()*8,h:10+r()*25,g:7+r()*8,depth,type:'variavel'};
        else if(p.decelType==='subacute'){const f=14+r()*6,g=14+r()*6;d={k:'v',s:c.s+c.d*.08,f,g,h:Math.max(25,p.cInt-24-f-g)*(.9+.15*r()),depth,type:'variavel'}}
      }
    }
    if(d){this.ds.push(d);const tot=d.k==='g'?d.d:d.f+d.h+d.g;if(d.depth>=15)this.dlog.push({type:d.type,s:d.s,e:d.s+tot,nadir:d.k==='g'?d.s+d.d/2:d.s+d.f+d.h/2,dur:d.k==='g'?d.d*.75:tot,depth:d.depth,cs:c.s,cp:c.s+c.d/2,ca:c.a})}
  }
  dshape(d,t){
    if(d.k==='g'){const x=(t-d.s)/d.d;return x>0&&x<1?d.depth*Math.sin(Math.PI*x)**2:0}
    const u=t-d.s; if(u<=0) return 0;
    if(u<d.f) return d.depth*ss(u/d.f);
    if(u<d.f+d.h) return d.depth*(1-.06*Math.sin((u-d.f)/4));
    if(u<d.f+d.h+d.g) return d.depth*(1-ss((u-d.f-d.h)/d.g));
    return 0;
  }
  step(){
    const p=this.p,t=this.t,r=this.r;
    for(let i=this.timers.length-1;i>=0;i--) if(t>=this.timers[i].t){const f=this.timers[i].fn;this.timers.splice(i,1);f(this)}
    const mv=(c,tar,rate)=>{const d=tar-c,m=rate*DT/60;return Math.abs(d)<=m?tar:c+Math.sign(d)*m};
    this.b=mv(this.b,p.baseline,p.ramp); this.va=mv(this.va,p.varAmp,p.varRamp); this.tn=mv(this.tn,p.tone,p.toneRamp);
    while(t>=this.nextC){const c={s:this.nextC,d:p.cDur*(.85+.3*r()),a:p.cAmp*(.8+.4*r())};this.cs.push(c);this.cStarts.push(c.s);this.clog.push(c);this.mkDecel(c);this.nextC+=p.cInt*(.8+.4*r())}
    let q=false;
    if(p.cycling){if(t>=this.nextQuiet){this.quietUntil=t+900+r()*900;this.nextQuiet=this.quietUntil+1800+r()*1800}q=t<this.quietUntil}
    this.qNow=q;
    while(t>=this.nextA){if(!q){const a={s:this.nextA,d:20+r()*35,a:p.accelAmp*(.8+.5*r())};this.as.push(a);this.alog.push(a)}this.nextA=this.expo(this.nextA)}
    let v=0,W=0;for(const o of this.osc){o.ph+=6.2832*o.f*DT;v+=o.w*Math.sin(o.ph);W+=o.w*o.w}
    if(r()<DT/8)this.rband(this.osc[(r()*this.osc.length)|0]);
    v/=Math.sqrt(W/2);
    this.jit=this.jit*.55+(r()-.5)*.9;
    let amp=this.va*VSCALE*(q?.35:1);
    let dd=0;for(const d of this.ds)dd=Math.max(dd,this.dshape(d,t));
    amp*=1-(1-p.varInDecel)*Math.min(1,dd/30);
    let ac=0;for(const a of this.as){const x=(t-a.s)/a.d;if(x>0&&x<1)ac=Math.max(ac,a.a*Math.sin(Math.PI*x)**1.5)}
    let f;
    if(p.sinus>0) f=this.b+p.sinus/2*Math.sin(6.2832*p.sinusCpm/60*t)+v*.25+this.jit*.25;
    else f=this.b+v*amp+this.jit*(this.va>3?1:.45)+ac-dd;
    let proDrop=0;
    if(this.pro){
      const P=this.pro;let w=ss((t-P.s)/P.fall);
      if(P.rec!=null&&t>P.rec){const u=ss((t-P.rec)/P.recDur);w*=1-u;if(u>=1){this.pro=null;const L=this.proLog[this.proLog.length-1];if(L)L.e=t}}
      const vf=(t-P.s>180)?P.vfLate:P.vf;
      f=f*(1-w)+(this.b-P.drop+v*this.va*VSCALE*vf+this.jit*.5)*w;
      proDrop=P.drop*w;
    }
    this.curDrop=Math.max(dd,proDrop);
    let toco=this.tn+(r()-.5)*1.2,ic=0;
    for(const c of this.cs){const x=(t-c.s)/c.d;if(x>0&&x<1){const s=Math.sin(Math.PI*x)**2;toco+=c.a*s;ic=Math.max(ic,s*c.a);
      if(p.pushing&&x>.2&&x<.88)toco+=26*Math.max(0,Math.sin(6.2832*(t-c.s)/17))**6}}
    this.inContr=ic;
    let mvv=0,mW=0;for(const o of this.mosc){o.ph+=6.2832*o.f*DT;mvv+=o.w*Math.sin(o.ph);mW+=o.w*o.w}
    mvv/=Math.sqrt(mW/2);
    let push=0;if(p.mhrPush)for(const c of this.cs){const x=(t-c.s)/c.d;if(x>0&&x<1)push=Math.max(push,26*Math.sin(Math.PI*x)**1.2)}
    const m=p.mhrBase+mvv*2.2+push+this.jit*.6;
    let rec=p.maternal?m:f;
    if(p.loss>0||this.gap>0){
      if(this.gap>0){this.gap-=DT;rec=p.mhrCapture?m:NaN}
      else if(r()<p.loss*DT/60){const u=r();this.gap=u<.72?1+r()*3.5:u<.96?5+r()*25:30+r()*120}
    }
    this.F.push(isNaN(rec)?NaN:clamp(rec,50,210));this.T.push(clamp(toco,0,100));this.M.push(m);this.TF.push(clamp(f,50,210));
    this.t+=DT;
    if(this.F.length%240===0){const lim=t-400;this.cs=this.cs.filter(c=>c.s+c.d>lim);this.ds=this.ds.filter(d=>d.s+(d.d||d.f+d.h+d.g)>lim);this.as=this.as.filter(a=>a.s+a.d>lim)}
  }
  run(sec){const n=Math.round(sec/DT);for(let i=0;i<n;i++)this.step()}
  contr10(){const lim=this.t-600;let n=0;for(let i=this.cStarts.length-1;i>=0&&this.cStarts[i]>=lim;i--)n++;return n}
  contrIn(a,b){let n=0;for(let i=this.cStarts.length-1;i>=0&&this.cStarts[i]>=a;i--)if(this.cStarts[i]<b)n++;return n}
}

/* ===================== Papel de CTG ===================== */
function fmt(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return m+':'+String(s).padStart(2,'0')}
function fitCanvas(cv){const dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return{c,W,H}}
function drawCTG(cv,eng,o){
  const {c,W,H}=fitCanvas(cv);
  const compact=o.compact, L=compact?26:38, R=8, top=compact?6:(o.marks?30:20), bot=compact?6:8;
  const usable=H-top-bot, gap=compact?10:16, fh=Math.round((usable-gap)*.66), th=usable-gap-fh;
  const y0=top,y1=top+fh+gap, pw=W-L-R;
  const tEnd=o.tEnd, win=o.win, t0=tEnd-win;
  const X=t=>L+(t-t0)/win*pw, Yf=b=>y0+(210-b)/160*fh, Yt=v=>y1+(100-v)/100*th;
  c.fillStyle='#FFFFFF';c.fillRect(0,0,W,H);
  c.fillStyle='#FFF8F4';c.fillRect(L,y0,pw,fh);c.fillRect(L,y1,pw,th);
  c.fillStyle='rgba(46,139,87,.09)';c.fillRect(L,Yf(160),pw,Yf(110)-Yf(160));
  c.lineWidth=1;
  for(let b=50;b<=210;b+=10){c.strokeStyle=(b%30===0)?'#E3A08D':'#F3D2C7';c.beginPath();c.moveTo(L,Math.round(Yf(b))+.5);c.lineTo(L+pw,Math.round(Yf(b))+.5);c.stroke()}
  for(let v=0;v<=100;v+=10){c.strokeStyle=(v%50===0)?'#E3A08D':'#F3D2C7';c.beginPath();c.moveTo(L,Math.round(Yt(v))+.5);c.lineTo(L+pw,Math.round(Yt(v))+.5);c.stroke()}
  const pxPerMin=pw/(win/60);
  const minor=pxPerMin<25?60:20;
  for(let s=Math.ceil(t0/minor)*minor;s<=tEnd;s+=minor){
    const major=(s%60===0);const x=Math.round(X(s))+.5;
    c.strokeStyle=(s%600===0)?'#D07B66':major?'#E8AE9D':'#F6DED5';
    c.beginPath();c.moveTo(x,y0);c.lineTo(x,y0+fh);c.moveTo(x,y1);c.lineTo(x,y1+th);c.stroke();
  }
  c.fillStyle='#7A5A50';c.font=(compact?'10px ':'11px ')+'"Geist Mono",monospace';c.textAlign='right';c.textBaseline='middle';
  for(let b=60;b<=200;b+=(compact?30:20)){if(compact&&b%30)continue;c.fillText(b,L-4,Yf(b))}
  for(let v=0;v<=100;v+=50)c.fillText(v,L-4,Yt(v));
  if(!compact){
    c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#5D6B7C';c.font='600 11px "Geist",sans-serif';
    if(o.marks){c.textAlign='right';c.fillText('bpm',L-4,y0-6);c.textAlign='left'}else c.fillText('FCF bpm',L+4,y0-6);c.fillText('TOCO',L+4,y1-4);
    c.font='11px "Geist Mono",monospace';c.textAlign='center';
    const lab=o.labEvery||(win>=3600?600:300);
    const base=o.tZero||0;
    const sStart=o.clock?Math.ceil(t0/lab)*lab:base+Math.ceil((t0-base)/lab)*lab;
    for(let s=sStart;s<=tEnd;s+=lab){if(X(s)<L+70||X(s)>L+pw-((o.mhr||eng.p.showMhr)?110:24))continue;
      const txt=o.clock?o.clock(s):((s-base<0?'−':'')+fmt(Math.abs(s-base)));c.fillText(txt,X(s),y0-6)}
  }
  const i0=Math.max(0,Math.floor(t0/DT)),i1=Math.min(eng.F.length-1,Math.floor(tEnd/DT));
  const step=Math.max(1,Math.floor((i1-i0)/(pw*2)));
  const path=(arr,col,lw,dash,isToco)=>{c.strokeStyle=col;c.lineWidth=lw;c.setLineDash(dash||[]);c.beginPath();let pen=false;
    for(let i=i0;i<=i1;i+=step){const v=arr[i];if(v!==v){pen=false;continue}const x=X(i*DT),y=isToco?Yt(v):Yf(v);if(!pen){c.moveTo(x,y);pen=true}else c.lineTo(x,y)}c.stroke();c.setLineDash([])};
  c.save();c.beginPath();c.rect(L,0,pw,H);c.clip();
  if(o.bands)for(const bd of o.bands){if(bd.e<t0||bd.s>tEnd)continue;c.fillStyle=bd.col;c.fillRect(X(bd.s),y0,X(bd.e)-X(bd.s),fh)}
  if(o.trueF) path(eng.TF,'rgba(46,139,87,.75)',1.1,[2,3]);
  if(o.mhr||eng.p.showMhr) path(eng.M,'rgba(194,59,50,.85)',1.3,[4,3]);
  path(eng.F,'#16213A',compact?1.1:1.35);
  path(eng.T,'#16213A',compact?1:1.2,null,true);
  if(o.marks){
    c.font='600 10.5px "Geist Mono",monospace';c.textAlign='center';c.textBaseline='middle';
    for(const m of eng.marks){if(m.t<t0||m.t>tEnd)continue;const x=Math.round(X(m.t))+.5;
      c.strokeStyle='rgba(0,152,188,.75)';c.setLineDash([3,3]);c.beginPath();c.moveTo(x,y0);c.lineTo(x,y1+th);c.stroke();c.setLineDash([]);
      const w=Math.max(16,c.measureText(String(m.n)).width+8);c.fillStyle=m.col||'#0098BC';c.fillRect(x-w/2,y0-22,w,15);c.fillStyle='#fff';c.fillText(m.n,x,y0-14.5)}
  }
  if(o.annot)drawAnnot(c,eng,o.annot,{X,Yf,Yt,y0,y1,fh,th,L,pw,t0,tEnd});
  c.restore();
  if(!compact&&(o.mhr||eng.p.showMhr)){c.fillStyle='#C23B32';c.font='600 11px "Geist",sans-serif';c.textAlign='right';c.textBaseline='alphabetic';c.fillText('- - FC materna',L+pw-4,y0-6)}
  c.strokeStyle='#D9B8AD';c.lineWidth=1;c.strokeRect(L+.5,y0+.5,pw-1,fh-1);c.strokeRect(L+.5,y1+.5,pw-1,th-1);
}

/* Anotações didáticas sobre o traçado */
const ANN_COL={det:'#B4410F',precoces:'#2F6FB5',variaveis:'#7A3FB0',tardias:'#D9731A',prolongada:'#C23B32',acc:'#2E8B57',base:'#0098BC',var:'#0B7A75',cont:'#8A6D00'};
function drawAnnot(c,eng,A,G){
  const {X,Yf,Yt,y0,y1,fh,th,L,pw,t0,tEnd}=G,on=k=>A.layers[k];
  c.save();c.font='600 11px "Geist",sans-serif';c.textBaseline='middle';
  const tag=(x,y,txt,col)=>{const w=c.measureText(txt).width+10;c.fillStyle='#fff';c.fillRect(x-w/2,y-9,w,18);c.strokeStyle=col;c.lineWidth=1.2;c.strokeRect(x-w/2+.5,y-8.5,w-1,17);c.fillStyle=col;c.textAlign='center';c.fillText(txt,x,y+.5)};
  if(on('dec')){
    for(const d of A.decels){const col=ANN_COL[d.cls];const xa=X(d.s),xb=X(d.e);
      c.fillStyle=col+'22';c.fillRect(xa,y0,xb-xa,fh);c.strokeStyle=col;c.lineWidth=1;c.setLineDash([]);c.strokeRect(xa+.5,y0+.5,xb-xa-1,fh-1);
      if(d.cp&&(d.cls==='tardias'||d.cls==='precoces')){const yp=Yt(Math.min(100,(A.tone||10)+d.ca));const yn=Yf(A.base-d.depth);
        c.setLineDash([3,3]);c.strokeStyle=col;c.beginPath();c.moveTo(X(d.cp),yp);c.lineTo(X(d.cp),y0+fh);c.stroke();c.beginPath();c.moveTo(X(d.nadir),yn);c.lineTo(X(d.nadir),y1+th);c.stroke();c.setLineDash([]);
        if(d.cls==='tardias'&&X(d.nadir)-X(d.cp)>6){const ya=y0+fh+8;c.beginPath();c.moveTo(X(d.cp),ya);c.lineTo(X(d.nadir),ya);c.stroke();c.beginPath();c.moveTo(X(d.nadir),ya);c.lineTo(X(d.nadir)-5,ya-3);c.lineTo(X(d.nadir)-5,ya+3);c.fill()}}
      tag((xa+xb)/2,y0+12,d.lab,col)}
  }
  if(on('base')&&A.baseArr){c.strokeStyle=ANN_COL.base;c.lineWidth=2;c.setLineDash([8,5]);c.beginPath();A.baseArr.forEach((b,k)=>{const x0=X(A.baseT0+k*60),x1=X(A.baseT0+(k+1)*60);if(k)c.lineTo(x0,Yf(b));else c.moveTo(x0,Yf(b));c.lineTo(x1,Yf(b))});c.stroke();c.setLineDash([])}
  if(on('base')&&A.base){const y=Yf(A.base);c.strokeStyle=ANN_COL.base;c.lineWidth=2;c.setLineDash([8,5]);c.beginPath();c.moveTo(L,y);c.lineTo(L+pw,y);c.stroke();c.setLineDash([]);tag(L+pw-70,y>y0+30?y-14:y+14,'Linha de base ~'+A.base,ANN_COL.base)}
  if(on('var')&&A.vseg){const v=A.vseg,xa=X(v.s),xb=X(v.e),ya=Yf(v.max),yb=Yf(v.min);c.strokeStyle=ANN_COL.var;c.lineWidth=1.5;
    c.beginPath();c.moveTo(xa,ya);c.lineTo(xb,ya);c.moveTo(xa,yb);c.lineTo(xb,yb);c.moveTo(xb+6,ya);c.lineTo(xb+6,yb);c.stroke();
    tag(clamp(xb+6,L+62,L+pw-62),Math.min(yb+16,y0+fh-10),'Amplitude '+Math.round(v.max-v.min)+' bpm',ANN_COL.var)}
  if(on('var')&&A.sinus){const y=Yf(A.base)-34;tag(L+pw/2,y,'Padrão sinusoidal: ondulação regular e suave, sem acelerações',ANN_COL.var)}
  if(on('acc'))for(const a of A.accs){const x=X(a.s+a.d/2),y=Yf(A.base+a.a)-10;c.fillStyle=ANN_COL.acc;c.beginPath();c.moveTo(x,y+6);c.lineTo(x-6,y-4);c.lineTo(x+6,y-4);c.fill();tag(x,y-16,'A',ANN_COL.acc)}
  if(on('cont')){const lim=tEnd-600;c.fillStyle=ANN_COL.cont+'14';c.fillRect(X(lim),y1,X(tEnd)-X(lim),th);
    let n=0;for(const k of A.contr){if(k.s<lim||k.s>tEnd)continue;n++;tag(X(k.s+k.d/2),Yt(Math.min(96,(A.tone||10)+k.a))-12,String(n),ANN_COL.cont)}
    tag(clamp(X(lim)+80,L+80,L+pw-80),y1+th-11,'Últimos 10 min: '+n+' contrações',ANN_COL.cont)}
  c.restore();
}
