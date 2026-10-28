import {mkdir,writeFile,mkdtemp,rename,rm,lstat} from 'node:fs/promises';
import path from 'node:path';
import {loadBook} from './content.js';
import {renderWebsite} from './html.js';
import {fontAssets} from './fonts.js';
import {renderEpub} from './epub.js';
export {loadBook,configFrom} from './content.js';
export type {Book,Config,Chapter} from './content.js';
export interface BuildOptions{format?:'html'|'epub'|'all'}
export async function build(directory='.',options:BuildOptions={}){
 if(options.format&&!['html','epub','all'].includes(options.format))throw Error('format must be html, epub or all');
 const book=await loadBook(directory);const selected=options.format;
 const html=selected?selected!=='epub':book.config.output.html;
 const epub=selected?selected!=='html':book.config.output.epub;
 if(!html&&!epub)throw Error('No output formats enabled');
 const target=path.join(book.root,'dist');
 // Reject output symlinks; never follow them during publishing.
 try{if((await lstat(target)).isSymbolicLink())throw Error('dist must not be a symbolic link');}catch(err){if((err as NodeJS.ErrnoException).code!=='ENOENT')throw err;}
 const staging=await mkdtemp(path.join(book.root,'.reader-build-'));const backup=staging+'-previous';
 try{
 const write=async(p:string,data:string|Uint8Array)=>{const file=path.join(staging,p);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data)};
 if(epub)await write('book.epub',renderEpub(book));
 if(html){for(const [p,data]of await fontAssets())await write(p,data);for(const [p,text]of renderWebsite(book))await write(p,text);for(const [p,data]of book.assets)await write(p,data);}
 // Author exports are kept outside the public website, never in dist.
 const epubFile=epub?path.join(book.root,book.slug+'.epub'):undefined;
 if(epubFile)await rename(path.join(staging,'book.epub'),epubFile);
 let old=false;try{await rename(target,backup);old=true;}catch(err){if((err as NodeJS.ErrnoException).code!=='ENOENT')throw err;}
 try{await rename(staging,target);}catch(err){if(old)await rename(backup,target);throw err;}
 if(old)await rm(backup,{recursive:true,force:true});
 return {directory:target,html,epub,epubFile,book};
 }finally{await rm(staging,{recursive:true,force:true});}
}
