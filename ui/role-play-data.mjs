import { builders, hairStages } from './jojo-mechanics.mjs';
const ranges = {
  wings: [
    ['拼音', [
      ['“猫”的拼音是什么？', 'māo', 'máo', 'mǎo'],
      ['风筝上画了一朵花，“花”的拼音是什么？', 'huā', 'hū', 'huá'],
      ['阿卡斯的风筝像条鱼，“鱼”的拼音是什么？', 'yú', 'yù', 'wú'],
    ]],
    ['计算', [
      ['多多有 3 块长木板和 4 块短木板。一共有几块？', '7', '6', '8'],
      ['工具箱里有 9 个夹子，用掉 5 个，还剩几个？', '4', '5', '3'],
      ['树屋的两扇窗各要 4 颗螺丝，一共需要几颗？', '8', '9', '6'],
    ]],
    ['英语', [
      ['看见小马的路标了！“马”用英语怎么说？', 'horse', 'house', 'duck'],
      ['“山谷”怎么说？', 'valley', 'airport', 'school'],
      ['找到小马了。用英语说“我们找到它了！”', 'We found it!', 'We lost it!', 'Wait here!'],
    ]],
  ],
  cosmic: [
    ['计算', [
      ['第一批送到 3 壶水，第二批再送 2 壶，一共送几壶？', '5', '4', '6'],
      ['6 条毯子平均分给 3 只小动物，每只分几条？', '2', '3', '4'],
      ['补给站原有 12 个箱子，已经发出 7 个，还剩几个？', '5', '4', '6'],
    ]],
    ['英语', [
      ['闪电在找灯塔。“灯塔”用英语怎么说？', 'lighthouse', 'bridge', 'forest'],
      ['需要更换电池，“电池”用英语怎么说？', 'battery', 'bottle', 'basket'],
      ['信号灯亮了。“绿灯”用英语怎么说？', 'green light', 'red light', 'blue light'],
    ]],
    ['观察', [
      ['彩虹要记录湖水的温度，应该选什么？', '温度计', '望远镜', '指南针'],
      ['哪件物品适合给水样做标记？', '标签', '手套', '水桶'],
      ['想观察水滴里很小的东西，用什么仪器更合适？', '显微镜', '卷尺', '听诊器'],
    ]],
  ],
};

export function rangeStages(series, slot) {
  const [subject, questions] = ranges[series][slot];
  return questions.map(([prompt, answer, ...others], index) => {
    const choices = [answer, ...others];
    const shift = (1 + slot + index) % choices.length;
    return { kind: 'range', subject, prompt, answer, targets: choices.slice(shift).concat(choices.slice(0, shift)) };
  });
}

const cases = [
  {
    suspects: ['松鼠果果', '小兔米米', '小鹿斑斑'],
    species: ['squirrel', 'rabbit', 'deer'],
    portraits: ['🐿️', '🐰', '🦌'],
    clues: [
      { icon: '🐾', spot: '公园长椅', text: '长椅下的脚印说明，刚才拿书包的人是松鼠果果或小兔米米。', matches: [0, 1] },
      { icon: '☔', spot: '避雨棚', text: '园丁只看见松鼠果果和小鹿斑斑进过避雨棚。书包就在棚里。', matches: [0, 2] },
      { icon: '🎒', spot: '书包旁', text: '书包旁有一张没署名的纸条：“雨要来了，我把书包移进棚里。”', matches: [0, 1, 2] },
    ],
    reveal: '是松鼠果果。它怕书包淋湿，把书包放进避雨棚后忘了告诉小羊。警长请它一起把书包归还。',
  },
  {
    suspects: ['小熊团团', '小狗豆豆', '小鸭点点'],
    species: ['bear', 'dog', 'duck'],
    portraits: ['🐻', '🐶', '🦆'],
    clues: [
      { icon: '🚧', spot: '空出来的等候区', text: '老师看见小狗豆豆和小鸭点点经过等候区。路锥随后不见了。', matches: [1, 2] },
      { icon: '🛒', spot: '校门推车', text: '推车上有路锥。门卫说只有小熊团团和小狗豆豆借过这辆车。', matches: [0, 1] },
      { icon: '📝', spot: '值日簿', text: '值日簿写着“收回运动场路锥”，可等候区的路锥应该留在原处。', matches: [0, 1, 2] },
    ],
    reveal: '是小狗豆豆。它把等候区的路锥当成运动场的了。杜兵请它用地图把路锥放回正确的位置。',
  },
  {
    suspects: ['小猫花花', '小刺猬球球', '小羊绵绵'],
    species: ['cat', 'hedgehog', 'sheep'],
    portraits: ['🐱', '🦔', '🐑'],
    clues: [
      { icon: '🌼', spot: '花园长廊', text: '园丁看见小猫花花和小羊绵绵来过长廊，原来的路牌就是在这里被发现的。', matches: [0, 2] },
      { icon: '🧤', spot: '修理棚', text: '修理棚的登记簿上只有小刺猬球球和小羊绵绵的名字。路牌现在在棚里。', matches: [1, 2] },
      { icon: '🗺️', spot: '入口地图', text: '入口地图旁留了一条消息：“倒下的路牌有裂缝，我去借修理工具了。”', matches: [0, 1, 2] },
    ],
    reveal: '是小羊绵绵搬走的。它想修好倒下的路牌，小蝶和园丁一起帮它把路牌装回正确的地方。',
  },
];

export function caseStages(slot) {
  const dossier = cases[slot];
  return ['investigate', 'connect', 'resolve'].map(phase => ({ kind: 'detective', phase, dossier }));
}

const tools = {
  bowl: { zh: '饭碗', en: 'bowl', icon: '🥣' },
  spoon: { zh: '勺子', en: 'spoon', icon: '🥄' },
  cup: { zh: '水杯', en: 'cup', icon: '🥛' },
  toothbrush: { zh: '牙刷', en: 'toothbrush', icon: '🪥' },
  toothpaste: { zh: '牙膏', en: 'toothpaste', icon: '🧴' },
  towel: { zh: '毛巾', en: 'towel', icon: '🧻' },
  box: { zh: '收纳盒', en: 'toy box', icon: '📦' },
  fork: { zh: '叉子', en: 'fork', icon: '🍴' },
  teddy: { zh: '玩具熊', en: 'teddy bear', icon: '🧸' },
  book: { zh: '图画书', en: 'picture book', icon: '📕' },
  soap: { zh: '香皂', en: 'soap', icon: '🧼' },
};

const routines = [
  [
    ['把米饭放进什么里？', 'What holds the rice?', 'bowl', ['book', 'fork'], '端好饭碗', 'Set down the bowl', '🍚', 1],
    ['用什么给 JOJO 喂一小口饭？', 'What can you use to feed JOJO a bite of rice?', 'spoon', ['toothbrush', 'cup'], '喂一小口', 'Give one bite', '🥄', 3],
    ['吃完饭了，用什么给 JOJO 喝水？', 'What should JOJO drink water from?', 'cup', ['box', 'teddy'], '喝一口水', 'Take a sip', '💧', 2],
  ],
  [
    ['用什么刷牙？先把它准备好。', 'What do you use to brush your teeth?', 'toothbrush', ['fork', 'towel'], '拿好牙刷', 'Get the brush ready', '🪥', 1],
    ['往牙刷上挤什么？', 'What goes on the toothbrush?', 'toothpaste', ['soap', 'cup'], '挤一点牙膏', 'Add a little toothpaste', '🫧', 1],
    ['牙刷准备好了，接下来用什么轻轻刷牙？', 'What do you use now to gently brush your teeth?', 'toothbrush', ['towel', 'spoon'], '轻轻刷一刷', 'Brush gently', '✨', 3],
  ],

];

export function simStages(slot) {
  if (slot === 2) return builders;
  if (slot === 3) return hairStages;
  const gestures = [ ['tap', 'feed', 'drink'], ['tap', 'tap', 'brush'] ][slot];
  return routines[slot].map(([zh, en, answer, others, actionZh, actionEn, effect, times], index) => {
    const keys = [...others];
    keys.splice((slot + index) % 3, 0, answer);
    return { kind: 'sim', zh, en, answer, choices: keys.map(key => ({ key, ...tools[key] })),
      actionZh, actionEn, effect, times, gesture: gestures[index] };
  });
}

export function matchingSuspects(dossier, clueIndices) {
  return dossier.suspects.map((_, index) => index)
    .filter(index => clueIndices.every(clue => dossier.clues[clue].matches.includes(index)));
}
