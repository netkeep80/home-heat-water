#!/usr/bin/env node
// RepoGuard v5 Projection/MDDB consumer: authoritative Requirements + authored presentation model -> README.
// All projection identities are content addressed; no README source duplication and no network access.
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(resolve(root,p),"utf8");
const sha=(s)=>createHash("sha256").update(s,"utf8").digest("hex");
const CONTRACT="home-heat-water/readme-md-db/v1";
const TOOL="home-heat-water/readme-generator@1";
const MODEL="model/readme-model.json";
const STATE=".repo-guard/projections.json";
const ID="home-heat-water.docs.readme";
const model=JSON.parse(read(MODEL));
if(model.schema!=="home-heat-water/readme-model/v1"||!Array.isArray(model.sections)||!Array.isArray(model.requirement_ids))
 throw Error("Invalid README presentation model");
if(new Set(model.requirement_ids).size!==model.requirement_ids.length)throw Error("Repeated requirement ID");
const requirements=model.requirement_ids.map(id=>{
 if(!/^[A-Za-z][A-Za-z0-9._:-]*$/.test(id))throw Error("Invalid Requirement ID "+id);
 const src=read("requirements/"+id+".rg.yaml");
 const storedId=/^id:\s*([^\s#]+)\s*$/m.exec(src)?.[1];
 // The consumer contract currently accepts one-line JSON-quoted normative YAML scalars, fail closed otherwise.
 const literal=/^normative:\s*("(?:\\.|[^"\\])*")\s*$/m.exec(src)?.[1];
 if(storedId!==id||!literal)throw Error("Canonical Requirement "+id+" is not a supported quoted normative scalar");
 return {id,normative:JSON.parse(literal)};
});
export function renderReadme(){
 const parts=[
 "<!-- GENERATED: RepoGuard Projection/MDDB; edit model/readme-model.json or canonical requirements, not README.md -->",
 "# "+model.title,"",model.intro.trim(),"",
 ...model.sections.flatMap(s=>["## "+s.heading,"",s.body.trim(),""]),
 "## "+model.normative_heading,"",model.normative_intro,"",
 ...requirements.flatMap(x=>["### "+x.id,"",x.normative,""])
 ];
 return parts.join("\n");
}
export function expectedProjectionState(){
 const original=JSON.parse(read(STATE));
 if(original.schema!=="repo-guard/projection-check/v0"||original.entries.length!==1)throw Error("Unexpected Projection state");
 const m=original.entries[0].model;
 const sources=[...m.sources].sort((a,b)=>a.id.localeCompare(b.id,"en"));
 const normalized={
  schema:"repo-guard/projection-model/v0",id:m.id,
  sources:sources.map(s=>({id:s.id,kind:s.kind,path:s.path,algorithm:s.algorithm})),
  target:{path:m.target.path,ownership:m.target.ownership},
  generator:{contract_id:m.generator.contract_id},required_evidence:[...m.required_evidence].sort()
 };
 return {schema:original.schema,entries:[{
  state:"live",model:normalized,
  build:{
   schema:"repo-guard/projection-build-record/v0",
   projection_id:ID,
   model_identity:sha(JSON.stringify(normalized)),
   source_identities:sources.map(s=>({source_id:s.id,algorithm:"sha256",digest:sha(read(s.path))})),
   generator:{contract_id:CONTRACT,tool_identity:TOOL},
   configuration_digest:sha(CONTRACT),
   output_identity:{algorithm:"sha256",digest:sha(renderReadme())},
   evidence:[]
  },
  current_generator:{tool_identity:TOOL,configuration_digest:sha(CONTRACT)}
 }]};
}
export function verifyReadme(){
 if(read("README.md")!==renderReadme())throw Error("GENERATED README drift: run node scripts/render-readme.mjs --outputs");
 if(JSON.stringify(JSON.parse(read(STATE)))!==JSON.stringify(expectedProjectionState()))throw Error("STALE RepoGuard Projection BuildRecord");
 return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2]??"--check";
 if(mode==="--check"){verifyReadme();console.log("README Projection: CURRENT");}
 else if(mode==="--outputs")process.stdout.write(JSON.stringify({[ID]:renderReadme()})+"\n");
 else if(mode==="--state")process.stdout.write(JSON.stringify(expectedProjectionState(),null,2)+"\n");
 else if(mode==="--readme")process.stdout.write(renderReadme());
 else throw Error("Expected --check, --outputs, --state or --readme");
}
