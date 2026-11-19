import React, { useEffect, useRef, useState } from 'react';
import { soundClues } from './learning-game-data.mjs';
import { MapPortrait } from './character-map.jsx';
import { speak } from './speech.mjs';

function Character({ role, scene }) {
  const art = role.portrait || scene;
  return art && <figure className="learning-character" data-role={role.id}>
    <img src={art} alt="" draggable={false} />
    <figcaption>{role.name}</figcaption>
  </figure>;
}

function Shop({ stage, role, companion, scene, onPass }) {
  const [counter, setCounter] = useState([]);
  const [returned, setReturned] = useState([]);
  const [paid, setPaid] = useState(false);
  const [hint, setHint] = useState('');
  const change = stage.budget - stage.price;
  const done = returned.length === change;
  const pool = Array.from({ length: stage.budget }, (_, index) => index)
    .filter(index => !counter.includes(index) && !returned.includes(index));

  function place(index) {
    if (done || !pool.includes(index)) return;
    if (paid) {
      setReturned([...returned, index]);
      if (returned.length + 1 === change) onPass();
    } else {
      setCounter([...counter, index]);
      setHint('');
    }
  }

  function token(index, label, action, draggable = false) {
    return <button type="button" className="learning-coin" key={index} aria-label={label}
      disabled={!action} draggable={draggable} onClick={action}
      onDragStart={draggable ? event => event.dataTransfer.setData('text/plain', 'coin:' + index) : undefined}>1</button>;
  }

  function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    if (data.startsWith('coin:')) place(Number(data.slice(5)));
  }

  return <div className="learning-game learning-shop">
    <h2>给{companion.name}买{stage.toy}</h2>
    <div className="learning-hero">
      <Character role={role} scene={scene} />
      <div className="learning-prop learning-product"><span aria-hidden="true">{stage.icon}</span><strong>{stage.price} 枚硬币</strong></div>
      <span className="activity-partner"><MapPortrait role={companion} />{companion.name}</span>
    </div>
    <p>{paid ? '把钱包里剩下的硬币交还给' + companion.name + '。' : '点硬币或拖到收银台。放多了，可以点收银台上的硬币拿回来。'}</p>
    <div className="learning-tray" aria-label="顾客的钱包">
      <strong>钱包 · {pool.length} 枚</strong>
      <div>{pool.map(index => token(index, '拿出一枚硬币', () => place(index), true))}</div>
    </div>
    <div className="learning-tray" onDragOver={event => event.preventDefault()} onDrop={drop}
      aria-label={paid ? '还给' + companion.name : '收银台'}>
      <strong>{paid ? '已还给' + companion.name + ' · ' + returned.length + ' 枚' : '收银台 · ' + counter.length + ' 枚'}</strong>
      <div>{(paid ? returned : counter).map(index => token(index, paid ? '已归还的硬币' : '拿回一枚硬币', paid ? null : () => {
        setCounter(counter.filter(item => item !== index));
        setHint('');
      }))}</div>
    </div>
    {!paid && <button className="primary" onClick={() => {
      const difference = stage.price - counter.length;
      if (!difference) { setPaid(true); setHint('付对了！现在把剩下的硬币还给' + companion.name + '。'); }
      else setHint(difference > 0 ? '还差 ' + difference + ' 枚。' : '多放了 ' + -difference + ' 枚。');
    }}>结账</button>}
    <p role="status">{done ? '买好了，' + companion.name + '拿回了 ' + change + ' 枚硬币！' : hint}</p>
  </div>;
}

function Delivery({ stage, role, scene, onPass }) {
  const [position, setPosition] = useState(0);
  const [heard, setHeard] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState('');
  const step = direction => setPosition(value => Math.min(stage.houses.length - 1, Math.max(0, value + direction)));

  function listen() {
    setHeard(true);
    const useText = () => setShowHint(true);
    if (!speak(stage.line, 'en', useText)) useText();
  }

  function deliver() {
    if (!heard || done) return;
    if (position !== stage.destination) {
      setNotice(stage.houses[position].park ? '这是公园。再听一遍地址，找到包裹要去的房子。' : '门牌还没对上。听听房子的颜色或它在公园哪一边。');
      return;
    }
    setDone(true);
    setNotice('送达了！' + stage.line);
    onPass();
  }

  return <div className="learning-game learning-delivery">
    <h2>听声送包裹</h2>
    <button className="listen" onClick={listen}>🔊 听英语地址</button>
    <button className="listen" onClick={() => { setHeard(true); setShowHint(value => !value); }}>查看地址文字</button>
    {showHint && <p><span lang="en">{stage.line}</span> <small>{stage.clue}</small></p>}
    <div className="learning-street" tabIndex={0} aria-label="左右方向键驾驶乐迪"
      onKeyDown={event => {
        if (done || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        step(event.key === 'ArrowLeft' ? -1 : 1);
      }}>
      <div className="learning-flight-track">
        <div className="learning-flight-actor" style={{left: ((position + .5) * 100 / stage.houses.length) + '%'}}>
          <Character role={role} scene={scene} />
        </div>
      </div>
      <div className="learning-houses">
        {stage.houses.map((house, index) => <div className="learning-house" key={index} aria-current={index === position ? 'location' : undefined}>
          <span className={house.park ? 'learning-park' : 'learning-building'} style={{'--house-paint': house.paint}} aria-hidden="true">
            {house.park ? '🌳' : <i />}
          </span>
          <span>{house.name}</span>
          {index === position && <small>{done ? '📦 已送达' : '当前地点'}</small>}
        </div>)}
      </div>
    </div>
    <div className="adventure-buttons">
      <button className="listen" onClick={() => step(-1)} disabled={done || position === 0}>← 往左飞</button>
      <button className="listen" onClick={() => step(1)} disabled={done || position === stage.houses.length - 1}>往右飞 →</button>
      <button className="primary" onClick={deliver} disabled={!heard || done}>放下包裹</button>
    </div>
    <p role="status">{notice || '听完地址，再把乐迪开到对应的地点。'}</p>
  </div>;
}

const opticWidth = 390;
const opticHeight = 270;
const mirrorX = 90;
const mirrorY = 135;
const targetX = 248;

function Rescue({ stage, role, companion, scene, onPass }) {
  const [angle, setAngle] = useState(stage.angle);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState('');
  const direction = 2 * angle * Math.PI / 180;
  const slope = Math.tan(direction);
  const distanceToTarget = targetX - mirrorX;
  const heightAtTarget = mirrorY + distanceToTarget * slope;
  const goal = mirrorY + distanceToTarget * Math.tan(2 * stage.goal * Math.PI / 180);
  const lit = Math.abs(heightAtTarget - goal) < 14;
  const distanceToWall = slope ? (opticHeight / 2) / Math.abs(slope) : Infinity;
  const horizontalReach = Math.min(lit ? distanceToTarget : opticWidth - mirrorX, distanceToWall);
  const beamWidth = horizontalReach / Math.cos(direction) / opticWidth * 100;

  function aim(value) {
    setAngle(value);
    setNotice('');
  }

  return <div className="learning-game learning-rescue">
    <h2>照亮山洞里的{companion.name}</h2>
    <div className="learning-cave">
      <Character role={role} scene={scene} />
      <div className="learning-optics" aria-label={lit ? '反射光已照到小动物' : '反射光还没照到小动物'}>
        <span className="cave-light" aria-hidden="true">🔦</span>
        <i className="cave-incoming" />
        <i className="cave-beam" style={{width: beamWidth + '%', rotate: 2 * angle + 'deg'}} />
        <i className="cave-mirror" style={{rotate: angle + 'deg'}} />
        <span className={'cave-animal activity-partner' + (lit ? ' cave-lit' : '')} style={{top: goal / opticHeight * 100 + '%'}} ><MapPortrait role={companion} /><b>{companion.name}</b></span>
      </div>
    </div>
    <div className="adventure-buttons">
      <label>转动镜子 <input aria-label="镜子角度" type="range" min="-30" max="30" step="6" value={angle} disabled={done}
        onChange={event => aim(Number(event.target.value))} /></label>
      <button className="primary" disabled={done} onClick={() => {
        if (!lit) { setNotice(heightAtTarget > goal ? '光打在小动物下方了，把镜子再往上转一点。' : '光打在小动物上方了，把镜子再往下转一点。'); return; }
        setDone(true);
        setNotice('找到了！' + companion.name + '可以顺着光走出来了。');
        onPass();
      }}>沿光束找找</button>
    </div>
    <p role="status">{notice || '拖动滑杆，让镜面转动，看看反射光照到了哪里。'}</p>
  </div>;
}

function playSound(context, kind, at) {
  const duration = .62;
  const samples = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const frame = samples.getChannelData(0);
  let smoothNoise = 0;
  for (let index = 0; index < frame.length; index++) {
    const time = index / context.sampleRate;
    const noise = Math.random() * 2 - 1;
    smoothNoise += (noise - smoothNoise) * .18;
    if (kind === 'water') {
      frame[index] = smoothNoise * (.25 + .16 * Math.sin(time * 55)) * Math.sin(Math.PI * time / duration);
    } else if (kind === 'bell') {
      frame[index] = (.17 * Math.sin(time * 2 * Math.PI * 965) + .10 * Math.sin(time * 2 * Math.PI * 1540)) * Math.exp(-time * 9);
    } else {
      const step = time % .28;
      frame[index] = (.3 * smoothNoise + .15 * Math.sin(time * 2 * Math.PI * 83)) * Math.exp(-step * 31);
    }
  }
  const source = context.createBufferSource();
  source.buffer = samples;
  source.connect(context.destination);
  source.start(at);
}

function SoundTrail({ stage, role, scene, onPass }) {
  const [steps, setSteps] = useState([]);
  const [heard, setHeard] = useState(false);
  const [showText, setShowText] = useState(false);
  const [notice, setNotice] = useState('');
  const [done, setDone] = useState(false);
  const playback = useRef(null);

  useEffect(() => () => {
    playback.current?.close().catch(() => {});
    playback.current = null;
  }, []);

  async function play(order) {
    try {
      playback.current?.close().catch(() => {});
      const context = new AudioContext();
      playback.current = context;
      await context.resume();
      if (playback.current === context) order.forEach((kind, index) => playSound(context, kind, context.currentTime + .08 + .86 * index));
    } catch {
      if (!playback.current || playback.current.state !== 'closed') setShowText(true);
    }
  }

  function check() {
    const wrong = stage.order.findIndex((id, index) => steps[index] !== id);
    if (wrong !== -1) {
      setNotice('第 ' + (wrong + 1) + ' 个声音还没对上。再听一遍，从这条线索开始改。');
      setSteps(steps.slice(0, wrong));
      return;
    }
    setDone(true);
    setNotice('口供整理好了，声音的地点和顺序都对上了！');
    onPass();
  }

  return <div className="learning-game learning-sounds">
    <h2>还原录音里的路线</h2>
    <div className="learning-hero"><Character role={role} scene={scene} /><span className="learning-prop" aria-hidden="true">🎙️</span></div>
    <div className="adventure-buttons">
      <button className="listen" onClick={() => { setHeard(true); void play(stage.order); }}>🔊 播放案发录音</button>
      <button className="listen" onClick={() => { setHeard(true); setShowText(value => !value); }}>查看声音文字</button>
    </div>
    {showText && <p>{stage.order.map(id => soundClues.find(clue => clue.id === id).text).join(' → ')}</p>}
    <div className="learning-sound-locations">
      {soundClues.map(clue => <div key={clue.id}>
        <span aria-hidden="true">{clue.icon}</span><strong>{clue.label}</strong>
        <button className="listen" onClick={() => void play([clue.id])}>试听{clue.text}</button>
        <button className="listen" disabled={!heard || done || steps.length === stage.order.length}
          onClick={() => { setSteps([...steps, clue.id]); setNotice(''); }}>记入笔记</button>
      </div>)}
    </div>
    <ol className="learning-notes" aria-label="线索顺序">{steps.map((id, index) => <li key={index}>{soundClues.find(clue => clue.id === id).label}</li>)}</ol>
    <div className="adventure-buttons">
      <button className="listen" disabled={done || !steps.length} onClick={() => setSteps(steps.slice(0, -1))}>撤回最后一条</button>
      <button className="primary" disabled={done || steps.length !== stage.order.length} onClick={check}>核对路线</button>
    </div>
    <p role="status">{notice}</p>
  </div>;
}

function Workshop({ stage, role, scene, onPass }) {
  const tiles = [stage.parts[1], stage.spare, stage.parts[0]];
  const [slots, setSlots] = useState([null, null]);
  const [fixed, setFixed] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState('');

  function place(index, side = slots.indexOf(null)) {
    if (fixed || side < 0 || !tiles[index] || slots.includes(index)) return;
    setSlots(slots.map((item, slot) => slot === side ? index : item));
    setNotice('');
  }

  function repair() {
    if (!stage.parts.every((part, index) => tiles[slots[index]] === part)) {
      setNotice('这两个部件的位置还没拼对，点字块拿下来试一试。');
      return;
    }
    setFixed(true);
    setNotice('路牌亮了！读一读，再把图卡送到对应的地方。');
    speak(stage.reading);
  }

  return <div className="learning-game learning-hanzi">
    <h2>修好「{stage.word}」字路牌</h2>
    <div className="learning-hero">
      <Character role={role} scene={scene} />
      <div className="learning-sign">
        {fixed ? <strong>{stage.word}</strong> : slots.map((item, side) => <button key={side} type="button"
          aria-label={side ? '右边槽' : '左边槽'} onClick={() => setSlots(slots.map((value, index) => index === side ? null : value))}
          onDragOver={event => event.preventDefault()} onDrop={event => {
            event.preventDefault();
            const data = event.dataTransfer.getData('text/plain');
            if (data.startsWith('hanzi:')) place(Number(data.slice(6)), side);
          }}>{item === null ? '·' : tiles[item]}</button>)}
      </div>
    </div>
    {!fixed ? <>
      <p>用字块拼出「{stage.word}」。点字块按顺序放，也可以拖到左边或右边。</p>
      <div className="learning-tiles">{tiles.map((tile, index) => <button key={index} className="piece" disabled={slots.includes(index) || !slots.includes(null)}
        draggable={!slots.includes(index)} onClick={() => place(index)}
        onDragStart={event => event.dataTransfer.setData('text/plain', 'hanzi:' + index)}>{tile}</button>)}</div>
      <button className="primary" disabled={slots.includes(null)} onClick={repair}>装好路牌</button>
    </> : <>
      <p><span aria-hidden="true">{stage.icon}</span> 把图卡送到对应的地方。</p>
      <button className="listen" onClick={() => speak(stage.reading)}>🔊 听「{stage.reading}」</button>
      <div className="adventure-buttons">{stage.destinations.map(destination => <button key={destination} className="piece" disabled={done} onClick={() => {
        if (!destination.includes(stage.reading)) { setNotice('这张图卡和这个地方不太搭，再听一遍词语。'); return; }
        setDone(true);
        setNotice('送到了！「' + stage.word + '」可以用在「' + stage.reading + '」里。');
        onPass();
      }}>{destination}</button>)}</div>
    </>}
    <p role="status">{notice}</p>
  </div>;
}

export const learningGameStages = {
  toyShop: Shop, listenDelivery: Delivery, mirrorRescue: Rescue, soundTrail: SoundTrail, hanziWorkshop: Workshop,
};
