import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {route} from '../src/content/dinner.ts';
const modulePath=process.env.PLAYWRIGHT_MODULE??(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs'):'playwright');
const {chromium}=await import(modulePath);
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
await mkdir('test-results',{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));
const url=pathToFileURL(path.resolve('index.html')).href;
let count=0;const pass=text=>{count++;console.log(`PASS ${text}`);};
async function waitForText(selector,text){await page.waitForFunction(([selector,text])=>document.querySelector(selector)?.textContent.includes(text),[selector,text]);}
async function go(id){const from=await page.locator('#town').getAttribute('data-location');for(const next of route(from,id)){await page.locator(`#exits button[data-location-id="${next}"]`).click();await page.waitForFunction(next=>document.querySelector('#town').dataset.location===next,next);await page.waitForFunction(()=>document.querySelector('#activity').textContent.includes('足を止め'));}}
async function talkNora(){await page.getByRole('button',{name:'ノラ フィンチ',exact:true}).click();}
try{
 await page.goto(url);await page.getByRole('button',{name:'街を歩く',exact:true}).click();
 assert.equal(requests.filter(url=>/^https?:/.test(url)).length,0);assert.equal(errors.length,0);assert.equal(await page.locator('#town').getAttribute('data-assets-ready'),'53');pass('standalone block loads every embedded SVG without external requests');await page.click('#zoom-in');await page.click('#zoom-in');await page.screenshot({path:'test-results/block-zoom.png',fullPage:true});
 const bounds=await page.locator('#town').boundingBox();const scale=bounds.width/1300;
 // At this left-edge camera position, the A1 landing is visible to the right of reception.
 await page.mouse.click(bounds.x+332*2.2*scale,bounds.y+(650*2.2+(450-610*2.2))*scale);
 await page.waitForFunction(()=>document.querySelector('#town').dataset.location==='a1');
 await page.waitForFunction(()=>document.querySelector('#activity').textContent.includes('足を止め'));
 pass('zoomed canvas hit testing walks to the visible landing');await page.click('#zoom-reset');
 await page.screenshot({path:'test-results/block-desktop.png',fullPage:true});await go('aRoof');assert.match(await page.locator('#location-level').innerText(),/屋上/);pass('three floors and the rooftop are reachable through landings');
 await go('home');await talkNora();
 const frozen=await page.locator('#time').innerText();await page.waitForTimeout(450);assert.equal(await page.locator('#time').innerText(),frozen);pass('walking climbs A stairs to room 201; conversation pauses world time');
 await page.getByRole('button',{name:'夕食の予定を聞く',exact:true}).click();await waitForText('#toast','201号室');
 // Testimony arrives on the next simulation boundary, after the utterance finishes.
 await page.waitForTimeout(300);
 await page.click('#notebook');assert.match(await page.locator('#modal-body').innerText(),/ノラ フィンチから聞いたこと/);assert.match(await page.locator('#modal-body').innerText(),/支払済み/);assert.doesNotMatch(await page.locator('#modal-body').innerText(),/C00[1-9]|quay\.|school\./);pass('notebook records sourced testimony without internal identifiers');await page.click('#close-modal');
 await talkNora();await page.getByRole('button',{name:'包みを代わりに受け取る許可をもらう',exact:true}).click();await page.waitForTimeout(1200);
 await talkNora();await page.getByRole('button',{name:'代理受取りの了承を確かめる',exact:true}).click();await waitForText('#toast','メイベルには');
 await go('market');
 for(const name of ['ノラの注文内容を伝える','ノラの代理受取りの了承を伝える','取り置きの包みを預かる']){
  await page.getByRole('button',{name:'メイベル グリーン',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(1200);
 }
 await page.click('#inventory');assert.match(await page.locator('#modal-body').innerText(),/支払済みの野菜の包み/);assert.match(await page.locator('#modal-body').innerText(),/持ち主：ノラ フィンチ/);await page.click('#close-modal');pass('consented delivery transfers the one package into player custody');
 await go('home');await talkNora();await page.getByRole('button',{name:'野菜の包みを手渡す',exact:true}).click();await waitForText('#toast','ノラが包みを受け取った');
 await page.click('#save-menu');await page.getByRole('button',{name:'保存',exact:true}).first().click();await waitForText('#toast','記録しました');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'セーブをJSONファイルで持ち出す',exact:true}).click();const download=await downloadPromise;await download.saveAs('test-results/dinner-save.json');
 await page.getByRole('button',{name:'再開',exact:true}).first().click();await waitForText('#toast','再開しました');pass('manual save and JSON download preserve an active cooking world');
 await page.click('#save-menu');const before=await page.locator('#time').innerText();await page.locator('input[type=file]').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await waitForText('#toast','読み込めませんでした');assert.equal(await page.locator('#time').innerText(),before);await page.locator('input[type=file]').setInputFiles('test-results/dinner-save.json');await waitForText('#toast','再開しました');pass('invalid import retains current game; exported save restores it');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const hiddenTime=await page.locator('#time').innerText();await page.waitForTimeout(400);assert.equal(await page.locator('#time').innerText(),hiddenTime);assert.match(await page.locator('#running').innerText(),/止まっています/);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});pass('hidden tab stops simulation without background catch-up');
 await page.screenshot({path:'test-results/dinner-home.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.click('#zoom-in');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/dinner-narrow.png',fullPage:true});pass('narrow layout retains controls with no horizontal overflow');
 const denied=await context.newPage();await denied.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('quota','QuotaExceededError');};});await denied.goto(url);await denied.getByRole('button',{name:'街を歩く',exact:true}).click();await denied.click('#save-menu');await denied.getByRole('button',{name:'保存',exact:true}).first().click();await denied.waitForFunction(()=>document.querySelector('#toast').classList.contains('error'));assert.match(await denied.locator('#toast').innerText(),/quota/);pass('storage refusal displays failure');
 await page.click('#save-menu');const oldLink=await page.getByRole('link',{name:'旧・街歩き版を開く（旧セーブ用）'}).getAttribute('href');
 const legacy=await context.newPage();await legacy.goto(new URL(oldLink,url).href);await legacy.getByRole('button',{name:'街を歩く',exact:true}).click();assert.match(await legacy.locator('#place-name').innerText(),/旅人の宿/);await legacy.close();pass('the preserved legacy build remains reachable for old saves');
 assert.equal(errors.length,0);console.log(`${count} dinner browser checks passed.`);
}finally{await browser.close();}
