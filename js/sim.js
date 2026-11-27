/* Simulação de um trabalho de parto: fisiologia fetal simplificada, eventos, ações e verdade clínica */
const POS_LAB={semi:'Semi-sentada',dorsal:'Decúbito dorsal',lat_e:'Decúbito lateral esquerdo',lat_d:'Decúbito lateral direito',vertical:'Sentada / vertical',genu:'Genupeitoral'};
const ACCIDENTS=['prolapso','rotura','descolamento'];
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};

class LabourSim{
  constructor(cs,opts={}){
    /* cópia própria dos parâmetros: os eventos de um caso podem mudá-los sem afetar a próxima simulação */
    cs={...cs,fet:{...cs.fet},start:{...cs.start},mat:{...cs.mat}};
    this.cs=cs;this.mode=opts.mode||'formacao';const f=cs.fet,s0=cs.start;
    this.st={dil:s0.dil,station:s0.station,pos:s0.pos,membr:s0.membr,liquido:s0.liquido,analgesia:s0.analgesia,oxy:s0.oxy,posicao:'semi',
      pushing:false,fullAt:s0.dil>=10?0:null,pushAcc:0,pushStart:null,tas:cs.mat.tas,tad:cs.mat.tad,fcm:cs.mat.fc,temp:cs.mat.temp,spo2:cs.mat.spo2,
      pH:f.pH0,opioidUntil:-1e9,tocoUntil:-1e9,terbUntil:-1e9,paraUntil:-1e9,abx:false,oxi:false,scalp:false,hypo:false,oxyStopAt:null,fluids:0,vitals:null};
    this.e=new Engine({baseline:f.base,varAmp:f.var,accelPerHour:f.accel,cycling:!f.chronic&&!f.sinus,cInt:f.spont>0?600/f.spont:0,cDur:75,cAmp:40,tone:10,
      mhrBase:cs.mat.fc,ramp:2,varRamp:2,toneRamp:20,sinus:f.sinus||0,sinusCpm:4},opts.seed||(cs.id.length*977+13));
    this.e.decelHook=c=>this.decel(c);
    this.flags={};this.feed=[];this.acts=[];this.reviews=[];this.hist=[];this.acute=null;this.acuteHist=[];this.decision=null;this.ended=false;this.outcome=null;
    this.per10=f.spont;this.terminal=false;this.lastUpd=-1e9;this.lastSnap=-1e9;this.evi=0;this.lastProto=0;this.lastVit=0;this.nPush=0;
    this.onMsg=null;this.onEnd=null;
    this.t0=20*MIN;
    while(this.e.t<this.t0)this.step(true);
    this.recordVitals('auto');
  }
  tmin(t){return ((t??this.e.t)-this.t0)/60}
  clock(t){const [h,m]=this.cs.start.clock.split(':').map(Number);let x=Math.round(h*60+m+this.tmin(t));x=((x%1440)+1440)%1440;return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0')}
  reserve(){const f=this.cs.fet,st=this.st,A=this.acute;let r=f.reserve;if(st.temp>=38)r*=.85;if(st.hypo)r*=.9;if(A&&A.cause==='descolamento')r*=.55;return r}
  msg(who,text,o={}){const it={tm:this.tmin(),clock:this.clock(),who,text,kind:o.kind||'msg'};this.feed.push(it);if(this.onMsg)this.onMsg(it,o);return it}

  step(pre){
    if(this.ended)return;
    this.e.step();this.physio();
    const tm=this.tmin();
    if(!pre){
      const ev=this.cs.ev||[];
      while(this.evi<ev.length&&ev[this.evi].at<=tm){this.fire(ev[this.evi]);this.evi++}
    }
    if(this.e.t-this.lastUpd>=10){this.lastUpd=this.e.t;this.update(pre)}
    if(this.e.t-this.lastSnap>=30){this.lastSnap=this.e.t;this.snap()}
  }
  fire(ev){
    if(ev.fn)ev.fn(this);
    if(ev.msg)this.msg(ev.msg[0],ev.msg[1],{pause:ev.pause});
    if(ev.call&&!this.decision)this.msg('Pedido de revisão',ev.call,{kind:'call',pause:true,review:true});
  }
  physio(){
    const st=this.st,f=this.cs.fet,e=this.e;
    if(f.sinus)return;
    const res=this.reserve(),drop=e.curDrop;let d=0;
    if(drop>10)d-=.009*clamp((drop-10)/50,0,1.3)*(1.3-.4*res);
    if(e.inContr>15)d-=.006*(1-res)*(e.inContr/50)*(f.chronic?2.5:1);
    if(drop<=10&&e.inContr<15&&st.pH<f.pH0)d+=.002*res;
    if(this.terminal)d-=.008;
    st.pH=clamp(st.pH+d*DT/60,6.72,f.pH0);
  }
  decel(c){
    const st=this.st,f=this.cs.fet,r=this.e.r,A=this.acute;
    const load=(c.a/45)*(c.d/75)*(this.per10>5?1.25:1);
    const res=this.reserve();
    const long=this.per10>5&&(st.pushing||this.e.p.tone>25);
    if(A&&A.cause==='descolamento'&&!this.e.pro&&r()<.9)return{k:'g',s:c.s+c.d*.3+12,d:c.d*1.4+20,depth:28+r()*12,type:'tardia'};
    const lateralOK=['lat_e','lat_d','genu','vertical'].includes(st.posicao)&&f.cordPos;
    const pc=f.cord*(st.pushing?1.6:1)*(lateralOK?.35:1);
    if(r()<pc){
      const fall=7+r()*8,g=7+r()*8;let h=10+r()*25;let depth=(30+r()*30)*Math.min(1.3,Math.max(.7,load));
      if(long){h=Math.max(h,c.d+12-fall);depth=Math.max(depth,50+r()*15)}
      return{k:'v',s:c.s+c.d*(.12+.2*r()),f:fall,h,g,depth,type:'variavel'};
    }
    if(f.sinus)return null;
    const u=clamp(load*(1-res)*1.4+(st.pH<7.2?.3:0)-.18,0,1);
    if(r()<u*1.4){
      let depth=f.chronic?8+r()*8:10+30*u+r()*8,d=c.d*1.05;
      if(long){d=Math.max(d,c.d+40);depth=Math.max(depth,40+25*u+r()*10)}
      return{k:'g',s:c.s+c.d*.3+10,d,depth,type:'tardia'};
    }
    if(st.dil>=7&&r()<(f.head??.3))return{k:'g',s:c.s+c.d*.05,d:c.d*.9,depth:12+r()*12,type:'precoce'};
    return null;
  }
  update(pre){
    const st=this.st,f=this.cs.fet,e=this.e,tm=this.tmin(),A=this.acute,cs=this.cs;
    // progressão do trabalho de parto
    if(!f.noLabour&&!(A&&!A.resolved)&&st.dil<10&&!this.decision){
      st.dil=Math.min(10,st.dil+f.rate/360*(this.per10>=2.5?1:.5));
      st.station=Math.max(st.station,Math.min(0,Math.round(-3+(st.dil-3)*3/7)));
      if(st.dil>=10&&st.fullAt==null){st.dil=10;st.fullAt=tm;if(!pre)this.msg('Enf.ª','Dilatação completa. Apresentação no plano 0.')}
    }
    if(!pre&&st.dil>=10&&!st.pushing&&!this.decision&&!f.noLabour){
      const since=tm-(st.fullAt??tm);
      if(f.autoPush!=null&&since>=f.autoPush&&!this.flags.noPush&&!this.flags.autoPushed){this.flags.autoPushed=1;this.startPushing('auto')}
      else if(this.flags.noPush&&tm-this.flags.noPush>=20){this.flags.noPush=0;this.startPushing('urge')}
      else if(since>=60&&!this.flags.noPush&&!this.flags.autoPushed){this.flags.autoPushed=1;this.startPushing('urge')}
    }
    if(st.pushing){st.pushAcc+=10/60;st.station=Math.min(3,st.station+(10/60)/22);if(st.pushAcc>=f.pushMins&&!this.decision&&!pre)this.birth('eutocico')}
    // febre
    if(f.fever){const target=tm<st.paraUntil?37.7:37.6+Math.min(1.7,Math.max(0,tm)/60*.75);st.temp+=(target-st.temp)*.03}
    // FC materna
    let fcm=cs.mat.fc+Math.max(0,st.temp-37.2)*14+(tm<st.terbUntil?26:0)+(st.hypo?22:0)+(A&&A.cause==='rotura'?40:0)+(A&&A.cause==='descolamento'?20:0);
    st.fcm=Math.round(fcm);
    if(A&&A.cause==='rotura'&&!pre){st.tas=Math.max(78,st.tas-.25);st.tad=Math.max(42,st.tad-.15)}
    // hipotensão
    if(st.hypo&&st.tas>=100){st.hypo=false;if(A&&A.cause==='hipotensao'&&!A.resolved){A.resolved=tm;e.recover(['lat_e','lat_d'].includes(st.posicao)?25:60)}}
    // hipertonia por ocitocina
    if(!pre&&st.oxy>0&&this.per10>6.3&&!A&&!this.flags.hipertonia&&e.r()<.004){this.startAcute('hipertonia');this.msg('Enf.ª','O útero não está a relaxar entre as contrações e a FCF baixou.',{pause:true})}
    if(A&&A.cause==='hipertonia'&&!A.resolved&&st.oxy===0&&(tm<st.tocoUntil||tm-(st.oxyStopAt??tm)>=6)){A.resolved=tm;e.recover(40)}
    if(A&&A.resolved&&!e.pro){this.acuteHist.push(A);this.acute=null}
    // protocolo de ocitocina feito pela enfermagem
    if(!pre&&cs.protocolOxy&&!this.acute&&!this.flags.oxyTouched&&st.oxy>0&&st.oxy<20&&tm-this.lastProto>=30&&e.contr10()<5&&!this.decision){this.lastProto=tm;st.oxy+=2;this.msg('Enf.ª',`Aumentei a ocitocina para ${st.oxy} mU/min, conforme o protocolo.`)}
    if(!pre&&tm-this.lastVit>=60){this.recordVitals('auto')}
    // contrações
    let tgt=f.noLabour?f.spont:f.spont+.17*Math.max(0,st.dil-4)+st.oxy*.22*(f.sens||1)+(st.pushing?.3:0);
    if(tm<st.tocoUntil)tgt*=.3;
    if(A&&A.cause==='descolamento')tgt=7.5;
    if(A&&A.cause==='hipertonia'&&!A.resolved)tgt=Math.max(tgt,6.5);
    tgt=clamp(tgt,0,7.8);
    const tau=tgt>this.per10?8:(tm<st.tocoUntil?1.5:4);
    this.per10+=(tgt-this.per10)*(10/60)/tau;
    if(A&&A.cause==='rotura')this.per10=0;
    let cAmp=38+(st.dil>7?8:0)+(st.oxy>0?6:0)+(st.pushing?22:0),cDur=st.pushing?82:75,tone=10;
    if(A&&A.cause==='descolamento'){cAmp=16;cDur=45;tone=36}
    if(A&&A.cause==='hipertonia'&&!A.resolved){tone=30;cDur=115}
    if(A&&A.cause==='rotura')tone=6;
    e.set({cInt:this.per10>.25?600/this.per10:0,cAmp,cDur,tone,pushing:st.pushing,mhrPush:st.pushing});
    // FCF
    let base=f.base+Math.max(0,st.temp-37.4)*16+(tm<st.terbUntil?10:0);
    if(st.pH<7.22)base+=Math.min(32,(7.22-st.pH)*320);
    if(st.pH<7.0)this.terminal=true;
    if(this.terminal)base=78;
    e.set({baseline:base,ramp:this.terminal?8:2});
    let v=f.var;if(tm<st.opioidUntil)v*=.3;if(st.pH<7.12)v*=clamp(.25+(st.pH-7.03)/.09*.75,.25,1);if(this.terminal)v=1.5;
    if(!f.sinus)e.set({varAmp:v,varRamp:2});
    const ok=st.pH>7.25&&tm>=st.opioidUntil&&!f.chronic&&!f.sinus;
    e.set({accelPerHour:ok?f.accel:0,cycling:st.pH>7.2&&!f.chronic&&!f.sinus});
    const cap=!!f.mhrCapture&&!st.scalp;
    e.set({mhrBase:st.fcm,maternal:cap&&st.pushing,mhrCapture:cap,loss:st.scalp?.1:(f.loss??.8)*(st.pushing?1.6:1),showMhr:st.oxi});
    // decisão de parto
    if(!pre&&this.decision&&tm>=this.decision.eta)this.birth(this.decision.kind);
    if(!pre&&!this.ended&&f.noLabour&&tm>=150&&!this.decision)this.finish('Fim do tempo de observação sem decisão.');
    if(this.terminal&&this.flags.termAt==null)this.flags.termAt=tm;
    if(!pre&&!this.ended&&this.terminal&&!this.decision&&tm-this.flags.termAt>=25)this.finish('Caso interrompido: bradicardia terminal mantida durante 25 min sem decisão de parto.');
    if(!pre&&!this.ended&&tm>=330)this.finish('Fim do tempo do caso.');
  }
  snap(){
    const e=this.e,st=this.st;
    this.hist.push({t:e.t,tm:this.tmin(),b:e.b,va:e.p.sinus?0:e.va*(e.qNow?.35:1),sinus:!!e.p.sinus,maternal:!!e.p.maternal,per10:e.contrIn(e.t-1800,e.t)/3,pH:st.pH,pro:!!e.pro,
      temp:st.temp,opioid:this.tmin()<st.opioidUntil+20,quiet:this.e.qNow,oxy:st.oxy,terminal:this.terminal,pushing:st.pushing});
  }
  recordVitals(by){
    const st=this.st;this.lastVit=this.tmin();
    st.vitals={clock:this.clock(),tas:Math.round(st.tas),tad:Math.round(st.tad),fc:st.fcm,temp:Math.round(st.temp*10)/10,spo2:st.spo2};
    const v=st.vitals;
    if(this.tmin()>=0)this.msg(by==='auto'?'Enf.ª (registo horário)':'Sinais vitais',`TA ${v.tas}/${v.tad} mmHg · FC ${v.fc} bpm · T ${String(v.temp).replace('.',',')} °C · SpO₂ ${v.spo2}%`,{kind:'res'});
  }
  startPushing(by){
    const st=this.st;st.pushing=true;st.pushStart=this.tmin();this.nPush++;
    this.msg('Enf.ª',by==='auto'?'Início dos puxos dirigidos.':by==='urge'?'A parturiente tem vontade incontrolável de puxar; iniciou puxos.':'Puxos iniciados.');
  }
  startAcute(cause){
    if(this.acute&&!this.acute.resolved)return;
    this.acute={cause,start:this.tmin(),resolved:null};this.flags[cause]=1;
    const e=this.e;
    if(cause==='descolamento'){e.at(12*MIN,()=>{if(!this.ended)e.startPro({drop:68,fall:60,vf:.6,vfLate:.2})});return}
    const drop={hipotensao:62,hipertonia:55,prolapso:72,rotura:76}[cause];
    const acc=ACCIDENTS.includes(cause);
    e.startPro({drop,fall:cause==='hipotensao'?55:30,vf:acc?.9:1,vfLate:acc?.25:.8});
  }
  hypotension(tas,tad){this.st.hypo=true;this.st.tas=tas;this.st.tad=tad}
  rupture(spont){
    const st=this.st;st.membr='rotas';st.liquido='claro, abundante';
    this.msg('Enf.ª',spont?'Rotura espontânea de membranas: saída abundante de líquido claro.':'Amniotomia realizada: saída abundante de líquido claro.');
    if((this.cs.id==='ines'||this.cs.prolapseRisk)&&!this.flags.prolapso){this.flags.prolapso=1;this.e.at(40,()=>this.startAcute('prolapso'))}
  }
  decide(kind){
    const tm=this.tmin(),fl=this.flags;let eta;
    if(kind==='ces1')eta=Math.max(10,22-(fl.bloco!=null?7:0)-(fl.ajuda!=null?2:0));
    else if(kind==='ces2')eta=Math.max(25,45-(fl.bloco!=null?10:0));
    else eta=Math.max(7,12-(fl.ajuda!=null?2:0));
    this.decision={kind,at:tm,eta:tm+eta};
    if(kind!=='inst'&&this.st.pushing){this.st.pushing=false}
    return eta;
  }
  birth(kind){
    if(this.ended)return;const st=this.st,f=this.cs.fet;
    const pHa=Math.round((st.pH-.02)*100)/100,pHv=Math.round((pHa+.07)*100)/100;
    const be=Math.round((-2.5+(pHa-7.28)*55)*10)/10,lact=Math.round(Math.max(1.6,2+(7.28-pHa)*28)*10)/10;
    let a1=9,a5=10;if(pHa<7.2){a1=8;a5=9}if(pHa<7.1){a1=6;a5=8}if(pHa<7.0){a1=4;a5=7}if(pHa<6.9){a1=2;a5=5}
    if(f.sinus){a1=Math.min(a1,6);a5=Math.min(a5,8)}
    const notes=[];
    if(pHa<7.0&&be<=-12)notes.push('Acidose metabólica significativa: admissão na UCIN e avaliação para hipotermia terapêutica.');
    else if(pHa<7.1)notes.push('Acidemia moderada: vigilância neonatal apertada.');
    if(f.fever&&!st.abx)notes.push('Mãe febril sem antibioterapia intraparto: risco de sépsis neonatal precoce, rastreio e antibiótico no recém-nascido.');
    else if(f.fever)notes.push('Corioamnionite tratada: rastreio séptico neonatal conforme o protocolo.');
    if(f.sinus)notes.push('Anemia neonatal grave (Hb 7,2 g/dL): transfusão na UCIN.');
    if(!notes.length)notes.push('Recém-nascido vigoroso, contacto pele a pele.');
    const LAB={eutocico:'Parto eutócico',inst:'Parto vaginal instrumentado (ventosa)',ces1:'Cesariana emergente (categoria 1)',ces2:'Cesariana urgente (categoria 2)'};
    this.outcome={kind,label:LAB[kind],clock:this.clock(),tm:this.tmin(),pHa,pHv,be,lact,a1,a5,notes,born:true};
    this.msg('Nascimento',`${LAB[kind]} às ${this.clock()}. Índice de Apgar ${a1}/${a5}.`,{kind:'sys'});
    this.ended=true;if(this.onEnd)this.onEnd();
  }
  finish(reason){
    if(this.ended)return;this.outcome={born:false,label:'Caso terminado sem parto',clock:this.clock(),tm:this.tmin(),notes:[reason]};
    this.ended=true;if(this.onEnd)this.onEnd();
  }

  /* ---------- verdade clínica do traçado num instante T ---------- */
  truthAt(T){
    const e=this.e,H=this.hist.filter(h=>h.t<=T);if(!H.length)return null;
    const lastH=H[H.length-1],last=H.slice(-20);
    const maternal=lastH.maternal;
    const base=Math.round(avg(last.map(h=>h.b)));
    const vaNow=median(last.map(h=>h.va));
    let redDur=0;for(let i=H.length-1;i>=0&&H[i].va<5&&!H[i].sinus;i--)redDur+=.5;
    let incDur=0;for(let i=H.length-1;i>=0&&H[i].va>25;i--)incDur+=.5;
    let sinDur=0;for(let i=H.length-1;i>=0&&H[i].sinus;i--)sinDur+=.5;
    const cat=lastH.sinus?'sinusoidal':vaNow<5?'reduzida':vaNow>25?'aumentada':'normal';
    const acc=e.alog.some(a=>a.s>T-1800&&a.s<=T&&a.a>=15);
    const W0=T-1800,W20=T-1200;
    const ds=e.dlog.filter(d=>d.s>W0&&d.s<=T),nC=e.contrIn(W0,T);
    const cnt={precoce:0,variavel:0,tardia:0};ds.forEach(d=>cnt[d.type]++);
    const pros=e.proLog.filter(p=>(p.e==null||p.e>W0)&&p.s<=T).map(p=>{const end=(p.e==null||p.e>T)?T:p.e;return{s:p.s,dur:(end-p.s)/60,ongoing:p.e==null||p.e>T,end}});
    const maxPro=pros.length?Math.max(...pros.map(p=>p.dur)):0;
    const types=[];if(cnt.precoce)types.push('precoces');if(cnt.variavel)types.push('variaveis');if(cnt.tardia)types.push('tardias');if(maxPro>=3)types.push('prolongada');if(!types.length)types.push('ausentes');
    const rep=t=>nC>0&&cnt[t]/nC>.5;
    const ds20=ds.filter(d=>d.s>W20),nC20=e.contrIn(W20,T);
    const lateRep20=nC20>0&&ds20.filter(d=>d.type==='tardia').length/nC20>.5;
    const per10=Math.round(nC/3*10)/10;
    let figo='N',why=[];
    if(maternal){figo='X';why=['sinal de origem materna']}
    else{
      const P=[],S=[];
      if(base<100)P.push('linha de base <100 bpm');else if(base<110)S.push('linha de base 100–109 bpm');else if(base>160)S.push('linha de base >160 bpm');
      if(cat==='sinusoidal')(sinDur>=30?P:S).push('padrão sinusoidal'+(sinDur>=30?' >30 min':''));
      else if(cat==='reduzida')(redDur>=50?P:S).push(redDur>=50?'variabilidade reduzida >50 min':'variabilidade reduzida (<50 min)');
      else if(cat==='aumentada')(incDur>=30?P:S).push('variabilidade aumentada');
      if(maxPro>5)P.push('desaceleração prolongada >5 min');else if(maxPro>=3)S.push('desaceleração prolongada');
      if(rep('tardia')||(lateRep20&&cat==='reduzida'))P.push('desacelerações tardias repetitivas');else if(cnt.tardia)S.push('desacelerações tardias');
      if(rep('variavel'))S.push('desacelerações variáveis repetitivas');
      figo=P.length?'P':S.length?'S':'N';why=P.length?P:S;
    }
    const f=this.cs.fet,A=this.acute||this.acuteHist[this.acuteHist.length-1];
    const inAcute=A&&(T-this.t0)/60>=A.start&&(!A.resolved||(T-this.t0)/60<=A.resolved+8);
    let mech;
    if(maternal)mech=['materno'];
    else if(f.sinus)mech=['nao_hipoxica'];
    else if(inAcute||pros.some(p=>p.dur>=2.5&&(p.ongoing||p.end>T-600)))mech=['aguda'];
    else{
      const longDec=ds20.filter(d=>d.dur>=75).length;
      if(nC20>=8&&longDec>=nC20*.5)mech=['subaguda'];
      else if(f.chronic)mech=['cronica'];
      else if(rep('tardia')||rep('variavel'))mech=(lastH.pH<7.2||base>f.base+10||!acc)?['gradual']:['gradual','sem'];
      else if(lastH.opioid||(cat==='reduzida'&&lastH.quiet)||(lastH.temp>=37.8&&base>152))mech=['nao_hipoxica'];
      else if(cat==='reduzida'&&redDur<50)mech=['sem','nao_hipoxica'];
      else mech=['sem'];
    }
    let plan;
    if(figo==='X')plan=['confirmar'];
    else if(mech.includes('aguda')){const accident=A&&ACCIDENTS.includes(A.cause);plan=(accident||maxPro>=9)?['parto_imediato']:(maxPro>=3?['corrigir']:['corrigir','vigiar'])}
    else if(figo==='N')plan=['vigiar'];
    else if(mech.length===1&&mech[0]==='nao_hipoxica'&&!f.sinus)plan=['vigiar','corrigir','adicionais'];
    else if(figo==='S')plan=mech.includes('subaguda')?['corrigir']:['corrigir','vigiar','adicionais'];
    else if(mech.includes('cronica')||f.sinus||lastH.pH<7.15||cat==='reduzida')plan=['acelerar','parto_imediato'];
    else plan=['corrigir','adicionais','acelerar'];
    return{T,base,cat,acc,types,per10,figo,why,mech,plan,pH:lastH.pH,maternal,cnt,nC};
  }
  truth(){return this.truthAt(this.e.t)}

  /* ---------- ações ---------- */
  avail(id){
    const st=this.st,f=this.cs.fet,d=this.decision;
    const no=r=>({ok:false,why:r});
    if(this.ended)return no('Caso terminado');
    switch(id){
      case 'lat_e':case 'lat_d':case 'vertical':case 'genu':case 'dorsal':return st.posicao===id?no('Posição atual'):{ok:true};
      case 'oxy_up':case 'oxy_down':case 'oxy_stop':return st.oxy>0?{ok:true}:no('Sem ocitocina em curso');
      case 'oxy_start':return st.oxy===0&&!d?{ok:true}:no('Ocitocina já em curso');
      case 'paracet':return this.tmin()<st.paraUntil?no('Administrado há menos de 6 h'):{ok:true};
      case 'abx':return st.abx?no('Já iniciada'):{ok:true};
      case 'oximetro':return st.oxi?no('Já em curso'):{ok:true};
      case 'amnio':return st.membr==='íntegras'&&st.dil>=2?{ok:true}:no(st.membr!=='íntegras'?'Membranas já rotas':'Dilatação insuficiente');
      case 'eletrodo':return st.scalp?no('Já aplicado'):(st.membr!=='íntegras'&&st.dil>=2?{ok:true}:no('Requer membranas rotas e dilatação ≥2 cm'));
      case 'estim':return st.dil>=2?{ok:true}:no('Requer dilatação ≥2 cm');
      case 'lactato':return st.membr!=='íntegras'&&st.dil>=3?{ok:true}:no('Requer membranas rotas e dilatação ≥3 cm');
      case 'puxos_ini':return st.dil>=10&&!st.pushing&&!(d&&d.kind!=='inst')?{ok:true}:no(st.dil<10?'Dilatação incompleta':'Não disponível');
      case 'puxos_stop':return st.pushing?{ok:true}:no('Sem puxos em curso');
      case 'inst':return d?no('Decisão já tomada'):(st.dil>=10&&st.station>=1?{ok:true}:no('Requer dilatação completa e apresentação ≥ +1'));
      case 'ces1':case 'ces2':return d?no('Decisão já tomada'):{ok:true};
      case 'bloco':return this.flags.bloco!=null?no('Já transferida'):{ok:true};
      case 'ajuda':return this.flags.ajuda!=null?no('Já chamado'):{ok:true};
    }
    return{ok:true};
  }
  judge(id){
    const tr=this.truth(),st=this.st,f=this.cs.fet,A=this.acute,p10=this.e.contr10();
    const hyp=st.hypo,P=tr.figo==='P',S=tr.figo==='S',acute=A&&!A.resolved;
    const G=(r)=>({q:'good',r}),N=(r)=>({q:'neutral',r}),B=(r)=>({q:'bad',r});
    switch(id){
      case 'o2':return B('Uma meta-análise de 16 ensaios aleatorizados (Raghuraman et al., 2021) não mostrou melhoria do pH da artéria umbilical; a ACOG desaconselha oxigénio por rotina numa mãe bem oxigenada.');
      case 'oxy_up':return(tr.figo!=='N'||p10>=5||f.chronic)?B('Aumentar a ocitocina com traçado alterado, taquissistolia ou feto com pouca reserva agrava a hipoxia.'):N('Aceitável com traçado normal e menos de 5 contrações em 10 min.');
      case 'oxy_start':return(tr.figo!=='N'||f.chronic)?B('Iniciar ocitocina com traçado alterado ou feto comprometido não está indicado.'):N('Decisão obstétrica; vigiar a frequência das contrações.');
      case 'oxy_down':case 'oxy_stop':return(p10>5||P||S||(acute&&A.cause!=='hipotensao'))?G('Reduz a frequência das contrações e o stress hipóxico.'):N('Sem indicação fetal neste momento.');
      case 'fluidos':return hyp?G('Corrige a hipotensão materna.'):((f.fever||f.chronic)?B('Em normotensa e bem hidratada, os fluidos podem dar falsa segurança.'):N('Sem hipotensão materna documentada.'));
      case 'vaso':return hyp?G('Corrige rapidamente a hipotensão.'):B('Vasopressor sem hipotensão: hipertensão materna sem benefício fetal.');
      case 'terb':return(p10>5||(acute&&['hipertonia','prolapso','descolamento'].includes(A.cause))||tr.mech.includes('subaguda'))?G('Reduz a atividade uterina.'):N('Sem hiperestimulação evidente.');
      case 'lat_e':case 'lat_d':return(hyp||(acute&&A.cause==='hipotensao')||tr.cnt.variavel>=2)?G('Alivia a compressão aorto-cava e/ou do cordão.'):N('Sem efeito fetal esperado.');
      case 'vertical':return tr.cnt.variavel>=2?G('Pode aliviar a compressão do cordão.'):N('Sem efeito fetal esperado.');
      case 'genu':return(acute&&A.cause==='prolapso')?G('Reduz a compressão do cordão enquanto se prepara o parto.'):(tr.cnt.variavel>=2?G('Pode aliviar a compressão do cordão.'):N('Sem efeito fetal esperado.'));
      case 'dorsal':return(acute||hyp)?B('O decúbito dorsal agrava a compressão aorto-cava.'):N('Evitar decúbito dorsal prolongado.');
      case 'toque':return(acute||P)?G('Exclui prolapso e avalia condições para parto.'):N('Avaliação da progressão.');
      case 'vitais':return(acute||f.fever||P)?G('Procura de causas maternas.'):N('Registo de rotina.');
      case 'oximetro':return(this.e.p.mhrCapture||this.e.p.maternal)?G('Permite distinguir a FC materna da fetal.'):N('Boa prática: monitorizar sempre a FC materna.');
      case 'eletrodo':return(this.e.p.mhrCapture||this.e.p.loss>0)?G('Sinal fetal fiável.'):N('Sinal externo já adequado.');
      case 'eco':return(this.e.p.mhrCapture||f.sinus||acute)?G('Confirma a FCF e procura a causa.'):N('Sem alteração do plano.');
      case 'estim':return(acute&&this.e.pro)?B('Não está indicada durante uma desaceleração prolongada.'):(S||tr.cat==='reduzida'?G('Método adicional: uma aceleração torna a acidose improvável.'):N('Traçado já tranquilizador.'));
      case 'lactato':return(acute&&this.e.pro)?B('Atrasa a decisão numa desaceleração prolongada.'):(S||P?G('Método adicional de avaliação da oxigenação fetal.'):N('Sem indicação com traçado normal.'));
      case 'paracet':return st.temp>=37.8?G('Trata a febre materna; reduz a taquicardia fetal.'):N('Sem febre.');
      case 'abx':return(f.fever||st.temp>=37.8)?G('Suspeita de infeção intra-amniótica: antibioterapia.'):N('Sem indicação infecciosa.');
      case 'kb':return(f.sinus||(A&&A.cause==='descolamento'))?G('Ajuda a documentar a causa.'):N('Sem indicação específica.');
      case 'ajuda':case 'bloco':return(P||acute||f.sinus)?G('Prepara uma eventual decisão de parto.'):N('Sem urgência neste momento.');
      case 'puxos_stop':return(tr.mech.includes('subaguda')||P||tr.cnt.variavel>=2)?G('Interromper os puxos reduz o stress hipóxico.'):N('Sem indicação fetal.');
      case 'puxos_ini':return P?B('Com traçado patológico, os puxos agravam a hipoxia.'):N('Período expulsivo ativo.');
      case 'ces1':case 'ces2':case 'inst':{
        const accident=A&&ACCIDENTS.includes(A.cause);
        if(P||accident||f.sinus||f.chronic||(acute&&this.e.pro))return G('Indicação fetal para acelerar o parto.');
        if(tr.figo==='X')return B('Decisão sem confirmar a origem do sinal.');
        if(tr.figo==='N'&&st.pH>=7.2)return B('Sem indicação fetal: traçado normal.');
        return N('Indicação discutível; documentar a razão.');}
    }
    return N('');
  }
  act(id){
    const st=this.st,e=this.e,tm=this.tmin(),cs=this.cs,f=cs.fet,A=this.acute;
    const av=this.avail(id);if(!av.ok)return null;
    const j=this.judge(id);
    let txt='',res=null;
    const lab=ACT_LABEL[id];
    switch(id){
      case 'lat_e':case 'lat_d':case 'vertical':case 'genu':case 'dorsal':
        st.posicao=id;txt=`Posição: ${POS_LAB[id]}.`;
        if(st.hypo&&(id==='lat_e'||id==='lat_d'))e.at(60,()=>{st.tas+=7;st.tad+=4});
        if(id==='genu'&&A&&A.cause==='prolapso'&&e.pro)e.pro.drop=Math.max(48,e.pro.drop-18);
        break;
      case 'oxy_up':st.oxy+=2;this.flags.oxyTouched=1;txt=`Ocitocina aumentada para ${st.oxy} mU/min.`;break;
      case 'oxy_start':st.oxy=2;this.flags.oxyTouched=1;txt='Ocitocina iniciada a 2 mU/min.';break;
      case 'oxy_down':st.oxy=Math.max(0,Math.round(st.oxy/2));this.flags.oxyTouched=1;if(st.oxy===0)st.oxyStopAt=tm;txt=`Ocitocina reduzida para ${st.oxy} mU/min.`;break;
      case 'oxy_stop':st.oxy=0;st.oxyStopAt=tm;this.flags.oxyTouched=1;txt='Perfusão de ocitocina suspensa.';break;
      case 'fluidos':st.fluids+=500;txt='Bólus de 500 mL de lactato de Ringer em curso.';if(st.hypo)e.at(150,()=>{st.tas+=11;st.tad+=6});break;
      case 'vaso':txt='Efedrina 6 mg IV administrada pela anestesiologia.';if(st.hypo)e.at(80,()=>{st.tas=Math.max(st.tas,108);st.tad=Math.max(st.tad,64)});else{st.tas=Math.min(165,st.tas+28);st.tad+=14}break;
      case 'terb':st.tocoUntil=tm+25;st.terbUntil=tm+30;if(cs.on&&cs.on.terb)cs.on.terb(this);txt='Terbutalina 0,25 mg SC. Efeito esperado em 2–5 min; a FC materna vai subir.';
        if(A&&A.cause==='hipertonia'&&!A.resolved)e.at(150,()=>{if(this.acute===A&&!A.resolved){A.resolved=this.tmin();e.recover(30)}});break;
      case 'paracet':st.paraUntil=tm+360;txt='Paracetamol 1 g IV.';break;
      case 'abx':st.abx=true;txt='Antibioterapia IV iniciada conforme o protocolo de infeção intra-amniótica.';break;
      case 'o2':txt='Oxigénio por máscara facial a 10 L/min.';break;
      case 'vitais':this.recordVitals('pedido');txt='Sinais vitais avaliados.';break;
      case 'toque':{
        let t=`Dilatação ${Math.floor(st.dil)} cm, apresentação ${st.station>0?'+':''}${Math.round(st.station)}${st.pos&&st.pos!=='—'?', '+st.pos:''}, membranas ${st.membr}${st.membr!=='íntegras'?' (líquido '+st.liquido+')':''}.`;
        if(A&&A.cause==='prolapso'){t='Ansa de cordão palpável na vagina, pulsátil, à frente da apresentação. '+t;this.flags.dxProlapso=1}
        const extra=cs.on&&cs.on.toque&&cs.on.toque(this);if(extra)t=extra+' '+t;
        txt='Exame vaginal realizado.';res=t;break;}
      case 'oximetro':st.oxi=true;txt='Oxímetro aplicado: FC materna registada no papel (linha vermelha).';break;
      case 'eco':txt='Ecografia realizada.';res=(this.e.p.mhrCapture&&st.pushing)?cs.eco:(cs.eco||'Sem alterações.');
        if(A&&A.cause==='prolapso')res='FCF lenta (~70 bpm). Ansa de cordão à frente da apresentação.';break;
      case 'amnio':{const h=cs.on&&cs.on.amnio;if(h)h(this);else{st.membr='rotas';st.liquido='claro';this.msg('Enf.ª','Amniotomia realizada: líquido claro.')}txt='Amniotomia.';break;}
      case 'eletrodo':st.scalp=true;txt='Elétrodo de escalpe aplicado: sinal fetal (ECG) de boa qualidade.';break;
      case 'estim':{txt='Estimulação digital do escalpe fetal.';
        const resp=st.pH>7.24&&!this.terminal&&!e.pro;
        e.at(20,()=>{if(resp){const a={s:e.t,d:30,a:22};e.as.push(a);e.alog.push(a)}});
        e.at(60,()=>this.msg('Resultado',resp?'Aceleração após estimulação do escalpe: resposta tranquilizadora.':'Sem aceleração após estimulação do escalpe.',{kind:'res'}));break;}
      case 'lactato':{txt='Colheita de sangue do escalpe para lactato.';
        e.at(10*MIN,()=>{const l=Math.round(Math.max(1.4,1.8+(7.30-st.pH)*32)*10)/10;const cl=l>4.8?'anormal (>4,8)':l>=4.2?'pré-patológico (4,2–4,8)':'normal (<4,2)';
          this.msg('Resultado',`Lactato do escalpe ${String(l).replace('.',',')} mmol/L: ${cl}.`,{kind:'res',pause:true})});break;}
      case 'kb':txt='Análises pedidas.';e.at(25*MIN,()=>this.msg('Resultado',cs.lab||(A&&A.cause==='descolamento'?'Hb 9,1 g/dL; plaquetas 96 000/µL; fibrinogénio 1,7 g/L.':'Hb 11,8 g/dL; plaquetas 214 000/µL; coagulação normal.'),{kind:'res'}));break;
      case 'ajuda':this.flags.ajuda=tm;txt='Obstetra sénior chamada.';e.at(3*MIN,()=>this.msg('Dr.ª Helena Matos','Cheguei. O que temos?'));break;
      case 'bloco':this.flags.bloco=tm;txt='Bloco operatório avisado; transferência da parturiente.';break;
      case 'puxos_ini':this.flags.noPush=0;this.startPushing('user');txt='Puxos dirigidos.';break;
      case 'puxos_stop':st.pushing=false;this.flags.noPush=tm;txt='Puxos suspensos.';break;
      case 'ces1':case 'ces2':case 'inst':{const eta=this.decide(id);txt=`${lab}: nascimento previsto às ${this.clock(e.t+eta*60)} (${eta} min).`;break;}
    }
    const n=e.mark(lab);
    const rec={n,id,lab,tm,clock:this.clock(),txt,res,q:j.q,why:j.r,truth:{figo:this.truth().figo}};
    this.acts.push(rec);
    return rec;
  }
}
const ACTS=[
  ['Posição',[['lat_e','Decúbito lateral esquerdo'],['lat_d','Decúbito lateral direito'],['vertical','Sentada / vertical'],['genu','Genupeitoral'],['dorsal','Decúbito dorsal']]],
  ['Ocitocina',[['oxy_up','Aumentar 2 mU/min'],['oxy_down','Reduzir para metade'],['oxy_stop','Suspender'],['oxy_start','Iniciar a 2 mU/min']]],
  ['Terapêutica',[['fluidos','Bólus de cristaloides 500 mL'],['vaso','Vasopressor (anestesiologia)'],['terb','Tocólise: terbutalina SC'],['paracet','Paracetamol 1 g IV'],['abx','Antibioterapia IV'],['o2','Oxigénio por máscara']]],
  ['Avaliação',[['vitais','Sinais vitais maternos'],['toque','Exame vaginal'],['oximetro','Oxímetro (FC materna)'],['eco','Ecografia'],['amnio','Amniotomia'],['eletrodo','Elétrodo de escalpe'],['estim','Estimulação do escalpe'],['lactato','Lactato do escalpe'],['kb','Análises (hemograma, Kleihauer, coagulação)']]],
  ['Equipa e parto',[['ajuda','Chamar obstetra sénior'],['bloco','Transferir para o bloco'],['puxos_ini','Iniciar puxos'],['puxos_stop','Suspender puxos'],['inst','Parto vaginal instrumentado'],['ces2','Cesariana urgente (cat. 2)'],['ces1','Cesariana emergente (cat. 1)']]],
];
const ACT_LABEL=Object.fromEntries(ACTS.flatMap(g=>g[1]));

/* ---------- avaliação final ---------- */
function evaluate(sim){
  const A=sim.acts,crit=[],dur=sim.outcome?sim.outcome.tm:sim.tmin();
  const has=(ids,a,b)=>A.find(x=>ids.includes(x.id)&&x.tm>=a&&x.tm<=b);
  const tfmt=m=>sim.clock(sim.t0+m*60);
  // revisões
  const needRev=Math.max(1,Math.floor(dur/60));
  crit.push({k:'Revisão sistemática do CTG',ok:sim.reviews.length>=needRev,d:`${sim.reviews.length} revisão(ões) estruturada(s) em ${Math.round(dur)} min (mínimo ${needRev}, uma por hora).`});
  // taquissistolia
  const H=sim.hist.filter(h=>h.tm>=0);
  const tq=H.find(h=>h.per10>5&&h.oxy>0);
  if(tq){const a=has(['oxy_down','oxy_stop','terb'],tq.tm-5,tq.tm+15);crit.push({k:'Atuação perante taquissistolia com ocitocina',ok:!!a,d:a?`Taquissistolia às ${tfmt(tq.tm)}; ${a.lab.toLowerCase()} às ${a.clock}.`:`Taquissistolia às ${tfmt(tq.tm)} sem redução da ocitocina nem tocólise nos 15 min seguintes.`})}
  const upBad=A.filter(x=>(x.id==='oxy_up'||x.id==='oxy_start')&&x.q==='bad');
  if(upBad.length)crit.push({k:'Ocitocina num feto com sinais de stress',ok:false,d:`Ocitocina aumentada/iniciada às ${upBad.map(x=>x.clock).join(', ')} com traçado alterado ou taquissistolia.`});
  if(sim.cs.protocolOxy){const proto=sim.feed.filter(m=>/conforme o protocolo/.test(m.text));const touched=A.find(x=>x.id.startsWith('oxy_'));if(proto.length>=2&&!touched)crit.push({k:'Supervisão do protocolo de ocitocina',ok:false,d:`A ocitocina foi aumentada ${proto.length} vezes pela enfermagem sem reavaliação médica.`})}
  // eventos agudos
  const acutes=[...sim.acuteHist,...(sim.acute?[sim.acute]:[])];
  for(const ac of acutes){
    const t0=ac.cause==='descolamento'?ac.start+4:ac.start,acc=ACCIDENTS.includes(ac.cause);
    const NAME={hipotensao:'hipotensão materna',hipertonia:'hipertonia uterina',prolapso:'prolapso do cordão',rotura:'rotura uterina',descolamento:'descolamento da placenta'}[ac.cause];
    const a1=has(['toque','vitais','lat_e','lat_d','genu','ajuda','eco','oxy_stop'],t0,t0+4);
    crit.push({k:`Reconhecimento precoce (${NAME})`,ok:!!a1,d:a1?`Primeira ação dirigida às ${a1.clock} (${Math.max(0,Math.round(a1.tm-t0))} min).`:'Sem avaliação dirigida nos primeiros 4 min.'});
    if(!acc){
      const fix=ac.cause==='hipotensao'?['fluidos','vaso']:['oxy_stop','terb'];
      const a2=has(fix,t0,t0+6);crit.push({k:'Correção da causa reversível',ok:!!a2,d:a2?`${a2.lab} às ${a2.clock}.`:`Sem ${ac.cause==='hipotensao'?'fluidos/vasopressor':'suspensão da ocitocina/tocólise'} nos primeiros 6 min.`});
      if(ac.resolved){const late=A.find(x=>['ces1','ces2'].includes(x.id)&&x.tm>ac.resolved+2&&x.q!=='good');if(late)crit.push({k:'Evitar cesariana após recuperação',ok:false,d:`Cesariana decidida às ${late.clock} depois da recuperação do traçado.`})}
      else{const a3=has(['ces1','inst','ces2'],t0,t0+11);crit.push({k:'Decisão de parto sem recuperação (regra 3-6-9-12-15)',ok:!!a3,d:a3?`Decisão às ${a3.clock}.`:'Sem decisão de parto até aos 11 min de desaceleração.'})}
    }else{
      const a3=has(['ces1','inst'],t0,t0+10);crit.push({k:'Parto imediato num acidente agudo',ok:!!a3,d:a3?`${a3.lab} decidida às ${a3.clock} (${Math.round(a3.tm-t0)} min após o início).`:'Sem decisão de parto emergente nos 10 min seguintes.'});
      const tb=has(['tocolise','terb','fluidos','lactato','estim'],t0,t0+15);if(tb&&tb.id==='lactato')crit.push({k:'Evitar atrasos com métodos adicionais',ok:false,d:'Colheita de lactato durante um acidente agudo atrasa o parto.'});
    }
  }
  // traçado patológico persistente
  const evals=[];for(let tm=0;tm<=dur;tm+=2.5){const t=sim.truthAt(sim.t0+tm*60);if(t)evals.push({tm,figo:t.figo,mech:t.mech})}
  const pStart=evals.find(x=>x.figo==='P'&&!x.mech.includes('nao_hipoxica'));
  if(pStart&&!acutes.some(a=>Math.abs(a.start-pStart.tm)<15)){
    const a=has(['oxy_stop','oxy_down','terb','puxos_stop','lat_e','lat_d','ajuda','ces1','ces2','inst','estim','lactato','abx'],pStart.tm-5,pStart.tm+30);
    crit.push({k:'Atuação perante traçado patológico',ok:!!a,d:a?`Patológico desde as ${tfmt(pStart.tm)}; ${a.lab.toLowerCase()} às ${a.clock}.`:`Traçado patológico desde as ${tfmt(pStart.tm)} sem atuação nos 30 min seguintes.`});
  }
  // descompensação
  const dec=H.find(h=>h.pH<7.10&&!h.pro);
  if(dec){const d=sim.decision;crit.push({k:'Parto antes da descompensação fetal',ok:!!(d&&d.at<=dec.tm+10),d:d?`Decisão às ${tfmt(d.at)}; sinais de descompensação desde as ${tfmt(dec.tm)}.`:`Sinais de descompensação desde as ${tfmt(dec.tm)} sem decisão de parto.`})}
  // febre
  const fev=H.find(h=>h.temp>=38);
  if(fev){const a=has(['abx'],fev.tm-30,fev.tm+60);crit.push({k:'Febre intraparto: antibioterapia',ok:!!a,d:a?`Antibioterapia às ${a.clock}.`:`Temperatura ≥38 °C desde as ${tfmt(fev.tm)} sem antibioterapia na hora seguinte.`})}
  // sinal materno
  if(sim.cs.fet.mhrCapture&&sim.st.pushStart!=null){const a=has(['oximetro','eletrodo','eco'],sim.st.pushStart-30,sim.st.pushStart+18);crit.push({k:'Confirmar a origem do sinal no expulsivo',ok:!!a,d:a?`${a.lab} às ${a.clock}.`:'O registo materno não foi identificado nos primeiros 18 min de puxos.'})}
  // sinusoidal
  if(sim.cs.fet.sinus){const a=has(['ces1','ces2'],0,90),b=has(['eco','kb'],0,90);crit.push({k:'Padrão sinusoidal: avaliação e decisão',ok:!!(a&&b),d:`${b?'Avaliação da anemia às '+b.clock:'Sem ecografia/análises'}; ${a?'decisão de parto às '+a.clock:'sem decisão de parto'}.`})}
  // intervenções sem evidência e decisões injustificadas
  const bads=A.filter(x=>['o2','fluidos','vaso'].includes(x.id)&&x.q==='bad');
  crit.push({k:'Sem intervenções sem evidência (O₂, fluidos/vasopressor sem hipotensão)',ok:!bads.length,d:bads.length?bads.map(x=>`${x.lab} às ${x.clock}`).join('; '):'Nenhuma.'});
  const badDel=A.find(x=>['ces1','ces2','inst'].includes(x.id)&&x.q==='bad');
  if(badDel)crit.push({k:'Decisão de parto justificada',ok:false,d:`${badDel.lab} às ${badDel.clock}: ${badDel.why}`});
  // revisões
  let rp=0,rt=0;sim.reviews.forEach(r=>{rp+=r.score;rt+=r.max});
  const revPct=rt?rp/rt:0;
  const cPass=crit.filter(c=>c.ok).length,cPct=crit.length?cPass/crit.length:0;
  const o=sim.outcome;let oPts=0;
  if(o&&o.born){oPts=o.pHa>=7.2?30:o.pHa>=7.1?22:o.pHa>=7.0?12:0;if(sim.cs.fet.sinus)oPts=sim.decision?30:8;if(sim.cs.fet.fever&&!sim.st.abx)oPts=Math.max(0,oPts-10)}
  if(badDel)oPts=Math.max(0,oPts-12);
  const score=Math.round(cPct*40+revPct*30+oPts);
  return{crit,revPct,cPct,oPts,score,evals};
}
