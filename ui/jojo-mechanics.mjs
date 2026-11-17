export const boardWidth = 7;
export const boardHeight = 5;

export const blockShapes = {
  cube: { width: 1, height: 1, label: '方积木', color: 'coral' },
  beam: { width: 3, height: 1, label: '长积木', color: 'mint' },
  brick: { width: 2, height: 1, label: '双格积木', color: 'blue' },
};

export const builders = [
  { kind: 'blocks', goal: 'tower', prompt: '搭一座至少三格高的塔。', supply: ['cube', 'brick', 'cube', 'cube'] },
  { kind: 'blocks', goal: 'bridge', prompt: '两块方积木中间留一格，再架上长积木，让桥下能通过。', supply: ['cube', 'cube', 'beam'] },
  { kind: 'blocks', goal: 'stairs', prompt: '搭出三步台阶，相邻的三列分别高一格、两格、三格。', supply: ['cube', 'brick', 'brick', 'cube', 'cube', 'cube'] },
];

export function dimensions(type, rotated) {
  const { width, height } = blockShapes[type];
  return rotated ? { width: height, height: width } : { width, height };
}

export function columnHeights(blocks) {
  const heights = Array(boardWidth).fill(0);
  for (const block of blocks) {
    for (let col = block.col; col < block.col + block.width; col++) {
      heights[col] = Math.max(heights[col], block.row + block.height);
    }
  }
  return heights;
}

export function landing(blocks, col, width, height) {
  if (!Number.isInteger(col) || col < 0 || col + width > boardWidth) return null;
  const supports = columnHeights(blocks).slice(col, col + width);
  const row = Math.max(...supports);
  const steady = supports.every(level => level === row) ||
    (width === 3 && supports[0] === row && supports.at(-1) === row);
  return steady && row + height <= boardHeight ? row : null;
}

export function meetsGoal(blocks, goal) {
  const heights = columnHeights(blocks);
  if (goal === 'tower') return heights.some(height => height >= 3);
  if (goal === 'stairs') {
    return heights.some((height, column) => height === 1 && heights[column + 1] === 2 && heights[column + 2] === 3);
  }
  return blocks.some(block => {
    if (block.width !== 3 || block.row !== 1) return false;
    const underneath = blocks.filter(item => item !== block && item.row === 0 && item.height === 1);
    const lower = columnHeights(underneath);
    return lower[block.col] === 1 && lower[block.col + 1] === 0 && lower[block.col + 2] === 1;
  });
}

// Coordinates are fractions of the uncropped official episode frames.
export const poses = {
  hair: { camera: [.53, .19, .44, .67], zone: [.735, .26, .095, .12] },
  teeth: { camera: [.23, .18, .53, .82], zone: [.419, .66, .14, .155] },
  meal: { camera: [.49, .03, .51, .93], zone: [.677, .452, .11, .105],
    plate: [.55, .73, .20, .20], cup: [.819, .71, .17, .22] },
};

export const hairStages = [
  { kind: 'groom', action: 'comb', side: 'right', prompt: 'JOJO 的头发翘起来了。握住梳子，顺着发卷从上往下梳。', times: 2 },
  { kind: 'groom', action: 'comb', side: 'left', prompt: '给发卷另一侧顺一顺。沿着亮起的发卷向下梳。', times: 2 },
  { kind: 'groom', action: 'comb', side: 'all', prompt: '最后轻轻梳一下，让发卷发亮。', times: 1 },
];

export function inside(point, [x, y, width, height]) {
  return point[0] >= x && point[0] <= x + width && point[1] >= y && point[1] <= y + height;
}

export function validGesture(action, points, zone, source) {
  if (points.length < 2) return false;
  const start = points[0];
  const end = points.at(-1);
  if (source) return inside(start, source) && inside(end, zone);
  const path = points.filter(point => inside(point, zone));
  if (!inside(start, zone) || !inside(end, zone) || path.length < points.length * .72) return false;
  const axis = action === 'comb' ? 1 : 0;
  const travel = end[axis] - start[axis];
  return action === 'comb' ? travel >= zone[3] * .36 : Math.abs(travel) >= zone[2] * .39;
}
