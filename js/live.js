/* Exame em sala: QR code para os telemóveis, respostas ao vivo (quando a ligação é permitida) e correção com a turma */
const ART_URL='https://claude.ai/artifact/28vwiURduSdhNtoJCEK7eL';
/* Transporte: Supabase (alojamento próprio, js/config.js) ou «room» do artifact Claude */
const CFG=(window.CTG_CONFIG&&window.CTG_CONFIG.supabaseUrl&&window.CTG_CONFIG.supabaseKey)?window.CTG_CONFIG:null;
const SB=CFG?{url:CFG.supabaseUrl.replace(/\/+$/,''),key:CFG.supabaseKey}:null;
const LV={role:null,sid:null,set:null,guide:null,room:null,named:null,people:{},curs:null,view:'qr',ci:0,showRank:false,connected:false};
const FL={base:'Linha de base',var:'Variabilidade',acc:'Acelerações',dec:'Desacelerações',cont:'Contrações',figo:'Classificação',mech:'Interpretação'};
function rid(n){const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<n;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
const enc=a=>({b:a.base,v:a.var,a:a.acc,d:a.dec.join('+'),c:a.cont,f:a.figo,m:a.mech});
const dec=x=>x&&({base:x.b,var:x.v,acc:x.a,dec:(x.d||'').split('+').filter(Boolean),cont:x.c,figo:x.f,mech:x.m});

/* ---------- Supabase (REST simples, sem bibliotecas) ---------- */
function sbH(extra){const h={apikey:SB.key,'x-sessao':LV.sid,'Content-Type':'application/json'};if(/^eyJ/.test(SB.key))h.Authorization='Bearer '+SB.key;return Object.assign(h,extra||{})}
async function sbPut(pr){
  const body={sessao:LV.sid,peer:LV.peer,nome:String(pr.nome||'').slice(0,30),i:Math.max(0,Math.min(EXAM_N,+pr.i||0)),ans:(pr.ans||[]).slice(0,EXAM_N),done:!!pr.done};
  const r=await fetch(`${SB.url}/rest/v1/respostas?on_conflict=sessao,peer`,{method:'POST',headers:sbH({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(body)});
  if(!r.ok)throw new Error('HTTP '+r.status);
}
/* envia sempre o estado completo; se houver vários pedidos seguidos, só o último é enviado */
function sbSend(pr){if(pr)LV.pend=pr;if(LV.busy||!LV.pend)return;LV.busy=true;
  (async()=>{let tries=0;
    while(LV.pend){const cur=LV.pend;LV.pend=null;
      try{await sbPut(cur);LV.connected=true;tries=0}
      catch(_){LV.connected=false;if(!LV.pend)LV.pend=cur;liveStatus();if(++tries>6)break;await new Promise(res=>setTimeout(res,1500*tries))}
      liveStatus()}
  })().finally(()=>{LV.busy=false;liveStatus()})}
/* se a rede falhar de vez, volta a tentar quando o telemóvel recupera a ligação */
window.addEventListener('online',()=>{if(SB&&LV.role==='aluno')sbSend()});
async function sbPoll(){
  if(LV.role!=='formador'||!SB)return;
  try{const r=await fetch(`${SB.url}/rest/v1/respostas?sessao=eq.${LV.sid}&select=peer,nome,i,ans,done,atualizado&order=criado.asc&limit=300`,{headers:sbH()});
    if(!r.ok)throw new Error('HTTP '+r.status);const rows=await r.json();LV.connected=true;let changed=false;const now=Date.now();
    for(const x of rows){const prev=LV.people[x.peer];const t=Date.parse(x.atualizado)||now;
      const np={nome:String(x.nome||'').slice(0,30),i:+x.i||0,ans:Array.isArray(x.ans)?x.ans.slice(0,EXAM_N):[],done:!!x.done,t,on:now-t<180000};
      if(!prev||prev.t!==np.t||prev.on!==np.on){LV.people[x.peer]=np;changed=true}}
    if(changed)peopleChanged();
  }catch(_){LV.connected=false}
  liveStatus();
}
function peopleChanged(){try{localStorage.setItem('ctg-live-'+LV.sid,JSON.stringify(LV.people))}catch(_){};renderPeople();if(LV.view==='res')renderLiveResults();if(LV.view==='cor')renderCorrection()}
function liveSend(pr){if(SB)sbSend(pr);else if(LV.named)LV.named.presence(pr).catch(()=>{})}
const liveOn=()=>SB?true:!!LV.named;

async function roomJoin(){
  try{if(!window.claude||!window.claude.use)return null;const room=await window.claude.use('room');if(!room)return null;LV.room=room;const r=await room.join('exame-'+LV.sid);LV.named=r;
    r.onConnection(c=>{LV.connected=c;liveStatus()},()=>{LV.connected=false;liveStatus()});return r}
  catch(_){return null}
}

/* ---------- formador ---------- */
function liveStart(set,guide){
  LV.role='formador';LV.sid=rid(SB?10:5);LV.set=set;LV.guide=guide;LV.people={};LV.view='qr';LV.ci=0;
  LV.curs=examItems(set).map(it=>genTrace(RECIPES.find(r=>r.id===it.id),it.seed));
  $('dWrap').style.display='none';$('liveBox').style.display='';
  renderLive();
  if(SB){clearInterval(LV.timer);sbPoll();LV.timer=setInterval(sbPoll,3000);return}
  roomJoin().then(r=>{if(!r){liveStatus();return}
    r.presence({role:'formador',set,guide}).catch(()=>{});
    r.onPeers(ch=>{let changed=false;for(const p of ch.peers){if(p.isMe||p.kind!=='viewer')continue;const pr=p.presence||{};if(pr.role!=='aluno')continue;
      LV.people[p.peer]={nome:String(pr.nome||'').slice(0,30),i:+pr.i||0,ans:Array.isArray(pr.ans)?pr.ans.slice(0,15):[],done:!!pr.done,t:Date.now(),on:true};changed=true}
      for(const p of ch.left){if(LV.people[p.peer]){LV.people[p.peer].on=false;changed=true}}
      if(changed)peopleChanged()},()=>{});
    liveStatus();
  });
}
function liveBase(){return SB?(CFG.siteUrl||location.origin+location.pathname).replace(/#.*$/,''):ART_URL}
function liveLink(){return`${liveBase()}#exame-${LV.set.toLowerCase()}-${LV.guide}-${LV.sid}`}
function qrSVG(text,cell){try{const q=qrcode(0,'M');q.addData(text);q.make();return q.createSvgTag(cell||7,2)}catch(_){return''}}
function renderLive(){
  $('liveBox').innerHTML=`
   <div class="card qhead"><div><h2 style="margin:0">Exame em sala · Conjunto ${LV.set} · ${GUIDE[LV.guide]}</h2><div class="small">Código da sessão <b class="mono">${LV.sid}</b> · ${EXAM_N} traçados · <span id="lvConn"></span></div></div>
    <div class="seg" id="lvTabs"><button data-v="qr">QR code e participantes</button><button data-v="res">Resultados da turma</button><button data-v="cor">Corrigir com a turma</button></div>
    <button class="btn" id="lvEnd">Terminar sessão</button></div>
   <div id="lvBody"></div>`;
  $('lvTabs').onclick=e=>{const b=e.target.closest('button');if(b){LV.view=b.dataset.v;renderLiveBody()}};
  $('lvEnd').onclick=e=>{const b=e.target;if(!b.dataset.c){b.dataset.c=1;b.textContent='Confirmar: terminar';return}if(LV.named)LV.named.leave().catch(()=>{});clearInterval(LV.timer);LV.role=null;$('liveBox').style.display='none';$('dWrap').style.display='';renderExamHome()};
  renderLiveBody();liveStatus();
}
function liveStatus(){const el=document.getElementById('lvConn');if(!el)return;
  el.innerHTML=liveOn()?(LV.connected?'<span class="ok">● ligação ao vivo ativa</span>':(SB&&LV.role==='formador'?'<span class="pt">● à espera da base de dados…</span>':'<span class="pt">● a ligar…</span>')):'<span class="ko">● sem ligação ao vivo neste browser</span>';
  const p=document.getElementById('alConn');if(p)p.innerHTML=liveOn()&&LV.connected?'<span class="ok">● As suas respostas estão a chegar ao ecrã da formadora.</span>':(SB?'<span class="small">As respostas são enviadas para o ecrã da formadora à medida que avança.</span>':'<span class="small">As suas respostas ficam neste telemóvel; a correção é feita no ecrã grande.</span>')}
function renderLiveBody(){
  document.querySelectorAll('#lvTabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===LV.view));
  if(LV.view==='qr'){
    $('lvBody').innerHTML=`<div class="lvqr"><div class="card qrcard"><div class="qr">${qrSVG(liveLink(),8)||'<p>Não foi possível gerar o QR code.</p>'}</div>
      <p class="small">Leia com a câmara do telemóvel ou abra:</p><p class="mono lnk">${esc(liveLink())}</p></div>
      <div class="card panel"><h3>Como funciona</h3><ol class="small" style="padding-left:18px;line-height:1.6">
       <li>Cada formando lê o QR code, escreve um nome ou alcunha e faz os ${EXAM_N} traçados ao seu ritmo.</li>
       <li>No fim vê a sua nota e pode rever cada traçado anotado no próprio telemóvel.</li>
       ${SB?'<li>As respostas chegam a este ecrã à medida que cada formando avança (lista abaixo). Basta ter internet no telemóvel; não é preciso conta.</li>':'<li>Quem tiver sessão iniciada no Claude e acesso a esta página envia as respostas ao vivo para este ecrã (lista abaixo). Os restantes fazem o exame normalmente, mas as respostas ficam só no telemóvel.</li>'}
       <li>No separador «Corrigir com a turma» percorre os traçados no ecrã grande, com as respostas certas e, quando houver dados, o que a turma respondeu.</li></ol>
       <h3 style="margin-top:12px">Participantes ligados</h3><div id="lvPeople"></div></div></div>`;
    renderPeople();
  }else if(LV.view==='res')renderLiveResults();else renderCorrection();
}
function people(){return Object.values(LV.people)}
function renderPeople(){const el=document.getElementById('lvPeople');if(!el)return;const P=people();
  el.innerHTML=P.length?`<div class="small" style="margin-bottom:6px">${P.length} participante(s) · ${P.filter(p=>p.done).length} terminaram</div>`+P.sort((a,b)=>b.i-a.i).map(p=>`<div class="pp"><span class="nm"></span><div class="tr"><div style="width:${Math.min(100,p.i/EXAM_N*100)}%"></div></div><span class="mono small">${p.done?'terminou':p.i+'/'+EXAM_N}</span></div>`).join(''):(SB?'<p class="small">Ainda ninguém começou. Os formandos aparecem aqui quando carregam em «Começar».</p>':'<p class="small">Ainda ninguém ligado ao vivo. Formandos sem sessão no Claude não aparecem aqui, mas podem fazer o exame normalmente.</p>');
  el.querySelectorAll('.pp .nm').forEach((s,k)=>s.textContent=P[k].nome||'Sem nome');
}
function classStats(){
  const P=people().filter(p=>p.ans.length);
  const rows=P.map(p=>{const ev=p.ans.map((x,i)=>x&&LV.curs[i]?evalAns(LV.curs[i],dec(x),LV.guide):null);const done=ev.filter(Boolean);return{p,ev,ok:done.reduce((s,v)=>s+v.ok,0),n:done.length}});
  return{P,rows};
}
function renderLiveResults(){
  const {P,rows}=classStats();
  if(!P.length){$('lvBody').innerHTML=(SB?'<div class="card notes"><p>Ainda não chegaram respostas. Aparecem aqui assim que os formandos responderem ao primeiro traçado.</p></div>':'<div class="card notes"><p>Ainda não chegaram respostas ao vivo. Se os formandos não tiverem sessão no Claude, use «Corrigir com a turma» para corrigir em conjunto.</p></div>');return}
  const fields=Object.keys(FL);const per={},tot={};fields.forEach(f=>{per[f]=0;tot[f]=0});
  const items=LV.curs.map(()=>({n:0,ok:0,wrong:{}}));const errs=[];
  rows.forEach(r=>r.ev.forEach((v,i)=>{if(!v)return;const a=dec(r.p.ans[i]);fields.forEach(f=>{tot[f]++;if(v.res[f])per[f]++});items[i].n++;if(v.res.figo)items[i].ok++;
    fields.forEach(f=>{if(v.res[f])return;const val=f==='dec'?a.dec.slice().sort().join('+'):a[f];const k=i+'|'+f+'|'+val;errs[k]=(errs[k]||0)+1})}));
  const LBL=(f,val,i)=>f==='base'?BASE_L[val]:f==='var'?VAR_L[val]:f==='acc'?(val==='1'?'Presentes':'Ausentes'):f==='dec'?val.split('+').map(x=>DEC_L[x]).join(', '):f==='cont'?CONT_L[val]:f==='figo'?CLS_OPTS[LV.guide][val]:MECH_L[val];
  const RIGHT=(f,i)=>{const t=LV.curs[i].truth;return f==='base'?BASE_L[t.base]:f==='var'?VAR_L[t.var]:f==='acc'?(t.acc==='1'?'Presentes':'Ausentes'):f==='dec'?t.dec.map(x=>DEC_L[x]).join(', '):f==='cont'?CONT_L[t.cont]:f==='figo'?CLS_OPTS[LV.guide][t.cls[LV.guide]]:t.mech.map(m=>MECH_L[m]).join(' ou ')};
  const top=Object.entries(errs).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,c])=>{const [i,f,val]=k.split('|');return{i:+i,f,val,c}});
  const avg=rows.length?Math.round(rows.reduce((s,r)=>s+(r.n?r.ok/(r.n*7):0),0)/rows.length*100):0;
  $('lvBody').innerHTML=`<div class="lvres">
   <div class="card panel"><h3>Turma</h3><div class="score" style="text-align:left;margin:0"><div class="n">${avg}%</div><div class="l">média de campos corretos · ${P.length} participante(s), ${P.filter(p=>p.done).length} terminaram</div></div>
    ${fields.map(f=>`<div class="fbar"><span>${FL[f]}</span><div class="tr"><div style="width:${tot[f]?per[f]/tot[f]*100:0}%;background:${tot[f]&&per[f]/tot[f]>=.8?'var(--ok)':tot[f]&&per[f]/tot[f]>=.6?'var(--warn)':'var(--bad)'}"></div></div><span class="mono">${tot[f]?Math.round(per[f]/tot[f]*100):0}%</span></div>`).join('')}
    <h4 class="eg">Classificação certa por traçado</h4><div class="eitems">${items.map((it,i)=>`<button data-i="${i}" class="${it.n?(it.ok/it.n>=.7?'okb':'kob'):''}">${i+1}<small>${it.n?Math.round(it.ok/it.n*100)+'%':'—'}</small></button>`).join('')}</div>
    <label class="chk small" style="margin-top:10px"><input type="checkbox" id="lvRank" ${LV.showRank?'checked':''}> Mostrar classificação individual</label><div id="lvRankBox"></div></div>
   <div class="card panel"><h3>Erros mais frequentes</h3>${top.length?top.map(e=>`<div class="terr"><span class="mono n">${e.c}×</span><div><b>Traçado ${e.i+1} · ${FL[e.f]}</b><br>Responderam «${esc(LBL(e.f,e.val,e.i)||'—')}»; correto: <b>${esc(RIGHT(e.f,e.i))}</b> <button class="linkbtn" data-go="${e.i}">ver traçado</button></div></div>`).join(''):'<p class="small">Sem erros registados.</p>'}</div></div>`;
  $('lvBody').querySelector('.eitems').onclick=e=>{const b=e.target.closest('button');if(b){LV.ci=+b.dataset.i;LV.view='cor';renderLiveBody()}};
  $('lvBody').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{LV.ci=+b.dataset.go;LV.view='cor';renderLiveBody()});
  $('lvRank').onchange=e=>{LV.showRank=e.target.checked;renderRank(rows)};renderRank(rows);
}
function renderRank(rows){const el=$('lvRankBox');if(!LV.showRank){el.innerHTML='';return}
  const R=rows.filter(r=>r.n).sort((a,b)=>b.ok/b.n-a.ok/a.n).slice(0,10);
  el.innerHTML=R.map((r,k)=>`<div class="pp"><span class="mono">${k+1}.</span><span class="nm"></span><span class="mono">${Math.round(r.ok/(r.n*7)*100)}%</span></div>`).join('');
  el.querySelectorAll('.nm').forEach((s,k)=>s.textContent=R[k].p.nome||'Sem nome');
}
function renderCorrection(){
  const i=LV.ci,cur=LV.curs[i],t=cur.truth;
  const {rows}=classStats();const dist={};let n=0;rows.forEach(r=>{const x=r.p.ans[i];if(!x)return;n++;dist[x.f]=(dist[x.f]||0)+1});
  $('lvBody').innerHTML=`<div class="lvcor"><div class="stage">
    <div class="card panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="margin:0">Traçado ${i+1} de ${EXAM_N}</h2><div style="display:flex;gap:6px"><button class="btn" id="lcPrev">Anterior</button><button class="btn pri" id="lcNext">Seguinte</button><button class="btn" id="lcAns">${LV.reveal?'Esconder respostas':'Mostrar respostas'}</button></div></div><div class="small">${esc(cur.g.ctx)} Padrão semelhante há ${cur.g.pdur} min.</div></div>
    <div class="card qtrace"><canvas class="static" id="cvLive"></canvas></div></div>
    <div class="card panel">${LV.reveal?`<h3>Respostas certas</h3><dl class="kv">
      <dt>Linha de base</dt><dd>${BASE_L[t.base]}</dd><dt>Variabilidade</dt><dd>${VAR_L[t.var]}</dd><dt>Acelerações</dt><dd>${t.acc==='1'?'Presentes':'Ausentes'}</dd>
      <dt>Desacelerações</dt><dd>${t.dec.map(x=>DEC_L[x]).join(', ')}</dd><dt>Contrações</dt><dd>${CONT_L[t.cont]}</dd><dt>${GUIDE[LV.guide]}</dt><dd>${CLS_OPTS[LV.guide][t.cls[LV.guide]]}</dd><dt>Interpretação</dt><dd>${t.mech.map(m=>MECH_L[m]).join(' ou ')}</dd></dl>
      <p class="small" style="margin-top:8px">${esc(cur.g.tip)}</p>${compareHTML(t)}`:'<p class="small">Discuta o traçado com a turma e carregue em «Mostrar respostas» para revelar a correção e as anotações.</p>'}
      ${n?`<h4 class="eg">O que a turma respondeu (${n})</h4>${Object.entries(CLS_OPTS[LV.guide]).map(([k,l])=>`<div class="fbar"><span>${l}</span><div class="tr"><div style="width:${(dist[k]||0)/n*100}%;background:${LV.reveal&&k===t.cls[LV.guide]?'var(--ok)':'var(--navy)'}"></div></div><span class="mono">${dist[k]||0}</span></div>`).join('')}`:''}</div></div>`;
  $('lcPrev').onclick=()=>{LV.ci=(i-1+EXAM_N)%EXAM_N;LV.reveal=false;renderCorrection()};$('lcNext').onclick=()=>{LV.ci=(i+1)%EXAM_N;LV.reveal=false;renderCorrection()};
  $('lcAns').onclick=()=>{LV.reveal=!LV.reveal;renderCorrection()};
  const e=cur.e;drawCTG($('cvLive'),e,{tEnd:e.t,win:1800,tZero:e.t-1800,annot:LV.reveal?annotFor(cur):null});
}

/* ---------- formando (telemóvel) ---------- */
function liveParticipant(h){
  const m=/^exame-([abc])-(figo|acog|nice)-([a-z0-9]{5}|[a-z0-9]{10})$/.exec(h);if(!m)return false;
  LV.role='aluno';LV.set=m[1].toUpperCase();LV.guide=m[2];LV.sid=m[3];
  document.body.classList.add('aluno');
  document.querySelectorAll('main > .view').forEach(s=>s.classList.toggle('on',s.id==='v-treino'));
  D.mode='exame';D.guide=LV.guide;
  $('dTitle').textContent=`Exame CTG · Conjunto ${LV.set}`;$('dCtx').textContent=`${EXAM_N} traçados · classificação ${GUIDE[LV.guide]} · sessão ${LV.sid}`;
  const {c,W,H}=fitCanvas($('cvD'));c.fillStyle='#FFF8F4';c.fillRect(0,0,W,H);
  $('dForm').innerHTML=`<h3 style="margin:0">Bem-vindo(a)</h3><div class="rf"><h4>Nome ou alcunha</h4><input type="text" id="alNome" maxlength="30" placeholder="ex.: Ana R." autocomplete="off"></div>
    <p class="small">Vai ver ${EXAM_N} traçados de 30 minutos. Para cada um, responda às 7 perguntas e avance. No fim vê a sua nota.</p><div id="alConn"></div>
    <button class="btn pri" id="alGo">Começar</button>`;
  if(SB){try{LV.peer=localStorage.getItem('ctg-peer-'+LV.sid)}catch(_){}
    if(!LV.peer){LV.peer=rid(12);try{localStorage.setItem('ctg-peer-'+LV.sid,LV.peer)}catch(_){}}}
  else roomJoin().then(r=>{if(r)r.presence({role:'aluno',nome:'',i:0,ans:[],done:false}).catch(()=>{});liveStatus()});
  liveStatus();
  if(typeof ACC!=='undefined'&&ACC.nome)$('alNome').value=ACC.nome.slice(0,30);
  $('alGo').onclick=()=>{const nome=$('alNome').value.trim().slice(0,30);LV.nome=nome;
    D.exam={set:LV.set,guide:LV.guide,items:examItems(LV.set),i:0,ans:[],t0:Date.now(),live:true};
    D.onAnswer=X=>liveSend({role:'aluno',nome:LV.nome,i:X.i,ans:X.ans.map(enc),done:false});
    D.onEnd=X=>liveSend({role:'aluno',nome:LV.nome,i:X.items.length,ans:X.ans.map(enc),done:true});
    liveSend({role:'aluno',nome,i:0,ans:[],done:false});
    examShow()};
  return true;
}
