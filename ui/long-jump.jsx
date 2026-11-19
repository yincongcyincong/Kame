import React, { useEffect, useRef, useState } from 'react';
import { MapPortrait } from './character-map.jsx';
import { chargeAt, jumpResult } from './long-jump.mjs';

export function LongJump({ stage, role, companion, onPass }) {
  const [power, setPower] = useState(0);
  const [status, setStatus] = useState('ready');
  const [result, setResult] = useState(null);
  const held = useRef(null);
  const frame = useRef(null);
  const field = useRef(null);

  useEffect(() => {
    const focus = requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(focus);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  function begin(source) {
    if (held.current || result) return;
    held.current = { source, at: performance.now() };
    setPower(0);
    setStatus('charging');
    function update(now) {
      if (!held.current) return;
      const charge = chargeAt(now - held.current.at, stage.limit);
      setPower(charge.power);
      if (charge.overcharged) {
        setStatus('overcharged');
        return;
      }
      frame.current = requestAnimationFrame(update);
    }
    frame.current = requestAnimationFrame(update);
  }

  function release(source, cancelled = false) {
    if (held.current?.source !== source) return;
    cancelAnimationFrame(frame.current);
    const elapsed = performance.now() - held.current.at;
    held.current = null;
    if (cancelled) {
      setPower(0);
      setStatus('ready');
      return;
    }
    const jump = jumpResult(elapsed, stage.limit, stage.maxDistance);
    if (!jump) {
      setPower(0);
      setStatus('retry');
      return;
    }
    setPower(chargeAt(elapsed, stage.limit).power);
    setResult(jump);
    setStatus('landed');
    onPass();
  }

  const lanes = [
    { actor: role, label: role.name + '（你）', distance: result?.player },
    { actor: companion, label: companion.name + '（电脑）', distance: result?.computer },
  ];

  return <div className="long-jump" ref={field} tabIndex={0} aria-label="跳远比赛"
    onKeyDown={event => {
      if (event.code !== 'Space' || event.target.closest('button:not(.long-jump-charge)')) return;
      event.preventDefault();
      if (!event.repeat) begin('keyboard');
    }}
    onKeyUp={event => {
      if (event.code !== 'Space' || held.current?.source !== 'keyboard') return;
      event.preventDefault();
      release('keyboard');
    }}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && held.current) release(held.current.source, true);
    }}>
    <h2>{stage.title}</h2>
    <div className="jump-pit">
      {lanes.map(({ actor, label, distance }) => <div className="jump-lane" key={actor.id}>
        <strong>{label}</strong>
        <div className="jump-runway">
          <div className="jump-actor" data-landed={distance === undefined ? undefined : 'true'}
            style={{ '--landing': 8 + (distance || 0) / stage.maxDistance * 84 + '%' }}>
            <MapPortrait role={actor} />
          </div>
        </div>
        <span>{distance === undefined ? '准备起跳' : distance.toFixed(2) + ' 米'}</span>
      </div>)}
    </div>
    <div className="jump-meter" role="meter" aria-label="蓄力" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(power * 100)} data-overcharged={status === 'overcharged'}>
      <span style={{ width: power * 100 + '%' }} />
      <i aria-hidden="true" />
    </div>
    <div className="adventure-buttons">
      <button type="button" className="primary long-jump-charge" disabled={Boolean(result)}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          begin(event.pointerId);
        }}
        onPointerUp={event => release(event.pointerId)}
        onPointerCancel={event => release(event.pointerId, true)}
        onLostPointerCapture={event => release(event.pointerId, true)}>
        按住蓄力，松开起跳
      </button>
    </div>
    <p className="jump-status" role="status">
      {status === 'overcharged' ? '蓄力过头啦，先松开，再重新按住。' :
        status === 'retry' ? '再蓄一次力，接近满格就松开。' :
        result ? `电脑发挥 ${result.computerPower}%。${result.player === result.computer ? '这一轮平局！' : result.player > result.computer ? '这一轮你跳得更远！' : companion.name + '跳得更远！'}` :
        '按住空格或蓄力按钮，接近满格时松开。'}
    </p>
  </div>;
}
