import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateRussianRequirement,extractNativeRequirement,candidateRequirementCells,validateProjectRequirements} from "../scripts/check-requirements-language.mjs";
test("все нормативные и кандидатные требования на русском",()=>{
 const r=validateProjectRequirements();
 assert.deepEqual(r.issues,[]);assert.ok(r.files>=11);assert.ok(r.candidates>=30);
});
test("метатребование проверяет собственный нормативный текст",()=>{
 const s=readFileSync(new URL("../requirements/HW-LANG.rg.yaml",import.meta.url),"utf8");
 const {id,normative}=extractNativeRequirement(s,"HW-LANG");
 assert.equal(id,"HW-LANG");assert.deepEqual(validateRussianRequirement(normative),[]);
});
test("полностью английский текст не допускается",()=>{
 assert.ok(validateRussianRequirement("All requirements MUST be written in Russian.").length>0);
});
test("смешанные русско-английские формулировки не допускаются",()=>{
 assert.ok(validateRussianRequirement("Требования MUST be written по-русски.").length>0);
 assert.ok(validateRussianRequirement("Система should сохранять работоспособность без сети.").length>0);
});
test("технические названия и машинные адреса допустимы",()=>{
 assert.deepEqual(validateRussianRequirement("Проверки RepoGuard должны проходить в CI с использованием YAML и TypeScript."),[]);
 assert.deepEqual(validateRussianRequirement("Требование должно ссылаться на \x60requirements/HW-CORE.rg.yaml\x60 и проверяться автоматически."),[]);
});
test("отсутствующий, дублированный и некавыченный нормативный текст отвергается",()=>{
 const p="format: repo-guard/requirement-v1\nid: T-1\n";
 assert.throws(()=>extractNativeRequirement(p,"x"),/normative/);
 assert.throws(()=>extractNativeRequirement(p+"normative: The system MUST work\n","x"),/normative/);
 assert.throws(()=>extractNativeRequirement(p+'normative: "Первое"\nnormative: "Второе"\n',"x"),/normative/);
});
test("в таблицах выявляется английская формулировка",()=>{
 const c=candidateRequirementCells("| ID | Требование |\n|---|---|\n| TEST-01 | System MUST work |");
 assert.equal(c.length,1);assert.ok(validateRussianRequirement(c[0].text).length>0);
});

test("принятые требования независимого ГВС и летней циркуляции имеют проверяемую идентичность",()=>{
 for(const id of ["HW-DHW-ISOLATION","HW-DHW-GRAVITY","HW-DHW-ELECTRIC","HW-HEAT-CONTROL","HW-SUMMER-CIRC"]){
  const path="../requirements/"+id+".rg.yaml";
  const source=readFileSync(new URL(path,import.meta.url),"utf8");
  const actual=extractNativeRequirement(source,id);
  assert.equal(actual.id,id);
  assert.deepEqual(validateRussianRequirement(actual.normative),[]);
 }
});
