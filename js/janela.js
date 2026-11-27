/* Janela de oportunidade: repete o caso com a mesma semente, reproduz as ações do formando até um minuto de corte
   e, a partir daí, aplica uma atuação ideal automática. Mostra o pH provável ao nascer consoante o momento em que
   a atuação certa começa. A atuação ideal segue as regras da FIGO e da fisiologia do modelo; não é a única correta. */

function idealStep(s,P){
  const st=s.st,f=s.cs.fet,A=s.acute,e=s.e;
  const act=id=>{if(s.avail(id).ok){const r=s.act(id);if(r)P.log.push({tm:r.tm,clock:r.clock,lab:r.lab,id});return r}};
  const deliver=urgent=>{if(s.flags.ajuda==null)act('ajuda');if(st.dil>=10&&st.station>=1)act('inst');else act(urgent?'ces1':'ces2')};
  if(s.decision||s.ended)return;
  const tr=s.truth();if(!tr)return;
  const p10=e.contr10(),bad=tr.figo==='P'||tr.figo==='S';
  /* origem do sinal */
  if((e.p.mhrCapture||e.p.maternal)&&(st.pushing||tr.figo==='X'))act('oximetro');
  if(tr.figo==='X'){act('eletrodo');return}
  /* acidentes agudos: parto imediato */
  if(A&&!A.resolved&&ACCIDENTS.includes(A.cause)&&s.tmin()>=A.start+(A.cause==='descolamento'?4:0)){if(A.cause==='prolapso')act('genu');deliver(true);return}
  /* causas maternas */
  if(st.hypo){if(!['lat_e','lat_d'].includes(st.posicao))act('lat_e');if(!P.fl){act('fluidos');P.fl=1}if(st.tas<90&&!P.va){act('vaso');P.va=1}}
  if(st.temp>=37.8){act('paracet');act('abx')}
  if(f.sinus){act('eco');deliver(false);return}
  /* causas uterinas e de cordão */
  if(st.oxy>0&&(bad||p10>5||f.chronic))act('oxy_stop');
  if((p10>5||(A&&A.cause==='hipertonia'&&!A.resolved))&&s.tmin()>=st.tocoUntil)act('terb');
  if((tr.figo==='P'||tr.cnt.variavel>=1||tr.cnt.tardia>=1||e.pro)&&bad&&!['lat_e','lat_d'].includes(st.posicao))act('lat_e');
  if(st.pushing&&(tr.figo==='P'||tr.mech.includes('subaguda')))act('puxos_stop');
  if(!st.pushing&&st.dil>=10&&tr.figo==='N'&&s.flags.noPush!=null&&s.tmin()-s.flags.noPush>=10)act('puxos_ini');
  /* desaceleração prolongada: regra 3-6-9-12-15 */
  if(e.pro){const d=(e.t-e.pro.s)/60;if(d>=3)act('ajuda');if(d>=9||(d>=6&&tr.cat==='reduzida'))deliver(true);return}
  /* traçado patológico que não reverte */
  if(tr.figo==='P')P.pStart??=s.tmin();else P.pStart=null;
  const only=tr.plan.length===1&&tr.plan[0]==='parto_imediato';
  if(only)deliver(true);
  else if((tr.plan.includes('acelerar')||tr.plan.includes('parto_imediato'))&&P.pStart!=null&&s.tmin()-P.pStart>=15)deliver(false);
}

const cfLab=a=>/^oxy_/.test(a.id)?'Ocitocina: '+a.lab.toLowerCase():a.lab;
function cfRun(sim,cut){
  const s=new LabourSim(sim.src,{mode:'avaliacao',seed:sim.seed});
  const acts=sim.acts.filter(a=>a.tm<cut-1e-9);let i=0,next=cut;const P={log:[],pStart:null};
  for(let k=0;k<420*120&&!s.ended;k++){
    const tm=s.tmin();
    while(i<acts.length&&tm>=acts[i].tm-1e-6){s.act(acts[i].id);i++}
    if(tm>=cut&&tm>=next-1e-9){idealStep(s,P);next=tm+1}
    if(s.ended)break;s.step();
  }
  if(!s.ended)s.finish('fim');
  const o=s.outcome;return{cut,pH:o.born?o.pHa:Math.round(s.st.pH*100)/100,born:o.born,tm:o.tm,label:o.label,log:P.log};
}

/* pontos de corte: do início até à decisão do formando (ou ao fim), em passos regulares */
function cfCuts(sim){
  const o=sim.outcome,end=sim.decision?sim.decision.at:(o?o.tm:sim.tmin());
  const stop=Math.max(5,end),step=Math.max(10,Math.ceil(stop/14/5)*5),cuts=[];
  for(let c=0;c<stop-2;c+=step)cuts.push(c);
  return cuts;
}

/* corre os cenários em pedaços para não bloquear a página; chama onPart à medida que avança */
function cfAnalyse(sim,onPart,onDone){
  const cuts=cfCuts(sim),pts=[];let i=0,cancelled=false;
  const tick=()=>{if(cancelled)return;const t0=performance.now();
    while(i<cuts.length&&performance.now()-t0<60){pts.push(cfRun(sim,cuts[i]));i++}
    onPart&&onPart(pts,cuts.length);
    if(i<cuts.length)setTimeout(tick,0);else onDone&&onDone(pts)};
  setTimeout(tick,30);
  return()=>{cancelled=true};
}

/* leitura dos resultados: janela, custo do atraso e o que a atuação ideal fez primeiro */
function cfSummary(sim,pts){
  const o=sim.outcome,user=o&&o.born?o.pHa:Math.round(sim.st.pH*100)/100;
  if(!pts.length)return null;
  const best=pts[0],target=Math.min(7.2,Math.round((best.pH-.02)*100)/100);
  let lastGood=null;for(const p of pts)if(p.pH>=target)lastGood=p;
  const gain=Math.round((best.pH-user)*100)/100;
  const after=pts.filter(p=>lastGood&&p.cut>lastGood.cut);
  let slope=null;if(lastGood&&after.length){const z=after[after.length-1];slope=(lastGood.pH-z.pH)/((z.cut-lastGood.cut)/10)}
  const firstGood=sim.acts.find(a=>a.q==='good');
  return{user,best,target,lastGood,gain,slope,firstGood,closed:lastGood&&after.length?after[0]:null};
}

function cfChart(sim,pts,S,total){
  const W=760,H=220,L=46,R=16,T=14,B=34;
  const maxT=Math.max(...pts.map(p=>p.cut),sim.decision?sim.decision.at:0,10);
  const lo=Math.min(S.user,...pts.map(p=>p.pH)),xs=t=>L+(W-L-R)*(t/(maxT||1)),y0=lo<6.85?6.6:6.8,y1=7.4,ys=v=>T+(H-T-B)*(1-(Math.max(y0,Math.min(y1,v))-y0)/(y1-y0));
  const ticksY=(y0<6.8?[6.7,6.8,6.9,7.0,7.1,7.2,7.3]:[6.9,7.0,7.1,7.2,7.3]).map(v=>`<line x1="${L}" x2="${W-R}" y1="${ys(v)}" y2="${ys(v)}" class="g"/><text x="${L-8}" y="${ys(v)+4}" text-anchor="end">${num(v,1)}</text>`).join('');
  const nt=Math.min(7,pts.length),ticksX=Array.from({length:nt},(_,k)=>{const t=Math.round(maxT*k/Math.max(1,nt-1));return`<text x="${xs(t)}" y="${H-12}" text-anchor="middle">${sim.clock(sim.t0+t*60)}</text>`}).join('');
  const line=pts.map((p,k)=>`${k?'L':'M'}${xs(p.cut).toFixed(1)},${ys(p.pH).toFixed(1)}`).join(' ');
  const win=S&&S.lastGood?`<rect x="${L}" y="${T}" width="${Math.max(0,xs(S.lastGood.cut)-L)}" height="${H-T-B}" class="win"/>`:'';
  const dec=sim.decision?`<line x1="${xs(sim.decision.at)}" x2="${xs(sim.decision.at)}" y1="${T}" y2="${H-B}" class="dec"/><text x="${xs(sim.decision.at)+(xs(sim.decision.at)>W-120?-4:4)}" y="${T+11}" text-anchor="${xs(sim.decision.at)>W-120?'end':'start'}" class="lab">a sua decisão</text>`:'';
  const usr=`<line x1="${L}" x2="${W-R}" y1="${ys(S.user)}" y2="${ys(S.user)}" class="usr"/><text x="${W-R}" y="${ys(S.user)-5}" text-anchor="end" class="lab">o seu resultado: ${S.user.toFixed(2).replace('.',',')}</text>`;
  const dots=pts.map(p=>`<circle cx="${xs(p.cut)}" cy="${ys(p.pH)}" r="3.5" class="${p.pH>=7.2?'ok':p.pH>=7.1?'wn':'bd'}"><title>Atuação ideal a partir das ${sim.clock(sim.t0+p.cut*60)}: pH ${p.pH.toFixed(2).replace('.',',')}</title></circle>`).join('');
  const prog=total&&pts.length<total?`<text x="${W/2}" y="${H/2}" text-anchor="middle" class="lab">A calcular… ${pts.length}/${total}</text>`:'';
  return`<svg class="cfchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="pH provável ao nascer consoante a hora a que começa a atuação ideal">${win}${ticksY}${ticksX}<text x="12" y="${T+(H-T-B)/2}" transform="rotate(-90 12 ${T+(H-T-B)/2})" text-anchor="middle" class="lab">pH artéria</text>${usr}${dec}<path d="${line}" class="ln"/>${dots}${prog}</svg>`;
}

function cfText(sim,S){
  const ck=t=>sim.clock(sim.t0+t*60),ph=v=>v.toFixed(2).replace('.',',');
  if(S.gain<=.03)return`<p>A sua atuação ficou ao nível da atuação ideal: com a melhor conduta desde o início, o pH provável seria ${ph(S.best.pH)}; o seu foi ${ph(S.user)}.</p>`;
  let t=`<p>Com a atuação ideal desde o início do caso, o pH provável ao nascer seria <b>${ph(S.best.pH)}</b>; o seu resultado foi <b>${ph(S.user)}</b>.`;
  if(S.lastGood&&S.closed)t+=` A janela de oportunidade esteve aberta até cerca das <b>${ck(S.lastGood.cut)}</b>: até aí, começar a atuar ainda levava a pH ≥ ${ph(S.target)}. A partir das ${ck(S.closed.cut)} já não.`;
  else if(S.lastGood)t+=` Começar a atuação certa em qualquer momento até à sua decisão ainda levava a pH ≥ ${ph(S.target)}: a diferença esteve no que foi feito, não só no tempo.`;
  t+='</p>';
  if(S.slope!=null&&S.slope>.005)t+=`<p>Depois de a janela fechar, cada 10 min de atraso custou em média ${num(S.slope,2)} de pH.</p>`;
  if(S.firstGood)t+=`<p class="small">A sua primeira ação útil foi às ${S.firstGood.clock} (${esc(cfLab(S.firstGood).toLowerCase())}).</p>`;
  return t;
}

function cfIdealList(sim,p){
  if(!p.log.length)return'<p class="small">A atuação ideal não precisou de nenhuma ação: vigilância e revisões regulares.</p>';
  return`<ol class="cflog">${p.log.slice(0,8).map(a=>`<li><span class="mono">${a.clock}</span> ${esc(cfLab(a))}</li>`).join('')}</ol>`;
}

/* monta a secção do relatório e vai preenchendo à medida que os cenários terminam */
function cfMount(sim,box){
  if(!box)return;
  box.innerHTML=`<h3>Janela de oportunidade</h3><p class="small">O simulador repetiu este caso exatamente igual, com as suas ações até um certo minuto e, daí em diante, com uma atuação ideal automática. O gráfico mostra o pH provável ao nascer consoante a hora a que a atuação certa começa. A zona sombreada é a janela em que ainda se chegava a um bom resultado.</p><div class="cfbody"><p class="small">A calcular os cenários…</p></div>`;
  const body=box.querySelector('.cfbody');
  const cancel=cfAnalyse(sim,(pts,total)=>{if(!document.body.contains(box))return cancel();const S=cfSummary(sim,pts);if(S)body.innerHTML=cfChart(sim,pts,S,total)},
    pts=>{if(!document.body.contains(box))return;const S=cfSummary(sim,pts);if(!S){body.innerHTML='<p class="small">Caso demasiado curto para esta análise.</p>';return}
      sim._cf=S;
      body.innerHTML=cfChart(sim,pts,S)+`<div class="two cftwo"><div>${cfText(sim,S)}</div><div><h4>O que a atuação ideal fez, desde o início</h4>${cfIdealList(sim,S.best)}<p class="small">A atuação ideal é gerada automaticamente a partir da classificação FIGO e da fisiologia do modelo. Serve para comparar momentos, não é a única conduta correta.</p></div></div>`;
      if(typeof errRefresh==='function')errRefresh(sim)});
}
