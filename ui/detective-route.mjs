export const suspectLocations = [
  { x: -2.9, z: -5.2 },
  { x: 2.9, z: -9.3 },
  { x: -2.4, z: -14.6 },
];

export function closestSuspect(position, radius = 2.05) {
  let nearest = null;
  let distance = radius;
  suspectLocations.forEach((person, index) => {
    const gap = Math.hypot(position.x - person.x, position.z - person.z);
    if (gap >= distance) return;
    nearest = index;
    distance = gap;
  });
  return nearest;
}

export function walkTown(position, input, yaw, elapsed) {
  const scale = 4.2 * Math.max(0, Math.min(elapsed, .1)) / Math.max(1, Math.hypot(input.x, input.forward));
  const x = position.x + scale * (input.x * Math.cos(yaw) - input.forward * Math.sin(yaw));
  const z = position.z - scale * (input.forward * Math.cos(yaw) + input.x * Math.sin(yaw));
  return { x: Math.min(5.2, Math.max(-5.2, x)), z: Math.min(1, Math.max(-17.3, z)) };
}
