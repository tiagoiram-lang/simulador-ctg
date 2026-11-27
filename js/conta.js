/* Contas (Supabase Auth), sincronização do progresso e turmas. Só ativo no alojamento próprio (js/config.js preenchido). */
const ACC={sb:null,user:null,nome:'',busy:false,queue:[],flushT:0,turmas:null,mine:null,cur:null};
const ACC_ON=!!(window.CTG_CONFIG&&window.CTG_CONFIG.supabaseUrl&&window.supabase&&window.supabase.createClient);

/* ---------- pedidos à API (PostgREST) com o token da sessão ---------- */
async function accToken(){const {data}=await ACC.sb.auth.getSession();return data.session?data.session.access_token:null}
async function api(path,{method='GET',body,headers={},prefer}={}){
  const tok=await accToken();if(!tok)throw new Error('sem sessão');
  const h={apikey:CTG_CONFIG.supabaseKey,Authorization:'Bearer '+tok,...headers};
  if(body!==undefined)h['Content-Type']='application/json';if(prefer)h.Prefer=prefer;
  const r=await fetch(`${CTG_CONFIG.supabaseUrl.replace(/\/+$/,'')}/rest/v1/${path}`,{method,headers:h,body:body!==undefined?JSON.stringify(body):undefined});
  if(!r.ok){let m='HTTP '+r.status;try{const j=await r.json();m=j.message||m}catch(_){}throw new Error(m)}
  const t=await r.text();return t?JSON.parse(t):null;
}

/* ---------- registos locais <-> servidor ---------- */
/* cada tipo vive numa chave local; o instante t identifica a resposta */
const ACC_KEYS={treino:'ctg-prog',exame:'ctg-prog',caso:'ctg-real-live',desafio:'ctg-real'};
const accT=x=>x.t||x.d;
function accLocal(){
  const out=[];
  (store('ctg-prog')||[]).forEach(x=>out.push({tipo:x.x?'exame':'treino',t:x.t,dados:x}));
  (store('ctg-real-live')||[]).forEach(x=>out.push({tipo:'caso',t:x.d,dados:x}));
  (store('ctg-real')||[]).forEach(x=>out.push({tipo:'desafio',t:x.d,dados:x}));
  return out.filter(x=>x.t);
}
function accPush(tipo,dados){
  if(!ACC.user)return;ACC.queue.push({tipo,t:accT(dados),dados});
  clearTimeout(ACC.flushT);ACC.flushT=setTimeout(accFlush,1500);
}
async function accFlush(){
  if(!ACC.user||!ACC.queue.length)return;
  const batch=ACC.queue.splice(0,200);
  try{await api('registos?on_conflict=user_id,tipo,t',{method:'POST',body:batch,prefer:'resolution=ignore-duplicates,return=minimal'});accStatus()}
  catch(_){ACC.queue.unshift(...batch);accStatus('As respostas ficam guardadas neste browser e serão enviadas quando houver ligação.');setTimeout(accFlush,15000)}
  if(ACC.queue.length)accFlush();
}
async function accPull(uids){
  let all=[],from=0;
  for(;;){const q=`registos?select=user_id,tipo,t,dados&user_id=in.(${uids.join(',')})&order=t.asc&limit=1000&offset=${from}`;
    const part=await api(q);all=all.concat(part);if(part.length<1000)break;from+=1000;if(from>20000)break}
  return all;
}
/* junta o que está no servidor com o que está neste browser, sem duplicar */
async function accSync(){
  if(!ACC.user)return;
  const local=accLocal(),remote=await accPull([ACC.user.id]);
  const key=x=>x.tipo+':'+x.t,have=new Set(remote.map(key));
  const up=local.filter(x=>!have.has(key(x)));
  if(up.length){ACC.queue.push(...up);await accFlush()}
  const merged={};[...remote,...local].forEach(x=>{merged[key(x)]=x});
  const by={prog:[],live:[],real:[]};
  Object.values(merged).sort((a,b)=>a.t-b.t).forEach(x=>{if(x.tipo==='treino'||x.tipo==='exame')by.prog.push(x.dados);else if(x.tipo==='caso')by.live.push(x.dados);else by.real.push(x.dados)});
  store('ctg-prog',by.prog.slice(-1500));store('ctg-real-live',by.live.slice(-300));store('ctg-real',by.real.slice(-500));
  accRefreshViews();
  return up.length;
}
async function accDelete(tipos){
  if(!ACC.user)return;
  ACC.queue=ACC.queue.filter(x=>!tipos.includes(x.tipo));
  try{await api(`registos?user_id=eq.${ACC.user.id}&tipo=in.(${tipos.join(',')})`,{method:'DELETE'})}catch(_){}
}
function accRefreshViews(){
  if(typeof renderProg==='function'&&document.getElementById('dProg'))renderProg();
  if(typeof rvStats==='function'&&document.getElementById('rvStats')&&realInit)rvStats();
  if(typeof renderChStats==='function'&&document.getElementById('rcStats')&&realInit)renderChStats();
}

/* ---------- sessão ---------- */
async function accSetUser(user,first){
  const was=ACC.user&&ACC.user.id;ACC.user=user||null;
  if(!user){ACC.nome='';accHeader();if(was||first)show(location.hash.slice(1));return}
  if(was===user.id){accHeader();return}
  try{const p=await api(`perfis?id=eq.${user.id}&select=nome`);
    if(p&&p.length)ACC.nome=p[0].nome;
    else{ACC.nome=(user.user_metadata&&user.user_metadata.nome)||user.email.split('@')[0];
      await api('perfis?on_conflict=id',{method:'POST',body:{id:user.id,nome:ACC.nome.slice(0,60)},prefer:'resolution=merge-duplicates,return=minimal'})}}
  catch(_){ACC.nome=user.email.split('@')[0]}
  accHeader();
  if(ACC.pendingCode){const c=ACC.pendingCode;ACC.pendingCode=null;try{const t=await turmaJoin(c);toast(`Entrou na turma «${t.nome}».`)}catch(x){toast(x.message)}}
  if(location.hash.startsWith('#turma-'))history.replaceState(null,'','#turmas');
  show(location.hash.slice(1));
  try{const n=await accSync();if(n)toast(`Juntámos à sua conta ${n} resposta(s) feitas neste browser.`)}catch(_){}
}
function accHeader(){
  document.body.classList.toggle('logado',!!ACC.user);
  const b=document.getElementById('accBtn');if(!b)return;
  if(ACC.user){const ini=(ACC.nome||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    b.innerHTML=`<span class="av">${esc(ini)}</span><span class="acctx">${esc(ACC.nome)}</span>`;b.title='A sua conta'}
  else{b.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.5" r="2.8"/><path d="M2.5 14c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2"/></svg><span class="acctx">Entrar</span>';b.title='Entrar ou criar conta'}
  const t=document.getElementById('turmasLink');if(t)t.style.display='';
}
function accStatus(msg){const el=document.getElementById('accSync');if(el)el.textContent=msg||(ACC.queue.length?'A enviar respostas…':'Progresso guardado na sua conta.')}

/* ---------- janela de conta ---------- */
function accModal(tab,withCode){
  let m=document.getElementById('accModal');
  if(!m){m=document.createElement('div');m.id='accModal';m.className='accm';document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)accClose()});document.addEventListener('keydown',e=>{if(e.key==='Escape')accClose()})}
  m.classList.add('on');
  if(ACC.user){
    m.innerHTML=`<div class="accbox" role="dialog" aria-modal="true" aria-labelledby="accH"><button class="accx" aria-label="Fechar">×</button>
      <h2 id="accH">${esc(ACC.nome)}</h2><p class="small">${esc(ACC.user.email)}</p><p class="small" id="accSync"></p>
      <div class="accrow"><a class="btn pri" href="#turmas" id="accGoT">As minhas turmas</a><button class="btn" id="accOut">Sair</button></div>
      <p class="small accnote">Ao sair, o progresso deixa de aparecer neste browser; fica guardado na conta.</p></div>`;
    accStatus();$('accOut').onclick=async()=>{await ACC.sb.auth.signOut();['ctg-prog','ctg-real-live','ctg-real'].forEach(k=>store(k,[]));accRefreshViews();accClose();toast('Sessão terminada.')};
    $('accGoT').onclick=()=>accClose();
  }else{
    tab=tab||'in';
    m.innerHTML=`<div class="accbox" role="dialog" aria-modal="true" aria-labelledby="accH"><button class="accx" aria-label="Fechar">×</button>
      <h2 id="accH">${tab==='in'?'Entrar':'Criar conta'}</h2>
      <p class="small">Com conta, o progresso fica guardado e acompanha-o em qualquer dispositivo, e pode juntar-se a uma turma.</p>
      <form id="accF" novalidate>
        ${tab==='up'?'<label class="fld">Nome<input name="nome" autocomplete="name" maxlength="60" required></label>':''}
        <label class="fld">Email<input name="email" type="email" autocomplete="email" required></label>
        ${withCode||ACC.pendingCode?`<label class="fld">Código da turma<input name="code" maxlength="8" autocomplete="off" spellcheck="false" class="mono" value="${esc(ACC.pendingCode||'')}" placeholder="8 letras e números"><small>Fica a pertencer à turma assim que entrar.</small></label>`:''}
        <label class="fld">Palavra-passe<input name="pw" type="password" autocomplete="${tab==='in'?'current-password':'new-password'}" minlength="8" required>${tab==='up'?'<small>Pelo menos 8 caracteres.</small>':''}</label>
        <p class="ferr" id="accErr" role="alert"></p>
        <button class="btn pri" type="submit" id="accGo">${tab==='in'?'Entrar':'Criar conta'}</button>
      </form>
      <p class="small">${tab==='in'?'Ainda não tem conta? <button class="linkbtn" data-t="up">Criar conta</button>':'Já tem conta? <button class="linkbtn" data-t="in">Entrar</button>'}</p>
      ${tab==='up'?'<p class="small accnote">Guardamos o nome, o email e as respostas. O formador das turmas a que aderir vê o seu nome e o seu desempenho. Pode apagar o progresso a qualquer momento no painel de progresso.</p>':''}</div>`;
    m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>accModal(b.dataset.t,withCode));
    $('accF').onsubmit=async e=>{e.preventDefault();const f=e.target,err=$('accErr'),go=$('accGo');err.textContent='';
      const email=f.email.value.trim(),pw=f.pw.value,nome=f.nome?f.nome.value.trim():'',code=f.code?f.code.value.trim().toLowerCase():'';
      if(code&&!/^[a-z0-9]{8}$/.test(code)){err.textContent='O código da turma tem 8 letras e números.';return}
      if(code)ACC.pendingCode=code;
      if(tab==='up'&&!nome){err.textContent='Escreva o seu nome.';return}
      if(!/^\S+@\S+\.\S+$/.test(email)){err.textContent='Confirme o email.';return}
      if(pw.length<8){err.textContent='A palavra-passe precisa de pelo menos 8 caracteres.';return}
      go.disabled=true;go.textContent='Um momento…';
      try{
        if(tab==='up'){const {data,error}=await ACC.sb.auth.signUp({email,password:pw,options:{data:{nome}}});if(error)throw error;
          if(!data.session){err.textContent='Conta criada. Confirme o endereço no email que lhe enviámos e depois entre.';go.disabled=false;go.textContent='Criar conta';return}}
        else{const {error}=await ACC.sb.auth.signInWithPassword({email,password:pw});if(error)throw error}
        accClose();toast(tab==='up'?'Conta criada.':'Sessão iniciada.');
      }catch(x){err.textContent=accErrMsg(x);go.disabled=false;go.textContent=tab==='in'?'Entrar':'Criar conta'}};
    setTimeout(()=>{const i=m.querySelector('input');if(i)i.focus()},30);
  }
  m.querySelector('.accx').onclick=accClose;
}
function accErrMsg(x){const s=String(x&&x.message||x);
  if(/invalid login/i.test(s))return'Email ou palavra-passe errados.';
  if(/already registered|already exists/i.test(s))return'Já existe uma conta com este email. Use «Entrar».';
  if(/rate limit|too many/i.test(s))return'Demasiadas tentativas seguidas. Espere um minuto e tente de novo.';
  if(/password/i.test(s))return'Palavra-passe recusada: use pelo menos 8 caracteres.';
  if(/fetch|network/i.test(s))return'Sem ligação ao servidor. Verifique a internet.';
  return s}
function accClose(){const m=document.getElementById('accModal');if(m)m.classList.remove('on')}
function toast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),3200)}

/* ---------- turmas ---------- */
const TCODE=()=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';const r=crypto.getRandomValues(new Uint32Array(8));for(const x of r)s+=a[x%a.length];return s};
function turmaLink(c){return(CTG_CONFIG.siteUrl||location.origin+location.pathname).replace(/#.*$/,'')+'#turma-'+c}
async function showTurmas(code){
  const el=document.getElementById('tBody');if(!el)return;
  if(!ACC_ON){el.innerHTML='<div class="card notes"><p>As turmas só estão disponíveis no site com contas ativas.</p></div>';return}
  if(!ACC.user){if(code)ACC.pendingCode=code;el.innerHTML=`<div class="card notes tintro"><h2>Turmas</h2><p>Para entrar numa turma ou criar uma, entre na sua conta.${code?` Depois de entrar, junta-se automaticamente à turma com o código <b class="mono">${esc(code)}</b>.`:''}</p><button class="btn pri" id="tLogin">Entrar ou criar conta</button></div>`;
    $('tLogin').onclick=()=>accModal(code?'up':'in',!!code);if(code&&ACC.ready)accModal('up',true);return}
  if(code){try{await turmaJoin(code);toast('Entrou na turma.')}catch(x){toast(x.message)}history.replaceState(null,'','#turmas')}
  el.innerHTML='<div class="card notes"><p class="small">A carregar as turmas…</p></div>';
  try{
    const [ts,ms]=await Promise.all([api('turmas?select=id,nome,codigo,formador,criado&order=criado.desc'),api(`membros?user_id=eq.${ACC.user.id}&select=turma,entrou`)]);
    ACC.turmas=ts;const mineIds=new Set(ms.map(x=>x.turma));
    const own=ts.filter(t=>t.formador===ACC.user.id),member=ts.filter(t=>mineIds.has(t.id));
    el.innerHTML=`<div class="tgrid">
      <div class="card panel"><h3>Entrar numa turma</h3><p class="small">Peça o código ao formador ou leia o QR code que ele mostrar.</p>
        <form id="tJoinF" class="tjoin"><input id="tCode" placeholder="código de 8 letras" maxlength="8" autocomplete="off" spellcheck="false"><button class="btn pri">Entrar</button></form><p class="ferr" id="tJoinErr"></p>
        <h3 style="margin-top:16px">As minhas turmas</h3>${member.length?member.map(t=>`<div class="tli"><span><b>${esc(t.nome)}</b><small class="mono">${esc(t.codigo)}</small></span><button class="linkbtn" data-leave="${t.id}">Sair</button></div>`).join(''):'<p class="small">Ainda não pertence a nenhuma turma.</p>'}</div>
      <div class="card panel"><h3>Turmas que oriento</h3>
        <form id="tNewF" class="tjoin"><input id="tNome" placeholder="nome da nova turma (ex.: Internos 2027)" maxlength="80"><button class="btn">Criar turma</button></form><p class="ferr" id="tNewErr"></p>
        ${own.length?own.map(t=>`<button class="tli tbtn" data-open="${t.id}"><span><b>${esc(t.nome)}</b><small class="mono">código ${esc(t.codigo)}</small></span><span class="go">Abrir painel</span></button>`).join(''):'<p class="small">Crie uma turma para acompanhar o progresso dos formandos.</p>'}</div>
     </div><div id="tDash"></div>`;
    $('tJoinF').onsubmit=async e=>{e.preventDefault();const c=$('tCode').value.trim().toLowerCase();$('tJoinErr').textContent='';
      if(!/^[a-z0-9]{8}$/.test(c)){$('tJoinErr').textContent='O código tem 8 letras e números.';return}
      try{await turmaJoin(c);toast('Entrou na turma.');showTurmas()}catch(x){$('tJoinErr').textContent=x.message}};
    $('tNewF').onsubmit=async e=>{e.preventDefault();const n=$('tNome').value.trim();$('tNewErr').textContent='';if(!n){$('tNewErr').textContent='Dê um nome à turma.';return}
      try{const r=await api('turmas',{method:'POST',body:{nome:n,codigo:TCODE()},prefer:'return=representation'});toast('Turma criada.');await showTurmas();turmaOpen(r[0].id)}catch(x){$('tNewErr').textContent=x.message}};
    el.querySelectorAll('[data-leave]').forEach(b=>b.onclick=async()=>{if(!b.dataset.c){b.dataset.c=1;b.textContent='Confirmar: sair';return}
      try{await api(`membros?turma=eq.${b.dataset.leave}&user_id=eq.${ACC.user.id}`,{method:'DELETE'});showTurmas()}catch(x){toast(x.message)}});
    el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>turmaOpen(b.dataset.open));
    if(ACC.cur&&own.find(t=>t.id===ACC.cur))turmaOpen(ACC.cur);
  }catch(x){el.innerHTML=`<div class="card notes"><p>Não foi possível carregar as turmas: ${esc(x.message)}</p></div>`}
}
async function turmaJoin(code){
  const t=await api(`turmas?codigo=eq.${code}&select=id,nome`,{headers:{'x-turma':code}});
  if(!t.length)throw new Error('Não existe nenhuma turma com esse código.');
  try{await api('membros',{method:'POST',body:{turma:t[0].id},headers:{'x-turma':code},prefer:'return=minimal'})}
  catch(x){if(!/duplicate|23505|conflict/i.test(x.message))throw x}
  return t[0];
}
/* painel do formador: uma linha por formando e o resumo da turma */
function caseStats(L){const ac=L.filter(x=>x.pH<7.15),acD=ac.filter(x=>x.del!=null),ok=L.filter(x=>x.pH>=7.2),okD=ok.filter(x=>x.del!=null);return{n:L.length,ac:ac.length,acD:acD.length,ok:ok.length,okD:okD.length}}
async function turmaOpen(id){
  ACC.cur=id;const t=(ACC.turmas||[]).find(x=>x.id===id);const box=document.getElementById('tDash');if(!t||!box)return;
  box.innerHTML='<div class="card notes"><p class="small">A carregar o painel da turma…</p></div>';
  try{
    const ms=await api(`membros?turma=eq.${id}&select=user_id,entrou&order=entrou.asc`);
    const ids=ms.map(m=>m.user_id);
    const [ps,rs]=ids.length?await Promise.all([api(`perfis?id=in.(${ids.join(',')})&select=id,nome`),accPull(ids)]):[[],[]];
    const nome=Object.fromEntries(ps.map(p=>[p.id,p.nome]));
    const rows=ids.map(u=>{const mine=rs.filter(r=>r.user_id===u);const prog=mine.filter(r=>r.tipo==='treino'||r.tipo==='exame').map(r=>r.dados);
      const S=progStats(prog),C=caseStats(mine.filter(r=>r.tipo==='caso').map(r=>r.dados));const last=mine.length?Math.max(...mine.map(r=>r.t)):null;
      return{u,nome:nome[u]||'(sem nome)',S,C,last,prog}});
    const pooled=rows.flatMap(r=>r.prog.slice(-PROG_N)),P=progStats(pooled),weak=progWeak(pooled);
    const lvCount=[1,2,3,4].map(l=>rows.filter(r=>r.S.lvl===l).length);
    const fmtD=t=>t?new Date(t).toLocaleDateString('pt-PT',{day:'2-digit',month:'short'}):'—';
    const pc=v=>v==null?'—':Math.round(v*100)+'%';
    box.innerHTML=`<div class="card panel tdash">
      <div class="tdh"><div><h2 style="margin:0">${esc(t.nome)}</h2><p class="small" style="margin:2px 0 0">${ids.length} formando(s) · código <b class="mono">${esc(t.codigo)}</b></p></div>
        <div class="tdact"><button class="btn sm" id="tCsv">Exportar CSV</button><button class="btn sm" id="tRef">Atualizar</button><button class="btn sm" id="tDel">Apagar turma</button></div></div>
      <div class="tdtop"><div class="tqr">${qrSVG(turmaLink(t.codigo),5)}<p class="small">Os formandos leem o QR code, criam conta e entram na turma.<br><span class="mono lnk">${esc(turmaLink(t.codigo))}</span></p></div>
        <div><h4 class="eg" style="margin-top:0">Turma (últimas ${PROG_N} respostas de cada formando)</h4>${pooled.length?PF.map(k=>`<div class="fbar"><span>${PF_L[k]}</span><div class="tr"><div style="width:${Math.round(P.f[k]*100)}%;background:${P.f[k]>=.8?'var(--ok)':P.f[k]>=.6?'var(--warn)':'var(--bad)'}"></div></div><span class="mono">${pc(P.f[k])}</span></div>`).join(''):'<p class="small">Ainda sem respostas.</p>'}
          <p class="small">Níveis: ${lvCount.map((c,i)=>`${c} no ${i+1}`).join(' · ')}</p></div>
        <div><h4 class="eg" style="margin-top:0">Padrões mais falhados pela turma</h4>${weak.length?weak.map(w=>`<div class="pgw"><span>${esc(w.r.nm)}<small>${w.s.n}× · ${Math.round(w.s.acc*100)}%</small></span></div>`).join(''):'<p class="small">—</p>'}</div></div>
      ${rows.length?`<div class="tscroll"><table class="hist ttab"><thead><tr><th>Formando</th><th>Nível</th><th>Traçados</th><th>Classificação</th><th>Desacelerações</th><th>Patológicos</th><th>Casos reais</th><th>Acidemias com decisão</th><th>Última atividade</th><th></th></tr></thead><tbody>
        ${rows.sort((a,b)=>(b.last||0)-(a.last||0)).map(r=>`<tr><td><b>${esc(r.nome)}</b></td><td><span class="lvchip l${r.S.lvl}">${r.S.lvl} · ${LEVELS[r.S.lvl-1].nm}</span></td><td class="n">${r.S.N}</td><td class="n">${r.S.n?pc(r.S.f.figo):'—'}</td><td class="n">${r.S.n?pc(r.S.f.dec):'—'}</td><td class="n">${pc(r.S.sevAcc)}</td><td class="n">${r.C.n}</td><td class="n">${r.C.ac?`${r.C.acD}/${r.C.ac}`:'—'}</td><td>${fmtD(r.last)}</td><td><button class="linkbtn" data-rm="${r.u}">Remover</button></td></tr>`).join('')}
      </tbody></table></div>`:'<p class="small">Ainda ninguém entrou. Mostre o QR code ou partilhe o código.</p>'}</div>`;
    $('tRef').onclick=()=>turmaOpen(id);
    $('tCsv').onclick=()=>{const L=[['Formando','Nível','Traçados','Classificação %','Desacelerações %','Patológicos %','Casos reais','Acidemias com decisão','Acidemias','Última atividade']].concat(rows.map(r=>[r.nome,r.S.lvl,r.S.N,r.S.n?Math.round(r.S.f.figo*100):'',r.S.n?Math.round(r.S.f.dec*100):'',r.S.sevAcc==null?'':Math.round(r.S.sevAcc*100),r.C.n,r.C.acD,r.C.ac,r.last?new Date(r.last).toISOString().slice(0,10):'']));
      const csv='﻿'+L.map(x=>x.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`turma-${t.codigo}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
    $('tDel').onclick=async e=>{const b=e.target;if(!b.dataset.c){b.dataset.c=1;b.textContent='Confirmar: apagar a turma';return}
      try{await api(`turmas?id=eq.${id}`,{method:'DELETE'});ACC.cur=null;toast('Turma apagada. Os formandos mantêm o seu progresso.');showTurmas()}catch(x){toast(x.message)}};
    box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{if(!b.dataset.c){b.dataset.c=1;b.textContent='Confirmar';return}
      try{await api(`membros?turma=eq.${id}&user_id=eq.${b.dataset.rm}`,{method:'DELETE'});turmaOpen(id)}catch(x){toast(x.message)}});
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(x){box.innerHTML=`<div class="card notes"><p>Não foi possível abrir o painel: ${esc(x.message)}</p></div>`}
}

/* ---------- acesso: simuladores e treino só com sessão iniciada ---------- */
const ACC_PUBLIC=['inicio','sobre','turmas'];
const GATE_TXT={sala:'a Sala de partos',treino:'o Treino rápido',reais:'os Traçados reais',demo:'a Demonstração',construtor:'o Construtor',referencia:'a Referência',resultados:'os Resultados',exame:'o exame em sala'};
function accGate(v){
  if(!ACC_ON||ACC_PUBLIC.includes(v)||ACC.user)return false;
  document.body.dataset.view='gate';
  document.querySelectorAll('main > .view').forEach(s=>s.classList.toggle('on',s.id==='v-gate'));
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+v));
  if(typeof heroRun==='function')heroRun(false);
  const g=$('gBody');
  if(!ACC.ready){g.innerHTML='<div class="card gatebox"><p class="small">A verificar a sessão…</p></div>';return true}
  g.innerHTML=`<div class="card gatebox">
    <svg class="gico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>
    <h2>Entre para continuar</h2>
    <p>Para abrir ${GATE_TXT[v]||'esta secção'} precisa de uma conta. É gratuita e guarda o seu progresso em qualquer dispositivo.</p>
    <div class="gatecta"><button class="cta pri" data-acc="up">Criar conta</button><button class="cta" data-acc="in">Entrar</button></div>
    <p class="small">Recebeu um código ou QR code do formador? <button class="linkbtn" data-acc="code">Criar conta com o código da turma</button></p></div>`;
  return true;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-acc]');if(!b||!ACC_ON)return;e.preventDefault();accModal(b.dataset.acc==='code'?'up':b.dataset.acc,b.dataset.acc==='code')});

/* ---------- arranque ---------- */
function accInit(){
  if(!ACC_ON)return;
  document.body.classList.add('contas');
  ACC.sb=window.supabase.createClient(CTG_CONFIG.supabaseUrl,CTG_CONFIG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'ctg-auth'}});
  $('accBtn').onclick=()=>accModal();
  ACC.sb.auth.onAuthStateChange((ev,session)=>{setTimeout(()=>{const first=!ACC.ready;ACC.ready=true;accSetUser(session?session.user:null,first)},0)});
  accHeader();
  window.addEventListener('online',accFlush);
}
