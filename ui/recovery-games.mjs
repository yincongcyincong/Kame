const plans = {
  wings: [{
    id: 'flight-relay', role: 'jet', title: '双机接力', icon: '📦',
    intro: '两架飞机并排时交接包裹。包裹掉下去，答题后从交接点重试。',
    stages: [
      { gap: .24, drift: .03, tolerance: .088 },
      { gap: -.25, drift: -.055, tolerance: .076 },
      { gap: .32, drift: .075, tolerance: .066 },
    ].map(stage => ({ ...stage, kind: 'flightRelay' })),
  }],
  cosmic: [{
    id: 'pipe-rescue', role: 'rainbow', title: '管道抢修', icon: '🚰',
    intro: '转动管道，试水时观察水从哪里流出来。漏水后答题继续修。',
    stages: [
      { route: [4, 5, 6, 7], turns: [1, 0, 3, 0] },
      { route: [4, 5, 1, 2, 6, 7], turns: [1, 2, 1, 3, 0, 1] },
      { route: [4, 0, 1, 5, 9, 10, 6, 7], turns: [3, 1, 3, 1, 2, 1, 3, 0] },
    ].map(stage => ({ ...stage, kind: 'pipeRescue' })),
  }],
  labrador: [{
    id: 'footprint-search', role: 'labrador', title: '脚印追踪', icon: '🔍',
    intro: '比对参考脚印，沿相同的脚印走过岔路。走错后回到上一个正确地点。',
    stages: [
      { animal: '梅花脚印', print: 'paw', route: [0, 1] },
      { animal: '分叉蹄印', print: 'hoof', route: [1, 0, 2] },
      { animal: '三趾脚印', print: 'bird', route: [2, 1, 0, 2] },
    ].map(stage => ({ ...stage, kind: 'footprintSearch' })),
  }],
  jojo: [{
    id: 'rhythm-band', role: 'baby-jojo', title: '节奏乐队', icon: '🥁',
    intro: '听 JOJO 示范，再按同样的节奏敲鼓。敲错时答题，再听一遍本小节。',
    stages: [[0, 640, 1280], [0, 480, 960, 1920], [0, 480, 720, 1440, 1920]]
      .map(beats => ({ kind: 'rhythmBand', beats })),
  }, {
    id: 'fruit-balance', role: 'baby-jojo', title: '小小天平', icon: '⚖️',
    intro: '帮 JOJO 把水果摆到天平两边。检查时若还倾斜，答对题后继续调整。',
    stages: [
      ['apple', 'apple', 'orange'],
      ['orange', 'orange', 'apple', 'grape', 'grape'],
      ['apple', 'apple', 'orange', 'pear', 'grape'],
    ].map(fruit => ({ kind: 'fruitBalance', fruit })),
  }],
};

export const recoveryMissions = plans;
export const recoveryKinds = new Set(Object.values(plans).flatMap(series => series.map(plan => plan.stages[0].kind)));

const gridWidth = 4;
const steps = [-4, 1, 4, -1];
export const pipeEntry = 4;
export const pipeExit = 7;

function adjacent(cell, side) {
  if (side === 1 && cell % gridWidth === gridWidth - 1 || side === 3 && cell % gridWidth === 0) return -1;
  return cell + steps[side];
}

function portAt(cell, next) {
  return steps.findIndex((_, side) => adjacent(cell, side) === next);
}

function rotatePorts(ports, turns) {
  return ports.map(port => (port + turns) % 4);
}

export function makePipeGrid(route, turns) {
  return Object.fromEntries(route.map((cell, index) => {
    const inlet = index === 0 ? 3 : portAt(cell, route[index - 1]);
    const outlet = index === route.length - 1 ? 1 : portAt(cell, route[index + 1]);
    return [cell, { ports: [inlet, outlet], turns: turns[index] }];
  }));
}

export function tracePipe(grid) {
  const wet = [];
  let cell = pipeEntry;
  let input = 3;
  while (grid[cell] && !wet.includes(cell)) {
    const ports = rotatePorts(grid[cell].ports, grid[cell].turns);
    if (!ports.includes(input)) break;
    wet.push(cell);
    const output = ports.find(port => port !== input);
    if (cell === pipeExit && output === 1) return { wet, leak: null, connected: true };
    cell = adjacent(cell, output);
    input = (output + 2) % 4;
  }
  return { wet, leak: grid[cell] ? cell : wet.at(-1) ?? pipeEntry, connected: false };
}

export const fruitWeights = { apple: 2, orange: 4, grape: 1, pear: 3 };

export function balanceWeight(fruit, trays) {
  return trays.reduce((difference, tray, index) => difference + (tray ?? 0) * fruitWeights[fruit[index]], 0);
}

export function relayInRange(gap, tolerance) {
  return Math.abs(gap) <= tolerance;
}

export function beatResult(elapsed, target, tolerance = 190) {
  if (elapsed < target - tolerance) return 'early';
  if (elapsed > target + tolerance) return 'late';
  return 'matched';
}
