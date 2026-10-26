import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderReadme, expectedProjectionState,verifyReadme} from "../scripts/render-readme.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("README is a current RepoGuard v5 generated whole-file Projection",()=>{
 assert.equal(verifyReadme(),true);
 assert.equal(renderReadme(),read("README.md"));
 const projected=expectedProjectionState().entries[0];
 assert.equal(projected.model.target.ownership,"generated");
 assert.equal(projected.model.target.path,"README.md");
 assert.equal(projected.build.model_identity.length,64);
});
test("source model contains no copied normative statements",()=>{
 const model=read("model/readme-model.json");
 for(const id of JSON.parse(model).requirement_ids){
  const value=read("requirements/"+id+".rg.yaml");
  const literal=/^normative:\s*("(?:\\.|[^"\\])*")\s*$/m.exec(value)?.[1];
  assert.ok(literal);
  const normative=JSON.parse(literal);
  assert.ok(!model.includes(normative));
  assert.ok(read("README.md").includes(normative));
 }
});
test("generated README pins v5 and advertises the Pages URL",()=>{
 const body=renderReadme();
 assert.match(body,/github\.io\/home-heat-water\//);
 assert.match(body,/98670b6f8638ceb4495fa77474efee468a4ebb81/);
 assert.ok(!body.includes("6490ddc499ce01fa35b854dd4afbe0996d444165"));
});
test("a simulated README manual edit diverges from deterministic projection",()=>{
 assert.notEqual(renderReadme()+"unauthorized manual edit",read("README.md"));
});
