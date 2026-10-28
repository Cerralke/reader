import {spawnSync} from 'node:child_process';
import {build} from '../lib/index.js';
const jar=process.env.EPUBCHECK_JAR;
if(!jar){console.error('Set EPUBCHECK_JAR to epubcheck.jar from the official EPUBCheck release (https://github.com/w3c/epubcheck/releases). Requires Java 11+.');process.exitCode=1;}
else{const result=await build(new URL('../example/',import.meta.url).pathname);const run=spawnSync('java',['-jar',jar,result.epubFile],{stdio:'inherit'});if(run.error)console.error(run.error.message);process.exitCode=run.status??1;}
