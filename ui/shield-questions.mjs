import { generalKnowledgeQuestions } from './shield-general-knowledge.mjs';

export const shieldGrades = [1, 2, 3, 4, 5, 6];

const chineseWords = [
  '山/shān 水/shuǐ 火/huǒ 木/mù 日/rì 月/yuè 云/yún 雨/yǔ 风/fēng 田/tián 石/shí 花/huā 草/cǎo 鸟/niǎo 鱼/yú 马/mǎ 牛/niú 羊/yáng 猫/māo 狗/gǒu 手/shǒu 足/zú 口/kǒu 林/lín 耳/ěr',
  '高/低 冷/热 快/慢 长/短 多/少 远/近 黑/白 早/晚 进/退 开/关 来/去 借/还 买/卖 干/湿 轻/重 明/暗 真/假 笑/哭 粗/细 松/紧 宽/窄 新/旧 饱/饿 昼/夜 深/浅',
  '辽阔/宽广 喜悦/欢喜 寂静/安静 赶紧/连忙 逐渐/渐渐 忽然/突然 寻找/搜寻 仔细/细心 奇妙/神奇 珍贵/宝贵 注视/凝视 商量/商讨 鼓舞/激励 保护/守护 美丽/漂亮 清澈/清亮 赞赏/称赞 勇敢/勇猛 清凉/凉爽 温和/温柔 牢固/坚固 孤单/孤独 熟悉/熟知 疲倦/疲劳 舒展/伸展',
  '栩栩如生/非常逼真 井底之蛙/见识狭窄 刻舟求剑/不懂变通 画蛇添足/多此一举 亡羊补牢/及时补救 守株待兔/坐等好运 掩耳盗铃/自欺欺人 拔苗助长/急于求成 一丝不苟/做事认真 目不转睛/看得专注 五湖四海/各地各处 不约而同/没有约定却一致 心旷神怡/心情舒畅 水落石出/真相显露 如鱼得水/环境十分合适 聚精会神/集中精神 半途而废/中途放弃 山清水秀/山水风景优美 鸟语花香/春日景色美好 寸步难行/行动十分困难 大惊小怪/对小事过分惊讶 津津有味/很有兴味 争先恐后/抢着向前 雪中送炭/困难中给予帮助 自言自语/自己跟自己说话',
  '因地制宜/按各地情况制订办法 循序渐进/按一定步骤逐步深入 身临其境/仿佛亲自到了那里 别出心裁/构思与众不同 锲而不舍/有恒心不放弃 举一反三/从一件事类推其他事 温故知新/复习旧知识得到新理解 精益求精/已经很好还要更好 脚踏实地/做事踏实不浮躁 不耻下问/乐于向学问较低的人请教 弄巧成拙/想耍巧反而把事情办坏 迎刃而解/问题顺利解决 胸有成竹/做事以前已有完整打算 言而有信/说话讲信用 再接再厉/继续努力 凝神屏息/集中注意力并抑制呼吸 沧海一粟/极其渺小 有条不紊/做事有秩序不混乱 实事求是/按照事实探求规律 取长补短/吸取长处弥补短处 对症下药/针对问题采取措施 举棋不定/犹豫而不能决定 全力以赴/把全部力量投入进去 人声鼎沸/人群声音十分嘈杂 源源不断/接连不断地到来',
  '一叶障目/被局部遮蔽而看不到整体 见微知著/从细微迹象看出发展趋势 触类旁通/懂得一类事理而推知其他事理 兼收并蓄/把不同内容一并吸收 追根溯源/追查事物的根源 独具匠心/拥有独特巧妙的构思 深入浅出/内容深刻但表述浅显 言简意赅/话少而意思完备 画龙点睛/关键一笔让整体生动 融会贯通/把各方面知识融合并彻底理解 博采众长/广泛吸取各家的长处 恍然大悟/一下子明白过来 耳濡目染/经常接触而不知不觉受到影响 循循善诱/善于有步骤地引导别人 不言而喻/不用说明就能明白 潜移默化/在不知不觉中改变 唇亡齿寒/双方关系密切一方受损影响另一方 防微杜渐/在问题刚出现时就制止 刨根问底/追问得很彻底 集思广益/集中大家的意见使事情办得更好 水滴石穿/坚持努力就能成功 前车之鉴/从前人的失败中吸取教训 见贤思齐/见到优秀的人便想着向他看齐 应接不暇/来的人或事太多而接待不过来 背道而驰/所走方向和目标完全相反',
];

const englishWords = [
  'cat/猫 dog/狗 fish/鱼 bird/鸟 duck/鸭 cow/牛 pig/猪 red/红色 blue/蓝色 yellow/黄色 green/绿色 white/白色 black/黑色 apple/苹果 banana/香蕉 orange/橙子 milk/牛奶 water/水 book/书 bag/书包 pen/钢笔 sun/太阳 moon/月亮 one/一 two/二',
  'pencil/铅笔 ruler/尺子 desk/书桌 chair/椅子 door/门 window/窗户 school/学校 park/公园 bus/公共汽车 train/火车 car/汽车 bike/自行车 bread/面包 rice/米饭 egg/鸡蛋 soup/汤 table/餐桌 ball/球 kite/风筝 toy/玩具 bear/熊 rabbit/兔子 tiger/老虎 frog/青蛙 plane/飞机',
  'morning/早晨 afternoon/下午 evening/傍晚 breakfast/早餐 lunch/午餐 dinner/晚餐 classroom/教室 playground/操场 library/图书馆 family/家庭 parents/父母 cousin/堂亲或表亲 weekend/周末 spring/春天 summer/夏天 autumn/秋天 winter/冬天 sunny/晴朗的 cloudy/多云的 windy/有风的 rainy/有雨的 behind/在后面 between/在两者之间 under/在下方 above/在上方',
  'hospital/医院 museum/博物馆 cinema/电影院 supermarket/超市 restaurant/餐馆 station/车站 airport/机场 turn left/向左转 turn right/向右转 go straight/直走 next to/紧挨着 across from/在对面 wash hands/洗手 brush teeth/刷牙 get up/起床 go home/回家 take a bus/乘公共汽车 put away/把物品收好 turn off/关掉 look for/寻找 be careful/要小心 hurry up/赶快 wait a minute/等一分钟 how much/多少钱 how many/多少个',
  'exercise/锻炼 healthy/健康的 thirsty/口渴的 hungry/饥饿的 delicious/美味的 different/不同的 important/重要的 difficult/困难的 interesting/有趣的 dangerous/危险的 arrive/到达 borrow/借入 return/归还 invite/邀请 collect/收集 improve/改进 protect/保护 throw away/扔掉 pick up/捡起 take care of/照顾 be good at/擅长 look forward to/期待 take part in/参加 at least/至少 for example/例如',
  'environment/环境 pollution/污染 energy/能量 resource/资源 recycle/回收再利用 experience/经历 communicate/交流 discover/发现 describe/描述 explain/解释 compare/比较 decision/决定 direction/方向 result/结果 reason/原因 although/虽然 unless/除非 especially/尤其 probably/很可能 exactly/确切地 instead of/代替 as soon as/一……就 according to/根据 on time/准时 in common/有共同点',
];

function wordPairs(set) {
  return set.split(' ').map(pair => pair.split('/'));
}

function translationPairs(set) {
  return set.split(/(?<=\p{Script=Han}) /u).map(pair => pair.split('/'));
}

function vocabulary(subject, grade, pairs, prompts) {
  return pairs.flatMap((pair, index) => [0, 1].map(direction => {
    const target = 1 - direction;
    const answer = pair[target];
    const distractors = [];
    for (let offset = 1; distractors.length < 2; offset++) {
      const option = pairs[(index + offset) % pairs.length][target];
      if (option !== answer && !distractors.includes(option)) distractors.push(option);
    }
    return { grade, subject, prompt: prompts[direction](pair[direction]), answer, options: [answer, ...distractors] };
  }));
}

const chinesePrompts = [
  [word => '“' + word + '”的拼音是什么？', word => '哪个字读作 ' + word + '？'],
  [word => '“' + word + '”的反义词是什么？', word => '哪个字和“' + word + '”意思相反？'],
  [word => '“' + word + '”的近义词是什么？', word => '哪个词与“' + word + '”的意思最接近？'],
];

const idiomPrompts = [
  word => '“' + word + '”是什么意思？',
  meaning => '哪个成语表示“' + meaning + '”？',
];

const mathActivities = [
  [i => [`${i + 2} ＋ 4 等于多少？`, i + 6], i => [`${i + 9} － 3 等于多少？`, i + 6], i => [`数字 ${i + 6} 前一个数是多少？`, i + 5], i => [`数字 ${i + 5} 后一个数是多少？`, i + 6], i => [`有 ${i + 3} 个球，再拿来 2 个，一共有几个？`, i + 5]],
  [i => [`${i + 17} ＋ 28 等于多少？`, i + 45], i => [`${i + 57} － 18 等于多少？`, i + 39], i => [`${i % 5 + 4} × ${i + 2} 等于多少？`, (i % 5 + 4) * (i + 2)], i => [`${(i + 2) * 3} 平均分给 3 人，每人几个？`, i + 2], i => [`一个玩具 ${i + 6} 元，付 20 元，应找回几元？`, 14 - i]],
  [i => [`${i + 102} ＋ 156 等于多少？`, i + 258], i => [`${i + 300} － 127 等于多少？`, i + 173], i => [`${i + 14} × 4 等于多少？`, (i + 14) * 4], i => [`${(i + 8) * 5} ÷ 5 等于多少？`, i + 8], i => [`正方形边长 ${i + 3} 米，周长是多少米？`, (i + 3) * 4]],
  [i => [`${i + 11} × 13 等于多少？`, (i + 11) * 13], i => [`${(i + 4) * 13} ÷ 13 等于多少？`, i + 4], i => [`${i + 11} × (6 ＋ 4) 等于多少？`, (i + 11) * 10], i => [`长方形长 ${i + 8} 米、宽 6 米，面积为多少平方米？`, (i + 8) * 6], i => [`${i + 5}.4 ＋ 2.3 等于多少？`, i + 7.7, .1]],
  [i => [`${i + 11}.2 － 3.7 等于多少？`, i + 7.5, .1], i => [`${i + 3}.5 × 2 等于多少？`, 2 * i + 7], i => [`${i + 2}/15 ＋ 3/15 的和用分母 15 表示，分子是几？`, i + 5], i => [`长方体长 ${i + 3} 米、宽 3 米、高 2 米，体积多少立方米？`, (i + 3) * 6], i => [`x ＋ 12 ＝ ${i + 29}，x 等于多少？`, i + 17]],
  [i => [`${(i + 3) * 10} 的 30% 是多少？`, (i + 3) * 3], i => [`按 2∶3 把 ${(i + 5) * 5} 枚分成两份，较少的一份是几枚？`, (i + 5) * 2], i => [`圆的半径是 ${i + 3} 米。π 取 3.14，周长是多少米？`, (i + 3) * 6.28, .1], i => [`比例尺是 1∶1000，图上 ${i + 4} 厘米代表实际多少米？`, (i + 4) * 10], i => [`一件物品 ${(i + 6) * 10} 元，打八折后是多少钱？`, (i + 6) * 8]],
];

function mathQuestions(grade) {
  return mathActivities[grade - 1].flatMap((activity, kind) =>
    Array.from({ length: 10 }, (_, index) => {
      const [prompt, value, gap = 1] = activity(index);
      const delta = (kind % 3 + 1) * gap;
      const display = number => String(Number(number.toFixed(2)));
      const answer = display(value);
      return { grade, subject: '数学', prompt, answer, options: [answer, display(value - delta), display(value + 2 * delta)] };
    }),
  );
}

export const shieldQuestionBank = shieldGrades.flatMap(grade => [
  ...vocabulary('语文', grade, wordPairs(chineseWords[grade - 1]), chinesePrompts[grade - 1] || idiomPrompts),
  ...mathQuestions(grade),
  ...generalKnowledgeQuestions(grade),
  ...vocabulary('英语', grade, translationPairs(englishWords[grade - 1]), [
    word => '“' + word + '”是什么意思？',
    word => '“' + word + '”用英语怎么说？',
  ]),
]);

function shuffled(items, random) {
  const bag = [...items];
  for (let index = bag.length - 1; index > 0; index--) {
    const choice = Math.floor(random() * (index + 1));
    [bag[index], bag[choice]] = [bag[choice], bag[index]];
  }
  return bag;
}

export function dealShieldQuestions(grade = 1, random = Math.random, previousPrompt) {
  const level = shieldGrades.includes(grade) ? grade : 1;
  const deck = shuffled(shieldQuestionBank.filter(question => question.grade === level), random);
  if (deck[0].prompt === previousPrompt) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck.map(question => ({ ...question, options: shuffled(question.options, random) }));
}
