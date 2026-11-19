const visitorSpots = [
  { x: 19, y: 79 },
  { x: 49, y: 54 },
  { x: 39, y: 23 },
  { x: 89, y: 45 },
  { x: 49, y: 74 },
  { x: 60, y: 34 },
  { x: 14, y: 23 },
];

const guests = {
  wings: [
    { id: 'big-wing', name: '大鹏', portrait: '/art/wings-big-wing.jpg' },
  ],
  cosmic: [
    { id: 'meteor', name: '流星', portrait: '/art/cosmic-meteor.png' },
  ],
  labrador: [
    { id: 'little-labrador', name: '小哆哆', portrait: '/art/labrador-little.jpg' },
    { id: 'cloud-pup', name: '小云朵', portrait: '/art/labrador-cloud.jpg', crop: true },
    { id: 'farm-grandpa', name: '农场爷爷', portrait: '/art/labrador-farm.jpg', crop: true },
    { id: 'antel', name: '羚羚羊', portrait: '/art/labrador-antel.png', kind: 'villain' },
    { id: 'clown-clone', name: '小丑装克隆羊', portrait: '/art/labrador-clones.jpg', crop: true, kind: 'villain' },
    { id: 'yellow-clone', name: '黄裙克隆羊', portrait: '/art/labrador-clones.jpg', crop: true, kind: 'villain' },
  ],
  jojo: [
    { id: 'jojo-mom', name: 'JOJO 妈妈', portrait: '/art/jojo-breakfast.jpg' },
    { id: 'jojo-dad', name: 'JOJO 爸爸', portrait: '/art/jojo-scene.jpg' },
  ],
};

const greetings = {
  jet: '乐迪准备出发！先看看地图，找准下一站。',
  donnie: '小工具都检查好啦，有需要就来找我！',
  dizzy: '遇到难题可以慢慢来，我在这里等你。',
  'big-wing': '机场一切正常，起飞前记得看看周围！',
  storm: '遇到变化先观察，想清楚再行动。',
  lightning: '我去看看前面的路，你也来吧！',
  rainbow: '仔细看看周围，说不定能发现新线索。',
  meteor: '工具箱带来啦！想修东西可以来找我。',
  labrador: '先听大家怎么说，再把线索连起来。',
  doberman: '我负责巡查，发现线索记得跟我说！',
  papillon: '小蝶在这儿。看一看地图，就知道下一站往哪走啦。',
  'little-labrador': '我也想当小警察，和你一起找线索！',
  'cloud-pup': '我在小镇玩，想去看看那边的公园。',
  'farm-grandpa': '农场的水果熟啦，路过来打声招呼吧！',
  antel: '你在调查什么？可别漏掉现场的小细节。',
  'clown-clone': '看看这身小丑衣服！你认得出我是谁吗？',
  'yellow-clone': '别光看我的衣服，记得看看我和谁长得像。',
  'baby-jojo': '来和我一起玩吧！',
  'jojo-sister': '先看看桌上有哪些东西，再一起动手吧。',
  'jojo-brother': '我把东西准备好啦，我们一起试试看！',
  'jojo-mom': '慢慢来，做完还可以把用过的东西收好哦。',
  'jojo-dad': '做一做、看一看，有问题我们一起想办法。',
};

export function mapVisitors(series, excludedNames) {
  return [...series.roles, ...(guests[series.id] || [])]
    .filter(role => !excludedNames.includes(role.name))
    .slice(0, visitorSpots.length)
    .map((role, index) => ({ role, point: visitorSpots[index], speech: greetings[role.id] }));
}

export function nearbyVisitor(visitors, position) {
  return visitors.find(({ point }) => Math.hypot(point.x - position.x, point.y - position.y) <= 9);
}
