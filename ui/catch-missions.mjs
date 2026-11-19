const missions = {
  wings: ['catch-packages', 'jet', '乐迪接包裹', '包裹', '📦', 'parcels'],
  cosmic: ['catch-crystals', 'rainbow', '接住能量晶石', '能量晶石', '💎', 'crystals'],
  labrador: ['catch-evidence', 'labrador', '接住证物袋', '证物袋', '🗂️', 'evidence'],
  jojo: ['catch-coins', 'baby-jojo', 'JOJO 接金币', '金币', '🪙', 'coins'],
};

export const catchMissions = Object.fromEntries(Object.entries(missions).map(([series, entry]) => {
  const [id, role, title, name, icon, item] = entry;
  return [series, {
    id, role, title, icon, intro: `移动角色接住${name}。掉到地上就停下来答一道题。`,
    stages: [26, 33, 42].map((speed, round) => ({
      kind: 'catchItems', title: `接${name} · 第 ${round + 1} 轮`, speed, round, goal: 4 + round, item, name, icon,
    })),
  }];
}));
