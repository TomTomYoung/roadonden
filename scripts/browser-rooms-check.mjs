import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs'));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await mkdir('test-results',{recursive:true});
const url=pathToFileURL(path.resolve('index.html')).href;
async function destination(term,id){await page.click('#map');await page.getByRole('searchbox',{name:'場所を検索'}).fill(term);await page.locator('#modal-body .stack button').first().click();await page.waitForFunction(id=>document.querySelector('#town').dataset.location===id,id,{timeout:60000});await idle();}
async function idle(){await page.waitForFunction(()=>document.querySelector('#activity').textContent.includes('足を止め'));}
async function bee(label){await page.locator('#people button').filter({hasText:'ビー クレイドル'}).click();await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(400);await idle();await page.waitForTimeout(350);}
async function nearby(label){await page.getByRole('button',{name:label,exact:true}).click();await page.getByRole('button',{name:'やってみる',exact:true}).click();await page.waitForTimeout(400);await idle();await page.waitForTimeout(350);}
try{
 await page.goto(url);await page.getByRole('button',{name:'街を歩く',exact:true}).click();
 await destination('ビーとフィンの居間','vera');
 await nearby('ゆりかごの脚と敷物の縁を見る');await page.locator('#people button').filter({hasText:'ビー クレイドル'}).click();assert.equal(await page.getByRole('button',{name:'平らな床で様子を見ることを相談する',exact:true}).count(),0);await page.click('#close-modal');
 console.log('PASS local inspection does not silently inform Bee or grant permission');
 await bee('片脚が敷物の縁に乗っていると伝える');await bee('平らな床で様子を見ることを相談する');await page.waitForTimeout(1000);await page.click('#wait');
 await page.waitForFunction(()=>document.querySelector('#people').textContent.includes('温かい茶を入れ直す'),null,{timeout:30000});await page.screenshot({path:'test-results/town-parent-after-sleep.png',fullPage:true});
 await page.waitForTimeout(7500);await page.click('#save-menu');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'セーブをJSONファイルで持ち出す',exact:true}).click();const download=await pending;await download.saveAs('test-results/rooms-parent-save.json');const save=JSON.parse(await readFile('test-results/rooms-parent-save.json','utf8'));
 assert.ok(save.state.completions.C020.achievedAt<save.state.completions.C021.achievedAt);assert.deepEqual(save.state.actors.C020.beliefs,{});assert.ok(save.state.facts['bee.rest']);assert.equal(save.contentVersion,'town-0.6.0');console.log('PASS real UI route completes child sleep and later parent rest, with valid JSON export');
 await page.click('#close-modal');await page.locator('#people button').filter({hasText:'フィン'}).click();assert.match(await page.locator('#modal-kicker').innerText(),/様子を見る/);assert.match(await page.locator('#modal-body').innerText(),/安定して眠って/);await page.click('#close-modal');console.log('PASS baby uses observation and a sleeping sprite instead of adult dialogue');
 // Choose the visible corridor explicitly; a closed kitchen is not entered by a map click.
 await destination('干し場のあるアパート・2階共用廊下','H.hall2');await destination('ネルの台所','H.hall2');
 assert.equal(await page.locator('#town').getAttribute('data-location'),'H.hall2');assert.match(await page.locator('#toast').innerText(),/戸が閉じ/);
 await destination('ネルの側窓','nellWindow');await nearby('側窓から用件を呼びかける');await page.locator('#people button').filter({hasText:'ネル ステッチ'}).waitFor({timeout:15000});await page.screenshot({path:'test-results/town-nell-window.png',fullPage:true});console.log('PASS closed kitchen blocks entry and the side window brings Nell to actual contact');
 await page.click('#save-menu');const link=await page.getByRole('link',{name:'前の全体マップ版を開く（town-0.4.0のセーブ用）'}).getAttribute('href');const legacy=await context.newPage();await legacy.goto(new URL(link,url).href);await legacy.getByRole('button',{name:'街を歩く',exact:true}).click();assert.equal(await legacy.locator('#town').getAttribute('data-assets-ready'),'168');await legacy.click('#save-menu');assert.equal(await legacy.getByRole('link',{name:'旧・三棟版を開く（block-0.3.0のセーブ用）'}).getAttribute('href'),'block-0.3.0.html');console.log('PASS previous town build and its older-build links remain usable');
 assert.deepEqual(errors,[]);console.log('5 rooms browser checks passed.');
}finally{await browser.close();}
