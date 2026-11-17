import React, { useEffect, useRef, useState } from 'react';
import { FlatRangeStage } from './role-play.jsx';
import { createRangeScene } from './range-scene.mjs';

const movement = {
  w: 'forward', ArrowUp: 'forward', s: 'back', ArrowDown: 'back',
  a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right',
};
const directions = [
  ['left', '←', '向左移动'], ['forward', '↑', '向前走'],
  ['back', '↓', '向后走'], ['right', '→', '向右移动'],
];

export function RangeStage({ stage, theme, station, role, task, onPass, onAdvance }) {
  const canvas = useRef(null);
  const engine = useRef(null);
  const pointer = useRef(null);
  const onPassRef = useRef(onPass);
  const advanceRef = useRef(onAdvance);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState('');
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    onPassRef.current = onPass;
    advanceRef.current = onAdvance;
  }, [onPass, onAdvance]);

  useEffect(() => {
    if (shot !== 'hit') return;
    const timer = setTimeout(() => advanceRef.current(), 750);
    return () => clearTimeout(timer);
  }, [shot]);

  useEffect(() => {
    const field = canvas.current;
    const disable3D = event => {
      event?.preventDefault();
      setFallback(true);
    };
    try {
      engine.current = createRangeScene(field, theme, {
        role: role?.id, task,
        onEncounter: () => setReady(true),
        onShot: result => {
          setShot(result);
          if (result === 'hit') onPassRef.current();
        },
      });
    } catch {
      disable3D();
      return;
    }
    const stop = () => {
      pointer.current = null;
      engine.current?.stopAll();
    };
    field.addEventListener('webglcontextlost', disable3D);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('blur', stop);
      field.removeEventListener('webglcontextlost', disable3D);
      engine.current?.dispose();
      engine.current = null;
    };
  }, [theme, role?.id, task]);

  useEffect(() => {
    setReady(false);
    setShot('');
    engine.current?.setStation(station, stage);
    canvas.current?.focus({ preventScroll: true });
  }, [station, stage]);

  // Release GPU resources if a running graphics context becomes unavailable.
  useEffect(() => {
    if (!fallback) return;
    engine.current?.dispose();
    engine.current = null;
  }, [fallback]);

  function key(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (movement[value]) {
      event.preventDefault();
      engine.current?.start(movement[value]);
    } else if (value === ' ' || value === 'Enter' || /^[1-3]$/.test(value)) {
      event.preventDefault();
      if (!event.repeat) engine.current?.fire(0, 0, /^[1-3]$/.test(value) ? Number(value) - 1 : undefined);
    }
  }

  if (fallback) return <div className="range-fallback">
    <p className="activity-tip">这台设备暂时无法开启 3D，已切换到平面靶场。</p>
    <FlatRangeStage key={station} stage={stage} theme={theme} onPass={() => { setShot('hit'); onPass(); }} />
  </div>;

  return <div className="range-stage">
    <div className="range-viewport">
      <canvas ref={canvas} tabIndex={0} className="range-canvas" aria-label="3D 靶场。方向键移动，鼠标拖动转向，点击答案靶发射。"
        onKeyDown={key}
        onKeyUp={event => engine.current?.stop(movement[event.key.length === 1 ? event.key.toLowerCase() : event.key])}
        onBlur={() => engine.current?.stopAll()}
        onPointerDown={event => {
          if (event.button !== 0 || pointer.current) return;
          canvas.current.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
        }}
        onPointerMove={event => {
          const wrapper = event.currentTarget.parentElement;
          if (event.pointerType === 'mouse') {
            const area = wrapper.getBoundingClientRect();
            wrapper.style.setProperty('--range-aim-x', (event.clientX - area.left) + 'px');
            wrapper.style.setProperty('--range-aim-y', (event.clientY - area.top) + 'px');
          }
          const action = pointer.current;
          if (action?.id !== event.pointerId) return;
          const dx = event.clientX - action.x;
          const dy = event.clientY - action.y;
          if (!action.dragged && Math.hypot(dx, dy) < 6) return;
          action.dragged = true;
          action.x = event.clientX;
          action.y = event.clientY;
          engine.current?.look(dx, dy);
        }}
        onPointerUp={event => {
          const action = pointer.current;
          if (action?.id !== event.pointerId) return;
          pointer.current = null;
          if (action.dragged) return;
          const area = canvas.current.getBoundingClientRect();
          engine.current?.fire((event.clientX - area.left) / area.width * 2 - 1,
            1 - (event.clientY - area.top) / area.height * 2);
        }}
        onPointerLeave={event => {
          event.currentTarget.parentElement.style.removeProperty('--range-aim-x');
          event.currentTarget.parentElement.style.removeProperty('--range-aim-y');
        }}
        onPointerCancel={() => { pointer.current = null; }}
        onLostPointerCapture={() => { pointer.current = null; }} />
      <div className="range-hud">
      <p className="range-subject">{stage.subject} · 第 {station + 1} 道关卡</p>
      <h2 className="prompt" aria-live="polite">{shot === 'hit' ? '机器人已击碎，继续前进！' : ready ? stage.prompt : '沿着路线走近巡逻机器人'}</h2>
    </div>
      <span className="range-reticle" aria-hidden="true">⊕</span>
    <div className="range-controls" aria-label="移动按钮">
      {directions.map(([direction, icon, label]) => <button type="button" key={direction} aria-label={label}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          engine.current?.step(direction);
          engine.current?.start(direction);
        }}
        onPointerUp={() => engine.current?.stop(direction)}
        onPointerCancel={() => engine.current?.stop(direction)}
        onLostPointerCapture={() => engine.current?.stop(direction)}
        onClick={event => { if (event.detail === 0) engine.current?.step(direction); }}>{icon}</button>)}
    </div>
    {ready && <div className="range-screen-reader" aria-label="可瞄准的答案靶">
      {stage.targets.map((target, index) => <button type="button" key={target} disabled={shot === 'hit'}
        onClick={() => engine.current?.fire(0, 0, index)}>击中答案 {target}</button>)}
    </div>}
    <p className="feedback range-feedback" aria-live="polite">
      {shot === 'hit' ? '命中正确答案，机器人已击碎！' : shot === 'wrong' ? '答案不对，靶子还在，可以再试。'
        : shot === 'miss' ? '光球没碰到靶子，瞄准靶面再发射。'
          : '方向键或 WASD 移动，拖动画面转向，点击或轻触发射。'}
    </p>
    </div>
  </div>;
}
