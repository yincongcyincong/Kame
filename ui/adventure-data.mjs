import { learningGames } from './learning-game-data.mjs';

export const adventures = {
  wings: [{
    id: 'airmail', role: 'jet', title: '亲自开飞机送快递', icon: '🛩️',
    intro: '起飞、穿过云层、在跑道上降落，把包裹交给等候的飞侠。',
    stages: [
      { kind: 'flight', phase: 'takeoff', goal: [2, 2, 2, 1, 0] },
      { kind: 'flight', phase: 'clouds', goal: [1, 0, 0, 1, 2] },
      { kind: 'flight', phase: 'delivery', goal: [0, 1, 1, 2, 2] },
    ],
  }, ...learningGames.wings],
  cosmic: [{
    id: 'crane-bridge', role: 'storm', title: '开救援车搭桥', icon: '🏗️',
    intro: '开救援车去断桥，操作机械臂放桥板，再补支撑，让护卫队伙伴安全过河。',
    stages: ['drive', 'beam', 'cross'].map(phase => ({ kind: 'bridge', phase })),
  }, {
    id: 'long-jump', role: 'lightning', title: '护卫队跳远赛', icon: '🏅',
    intro: '和护卫队伙伴比跳远。按住空格或按钮蓄力，接近满格时松开起跳。',
    stages: [
      { kind: 'longJump', title: '河湾练习场', limit: 1750, maxDistance: 5 },
      { kind: 'longJump', title: '基地计分赛', limit: 1500, maxDistance: 6 },
      { kind: 'longJump', title: '护卫队决赛', limit: 1320, maxDistance: 7 },
    ],
  }, ...learningGames.cosmic],
  labrador: [{
    id: 'case-replay', role: 'labrador', title: '回放案发现场', icon: '🎬',
    intro: '翻看现场记录，用时间线重建书包、路锥和路牌失踪的经过。',
    stages: [
      { kind: 'timeline', story: '蓝书包去了哪儿？', events: [
        ['🪑', '小羊把书包留在长椅', 10], ['🌧️', '公园下起了雨', 15], ['🎒', '果果把书包搬进避雨棚', 17],
      ] },
      { kind: 'timeline', story: '路锥为什么不见了？', events: [
        ['🚧', '老师摆好等候区的路锥', 5], ['🛒', '豆豆推车经过校门', 12], ['📦', '豆豆把路锥送到了器材室', 18],
      ] },
      { kind: 'timeline', story: '谁动了公园路牌？', events: [
        ['💨', '大风吹倒了路牌', 8], ['🗺️', '绵绵发现损坏的路牌', 13], ['🧰', '绵绵把路牌带到修理棚', 21],
      ] },
    ],
  }, ...learningGames.labrador],
  jojo: [{
    id: 'breakfast-cafe', role: 'baby-jojo', title: '一起开早餐店', icon: '🍞',
    scene: '/art/jojo-breakfast.jpg', intro: '听 JOJO 点餐，自己倒牛奶、烤面包，再把早餐递给他。',
    stages: [
      { kind: 'breakfast', phase: 'pour' },
      { kind: 'breakfast', phase: 'toast' },
      { kind: 'sim', gesture: 'feed', answer: 'toast', times: 1, actionZh: 'JOJO 正在尝早餐…', actionEn: 'JOJO is tasting breakfast…',
        zh: '牛奶和面包都好了！把哪一盘早餐递给 JOJO？', en: 'The milk and toast are ready. What should JOJO eat?',
        choices: [{ key: 'toast', zh: '烤面包', en: 'toast', icon: '🍞' }, { key: 'fork', zh: '叉子', en: 'fork', icon: '🍴' },
          { key: 'teddy', zh: '玩具熊', en: 'teddy bear', icon: '🧸' }] },
    ],
  }, {
    id: 'block-playground', role: 'jojo-brother', title: '和 JOJO 搭小车乐园', icon: '🏎️',
    intro: '调坡道的高低和衔接，再真的放小车跑一趟。卡住了就改一改。',
    stages: [
      { kind: 'playground', heights: [4, 1, 3], title: '让小车平稳到达终点' },
      { kind: 'playground', heights: [5, 1, 3, 2], title: '接好更长的坡道' },
      { kind: 'playground', heights: [5, 2, 4, 1, 2], title: '搭好通往乐园的整条赛道' },
    ],
  }, ...learningGames.jojo],
};

export function bridgeStable(beam, supports) {
  return beam === 2 && supports.includes(1) && supports.includes(3);
}

export function trackRun(heights) {
  for (let i = 1; i < heights.length; i++) {
    const slope = heights[i - 1] - heights[i];
    if (slope !== 1) return i - 1;
  }
  return heights.length - 1;
}
