import { adventures } from './adventure-data.mjs';
import { extraSeries } from './extra-missions.mjs';
import { rangeStages, caseStages, simStages } from './role-play-data.mjs';

const wingsRoles = [
  { id: 'jet', portrait: '/art/wings-scene.jpg', name: '乐迪', icon: '✈️', skill: '送包裹、规划航线', color: 'jet' },
  { id: 'donnie', portrait: '/art/wings-donnie.jpg', name: '多多', icon: '🛠️', skill: '做工具、修设备', color: 'donnie' },
  { id: 'dizzy', portrait: '/art/wings-dizzy.jpg', name: '小爱', icon: '🚁', skill: '守护伙伴、照顾动物', color: 'dizzy' },
];

const wingsPlans = [
  {
    id: "kites",
    role: "jet",
    title: "喜马拉雅风筝节",
    icon: "🪁",
    intro: "在风筝航线上瞄准正确的答案靶，帮阿卡斯点亮会场。"
  },
  {
    id: "treehouse",
    role: "donnie",
    scene: "/art/wings-donnie.jpg",
    title: "丹尼尔的树屋",
    icon: "🌳",
    intro: "在树屋训练场击中正确的计算结果，给修建小队发出信号。"
  },
  {
    id: "foal",
    role: "dizzy",
    scene: "/art/wings-dizzy.jpg",
    title: "巴塔哥尼亚找小马",
    icon: "🐴",
    intro: "击中英文标记正确的信标，点亮寻找小马的航线。"
  }
];

export const missionSeries = [
  { id: 'wings', title: '超级飞侠', tagline: '第一人称答题打靶，点亮飞行航线',
    roles: wingsRoles, plans: wingsPlans,
    example: '比如：让乐迪去云朵图书馆，帮小熊把新书送回书架。' },
  ...extraSeries,
].map(series => ({ ...series, plans: [...series.plans, ...adventures[series.id]], cover: `/art/${series.id}-cover.jpg`, scene: `/art/${series.id}-scene.jpg` }));

const stageBuilders = {
  wings: slot => rangeStages('wings', slot),
  cosmic: slot => rangeStages('cosmic', slot),
  labrador: caseStages,
  jojo: simStages,
};

export function presetMissions(series) {
  return series.plans.map((plan, slot) => ({
    id: `role-${plan.id}`, task: plan.id,
    role: series.roles.find(role => role.id === plan.role),
    title: plan.title, intro: plan.intro, icon: plan.icon, scene: plan.scene || series.scene,
    stages: plan.stages || stageBuilders[series.id](slot),
  }));
}

const missionIDs = new Set(missionSeries.flatMap(series => series.plans.map(plan => 'role-' + plan.id)));

export const missionCount = missionIDs.size;

export function readMissionProgress(saved) {
  const progress = {};
  for (const [key, badges] of Object.entries(saved)) {
    // Older versions saved a separate copy of each role mission for every grade.
    const id = key.replace(/^g[1-6]-(?=role-)/, '');
    if (missionIDs.has(id) && Number.isInteger(badges) && badges >= 0 && badges <= 3) {
      progress[id] = Math.max(progress[id] || 0, badges);
    }
  }
  return progress;
}

export function missionStagePassed(stage, chosen) {
  if (chosen.length !== stage.answer.length) return false;
  if (stage.kind === 'sequence') return stage.answer.every((tile, index) => chosen[index] === tile);
  const bag = [...chosen].sort();
  return [...stage.answer].sort().every((tile, index) => bag[index] === tile);
}
