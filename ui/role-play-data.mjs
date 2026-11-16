import { subjectsForGrade } from './grades.mjs';

const ranges = {
  wings: [['语文', 0], ['数学', 1], ['英语', 2]],
  cosmic: [['数学', 0], ['英语', 1], ['语文', 2]],
};

export function rangeStages(series, slot, grade) {
  const [subject, game] = ranges[series][slot];
  const { games } = subjectsForGrade(grade).find(item => item.name === subject);
  return games[game][4].map(([prompt, answer, ...others], round) => {
    const choices = [answer, ...others];
    const shift = (grade + slot + round) % choices.length;
    return { kind: 'range', subject, prompt, answer, targets: choices.slice(shift).concat(choices.slice(0, shift)) };
  });
}

const cases = [
  {
    suspects: ['松鼠果果', '小兔米米', '小鹿斑斑'],
    clues: [
      { icon: '🐾', spot: '公园长椅', text: '长椅下的脚印说明，刚才拿书包的人是松鼠果果或小兔米米。', matches: [0, 1] },
      { icon: '☔', spot: '避雨棚', text: '园丁只看见松鼠果果和小鹿斑斑进过避雨棚。书包就在棚里。', matches: [0, 2] },
      { icon: '🎒', spot: '书包旁', text: '书包旁有一张没署名的纸条：“雨要来了，我把书包移进棚里。”', matches: [0, 1, 2] },
    ],
    reveal: '是松鼠果果。它怕书包淋湿，把书包放进避雨棚后忘了告诉小羊。警长请它一起把书包归还。',
  },
  {
    suspects: ['小熊团团', '小狗豆豆', '小鸭点点'],
    clues: [
      { icon: '🚧', spot: '空出来的等候区', text: '老师看见小狗豆豆和小鸭点点经过等候区。路锥随后不见了。', matches: [1, 2] },
      { icon: '🛒', spot: '校门推车', text: '推车上有路锥。门卫说只有小熊团团和小狗豆豆借过这辆车。', matches: [0, 1] },
      { icon: '📝', spot: '值日簿', text: '值日簿写着“收回运动场路锥”，可等候区的路锥应该留在原处。', matches: [0, 1, 2] },
    ],
    reveal: '是小狗豆豆。它把等候区的路锥当成运动场的了。杜兵请它用地图把路锥放回正确的位置。',
  },
  {
    suspects: ['小猫花花', '小刺猬球球', '小羊绵绵'],
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
  blocks: { zh: '积木', en: 'blocks', icon: '🧱' },
  car: { zh: '玩具车', en: 'toy car', icon: '🚗' },
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
  [
    ['玩具应该放进什么里？', 'Where do the toys belong?', 'box', ['cup', 'towel'], '打开收纳盒', 'Open the toy box', '📦', 1],
    ['把用来搭小房子的玩具找出来。', 'Find the toys you can build a little house with.', 'blocks', ['fork', 'teddy'], '放回一块积木', 'Put away one block', '🧱', 3],
    ['把有四个轮子的玩具收起来。', 'Put away the toy with four wheels.', 'car', ['book', 'soap'], '把小车停好', 'Park the toy car', '🚗', 1],
  ],
];

export function simStages(slot) {
  return routines[slot].map(([zh, en, answer, others, actionZh, actionEn, effect, times], index) => {
    const keys = [...others];
    keys.splice((slot + index) % 3, 0, answer);
    return { kind: 'sim', zh, en, answer, choices: keys.map(key => ({ key, ...tools[key] })),
      actionZh, actionEn, effect, times };
  });
}

export function matchingSuspects(dossier, clueIndices) {
  return dossier.suspects.map((_, index) => index)
    .filter(index => clueIndices.every(clue => dossier.clues[clue].matches.includes(index)));
}
