/* Turno no bloco de partos: três salas em simultâneo, alertas, interrupções, olhos frescos, passagem de turno (SBAR) e relatório de fatores humanos. */
const TU={on:false,rooms:[],focus:0,run:false,speed:20,acc:0,t:0,last:0,raf:0,busy:null,modal:null,events:[],intr:[],fresh:[],hand:null,esc:[],unwatched:0,pauses:0,minTick:0,ended:false};
const TU_START=8*60;   // o turno começa às 08:00
const TU_DUR=150;      // minutos de turno
const TU_INTR=[
  ['Telefone da triagem','Uma grávida de 39 semanas com perdas de líquido acabou de chegar à urgência e precisa de ser vista.',6],
  ['Família da Sala {r}','O companheiro pede para falar consigo: quer saber se está tudo bem com o bebé.',3],
  ['Farmácia','A farmácia liga a pedir confirmação de uma prescrição de ocitocina mal preenchida.',2],
  ['Colega do internamento','Uma colega pede ajuda para interpretar um CTG de uma grávida internada.',5],
  ['Anestesiologia','O anestesista pergunta se pode avançar com uma analgesia epidural noutra sala.',2],
  ['Registos clínicos','Faltam registos da última hora na Sala {r}; a enfermeira-chefe pede que os complete.',4],
  ['Bloco operatório','O bloco pergunta se pode libertar a sala de cesarianas para uma cirurgia programada.',2],
];
const TU_REQ={avaliar:'Avaliação presencial',decidir:'Decisão sobre o parto',rever:'Revisão do traçado'};
const tuClock=m=>{const x=Math.round(TU_START+m);return String(Math.floor(x/60)%24).padStart(2,'0')+':'+String(x%60).padStart(2,'0')};
const tuNow=()=>TU.t/60;   // minutos de turno

function tuPick(){
  const adv=CASES.filter(c=>c.dif==='Avançado'),rest=CASES.filter(c=>c.dif!=='Avançado');
  const sh=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  return[...sh(adv).slice(0,1),...sh(rest).slice(0,1),...sh(CASES.filter(c=>c.dif==='Avançado'||c.dif==='Intermédio')).slice(0,3)].filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i).slice(0,3);
}
function tuStart(){
  const cs=tuPick();
  if(typeof sndClear==='function')sndClear('turno');
  TU.rooms=cs.map((c,i)=>{const sim=new LabourSim(c,{mode:'avaliacao',seed:Math.floor(Math.random()*1e9)});sim._snd=true;sim.e._alog=[];const R0={i,cs:c,sim,alerts:[],lastFocus:0,unread:0};
    sim.onMsg=(it,o)=>{if(TU.on&&(o.pause||it.kind==='call')&&!sim.ended){R0.alerts.push({tm:tuNow(),it,seen:TU.focus===i?tuNow():null});if(TU.focus!==i)R0.unread++;tuTicker(R0,it)}};
    sim.onEnd=()=>{TU.events.push({tm:tuNow(),r:i,t:'fim'});tuCheckEnd()};
    sim.clock=function(t){return tuClock(this.tmin(t))};sim.feed.forEach(it=>it.clock=tuClock(it.tm));
    sim.msg('Enf.ª',`Passagem de turno: ${c.nome}, ${c.idade} anos, ${c.gp}, ${c.ig} semanas. ${c.admissao}`);return R0});
  Object.assign(TU,{on:true,focus:0,run:true,acc:0,t:0,last:0,busy:null,events:[],intr:[],fresh:[],hand:null,esc:[],unwatched:0,pauses:0,minTick:0,ended:false,
    plan:{intr:[12+Math.random()*8,38+Math.random()*10,66+Math.random()*10,95+Math.random()*12,120+Math.random()*10].map((m,k)=>({m,k:Math.floor(Math.random()*TU_INTR.length)})),fresh:[45,105],hand:75}});
  $('wPick').style.display='none';$('wRun').style.display='none';$('wDeb').style.display='none';$('tsRun').style.display='';
  tuRender();tuFocus(0);cancelAnimationFrame(TU.raf);TU.raf=requestAnimationFrame(tuLoop);window.scrollTo({top:0});
}
function tuRender(){
  $('tsRun').innerHTML=`<div class="card tsbar"><div><h2 style="margin:0">Turno no bloco de partos</h2><div class="small">Três salas ao mesmo tempo. O tempo não para com as mensagens: escolha onde olhar.</div></div>
    <div class="tsclock mono" id="tsClock">08:00</div>
    <div class="seg" id="tsSpeed"><button data-s="10">×10</button><button data-s="20" class="on">×20</button><button data-s="40">×40</button></div>
    <span data-sndslot></span><button class="btn" id="tsPlay">Pausar</button><button class="btn" id="tsQuit">Terminar turno</button></div>
   <div class="tsticker" id="tsTicker" aria-live="polite"></div>
   <div class="tsgrid"><div class="tsrooms" id="tsRooms">${TU.rooms.map(r=>`<button class="troom" data-r="${r.i}"><div class="trh"><b>Sala ${r.i+1}</b><span class="tral" id="tral${r.i}"></span><span class="trb" id="trb${r.i}"></span></div><div class="trn">${esc(r.cs.nome)}</div><canvas class="trcv" id="trcv${r.i}"></canvas><div class="trs small" id="trs${r.i}"></div></button>`).join('')}</div>
    <div class="tsfocus"><div class="card panel"><div class="tfh"><h2 id="tfName" style="margin:0"></h2><span class="small" id="tfMeta"></span></div></div>
      <div class="alarmbar" id="tfAlarm" aria-live="assertive"></div>
      <div class="card paperwrap"><canvas class="ctg" id="tfCv"></canvas></div>
      <div class="tfgrid"><div class="card panel"><h3>Ações</h3><div id="tfActs" class="tfacts"></div></div><div class="card panel"><h3>Mensagens da sala</h3><div id="tfFeed" class="tffeed"></div></div></div></div></div>
   <div class="tsbusy" id="tsBusy"></div>`;
  $('tsRooms').onclick=e=>{const b=e.target.closest('.troom');if(b&&!TU.busy)tuFocus(+b.dataset.r)};
  $('tsSpeed').onclick=e=>{const b=e.target.closest('button');if(!b)return;TU.speed=+b.dataset.s;document.querySelectorAll('#tsSpeed button').forEach(x=>x.classList.toggle('on',x===b))};
  $('tsPlay').onclick=()=>{TU.run=!TU.run;if(!TU.run)TU.pauses++;$('tsPlay').textContent=TU.run?'Pausar':'Retomar'};
  $('tsQuit').onclick=e=>{const b=e.target;if(!b.dataset.c){b.dataset.c=1;b.textContent='Confirmar: terminar';return}tuEnd('Turno terminado pelo utilizador.')};
  $('tfActs').innerHTML=ACTS.map(([g,list])=>`<div class="agrp"><h4>${g}</h4><div class="abtns">${list.filter(([id])=>id!=='sonda2'||TU.rooms[TU.focus].cs.twin).map(([id,l])=>`<button data-a="${id}" class="${['ces1','ces2','inst'].includes(id)?'dec':''}">${l}</button>`).join('')}</div></div>`).join('');
  $('tfActs').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled||TU.busy)return;tuAct(b.dataset.a)};
}
function tuFocus(i){
  const R0=TU.rooms[i];TU.focus=i;R0.lastFocus=tuNow();R0.unread=0;R0.alerts.forEach(a=>{if(a.seen==null)a.seen=tuNow()});
  document.querySelectorAll('.troom').forEach(b=>b.classList.toggle('on',+b.dataset.r===i));
  const c=R0.cs;$('tfName').textContent=`Sala ${i+1} · ${c.nome}`;$('tfMeta').textContent=`${c.idade} anos · ${c.gp} · ${c.ig} semanas · ${c.tag}`;
  tuUI(true);
}
function tuAct(id){
  const R0=TU.rooms[TU.focus],sim=R0.sim;if(sim.ended)return;
  if(id==='ajuda'&&sim.avail('ajuda').ok)return tuSBAR(R0,'esc',()=>{sim.act(id);tuUI(true)});
  if(['ces1','ces2','inst'].includes(id)){if(!sim.avail(id).ok)return;
    return tuModal('Confirmar decisão de parto',`<p><b>${esc(ACT_LABEL[id])}</b> na Sala ${R0.i+1}, às ${tuClock(tuNow())}.</p><p class="small">A decisão não pode ser revertida.</p>`,[['Cancelar',null],['Confirmar',()=>{sim.act(id);tuUI(true)},'pri']],false)}
  const r=sim.act(id);if(r)tuUI(true);
}
function tuTicker(R0,it){const el=document.getElementById('tsTicker');if(!el)return;
  el.innerHTML=`<button class="tkr" data-r="${R0.i}"><b>Sala ${R0.i+1}</b> · ${esc(it.who)}: ${esc(it.text.length>140?it.text.slice(0,140)+'…':it.text)}</button>`;el.classList.add('on');
  el.querySelector('.tkr').onclick=()=>{if(!TU.busy)tuFocus(R0.i)};clearTimeout(el._h);el._h=setTimeout(()=>el.classList.remove('on'),9000)}

/* ---------- ciclo ---------- */
function tuLoop(ts){
  if(!TU.on)return;
  const dt=TU.last?Math.min(.1,(ts-TU.last)/1000):0;TU.last=ts;
  if(TU.run&&!TU.modal&&!TU.ended){
    TU.acc+=dt*TU.speed;let n=Math.min(6000,Math.floor(TU.acc/DT));TU.acc-=n*DT;
    while(n-->0&&!TU.ended){TU.t+=DT;for(const R0 of TU.rooms)if(!R0.sim.ended)R0.sim.step();
      if(TU.t-TU.minTick>=60){TU.minTick=TU.t;tuMinute()}}
  }
  tuUI(false);tuSound();TU.raf=requestAnimationFrame(tuLoop);
}
/* som do turno: batimento só da sala em foco; alarmes de todas as salas, mesmo durante uma interrupção */
function tuSound(){
  if(typeof sndHeart!=='function')return;
  const going=TU.run&&!TU.modal&&!TU.ended&&!document.hidden&&$('v-sala').classList.contains('on');
  const F=TU.rooms[TU.focus];sndHeart('turno',F&&!F.sim.ended&&!TU.busy?F.sim.e.F[F.sim.e.F.length-1]:0,going);
  for(const R0 of TU.rooms){const k='turno-'+R0.i,L=R0.sim.ended?[]:sndAlarmUpdate(k,R0.sim.e,R0.i,going);
    const el=$('tral'+R0.i);if(el){const un=L.filter(a=>!a.ack);el.className='tral'+(L.length?' on p-'+(L.some(a=>a.prio==='alta')?'alta':L.some(a=>a.prio==='media')?'media':'baixa'):'')+(L.length&&!un.length?' ack':'');el.textContent=L.length?(un.length?'Alarme':'Silenciado'):''}
    if(R0.i===TU.focus)sndBar($('tfAlarm'),L,k)}
}
/* uma vez por minuto de turno: vigilância não feita, interrupções e tarefas programadas */
function tuMinute(){
  const m=tuNow();
  for(const R0 of TU.rooms){if(R0.sim.ended)continue;if(TU.focus===R0.i&&!TU.busy){R0.lastFocus=m;continue}
    if(m-R0.lastFocus>15){const tr=R0.sim.truth();if(tr.figo==='P'){TU.unwatched++;R0.unw=(R0.unw||0)+1}}}
  if(TU.busy&&m>=TU.busy.until){TU.busy=null;$('tsBusy').classList.remove('on');tuFocus(TU.focus)}
  const pi=TU.plan.intr.find(x=>!x.done&&m>=x.m);if(pi&&!TU.busy){pi.done=true;tuInterrupt(pi.k)}
  const pf=TU.plan.fresh.find(x=>typeof x==='number'&&m>=x);if(pf!=null&&!TU.busy){TU.plan.fresh=TU.plan.fresh.filter(x=>x!==pf);tuFresh()}
  if(TU.plan.hand&&m>=TU.plan.hand&&!TU.busy){TU.plan.hand=null;tuHandover()}
  if(m>=TU_DUR)tuEnd('Fim do turno.');
}
function tuUI(force){
  const now=performance.now();if(!force&&now-(TU._ui||0)<250)return;TU._ui=now;
  const cl=document.getElementById('tsClock');if(!cl)return;cl.textContent=tuClock(tuNow());
  for(const R0 of TU.rooms){const e=R0.sim.e;drawCTG($('trcv'+R0.i),e,{tEnd:e.t,win:10*MIN,compact:true});
    const st=R0.sim.st;$('trs'+R0.i).textContent=R0.sim.ended?(R0.sim.outcome&&R0.sim.outcome.born?'Parto concluído':'Terminado'):`${Math.floor(st.dil)} cm · ${st.pushing?'puxos':st.membr==='íntegras'?'membranas íntegras':'membranas rotas'}${st.oxy?` · ocitocina ${st.oxy} mU/min`:''}`;
    const b=$('trb'+R0.i);b.textContent=R0.unread?`${R0.unread} alerta${R0.unread>1?'s':''}`:'';b.classList.toggle('on',!!R0.unread)}
  const R0=TU.rooms[TU.focus];if(!R0)return;const sim=R0.sim,e=sim.e;
  drawCTG($('tfCv'),e,{tEnd:e.t,win:20*MIN,clock:t=>sim.clock(t),marks:true,mhr:e.p.showMhr});
  document.querySelectorAll('#tfActs button').forEach(b=>{const a=sim.avail(b.dataset.a);b.disabled=!a.ok||!!TU.busy;b.title=a.ok?'':a.why||''});
  const n=sim.feed.length+sim.acts.length;if(force||n!==R0._fn){R0._fn=n;
    const items=[...sim.feed.map(x=>({...x,_k:'f'})),...sim.acts.map(a=>({...a,_k:'a'}))].sort((a,b)=>b.tm-a.tm).slice(0,12);
    $('tfFeed').innerHTML=items.map(x=>x._k==='a'?`<div class="fi act"><span class="c">${x.clock}</span> <b>${esc(x.lab)}</b></div>`:`<div class="fi ${x.kind==='call'?'call':''}"><span class="c">${x.clock}</span> <b>${esc(x.who)}</b> ${esc(x.text)}</div>`).join('')}
}

/* ---------- interrupções ---------- */
function tuInterrupt(k){
  const [who,txt0,mins]=TU_INTR[k],r=1+Math.floor(Math.random()*3),txt=txt0.replace('{r}',r);
  const rec={tm:tuNow(),who,mins,handled:null};TU.intr.push(rec);
  tuModal(who,`<p>${esc(txt)}</p><p class="small">Tratar agora ocupa-a cerca de ${mins} min, durante os quais não vê as salas. As salas continuam a evoluir.</p>`,
    [['Pedir a um colega / mais tarde',()=>{rec.handled='delegou'}],['Tratar agora',()=>{rec.handled='tratou';TU.busy={until:tuNow()+mins,what:who};$('tsBusy').innerHTML=`<div><b>${esc(who)}</b><p>Está fora das salas durante ${mins} min. O tempo continua a correr.</p></div>`;$('tsBusy').classList.add('on');tuUI(true)},'pri']],true);
}
/* ---------- modal próprio do turno; «live» = o tempo continua a correr ---------- */
function tuModal(title,body,btns,live){
  let m=document.getElementById('tsModal');if(!m){m=document.createElement('div');m.id='tsModal';m.className='accm';document.body.appendChild(m)}
  m.innerHTML=`<div class="accbox tsmbox" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div class="tsmb">${body}</div><div class="accrow">${btns.map((b,k)=>`<button class="btn ${b[2]||''}" data-k="${k}">${esc(b[0])}</button>`).join('')}</div></div>`;
  m.classList.add('on');if(!live)TU.modal=true;
  m.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const f=btns[+b.dataset.k][1];if(f&&f(m)===false)return;m.classList.remove('on');TU.modal=false});
}
/* ---------- avaliação estruturada (olhos frescos, passagem, escalada) ---------- */
const TU_PLAN={vigiar:'Manter vigilância',corrigir:'Corrigir causas reversíveis',adicionais:'Métodos adicionais',acelerar:'Acelerar o parto',parto_imediato:'Parto imediato'};
function tuForm(pref,i){return`<div class="tsf"><label>Classificação (FIGO)<select name="${pref}f${i}"><option value="">—</option>${Object.entries(FIGO_L).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  <label>Interpretação<select name="${pref}m${i}"><option value="">—</option>${Object.entries(MECH_L).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  <label>Plano<select name="${pref}p${i}"><option value="">—</option>${Object.entries(TU_PLAN).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label></div>`}
function tuGrade(R0,f,m,p){const t=R0.sim.truth();return{f:f===t.figo,m:t.mech.includes(m),p:t.plan.includes(p),t:{figo:t.figo,mech:t.mech,plan:t.plan}}}
function tuFresh(){
  const live=TU.rooms.filter(r=>!r.sim.ended);if(!live.length)return;
  const R0=live.slice().sort((a,b)=>a.lastFocus-b.lastFocus)[0];
  tuModal(`Olhos frescos · Sala ${R0.i+1}`,`<p>Um colega pede-lhe uma segunda leitura do traçado da Sala ${R0.i+1} (${esc(R0.cs.nome)}). O tempo fica parado enquanto revê.</p><canvas class="tsmcv" id="tsFcv"></canvas>${tuForm('fe',0)}<p class="ferr" id="tsFerr"></p>`,
    [['Registar revisão',m=>{const g=n=>m.querySelector(`[name=${n}]`).value;const f=g('fef0'),me=g('fem0'),p=g('fep0');if(!f||!me||!p){$('tsFerr').textContent='Preencha os três campos.';return false}
      const r=tuGrade(R0,f,me,p);TU.fresh.push({tm:tuNow(),r:R0.i,...r});R0.lastFocus=tuNow();R0.sim.msg('Olhos frescos',`Revisão por segunda leitura: ${FIGO_L[f].toLowerCase()}; ${MECH_L[me].toLowerCase()}; plano: ${TU_PLAN[p].toLowerCase()}.`,{kind:'sys'})},'pri']],false);
  setTimeout(()=>{const e=R0.sim.e;drawCTG($('tsFcv'),e,{tEnd:e.t,win:30*MIN,clock:t=>R0.sim.clock(t)})},30);
}
function tuHandover(){
  const live=TU.rooms.filter(r=>!r.sim.ended);if(!live.length)return;
  tuModal('Passagem de turno (SBAR)',`<p>Chega a colega que fica com as salas. Para cada sala, diga a situação, a sua avaliação e a recomendação. O tempo fica parado.</p>
    ${live.map(R0=>`<div class="tsho"><h4>Sala ${R0.i+1} · ${esc(R0.cs.nome)}</h4>${tuForm('ho',R0.i)}</div>`).join('')}<p class="ferr" id="tsHerr"></p>`,
    [['Passar o turno',m=>{const res=[];for(const R0 of live){const g=n=>m.querySelector(`[name=${n}${R0.i}]`).value;const f=g('hof'),me=g('hom'),p=g('hop');
        if(!f||!me||!p){$('tsHerr').textContent='Preencha todos os campos de todas as salas.';return false}res.push({r:R0.i,...tuGrade(R0,f,me,p)})}
      TU.hand={tm:tuNow(),res}},'pri']],false);
}
function tuSBAR(R0,kind,then){
  tuModal(`Chamar o obstetra sénior · Sala ${R0.i+1}`,`<p>Ao telefone, em formato SBAR: o que se passa, como interpreta e o que pede.</p>${tuForm('es',0).replace('Plano<','O que pede (plano)<')}
    <label class="tsf1">Pedido<select name="esq"><option value="">—</option>${Object.entries(TU_REQ).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label><p class="ferr" id="tsEerr"></p>`,
    [['Cancelar',null],['Ligar',m=>{const g=n=>m.querySelector(`[name=${n}]`).value;const f=g('esf0'),me=g('esm0'),p=g('esp0'),q=g('esq');
      if(!f||!me||!p||!q){$('tsEerr').textContent='Preencha os quatro campos.';return false}
      TU.esc.push({tm:tuNow(),r:R0.i,q,...tuGrade(R0,f,me,p)});then()},'pri']],false);
}

/* ---------- fim e relatório ---------- */
function tuCheckEnd(){if(TU.rooms.every(r=>r.sim.ended))setTimeout(()=>tuEnd('Todas as salas terminaram.'),800)}
function tuEnd(reason){
  if(TU.ended)return;TU.ended=true;TU.run=false;
  for(const R0 of TU.rooms)if(!R0.sim.ended)R0.sim.finish('Fim do turno.');
  cancelAnimationFrame(TU.raf);TU.on=false;const m=document.getElementById('tsModal');if(m)m.classList.remove('on');
  const rooms=TU.rooms.map(R0=>{const ev=evaluate(R0.sim),o=R0.sim.outcome;
    /* no turno, a revisão sistemática é feita pelos olhos frescos e pela passagem; sem parto, conta o pH fetal no fim do turno */
    ev.crit=ev.crit.filter(c=>!/^Revisão sistemática/.test(c.k));ev.cPct=ev.crit.length?ev.crit.filter(c=>c.ok).length/ev.crit.length:1;
    const born=o&&o.born,phf=born?o.pHa:R0.sim.st.pH;if(!born)ev.oPts=phf>=7.2?30:phf>=7.1?22:phf>=7.0?12:0;
    const sc=Math.round(ev.cPct*60+ev.oPts/30*40);
    const al=R0.alerts,seen=al.filter(a=>a.seen!=null);return{R0,ev,o,phf,born,sc,al:al.length,lat:seen.length?seen.reduce((s,a)=>s+(a.seen-a.tm),0)/seen.length:null,miss:al.length-seen.length,unw:R0.unw||0}});
  const pct=(a,b)=>b?Math.round(a/b*100):null;
  const allAl=rooms.reduce((s,r)=>s+r.al,0),seenAl=rooms.flatMap(r=>r.R0.alerts.filter(a=>a.seen!=null)),lat=seenAl.length?seenAl.reduce((s,a)=>s+(a.seen-a.tm),0)/seenAl.length:null;
  const gradeP=L=>{const n=L.length*3;return n?pct(L.reduce((s,x)=>s+x.f+x.m+x.p,0),n):null};
  const handL=TU.hand?TU.hand.res:[],fr=gradeP(TU.fresh),ho=gradeP(handL),es=gradeP(TU.esc);
  const roomAvg=Math.round(rooms.reduce((s,r)=>s+r.sc,0)/rooms.length);
  const alertSc=allAl?Math.max(0,100-(lat||0)*8-(allAl-seenAl.length)*20):100;
  const hfParts=[alertSc,fr,ho,es].filter(x=>x!=null),hf=Math.round(Math.max(0,hfParts.reduce((s,x)=>s+x,0)/hfParts.length-TU.unwatched*1.5));
  const total=Math.round(roomAvg*.5+hf*.5);
  const rec={d:Date.now(),score:total,salas:roomAvg,fh:hf,lat:lat==null?null:Math.round(lat*10)/10,unw:TU.unwatched,intr:TU.intr.filter(x=>x.handled==='tratou').length,ho,fr,es,cases:rooms.map(r=>({id:r.R0.cs.id,sc:r.sc,ph:Math.round(r.phf*100)/100,born:!!r.born}))};
  const h=store('ctg-turno')||[];h.push(rec);store('ctg-turno',h.slice(-100));if(typeof accPush==='function')accPush('turno',rec);
  const fmt=v=>v==null?'—':v+'%';
  $('tsRun').innerHTML=`<div class="card panel"><div class="tdh"><div><h2 style="margin:0">Relatório do turno</h2><p class="small" style="margin:2px 0 0">${esc(reason)} ${tuClock(0)}–${tuClock(tuNow())}</p></div>
      <div class="tdact"><button class="btn pri" id="tsAgain">Novo turno</button><button class="btn" id="tsBack">Voltar às salas</button></div></div>
    <div class="tsscore"><div><span class="mono">${total}</span><small>pontuação do turno</small></div><div><span class="mono">${roomAvg}</span><small>cuidados nas salas</small></div><div><span class="mono">${hf}</span><small>fatores humanos</small></div></div>
    <h3>Salas</h3><table class="hist"><thead><tr><th>Sala</th><th>Caso</th><th>Desfecho</th><th>Pontuação</th><th>Alertas</th><th>Tempo até ver</th><th>Min. patológico sem olhar</th><th>A rever</th></tr></thead><tbody>
    ${rooms.map(r=>`<tr><td>${r.R0.i+1}</td><td>${esc(r.R0.cs.nome)}<br><span class="small">${esc(r.R0.cs.tag)}</span></td><td>${r.born?`Nasceu · pH ${r.phf.toFixed(2).replace('.',',')}`:`Sem parto no turno<br><span class="small">pH fetal estimado ${r.phf.toFixed(2).replace('.',',')}</span>`}</td><td class="n">${r.sc}</td><td class="n">${r.al}${r.miss?` <span class="qwarn">(${r.miss} por ver)</span>`:''}</td><td class="n">${r.lat==null?'—':num(r.lat,1)+' min'}</td><td class="n">${r.unw}</td>
      <td class="small">${r.ev.crit.filter(c=>!c.ok).slice(0,2).map(c=>esc(c.k)).join('; ')||'—'}</td></tr>`).join('')}</tbody></table>
    <h3 style="margin-top:16px">Fatores humanos</h3><div class="sgrid">
      <div><div class="k">Resposta a alertas</div><div class="v">${lat==null?'—':num(lat,1)+' min'}</div><div class="s">tempo médio até abrir a sala (${seenAl.length} de ${allAl} vistos)</div></div>
      <div><div class="k">Patológico sem vigilância</div><div class="v">${TU.unwatched} min</div><div class="s">traçado patológico numa sala que não via há mais de 15 min</div></div>
      <div><div class="k">Olhos frescos</div><div class="v">${fmt(fr)}</div><div class="s">classificação, interpretação e plano certos</div></div>
      <div><div class="k">Passagem de turno (SBAR)</div><div class="v">${fmt(ho)}</div><div class="s">campos certos em todas as salas</div></div>
      <div><div class="k">Escalada ao sénior</div><div class="v">${fmt(es)}</div><div class="s">${TU.esc.length} chamada(s) estruturada(s)</div></div>
      <div><div class="k">Interrupções</div><div class="v">${TU.intr.filter(x=>x.handled==='tratou').length}/${TU.intr.length}</div><div class="s">tratadas por si; as restantes foram delegadas</div></div></div>
    <p class="small" style="margin-top:12px">Os relatórios sobre segurança no parto apontam repetidamente a perda de consciência situacional e o trabalho em equipa como causas de atraso perante sinais de compromisso fetal. Este turno treina exatamente isso: onde olhar, quando largar uma interrupção, como passar a informação e como pedir ajuda.</p></div>`;
  $('tsAgain').onclick=tuStart;$('tsBack').onclick=()=>{$('tsRun').style.display='none';$('wPick').style.display=''};
}
