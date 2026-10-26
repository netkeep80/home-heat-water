import {rmSync,mkdirSync,copyFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const out="public";
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
execFileSync(process.execPath,["./node_modules/typescript/bin/tsc","--target","ES2022","--module","ESNext","--moduleResolution","Bundler","--strict","--skipLibCheck","--outDir",out,"src/network.ts","src/thermal.ts"],{stdio:"inherit"});
copyFileSync("site/index.html",out+"/index.html");
copyFileSync("site/app.js",out+"/app.js");
copyFileSync("model/photo-study.json",out+"/model.json");
console.log("GitHub Pages static artifact built into public/ (no backend/secrets)");
