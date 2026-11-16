import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grades, subjectsForGrade } from './grades.mjs';

test('each grade has independent progress IDs and nine playable games', () => {
  const ids = new Set();
  const prompts = new Set();
  for (let grade = 1; grade <= grades.length; grade++) {
    const subjects = subjectsForGrade(grade);
    assert.deepEqual(subjects.map(subject => subject.name), ['语文', '数学', '英语']);
    for (const subject of subjects) {
      assert.equal(subject.games.length, 3);
      for (const [id, name, description, icon, questions] of subject.games) {
        assert.ok(name && description && icon);
        assert.ok(id.length <= 32 && !ids.has(id), id);
        ids.add(id);
        assert.equal(questions.length, 3);
        for (const [prompt, ...choices] of questions) {
          assert.ok(prompt && !prompts.has(prompt), prompt);
          prompts.add(prompt);
          assert.equal(choices.length, 3);
          assert.equal(new Set(choices).size, 3);
        }
      }
    }
  }
  assert.equal(ids.size, 54);
  assert.equal(prompts.size, 162);
  assert.deepEqual(subjectsForGrade(0), []);
  assert.deepEqual(subjectsForGrade(7), []);
});

test('first grade keeps existing local progress IDs', () => {
  assert.deepEqual(subjectsForGrade(1).flatMap(subject => subject.games.map(([id]) => id)),
    ['pinyin', 'words', 'radical', 'count', 'math', 'pattern', 'picture', 'letters', 'spell']);
});

test('tracing accepts ordered strokes and rejects a tap, reverse, or shortcut', async () => {
  const { characters, followsStroke, strokeCheckpoints } = await import('./strokes.mjs');
  for (const { strokes } of characters) {
    for (const stroke of strokes) {
      const points = strokeCheckpoints(stroke);
      assert.equal(followsStroke(stroke, points), true);
      assert.equal(followsStroke(stroke, [points[0]]), false);
      assert.equal(followsStroke(stroke, [...points].reverse()), false);
    }
  }
  const corner = characters[2].strokes[1];
  assert.equal(followsStroke(corner, strokeCheckpoints([corner[0], corner.at(-1)])), false);
});

test('all 162 rounds have a usable interactive mechanic', async () => {
  const { activityFor, mathAnswer, mathKeys, patterns, tileBoard } = await import('./mechanics.mjs');
  const modes = new Set();
  for (let grade = 1; grade <= grades.length; grade++) {
    for (const { name, games } of subjectsForGrade(grade)) {
      for (const [id, , , , questions] of games) {
        for (const [round, [, correct, ...distractors]] of questions.entries()) {
          const mode = activityFor(id, name, correct);
          modes.add(mode);
          if (mode === 'tiles' || mode === 'clues') {
            const { target, bank } = tileBoard(correct, distractors, name, round);
            assert.ok(bank.length > target.length, id);
            assert.equal(new Set(bank.map(piece => piece.id)).size, bank.length, id);
            assert.equal(target.join('').replace(/\s/g, ''), correct.replace(/\s/g, ''), id);
            for (const text of new Set(target)) {
              assert.ok(bank.filter(piece => piece.text === text).length >= target.filter(token => token === text).length, id);
            }
          }
          if (mode === 'math') {
            const { value } = mathAnswer(correct);
            assert.ok([...value].every(key => [...mathKeys, '/', ':', '×', 'π', '%', '°'].includes(key)), id);
          }
          if (mode === 'pattern') assert.equal(patterns[round].target[0], correct, id);
          if (mode === 'fraction') assert.match(correct, /^[1-9]\/([2-9]|10)$/);
        }
      }
    }
  }
  assert.deepEqual([...modes].sort(), ['clues', 'fraction', 'market', 'math', 'pattern', 'tiles', 'trace', 'train']);
});

test('math accepts equivalent decimal typing and convenient multiplication in either order', async () => {
  const { mathAnswer, sameMathAnswer } = await import('./mechanics.mjs');
  assert.deepEqual(mathAnswer('8π 厘米'), { value: '8π', unit: '厘米' });
  assert.deepEqual(mathAnswer('25 × 4'), { value: '25×4', unit: '' });
  assert.ok(sameMathAnswer('０.８０', '0.8'));
  assert.ok(sameMathAnswer('4 * 25', '25×4'));
  assert.ok(!sameMathAnswer('100', '25×4'));
  assert.ok(!sameMathAnswer('64', '64%'));
});

test('all animation game modes have playable stages and unique progress IDs', async () => {
  const { missionSeries, presetMissions } = await import('./missions.mjs');
  const { matchingSuspects } = await import('./role-play-data.mjs');
  assert.deepEqual(missionSeries.map(series => series.id), ['wings', 'cosmic', 'labrador', 'jojo']);
  const kinds = { wings: 'range', cosmic: 'range', labrador: 'detective', jojo: 'sim' };
  const ids = new Set();
  for (let grade = 1; grade <= 6; grade++) {
    for (const series of missionSeries) {
      const jobs = presetMissions(grade, series);
      assert.deepEqual(jobs.map(job => job.role.id), series.roles.map(role => role.id));
      for (const job of jobs) {
        assert.ok(job.id.length <= 32 && !ids.has(job.id));
        ids.add(job.id);
        assert.equal(job.stages.length, 3);
        for (const stage of job.stages) {
          assert.equal(stage.kind, kinds[series.id]);
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
  }
  assert.equal(ids.size, 72);
});

test('custom missions still support sorting and unordered packing', async () => {
  const { missionStagePassed } = await import('./missions.mjs');
  const answer = ['水瓶', '地图'];
  assert.ok(missionStagePassed({ kind: 'pack', answer }, ['地图', '水瓶']));
  assert.ok(!missionStagePassed({ kind: 'sequence', answer }, ['地图', '水瓶']));
  assert.ok(!missionStagePassed({ kind: 'pack', answer }, ['水瓶', '水瓶']));
});
