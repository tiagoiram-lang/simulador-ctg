/* Treino rápido: gerador de traçados, correção explicada e traçado anotado */
const D={n:0,ok:0,tot:0,streak:0,cur:null,done:false,layers:{base:true,var:true,acc:true,dec:true,cont:true},last:[]};
const BASE_L={lt100:'<100 bpm',b100:'100–109 bpm',normal:'110–160 bpm',gt160:'>160 bpm'};
const CONT_L={ok:'≤5 em 10 min',taqui:'>5 em 10 min (taquissistolia)'};
const FIGO4={N:'Normal',S:'Suspeito',P:'Patológico',X:'Não interpretável'};
let RNG=Math.random;
function rnd(a,b){return a+RNG()*(b-a)}function rint(a,b){return Math.round(rnd(a,b))}function pick(a){return a[Math.floor(RNG()*a.length)]}
const C10=n=>600/n;
const ATIVA=['Fase ativa, 5 cm.','Fase ativa, 6 cm, membranas rotas.','Fase ativa, 7 cm, epidural funcionante.','Fase ativa, 8 cm.'];
const EXP=['Período expulsivo, puxos ativos.','Dilatação completa há 40 min, puxos ativos.'];

/* Cada receita: p = parâmetros do motor; pdur = há quanto tempo o padrão se mantém (min); mech = interpretações aceites; tip = ponto de ensino */
const RECIPES=[
 {id:'normal',nm:'Traçado normal',w:4,g:()=>({p:{baseline:rint(120,152),varAmp:rint(9,17),accelPerHour:rint(4,8),cInt:C10(rnd(2.5,4))},ctx:pick(ATIVA),pdur:40,mech:['sem'],tip:'Todos os parâmetros dentro da normalidade; as acelerações confirmam um feto sem hipoxia/acidose.'})},
 {id:'normal_baixo',nm:'Linha de base no limite inferior',w:1,g:()=>({p:{baseline:rint(111,118),varAmp:rint(8,14),accelPerHour:rint(3,7),cInt:C10(rnd(2.5,3.5))},ctx:'41+2 semanas, fase ativa, 6 cm.',pdur:40,mech:['sem'],tip:'Uma linha de base entre 110 e 120 bpm é normal, sobretudo no pós-termo.'})},
 {id:'normal_alto',nm:'Linha de base no limite superior',w:1,g:()=>({p:{baseline:rint(152,159),varAmp:rint(8,14),accelPerHour:rint(3,7),cInt:C10(rnd(2.5,3.5))},ctx:'34 semanas, ameaça de parto pré-termo.',pdur:40,mech:['sem'],tip:'Em idades gestacionais mais baixas a linha de base é mais alta; até 160 bpm é normal.'})},
 {id:'sono',nm:'Sono fetal profundo',w:2,g:()=>({p:{baseline:rint(125,142),varAmp:rnd(3,4.3),accelPerHour:0,cInt:C10(rnd(2,3))},ctx:'Fase latente, 3 cm. O registo anterior a esta janela tinha acelerações.',pdur:rint(20,30),mech:['nao_hipoxica','sem'],tip:'O sono profundo pode durar até 50 min, com variabilidade reduzida e sem acelerações. Por isso a FIGO só considera patológica a variabilidade reduzida mantida mais de 50 min.'})},
 {id:'opioide',nm:'Efeito de opioide',w:2,g:()=>({p:{baseline:rint(130,145),varAmp:rnd(2.5,4),accelPerHour:0,cInt:C10(rnd(3,4))},ctx:'Petidina 50 mg IM há 35 min. Fase ativa, 5 cm.',pdur:35,mech:['nao_hipoxica'],tip:'Os opioides reduzem a variabilidade e as acelerações durante 1–2 h. Sem desacelerações e com linha de base estável, não sugere hipoxia.'})},
 {id:'precoces',nm:'Desacelerações precoces',w:2,g:()=>({p:{baseline:rint(128,148),varAmp:rint(9,15),accelPerHour:rint(2,6),cInt:C10(rnd(3.5,4.5)),decelType:'early',decelProb:rnd(.8,.95),decelDepth:rint(20,28)},ctx:'Fase ativa, 9 cm, apresentação encravada.',pdur:40,mech:['sem'],tip:'Precoces: descida gradual e simétrica, nadir coincidente com o pico da contração. Traduzem compressão cefálica e não hipoxia.'})},
 {id:'precoces_exp',nm:'Precoces no período expulsivo',w:1,g:()=>({p:{baseline:rint(130,145),varAmp:rint(9,14),accelPerHour:rint(0,4),cInt:C10(rnd(4,5)),cAmp:70,pushing:true,decelType:'early',decelProb:.9,decelDepth:rint(20,28)},ctx:pick(EXP),pdur:30,mech:['sem'],tip:'No expulsivo, os picos do toco correspondem aos puxos. As desacelerações espelham a contração: compressão cefálica.'})},
 {id:'var_ocas',nm:'Variáveis ocasionais',w:2,g:()=>({p:{baseline:rint(130,148),varAmp:rint(9,15),accelPerHour:rint(4,8),cInt:C10(rnd(3,4)),decelType:'variable',decelProb:rnd(.12,.25),decelDepth:rint(30,45)},ctx:pick(ATIVA),pdur:40,mech:['sem'],tip:'Desacelerações variáveis em menos de 50% das contrações não são repetitivas: o traçado mantém-se normal.'})},
 {id:'var_rep',nm:'Variáveis repetitivas',w:3,g:()=>({p:{baseline:rint(132,150),varAmp:rint(9,15),accelPerHour:rint(0,4),cInt:C10(rnd(3.5,4.5)),decelType:'variable',decelProb:rnd(.8,.95),decelDepth:rint(35,55)},ctx:'Oligoâmnios, fase ativa, 7 cm.',pdur:40,mech:['gradual','sem'],tip:'Variáveis repetitivas com linha de base e variabilidade normais: feto compensado (suspeito). Mudar a posição e vigiar sinais de descompensação.'})},
 {id:'var_exp',nm:'Variáveis profundas no expulsivo',w:2,g:()=>({p:{baseline:rint(140,155),varAmp:rint(9,14),accelPerHour:0,cInt:C10(rnd(4,5)),cAmp:70,pushing:true,decelType:'variable',decelProb:.9,decelDepth:rint(55,65)},ctx:pick(EXP),pdur:25,mech:['gradual','sem'],tip:'No expulsivo as variáveis profundas são frequentes. O que preocupa é a subida da linha de base, a perda de variabilidade e o pouco tempo na linha de base entre desacelerações.'})},
 {id:'var_taqui',nm:'Variáveis repetitivas com taquicardia',w:2,g:()=>({p:{baseline:rint(165,175),varAmp:rint(8,13),accelPerHour:0,cInt:C10(rnd(3.5,4.5)),decelType:'variable',decelProb:.9,decelDepth:rint(40,55)},ctx:'Trabalho de parto longo com ocitocina, 8 cm. Linha de base era 135 bpm há 2 h.',pdur:40,mech:['gradual'],tip:'Desacelerações repetitivas seguidas de subida da linha de base e perda de acelerações: resposta de stress (catecolaminas) na hipoxia de evolução gradual.'})},
 {id:'var_reduz',nm:'Variáveis repetitivas com variabilidade reduzida',w:2,g:()=>({p:{baseline:rint(160,172),varAmp:rnd(2.5,4),accelPerHour:0,cInt:C10(rnd(3.5,4.5)),decelType:'variable',decelProb:.9,decelDepth:rint(40,55)},ctx:'Ocitocina há 7 h, 9 cm.',pdur:55,mech:['gradual'],tip:'Depois da subida da linha de base, a perda de variabilidade indica descompensação: é altura de acelerar o parto.'})},
 {id:'tard_ocas',nm:'Tardias ocasionais',w:2,g:()=>({p:{baseline:rint(135,150),varAmp:rint(9,14),accelPerHour:rint(2,5),cInt:C10(rnd(3,4)),decelType:'late',decelProb:rnd(.15,.28),decelDepth:rint(18,25)},ctx:pick(ATIVA),pdur:40,mech:['gradual','sem'],tip:'Desacelerações tardias isoladas tornam o traçado suspeito: procurar causas reversíveis (hiperestimulação, hipotensão).'})},
 {id:'tard_rep',nm:'Tardias repetitivas',w:3,g:()=>({p:{baseline:rint(138,155),varAmp:rint(8,13),accelPerHour:0,cInt:C10(rnd(3.5,4.5)),decelType:'late',decelProb:.95,decelDepth:rint(20,35)},ctx:'Pré-eclâmpsia, ocitocina em curso, 6 cm.',pdur:40,mech:['gradual'],tip:'Tardias: descida gradual, nadir depois do pico da contração e retorno lento. Repetitivas durante mais de 30 min são critério de patológico.'})},
 {id:'tard_curta',nm:'Tardias repetitivas há pouco tempo',w:1,g:()=>({p:{baseline:rint(138,150),varAmp:rint(9,13),accelPerHour:0,cInt:C10(rnd(3.5,4.5)),decelType:'late',decelProb:.95,decelDepth:rint(18,28)},ctx:'As desacelerações começaram há 15 min, depois de aumentar a ocitocina.',pdur:15,mech:['gradual'],tip:'Com variabilidade normal, tardias repetitivas há menos de 30 min ainda são suspeito na FIGO. É a janela para corrigir a causa (reduzir a ocitocina).'})},
 {id:'tard_reduz',nm:'Tardias com variabilidade reduzida',w:2,g:()=>({p:{baseline:rint(145,160),varAmp:rnd(2,4),accelPerHour:0,cInt:C10(rnd(3,4)),decelType:'late',decelProb:.9,decelDepth:rint(16,25)},ctx:'Diabetes pré-gestacional, 6 cm.',pdur:25,mech:['gradual','cronica'],tip:'Com variabilidade reduzida, bastam 20 min de tardias repetitivas para classificar como patológico.'})},
 {id:'cronica',nm:'Hipoxia crónica',w:2,g:()=>({p:{baseline:rint(155,160),varAmp:rnd(2.5,4),accelPerHour:0,cInt:C10(rnd(2,3)),decelType:'late',decelProb:.85,decelDepth:rint(15,19)},ctx:'RCF < p3, Doppler da artéria umbilical alterado. Registo igual desde a admissão há 70 min.',pdur:70,mech:['cronica'],tip:'Hipoxia crónica: linha de base no limite superior, variabilidade reduzida, sem acelerações nem ciclicidade, desacelerações pouco profundas. Limiar baixo para intervenção.'})},
 {id:'taqui_febre',nm:'Taquicardia com febre',w:2,g:()=>({p:{baseline:rint(163,178),varAmp:rint(8,13),accelPerHour:rint(0,3),cInt:C10(rnd(3,4))},ctx:'Temperatura materna 38,4 °C, rotura de membranas há 24 h.',pdur:40,mech:['nao_hipoxica'],tip:'Subida da linha de base sem desacelerações prévias sugere infeção/febre, não hipoxia. Tratar a causa.'})},
 {id:'taqui_terb',nm:'Taquicardia após terbutalina',w:1,g:()=>({p:{baseline:rint(162,170),varAmp:rint(9,13),accelPerHour:rint(2,5),cInt:C10(rnd(1.5,2.5))},ctx:'Terbutalina 0,25 mg SC há 15 min por taquissistolia.',pdur:15,mech:['nao_hipoxica'],tip:'Os beta-agonistas aumentam a FC materna e fetal de forma transitória.'})},
 {id:'taqui_reduz',nm:'Taquicardia com variabilidade reduzida',w:1,g:()=>({p:{baseline:rint(170,180),varAmp:rnd(2.5,4),accelPerHour:0,cInt:C10(rnd(3,4))},ctx:'Febre materna 38,8 °C há 2 h, sem antibiótico.',pdur:55,mech:['nao_hipoxica','gradual'],tip:'A infeção reduz a reserva fetal; com variabilidade reduzida mantida, o traçado é patológico.'})},
 {id:'bradi_lig',nm:'Linha de base 100–109 bpm',w:2,g:()=>({p:{baseline:rint(101,108),varAmp:rint(8,13),accelPerHour:rint(3,7),cInt:C10(rnd(3,4))},ctx:'41+5 semanas, occipito-posterior, 6 cm.',pdur:40,mech:['sem'],tip:'100–109 bpm com variabilidade normal e acelerações pode ser normal no pós-termo ou em occipito-posterior; na FIGO é suspeito.'})},
 {id:'bradi',nm:'Bradicardia <100 bpm',w:1,g:()=>({p:{baseline:rint(86,96),varAmp:rint(5,9),accelPerHour:0,cInt:C10(rnd(2.5,3.5))},ctx:'Fase ativa, 7 cm. FCF baixa há 15 min.',pdur:15,mech:['aguda'],tip:'Linha de base abaixo de 100 bpm é critério de patológico. Confirmar que não é a FC materna.'})},
 {id:'terminal',nm:'Bradicardia terminal',w:1,g:()=>({p:{baseline:rint(72,84),varAmp:rnd(.8,1.4),accelPerHour:0,cInt:C10(rnd(3,4))},ctx:'Antes desta janela: taquicardia 175 bpm com desacelerações e variabilidade reduzida.',pdur:15,mech:['gradual','aguda'],tip:'Bradicardia com variabilidade ausente depois de um período de taquicardia e perda de variabilidade: falência miocárdica. Parto imediato.'})},
 {id:'prol_3_5',nm:'Desaceleração prolongada de 3–5 min',w:2,g:()=>({p:{baseline:rint(132,148),varAmp:rint(9,14),accelPerHour:rint(2,5),cInt:C10(rnd(3,4))},pro:{at:14,dur:rnd(3.4,4.4),drop:rint(45,60),rec:true},ctx:'Fase ativa após reforço epidural.',pdur:40,mech:['aguda'],tip:'Uma desaceleração prolongada (>3 min) mas com menos de 5 min e recuperação completa: suspeito. Procurar e corrigir a causa.'})},
 {id:'prol_on',nm:'Desaceleração prolongada em curso',w:3,g:()=>({p:{baseline:rint(132,148),varAmp:rint(9,14),accelPerHour:rint(2,5),cInt:C10(rnd(3,4))},pro:{at:rnd(6,8),drop:rint(55,68),rec:false},ctx:pick(['Reforço epidural há 10 min, decúbito dorsal.','Rotura espontânea de membranas há 5 min.','Ocitocina aumentada há 20 min.']),pdur:40,mech:['aguda'],tip:'Desaceleração prolongada com mais de 5 min: patológico. Regra 3-6-9-12-15: procurar a causa, corrigir, e se não recuperar decidir o parto.'})},
 {id:'prol_rec',nm:'Prolongada recuperada',w:2,g:()=>({p:{baseline:rint(132,145),varAmp:rint(9,14),accelPerHour:0,cInt:C10(rnd(3,4))},pro:{at:18,dur:rnd(6,7),drop:rint(55,65),rec:true},ctx:'Hipotensão materna corrigida com fluidos e efedrina.',pdur:40,mech:['aguda'],tip:'A desaceleração prolongada >5 min nos últimos 30 min mantém o traçado patológico, mesmo depois de recuperar. Vigiar a recuperação da variabilidade.'})},
 {id:'prol_perda',nm:'Prolongada com perda de variabilidade',w:2,g:()=>({p:{baseline:rint(135,148),varAmp:rint(9,14),accelPerHour:rint(2,5),cInt:C10(rnd(3,4))},pro:{at:rnd(7,9),drop:rint(65,75),rec:false,vfLate:.2},ctx:'Dor súbita, perda hemática, cesariana anterior.',pdur:40,mech:['aguda'],tip:'A perda de variabilidade durante a desaceleração após 3 min indica mau prognóstico de recuperação. Num acidente (rotura uterina, prolapso, descolamento), parto imediato.'})},
 {id:'subaguda',nm:'Hipoxia subaguda',w:3,g:()=>({p:{baseline:rint(145,160),varAmp:rint(8,12),accelPerHour:0,cInt:C10(rnd(5.2,5.8)),cAmp:70,cDur:80,pushing:true,decelType:'subacute',decelProb:1,decelDepth:rint(55,65)},ctx:'Período expulsivo, puxos ativos, ocitocina em curso.',pdur:20,mech:['subaguda'],tip:'Na FIGO estrita são variáveis repetitivas (suspeito), mas a fisiologia mostra hipoxia subaguda: o feto passa mais de 90 s em desaceleração e menos de 30 s na linha de base. O pH desce cerca de 0,01 a cada 2–3 min. Parar a ocitocina e os puxos, tocólise se persistir.'})},
 {id:'taquissistolia',nm:'Taquissistolia com FCF normal',w:2,g:()=>({p:{baseline:rint(130,148),varAmp:rint(9,14),accelPerHour:rint(3,6),cInt:C10(rnd(6,7))},ctx:'Ocitocina a 14 mU/min, 6 cm.',pdur:30,mech:['sem'],tip:'A FCF ainda é normal, mas a taquissistolia deve ser corrigida (reduzir a ocitocina) antes de surgirem desacelerações.'})},
 {id:'taqui_tard',nm:'Taquissistolia com tardias',w:2,g:()=>({p:{baseline:rint(140,155),varAmp:rint(8,12),accelPerHour:0,cInt:C10(rnd(6,7)),decelType:'late',decelProb:.9,decelDepth:rint(20,30)},ctx:'Ocitocina a 16 mU/min, 7 cm.',pdur:35,mech:['gradual'],tip:'Contrações demasiado frequentes não deixam o feto recuperar: tardias repetitivas. Suspender a ocitocina e considerar tocólise.'})},
 {id:'hipertonia',nm:'Hipertonia uterina',w:1,g:()=>({p:{baseline:rint(135,148),varAmp:rint(9,13),accelPerHour:0,cInt:C10(3),tone:12},pro:{at:rnd(6,7),drop:rint(50,60),rec:false,tone:32},ctx:'Dinoprostona aplicada há 2 h.',pdur:40,mech:['aguda'],tip:'Tónus basal elevado (útero não relaxa) com desaceleração prolongada: hipertonia. Remover a prostaglandina e fazer tocólise aguda.'})},
 {id:'descolamento',nm:'Descolamento da placenta',w:1,g:()=>({p:{baseline:rint(140,155),varAmp:rint(6,10),accelPerHour:0,cInt:C10(rnd(7,8)),cAmp:16,cDur:45,tone:34,decelType:'late',decelProb:.9,decelDepth:rint(25,35)},ctx:'Pré-eclâmpsia. Dor abdominal contínua e perda de sangue escuro.',pdur:25,mech:['aguda','gradual'],tip:'Toco com contrações pequenas e muito frequentes sobre tónus elevado, com tardias: padrão típico do descolamento. É um acidente agudo.'})},
 {id:'sinus',nm:'Padrão sinusoidal',w:2,g:()=>({p:{baseline:rint(135,150),varAmp:0,sinus:rint(8,14),sinusCpm:rnd(3,5),accelPerHour:0,cInt:0},ctx:'34 semanas, diminuição dos movimentos fetais há 24 h.',pdur:40,mech:['nao_hipoxica'],tip:'Ondulação regular e suave (5–15 bpm, 3–5 ciclos/min) sem acelerações durante mais de 30 min: patológico. Pensar em anemia fetal grave.'})},
 {id:'sinus_curto',nm:'Padrão sinusoidal há pouco tempo',w:1,g:()=>({p:{baseline:rint(135,150),varAmp:0,sinus:rint(8,12),sinusCpm:rnd(3,5),accelPerHour:0,cInt:0},ctx:'Admissão há 20 min por dor abdominal.',pdur:20,mech:['nao_hipoxica'],tip:'Com menos de 30 min o padrão sinusoidal ainda é suspeito na FIGO, mas exige avaliação imediata.'})},
 {id:'aumentada',nm:'Variabilidade aumentada (saltatória)',w:2,g:()=>({p:{baseline:rint(135,150),varAmp:rint(28,34),accelPerHour:rint(0,3),cInt:C10(rnd(4,5)),pushing:true,cAmp:65},ctx:pick(EXP),pdur:35,mech:['gradual','subaguda'],tip:'Variabilidade >25 bpm durante mais de 30 min (padrão saltatório) é patológica; pode traduzir hipoxia de evolução rápida no expulsivo.'})},
 {id:'aumentada_curta',nm:'Variabilidade aumentada de curta duração',w:1,g:()=>({p:{baseline:rint(135,150),varAmp:rint(27,32),accelPerHour:rint(2,5),cInt:C10(rnd(3.5,4.5))},ctx:'Fase ativa, 8 cm.',pdur:15,mech:['gradual','sem'],tip:'Variabilidade aumentada há menos de 30 min: suspeito. Reavaliar.'})},
 {id:'materna',nm:'Registo da FC materna',w:2,g:()=>({p:{baseline:150,varAmp:11,accelPerHour:0,cInt:C10(rnd(4,4.8)),cAmp:70,pushing:true,maternal:true,mhrPush:true,mhrBase:rint(95,108)},ctx:'Período expulsivo, obesidade, sonda externa. A enfermeira diz que há acelerações em todas as contrações.',pdur:30,mech:['materno'],tip:'«Acelerações» coincidentes com cada puxo e linha de base perto de 100 bpm: é a FC materna. Confirmar com oxímetro, ecografia ou elétrodo antes de classificar.',maternal:true})},
 {id:'perda_sinal',nm:'Perdas de sinal',w:1,g:()=>({p:{baseline:rint(130,145),varAmp:rint(9,14),accelPerHour:rint(5,9),cInt:C10(rnd(3,4)),loss:3},ctx:'Grávida inquieta, sonda a deslizar.',pdur:40,mech:['sem'],tip:'As falhas de registo não alteram a classificação quando os segmentos visíveis são normais; reposicionar a sonda ou considerar elétrodo.'})},
];

/* ----- verdade a partir dos dados ----- */
const GUIDE={figo:'FIGO 2015',acog:'ACOG 2025',nice:'NICE NG229'};
const CLS_OPTS={figo:FIGO4,acog:{I:'Categoria I',II:'Categoria II',III:'Categoria III',X:'Não interpretável'},nice:{N:'Normal',S:'Suspeito',P:'Patológico',X:'Não interpretável'}};
const NICE_COL={w:'#8A99A8',a:'#C27A12',r:'#C23B32'},NICE_LAB={w:'branco',a:'âmbar',r:'vermelho'};
Object.assign(D,{guide:(()=>{try{return JSON.parse(localStorage.getItem('ctg-guide')||'null')}catch(_){return null}})()||'figo',mode:'livre',exam:null});

function drillTruth(e,g){
  const T=e.t,W0=T-1800,p=e.p;
  const decs=e.dlog.filter(d=>d.cs>=W0&&d.s<=T);
  const nC=e.contrIn(W0,T),per10=nC/3;
  const cnt={precoce:0,variavel:0,tardia:0};decs.forEach(d=>cnt[d.type]++);
  const pros=e.proLog.map(x=>({s:x.s,e:x.e==null?T:x.e})).filter(x=>x.e>W0).map(x=>({...x,dur:(x.e-x.s)/60,ongoing:x.e===T}));
  const maxPro=pros.length?Math.max(...pros.map(x=>x.dur)):0;
  const types=[];if(cnt.precoce)types.push('precoces');if(cnt.variavel)types.push('variaveis');if(cnt.tardia)types.push('tardias');if(maxPro>=3)types.push('prolongada');if(!types.length)types.push('ausentes');
  const b=g.p.baseline,va=g.p.varAmp,cat=g.p.sinus?'sinusoidal':va<5?'reduzida':va>25?'aumentada':'normal';
  const accs=g.maternal?[]:e.alog.filter(a=>a.s>W0&&a.s+a.d<=T&&a.a>=15);
  const lateRatio=nC?cnt.tardia/nC:0,varRatio=nC?cnt.variavel/nC:0,pd=g.pdur;
  // FIGO 2015
  let figo='N';const why=[];
  if(g.maternal){figo='X';why.push('o sinal registado é a FC materna; não pode ser classificado')}
  else{
    const P=[],S=[];
    if(b<100)P.push('linha de base <100 bpm');else if(b<110)S.push('linha de base 100–109 bpm');else if(b>160)S.push('linha de base >160 bpm');
    if(cat==='sinusoidal')(pd>=30?P:S).push(`padrão sinusoidal há ${pd} min (${pd>=30?'>':'<'}30 min)`);
    if(cat==='reduzida')(pd>=50?P:S).push(`variabilidade reduzida há ${pd} min (${pd>=50?'>':'<'}50 min)`);
    if(cat==='aumentada')(pd>=30?P:S).push(`variabilidade aumentada há ${pd} min (${pd>=30?'>':'<'}30 min)`);
    if(maxPro>5)P.push(`desaceleração prolongada de ${num(maxPro,1)} min (>5 min)`);else if(maxPro>=3)S.push(`desaceleração prolongada de ${num(maxPro,1)} min (3–5 min)`);
    if(lateRatio>.5&&(pd>=30||(cat==='reduzida'&&pd>=20)))P.push(`desacelerações tardias repetitivas há ${pd} min`);
    else if(cnt.tardia)S.push(lateRatio>.5?`desacelerações tardias repetitivas há só ${pd} min`:'desacelerações tardias ocasionais');
    if(varRatio>.5)S.push('desacelerações variáveis repetitivas');
    figo=P.length?'P':S.length?'S':'N';why.push(...(P.length?P:S));
  }
  // ACOG 2025 (CPG n.º 10)
  const acog={cls:'I',why:[],hr:[]};
  const varA=g.p.sinus?'sinusoidal':va<1.5?'ausente':va<5?'mínima':va>25?'marcada':'moderada';
  const recLate=lateRatio>=.5,recVar=varRatio>=.5;
  if(g.maternal){acog.cls='X';acog.why.push('sinal materno')}
  else{
    if(g.p.sinus){acog.cls='III';acog.why.push('padrão sinusoidal')}
    else if(varA==='ausente'&&(recLate||recVar||b<110)){acog.cls='III';acog.why.push('variabilidade ausente com '+[recLate&&'tardias recorrentes',recVar&&'variáveis recorrentes',b<110&&'bradicardia'].filter(Boolean).join(', '))}
    else if(b>=110&&b<=160&&varA==='moderada'&&!cnt.tardia&&!cnt.variavel&&maxPro<2){acog.cls='I';acog.why.push('linha de base 110–160, variabilidade moderada, sem tardias nem variáveis')}
    else{acog.cls='II';
      if(b<110)acog.why.push('bradicardia sem variabilidade ausente');if(b>160)acog.why.push('taquicardia');
      if(varA!=='moderada')acog.why.push('variabilidade '+varA);
      if(cnt.variavel)acog.why.push(recVar?'variáveis recorrentes':'desacelerações variáveis');
      if(cnt.tardia)acog.why.push(recLate?'tardias recorrentes':'desacelerações tardias');
      if(maxPro>=2)acog.why.push(`desaceleração prolongada de ${num(maxPro,1)} min (2 a <10 min)`);
      if(varA==='ausente')acog.hr.push('variabilidade ausente');
      if(varA==='mínima'&&pd>=50)acog.hr.push('variabilidade mínima prolongada sem explicação');
      if(b>160)acog.hr.push('passagem para taquicardia');
      if(recLate)acog.hr.push('tardias recorrentes');if(recVar)acog.hr.push('variáveis recorrentes');
      if(pros.length>1)acog.hr.push('mais de uma desaceleração prolongada');
    }
  }
  // NICE NG229 (atualizada em novembro de 2025)
  const nice={cls:'N',feats:[]};
  if(g.maternal){nice.cls='X'}
  else{
    const hyper=(g.p.tone||10)>=25||!!(g.pro&&g.pro.tone);
    nice.feats.push(['Contrações',per10>=5||hyper?'a':'w',hyper?'hipertonia':per10>=5?`${num(per10,1)} por 10 min (5 ou mais)`:`${num(per10,1)} por 10 min (menos de 5)`]);
    nice.feats.push(['Linha de base',b<100||b>160?'r':b<110?'a':'w',b<100?'abaixo de 100 bpm':b>160?'acima de 160 bpm':b<110?'100–109 bpm':'110–160 bpm']);
    let vc='w',vt='5–25 bpm';
    if(cat==='sinusoidal'){vc='r';vt='padrão sinusoidal'}
    else if(cat==='reduzida'){vc=pd>50?'r':pd>=30?'a':'w';vt=`<5 bpm há ${pd} min`+(pd<30?' (abaixo do limiar de 30 min)':'')}
    else if(cat==='aumentada'){vc=pd>10?'r':'a';vt=`>25 bpm há ${pd} min`}
    nice.feats.push(['Variabilidade',vc,vt]);
    const concern=decs.some(d=>d.type==='variavel'&&d.dur>60)||cat==='reduzida';
    let dc='w',dt='sem desacelerações preocupantes';
    if(cnt.tardia){dc='r';dt='desacelerações tardias (vermelho independentemente da duração)'}
    else if(maxPro>=3){dc='r';dt=`desaceleração prolongada de ${num(maxPro,1)} min (3 min ou mais)`}
    else if(cnt.variavel&&concern){if(varRatio>.5){dc=pd>30?'r':'a';dt=`variáveis repetitivas com características preocupantes há ${pd} min`}else{dc=pd>30?'a':'w';dt='variáveis não repetitivas com características preocupantes'}}
    else if(cnt.variavel)dt='variáveis sem características preocupantes';
    else if(cnt.precoce)dt='desacelerações precoces';
    nice.feats.push(['Desacelerações',dc,dt]);
    const nr=nice.feats.filter(f=>f[1]==='r').length,na=nice.feats.filter(f=>f[1]==='a').length;
    nice.cls=nr||na>=2?'P':na===1?'S':'N';
  }
  // amplitude medida em segmentos de 1 min sem eventos
  const busy=t=>decs.some(d=>t>=d.s-10&&t<=d.e+10)||e.alog.some(a=>t>=a.s-5&&t<=a.s+a.d+5)||pros.some(x=>t>=x.s-20&&t<=x.e+60);
  const segs=[];for(let s=W0;s+60<=T;s+=60){if(busy(s)||busy(s+30)||busy(s+60))continue;let mn=999,mx=-1,okc=0;for(let t=s;t<s+60;t+=DT){const v=e.F[Math.round(t/DT)];if(v===v){mn=Math.min(mn,v);mx=Math.max(mx,v);okc++}}if(okc>80)segs.push({s,e:s+60,min:mn,max:mx,bw:mx-mn})}
  segs.sort((a,b)=>a.bw-b.bw);const vseg=segs.length?segs[Math.floor(segs.length/2)]:null;
  const c10=e.contrIn(T-600,T);
  const cls={figo,acog:acog.cls,nice:nice.cls};
  return{base:b<100?'lt100':b<110?'b100':b>160?'gt160':'normal',baseVal:g.maternal?Math.round(p.mhrBase):b,var:cat,acc:accs.length?'1':'0',accN:accs.length,accs,dec:types,cnt,nC,per10,c10,cont:per10>5?'taqui':'ok',figo,why,acog,nice,cls,mech:g.mech,maxPro,pros,decs,vseg,lateRatio,varRatio};
}

/* ----- geração (reprodutível com semente) ----- */
function genTrace(rec,seed){
  RNG=seed!=null?mulberry(seed):Math.random;
  const g=rec.g();const e=new Engine({cycling:false,cDur:75,cAmp:50,tone:10,ramp:60,varRamp:60,toneRamp:60,mhrBase:88,loss:g.maternal?0:.6,...g.p},Math.floor(RNG()*1e9));
  if(g.pro){const total=45*60,startAt=total-g.pro.at*60;e.run(startAt);if(g.pro.tone)e.set({tone:g.pro.tone,cDur:110});e.startPro({drop:g.pro.drop,fall:40,vf:.9,vfLate:g.pro.vfLate??.6,recDur:60});if(g.pro.rec)e.at(g.pro.dur*60-60,en=>en.recover(0));e.run(total-startAt)}
  else e.run(45*60);
  RNG=Math.random;
  return{e,g,rec,truth:drillTruth(e,g)};
}
function pickRecipe(){
  const pool=RECIPES.filter(r=>!D.last.includes(r.id));const tot=pool.reduce((s,r)=>s+r.w,0);let x=Math.random()*tot;
  for(const r of pool){x-=r.w;if(x<=0)return r}return pool[0];
}

/* ----- formulário ----- */
function formHTML(examLabel){
  const G=D.guide;
  return`${examLabel||'<h3 style="margin:0">Classifique os últimos 30 min</h3>'}
   <div class="rf" data-f="base"><h4>Linha de base</h4><div class="opts2">${radios('xBase',BASE_L)}</div></div>
   <div class="rf" data-f="var"><h4>Variabilidade</h4><div class="opts2">${radios('xVar',VAR_L)}</div></div>
   <div class="rf" data-f="acc"><h4>Acelerações</h4><div class="opts2">${radios('xAcc',{1:'Presentes',0:'Ausentes'})}</div></div>
   <div class="rf" data-f="dec"><h4>Desacelerações <span class="small">(pode escolher várias)</span></h4><div class="opts2">${radios('xDec',DEC_L,'checkbox')}</div></div>
   <div class="rf" data-f="cont"><h4>Contrações</h4><div class="opts2">${radios('xCont',CONT_L)}</div></div>
   <div class="rf" data-f="figo"><h4>Classificação ${GUIDE[G]}</h4><div class="opts2">${radios('xFigo',CLS_OPTS[G])}</div></div>
   <div class="rf" data-f="mech"><h4>Interpretação fisiológica</h4><div class="opts2">${radios('xMech',MECH_L)}</div></div>`;
}
function readForm(){
  const g=n=>{const x=document.querySelector(`input[name=${n}]:checked`);return x?x.value:null};
  const a={base:g('xBase'),var:g('xVar'),acc:g('xAcc'),dec:[...document.querySelectorAll('input[name=xDec]:checked')].map(x=>x.value),cont:g('xCont'),figo:g('xFigo'),mech:g('xMech')};
  return(!a.base||!a.var||!a.acc||!a.dec.length||!a.cont||!a.figo||!a.mech)?null:a;
}
function evalAns(cur,a,guide){
  const t=cur.truth,mat=!!cur.g.maternal;
  const res={base:mat||a.base===t.base,var:mat||a.var===t.var,acc:mat||a.acc===t.acc,dec:mat||(a.dec.length===t.dec.length&&a.dec.every(x=>t.dec.includes(x))),cont:a.cont===t.cont,figo:a.figo===t.cls[guide],mech:t.mech.includes(a.mech)};
  return{res,ok:Object.values(res).filter(Boolean).length};
}
function markForm(cur,a,res,guide){
  const t=cur.truth,mat=!!cur.g.maternal;
  const truthVals={base:[t.base],var:[t.var],acc:[t.acc],dec:t.dec,cont:[t.cont],figo:[t.cls[guide]],mech:t.mech};
  const names={base:'xBase',var:'xVar',acc:'xAcc',dec:'xDec',cont:'xCont',figo:'xFigo',mech:'xMech'};
  for(const f in names){const box=document.querySelector(`#dForm .rf[data-f=${f}]`);if(!box)continue;box.classList.add('res',res[f]?'fok':'fko');
    box.querySelectorAll('input').forEach(i=>{i.disabled=true;const l=i.closest('label');
      if(f==='dec')i.checked=a.dec.includes(i.value);else i.checked=a[f]===i.value;
      if(truthVals[f].includes(i.value)&&!(mat&&['base','var','acc','dec'].includes(f)))l.classList.add('right');else if(i.checked)l.classList.add('wrong')})}
}
function guideBar(){
  return`<div class="gbar"><span class="small">Classificar segundo</span><div class="seg" id="xGuide">${Object.entries(GUIDE).map(([k,l])=>`<button data-g="${k}" class="${k===D.guide?'on':''}">${l}</button>`).join('')}</div></div>`;
}

/* ----- treino livre ----- */
function newDrill(){
  if(D.mode!=='livre')return renderExamHome();
  const rec=pickRecipe();D.last=[rec.id,...D.last].slice(0,6);
  D.cur=genTrace(rec);D.done=false;D.ans=null;
  $('dTitle').textContent=`Traçado ${D.n+1}`;$('dCtx').textContent=D.cur.g.ctx+` Padrão semelhante há ${D.cur.g.pdur} min.`;
  $('dExpl').classList.remove('on');$('dExpl').innerHTML='';$('dLayers').style.display='none';
  $('dForm').innerHTML=guideBar()+formHTML()+`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="xCheck">Corrigir</button><button class="btn" id="xNext">Novo traçado</button></div><div class="small" id="xMsg" style="color:var(--bad)"></div>`;
  bindGuide(()=>{if(!D.done)$('dForm').querySelector('.rf[data-f=figo]').outerHTML=formHTML().match(/<div class="rf" data-f="figo">[\s\S]*?<\/div><\/div>/)[0]});
  $('xCheck').onclick=checkDrill;$('xNext').onclick=newDrill;
  drawDrill();
}
function bindGuide(after){$('xGuide').onclick=e=>{const b=e.target.closest('button');if(!b||D.done)return;D.guide=b.dataset.g;store('ctg-guide',D.guide);document.querySelectorAll('#xGuide button').forEach(x=>x.classList.toggle('on',x===b));after&&after()}}
function annotFor(cur){
  const t=cur.truth,e=cur.e;
  const LAB={precoce:'Precoce',variavel:'Variável',tardia:'Tardia'},CLS={precoce:'precoces',variavel:'variaveis',tardia:'tardias'};
  const decels=t.decs.map(d=>({s:d.s,e:d.e,cls:CLS[d.type],lab:LAB[d.type],cp:d.cp,nadir:d.nadir,depth:d.depth,ca:d.ca}));
  t.pros.forEach(x=>decels.push({s:x.s,e:x.e,cls:'prolongada',lab:`Prolongada ${num(x.dur,1)} min`}));
  return{layers:D.layers,sinus:t.var==='sinusoidal',base:t.baseVal,vseg:t.var==='sinusoidal'||cur.g.maternal?null:t.vseg,accs:t.accs,decels,contr:e.clog,tone:e.p.tone};
}
function drawDrill(){if(!D.cur)return;const e=D.cur.e;drawCTG($('cvD'),e,{tEnd:e.t,win:1800,tZero:e.t-1800,annot:D.done?annotFor(D.cur):null})}
function checkDrill(){
  if(D.done)return;const a=readForm();if(!a){$('xMsg').textContent='Responda a todos os campos.';return}
  const {res,ok}=evalAns(D.cur,a,D.guide);markForm(D.cur,a,res,D.guide);
  D.done=true;D.n++;D.tot+=7;D.ok+=ok;D.streak=res.figo?D.streak+1:0;
  $('dN').textContent=D.n;$('dPct').textContent=Math.round(D.ok/D.tot*100)+'%';$('dStreak').textContent=D.streak;$('xMsg').textContent='';
  renderExpl(D.cur,a,res,D.guide);$('dLayers').style.display='';syncLayers();drawDrill();
  $('dExpl').scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* ----- explicação ----- */
function compareHTML(t){
  const A=t.acog,N=t.nice,O=CLS_OPTS;
  const sel=g=>g===D.guide?' class="selg"':'';
  return`<h4 class="eg">O mesmo traçado nas três diretrizes</h4><table class="cmp"><tbody>
   <tr${sel('figo')}><th>FIGO 2015</th><td><b>${O.figo[t.figo]}</b></td><td>${t.why.length?esc(t.why.join('; ')):'todos os parâmetros normais'}</td></tr>
   <tr${sel('acog')}><th>ACOG 2025</th><td><b>${O.acog[A.cls]}</b></td><td>${esc(A.why.join('; '))}${A.hr.length?`<div class="hr">Características de alto risco na categoria II: ${esc(A.hr.join(', '))}</div>`:''}</td></tr>
   <tr${sel('nice')}><th>NICE NG229</th><td><b>${O.nice[N.cls]}</b></td><td>${N.feats.length?N.feats.map(f=>`<span class="nf" style="border-color:${NICE_COL[f[1]]}"><i style="background:${NICE_COL[f[1]]}"></i>${f[0]}: ${esc(f[2])} (${NICE_LAB[f[1]]})</span>`).join(''):'sinal materno'}${N.feats.length?`<div class="small" style="margin-top:4px">Normal: todos brancos · Suspeito: 1 âmbar · Patológico: 1 vermelho ou 2 âmbar.</div>`:''}</td></tr>
  </tbody></table>${(t.figo!=='X'&&new Set([t.figo,{I:'N',II:'S',III:'P'}[A.cls],N.cls]).size>1)?'<p class="small" style="margin:6px 0 0">As diretrizes não coincidem neste traçado: compare os critérios acima. A categoria II da ACOG abrange quase tudo o que não é normal nem claramente anormal.</p>':''}`;
}
function renderExpl(cur,a,res,guide,target){
  const t=cur.truth,g=cur.g,mat=!!g.maternal,box=target||$('dExpl');
  const sw=c=>`<i class="sw" style="background:${c}"></i>`;
  const decTxt=()=>{const parts=[];const n=t.nC;
    if(t.cnt.precoce)parts.push(`${sw(ANN_COL.precoces)}<b>${t.cnt.precoce} precoce(s)</b>: nadir coincidente com o pico da contração (linhas tracejadas alinhadas).`);
    if(t.cnt.variavel)parts.push(`${sw(ANN_COL.variaveis)}<b>${t.cnt.variavel} variável(eis)</b> em ${n} contrações (${Math.round(t.varRatio*100)}%): queda abrupta, <30 s até ao nadir, recuperação rápida${t.varRatio>.5?'; <b>repetitivas</b> (>50% das contrações)':'; ocasionais'}.`);
    if(t.cnt.tardia)parts.push(`${sw(ANN_COL.tardias)}<b>${t.cnt.tardia} tardia(s)</b> em ${n} contrações (${Math.round(t.lateRatio*100)}%): descida gradual com o nadir <b>depois</b> do pico da contração (seta no toco)${t.lateRatio>.5?'; <b>repetitivas</b>':''}.`);
    if(t.maxPro>=3)parts.push(`${sw(ANN_COL.prolongada)}<b>Prolongada</b> de ${num(t.maxPro,1)} min${t.pros.some(x=>x.ongoing)?' (ainda em curso)':''}.`);
    if(!parts.length)parts.push('Sem descidas ≥15 bpm durante ≥15 s nesta janela.');return parts.join('<br>')};
  const O=CLS_OPTS[guide],tc=t.cls[guide];
  const clsTxt=guide==='figo'?`<b>${O[tc]}</b>${t.why.length?': '+esc(t.why.join('; '))+'.':': todos os parâmetros normais.'}`:guide==='acog'?`<b>${O[tc]}</b>: ${esc(t.acog.why.join('; '))}.`:`<b>${O[tc]}</b>: ${t.nice.feats.map(f=>f[0].toLowerCase()+' '+NICE_LAB[f[1]]).join(', ')||'sinal materno'}.`;
  const F=[
    ['base','Linha de base',`${sw(ANN_COL.base)}Linha tracejada azul: cerca de <b>${t.baseVal} bpm</b>${mat?' (frequência materna)':''}, medida nos segmentos estáveis sem acelerações nem desacelerações → <b>${BASE_L[t.base]}</b>.`,BASE_L[a.base]],
    ['var','Variabilidade',t.var==='sinusoidal'?'Ondulação regular e suave, sem a irregularidade normal da variabilidade: <b>padrão sinusoidal</b>.':`${sw(ANN_COL.var)}${t.vseg?`Amplitude medida num minuto típico entre eventos (parênteses verdes): <b>${Math.round(t.vseg.bw)} bpm</b>`:'Quase sem segmentos livres de desacelerações para medir'} → <b>${VAR_L[t.var]}</b>.`,VAR_L[a.var]],
    ['acc','Acelerações',t.accN?`${sw(ANN_COL.acc)}<b>${t.accN} aceleração(ões)</b> ≥15 bpm durante ≥15 s (marcadas com A).`:'Nenhuma subida ≥15 bpm durante ≥15 s nesta janela.',a.acc==='1'?'Presentes':'Ausentes'],
    ['dec','Desacelerações',decTxt(),a.dec.map(x=>DEC_L[x]).join(', ')],
    ['cont','Contrações',`${sw(ANN_COL.cont)}${t.nC} contrações em 30 min = <b>${num(t.per10,1)} por 10 min</b> em média (${t.c10} nos últimos 10 min, numeradas) → <b>${CONT_L[t.cont]}</b>.`,CONT_L[a.cont]],
    ['figo','Classificação '+GUIDE[guide],clsTxt,O[a.figo]||a.figo],
    ['mech','Interpretação fisiológica',`<b>${t.mech.map(m=>MECH_L[m]).join(' ou ')}</b>. ${esc(g.tip)}`,MECH_L[a.mech]],
  ];
  const hint={
    base:a.base!==t.base?(t.dec[0]!=='ausentes'?' Para a linha de base, ignore as desacelerações e as acelerações: use os segmentos estáveis entre elas.':' Use a média dos segmentos estáveis ao longo de pelo menos 2 min.'):'',
    var:a.var!==t.var?(t.var==='sinusoidal'?' A variabilidade normal é irregular; aqui a oscilação é demasiado regular.':a.var==='reduzida'&&t.var==='normal'?' Meça a amplitude entre o ponto mais alto e o mais baixo de um minuto, fora das desacelerações.':a.var==='normal'&&t.var==='reduzida'?' A banda de oscilação é estreita: menos de 5 bpm entre o máximo e o mínimo.':' Compare com a grelha: cada linha horizontal corresponde a 10 bpm.'):'',
    acc:a.acc!==t.acc?(t.acc==='1'?' Procure as subidas marcadas com A: ≥15 bpm acima da linha de base durante ≥15 s.':' As subidas visíveis são oscilações da variabilidade, recuperações após desacelerações ou não atingem 15 bpm durante 15 s.'):'',
    dec:(()=>{const miss=t.dec.filter(x=>!a.dec.includes(x)),extra=a.dec.filter(x=>!t.dec.includes(x));return(miss.length?' <b>Faltou:</b> '+miss.map(x=>DEC_L[x]).join(', ')+'.':'')+(extra.length?' <b>A mais:</b> '+extra.map(x=>DEC_L[x]).join(', ')+'.':'')})(),
    cont:a.cont!==t.cont?' Conte as contrações em 10 min e faça a média dos últimos 30 min; mais de 5 é taquissistolia.':'',
    figo:a.figo!==tc?(guide==='figo'?(tc==='P'?' Basta um critério patológico para classificar como patológico.':tc==='S'?' Falta pelo menos uma característica de normalidade, sem critérios de patológico.':tc==='N'?' Todos os parâmetros cumprem os critérios de normalidade.':' Enquanto o sinal for materno, o traçado não é interpretável.'):guide==='acog'?(tc==='I'?' A categoria I exige linha de base 110–160, variabilidade moderada e ausência de tardias e variáveis.':tc==='III'?' A categoria III exige variabilidade ausente com tardias recorrentes, variáveis recorrentes ou bradicardia, ou padrão sinusoidal.':tc==='II'?' Tudo o que não é categoria I nem III é categoria II.':' Enquanto o sinal for materno, o traçado não é interpretável.'):(tc==='P'?' Na NICE basta um parâmetro vermelho ou dois âmbar.':tc==='S'?' Na NICE, um único parâmetro âmbar torna o traçado suspeito.':tc==='N'?' Todos os quatro parâmetros estão no branco.':' Enquanto o sinal for materno, o traçado não é interpretável.')):'',
    mech:''};
  F.forEach(f=>{if(!res[f[0]]&&hint[f[0]])f[2]+='<div class="hint">'+hint[f[0]]+'</div>'});
  if(mat)F[0][2]+=' Linha de base, variabilidade, acelerações e desacelerações não se avaliam enquanto o sinal for materno.';
  const wrong=F.filter(f=>!res[f[0]]),right=F.filter(f=>res[f[0]]);
  const item=(f,bad)=>`<div class="ex ${bad?'bad':'good'}" data-l="${f[0]}"><div class="eh"><span class="${bad?'ko':'ok'}">${bad?'✗':'✓'}</span><b>${f[1]}</b>${bad?`<span class="ya">A sua resposta: ${esc(f[3])}</span>`:''}</div><div>${f[2]}</div></div>`;
  box.innerHTML=`<div class="esum"><b>${right.length}/7 corretos</b> · ${esc(cur.rec.nm)}${wrong.length?` · reveja: ${wrong.map(f=>f[1]).join(', ')}`:' · sem erros'}</div>`+
    (wrong.length?`<h4 class="eg">O que falhou</h4>${wrong.map(f=>item(f,true)).join('')}`:'')+compareHTML(t)+
    (right.length?`<h4 class="eg">Correto</h4>${right.map(f=>item(f,false)).join('')}`:'');
  box.classList.add('on');
  document.querySelectorAll('#dLayers button[data-l]').forEach(b=>b.classList.toggle('err',!res[b.dataset.l]));
  box.querySelectorAll('.ex').forEach(x=>{const l=x.dataset.l;if(!['base','var','acc','dec','cont'].includes(l))return;x.classList.add('link');x.onclick=()=>{D.layers={base:false,var:false,acc:false,dec:false,cont:false,[l]:true};syncLayers();drawDrill();$('cvD').scrollIntoView({behavior:'smooth',block:'center'})}});
}
function syncLayers(){document.querySelectorAll('#dLayers button[data-l]').forEach(b=>b.classList.toggle('on',!!D.layers[b.dataset.l]))}
$('dLayers').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.all){D.layers={base:true,var:true,acc:true,dec:true,cont:true}}else D.layers[b.dataset.l]=!D.layers[b.dataset.l];syncLayers();drawDrill()};

/* ----- modo exame ----- */
const EXAM_SETS={A:1101,B:2207,C:3313};const EXAM_N=15;
function examItems(set){
  const r=mulberry(EXAM_SETS[set]);const ids=RECIPES.map(x=>x.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  return ids.slice(0,EXAM_N).map((id,i)=>({id,seed:EXAM_SETS[set]*100+i}));
}
function setDrillMode(m){D.mode=m;document.querySelectorAll('#dMode button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));$('dStatsLivre').style.display=m==='livre'?'':'none';if(m==='livre'){D.exam=null;newDrill()}else renderExamHome()}
function renderExamHome(){
  if(typeof LV!=='undefined'&&LV.role==='aluno'){$('dForm').innerHTML='<p>Exame terminado. Pode fechar esta página.</p>';return}
  D.cur=null;D.done=false;const {c,W,H}=fitCanvas($('cvD'));c.fillStyle='#FFF8F4';c.fillRect(0,0,W,H);c.fillStyle='#7A5A50';c.font='15px "Geist",sans-serif';c.textAlign='center';c.fillText('O traçado aparece quando iniciar o exame.',W/2,H/2);
  $('dLayers').style.display='none';$('dExpl').classList.remove('on');
  $('dTitle').textContent='Modo exame';$('dCtx').textContent=`${EXAM_N} traçados, sem correção até ao fim. Os conjuntos são fixos: todas as pessoas que fizerem o mesmo conjunto veem exatamente os mesmos traçados.`;
  const hist=(store('ctg-exam')||[]).slice(-5).reverse();
  $('dForm').innerHTML=`<h3 style="margin:0">Configurar exame</h3>
    <div class="rf"><h4>Conjunto</h4><div class="opts2">${Object.keys(EXAM_SETS).map((k,i)=>`<label class="o"><input type="radio" name="eSet" value="${k}" ${i===0?'checked':''}> Conjunto ${k}</label>`).join('')}</div></div>
    <div class="rf"><h4>Diretriz de classificação</h4>${guideBar()}</div>
    <p class="small">Responde aos mesmos 7 campos do treino. O tempo é registado. No fim vê a pontuação por campo e pode rever cada traçado anotado.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="eStart">Iniciar exame neste ecrã</button><button class="btn" id="eLive">Exame em sala com QR code</button></div>
    <p class="small">Exame em sala: os formandos leem um QR code e fazem o exame no telemóvel; este ecrã mostra os participantes, os resultados da turma e a correção traçado a traçado.</p>
    ${hist.length?`<h4 class="eg">Últimos exames neste browser</h4>${hist.map(h=>`<div class="small">${new Date(h.d).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'})} · Conjunto ${h.set} · ${GUIDE[h.guide]} · <b>${h.pct}%</b> · ${fmt(h.secs)}</div>`).join('')}`:''}`;
  bindGuide();
  $('eLive').onclick=()=>{const set=document.querySelector('input[name=eSet]:checked').value;liveStart(set,D.guide)};
  $('eStart').onclick=()=>{const set=document.querySelector('input[name=eSet]:checked').value;D.exam={set,guide:D.guide,items:examItems(set),i:0,ans:[],t0:Date.now()};examShow()};
}
function examShow(){
  const X=D.exam,it=X.items[X.i],rec=RECIPES.find(r=>r.id===it.id);
  D.cur=genTrace(rec,it.seed);D.done=false;
  $('dTitle').textContent=`Exame · Conjunto ${X.set} · ${X.i+1} de ${X.items.length}`;$('dCtx').textContent=D.cur.g.ctx+` Padrão semelhante há ${D.cur.g.pdur} min.`;
  $('dExpl').classList.remove('on');$('dLayers').style.display='none';
  $('dForm').innerHTML=formHTML(`<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Traçado ${X.i+1}/${X.items.length}</h3><span class="mono small" id="eTime"></span></div><div class="ebar"><div style="width:${X.i/X.items.length*100}%"></div></div>`)+
    `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="eNext">${X.i+1<X.items.length?'Seguinte':'Terminar exame'}</button><button class="btn" id="eQuit">Abandonar</button></div><div class="small" id="xMsg" style="color:var(--bad)"></div>`;
  $('eNext').onclick=()=>{const a=readForm();if(!a){$('xMsg').textContent='Responda a todos os campos.';return}X.ans[X.i]=a;X.i++;if(D.onAnswer)D.onAnswer(X);if(X.i<X.items.length)examShow();else examEnd()};
  $('eQuit').onclick=()=>{D.exam=null;renderExamHome()};
  drawDrill();window.scrollTo({top:0});
}
function examEnd(){
  const X=D.exam;X.secs=Math.round((Date.now()-X.t0)/1000);
  X.curs=X.items.map(it=>genTrace(RECIPES.find(r=>r.id===it.id),it.seed));
  X.evals=X.curs.map((c,i)=>evalAns(c,X.ans[i],X.guide));
  const fields=['base','var','acc','dec','cont','figo','mech'],FL={base:'Linha de base',var:'Variabilidade',acc:'Acelerações',dec:'Desacelerações',cont:'Contrações',figo:'Classificação',mech:'Interpretação'};
  const per=Object.fromEntries(fields.map(f=>[f,X.evals.filter(v=>v.res[f]).length]));
  const tot=X.evals.reduce((s,v)=>s+v.ok,0),pct=Math.round(tot/(X.items.length*7)*100),clsPct=Math.round(per.figo/X.items.length*100);
  if(D.onEnd)D.onEnd(X);
  const h=store('ctg-exam')||[];h.push({d:new Date().toISOString(),set:X.set,guide:X.guide,pct,cls:clsPct,secs:X.secs});store('ctg-exam',h.slice(-100));
  $('dTitle').textContent=`Resultado do exame · Conjunto ${X.set}`;$('dCtx').textContent=`${GUIDE[X.guide]} · ${X.items.length} traçados · tempo ${fmt(X.secs)}`;
  $('dForm').innerHTML=`<h3 style="margin:0">Resultado</h3><div class="score" style="margin:0;text-align:left"><div class="n">${pct}%</div><div class="l">${tot} de ${X.items.length*7} campos corretos · classificação certa em ${per.figo}/${X.items.length}</div></div>
    <div>${fields.map(f=>`<div class="fbar"><span>${FL[f]}</span><div class="tr"><div style="width:${per[f]/X.items.length*100}%;background:${per[f]/X.items.length>=.8?'var(--ok)':per[f]/X.items.length>=.6?'var(--warn)':'var(--bad)'}"></div></div><span class="mono">${per[f]}/${X.items.length}</span></div>`).join('')}</div>
    <h4 class="eg">Rever traçados</h4><div class="eitems">${X.curs.map((c,i)=>`<button data-i="${i}" class="${X.evals[i].res.figo?'okb':'kob'}" title="${esc(c.rec.nm)}">${i+1}<small>${X.evals[i].ok}/7</small></button>`).join('')}</div>
    <p class="small">Verde: classificação correta. Clique num número para ver o traçado anotado e a explicação.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="eAgain">Novo exame</button><button class="btn" id="eCopy">Copiar resumo</button></div><div class="small" id="eMsg"></div>`;
  const weak=fields.filter(f=>per[f]/X.items.length<.7).map(f=>FL[f].toLowerCase());
  $('dExpl').innerHTML=`<div class="esum"><b>${pct}%</b> no conjunto ${X.set} (${GUIDE[X.guide]}). ${weak.length?'Pontos a trabalhar: '+weak.join(', ')+'.':'Sem pontos fracos abaixo de 70%.'} Escolha um traçado à direita para rever.</div>`;$('dExpl').classList.add('on');
  $('dForm').querySelector('.eitems').onclick=e=>{const b=e.target.closest('button');if(!b)return;examReview(+b.dataset.i)};
  $('eAgain').onclick=renderExamHome;
  $('eCopy').onclick=async()=>{const txt=`Exame CTG · Conjunto ${X.set} · ${GUIDE[X.guide]}\nResultado: ${pct}% (${tot}/${X.items.length*7}) · classificação ${per.figo}/${X.items.length} · tempo ${fmt(X.secs)}\n`+fields.map(f=>`${FL[f]}: ${per[f]}/${X.items.length}`).join('\n');try{await navigator.clipboard.writeText(txt);$('eMsg').textContent='Resumo copiado.'}catch(_){$('eMsg').textContent='Não foi possível copiar; selecione o texto do resultado manualmente.'}};
  examReview(X.evals.findIndex(v=>!v.res.figo)>=0?X.evals.findIndex(v=>!v.res.figo):0);
}
function examReview(i){
  const X=D.exam;D.cur=X.curs[i];D.done=true;
  document.querySelectorAll('#dForm .eitems button').forEach((b,k)=>b.classList.toggle('cur',k===i));
  $('dTitle').textContent=`Exame · traçado ${i+1} de ${X.items.length}`;$('dCtx').textContent=D.cur.g.ctx+` Padrão semelhante há ${D.cur.g.pdur} min.`;
  D.layers={base:true,var:true,acc:true,dec:true,cont:true};
  const holder=document.createElement('div');renderExpl(D.cur,X.ans[i],X.evals[i].res,X.guide,holder);
  $('dExpl').innerHTML=`<div class="esum">Resultado global do exame à direita.</div>`+holder.innerHTML;$('dExpl').classList.add('on');
  $('dExpl').querySelectorAll('.ex').forEach(x=>{const l=x.dataset.l;if(!['base','var','acc','dec','cont'].includes(l))return;x.classList.add('link');x.onclick=()=>{D.layers={base:false,var:false,acc:false,dec:false,cont:false,[l]:true};syncLayers();drawDrill();$('cvD').scrollIntoView({behavior:'smooth',block:'center'})}});
  $('dLayers').style.display='';document.querySelectorAll('#dLayers button[data-l]').forEach(b=>b.classList.toggle('err',!X.evals[i].res[b.dataset.l]));syncLayers();drawDrill();
}
setInterval(()=>{const el=document.getElementById('eTime');if(el&&D.exam&&!D.exam.secs)el.textContent=fmt((Date.now()-D.exam.t0)/1000)},1000);
