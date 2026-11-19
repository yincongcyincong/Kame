import assert from 'node:assert/strict';
import { test } from 'node:test';
test('all animation game modes have playable stages and unique progress IDs', async () => {
  const { missionSeries, presetMissions } = await import('./missions.mjs');
  const { matchingSuspects } = await import('./role-play-data.mjs');
  assert.deepEqual(missionSeries.map(series => series.id), ['wings', 'cosmic', 'labrador', 'jojo']);
  const kinds = { wings: ['range', 'flight', 'listenDelivery', 'catchItems', 'flightRelay'], cosmic: ['range', 'bridge', 'mirrorRescue', 'longJump', 'catchItems', 'pipeRescue'], labrador: ['detective', 'timeline', 'soundTrail', 'catchItems', 'footprintSearch'], jojo: ['sim', 'blocks', 'groom', 'breakfast', 'playground', 'toyShop', 'hanziWorkshop', 'catchItems', 'rhythmBand', 'fruitBalance'] };
  const ids = new Set();
  for (const series of missionSeries) {
    const jobs = presetMissions(series);
    assert.ok(jobs.every(job => series.roles.some(role => role.id === job.role.id)));
    assert.equal(jobs.filter(job => job.stages[0].kind === 'range').length,
      ['wings', 'cosmic'].includes(series.id) ? 1 : 0);
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
  assert.equal(ids.size, 29);
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

  assert.equal(bridgeStable(2, [1]), false);
  assert.equal(bridgeStable(2, [3, 1]), true);
  for (const { heights } of adventures.jojo.find(game => game.id === 'block-playground').stages) {
    assert.ok(trackRun(heights) < heights.length - 1);
    assert.equal(trackRun(heights.map((_, index) => heights[0] - index)), heights.length - 1);
  }
});

test('2D map requires approaching the robot and keeps movement inside the map', async () => {
  const { walkRangeMap, canShootOnMap, mapCheckpoints, startPosition } = await import('./range-map.mjs');
  assert.equal(canShootOnMap(startPosition, mapCheckpoints[0]), false);
  let point = startPosition;
  for (let frame = 0; frame < 29; frame++) point = walkRangeMap(point, 1, -1, .04);
  assert.equal(canShootOnMap(point, mapCheckpoints[0]), true);
  assert.equal(canShootOnMap(point, mapCheckpoints[1]), false);
  assert.deepEqual(walkRangeMap({ x: 94, y: 12 }, 1, -1, .1), { x: 94, y: 12 });
});

test('patrolling opponents change positions and trigger questions from their current position', async () => {
  const { patrolPosition, mapCheckpoints, canShootOnMap } = await import('./range-map.mjs');
  const checkpoint = mapCheckpoints[0];
  const before = patrolPosition(checkpoint, 0, 0);
  const after = patrolPosition(checkpoint, Math.PI / (2 * 1.12), 0);
  const player = { x: after.x + 8, y: after.y };
  assert.notDeepEqual(before, after);
  assert.equal(canShootOnMap(player, before), false);
  assert.equal(canShootOnMap(player, after), true);
});

test('only hostile orb impact opens a shield question and friendly impact clears the opponent', async () => {
  const { mapCheckpoints, startDuel, stepDuel, fireOrb, recoverDuel } = await import('./range-map.mjs');
  const point = mapCheckpoints[0];
  const touching = stepDuel(startDuel(0), point, .03);
  assert.equal(touching.status, 'playing');
  const shot = fireOrb(startDuel(0), { x: point.x - 8, y: point.y }, point);
  const won = stepDuel(shot, { x: point.x - 8, y: point.y }, .04);
  assert.equal(won.status, 'won');
  const incoming = { ...startDuel(0), shots: [{ x: 44, y: 50, vx: 40, vy: 0, life: 1, hostile: true }] };
  assert.equal(stepDuel(incoming, { x: 50, y: 68 }, .04).status, 'playing');
  const question = stepDuel(incoming, { x: 50, y: 50 }, .04);
  assert.equal(question.status, 'question');
  assert.equal(recoverDuel(question).status, 'playing');
  assert.equal(recoverDuel(question).shots.length, 0);
});

test('detective cast uses distinct series portraits and preserves clue logic', async () => {
  const { missionSeries, presetMissions } = await import('./missions.mjs');
  const { castDossier, matchingSuspects } = await import('./role-play-data.mjs');
  const series = missionSeries.find(item => item.id === 'labrador');
  for (const job of presetMissions(series).slice(0, 3)) {
    const result = castDossier(job.stages[0].dossier, series.roles, job.role);
    assert.equal(new Set(result.portraitSources).size, 3);
    assert.ok(!result.suspects.includes(job.role.name));
    assert.equal(result.suspects[matchingSuspects(result, [0, 1, 2])[0]], '羚羚羊');
  }
});

test('opponent fires a fan of two to five orbs after its warning', async () => {
  const { startDuel, stepDuel } = await import('./range-map.mjs');
  const player = { x: 72, y: 86 };
  const charging = { ...startDuel(0), time: 1.34, attackAt: 1.36, warning: player };
  for (const [expected, roll] of [[2, 0], [3, .25], [4, .50], [5, .999]]) {
    const volley = stepDuel(charging, player, .04, roll);
    assert.equal(volley.shots.length, expected);
    assert.ok(volley.shots.every(shot => shot.hostile));
    assert.equal(new Set(volley.shots.map(shot => Math.atan2(shot.vy, shot.vx))).size, expected);
    assert.equal(volley.warning, null);
  }
  const volley = stepDuel(charging, player, .04, .999);
  const hit = stepDuel(volley, volley.shots[0], .016);
  assert.equal(hit.status, 'question');
  assert.equal(hit.shots.length, 0);
});

test('shield decks have unique academic and general knowledge questions for every grade', async () => {
  const { shieldGrades, shieldQuestionBank, dealShieldQuestions } = await import('./shield-questions.mjs');
  assert.equal(shieldQuestionBank.length, 1020);
  assert.equal(new Set(shieldQuestionBank.map(question => question.prompt)).size, 1020);
  for (const grade of shieldGrades) {
    const deck = dealShieldQuestions(grade, () => .26);
    assert.equal(deck.length, 170);
    assert.ok(deck.every(question => question.grade === grade));
    for (const subject of ['语文', '数学', '英语']) {
      assert.equal(deck.filter(question => question.subject === subject).length, 50);
    }
    assert.equal(deck.filter(question => question.subject === '常识').length, 20);
    assert.notDeepEqual(deck.map(question => question.prompt),
      shieldQuestionBank.filter(question => question.grade === grade).map(question => question.prompt));
    for (const { options, answer } of deck) {
      assert.equal(new Set(options).size, 3);
      assert.equal(options.filter(value => value === answer).length, 1);
    }
    assert.notEqual(dealShieldQuestions(grade, () => .26, deck[0].prompt)[0].prompt, deck[0].prompt);
  }
  assert.ok(shieldQuestionBank.some(question => question.answer === 'look forward to'));
});

test('each map has distinct supporting characters with dialogue and local portraits', async () => {
  const { access } = await import('node:fs/promises');
  const { missionSeries } = await import('./missions.mjs');
  const { mapVisitors, nearbyVisitor } = await import('./map-visitors.mjs');
  for (const series of missionSeries) {
    for (const active of series.roles) {
      const partner = series.roles.find(role => role.id !== active.id);
      const visitors = mapVisitors(series, [active.name, partner.name]);
      assert.ok(visitors.length >= 2);
      assert.equal(new Set(visitors.map(({ role }) => role.name)).size, visitors.length);
      assert.equal(nearbyVisitor(visitors, { x: 97, y: 90 }), undefined);
      for (const visitor of visitors) {
        assert.ok(![active.name, partner.name].includes(visitor.role.name) && visitor.speech);
        assert.equal(nearbyVisitor(visitors, visitor.point), visitor);
        if (visitor.role.portrait) await access(new URL('../ui' + visitor.role.portrait, import.meta.url));
      }
    }
  }
});

test('each shooter has three distinct opponents and the detective map has extra residents and clones', async () => {
  const { access } = await import('node:fs/promises');
  const { missionSeries } = await import('./missions.mjs');
  const { rangeOpponents } = await import('./range-opponents.mjs');
  const { mapCheckpoints } = await import('./range-map.mjs');
  const { mapVisitors } = await import('./map-visitors.mjs');
  for (const roster of Object.values(rangeOpponents)) {
    assert.equal(roster.length, mapCheckpoints.length);
    assert.equal(new Set(roster.map(opponent => opponent.name)).size, roster.length);
    for (const opponent of roster) await access(new URL('.' + opponent.portrait, import.meta.url));
  }
  const series = missionSeries.find(item => item.id === 'labrador');
  const visitors = mapVisitors(series, [...series.roles.map(role => role.name), '羚羚羊']);
  assert.equal(visitors.filter(({ role }) => role.kind === 'villain').length, 2);
  assert.ok(visitors.some(({ role }) => role.name === '小云朵'));
  assert.ok(visitors.some(({ role }) => role.name === '农场爷爷'));
});

test('long jump rejects overcharge and computer jumps at 80 to 95 percent', async () => {
  const { chargeAt, jumpResult } = await import('./long-jump.mjs');
  assert.deepEqual(chargeAt(1600, 1500), { power: 1, overcharged: true });
  assert.equal(jumpResult(1501, 1500, 6), null);
  assert.equal(jumpResult(0, 1500, 6), null);
  assert.deepEqual(jumpResult(1500, 1500, 6, () => 0), { player: 6, computer: 4.8, computerPower: 80 });
  assert.deepEqual(jumpResult(1350, 1500, 6, () => .999), { player: 5.4, computer: 5.7, computerPower: 95 });
});

test('progress from removed shooter entries is folded into the surviving games', async () => {
  const { readMissionProgress } = await import('./missions.mjs');
  assert.deepEqual(readMissionProgress({ 'role-kites': 1, 'g3-role-treehouse': 3, 'role-lake-lab': 2 }),
    { 'role-kites': 3, 'role-river-team': 2 });
});

test('catching items counts the catch, pauses on a miss and resumes only from a question', async () => {
  const { startCatch, tickCatch, resumeCatch } = await import('./catch-game.mjs');
  const { catchMissions } = await import('./catch-missions.mjs');
  const names = [];
  for (const { stages } of Object.values(catchMissions)) {
    assert.deepEqual(stages.map(stage => stage.goal), [4, 5, 6]);
    assert.ok(stages[0].speed < stages[1].speed && stages[1].speed < stages[2].speed);
    const stage = stages[0];
    names.push(stage.name);
    const game = { ...startCatch(stage), status: 'playing', y: 83 };
    const caught = tickCatch(game, 0, .05, stage, game.pattern[0]);
    assert.equal(caught.caught, 1);
    assert.equal(caught.item, 1);
    const missed = tickCatch(game, 0, .05, stage, 92);
    assert.equal(missed.status, 'question');
    assert.equal(missed.caught, 0);
    assert.equal(tickCatch(missed, 1, .05, stage), missed);
    assert.equal(resumeCatch(missed).item, 1);
    assert.equal(resumeCatch(missed).status, 'playing');
    assert.equal(tickCatch({ ...game, caught: stage.goal - 1 }, 0, .05, stage, game.pattern[0]).status, 'won');
  }
  assert.equal(new Set(names).size, 4);
});

test('recovery games have viable routes and discriminate timing and balance mistakes', async () => {
  const { recoveryMissions, makePipeGrid, tracePipe, balanceWeight, beatResult, relayInRange } = await import('./recovery-games.mjs');
  for (const { route, turns } of recoveryMissions.cosmic[0].stages) {
    const leak = tracePipe(makePipeGrid(route, turns));
    assert.equal(leak.connected, false);
    assert.notEqual(leak.leak, null);
    assert.deepEqual(tracePipe(makePipeGrid(route, route.map(() => 0))), { wet: route, leak: null, connected: true });
  }
  for (const { fruit } of recoveryMissions.jojo[1].stages) {
    assert.notEqual(balanceWeight(fruit, fruit.map(() => 1)), 0);
    assert.ok(Array.from({ length: 2 ** fruit.length }, (_, mask) =>
      balanceWeight(fruit, fruit.map((_, index) => mask & (1 << index) ? 1 : -1))).includes(0));
  }
  assert.equal(relayInRange(.08, .09), true);
  assert.equal(relayInRange(-.13, .09), false);
  assert.equal(beatResult(400, 640), 'early');
  assert.equal(beatResult(600, 640), 'matched');
  assert.equal(beatResult(860, 640), 'late');
});
