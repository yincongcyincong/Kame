import React, { useEffect, useRef, useState } from 'react';
import { createDetectiveTown } from './detective-town.mjs';
import { speak } from './speech.mjs';

const movement = {
  w: 'forward', ArrowUp: 'forward', s: 'back', ArrowDown: 'back',
  a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right',
};
const directions = [
  ['left', '←', '向左移动'], ['forward', '↑', '向前走'],
  ['back', '↓', '向后走'], ['right', '→', '向右移动'],
];

export function Investigation({ dossier, onPass, nextControl }) {
  const canvas = useRef(null);
  const town = useRef(null);
  const drag = useRef(null);
  const [nearby, setNearby] = useState(null);
  const [spoken, setSpoken] = useState([]);
  const [active, setActive] = useState(null);
  const [fallback, setFallback] = useState(false);
  const complete = spoken.length === dossier.suspects.length;

  useEffect(() => {
    const node = canvas.current;
    const closeScene = event => {
      event?.preventDefault();
      town.current?.dispose();
      town.current = null;
      setFallback(true);
    };
    try {
      town.current = createDetectiveTown(node, dossier, setNearby);
    } catch {
      closeScene();
      return;
    }
    const stop = () => {
      drag.current = null;
      town.current?.stopAll();
    };
    node.addEventListener('webglcontextlost', closeScene);
    window.addEventListener('blur', stop);
    node.focus({ preventScroll: true });
    return () => {
      node.removeEventListener('webglcontextlost', closeScene);
      window.removeEventListener('blur', stop);
      town.current?.dispose();
      town.current = null;
    };
  }, [dossier]);

  function interview(index) {
    setActive(index);
    setSpoken(previous => previous.includes(index) ? previous : [...previous, index]);
  }

  useEffect(() => {
    if (nearby !== null) interview(nearby);
  }, [nearby]);

  useEffect(() => {
    if (complete) onPass();
  }, [complete, onPass]);

  const statement = active === null ? null : <section className="investigation-statement" aria-live="polite">
    <strong>{dossier.portraits[active]} {dossier.suspects[active]}的口供</strong>
    <p>{dossier.clues[active].text}</p>
    <button className="listen" onClick={() => speak(dossier.clues[active].text)}>🔊 听口供</button>
  </section>;
  const direction = event => movement[event.key.length === 1 ? event.key.toLowerCase() : event.key];
  return <div className={`range-viewport detective-viewport${fallback ? ' detective-fallback' : ''}`}>
    {!fallback && <>
        <canvas ref={canvas} className="range-canvas" tabIndex={0} aria-label="3D 森林小镇，方向键移动，靠近嫌疑人后自动对话"
          onBlur={() => town.current?.stopAll()}
          onKeyDown={event => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (direction(event)) {
              event.preventDefault();
              town.current?.start(direction(event));
            }
          }}
          onKeyUp={event => town.current?.stop(direction(event))}
          onPointerDown={event => {
            if (event.button !== 0 || drag.current) return;
            canvas.current.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
          }}
          onPointerMove={event => {
            const gesture = drag.current;
            if (gesture?.id !== event.pointerId) return;
            const dx = event.clientX - gesture.x;
            const dy = event.clientY - gesture.y;
            if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
            gesture.moved = true;
            gesture.x = event.clientX;
            gesture.y = event.clientY;
            town.current?.turn(dx, dy);
          }}
          onPointerUp={event => {
            const gesture = drag.current;
            if (gesture?.id !== event.pointerId) return;
            drag.current = null;

          }}
          onPointerCancel={() => { drag.current = null; }}
          onLostPointerCapture={() => { drag.current = null; }} />
      <p className="detective-guide" aria-live="polite">{nearby === null ? '沿小路找嫌疑人 · 靠近后自动对话' : '已靠近 ' + dossier.suspects[nearby]}</p>
      <div className="range-controls" aria-label="移动按钮">
        {directions.map(([value, icon, label]) => <button key={value} aria-label={label}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            town.current?.step(value);
            town.current?.start(value);
          }}
          onPointerUp={() => town.current?.stop(value)}
          onPointerCancel={() => town.current?.stop(value)}
          onLostPointerCapture={() => town.current?.stop(value)}
          onClick={event => { if (event.detail === 0) town.current?.step(value); }}>{icon}</button>)}
      </div>
    </>}
    <aside className="detective-notebook" aria-label="调查记录">
      {fallback && <p>无法开启 3D，可以在名单里直接听取口供。</p>}
    <div className="case-people" aria-label="口供名单">
      {dossier.suspects.map((person, index) => {
        const known = spoken.includes(index);
        return <button className="candidate" key={person} aria-pressed={active === index}
          disabled={!known && !fallback} onClick={() => interview(index)}>
          <span className="suspect-portrait" aria-hidden="true">{dossier.portraits[index]}</span>
          {person}<small>{known ? '口供已记录' : '尚未问话'}</small>
        </button>;
      })}
    </div>
    {statement}
    <p className="feedback" aria-live="polite">已获得 {spoken.length} / {dossier.suspects.length} 份口供</p>
      {nextControl}
    </aside>
  </div>;
}
