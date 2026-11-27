/* Treino adaptativo: histórico por padrão e por campo, sorteio que insiste no que falha, repetição espaçada e níveis de competência */
const PF=['base','var','acc','dec','cont','figo','mech'];
const PF_L={base:'Linha de base',var:'Variabilidade',acc:'Acelerações',dec:'Desacelerações',cont:'Contrações',figo:'Classificação',mech:'Interpretação fisiológica'};
const PROG_N=60;   // as percentagens usam as últimas 60 respostas

function progAll(){return store('ctg-prog')||[]}
function progAdaptive(){const v=store('ctg-adapt');return v==null?true:!!v}
function progRecord(x){const h=progAll();const e={...x,t:Date.now()};h.push(e);store('ctg-prog',h.slice(-1500));if(typeof accPush==='function')accPush(e.x?'exame':'treino',e)}
const progSevere=k=>k==='P'||k==='III';

/* desempenho por padrão (receita): proporção de campos certos, com mais peso para a classificação */
function progByRecipe(h){
  const by={};h.slice(-400).forEach((x,i)=>{const s=(by[x.r]=by[x.r]||{n:0,score:0,cls:0,last:-1});
    const ok=PF.filter(f=>x.res[f]).length/7;s.n++;s.score+=ok*.6+(x.res.figo?1:0)*.4;s.cls+=x.res.figo?1:0;s.last=i});
  const L=Math.min(400,h.length);
  for(const k in by){const s=by[k];s.acc=s.score/s.n;s.ago=L-1-s.last}
  return by;
}
/* sorteio adaptativo: padrões nunca vistos e padrões falhados aparecem mais; os dominados voltam espaçados */
function progPick(){
  if(D.force){const r=RECIPES.find(x=>x.id===D.force);D.force=null;if(r)return r}
  const by=progByRecipe(progAll());
  const pool=RECIPES.filter(r=>!D.last.includes(r.id));
  const W=pool.map(r=>{const s=by[r.id];let w=Math.sqrt(r.w);
    if(!s)w*=1.8;                                  // ainda não visto
    else{w*=0.35+2.4*(1-s.acc);                    // quanto mais falha, mais aparece
      if(s.acc>0.85&&s.ago<25)w*=0.35;             // dominado e visto há pouco: espera
      if(s.acc>0.85&&s.ago>=60)w*=1.6;}            // dominado mas já esquecido: volta
    return w});
  const tot=W.reduce((a,b)=>a+b,0);let x=Math.random()*tot;
  for(let i=0;i<pool.length;i++){x-=W[i];if(x<=0)return pool[i]}
  return pool[0];
}

/* níveis: critérios próprios desta plataforma, transparentes, sobre as últimas 60 respostas */
const LEVELS=[
  {n:1,nm:'Iniciação',d:'Reconhece os elementos do traçado com apoio.'},
  {n:2,nm:'Em desenvolvimento',d:'Classifica corretamente a maioria dos traçados; ainda falha padrões menos frequentes.'},
  {n:3,nm:'Prática autónoma',d:'Classificação consistente, incluindo traçados patológicos, em todos os campos.'},
  {n:4,nm:'Referência',d:'Classificação quase sempre certa e confiança bem calibrada: pode apoiar a revisão de outros.'}];
function progStats(list){
  const all=list||progAll(),h=all.slice(-PROG_N),N=all.length;
  const f={};PF.forEach(k=>f[k]=h.length?h.filter(x=>x.res[k]).length/h.length:0);
  const sev=h.filter(x=>progSevere(x.k)),sevAcc=sev.length?sev.filter(x=>x.res.figo).length/sev.length:null;
  const conf={};[1,2,3].forEach(c=>{const z=h.filter(x=>+x.c===c);conf[c]={n:z.length,acc:z.length?z.filter(x=>x.res.figo).length/z.length:null}});
  const minF=Math.min(...PF.map(k=>f[k]));
  const req=[
    null,
    [[N>=15,`fazer pelo menos 15 traçados (${N})`],[f.figo>=.6,`classificação ≥ 60% (${Math.round(f.figo*100)}%)`],[f.dec>=.6,`desacelerações ≥ 60% (${Math.round(f.dec*100)}%)`]],
    [[N>=40,`fazer pelo menos 40 traçados (${N})`],[f.figo>=.8,`classificação ≥ 80% (${Math.round(f.figo*100)}%)`],[minF>=.75,`todos os campos ≥ 75% (pior: ${Math.round(minF*100)}%)`],[sevAcc!=null&&sevAcc>=.8,`traçados patológicos / categoria III certos ≥ 80% (${sevAcc==null?'sem casos ainda':Math.round(sevAcc*100)+'%'})`]],
    [[N>=80,`fazer pelo menos 80 traçados (${N})`],[f.figo>=.9,`classificação ≥ 90% (${Math.round(f.figo*100)}%)`],[minF>=.85,`todos os campos ≥ 85% (pior: ${Math.round(minF*100)}%)`],[sevAcc!=null&&sevAcc>=.9,`patológicos certos ≥ 90% (${sevAcc==null?'—':Math.round(sevAcc*100)+'%'})`],[conf[3].n>=10&&conf[3].acc>=.9,`quando diz «confiança alta», acerta ≥ 90% (${conf[3].n<10?'precisa de 10 respostas com confiança alta':Math.round(conf[3].acc*100)+'%'})`]]];
  let lvl=1;for(let L=1;L<=3;L++){if(req[L].every(r=>r[0]))lvl=L+1;else break}
  const next=lvl<4?req[lvl].filter(r=>!r[0]).map(r=>r[1]):[];
  return{N,n:h.length,f,sevAcc,sevN:sev.length,conf,lvl,next};
}
function progWeak(list){
  const by=progByRecipe(list||progAll());
  return Object.entries(by).filter(([,s])=>s.n>=1&&s.acc<0.8).sort((a,b)=>a[1].acc-b[1].acc).slice(0,5)
    .map(([id,s])=>({id,s,r:RECIPES.find(x=>x.id===id)})).filter(x=>x.r);
}
function renderProg(){
  const el=document.getElementById('dProg');if(!el)return;
  const S=progStats(),L=LEVELS[S.lvl-1],weak=progWeak();
  const bar=(v,good=.8,ok=.6)=>`<div class="tr"><div style="width:${Math.round(v*100)}%;background:${v>=good?'var(--ok)':v>=ok?'var(--warn)':'var(--bad)'}"></div></div>`;
  const cal=[1,2,3].map(c=>S.conf[c]).some(x=>x.n);
  el.innerHTML=`<div class="pghead"><div><h3 style="margin:0">O seu progresso</h3><p class="small" style="margin:2px 0 0">${S.N?`${S.N} traçado(s) no total · percentagens sobre os últimos ${S.n}`:'Ainda sem respostas. Faça o primeiro traçado.'}</p></div>
     <label class="chk small"><input type="checkbox" id="pgAdapt" ${progAdaptive()?'checked':''}> Sorteio adaptativo</label></div>
   <div class="pggrid">
    <div class="pglvl"><div class="lvdots">${[1,2,3,4].map(n=>`<i class="${n<=S.lvl?'on':''}"></i>`).join('')}</div>
      <div class="lvn">Nível ${S.lvl} · ${L.nm}</div><p class="small">${L.d}</p>
      ${S.next.length?`<div class="small"><b>Para o nível ${S.lvl+1}:</b><ul>${S.next.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`:'<p class="small"><b>Nível máximo.</b> Continue a treinar para o manter.</p>'}</div>
    <div><h4 class="eg" style="margin-top:0">Por campo</h4>${S.n?PF.map(k=>`<div class="fbar"><span>${PF_L[k]}</span>${bar(S.f[k])}<span class="mono">${Math.round(S.f[k]*100)}%</span></div>`).join(''):'<p class="small">—</p>'}
      ${S.sevN?`<div class="fbar" style="margin-top:6px"><span>Patológicos / cat. III</span>${bar(S.sevAcc)}<span class="mono">${Math.round(S.sevAcc*100)}%</span></div>`:''}</div>
    <div><h4 class="eg" style="margin-top:0">Padrões a rever</h4>${weak.length?weak.map(w=>`<div class="pgw"><span>${esc(w.r.nm)}<small>${w.s.n}× · ${Math.round(w.s.acc*100)}%</small></span><button class="btn sm" data-r="${w.r.id}">Treinar</button></div>`).join(''):'<p class="small">Nenhum padrão abaixo de 80% por agora.</p>'}
      ${cal?`<h4 class="eg">Confiança e acerto na classificação</h4>${[3,2,1].map(c=>S.conf[c].n?`<div class="fbar"><span>Confiança ${RV_CONF[c].toLowerCase()}</span>${bar(S.conf[c].acc,.9,.7)}<span class="mono">${Math.round(S.conf[c].acc*100)}% · ${S.conf[c].n}</span></div>`:'').join('')}
        <p class="small">Uma confiança bem calibrada acerta mais quando diz «alta» do que quando diz «baixa».</p>`:''}</div>
   </div>
   <p class="small pgfoot">Níveis definidos por esta plataforma a partir de critérios de desempenho; não são uma certificação. O sorteio adaptativo mostra mais vezes os padrões em que falha e espaça os que já domina. <button class="linkbtn" id="pgReset">Apagar progresso</button></p>`;
  $('pgAdapt').onchange=e=>store('ctg-adapt',e.target.checked);
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{D.force=b.dataset.r;newDrill();$('dTitle').scrollIntoView({behavior:'smooth',block:'start'})});
  $('pgReset').onclick=e=>{const b=e.target;if(b.dataset.c){store('ctg-prog',[]);if(typeof accDelete==='function')accDelete(['treino','exame']);renderProg()}else{b.dataset.c=1;b.textContent='Confirmar: apagar o progresso'}};
}
