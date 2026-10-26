/**
 * Small, domain-owned topology evaluator. Structural connectivity only:
 * NO inference of fluid direction, capacity, hydraulic performance or safety.
 */
export type Medium = "heating_water" | "potable_water" | "electric" | "signal";
export type NodeKind = "storage" | "junction" | "valve" | "strainer" | "pump" | "gauge" | "heater" | "radiator" | "exchanger";
export interface NetworkNode {
  kind: NodeKind;
  name: string;
  ports: Record<string, Medium>;
  view: {x:number;y:number};
  evidence: string;
  volume_l?: number;
}
export interface NetworkLink {
  a:string; b:string; kind:string; medium:Medium; evidence:string;
  inner_diameter_mm?:number; length_m?:number; elevation_change_m?:number;
}
export interface NetworkScenario {label:string; valves:Record<string,"open"|"closed">}
export interface Network {
  format:string; id:string; status:string; note:string;
  nodes:Record<string,NetworkNode>;
  links:Record<string,NetworkLink>;
  scenarios:Record<string,NetworkScenario>;
  checks:{demo_path:{from:string;to:string}};
  assumptions:{delta_temperature_k:number};
}
export interface Diagnosis {ok:boolean; errors:string[]}
const id = /^[A-Za-z][A-Za-z0-9_-]*$/;
const types = new Set(["storage","junction","valve","strainer","pump","gauge","heater","radiator","exchanger"]);
const media = new Set(["heating_water","potable_water","electric","signal"]);
export function splitPort(key:string):[string,string]|null {
  const i=key.indexOf(".");
  if (i < 1 || i === key.length-1 || key.indexOf(".",i+1)!==-1) return null;
  return [key.slice(0,i),key.slice(i+1)];
}
export function validateNetwork(model:Network):Diagnosis {
  const errors:string[]=[];
  if (!model || model.format!=="home-topology/v0") return {ok:false,errors:["Unsupported topology format"]};
  const nodes=model.nodes||{}, links=model.links||{};
  if (!model.id || typeof model.id!=="string") errors.push("Model id is missing");
  if (!model.status) errors.push("Source status missing");
  for (const [name,n] of Object.entries(nodes)) {
    if (!id.test(name)) errors.push("Invalid node ID "+name);
    if (!types.has(n.kind)) errors.push("Unknown node kind "+name);
    if (!n.ports || !Object.keys(n.ports).length) errors.push("No ports on "+name);
    for (const [port,medium] of Object.entries(n.ports||{})) {
      if (!id.test(port)||!media.has(medium)) errors.push("Invalid port "+name+"."+port);
    }
    if (!n.view||!Number.isFinite(n.view.x)||!Number.isFinite(n.view.y)) errors.push("Missing view coordinates for "+name);
    if (n.volume_l!==undefined && (!Number.isFinite(n.volume_l)||n.volume_l<=0)) errors.push("Invalid volume for "+name);
  }
  const endpoints = (name:string):Medium|undefined => {
    const parsed=splitPort(name);if (!parsed) return undefined;
    return nodes[parsed[0]]?.ports?.[parsed[1]];
  };
  for (const [name,l] of Object.entries(links)) {
    if (!id.test(name)) errors.push("Invalid link ID "+name);
    if (l.a===l.b) errors.push("Self connection "+name);
    const ma=endpoints(l.a),mb=endpoints(l.b);
    if (!ma) errors.push("Unknown endpoint "+name+" "+l.a);
    if (!mb) errors.push("Unknown endpoint "+name+" "+l.b);
    if (!media.has(l.medium)||ma && ma!==l.medium || mb && mb!==l.medium) errors.push("Medium mismatch "+name);
    if (l.inner_diameter_mm!==undefined && (!Number.isFinite(l.inner_diameter_mm)||l.inner_diameter_mm<=0)) errors.push("Invalid diameter "+name);
    if (l.length_m!==undefined && (!Number.isFinite(l.length_m)||l.length_m<0)) errors.push("Invalid length "+name);
    if (!l.evidence) errors.push("Link provenance missing "+name);
  }
  for (const [name,s] of Object.entries(model.scenarios||{})) {
    for (const [valve,state] of Object.entries(s.valves||{})) {
      if (nodes[valve]?.kind!=="valve" || !["open","closed"].includes(state))
        errors.push("Invalid valve state "+name+" "+valve);
    }
  }
  for (const point of [model.checks?.demo_path?.from, model.checks?.demo_path?.to]) if(!point||!endpoints(point)) errors.push("Unknown check endpoint "+point);
  return {ok:errors.length===0,errors};
}
function adjacency(model:Network,scenario:string):Map<string,Set<string>> {
  const edges=new Map<string,Set<string>>();
  const connect=(a:string,b:string)=>{if(!edges.has(a))edges.set(a,new Set());if(!edges.has(b))edges.set(b,new Set());edges.get(a)!.add(b);edges.get(b)!.add(a);};
  for(const l of Object.values(model.links))connect(l.a,l.b);
  const valves=model.scenarios[scenario].valves;
  for(const [name,node] of Object.entries(model.nodes)){
    // Mixing chambers and non-isolating inline parts: structural passage, not flow guarantee.
    if(!["junction","valve","strainer","pump","radiator"].includes(node.kind))continue;
    if(node.kind==="valve" && valves[name]!=="open")continue; // fail closed if state not declared
    const ports=Object.entries(node.ports);
    for(let i=0;i<ports.length;i++)for(let j=i+1;j<ports.length;j++){
      if(ports[i][1]===ports[j][1])connect(name+"."+ports[i][0],name+"."+ports[j][0]);
    }
  }
  return edges;
}
/** Reachability only. Returns structural YES/NO, NEVER proof of actual circulation. */
export function structuralPath(model:Network,scenario:string,from:string,to:string) {
  const valid=validateNetwork(model);
  if(!valid.ok) return {status:"UNKNOWN" as const,reasons:valid.errors,visited:[] as string[]};
  if(!model.scenarios[scenario])return {status:"UNKNOWN" as const,reasons:["Unknown scenario"],visited:[] as string[]};
  const edges=adjacency(model,scenario),queue=[from],visited=new Set([from]);
  while(queue.length){
    const next=queue.shift()!;
    for(const t of edges.get(next)||[])if(!visited.has(t)){visited.add(t);queue.push(t);}
  }
  return {status:visited.has(to)?"PASS" as const:"FAIL" as const,
    reasons:[visited.has(to)?"Structurally connected; hydraulic capacity UNKNOWN":"No structural path under selected valve states"],
    visited:[...visited]};
}
