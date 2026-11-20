import test from 'node:test';
import assert from 'node:assert/strict';
import { CompanionTurnGate, registerCompanionMovement, executeGameAction, gameSnapshot, cancelCompanionActions } from './companion-bridge.mjs';

test('语音或手动重复提交不能进入正在执行的回合，失败后可以重试', async () => {
  const gate = new CompanionTurnGate();
  let complete;
  const first = gate.run(() => new Promise(resolve => { complete = resolve; }));
  assert.equal(await gate.run(() => assert.fail('重复发送')), false);
  complete(); assert.equal(await first, true);
  await assert.rejects(gate.run(async () => { throw new Error('模型断线'); }));
  assert.equal(await gate.run(async () => {}), true);
});

test('动作绑定当前场景，停用陪玩可取消移动', async () => {
  const root = { dataset: { aiScene: 'scene-a' }, querySelectorAll: () => [] };
  globalThis.document = { querySelector: () => root };
  let requested = 0;
  const unregister = registerCompanionMovement((_args, signal) => new Promise((_resolve, reject) => {
    requested++;
    signal.addEventListener('abort', () => reject(new Error('动作已取消')), { once: true });
  }), () => ({ x: 49, y: 87 }));
  const context = gameSnapshot().context_id;
  assert.ok(context.startsWith('scene-a:'));
  await assert.rejects(executeGameAction({ name: 'move_character', context: 'scene-old', arguments: {} }), /场景已切换/);
  assert.equal(requested, 0);
  const pending = executeGameAction({ name: 'move_character', context, arguments: { direction: 'left', duration_ms: 500 } });
  cancelCompanionActions();
  await assert.rejects(pending, /动作已取消/);
  assert.equal(requested, 1);
  unregister(); delete globalThis.document;
});

import { localGameCommand, shouldSubmitSpeech, SentenceBuffer, readCompanionEvents } from './companion-speed.mjs';

test('本地指令只匹配明确单步操作，否定、疑问和复合任务交给模型', () => {
  assert.equal(localGameCommand('请你向左走一步。').arguments.direction, 'left');
  assert.equal(localGameCommand('小星，帮我发射光球！').name, 'fire');
  assert.equal(localGameCommand('停下来').name, 'stop');
  for (const text of ['不要向左走', '向左走吗？', '向左走还是向右走', '先向左走，再问问 JOJO', '如果发射会怎样', '请往左边看']) assert.equal(localGameCommand(text), null, text);
});

test('静音可配置，持续讲话、识别更新和忙碌状态阻止过早提交', () => {
  const state = { enabled:true,listening:true,gate:{busy:false},transcript:'你好',lastVoice:1000,lastTranscript:1100,silenceMs:1000 };
  assert.equal(shouldSubmitSpeech(state,1999),false);
  assert.equal(shouldSubmitSpeech(state,2000),true);
  assert.equal(shouldSubmitSpeech({...state,silenceMs:2000},2000),false);
  assert.equal(shouldSubmitSpeech({...state,lastVoice:1800},2000),false);
  assert.equal(shouldSubmitSpeech({...state,lastTranscript:1950},2000),false);
  assert.equal(shouldSubmitSpeech({...state,gate:{busy:true}},3000),false);
});

test('流式句子及时输出，尾句不会丢失或重复', () => {
  const buffer = new SentenceBuffer();
  assert.deepEqual(buffer.push('我们先去'),[]);
  assert.deepEqual(buffer.push('找警长。然后'),['我们先去找警长。']);
  assert.deepEqual(buffer.push('看线索！'),['然后看线索！']);
  assert.deepEqual(buffer.push('准备好了',true),['准备好了']);
  assert.deepEqual(buffer.push('',true),[]);
});

test('下游流跨 UTF-8 和 JSON 分块仍能增量展示，缺少结束标记报告中断', async () => {
  const encoder = new TextEncoder(), events = [];
  const body = encoder.encode('{"type":"delta","text":"你好。"}\n{"type":"done","reply":"你好。"}\n');
  const stream = new ReadableStream({start(controller){for(let i=0;i<body.length;i+=2) controller.enqueue(body.slice(i,i+2));controller.close();}});
  const result = await readCompanionEvents(new Response(stream,{headers:{'content-type':'application/x-ndjson'}}),event=>events.push(event));
  assert.equal(events[0].text,'你好。');assert.equal(result.reply,'你好。');
  await assert.rejects(readCompanionEvents(new Response('{"type":"delta","text":"半句"}\n',{headers:{'content-type':'application/x-ndjson'}}),()=>{}),/连接中断/);
});
