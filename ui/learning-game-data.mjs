const houses = [
  { name: '红房子', color: 'red', paint: '#ef8a83' },
  { name: '黄房子', color: 'yellow', paint: '#f6ca72' },
  { name: '蓝房子', color: 'blue', paint: '#80b5f5' },
  { name: '公园', park: true },
  { name: '绿房子', color: 'green', paint: '#9bd2a0' },
];

export const soundClues = [
  { id: 'water', label: '喷泉', icon: '⛲', text: '水流声' },
  { id: 'bell', label: '自行车棚', icon: '🚲', text: '车铃声' },
  { id: 'steps', label: '石板路', icon: '👣', text: '脚步声' },
];

export const learningGames = {
  wings: [{
    id: 'listen-delivery', role: 'jet', title: '听声送包裹', icon: '📦',
    intro: '听英语送货地址，驾驶乐迪找到房子，再把包裹送到门口。',
    stages: [
      { order: [1, 0, 3, 2, 4], destination: 1, line: 'Find the red house.', clue: '找红色房子。' },
      { order: [2, 3, 1, 4, 0], destination: 0, line: 'Find the blue house to the left of the park.', clue: '找公园左边的蓝色房子。' },
      { order: [0, 4, 3, 4, 2], destination: 3, line: 'Find the green house to the right of the park.', clue: '找公园右边的绿房子。' },
    ].map(({ order, ...stage }) => ({
      ...stage, kind: 'listenDelivery', houses: order.map(index => houses[index]),
    })),
  }],
  cosmic: [{
    id: 'mirror-rescue', role: 'rainbow', title: '照亮山洞', icon: '🔦',
    intro: '转动镜子，让手电筒的反射光照到躲在山洞里的小动物。',
    stages: [
      { angle: 0, goal: -18 },
      { angle: -18, goal: 18 },
      { angle: 18, goal: -12 },
    ].map(stage => ({...stage, kind: 'mirrorRescue'})),
  }],
  labrador: [{
    id: 'sound-trail', role: 'labrador', title: '听音寻踪', icon: '🎧',
    intro: '听案发录音，找出声音来自哪里，把现场线索按顺序记录下来。',
    stages: [
      ['water', 'bell'], ['steps', 'water', 'bell'], ['bell', 'steps', 'water', 'steps'],
    ].map(order => ({ kind: 'soundTrail', order })),
  }],
  jojo: [{
    id: 'toy-shop', role: 'baby-jojo', title: '玩具小卖部', icon: '🪙', scene: '/art/jojo-breakfast.jpg',
    intro: '帮 JOJO 收钱结账，再把剩下的硬币交还给乔乔的家人。',
    stages: [
      { budget: 5, price: 3, toy: '小车', icon: '🚗' },
      { budget: 7, price: 4, toy: '小鼓', icon: '🥁' },
      { budget: 9, price: 5, toy: '积木', icon: '🧱' },
    ].map(stage => ({ ...stage, kind: 'toyShop' })),
  }, {
    id: 'hanzi-workshop', role: 'baby-jojo', title: '汉字修理铺', icon: '🪧', scene: '/art/jojo-breakfast.jpg',
    intro: '用字块修好路牌，读一读新汉字，再把图卡送到对应的地方。',
    stages: [
      { word: '林', reading: '树林', parts: ['木', '木'], spare: '口', icon: '🌳', destinations: ['池塘', '树林', '操场'] },
      { word: '明', reading: '明亮', parts: ['日', '月'], spare: '田', icon: '💡', destinations: ['衣柜', '书架', '明亮的窗边'] },
      { word: '相', reading: '相框', parts: ['木', '目'], spare: '日', icon: '🖼️', destinations: ['相框', '花盆', '书包'] },
    ].map(stage => ({ ...stage, kind: 'hanziWorkshop' })),
  }],
};
