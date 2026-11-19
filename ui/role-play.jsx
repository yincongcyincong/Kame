import React, { useEffect, useRef, useState } from 'react';
import { matchingSuspects } from './role-play-data.mjs';
import { LanguageSwitch } from './jojo-play.jsx';
import { speak } from './speech.mjs';
import { fireOrb, mapCheckpoints, patrolPosition, recoverDuel, startDuel, stepDuel } from './range-map.mjs';
import { rangeOpponents } from './range-opponents.mjs';
import { dealShieldQuestions } from './shield-questions.mjs';
import { useMapControls } from './map-controls.jsx';

export function FlatRangeStage({ theme, role, scene, grade = 1, station = 0, onPass, onAdvance, completion }) {
  const [duel, setDuel] = useState(() => startDuel(station));
  const fight = duel.station === station ? duel : startDuel(station);
  const { position, fieldProps, movement } = useMapControls(fight.status === 'playing');
  const [wrong, setWrong] = useState(false);
  const [questionDeck, setQuestionDeck] = useState(() => dealShieldQuestions(grade));
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = questionDeck[questionIndex];
  const player = useRef(position);
  const advance = useRef(onAdvance);
  const pass = useRef(onPass);
  player.current = position;
  advance.current = onAdvance;
  pass.current = onPass;
  const opponents = rangeOpponents[theme] || rangeOpponents.wings;
  const challenger = opponents[station];
  const target = patrolPosition(mapCheckpoints[station], fight.time, station);
  const playing = fight.status === 'playing';
  const hit = fight.status === 'won';

  useEffect(() => {
    if (!playing) return;
    let frame;
    let last = performance.now();
    function tick(now) {
      const elapsed = (now - last) / 1000;
      last = now;
      const current = player.current;
      const volleyRoll = Math.random();
      setDuel(previous => stepDuel(previous.station === station ? previous : startDuel(station), current, elapsed, volleyRoll));
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, station]);

  useEffect(() => {
    if (!hit) return;
    pass.current();
    const timer = setTimeout(() => advance.current?.(), 850);
    return () => clearTimeout(timer);
  }, [hit]);

  function fire(aim) {
    if (!playing) return;
    setDuel(previous => fireOrb(previous.station === station ? previous : startDuel(station), position, aim));
  }

  function answer(value) {
    if (value !== question.answer) { setWrong(true); return; }
    if (questionIndex + 1 === questionDeck.length) {
      setQuestionDeck(dealShieldQuestions(grade, Math.random, question.prompt));
      setQuestionIndex(0);
    } else {
      setQuestionIndex(questionIndex + 1);
    }
    setWrong(false);
    setDuel(recoverDuel);
  }

  return <div className={`range-stage map-range map-${theme}`}>
    <div {...fieldProps} className="range-map" aria-label="俯视任务地图，使用方向键或 WASD 移动，空格发射光球"
      onKeyDown={event => {
        fieldProps.onKeyDown(event);
        if (event.code !== 'Space' || event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!event.repeat) fire(target);
      }}
      onPointerDown={event => {
        if (event.button !== 0 || event.target !== event.currentTarget || !playing) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        fire({ x: 100 * (event.clientX - bounds.left) / bounds.width, y: 100 * (event.clientY - bounds.top) / bounds.height });
      }}>
      <span className="range-map-base">{theme === 'cosmic' ? '救援基地' : '世界机场'}</span>
      <div className="range-map-banner" role="status">
        {hit ? '击败' + challenger.name + '！' : !playing ? '你被击中了，答题恢复护盾' :
          fight.warning ? challenger.name + '准备反击！快躲开' : '移动躲避，点击地图或按空格发射光球'}
      </div>
      {!hit && <div className={`range-map-enemy current${fight.warning ? ' charging' : ''}`}
        style={{ left: target.x + '%', top: target.y + '%' }}>
        <span className="range-map-opponent" data-opponent={challenger.id}><img src={challenger.portrait} alt="" /></span>
        <small>{challenger.name}</small>
      </div>}
      {fight.warning && <i className="range-map-warning" style={{ left: fight.warning.x + '%', top: fight.warning.y + '%' }} aria-hidden="true" />}
      <div className="range-map-actor" style={{ left: position.x + '%', top: position.y + '%' }}>
        <img src={role?.portrait || scene || '/art/wings-cover.jpg'} alt={role?.name || ''} data-role={role?.id} />
      </div>
      {fight.shots.map((shot, index) => <i key={index} className={`duel-orb${shot.hostile ? ' hostile' : ''}`}
        style={{ left: shot.x + '%', top: shot.y + '%' }} aria-hidden="true" />)}
      {hit && <span className="range-map-pop" style={{ left: target.x + '%', top: target.y + '%' }} aria-hidden="true">✦ · ✦</span>}
      <button type="button" className="primary range-map-fire" disabled={!playing} onClick={() => fire(target)}>发射光球</button>
      {movement}
    </div>
    <section className="range-map-question scene-interaction" aria-label="护盾状态">
      {completion || (fight.status === 'question' ? <>
        <strong>{question.subject} · {question.prompt}</strong>
        <div>
          {question.options.map(value => <button className="piece" key={value} onClick={() => answer(value)}>{value}</button>)}
        </div>
        {wrong && <small role="status">再想想，答对就能恢复护盾。</small>}
      </> : <p className="scene-interaction-idle">{hit ? '已击败对手，正在解锁下一处挑战。' : '护盾正常'}</p>)}
    </section>
  </div>;
}

function Connect({ dossier, onPass }) {
  const [applied, setApplied] = useState([]);
  const [done, setDone] = useState(false);
  const candidates = matchingSuspects(dossier, applied);
  return <>
    <h2 className="prompt">把证据连起来</h2>
    <p className="activity-tip">逐张启用线索卡。看看哪些角色同时符合所有线索。</p>
    <div className="case-clues">
      {dossier.clues.map(({ spot, text }, index) => {
        const selected = applied.includes(index);
        return <button key={spot} aria-pressed={selected} disabled={done} onClick={() => {
          setApplied(current => selected ? current.filter(clue => clue !== index) : [...current, index]);
        }}><strong>{selected ? '✓ ' : ''}{spot}</strong><small>{text}</small></button>;
      })}
    </div>
    <div className="case-people" aria-label="线索比对结果">
      {dossier.suspects.map((name, index) => <span className={candidates.includes(index) ? 'candidate' : 'eliminated'} key={name}>
        <img className="suspect-portrait" src={dossier.portraitSources[index]} alt="" />
        {name}<small>{candidates.includes(index) ? '目前符合' : '已排除'}</small>
      </span>)}
    </div>
    <p className="feedback" aria-live="polite">剩下 {candidates.length} 位符合已启用的线索</p>
    <button className="primary" disabled={done || applied.length !== dossier.clues.length || candidates.length !== 1} onClick={() => {
      setDone(true);
      onPass();
    }}>整理推理结果</button>
  </>;
}

function Resolve({ dossier, onPass }) {
  const [chosen, setChosen] = useState(null);
  const [checked, setChecked] = useState(false);
  const [passed, setPassed] = useState(false);
  const facts = dossier.clues.map((_, index) => index);
  const [answer] = matchingSuspects(dossier, facts);
  return <>
    <h2 className="prompt">谁和全部线索都对得上？</h2>
    <details className="case-notes"><summary>翻看侦探笔记</summary>
      <ul>{dossier.clues.map(({ text }) => <li key={text}>{text}</li>)}</ul>
    </details>
    <div className="case-people">
      {dossier.suspects.map((person, index) => <button className="candidate" key={person} aria-pressed={chosen === index}
        disabled={passed} onClick={() => { setChosen(index); setChecked(false); }}><img className="suspect-portrait" src={dossier.portraitSources[index]} alt="" />{person}</button>)}
    </div>
    {!passed && <button className="primary" disabled={chosen === null} onClick={() => {
      setChecked(true);
      if (chosen === answer) {
        setPassed(true);
        onPass();
      }
    }}>确认我的推理</button>}
    <p className="feedback" aria-live="polite">{passed ? dossier.reveal : checked ? '有一条线索和这位角色对不上。再翻翻笔记。' : ''}</p>
  </>;
}

const casePhases = { connect: Connect, resolve: Resolve };

export function DetectiveStage({ stage, role, onPass }) {
  const Phase = casePhases[stage.phase];
  return <Phase dossier={stage.dossier} role={role} onPass={onPass} />;
}

export function SimulationStage({ stage, scene, language, onLanguage, onPass }) {
  const [selected, select] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [used, setUsed] = useState(0);
  const [acting, setActing] = useState(false);
  const [phase, setPhase] = useState('idle');
  const timer = useRef(null);
  const pending = useRef(false);
  const english = language === 'en';
  const completed = used === stage.times;
  const chosen = stage.choices.find(option => option.key === selected);
  const bathroom = stage.answer === 'toothbrush' || stage.answer === 'toothpaste';

  useEffect(() => () => clearTimeout(timer.current), []);

  function handOver(key) {
    const item = stage.choices.find(option => option.key === key);
    if (!item || pending.current || completed) return;
    select(key);
    setAttempt(key);
    if (key !== stage.answer) return;
    pending.current = true;
    setActing(true);
    setPhase('receive');
    timer.current = setTimeout(() => {
      setPhase('perform');
      timer.current = setTimeout(() => {
        pending.current = false;
        setActing(false);
        setPhase('done');
        const count = used + 1;
        setUsed(count);
        if (count === stage.times) onPass();
      }, 950);
    }, 450);
  }

  return <>
    <LanguageSwitch language={language} onLanguage={onLanguage} />
    <h2 className="prompt">{english ? stage.en : stage.zh}</h2>
    <p className="activity-tip">{english ? 'Drag a tool to JOJO, or select it and tap JOJO.' : '把工具拖给 JOJO，或先选工具、再点 JOJO。'}</p>
    <div className="jojo-handoff" onDragOver={event => { if (!acting && !completed) event.preventDefault(); }}
      onDrop={event => {
        event.preventDefault();
        const data = event.dataTransfer.getData('text/plain');
        if (data.startsWith('sim:')) handOver(data.slice(4));
      }}>
      <div className={`flat-jojo flat-jojo-${phase} flat-jojo-${stage.gesture}${bathroom ? ' flat-jojo-bath' : ''}`}>
        <img src={scene} alt="动画中的 JOJO" />
        {(acting || (phase === 'done' && stage.gesture.startsWith('set-'))) &&
          <span className="flat-jojo-prop" aria-hidden="true">{chosen?.icon}</span>}
        {phase === 'perform' && stage.gesture === 'brush' && <span className="flat-jojo-effect" aria-hidden="true">🫧</span>}
        {phase === 'perform' && stage.gesture === 'toothpaste' && <span className="flat-jojo-effect" aria-hidden="true">🪥</span>}
      </div>
      <button className="jojo-receive" disabled={!chosen || acting || completed} onClick={() => handOver(chosen.key)}>
        {acting ? 'JOJO 接过来啦' : completed ? '完成啦' : english ? 'Give it to JOJO' : '递给 JOJO'}
      </button>
      <span className="sim-gauge" aria-live="polite">{used} / {stage.times}</span>
    </div>
    <div className="piece-bank sim-tools" aria-label="可用工具">
      {stage.choices.map(tool => <button className="piece" disabled={acting || completed} key={tool.key} aria-pressed={selected === tool.key}
        draggable={!acting && !completed} onDragStart={event => event.dataTransfer.setData('text/plain', 'sim:' + tool.key)}
        onClick={() => { select(tool.key); setAttempt(null); }}>
        <span aria-hidden="true">{tool.icon}</span>{english ? tool.en : tool.zh}
      </button>)}
    </div>
    {chosen && <div className="sim-word">
      <strong lang="zh">{chosen.zh}</strong><span lang="en">{chosen.en}</span>
      <button className="listen" onClick={() => speak(english ? chosen.en : chosen.zh, language)}>🔊 听词</button>
    </div>}
    <p className="feedback" aria-live="polite">{completed ? (english ? 'Well done!' : '做得好，JOJO 很开心！')
      : acting ? (english ? stage.actionEn : stage.actionZh)
        : attempt && attempt !== stage.answer ? (english ? 'Try a different tool.' : '这个工具不合适，再试试。') : ''}</p>
  </>;
}
