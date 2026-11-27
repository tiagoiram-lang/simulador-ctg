/* Traçados reais · caso em tempo real: o registo avança, há paragens para decidir e o desfecho só aparece no fim */
const RV={case:null,anim:0,win:30};
const RV_ACT={vigiar:'Manter vigilância',corrigir:'Medidas corretivas e reavaliar',senior:'Pedir avaliação sénior / exame adicional',parto:'Decidir parto imediato'};
const RV_CONF={1:'Baixa',2:'Média',3:'Alta'};

/* pontos de decisão em segundos desde o início do caso: aos 20 min e depois de 15 em 15, mais um perto do fim */
function rvPoints(dur){const p=[];for(let s=20*60;s<dur-6*60;s+=15*60)p.push(s);p.push(dur-3*60);return p}
function rvPick(){
  const ok=R.data.filter(m=>m.q30<=0.3&&m.qall<=0.35&&!(RV.seen||[]).includes(m.id));
  const ac=ok.filter(m=>m.pH<7.15),no=ok.filter(m=>m.pH>=7.15);
  const pool=(Math.random()<0.45&&ac.length)?ac:(no.length?no:ok);
  return pool[Math.floor(Math.random()*pool.length)];
}
/* área de desacelerações (bpm·min) nos 30 min antes de t, com a linha de base e as desacelerações detetadas automaticamente */
function rvArea(m,e,t){
  let a=0;const w0=t-1800;
  for(const d of m.dd||[]){if(d[1]<w0||d[0]>t)continue;
    for(let k=Math.max(d[0],w0);k<=Math.min(d[1],t-1);k++){const f=e.F[2*k];const b=m.bl[Math.min(m.bl.length-1,Math.floor(k/60))];if(isFinite(f)&&f<b)a+=b-f}}
  return a/60;
}
function rvPct(a){const s=R.meta&&R.meta.a30sorted;if(!s)return null;let k=0;while(k<s.length&&s[k]<=a)k++;return Math.round(k/s.length*100)}

function rvNew(){
  cancelAnimationFrame(RV.anim);
  const m=rvPick();if(!m)return;
  RV.seen=[m.id,...(RV.seen||[])].slice(0,40);RV.win=30;document.querySelectorAll('#rvWin button').forEach(b=>b.classList.toggle('on',b.dataset.w==='30'));
  const dur=Math.min(m.n,60*60),start=m.n-dur;
  RV.case={m,start,dur,pts:rvPoints(dur),i:0,tc:20*60,ans:[],done:false,ready:false};
  $('rvTitle').textContent='Caso em tempo real';$('rvChips').innerHTML=ctxChips(m);
  $('rvSub').textContent='Vigie o traçado como se estivesse na sala. Em cada paragem classifique e decida; o desfecho só aparece no fim.';
  $('rvOut').innerHTML='';$('rvOut').classList.remove('on');
  $('rvForm').innerHTML='<p class="small">A carregar o traçado…</p>';
  cvWait($('cvRealL'),'A carregar o traçado…');
  const tok=++R.tok;
  realSig(m).then(()=>{if(tok!==R.tok||RV.case.m!==m)return;RV.case.ready=true;rvForm();rvDraw()})
    .catch(()=>{if(RV.case.m===m)cvWait($('cvRealL'),'Não foi possível carregar este traçado. Carregue em «Outro caso».')});
  rvStats();
}
function rvDraw(){
  const C=RV.case;if(!C||!C.ready)return;const e=realEng(C.m);
  const tEnd=C.start+C.tc,win=RV.win?RV.win*60:Math.max(1800,C.tc);
  const marks=e.marks;e.marks=[...(C.done?C.ans.map((a,k)=>({t:C.start+a.t,n:'D'+(k+1),col:a.act==='parto'?'#C23B32':a.act==='vigiar'?'#5B6676':'#0A7F8F'})):[]),...marks.filter(x=>x.t<=tEnd)];
  drawCTG($('cvRealL'),e,{tEnd,win,tZero:C.start,marks:true,labEvery:win>=3600?600:300});
  e.marks=marks;
  const p=C.done?'Caso terminado':`Paragem ${C.i+1} de ${C.pts.length} · ${Math.round(C.tc/60)} min de observação`;
  $('rvProg').textContent=p;
}
function rvForm(){
  const C=RV.case,G=D.guide;
  $('rvForm').innerHTML=`<h3 style="margin:0">Paragem ${C.i+1}</h3><p class="small" style="margin:4px 0 0">${Math.round(C.tc/60)} min de observação. Classifique o que vê agora e decida.</p>
    <div class="gbar"><span class="small">Classificar segundo</span><div class="seg" id="rvGuide">${Object.entries(GUIDE).map(([k,l])=>`<button data-g="${k}" class="${k===G?'on':''}">${l}</button>`).join('')}</div></div>
    <div class="rf"><h4>Classificação do traçado</h4><div class="opts2" id="rvCls">${radios('rvCls',CLS_OPTS[G])}</div></div>
    <div class="rf"><h4>Conduta neste momento</h4><div class="opts2">${radios('rvAct',RV_ACT)}</div></div>
    <div class="rf"><h4>Confiança</h4><div class="opts2">${radios('rvConf',RV_CONF)}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="rvGo">Registar e continuar</button><button class="btn" id="rvSkip">Outro caso</button></div>
    <div class="small" id="rvMsg" style="color:var(--bad)"></div>
    ${C.ans.length?`<div class="rvlog">${C.ans.map((a,k)=>`<div><span class="mono">${Math.round(a.t/60)} min</span> ${esc(CLS_OPTS[a.g][a.cls])} · ${esc(RV_ACT[a.act])}</div>`).join('')}</div>`:''}`;
  $('rvGuide').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;D.guide=b.dataset.g;store('ctg-guide',D.guide);document.querySelectorAll('#rvGuide button').forEach(x=>x.classList.toggle('on',x===b));$('rvCls').innerHTML=radios('rvCls',CLS_OPTS[D.guide])};
  $('rvGo').onclick=rvSubmit;$('rvSkip').onclick=rvNew;
}
function rvSubmit(){
  const C=RV.case;if(!C||C.done||!C.ready)return;
  const g=n=>{const x=document.querySelector(`input[name=${n}]:checked`);return x?x.value:null};
  const a={t:C.tc,g:D.guide,cls:g('rvCls'),act:g('rvAct'),conf:g('rvConf')};
  if(!a.cls||!a.act||!a.conf){$('rvMsg').textContent='Responda às três perguntas.';return}
  const e=realEng(C.m);a.area=rvArea(C.m,e,C.start+C.tc);a.pct=rvPct(a.area);
  C.ans.push(a);
  if(a.act==='parto'||C.i>=C.pts.length-1)return rvEnd();
  C.i++;const from=C.tc,to=C.pts[C.i];
  $('rvForm').querySelectorAll('input,button').forEach(x=>x.disabled=true);
  /* o traçado avança até à próxima paragem: cerca de 0,25 s por minuto, nunca mais de 4 s */
  const ms=Math.min(4000,Math.max(1200,(to-from)/60*250)),t0=performance.now();
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step=now=>{const k=reduce?1:Math.min(1,(now-t0)/ms);C.tc=from+(to-from)*k;rvDraw();
    if(k<1)RV.anim=requestAnimationFrame(step);else{C.tc=to;rvDraw();rvForm()}};
  RV.anim=requestAnimationFrame(step);
}
function rvVerdict(C){
  const m=C.m,ac=m.pH<7.15,sev=m.pH<7.05,ok=m.pH>=7.2;
  const del=C.ans.find(a=>a.act==='parto'),esc_=C.ans.find(a=>a.act==='senior'||a.act==='corrigir');
  const alert=C.ans.find(a=>a.pct!=null&&a.pct>=80);
  const left=a=>Math.round((C.dur-a.t)/60);
  let cls,msg;
  if(sev&&!del){cls='kot';msg=`Acidemia grave (pH ${ph2(m.pH)}) e nenhuma decisão de parto.`}
  else if(ac&&del){cls='okt';msg=`Houve acidemia e decidiu o parto aos ${Math.round(del.t/60)} min de observação, ${left(del)} min antes do nascimento real.`}
  else if(ac&&esc_){cls='mid';msg=`Houve acidemia (pH ${ph2(m.pH)}). Escalou a vigilância, mas não chegou a decidir o parto.`}
  else if(ac){cls='kot';msg=`Houve acidemia (pH ${ph2(m.pH)}) e manteve vigilância até ao fim.`}
  else if(ok&&del){cls='mid';msg=`O recém-nascido nasceu sem acidemia (pH ${ph2(m.pH)}). A decisão de parto aos ${Math.round(del.t/60)} min teria sido, à luz do desfecho, uma intervenção sem benefício fetal.`}
  else if(ok){cls='okt';msg=`Sem acidemia (pH ${ph2(m.pH)}) e não precipitou o parto: decisão compatível com o desfecho.`}
  else{cls='mid';msg=`pH ${ph2(m.pH)}, entre 7,15 e 7,19: sem acidemia, mas no limite.${del?` Decidiu o parto aos ${Math.round(del.t/60)} min.`:''}`}
  if(alert&&ac)msg+=` A área de desacelerações já estava no quintil mais alto da base aos ${Math.round(alert.t/60)} min.`;
  return{cls,msg,del,ac};
}
function rvEnd(){
  const C=RV.case;C.done=true;cancelAnimationFrame(RV.anim);
  const m=C.m,v=rvVerdict(C);
  const st=store('ctg-real-live')||[];st.push({id:m.id,pH:m.pH,del:v.del?v.del.t:null,dur:C.dur,n:C.ans.length,d:Date.now()});store('ctg-real-live',st.slice(-300));
  /* revela o resto do registo até ao nascimento */
  C.tc=C.dur;RV.win=0;document.querySelectorAll('#rvWin button').forEach(b=>b.classList.toggle('on',b.dataset.w==='0'));rvDraw();
  $('rvForm').innerHTML=`<h3 style="margin:0">Caso terminado</h3><p class="small">O registo foi revelado até ao nascimento. As suas decisões estão marcadas no traçado (D1, D2…).</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="rvNext">Próximo caso</button><button class="btn" id="rvLib">Ver na biblioteca</button></div>`;
  $('rvNext').onclick=rvNew;$('rvLib').onclick=()=>{setRealMode('lib');openReal(m.id)};
  $('rvOut').innerHTML=`<div class="esum ${v.cls}"><b>${v.cls==='okt'?'Decisão coerente com o desfecho':v.cls==='kot'?'Decisão a rever':'Decisão discutível'}.</b> ${esc(v.msg)}</div>
    ${outcomeHTML(m)}
    <h4 class="eg">As suas paragens</h4>
    <table class="hist rvt"><thead><tr><th>Tempo</th><th>Classificação</th><th>Conduta</th><th>Confiança</th><th>Área de desacelerações (30 min)</th></tr></thead><tbody>
    ${C.ans.map((a,k)=>`<tr><td class="mono">D${k+1} · ${Math.round(a.t/60)} min</td><td>${esc(CLS_OPTS[a.g][a.cls])}</td><td>${esc(RV_ACT[a.act])}</td><td>${RV_CONF[a.conf]}</td><td class="n">${num(a.area,0)} bpm·min${a.pct!=null?` <span class="small">(percentil ${a.pct})</span>`:''}${a.pct>=80?' <span class="qwarn">quintil mais alto</span>':''}</td></tr>`).join('')}
    </tbody></table>
    <p class="small">A área de desacelerações é medida automaticamente sobre os 30 minutos anteriores a cada paragem e comparada com os 552 partos da base: no quintil mais alto, cerca de ${R.meta&&R.meta.bands?Math.round(R.meta.bands[4].ac*100):40}% dos recém-nascidos tiveram pH &lt; 7,15. É um indicador de risco, não um diagnóstico.</p>
    <p class="small">O nascimento real aconteceu ao fim de ${Math.round(C.dur/60)} min de observação, por ${m.dt===2?'cesariana':'via vaginal'}. Não sabemos o que teria acontecido com outra decisão: o desfecho é o do parto real, e serve para pensar no que o traçado mostrava em cada momento.</p>`;
  $('rvOut').classList.add('on');rvStats();
  $('rvOut').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function rvStats(){
  const s=store('ctg-real-live')||[];
  if(!s.length){$('rvStats').innerHTML='<p class="small">As suas estatísticas aparecem aqui depois do primeiro caso.</p>';return}
  const ac=s.filter(x=>x.pH<7.15),acD=ac.filter(x=>x.del!=null),ok=s.filter(x=>x.pH>=7.2),okD=ok.filter(x=>x.del!=null);
  const sev=s.filter(x=>x.pH<7.05&&x.del==null).length;
  const lead=acD.map(x=>(x.dur-x.del)/60).sort((a,b)=>a-b),med=lead.length?Math.round(lead[Math.floor(lead.length/2)]):null;
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  $('rvStats').innerHTML=`<h3>As suas estatísticas · ${s.length} caso(s)</h3><div class="sgrid">
    <div><div class="k">Acidemias com decisão de parto</div><div class="v">${pct(acD.length,ac.length)}</div><div class="s">${acD.length} de ${ac.length} casos com pH &lt; 7,15</div></div>
    <div><div class="k">Antecedência mediana</div><div class="v">${med!=null?med+' min':'—'}</div><div class="s">entre a sua decisão e o nascimento real, nos casos com acidemia</div></div>
    <div><div class="k">Partos sem benefício fetal</div><div class="v">${pct(okD.length,ok.length)}</div><div class="s">decidiu o parto com pH ≥ 7,20 (${okD.length} de ${ok.length})</div></div>
    <div><div class="k">Acidemias graves sem decisão</div><div class="v">${sev}</div><div class="s">pH &lt; 7,05 sem decisão de parto</div></div></div>
    <p class="small">Cerca de 45% dos casos sorteados têm acidemia, para haver casos que ensinam; só entram registos com sinal legível. <button class="linkbtn" id="rvReset">Apagar estatísticas</button></p>`;
  $('rvReset').onclick=ev=>{const b=ev.target;if(b.dataset.c){store('ctg-real-live',[]);rvStats()}else{b.dataset.c=1;b.textContent='Confirmar: apagar'}};
}
function rvInit(){
  $('rvWin').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;RV.win=+b.dataset.w;document.querySelectorAll('#rvWin button').forEach(x=>x.classList.toggle('on',x===b));rvDraw()};
}
