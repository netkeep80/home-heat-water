import {validateNetwork,structuralPath} from "./network.js";
import {storedHeatKWh} from "./thermal.js";
const el=id=>document.getElementById(id);
const NS="http://www.w3.org/2000/svg";
let original,model,selected=null,overrides={};
const create=(tag,attrs={})=>{const s=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))s.setAttribute(k,String(v));return s;};
const text=(x,y,value)=>{const t=create("text",{x,y});t.textContent=value;return t;};
function valveState(id){return overrides[id]??model.scenarios[el("scenario").value]?.valves?.[id]??"closed"}
function rawInspector(kind,id){selected={kind,id};el("inspector").textContent=JSON.stringify(kind==="node"?model.nodes[id]:model.links[id],null,2);draw();}
function draw(){
 const svg=el("diagram");svg.replaceChildren();
 const zoom=Number(el("zoom").value)/100;
 const w=1180/zoom,h=570/zoom;
 svg.setAttribute("viewBox",`${(1180-w)/2} ${(570-h)/2} ${w} ${h}`);
 for(const [id,c] of Object.entries(model.links)){
  const a=c.a.split(".")[0],b=c.b.split(".")[0];const p=model.nodes[a]?.view,q=model.nodes[b]?.view;
  if(!p||!q)continue;
  const line=create("line",{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:"edge"+(selected?.kind==="link"&&selected.id===id?" selected":"")});
  const tooltip=create("title");tooltip.textContent=`${id}: ${c.a} ↔ ${c.b} (${c.evidence})`;
  line.append(tooltip);line.onclick=()=>rawInspector("link",id);svg.append(line);
 }
 for(const [id,n] of Object.entries(model.nodes)){
  const group=create("g",{class:"node"+(selected?.kind==="node"&&selected.id===id?" selected":""),transform:`translate(${n.view.x},${n.view.y})`});
  const rect=create("rect",{x:-75,y:-22,width:150,height:44});group.append(rect);
  const label=n.name.length>22?n.name.slice(0,21)+"…":n.name;
  group.append(text(0,4,label));
  const sub=create("title");sub.textContent=`${id}: ${n.kind}, ${n.evidence}`;group.append(sub);
  group.onclick=()=>rawInspector("node",id);svg.append(group);
 }
}
function evaluate(){
 const err=validateNetwork(model);
 if(!err.ok){el("errors").textContent="INVALID: "+err.errors.join("; ");el("diagnosis").textContent="Модель некорректна";return;}
 el("errors").textContent="JSON корректен структурно (не означает физическую достоверность).";
 const name=el("scenario").value;
 const current=structuredClone(model);
 current.scenarios[name].valves={...current.scenarios[name].valves,V_MAIN:valveState("V_MAIN"),V_BYPASS:valveState("V_BYPASS")};
 const path=current.checks.demo_path;
 const check=structuralPath(current,name,path.from,path.to);
 const d=el("diagnosis");d.className=check.status==="PASS"?"result ok":check.status==="FAIL"?"result bad":"result unknown";
 d.textContent=`${check.status}: ${check.reasons.join(", ")}. Реальная циркуляция: UNKNOWN.`;
 const storage=model.nodes.STORE;
 const dt=model.assumptions.delta_temperature_k;
 el("energy").textContent=typeof storage.volume_l==="number"&&typeof dt==="number"?
 `Идеальный запас воды: ${storedHeatKWh(storage.volume_l,dt).toFixed(2)} кВт·ч (V=${storage.volume_l} л, ΔT=${dt} К; потери, отбор и стратификация не учтены).`:
 "Энергия: UNKNOWN (нет объёма или ΔT).";
 draw();
}
function refreshOptions(){
 const s=el("scenario"),old=s.value;s.replaceChildren();
 for(const [id,val] of Object.entries(model.scenarios)){const o=document.createElement("option");o.value=id;o.textContent=val.label;s.append(o);}
 s.value=old&&model.scenarios[old]?old:Object.keys(model.scenarios)[0];overrides={};
 sync();
}
function sync(){for(const [dom,name] of [["valve1","V_MAIN"],["valve2","V_BYPASS"]])el(dom).value=valveState(name);evaluate();}
async function start(){
 original=await (await fetch("./model.json")).json();model=structuredClone(original);
 el("json").value=JSON.stringify(model,null,2);
 refreshOptions();
 el("scenario").onchange=()=>{overrides={};sync();};
 el("zoom").oninput=draw;
 for(const [dom,id] of [["valve1","V_MAIN"],["valve2","V_BYPASS"]])el(dom).onchange=()=>{overrides[id]=el(dom).value;evaluate();};
 el("reset").onclick=()=>{model=structuredClone(original);el("json").value=JSON.stringify(model,null,2);selected=null;refreshOptions();};
 el("apply").onclick=()=>{try{const candidate=JSON.parse(el("json").value);const r=validateNetwork(candidate);if(!r.ok){el("errors").textContent=r.errors.join("; ");return;}model=candidate;selected=null;refreshOptions();}catch(e){el("errors").textContent=String(e);}};
 el("export").onclick=()=>{const blob=new Blob([JSON.stringify(model,null,2)+"\n"],{type:"application/json"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download="topology-edit.json";a.click();URL.revokeObjectURL(u);};
}
start().catch(err=>el("errors").textContent="Не удалось загрузить модель: "+err);
