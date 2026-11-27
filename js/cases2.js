/* Casos construídos a partir de padrões dos traçados reais da base CTU-UHB (campo ref = registo de origem).
   Nomes, histórias e horas são fictícios; o contexto clínico, a forma do traçado e o desfecho natural seguem o registo real. */
CASES.push(
/* ===================== BÁSICO ===================== */
{
  id:'clara', nome:'Clara Mendes', idade:30, gp:'G2P1', ig:'40+0', dif:'Básico', ref:1053,
  tag:'Multípara, trabalho de parto rápido',
  antecedentes:['Parto eutócico há 3 anos, 3 h de trabalho de parto','Sem doenças conhecidas'],
  gravidez:['Gravidez vigiada, sem intercorrências','Streptococcus do grupo B negativo'],
  admissao:'Chegou com contrações a cada 3 min e 6 cm de dilatação. Membranas íntegras. Recusa analgesia epidural.',
  start:{clock:'03:10',dil:6,station:-1,pos:'OIEA',membr:'íntegras',liquido:'—',analgesia:'nenhuma',oxy:0},
  mat:{fc:84,tas:116,tad:70,temp:36.6,spo2:99},
  fet:{base:141,var:13,accel:6,pH0:7.34,reserve:.95,cord:.05,head:.5,spont:3.6,rate:3.2,pushMins:12,autoPush:2},
  ev:[
    {at:12,fn:s=>s.rupture(true)},
    {at:30,call:'Enf.ª Sofia: «A Sra. Clara está a ficar com vontade de puxar. O CTG está bom, não está?»'},
  ],
  eco:'Apresentação cefálica, FCF 140 bpm, líquido normal.',
  ideal:['Reconhecer um traçado normal: linha de base 140, variabilidade normal, acelerações, sem desacelerações','No expulsivo curto, desacelerações precoces com as contrações são compressão cefálica e não exigem atuação','Não intervir: nada de ocitocina, amniotomia ou métodos adicionais'],
  teach:['A maioria dos partos tem traçados normais: o objetivo é reconhecê-los com confiança e não acrescentar intervenções','Na base CTU-UHB, muitos recém-nascidos de multíparas com expulsivo de 5–10 min nasceram com pH acima de 7,30 e traçados sem desacelerações']
},
{
  id:'mariana', nome:'Mariana Duarte', idade:27, gp:'G1P0', ig:'39+2', dif:'Básico', ref:1279,
  tag:'Nulípara com epidural, fase ativa',
  antecedentes:['Sem antecedentes relevantes'],
  gravidez:['Gravidez vigiada no hospital, ecografias normais','Estimativa de peso fetal 3200 g'],
  admissao:'Trabalho de parto espontâneo. Epidural colocada há 20 min, com boa analgesia. TA estável.',
  start:{clock:'15:40',dil:5,station:-2,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:0},
  mat:{fc:80,tas:112,tad:68,temp:36.8,spo2:99},
  fet:{base:131,var:12,accel:5,pH0:7.33,reserve:.94,cord:.08,head:.4,spont:3,rate:1.6,pushMins:35,autoPush:15},
  ev:[
    {at:35,call:'Enf.ª Diana: «O CTG está igual desde a epidural. Posso passar a vigilância intermitente para a Sra. Mariana ir ao duche?»'},
  ],
  eco:'Apresentação cefálica, FCF 130 bpm.',
  ideal:['Traçado normal com linha de base de 130: valor normal, não é bradicardia','Após uma epidural mantém-se o CTG contínuo, porque a hipotensão pode surgir mais tarde (por exemplo, após reforços)','Manter vigilância e apoiar o trabalho de parto sem intervenções'],
  teach:['Uma linha de base entre 110 e 160 bpm é normal; 130 não é «baixa»','A analgesia do neuroeixo é uma indicação habitual para vigilância contínua durante o resto do trabalho de parto']
},
{
  id:'diana', nome:'Diana Lopes', idade:34, gp:'G2P1', ig:'39+0', dif:'Básico', ref:1260,
  tag:'Diabetes gestacional, feto grande',
  antecedentes:['Parto eutócico de 3900 g há 5 anos'],
  gravidez:['Diabetes gestacional controlada com dieta','Estimativa de peso fetal 3950 g às 38 semanas'],
  admissao:'Indução por diabetes gestacional e feto grande. Ocitocina iniciada há 1 h. Glicemia capilar 98 mg/dL.',
  start:{clock:'10:20',dil:4,station:-2,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'nenhuma',oxy:4},
  mat:{fc:86,tas:118,tad:72,temp:36.7,spo2:99},
  fet:{base:145,var:12,accel:5,pH0:7.33,reserve:.92,cord:.08,head:.35,spont:2.6,rate:2.2,pushMins:15,autoPush:5},
  protocolOxy:true,
  ev:[
    {at:30,msg:['Enf.ª Rute','Glicemia capilar 104 mg/dL. Mantenho a vigilância de hora a hora?']},
    {at:55,call:'Enf.ª Rute: «Aumentei a ocitocina como no protocolo. Pode confirmar se o CTG está bem?»'},
  ],
  eco:'Feto grande, cefálico, FCF 145 bpm, líquido normal.',
  ideal:['Reconhecer o traçado normal e contar as contrações a cada revisão (o protocolo só continua se forem ≤5 em 10 min)','A diabetes gestacional controlada não altera, por si, a interpretação do CTG','Manter vigilância; estar atento a um expulsivo mais longo num feto grande'],
  teach:['A ocitocina por protocolo é segura enquanto o traçado é normal e as contrações não ultrapassam 5 em 10 min','Em diabéticas, a hiperglicemia materna intraparto aumenta o risco de acidemia fetal: o controlo glicémico faz parte da vigilância']
},
{
  id:'sara', nome:'Sara Antunes', idade:23, gp:'G1P0', ig:'40+1', dif:'Básico', ref:1116,
  tag:'Variabilidade reduzida sem fármacos',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez sem intercorrências'],
  admissao:'Fase ativa espontânea, sem analgesia. Diz que o bebé «está mais quieto» desde que chegou.',
  start:{clock:'01:30',dil:4,station:-2,pos:'OIEA',membr:'íntegras',liquido:'—',analgesia:'nenhuma',oxy:0},
  mat:{fc:82,tas:114,tad:70,temp:36.6,spo2:99},
  fet:{base:132,var:12,accel:5,pH0:7.32,reserve:.93,cord:.06,head:.35,spont:2.8,rate:1.4,pushMins:25,autoPush:10},
  ev:[
    {at:.1,fn:s=>{s.e.quietUntil=s.e.t+38*60;s.e.nextQuiet=s.e.quietUntil+75*60}},
    {at:25,call:'Enf.ª Inês: «O traçado da Sra. Sara está muito liso, sem acelerações. Chamo para cesariana?»'},
  ],
  eco:'Feto cefálico, movimentos presentes após estimulação.',
  ideal:['Reconhecer o padrão de sono fetal: variabilidade reduzida durante menos de 40–50 min, sem desacelerações e com linha de base estável','Reavaliar ao fim de 30–40 min ou fazer estimulação digital do escalpe: uma aceleração tranquiliza','Não decidir parto: a variabilidade recupera espontaneamente'],
  teach:['Os ciclos de sono fetal duram até cerca de 40 min (às vezes mais) e alternam com períodos ativos','A FIGO só classifica a variabilidade reduzida como patológica quando dura mais de 50 min sem outra explicação','No registo real que inspirou este caso, a variabilidade de curto prazo subiu de cerca de 1 bpm no início para mais de 5 bpm no fim, e o recém-nascido nasceu com pH 7,24']
},
{
  id:'teresa', nome:'Teresa Gomes', idade:36, gp:'G3P2', ig:'41+0', dif:'Básico', ref:1349,
  tag:'Indução por gravidez de 41 semanas',
  antecedentes:['Dois partos eutócicos'],
  gravidez:['Gravidez vigiada, sem intercorrências','Indução às 41 semanas: dinoprostona ontem à noite'],
  admissao:'Ocitocina a 2 mU/min desde há 30 min. 4 cm de dilatação.',
  start:{clock:'09:00',dil:4,station:-2,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'nenhuma',oxy:2},
  mat:{fc:82,tas:120,tad:74,temp:36.7,spo2:99},
  fet:{base:150,var:12,accel:5,pH0:7.33,reserve:.94,cord:.06,head:.35,spont:2,rate:2.5,pushMins:10,autoPush:3},
  protocolOxy:true,
  ev:[
    {at:40,call:'Enf.ª Carla: «A Sra. Teresa tem agora 4 contrações em 10 min. Continuo a subir a ocitocina?»'},
  ],
  eco:'Feto cefálico, FCF 150 bpm, líquido normal.',
  ideal:['Linha de base de 150 bpm: normal; variabilidade e acelerações presentes','Com 4 contrações em 10 min e traçado normal, não é preciso aumentar mais a ocitocina: o objetivo são 3–4 contrações eficazes','Rever o traçado e as contrações a cada aumento'],
  teach:['A dose de ocitocina deve ser a menor que produz progressão, não a dose máxima do protocolo','Numa multípara, a progressão é rápida: atenção à transição para o expulsivo']
},
{
  id:'luisa', nome:'Luísa Faria', idade:31, gp:'G1P0', ig:'39+6', dif:'Básico', ref:1201,
  tag:'Desacelerações no período expulsivo',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'9 cm, epidural funcionante. Apresentação no plano 0.',
  start:{clock:'20:15',dil:9,station:0,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:0},
  mat:{fc:84,tas:118,tad:70,temp:36.9,spo2:99},
  fet:{base:134,var:12,accel:3,pH0:7.32,reserve:.92,cord:.18,head:.75,spont:3.2,rate:2,pushMins:30,autoPush:5},
  ev:[
    {at:28,call:'Enf.ª Marta: «Com os puxos aparecem desacelerações em todas as contrações. Paro os puxos?»'},
  ],
  eco:'Apresentação cefálica encravada, FCF 134 bpm.',
  ideal:['Distinguir as desacelerações precoces e variáveis curtas do expulsivo (recuperação rápida, linha de base estável, variabilidade mantida) de um padrão de hipoxia','Manter os puxos enquanto a linha de base e a variabilidade se mantêm e o feto passa a maior parte do tempo na linha de base','Rever com frequência: a duração das desacelerações e o tempo na linha de base são o que conta'],
  teach:['Desacelerações no período expulsivo são quase universais; o que importa é a linha de base, a variabilidade e a recuperação entre contrações','No registo real que inspirou este caso houve 18 desacelerações profundas na última hora e meia, e o recém-nascido nasceu com pH 7,29']
},
{
  id:'alice', nome:'Alice Neves', idade:29, gp:'G2P1', ig:'38+3', dif:'Básico', ref:1168,
  tag:'Dor intensa sem analgesia, traçado muito reativo',
  antecedentes:['Parto anterior eutócico'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'Fase ativa, 5 cm. Sem analgesia por opção. Muito ansiosa com a dor.',
  start:{clock:'13:30',dil:5,station:-1,pos:'OIEA',membr:'íntegras',liquido:'—',analgesia:'nenhuma',oxy:0},
  mat:{fc:104,tas:128,tad:80,temp:36.8,spo2:99},
  fet:{base:130,var:14,accel:13,pH0:7.35,reserve:.96,cord:.05,head:.35,spont:3,rate:2.4,pushMins:12,autoPush:3},
  ev:[
    {at:20,call:'Enf.ª Lúcia: «A FCF está muitas vezes acima de 160. Está com taquicardia?»'},
  ],
  eco:'Feto cefálico, muito ativo. FCF basal 130 bpm.',
  ideal:['Distinguir acelerações frequentes e prolongadas de uma taquicardia: a linha de base é medida nos segmentos estáveis entre acelerações (cerca de 130)','Traçado normal e muito reativo: não intervir','Oferecer analgesia e apoio à parturiente'],
  teach:['A linha de base exclui acelerações e desacelerações; com acelerações muito frequentes, use os períodos mais estáveis','Acelerações frequentes são o melhor sinal de um feto bem oxigenado']
},

/* ===================== INTERMÉDIO ===================== */
{
  id:'vera', nome:'Vera Rodrigues', idade:32, gp:'G1P0', ig:'40+4', dif:'Intermédio', ref:1323,
  tag:'Desacelerações variáveis grandes, traçado de resto normal',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada. Líquido amniótico no limite inferior do normal na última ecografia'],
  admissao:'Indução por gravidez de 40+4 semanas. Ocitocina suspensa há 1 h por boa dinâmica. Deitada em decúbito dorsal.',
  start:{clock:'11:50',dil:6,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro, escasso',analgesia:'epidural',oxy:0},
  mat:{fc:82,tas:116,tad:70,temp:36.8,spo2:99},
  fet:{base:127,var:13,accel:4,pH0:7.34,reserve:.94,cord:.6,cordPos:true,head:.3,spont:2.8,rate:1.4,pushMins:25,autoPush:10},
  ev:[
    {at:.1,fn:s=>{s.st.posicao='dorsal'}},
    {at:22,call:'Enf.ª Ana: «A Sra. Vera tem desacelerações enormes, até aos 70, com todas as contrações. Chamo para cesariana?»'},
  ],
  eco:'Feto cefálico, líquido escasso, FCF 127 bpm.',
  ideal:['Classificar as desacelerações como variáveis (descida e subida rápidas, forma em V/U, «ombros»): compressão do cordão','Com linha de base estável, variabilidade normal e boa recuperação, a hipoxia é pouco provável: começar por mudar de posição (decúbito lateral)','Evitar a cesariana: reavaliar após a mudança de posição'],
  teach:['Na base CTU-UHB, 32% dos recém-nascidos sem acidemia tiveram 8 ou mais desacelerações profundas na última hora e meia','A profundidade de uma desaceleração variável diz pouco; a linha de base, a variabilidade e o tempo de recuperação dizem muito mais','No registo real que inspirou este caso houve 27 desacelerações profundas e o pH foi 7,35']
},
{
  id:'paula', nome:'Paula Vieira', idade:29, gp:'G1P0', ig:'41+5', dif:'Intermédio', ref:1028,
  tag:'Pós-termo, mecónio',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada','Indução às 41+5 semanas'],
  admissao:'Amniotomia há 30 min: líquido com mecónio ligeiro. Ocitocina a 4 mU/min.',
  start:{clock:'08:30',dil:5,station:-1,pos:'OIEA',membr:'rotas',liquido:'meconial ligeiro',analgesia:'epidural',oxy:4},
  mat:{fc:84,tas:118,tad:72,temp:36.8,spo2:99},
  fet:{base:149,var:11,accel:3,pH0:7.31,reserve:.86,cord:.28,cordPos:true,head:.35,sens:1.1,spont:2.6,rate:1.4,pushMins:35,autoPush:10},
  protocolOxy:true,
  ev:[
    {at:30,call:'Enf.ª Graça: «O líquido tem mecónio. Isso não é já indicação para cesariana?»'},
    {at:90,call:'Enf.ª Graça: «Aumentei a ocitocina conforme o protocolo. Revemos o CTG?»'},
  ],
  eco:'Feto cefálico, FCF 150 bpm.',
  ideal:['O mecónio isolado não é sinal de hipoxia, sobretudo depois das 41 semanas: interpretar o traçado','Num feto pós-termo, a reserva é menor: manter vigilância apertada e cautela com a ocitocina','Atuar cedo se surgirem desacelerações repetidas com subida da linha de base'],
  teach:['A eliminação de mecónio aumenta com a idade gestacional e, isolada, não indica hipoxia','Mecónio e um traçado anormal juntos aumentam o risco: o limiar para atuar deve ser mais baixo']
},
{
  id:'filipa', nome:'Filipa Cunha', idade:33, gp:'G1P0', ig:'37+4', dif:'Intermédio', ref:1021,
  tag:'Pré-eclâmpsia com sulfato de magnésio',
  antecedentes:['Sem antecedentes'],
  gravidez:['Pré-eclâmpsia diagnosticada às 37 semanas: TA 156/102, proteinúria','Indução após estabilização'],
  admissao:'Labetalol oral. Vai iniciar sulfato de magnésio por cefaleias. Ocitocina a 2 mU/min.',
  start:{clock:'17:20',dil:4,station:-2,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:2},
  mat:{fc:88,tas:148,tad:96,temp:36.8,spo2:98},
  fet:{base:135,var:12,accel:4,pH0:7.31,reserve:.82,cord:.12,head:.3,sens:1.2,spont:2.4,rate:1.6,pushMins:30,autoPush:10},
  protocolOxy:true,
  ev:[
    {at:8,fn:s=>{s.st.varMul=.55;s.st.accMul=.25;s.st.mg=true;s.msg('Enf.ª Rosa','Iniciei sulfato de magnésio: bólus de 4 g e perfusão a 1 g/h, conforme prescrição.')}},
    {at:45,call:'Enf.ª Rosa: «Desde o magnésio, a variabilidade baixou e deixou de haver acelerações. É hipoxia?»'},
  ],
  eco:'Feto cefálico, FCF 135 bpm, Doppler da artéria umbilical normal.',
  ideal:['Relacionar a descida moderada da variabilidade e das acelerações com o sulfato de magnésio, com linha de base estável e sem desacelerações','Não decidir parto por este padrão isolado; manter vigilância e procurar desacelerações ou subida da linha de base','Na pré-eclâmpsia a reserva fetal é menor: atuar cedo se surgirem desacelerações tardias'],
  teach:['O sulfato de magnésio reduz modestamente a variabilidade e as acelerações; uma descida marcada ou desacelerações não devem ser atribuídas ao fármaco','Na base CTU-UHB, os registos com hipertensão ou pré-eclâmpsia concentram vários dos pH mais baixos']
},
{
  id:'carla', nome:'Carla Pinto', idade:26, gp:'G1P0', ig:'40+2', dif:'Intermédio', ref:1350,
  tag:'Febre intraparto, Streptococcus B positivo',
  antecedentes:['Sem antecedentes'],
  gravidez:['Streptococcus do grupo B positivo','Gravidez sem outras intercorrências'],
  admissao:'Rotura de membranas há 14 h. Penicilina iniciada há 2 h. Fase ativa, epidural.',
  start:{clock:'22:00',dil:5,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:0},
  mat:{fc:96,tas:116,tad:70,temp:37.8,spo2:98},
  fet:{base:146,var:11,accel:2,pH0:7.31,reserve:.86,cord:.12,head:.3,spont:3,rate:1.5,pushMins:30,autoPush:10,fever:true},
  ev:[
    {at:25,msg:['Enf.ª Patrícia','Temperatura 38,3 °C. Pulso 108. A Sra. Carla tem calafrios.']},
    {at:60,call:'Enf.ª Patrícia: «A FCF está nos 170. Pode ver o CTG?»'},
  ],
  eco:'FCF 165–170 bpm, sem outras alterações.',
  ideal:['Relacionar a subida da linha de base com a febre materna (inflamação/infeção), não com hipoxia, enquanto não houver desacelerações','Tratar a febre: antipirético, hidratação e antibioterapia de largo espetro por suspeita de corioamnionite; avisar a neonatologia','Ter um limiar mais baixo para atuar: a infeção reduz a tolerância fetal à hipoxia'],
  teach:['A taquicardia fetal precede muitas vezes a febre materna','Infeção e hipoxia juntas causam mais lesão neurológica do que cada uma isolada']
},
{
  id:'rosa', nome:'Rosa Teixeira', idade:38, gp:'G3P2', ig:'39+4', dif:'Intermédio', ref:1287,
  tag:'Taquissistolia espontânea, sem ocitocina',
  antecedentes:['Dois partos eutócicos'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'Trabalho de parto espontâneo, contrações muito frequentes desde casa. Sem ocitocina. 5 cm.',
  start:{clock:'06:45',dil:5,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'nenhuma',oxy:0},
  mat:{fc:90,tas:122,tad:76,temp:36.7,spo2:99},
  fet:{base:142,var:12,accel:3,pH0:7.31,reserve:.8,cord:.12,head:.3,sens:1.3,spont:5.1,rate:2,pushMins:20,autoPush:5},
  on:{terb:s=>{s.cs.fet.spont=Math.max(2.8,s.cs.fet.spont-2.2)}},
  ev:[
    {at:30,call:'Enf.ª Helena: «Não há ocitocina em curso, mas tem contrações quase seguidas. Pode vir ver?»'},
  ],
  eco:'Feto cefálico, FCF 142 bpm.',
  ideal:['Contar as contrações: mais de 5 em 10 min é taquissistolia, mesmo sem ocitocina','Com desacelerações que começam a aparecer: decúbito lateral e tocólise aguda (terbutalina)','Reavaliar: com contrações espaçadas, as desacelerações costumam desaparecer'],
  teach:['A taquissistolia espontânea reduz o tempo de recuperação da oxigenação entre contrações, tal como a iatrogénica','A tocólise aguda é uma medida de reanimação intrauterina eficaz e rápida']
},
{
  id:'isabel', nome:'Isabel Moreira', idade:24, gp:'G1P0', ig:'37+0', dif:'Intermédio', ref:1031,
  tag:'Termo precoce, linha de base alta',
  antecedentes:['Sem antecedentes'],
  gravidez:['Ameaça de parto pré-termo às 32 semanas, com corticoides'],
  admissao:'Trabalho de parto espontâneo às 37+0 semanas. 6 cm, epidural.',
  start:{clock:'04:20',dil:6,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:0},
  mat:{fc:86,tas:114,tad:68,temp:36.9,spo2:99},
  fet:{base:152,var:11,accel:4,pH0:7.32,reserve:.88,cord:.2,cordPos:true,head:.3,spont:3,rate:2,pushMins:15,autoPush:5},
  ev:[
    {at:25,call:'Enf.ª Vânia: «A linha de base está nos 150 e tal. É taquicardia?»'},
  ],
  eco:'Feto cefálico, FCF 152 bpm.',
  ideal:['Linha de base de 150–155 bpm é normal num feto de 37 semanas, sem febre e com variabilidade normal','Interpretar as desacelerações pelo contexto (variáveis, com boa recuperação) e mudar de posição','Não acelerar o parto por este traçado'],
  teach:['A linha de base desce com a idade gestacional; fetos mais novos têm linhas de base mais altas','Taquicardia é uma linha de base acima de 160 bpm durante pelo menos 10 min']
},
{
  id:'nadia', nome:'Nádia Ferreira', idade:35, gp:'G2P1', ig:'41+0', dif:'Intermédio', ref:1064,
  tag:'Diabetes gestacional, expulsivo com desacelerações',
  antecedentes:['Parto eutócico há 2 anos'],
  gravidez:['Diabetes gestacional com insulina','Estimativa de peso fetal 3800 g'],
  admissao:'Dilatação completa. Vai iniciar puxos. Glicemia capilar 110 mg/dL.',
  start:{clock:'18:05',dil:10,station:1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:0},
  mat:{fc:88,tas:120,tad:74,temp:36.9,spo2:99},
  fet:{base:132,var:12,accel:2,pH0:7.3,reserve:.88,cord:.45,head:.5,spont:3.3,rate:2,pushMins:30,autoPush:2},
  ev:[
    {at:15,call:'Enf.ª Lurdes: «Desacelerações profundas com todos os puxos. Chamo para ventosa?»'},
  ],
  eco:'Feto cefálico encravado, FCF 132 bpm.',
  ideal:['Avaliar o tempo na linha de base entre puxos, a variabilidade e a linha de base, não só a profundidade das desacelerações','Se o feto recupera bem e a linha de base não sobe, manter os puxos com reavaliação frequente','Se as desacelerações se prolongarem e o tempo na linha de base encurtar, puxar só em contrações alternadas e preparar o parto'],
  teach:['No registo real que inspirou este caso houve 20 desacelerações profundas e o pH foi 7,22: este padrão no expulsivo é comum e muitas vezes tolerado','O controlo glicémico intraparto reduz o risco de acidemia em fetos de mães diabéticas']
},

/* ===================== AVANÇADO ===================== */
{
  id:'sonia', nome:'Sónia Matos', idade:23, gp:'G1P0', ig:'41+2', dif:'Avançado', ref:1070,
  tag:'Mecónio espesso, indução longa',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada','Indução às 41 semanas: ocitocina desde há 6 h'],
  admissao:'Amniotomia: líquido com mecónio espesso. Ocitocina a 6 mU/min. 6 cm.',
  start:{clock:'14:30',dil:6,station:-1,pos:'OIEA',membr:'rotas',liquido:'meconial espesso',analgesia:'epidural',oxy:6},
  mat:{fc:88,tas:118,tad:72,temp:37.2,spo2:98},
  fet:{base:142,var:10,accel:1.5,pH0:7.29,reserve:.64,cord:.18,head:.25,sens:1.4,spont:3.4,rate:1.1,pushMins:40,autoPush:10},
  protocolOxy:true,
  ev:[
    {at:35,call:'Enf.ª Fátima: «Começaram desacelerações depois de cada contração. Mantenho a ocitocina?»'},
    {at:95,call:'Enf.ª Fátima: «A linha de base subiu desde o início do turno e a variabilidade parece menor. Pode vir?»'},
  ],
  eco:'Feto cefálico, oligoâmnios, FCF compatível com o traçado.',
  ideal:['Mecónio espesso com desacelerações tardias repetidas: traçado de alto risco','Suspender a ocitocina e corrigir causas reversíveis (posição, fluidos, tocólise se necessário)','Reconhecer a hipoxia gradual: subida da linha de base e alteração da variabilidade','Decidir o parto antes da descompensação, se o padrão persistir'],
  teach:['No registo real que inspirou este caso (mecónio, indução às 41 semanas) o recém-nascido nasceu com pH 6,92','A subida da linha de base por catecolaminas é um dos sinais mais úteis de hipoxia progressiva: compare sempre com o início do traçado']
},
{
  id:'gloria', nome:'Glória Santos', idade:31, gp:'G1P0', ig:'40+0', dif:'Avançado', ref:1490,
  tag:'Hipertensão crónica, desacelerações tardias',
  antecedentes:['Hipertensão crónica medicada com labetalol'],
  gravidez:['Hipertensão controlada','Estimativa de peso fetal no percentil 15'],
  admissao:'Indução às 40 semanas. Ocitocina a 4 mU/min. TA 142/92.',
  start:{clock:'12:10',dil:5,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:4},
  mat:{fc:84,tas:142,tad:92,temp:36.8,spo2:99},
  fet:{base:141,var:11,accel:2,pH0:7.28,reserve:.48,cord:.12,head:.25,sens:1.6,spont:3,rate:1.3,pushMins:30,autoPush:10},
  protocolOxy:true,
  ev:[
    {at:40,call:'Enf.ª Cristina: «As desacelerações são pequenas, só 15–20 bpm, mas aparecem com todas as contrações. É importante?»'},
  ],
  eco:'Feto pequeno, líquido reduzido, Doppler da artéria umbilical com resistência aumentada.',
  ideal:['Desacelerações tardias, mesmo pouco profundas, em todas as contrações: insuficiência placentar','Suspender a ocitocina e corrigir causas reversíveis; reavaliar a resposta','Num feto pequeno de mãe hipertensa, a reserva é baixa: não esperar pela descompensação para decidir o parto'],
  teach:['A profundidade das desacelerações tardias não mede a gravidade: são a repetição e o contexto que contam','No registo real que inspirou este caso (hipertensão, indução) o pH foi 6,93 com Apgar 5 ao 1.º minuto']
},
{
  id:'eva', nome:'Eva Correia', idade:35, gp:'G3P2', ig:'39+0', dif:'Avançado', ref:1198,
  tag:'Sinais discretos e bradicardia final',
  antecedentes:['Dois partos eutócicos'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'Fase ativa espontânea. 6 cm. Sem analgesia.',
  start:{clock:'23:40',dil:6,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'nenhuma',oxy:0},
  mat:{fc:86,tas:120,tad:74,temp:36.7,spo2:99},
  fet:{base:144,var:10,accel:1,pH0:7.27,reserve:.5,cord:.15,head:.25,sens:1.4,spont:3.2,rate:1.6,pushMins:25,autoPush:5},
  ev:[
    {at:50,call:'Enf.ª Paula: «Há poucas desacelerações, mas não vejo acelerações há muito tempo. Está tudo bem?»'},
  ],
  eco:'Feto cefálico, FCF compatível com o traçado.',
  ideal:['Reconhecer sinais discretos: ausência prolongada de acelerações, variabilidade no limite e desacelerações tardias pouco profundas','Fazer revisões estruturadas regulares e não se tranquilizar pelo número reduzido de desacelerações','Perante bradicardia mantida ou perda de variabilidade, decidir o parto de imediato'],
  teach:['No registo real que inspirou este caso, a linha de base passou de 144 para cerca de 70 bpm nos minutos finais e o pH foi 7,03 com Apgar 3','Um traçado com poucos sinais pode esconder um feto com pouca reserva: o contexto e a evolução contam']
},
{
  id:'laura', nome:'Laura Batista', idade:29, gp:'G1P0', ig:'40+0', dif:'Avançado', ref:1047,
  tag:'Linha de base que sobe lentamente',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'Trabalho de parto longo. Epidural há 3 h. 6 cm. Ocitocina a 6 mU/min por paragem da dilatação.',
  start:{clock:'07:30',dil:6,station:-1,pos:'OIDP',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:6},
  mat:{fc:84,tas:116,tad:70,temp:37.1,spo2:99},
  fet:{base:118,var:12,accel:3,pH0:7.3,reserve:.67,cord:.22,head:.25,sens:1.3,spont:3.2,rate:1,pushMins:40,autoPush:15},
  protocolOxy:true,
  ev:[
    {at:70,msg:['Enf.ª Joana','Passagem de turno: «Linha de base 140, normal, como sempre.»']},
    {at:120,call:'Enf.ª Joana: «A FCF está nos 150. Está dentro do normal, certo?»'},
  ],
  eco:'Feto cefálico em occipito-posterior.',
  ideal:['Comparar a linha de base atual com a do início do registo (cerca de 118 bpm): uma subida de 30 bpm é significativa, mesmo dentro do intervalo normal','Interpretar a subida com as desacelerações repetidas como resposta de catecolaminas a hipoxia gradual','Suspender a ocitocina, corrigir causas reversíveis e planear o parto antes da descompensação'],
  teach:['A linha de base de cada feto é a sua referência; «dentro do normal» pode esconder uma subida importante','No registo real que inspirou este caso, a linha de base subiu de 114 para 154 bpm e o pH foi 7,19 com défice de bases de 7,6 mmol/L','A passagem de turno é o momento em que estas subidas lentas se perdem: reveja sempre o traçado completo']
},
{
  id:'margarida', nome:'Margarida Reis', idade:39, gp:'G4P3', ig:'39+5', dif:'Avançado',
  tag:'Amniotomia com apresentação alta',
  antecedentes:['Três partos eutócicos'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'Fase latente prolongada. 4 cm, apresentação cefálica alta. Membranas íntegras.',
  start:{clock:'10:00',dil:4,station:-3,pos:'—',membr:'íntegras',liquido:'—',analgesia:'nenhuma',oxy:0},
  mat:{fc:84,tas:118,tad:72,temp:36.7,spo2:99},
  fet:{base:138,var:13,accel:5,pH0:7.33,reserve:.94,cord:.05,head:.25,spont:2.6,rate:1.4,pushMins:20,autoPush:5},
  prolapseRisk:true,
  ev:[
    {at:18,fn:s=>{if(!s.flags.prolapso){s.msg('Dr. Henrique (interno)','Fiz amniotomia para acelerar o trabalho de parto.');s.rupture(false)}}},
  ],
  on:{amnio:s=>{s.rupture(false);return true}},
  eco:'Ansa de cordão à frente da apresentação; FCF lenta.',
  ideal:['Reconhecer de imediato a bradicardia súbita após a amniotomia e excluir prolapso do cordão (toque vaginal)','Elevar a apresentação, posição genupeitoral e pedir ajuda','Decidir parto emergente: num prolapso, a medida definitiva é o parto'],
  teach:['A amniotomia com apresentação alta é um fator de risco evitável de prolapso do cordão','Num acidente agudo não há tempo para métodos adicionais nem para esperar recuperação']
},
{
  id:'catia', nome:'Cátia Rocha', idade:26, gp:'G1P0', ig:'41+0', dif:'Avançado', ref:1419,
  tag:'Expulsivo longo em nulípara',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada','Indução às 41 semanas'],
  admissao:'Dilatação completa há 1 h. Puxos dirigidos há 15 min. Ocitocina a 6 mU/min.',
  start:{clock:'16:40',dil:10,station:1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:6},
  mat:{fc:92,tas:122,tad:76,temp:37.2,spo2:98},
  fet:{base:145,var:12,accel:2,pH0:7.29,reserve:.84,cord:.38,head:.5,sens:1.1,spont:3.5,rate:2,pushMins:42,autoPush:0},
  protocolOxy:true,
  ev:[
    {at:20,call:'Enf.ª Tânia: «Os puxos são eficazes, mas as desacelerações estão a ficar mais longas. Continuamos?»'},
  ],
  eco:'Feto cefálico, FCF compatível com o traçado.',
  ideal:['Reconhecer a hipoxia subaguda do expulsivo: desacelerações mais longas do que o tempo na linha de base','Parar a ocitocina, interromper os puxos ou puxar em contrações alternadas, decúbito lateral','Se o padrão persistir, acelerar o parto (instrumentado se as condições o permitirem)'],
  teach:['No expulsivo, o pH pode descer cerca de 0,01 a cada 2–3 min de hipoxia subaguda','No registo real que inspirou este caso, a indução e um expulsivo de 30 min terminaram com pH 7,02']
},
);
