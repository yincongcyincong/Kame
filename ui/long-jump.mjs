export function chargeAt(elapsed, limit) {
  return {
    power: Math.max(0, Math.min(1, elapsed / limit)),
    overcharged: elapsed > limit,
  };
}

export function jumpResult(elapsed, limit, maxDistance, random = Math.random) {
  const { power, overcharged } = chargeAt(elapsed, limit);
  if (overcharged || power === 0) return null;
  const computerPower = 80 + Math.floor(random() * 16);
  const player = Math.round(power * maxDistance * 100) / 100;
  const computer = Math.round(computerPower * maxDistance) / 100;
  return { player, computer, computerPower };
}
