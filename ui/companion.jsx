import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { companionSession, gameSnapshot, executeGameAction, setCompanionProgress, CompanionTurnGate, cancelCompanionActions } from './companion-bridge.mjs';
import { localGameCommand, shouldSubmitSpeech, SentenceBuffer, readCompanionEvents } from './companion-speed.mjs';
import { speak, localVoices, isGameSpeaking, cancelGameSpeech } from './speech.mjs';

async function api(path, body, signal) {
  const response = await fetch('/api/companion/' + path, body === undefined ? { signal } : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
  if (!response.ok) throw new Error((await response.text()).trim() || '陪玩连接失败');
  return response.json();
}
const initialSettings = { url: '', model: '', key: '', hasKey: false, configured: false };

export function Companion({ position }) {
  const [settings, setSettings] = useState(initialSettings);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState('准备好了，开启后可以和我一起玩。');
  const [text, setText] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(.9);
  const [silenceMs, setSilenceMs] = useState(1000);
  const [timing, setTiming] = useState('');
  const [mount, setMount] = useState(null);
  const [speaker, setSpeaker] = useState(null);
  const runtime = useRef({ enabled: false, listening: false, gate: new CompanionTurnGate(), history: [], transcript: '', prefix: '', lastVoice: 0, controller: null, generation: 0, speechEpoch: 0, silenceMs:1000, lastTranscript:0 });
  runtime.current.silenceMs = silenceMs;
  const sendRef = useRef(null);
  const native = window.gameSpeech?.available;

  useEffect(() => {
    api('config').then(value => setSettings({ ...initialSettings, ...value })).catch(e => setError(e.message));
    const refresh = () => setVoices(localVoices());
    refresh(); window.speechSynthesis?.addEventListener('voiceschanged', refresh);
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', refresh);
      runtime.current.enabled = false; runtime.current.listening = false;
      runtime.current.controller?.abort(); window.gameSpeech?.stop(); cancelGameSpeech();
    };
  }, []);

  useEffect(() => {
    if (!open || !mount) return;
    const frame = requestAnimationFrame(() => mount.querySelector('.companion-settings')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    return () => cancelAnimationFrame(frame);
  }, [open, mount]);

  function stopSpeech() {
    runtime.current.speechEpoch++;
    window.gameSpeech?.stop().catch(() => {});
  }
  function startSpeech(preserve = false) {
    const current = runtime.current;
    if (!native || !current.enabled || !current.listening || current.gate.busy || isGameSpeaking()) return;
    if (!preserve) { current.transcript = ''; current.prefix = ''; current.lastVoice = 0; }
    current.speechEpoch++;
    window.gameSpeech.start().catch(e => { setError(e.message); current.listening = false; setListening(false); });
  }
  function stopTurn() {
    const current = runtime.current;
    cancelCompanionActions(); current.generation++; current.controller?.abort();
    cancelGameSpeech(); stopSpeech();
    current.transcript = ''; current.prefix = ''; current.history = []; setText(''); setReply('');
  }
  useEffect(() => {
    setCompanionProgress(position);
    setMount(document.querySelector('.mission-screen') || document.querySelector('main'));
    setSpeaker(document.querySelector('.mission-screen .range-map-actor'));
    stopTurn();
    setPhase('准备好了，可以告诉我想做什么。');
    // The cancelled turn releases the gate before voice capture resumes.
    const timer = setTimeout(startSpeech, 150);
    return () => clearTimeout(timer);
  }, [position?.当前游戏, position?.当前站]);
  useEffect(() => { setCompanionProgress(position); }, [position]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false, connected = false, polling = false, source;
    let chain = Promise.resolve();
    const seen = new Map();
    const receive = action => {
      if (seen.has(action.id)) return;
      seen.set(action.id, true);
      if (seen.size > 100) seen.delete(seen.keys().next().value);
      chain = chain.then(async () => {
        let result;
        try {
          if (!runtime.current.enabled || disposed) throw new Error('陪玩已关闭');
          const data = await executeGameAction(action);
          result = { ok: true, data };
          setPhase('已执行：' + ({ move_character:'移动角色',fire:'发射光球',interact:action.arguments?.label }[action.name] || action.name));
        } catch (e) { result = { ok:false,error:e.message }; }
        await api('result', { session:companionSession,id:action.id,result });
      }).catch(e => { if (!disposed) setError(e.message); });
    };
    const heartbeat = () => api('state', { session:companionSession,state:gameSnapshot() }).catch(e => { if (!disposed) setError(e.message); });
    heartbeat().then(() => {
      if (disposed || !window.EventSource) return;
      source = new EventSource('/api/companion/events?session=' + companionSession);
      source.addEventListener('ready', () => { connected = true; });
      source.addEventListener('action', event => { if (!disposed) receive(JSON.parse(event.data)); });
      source.onerror = () => { connected = false; };
    });
    const poll = async () => {
      if (disposed || connected || polling) return;
      polling = true;
      try { for (const action of await api('actions?session=' + companionSession)) receive(action); }
      catch (e) { if (!disposed) setError(e.message); }
      finally { polling = false; }
    };
    const beat = setInterval(heartbeat, 1500), fallback = setInterval(poll, 300);
    return () => { disposed = true; source?.close(); clearInterval(beat); clearInterval(fallback); };
  }, [enabled]);

  useEffect(() => {
    if (!native) return;
    const playback = event => {
      const current = runtime.current;
      if (!current.enabled || !current.listening || current.gate.busy) return;
      if (event.detail) { stopSpeech(); current.transcript = ''; current.prefix = ''; current.lastVoice = 0; setText(''); setPhase('正在听角色说话，结束后继续收音…'); }
      else startSpeech();
    };
    window.addEventListener('game-voice-playback', playback);
    const unsubscribe = window.gameSpeech.subscribe(event => {
      const current = runtime.current;
      if (!current.enabled || !current.listening || current.gate.busy || isGameSpeaking()) return;
      if (event.type === 'ready') {
        setPhase(`正在听 · ${event.onDevice ? 'Mac 设备端识别' : 'Apple 在线识别'} · 停顿 ${current.silenceMs / 1000} 秒发送`);
      } else if (event.type === 'voice') {
        current.lastVoice = performance.now();
      } else if (event.type === 'transcript') {
        current.transcript = (current.prefix + event.text).slice(0, 1500); current.lastTranscript = performance.now(); setText(current.transcript);
        if (!current.lastVoice) current.lastVoice = performance.now();
      } else if (event.type === 'error') {
        setError(event.message); current.listening = false; setListening(false);
      } else if (event.type === 'ended') {
        const epoch = current.speechEpoch;
        // Renew Apple's bounded recognition sessions without losing a sentence or its silence timer.
        current.prefix = current.transcript.trim() ? current.transcript.trim() + ' ' : '';
        setTimeout(() => { if (current.speechEpoch === epoch) startSpeech(true); }, current.prefix ? 150 : 900);
      }
    });
    const timer = setInterval(() => {
      const current = runtime.current;
      if (shouldSubmitSpeech(current, performance.now())) {
        const value = current.transcript; current.transcript = ''; sendRef.current(value);
      }
    }, 50);
    return () => { unsubscribe(); clearInterval(timer); window.removeEventListener('game-voice-playback', playback); };
  }, []);

  async function send(value) {
    const message = value.trim(), current = runtime.current;
    if (!message || !current.enabled || current.gate.busy) return;
    const generation = current.generation;
    await current.gate.run(async () => {
      const began = performance.now();
      setBusy(true); setError(''); setTiming(''); setReply(''); setPhase('正在想办法，和你一起行动…'); stopSpeech();
      current.controller = new AbortController();
      const signal = current.controller.signal;
      const timeout = setTimeout(() => current.controller?.abort(), 80000);
      let speech = Promise.resolve(), partial = '', firstText = false;
      const buffer = new SentenceBuffer();
      const enqueue = words => {
        for (const sentence of words) speech = speech.then(() => new Promise(resolve => {
          if (signal.aborted || generation !== current.generation) { resolve(); return; }
          let finished = false;
          const done = () => {
            if (finished) return; finished = true; clearTimeout(timer); signal.removeEventListener('abort', abort); resolve();
          };
          const abort = () => { cancelGameSpeech(); done(); };
          const timer = setTimeout(() => { cancelGameSpeech(); done(); }, 30000);
          signal.addEventListener('abort', abort, { once:true });
          if (!speak(sentence, 'zh', () => setError('朗读不可用，回复已显示在角色旁。'), {voiceURI,rate,onFinish:done})) done();
        }));
      };
      try {
        const local = localGameCommand(message);
        const history = [...current.history.slice(-8), {role:'user',content:message}];
        let result;
        if (local) {
          if (local.name === 'stop') cancelCompanionActions();
          else await executeGameAction({...local,context:gameSnapshot().context_id});
          if (generation !== current.generation || signal.aborted) return;
          result = {reply:local.reply}; setReply(result.reply); setText('');
          setTiming(`本地指令完成 ${Math.round(performance.now() - began)} ms`); enqueue(buffer.push(result.reply,true));
        } else {
          const response = await fetch('/api/companion/chat', {
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({session:companionSession,history,state:gameSnapshot(),stream:true}),signal,
          });
          result = await readCompanionEvents(response, event => {
            if (generation !== current.generation || signal.aborted) return;
            if (event.type === 'round') { enqueue(buffer.push('',true)); partial = ''; }
            if (event.type === 'delta') {
              if (!firstText) { firstText = true; setTiming(`模型首段文字 ${Math.round(performance.now() - began)} ms`); }
              partial += event.text; setReply(partial); setText(''); setPhase('正在回应…');
              enqueue(buffer.push(event.text));
            }
            if (event.type === 'done') { setReply(event.reply); enqueue(buffer.push('',true)); }
          });
        }
        if (!current.enabled || generation !== current.generation || signal.aborted) return;
        current.history = [...history,{role:'assistant',content:result.reply}];
        setPhase('正在说话…'); await speech;
        if (generation === current.generation && !signal.aborted) setPhase('轮到你啦，可以继续说。');
      } catch (e) {
        current.controller?.abort();
        if (generation === current.generation) {
          setError(e.name === 'AbortError' ? '请求已取消或超时，请重试。' : e.message);
          setPhase('本轮已停止，可以重试。');
        }
      } finally { clearTimeout(timeout); await speech; current.controller = null; setBusy(false); }
    });
    if (current.enabled && current.listening) startSpeech();
  }
  sendRef.current = send;

  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api('config', { url: settings.url, model: settings.model, key: settings.key });
      const saved = await api('config'); setSettings({ ...initialSettings, ...saved }); setOpen(false);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  function toggleEnabled() {
    if (!settings.configured) { setOpen(true); return; }
    const value = !enabled; runtime.current.enabled = value; setEnabled(value); setError('');
    if (!value) { runtime.current.listening = false; setListening(false); stopTurn(); setPhase('陪玩已关闭。'); }
  }
  const controls = <section className="companion-panel" aria-label="AI 陪玩控制">
    <div className="companion-status"><strong>小星陪玩</strong><span role="status">{phase}</span>
      <button type="button" className="listen" onClick={toggleEnabled}>{enabled ? '关闭陪玩' : '开启陪玩'}</button>
      <button type="button" className="listen" onClick={() => setOpen(!open)}>配置</button>
    </div>
    {enabled && <form className="companion-input" onSubmit={event => { event.preventDefault(); send(text); }}>
      <button type="button" className={'listen' + (listening ? ' is-listening' : '')} disabled={!native || busy} onClick={() => {
        const value = !listening; runtime.current.listening = value; setListening(value); setError('');
        if (value) { cancelGameSpeech(); startSpeech(); } else { stopSpeech(); runtime.current.transcript = ''; setPhase('已暂停语音，可以打字。'); }
      }}>{listening ? '暂停麦克风' : '开始语音'}</button>
      <input aria-label="对小星说" placeholder={native ? '说话或输入游戏指令…' : '输入游戏指令；自动语音需要 Mac 客户端'} maxLength={1500} value={text} disabled={busy} onChange={event => setText(event.target.value)} />
      <button type="submit" className="primary" disabled={busy || !text.trim()}>发送</button>
      {busy && <button type="button" className="listen" onClick={() => { stopTurn(); setPhase('本轮已停止。'); }}>停止</button>}
    </form>}
    {enabled && !native && <small>网页可打字陪玩，也可使用系统听写向输入框输入文字。</small>}
    {timing && <small className="companion-timing">{timing}（从提交开始计时）</small>}
    {error && <p className="companion-error" role="alert">{error}</p>}
    {reply && !speaker && <p className="companion-reply">小星：{reply}</p>}
  </section>;

  return <>
    <button className="listen companion-config-button" onClick={() => setOpen(!open)}>⚙ AI 陪玩配置</button>
    {mount && createPortal(<>
      {open && <section className="companion-settings" aria-label="AI 陪玩配置">
        <form onSubmit={save}>
          <h3>AI 陪玩配置</h3>
          <p>配置支持工具调用的 Chat Completions 兼容接口。请求由本机 Go 后端发送。</p>
          <label>API 地址<input type="url" required value={settings.url} placeholder="https://你的服务地址/v1" onChange={e => setSettings({ ...settings, url: e.target.value })} /></label>
          <label>模型名<input required value={settings.model} placeholder="填写服务商提供的模型 ID" onChange={e => setSettings({ ...settings, model: e.target.value })} /></label>
          <label>API Key<input type="password" autoComplete="off" value={settings.key} placeholder={settings.hasKey ? '已配置，留空保留当前 Key' : '本地无鉴权模型可留空'} onChange={e => setSettings({ ...settings, key: e.target.value })} /></label>
          <p>Key 仅保存在本次后端进程内存中，退出应用后清除。开启语音后，识别文字和游戏状态会发给该地址。</p>
          <label>Mac 朗读声音<select value={voiceURI} onChange={e => setVoiceURI(e.target.value)}><option value="">系统默认中文声音</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}</select></label>
          <label>说完后的等待时间<select value={silenceMs} onChange={event => setSilenceMs(Number(event.target.value))}>
            <option value={800}>0.8 秒 · 快速</option><option value={1000}>1 秒 · 默认</option><option value={1500}>1.5 秒 · 留出思考时间</option><option value={2000}>2 秒 · 充分停顿</option>
          </select></label>
          <small>明确的单步移动、发射和停止指令直接在本地执行。其他对话交给模型，回复按句朗读。</small>
          <label>语速<input type="range" min="0.6" max="1.2" step="0.05" value={rate} onChange={e => setRate(Number(e.target.value))} /></label>
          <small>允许动作：读取状态、移动角色、发射光球、当前场景按钮。拖拽和连续手势暂不支持。</small>
          <details><summary>本地 MCP 连接地址</summary><code>{location.origin}/mcp?session={companionSession}</code><p>开启陪玩后可连接此地址，工具结果会返回实际游戏状态。</p></details>
          <div className="companion-settings-actions">
            <button type="submit" className="primary" disabled={saving || busy}>{saving ? '保存中…' : '保存配置'}</button>
            <button type="button" className="listen" onClick={() => setOpen(false)}>收起</button>
            <button type="button" className="listen" disabled={busy} onClick={async () => {
              try { await api('config', { clear: true }); runtime.current.enabled = false; runtime.current.listening = false; setEnabled(false); setListening(false); stopTurn(); setSettings(initialSettings); } catch (e) { setError(e.message); }
            }}>清除配置</button>
          </div>
          {error && <p role="alert" className="companion-error">{error}</p>}
        </form>
      </section>}
      {controls}
    </>, mount)}
    {speaker && reply && createPortal(<div className="companion-speech" style={{
      transform: `translateX(${parseFloat(speaker.style.left) > 70 ? '-90%' : parseFloat(speaker.style.left) < 30 ? '-10%' : '-50%'})`,
      ...(parseFloat(speaker.style.top) < 35 ? { bottom: 'auto', top: 'calc(100% + 10px)' } : {}),
    }} aria-live="polite"><strong>小星</strong><p>{reply}</p></div>, speaker)}
  </>;
}
