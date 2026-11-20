// Exact command grammar: questions, negation and compound instructions stay with the model.
export function localGameCommand(text) {
  if (/[?？]|(?:吗|么|是否|能否)/.test(text)) return null;
  const value = text.replace(/[\s，,。.!！?？、]/g, '');
  const prefix = '(?:小星)?(?:请)?(?:你)?(?:帮我)?';
  const move = value.match(new RegExp('^' + prefix + '(?:向|往)?(左|右|上|下)(?:边)?(?:走|移动)(?:一下|一点|一步)?(?:吧)?$'));
  if (move) return { name: 'move_character', arguments: { direction: ({ 左:'left',右:'right',上:'up',下:'down' })[move[1]], duration_ms: 450 }, reply: '好，我往' + move[1] + '走了一步。' };
  if (new RegExp('^' + prefix + '(?:发射(?:光球)?|开火|射击)(?:一下|一次)?(?:吧)?$').test(value)) return { name: 'fire', arguments: {}, reply: '光球发射啦！' };
  if (new RegExp('^' + prefix + '(?:停下|停下来|停止移动|别走了)(?:吧)?$').test(value)) return { name:'stop', arguments:{}, reply:'好，停下来了。' };
  return null;
}

export function shouldSubmitSpeech(state, now) {
  // Give a late transcription update a short settling window, without resetting VAD silence.
  return state.enabled && state.listening && !state.gate.busy && !!state.transcript.trim() &&
    state.lastVoice > 0 && now - state.lastVoice >= state.silenceMs && now - (state.lastTranscript || 0) >= 150;
}

export class SentenceBuffer {
  pending = '';
  push(text, flush = false) {
    this.pending += text;
    const sentences = [];
    while (this.pending) {
      const match = /[。！？!?；;\n]|\.(?=\s|$)/.exec(this.pending);
      let end = match ? match.index + 1 : 0;
      if (!end && this.pending.length >= 60) {
        const comma = this.pending.slice(0, 60).lastIndexOf('，');
        end = comma >= 12 ? comma + 1 : 60;
      }
      if (!end) { if (flush) end = this.pending.length; else break; }
      const sentence = this.pending.slice(0, end).trim();
      this.pending = this.pending.slice(end);
      if (sentence) sentences.push(sentence);
    }
    return sentences;
  }
}

export async function readCompanionEvents(response, onEvent) {
  if (!response.ok) throw new Error((await response.text()).trim() || '陪玩连接失败');
  if (!response.headers.get('content-type')?.includes('application/x-ndjson')) {
    const value = await response.json();
    onEvent({ type:'delta', text:value.reply }); onEvent({ type:'done', ...value }); return value;
  }
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let pending = '', result;
  const line = value => {
    if (!value.trim()) return;
    const event = JSON.parse(value);
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'done') result = event;
    onEvent(event);
  };
  try {
    while (true) {
      const chunk = await reader.read();
      pending += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
      if (pending.length > 65536) throw new Error('陪玩返回内容过长');
      const lines = pending.split('\n'); pending = lines.pop();
      for (const item of lines) line(item);
      if (chunk.done) break;
    }
    if (pending.trim()) line(pending);
    if (!result) throw new Error('模型连接中断，本轮已停止，请重试');
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
