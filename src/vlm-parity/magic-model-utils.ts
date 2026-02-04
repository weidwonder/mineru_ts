import { isIn, bboxDistance, bboxCenterDistance } from './boxbase';

export function reductOverlap<T extends { bbox: number[] }>(bboxes: T[]): T[] {
  const keep = bboxes.map(() => true);
  for (let i = 0; i < bboxes.length; i += 1) {
    for (let j = 0; j < bboxes.length; j += 1) {
      if (i === j) continue;
      if (isIn(bboxes[i].bbox, bboxes[j].bbox)) {
        keep[i] = false;
      }
    }
  }
  return bboxes.filter((_, idx) => keep[idx]);
}

export function tieUpCategoryByIndex(
  getSubjectsFunc: () => any[],
  getObjectsFunc: () => any[],
  extractSubjectFunc: (v: any) => any = (v) => v,
  extractObjectFunc: (v: any) => any = (v) => v
) {
  const subjects = getSubjectsFunc();
  const objects = getObjectsFunc();
  const result: Array<{ sub_bbox: any; obj_bboxes: any[]; sub_idx: number }> = [];

  subjects.forEach((sub, idx) => {
    result[idx] = {
      sub_bbox: extractSubjectFunc(sub),
      obj_bboxes: [],
      sub_idx: idx,
    };
  });

  for (const obj of objects) {
    if (subjects.length === 0) {
      continue;
    }
    const objIndex = obj.index;
    let minIndexDiff = Infinity;
    let bestSubjectIndices: number[] = [];

    subjects.forEach((sub, idx) => {
      const diff = Math.abs(sub.index - objIndex);
      if (diff < minIndexDiff) {
        minIndexDiff = diff;
        bestSubjectIndices = [idx];
      } else if (diff === minIndexDiff) {
        bestSubjectIndices.push(idx);
      }
    });

    let target = bestSubjectIndices[0];
    if (bestSubjectIndices.length > 1) {
      let minDist = Infinity;
      for (const idx of bestSubjectIndices) {
        const dist = bboxCenterDistance(subjects[idx].bbox, obj.bbox);
        if (dist < minDist) {
          minDist = dist;
          target = idx;
        }
      }
    }

    result[target].obj_bboxes.push(extractObjectFunc(obj));
  }

  return result;
}

export function tieUpCategoryByDistanceV3(
  getSubjectsFunc: () => any[],
  getObjectsFunc: () => any[],
  extractSubjectFunc: (v: any) => any = (v) => v,
  extractObjectFunc: (v: any) => any = (v) => v
) {
  const subjects = getSubjectsFunc();
  const objects = getObjectsFunc();

  const N = subjects.length;
  const OBJ_IDX_OFFSET = 10000;
  const SUB_BIT_KIND = 0;
  const OBJ_BIT_KIND = 1;

  const allBoxesWithIdx: Array<[number, number, number, number]> = [
    ...subjects.map((sub, i) => [i, SUB_BIT_KIND, sub.bbox[0], sub.bbox[1]] as [number, number, number, number]),
    ...objects.map((obj, i) => [i + OBJ_IDX_OFFSET, OBJ_BIT_KIND, obj.bbox[0], obj.bbox[1]] as [number, number, number, number]),
  ];

  const seenIdx = new Set<number>();
  const seenSubIdx = new Set<number>();
  const ret: Array<{ sub_bbox: any; obj_bboxes: any[]; sub_idx: number }> = [];

  while (N > seenSubIdx.size) {
    const candidates = allBoxesWithIdx.filter((v) => !seenIdx.has(v[0]));
    if (candidates.length === 0) {
      break;
    }

    const leftX = Math.min(...candidates.map((v) => v[2]));
    const topY = Math.min(...candidates.map((v) => v[3]));

    candidates.sort(
      (a, b) => (a[2] - leftX) ** 2 + (a[3] - topY) ** 2 - ((b[2] - leftX) ** 2 + (b[3] - topY) ** 2)
    );

    const [fstIdx, fstKind] = candidates[0];
    const fstBbox = fstKind === SUB_BIT_KIND ? subjects[fstIdx].bbox : objects[fstIdx - OBJ_IDX_OFFSET].bbox;

    candidates.sort((a, b) => {
      const abox = a[1] === SUB_BIT_KIND ? subjects[a[0]].bbox : objects[a[0] - OBJ_IDX_OFFSET].bbox;
      const bbox = b[1] === SUB_BIT_KIND ? subjects[b[0]].bbox : objects[b[0] - OBJ_IDX_OFFSET].bbox;
      return bboxDistance(fstBbox, abox) - bboxDistance(fstBbox, bbox);
    });

    let nxt: [number, number, number, number] | null = null;
    for (let i = 1; i < candidates.length; i += 1) {
      if ((candidates[i][1] ^ fstKind) === 1) {
        nxt = candidates[i];
        break;
      }
    }
    if (!nxt) {
      break;
    }

    let subIdx: number;
    let objIdx: number;
    if (fstKind === SUB_BIT_KIND) {
      subIdx = fstIdx;
      objIdx = nxt[0] - OBJ_IDX_OFFSET;
    } else {
      subIdx = nxt[0];
      objIdx = fstIdx - OBJ_IDX_OFFSET;
    }

    const pairDis = bboxDistance(subjects[subIdx].bbox, objects[objIdx].bbox);
    let nearestDis = Infinity;
    for (let i = 0; i < N; i += 1) {
      nearestDis = Math.min(nearestDis, bboxDistance(subjects[i].bbox, objects[objIdx].bbox));
    }

    if (pairDis >= 3 * nearestDis) {
      seenIdx.add(subIdx);
      continue;
    }

    seenIdx.add(subIdx);
    seenIdx.add(objIdx + OBJ_IDX_OFFSET);
    seenSubIdx.add(subIdx);

    ret.push({
      sub_bbox: extractSubjectFunc(subjects[subIdx]),
      obj_bboxes: [extractObjectFunc(objects[objIdx])],
      sub_idx: subIdx,
    });
  }

  for (let i = 0; i < objects.length; i += 1) {
    const j = i + OBJ_IDX_OFFSET;
    if (seenIdx.has(j)) continue;
    seenIdx.add(j);

    let nearestDis = Infinity;
    let nearestSubIdx = -1;
    for (let k = 0; k < subjects.length; k += 1) {
      const dist = bboxDistance(objects[i].bbox, subjects[k].bbox);
      if (dist < nearestDis) {
        nearestDis = dist;
        nearestSubIdx = k;
      }
    }

    for (let k = 0; k < subjects.length; k += 1) {
      if (k !== nearestSubIdx) continue;
      if (seenSubIdx.has(k)) {
        const target = ret.find((item) => item.sub_idx === k);
        if (target) {
          target.obj_bboxes.push(extractObjectFunc(objects[i]));
        }
      } else {
        ret.push({
          sub_bbox: extractSubjectFunc(subjects[k]),
          obj_bboxes: [extractObjectFunc(objects[i])],
          sub_idx: k,
        });
      }
      seenSubIdx.add(k);
      seenIdx.add(k);
    }
  }

  for (let i = 0; i < subjects.length; i += 1) {
    if (seenSubIdx.has(i)) continue;
    ret.push({
      sub_bbox: extractSubjectFunc(subjects[i]),
      obj_bboxes: [],
      sub_idx: i,
    });
  }

  return ret;
}
