import React, { useEffect, useRef, useState } from 'react';
import { missionSeries, missionStagePassed, presetMissions } from './missions.mjs';
import { DetectiveStage, RangeStage, SimulationStage } from './role-play.jsx';
import { systemDictationHint } from './speech.mjs';

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
    <h2 className="prompt">{stage.prompt}</h2>
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
    {showHint && <p className="activity-tip">{stage.hint}</p>}
    <p className="feedback" aria-live="polite">{passed ? '这站完成啦！' : checked ? '还有地方要调整，取回拼片再试试。' : ''}</p>
  </>;
}

function MissionPlay({ job, series, role, onPosition, onBack, onSave }) {
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState('zh');
  const [passed, setPassed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState('');
  const last = index === job.stages.length - 1;
  const stage = job.stages[index];
  const scene = job.scene || series.scene;
  const Stage = { range: RangeStage, detective: DetectiveStage, sim: SimulationStage }[stage.kind] || MissionStage;

  useEffect(() => {
    onPosition({
      当前学科: '角色任务', 当前游戏: job.title, 当前角色: role.name, 当前动画: series.title,
      当前站: index + 1, 总站数: job.stages.length, 当前站已完成: passed, 本轮已通关: finished,
    });
    return () => onPosition(null);
  }, [index, passed, finished, job, role.name, series.title, onPosition]);

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

  return <>
    <button className="back" onClick={onBack}>← 返回任务选择</button>
    <section className="play interactive-play mission-play">
      <div className="mission-briefing">
        <div>
          <span className={`game-icon role-${role.color || series.id}`}>{job.icon || role.icon}</span>
          <h1>{job.title}</h1>
          <p className="activity-tip">{job.intro}</p>
        </div>
        {(stage.kind !== 'sim' || finished) && <img src={scene} alt="" />}
      </div>
      {finished ? <>
        <p className="result" aria-label="三枚任务徽章">★ ★ ★</p>
        <h2>任务完成，{role.name}！</h2>
        <p className="muted" role="status">{status}</p>
        {status === '保存失败' && <button className="listen" onClick={record}>重试保存</button>}
        <div className="mission-stage-actions"><button className="primary" onClick={onBack}>选下一个任务</button></div>
      </> : <>
        <p className="muted">第 {index + 1} / {job.stages.length} 站</p>
        <Stage key={index} stage={stage} scene={scene} theme={series.id} language={language} onLanguage={setLanguage} onPass={() => setPassed(true)} />
        {passed && <button className="primary" onClick={() => {
          if (last) {
            setFinished(true);
            record();
          } else {
            setIndex(index + 1);
            setPassed(false);
          }
        }}>{last ? '完成任务' : '下一站'}</button>}
      </>}
    </section>
  </>;
}

export function RoleMissions({ grade, settings, progress, onBack, onSave, onPosition, startCustom }) {
  const [series, setSeries] = useState(null);
  const [custom, setCustom] = useState(false);
  const [role, chooseRole] = useState(null);
  const [job, setJob] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [idea, setIdea] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dictating, setDictating] = useState(false);
  const request = useRef(null);
  const ideaInput = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  function cancelGeneration() {
    request.current?.abort();
    request.current = null;
    setLoading(false);
  }

  async function generate(event) {
    event.preventDefault();
    if (!role || !settings || !idea.trim() || request.current) return;
    const pending = new AbortController();
    request.current = pending;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/missions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, grade, role: role.id, idea }),
        signal: pending.signal,
      });
      if (!response.ok) throw new Error((await response.text()).trim());
      const mission = await response.json();
      if (request.current === pending) {
        const playable = { ...mission, role };
        setGenerated(playable);
        setJob(playable);
      }
    } catch (failure) {
      if (request.current === pending) setError(failure.message);
    } finally {
      if (request.current === pending) {
        request.current = null;
        setLoading(false);
      }
    }
  }

  if (job) return <MissionPlay job={job} series={series} role={job.role} onSave={onSave} onPosition={onPosition} onBack={() => setJob(null)} />;

  if (!series) return <>
    <button className="back" onClick={onBack}>← 返回年级学园</button>
    <h1 className="series-heading">{startCustom ? '自定义角色游戏 · 选动画' : '动画角色任务'}</h1>
    <div className="series-gallery" aria-label="选择动画">
      {missionSeries.map(collection => <button type="button" className={`series-tile series-${collection.id}`} key={collection.id} onClick={() => {
        setSeries(collection);
        chooseRole(collection.roles[0]);
        setCustom(startCustom);
      }}>
        <img src={collection.cover} alt="" />
        <span><strong>{collection.title}</strong><small>{collection.tagline}</small></span>
      </button>)}
    </div>
  </>;

  return <>
    <button className="back" onClick={() => {
      if (custom && !startCustom) {
        cancelGeneration();
        setDictating(false);
        setError('');
        setCustom(false);
      } else {
        cancelGeneration();
        setSeries(null);
        setCustom(false);
        setDictating(false);
        setIdea('');
        setError('');
        setGenerated(null);
      }
    }}>{custom && !startCustom ? '← 返回三个预设任务' : '← 返回动画列表'}</button>
    <section className="hero mission-hero">
      <div>
        <h1>{custom ? '自定义任务' : series.title}</h1>
        <p>{custom ? `选一位《${series.title}》的伙伴，说说你想玩什么故事。` : series.tagline}</p>
      </div>
      <img className={`series-hero-art ${series.id}-cover`} src={series.cover} alt="" />
    </section>
    {!custom ? <>
      <div className="mission-cards" aria-label="三个预设任务">
        {presetMissions(grade, series).map(candidate => <button className="mission-card" key={candidate.id} onClick={() => setJob(candidate)}>
          <span className={`game-icon role-${candidate.role.color || series.id}`}>{candidate.icon}</span>
          <span><strong>{candidate.title}</strong><small>扮演{candidate.role.name}</small><small>{candidate.intro}</small>
            {progress[candidate.id] === 3 && <small className="mission-completed">✓ 已完成</small>}
          </span>
        </button>)}
      </div>
      <button className="mission-entry" onClick={() => setCustom(true)}>
        <span aria-hidden="true">✨</span><span><strong>自定义任务</strong><small>口述或打字，让 AI 把你的点子做成游戏</small></span>
        <span className="arrow" aria-hidden="true">›</span>
      </button>
    </> : <>
      <div className="mission-cards" aria-label="选择角色">
        {series.roles.map(candidate => <button type="button" className={`mission-card role-${candidate.color || series.id}`} key={candidate.id}
          aria-pressed={candidate.id === role.id} disabled={loading} onClick={() => chooseRole(candidate)}>
          <span className="game-icon">{candidate.icon}</span>
          <span><strong>{candidate.name}</strong><small>{candidate.skill}</small></span>
        </button>)}
      </div>
      <form className="mission-generator" onSubmit={generate}>
        <label htmlFor="mission-idea">你想让{role.name}去哪里、帮谁做什么？</label>
        <textarea ref={ideaInput} id="mission-idea" maxLength={240} rows={3} value={idea} disabled={loading}
          placeholder={series.example}
          onChange={event => setIdea(event.target.value)} />
        {!settings && <p className="activity-tip">请大人在右侧「模型设置」配置模型。三个预设任务可离线玩。</p>}
        {dictating && <p className="activity-tip">{systemDictationHint()} 说完可以修改文字，然后生成任务。</p>}
        {error && <p className="chat-error" role="alert">{error}</p>}
        <div className="mission-stage-actions">
          <button type="button" className="listen" disabled={loading} onClick={() => {
            setDictating(true);
            ideaInput.current?.focus();
          }}>🎙 系统听写</button>
          <button className="primary" disabled={!settings || !idea.trim() || loading}>
            {loading ? '正在准备任务…' : '生成任务并开始'}
          </button>
          {loading && <button type="button" className="listen" onClick={cancelGeneration}>取消</button>}
        </div>
      </form>
      {generated && <button className="mission-entry" onClick={() => { cancelGeneration(); setJob(generated); }}>
        <span aria-hidden="true">↻</span><span><strong>{generated.title}</strong><small>再玩刚生成的任务 · 扮演{generated.role.name}</small></span>
      </button>}
    </>}
  </>;
}
