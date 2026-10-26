#!/usr/bin/env node
/** Russian-language Requirement CI gate. No external NLP or services. */
import {readFileSync,readdirSync} from "node:fs";
import {resolve,dirname,join,relative} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const names=new Set(["AES","API","CI","CLI","CSV","GitHub","Graphviz","HTML","HTTP","HTTPS","ID","JSON","MDDB","PDF","PlantUML","PR","RepoGuard","SHA","SQL","SVG","TBD","TypeScript","URL","YAML","PASS","FAIL","UNKNOWN"]);
export function validateRussianRequirement(text){
 const errors=[];
 if(typeof text!=="string"||!text.trim())return ["Текст требования отсутствует"];
 const prose=text.replace(/\x60([^\x60\n]*)\x60/gu,(_whole,code)=>{
   if(!code.trim()||code.length>100||/\s/u.test(code))errors.push("Встроенный код не является единым идентификатором или путём");
   return " ";
 });
 if((prose.match(/[А-Яа-яЁё]/gu)||[]).length<12)errors.push("Нет достаточного русского текста");
 for(const word of new Set(prose.match(/[A-Za-z]+/gu)||[]))
   if(!names.has(word))errors.push("Английское слово вне технического списка: "+word);
 return errors;
}
export function extractNativeRequirement(source,path){
 if(!/^format:\s*repo-guard\/requirement-v1\s*$/m.test(source))throw Error(path+": неверный формат");
 const id=/^id:\s*([A-Za-z][A-Za-z0-9._:-]*)\s*$/m.exec(source)?.[1];
 if(!id)throw Error(path+": не указан ID");
 const values=[...source.matchAll(/^normative:\s*("(?:\\.|[^"\\])*")\s*$/gm)];
 if(values.length!==1)throw Error(path+": ожидается одно поле normative в JSON-quoted виде");
 let normative;
 try{normative=JSON.parse(values[0][1]);}catch{throw Error(path+": невалидное нормативное значение");}
 return {id,normative};
}
export function candidateRequirementCells(markdown){
 const result=[];
 for(const [i,line] of markdown.split(/\r?\n/u).entries()){
   if(!line.startsWith("|"))continue;
   const cols=line.split("|").slice(1,-1).map(x=>x.trim());
   if(cols.length<2)continue;
   const id=cols[0].replace(/^\x60|\x60$/gu,"");
   if(!/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/u.test(id))continue;
   result.push({id,line:i+1,text:cols[1].replace(/\*\*/gu,"")});
 }
 return result;
}
function allRequirements(dir){
 const result=[];
 for(const item of readdirSync(dir,{withFileTypes:true})){
   const path=join(dir,item.name);
   if(item.isDirectory())result.push(...allRequirements(path));
   else if(item.isFile()&&/\.rg\.ya?ml$/u.test(item.name))result.push(path);
 }
 return result.sort();
}
export function validateProjectRequirements(base=root){
 const issues=[],files=allRequirements(resolve(base,"requirements")),ids=new Set();
 if(!files.length)issues.push("Файлы требований не найдены");
 for(const file of files){
   const path=relative(base,file);
   try{
     const {id,normative}=extractNativeRequirement(readFileSync(file,"utf8"),path);
     if(ids.has(id))issues.push(path+": повторный ID "+id);
     ids.add(id);
     issues.push(...validateRussianRequirement(normative).map(e=>path+" / "+id+": "+e));
   }catch(e){issues.push(String(e.message));}
 }
 const candidates=candidateRequirementCells(readFileSync(resolve(base,"docs/10-requirements.md"),"utf8"));
 if(!candidates.length)issues.push("Нет требований-кандидатов");
 for(const c of candidates)issues.push(...validateRussianRequirement(c.text).map(e=>"docs/10-requirements.md:"+c.line+" / "+c.id+": "+e));
 return {ok:issues.length===0,issues,files:files.length,candidates:candidates.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=validateProjectRequirements();
 if(!r.ok){process.stderr.write(r.issues.join("\n")+"\n");process.exitCode=1;}
 else console.log("Язык требований: PASS ("+r.files+" нормативных; "+r.candidates+" кандидатов)");
}
