export const startPosition = { x: 49, y: 87 };
export const mapCheckpoints = [{ x: 78, y: 67 }, { x: 23, y: 47 }, { x: 75, y: 25 }];

export function walkRangeMap(position, x, y, elapsed) {
  const speed = Math.min(elapsed, .05) * 34 / Math.max(1, Math.hypot(x, y));
  return {
    x: Math.max(6, Math.min(94, position.x + x * speed)),
    y: Math.max(12, Math.min(91, position.y + y * speed)),
  };
}

export function canShootOnMap(position, robot) {
  return Math.hypot(position.x - robot.x, position.y - robot.y) <= 14;
}

export function patrolPosition(checkpoint, elapsed, station) {
  const phase = elapsed * (1.12 + .13 * station) + station * Math.PI * 2 / 3;
  return {
    x: checkpoint.x + Math.sin(phase) * 8,
    y: checkpoint.y + Math.sin(phase * 2) * 4,
  };
}

export function startDuel(station) {
  return { station, time: 0, cooldown: 0, attackAt: 1.35, shots: [], status: 'playing' };
}

export function aimOrb(origin, target, hostile = false) {
  const x = target.x - origin.x;
  const y = target.y - origin.y;
  const distance = Math.hypot(x, y);
  if (distance < .01) return null;
  const speed = hostile ? 40 : 74;
  return { ...origin, vx: x / distance * speed, vy: y / distance * speed, life: 1.05, hostile };
}

export function fireOrb(duel, origin, target) {
  if (duel.status !== 'playing' || duel.time < duel.cooldown) return duel;
  const shot = aimOrb(origin, target);
  return shot ? { ...duel, cooldown: duel.time + .36, shots: [...duel.shots, shot] } : duel;
}

export function stepDuel(duel, player, elapsed, volleyRoll = 0) {
  if (duel.status !== 'playing') return duel;
  const dt = Math.max(0, Math.min(elapsed, .045));
  const time = duel.time + dt;
  const opponent = patrolPosition(mapCheckpoints[duel.station], time, duel.station);
  const shots = [];
  let attackAt = duel.attackAt;
  let warning = duel.warning;
  for (const shot of duel.shots) {
    const point = { ...shot, x: shot.x + shot.vx * dt, y: shot.y + shot.vy * dt, life: shot.life - dt };
    const target = shot.hostile ? player : opponent;
    const radius = shot.hostile ? 5 : 6;
    if (Math.hypot(point.x - target.x, point.y - target.y) <= radius) {
      return { ...duel, time, shots: [], warning: null, status: shot.hostile ? 'question' : 'won' };
    }
    if (point.life > 0 && point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100) shots.push(point);
  }
  if (warning && time >= attackAt) {
    const aim = Math.hypot(warning.x - opponent.x, warning.y - opponent.y) < .01
      ? { x: opponent.x, y: opponent.y + 1 } : warning;
    const center = aimOrb(opponent, aim, true);
    const count = 2 + Math.floor(volleyRoll * 4);
    for (let index = 0; index < count; index++) {
      const angle = (index - (count - 1) / 2) * Math.PI * 11 / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      shots.push({ ...center, vx: center.vx * cos - center.vy * sin, vy: center.vx * sin + center.vy * cos });
    }
    warning = null;
    attackAt = time + 1.55;
  } else if (!warning && time >= attackAt && Math.hypot(player.x - opponent.x, player.y - opponent.y) <= 39) {
    warning = { ...player };
    attackAt = time + .65;
  }
  return { ...duel, time, shots, warning, attackAt };
}

export function recoverDuel(duel) {
  return duel.status === 'question'
    ? { ...duel, status: 'playing', attackAt: duel.time + 1.5 }
    : duel;
}
