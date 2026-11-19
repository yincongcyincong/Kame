export const catchPatterns = [
  [42, 60, 24, 53, 74],
  [63, 32, 76, 54, 20, 43],
  [32, 71, 46, 17, 58, 82, 38],
];

export function startCatch(stage) {
  return { x: 50, item: 0, y: 8, caught: 0, status: 'ready', pattern: catchPatterns[stage.round] };
}

export function tickCatch(state, movement, interval, stage, aim) {
  if (state.status !== 'playing') return state;
  const dt = Math.max(0, Math.min(.05, interval));
  const x = Math.max(7, Math.min(93, aim ?? state.x + movement * 56 * dt));
  const y = state.y + stage.speed * dt;
  if (y < 84) return { ...state, x, y };
  if (Math.abs(state.pattern[state.item % state.pattern.length] - x) > 11) {
    return { ...state, x, y: 93, status: 'question' };
  }
  const caught = state.caught + 1;
  return { ...state, x, caught, item: state.item + 1, y: 8, status: caught === stage.goal ? 'won' : 'playing' };
}

export function resumeCatch(state) {
  return state.status === 'question' ? { ...state, item: state.item + 1, y: 8, status: 'playing' } : state;
}
