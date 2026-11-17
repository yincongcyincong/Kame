import { createJojoActor, handoffDuration } from './jojo-actor.mjs';
import React, { useEffect, useRef, useState } from 'react';
import { matchingSuspects } from './role-play-data.mjs';
import { Investigation } from './detective-3d.jsx';
import { LanguageSwitch } from './jojo-play.jsx';
import { speak } from './speech.mjs';

export function FlatRangeStage({ stage, theme, onPass }) {
  const [shot, setShot] = useState(null);
  const [hit, setHit] = useState(false);
  const [checked, setChecked] = useState(null);
  const field = useRef(null);

  function fire(answer) {
    if (hit) return;
    const correct = answer === stage.answer;
    setChecked(answer);
    setShot(previous => ({ good: correct, count: (previous?.count || 0) + 1 }));
    if (correct) {
      setHit(true);
      onPass();
    }
  }

  return <div className="range-stage">
    <div ref={field} className={`range-field range-${theme}`} aria-label="第一人称光球靶场"
      onPointerMove={event => {
        if (event.pointerType !== 'mouse') return;
        const bounds = field.current.getBoundingClientRect();
        field.current.style.setProperty('--aim-x', (event.clientX - bounds.left) + 'px');
        field.current.style.setProperty('--aim-y', (event.clientY - bounds.top) + 'px');
      }}>
      <div className="range-hud">
        <p className="range-subject">{stage.subject} · 答题打靶</p>
        <h2 className="prompt" aria-live="polite">{hit ? '命中！继续前进。' : stage.prompt}</h2>
      </div>
      <div className="range-horizon" aria-hidden="true" />
      <div className="range-targets">{stage.targets.map((answer, index) =>
        <button className={`range-target range-target-${index}${checked === answer ? hit ? ' target-hit' : ' target-missed' : ''}`}
          key={answer} disabled={hit} onClick={() => fire(answer)} aria-label={`击中答案 ${answer}`}>
          <span aria-hidden="true" className="target-rings" />
          <span>{answer}</span>
        </button>
      )}</div>
      <span className="range-crosshair" aria-hidden="true">⊕</span>
      <span className="range-launcher" aria-hidden="true"><i /></span>
      {shot && <span key={shot.count} className={'range-pulse ' + (shot.good ? ' pulse-hit' : ' pulse-miss')} aria-hidden="true" />}
    </div>
    <p className="feedback" aria-live="polite">{hit ? '命中正确答案！信标亮了。' : shot ? '这个靶的答案不对，再看一眼题目。' : ''}</p>
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
        <span className="suspect-portrait" aria-hidden="true">{dossier.portraits[index]}</span>
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
        disabled={passed} onClick={() => { setChosen(index); setChecked(false); }}><span className="suspect-portrait" aria-hidden="true">{dossier.portraits[index]}</span>{person}</button>)}
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

const casePhases = { investigate: Investigation, connect: Connect, resolve: Resolve };

export function DetectiveStage({ stage, role, onPass, nextControl }) {
  const Phase = casePhases[stage.phase];
  return <Phase dossier={stage.dossier} role={role} onPass={onPass} nextControl={nextControl} />;
}

export function SimulationStage({ stage, scene, language, onLanguage, onPass }) {
  const [selected, select] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [used, setUsed] = useState(0);
  const [acting, setActing] = useState(false);
  const [fallback, setFallback] = useState(false);
  const canvas = useRef(null);
  const actor = useRef(null);
  const finish = useRef(null);
  const pending = useRef(false);
  const timer = useRef(null);
  const english = language === 'en';
  const completed = used === stage.times;
  const chosen = stage.choices.find(option => option.key === selected);

  useEffect(() => {
    finish.current = () => {
      if (!pending.current) return;
      pending.current = false;
      const count = used + 1;
      setUsed(count);
      setActing(false);
      if (count === stage.times) onPass();
    };
  }, [used, stage.times, onPass]);

  useEffect(() => {
    const node = canvas.current;
    function usePicture(event) {
      event?.preventDefault();
      actor.current?.dispose();
      actor.current = null;
      setFallback(true);
      if (pending.current) timer.current = setTimeout(() => finish.current?.(), handoffDuration);
    }
    try {
      actor.current = createJojoActor(node, () => finish.current?.());
    } catch {
      usePicture();
    }
    node.addEventListener('webglcontextlost', usePicture);
    return () => {
      node.removeEventListener('webglcontextlost', usePicture);
      clearTimeout(timer.current);
      actor.current?.dispose();
      actor.current = null;
    };
  }, []);

  function handOver(key) {
    const item = stage.choices.find(option => option.key === key);
    if (!item || pending.current || completed) return;
    select(key);
    setAttempt(key);
    if (key !== stage.answer) return;
    pending.current = true;
    setActing(true);
    if (actor.current) actor.current.give(key, stage.gesture);
    else timer.current = setTimeout(() => finish.current?.(), handoffDuration);
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
      <canvas ref={canvas} hidden={fallback} className="jojo-actor" aria-label="3D JOJO" />
      {fallback && <img className="sim-character-art" src={scene} alt="JOJO" />}
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
