import React, { useEffect, useRef, useState } from 'react';
import { localVoices, speak, systemDictationHint } from './speech.mjs';

const autoSendDelay = 2000;
const initialSettings = { url: '', model: '', key: '' };
const dictationHint = systemDictationHint();

export function Chat({ progress, settings, setSettings }) {
  const [visible, setVisible] = useState(true);
  const [draft, setDraft] = useState(initialSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [dictation, setDictation] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const [autoDraft, setAutoDraft] = useState(false);
  const [composing, setComposing] = useState(false);
  const [autoRead, setAutoRead] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceOptions, setVoiceOptions] = useState({ voiceURI: '', rate: 0.86 });
  const input = useRef(null);
  const history = useRef(null);
  const active = useRef(null);
  const narration = useRef(null);
  const busy = loading || reading;
  const readAutomatically = useRef(true);
  const currentVoiceOptions = useRef(voiceOptions);
  const sendLatest = useRef(null);
  const sendTimer = useRef(null);

  useEffect(() => {
    sendLatest.current = send;
  });

  useEffect(() => {
    if (!autoSend || !dictation || !autoDraft || composing || !question.trim() ||
        !settings || busy || !visible || settingsOpen) return;
    sendTimer.current = setTimeout(() => {
      const synthesis = window.speechSynthesis;
      if (!synthesis?.speaking && !synthesis?.pending) {
        sendLatest.current();
      } else {
        // Never feed words heard from the app's own speaker back into the conversation.
        setAutoDraft(false);
      }
    }, autoSendDelay);
    return () => clearTimeout(sendTimer.current);
  }, [autoSend, dictation, autoDraft, composing, question, settings, busy, visible, settingsOpen]);

  useEffect(() => {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const synthesis = window.speechSynthesis;
    const refreshVoices = () => setVoices(localVoices());
    synthesis?.addEventListener('voiceschanged', refreshVoices);
    refreshVoices();
    return () => synthesis?.removeEventListener('voiceschanged', refreshVoices);
  }, []);

  function updateVoice(options) {
    currentVoiceOptions.current = options;
    setVoiceOptions(options);
  }

  function stopReading() {
    narration.current = null;
    window.speechSynthesis?.cancel();
    setReading(false);
  }

  function read(text) {
    const token = Symbol();
    narration.current = token;
    setReading(true);
    setAutoDraft(false);
    clearTimeout(sendTimer.current);
    const finish = () => {
      if (narration.current !== token) return;
      narration.current = null;
      setReading(false);
    };
    const unavailable = () => setSpeechError('这次没有读出声音。可以点击「朗读」，或在系统中检查中文语音。');
    setSpeechError('');
    if (!speak(text, 'zh', unavailable, { ...currentVoiceOptions.current, onFinish: finish })) {
      finish();
      unavailable();
    }
  }

  function clearChat() {
    setAutoDraft(false);
    clearTimeout(sendTimer.current);
    active.current?.abort();
    active.current = null;
    stopReading();
    setMessages([]);
    setQuestion('');
    setLoading(false);
    setError('');
    setSpeechError('');
  }

  async function send() {
    const content = question.trim();
    if (!content || !settings || active.current || narration.current || composing) return;
    clearTimeout(sendTimer.current);
    setAutoDraft(false);
    const request = new AbortController();
    active.current = request;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setQuestion('');
    setLoading(true);
    setError('');
    setSpeechError('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, history: next.slice(-9), progress }),
        signal: request.signal,
      });
      if (!response.ok) throw new Error((await response.text()).trim());
      const { reply } = await response.json();
      if (active.current !== request) return;
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (readAutomatically.current) read(reply);
    } catch (failure) {
      if (active.current !== request) return;
      setMessages(messages);
      setQuestion(content);
      setError(failure.message === 'Failed to fetch' ? '连接中断，请再试一次。' : failure.message);
    } finally {
      if (active.current === request) {
        active.current = null;
        setLoading(false);
      }
    }
  }

  function openSettings() {
    setAutoDraft(false);
    clearTimeout(sendTimer.current);
    setDraft(settings ? { ...settings, key: '' } : initialSettings);
    setSettingsOpen(true);
  }

  function saveSettings(event) {
    event.preventDefault();
    const url = draft.url.trim();
    const model = draft.model.trim();
    if (!url || !model) return;
    const key = draft.key.trim() || (url === settings?.url && model === settings?.model ? settings.key : '');
    clearChat();
    setSettings({ url, model, key });
    setDraft(initialSettings);
    setSettingsOpen(false);
  }

  if (!visible) {
    return <aside className="chat-collapsed">
      <button type="button" className="chat-toggle" onClick={() => setVisible(true)}>💬 和小星聊天</button>
    </aside>;
  }

  return <aside className="chat-panel" aria-label="学习伙伴">
    <div className="chat-header">
      <div><span aria-hidden="true">✦</span> <strong>学习伙伴小星</strong></div>
      <div className="chat-actions">
        <button type="button" onClick={openSettings}>模型设置</button>
        <button type="button" onClick={() => {
          setAutoDraft(false);
          clearTimeout(sendTimer.current);
          setVisible(false);
        }} aria-label="收起聊天">收起</button>
      </div>
    </div>
    {settingsOpen ? <form className="chat-settings" onSubmit={saveSettings} autoComplete="off">
      <h2>模型设置</h2>
      <label>API 地址
        <input type="url" required maxLength={500} placeholder="https://example.com/v1" value={draft.url}
          onChange={event => setDraft({ ...draft, url: event.target.value })} />
      </label>
      <label>模型名
        <input required maxLength={150} placeholder="服务商提供的模型名" value={draft.model}
          onChange={event => setDraft({ ...draft, model: event.target.value })} />
      </label>
      <label>API Key
        <input type="password" autoComplete="new-password" maxLength={4096}
          placeholder={settings?.key ? '地址和模型不变时，留空沿用' : '无需密钥的本机模型可留空'}
          value={draft.key} onChange={event => setDraft({ ...draft, key: event.target.value })} />
      </label>
      <p className="chat-note">对话文字和当前游戏进度会发给所选模型服务。设置和对话仅保留在当前页面。</p>
      <div className="chat-actions">
        <button className="chat-send">保存设置</button>
        <button type="button" onClick={() => { setDraft(initialSettings); setSettingsOpen(false); }}>返回</button>
        {settings && <button type="button" onClick={() => {
          clearChat(); setSettings(null); setDraft(initialSettings); setSettingsOpen(false);
        }}>清除设置</button>}
      </div>
    </form> : <>
      <div className="chat-history" ref={history} role="log" aria-label="对话记录">
        <p className="chat-bubble assistant">嗨，我是小星！卡住的时候，可以问我要一个提示。</p>
        {!settings && <button type="button" className="chat-setup" onClick={openSettings}>请大人配置模型</button>}
        {messages.map((message, index) => <div className={`chat-message ${message.role}`} key={index}>
          <p className={`chat-bubble ${message.role}`}>{message.content}</p>
          {message.role === 'assistant' && <button type="button" className="chat-replay" disabled={busy} onClick={() => read(message.content)}>🔊 朗读</button>}
        </div>)}
        {loading && <p className="chat-bubble assistant" role="status">小星在想……</p>}
      </div>
      <form className="chat-compose" onSubmit={event => {
        event.preventDefault();
        send();
      }}>
        {error && <p className="chat-error" role="alert">{error}</p>}
        {speechError && <p className="chat-note" role="status">{speechError}</p>}
        {dictation && <>
          <p className="chat-note">{dictationHint} {autoSend ? '转写停下约 2 秒后会自动发送。' : '转写完成后点发送。'}</p>
          <label className="dictation-switch"><input type="checkbox" checked={autoSend} onChange={event => {
            clearTimeout(sendTimer.current);
            setAutoDraft(false);
            setAutoSend(event.target.checked);
            input.current?.focus();
          }} /> 免按发送</label>
        </>}
        <textarea ref={input} aria-label="给小星的消息" rows={2} placeholder="和小星说句话…" maxLength={600}
          value={question} readOnly={busy && !(autoSend && dictation)}
          onCompositionStart={() => { clearTimeout(sendTimer.current); setComposing(true); }}
          onCompositionEnd={() => setComposing(false)}
          onChange={event => {
            if (autoSend && dictation && (active.current || narration.current || window.speechSynthesis?.speaking || window.speechSynthesis?.pending)) return;
            clearTimeout(sendTimer.current);
            setQuestion(event.target.value);
            setAutoDraft(autoSend && dictation);
          }} />
        <div className="chat-actions">
          <button type="button" aria-pressed={dictation} disabled={busy} onClick={() => {
            setAutoDraft(false);
            clearTimeout(sendTimer.current);
            if (!dictation) {
              window.speechSynthesis?.cancel();
              input.current?.focus();
            }
            setDictation(!dictation);
          }}>{dictation ? '退出听写模式' : '🎙 系统听写'}</button>
          <button className="chat-send" disabled={!settings || !question.trim() || busy || composing}>{loading ? '等回复…' : reading ? '朗读中…' : '发送'}</button>
        </div>
        <div className="chat-actions chat-footer">
          <label><input type="checkbox" checked={autoRead} onChange={event => {
            readAutomatically.current = event.target.checked;
            setAutoRead(event.target.checked);
            if (!event.target.checked) stopReading();
          }} /> 自动朗读</label>
          <button type="button" aria-expanded={voiceOpen} onClick={() => {
            setVoices(localVoices());
            setVoiceOpen(!voiceOpen);
          }}>朗读设置</button>
          {reading && <button type="button" onClick={stopReading}>停止朗读</button>}
          {messages.length > 0 && <button type="button" onClick={clearChat}>清空对话</button>}
        </div>
        {voiceOpen && <fieldset className="chat-voice">
          <legend>小星的声音</legend>
          <label>中文音色
            <select value={voices.some(voice => voice.voiceURI === voiceOptions.voiceURI) ? voiceOptions.voiceURI : ''}
              onChange={event => updateVoice({ ...voiceOptions, voiceURI: event.target.value })}>
              <option value="">默认中文声音</option>
              {voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}（{voice.lang}）</option>)}
            </select>
          </label>
          {voices.length === 0 && <p className="chat-note">暂时没有找到可选的本地中文声音。可以在电脑的语音设置中下载。</p>}
          <label>语速 {voiceOptions.rate.toFixed(2)} 倍
            <input type="range" min="0.7" max="1.2" step="0.01" value={voiceOptions.rate}
              onChange={event => updateVoice({ ...voiceOptions, rate: Number(event.target.value) })} />
          </label>
          <button type="button" disabled={busy} onClick={() => read('嗨，我是小星。我们慢慢来，一起过这一关吧！')}>🔊 试听</button>
        </fieldset>}
      </form>
    </>}
  </aside>;
}
