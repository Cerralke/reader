import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import MarkdownIt from 'markdown-it';
export interface Config {title:string;author:string;language:string;description?:string;cover?:string;chapters:string[];basePath:string;siteUrl?:string;output:{html:boolean;epub:boolean}}
export interface Chapter {source:string;id:string;title:string;html:string}
export interface Book {root:string;config:Config;chapters:Chapter[];assets:Map<string,Uint8Array>;identifier:string;slug:string}
export const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function configFrom(text:string):Config {
 const v=parse(text); if(!v||typeof v!=='object'||Array.isArray(v)) throw Error('book.yaml must contain a mapping');
 for(const key of ['title','author','language']) if(typeof v[key]!=='string'||!v[key].trim()) throw Error(`book.yaml: ${key} must be a nonempty string`);
 if(!/^[a-z]{2,8}(-[a-z0-9]{1,8})*$/i.test(v.language)) throw Error('Invalid language tag');
 if(!Array.isArray(v.chapters)||!v.chapters.length||v.chapters.some((s:unknown)=>typeof s!=='string'||!s.endsWith('.md'))) throw Error('chapters must be an explicit nonempty list of Markdown paths');
 if(new Set(v.chapters).size!==v.chapters.length) throw Error('Duplicate chapter reference');
 for(const k of ['cover','description','basePath','siteUrl']) if(v[k]!==undefined&&typeof v[k]!=='string') throw Error(`${k} must be a string`);
 const base=v.basePath??'/'; if(!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]*\/?$/.test(base)) throw Error('basePath must be a local URL path');
 if(v.siteUrl){const u=new URL(v.siteUrl);if(!['https:','http:'].includes(u.protocol)||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('siteUrl must be an HTTP(S) origin');}
 if(v.output!==undefined&&(!v.output||typeof v.output!=='object'||Array.isArray(v.output)))throw Error('output must be a mapping');
 for(const k of ['html','epub'])if(v.output?.[k]!==undefined&&typeof v.output[k]!=='boolean')throw Error(`output.${k} must be boolean`);
 return {...v,basePath:base==='/'?'/':base.replace(/\/$/,'')+'/',output:{html:v.output?.html??true,epub:v.output?.epub??true}};
}
export async function safeFile(root:string, relative:string):Promise<string>{
 if(path.isAbsolute(relative)||relative.includes('\\')||relative.includes('\0'))throw Error(`Invalid file reference: ${relative}`);
 const candidate=path.resolve(root,relative); if(!candidate.startsWith(root+path.sep))throw Error(`File escapes book directory: ${relative}`);
 let resolved:string;try{resolved=await realpath(candidate);}catch{throw Error(`Missing file: ${relative}`);}
 if(!resolved.startsWith(root+path.sep))throw Error(`File escapes book directory: ${relative}`);return resolved;
}
const media:Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
export const mediaType=(p:string)=>media[path.extname(p).toLowerCase()];
export async function loadBook(directory:string):Promise<Book>{
 const root=await realpath(directory);const config=configFrom(await readFile(await safeFile(root,'book.yaml'),'utf8'));
 const assets=new Map<string,Uint8Array>();
 async function asset(ref:string){if(!ref.startsWith('assets/')||!/^assets\/[A-Za-z0-9_./-]+$/.test(ref)||ref.split('/').includes('..')||!mediaType(ref))throw Error(`Unsupported image reference: ${ref}. Use local PNG, JPEG, GIF or WebP under assets/`);assets.set(ref,await readFile(await safeFile(root,ref)));return ref;}
 if(config.cover)await asset(config.cover);
 const md=new MarkdownIt({html:false,xhtmlOut:true,linkify:false});
 const chapters:Chapter[]=[];
 for(const [i,source] of config.chapters.entries()){
 let text=await readFile(await safeFile(root,source),'utf8');let title:string|undefined;
 if(text.startsWith('---\n')||text.startsWith('---\r\n')){const m=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(!m)throw Error(`Unclosed frontmatter: ${source}`);const meta=parse(m[1]!);if(meta?.title!==undefined&&typeof meta.title!=='string')throw Error(`Invalid chapter title: ${source}`);title=meta?.title;text=text.slice(m[0].length);}
 const tokens=md.parse(text,{});const first=tokens.findIndex(t=>t.type==='heading_open'&&t.tag==='h1');
 if(first>=0){title??=tokens[first+1]?.content;tokens.splice(first,3);}
 title=title?.trim()||`Chapter ${i+1}`;
 // Page owns h1. Shift prose headings to preserve hierarchy.
 for(const t of tokens)if(t.type==='heading_open'||t.type==='heading_close')t.tag=t.tag==='h1'?'h2':t.tag;
 chapters.push({source,id:'chapter-'+createHash('sha256').update(source).digest('hex').slice(0,12),title,html:md.renderer.render(tokens,md.options,{})});
 }
 // Rewrite only parser-produced attributes; raw HTML is escaped by markdown-it.
 for(const chapter of chapters){
 const refs=[...chapter.html.matchAll(/\b(src|href)="([^"]*)"/g)];
 for(const match of refs){const attr=match[1]!,encoded=match[2]!;const ref=encoded.replace(/&amp;/g,'&');
 if(/^(https?:|mailto:)/i.test(ref)){if(attr==='src')throw Error('Remote images are disabled; copy images into assets/');continue;}
 if(ref.startsWith('#'))throw Error('Fragment links are unsupported; link to a chapter Markdown file');
 let decoded:string;try{decoded=decodeURIComponent(ref);}catch{throw Error(`Invalid URL: ${ref}`);}
 if(/[?#]/.test(decoded))throw Error(`Unsupported chapter or image URL: ${ref}`);
 const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(chapter.source),decoded));
 let target:string;
 if(attr==='src'){target='../'+await asset(resolved);}else{const c=chapters.find(c=>c.source===resolved);if(!c)throw Error(`Unknown chapter link: ${ref} in ${chapter.source}`);target=c.id+'.xhtml';}
 chapter.html=chapter.html.replace(`${attr}="${encoded}"`,`${attr}="${escape(target)}"`);
 }
 }
 const slug=config.title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ł/g,'l').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'book';
 return {root,config,chapters,assets,slug,identifier:'urn:sha256:'+createHash('sha256').update(JSON.stringify([config.title,config.author,chapters])).digest('hex')};
}
