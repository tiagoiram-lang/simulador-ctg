/* Traçados reais anonimizados (CTU-UHB, PhysioNet): biblioteca e desafio */
const R={meta:null,auto:false,data:null,loading:null,mode:'lib',cur:null,win:20,pos:0,reveal:false,ch:null,chWin:30,seen:[],
  f:{ph:'all',via:'all',ga:'all',sig:'all',q:'all',ind:false,mec:false,show:false},chunks:{},tok:0};
const PH_BANDS={all:'Todos os pH',lt705:'< 7,05',b715:'7,05–7,14',b720:'7,15–7,19',ge720:'≥ 7,20'};
const yn=v=>v===1?'sim':v===0?'não':'—';
const ph2=v=>v.toFixed(2).replace('.',',');
function realLoad(){
  if(R.data)return Promise.resolve();
  if(!R.loading)R.loading=fetch('data/ctu-index.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(j=>{R.data=j.recs;R.meta=j.meta||null}).catch(e=>{R.loading=null;throw e});
  return R.loading;
}
/* o sinal de cada registo está em blocos de ~46 partos (≈0,6 MB), descarregados só quando são precisos */
function realChunk(c){
  if(!R.chunks[c])R.chunks[c]=fetch(`data/ctu-${c}.json`).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).catch(e=>{delete R.chunks[c];throw e});
  return R.chunks[c];
}
function realSig(m){
  if(m.b64)return Promise.resolve(m);
  return realChunk(m.c).then(part=>{const x=part[m.id];if(!x)throw new Error('sem sinal');m.b64=x.b64;m.bl=x.bl;m.dd=x.dd;return m});
}
const qLab=q=>q>0.3?`sinal com falhas (${Math.round(q*100)}% em falta nos últimos 30 min)`:'';
function cvWait(cv,txt){const {c,W,H}=fitCanvas(cv);c.fillStyle='#FFF8F4';c.fillRect(0,0,W,H);c.fillStyle='#8A8F98';c.font='13px system-ui,sans-serif';c.textAlign='center';c.fillText(txt,W/2,H/2)}
function realEng(m){
  if(m._e)return m._e;
  const raw=atob(m.b64),n=m.n,F=new Array(2*n),T=new Array(2*n);
  for(let k=0;k<n;k++){const f=raw.charCodeAt(k),u=raw.charCodeAt(n+k);const fv=f===0?NaN:f,uv=u===255?NaN:u;F[2*k]=F[2*k+1]=fv;T[2*k]=T[2*k+1]=uv}
  const e={F,T,M:new Array(2*n).fill(NaN),TF:F,p:{showMhr:false},t:n,marks:m.ii?[{t:m.ii,n:'Expulsivo'}]:[]};
  m._e=e;return e;
}
function phBand(p){return p<7.05?'lt705':p<7.15?'b715':p<7.2?'b720':'ge720'}
function phCls(p){return p<7.05?'bad':p<7.15?'warn':p<7.2?'warn':'good'}
function sigLab(rt){return rt===2?'Elétrodo de escalpe (ECG)':rt===12?'Ultrassons, depois elétrodo':'Ultrassons externo'}
function ctxChips(m){
  const ch=[`${m.age|0} anos`,`${m.ga|0} semanas`,`G${m.grav|0}P${m.par|0}`,sigLab(m.rt)];
  if(m.ind===1)ch.push('Trabalho de parto induzido');if(m.mec===1)ch.push('Líquido meconial');if(m.pyr===1)ch.push('Febre materna');
  if(m.q30>0.3)ch.push(`Sinal com ${Math.round(m.q30*100)}% em falta (últimos 30 min)`);
  if(m.diab===1)ch.push('Diabetes');if(m.hta===1)ch.push('Hipertensão');if(m.pe===1)ch.push('Pré-eclâmpsia');
  return ch.map(c=>`<span class="cchip">${esc(c)}</span>`).join('');
}
function areaHTML(m){
  const M=R.meta;if(!M||m.a30==null)return'';
  const s=M.a30sorted;let k=0;while(k<s.length&&s[k]<=m.a30)k++;const pct=Math.round(k/s.length*100);
  const b=M.bands.find(x=>m.a30>=x.lo&&(x.hi==null||m.a30<x.hi))||M.bands[M.bands.length-1];
  return`<div class="areabox"><b>Área de desacelerações nos últimos 30 min: ${num(m.a30,0)} bpm·min</b> (medida automática; percentil ${pct} dos 552 partos). Nos partos da base com área semelhante, ${Math.round(b.ac*100)}% nasceram com pH &lt; 7,15 e ${Math.round(b.sev*100)}% com pH &lt; 7,05 (média global: 19% e 7%).</div>`;
}
function outcomeHTML(m){
  const t=[['pH artéria umbilical',ph2(m.pH),phCls(m.pH)],['Défice de bases',m.bdecf!=null?num(m.bdecf,1)+' mmol/L':'—',m.bdecf>=12?'bad':m.bdecf>=8?'warn':'good'],
    ['Apgar 1.º / 5.º min',`${m.a1|0} / ${m.a5|0}`,m.a5<7?'bad':m.a1<7?'warn':'good'],['Via de parto',m.dt===2?'Cesariana':'Vaginal',''],
    ['Peso',m.w?`${m.w|0} g`:'—',''],['UCIN',m.nicu>0?`${m.nicu|0} dia(s)`:'não','']];
  return`<div class="otiles r">${t.map(x=>`<div class="card ot"><div class="k">${x[0]}</div><div class="v ${x[2]}">${x[1]}</div></div>`).join('')}</div>
   ${areaHTML(m)}<p class="small" style="margin:8px 0 0">${m.pH<7.05?'Acidemia grave (pH < 7,05).':m.pH<7.15?'Acidemia (pH < 7,15).':m.pH<7.2?'pH ligeiramente baixo (7,15–7,19).':'Sem acidemia.'} 1.º estádio ${m.st1|0} min${m.st2?`, 2.º estádio ${m.st2|0} min`:''}. O registo termina ${m.s2b?`${m.s2b|0} min`:'menos de 1 min'} antes do parto.</p>`;
}

/* ---------- biblioteca ---------- */
function realFiltered(){
  const f=R.f;return R.data.filter(m=>(f.ph==='all'||phBand(m.pH)===f.ph)&&(f.via==='all'||(f.via==='ces')===(m.dt===2))&&
    (f.ga==='all'||(f.ga==='lt39'?m.ga<39:f.ga==='39_40'?m.ga>=39&&m.ga<=40:m.ga>40))&&(f.sig==='all'||(f.sig==='us'?m.rt===1:m.rt!==1))&&(f.q==='all'||(f.q==='boa'?m.q30<=0.15:f.q==='media'?m.q30>0.15&&m.q30<=0.3:m.q30>0.3))&&(!f.ind||m.ind===1)&&(!f.mec||m.mec===1));
}
function renderRealList(){
  const L=realFiltered();$('rlCount').textContent=`${L.length} de ${R.data.length} registos`;
  $('rlList').innerHTML=L.map(m=>`<button class="rli ${R.cur===m?'on':''}" data-id="${m.id}"><span><b>Registo ${m.id}</b><small>${m.ga|0} sem · G${m.grav|0}P${m.par|0}${m.ind===1?' · induzido':''}${m.mec===1?' · mecónio':''}${m.q30>0.3?' · <span class="qwarn">sinal com falhas</span>':''}</small></span>${R.f.show?`<span class="phc ${phCls(m.pH)}">${ph2(m.pH)}</span>`:''}</button>`).join('')||'<p class="small">Nenhum registo com estes filtros.</p>';
}
function openReal(id){
  const m=R.data.find(x=>x.id===+id);if(!m)return;R.cur=m;R.pos=0;R.reveal=false;const tok=++R.tok;
  $('rlTitle').textContent=`Registo ${m.id}`;$('rlChips').innerHTML=ctxChips(m);$('rlOut').innerHTML='';renderRealList();
  if(!m.b64)cvWait($('cvReal'),'A carregar o traçado…');
  realSig(m).then(()=>{if(tok===R.tok)openReal2(m)}).catch(()=>{if(tok===R.tok)cvWait($('cvReal'),'Não foi possível carregar este traçado. Verifique a ligação e tente de novo.')});
}
function openReal2(m){
  $('rlTitle').textContent=`Registo ${m.id}`;$('rlChips').innerHTML=ctxChips(m);
  $('rlSub').textContent=`${Math.round(m.n/60)} min de registo até ao parto${m.ii?` · expulsivo nos últimos ${Math.round((m.n-m.ii)/60)} min`:''}`;
  $('rlOut').innerHTML=`<button class="btn pri" id="rlReveal">Revelar desfecho</button>`;$('rlReveal').onclick=()=>{R.reveal=true;$('rlOut').innerHTML=outcomeHTML(m)};
  $('rlPos').max=Math.max(0,Math.floor(m.n/60)-R.win);$('rlPos').value=$('rlPos').max;R.pos=0;
  renderRealList();drawReal();
}
function realAnnot(m){
  return{layers:{base:true,dec:true},baseArr:m.bl||[],baseT0:0,decels:(m.dd||[]).map(d=>({s:d[0],e:d[1],nadir:d[2],depth:d[3],cls:'det',lab:'−'+d[3]})),accs:[],contr:[]};
}
function drawReal(){
  if(!R.cur||!R.cur.b64)return;const e=realEng(R.cur);
  drawCTG($('cvReal'),e,{tEnd:e.t-R.pos*60,win:R.win*60,tZero:e.t,marks:true,labEvery:R.win>=60?600:300,annot:R.auto?realAnnot(R.cur):null});
  $('rlAuto').classList.toggle('on',R.auto);$('rlAutoTx').style.display=R.auto?'':'none';
  $('rlPosTx').textContent=R.pos>0?`até ${R.pos} min antes do fim`:'fim do registo (parto)';
}
function initRealLib(){
  const f=R.f;
  $('rlFilters').innerHTML=`
    <label>pH<select id="fPh">${Object.entries(PH_BANDS).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
    <label>Via de parto<select id="fVia"><option value="all">Todas</option><option value="vag">Vaginal</option><option value="ces">Cesariana</option></select></label>
    <label>Idade gestacional<select id="fGa"><option value="all">Todas</option><option value="lt39">&lt; 39 sem</option><option value="39_40">39–40 sem</option><option value="gt40">&gt; 40 sem</option></select></label>
    <label>Qualidade do sinal<select id="fQ"><option value="all">Todas</option><option value="boa">Boa (≤ 15% em falta)</option><option value="media">Razoável (15–30%)</option><option value="falhas">Com falhas (&gt; 30%)</option></select></label>
    <label>Sinal<select id="fSig"><option value="all">Todos</option><option value="us">Ultrassons</option><option value="ecg">Elétrodo de escalpe</option></select></label>
    <label class="chk"><input type="checkbox" id="fInd"> Só induzidos</label>
    <label class="chk"><input type="checkbox" id="fMec"> Só com mecónio</label>
    <label class="chk"><input type="checkbox" id="fShow"> Mostrar o pH na lista</label>`;
  const bind=(id,k,chk)=>$(id).onchange=e=>{f[k]=chk?e.target.checked:e.target.value;renderRealList()};
  bind('fPh','ph');bind('fVia','via');bind('fGa','ga');bind('fSig','sig');bind('fQ','q');bind('fInd','ind',1);bind('fMec','mec',1);bind('fShow','show',1);
  $('rlList').onclick=e=>{const b=e.target.closest('.rli');if(b)openReal(b.dataset.id)};
  $('rlWin').onclick=e=>{const b=e.target.closest('button');if(!b||!R.cur)return;R.win=+b.dataset.w;document.querySelectorAll('#rlWin button').forEach(x=>x.classList.toggle('on',x===b));$('rlPos').max=Math.max(0,Math.floor(R.cur.n/60)-R.win);R.pos=Math.min(R.pos,+$('rlPos').max);$('rlPos').value=$('rlPos').max-R.pos;drawReal()};
  $('rlAuto').onclick=()=>{R.auto=!R.auto;drawReal()};
  $('rlPos').oninput=e=>{R.pos=+$('rlPos').max-+e.target.value;drawReal()};
  renderRealList();openReal((R.data.find(m=>m.q30<=0.15)||R.data[0]).id);
}

/* ---------- desafio ---------- */
const DEC_R={vigiar:'Manter vigilância',corrigir:'Corrigir causas reversíveis e reavaliar',acelerar:'Acelerar o parto'};
function chStats(){return store('ctg-real')||[]}
/* sorteio: só sinais legíveis (≤ 30% em falta nos últimos 30 min) e cerca de 4 em cada 10 com acidemia, para haver casos que ensinam */
function chPick(){
  const ok=R.data.filter(m=>m.q30<=0.3&&!R.seen.includes(m.id));
  const ac=ok.filter(m=>m.pH<7.15),no=ok.filter(m=>m.pH>=7.15);
  const pool=(Math.random()<0.4&&ac.length)?ac:(no.length?no:ok);
  return pool[Math.floor(Math.random()*pool.length)]||R.data[0];
}
function newChallenge(){
  const m=chPick();
  R.seen=[m.id,...R.seen].slice(0,40);R.ch={m,done:false};
  const G=D.guide;
  $('rcTitle').textContent='Desafio · adivinhe o desfecho';$('rcChips').innerHTML=ctxChips(m);
  $('rcSub').textContent=`Últimos ${R.chWin} min antes do parto. O registo termina ${m.s2b?`${m.s2b|0} min`:'menos de 1 min'} antes do nascimento.`;
  $('rcOut').innerHTML='';$('rcOut').classList.remove('on');
  $('rcForm').innerHTML=`<div class="gbar"><span class="small">Classificar segundo</span><div class="seg" id="xGuideR">${Object.entries(GUIDE).map(([k,l])=>`<button data-g="${k}" class="${k===G?'on':''}">${l}</button>`).join('')}</div></div>
    <div class="rf"><h4>Classificação do traçado</h4><div class="opts2" id="rcCls">${radios('rcCls',CLS_OPTS[G])}</div></div>
    <div class="rf"><h4>Este recém-nascido teve acidemia (pH &lt; 7,15)?</h4><div class="opts2">${radios('rcAc',{1:'Sim',0:'Não'})}</div></div>
    <div class="rf"><h4>Confiança</h4><div class="opts2">${radios('rcConf',{1:'Baixa',2:'Média',3:'Alta'})}</div></div>
    <div class="rf"><h4>O que faria neste momento?</h4><div class="opts2">${radios('rcDec',DEC_R)}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="rcGo">Revelar desfecho</button><button class="btn" id="rcSkip">Outro traçado</button></div><div class="small" id="rcMsg" style="color:var(--bad)"></div>`;
  $('xGuideR').onclick=e=>{const b=e.target.closest('button');if(!b||R.ch.done)return;D.guide=b.dataset.g;store('ctg-guide',D.guide);document.querySelectorAll('#xGuideR button').forEach(x=>x.classList.toggle('on',x===b));$('rcCls').innerHTML=radios('rcCls',CLS_OPTS[D.guide])};
  $('rcGo').onclick=submitChallenge;$('rcSkip').onclick=newChallenge;
  renderChStats();const tok=++R.tok;
  if(!m.b64)cvWait($('cvRealC'),'A carregar o traçado…');
  realSig(m).then(()=>{if(tok===R.tok&&R.ch&&R.ch.m===m)drawChallenge()}).catch(()=>{if(R.ch&&R.ch.m===m)cvWait($('cvRealC'),'Não foi possível carregar este traçado. Carregue em «Outro traçado».')});
}
function drawChallenge(){if(!R.ch||!R.ch.m.b64)return;const e=realEng(R.ch.m);drawCTG($('cvRealC'),e,{tEnd:e.t,win:R.chWin*60,tZero:e.t,marks:true,labEvery:R.chWin>=60?600:300})}
function submitChallenge(){
  const g=n=>{const x=document.querySelector(`input[name=${n}]:checked`);return x?x.value:null};
  const a={cls:g('rcCls'),ac:g('rcAc'),conf:g('rcConf'),dec:g('rcDec')};
  if(!a.cls||a.ac==null||!a.conf||!a.dec){$('rcMsg').textContent='Responda a todas as perguntas.';return}
  const m=R.ch.m;if(!m.b64){$('rcMsg').textContent='Espere que o traçado termine de carregar.';return}R.ch.done=true;$('rcMsg').textContent='';
  document.querySelectorAll('#rcForm input').forEach(i=>i.disabled=true);
  const acid=m.pH<7.15,right=(a.ac==='1')===acid;
  const st=chStats();st.push({id:m.id,guide:D.guide,cls:a.cls,ac:+a.ac,conf:+a.conf,dec:a.dec,pH:m.pH,d:Date.now()});store('ctg-real',st.slice(-500));
  let dmsg='';
  if(a.dec==='acelerar'&&m.pH>=7.2)dmsg='À luz do desfecho, acelerar o parto teria sido uma intervenção sem benefício fetal (falso alarme). É o principal custo da baixa especificidade do CTG.';
  else if(a.dec==='vigiar'&&m.pH<7.05)dmsg='O recém-nascido nasceu com acidemia grave e a sua opção foi manter vigilância. Reveja o traçado à procura dos sinais de descompensação.';
  else if(a.dec==='vigiar'&&acid)dmsg='Houve acidemia; manter vigilância sem medidas não foi a melhor opção neste caso, embora nem sempre o CTG o permita prever.';
  else if(a.dec==='acelerar'&&acid)dmsg='Decisão coerente com o desfecho.';
  else dmsg='Decisão compatível com o desfecho.';
  $('rcOut').innerHTML=`<div class="esum ${right?'okt':'kot'}"><b>${right?'Acertou':'Não acertou'}</b> na estimativa de acidemia. ${esc(dmsg)}</div>${outcomeHTML(m)}
    <p class="small">Classificou como <b>${CLS_OPTS[D.guide][a.cls]}</b> (${GUIDE[D.guide]}). Nos traçados reais não há uma classificação «certa» calculada pelo simulador: o que ensina é o desfecho. Veja abaixo como as suas classificações se relacionam com o pH.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="rcNext">Próximo traçado</button><button class="btn" id="rcLib">Ver o registo completo na biblioteca</button></div>`;
  $('rcOut').classList.add('on');
  $('rcNext').onclick=newChallenge;$('rcLib').onclick=()=>{setRealMode('lib');openReal(m.id)};
  renderChStats();$('rcOut').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderChStats(){
  const s=chStats();
  if(!s.length){$('rcStats').innerHTML='<p class="small">As suas estatísticas aparecem aqui depois do primeiro traçado.</p>';return}
  const tp=s.filter(x=>x.ac&&x.pH<7.15).length,fp=s.filter(x=>x.ac&&x.pH>=7.15).length,fn=s.filter(x=>!x.ac&&x.pH<7.15).length,tn=s.filter(x=>!x.ac&&x.pH>=7.15).length;
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const byCls={};s.forEach(x=>{const k=x.guide+':'+x.cls;(byCls[k]=byCls[k]||{n:0,ac:0,sev:0,g:x.guide,c:x.cls});byCls[k].n++;if(x.pH<7.15)byCls[k].ac++;if(x.pH<7.05)byCls[k].sev++});
  const acc=s.filter(x=>x.dec==='acelerar'),fa=acc.filter(x=>x.pH>=7.2).length,miss=s.filter(x=>x.dec==='vigiar'&&x.pH<7.05).length;
  $('rcStats').innerHTML=`<h3>As suas estatísticas · ${s.length} traçado(s)</h3>
   <div class="sgrid">
    <div><div class="k">Sensibilidade</div><div class="v">${pct(tp,tp+fn)}</div><div class="s">acidemias que identificou</div></div>
    <div><div class="k">Especificidade</div><div class="v">${pct(tn,tn+fp)}</div><div class="s">casos normais que reconheceu</div></div>
    <div><div class="k">Valor preditivo positivo</div><div class="v">${pct(tp,tp+fp)}</div><div class="s">quando disse «sim», quantas vezes havia acidemia</div></div>
    <div><div class="k">Falsos alarmes</div><div class="v">${fa}</div><div class="s">acelerou o parto com pH ≥ 7,20 (de ${acc.length})</div></div>
    <div><div class="k">Acidemias graves sem ação</div><div class="v">${miss}</div><div class="s">manteve vigilância com pH &lt; 7,05</div></div>
   </div>
   <h4 class="eg">A sua classificação e o pH real</h4>
   <table class="hist"><thead><tr><th>Diretriz</th><th>Classificação</th><th>Traçados</th><th>Com acidemia (&lt; 7,15)</th><th>Acidemia grave (&lt; 7,05)</th></tr></thead><tbody>${Object.values(byCls).sort((a,b)=>a.g.localeCompare(b.g)).map(r=>`<tr><td>${GUIDE[r.g]}</td><td>${CLS_OPTS[r.g][r.c]}</td><td class="n">${r.n}</td><td class="n">${r.ac} (${pct(r.ac,r.n)})</td><td class="n">${r.sev} (${pct(r.sev,r.n)})</td></tr>`).join('')}</tbody></table>
   <p class="small">Neste desafio cerca de 4 em cada 10 traçados têm acidemia, para haver casos suficientes. Na base completa (${R.data.length} partos) a proporção é de 19% com pH &lt; 7,15 e 7% com pH &lt; 7,05. <button class="linkbtn" id="rcReset">Apagar estatísticas</button></p>`;
  $('rcReset').onclick=e=>{const b=e.target;if(b.dataset.c){store('ctg-real',[]);renderChStats()}else{b.dataset.c=1;b.textContent='Confirmar: apagar'}};
}

/* ---------- arranque do separador ---------- */
function setRealMode(m){R.mode=m;document.querySelectorAll('#rMode button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));$('rLib').style.display=m==='lib'?'':'none';$('rCh').style.display=m==='ch'?'':'none';$('rLive').style.display=m==='live'?'':'none';
  if(m==='live'){if(!RV.case)rvNew();else rvDraw();return}
  if(m==='ch'&&!R.ch)newChallenge();else if(m==='ch')drawChallenge();else drawReal()}
let realInit=false;
function showReal(){
  if(realInit){R.mode==='lib'?drawReal():R.mode==='live'?rvDraw():drawChallenge();return}
  $('rLoad').style.display='';$('rLoad').textContent='A carregar a lista dos 552 traçados reais…';
  realLoad().then(()=>{realInit=true;$('rLoad').style.display='none';$('rBody').style.display='';initRealLib();
    $('rMode').onclick=e=>{const b=e.target.closest('button');if(b)setRealMode(b.dataset.m)};rvInit();if(R.mode!=='lib')setRealMode(R.mode);
    $('rcWin').onclick=e=>{const b=e.target.closest('button');if(!b)return;R.chWin=+b.dataset.w;document.querySelectorAll('#rcWin button').forEach(x=>x.classList.toggle('on',x===b));$('rcSub').textContent=$('rcSub').textContent.replace(/Últimos \d+ min/,`Últimos ${R.chWin} min`);drawChallenge()};
  }).catch(()=>{$('rLoad').textContent='Não foi possível carregar os traçados reais. Recarregue a página.'});
}
