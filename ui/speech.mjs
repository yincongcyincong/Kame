export function systemDictationHint(platform = navigator.platform) {
  if (/Mac/.test(platform)) return '按 Mac 键盘上的听写键，或使用「系统设置 → 键盘 → 听写」里设定的快捷键。';
  if (/Win/.test(platform)) return '按 Windows + H 开始语音键入。';
  return '使用电脑输入法或系统辅助功能里的语音输入。';
}

export function localVoices(language = 'zh') {
  return (window.speechSynthesis?.getVoices() ?? [])
    .filter(voice => voice.localService && voice.lang.toLowerCase().startsWith(language));
}

export function speak(text, language = 'zh', onError, { voiceURI = '', rate = 0.86, onFinish } = {}) {
  const synthesis = window.speechSynthesis;
  if (!synthesis || !window.SpeechSynthesisUtterance) return false;
  const voices = synthesis.getVoices();
  const available = localVoices(language);
  const voice = available.find(candidate => candidate.voiceURI === voiceURI) || available[0];
  if (!voice && (voices.length || !navigator.userAgent.includes('Electron'))) return false;
  const message = new SpeechSynthesisUtterance(text);
  message.lang = language === 'zh' ? 'zh-CN' : 'en-US';
  if (voice) {
    message.voice = voice;
    message.lang = voice.lang;
  }
  message.rate = rate;
  message.onend = () => onFinish?.();
  message.onerror = event => {
    onFinish?.();
    if (event.error !== 'canceled' && event.error !== 'interrupted') onError?.();
  };
  synthesis.cancel();
  synthesis.speak(message);
  return true;
}
