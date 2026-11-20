export const companionSession = crypto.randomUUID();
let movement = null;
let progress = null;
let actionEpoch = 0;
let actionController = new AbortController();
export function cancelCompanionActions() { actionEpoch++; actionController.abort(); actionController = new AbortController(); }

export function setCompanionProgress(value) { progress = value; }
export function registerCompanionMovement(handler, state) {
  const registration = { handler, state };
  movement = registration;
  return () => { if (movement === registration) movement = null; };
}
function sceneRoot() { return document.querySelector('.mission-screen'); }
function visibleButtons(root) {
  return root ? [...root.querySelectorAll('button')].filter(button =>
    !button.disabled && button.getClientRects().length && getComputedStyle(button).visibility !== 'hidden' &&
    !button.closest('.mission-screen-bar, .companion-panel, .companion-settings, .companion-speech, .range-map-controls') &&
    button.textContent.trim().length <= 100) : [];
}
export function gameSnapshot() {
  const root = sceneRoot();
  return {
    progress, context_id: root ? root.dataset.aiScene + ':' + actionEpoch : 'home',
    position: movement?.state() || null,
    characters: root ? [...root.querySelectorAll('.world-partner, .range-map-enemy')].map(node => ({
      name: (node.querySelector('small')?.textContent || node.querySelector(':scope > span:last-child')?.textContent || '').trim(),
      x: parseFloat(node.style.left), y: parseFloat(node.style.top),
      kind: node.matches('.range-map-enemy, .world-villain') ? 'opponent' : 'character',
    })) : [],
    scene_text: root ? [...root.querySelectorAll('.scene-interaction, .range-map-banner, .character-world-guide')]
      .filter(node => node.getClientRects().length).map(node => node.innerText).join('\n').slice(0, 5000) : '请先选择动画和任务。',
    available_actions: [...new Set(visibleButtons(root).map(button => button.textContent.trim()))],
  };
}
export async function executeGameAction(action) {
  const snapshot = gameSnapshot();
  if (action.context !== snapshot.context_id || snapshot.context_id === 'home') throw new Error('场景已切换，请重新读取游戏状态');
  if (action.name === 'move_character') {
    if (!movement) throw new Error('当前场景不支持地图移动');
    await movement.handler(action.arguments, actionController.signal);
  } else {
    const buttons = visibleButtons(sceneRoot());
    const label = action.name === 'fire' ? '发射光球' : action.arguments.label;
    const candidates = buttons.filter(button => button.textContent.trim() === label);
    if (candidates.length !== 1) throw new Error('当前操作不可用或有重名，请重新读取游戏状态');
    candidates[0].click();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return gameSnapshot();
}

// Serializes recognition, model calls and playback; busy turns cannot enqueue another message.
export class CompanionTurnGate {
  busy = false;
  async run(task) {
    if (this.busy) return false;
    this.busy = true;
    try { await task(); return true; } finally { this.busy = false; }
  }
}
