export const characters = [
  { label: '三点水', example: '河', strokes: [
    [[24, 20], [33, 27]], [[17, 43], [27, 49]], [[19, 79], [30, 66], [37, 57]],
  ] },
  { label: '木字旁', example: '桃', strokes: [
    [[17, 37], [80, 37]], [[49, 12], [49, 90]],
    [[46, 42], [36, 58], [16, 77]], [[57, 52], [67, 63]],
  ] },
  { label: '口字旁', example: '唱', strokes: [
    [[24, 26], [24, 77]], [[24, 26], [77, 26], [77, 77]], [[24, 77], [77, 77]],
  ] },
];

export function strokeCheckpoints(stroke) {
  const checkpoints = [stroke[0]];
  for (let index = 1; index < stroke.length; index++) {
    const [x, y] = stroke[index - 1];
    const [endX, endY] = stroke[index];
    const steps = Math.ceil(Math.hypot(endX - x, endY - y) / 9);
    for (let step = 1; step <= steps; step++) {
      checkpoints.push([x + (endX - x) * step / steps, y + (endY - y) * step / steps]);
    }
  }
  return checkpoints;
}

export function followsStroke(stroke, drawn) {
  const checkpoints = strokeCheckpoints(stroke);
  const near = ([x, y], [cx, cy], radius) => Math.hypot(cx - x, cy - y) <= radius;
  if (drawn.length < 2 || !near(drawn[0], checkpoints[0], 6) || !near(drawn.at(-1), checkpoints.at(-1), 6)) {
    return false;
  }
  let reached = 0;
  for (const [x, y] of drawn) {
    if (!checkpoints.some(point => near([x, y], point, 13))) return false;
    while (reached < checkpoints.length) {
      const [cx, cy] = checkpoints[reached];
      if (Math.hypot(cx - x, cy - y) > 9) break;
      reached++;
    }
  }
  return reached === checkpoints.length;
}
