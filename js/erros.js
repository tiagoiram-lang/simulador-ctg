/* Classificação de erros: transforma revisões, critérios clínicos e respostas do Treino rápido num perfil de erros
   por categoria, e sugere o que treinar a seguir. */
const ERR={
  base:{g:'Leitura',l:'Linha de base',d:'Linha de base estimada com mais de 8 bpm de diferença.'},
  var:{g:'Leitura',l:'Variabilidade',d:'Variabilidade classificada de forma diferente.'},
  acc:{g:'Leitura',l:'Acelerações',d:'Acelerações dadas como presentes ou ausentes por engano.'},
  dec:{g:'Leitura',l:'Desacelerações',d:'Tipo de desacelerações mal identificado.'},
  cont:{g:'Leitura',l:'Contrações',d:'Contagem das contrações em 10 min errada (taquissistolia pode passar despercebida).'},
  sub:{g:'Interpretação',l:'Subestimar a gravidade',d:'Classificação FIGO menos grave do que a correta.'},
  sobre:{g:'Interpretação',l:'Sobrestimar a gravidade',d:'Classificação FIGO mais grave do que a correta.'},
  mech:{g:'Interpretação',l:'Fisiologia da hipoxia',d:'Tipo de hipoxia ou causa não hipóxica mal identificado.'},
  plan:{g:'Decisão',l:'Plano',d:'Plano escolhido na revisão diferente do indicado.'},
  tardia:{g:'Decisão',l:'Escalada ou parto tardio',d:'Atuação ou decisão de parto depois do momento indicado.'},
  causa:{g:'Decisão',l:'Causas reversíveis',d:'Ocitocina, taquissistolia, hipotensão ou outra causa corrigível não tratada a tempo.'},
  inter:{g:'Decisão',l:'Intervenção desnecessária',d:'Cesariana, parto instrumentado ou terapêutica sem indicação.'},
  sinal:{g:'Decisão',l:'Origem do sinal',d:'Registo da FC materna não identificado.'},
  infec:{g:'Decisão',l:'Febre e infeção',d:'Febre intraparto sem antibioterapia a tempo.'},
  vigil:{g:'Decisão',l:'Vigilância',d:'Menos revisões estruturadas do que o recomendado.'},
};
const ERR_G=['Leitura','Interpretação','Decisão'];
const FIGO_ORD={N:0,S:1,P:2};
const REV_K={'Linha de base':'base','Contrações / 10 min':'cont','Variabilidade':'var','Acelerações':'acc','Desacelerações':'dec','Interpretação':'mech','Plano':'plan'};

/* erros de um caso da Sala de partos: [{c, d, clock}] */
function errsFromCase(sim,ev){
  const out=[],add=(c,d,clock)=>out.push({c,d,clock});
  for(const r of sim.reviews)for(const f of r.fields){if(f.ok)continue;
    if(f.k==='Classificação FIGO'){const a=r.ans&&r.ans.figo,t=r.truthFigo;
      if(t==='X')add('sinal',`Revisão das ${r.clock}: o sinal era materno.`,r.clock);
      else if(a&&t&&FIGO_ORD[a]<FIGO_ORD[t])add('sub',`Revisão das ${r.clock}: ${f.a.toLowerCase()} em vez de ${f.tr.toLowerCase()}.`,r.clock);
      else add('sobre',`Revisão das ${r.clock}: ${f.a.toLowerCase()} em vez de ${f.tr.toLowerCase()}.`,r.clock)}
    else if(REV_K[f.k])add(REV_K[f.k],`Revisão das ${r.clock}: ${f.k.toLowerCase()} — respondeu «${f.a}», correto «${f.tr}».`,r.clock)}
  for(const c of ev.crit){if(c.ok)continue;const k=c.k;let code=null;
    if(/Revisão sistemática/.test(k))code='vigil';
    else if(/Coincidência|duplicação/.test(k))code='sinal';
    else if(/Estabilizar a mãe/.test(k))code='inter';
    else if(/Sulfato de magnésio/.test(k))code='causa';
    else if(/Gémeo B/.test(k))code='tardia';
    else if(/taquissistolia|Ocitocina num feto|protocolo de ocitocina|Correção da causa/.test(k))code='causa';
    else if(/Evitar atrasos|Reconhecimento precoce|sem recuperação|Parto imediato|traçado patológico|descompensação|sinusoidal/.test(k))code='tardia';
    else if(/Evitar cesariana|sem evidência|Decisão de parto justificada/.test(k))code='inter';
    else if(/Febre/.test(k))code='infec';
    else if(/origem do sinal/.test(k))code='sinal';
    if(code)add(code,`${k}: ${c.d}`)}
  return out;
}
/* erros de uma resposta do Treino rápido (só os campos de leitura e interpretação) */
function errsFromDrill(x){
  const out=[];if(!x||!x.res)return out;
  ['base','var','acc','dec','cont','mech'].forEach(k=>{if(x.res[k]===false)out.push(k)});
  if(x.res.figo===false){if(x.a!=null&&x.k!=null){const a=FIGO_ORD[x.a]??{I:0,II:1,III:2}[x.a],t=FIGO_ORD[x.k]??{I:0,II:1,III:2}[x.k];out.push(a!=null&&t!=null&&a<t?'sub':'sobre')}else out.push('sub')}
  return out;
}
/* perfil: taxa de erro por categoria sobre as últimas respostas e casos */
function errProfile(cases,drills){
  const C=(cases||[]).slice(-15),D=(drills||[]).slice(-PROG_N);
  const n={},opp={};
  for(const k in ERR){n[k]=0;opp[k]=0}
  D.forEach(x=>{['base','var','acc','dec','cont','mech'].forEach(k=>opp[k]++);opp.sub++;opp.sobre++;errsFromDrill(x).forEach(c=>n[c]++)});
  C.forEach(h=>{const e=h.errs||[];for(const k in ERR)opp[k]+=(['tardia','causa','inter','sinal','infec','vigil','plan'].includes(k)?1:(h.nrev||0));
    const seen=new Set();e.forEach(c=>{if(['tardia','causa','inter','sinal','infec','vigil'].includes(c)){if(!seen.has(c)){seen.add(c);n[c]++}}else n[c]++})});
  const rows=Object.keys(ERR).map(k=>({k,n:n[k],opp:opp[k],rate:opp[k]?n[k]/opp[k]:0})).filter(r=>r.n>0).sort((a,b)=>b.n-a.n||b.rate-a.rate);
  return{rows,nCases:C.length,nDrill:D.length};
}
/* que casos treinam cada categoria de decisão */
function caseSkills(cs){
  const f=cs.fet,txt=(cs.ideal||[]).join(' ')+' '+(cs.tag||''),s=new Set();
  if(f.mhrCapture||f.dblArt||cs.twin)s.add('sinal');
  if(cs.twin||cs.vasaRisk||cs.preecl)s.add('tardia');
  if(f.fever)s.add('infec');
  if(cs.protocolOxy||cs.start.oxy>0||f.spont>4.8)s.add('causa');
  if(cs.dif==='Avançado'||f.reserve<.7||cs.prolapseRisk||f.sinus)s.add('tardia');
  if(/[Nn]ão intervir|[Nn]ão decidir|[Ee]vitar a cesariana|[Nn]ão acelerar|sem intervenções|[Nn]ão está indicad/.test(txt))s.add('inter');
  if(/sono fetal|magnésio|febre|taquicardia|linha de base|petidina|betametasona|extrassístoles/.test(txt))s.add('mech');
  return s;
}
function errSuggest(code){
  if(ERR[code].g!=='Decisão'||code==='plan'||code==='vigil'){
    return code==='vigil'?{txt:'Em qualquer caso da Sala de partos, faça pelo menos uma revisão estruturada por hora.',cases:[]}
      :{txt:'O Treino rápido adaptativo insiste nos padrões em que falha; use-o 10 minutos por dia.',drill:true,cases:[]};
  }
  const hist=store('ctg-hist')||[];
  const L=CASES.filter(c=>caseSkills(c).has(code)).map(c=>({c,done:hist.filter(h=>h.id===c.id).length,best:hist.filter(h=>h.id===c.id).reduce((m,h)=>Math.max(m,h.score),-1)}))
    .sort((a,b)=>a.done-b.done||a.best-b.best).slice(0,3).map(x=>x.c);
  return{txt:'Casos que treinam isto:',cases:L};
}

/* ---------- interface ---------- */
function errCaseHTML(errs){
  if(!errs.length)return'<h3>Classificação dos erros</h3><p class="small">Nenhum erro identificado neste caso.</p>';
  const by={};errs.forEach(e=>(by[e.c]=by[e.c]||[]).push(e));
  const keys=Object.keys(by).sort((a,b)=>ERR_G.indexOf(ERR[a].g)-ERR_G.indexOf(ERR[b].g)||by[b].length-by[a].length);
  return`<h3>Classificação dos erros</h3><p class="small">Os erros deste caso agrupados por tipo. O perfil acumulado está em Resultados.</p><div class="errl">${keys.map(k=>`<details class="erri"><summary><span class="ebadge g-${ERR_G.indexOf(ERR[k].g)}">${ERR[k].g}</span><b>${ERR[k].l}</b><span class="mono">×${by[k].length}</span></summary><ul>${by[k].map(e=>`<li>${esc(e.d)}</li>`).join('')}</ul></details>`).join('')}</div>`;
}
function errProfileHTML(P,opts={}){
  if(!P.rows.length)return`<p class="small">${P.nCases+P.nDrill?'Sem erros recorrentes nos registos recentes.':'Ainda sem dados: faça casos na Sala de partos e traçados no Treino rápido.'}</p>`;
  const max=Math.max(...P.rows.map(r=>r.n));
  return`<div class="errp">${P.rows.slice(0,opts.top||8).map(r=>{const s=opts.noSuggest?null:errSuggest(r.k);
    return`<div class="errr"><span class="ebadge g-${ERR_G.indexOf(ERR[r.k].g)}">${ERR[r.k].g}</span><span class="en"><b>${ERR[r.k].l}</b><small>${ERR[r.k].d}</small></span><span class="eb"><i style="width:${Math.round(r.n/max*100)}%"></i></span><span class="mono">${r.n}</span>${s?`<span class="es">${s.cases.length?s.txt+' '+s.cases.map(c=>`<button class="btn sm" data-errcase="${c.id}">${esc(c.nome.split(' ')[0])}</button>`).join(' '):s.drill?`<a class="btn sm" href="#treino">Treino rápido</a>`:`<span class="small">${s.txt}</span>`}</span>`:''}</div>`}).join('')}</div>
  <p class="small">Com base em ${P.nCases} caso(s) da Sala de partos e ${P.nDrill} traçado(s) do Treino rápido recentes.</p>`;
}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-errcase]');if(!b)return;location.hash='sala';setTimeout(()=>{$('wDeb').style.display='none';$('wPick').style.display='';wStart(b.dataset.errcase)},60)});
function errRenderResults(){const el=document.getElementById('hErr');if(!el)return;
  el.innerHTML=errProfileHTML(errProfile(store('ctg-hist')||[],(typeof progAll==='function'?progAll():[]).filter(x=>!x.x)))}
function errRefresh(){}
