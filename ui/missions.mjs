import { recoveryMissions } from './recovery-games.mjs';
import { catchMissions } from './catch-missions.mjs';
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
    id: 'kites', role: 'jet', title: '世界机场光球对决', icon: '🪁',
    intro: '在世界机场依次挑战三位对手。躲开光球，受击后答题恢复护盾。',
  },
];

const retiredRangeIDs = {
  'role-treehouse': 'role-kites',
  'role-foal': 'role-kites',
  'role-lost-signal': 'role-river-team',
  'role-lake-lab': 'role-river-team',
};

export const missionSeries = [
  { id: 'wings', title: '超级飞侠', tagline: '2D 答题打靶，点亮飞行航线',
    roles: wingsRoles, plans: wingsPlans,
    example: '比如：让乐迪去云朵图书馆，帮小熊把新书送回书架。' },
  ...extraSeries,
].map(series => ({ ...series, plans: [...series.plans, ...adventures[series.id], catchMissions[series.id], ...recoveryMissions[series.id]], cover: `/art/${series.id}-cover.jpg`, scene: `/art/${series.id}-scene.jpg` }));

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
    const original = key.replace(/^g[1-6]-(?=role-)/, '');
    const id = retiredRangeIDs[original] || original;
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
