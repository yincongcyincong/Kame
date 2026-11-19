import React, { useEffect, useRef, useState } from 'react';
import { bridgeStable, trackRun } from './adventure-data.mjs';
import { speak } from './speech.mjs';
import { MapPortrait } from './character-map.jsx';
import { recoveryStages } from './recovery-stages.jsx';
import { CatchStage } from './catch-stage.jsx';
import { LongJump } from './long-jump.jsx';
import { learningGameStages } from './learning-games.jsx';

function Flight({ stage, role, companion, onPass }) {
  const [position, setPosition] = useState(stage.phase === 'takeoff' ? 2 : 1);
  const [leg, setLeg] = useState(0);
  const [flying, setFlying] = useState(false);
  const [landed, setLanded] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [hint, setHint] = useState('');
  const last = stage.goal.length;
  const field = useRef(null);
  function steer(delta) { setPosition(old => Math.max(0, Math.min(2, old + delta))); }
  useEffect(() => {
    if (!flying || landed) return;
    const tick = setTimeout(() => {
      if (position !== stage.goal[leg]) {
        setFlying(false);
        setHint('飞偏啦！对准亮起的航标，再继续飞。');
        return;
      }
      setLeg(leg + 1);
      if (leg + 1 === last) {
        setLanded(true);
        if (stage.phase !== 'delivery') onPass();
      }
    }, 700);
    return () => clearTimeout(tick);
  }, [flying, landed, leg, position, stage, last, onPass]);
  return <div className="adventure flight-game">
    <h2>{stage.phase === 'takeoff' ? '准备起飞' : stage.phase === 'clouds' ? '穿过云层' : '对准跑道并送达'}</h2>
    <p>用 ↑ ↓ 驾驶，飞过亮起的航标。</p>
    <div className="adventure-field flight-field" ref={field} tabIndex={0} aria-label="飞行航道"
      onKeyDown={event => {
        if (!['ArrowUp','ArrowDown'].includes(event.key) || landed) return;
        event.preventDefault();
        steer(event.key === 'ArrowUp' ? -1 : 1);
      }}>
      {stage.goal.map((lane, index) => <span className={'flight-ring ' + (index === leg ? 'current' : index < leg ? 'cleared' : '')}
        key={index} style={{ left: (22 + index * 15) + '%', top: (20 + lane * 30) + '%' }}>◯</span>)}
      <span className="flight-plane" style={{ left: Math.min(11 + leg * 15, 92) + '%', top: (20 + position * 30) + '%' }} aria-hidden="true">{role?.portrait ? <img className="adventure-character" src={role.portrait} alt="" /> : '🛩️'}</span>
      {landed && stage.phase === 'delivery' && <span className="flight-bear activity-partner"><MapPortrait role={companion} />{companion.name}</span>}
    </div>
    <div className="adventure-buttons">
      <button className="listen" onClick={() => steer(-1)} disabled={landed || position === 0} aria-label="升高">↑ 升高</button>
      <button className="listen" onClick={() => steer(1)} disabled={landed || position === 2} aria-label="降低">↓ 降低</button>
      {!landed && <button className="primary" disabled={flying} onClick={() => { setHint(''); setFlying(true); field.current?.focus({ preventScroll: true }); }}>{leg ? '继续飞' : '出发'}</button>}
      {landed && stage.phase === 'delivery' && <button className="primary" disabled={delivered} onClick={() => {
        setDelivered(true);
        onPass();
      }}>把包裹交给{companion.name}</button>}
    </div>
    <p role="status">{delivered ? companion.name + '打开了包裹，谢谢你！' : landed ? '航线通过！' : hint || `航标 ${leg} / ${last}`}</p>
  </div>;
}

function Bridge({ stage, role, companion, onPass }) {
  const [crane, setCrane] = useState(0);
  const [beam, setBeam] = useState(stage.phase === 'cross' ? 2 : null);
  const [supports, setSupports] = useState([]);
  const [crossing, setCrossing] = useState(false);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const xs = [10, 30, 50, 70, 90];
  function move(delta) {
    const dest = Math.max(0, Math.min(4, crane + delta));
    setCrane(dest);
    if (stage.phase === 'drive' && dest === 4 && !done) { setDone(true); onPass(); }
  }
  function operate() {
    if (stage.phase === 'beam') {
      if (crane !== 2) { setHint('把桥板对准河中央的缺口。'); return; }
      setBeam(crane); setDone(true); onPass();
    } else {
      setSupports(current => current.includes(crane) ? current.filter(col => col !== crane) : [...current, crane]);
      setHint('');
    }
  }
  function testBridge() {
    const stable = bridgeStable(beam, supports);
    setCrossing(true);
    timer.current = setTimeout(() => {
      setCrossing(false);
      if (stable) { setDone(true); onPass(); }
      else setHint(companion.name + '在桥前停住了。桥板两端都要有支撑。');
    }, stable ? 1600 : 680);
  }
  return <div className="adventure bridge-game">
    <h2>{stage.phase === 'drive' ? '把救援车开到河边' : stage.phase === 'beam' ? '对准缺口，放下桥板' : '在桥板两端补支撑，再试过桥'}</h2>
    <div className={'adventure-field bridge-field ' + (stage.phase === 'drive' ? 'bridge-road' : '')}>
      {xs.map((x, index) => <span key={x} className={'bridge-marker ' + (index === crane ? 'selected' : '')} style={{ left: x + '%' }}>{index + 1}</span>)}
      <span className="bridge-crane" style={{ left: xs[crane] + '%' }} aria-hidden="true">{role?.portrait && <img className="adventure-character" src={role.portrait} alt="" />}{stage.phase === 'drive' ? '🚙' : '🏗️'}</span>
      {beam !== null && <span className="bridge-plank" aria-hidden="true" />}
      {supports.map(col => <span className="bridge-post" key={col} style={{ left: xs[col] + '%' }} aria-hidden="true" />)}
      {stage.phase === 'cross' && <span className={'bridge-animal activity-partner ' + (crossing && bridgeStable(beam, supports) || done ? 'crossed' : crossing ? 'waited' : '')}><MapPortrait role={companion} />{companion.name}</span>}
    </div>
    <div className="adventure-buttons">
      <button className="listen" disabled={done || crossing || crane === 0} onClick={() => move(-1)}>← 左移</button>
      <button className="listen" disabled={done || crossing || crane === 4} onClick={() => move(1)}>右移 →</button>
      {stage.phase !== 'drive' && <button className="primary" disabled={done || crossing} onClick={operate}>{stage.phase === 'beam' ? '放下桥板' : supports.includes(crane) ? '取回支撑' : '放置支撑'}</button>}
      {stage.phase === 'cross' && <button className="listen" disabled={done || crossing} onClick={testBridge}>让{companion.name}试走</button>}
    </div>
    <p role="status">{done ? '成功！' : hint || (stage.phase === 'cross' ? '可以反复调整，再让' + companion.name + '试走。' : '用方向按钮移动。')}</p>
  </div>;
}

function Timeline({ stage, onPass }) {
  const [found, setFound] = useState([]);
  const [order, setOrder] = useState([]);
  const [frame, setFrame] = useState(-1);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const running = frame >= 0;
  const allFound = found.length === stage.events.length;
  const shown = [2, 0, 1];
  function replay() {
    const valid = order.every((event, index) => event === index);
    const show = index => {
      setFrame(index);
      if (index < order.length) timer.current = setTimeout(() => show(index + 1), 1050);
      else {
        setFrame(-1);
        setDone(valid);
        setHint(valid ? '现场经过和记录上的时间都对上了！' : '回放和记录时间不一致。调整时间线，再播放看看。');
        if (valid) onPass();
      }
    };
    setHint('');
    show(0);
  }
  return <div className="adventure">
    <h2>{stage.story}</h2>
    <div className="adventure-field timeline-field" aria-live="polite">
      {running && stage.events[order[frame]] ? <><span className="timeline-icon">{stage.events[order[frame]][0]}</span><strong>{stage.events[order[frame]][1]}</strong></>
        : <strong>{done ? '案情还原成功' : '翻开全部记录，再把事件放到时间线。'}</strong>}
    </div>
    <div className="adventure-buttons">{shown.map(id => {
      const [icon, event, time] = stage.events[id];
      const open = found.includes(id);
      return <button className="listen" key={id} disabled={running || done || order.includes(id)} onClick={() => {
        if (!open) setFound(current => [...current, id]);
        else if (allFound) setOrder(current => [...current, id]);
      }}>{open ? `${icon} 10:${String(time).padStart(2,'0')} ${event}` : `🔎 翻看记录 ${shown.indexOf(id) + 1}`}</button>;
    })}</div>
    <ol className="adventure-buttons timeline-order">{order.map(id => <li key={id}><button className="piece" disabled={running || done}
      onClick={() => setOrder(current => current.filter(item => item !== id))}>{stage.events[id][1]} ×</button></li>)}</ol>
    <button className="primary" disabled={running || done || order.length !== stage.events.length} onClick={replay}>▶ 回放现场</button>
    <p role="status">{hint}</p>
  </div>;
}

function Breakfast({ stage, scene, onPass }) {
  const [level, setLevel] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState('');
  const pour = stage.phase === 'pour';
  useEffect(() => {
    if (!running) return;
    if (level >= 100) {
      setRunning(false);
      setStatus(pour ? '牛奶快溢出来了，再倒一杯。' : '面包烤太久了，再试一片。');
      return;
    }
    const timer = setTimeout(() => setLevel(current => Math.min(100, current + 5)), 155);
    return () => clearTimeout(timer);
  }, [level, running, pour]);
  function stop() {
    if (!running) return;
    setRunning(false);
    if (level >= 60 && level <= 80) { setDone(true); setStatus('刚刚好！'); onPass(); }
    else setStatus('还没到绿色刻度。重新试一下吧。');
  }
  return <div className="adventure breakfast-game">
    <h2>{pour ? 'JOJO 想要一杯牛奶' : 'JOJO 还想吃一片烤面包'}</h2>
    <p>{pour ? '开始倒，牛奶到绿色刻度时停下。' : '启动烤面包机，指针到绿色刻度时停下。'}</p>
    <div className="adventure-field breakfast-field">
      <span className={running ? 'breakfast-tilt' : ''} aria-hidden="true">{pour ? '🥛' : '🍞'}</span>
      <div className="breakfast-meter" role="meter" aria-label={pour ? '牛奶水位' : '烘烤程度'} aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}>
        <i style={{height: level + '%'}} /><b />
      </div>
      <img className="breakfast-jojo" src={scene} alt="JOJO" />
    </div>
    <div className="adventure-buttons">
      <button className="listen" onClick={() => speak(pour ? '我想喝牛奶。' : '我想吃烤面包。')}>🔊 听 JOJO 点餐</button>
      <button className="primary" disabled={done} onClick={() => {
        if (running) stop();
        else { setLevel(0); setStatus(''); setRunning(true); }
      }}>{running ? '停下' : level ? '再试一次' : pour ? '开始倒牛奶' : '开始烤面包'}</button>
    </div>
    <p role="status">{status}</p>
  </div>;
}

function Playground({ stage, onPass }) {
  const [heights, setHeights] = useState(stage.heights);
  const [car, setCar] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const left = i => 12 + i * 74 / (heights.length - 1);
  const top = h => 83 - h * 12;
  function run() {
    const end = trackRun(heights);
    setCar(0); setRunning(true); setHint('');
    const step = index => {
      setCar(index);
      if (index < end) timer.current = setTimeout(() => step(index + 1), 450);
      else {
        setRunning(false);
        if (end === heights.length - 1) { setDone(true); setHint('小车到达终点！'); onPass(); }
        else setHint(`小车卡在第 ${end + 1} 段。下一段应比它低一格。`);
      }
    };
    timer.current = setTimeout(() => step(0), 400);
  }
  return <div className="adventure">
    <h2>{stage.title}</h2>
    <p>每段比上一段低一格。调完以后放小车试跑。</p>
    <div className="adventure-field playground-field">
      {heights.map((height, index) => <span className="playground-pillar" key={index}
        style={{ left: left(index) + '%', top: top(height) + '%' }} aria-hidden="true">{height}</span>)}
      {heights.slice(1).map((height, index) => {
        const a = top(heights[index]);
        const b = top(height);
        return <i className="playground-ramp" key={index} style={{
          left: left(index) + '%', width: (left(index + 1) - left(index)) + '%',
          clipPath: `polygon(0 ${a}%, 100% ${b}%, 100% ${b + 3}%, 0 ${a + 3}%)`,
        }} />;
      })}
      <span className="playground-car" style={{ left: left(car) + '%', top: top(heights[car]) + '%' }} aria-hidden="true">🚗</span>
    </div>
    <div className="adventure-buttons">{heights.map((height, index) => <div className="playground-control" key={index}>
      <button className="listen" aria-label={`升高第 ${index + 1} 段`} disabled={index === 0 || running || done || height >= 5}
        onClick={() => setHeights(values => values.map((item, i) => i === index ? item + 1 : item))}>＋</button>
      <strong>{height}</strong>
      <button className="listen" aria-label={`降低第 ${index + 1} 段`} disabled={index === 0 || running || done || height <= 1}
        onClick={() => setHeights(values => values.map((item, i) => i === index ? item - 1 : item))}>−</button>
    </div>)}</div>
    <button className="primary" disabled={running || done} onClick={run}>让小车试跑</button>
    <p role="status">{hint}</p>
  </div>;
}

export const adventureStages = { flight: Flight, bridge: Bridge, timeline: Timeline, breakfast: Breakfast, playground: Playground, longJump: LongJump, catchItems: CatchStage, ...learningGameStages, ...recoveryStages };
