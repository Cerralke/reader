import {fonts} from './fonts.js';
export const css=`
:root{color-scheme:light dark;--bg:#faf9f6;--fg:#24231f;--muted:#625f56;--line:#d8d5cc;--size:clamp(1.0625rem,1rem + .3vw,1.1875rem);--width:65ch;--leading:1.8;--font:${fonts[0].family}}
@media(prefers-color-scheme:dark){:root{--bg:#191a18;--fg:#e7e4dc;--muted:#b8b5ab;--line:#484941}}
:root[data-theme=light]{color-scheme:light;--bg:#faf9f6;--fg:#24231f;--muted:#625f56;--line:#d8d5cc}
:root[data-theme=dark]{color-scheme:dark;--bg:#191a18;--fg:#e7e4dc;--muted:#b8b5ab;--line:#484941}
:root[data-theme=sepia]{color-scheme:light;--bg:#f2e7d2;--fg:#352b20;--muted:#66513c;--line:#c6b79d}
*{box-sizing:border-box}html{background:var(--bg);color:var(--fg);font-size:100%}body{margin:0;padding:1.5rem clamp(1rem,4vw,3rem) 4rem}a{color:inherit;text-underline-offset:.2em}a:hover{text-decoration-thickness:2px}:focus-visible{outline:3px solid currentColor;outline-offset:5px}header,main,footer{max-width:var(--width);margin-inline:auto}header,footer,nav,aside{font:1rem/1.6 system-ui,sans-serif}header{padding-block:.5rem 2rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}main{font-family:var(--font);font-size:var(--size);line-height:var(--leading);overflow-wrap:anywhere;padding-top:2rem}h1,h2,h3,h4,h5,h6{line-height:1.25;font-weight:500;text-wrap:balance;margin:2em 0 .8em}h1{font-size:clamp(2rem,6vw,3.25rem);margin-top:.25em;letter-spacing:-.025em}p{margin:0 0 1.25em}blockquote{margin:1.8em 0;padding-left:1.25em;border-left:2px solid var(--line);font-style:italic}hr{border:0;text-align:center;margin:2.5em 0}hr:after{content:'⁂';letter-spacing:.4em}img{max-width:100%;height:auto}pre{overflow:auto}table{display:block;overflow:auto}code{font-size:.9em}footer{margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--line)}nav{display:flex;gap:1.5rem;justify-content:space-between;flex-wrap:wrap}.eyebrow{font: .8rem/1.5 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.author{color:var(--muted)}.cover{max-height:22rem;width:auto;display:block;margin:0 auto 2rem}.actions{display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;margin:2rem 0}.primary{border:1px solid var(--fg);padding:.6em 1em;text-decoration:none}.toc{list-style:none;padding:0}.toc li{border-bottom:1px solid var(--line);padding:.75em 0}.skip{position:absolute;top:-10rem}.skip:focus{top:1rem;background:var(--bg);padding:1rem;z-index:2}aside{max-width:65ch;margin:1rem auto}fieldset{border:1px solid var(--line);padding:1rem;display:flex;gap:1rem;flex-wrap:wrap}label{display:grid;gap:.3rem}select{font:inherit;background:var(--bg);color:var(--fg);padding:.4rem;border:1px solid var(--muted)}summary{cursor:pointer} [hidden]{display:none!important}@media print{header,aside,.actions,footer{display:none}body{padding:0}html{background:white;color:black}}
`;
// Runs in the head to apply stored theme before first paint; storage can be blocked.
export const preferences=String.raw`(()=>{
 const root=document.documentElement;
 const families=${JSON.stringify(Object.fromEntries(fonts.map(font=>[font.id,font.family])))};
 const allowed={theme:['auto','light','dark','sepia'],font:Object.keys(families),size:['small','medium','large'],width:['narrow','normal','wide'],leading:['normal','relaxed']};
 let state={};
 try{const v=JSON.parse(localStorage.getItem('book-reader-preferences')||'{}');if(v&&typeof v==='object')state=v}catch{}
 // Preserve the old category choices when upgrading an existing reader.
 if(state.font==='serif')state.font='bitter';
 if(state.font==='sans')state.font='inter';
 if(!allowed.font.includes(state.font))state.font='literata';
 function apply(){
  root.removeAttribute('data-theme');
  if(allowed.theme.includes(state.theme)&&state.theme!=='auto')root.dataset.theme=state.theme;
  root.style.setProperty('--font',families[state.font]);
  root.style.setProperty('--size',({small:'1rem',medium:'1.125rem',large:'1.5rem'})[state.size]||'1.125rem');
  root.style.setProperty('--width',({narrow:'52ch',normal:'65ch',wide:'78ch'})[state.width]||'65ch');
  root.style.setProperty('--leading',state.leading==='relaxed'?'2':'1.8');
 }
 apply();
 document.addEventListener('DOMContentLoaded',()=>{
  const panel=document.getElementById('preferences');if(!panel)return;panel.hidden=false;
  panel.querySelectorAll('select').forEach(el=>{
   if(allowed[el.name].includes(state[el.name]))el.value=state[el.name];
   el.addEventListener('change',()=>{state[el.name]=el.value;apply();try{localStorage.setItem('book-reader-preferences',JSON.stringify(state))}catch{}});
  });
 });
})();`;
export const translations={en:{home:'Table of contents',start:'Start reading',resume:'Continue reading',previous:'Previous chapter',next:'Next chapter',settings:'Reading preferences',skip:'Skip to content',font:'Font',size:'Font size',theme:'Theme',width:'Text width',leading:'Line height',options:[['System','Light','Dark','Sepia'],['Default','Serif','Sans-serif','Legible','Typewriter'],['Small','Medium','Large'],['Narrow','Normal','Wide'],['Normal','Relaxed']]},pl:{home:'Spis treści',start:'Zacznij czytać',resume:'Kontynuuj czytanie',previous:'Poprzedni rozdział',next:'Następny rozdział',settings:'Ustawienia czytania',skip:'Przejdź do treści',font:'Krój pisma',size:'Rozmiar pisma',theme:'Motyw',width:'Szerokość tekstu',leading:'Interlinia',options:[['Systemowy','Jasny','Ciemny','Sepia'],['Domyślny','Szeryfowy','Bezszeryfowy','Czytelny','Maszynowy'],['Mały','Średni','Duży'],['Wąski','Zwykły','Szeroki'],['Zwykła','Luźna']]}};
