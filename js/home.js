/* Página de entrada: monitor animado com o motor do simulador e números reais da plataforma */
const HERO={eng:null,raf:0,last:0,on:false,acc:0,shown:0};
const HERO_WIN=8*60;            // janela visível: 8 minutos de traçado
const HERO_SPEED=24;            // 24 s de traçado por segundo real
const reduceMotion=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

function heroEngine(){
  /* padrão realista e discretamente interessante: linha de base normal, acelerações e algumas desacelerações precoces */
  const e=new Engine({baseline:136,varAmp:11,accelPerHour:9,accelAmp:18,cInt:170,cDur:72,cAmp:52,tone:12,
    decelType:'early',decelProb:.45,decelDepth:18,ramp:5,varRamp:5,toneRamp:5,loss:0},20261127);
  e.run(HERO_WIN+60);return e;
}
function heroFacts(){
  const el=document.getElementById('heroFacts');if(!el)return;
  const nc=typeof CASES!=='undefined'?CASES.length:0,nr=typeof RECIPES!=='undefined'?RECIPES.length:0;
  el.innerHTML=[[nc,'casos clínicos'],[nr,'padrões de treino'],[552,'partos reais'],[3,'diretrizes']]
    .map(([v,l])=>`<div><dt>${v}</dt><dd>${l}</dd></div>`).join('');
  const ul=document.getElementById('homeCases');
  if(ul&&typeof CASES!=='undefined')ul.innerHTML=CASES.slice(0,5).map(c=>`<li><span class="cn">${esc(c.nome)}</span><span class="ci">${esc(c.gp)} · ${esc(c.ig)} sem</span><span class="cd d-${c.dif==='Básico'?1:c.dif==='Intermédio'?2:3}">${esc(c.dif)}</span></li>`).join('')+
    `<li class="more">e mais ${Math.max(0,CASES.length-5)} casos</li>`;
}
function heroDraw(){
  const cv=document.getElementById('cvHero');if(!cv||!HERO.eng)return;
  const {c,W,H}=fitCanvas(cv);const e=HERO.eng;
  c.clearRect(0,0,W,H);
  const padL=34,padR=14,fTop=10,fH=H*0.62,tTop=fTop+fH+16,tH=H-tTop-8;
  const tEnd=e.t,t0=tEnd-HERO_WIN,N=e.F.length;
  const x=t=>padL+(t-t0)/HERO_WIN*(W-padL-padR);
  const yF=v=>fTop+(1-(v-80)/(200-80))*fH;
  const yT=v=>tTop+(1-v/100)*tH;
  /* grelha discreta: 1 min na vertical, 20 bpm na horizontal; faixa 110–160 realçada */
  c.lineWidth=1;
  c.fillStyle='rgba(80,200,211,.06)';c.fillRect(padL,yF(160),W-padL-padR,yF(110)-yF(160));
  c.strokeStyle='rgba(255,255,255,.06)';c.beginPath();
  for(let v=80;v<=200;v+=20){const y=Math.round(yF(v))+.5;c.moveTo(padL,y);c.lineTo(W-padR,y)}
  for(let k=Math.ceil(t0/60)*60;k<=tEnd;k+=60){const xx=Math.round(x(k))+.5;c.moveTo(xx,fTop);c.lineTo(xx,fTop+fH);c.moveTo(xx,tTop);c.lineTo(xx,tTop+tH)}
  c.stroke();
  c.fillStyle='rgba(255,255,255,.38)';c.font='500 10.5px "Geist Mono",ui-monospace,monospace';c.textAlign='right';c.textBaseline='middle';
  for(const v of [100,140,180])c.fillText(v,padL-8,yF(v));
  /* traçado: gradiente que esbate o passado à esquerda */
  const grad=c.createLinearGradient(padL,0,W-padR,0);grad.addColorStop(0,'rgba(80,200,211,0)');grad.addColorStop(.18,'rgba(80,200,211,.75)');grad.addColorStop(1,'#7FE3EC');
  const i0=Math.max(0,Math.floor(t0/DT));
  c.strokeStyle=grad;c.lineWidth=1.7;c.lineJoin='round';c.beginPath();let pen=false;
  for(let i=i0;i<N;i++){const v=e.F[i];if(!isFinite(v)){pen=false;continue}const xx=x(i*DT),yy=yF(v);if(pen)c.lineTo(xx,yy);else{c.moveTo(xx,yy);pen=true}}
  c.stroke();
  const tg=c.createLinearGradient(padL,0,W-padR,0);tg.addColorStop(0,'rgba(232,184,109,0)');tg.addColorStop(.18,'rgba(232,184,109,.55)');tg.addColorStop(1,'rgba(232,184,109,.9)');
  c.strokeStyle=tg;c.lineWidth=1.4;c.beginPath();pen=false;
  for(let i=i0;i<N;i++){const v=e.T[i];if(!isFinite(v)){pen=false;continue}const xx=x(i*DT),yy=yT(Math.min(100,v));if(pen)c.lineTo(xx,yy);else{c.moveTo(xx,yy);pen=true}}
  c.stroke();
  /* ponto de escrita */
  const fl=e.F[N-1];if(isFinite(fl)){const px=x(tEnd),py=yF(fl);c.fillStyle='rgba(127,227,236,.18)';c.beginPath();c.arc(px,py,6,0,6.283);c.fill();c.fillStyle='#BFF4F8';c.beginPath();c.arc(px,py,2.4,0,6.283);c.fill()}
  /* leituras numéricas, atualizadas 2 vezes por segundo para se conseguirem ler */
  const now=performance.now();
  if(now-HERO.shown>500){HERO.shown=now;
    let s=0,n=0;for(let i=N-1;i>=Math.max(0,N-8);i--){if(isFinite(e.F[i])){s+=e.F[i];n++}}
    document.getElementById('hmF').textContent=n?Math.round(s/n):'—';
    const tv=e.T[N-1];document.getElementById('hmT').textContent=isFinite(tv)?Math.round(tv):'—';}
}
function heroLoop(ts){
  if(!HERO.on)return;
  const dt=HERO.last?Math.min(.1,(ts-HERO.last)/1000):0;HERO.last=ts;
  HERO.acc+=dt*HERO_SPEED;let n=Math.floor(HERO.acc/DT);HERO.acc-=n*DT;
  while(n-->0)HERO.eng.step();
  /* mantém a memória limitada: recomeça discretamente ao fim de ~3 h de traçado simulado */
  if(HERO.eng.F.length>3*3600/DT)HERO.eng=heroEngine();
  heroDraw();HERO.raf=requestAnimationFrame(heroLoop);
}
function heroRun(on){
  if(!HERO.eng){HERO.eng=heroEngine();heroFacts()}
  HERO.on=on&&!document.hidden;cancelAnimationFrame(HERO.raf);HERO.last=0;
  if(!on)return;
  if(reduceMotion()){heroDraw();return}
  HERO.raf=requestAnimationFrame(heroLoop);
}
document.addEventListener('visibilitychange',()=>heroRun(document.body.dataset.view==='inicio'));
window.addEventListener('resize',()=>{if(document.body.dataset.view==='inicio')heroDraw()});
document.addEventListener('click',ev=>{
  const a=ev.target.closest('a.mod[data-exam]');if(!a)return;
  setTimeout(()=>{const b=document.querySelector('#dMode button[data-m="exame"]');if(b)b.click()},0);
});
