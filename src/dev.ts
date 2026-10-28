import {createServer} from 'node:http';
import {readFile,readdir,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {build} from './index.js';
export async function dev(directory:string,port=3000){
 const root=await realpath(directory);let result=await build(root);
 if(!result.html)throw Error('dev requires output.html: true');
 const types:Record<string,string>={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.woff2':'font/woff2'};
 const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname);const base=result.book.config.basePath;
 if(pathname==='/'&&base!=='/'){res.writeHead(302,{Location:base});res.end();return;}
 if(!pathname.startsWith(base))throw Error('Not found');
 const relative=pathname.slice(base.length)||'index.html';const file=await realpath(path.resolve(result.directory,relative));
 if(!file.startsWith(result.directory+path.sep))throw Error('Not found');
 const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}});
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
 console.log(`Development server listening on port ${(server.address() as import('node:net').AddressInfo).port}; base path ${result.book.config.basePath}. Changes rebuild automatically; refresh the browser.`);
 async function signature(dir:string):Promise<string>{let value='';for(const entry of await readdir(dir,{withFileTypes:true})){if(['dist','node_modules','.git'].includes(entry.name)||entry.name.startsWith('.reader-build-'))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())value+=await signature(p);else if(entry.isFile()&&!entry.name.endsWith('.epub')){const s=await stat(p);value+=p+s.mtimeMs+s.size;}}return value;}
 let previous=await signature(root),busy=false;
 const timer=setInterval(async()=>{if(busy)return;busy=true;try{const next=await signature(root);if(next!==previous){previous=next;try{result=await build(root);console.log('Rebuilt book');}catch(err){console.error('Rebuild failed:',(err as Error).message);}}}catch(err){console.error((err as Error).message);}finally{busy=false;}},500);
 const close=()=>{clearInterval(timer);server.close()};process.once('SIGINT',close);process.once('SIGTERM',close);return {server,close};
}
