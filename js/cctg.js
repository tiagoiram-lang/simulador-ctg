/* Apoio computorizado («humano + máquina») nos traçados reais.
   Indicadores calculados sobre os 30 min anteriores e risco de acidemia a partir das faixas observadas nos 552 partos CTU-UHB.
   Os mesmos cálculos foram feitos em Python sobre os 552 registos (prep/model2.py): AUC 0,64 para pH < 7,15. */
const AID_L={meio:'Metade dos casos, ao acaso (estudo)',sempre:'Sempre',nunca:'Nunca'};
function aidMode(){return store('ctg-aid')||'meio'}
function aidDraw(){const m=aidMode();return m==='sempre'||(m==='meio'&&Math.random()<.5)}
function sigF(m){if(m._F)return m._F;const raw=atob(m.b64),n=m.n,F=new Uint8Array(n);for(let k=0;k<n;k++)F[k]=raw.charCodeAt(k);m._F=F;return F}
/* t em segundos desde o início do registo (amostras de 1 Hz) */
function cctgFeats(m,t){
  const F=sigF(m),bl=m.bl,dd=m.dd||[];t=Math.min(t,m.n);const w0=Math.max(0,t-1800);let a=0;
  const inD=new Uint8Array(t);
  for(const d of dd){const [s,e]=d;if(e<w0||s>=t)continue;
    for(let k=Math.max(s,w0);k<=Math.min(e,t-1);k++){const f=F[k],b=bl[Math.min(bl.length-1,Math.floor(k/60))];if(f>0&&f<b)a+=b-f}
    for(let k=Math.max(s,0);k<Math.min(e+1,t);k++)inD[k]=1}
  a/=60;
  const ep=[];for(let k=w0;k<t-3;k+=4){let s=0,c=0;for(let j=k;j<k+4;j++)if(F[j]>0&&!inD[j]){s+=F[j];c++}ep.push(c>=2?s/c:null)}
  const df=[];for(let i=1;i<ep.length;i++)if(ep[i]!=null&&ep[i-1]!=null)df.push(Math.abs(ep[i]-ep[i-1]));
  const stv=df.length>=20?df.reduce((x,y)=>x+y,0)/df.length:null;
  const bs=bl.slice(Math.floor(w0/60),Math.max(Math.floor(w0/60)+1,Math.floor(t/60))).slice().sort((x,y)=>x-y),base=bs[Math.floor(bs.length/2)];
  const nd=dd.filter(d=>d[0]>=w0&&d[0]<t).length,deep=dd.filter(d=>d[0]>=w0&&d[0]<t&&d[3]>=40).length;
  let miss=0;for(let k=w0;k<t;k++)if(F[k]===0)miss++;miss/=Math.max(1,t-w0);
  return{a30:a,stv,base,nd,deep,miss};
}
const pctOf=(arr,v)=>{if(!arr||v==null)return null;let k=0;while(k<arr.length&&arr[k]<=v)k++;return Math.round(k/arr.length*100)};
function cctgRisk(f){const M=R.meta&&R.meta.cctg;if(!M)return null;let q=0;while(q<4&&f.a30>M.cuts[q])q++;return{q,ac:M.bands[q].ac,sev:M.bands[q].sev,alert:q===4}}
function cctgHTML(m,t){
  const M=R.meta&&R.meta.cctg;if(!M)return'';
  const f=cctgFeats(m,t),r=cctgRisk(f),p=Math.round(r.ac*100),prev=Math.round(M.prev*100);
  const lvl=r.q===4?['Alto','bad']:r.q===3?['Intermédio','warn']:['Baixo','good'];
  return`<div class="cctg"><div class="cchead"><h3>Apoio computorizado</h3><span class="ccsub">últimos 30 min</span></div>
    <div class="ccrisk"><div><span class="cck">Risco estimado de acidemia</span><span class="ccv ${lvl[1]}">${p}%</span><span class="cclvl ${lvl[1]}">${lvl[0]}${r.alert?' · alerta':''}</span></div>
      <div class="ccbar"><div style="width:${Math.min(100,p*2)}%"></div><i style="left:${prev*2}%" title="média da base"></i></div><span class="small">a linha marca a média da base (${prev}%)</span></div>
    <dl class="ccdl">
      <dt>Área de desacelerações</dt><dd>${num(f.a30,0)} bpm·min <small>percentil ${pctOf(M.a30Sorted,f.a30)}</small></dd>
      <dt>Desacelerações</dt><dd>${f.nd} <small>${f.deep} com ≥ 40 bpm</small></dd>
      <dt>Linha de base</dt><dd>${f.base} bpm</dd>
      <dt>Variabilidade de curto prazo</dt><dd>${f.stv==null?'—':num(f.stv,1)+' bpm'} ${f.stv==null?'':`<small>percentil ${pctOf(M.stvSorted,f.stv)}</small>`}</dd>
      <dt>Sinal em falta</dt><dd>${Math.round(f.miss*100)}%${f.miss>.3?' <small class="qwarn">pouco fiável</small>':''}</dd></dl>
    <p class="small ccnote">Estimativa a partir da área de desacelerações em 552 partos reais. Quando dá alerta, deteta cerca de ${Math.round(M.alert.sens*100)}% das acidemias e ${Math.round((1-M.alert.ppv)*100)}% dos alertas são falsos (AUC ${num(M.auc,2)}). Use-a como segunda opinião, não como decisão.</p></div>`;
}
function aidSelHTML(id){return`<label class="aidsel small">Apoio computorizado <select id="${id}">${Object.entries(AID_L).map(([k,l])=>`<option value="${k}" ${k===aidMode()?'selected':''}>${l}</option>`).join('')}</select></label>`}
function aidBind(id,after){const s=document.getElementById(id);if(s)s.onchange=e=>{store('ctg-aid',e.target.value);if(after)after()}}
/* comparação com e sem apoio */
function aidCompare(list,kind){
  const w=list.filter(x=>x.aj===true),wo=list.filter(x=>x.aj===false);if(!w.length&&!wo.length)return'';
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const row=(L)=>{if(kind==='caso'){const ac=L.filter(x=>x.pH<7.15),acD=ac.filter(x=>x.del!=null),ok=L.filter(x=>x.pH>=7.2),okD=ok.filter(x=>x.del!=null);return[L.length,pct(acD.length,ac.length),pct(okD.length,ok.length)]}
    const tp=L.filter(x=>x.ac&&x.pH<7.15).length,fn=L.filter(x=>!x.ac&&x.pH<7.15).length,tn=L.filter(x=>!x.ac&&x.pH>=7.15).length,fp=L.filter(x=>x.ac&&x.pH>=7.15).length;return[L.length,pct(tp,tp+fn),pct(tn,tn+fp)]};
  const h=kind==='caso'?['Casos','Acidemias com decisão de parto','Partos sem benefício fetal']:['Traçados','Sensibilidade','Especificidade'];
  const a=row(w),b=row(wo);
  return`<h4 class="eg">Com e sem apoio computorizado</h4><table class="hist"><thead><tr><th></th>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>
    <tr><td>Com apoio</td>${a.map(x=>`<td class="n">${x}</td>`).join('')}</tr><tr><td>Sem apoio</td>${b.map(x=>`<td class="n">${x}</td>`).join('')}</tr></tbody></table>
    <p class="small">Num estudo aleatorizado com 211 clínicos (Oxford), o apoio computorizado subiu a sensibilidade de 49% para 62% sem perder especificidade. Com poucos casos, as diferenças aqui ainda são ruído.</p>`;
}
