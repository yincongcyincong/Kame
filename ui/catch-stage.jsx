import React, { useEffect, useRef, useState } from 'react';
import { MapPortrait } from './character-map.jsx';
import { startCatch, tickCatch, resumeCatch } from './catch-game.mjs';
import { dealShieldQuestions } from './shield-questions.mjs';

const directions = { ArrowLeft: -1, ArrowRight: 1, KeyA: -1, KeyD: 1 };

export function CatchStage({ stage, role, grade = 1, active, onPass }) {
  const [game, setGame] = useState(() => startCatch(stage));
  const [deck, setDeck] = useState(() => dealShieldQuestions(grade));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [wrong, setWrong] = useState(false);
  const field = useRef(null);
  const input = useRef({ held: new Map(), aim: null });
  const finish = useRef(onPass);
  finish.current = onPass;
  const playing = game.status === 'playing';
  const question = deck[questionIndex];

  useEffect(() => {
    if (!active || !playing) return;
    const controls = input.current;
    let frame;
    let last = performance.now();
    function update(now) {
      const interval = (now - last) / 1000;
      last = now;
      const movement = Math.sign([...new Set(controls.held.values())].reduce((sum, value) => sum + value, 0));
      const aim = controls.aim;
      setGame(previous => tickCatch(previous, movement, interval, stage, aim));
      frame = requestAnimationFrame(update);
    }
    field.current?.focus({ preventScroll: true });
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      controls.held.clear();
      controls.aim = null;
    };
  }, [active, playing, stage]);

  useEffect(() => {
    if (game.status === 'won') finish.current();
  }, [game.status]);

  function key(event, down) {
    const direction = directions[event.code];
    if (!playing || !direction || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    const controls = input.current;
    controls.aim = null;
    if (down) controls.held.set(event.code, direction);
    else controls.held.delete(event.code);
  }

  function aim(event) {
    if (!playing || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    input.current.aim = (event.clientX - rect.left) / rect.width * 100;
  }

  function answer(value) {
    if (value !== question.answer) { setWrong(true); return; }
    setWrong(false);
    if (questionIndex + 1 < deck.length) setQuestionIndex(questionIndex + 1);
    else {
      setDeck(dealShieldQuestions(grade, Math.random, question.prompt));
      setQuestionIndex(0);
    }
    setGame(resumeCatch);
  }

  return <div className="catch-game">
    <h2>{stage.title}</h2>
    <div className={`catch-field catch-${stage.item}`} ref={field} tabIndex={0} aria-label={`接${stage.name}场地，左右方向键移动`}
      onKeyDown={event => key(event, true)} onKeyUp={event => key(event, false)}
      onBlur={() => input.current.held.clear()} onPointerDown={aim}
      onPointerMove={event => { if (event.pointerType === 'touch' || event.buttons === 1) aim(event); }}>
      <div className="catch-score" aria-live="polite">{stage.name} {game.caught} / {stage.goal}</div>
      {game.status !== 'ready' && game.status !== 'won' && <span aria-hidden="true" className="catch-drop"
        style={{ left: game.pattern[game.item % game.pattern.length] + '%', top: game.y + '%' }}>{stage.icon}</span>}
      <div className="catch-actor" style={{ left: game.x + '%' }}>
        <MapPortrait role={role} /><i aria-hidden="true" />
      </div>
    </div>
    {game.status === 'ready' && <button className="primary" onClick={() => setGame(previous => ({ ...previous, status: 'playing' }))}>开始接{stage.name}</button>}
    {playing && <div className="adventure-buttons">
      {[[-1, '← 向左'], [1, '向右 →']].map(([direction, label]) => <button className="listen catch-steer" key={direction}
        onKeyDown={event => key(event, true)} onKeyUp={event => key(event, false)}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          input.current.aim = null;
          input.current.held.set(event.pointerId, direction);
        }}
        onLostPointerCapture={event => input.current.held.delete(event.pointerId)}
        onClick={event => {
          if (event.detail !== 0) return;
          input.current.aim = game.x + direction * 10;
        }}>{label}</button>)}
    </div>}
    {game.status === 'question' && <section className="catch-quiz" aria-label="掉落题目">
      <p role="status">{stage.name}掉到地上了，答对再继续。</p>
      <strong>{question.subject} · {question.prompt}</strong>
      <div className="adventure-buttons">{question.options.map(value => <button className="piece" key={value} onClick={() => answer(value)}>{value}</button>)}</div>
      {wrong && <p role="status">再想想，答对就能继续接。</p>}
    </section>}
    {playing && <p>用左右方向键移动，也可以按住方向按钮或点地面。</p>}
    {game.status === 'won' && <p role="status">接齐了，准备去下一站！</p>}
  </div>;
}
