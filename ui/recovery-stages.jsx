import React, { useEffect, useRef, useState } from 'react';
import { MapPortrait } from './character-map.jsx';
import { dealShieldQuestions } from './shield-questions.mjs';
import { balanceWeight, beatResult, fruitWeights, makePipeGrid, relayInRange, tracePipe } from './recovery-games.mjs';

function useRecovery(grade) {
  const [deck, setDeck] = useState(() => dealShieldQuestions(grade));
  const [index, setIndex] = useState(0);
  const [failure, setFailure] = useState('');
  const [wrong, setWrong] = useState(false);
  const question = deck[index];
  return {
    fail: setFailure,
    locked: Boolean(failure),
    quiz: failure && <section className="catch-quiz recovery-quiz" aria-label="恢复挑战题">
      <p role="status">{failure}</p>
      <strong>{question.subject} · {question.prompt}</strong>
      <div className="adventure-buttons">
        {question.options.map(option => <button key={option} className="piece" onClick={() => {
          if (option !== question.answer) { setWrong(true); return; }
          setWrong(false);
          if (index + 1 === deck.length) {
            setDeck(dealShieldQuestions(grade, Math.random, question.prompt));
            setIndex(0);
          } else setIndex(index + 1);
          setFailure('');
        }}>{option}</button>)}
      </div>
      {wrong && <p role="status">再想想，答对后从这里继续。</p>}
    </section>,
  };
}

function Cast({ role }) {
  return <span className="activity-partner recovery-cast"><MapPortrait role={role} />{role.name}</span>;
}

function FlightRelay({ stage, role, companion, active, grade, onPass }) {
  const [gap, setGap] = useState(stage.gap);
  const [flying, setFlying] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const steering = useRef(null);
  const field = useRef(null);
  const { fail, locked, quiz } = useRecovery(grade);

  useEffect(() => {
    if (!active || !flying || locked || delivered) return;
    let frame;
    let last = performance.now();
    function update(now) {
      const interval = Math.min(.05, (now - last) / 1000);
      const pace = steering.current?.direction ?? 0;
      setGap(current => Math.min(.37, Math.max(-.37, current + (stage.drift + pace * .34) * interval)));
      last = now;
      frame = requestAnimationFrame(update);
    }
    field.current?.focus({ preventScroll: true });
    frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); steering.current = null; };
  }, [active, flying, locked, delivered, stage.drift]);

  function handoff() {
    if (!flying || locked || delivered) return;
    if (!relayInRange(gap, stage.tolerance)) {
      setFlying(false);
      setGap(stage.gap);
      fail('两架飞机还没并排，包裹掉下去了。答对后回到交接前。');
      return;
    }
    setDelivered(true);
    onPass();
  }

  function steerKey(event, down) {
    if (!flying || locked || delivered) return;
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!direction && !(event.code === 'Space' && event.target === event.currentTarget)) return;
    event.preventDefault();
    if (direction && down) steering.current = { id: event.key, direction };
    if (!down && steering.current?.id === event.key) steering.current = null;
    if (event.code === 'Space' && down && !event.repeat) handoff();
  }

  return <div className="recovery-game">
    <h2>空中交接包裹</h2>
    <div className="recovery-relay" ref={field} tabIndex={0} aria-label="接力航道，左右方向键调整速度，空格交接"
      onKeyDown={event => steerKey(event, true)} onKeyUp={event => steerKey(event, false)}
      onBlur={() => { steering.current = null; }}>
      <span className="relay-marker" />
      <span className="relay-plane" style={{ left: 50 + gap * 100 + '%' }}><Cast role={role} />{!delivered && <small>📦</small>}</span>
      <span className="relay-plane relay-partner"><Cast role={companion} />{delivered && <small>📦</small>}</span>
    </div>
    <p role="status">{delivered ? companion.name + '接住了包裹！' : relayInRange(gap, stage.tolerance) ? '并排了，可以交接！' : '长按减速或加速，让两架飞机并排。'}</p>
    <div className="adventure-buttons">
      {!flying && !delivered && <button className="primary" disabled={locked} onClick={() => setFlying(true)}>起飞</button>}
      {flying && !delivered && <>
        {[[-1, '减速'], [1, '加速']].map(([direction, label]) => <button type="button" className="listen relay-steer" key={direction}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            steering.current = { id: event.pointerId, direction };
          }}
          onLostPointerCapture={event => { if (steering.current?.id === event.pointerId) steering.current = null; }}
          onClick={event => {
            if (event.detail === 0) setGap(current => Math.min(.37, Math.max(-.37, current + direction * .09)));
          }}>{label}</button>)}
        <button className="primary" disabled={locked} onClick={handoff}>交接包裹</button>
      </>}
    </div>
    {quiz}
  </div>;
}

function PipeRescue({ stage, companion, grade, onPass }) {
  const [grid, setGrid] = useState(() => makePipeGrid(stage.route, stage.turns));
  const [water, setWater] = useState(null);
  const { fail, locked, quiz } = useRecovery(grade);
  const done = water?.connected;

  function testFlow() {
    const trace = tracePipe(grid);
    setWater(trace);
    if (trace.connected) onPass();
    else fail('试水时漏了。从标出的接头继续修，已经接好的管道会保留。');
  }

  return <div className="recovery-game">
    <h2>把水送到花圃</h2>
    <div className="pipe-worksite">
      <Cast role={companion} />
      <div className="pipe-board" aria-label="管道棋盘">
        {Array.from({ length: 12 }, (_, index) => {
          const pipe = grid[index];
          return pipe ? <button key={index} className={`pipe-tile${water?.wet.includes(index) ? ' wet' : ''}${water?.leak === index ? ' leaking' : ''}`}
            aria-label={`转动第 ${Math.floor(index / 4) + 1} 行第 ${index % 4 + 1} 列管道，当前接头向${pipe.ports.map(port => ['上','右','下','左'][(port + pipe.turns) % 4]).join('、')}`}
            disabled={locked || done} onClick={() => {
              setGrid({ ...grid, [index]: { ...pipe, turns: (pipe.turns + 1) % 4 } });
              setWater(null);
            }}>
            {pipe.ports.map(port => <i key={port} className={'pipe-port side-' + ((port + pipe.turns) % 4)} />)}
            <i className="pipe-joint" />
          </button> : <span className="pipe-empty" key={index} />;
        })}
      </div>
    </div>
    <p role="status">{done ? '水已经流到花圃了！' : '从棋盘左侧中间进水，右侧中间出水。点管道旋转，接好再试水。'}</p>
    <button className="primary" disabled={locked || done} onClick={testFlow}>打开水阀试水</button>
    {quiz}
  </div>;
}

const footprints = [
  { kind: 'paw', symbol: '●', name: '圆形脚印' },
  { kind: 'hoof', symbol: 'Ⅱ', name: '分叉脚印' },
  { kind: 'bird', symbol: '⋔', name: '三趾脚印' },
];

function Print({ pattern }) {
  return <span className={'footprint-mark footprint-' + pattern.kind} aria-label={pattern.name}>{pattern.symbol}</span>;
}

function FootprintSearch({ stage, role, companion, grade, onPass }) {
  const [junction, setJunction] = useState(0);
  const [wrongRoad, setWrongRoad] = useState(null);
  const { fail, locked, quiz } = useRecovery(grade);
  const done = junction === stage.route.length;
  const reference = footprints.find(pattern => pattern.kind === stage.print);

  function choose(index) {
    if (locked || done) return;
    if (index !== stage.route[junction]) {
      setWrongRoad(index);
      fail('这条路尽头的脚印对不上。答对后回到这一个岔路口。');
      return;
    }
    setWrongRoad(null);
    setJunction(junction + 1);
    if (junction + 1 === stage.route.length) onPass();
  }

  return <div className="recovery-game">
    <h2>沿着脚印追踪</h2>
    <div className="footprint-map">
      <Cast role={role} />
      <div className="footprint-reference"><span>参考脚印</span><Print pattern={reference} /></div>
      <Cast role={companion} />
      {!done && <div className="footprint-roads">
        {footprints.map((_, index) => {
          const displacement = (index - stage.route[junction] + footprints.length) % footprints.length;
          const pattern = footprints[(footprints.indexOf(reference) + displacement) % footprints.length];
          return <button key={index} className="footprint-road" data-wrong={wrongRoad === index}
            disabled={locked} onClick={() => choose(index)}>
            <Print pattern={pattern} /><Print pattern={pattern} />{['左边小路','中间小路','右边小路'][index]}
          </button>;
        })}
      </div>}
    </div>
    <p role="status">{done ? '找到了留下脚印的人！' : `已走对 ${junction} / ${stage.route.length} 个路口`}</p>
    {quiz}
  </div>;
}

function soundBeat(context) {
  if (!context || context.state !== 'running') return;
  const at = context.currentTime;
  const tone = context.createOscillator();
  const envelope = context.createGain();
  tone.frequency.setValueAtTime(175, at);
  tone.frequency.exponentialRampToValueAtTime(65, at + .12);
  envelope.gain.setValueAtTime(.21, at);
  envelope.gain.exponentialRampToValueAtTime(.002, at + .14);
  tone.connect(envelope).connect(context.destination);
  tone.start(at);
  tone.stop(at + .15);
}

function RhythmBand({ stage, role, companion, active, grade, onPass }) {
  const [phase, setPhase] = useState('ready');
  const [beat, setBeat] = useState(-1);
  const [matched, setMatched] = useState(0);
  const timing = useRef(0);
  const matchedRef = useRef(0);
  const audio = useRef(null);
  const { fail, locked, quiz } = useRecovery(grade);

  useEffect(() => () => { audio.current?.close().catch(() => {}); }, []);

  function missed(reason) {
    setPhase('ready');
    setBeat(-1);
    fail(reason + '答对后，重听这一小节。');
  }

  useEffect(() => {
    if (!active || phase !== 'demo' && phase !== 'playing') return;
    let shown = -1;
    let frame;
    const warmup = phase === 'demo' ? 220 : 780;
    const base = performance.now() + warmup;
    timing.current = base;
    function animate(now) {
      const elapsed = now - base;
      const current = stage.beats.findLastIndex(offset => offset <= elapsed);
      if (current !== shown) {
        shown = current;
        setBeat(current);
        if (phase === 'demo' && current >= 0) soundBeat(audio.current);
      }
      if (phase === 'demo' && elapsed > stage.beats.at(-1) + 530) {
        setPhase('playing');
        setBeat(-1);
        return;
      }
      if (phase === 'playing' && beatResult(elapsed, stage.beats[matchedRef.current]) === 'late') {
        missed('漏敲了一拍。');
        return;
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, phase, stage.beats]);

  useEffect(() => {
    if (!active && phase !== 'done') {
      setPhase('ready');
      setBeat(-1);
    }
  }, [active, phase]);

  function start() {
    if (!audio.current && globalThis.AudioContext) audio.current = new AudioContext();
    audio.current?.resume().catch(() => {});
    matchedRef.current = 0;
    setMatched(0);
    setBeat(-1);
    setPhase('demo');
  }

  function tap() {
    if (phase !== 'playing' || locked) return;
    soundBeat(audio.current);
    const match = beatResult(performance.now() - timing.current, stage.beats[matchedRef.current]);
    if (match !== 'matched') { missed(match === 'early' ? '这一拍敲早了。' : '这一拍敲晚了。'); return; }
    const count = ++matchedRef.current;
    setMatched(count);
    if (count === stage.beats.length) {
      setPhase('done');
      onPass();
    }
  }

  return <div className="recovery-game">
    <h2>跟着伙伴敲鼓</h2>
    <div className="rhythm-band">
      <Cast role={role} />
      <div className="rhythm-beats" aria-label="可视节拍">
        {stage.beats.map((_, index) => <span key={index} className={`rhythm-beat${index === beat ? ' current' : ''}${index < matched ? ' matched' : ''}`}>{index + 1}</span>)}
      </div>
      <Cast role={companion} />
    </div>
    <p role="status">{phase === 'demo' ? '先听伙伴示范。' : phase === 'playing' ? '圆点亮起时敲鼓。' : phase === 'done' ? '整段节奏接上啦！' : '准备好了就听一遍。'}</p>
    <div className="adventure-buttons">
      {phase === 'ready' && <button className="primary" disabled={locked} onClick={start}>听伙伴示范</button>}
      {phase === 'playing' && <button className="primary" onClick={tap}>🥁 敲鼓</button>}
    </div>
    {quiz}
  </div>;
}

const fruits = {
  apple: ['🍎', '苹果'], orange: ['🍊', '橙子'], pear: ['🍐', '梨'], grape: ['🍇', '葡萄'],
};

function FruitBalance({ stage, companion, grade, onPass }) {
  const [trays, setTrays] = useState(() => stage.fruit.map(() => null));
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const difference = balanceWeight(stage.fruit, trays);
  const { fail, locked, quiz } = useRecovery(grade);

  function move(index, side) {
    if (locked || done || !Number.isInteger(index) || !stage.fruit[index]) return;
    setTrays(trays.map((value, item) => item === index ? side : value));
    setSelected(null);
  }

  function drop(event, side) {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    if (data.startsWith('fruit:')) move(Number(data.slice(6)), side);
  }

  function fruitItem(id, index) {
    const [symbol, name] = fruits[id];
    return <button type="button" className="piece balance-fruit" key={index} disabled={locked || done} aria-pressed={selected === index}
      aria-label={name + ' ' + fruitWeights[id] + ' 格'} draggable={!locked && !done} onClick={() => setSelected(index)}
      onDragStart={event => event.dataTransfer.setData('text/plain', 'fruit:' + index)}>{symbol}<small>{fruitWeights[id]}</small></button>;
  }

  return <div className="recovery-game">
    <h2>给乔乔的水果称重</h2>
    <div className="balance-scene">
      <Cast role={companion} />
      <div className="balance-machine">
        <div className="balance-beam" style={{ rotate: Math.sign(difference) * 7 + 'deg' }} aria-hidden="true" />
        <div className="balance-trays" style={{ "--balance-tilt": Math.sign(difference) * 7 + "px" }}>
          {[[-1, '左盘'], [1, '右盘']].map(([side, name]) => <div key={side} className="balance-tray"
            onDragOver={event => event.preventDefault()} onDrop={event => drop(event, side)}>
            <button className="listen" disabled={locked || done || selected === null} onClick={() => move(selected, side)}>放入{name}</button>
            <div>{stage.fruit.map((fruit, index) => trays[index] === side && fruitItem(fruit, index))}</div>
          </div>)}
        </div>
      </div>
    </div>
    <div className="balance-tray" onDragOver={event => event.preventDefault()} onDrop={event => drop(event, null)}>
      <p>拖动水果，或点选后放入左盘、右盘。</p>
      <div>{stage.fruit.map((fruit, index) => trays[index] === null && fruitItem(fruit, index))}</div>
      <button className="listen" disabled={locked || done || selected === null || trays[selected] === null} onClick={() => move(selected, null)}>拿回水果篮</button>
    </div>
    <p role="status">{difference === 0 ? '两边一样重' : difference > 0 ? '右边更重' : '左边更重'}</p>
    <button className="primary" disabled={locked || done || trays.includes(null)} onClick={() => {
      if (difference) fail('天平还倾斜着。答对后，水果会留在原来的位置。');
      else { setDone(true); onPass(); }
    }}>检查天平</button>
    {quiz}
  </div>;
}

export const recoveryStages = { flightRelay: FlightRelay, pipeRescue: PipeRescue, footprintSearch: FootprintSearch, rhythmBand: RhythmBand, fruitBalance: FruitBalance };
