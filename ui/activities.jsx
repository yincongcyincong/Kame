import React, { useRef, useState } from 'react';
import { characters, followsStroke } from './strokes.mjs';
import { speak } from './speech.mjs';
import { activityFor } from './mechanics.mjs';
import { Fraction, MathDesk, Pattern, Tiles } from './task-games.jsx';

const trainStops = [['🐱', '猫'], ['🌸', '花'], ['🐟', '鱼']];

function Train({ round, correct, options, completed, onComplete, onInteract }) {
  const [chosen, setChosen] = useState('');
  const [hint, setHint] = useState('');
  const [picture, word] = trainStops[round];

  function load(car) {
    if (!options.includes(car) || completed) return;
    onInteract();
    if (car === correct) {
      speak(word);
      onComplete();
    } else {
      setHint('这节车厢没对上，换一节试试。');
    }
    setChosen('');
  }

  return <>
    <h2 className="prompt">给「{word}」接上拼音车厢</h2>
    <p className="activity-tip">拖动车厢到虚线框，也可以先点车厢，再点虚线框。</p>
    <div className="train-scene">
      <button className="engine" onClick={() => speak(word)} aria-label={`听「${word}」的读音`}>
        <span aria-hidden="true">🚂 {picture}</span><strong>{word}</strong><span aria-hidden="true">🔊</span>
      </button>
      <button className={'train-slot' + (completed ? ' connected' : '')} disabled={completed}
        onClick={() => chosen ? load(chosen) : setHint('先选一节拼音车厢。')}
        onDragOver={event => { if (!completed) event.preventDefault(); }}
        onDrop={event => { event.preventDefault(); load(event.dataTransfer.getData('text/plain')); }}>
        {completed ? correct + ' ✓' : '接在这里'}
      </button>
    </div>
    <div className="train-cars">{options.map(option => <button className="train-car" key={option}
      draggable={!completed} disabled={completed} aria-pressed={chosen === option}
      onDragStart={event => { event.dataTransfer.setData('text/plain', option); setChosen(option); setHint(''); }}
      onClick={() => { setChosen(option); setHint(''); }}>{option}</button>)}</div>
    <p className="feedback" aria-live="polite">{completed ? '车厢接好了，出发！' : hint}</p>
  </>;
}

const produce = [['🍎', '苹果', 5], ['🍓', '草莓', 7], ['🍐', '梨', 6]];

function Market({ round, correct, completed, onComplete, onInteract }) {
  const [basket, setBasket] = useState([]);
  const [hint, setHint] = useState('');
  const [fruit, name, stock] = produce[round];
  const target = Number(correct);

  function toggle(index) {
    onInteract();
    setHint('');
    setBasket(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index]);
  }

  return <>
    <h2 className="prompt">请装 {target} 个{name}进篮子</h2>
    <p className="activity-tip">点一下水果放进去，再点篮子里的水果就能拿出来。</p>
    <div className="fruit-stand">
      {Array.from({ length: stock }, (_, index) => <button className="fruit" key={index} disabled={completed || basket.includes(index)}
        aria-label={`放入第 ${index + 1} 个${name}`} onClick={() => toggle(index)}>
        {basket.includes(index) ? '·' : fruit}
      </button>)}
    </div>
    <div className="basket">
      <strong aria-live="polite">🧺 我的篮子 · {basket.length} 个</strong>
      <div>{basket.map(index => <button className="fruit" key={index} disabled={completed}
        aria-label={`拿出第 ${index + 1} 个${name}`} onClick={() => toggle(index)}>{fruit}</button>)}</div>
    </div>
    {!completed && <button className="primary" onClick={() => {
      onInteract();
      if (basket.length === target) onComplete();
      else setHint(basket.length < target ? '还差一点，再加几个吧。' : '装多啦，从篮子里拿出几个吧。');
    }}>交给小店长</button>}
    <p className="feedback" aria-live="polite">{completed ? '数量刚刚好！' : hint}</p>
  </>;
}

function Trace({ round, completed, onComplete, onInteract }) {
  const [finished, setFinished] = useState(0);
  const [ink, setInk] = useState([]);
  const [hint, setHint] = useState('');
  const active = useRef(null);
  const { label, example, strokes } = characters[round];
  const current = strokes[finished];

  function position(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100];
  }

  function draw(event) {
    const point = position(event);
    const end = active.current.points.at(-1);
    const steps = Math.max(1, Math.ceil(Math.hypot(point[0] - end[0], point[1] - end[1]) / 3));
    for (let step = 1; step <= steps; step++) {
      active.current.points.push(end.map((value, axis) => value + (point[axis] - value) * step / steps));
    }
    setInk([...active.current.points]);
  }

  function cancel() {
    active.current = null;
    setInk([]);
  }

  return <>
    <h2 className="prompt">沿着笔迹写「{label}」</h2>
    <p className="activity-tip">从紫色圆点起笔，沿紫色线写到末端再松手。</p>
    <div className="trace-scene">
      <div className="character-example"><button onClick={() => speak(example)} aria-label={`听「${example}」的读音`}>{example} <small>🔊</small></button>
      <span>找一找「{example}」左边的偏旁。</span></div>
      <svg className="trace-board" viewBox="0 0 100 100" role="img"
        aria-label={completed ? '描红完成' : `描红田字格，第 ${finished + 1} 笔`}
        onPointerDown={event => {
          if (!current || active.current || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          active.current = { pointer: event.pointerId, points: [position(event)] };
          setInk([...active.current.points]);
          setHint('');
          onInteract();
        }}
        onPointerMove={event => { if (active.current?.pointer === event.pointerId) draw(event); }}
        onPointerCancel={event => { if (active.current?.pointer === event.pointerId) cancel(); }}
        onLostPointerCapture={event => { if (active.current?.pointer === event.pointerId) cancel(); }}
        onPointerUp={event => {
          if (active.current?.pointer !== event.pointerId) return;
          draw(event);
          const valid = followsStroke(current, active.current.points);
          cancel();
          if (!valid) {
            setHint('再试一次，从圆点出发，慢慢沿着线写。');
            return;
          }
          setFinished(finished + 1);
          if (finished + 1 === strokes.length) onComplete();
        }}>
        <path d="M50 0V100 M0 50H100 M0 0L100 100 M100 0L0 100" className="trace-grid" />
        {strokes.map((stroke, index) => <polyline key={index} points={stroke.join(' ')}
          className={index < finished ? 'stroke-done' : index === finished ? 'stroke-guide' : 'stroke-waiting'} />)}
        {current && <circle cx={current[0][0]} cy={current[0][1]} r="3.4" className="stroke-start" />}
        <polyline points={ink.join(' ')} className="stroke-ink" />
      </svg>
    </div>
    <p className="feedback" aria-live="polite">{completed ? '写完整啦！' : hint || `第 ${finished + 1} / ${strokes.length} 笔`}</p>
  </>;
}

const activities = { train: Train, market: Market, trace: Trace, pattern: Pattern, fraction: Fraction, math: MathDesk };

export function Activity({ id, subject, correct, distractors, round, ...props }) {
  const mode = activityFor(id, subject, correct);
  const Component = activities[mode] || Tiles;
  const options = [correct, ...distractors];
  const offset = (round + id.length) % options.length;
  return <Component {...props} id={id} subject={subject} round={round} correct={correct}
    distractors={distractors} options={options.slice(offset).concat(options.slice(0, offset))}
    clues={mode === 'clues'} speak={speak} />;
}
