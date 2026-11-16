import { subjects as firstGrade } from './games.mjs';

export const grades = ['一', '二', '三', '四', '五', '六'];
export const gradeAnimals = ['cat', 'bunny', 'bear', 'fox', 'panda', 'koala'];
export const gradeTopics = ['拼音 · 十以内加减 · 字母', '反义词 · 乘法 · 日常单词', '成语 · 除法 · 句子',
  '修辞 · 小数 · 一般现在时', '句子表达 · 分数 · 比较级', '阅读理解 · 百分数 · 一般过去时'];

// Each grade has three subjects with three rounds in every game.
const tracks = [
  [
    [2, 'sound', '读音小侦探', '🎧', ['“银行”的“行”读什么？|háng|xíng|héng', '“长大”的“长”读什么？|zhǎng|cháng|chǎng', '“快乐”的“乐”读什么？|lè|yuè|lě']],
    [3, 'idiom', '成语拼图', '🧩', ['画龙点（ ）|睛|晴|精', '守株待（ ）|兔|鸟|鹿', '（ ）羊补牢|亡|望|忘']],
    [4, 'rhetoric', '修辞变身屋', '🪄', ['“月亮像一艘小船。”用了什么修辞？|比喻|拟人|排比', '“花儿向我点头。”用了什么修辞？|拟人|比喻|夸张', '“他跑得快极了，像一阵风。”把什么比作风？|奔跑的人|他脚下的路|迎面吹来的风']],
    [5, 'rewrite', '句子修理铺', '🛠️', ['“小猫把杯子碰倒了。”改成被字句。|杯子被小猫碰倒了。|小猫被杯子碰倒了。|杯子把小猫碰倒了。', '缩句“明亮的灯光照着宽阔的广场”。|灯光照着广场。|明亮的灯光。|广场照着灯光。', '把“提高”和“做事的快慢表现”搭配成常用短语。|提高效率|提高错误|提高办法']],
    [6, 'reading', '阅读探险队', '🧭', ['云层越来越厚，燕子飞得很低。根据这些线索，最有可能发生什么？|可能快下雨了|一定会下雪|一定会刮沙尘暴', '小雨本想独自完成模型，可材料不够。她和同桌合作，拼出了一座小桥。小雨解决困难的方法是什么？|和同桌合作|独自完成|放弃模型', '爷爷把旧水壶改成花盆，同一只水壶有了新的用处。这件事体现了什么？|给旧物找到新用途|旧水壶比新水壶重|所有花都适合种在水壶里']],
  ],
  [
    [2, 'multiply', '乘法糖果屋', '🍬', ['3 × 4 = ?|12|7|14', '6 × 5 = ?|30|35|25', '8 × 2 = ?|16|10|18']],
    [3, 'divide', '分果子小队', '🍉', ['24 颗草莓平均分给 6 人，每人几颗？|4|5|6', '每盒装 7 块饼干，35 块能装几盒？|5|6|7', '有 18 颗糖，每人 4 颗，可以分给几人？|4|3|5']],
    [4, 'decimal', '小数杂货店', '🛍️', ['3.2 + 1.5 = ?|4.7|4.5|4.8', '5.6 − 2.3 = ?|3.3|3.2|2.3', '比较 0.81、0.79 和 0.8，写出最大的一个。|0.81|0.79|0.8']],
    [5, 'fraction', '分数披萨店', '🍕', ['1/4 + 2/4 = ?|3/4|3/8|2/4', '1/2 与哪个分数相等？|2/4|1/4|2/3', '3/5 − 1/5 = ?|2/5|2/10|4/5']],
    [6, 'percent', '百分数集市', '🧺', ['一件 80 元的商品打八折，现价多少？|64 元|72 元|16 元', '50 人中有 20 人参加阅读活动，参加人数占百分之几？|40%|20%|30%', '原来有 100 棵树，现在有 125 棵，增加了百分之几？|25%|125%|20%']],
  ],
  [
    [2, 'daily', '单词小书包', '🎒', ['🍌 选出对应的单词。|banana|apple|orange', '📕 选出对应的单词。|book|ball|bed', '🔵 选出对应的颜色。|blue|green|red']],
    [3, 'sentence', '句子邮局', '📬', ['“我有一只狗”怎么说？|I have a dog.|I see a cat.|I like fish.', 'What is your name? 应该怎么回答？|My name is Amy.|I am fine.|It is a pencil.', '“这是一支铅笔”怎么说？|This is a pencil.|This is a book.|That is a pen.']],
    [4, 'present', '日常任务站', '⏰', ['She ___ to school by bus every day.|goes|go|going', 'They ___ soccer on Sundays.|play|plays|playing', 'I ___ breakfast at seven every day.|eat|eats|eating']],
    [5, 'compare', '比较级攀登赛', '⛰️', ['An elephant is ___ than a mouse.|bigger|big|biggest', 'This bag is ___ than that bag.|lighter|light|lightest', 'What is the comparative form of “good”?|better|gooder|best']],
    [6, 'past', '时间旅行社', '🕰️', ['Yesterday, I ___ to the park.|went|go|goes', 'She ___ a new book last week.|bought|buys|buy', 'They ___ a film last night.|watched|watch|watches']],
  ],
];

const secondGradeNames = [
  ['反义词花园', '识字小书屋'], ['加减糖果铺', '数字接力'], ['单词找朋友', '字母补给站'],
];

const extraRounds = [
  [
    ['“前”的反义词是？|后|左|右', '“远”的反义词是？|近|深|矮', '“开”的反义词是？|关|分|走'],
    ['按拼音 rèn zhēn 拼出词语。|认真|认直|认贞', '“一（ ）小鸟”应该填什么？|只|条|匹', '“一（ ）书”应该填什么？|本|把|片'],
  ],
  [
    ['7 + 9 = ?|16|15|17', '18 − 9 = ?|9|8|10', '12 + 6 = ?|18|19|16'],
    ['12、14、16、18、（ ）|20|19|22', '5、10、15、20、（ ）|25|24|30', '30、27、24、21、（ ）|18|17|19'],
  ],
  [
    ['“尺子”怎么说？|ruler|eraser|pencil', '“绿色”怎么说？|green|yellow|white', '“鸟”怎么说？|bird|bear|bee'],
    ['🐶 d_g|o|a|e', '🍐 pe_r|a|e|u', '🐟 f_sh|i|e|a'],
  ],
];

const practice = [
  [
    [ ['“一眼望不到边”可以用哪个成语？|一望无际|一心一意|一鸣惊人', '“做事专心”可以用哪个成语？|全神贯注|东张西望|半途而废', '“自己亲眼看到”更接近哪个说法？|亲眼所见|道听途说|闭目养神'], ['“雨点落在屋顶上。”哪个词表示动作？|落|雨点|屋顶', '“小兔悄悄地走进树林。”哪个词说明怎样走？|悄悄地|树林|小兔', '“风筝飞得很高。”哪个词说明飞的高度？|很高|风筝|飞'] ],
    [ ['“秋天的苹果熟了，树上挂满了红灯笼。”红灯笼指什么？|苹果|树枝|落叶', '“风一吹，小草跳起了舞。”谁被当作人来写？|小草|风|舞步', '“教室里安静得能听见针落地。”主要描写什么？|非常安静|同学在找针|教室很空'], ['“虽然下雨，（ ）比赛照常进行。”|但是|因为|而且', '“（ ）路上堵车，所以他迟到了。”|因为|虽然|只要', '“今天（ ）刮风，而且下雨。”|不但|尽管|如果'] ],
    [ ['用「同学们」「操场」「跑步」拼成一句通顺的话。|同学们在操场上跑步。|操场上跑步同学们。|同学们跑步着操场。', '用“因为”说明她没带伞、被雨淋湿这两件事的关系。|因为没带伞，她被雨淋湿了。|她没带伞，就下雨了。|下雨是因为她忘了带伞。', '“鸟儿在枝头唱歌。”属于哪种写法？|拟人|夸张|排比'], ['“小林说：‘我做完了。’”改成转述。|小林说他做完了。|小林说我做完了。|小林说你做完了。', '拼一句描写他很快跑过终点的话。|他一下子冲过了终点。|他慢慢走过了终点。|他站在终点旁。', '哪个词更适合形容“绿得发亮的叶子”？|翠绿|雪白|金黄'] ],
    [ ['“她攥紧拳头，手心全是汗。”此时她最可能是什么心情？|紧张|轻松|满足', '“他来回走着，不住地看表。”这个细节最能表现什么？|等得着急|走得很累|不认识时间', '“暮色渐浓，路灯一盏盏亮了。”事情大约发生在什么时候？|傍晚|清晨|正午'], ['“暴雨过后，积水挡住了校门。志愿者清理排水口，路很快通了。”哪项最概括这段话？|志愿者疏通排水，恢复通行。|校门附近有排水口。|志愿者平时走路上学。', '“他一边练习，一边记录错误，下次练习时先复习错处。”他用了什么方法？|记录并复习错误|每次只做会的题|练完就忘掉错题', '“虽然路远，爷爷仍天天给树苗浇水。”突出爷爷的什么特点？|坚持|贪玩|粗心'] ],
  ],
  [
    [ ['23 × 3 = ?|69|66|63', '42 × 2 = ?|84|88|82', '12 × 4 = ?|48|44|46'], ['长方形长 7 厘米、宽 3 厘米，周长多少？|20 厘米|21 厘米|10 厘米', '边长 6 厘米的正方形周长多少？|24 厘米|36 厘米|12 厘米', '两个边长 2 厘米的正方形并排拼成一个长方形，新图形周长多少？|12 厘米|16 厘米|8 厘米'] ],
    [ ['25 × 4 × 7 可先算哪一步更方便？|25 × 4|4 × 7|25 × 7', '136 + 49 = 136 + 50 −（ ）|1|10|9', '35 × 8 + 65 × 8 = ?|800|808|700'], ['90° 的角叫什么？|直角|锐角|钝角', '35° 与 55° 拼成多少度？|90°|100°|80°', '120°、45°、90° 中，哪个是钝角？|120°|45°|90°'] ],
    [ ['0.5 × 6 = ?|3|30|0.3', '2.4 ÷ 3 = ?|0.8|8|0.08', '1.2 × 0.3 = ?|0.36|3.6|0.9'], ['长方体长 4、宽 3、高 2 厘米，体积多少？|24 立方厘米|9 立方厘米|18 立方厘米', '棱长 3 厘米的正方体体积多少？|27 立方厘米|9 立方厘米|18 立方厘米', '2 升水等于多少毫升？|2000 毫升|200 毫升|20 毫升'] ],
    [ ['把 12:18 化成最简整数比。|2:3|3:2|6:9', '3 支笔共 12 元，同样的笔 5 支多少元？|20 元|15 元|24 元', '红球和蓝球的数量比是 2:3，共 25 个，红球多少个？|10 个|15 个|5 个'], ['圆的直径是 10 厘米，半径多少？|5 厘米|20 厘米|10 厘米', '圆的半径是 4 厘米，用 π 表示周长。|8π 厘米|4π 厘米|16π 厘米', '圆的半径是 3 厘米，用 π 表示面积。|9π 平方厘米|6π 平方厘米|3π 平方厘米'] ],
  ],
  [
    [ ['Where is the cat? 🐱⬇️🪑|Under the chair.|On the chair.|In the chair.', '“盒子里”怎么说？|in the box|on the box|behind the box', '“在两棵树之间”怎么说？|between the trees|under the tables|behind the door'], ['Hello! 应该怎么回应？|Hi!|Good night!|I am eight.', 'Thank you! 应该怎么回应？|You’re welcome.|Good morning.|This is my book.', '“我能帮忙吗？”怎么说？|Can I help?|Can I swim?|Can I go?'] ],
    [ ['He is ___ a book right now.|reading|read|reads', 'Look! The birds are ___.|flying|fly|flies', 'I am ___ my homework now.|doing|do|does'], ['“我每天骑车上学。”怎么说？|I ride a bike to school every day.|I take a bus to school every day.|I walk home every day.', 'What time is it? 🕗|It is eight o’clock.|It is five o’clock.|It is nine o’clock.', 'How do you get to school? 🚶|I walk to school.|I go by bus.|I go by train.'] ],
    [ ['There ___ two apples on the table.|are|is|am', 'There ___ a museum near my home.|is|are|am', '___ there any books in the bag?|Are|Is|Am'], ['Lucy has a red bag. Ben has a blue bag. Whose bag is red?|Lucy’s.|Ben’s.|Both bags.', 'It is raining. Mia takes her umbrella. What does Mia take?|An umbrella.|A raincoat.|A hat.', 'Tom likes apples but does not like bananas. What does he like?|Apples.|Bananas.|Both fruits.'] ],
    [ ['We are going to ___ the zoo tomorrow.|visit|visited|visiting', 'She will ___ a letter next week.|write|wrote|writes', 'What are you going to ___ this weekend?|do|did|does'], ['Anna left home at 8:00. Her class started at 9:00. Which happened first?|She left home.|Her class started.|They happened together.', 'Leo forgot his water bottle, so Sam shared his water. Who helped Leo?|Sam.|Leo.|The teacher.', 'Kim planted seeds on Monday. On Friday she saw small leaves. What happened after she planted the seeds?|She saw leaves.|She bought a tree.|She planted the seeds again.'] ],
  ],
];

const practiceNames = [
  [['成语大发现', '词语小舞台'], ['描写探照灯', '关联词搭桥'], ['表达整理屋', '句子变变变'], ['人物显微镜', '段落藏宝图']],
  [['乘法补给站', '周长环游记'], ['巧算工厂', '角度观测站'], ['小数运算站', '体积积木城'], ['比例调配师', '圆形实验室']],
  [['方位躲猫猫', '对话接龙'], ['动作定格', '上学路线图'], ['房间寻物', '短文小侦探'], ['未来计划册', '故事时间轴']],
];

function expandedSubjects(grade) {
  const index = grade - 2;
  return firstGrade.map((subject, subjectIndex) => {
    const [level, id, name, icon, rounds] = tracks[subjectIndex][index];
    const companions = index === 0 ? extraRounds[subjectIndex] : practice[subjectIndex][index - 1];
    const names = index === 0
      ? secondGradeNames[subjectIndex]
      : practiceNames[subjectIndex][index - 1];
    const games = [
      [id, name, '每答对一题得一颗星', icon, rounds.map(round => round.split('|'))],
      ...companions.map((questions, item) => {
        const [baseId, , , gameIcon] = subject.games[item];
        return [baseId, names[item], '完成三道闯关题', gameIcon, questions.map(question => question.split('|'))];
      }),
    ];
    return { ...subject, games: games.map(([key, ...game]) => [`g${level}-${key}`, ...game]) };
  });
}

export function subjectsForGrade(grade) {
  if (!Number.isInteger(grade) || grade < 1 || grade > grades.length) return [];
  // Keep original IDs so existing local scores appear under first grade.
  return grade === 1 ? firstGrade : expandedSubjects(grade);
}
