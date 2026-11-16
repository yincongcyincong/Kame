import React, { useRef, useState } from 'react';
import { matchingSuspects } from './role-play-data.mjs';
import { speak } from './speech.mjs';

export function RangeStage({ stage, theme, onPass }) {
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
    <p className="range-subject">{stage.subject} · 答题打靶</p>
    <h2 className="prompt">{stage.prompt}</h2>
    <p className="activity-tip">瞄准正确的答案靶，点击或轻触发射光球。键盘也可以选靶后按回车。</p>
    <div ref={field} className={`range-field range-${theme}`} aria-label="第一人称光球靶场"
      onPointerMove={event => {
        if (event.pointerType !== 'mouse') return;
        const bounds = field.current.getBoundingClientRect();
        field.current.style.setProperty('--aim-x', (event.clientX - bounds.left) + 'px');
        field.current.style.setProperty('--aim-y', (event.clientY - bounds.top) + 'px');
      }}>
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

function Investigate({ dossier, onPass }) {
  const [found, setFound] = useState([]);
  const complete = found.length === dossier.clues.length;
  return <>
    <h2 className="prompt">到现场找线索</h2>
    <p className="activity-tip">点击地图上的三个地点，翻开看到的证据。</p>
    <div className="case-scene" aria-label="调查地点">
      {dossier.clues.map(({ icon, spot, text }, index) => <div className="case-spot" key={spot}>
        <button aria-expanded={found.includes(index)} onClick={() => {
          setFound(current => current.includes(index) ? current : [...current, index]);
        }}><span aria-hidden="true">{icon}</span>{spot}</button>
        {found.includes(index) && <p>{text}</p>}
      </div>)}
    </div>
    <p className="feedback" aria-live="polite">已找到 {found.length} / {dossier.clues.length} 条线索</p>
    <button className="primary" disabled={!complete} onClick={onPass}>带回调查板</button>
  </>;
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
        disabled={passed} onClick={() => { setChosen(index); setChecked(false); }}>{person}</button>)}
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

const casePhases = { investigate: Investigate, connect: Connect, resolve: Resolve };

export function DetectiveStage({ stage, onPass }) {
  const Phase = casePhases[stage.phase];
  return <Phase dossier={stage.dossier} onPass={onPass} />;
}

export function SimulationStage({ stage, scene, language, onLanguage, onPass }) {
  const [selected, setSelected] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [used, setUsed] = useState(0);
  const english = language === 'en';
  const completed = used === stage.times;
  const action = english ? stage.actionEn : stage.actionZh;
  const chosen = stage.choices.find(option => option.key === selected);

  function choose(key, useNow = false) {
    const tool = stage.choices.find(option => option.key === key);
    if (!tool || completed) return;
    setAttempt(key);
    setSelected(key === stage.answer ? key : null);
    if (key !== stage.answer) return;
    if (useNow) perform();
  }

  function perform() {
    if (completed) return;
    const count = used + 1;
    setUsed(count);
    if (count === stage.times) onPass();
  }

  return <>
    <div className="sim-switch" aria-label="学习语言">
      <button className="listen" aria-pressed={!english} onClick={() => onLanguage('zh')}>中文</button>
      <button className="listen" aria-pressed={english} onClick={() => onLanguage('en')}>English</button>
    </div>
    <h2 className="prompt">{english ? stage.en : stage.zh}</h2>
    <p className="activity-tip">{english ? 'Choose a tool, then tap the scene to use it.' : '先选工具，再点场景操作。也可以直接把工具拖进场景。'}</p>
    <div className="sim-room"
      onDragOver={event => { if (!completed) event.preventDefault(); }}
      onDrop={event => {
        event.preventDefault();
        const data = event.dataTransfer.getData('text/plain');
        if (data.startsWith('sim:')) choose(data.slice(4), true);
      }}>
      <img className="sim-character-art" src={scene} alt="" />
      <button className="sim-action" disabled={!chosen || completed} onClick={perform}>
        <span aria-hidden="true">{used > 0 ? stage.effect : chosen?.icon || '✨'}</span>
        {action}
      </button>
      <span className="sim-gauge" aria-live="polite">{used} / {stage.times}</span>
    </div>
    <div className="piece-bank sim-tools" aria-label="可用工具">
      {stage.choices.map(tool => <button className="piece" disabled={completed} key={tool.key} aria-pressed={selected === tool.key}
        draggable={!completed} onDragStart={event => event.dataTransfer.setData('text/plain', 'sim:' + tool.key)}
        onClick={() => choose(tool.key)}>
        <span aria-hidden="true">{tool.icon}</span>{english ? tool.en : tool.zh}
      </button>)}
    </div>
    {chosen && <div className="sim-word">
      <strong lang="zh">{chosen.zh}</strong><span lang="en">{chosen.en}</span>
      <button className="listen" onClick={() => speak(english ? chosen.en : chosen.zh, language)}>🔊 听词</button>
    </div>}
    <p className="feedback" aria-live="polite">{completed ? english ? 'Well done!' : '做得好，JOJO 很开心！'
      : attempt && attempt !== stage.answer ? english ? 'Try a different tool.' : '这个工具不合适，再试试。' : ''}</p>
  </>;
}
