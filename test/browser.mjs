import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtemp,cp,rm,appendFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {dev} from '../lib/dev.js';
const require=createRequire(import.meta.url);
test('browser: mobile, no-JS navigation, preferences, accessibility, no EPUB download and rebuild',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'reader-browser-'));await cp(new URL('../example/',import.meta.url),root,{recursive:true,filter:p=>!p.includes('/dist')});
 const running=await dev(root,0);const port=running.server.address().port;const origin=`http://127.0.0.1:${port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 t.after(async()=>{await browser.close();running.close();await rm(root,{recursive:true,force:true})});
 const context=await browser.newContext({viewport:{width:375,height:812}});const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.goto(origin+'/example-book/');await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(violations.map(v=>v.id),[]);
 assert.equal(await page.locator('a[download], a[href$=".epub"]').count(),0);
 assert.equal((await fetch(origin+'/example-book/downloads/swiatlo-miedzy-stronami.epub')).status,404);
 assert.equal((await fetch(origin+'/example-book/swiatlo-miedzy-stronami.epub')).status,404);
 await page.getByText('Ustawienia czytania',{exact:true}).first().click();
 const fontSelect=page.getByLabel('Krój pisma');
 assert.deepEqual(await fontSelect.locator('option').allTextContents(),['Domyślny','Szeryfowy','Bezszeryfowy','Czytelny','Maszynowy']);
 assert.equal(await fontSelect.inputValue(),'literata');
 for(const [id,family] of [['literata','Literata'],['bitter','Bitter'],['inter','Inter'],['atkinson','Atkinson Hyperlegible Next'],['pt-mono','PT Mono']]){
  await fontSelect.selectOption(id);
  const faces=await page.evaluate(async family=>{
   const loaded=await document.fonts.load('400 16px "'+family+'"','Zażółć gęślą jaźń');
   return loaded.map(face=>({family:face.family,status:face.status}));
  },family);
  assert.ok(faces.length>=2,`${family}: Latin and Polish glyph subsets loaded`);
  assert.ok(faces.every(face=>face.status==='loaded'));
  assert.ok((await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily)).includes(family));
  await page.reload();assert.equal(await fontSelect.inputValue(),id);await page.locator('summary').click();
 }
 // Existing saved categories migrate without discarding other preferences.
 for(const [old,current] of [['serif','bitter'],['sans','inter'],['invalid','literata']]){
  await page.evaluate(font=>localStorage.setItem('book-reader-preferences',JSON.stringify({font,theme:'sepia'})),old);
  await page.reload();assert.equal(await fontSelect.inputValue(),current);assert.equal(await page.locator('html').getAttribute('data-theme'),'sepia');
 }
 await page.locator('summary').click();
 await page.getByLabel('Motyw',{exact:true}).selectOption('sepia');await page.getByLabel('Rozmiar pisma').selectOption('large');await page.getByLabel('Krój pisma').selectOption('inter');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'sepia');assert.equal(await page.locator('select[name=size]').inputValue(),'large');assert.equal(await page.locator('main').evaluate(el=>getComputedStyle(el).fontSize),'24px');
 await page.getByRole('link',{name:'Zacznij czytać'}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'sepia');assert.equal(await page.locator('h1').textContent(),'Początek światła');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const theme of ['light','dark','sepia']){await page.locator('summary').click();await page.getByLabel('Motyw',{exact:true}).selectOption(theme);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const results=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(results.map(v=>v.id),[],theme);await page.locator('summary').click();}
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:640}});const reader=await nojs.newPage();await reader.goto(origin+'/example-book/');await reader.getByRole('link',{name:'Zacznij czytać'}).click();await reader.getByRole('link',{name:'Następny rozdział',exact:false}).click();assert.equal(await reader.locator('h1').textContent(),'Na drugiej stronie');assert.ok(await reader.locator('#preferences').isHidden());assert.ok((await reader.locator('main').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Literata'));assert.ok((await reader.evaluate(()=>document.fonts.load('400 16px Literata','Żółć'))).length>=2);assert.ok(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await nojs.close();
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable')}})});const safe=await blocked.newPage();await safe.goto(origin+'/example-book/');await safe.locator('summary').click();await safe.getByLabel('Motyw',{exact:true}).selectOption('dark');assert.equal(await safe.locator('html').getAttribute('data-theme'),'dark');await blocked.close();
 await appendFile(path.join(root,'chapters/001.md'),'\n\nAutomatyczna aktualizacja.\n');
 // Poll the served final chapter, rather than merely checking an output timestamp.
 const final=(await import('../lib/index.js')).loadBook;const book=await final(root);let rebuilt=false;
 for(let i=0;i<40;i++){const response=await fetch(origin+'/example-book/chapters/'+book.chapters[1].id+'.html');if((await response.text()).includes('Automatyczna aktualizacja.')){rebuilt=true;break;}await new Promise(r=>setTimeout(r,100));}
 assert.equal(rebuilt,true);assert.equal((await fetch(origin+'/example-book/%2e%2e/%2e%2e/book.yaml')).status,404);
 await context.close();
});

test('reading progress: reopen, resume link, corrupt/blocked storage and hash navigation',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'reader-progress-'));await cp(new URL('../example/',import.meta.url),root,{recursive:true,filter:p=>!p.includes('/dist')});
 await appendFile(path.join(root,'chapters/001.md'),'\n\n'+Array.from({length:100},(_,i)=>`Akapit ${i+1}. `+'Długi tekst do sprawdzania zapamiętanej pozycji. '.repeat(12)).join('\n\n'));
 const running=await dev(root,0);const origin=`http://127.0.0.1:${running.server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 t.after(async()=>{await browser.close();running.close();await rm(root,{recursive:true,force:true})});
 const context=await browser.newContext({viewport:{width:375,height:812}});let page=await context.newPage();page.setDefaultTimeout(5000);
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/example-book/');assert.ok(await page.locator('#resume-reading').isHidden());
 await page.locator('.toc a').nth(1).click();const chapter=page.url();
 const key=await page.locator('body').evaluate(el=>'book-reader-progress:'+el.dataset.readerBook);
 await page.evaluate(()=>window.scrollTo(0,4500));await page.waitForFunction(()=>scrollY>4000);
 // Closing flushes progress even before the scroll throttle expires.
 await page.close();page=await context.newPage();page.setDefaultTimeout(5000);await page.goto(origin+'/example-book/');
 const bookmark=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.ok(bookmark.y>4000);assert.ok(await page.getByRole('link',{name:'Kontynuuj czytanie'}).isVisible());
 assert.equal(new URL(await page.locator('#resume-reading').getAttribute('href'),origin).href,chapter);
 await page.getByRole('link',{name:'Kontynuuj czytanie'}).click();await page.waitForFunction(y=>Math.abs(scrollY-y)<3,bookmark.y);
 await page.reload();await page.waitForFunction(y=>Math.abs(scrollY-y)<3,bookmark.y);
 // A different viewport restores the same prose block rather than the old pixel.
 await page.close();page=await context.newPage();await page.setViewportSize({width:1000,height:800});await page.goto(chapter);
 await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>scrollY>0);const restored=await page.locator('article').evaluate((el,b)=>{const rect=el.children[b.block].getBoundingClientRect();return rect.top+rect.height*b.offset;},bookmark);assert.ok(Math.abs(restored)<3);
 // Anchor navigation explicitly takes precedence over a bookmark.
 await page.goto(chapter+'#main');assert.ok(await page.evaluate(()=>scrollY)<1000);
 await page.goto(origin+'/example-book/');assert.equal(await page.locator('#resume-reading').getAttribute('href'),new URL(chapter).pathname);
 for(const value of ['{broken', 'null', JSON.stringify({chapter:'https://evil.example/',y:50,block:1,offset:0}),JSON.stringify({chapter:new URL(chapter).pathname,y:-1,block:1,offset:0}),JSON.stringify({chapter:new URL(chapter).pathname,y:10,block:1,offset:2})]){
  await page.evaluate(([k,v])=>localStorage.setItem(k,v),[key,value]);await page.reload();assert.ok(await page.locator('#resume-reading').isHidden());
 }
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('Blocked')}})});const safe=await blocked.newPage();safe.on('pageerror',e=>errors.push(e.message));await safe.goto(chapter);await safe.evaluate(()=>scrollTo(0,2000));await safe.reload();assert.ok(await safe.locator('article').isVisible());await blocked.close();
 assert.deepEqual(errors,[]);await context.close();
});
