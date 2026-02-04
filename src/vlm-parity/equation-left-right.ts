const VALID_LEFT_TOKEN_LIST = [
  '\\left\\lbrace',
  '\\left\\lVert',
  '\\left\\lvert',
  '\\left\\rvert',
  '\\left\\rVert',
  '\\left\\vert',
  '\\left\\Vert',
  '\\left\\lfloor',
  '\\left\\lbrack',
  '\\left\\langle',
  '\\left|',
  '\\left\\|',
  '\\left[',
  '\\left]',
  '\\left(',
  '\\left)',
  '\\left\\{',
  '\\left\\}',
  '\\left.',
  '\\left/',
];

const VALID_RIGHT_TOKEN_LIST = [
  '\\right\\rbrace',
  '\\right\\lVert',
  '\\right\\lvert',
  '\\right\\rvert',
  '\\right\\rVert',
  '\\right\\vert',
  '\\right\\Vert',
  '\\right\\rfloor',
  '\\right\\rbrack',
  '\\right\\rangle',
  '\\right|',
  '\\right\\|',
  '\\right]',
  '\\right[',
  '\\right)',
  '\\right(',
  '\\right\\}',
  '\\right\\{',
  '\\right.',
  '\\right/',
];

const LEFT_TOKEN_LIST = [
  '\\\\left\\\\lbrace',
  '\\\\left\\\\lVert',
  '\\\\left\\\\lvert',
  '\\\\left\\\\rvert',
  '\\\\left\\\\rVert',
  '\\\\left\\\\vert',
  '\\\\left\\\\Vert',
  '\\\\left\\\\lfloor',
  '\\\\left\\\\lbrack',
  '\\\\left\\\\langle',
  '\\\\left\\|',
  '\\\\left\\\\\\|',
  '\\\\left\\[',
  '\\\\left\\]',
  '\\\\left\\(',
  '\\\\left\\\\{',
  '\\\\left\\\\}',
  '\\\\left\\.',
];

const RIGHT_TOKEN_LIST = [
  '\\\\right\\\\rbrace',
  '\\\\right\\\\lVert',
  '\\\\right\\\\lvert',
  '\\\\right\\\\rvert',
  '\\\\right\\\\rVert',
  '\\\\right\\\\vert',
  '\\\\right\\\\Vert',
  '\\\\right\\\\rfloor',
  '\\\\right\\\\rbrack',
  '\\\\right\\\\rangle',
  '\\\\right\\|',
  '\\\\right\\\\\\|',
  '\\\\right\\]',
  '\\\\right\\[',
  '\\\\right\\)',
  '\\\\right\\}',
  '\\\\right\\{',
  '\\\\right\\.',
];

function countLeft(latex: string): number {
  const pattern = LEFT_TOKEN_LIST.join('|');
  const matches = latex.match(new RegExp(pattern, 'g'));
  return matches ? matches.length : 0;
}

function countRight(latex: string): number {
  const pattern = RIGHT_TOKEN_LIST.join('|');
  const matches = latex.match(new RegExp(pattern, 'g'));
  return matches ? matches.length : 0;
}

function checkLeftRight(latex: string): boolean {
  return countLeft(latex) === countRight(latex);
}

function checkAlign(latex: string): boolean {
  const beginCount = latex.split('\\begin{array}').length - 1;
  const endCount = latex.split('\\end{array}').length - 1;
  return beginCount === endCount;
}

function splitWithDelimiters(s: string): string[] {
  const pattern = /(&|\\\\|\\begin\{array\}\s*\{[a-zA-Z\s]*\}|\\end\{array\})/;
  return s.split(pattern);
}

function splitWithLeftRight(s: string): string[] {
  const pattern = LEFT_TOKEN_LIST.concat(RIGHT_TOKEN_LIST).join('|');
  return s.split(new RegExp(`(${pattern})`));
}

function tagArray(nodeList: string[]): Array<[number, number, number, number[]]> {
  const nodeStack: Array<[number, number]> = [];
  const arrayList: Array<[number, number, number, number[]]> = [];
  let arrayTag = 0;

  for (let nodeIdx = 0; nodeIdx < nodeList.length; nodeIdx += 1) {
    const node = nodeList[nodeIdx];
    if (node.includes('\\begin{array}')) {
      arrayTag += 1;
      nodeStack.push([arrayTag, nodeIdx]);
    } else if (node === '\\end{array}') {
      const last = nodeStack.pop();
      if (!last) {
        continue;
      }
      const [tag, nodeIdxStart] = last;
      const nodeIdxEnd = nodeIdx;
      arrayList.push([tag, nodeIdxStart, nodeIdxEnd, []]);
    }
  }

  for (let i = 0; i < arrayList.length; i += 1) {
    const arr1 = arrayList[i];
    const contain: number[] = [];
    for (let j = 0; j < arrayList.length; j += 1) {
      if (i === j) {
        continue;
      }
      const arr2 = arrayList[j];
      if (arr1[1] < arr2[1] && arr1[2] > arr2[2]) {
        contain.push(arr2[0]);
      }
    }
    arr1[3] = contain;
  }

  return arrayList;
}

function tagElement(
  nodeList: string[],
  arrayList: Array<[number, number, number, number[]]>
): Array<[number, number] | null> {
  if (arrayList.length === 0) {
    return [null];
  }

  const tag2arr = new Map<number, [number, number, number, number[]]>();
  for (const arr of arrayList) {
    tag2arr.set(arr[0], arr);
  }

  const nodeTagAllArr: Array<Array<[number, number] | null>> = [];

  for (let arrIdx = 0; arrIdx < arrayList.length; arrIdx += 1) {
    const containArrTag = arrayList[arrIdx][3];
    const nodeListCurArr: Array<string | null> = nodeList.slice();
    const nodeTagCurArr: Array<[number, number] | null> = new Array(nodeList.length).fill(null);

    for (const arrTag of containArrTag) {
      const arr = tag2arr.get(arrTag);
      if (!arr) {
        continue;
      }
      for (let idx = arr[1]; idx <= arr[2]; idx += 1) {
        nodeListCurArr[idx] = null;
      }
    }

    for (let idx = 0; idx < nodeListCurArr.length; idx += 1) {
      if (idx < arrayList[arrIdx][1] || idx > arrayList[arrIdx][2]) {
        nodeListCurArr[idx] = null;
      }
    }

    let elementIdx = 0;
    for (let nodeIdx = 0; nodeIdx < nodeListCurArr.length; nodeIdx += 1) {
      const node = nodeListCurArr[nodeIdx];
      if (node === '&' || node === '\\\\') {
        elementIdx += 1;
      } else if (node === null) {
        continue;
      } else {
        nodeTagCurArr[nodeIdx] = [arrayList[arrIdx][0], elementIdx];
      }
    }

    nodeTagAllArr.push(nodeTagCurArr);
  }

  const nodeTagList: Array<[number, number] | null> = [];
  for (let i = 0; i < nodeTagAllArr[0].length; i += 1) {
    let found: [number, number] | null = null;
    for (const lst of nodeTagAllArr) {
      if (lst[i] !== null) {
        found = lst[i];
        break;
      }
    }
    nodeTagList.push(found);
  }

  return nodeTagList;
}

function isPairLeftRight(tokenL: string, tokenR: string): boolean {
  if ((tokenL === '\\left\\lbrace' || tokenL === '\\left.') && (tokenR === '\\right\\rbrace' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\lVert' || tokenL === '\\left.') && (tokenR === '\\right\\lVert' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\lvert' || tokenL === '\\left.') && (tokenR === '\\right\\lvert' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\vert' || tokenL === '\\left.') && (tokenR === '\\right\\vert' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\Vert' || tokenL === '\\left.') && (tokenR === '\\right\\Vert' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\lfloor' || tokenL === '\\left.') && (tokenR === '\\right\\rfloor' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\lbrack' || tokenL === '\\left.') && (tokenR === '\\right\\rbrack' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\langle' || tokenL === '\\left.') && (tokenR === '\\right\\rangle' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left|' || tokenL === '\\left.') && (tokenR === '\\right|' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\|' || tokenL === '\\left.') && (tokenR === '\\right\\|' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left[' || tokenL === '\\left.') && (tokenR === '\\right]' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left]' || tokenL === '\\left.') && (tokenR === '\\right[' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left(' || tokenL === '\\left.') && (tokenR === '\\right)' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left)' || tokenL === '\\left.') && (tokenR === '\\right(' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\{' || tokenL === '\\left.') && (tokenR === '\\right\\}' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left\\}' || tokenL === '\\left.') && (tokenR === '\\right\\{' || tokenR === '\\right.')) {
    return true;
  }
  if ((tokenL === '\\left/' || tokenL === '\\left.') && (tokenR === '\\right/' || tokenR === '\\right.')) {
    return true;
  }
  return false;
}

function leftRightMatch(spanList: string[][]): [string[], Array<[number, number]>] {
  const lrStack: string[] = [];
  const lrIdxStack: Array<[number, number]> = [];

  for (let subSpanIdx = 0; subSpanIdx < spanList.length; subSpanIdx += 1) {
    const subSpan = spanList[subSpanIdx];
    for (let tokenIdx = 0; tokenIdx < subSpan.length; tokenIdx += 1) {
      const token = subSpan[tokenIdx];
      if (!VALID_LEFT_TOKEN_LIST.includes(token) && !VALID_RIGHT_TOKEN_LIST.includes(token)) {
        continue;
      }
      if (lrStack.length === 0 && lrIdxStack.length === 0) {
        lrStack.push(token);
        lrIdxStack.push([subSpanIdx, tokenIdx]);
      } else if (isPairLeftRight(lrStack[lrStack.length - 1], token)) {
        lrStack.pop();
        lrIdxStack.pop();
      } else {
        lrStack.push(token);
        lrIdxStack.push([subSpanIdx, tokenIdx]);
      }
    }
  }

  return [lrStack, lrIdxStack];
}

function cleanSpan(nodeList: string[], nodeTagList: Array<[number, number] | null>): string[] {
  const nodeListNew = nodeList.slice();
  const spanAll: Array<[number, number] | null> = [];
  const validSpanIdx: number[] = [];

  for (let idx = 0; idx < nodeTagList.length; idx += 1) {
    const node = nodeList[idx];
    if (node !== '&' && node !== '\\\\' && !node.includes('\\begin{array}') && !node.includes('\\end{array}')) {
      spanAll.push(nodeTagList[idx]);
      validSpanIdx.push(idx);
    }
  }

  const spanKeySet = new Set<string>();
  const spanKeyList: string[] = [];
  const spanKeyMap = new Map<string, [number, number] | null>();

  for (const span of spanAll) {
    const key = span ? `${span[0]}:${span[1]}` : 'null';
    if (!spanKeySet.has(key)) {
      spanKeySet.add(key);
      spanKeyList.push(key);
      spanKeyMap.set(key, span);
    }
  }

  for (const key of spanKeyList) {
    const span = spanKeyMap.get(key) ?? null;
    const sameSpanIdx = validSpanIdx.filter((idx) => {
      const item = nodeTagList[idx];
      const itemKey = item ? `${item[0]}:${item[1]}` : 'null';
      return itemKey === key;
    });

    const spanListNodes = sameSpanIdx.map((idx) => nodeList[idx]);
    const numLeft = spanListNodes.reduce((sum, item) => sum + countLeft(item), 0);
    const numRight = spanListNodes.reduce((sum, item) => sum + countRight(item), 0);

    if (numLeft !== numRight) {
      const spanListFixed: string[][] = [];
      for (const spanItem of spanListNodes) {
        const spanSplitted = splitWithLeftRight(spanItem).filter((s) => s.trim().length > 0);
        spanListFixed.push(spanSplitted);
      }

      const [lrStack, lrIdxStack] = leftRightMatch(spanListFixed);
      for (let i = 0; i < lrStack.length; i += 1) {
        const lr = lrStack[i];
        const lrIdx = lrIdxStack[i];
        if (lr.includes('\\left')) {
          spanListFixed[lrIdx[0]][lrIdx[1]] = `${spanListFixed[lrIdx[0]][lrIdx[1]]} \\right.`;
        } else if (lr.includes('\\right')) {
          spanListFixed[lrIdx[0]][lrIdx[1]] = `\\left. ${spanListFixed[lrIdx[0]][lrIdx[1]]}`;
        }
      }

      const spanListJoined = spanListFixed.map((items) => items.join(''));
      for (let idx = 0; idx < sameSpanIdx.length; idx += 1) {
        nodeListNew[sameSpanIdx[idx]] = spanListJoined[idx];
      }
    }
  }

  return nodeListNew;
}

function fixLeftRightMismatch(latex: string): string {
  let nodeList = splitWithDelimiters(latex.trim());
  nodeList = nodeList.map((node) => node.trim()).filter((node) => node.length > 0);
  let arrayList = tagArray(nodeList);
  arrayList = arrayList.sort((a, b) => b[3].length - a[3].length);
  const nodeTagList = tagElement(nodeList, arrayList);
  const nodeListNew = cleanSpan(nodeList, nodeTagList);
  const fixedLatex = nodeListNew.join('');
  return fixedLatex;
}

export function tryMatchEquationLeftRight(latex: string, debug: boolean = false): string {
  if (checkLeftRight(latex)) {
    return latex;
  }

  if (!checkAlign(latex)) {
    return latex;
  }

  const fixedLatex = fixLeftRightMismatch(latex);

  if (debug) {
    console.log(`Trying to fix left-right mismatch in equation: ${latex}`);
    console.log(`Fixed equation: ${fixedLatex}`);
  }

  return fixedLatex;
}
