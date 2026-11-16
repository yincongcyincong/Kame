import { extraSeries } from './extra-missions.mjs';
import { rangeStages, caseStages, simStages } from './role-play-data.mjs';

const wingsRoles = [
  { id: 'jet', name: '乐迪', icon: '✈️', skill: '送包裹、规划航线', color: 'jet' },
  { id: 'donnie', name: '多多', icon: '🛠️', skill: '做工具、修设备', color: 'donnie' },
  { id: 'dizzy', name: '小爱', icon: '🚁', skill: '守护伙伴、照顾动物', color: 'dizzy' },
];

const wingsPlans = [
  {
    id: "kites",
    role: "jet",
    title: "喜马拉雅风筝节",
    icon: "🪁",
    intro: "扮演乐迪，在风筝航线上瞄准正确的答案靶，帮阿卡斯点亮会场。"
  },
  {
    id: "treehouse",
    role: "donnie",
    scene: "/art/wings-donnie.jpg",
    title: "丹尼尔的树屋",
    icon: "🌳",
    intro: "扮演多多，在树屋训练场击中正确的计算结果，给修建小队发出信号。"
  },
  {
    id: "foal",
    role: "dizzy",
    scene: "/art/wings-dizzy.jpg",
    title: "巴塔哥尼亚找小马",
    icon: "🐴",
    intro: "扮演小爱，击中英文标记正确的信标，点亮寻找小马的航线。"
  }
];

export const missionSeries = [
  { id: 'wings', title: '超级飞侠', tagline: '第一人称答题打靶，点亮飞行航线',
    roles: wingsRoles, plans: wingsPlans,
    example: '比如：让乐迪去云朵图书馆，帮小熊把新书送回书架。' },
  ...extraSeries,
].map(series => ({ ...series, cover: `/art/${series.id}-cover.jpg`, scene: `/art/${series.id}-scene.jpg` }));

const stageBuilders = {
  wings: (slot, grade) => rangeStages('wings', slot, grade),
  cosmic: (slot, grade) => rangeStages('cosmic', slot, grade),
  labrador: caseStages,
  jojo: simStages,
};

export function presetMissions(grade, series) {
  return series.plans.map((plan, slot) => ({
    id: `g${grade}-role-${plan.id}`,
    role: series.roles.find(role => role.id === plan.role),
    title: plan.title, intro: plan.intro, icon: plan.icon, scene: plan.scene || series.scene,
    stages: stageBuilders[series.id](slot, grade),
  }));
}

export function missionStagePassed(stage, chosen) {
  if (chosen.length !== stage.answer.length) return false;
  if (stage.kind === 'sequence') return stage.answer.every((tile, index) => chosen[index] === tile);
  const bag = [...chosen].sort();
  return [...stage.answer].sort().every((tile, index) => bag[index] === tile);
}
