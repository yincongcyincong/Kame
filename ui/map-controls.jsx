import React, { useEffect, useRef, useState } from 'react';
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
