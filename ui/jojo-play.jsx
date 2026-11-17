import React, { useRef, useState } from 'react';
import { blockShapes, boardHeight, boardWidth, dimensions, inside, landing, meetsGoal, poses, validGesture } from './jojo-mechanics.mjs';
import { speak } from './speech.mjs';

const instructions = {
  comb: { icon: '🪮', zh: '梳头', en: 'Comb the hair', tip: '按住发卷上方，沿发卷往下梳再松开。' },
  brush: { icon: '🪥', zh: '刷牙', en: 'Brush the teeth', tip: '把牙刷放在嘴边，横着轻轻刷过去再松开。' },
  feed: { icon: '🥄', zh: '喂一口', en: 'Give a bite', tip: '从饭盘舀起一勺，按住带到 JOJO 嘴边再松开。' },
  drink: { icon: '🥛', zh: '喝一口', en: 'Give a sip', tip: '按住桌上的水杯，把它送到 JOJO 嘴边。' },
};

function rectStyle([x, y, width, height], [left, top, viewWidth, viewHeight]) {
  return {
    left: (x - left) / viewWidth * 100 + '%', top: (y - top) / viewHeight * 100 + '%',
    width: width / viewWidth * 100 + '%', height: height / viewHeight * 100 + '%',
  };
}

export function LanguageSwitch({ language, onLanguage }) {
  return <div className="sim-switch" aria-label="学习语言">
    <button className="listen" aria-pressed={language === 'zh'} onClick={() => onLanguage('zh')}>中文</button>
    <button className="listen" aria-pressed={language === 'en'} onClick={() => onLanguage('en')}>English</button>
  </div>;
}

export function CareGesture({ action, scene, side, times, language = 'zh', onPass }) {
  const [done, setDone] = useState(0);
  const [toolPosition, setToolPosition] = useState(null);
  const [hint, setHint] = useState('');
  const active = useRef(null);
  const completed = done === times;
  const info = instructions[action];
  const pose = poses[action === 'comb' ? 'hair' : action === 'brush' ? 'teeth' : 'meal'];
  const [left, top, width, height] = pose.camera;
  const zone = [...pose.zone];
  if (action === 'comb' && side !== 'all') {
    if (side === 'right') zone[0] += .032;
    zone[2] -= .032;
  }
  const source = action === 'feed' ? pose.plate : action === 'drink' ? pose.cup : null;

  function location(event) {
    const area = event.currentTarget.getBoundingClientRect();
    return [left + (event.clientX - area.left) / area.width * width,
      top + (event.clientY - area.top) / area.height * height];
  }

  function clearGesture() {
    active.current = null;
    setToolPosition(null);
  }

  function count() {
    if (completed) return;
    setHint('');
    setDone(done + 1);
    if (done + 1 === times) onPass();
  }

  return <>
    <p className="activity-tip">{info.tip}</p>
    <div className={`care-stage care-${action}${completed ? ' care-complete' : ''}`}
      style={{ aspectRatio: 1050 * width + ' / ' + 665 * height }}
      aria-label={info.zh + '互动区'}
      onPointerDown={event => {
        if (completed || active.current || event.button !== 0) return;
        const point = location(event);
        if (!inside(point, source || zone)) {
          setHint(source ? '从亮起的餐具开始。' : '从亮起的区域开始。');
          return;
        }
        if (event.pointerType !== 'mouse') event.currentTarget.setPointerCapture(event.pointerId);
        active.current = { pointer: event.pointerId, points: [point] };
        setHint('');
        setToolPosition(point);
      }}
      onPointerMove={event => {
        if (active.current?.pointer !== event.pointerId) return;
        const point = location(event);
        active.current.points.push(point);
        setToolPosition(point);
      }}
      onPointerUp={event => {
        if (active.current?.pointer !== event.pointerId) return;
        const valid = validGesture(action, [...active.current.points, location(event)], zone, source);
        clearGesture();
        if (valid) count();
        else setHint(source ? '把餐具送到 JOJO 嘴边再松手。' : '从亮起的区域开始，慢慢梳或刷过去。');
      }}
      onPointerLeave={event => { if (event.pointerType === 'mouse' && active.current?.pointer === event.pointerId) clearGesture(); }}
      onPointerCancel={event => { if (active.current?.pointer === event.pointerId) clearGesture(); }}
      onLostPointerCapture={event => { if (active.current?.pointer === event.pointerId) clearGesture(); }}>
      <img src={scene} alt="" draggable={false}
        style={{ left: -left / width * 100 + '%', top: -top / height * 100 + '%', width: 100 / width + '%', height: 100 / height + '%' }} />
      {source && !completed && <span className="care-zone care-source" style={rectStyle(source, pose.camera)} aria-hidden="true" />}
      <span className="care-zone" style={{ ...rectStyle(zone, pose.camera), '--care-gloss': done / times }} aria-hidden="true">
        {completed ? '✨' : source ? '' : action === 'comb' ? '↓' : '↔'}
      </span>
      {toolPosition && <span className="care-tool" style={rectStyle([...toolPosition, 0, 0], pose.camera)} aria-hidden="true">{info.icon}</span>}
      {!toolPosition && done > 0 && <span key={done} className="care-sparkle" style={rectStyle([
        zone[0] + zone[2] * .5, zone[1] + zone[3] * .5, 0, 0,
      ], pose.camera)} aria-hidden="true">{action === 'feed' ? '💛' : action === 'drink' ? '💧' : '✨'}</span>}
    </div>
    <div className="care-controls">
      <span className="care-progress" aria-live="polite">{completed ? 'JOJO 做好了！' : `${done} / ${times}`}</span>
      <button className="listen" onClick={() => speak(language === 'zh' ? info.zh : info.en, language)}>🔊 {language === 'zh' ? info.zh : info.en}</button>
      <button className="listen care-alternative" disabled={completed} onClick={count}>按键操作一次</button>
    </div>
    <p className="feedback care-feedback" role="status">{hint}</p>
  </>;
}

export function GroomStage({ stage, scene, language, onLanguage, onPass }) {
  return <>
    <LanguageSwitch language={language} onLanguage={onLanguage} />
    <h2 className="prompt">{language === 'en' ? 'Help JOJO comb his hair' : stage.prompt}</h2>
    <CareGesture action={stage.action} side={stage.side} scene={scene} times={stage.times} language={language} onPass={onPass} />
  </>;
}

function blockStyle(col, row, width, height) {
  return { left: col / boardWidth * 100 + '%', bottom: row / boardHeight * 100 + '%',
    width: width / boardWidth * 100 + '%', height: height / boardHeight * 100 + '%' };
}

export function BuildStage({ stage, onPass }) {
  const [blocks, setBlocks] = useState([]);
  const [selected, setSelected] = useState(0);
  const [rotated, setRotated] = useState(false);
  const [column, setColumn] = useState(2);
  const [hint, setHint] = useState('');
  const [passed, setPassed] = useState(false);
  const pointer = useRef(null);
  const available = stage.supply.map((_, index) => index).filter(index => !blocks.some(block => block.piece === index));
  const type = stage.supply[selected];
  const shape = type ? dimensions(type, rotated) : null;
  const clamped = shape ? Math.min(column, boardWidth - shape.width) : 0;
  const row = shape ? landing(blocks, clamped, shape.width, shape.height) : null;

  function choose(index) {
    if (!available.includes(index) || passed) return;
    setSelected(index);
    setRotated(false);
    setHint('');
  }

  function drop(index, col, turn) {
    if (!available.includes(index) || passed) return;
    const type = stage.supply[index];
    const size = dimensions(type, turn);
    const safeCol = Math.max(0, Math.min(col, boardWidth - size.width));
    const row = landing(blocks, safeCol, size.width, size.height);
    if (row === null) {
      setHint('这块积木放不稳。换个位置，或转一下。');
      return;
    }
    const next = [...blocks, { piece: index, type, col: safeCol, row, ...size }];
    setBlocks(next);
    setSelected(available.find(piece => piece !== index) ?? null);
    setRotated(false);
    setHint('');
    if (meetsGoal(next, stage.goal)) {
      setPassed(true);
      onPass();
    }
  }

  function fromPointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    return Math.max(0, Math.min(boardWidth - 1, Math.floor(x * boardWidth)));
  }

  function rotate() {
    if (!shape || passed) return;
    setRotated(!rotated);
    setHint('');
  }

  return <>
    <h2 className="prompt">{stage.prompt}</h2>
    <p className="activity-tip">选积木后在台面上移动放下。也可以转动积木，再找能放稳的位置。</p>
    <div className="block-yard" tabIndex={0} aria-label="积木台。左右键移动，R 键旋转，空格放下。"
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          const delta = event.key === 'ArrowLeft' ? -1 : 1;
          setColumn(Math.max(0, Math.min(boardWidth - (shape?.width || 1), clamped + delta)));
        } else if (event.key.toLowerCase() === 'r') {
          rotate();
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          drop(selected, clamped, rotated);
        }
      }}
      onPointerDown={event => {
        if (!shape || passed || event.button !== 0 || pointer.current !== null) return;
        if (event.pointerType !== 'mouse') event.currentTarget.setPointerCapture(event.pointerId);
        pointer.current = event.pointerId;
        setColumn(fromPointer(event));
      }}
      onPointerMove={event => {
        if (pointer.current === event.pointerId || event.pointerType === 'mouse') setColumn(fromPointer(event));
      }}
      onPointerUp={event => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        drop(selected, fromPointer(event), rotated);
      }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') pointer.current = null; }}
      onPointerCancel={() => { pointer.current = null; }}
      onLostPointerCapture={() => { pointer.current = null; }}>
      {blocks.map(block => <span key={block.piece} aria-hidden="true"
        className={`wood-block wood-${blockShapes[block.type].color} wood-placed`}
        style={blockStyle(block.col, block.row, block.width, block.height)} />)}
      {shape && !passed && <span className={`wood-block wood-guide${row === null ? ' wood-unstable' : ''}`} aria-hidden="true"
        style={blockStyle(clamped, row ?? 0, shape.width, shape.height)} />}
    </div>
    <div className="piece-bank block-tools" aria-label="积木架">
      {stage.supply.map((item, index) => <button className="piece" key={index} disabled={!available.includes(index) || passed}
        aria-pressed={selected === index} onClick={() => choose(index)}>
        <span className={`block-swatch wood-${blockShapes[item].color}`} aria-hidden="true" />
        {blockShapes[item].label}
      </button>)}
    </div>
    <div className="mission-stage-actions">
      <button className="listen" disabled={!shape || passed} onClick={rotate}>转一转 ↻</button>
      <button className="listen" disabled={!blocks.length || passed} onClick={() => {
        setSelected(blocks.at(-1).piece);
        setRotated(false);
        setBlocks(blocks.slice(0, -1));
        setHint('');
      }}>拿回上一块</button>
    </div>
    <p className="feedback" aria-live="polite">{passed ? '搭好啦！这次很稳。' : hint || `已经放好 ${blocks.length} 块积木`}</p>
  </>;
}
