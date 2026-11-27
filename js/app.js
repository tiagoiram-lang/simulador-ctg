/* Interface: sala de partos, treino rápido, resultados, navegação */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=(v,d=1)=>String(Math.round(v*10**d)/10**d).replace('.',',');
const VAR_L={normal:'Normal (5–25 bpm)',reduzida:'Reduzida (<5 bpm)',aumentada:'Aumentada (>25 bpm)',sinusoidal:'Padrão sinusoidal'};
const DEC_L={ausentes:'Ausentes',precoces:'Precoces',variaveis:'Variáveis',tardias:'Tardias',prolongada:'Prolongada (>3 min)'};
const FIGO_L={N:'Normal',S:'Suspeito',P:'Patológico',X:'Não interpretável'};
const MECH_L={sem:'Sem hipoxia',aguda:'Hipoxia aguda',subaguda:'Hipoxia subaguda',gradual:'Hipoxia de evolução gradual',cronica:'Hipoxia crónica',nao_hipoxica:'Causa não hipóxica (fármacos, sono, infeção, anemia)',materno:'Sinal materno / não fetal'};
const PLAN_L={vigiar:'Manter vigilância',corrigir:'Corrigir causas reversíveis e reavaliar',adicionais:'Métodos adicionais (estimulação, lactato)',acelerar:'Acelerar o parto',parto_imediato:'Parto imediato',confirmar:'Confirmar a origem do sinal'};
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');localStorage.setItem(k,JSON.stringify(v))}catch(_){return null}}

/* ---------- modal ---------- */
let modalClose=null;
function openModal(title,body,foot,onClose){$('mTitle').textContent=title;$('mBody').innerHTML=body;$('mFoot').innerHTML=foot||'';$('modal').classList.add('on');modalClose=onClose||null}
function closeModal(){$('modal').classList.remove('on');const f=modalClose;modalClose=null;if(f)f()}
$('mClose').onclick=closeModal;

/* ===================== SALA DE PARTOS ===================== */
const W={sim:null,cs:null,run:false,speed:30,acc:0,win:20,back:0,feedN:-1,mode:'formacao',pauseOnMsg:true,lastUI:0,wasRun:false};
function difCls(d){return d==='Básico'?'b':d==='Intermédio'?'i':'a'}
function renderPick(){
  const hist=store('ctg-hist')||[];
  $('wCases').innerHTML=CASES.map(c=>{const best=hist.filter(h=>h.id===c.id).reduce((m,h)=>Math.max(m,h.score),-1);
    return`<button class="pcard" data-id="${c.id}"><span class="nm">${esc(c.nome)}</span><span class="meta">${c.idade} anos · ${c.gp} · ${c.ig} sem</span><span class="tg">${esc(c.tag)}</span><span class="foot"><span class="dif ${difCls(c.dif)}">${c.dif}</span><span class="best">${best>=0?'Melhor: '+best+'/100':'Por fazer'}</span></span></button>`}).join('');
}
$('wCases').onclick=ev=>{const b=ev.target.closest('.pcard');if(b)wStart(b.dataset.id)};
document.querySelectorAll('input[name=wMode]').forEach(r=>r.onchange=()=>{W.mode=document.querySelector('input[name=wMode]:checked').value;$('wModeTxt').textContent=W.mode==='formacao'?'Formação: comentário imediato a cada ação e revisão.':'Avaliação: sem comentários durante o caso; tudo é analisado no fim.'});
$('wPauseOpt').onchange=e=>W.pauseOnMsg=e.target.checked;

function wStart(id){
  const cs=CASES.find(c=>c.id===id);W.cs=cs;W.back=0;W.feedN=-1;W.acc=0;
  const sim=new LabourSim(cs,{mode:W.mode});W.sim=sim;
  sim.onMsg=(it,o)=>{if(o.pause&&W.pauseOnMsg&&!sim.ended){W.run=false;showPause(it,o.review)}};
  sim.onEnd=()=>{W.run=false;setTimeout(showDebrief,700)};
  $('wPick').style.display='none';$('wDeb').style.display='none';$('wRun').style.display='';
  $('wName').textContent=cs.nome;$('wMeta').textContent=`${cs.idade} anos · ${cs.gp} · ${cs.ig} semanas · ${W.mode==='formacao'?'Formação':'Avaliação'}`;
  $('wFicha').innerHTML=`<h3>Ficha clínica</h3><h4>Antecedentes</h4><ul>${cs.antecedentes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h4>Gravidez atual</h4><ul>${cs.gravidez.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h4>Admissão</h4><p>${esc(cs.admissao)}</p>`;
  $('wPauseBar').classList.remove('on');
  sim.msg('Enf.ª',`Passagem de turno: ${cs.nome}, ${cs.idade} anos, ${cs.gp}, ${cs.ig} semanas. ${cs.admissao}`);
  renderActs();W.run=true;$('wPlay').textContent='Pausar';setSegW('wSpeed','s',W.speed);
  window.scrollTo({top:0});
}
function setSegW(id,k,v){document.querySelectorAll('#'+id+' button').forEach(b=>b.classList.toggle('on',+b.dataset[k]===+v))}
$('wSpeed').onclick=e=>{const b=e.target.closest('button');if(b){W.speed=+b.dataset.s;setSegW('wSpeed','s',W.speed)}};
$('wWin').onclick=e=>{const b=e.target.closest('button');if(b){W.win=+b.dataset.w;setSegW('wWin','w',W.win)}};
$('wPlay').onclick=()=>{if(!W.sim||W.sim.ended)return;W.run=!W.run;if(W.run)$('wPauseBar').classList.remove('on');$('wPlay').textContent=W.run?'Pausar':'Retomar'};
$('wResume').onclick=()=>{$('wPauseBar').classList.remove('on');W.run=true;$('wPlay').textContent='Pausar'};
$('wPauseRev').onclick=()=>{$('wPauseBar').classList.remove('on');openReview()};
$('wReview').onclick=()=>openReview();
$('wQuit').onclick=()=>{
  const was=W.run;W.run=false;
  openModal('Terminar o caso?','<p>O caso termina sem parto e o relatório é gerado com o que foi feito até agora.</p>','<button class="btn" id="qNo">Continuar o caso</button><button class="btn pri" id="qYes">Terminar e ver relatório</button>');
  $('qNo').onclick=()=>{closeModal();W.run=was};$('qYes').onclick=()=>{closeModal();W.sim.finish('Caso terminado pelo utilizador.')};
};
function showPause(it,review){
  $('wPauseTx').innerHTML=`<b>${esc(it.clock)} · ${esc(it.who)}</b><br>${esc(it.text)}`;
  $('wPauseRev').style.display=review?'':'none';
  $('wPauseBar').classList.add('on');$('wPlay').textContent='Retomar';
}
function renderActs(){
  $('wActs').innerHTML=ACTS.map(([g,list])=>`<div class="agrp"><h4>${g}</h4><div class="abtns">${list.map(([id,l])=>`<button data-a="${id}" class="${['ces1','ces2','inst'].includes(id)?'dec':''}">${l}</button>`).join('')}</div></div>`).join('');
}
$('wActs').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled||!W.sim)return;
  const id=b.dataset.a;
  if(['ces1','ces2','inst'].includes(id)){
    const was=W.run;W.run=false;
    openModal('Confirmar decisão de parto',`<p><b>${esc(ACT_LABEL[id])}</b> às ${W.sim.clock()}.</p><p class="small">A decisão não pode ser revertida. Até ao nascimento o tempo continua a correr e pode manter medidas de reanimação intrauterina.</p>`,'<button class="btn" id="dNo">Cancelar</button><button class="btn pri" id="dYes">Confirmar</button>');
    $('dNo').onclick=()=>{closeModal();W.run=was};$('dYes').onclick=()=>{closeModal();doAction(id);W.run=true;$('wPlay').textContent='Pausar'};
    return;
  }
  doAction(id);
};
function doAction(id){const r=W.sim.act(id);if(r){W.feedN=-1;uiState(true)}}
function renderFeed(){
  const sim=W.sim;const items=[...sim.feed.map(x=>({...x,_k:'f'})),...sim.acts.map(a=>({...a,_k:'a'}))].sort((a,b)=>a.tm-b.tm);
  $('wFeed').innerHTML=items.slice().reverse().map(x=>{
    if(x._k==='a'){const fb=sim.mode==='formacao'&&x.why?`<div class="fb ${x.q}">${x.q==='good'?'Adequado':x.q==='bad'?'Não recomendado':'Neutro'}: ${esc(x.why)}</div>`:'';
      return`<div class="fi act"><div class="h"><span class="mk">${x.n}</span><span class="c">${x.clock}</span><span class="w">${esc(x.lab)}</span></div>${esc(x.txt)}${x.res?`<div class="rs">${esc(x.res)}</div>`:''}${fb}</div>`}
    return`<div class="fi ${x.kind}"><div class="h"><span class="c">${x.clock}</span><span class="w">${esc(x.who)}</span></div>${esc(x.text)}</div>`}).join('');
}
function uiState(force){
  const sim=W.sim,st=sim.st,e=sim.e;
  $('wClock').textContent=sim.clock();$('wElapsed').textContent='decorridos '+fmt(Math.max(0,sim.tmin()*60));
  const lastF=(()=>{for(let i=e.F.length-1;i>=Math.max(0,e.F.length-6);i--){const v=e.F[i];if(v===v)return v}return NaN})();
  $('dFcf').innerHTML=lastF===lastF?Math.round(lastF)+' <small>bpm</small>':'---';
  $('dFcm').innerHTML=st.oxi?Math.round(e.M[e.M.length-1])+' <small>bpm</small>':'<small>sem oxímetro</small>';
  $('dToco').textContent=Math.round(e.T[e.T.length-1]);
  $('dSig').innerHTML=st.scalp?'ECG (elétrodo)':'Ultrassons<br><small style="color:#7F93A8">externo</small>';
  const now=performance.now();if(!force&&now-W.lastUI<300)return;W.lastUI=now;
  const per=e.contr10();
  $('wState').innerHTML=[
    ['Dilatação',`${Math.floor(st.dil)} cm`],['Apresentação',(st.station>0?'+':'')+Math.round(st.station)],['Membranas',st.membr+(st.membr!=='íntegras'?' ('+st.liquido+')':'')],
    ['Analgesia',st.analgesia],['Ocitocina',st.oxy?st.oxy+' mU/min':'não'],['Posição',POS_LAB[st.posicao]],['Puxos',st.pushing?'em curso':'não'],
    ['Contrações (últimos 10 min)',`<span class="${per>5?'alert':''}">${per}</span>`]
  ].map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
  const v=st.vitals;$('wVit').innerHTML=v?`<div class="t">Último registo às ${v.clock}</div>TA ${v.tas}/${v.tad} mmHg<br>FC ${v.fc} bpm · SpO₂ ${v.spo2}%<br>T ${num(v.temp)} °C`:'—';
  document.querySelectorAll('#wActs button').forEach(b=>{const a=sim.avail(b.dataset.a);b.disabled=!a.ok;b.title=a.ok?'':a.why;b.classList.toggle('cur',b.dataset.a===st.posicao)});
  const d=sim.decision;
  if(d&&!sim.ended){$('wDecBar').classList.add('on');$('wDecBar').innerHTML=`<b>${esc(ACT_LABEL[d.kind])}</b> decidida às ${sim.clock(sim.t0+d.at*60)}. Nascimento previsto às <b>${sim.clock(sim.t0+d.eta*60)}</b> (faltam ${Math.max(0,Math.ceil(d.eta-sim.tmin()))} min).`}else $('wDecBar').classList.remove('on');
  const n=sim.feed.length+sim.acts.length;if(n!==W.feedN){W.feedN=n;renderFeed()}
  const maxBack=Math.max(0,Math.floor((e.t-W.win*60)/60));$('wBack').max=maxBack;if(W.back>maxBack)W.back=maxBack;$('wBack').value=maxBack-W.back;
  $('wBackTx').textContent=W.back>0?`a rever: até ${sim.clock(e.t-W.back*60)}`:'em tempo real';
}
$('wBack').oninput=e=>{W.back=+$('wBack').max-+e.target.value};
function drawWard(){const sim=W.sim;drawCTG($('cvW'),sim.e,{tEnd:sim.e.t-W.back*60,win:W.win*60,clock:t=>sim.clock(t),marks:true,labEvery:W.win>=40?600:300})}
let wLast=0;
function wLoop(ts){
  const dt=Math.min(.1,(ts-wLast)/1000||0);wLast=ts;
  const vis=$('v-sala').classList.contains('on')&&$('wRun').style.display!=='none';
  if(W.sim&&vis){
    if(W.run&&!W.sim.ended&&!$('modal').classList.contains('on')){W.acc+=dt*W.speed;let n=Math.min(8000,Math.floor(W.acc/DT));W.acc-=n*DT;while(n-->0&&W.run&&!W.sim.ended)W.sim.step()}
    drawWard();uiState();
  }
  requestAnimationFrame(wLoop);
}

/* ---------- revisão estruturada ---------- */
function radios(name,map,type='radio'){return Object.entries(map).map(([k,l])=>`<label class="o"><input type="${type}" name="${name}" value="${k}"> ${l}</label>`).join('')}
function openReview(){
  const sim=W.sim;if(!sim||sim.ended)return;W.wasRun=W.run||$('wPauseBar').classList.contains('on');W.run=false;$('wPauseBar').classList.remove('on');
  openModal(`Revisão do CTG · ${sim.clock()}`,`
   <p class="small">Analise os últimos 30 min do papel (pode recuar no papel antes de abrir a revisão). Classifique cada parâmetro como faria no registo clínico.</p>
   <div class="rgrid">
    <div class="rf"><h4>Linha de base (bpm)</h4><input type="number" id="rvBase" min="50" max="210" step="5" placeholder="ex.: 140"></div>
    <div class="rf"><h4>Contrações em 10 min</h4><input type="number" id="rvCont" min="0" max="10" step="0.5" placeholder="ex.: 4"></div>
    <div class="rf full"><h4>Variabilidade</h4><div class="opts2">${radios('rVar',VAR_L)}</div></div>
    <div class="rf"><h4>Acelerações</h4><div class="opts2">${radios('rAcc',{1:'Presentes',0:'Ausentes'})}</div></div>
    <div class="rf"><h4>Desacelerações</h4><div class="opts2">${radios('rDec',DEC_L,'checkbox')}</div></div>
    <div class="rf full"><h4>Classificação FIGO</h4><div class="opts2">${radios('rFigo',FIGO_L)}</div></div>
    <div class="rf full"><h4>Interpretação fisiológica</h4><div class="opts2">${radios('rMech',MECH_L)}</div></div>
    <div class="rf full"><h4>Plano</h4><div class="opts2">${radios('rPlan',PLAN_L)}</div></div>
   </div><div id="rMsg" class="small" style="color:var(--bad)"></div>`,
   '<button class="btn" id="rCancel">Cancelar</button><button class="btn pri" id="rSubmit">Registar revisão</button>',()=>{if(W.wasRun&&!W.sim.ended){W.run=true;$('wPlay').textContent='Pausar'}});
  $('rCancel').onclick=closeModal;$('rSubmit').onclick=submitReview;
}
function submitReview(){
  const sim=W.sim,g=n=>{const x=document.querySelector(`input[name=${n}]:checked`);return x?x.value:null};
  const ans={base:+$('rvBase').value||null,cont:$('rvCont').value===''?null:+$('rvCont').value,var:g('rVar'),acc:g('rAcc'),dec:[...document.querySelectorAll('input[name=rDec]:checked')].map(x=>x.value),figo:g('rFigo'),mech:g('rMech'),plan:g('rPlan')};
  if(ans.base==null||ans.cont==null||!ans.var||ans.acc==null||!ans.dec.length||!ans.figo||!ans.mech||!ans.plan){$('rMsg').textContent='Preencha todos os campos.';return}
  const t=sim.truth();
  const fields=[];
  const add=(k,a,tr,ok,part)=>fields.push({k,a,tr,ok,part});
  add('Linha de base',ans.base+' bpm',t.maternal?'não avaliável (sinal materno)':t.base+' bpm',t.maternal?true:Math.abs(ans.base-t.base)<=8);
  add('Contrações / 10 min',num(ans.cont),num(t.per10),Math.abs(ans.cont-t.per10)<=1.2);
  add('Variabilidade',VAR_L[ans.var],t.maternal?'—':VAR_L[t.cat],t.maternal?true:ans.var===t.cat);
  add('Acelerações',ans.acc==='1'?'Presentes':'Ausentes',t.maternal?'—':(t.acc?'Presentes':'Ausentes'),t.maternal?true:(ans.acc==='1')===t.acc);
  const A=new Set(ans.dec),B=new Set(t.types),inter=[...A].filter(x=>B.has(x)).length,uni=new Set([...A,...B]).size,jac=uni?inter/uni:1;
  add('Desacelerações',ans.dec.map(x=>DEC_L[x]).join(', '),t.types.map(x=>DEC_L[x]).join(', '),jac===1,jac);
  add('Classificação FIGO',FIGO_L[ans.figo],FIGO_L[t.figo]+(t.why.length?` (${t.why.join('; ')})`:''),ans.figo===t.figo);
  add('Interpretação',MECH_L[ans.mech],t.mech.map(m=>MECH_L[m]).join(' ou '),t.mech.includes(ans.mech));
  add('Plano',PLAN_L[ans.plan],t.plan.map(m=>PLAN_L[m]).join(' ou '),t.plan.includes(ans.plan));
  const score=fields.reduce((s,f)=>s+(f.ok?1:(f.part||0)),0);
  sim.reviews.push({clock:sim.clock(),tm:sim.tmin(),fields,score,max:fields.length});
  sim.msg('Revisão do CTG',`Revisão estruturada registada: ${FIGO_L[ans.figo].toLowerCase()}, ${MECH_L[ans.mech].toLowerCase()}; plano: ${PLAN_L[ans.plan].toLowerCase()}.`,{kind:'sys'});
  if(sim.mode==='formacao'){
    $('mBody').innerHTML=`<p><b>${num(score,1)} / ${fields.length}</b> parâmetros corretos.</p>`+reviewTable(fields);
    $('mFoot').innerHTML='<button class="btn pri" id="rOk">Continuar o caso</button>';$('rOk').onclick=closeModal;
  }else closeModal();
}
function reviewTable(fields){return`<table class="rres"><thead><tr><th>Parâmetro</th><th>A sua resposta</th><th>Simulador</th><th></th></tr></thead><tbody>${fields.map(f=>`<tr><td>${f.k}</td><td>${esc(f.a)}</td><td>${esc(f.tr)}</td><td>${f.ok?'<span class="ok">✓</span>':f.part>0?`<span class="pt">${Math.round(f.part*100)}%</span>`:'<span class="ko">✗</span>'}</td></tr>`).join('')}</tbody></table>`}

/* ---------- relatório final ---------- */
function showDebrief(){
  const sim=W.sim,cs=sim.cs,o=sim.outcome,ev=evaluate(sim);
  $('modal').classList.remove('on');$('wRun').style.display='none';$('wPauseBar').classList.remove('on');
  const hist=store('ctg-hist')||[];hist.push({d:new Date().toISOString(),id:cs.id,nome:cs.nome,mode:sim.mode,score:ev.score,pHa:o.born?o.pHa:null,via:o.label});store('ctg-hist',hist.slice(-200));
  const cls=v=>v==null?'':v<7.0?'bad':v<7.1?'warn':v<7.2?'warn':'good';
  const tiles=o.born?[
    ['Via de parto',o.label.replace(/ \(.*\)/,''),o.label.match(/\((.*)\)/)?.[1]||''],['Nascimento',o.clock,`${Math.round(o.tm)} min de caso`],['Apgar',`${o.a1}/${o.a5}`,'1.º / 5.º minuto'],
    ['pH artéria',num(o.pHa,2),`veia ${num(o.pHv,2)}`,cls(o.pHa)],['Défice de bases',num(o.be),'mmol/L',o.be<=-12?'bad':o.be<=-8?'warn':'good'],['Lactato',num(o.lact),'mmol/L',o.lact>=6?'bad':o.lact>=4?'warn':'good']
  ]:[['Desfecho','Sem parto',o.notes[0]||''],['Hora',o.clock,`${Math.round(o.tm)} min de caso`],['pH fetal estimado',num(sim.st.pH,2),'no fim do caso',cls(sim.st.pH)]];
  const dur=Math.max(30,Math.ceil(sim.tmin()));
  $('wDeb').innerHTML=`
   <div class="card dbtop"><div><h2>${esc(cs.nome)} · relatório do caso</h2><div class="small">${cs.idade} anos · ${cs.gp} · ${cs.ig} semanas · modo ${sim.mode==='formacao'?'formação':'avaliação'}</div></div>
     <div class="score"><div class="n">${ev.score}</div><div class="l">pontuação em 100</div></div></div>
   <div class="otiles">${tiles.map(t=>`<div class="card ot"><div class="k">${t[0]}</div><div class="v ${t[3]||''}">${esc(t[1])}</div><div class="s">${esc(t[2])}</div></div>`).join('')}</div>
   <div class="bars">${[['Decisões clínicas',ev.cPct*40,40],['Revisões do CTG',ev.revPct*30,30],['Resultado neonatal',ev.oPts,30]].map(b=>`<div class="card bar"><div class="k"><span>${b[0]}</span><span class="mono">${Math.round(b[1])}/${b[2]}</span></div><div class="tr"><div style="width:${Math.round(b[1]/b[2]*100)}%"></div></div></div>`).join('')}</div>
   <div class="card dsec"><h3>Recém-nascido</h3><ul>${o.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><p class="small">Valores simulados a partir de um modelo fisiológico simplificado.</p></div>
   <div class="card dsec"><h3>Traçado completo</h3>
     <div class="legend"><span><i style="background:rgba(194,59,50,.18)"></i>Patológico (FIGO)</span><span><i style="background:rgba(194,122,18,.16)"></i>Suspeito</span><span><i style="background:#0098BC"></i>Ações numeradas</span>${cs.fet.mhrCapture?'<span><i style="background:#2E8B57"></i>FCF real (tracejado verde)</span>':''}<span><i style="background:#C23B32"></i>FC materna (quando registada)</span></div>
     <div class="longwrap"><canvas id="cvLong" style="height:400px"></canvas><canvas id="cvPH" style="height:130px"></canvas></div>
     <p class="small">Faixa inferior: pH fetal estimado pelo modelo (não visível durante o caso). Linhas a 7,20, 7,10 e 7,00.</p></div>
   <div class="two">
     <div class="card dsec"><h3>Critérios clínicos</h3><div class="crit">${ev.crit.map(c=>`<div><span class="${c.ok?'ok':'ko'}">${c.ok?'✓':'✗'}</span><span><b>${esc(c.k)}</b><span class="d">${esc(c.d)}</span></span></div>`).join('')}</div></div>
     <div class="card dsec"><h3>Ações (${sim.acts.length})</h3><div class="crit">${sim.acts.length?sim.acts.map(a=>`<div><span class="${a.q==='good'?'ok':a.q==='bad'?'ko':''}">${a.q==='good'?'✓':a.q==='bad'?'✗':'·'}</span><span><b>${a.n}. ${a.clock} · ${esc(a.lab)}</b><span class="d">${esc(a.why||'')}</span></span></div>`).join(''):'<p class="small">Nenhuma ação registada.</p>'}</div></div>
   </div>
   <div class="card dsec"><h3>Revisões do CTG (${sim.reviews.length})</h3>${sim.reviews.length?sim.reviews.map(r=>`<h4 style="margin:10px 0 4px">${r.clock} · ${num(r.score,1)}/${r.max}</h4>${reviewTable(r.fields)}`).join(''):'<p class="small">Não foi feita nenhuma revisão estruturada. Na prática clínica recomenda-se pelo menos uma revisão por hora e sempre que o traçado muda.</p>'}</div>
   <div class="two">
     <div class="card dsec"><h3>Atuação recomendada</h3><ul>${cs.ideal.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
     <div class="card dsec"><h3>Pontos de ensino</h3><ul>${cs.teach.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
   </div>
   <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="dbAgain">Repetir este caso</button><button class="btn" id="dbOther">Escolher outro caso</button></div>`;
  $('wDeb').style.display='';
  const pxm=22,wpx=Math.max(900,(dur+20)*pxm);
  const cl=$('cvLong'),cp=$('cvPH');cl.style.width=wpx+'px';cp.style.width=wpx+'px';
  const bands=[];ev.evals.forEach(x=>{if(x.figo==='P'||x.figo==='S')bands.push({s:sim.t0+x.tm*60-75,e:sim.t0+x.tm*60+75,col:x.figo==='P'?'rgba(194,59,50,.13)':'rgba(194,122,18,.10)'})});
  drawCTG(cl,sim.e,{tEnd:sim.e.t,win:sim.e.t-Math.max(0,sim.t0-20*60),clock:t=>sim.clock(t),marks:true,labEvery:600,bands,trueF:!!cs.fet.mhrCapture});
  drawPH(cp,sim);
  $('dbAgain').onclick=()=>wStart(cs.id);$('dbOther').onclick=()=>{$('wDeb').style.display='none';$('wPick').style.display='';renderPick()};
  window.scrollTo({top:0});
}
function drawPH(cv,sim){
  const {c,W:w,H}=fitCanvas(cv);const L=38,R=8,t0=Math.max(0,sim.t0-20*60),t1=sim.e.t,pw=w-L-R;
  const X=t=>L+(t-t0)/(t1-t0)*pw,Y=p=>8+(7.40-p)/(7.40-6.80)*(H-20);
  c.fillStyle='#fff';c.fillRect(0,0,w,H);
  c.font='11px "Geist Mono",monospace';c.textAlign='right';c.textBaseline='middle';
  [[7.2,'#2E8B57'],[7.1,'#C27A12'],[7.0,'#C23B32']].forEach(([p,col])=>{c.strokeStyle=col;c.setLineDash([4,4]);c.beginPath();c.moveTo(L,Y(p));c.lineTo(L+pw,Y(p));c.stroke();c.setLineDash([]);c.fillStyle=col;c.fillText(num(p,2),L-4,Y(p))});
  c.strokeStyle='#193856';c.lineWidth=2;c.beginPath();sim.hist.filter(h=>h.t>=t0).forEach((h,i)=>{const x=X(h.t),y=Y(clamp(h.pH,6.8,7.4));i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();
  c.fillStyle='#5D6B7C';c.textAlign='left';c.font='600 11px "Geist",sans-serif';c.fillText('pH fetal estimado',L+4,10);
}

/* ===================== RESULTADOS ===================== */
function renderHist(){
  const h=(store('ctg-hist')||[]).slice().reverse();
  $('hTable').innerHTML=h.length?`<table class="hist"><thead><tr><th>Data</th><th>Caso</th><th>Modo</th><th>Desfecho</th><th>pH artéria</th><th>Pontuação</th></tr></thead><tbody>${h.map(x=>`<tr><td class="n">${new Date(x.d).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'})}</td><td>${esc(x.nome)}</td><td>${x.mode==='formacao'?'Formação':'Avaliação'}</td><td>${esc(x.via)}</td><td class="n">${x.pHa!=null?num(x.pHa,2):'—'}</td><td class="n"><b>${x.score}</b></td></tr>`).join('')}</tbody></table>`:'<p class="small">Ainda não há casos concluídos.</p>';
  const x=(store('ctg-exam')||[]).slice().reverse();
  $('hExam').innerHTML=x.length?`<table class="hist"><thead><tr><th>Data</th><th>Conjunto</th><th>Diretriz</th><th>Classificação certa</th><th>Tempo</th><th>Resultado</th></tr></thead><tbody>${x.map(h=>`<tr><td class="n">${new Date(h.d).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'})}</td><td>${h.set}</td><td>${GUIDE[h.guide]}</td><td class="n">${h.cls}%</td><td class="n">${fmt(h.secs)}</td><td class="n"><b>${h.pct}%</b></td></tr>`).join('')}</tbody></table>`:'<p class="small">Ainda não há exames concluídos.</p>';
}
$('dMode').onclick=e=>{const b=e.target.closest('button');if(b&&b.dataset.m!==D.mode)setDrillMode(b.dataset.m)};
$('hClear').onclick=e=>{const b=e.target;if(b.dataset.c){store('ctg-hist',[]);store('ctg-exam',[]);renderHist();renderPick();b.dataset.c='';b.textContent='Limpar histórico'}else{b.dataset.c='1';b.textContent='Confirmar: apagar tudo'}};

/* ===================== ECRÃ INTEIRO ===================== */
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),6000)}
function fsSync(){const on=!!document.fullscreenElement||document.body.classList.contains('foco');document.body.classList.toggle('fs',on);$('fsBtn').querySelector('.fstx').textContent=on?'Sair do ecrã inteiro':'Ecrã inteiro';$('fsBtn').setAttribute('aria-pressed',on);window.dispatchEvent(new Event('resize'))}
$('fsBtn').onclick=async()=>{
  if(document.fullscreenElement){try{await document.exitFullscreen()}catch(_){}return}
  if(document.body.classList.contains('foco')){document.body.classList.remove('foco');fsSync();return}
  try{await document.documentElement.requestFullscreen({navigationUI:'hide'})}
  catch(_){document.body.classList.add('foco');fsSync();toast('O browser não permitiu ecrã inteiro aqui. Ativei o modo compacto; para ecrã inteiro abra a plataforma no seu próprio separador ou use F11.')}
};
document.addEventListener('fullscreenchange',fsSync);

/* ===================== NAVEGAÇÃO ===================== */
const ROUTES={turmas:'turmas',inicio:'inicio',sala:'sala',treino:'treino',demo:'monitor',construtor:'construtor',referencia:'referencia',resultados:'resultados',sobre:'sobre',reais:'reais'};
function show(h){
  if(h&&h.startsWith('exame-')){if(typeof accGate==='function'&&accGate('exame'))return;if(liveParticipant(h))return}
  const tcode=h&&/^turma-[a-z0-9]{8}$/.test(h)?h.slice(6):null;if(tcode)h='turmas';
  const v=ROUTES[h]?h:'inicio',id=ROUTES[v];if(typeof accGate==='function'&&accGate(v))return;document.body.dataset.view=v;
  document.querySelectorAll('main > .view').forEach(s=>s.classList.toggle('on',s.id==='v-'+id));
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+v));
  heroRun(v==='inicio');if(v==='referencia')initMinis();if(v==='construtor')figoEval(readB());if(v==='resultados')renderHist();if(v==='reais')showReal();if(v==='turmas'&&typeof showTurmas==='function')showTurmas(tcode);
  if(v==='treino'){if(!D.cur&&!D.exam)newDrill();else drawDrill()}
}
window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
window.addEventListener('resize',()=>{if($('v-reais').classList.contains('on')&&realInit)(R.mode==='lib'?drawReal():R.mode==='live'?rvDraw():drawChallenge());if($('v-treino').classList.contains('on'))drawDrill();if($('v-referencia').classList.contains('on'))initMinis()});
renderPick();initMonitor();initBuild();if(typeof accInit==='function')accInit();show(location.hash.slice(1));
requestAnimationFrame(loop);requestAnimationFrame(wLoop);
