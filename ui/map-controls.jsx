import React, { useEffect, useRef, useState } from 'react';
import { registerCompanionMovement } from './companion-bridge.mjs';
import { startPosition, walkRangeMap } from './range-map.mjs';

const controls = [
  { name: '向左走', icon: '←', key: 'ArrowLeft', x: -1, y: 0 },
  { name: '向上走', icon: '↑', key: 'ArrowUp', x: 0, y: -1 },
  { name: '向下走', icon: '↓', key: 'ArrowDown', x: 0, y: 1 },
  { name: '向右走', icon: '→', key: 'ArrowRight', x: 1, y: 0 },
];
const letterKeys = { a: 'ArrowLeft', w: 'ArrowUp', s: 'ArrowDown', d: 'ArrowRight' };

export function useMapControls(enabled = true) {
  const [position, setPosition] = useState(startPosition);
  const field = useRef(null);
  const pressed = useRef(new Map());
  const current = useRef({ position, enabled });
  current.current = { position, enabled };
  useEffect(() => {
    const pending = new Set();
    const unregister = registerCompanionMovement(({ direction, duration_ms }, signal) => new Promise((resolve, reject) => {
      if (!current.current.enabled) { reject(new Error('当前地图暂停，暂时不能移动')); return; }
      const control = controls.find(item => item.name === ({left:'向左走',right:'向右走',up:'向上走',down:'向下走'})[direction]);
      if (!control || !Number.isInteger(duration_ms) || duration_ms < 100 || duration_ms > 2000) { reject(new Error('移动参数无效')); return; }
      if (signal.aborted) { reject(new Error('动作已取消')); return; }
      const key = Symbol('companion');
      pressed.current.set(key, control);
      const cleanup = () => { clearTimeout(item.timer); pressed.current.delete(key); pending.delete(item); signal.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(new Error('动作已取消')); };
      const item = { reject: () => { cleanup(); reject(new Error('场景已离开')); }, timer: setTimeout(() => { cleanup(); resolve(); }, duration_ms) };
      signal.addEventListener('abort', abort, { once: true });
      pending.add(item);
    }), () => ({ ...current.current.position, movable: current.current.enabled }));
    return () => { unregister(); for (const item of pending) { clearTimeout(item.timer); item.reject(new Error('场景已离开')); } pressed.current.clear(); };
  }, []);

  useEffect(() => {
    const clear = () => pressed.current.clear();
    if (!enabled) {
      clear();
      return;
    }
    let frame;
    let previous = performance.now();
    function move(now) {
      if (pressed.current.size) {
        let x = 0;
        let y = 0;
        for (const control of new Set(pressed.current.values())) {
          x += control.x;
          y += control.y;
        }
        if (x || y) {
          const elapsed = (now - previous) / 1000;
          setPosition(current => walkRangeMap(current, x, y, elapsed));
        }
      }
      previous = now;
      frame = requestAnimationFrame(move);
    }
    field.current?.focus({ preventScroll: true });
    frame = requestAnimationFrame(move);
    window.addEventListener('blur', clear);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('blur', clear);
      clear();
    };
  }, [enabled]);

  function keyMove(event, moving) {
    const key = letterKeys[event.key.toLowerCase()] || event.key;
    const control = controls.find(item => item.key === key);
    if (!control || !enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (moving) pressed.current.set('key:' + event.code, control);
    else pressed.current.delete('key:' + event.code);
  }

  return {
    position,
    fieldProps: {
      ref: field, tabIndex: 0,
      onKeyDown: event => keyMove(event, true),
      onKeyUp: event => keyMove(event, false),
      onBlur: event => {
        if (!event.currentTarget.contains(event.relatedTarget)) pressed.current.clear();
      },
    },
    movement: <div className="range-map-controls" aria-label="移动方向">
      {controls.map(control => <button type="button" key={control.key} aria-label={control.name} disabled={!enabled}
        onPointerDown={event => {
          if (!enabled || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pressed.current.set(event.pointerId, control);
          setPosition(current => walkRangeMap(current, control.x, control.y, .025));
        }}
        onLostPointerCapture={event => pressed.current.delete(event.pointerId)}
        onClick={event => {
          if (event.detail === 0) setPosition(current => walkRangeMap(current, control.x, control.y, .05));
        }}>{control.icon}</button>)}
    </div>,
  };
}
