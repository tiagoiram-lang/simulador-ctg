/* Casos de gémeos, artefactos, arritmias, fármacos e emergências maternas. Nomes e histórias fictícios. */
CASES.push(
{
  id:'irene', nome:'Irene Sousa', idade:33, gp:'G1P0', ig:'36+2', dif:'Avançado',
  tag:'Gémeos: dois canais, um só traçado',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez gemelar bicoriónica','Gémeo B com restrição de crescimento (percentil 4), Doppler da artéria umbilical com resistência aumentada','Gémeo A cefálico, gémeo B cefálico'],
  admissao:'Indução às 36 semanas pela restrição de crescimento do gémeo B. Ocitocina a 4 mU/min. Monitorização com dois transdutores de ultrassons.',
  start:{clock:'09:30',dil:4,station:-2,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:4},
  mat:{fc:86,tas:118,tad:72,temp:36.8,spo2:99},
  fet:{base:138,var:12,accel:5,pH0:7.32,reserve:.9,cord:.08,head:.3,spont:2.6,rate:1.6,pushMins:30,autoPush:10},
  twin:{base:146,var:10,accel:3,pH0:7.29,reserve:.66},
  protocolOxy:true,
  ev:[
    {at:22,coinc:true,fn:s=>{s.flags.coinc=true}},
    {at:55,call:'Enf.ª Lúcia: «Os traçados dos dois bebés estão quase iguais, parece um só. Nos gémeos isso é normal?»'},
  ],
  eco:'Dois fetos cefálicos; gémeo B pequeno, líquido reduzido no saco do gémeo B.',
  ideal:['Nos gémeos, confirmar sempre que cada canal regista um feto diferente; traçados sobrepostos (e o alarme de coincidência) indicam que os dois transdutores estão sobre o mesmo coração','Reposicionar a sonda do gémeo B com ecografia','Interpretar cada traçado em separado: o gémeo B, com restrição de crescimento, tem pouca reserva','Perante desacelerações tardias repetitivas no gémeo B, suspender a ocitocina e decidir o parto se persistirem'],
  teach:['A coincidência dos canais é uma armadilha clássica: o traçado «normal» pode ser o do gémeo errado','Os monitores modernos verificam a coincidência entre canais, mas o alarme é fácil de ignorar','O gémeo mais pequeno, com Doppler alterado, decide muitas vezes o momento do parto']
},
{
  id:'debora', nome:'Débora Lima', idade:30, gp:'G2P1', ig:'39+5', dif:'Avançado',
  tag:'Epidural, hipotensão e um monitor que engana',
  antecedentes:['Parto eutócico há 4 anos'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'Fase ativa, 6 cm. Epidural funcionante. Monitorização externa por ultrassons. O anestesista vai fazer um reforço da epidural.',
  start:{clock:'14:00',dil:6,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:0},
  mat:{fc:84,tas:116,tad:70,temp:36.8,spo2:99},
  fet:{base:142,var:12,accel:5,pH0:7.32,reserve:.85,cord:.08,head:.3,spont:3,rate:1.6,pushMins:30,autoPush:10,dblArt:true},
  ev:[
    {at:18,fn:s=>{s.hypotension(82,44);s.startAcute('hipotensao');s.msg('Dr. Paulo (anestesiologia)','Fiz o reforço da epidural. Volto daqui a 20 min.')}},
    {at:26,msg:['Enf.ª Sónia','A Sra. Débora diz que está tonta e com náuseas. O CTG teve um «salto» há bocado mas agora está nos 150.']},
  ],
  eco:'Feto cefálico.',
  ideal:['Reconhecer a hipotensão após o reforço da epidural (tonturas, náuseas, TA) e tratá-la: decúbito lateral, fluidos e vasopressor','Desconfiar de uma subida brusca da FCF para cerca do dobro durante uma desaceleração: com ultrassons, uma bradicardia abaixo de ~80 bpm pode ser contada a dobrar','Confirmar a FCF real com elétrodo de escalpe, ecografia ou auscultação, e comparar com a FC materna'],
  teach:['A duplicação (e o seu oposto, a contagem a metade nas taquicardias muito altas) é um artefacto dos monitores de ultrassons','Mudanças bruscas, sem transição, de cerca de metade ou do dobro da frequência não são fisiológicas: são artefactos até prova em contrário','A hipotensão materna é a causa mais frequente e mais tratável de desaceleração prolongada depois de uma epidural']
},
{
  id:'noemia', nome:'Noémia Castro', idade:28, gp:'G1P0', ig:'39+3', dif:'Intermédio',
  tag:'Picos no traçado com elétrodo de escalpe',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada; na ecografia das 36 semanas foram vistos alguns batimentos irregulares, sem outras alterações'],
  admissao:'Fase ativa, 6 cm. Elétrodo de escalpe colocado por perda de sinal com ultrassons.',
  start:{clock:'02:20',dil:6,station:-1,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'epidural',oxy:0},
  mat:{fc:82,tas:114,tad:70,temp:36.7,spo2:99},
  fet:{base:136,var:12,accel:5,pH0:7.33,reserve:.94,cord:.06,head:.35,spont:2.8,rate:1.6,pushMins:30,autoPush:10,ectopic:1.4},
  ev:[
    {at:.1,fn:s=>{s.st.scalp=true}},
    {at:15,call:'Enf.ª Rita: «O traçado tem picos para cima e para baixo, como agulhas. É uma arritmia? Chamo para cesariana?»'},
  ],
  eco:'Feto cefálico, ritmo de base regular a 136 bpm com batimentos prematuros isolados; sem derrame nem sinais de insuficiência cardíaca.',
  ideal:['Reconhecer extrassístoles isoladas: picos verticais e simétricos de uma só batida, com linha de base, variabilidade e acelerações normais','Confirmar por ecografia que o ritmo de base é regular e que não há sinais de insuficiência cardíaca','Não intervir; avisar a neonatologia para ECG do recém-nascido'],
  teach:['As extrassístoles fetais são a arritmia mais frequente e quase sempre benigna','Com ultrassons quase não se veem, porque o monitor faz uma média; com o ECG do escalpe aparecem como agulhas','O que define o bem-estar fetal continua a ser o resto do traçado: linha de base, variabilidade, acelerações e desacelerações']
},
{
  id:'olga', nome:'Olga Mendes', idade:25, gp:'G1P0', ig:'40+2', dif:'Básico',
  tag:'Petidina e variabilidade reduzida',
  antecedentes:['Sem antecedentes'],
  gravidez:['Gravidez vigiada, sem intercorrências'],
  admissao:'Fase ativa, 4 cm, com muitas dores. A epidural só fica disponível daqui a cerca de 2 h (anestesista no bloco).',
  start:{clock:'05:10',dil:4,station:-2,pos:'OIEA',membr:'íntegras',liquido:'—',analgesia:'nenhuma',oxy:0},
  mat:{fc:92,tas:122,tad:76,temp:36.8,spo2:99},
  fet:{base:138,var:13,accel:6,pH0:7.33,reserve:.94,cord:.05,head:.3,spont:3,rate:1.3,pushMins:30,autoPush:10},
  ev:[
    {at:3,fn:s=>{s.st.opioidUntil=s.tmin()+95;s.msg('Enf.ª Paula','Administrei petidina 50 mg IM, prescrita pelo colega da noite, por causa das dores.')}},
    {at:48,call:'Enf.ª Paula: «Desde há 40 min a variabilidade está muito baixa e não há acelerações. Não devíamos pensar em cesariana?»'},
  ],
  eco:'Feto cefálico, movimentos escassos.',
  ideal:['Relacionar a variabilidade reduzida e a ausência de acelerações com a petidina (efeito máximo cerca de 40 min depois, dura 1 a 2 h)','Confirmar que não há desacelerações nem subida da linha de base e que o padrão começou depois do fármaco','Manter vigilância e reavaliar: a variabilidade recupera; não decidir parto por este padrão isolado'],
  teach:['Opioides, sulfato de magnésio e corticoides são as causas farmacológicas mais comuns de variabilidade reduzida','Registar a hora de cada fármaco no traçado evita interpretações erradas','Perto do parto, a petidina aumenta o risco de depressão respiratória do recém-nascido']
},
{
  id:'yara', nome:'Yara Fonseca', idade:29, gp:'G2P1', ig:'34+1', dif:'Intermédio',
  tag:'Pré-termo depois de corticoides',
  antecedentes:['Parto eutócico às 39 semanas há 3 anos'],
  gravidez:['Ameaça de parto pré-termo desde ontem','Betametasona 12 mg IM: 1.ª dose ontem de manhã, 2.ª dose hoje de manhã'],
  admissao:'Trabalho de parto pré-termo em progressão apesar da tocólise, que foi suspensa. 5 cm. Neonatologia avisada.',
  start:{clock:'16:40',dil:5,station:-1,pos:'OIEA',membr:'íntegras',liquido:'—',analgesia:'epidural',oxy:0},
  mat:{fc:88,tas:116,tad:70,temp:36.9,spo2:99},
  fet:{base:150,var:12,accel:4,pH0:7.32,reserve:.86,cord:.1,cordPos:true,head:.3,spont:3,rate:2,pushMins:15,autoPush:5},
  ev:[
    {at:.1,fn:s=>{s.st.varMul=.55;s.st.accMul=.3}},
    {at:30,call:'Enf.ª Inês: «A variabilidade está nos 4–5 bpm e quase não há acelerações. Num prematuro isto é grave, não é?»'},
  ],
  eco:'Feto cefálico, peso estimado 2250 g, líquido normal.',
  ideal:['Relacionar a variabilidade reduzida e a diminuição das acelerações com a betametasona (efeito transitório de 2 a 3 dias após a administração)','Num feto de 34 semanas, uma linha de base de 150 bpm é normal','Manter vigilância; procurar desacelerações e subida da linha de base, que não se explicam pelo corticoide'],
  teach:['Os corticoides reduzem transitoriamente a variabilidade e os movimentos fetais, sobretudo no 2.º e 3.º dia','Abaixo das 32 semanas os critérios mudam: linha de base mais alta, acelerações menores (10 bpm durante 10 s) e variabilidade um pouco menor são esperadas']
},
{
  id:'marisa', nome:'Marisa Coelho', idade:34, gp:'G2P1', ig:'39+2', dif:'Avançado',
  tag:'Rotura de membranas com líquido hemático',
  antecedentes:['Parto eutócico há 5 anos'],
  gravidez:['Placenta posterior baixa com lobo acessório na ecografia das 32 semanas; Doppler de vasos sobre o colo não realizado'],
  admissao:'Fase ativa, 5 cm, sem analgesia. Membranas íntegras. Hemodinamicamente estável.',
  start:{clock:'11:15',dil:5,station:-2,pos:'OIEA',membr:'íntegras',liquido:'—',analgesia:'nenhuma',oxy:0},
  mat:{fc:84,tas:120,tad:74,temp:36.7,spo2:99},
  fet:{base:140,var:13,accel:5,pH0:7.33,reserve:.94,cord:.05,head:.3,spont:3,rate:1.5,pushMins:25,autoPush:5},
  vasaRisk:true,
  ev:[
    {at:16,fn:s=>s.rupture(true)},
  ],
  eco:'Feto cefálico, FCF compatível com o traçado. Vasos fetais a atravessar as membranas junto ao colo.',
  ideal:['Rotura de membranas com líquido hemático numa mãe estável e sem dor, seguida em poucos minutos de bradicardia fetal: suspeitar de rotura de vasa prévia (hemorragia fetal, não materna)','Decidir cesariana emergente de imediato; não esperar por testes de sangue fetal','Avisar a neonatologia para transfusão do recém-nascido'],
  teach:['Na rotura de vasa prévia o sangue que se perde é do feto, que tem cerca de 250 mL de volume sanguíneo: minutos contam','O que distingue do descolamento: mãe sem dor, útero mole e sinais vitais normais','O diagnóstico pré-natal (Doppler de vasos sobre o colo quando há placenta baixa, lobo acessório ou inserção velamentosa) muda o prognóstico']
},
{
  id:'vanessa', nome:'Vanessa Araújo', idade:22, gp:'G1P0', ig:'38+0', dif:'Avançado', preecl:true,
  tag:'Pré-eclâmpsia grave e convulsão',
  antecedentes:['Sem antecedentes'],
  gravidez:['Pré-eclâmpsia diagnosticada hoje: TA 162/108, proteinúria, cefaleias e escotomas','Labetalol IV administrado; sulfato de magnésio prescrito, ainda não iniciado'],
  admissao:'Indução por pré-eclâmpsia grave. 4 cm, epidural pedida. Ocitocina a 2 mU/min.',
  start:{clock:'19:05',dil:4,station:-2,pos:'OIEA',membr:'rotas',liquido:'claro',analgesia:'nenhuma',oxy:2},
  mat:{fc:94,tas:156,tad:104,temp:36.8,spo2:98},
  fet:{base:140,var:12,accel:4,pH0:7.31,reserve:.75,cord:.08,head:.3,sens:1.1,spont:2.6,rate:1.6,pushMins:30,autoPush:10},
  ev:[
    {at:22,fn:s=>{if(s.st.mg){s.msg('Enf.ª Marta','As cefaleias aliviaram desde o sulfato de magnésio. TA 148/98.')}else s.eclampsia()}},
  ],
  eco:'Feto cefálico, peso estimado no percentil 20, líquido normal.',
  ideal:['Na pré-eclâmpsia grave, iniciar o sulfato de magnésio logo que possível: previne a convulsão','Durante e após uma convulsão: pedir ajuda, decúbito lateral, via aérea e oxigénio para a mãe, sulfato de magnésio e controlo da TA','A bradicardia fetal durante a convulsão costuma recuperar em 5 a 10 min depois de a mãe estabilizar: não decidir cesariana durante a convulsão','Depois de estabilizar a mãe e de o feto recuperar, planear o parto com calma'],
  teach:['A hipoxia materna da convulsão causa uma desaceleração prolongada que é, na maior parte dos casos, reversível','Uma cesariana numa mãe instável é mais perigosa para os dois do que esperar alguns minutos','Sem sulfato de magnésio, o risco de nova convulsão é alto']
},
);
