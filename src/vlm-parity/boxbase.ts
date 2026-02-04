export function isIn(box1: number[], box2: number[]): boolean {
  const [x0, y0, x1, y1] = box1;
  const [a0, b0, a1, b1] = box2;
  return x0 >= a0 && y0 >= b0 && x1 <= a1 && y1 <= b1;
}

function bboxRelativePos(b1: number[], b2: number[]): [boolean, boolean, boolean, boolean] {
  const [x1, y1, x1b, y1b] = b1;
  const [x2, y2, x2b, y2b] = b2;
  const left = x2b < x1;
  const right = x1b < x2;
  const bottom = y2b < y1;
  const top = y1b < y2;
  return [left, right, bottom, top];
}

export function bboxDistance(b1: number[], b2: number[]): number {
  const [x1, y1, x1b, y1b] = b1;
  const [x2, y2, x2b, y2b] = b2;
  const [left, right, bottom, top] = bboxRelativePos(b1, b2);
  const dist = (p1: number[], p2: number[]) => Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
  if (top && left) return dist([x1, y1b], [x2b, y2]);
  if (left && bottom) return dist([x1, y1], [x2b, y2b]);
  if (bottom && right) return dist([x1b, y1], [x2, y2b]);
  if (right && top) return dist([x1b, y1b], [x2, y2]);
  if (left) return x1 - x2b;
  if (right) return x2 - x1b;
  if (bottom) return y1 - y2b;
  if (top) return y2 - y1b;
  return 0.0;
}

export function bboxCenterDistance(b1: number[], b2: number[]): number {
  const [x1, y1, x1b, y1b] = b1;
  const [x2, y2, x2b, y2b] = b2;
  const c1x = (x1 + x1b) / 2;
  const c1y = (y1 + y1b) / 2;
  const c2x = (x2 + x2b) / 2;
  const c2y = (y2 + y2b) / 2;
  return Math.hypot(c1x - c2x, c1y - c2y);
}

export function calculateOverlapAreaInBbox1AreaRatio(
  bbox1: number[],
  bbox2: number[]
): number {
  const xLeft = Math.max(bbox1[0], bbox2[0]);
  const yTop = Math.max(bbox1[1], bbox2[1]);
  const xRight = Math.min(bbox1[2], bbox2[2]);
  const yBottom = Math.min(bbox1[3], bbox2[3]);

  if (xRight < xLeft || yBottom < yTop) {
    return 0.0;
  }

  const interArea = (xRight - xLeft) * (yBottom - yTop);
  const area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1]);
  if (area1 === 0) {
    return 0;
  }
  return interArea / area1;
}
