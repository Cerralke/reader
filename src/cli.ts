#!/usr/bin/env node
import {build} from './index.js';
import {dev} from './dev.js';
async function main(){
 const args=process.argv.slice(2);const command=args.shift();
 if(command==='--help'||command==='-h'){console.log('book-reader build [directory] [--format html|epub|all]\nbook-reader dev [directory] [--port 3000]');return;}
 if(command!=='build'&&command!=='dev')throw Error('Expected build or dev. Use --help for usage.');
 let directory='.',hasDirectory=false,format:'html'|'epub'|'all'|undefined,port=3000;
 while(args.length){const arg=args.shift()!;if(arg==='--format'&&command==='build'){const value=args.shift();if(!['html','epub','all'].includes(value??''))throw Error('--format requires html, epub or all');format=value as typeof format;}
 else if(arg==='--port'&&command==='dev'){port=Number(args.shift());if(!Number.isInteger(port)||port<1||port>65535)throw Error('--port requires an integer between 1 and 65535');}
 else if(arg.startsWith('-'))throw Error(`Unknown option: ${arg}`);else if(hasDirectory)throw Error('Only one book directory is allowed');else{directory=arg;hasDirectory=true;}}
 if(command==='dev')await dev(directory,port);else{const r=await build(directory,{format});console.log(`Built ${[r.html?'HTML':'',r.epub?'EPUB':''].filter(Boolean).join(' and ')} in ${r.directory}`);}
}
main().catch(err=>{console.error(`book-reader: ${err.message}`);process.exitCode=1});
