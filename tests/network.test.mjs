import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateNetwork, structuralPath} from "../src/network.ts";
import {storedHeatKWh} from "../src/thermal.ts";
const model=JSON.parse(readFileSync(new URL("../model/photo-study.json",import.meta.url),"utf8"));
test("v0 model has valid named ports, multiport junctions and instrument tap",()=>{
  assert.deepEqual(validateNetwork(model),{ok:true,errors:[]});
  assert.equal(model.nodes.J1.kind,"junction");
  assert.equal(model.nodes.GAUGE.kind,"gauge");
});
test("structural path exists in either valve branch, disappears when isolated",()=>{
  const {from,to}=model.checks.demo_path;
  assert.equal(structuralPath(model,"main",from,to).status,"PASS");
  assert.equal(structuralPath(model,"bypass",from,to).status,"PASS");
  assert.equal(structuralPath(model,"isolated",from,to).status,"FAIL");
});
test("missing port and cross-medium connection are rejected (negative tests)",()=>{
  const missing=structuredClone(model);
  missing.links.C03.b="FILTER.absent";
  assert.ok(validateNetwork(missing).errors.some(e=>e.includes("Unknown endpoint")));
  const bad=structuredClone(model);
  bad.links.C03.medium="potable_water";
  assert.ok(validateNetwork(bad).errors.some(e=>e.includes("Medium mismatch")));
});
test("invalid valve state and unavailable scenario never count as PASS",()=>{
  const bad=structuredClone(model);
  bad.scenarios.main.valves.V_MAIN="unknown";
  assert.ok(validateNetwork(bad).errors.some(e=>e.includes("Invalid valve state")));
  assert.equal(structuralPath(model,"missing",...Object.values(model.checks.demo_path)).status,"UNKNOWN");
});
test("thermodynamic calculation uses current thermal.ts, not UI duplicate",()=>{
  const kwh=storedHeatKWh(model.nodes.STORE.volume_l,model.assumptions.delta_temperature_k);
  assert.ok(Math.abs(kwh-25.580999999999996)<0.001);
});
