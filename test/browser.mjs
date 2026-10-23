import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
import {mkdtemp,cp,rm,appendFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {dev} from '../lib/dev.js';
const require=createRequire(import.meta.url);
test('browser: mobile, no-JS navigation, preferences, accessibility, download and rebuild',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'reader-browser-'));await cp(new URL('../example/',import.meta.url),root,{recursive:true,filter:p=>!p.includes('/dist')});
 const running=await dev(root,0);const port=running.server.address().port;const origin=`http://127.0.0.1:${port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 t.after(async()=>{await browser.close();running.close();await rm(root,{recursive:true,force:true})});
 const context=await browser.newContext({viewport:{width:375,height:812}});const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.goto(origin+'/example-book/');await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(violations.map(v=>v.id),[]);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Pobierz EPUB'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'swiatlo-miedzy-stronami.epub');assert.equal(await download.failure(),null);
 await page.getByText('Ustawienia czytania',{exact:true}).first().click();
 await page.getByLabel('Motyw',{exact:true}).selectOption('sepia');await page.getByLabel('Rozmiar pisma').selectOption('large');await page.getByLabel('Krój pisma').selectOption('sans');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'sepia');assert.equal(await page.locator('select[name=size]').inputValue(),'large');assert.equal(await page.locator('main').evaluate(el=>getComputedStyle(el).fontSize),'24px');
 await page.getByRole('link',{name:'Zacznij czytać'}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'sepia');assert.equal(await page.locator('h1').textContent(),'Początek światła');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const theme of ['light','dark','sepia']){await page.locator('summary').click();await page.getByLabel('Motyw',{exact:true}).selectOption(theme);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const results=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(results.map(v=>v.id),[],theme);await page.locator('summary').click();}
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:640}});const reader=await nojs.newPage();await reader.goto(origin+'/example-book/');await reader.getByRole('link',{name:'Zacznij czytać'}).click();await reader.getByRole('link',{name:'Następny rozdział',exact:false}).click();assert.equal(await reader.locator('h1').textContent(),'Na drugiej stronie');assert.ok(await reader.locator('#preferences').isHidden());assert.ok(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await nojs.close();
 const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable')}})});const safe=await blocked.newPage();await safe.goto(origin+'/example-book/');await safe.locator('summary').click();await safe.getByLabel('Motyw',{exact:true}).selectOption('dark');assert.equal(await safe.locator('html').getAttribute('data-theme'),'dark');await blocked.close();
 await appendFile(path.join(root,'chapters/001.md'),'\n\nAutomatyczna aktualizacja.\n');
 // Poll the served final chapter, rather than merely checking an output timestamp.
 const final=(await import('../lib/index.js')).loadBook;const book=await final(root);let rebuilt=false;
 for(let i=0;i<40;i++){const response=await fetch(origin+'/example-book/chapters/'+book.chapters[1].id+'.html');if((await response.text()).includes('Automatyczna aktualizacja.')){rebuilt=true;break;}await new Promise(r=>setTimeout(r,100));}
 assert.equal(rebuilt,true);assert.equal((await fetch(origin+'/example-book/%2e%2e/%2e%2e/book.yaml')).status,404);
 await context.close();
});
