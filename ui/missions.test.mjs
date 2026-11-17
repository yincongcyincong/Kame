import assert from 'node:assert/strict';
import { test } from 'node:test';
test('all animation game modes have playable stages and unique progress IDs', async () => {
  const { missionSeries, presetMissions } = await import('./missions.mjs');
  const { matchingSuspects } = await import('./role-play-data.mjs');
  assert.deepEqual(missionSeries.map(series => series.id), ['wings', 'cosmic', 'labrador', 'jojo']);
  const kinds = { wings: ['range', 'flight'], cosmic: ['range', 'bridge'], labrador: ['detective', 'timeline'], jojo: ['sim', 'blocks', 'groom', 'breakfast', 'playground'] };
  const ids = new Set();
  for (const series of missionSeries) {
    const jobs = presetMissions(series);
    assert.deepEqual([...new Set(jobs.map(job => job.role.id))], series.roles.map(role => role.id));
    for (const job of jobs) {
      assert.ok(job.id.length <= 32 && !ids.has(job.id));
      ids.add(job.id);
      assert.equal(job.stages.length, 3);
      for (const stage of job.stages) {
        assert.ok(kinds[series.id].includes(stage.kind));
        if (stage.kind === 'range') {
          assert.equal(new Set(stage.targets).size, 3);
          assert.ok(stage.targets.includes(stage.answer));
        } else if (stage.kind === 'detective') {
          assert.deepEqual(job.stages.map(item => item.phase), ['investigate', 'connect', 'resolve']);
          assert.equal(matchingSuspects(stage.dossier, [0, 1, 2]).length, 1);
          assert.equal(matchingSuspects(stage.dossier, [0]).length, 2);
          assert.equal(matchingSuspects(stage.dossier, [1]).length, 2);
        } else if (stage.kind === 'sim') {
          assert.ok(stage.zh && stage.en && stage.times > 0);
          assert.equal(stage.choices.filter(item => item.key === stage.answer).length, 1);
          assert.ok(stage.choices.every(item => item.zh && item.en));
        }
      }
    }
  }
  assert.equal(ids.size, 18);
});

test('custom missions still support sorting and unordered packing', async () => {
  const { missionStagePassed } = await import('./missions.mjs');
  const answer = ['水瓶', '地图'];
  assert.ok(missionStagePassed({ kind: 'pack', answer }, ['地图', '水瓶']));
  assert.ok(!missionStagePassed({ kind: 'sequence', answer }, ['地图', '水瓶']));
  assert.ok(!missionStagePassed({ kind: 'pack', answer }, ['水瓶', '水瓶']));
});

test('JOJO care gestures need movement in the correct area and direction', async () => {
  const { validGesture, poses } = await import('./jojo-mechanics.mjs');
  const down = [[.77, .28], [.78, .31], [.78, .35]];
  assert.ok(validGesture('comb', down, poses.hair.zone));
  assert.ok(!validGesture('comb', [...down].reverse(), poses.hair.zone));
  assert.ok(!validGesture('comb', [[.77, .28], [.77, .28]], poses.hair.zone));
  assert.ok(!validGesture('comb', [[.4, .29], [.78, .35]], poses.hair.zone));
  assert.ok(validGesture('brush', [[.44, .73], [.49, .74], [.54, .73]], poses.teeth.zone));
  assert.ok(validGesture('feed', [[.61, .83], [.66, .63], [.73, .5]], poses.meal.zone, poses.meal.plate));
  assert.ok(!validGesture('feed', [[.72, .54], [.76, .5]], poses.meal.zone, poses.meal.plate));
});

test('blocks land on stable supports and a bridge needs a gap beneath the middle', async () => {
  const { dimensions, landing, meetsGoal } = await import('./jojo-mechanics.mjs');
  assert.deepEqual(dimensions('brick', true), { width: 1, height: 2 });
  const foundation = [{ col: 1, row: 0, width: 1, height: 1 }];
  assert.equal(landing(foundation, 1, 2, 1), null);
  assert.equal(landing(foundation, 1, 1, 2), 1);
  assert.equal(landing(foundation, 6, 2, 1), null);
  assert.ok(meetsGoal([...foundation, { col: 1, row: 1, width: 1, height: 2 }], 'tower'));
  const pillars = [...foundation, { col: 3, row: 0, width: 1, height: 1 }];
  assert.equal(landing(pillars, 1, 3, 1), 1);
  const bridge = { col: 1, row: 1, width: 3, height: 1 };
  assert.ok(meetsGoal([...pillars, bridge], 'bridge'));
  assert.ok(!meetsGoal([...pillars, bridge, { col: 2, row: 0, width: 1, height: 1 }], 'bridge'));
  assert.ok(meetsGoal([
    { col: 1, row: 0, width: 1, height: 1 },
    { col: 2, row: 0, width: 1, height: 2 },
    { col: 3, row: 0, width: 1, height: 3 },
  ], 'stairs'));
});

test('3D route reveals each encounter on approach and blocks walking through before a hit', async () => {
  const { checkpoints, approachDistance, laneHalfWidth, walkRoute } = await import('./range-route.mjs');
  let position = { x: 0, distance: 1 };
  assert.equal(walkRoute(position, { x: 0, forward: 1 }, .1, 0, false).near, false);
  for (let station = 0; station < checkpoints.length; station++) {
    const line = checkpoints[station] - approachDistance;
    for (let step = 0; step < 80; step++) position = walkRoute(position, { x: 1, forward: 1 }, .1, station, false);
    assert.equal(position.distance, line);
    assert.equal(position.x, laneHalfWidth);
    assert.equal(position.near, true);
    assert.ok(walkRoute(position, { x: 0, forward: 1 }, .1, station, true).distance > line);
    assert.ok(walkRoute(position, { x: 0, forward: -1 }, .1, station, false).distance < line);
  }
});

test('3D detective interviews are only available near a suspect', async () => {
  const { closestSuspect, suspectLocations, walkTown } = await import('./detective-route.mjs');
  assert.equal(closestSuspect({ x: 0, z: 0 }), null);
  for (const [index, location] of suspectLocations.entries()) {
    assert.equal(closestSuspect(location), index);
    assert.equal(closestSuspect({ x: 0, z: location.z }), null);
  }
  const forward = walkTown({ x: 0, z: 0 }, { x: 0, forward: 1 }, 0, .1);
  assert.ok(forward.z < 0 && forward.x === 0);
  const turned = walkTown({ x: 0, z: 0 }, { x: 0, forward: 1 }, Math.PI / 2, .1);
  assert.ok(turned.x < 0);
});

test('old role mission records merge into a single record per mission', async () => {
  const { readMissionProgress } = await import('./missions.mjs');
  assert.deepEqual(readMissionProgress({
    pinyin: 3, 'g6-role-kites': 3, 'g2-role-kites': 2, 'role-kites': 0,
    'role-jojo-lunch': 3, 'g0-role-foal': 3,
  }), { 'role-kites': 3, 'role-jojo-lunch': 3 });
});

test('portrait view fits the outside targets even near the edge of the lane', async () => {
  const { approachDistance, laneHalfWidth, rangeFieldOfView } = await import('./range-route.mjs');
  for (const aspect of [280 / 430, 360 / 530, 1.7, 2]) {
    const halfSpan = (approachDistance - .2) * Math.tan(rangeFieldOfView(aspect) * Math.PI / 360) * aspect;
    assert.ok(halfSpan >= laneHalfWidth + 1.69 + 1.47 / 2);
  }
});

test('new missions have playable bridge and test-track layouts', async () => {
  const { adventures, bridgeStable, trackRun } = await import('./adventure-data.mjs');
  assert.equal(Object.values(adventures).flat().length, 5);
  assert.equal(bridgeStable(2, [1]), false);
  assert.equal(bridgeStable(2, [3, 1]), true);
  for (const { heights } of adventures.jojo[1].stages) {
    assert.ok(trackRun(heights) < heights.length - 1);
    assert.equal(trackRun(heights.map((_, index) => heights[0] - index)), heights.length - 1);
  }
});
