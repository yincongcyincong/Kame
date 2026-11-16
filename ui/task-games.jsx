import React, { useState } from 'react';
import { mathAnswer, mathKeys, patterns, sameMathAnswer, tileBoard } from './mechanics.mjs';

function TaskFeedback({ completed, success, hint }) {
  return <p className="feedback task-feedback" aria-live="polite">{completed ? success : hint}</p>;
}

export function Tiles({ subject, prompt, correct, distractors, round, id, completed, onInteract, onComplete, clues, speak }) {
  const [placed, setPlaced] = useState([]);
  const [hint, setHint] = useState('');
  const [revealed, setRevealed] = useState([]);
  const seed = Array.from(id).reduce((value, letter) => value * 31 + letter.charCodeAt(0), round + 1);
  const { target, bank } = tileBoard(correct, distractors, subject, seed);
  const byId = new Map(bank.map(piece => [piece.id, piece]));
  const fragments = clues ? (prompt.match(/[^。？！.!?]+[。？！.!?]?/gu) || [prompt]).map(line => line.trim()) : [];
  const story = fragments.slice(0, -1);
  const question = fragments.at(-1) || prompt;
  const english = subject === '英语';
  const showClues = story.length > 0;
  const ready = revealed.length === story.length;

  function place(id) {
    if (!byId.has(id) || completed || !ready) return;
    onInteract();
    setHint('');
    setPlaced(current => current.includes(id) || current.length >= target.length ? current : [...current, id]);
  }

  return <>
    <h2 className="prompt">{question}</h2>
    {showClues && <div className="clue-board" aria-label="故事线索">
      {story.map((line, index) => <button type="button" className="clue" key={index}
        aria-expanded={revealed.includes(index)} onClick={() => {
          onInteract();
          setRevealed(current => current.includes(index) ? current : [...current, index]);
        }}>
        {revealed.includes(index) ? line : `🔎 打开线索 ${index + 1}`}
      </button>)}
    </div>}
    <p className="activity-tip">{ready
      ? '按顺序点选或拖入拼块。点一下已放入的拼块，就能把它取回。'
      : '先把故事线索翻开，再拼出你的答案。'}</p>
    <div className={'assembly ' + (completed ? 'task-done' : '')} aria-label="拼装区"
      onDragOver={event => { if (!completed && ready) event.preventDefault(); }}
      onDrop={event => {
        event.preventDefault();
        const data = event.dataTransfer.getData('text/plain');
        if (data.startsWith('piece:')) place(Number(data.slice(6)));
      }}>
      {target.map((_, index) => {
        const piece = byId.get(placed[index]);
        return piece
          ? <button type="button" className="piece mounted" key={index} disabled={completed}
              aria-label={`取回 ${piece.text}`} onClick={() => {
                setHint('');
                setPlaced(current => current.filter(item => item !== piece.id));
              }}>{piece.text}</button>
          : <span key={index} className="empty-piece" aria-label={`第 ${index + 1} 个空位`}>{index + 1}</span>;
      })}
    </div>
    <div className="piece-bank" aria-label="拼块库">
      {bank.map(piece => {
        const used = placed.includes(piece.id);
        return <button type="button" key={piece.id} className={'piece' + (used ? ' used' : '')} disabled={used || !ready || completed}
          draggable={ready && !used && !completed} onDragStart={event => event.dataTransfer.setData('text/plain', 'piece:' + piece.id)}
          onClick={() => place(piece.id)}>{piece.text}</button>;
      })}
    </div>
    {!completed && <button className="primary" disabled={placed.length !== target.length} onClick={() => {
      if (placed.every((piece, index) => byId.get(piece).text === target[index])) {
        if (english) speak(correct, 'en');
        onComplete();
      } else {
        setHint('有拼块放错了。拿回几块，换个顺序试试。');
      }
    }}>检查拼图</button>}
    {completed && english && <button className="listen" onClick={() => speak(correct, 'en')}>🔊 听一遍</button>}
    <TaskFeedback completed={completed} success={`拼好了！${correct}`} hint={hint} />
  </>;
}

function Counters({ prompt }) {
  const [marked, setMarked] = useState([]);
  const equation = /^(\d+)\s*([+−×])\s*(\d+)\s*=/.exec(prompt);
  if (!equation) return null;
  const [, a, operator, b] = equation;
  const left = Number(a);
  const right = Number(b);
  const size = operator === '×' ? left * right : operator === '+' ? left + right : left;
  if (size > 48) return null;
  const accessibleLabel = operator === '−' ? '划掉小圆片' : '标记小圆片';
  const rowSize = operator === '×' ? right : size;
  return <details className="counter-tool">
    <summary>打开圆片工作台</summary>
    <p>{operator === '−' ? `试着划掉 ${right} 个圆片，看看还剩几个。` : '点亮圆片，帮自己数一数。'}</p>
    {Array.from({ length: size / rowSize }, (_, row) => <div className="counter-row" key={row}>
      {Array.from({ length: rowSize }, (_, column) => {
        const index = row * rowSize + column;
        return <button type="button" className={operator === '+' && index >= left ? 'counter second' : 'counter'} key={index}
          aria-label={`${accessibleLabel} ${index + 1}`} aria-pressed={marked.includes(index)}
          onClick={() => setMarked(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index])} />;
      })}
    </div>)}
  </details>;
}

export function MathDesk({ prompt, correct, completed, onInteract, onComplete }) {
  const { value, unit } = mathAnswer(correct);
  const [input, setInput] = useState('');
  const [hint, setHint] = useState('');
  const operations = ['/', ':', '×', 'π', '%', '°'];
  const keys = [...mathKeys, ...operations.filter(symbol => value.includes(symbol))];
  function edit(text) {
    onInteract();
    setHint('');
    setInput(text.slice(0, 18));
  }
  return <form onSubmit={event => {
    event.preventDefault();
    if (completed || !input.trim()) return;
    if (sameMathAnswer(input, value)) onComplete();
    else setHint('再核对一下，改好就可以重新提交。');
  }}>
    <h2 className="prompt">{prompt}</h2>
    <p className="activity-tip">用屏幕上的数字键或键盘填写结果。</p>
    <Counters prompt={prompt} />
    <div className={'math-display' + (completed ? ' task-done' : '')}>
      <input aria-label="计算结果" placeholder="?" inputMode="none" value={input} readOnly={completed}
        onChange={event => edit(event.target.value)} />
      {unit && <span>{unit}</span>}
    </div>
    <div className="math-keys" aria-label="计算数字键">
      {keys.map(key => <button type="button" className="piece" key={key} disabled={completed}
        aria-label={key === '⌫' ? '删除一位' : key} onClick={() => edit(key === '⌫' ? input.slice(0, -1) : input + key)}>{key}</button>)}
    </div>
    {!completed && <button className="primary" disabled={!input.trim()}>提交结果</button>}
    <TaskFeedback completed={completed} success="计算正确！" hint={hint} />
  </form>;
}

export function Pattern({ round, completed, onInteract, onComplete }) {
  const { given, target, bank } = patterns[round];
  const [cars, setCars] = useState([]);
  const [hint, setHint] = useState('');
  return <>
    <h2 className="prompt">让图形列车再接三节</h2>
    <p className="activity-tip">看看前面的图形怎样重复，点下方的车厢接上。点已接上的车厢可以拆下。</p>
    <div className="pattern-track" aria-label="车厢排列">
      {given.map((shape, index) => <span className="piece given-car" key={index}>{shape}</span>)}
      {target.map((_, index) => cars[index]
        ? <button className="piece mounted" disabled={completed} key={'car' + index}
            onClick={() => { setHint(''); setCars(current => current.filter((_, item) => item !== index)); }}>{cars[index]}</button>
        : <span className="empty-piece" key={'car' + index}>?</span>)}
    </div>
    <div className="piece-bank">{bank.map(shape => <button className="piece" key={shape} disabled={completed || cars.length === target.length}
      onClick={() => { onInteract(); setHint(''); setCars(current => [...current, shape]); }}>{shape}</button>)}</div>
    {!completed && <button className="primary" disabled={cars.length !== target.length} onClick={() => {
      if (cars.every((shape, index) => shape === target[index])) onComplete();
      else setHint('观察前面重复的图案，拆下接错的车厢再试试。');
    }}>试着发车</button>}
    <TaskFeedback completed={completed} success="规律接对了，列车出发！" hint={hint} />
  </>;
}

export function Fraction({ round, prompt, correct, completed, onInteract, onComplete }) {
  const [denominator, setDenominator] = useState(2);
  const [shaded, setShaded] = useState([]);
  const [hint, setHint] = useState('');
  return <>
    <h2 className="prompt">{round === 1 ? '把披萨分成四份，涂出 1/2' : prompt}</h2>
    <p className="activity-tip">{round === 1 ? '先把披萨等分成四份，再点格子涂色。' : '按题目中的分母等分披萨，再点格子涂色。'}</p>
    <div className="fraction-slicer">
      <button type="button" className="piece" aria-label="减少份数" disabled={completed || denominator <= 2}
        onClick={() => { onInteract(); setDenominator(denominator - 1); setShaded([]); setHint(''); }}>−</button>
      <strong aria-live="polite">等分成 {denominator} 份</strong>
      <button type="button" className="piece" aria-label="增加份数" disabled={completed || denominator >= 10}
        onClick={() => { onInteract(); setDenominator(denominator + 1); setShaded([]); setHint(''); }}>＋</button>
    </div>
    <div className="pizza-strip" style={{ gridTemplateColumns: `repeat(${denominator}, 1fr)` }}>
      {Array.from({ length: denominator }, (_, index) => <button type="button" key={index} disabled={completed}
        aria-label={`第 ${index + 1} 份披萨`} aria-pressed={shaded.includes(index)} onClick={() => {
          onInteract(); setHint('');
          setShaded(current => current.includes(index) ? current.filter(piece => piece !== index) : [...current, index]);
        }}>{shaded.includes(index) ? '✓' : ''}</button>)}
    </div>
    <p aria-live="polite">涂了 {shaded.length} 份 / 共 {denominator} 份</p>
    {!completed && <button className="primary" onClick={() => {
      onInteract();
      if (`${shaded.length}/${denominator}` === correct) onComplete();
      else setHint('先看看要等分成几份，再检查要涂几份。');
    }}>端上披萨</button>}
    <TaskFeedback completed={completed} success={`这一盘是 ${correct}！`} hint={hint} />
  </>;
}
