/* Demonstração rápida, construtor e referência (versão 1) */
/* ===================== Cenários ===================== */
const ACTIONS=[
  ['posicao','Decúbito lateral / mudar posição'],['ocitocina','Suspender ocitocina'],['fluidos','Fluidos IV rápidos'],
  ['efedrina','Efedrina IV (anestesia)'],['tocolise','Tocólise aguda (terbutalina / nitroglicerina)'],['puxos','Suspender puxos maternos'],
  ['toque','Exame vaginal'],['temp','Avaliar temperatura e sinais de infeção'],['fcm','Confirmar FC materna (pulso / oxímetro)'],
  ['eletrodo','Elétrodo de escalpe / reposicionar sonda'],['o2','Oxigénio à mãe'],['vigiar','Manter vigilância contínua'],['parto','Decidir parto imediato']
];
const ALAB=Object.fromEntries(ACTIONS);
const DEFAULT_ACT={
  o2:()=>({ok:'bad',msg:'Uma meta-análise de 16 ensaios aleatorizados (Raghuraman et al., 2021) não mostrou melhoria do pH da artéria umbilical; a ACOG desaconselha oxigénio por rotina numa mãe bem oxigenada.'}),
  fcm:(e)=>{e.p.showMhr=true;return{ok:'good',msg:'FC materna em sobreposição (linha vermelha tracejada). Confirmar sempre a origem do sinal.'}},
  temp:()=>({ok:'neutral',msg:'Temperatura 36,8 °C, sem sinais de infeção.'}),
  toque:()=>({ok:'neutral',msg:'Sem prolapso do cordão palpável.'}),
  vigiar:()=>({ok:'neutral',msg:'Vigilância contínua mantida.'}),
  ocitocina:()=>({ok:'neutral',msg:'Não há perfusão de ocitocina em curso.'}),
  puxos:()=>({ok:'neutral',msg:'A grávida não está em período expulsivo.'}),
  parto:()=>({ok:'neutral',msg:'Decisão registada.',end:true}),
};
const SC=[
 {id:'normal',grp:'Sem hipoxia',title:'Traçado normal',sub:'Fase ativa, 39 semanas',
  text:'39 semanas, trabalho de parto espontâneo, 5 cm de dilatação. Sem fatores de risco. Monitorização contínua por sonda externa.',
  params:{baseline:135,varAmp:13,accelPerHour:10,cycling:true,cInt:190,cDur:70,cAmp:50,tone:12},
  act:{parto:()=>({ok:'bad',msg:'Sem indicação: traçado normal, feto sem hipoxia/acidose.',end:true}),
       fluidos:()=>({ok:'bad',msg:'Sem indicação em mulher normotensa e hidratada.'}),
       vigiar:()=>({ok:'good',msg:'Correto: traçado normal, sem necessidade de intervenção.'})},
  ana:{cls:'N',label:'Normal',tipo:'Feto sem hipoxia/acidose.',ach:['Linha de base ~135 bpm','Variabilidade 5–25 bpm','Acelerações presentes','Sem desacelerações','Ciclicidade (períodos de sono e vigília)'],con:['Sem intervenção para melhorar a oxigenação fetal','Manter vigilância e reavaliar periodicamente']}},
 {id:'precoces',grp:'Sem hipoxia',title:'Desacelerações precoces',sub:'Fim da fase ativa',
  text:'40 semanas, 8 cm, apresentação cefálica encravada. As desacelerações acompanham as contrações.',
  params:{baseline:140,varAmp:11,accelPerHour:5,cInt:160,cDur:75,cAmp:60,tone:12,decelType:'early',decelProb:.9,decelDepth:22},
  act:{parto:()=>({ok:'bad',msg:'Sem indicação: as desacelerações precoces traduzem compressão cefálica, não hipoxia.',end:true}),
       vigiar:()=>({ok:'good',msg:'Correto: espelham a contração, com variabilidade mantida.'}),
       posicao:()=>({ok:'neutral',msg:'Sem alteração: o mecanismo é a compressão cefálica.'})},
  ana:{cls:'N',label:'Normal',tipo:'Compressão cefálica (estimulação vagal). Não traduz hipoxia.',ach:['Descidas pouco profundas e curtas','Nadir coincidente com o pico da contração','Variabilidade mantida dentro da desaceleração'],con:['Sem intervenção','Manter vigilância']}},
 {id:'variaveis',grp:'Hipoxia possível',title:'Desacelerações variáveis',sub:'Compressão do cordão',
  text:'38 semanas, oligoâmnios, 7 cm. Desacelerações abruptas com a maioria das contrações.',
  params:{baseline:140,varAmp:12,accelPerHour:3,cInt:170,cDur:70,cAmp:55,tone:12,decelType:'variable',decelProb:.85,decelDepth:45},
  act:{posicao:(e,S)=>{e.set({decelProb:.25,decelDepth:30});return{ok:'good',msg:'A compressão transitória do cordão pode aliviar com a mudança de posição materna.'}},
       vigiar:()=>({ok:'good',msg:'Adequado: feto compensado (linha de base e variabilidade estáveis).'}),
       parto:()=>({ok:'bad',msg:'Prematuro: traçado suspeito com feto compensado. Corrigir a causa e vigiar.',end:true}),
       fluidos:()=>({ok:'neutral',msg:'Sem efeito sobre a compressão do cordão.'})},
  ana:{cls:'S',label:'Suspeito',tipo:'Compressão do cordão umbilical com feto compensado.',ach:['Desacelerações variáveis repetitivas (>50% das contrações)','Queda abrupta e recuperação rápida','Linha de base e variabilidade normais'],con:['Mudar a posição materna','Vigilância apertada','Reavaliar se surgirem subida da linha de base ou perda de variabilidade']}},
 {id:'subaguda',grp:'Hipoxia',title:'Hipoxia subaguda',sub:'Período expulsivo com ocitocina',
  text:'Período expulsivo há 50 min, puxos ativos, perfusão de ocitocina em curso. Contrações muito frequentes.',
  params:{baseline:145,varAmp:12,accelPerHour:0,cInt:112,cDur:75,cAmp:70,tone:14,decelType:'subacute',decelProb:1,decelDepth:60},
  tl:[{at:4*MIN,fn:(e,S)=>{if(!S.f.fix)e.set({baseline:158,ramp:1.5})}},{at:10*MIN,fn:(e,S)=>{if(!S.f.fix)e.set({varAmp:5,varRamp:2})}}],
  act:{ocitocina:(e,S)=>{S.f.oc=1;e.at(120,()=>e.set({cInt:150,cAmp:55}));e.at(150,()=>e.set({decelType:'variable',decelDepth:40,decelProb:.7}));fixSub(e,S);return{ok:'good',msg:'Primeiro passo: reduz a frequência das contrações em poucos minutos.'}},
       puxos:(e,S)=>{S.f.px=1;e.set({decelDepth:Math.max(30,e.p.decelDepth-15)});fixSub(e,S);return{ok:'good',msg:'Os puxos agravam a hipoxia; interromper até o traçado melhorar (FIGO 2015).'}},
       tocolise:(e,S)=>{S.f.tc=1;e.at(90,()=>e.set({cInt:260,cAmp:45,decelType:'variable',decelProb:.35,decelDepth:30}));fixSub(e,S,true);return{ok:'good',msg:'Indicada se a hiperestimulação persiste apesar das medidas anteriores.'}},
       posicao:(e,S)=>{S.f.pos=1;return{ok:'good',msg:'Evitar a posição supina. Isoladamente não resolve a hiperestimulação.'}},
       fluidos:()=>({ok:'neutral',msg:'Pode fazer parte das medidas, mas não corrige a hiperestimulação.'}),
       parto:(e,S)=>S.f.oc||S.f.tc?{ok:'good',msg:'Acelerar o parto é correto se a hipoxia persiste apesar da tocólise.',end:true}:{ok:'neutral',msg:'Antes de decidir: parar a ocitocina, interromper puxos e considerar tocólise. Acelerar o parto se persistir.',end:true}},
  ana:{cls:'P',label:'Patológico',tipo:'Hipoxia subaguda: o feto passa >90 s em desaceleração e <30 s na linha de base. O pH desce ~0,01 a cada 2–3 min.',ach:['Taquissistolia (>5 contrações em 10 min)','Desacelerações profundas e longas','Subida progressiva da linha de base e perda de variabilidade se nada for feito'],con:['Parar/reduzir os uterotónicos','Evitar a posição supina e interromper os puxos','Fluidos IV','Tocólise se a hiperestimulação persistir','Acelerar o parto se a hipoxia persistir apesar da tocólise']}},
 {id:'hipotensao',grp:'Hipoxia',title:'Hipoxia aguda após epidural',sub:'Causa iatrogénica reversível',
  text:'6 cm, reforço da analgesia epidural há 10 min, grávida em decúbito dorsal.',
  params:{baseline:140,varAmp:12,accelPerHour:6,cInt:200,cDur:70,cAmp:50,tone:12},
  tl:[{at:2*MIN,fn:e=>e.startPro({drop:62,fall:45,vf:1,vfLate:.8})}],
  act:{posicao:(e,S)=>{S.f.pos=1;if(e.pro&&!S.f.fl)S.tm=setTimeoutSim(e,150,()=>e.recover(20));return{ok:'good',msg:'Alivia a compressão aorto-cava. A hipotensão pode precisar ainda de fluidos ou efedrina.'}},
       fluidos:(e,S)=>{S.f.fl=1;e.recover(70);return{ok:'good',msg:'Fluidos rápidos revertem a hipotensão materna.'}},
       efedrina:(e,S)=>{S.f.fl=1;e.recover(45);return{ok:'good',msg:'Bólus de efedrina (anestesiologia) reverte a hipotensão.'}},
       toque:()=>({ok:'good',msg:'Sem prolapso do cordão. Reforça a causa iatrogénica.'}),
       ocitocina:()=>({ok:'neutral',msg:'Não há perfusão de ocitocina em curso.'}),
       parto:(e,S)=>{const d=e.pro?(e.t-e.pro.s)/60:0;return S.f.fl?{ok:'bad',msg:'A causa foi corrigida; aguardar a recuperação.',end:true}:d>=9?{ok:'good',msg:'Sem recuperação aos 9 min: decidir o parto (regra 3-6-9-12-15).',end:true}:{ok:'neutral',msg:'Existe uma causa reversível evidente: corrigir a hipotensão primeiro.',end:true}}},
  ana:{cls:'P',label:'Patológico',tipo:'Hipoxia aguda por hipotensão materna (iatrogénica, reversível). O pH desce ~0,01/min durante a desaceleração.',ach:['Desaceleração prolongada >5 min','Variabilidade mantida nos primeiros 3 min (bom prognóstico de recuperação)','Contexto: reforço epidural e decúbito dorsal'],con:['Decúbito lateral','Fluidos IV rápidos e/ou efedrina (anestesiologia)','Regra 3-6-9-12-15 se não houver recuperação']}},
 {id:'prolapso',grp:'Hipoxia',title:'Hipoxia aguda: acidente',sub:'Rotura de membranas',
  text:'5 cm, rotura espontânea de membranas há 2 min com saída de líquido abundante. Apresentação alta.',
  params:{baseline:140,varAmp:12,accelPerHour:5,cInt:210,cDur:70,cAmp:50,tone:12},
  tl:[{at:2*MIN,fn:e=>e.startPro({drop:72,fall:30,vf:.9,vfLate:.25})},{at:12*MIN,fn:e=>e.set({baseline:130,ramp:2})}],
  act:{toque:(e,S)=>{S.f.dx=1;return{ok:'good',msg:'Ansa de cordão palpável na vagina: prolapso do cordão.'}},
       posicao:(e,S)=>{if(e.pro)e.pro.drop=Math.max(45,e.pro.drop-15);return{ok:'neutral',msg:'Elevar a apresentação e posição genupeitoral reduzem a compressão enquanto se prepara o parto. Não o substituem.'}},
       fluidos:()=>({ok:'neutral',msg:'Sem efeito: a causa não é hipotensão.'}),
       efedrina:()=>({ok:'neutral',msg:'Sem efeito: a causa não é hipotensão.'}),
       tocolise:()=>({ok:'neutral',msg:'Pode reduzir a compressão durante a transferência, sem substituir o parto.'}),
       parto:(e,S)=>({ok:'good',msg:S.f.dx?'Correto: acidente agudo, parto imediato pela via mais rápida.':'Correto: perante a suspeita de acidente, parto imediato. Confirmar o prolapso ao toque.',end:true})},
  ana:{cls:'P',label:'Patológico',tipo:'Hipoxia aguda por acidente (prolapso do cordão). Causa não reversível.',ach:['Desaceleração prolongada logo após a rotura de membranas','Perda de variabilidade dentro da desaceleração após 3 min','Sem recuperação'],con:['Exame vaginal para confirmar','Elevar a apresentação enquanto se transfere','Parto imediato (FIGO 2015)']}},
 {id:'gradual',grp:'Hipoxia',title:'Hipoxia de evolução gradual',sub:'Trabalho de parto longo',speed:60,
  text:'Trabalho de parto induzido, perfusão de ocitocina há 6 h, 8 cm. Recomenda-se velocidade ×60 para ver a evolução completa.',
  params:{baseline:135,varAmp:12,accelPerHour:8,cycling:true,cInt:160,cDur:75,cAmp:55,tone:12,decelType:'late',decelProb:.5,decelDepth:22,ramp:1.2},
  tl:[{at:12*MIN,fn:(e,S)=>{if(!S.f.halt){e.set({accelPerHour:0,decelProb:.9,decelDepth:30});S.ph=2}}},
      {at:22*MIN,fn:(e,S)=>{if(!S.f.halt){e.set({baseline:160,ramp:1.2,cycling:false});S.ph=3}}},
      {at:42*MIN,fn:(e,S)=>{if(!S.f.halt){e.set({baseline:170,decelDepth:38,cycling:false});S.ph=4}}},
      {at:52*MIN,fn:(e,S)=>{if(!S.f.halt){e.set({varAmp:3.5,varRamp:2});S.ph=5}}},
      {at:66*MIN,fn:(e,S)=>{if(!S.f.halt){e.set({baseline:85,ramp:9,varAmp:2,decelProb:0});S.ph=6}}}],
  act:{ocitocina:(e,S)=>{if((S.ph||1)<5){S.f.halt=1;e.at(150,()=>e.set({cInt:230,decelProb:.45,decelDepth:22}));return{ok:'good',msg:'Reduz o stress hipóxico. Antes da descompensação, a progressão pode parar.'}}return{ok:'good',msg:'Correto, mas já há sinais de descompensação: acelerar o parto.'}},
       posicao:()=>({ok:'neutral',msg:'Evitar a posição supina. Não trata a causa (contratilidade).'}),
       fluidos:()=>({ok:'neutral',msg:'Pode fazer parte das medidas, mas não trata a causa.'}),
       parto:(e,S)=>{const ph=S.ph||1;return ph>=4?{ok:'good',msg:'Correto: sinais de descompensação (linha de base alta, perda de variabilidade ou bradicardia).',end:true}:ph>=3?{ok:'good',msg:'Razoável se não houver melhoria depois de parar a ocitocina.',end:true}:{ok:'neutral',msg:'Feto ainda compensado: corrigir a causa e reavaliar.',end:true}}},
  ana:{cls:'P',label:'Patológico',tipo:'Hipoxia de evolução gradual: resposta de stress progressiva até à descompensação.',ach:['Desacelerações tardias repetitivas','Perda de acelerações','Subida da linha de base (catecolaminas)','Perda de ciclicidade','Redução da variabilidade (descompensação)','Bradicardia terminal'],con:['Parar a ocitocina e corrigir causas','Acelerar o parto perante subida da linha de base com perda de variabilidade','Não esperar pela bradicardia terminal']}},
 {id:'cronica',grp:'Hipoxia',title:'Hipoxia crónica',sub:'Restrição de crescimento fetal',
  text:'37 semanas, restrição de crescimento fetal, admissão em fase latente. Registo com 60 min e padrão semelhante desde o início.',
  params:{baseline:158,varAmp:3.5,accelPerHour:0,cycling:false,cInt:330,cDur:60,cAmp:35,tone:12,decelType:'late',decelProb:.8,decelDepth:12},
  act:{fluidos:()=>({ok:'bad',msg:'Em normotensas bem hidratadas, os fluidos IV podem dar falsa segurança na hipoxia crónica.'}),
       vigiar:()=>({ok:'bad',msg:'Insuficiente: reserva fetal reduzida e traçado patológico.'}),
       ocitocina:()=>({ok:'neutral',msg:'Não há ocitocina em curso. Evitar estímulos que aumentem a hipoxia.'}),
       parto:()=>({ok:'good',msg:'Correto: limiar baixo para intervenção cirúrgica num feto com reserva reduzida.',end:true})},
  ana:{cls:'P',label:'Patológico',tipo:'Hipoxia crónica (pré-natal): feto com reserva reduzida e maior suscetibilidade a lesão no trabalho de parto.',ach:['Linha de base no limite superior','Variabilidade reduzida (<5 bpm) mantida','Sem acelerações nem ciclicidade','Desacelerações pouco profundas'],con:['Limiar baixo para intervenção cirúrgica','Cuidado com intervenções que aumentem o risco de hipoxia','Fluidos IV e oxigénio não melhoram o resultado']}},
 {id:'corio',grp:'Outras causas',title:'Subida da linha de base',sub:'Rotura prolongada de membranas',
  text:'Rotura de membranas há 26 h, 7 cm. Sem desacelerações ao longo do registo.',
  params:{baseline:150,varAmp:9,accelPerHour:1,cycling:false,cInt:210,cDur:70,cAmp:45,tone:12,ramp:1.5,varRamp:.3},
  tl:[{at:0,fn:e=>e.set({baseline:172,varAmp:7})}],
  act:{temp:(e,S)=>{S.f.t=1;return{ok:'good',msg:'Temperatura 38,4 °C, taquicardia materna 112 bpm: suspeita de infeção intra-amniótica.'}},
       fluidos:()=>({ok:'bad',msg:'Na corioamnionite, fluidos IV em normotensas podem dar falsa segurança.'}),
       parto:()=>({ok:'bad',msg:'Sem indicação imediata só pela taquicardia: tratar a causa e reavaliar.',end:true}),
       vigiar:()=>({ok:'neutral',msg:'Necessário, mas procurar também a causa da taquicardia.'}),
       fcm:(e)=>{e.p.showMhr=true;e.p.mhrBase=112;return{ok:'good',msg:'FC materna ~112 bpm (taquicardia materna), distinta da FCF.'}}},
  ana:{cls:'S',label:'Suspeito',tipo:'Subida da linha de base sem desacelerações prévias: sugere infeção ou inflamação, não um padrão hipóxico.',ach:['Taquicardia fetal (>160 bpm) progressiva','Sem desacelerações antes da subida','Ausência de ciclicidade'],con:['Avaliar temperatura materna e sinais de infeção','Antibioterapia conforme o protocolo','Limiar mais baixo para intervenção']}},
 {id:'sinusoidal',grp:'Outras causas',title:'Padrão sinusoidal',sub:'Diminuição de movimentos fetais',
  text:'36 semanas, refere diminuição dos movimentos fetais há 24 h. Padrão mantido há 40 min.',
  params:{baseline:140,varAmp:0,sinus:11,sinusCpm:4,accelPerHour:0,cInt:0,tone:10},
  act:{parto:()=>({ok:'good',msg:'Correto: padrão sinusoidal patológico. Avaliação urgente e decisão de parto em equipa.',end:true}),
       fluidos:()=>({ok:'neutral',msg:'Sem efeito sobre a anemia fetal.'}),
       vigiar:()=>({ok:'bad',msg:'Insuficiente: o padrão sinusoidal mantido é patológico.'})},
  ana:{cls:'P',label:'Patológico',tipo:'Anemia fetal grave (hemorragia feto-materna, isoimunização, rotura de vasa prévia). Pode também surgir na hipoxia aguda.',ach:['Ondulação regular e suave, 5–15 bpm, 3–5 ciclos/min','Sem acelerações','Duração >30 min'],con:['Avaliação urgente (Doppler da ACM, Kleihauer-Betke)','Decisão de parto em equipa']}},
 {id:'materna',grp:'Outras causas',title:'Registo da FC materna',sub:'Período expulsivo',
  text:'Período expulsivo, puxos ativos, sonda externa. O registo parece tranquilizador.',
  params:{baseline:150,varAmp:11,accelPerHour:0,cInt:140,cDur:75,cAmp:65,tone:14,decelType:'variable',decelProb:.9,decelDepth:55,maternal:true,mhrBase:98,mhrPush:true},
  act:{fcm:(e,S)=>{e.p.showMhr=true;S.f.fcm=1;return{ok:'good',msg:'O pulso materno coincide com o registo: a sonda está a captar a FC materna.'}},
       eletrodo:(e,S)=>{S.f.el=1;e.p.maternal=false;e.p.showMhr=true;return{ok:'good',msg:'Sinal fetal recuperado: FCF ~150 bpm com desacelerações variáveis profundas.'}},
       parto:(e,S)=>S.f.el?{ok:'good',msg:'Decisão tomada com sinal fetal fiável.',end:true}:{ok:'bad',msg:'Decisão sem confirmar a origem do sinal.',end:true},
       vigiar:(e,S)=>S.f.el?{ok:'neutral',msg:'Com sinal fetal fiável, reavaliar a evolução das desacelerações.'}:{ok:'bad',msg:'Risco: o traçado pode ser materno.'}},
  ana:{cls:'X',label:'Não interpretável',tipo:'A sonda externa está a registar a FC materna.',ach:['Linha de base ~100 bpm','Acelerações coincidentes com as contrações e os puxos','Sobreposição exata com o pulso materno'],con:['Monitorizar sempre a FC materna (oxímetro ou pulso)','Elétrodo de escalpe ou ecografia para confirmar a FCF','Só depois classificar o traçado']}},
];
function setTimeoutSim(e,dt,fn){e.at(dt,fn);return 1}
function fixSub(e,S,strong){if(!S.f.fix){S.f.fix=1;e.at(180,()=>e.set({baseline:147,ramp:2,varAmp:11,varRamp:3}))}}

/* ===================== Monitor ===================== */
const $=id=>document.getElementById(id);
const S={sc:null,eng:null,speed:20,win:20,run:true,acc:0,dec:0,f:{},log:[],ended:false,t0:0};
function buildEngine(sc,seed,state){
  const e=new Engine({...sc.params},seed);
  e.run(sc.pre??20*MIN);
  const t0=e.t;
  (sc.tl||[]).forEach(x=>e.timers.push({t:t0+x.at,fn:en=>x.fn(en,state)}));
  return{e,t0};
}
function loadScenario(id){
  const sc=SC.find(s=>s.id===id);S.sc=sc;S.f={};S.ph=1;S.log=[];S.ended=false;S.dec=0;S.acc=0;
  const b=buildEngine(sc,11+SC.indexOf(sc)*7,S);S.eng=b.e;S.t0=b.t0;
  S.speed=sc.speed||20;setSeg('speed','s',S.speed);
  $('scTitle').textContent=sc.title;$('scText').textContent=sc.text;
  document.querySelectorAll('#scenList button').forEach(x=>x.classList.toggle('on',x.dataset.id===id));
  $('ana').classList.remove('on');$('bAna').textContent='Mostrar análise do caso';renderAna();
  $('endcard').classList.remove('on');S.run=true;$('bPlay').textContent='Pausar';
  renderLog();document.querySelectorAll('#acts button').forEach(b=>b.disabled=false);
  try{localStorage.setItem('ctg-sc',id)}catch(_){}
}
function renderAna(){
  const a=S.sc.ana;
  $('anaBody').innerHTML=`<p><span class="badge ${a.cls}">${a.label}</span></p><p><b>Interpretação.</b> ${a.tipo}</p><p><b>Achados</b></p><ul>${a.ach.map(x=>`<li>${x}</li>`).join('')}</ul><p><b>Atuação</b></p><ul>${a.con.map(x=>`<li>${x}</li>`).join('')}</ul>`;
}
function renderLog(){
  const L=$('log');
  if(!S.log.length){L.innerHTML='<div class="empty">Ainda sem ações. Observe o traçado e escolha uma intervenção.</div>';return}
  L.innerHTML=S.log.slice().reverse().map(x=>`<div class="e ${x.ok}"><span class="t">${fmt(x.t)}</span> <b>${x.label}</b><br>${x.msg}</div>`).join('');
}
function doAct(id){
  if(S.ended)return;
  const fn=(S.sc.act&&S.sc.act[id])||DEFAULT_ACT[id]||(()=>({ok:'neutral',msg:'Sem efeito evidente no traçado neste cenário.'}));
  const res=fn(S.eng,S);
  S.log.push({t:S.eng.t-S.t0,label:ALAB[id],ok:res.ok,msg:res.msg});renderLog();
  if(res.end){S.ended=true;S.run=false;$('bPlay').textContent='Retomar';
    const g=S.log.filter(x=>x.ok==='good').length,b=S.log.filter(x=>x.ok==='bad').length;
    $('endT').textContent='Decisão de parto aos '+fmt(S.eng.t-S.t0);
    $('endP').textContent=res.msg+` Ações adequadas: ${g}. Ações sem benefício ou inadequadas: ${b}.`;
    $('endcard').classList.add('on');document.querySelectorAll('#acts button').forEach(b=>b.disabled=true);drawMon()}
}
function setSeg(id,key,val){document.querySelectorAll('#'+id+' button').forEach(b=>b.classList.toggle('on',+b.dataset[key]===+val))}
function readouts(){
  const e=S.eng,last=e.F[e.F.length-1];
  $('rFcf').innerHTML=Math.round(last)+' <small>bpm</small>';
  $('rBase').innerHTML=(e.p.maternal?'~'+Math.round(e.p.mhrBase):Math.round(e.b))+' <small>bpm</small>';
  const n=e.contr10();$('rCont').innerHTML=n+(n>5?' <span class="chip bad">taquissistolia</span>':'');
  $('tCont').classList.toggle('alert',n>5);
  const d=S.dec;$('rDec').textContent=d>=15?fmt(d):'—';
  $('tDec').classList.toggle('alert',d>=180);$('tDec').classList.toggle('warn',d>=60&&d<180);
  $('rTime').textContent=fmt(e.t-S.t0);
  const g=$('guide');g.classList.toggle('on',d>=180);
  if(d>=180){const m=d/60;document.querySelectorAll('#rule div').forEach(x=>{const k=+x.dataset.m;x.classList.toggle('now',m>=k&&m<k+3)})}
}
function drawMon(){drawCTG($('cvMon'),S.eng,{tEnd:S.eng.t,win:S.win*MIN,tZero:S.t0})}
let lastTs=0;
function loop(ts){
  const dt=Math.min(.1,(ts-lastTs)/1000||0);lastTs=ts;
  const mon=$('v-monitor').classList.contains('on');
  if(S.eng&&S.run&&mon){
    S.acc+=dt*S.speed;let n=Math.min(4000,Math.floor(S.acc/DT));S.acc-=n*DT;
    while(n-->0){S.eng.step();const e=S.eng,f=e.F[e.F.length-1];if(!e.p.maternal&&f<e.b-15)S.dec+=DT;else S.dec=0}
  }
  if(mon&&S.eng){drawMon();readouts()}
  if(typeof sndHeart==='function'){const on=mon&&S.eng&&S.run&&!document.hidden;if(S.eng&&S.eng!==S._sndE){S._sndE=S.eng;sndClear('demo')}sndHeart('demo',S.eng?S.eng.F[S.eng.F.length-1]:0,on);if(S.eng&&mon)sndBar($('mAlarm'),sndAlarmUpdate('demo',S.eng,null,on),'demo')}
  if($('v-construtor').classList.contains('on')&&B.eng){if(B.run){B.acc+=dt*20;let n=Math.floor(B.acc/DT);B.acc-=n*DT;while(n-->0)B.eng.step()}drawCTG($('cvBuild'),B.eng,{tEnd:B.eng.t,win:20*MIN,tZero:0})}
  requestAnimationFrame(loop);
}
function initMonitor(){
  let html='',g='';
  SC.forEach(s=>{if(s.grp!==g){g=s.grp;html+=`<div class="grp">${g}</div>`}html+=`<button data-id="${s.id}"><b>${s.title}</b><span>${s.sub}</span></button>`});
  $('scenList').innerHTML=html;
  $('scenList').addEventListener('click',ev=>{const b=ev.target.closest('button');if(b)loadScenario(b.dataset.id)});
  $('acts').innerHTML=ACTIONS.map(([id,l])=>`<button data-a="${id}" class="${id==='parto'?'end':''}">${l}</button>`).join('');
  $('acts').addEventListener('click',ev=>{const b=ev.target.closest('button');if(b)doAct(b.dataset.a)});
  $('bPlay').onclick=()=>{if(S.ended)return;S.run=!S.run;$('bPlay').textContent=S.run?'Pausar':'Retomar'};
  $('bRestart').onclick=()=>loadScenario(S.sc.id);$('endRe').onclick=()=>loadScenario(S.sc.id);
  $('endAna').onclick=()=>{$('endcard').classList.remove('on');$('ana').classList.add('on');$('bAna').textContent='Ocultar análise'};
  $('bAna').onclick=()=>{const on=$('ana').classList.toggle('on');$('bAna').textContent=on?'Ocultar análise':'Mostrar análise do caso'};
  $('speed').onclick=ev=>{const b=ev.target.closest('button');if(b){S.speed=+b.dataset.s;setSeg('speed','s',S.speed)}};
  $('win').onclick=ev=>{const b=ev.target.closest('button');if(b){S.win=+b.dataset.w;setSeg('win','w',S.win)}};
  let first='subaguda';try{const v=localStorage.getItem('ctg-sc');if(v&&SC.some(s=>s.id===v))first=v}catch(_){}
  loadScenario(first);
}

/* ===================== Construtor ===================== */
const B={eng:null,run:true,acc:0};
const SL=[['sBase','vBase',v=>v+' bpm'],['sVar','vVar',v=>v+' bpm'],['sAcc','vAcc',v=>v],['sCn','vCn',v=>v],['sCd','vCd',v=>v+' s'],['sCa','vCa',v=>v+' mmHg'],['sTone','vTone',v=>v+' mmHg'],['sDp','vDp',v=>v+'%'],['sDd','vDd',v=>v+' bpm']];
function readB(){
  const g=id=>+$(id).value;const cn=g('sCn');
  return{baseline:g('sBase'),varAmp:g('sVar'),sinus:$('sSin').checked?10:0,accelPerHour:g('sAcc'),cycling:$('sCyc').checked,cInt:cn>0?600/cn:0,cDur:g('sCd'),cAmp:g('sCa'),tone:g('sTone'),decelType:$('sDt').value,decelProb:g('sDp')/100,decelDepth:g('sDd'),ramp:90,varRamp:40};
}
function figoEval(p){
  const rows=[];const lv={N:0,S:1,P:2};let worst='N';const add=(k,c,txt)=>{rows.push([k,c,txt]);if(lv[c]>lv[worst])worst=c};
  if(p.baseline<100)add('Linha de base','P','Bradicardia <100 bpm');
  else if(p.baseline<110)add('Linha de base','S','100–109 bpm (pode ser normal no pós-termo ou occipito-posterior)');
  else if(p.baseline>160)add('Linha de base','S','Taquicardia >160 bpm');
  else add('Linha de base','N','110–160 bpm');
  if(p.sinus)add('Variabilidade','P','Padrão sinusoidal (patológico se >30 min)');
  else if(p.varAmp<5)add('Variabilidade','P','Reduzida <5 bpm (patológico se >50 min; durante menos tempo, suspeito)');
  else if(p.varAmp>25)add('Variabilidade','P','Aumentada >25 bpm (patológico se >30 min)');
  else add('Variabilidade','N','5–25 bpm');
  const rep=p.decelProb>.5,t=p.decelType;
  if(t==='none'||p.decelProb===0)add('Desacelerações','N','Ausentes');
  else if(t==='early')add('Desacelerações','N','Precoces: compressão cefálica, sem significado hipóxico');
  else if(t==='variable')add('Desacelerações',rep?'S':'N',rep?'Variáveis repetitivas':'Variáveis ocasionais');
  else if(t==='late')add('Desacelerações',rep?'P':'S',rep?'Tardias repetitivas (patológico se >30 min, ou >20 min com variabilidade reduzida)':'Tardias ocasionais');
  else add('Desacelerações','P','Profundas e longas (>90 s): padrão de hipoxia subaguda');
  if(B.eng&&B.eng.pro)add('Desaceleração prolongada','P','Patológico se >5 min (ou >3 min com variabilidade reduzida)');
  const cn=p.cInt>0?600/p.cInt:0;
  const extra=[];
  extra.push(p.accelPerHour>0&&!p.sinus?'<span class="chip ok">Acelerações presentes: feto sem hipoxia/acidose</span>':'<span class="chip warn">Sem acelerações: significado incerto no trabalho de parto</span>');
  if(cn>5)extra.push('<span class="chip bad">Taquissistolia: >5 contrações em 10 min</span>');
  if(p.tone>=25)extra.push('<span class="chip bad">Tónus basal elevado: suspeitar de hipertonia</span>');
  const L={N:'Normal',S:'Suspeito',P:'Patológico'};
  $('figoBox').innerHTML=`<div class="tot"><h3 style="margin:0">Classificação FIGO 2015</h3><span class="badge ${worst}">${L[worst]}</span></div>`+
   rows.map(r=>`<div class="row"><b>${r[0]}</b><span><span class="badge ${r[1]}">${L[r[1]]}</span></span><span>${r[2]}</span></div>`).join('')+
   `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${extra.join('')}</div><p class="small" style="margin:8px 0 0">Avaliação baseada nos parâmetros escolhidos; os critérios de tempo da FIGO estão indicados entre parênteses.</p>`;
}
function syncB(){SL.forEach(([s,v,f])=>$(v).textContent=f($(s).value));const p=readB();B.eng.set(p);figoEval(p)}
function initBuild(){
  B.eng=new Engine({...readB(),ramp:90,varRamp:40},5);B.eng.run(20*MIN);
  document.querySelectorAll('#sliders input,#sliders select').forEach(el=>el.addEventListener('input',syncB));
  $('bPro').onclick=()=>{if(!B.eng.pro)B.eng.startPro({drop:60,fall:40,vf:.9,vfLate:.5});figoEval(readB())};
  $('bRec').onclick=()=>{B.eng.recover(10);setTimeout(()=>figoEval(readB()),4000)};
  $('bMhr').onclick=()=>{B.eng.p.showMhr=!B.eng.p.showMhr;$('bMhr').textContent=B.eng.p.showMhr?'Ocultar FC materna':'Mostrar FC materna'};
  $('bReset').onclick=()=>{const d={sBase:140,sVar:12,sAcc:8,sCn:3,sCd:70,sCa:50,sTone:12,sDp:0,sDd:35};for(const k in d)$(k).value=d[k];$('sSin').checked=false;$('sCyc').checked=false;$('sDt').value='none';if(B.eng.pro)B.eng.recover(0);syncB()};
  syncB();
}

/* ===================== Referência: mini traçados ===================== */
function initMinis(){
  const mk=(id,p,pro)=>{const e=new Engine({baseline:140,varAmp:11,accelPerHour:0,cInt:150,cDur:70,cAmp:55,tone:12,decelProb:1,decelDepth:35,...p},3);
    if(pro){e.run(3*MIN);e.startPro({drop:55,fall:35});e.at(5*MIN,en=>en.recover(0));e.run(8*MIN)}else e.run(9*MIN);
    drawCTG($(id),e,{tEnd:e.t,win:8*MIN,compact:true})};
  mk('mEarly',{decelType:'early',decelDepth:25});mk('mLate',{decelType:'late',decelDepth:30,varInDecel:.6});mk('mVar',{decelType:'variable',decelDepth:50});mk('mPro',{cInt:240},true);
}

