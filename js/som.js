/* Som do monitor: batimento fetal tipo Doppler, alarmes com padrões de prioridade (inspirados na IEC 60601-1-8),
   telefone da equipa, notificações e bomba de perfusão. Tudo sintetizado com Web Audio, sem ficheiros. */
const SND={mode:store('ctg-som')||'tudo',ctx:null,out:null,noise:null,next:{},al:{},lastPlay:{},beats:0,played:[]};
const SND_LAB={off:'Sem som',alarmes:'Alarmes e chamadas',tudo:'Som completo'};
function sndCtx(make){
  if(!SND.ctx){if(!make)return null;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    try{SND.ctx=new C()}catch(e){return null}
    SND.out=SND.ctx.createGain();SND.out.gain.value=.55;const comp=SND.ctx.createDynamicsCompressor();SND.out.connect(comp);comp.connect(SND.ctx.destination);
    const n=SND.ctx.sampleRate,b=SND.ctx.createBuffer(1,n,n),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;SND.noise=b}
  if(SND.ctx.state==='suspended')SND.ctx.resume().catch(()=>{});
  return SND.ctx;
}
/* os navegadores só deixam tocar depois de um gesto do utilizador */
['pointerdown','keydown'].forEach(t=>document.addEventListener(t,()=>{if(SND.mode!=='off')sndCtx(true)},{capture:true,passive:true}));
function sndLog(k){SND.played.push(k);if(SND.played.length>200)SND.played.shift()}

/* ---------- sons elementares ---------- */
function sndTone(t,f,dur,vol,type='sine',harm){
  const c=SND.ctx,g=c.createGain();g.connect(SND.out);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.setValueAtTime(vol,t+dur-.03);g.gain.linearRampToValueAtTime(0,t+dur);
  (harm||[1]).forEach((h,i)=>{const o=c.createOscillator(),gg=c.createGain();o.type=type;o.frequency.value=f*(i+1);gg.gain.value=h;o.connect(gg);gg.connect(g);o.start(t);o.stop(t+dur+.02)});
}
/* um ciclo cardíaco ao Doppler: dois sopros curtos (abertura e fecho valvular) com um baque grave */
function sndBeat(t,f){
  const c=SND.ctx,cyc=60/f;
  [[0,1,.11],[.2*cyc+.04,.55,.08]].forEach(([dt,a,len])=>{
    const s=c.createBufferSource();s.buffer=SND.noise;s.playbackRate.value=.9+Math.random()*.2;
    const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=420+f*.8;bp.Q.value=1.4;
    const g=c.createGain(),t0=t+dt;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.55*a,t0+.018);g.gain.exponentialRampToValueAtTime(.001,t0+len);
    s.connect(bp);bp.connect(g);g.connect(SND.out);s.start(t0,Math.random()*.5,len+.05);
  });
  const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(60,t+.09);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g);g.connect(SND.out);o.start(t);o.stop(t+.14);
  SND.beats++;
}
/* padrões de alarme: alta = 10 impulsos (3+2, pausa, 3+2); média = 3 impulsos; baixa = 2 impulsos graves */
function sndAlarmPattern(prio){
  const c=sndCtx(),t=c.currentTime+.03,H=[1,.5,.35,.25,.15];
  if(prio==='alta'){const seq=[0,.13,.26,.52,.65,1.45,1.58,1.71,1.97,2.1];seq.forEach(d=>sndTone(t+d,523,.1,.22,'triangle',H))}
  else if(prio==='media'){[0,.2,.4].forEach(d=>sndTone(t+d,440,.16,.2,'triangle',H))}
  else{[0,.3].forEach(d=>sndTone(t+d,330,.2,.16,'triangle',H))}
  sndLog('alarme-'+prio);
}
function sndPhone(){const c=sndCtx();if(!c)return;const t=c.currentTime+.03;
  for(const s of [0,1.2]){for(let k=0;k<16;k++){const tt=t+s+k*.05;sndTone(tt,440,.045,.09);sndTone(tt,480,.045,.09)}}sndLog('telefone')}
function sndChime(){const c=sndCtx();if(!c)return;const t=c.currentTime+.02;sndTone(t,880,.13,.12);sndTone(t+.14,660,.2,.1);sndLog('mensagem')}
function sndPump(){const c=sndCtx();if(!c)return;const t=c.currentTime+.02;sndTone(t,2000,.07,.08,'square');sndTone(t+.12,2000,.07,.08,'square');sndLog('bomba')}

/* ---------- batimento contínuo ---------- */
function sndHeart(key,f,active){
  const c=SND.ctx;
  if(!c||!active||SND.mode!=='tudo'||!(f>=40)){SND.next[key]=0;return}
  const now=c.currentTime;let nx=SND.next[key]||0;if(nx<now-.25)nx=now+.06;
  while(nx<now+.2){sndBeat(nx,f);nx+=60/f}SND.next[key]=nx;
}

/* ---------- alarmes do monitor (avaliados em tempo de simulação) ---------- */
/* início exige o critério durante o atraso; o alarme só desliga quando a FCF sai claramente da zona (histerese) */
function sndAlarmsFor(e,act={}){
  const F=e.F,n=F.length;if(n<20)return[];
  const win=s=>F.slice(Math.max(0,n-Math.round(s/DT))),ok=a=>a.filter(v=>!isNaN(v));
  const frac=(a,fn)=>{const v=ok(a);return v.length?v.filter(fn).length/v.length:0};
  const med=a=>{const v=ok(a).sort((x,y)=>x-y);return v.length?v[v.length>>1]:NaN};
  const full=(a,s)=>a.length>=Math.round(s/DT)-1,out=[];
  const w30=win(30),w10=win(10);
  const lost=act.sinal?ok(w10).length<w10.length*.5:full(w30,30)&&ok(w30).length===0;
  if(lost)out.push({id:'sinal',prio:'baixa',lab:'Perda de sinal fetal'});
  else{
    const w180=win(180),w60=win(60),w20=win(20);
    const bradi=act.bradi?med(w30)<110:full(w180,180)&&ok(w180).length>w180.length*.5&&frac(w180,v=>v<100)>=.9;
    if(bradi)out.push({id:'bradi',prio:'alta',lab:'FCF < 100 bpm há mais de 3 min'});
    else if(act.baixa?med(w20)<115:full(w60,60)&&ok(w60).length>w60.length*.6&&frac(w60,v=>v<110)>=.9)out.push({id:'baixa',prio:'media',lab:'FCF < 110 bpm há mais de 1 min'});
    const w120=win(120);
    if(act.alta?med(w60)>155:full(w120,120)&&ok(w120).length>w120.length*.6&&frac(w120,v=>v>160)>=.9)out.push({id:'alta',prio:'media',lab:'FCF > 160 bpm há mais de 2 min'});
  }
  return out;
}
const PRIO={alta:3,media:2,baixa:1};
/* key identifica a fonte (sala, turno-0…); devolve os alarmes ativos dessa fonte */
function sndAlarmUpdate(key,e,room,running){
  const st=SND.al[key]||(SND.al[key]={}),cur=sndAlarmsFor(e,st);
  for(const id in st)if(!cur.some(a=>a.id===id))delete st[id];
  for(const a of cur){if(!st[a.id]){st[a.id]={...a,ack:false,t:e.t,room};if(e._alog)e._alog.push({t:e.t,id:a.id,lab:a.lab,prio:a.prio})}}
  const list=Object.values(st);
  if(running&&SND.mode!=='off'&&SND.ctx){
    const top=list.filter(a=>!a.ack).sort((a,b)=>PRIO[b.prio]-PRIO[a.prio])[0];
    if(top){const k=key+top.id,last=SND.lastPlay[k]||0,now=SND.ctx.currentTime,every=top.prio==='alta'?5.5:top.prio==='media'?9:1e9;
      if(now-last>=every){SND.lastPlay[k]=now;sndAlarmPattern(top.prio)}}
  }
  return list;
}
function sndAck(key){const st=SND.al[key];if(st)for(const id in st)st[id].ack=true}
function sndClear(prefix){for(const k in SND.al)if(k.startsWith(prefix)){delete SND.al[k]}for(const k in SND.lastPlay)if(k.startsWith(prefix))delete SND.lastPlay[k];SND.next={}}
/* faixa de alarmes no monitor; só redesenha quando muda */
function sndBar(el,list,key){
  if(!el)return;const sig=list.map(a=>a.id+a.ack).join();if(el.dataset.sig===sig)return;el.dataset.sig=sig;
  if(!list.length){el.innerHTML='';el.className='alarmbar';return}
  const top=list.slice().sort((a,b)=>PRIO[b.prio]-PRIO[a.prio])[0],unack=list.some(a=>!a.ack);
  el.className=`alarmbar on p-${top.prio}${unack?'':' ack'}`;
  el.innerHTML=`<span class="ad" aria-hidden="true"></span><span class="at">${list.map(a=>esc(a.lab)).join(' · ')}</span>${unack?`<button class="abtn" type="button" data-ack="${key}">Silenciar</button>`:'<span class="aack">Silenciado</span>'}`;
}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-ack]');if(b){sndAck(b.dataset.ack);ev.stopPropagation()}},true);

/* ---------- mensagens e bomba: ligados às simulações com som ---------- */
if(typeof LabourSim!=='undefined'){
  const _msg=LabourSim.prototype.msg,_act=LabourSim.prototype.act;
  LabourSim.prototype.msg=function(who,text,o={}){const it=_msg.call(this,who,text,o);
    if(this._snd&&SND.mode!=='off'&&this.tmin()>=0&&!this.ended){if(it.kind==='call')sndPhone();else if(SND.mode==='tudo'&&!/registo horário/.test(who))sndChime()}return it};
  LabourSim.prototype.act=function(id,...r){const v=_act.call(this,id,...r);if(this._snd&&SND.mode==='tudo'&&/^oxy_/.test(id))sndPump();return v};
}

/* ---------- seletor de som (há um em cada vista com monitor) ---------- */
function sndSegHTML(){return`<div class="seg sndseg" role="group" aria-label="Som do monitor">${['off','alarmes','tudo'].map(m=>`<button type="button" data-snd="${m}" class="${SND.mode===m?'on':''}" title="${SND_LAB[m]}">${m==='off'?'<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="M13 7l5 6M18 7l-5 6" stroke="currentColor" stroke-width="1.6"/></svg>':m==='alarmes'?'Alarmes':'<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="M13 7.5a4 4 0 010 5M15.5 5.5a7 7 0 010 9" fill="none" stroke="currentColor" stroke-width="1.6"/></svg> Tudo'}</button>`).join('')}</div>`}
function sndSet(m){SND.mode=m;store('ctg-som',m);if(m!=='off')sndCtx(true);else SND.next={};
  document.querySelectorAll('.sndseg button').forEach(b=>b.classList.toggle('on',b.dataset.snd===m));
  if(typeof toast==='function')toast(SND_LAB[m])}
document.addEventListener('click',ev=>{const b=ev.target.closest('.sndseg button');if(b)sndSet(b.dataset.snd)});
function sndMount(){document.querySelectorAll('[data-sndslot]').forEach(el=>{if(!el.firstChild)el.innerHTML=sndSegHTML()})}
sndMount();
