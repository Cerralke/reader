import {escape as e,type Book} from './content.js';
import {createHash} from 'node:crypto';
import {fonts} from './fonts.js';
import {progress} from './progress.js';
import {css,preferences,translations} from './reader.js';
export function renderWebsite(book:Book):Map<string,string>{
 const {config:c,chapters}=book;const base=c.basePath;const t=translations[c.language.split('-')[0] as keyof typeof translations]??translations.en;
 const url=(p:string)=>e(base+p);const chapterUrl=(i:number)=>url('chapters/'+chapters[i]!.id+'.html');
 const bookId=createHash('sha256').update(JSON.stringify([base,c.title,c.author,c.language])).digest('hex');
 const chapterPaths=JSON.stringify(chapters.map(ch=>base+'chapters/'+ch.id+'.html'));
 const settings=`<aside id="preferences" hidden><details><summary>${t.settings}</summary><fieldset><legend>${t.settings}</legend>${(['theme','font','size','width','leading'] as const).map((key,i)=>{const values=[['auto','light','dark','sepia'],fonts.map(font=>font.id),['small','medium','large'],['narrow','normal','wide'],['normal','relaxed']][i]!;return `<label>${t[key]}<select name="${key}" aria-label="${t[key]}">${values.map((v,j)=>`<option value="${v}"${['medium','normal'].includes(v)?' selected="selected"':''}>${t.options[i]![j]}</option>`).join('')}</select></label>`}).join('')}</fieldset></details></aside>`;
 function page(title:string,body:string,footer:string){return `<!doctype html>\n<html lang="${e(c.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} — ${e(c.title)}</title><meta name="description" content="${e(c.description??c.title)}"><link rel="stylesheet" href="${url('assets/fonts/fonts.css')}"><link rel="stylesheet" href="${url('assets/reader.css')}"><script src="${url('assets/reader.js')}"></script></head><body data-reader-book="${bookId}" data-reader-chapters="${e(chapterPaths)}"><a class="skip" href="#main">${t.skip}</a><header><a href="${url('index.html')}">${e(c.title)}</a><span>${e(c.author)}</span></header>${settings}<main id="main">${body}</main><footer>${footer}</footer></body></html>`;}
 const files=new Map<string,string>([['assets/reader.css',css],['assets/reader.js',preferences+progress]]);
 files.set('index.html',page(c.title,`${c.cover?`<img class="cover" src="${url(c.cover)}" alt="${e(c.title)}">`:''}<p class="eyebrow">${e(c.language)}</p><h1>${e(c.title)}</h1><p class="author">${e(c.author)}</p>${c.description?`<p>${e(c.description)}</p>`:''}<div class="actions"><a class="primary" href="${chapterUrl(0)}">${t.start}</a><a id="resume-reading" hidden href="${chapterUrl(0)}">${t.resume}</a></div><h2>${t.home}</h2><ol class="toc">${chapters.map((ch,i)=>`<li><a href="${chapterUrl(i)}">${e(ch.title)}</a></li>`).join('')}</ol>`,e(c.author)));
 chapters.forEach((ch,i)=>files.set(`chapters/${ch.id}.html`,page(ch.title,`<article><h1>${e(ch.title)}</h1>${ch.html.replace(/href="([^"/]+)\.xhtml"/g,'href="$1.html"')}</article>`,`<nav aria-label="${t.home}">${i?`<a rel="prev" href="${chapterUrl(i-1)}">← ${t.previous}</a>`:''}<a href="${url('index.html')}">${t.home}</a>${i<chapters.length-1?`<a rel="next" href="${chapterUrl(i+1)}">${t.next} →</a>`:''}</nav>`)));
 const locations=['index.html',...chapters.map(ch=>'chapters/'+ch.id+'.html')];
 // Without a deployment origin, use a portable text sitemap instead of invalid relative XML locs.
 if(c.siteUrl)files.set('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map(p=>`<url><loc>${e(new URL(c.basePath+p,c.siteUrl).href)}</loc></url>`).join('')}</urlset>`);
 else files.set('sitemap.txt',locations.map(p=>c.basePath+p).join('\n')+'\n');
 return files;
}
