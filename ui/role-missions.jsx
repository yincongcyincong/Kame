import { CharacterMap, MapPortrait } from './character-map.jsx';
import { adventureStages } from './adventure.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { missionSeries, missionStagePassed, presetMissions } from './missions.mjs';
import { recoveryKinds } from './recovery-games.mjs';
import { shieldGrades } from './shield-questions.mjs';
import { castDossier } from './role-play-data.mjs';
import { DetectiveStage, FlatRangeStage, SimulationStage } from './role-play.jsx';
import { BuildStage, GroomStage } from './jojo-play.jsx';

function RolePortrait({ role }) {
  return role.portrait
    ? <img className="role-portrait" src={role.portrait} alt="" />
    : <span className="game-icon" aria-hidden="true">{role.icon}</span>;
}

function MissionStage({ stage, onPass }) {
  const [tiles, setTiles] = useState([]);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [passed, setPassed] = useState(false);
  const pack = stage.kind === 'pack';

  function put(index) {
    if (!Number.isInteger(index) || index < 0 || index >= stage.tiles.length || passed) return;
    setChecked(false);
    setTiles(current => current.includes(index) || current.length >= stage.answer.length ? current : [...current, index]);
  }

  return <>
    <h2 className="prompt">{stage.before ? '按照线索排好顺序' : stage.prompt}</h2>
    {stage.before && <p className="activity-tip">只使用线索中提到的拼片。{stage.before.map(([first, second]) => `「${first}」在「${second}」之前。`).join(' ')}</p>}
    <p className="activity-tip">{pack ? '点击或拖动物品装箱。' : '点击或拖动拼片，按正确顺序排列。'}再点已放进去的拼片可以取回。</p>
    <div className={'assembly mission-board' + (passed ? ' task-done' : '')}
      aria-label={pack ? '任务箱' : '排序板'}
      onDragOver={event => { if (!passed) event.preventDefault(); }}
      onDrop={event => {
        event.preventDefault();
        const data = event.dataTransfer.getData('text/plain');
        if (data.startsWith('mission:')) put(Number(data.slice(8)));
      }}>
      <span className="mission-board-icon" aria-hidden="true">{pack ? '📦' : '🧭'}</span>
      {stage.answer.map((_, index) => tiles[index] !== undefined
        ? <button type="button" className="piece mounted" key={index} disabled={passed}
            aria-label={`取回 ${stage.tiles[tiles[index]]}`} onClick={() => {
              setTiles(current => current.filter((_, item) => item !== index));
              setChecked(false);
            }}>{stage.tiles[tiles[index]]}</button>
        : <span className="empty-piece" key={index} aria-label={`空位 ${index + 1}`}>{pack ? '+' : index + 1}</span>)}
    </div>
    <div className="piece-bank" aria-label="可用拼片">
      {stage.tiles.map((label, index) => <button type="button" className={`piece ${tiles.includes(index) ? 'used' : ''}`} key={index}
        disabled={passed || tiles.includes(index) || tiles.length >= stage.answer.length} draggable={!passed && !tiles.includes(index)}
        onDragStart={event => event.dataTransfer.setData('text/plain', 'mission:' + index)} onClick={() => put(index)}>{label}</button>)}
    </div>
    {!passed && <div className="mission-stage-actions">
      <button className="listen" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>💡 {showHint ? '收起提示' : '看看提示'}</button>
      <button className="primary" disabled={tiles.length !== stage.answer.length} onClick={() => {
        setChecked(true);
        if (missionStagePassed(stage, tiles.map(index => stage.tiles[index]))) {
          setPassed(true);
          onPass();
        }
      }}>{pack ? '检查任务箱' : '检查顺序'}</button>
    </div>}
    {showHint && <p className="activity-tip">{stage.before ? `先找出哪块拼片没有排在别的拼片后面。` : stage.hint}</p>}
    <p className="feedback" aria-live="polite">{passed ? '这站完成啦！' : checked ? '还有地方要调整，取回拼片再试试。' : ''}</p>
  </>;
}

function hasGradePicker(stage) {
  return stage.kind === 'range' || stage.kind === 'catchItems' || recoveryKinds.has(stage.kind);
}

function MissionPlay({ job, series, role: chosenRole, best, onPosition, onBack, onSave }) {
  const sceneID = useRef(crypto.randomUUID());
  const role = chosenRole.id === 'baby-jojo' && job.stages.some(stage => ['sim', 'groom', 'breakfast'].includes(stage.kind))
    ? series.roles.find(candidate => candidate.id === 'jojo-sister') || chosenRole
    : chosenRole;
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState('zh');
  const [passed, setPassed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState('');
  const last = index === job.stages.length - 1;
  const rawStage = job.stages[index];
  const dossier = useMemo(() => rawStage.dossier && castDossier(rawStage.dossier, series.roles, role),
    [rawStage.dossier, series.roles, role]);
  const stage = dossier ? { ...rawStage, dossier } : rawStage;
  const scene = job.scene || series.scene;
  const Stage = { range: FlatRangeStage, detective: DetectiveStage, sim: SimulationStage, groom: GroomStage, blocks: BuildStage, ...adventureStages }[stage.kind] || MissionStage;

  useEffect(() => {
    onPosition({
      当前游戏: job.title, 当前角色: role.name, 当前动画: series.title, 当前任务历史徽章: best,
      当前站: index + 1, 总站数: job.stages.length, 当前站已完成: passed, 本轮已通关: finished,
    });
    return () => onPosition(null);
  }, [index, passed, finished, job, role.name, series.title, best, onPosition]);

  async function record() {
    if (!job.id) return;
    setStatus('记录中…');
    try {
      await onSave(job.id);
      setStatus('任务已记录');
    } catch {
      setStatus('保存失败');
    }
  }

  function advance() {
    if (last) {
      setFinished(true);
      record();
    } else {
      setIndex(index + 1);
      setPassed(false);
    }
  }

  const ranging = stage.kind === 'range';
  const next = passed && !ranging && <button className="primary" onClick={advance}>
    {last ? '完成任务' : stage.phase === 'investigate' ? '进入推理' : '下一站'}
  </button>;
  const companions = series.roles.filter(candidate => candidate.id !== role.id);
  const companion = companions[index % companions.length];
  const completion = finished ? <div className="scene-completion">
      <p className="result" aria-label="三枚任务徽章">★ ★ ★</p>
      <h2>任务完成，{role.name}！</h2>
      <p role="status">{status}</p>
      {status === '保存失败' && <button className="listen" onClick={record}>重试保存</button>}
      <button className="primary" onClick={onBack}>选下一个任务</button>
    </div> : null;
  const activity = <Stage key={ranging ? 'range-map' : index} station={index} task={job.task} stage={stage}
    theme={series.id} scene={scene} role={role} companion={companion} onPass={() => setPassed(true)} onAdvance={advance}
    grade={job.grade} completion={ranging ? completion : undefined} language={language} onLanguage={setLanguage} />;

  return <section className={`mission-screen screen-${series.id}`} data-ai-scene={`${sceneID.current}:${index}`} aria-label={job.title}>
    <header className="mission-screen-bar">
      <button type="button" className="screen-exit" onClick={onBack}>← 退出</button>
      <div className="screen-title"><strong>{job.title}</strong><small>{hasGradePicker(stage) && `${job.grade ?? 1} 年级 · `}第 {index + 1} / {job.stages.length} 站</small></div>
      <span className="screen-player"><MapPortrait role={role} />{role.name}</span>
    </header>
    {ranging ? <div className="screen-action">{activity}</div> :
      <CharacterMap series={series} stage={stage} role={role} station={index} passed={passed}
        onPass={() => setPassed(true)} nextControl={next} completion={completion}>{activity}</CharacterMap>}
  </section>;
}

export function RoleMissions({ progress, onSave, onPosition }) {
  const [series, setSeries] = useState(null);
  const [job, setJob] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [quizGrade, setQuizGrade] = useState(1);

  if (job) return <MissionPlay job={job} series={series} role={job.role} best={job.id ? progress[job.id] : undefined} onSave={onSave} onPosition={onPosition} onBack={() => setJob(null)} />;

  if (briefing) return <>
    <button className="back" onClick={() => setBriefing(null)}>← 返回任务选择</button>
    <section className="hero mission-hero">
      <div><h1>先选你要扮演的角色</h1><p>{briefing.title}</p></div>
      <img className="series-hero-art" src={series.cover} alt="" />
    </section>
    {hasGradePicker(briefing.stages[0]) && <label className="mission-grade">
      题目年级
      <select value={quizGrade} onChange={event => setQuizGrade(Number(event.target.value))}>
        {shieldGrades.map(grade => <option key={grade} value={grade}>{grade} 年级</option>)}
      </select>
    </label>}
    <div className="mission-cards" aria-label="选择上场角色">
      {series.roles.map(candidate => <button type="button" className={`mission-card role-${candidate.color || series.id}`}
        key={candidate.id} onClick={() => {
          setJob({ ...briefing, ...(hasGradePicker(briefing.stages[0]) && { grade: quizGrade }), role: candidate, scene: candidate.portrait || series.scene, cast: true });
          setBriefing(null);
        }}>
        <RolePortrait role={candidate} />
        <span><strong>{candidate.name}</strong><small>{candidate.skill}</small></span>
      </button>)}
    </div>

  </>;

  if (!series) return <>
    <h1 className="series-heading">动画角色任务</h1>
    <div className="series-gallery" aria-label="选择动画">
      {missionSeries.map(collection => <button type="button" className={`series-tile series-${collection.id}`} key={collection.id} onClick={() => {
        setSeries(collection);
      }}>
        <img src={collection.cover} alt="" />
        <span><strong>{collection.title}</strong><small>{collection.tagline}</small></span>
      </button>)}
    </div>
  </>;

  return <>
    <button className="back" onClick={() => setSeries(null)}>← 返回动画列表</button>
    <section className="hero mission-hero">
      <div><h1>{series.title}</h1><p>{series.tagline}</p></div>
      <img className={`series-hero-art ${series.id}-cover`} src={series.cover} alt="" />
    </section>
    <div className="mission-cards" aria-label="预设任务">
      {presetMissions(series).map(candidate => <button className="mission-card" key={candidate.id} onClick={() => {
        if (series.id !== 'jojo' || hasGradePicker(candidate.stages[0])) setBriefing(candidate);
        else setJob(candidate);
      }}>
        <span className={`game-icon role-${candidate.role.color || series.id}`}>{candidate.icon}</span>
        <span><strong>{candidate.title}</strong>
          <small>{series.id !== 'jojo' || hasGradePicker(candidate.stages[0]) ? '可选上场角色' : '扮演' + candidate.role.name}</small>
          <small>{candidate.intro}</small>
          {progress[candidate.id] === 3 && <small className="mission-completed">✓ 已完成</small>}
        </span>
      </button>)}
    </div>
  </>;
}
