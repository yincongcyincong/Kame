export const checkpoints = [12, 27, 42];
export const approachDistance = 5.25;
export const laneHalfWidth = 2.35;
export const walkSpeed = 4;

export function walkRoute(position, input, elapsed, checkpoint, hit) {
  const length = Math.hypot(input.x, input.forward);
  const stride = walkSpeed * Math.max(0, Math.min(elapsed, .1)) / Math.max(length, 1);
  const limit = checkpoints[checkpoint] - approachDistance;
  const x = Math.max(-laneHalfWidth, Math.min(laneHalfWidth, position.x + input.x * stride));
  const distance = Math.max(1, Math.min(limit + (hit ? 1.6 : 0), position.distance + input.forward * stride));
  return { x, distance, near: distance >= limit };
}

export function rangeFieldOfView(aspect) {
  return Math.max(60, 2 * Math.atan(4.95 / (4.85 * aspect)) * 180 / Math.PI);
}
