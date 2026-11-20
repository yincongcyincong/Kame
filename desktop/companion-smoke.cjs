// Run after make build: npm run test:companion. Uses a local fake model and simulated microphone.
const { app, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');
const { createServer } = require('node:http');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { once } = require('node:events');
const assert = require('node:assert/strict');
const temporary = mkdtempSync(join(tmpdir(), 'companion-smoke-'));
app.setPath('userData', temporary);
let server, model, win;
const requests = [], errors = [];
let modelFinished = false;
const deadline = setTimeout(() => finish(new Error('AI companion smoke timed out')), 45000);
function finish(error) {
  clearTimeout(deadline);
  if (error) console.error(error);
  server?.kill(); model?.close(); win?.destroy();
  rmSync(temporary, { recursive: true, force: true });
  app.exit(error ? 1 : 0);
}
(async () => {
  model = createServer(async (request, response) => {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw); requests.push(body);
    assert.equal(request.headers.authorization, 'Bearer fake-smoke-key');
    const hasResult = body.messages.at(-1).role === 'tool';
    if (!body.stream) {
      response.setHeader('content-type','application/json');
      response.end(JSON.stringify({choices:[{message:{role:'assistant',content:'兼容回复。'}}]}));return;
    }
    response.setHeader('content-type','text/event-stream');
    const send = value => response.write('data: '+JSON.stringify(value)+'\n\n');
    if (hasResult) {
      modelFinished = false;
      setTimeout(() => send({choices:[{index:0,delta:{content:'我向左走了一点。'}}]}),120);
      setTimeout(() => {
        send({choices:[{index:0,delta:{content:'现在轮到你啦。'},finish_reason:'stop'}]});
        modelFinished = true; response.end('data: [DONE]\n\n');
      },1000);
    } else {
      setTimeout(() => {
        send({choices:[{index:0,delta:{tool_calls:[{index:0,id:'move-'+requests.length,type:'function',function:{name:'move_character',arguments:'{"direction":"le'}}]}}]});
        send({choices:[{index:0,delta:{tool_calls:[{index:0,function:{arguments:'ft","duration_ms":500}'}}]},finish_reason:'tool_calls'}]});
        response.end('data: [DONE]\n\n');
      },120);
    }
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  server = spawn(resolve('.build/learning-server'), ['-listen','127.0.0.1:0','-db',join(temporary,'learning.db'),'-assets',resolve('dist')], { stdio:['ignore','pipe','inherit'] });
  const [line] = await once(server.stdout, 'data'); const url = line.toString().trim();
  const preload = join(temporary, 'test-preload.cjs');
  writeFileSync(preload, `
    const handlers = new Set();
    window.__speechStarts = 0; window.__spoken = [];
    const NativeEventSource = window.EventSource;
    window.EventSource = class extends NativeEventSource {
      addEventListener(type, listener, options) {
        super.addEventListener(type, type === 'action' ? event => { listener(event); listener(event); } : listener, options);
      }
    };
    window.gameSpeech = { available:true, start: async () => {window.__speechStarts++; for (const f of handlers) f({type:'ready',onDevice:true});}, stop: async()=>{}, subscribe:f=>{handlers.add(f);return()=>handlers.delete(f);} };
    window.__speechEvent = value => {for (const f of handlers) f(value);};
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],addEventListener:()=>{},removeEventListener:()=>{},cancel:()=>{},speak:utterance=>{window.__spoken.push({text:utterance.text,time:performance.now()});setTimeout(()=>utterance.onend?.(),250);}}});
  `);
  await app.whenReady();
  win = new BrowserWindow({show:false,width:1220,height:950,webPreferences:{preload,contextIsolation:false,backgroundThrottling:false}});
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  await win.loadURL(url);
  const js = script => win.webContents.executeJavaScript(script);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(script) { for(let i=0;i<120;i++){if(await js(script))return;await pause(50);}throw new Error('Missing condition: '+script+'\n'+await js('document.body.innerText')); }
  async function click(selector, text='') { await js(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>!e.disabled&&e.getClientRects().length&&e.textContent.includes(${JSON.stringify(text)}));if(!el)throw Error('Missing button '+${JSON.stringify(text)});el.click()})()`); await pause(70); }
  await wait("!!document.querySelector('.companion-panel')");
  await click('.companion-config-button');
  await js(`(()=>{const values=['http://127.0.0.1:${model.address().port}/v1','mock-play-model','fake-smoke-key'];const inputs=[...document.querySelectorAll('.companion-settings input')].filter(e=>e.type!=='range');inputs.forEach((input,i)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,values[i]);input.dispatchEvent(new Event('input',{bubbles:true}));})})()`);
  await click('.companion-settings button[type=submit]');
  await wait("!document.querySelector('.companion-settings')");
  assert.equal(await js("localStorage.length"), 0);
  const config = await js("fetch('/api/companion/config').then(r=>r.json())");
  assert.equal(config.hasKey,true);assert.equal(config.key,undefined);
  await click('.series-jojo'); await click('.mission-card','给 JOJO 喂饭');
  await wait("!!document.querySelector('.mission-screen .companion-panel')");
  await click('.companion-status button','开启陪玩');
  await click('.companion-input button','开始语音');
  await wait('window.__speechStarts>0');
  const x = await js("parseFloat(document.querySelector('.world-player').style.left)");
  const localStarted = Date.now();
  await js("window.__speechEvent({type:'voice'});window.__speechEvent({type:'transcript',text:'请向左走一步'});");
  await pause(600); assert.equal(await js("parseFloat(document.querySelector('.world-player').style.left)"),x,'sent before configured silence');
  await wait("parseFloat(document.querySelector('.world-player').style.left)<"+(x-1));
  const localFirstMove = Date.now()-localStarted;
  await wait("!!document.querySelector('.companion-speech') && !document.querySelector('.companion-input input').disabled");
  assert.equal(requests.length,0,'simple command went through model');
  await wait('window.__speechStarts>=2');
  const beforeModel = await js("parseFloat(document.querySelector('.world-player').style.left)");
  await js("window.__speechEvent({type:'voice'});window.__speechEvent({type:'transcript',text:'你能向左移动一些，陪我去找 JOJO 吗？'});");
  await wait("document.querySelector('.companion-input input').disabled");
  await js("window.__speechEvent({type:'transcript',text:'重复发送不应该生效'});document.querySelector('.companion-input').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));");
  await wait("window.__spoken.some(item=>item.text==='我向左走了一点。')");
  assert.equal(modelFinished,false,'speech waited for the entire model response');
  assert.equal(await js("document.querySelector('.companion-input input').disabled"),true,'turn unlocked while stream still active');
  await wait("document.querySelector('.companion-speech')?.textContent.includes('轮到你') && !document.querySelector('.companion-input input').disabled");
  assert.equal(requests.length,2,'duplicate message reached model');
  assert.equal(requests[0].stream,true);
  const after = await js("parseFloat(document.querySelector('.world-player').style.left)");assert.ok(after<beforeModel-5,`character did not move: ${beforeModel} -> ${after}`); assert.ok(after>beforeModel-23,'replayed SSE action moved character twice');
  assert.ok(JSON.parse(requests[1].messages.at(-1).content).ok,'model did not receive successful game result');
  assert.ok(await js("!!document.querySelector('.world-player .companion-speech')"),'response not attached to character');
  console.log('Local fake-microphone silence → first movement: '+localFirstMove+' ms (includes default 1000 ms silence).');
  await js("document.querySelector('.companion-config-button').click();null");
  const endpoint=await js("document.querySelector('.companion-settings code').textContent");
  const mcp=await js(`fetch(${JSON.stringify(endpoint)},{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}).then(r=>r.json())`);
  assert.equal(mcp.result.tools.length,4);
  writeFileSync(resolve('.build/companion-preview.png'), (await win.webContents.capturePage()).toPNG());
  await click('.companion-settings button','收起');
  const beforeMCP = await js("parseFloat(document.querySelector('.world-player').style.left)");
  const moved = await js(`fetch(${JSON.stringify(endpoint)},{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'move_character',arguments:{direction:'right',duration_ms:250}}})}).then(r=>r.json())`);
  assert.equal(moved.result.isError,false);
  assert.ok(await js("parseFloat(document.querySelector('.world-player').style.left)")>beforeMCP+2);
  const cancelling = js(`fetch(${JSON.stringify(endpoint)},{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'move_character',arguments:{direction:'left',duration_ms:2000}}})}).then(r=>r.json())`);
  await pause(500);
  await click('.companion-status button','关闭陪玩');
  assert.equal((await cancelling).result.isError,true,'stop did not cancel MCP movement');
  assert.equal(await js("document.querySelectorAll('.is-listening').length"),0);
  await click('.screen-exit');await click('.brand');
  await wait("!!document.querySelector('.series-gallery') && !!document.querySelector('main > .companion-panel')");
  assert.deepEqual(errors,[]);
  console.log('PASS: configuration, private key handling, configurable one-second voice submission, local commands without model requests, incremental sentence speech before generation ends, SSE action push, duplicate lock, model → game action → tool result, character bubble, MCP tools/list and tools/call, movement cancellation, stop and navigation.');
  finish();
})().catch(finish);
