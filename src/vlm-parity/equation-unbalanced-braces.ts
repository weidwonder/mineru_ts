export function tryFixUnbalancedBraces(latexFormula: string, debug: boolean = false): string {
  const stack: number[] = [];
  const unmatched = new Set<number>();
  let i = 0;

  while (i < latexFormula.length) {
    const ch = latexFormula[i];
    if (ch === '{' || ch === '}') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && latexFormula[j] === '\\') {
        backslashCount += 1;
        j -= 1;
      }

      if (backslashCount % 2 === 1) {
        i += 1;
        continue;
      }

      if (ch === '{') {
        stack.push(i);
      } else if (stack.length > 0) {
        stack.pop();
      } else {
        unmatched.add(i);
      }
    }
    i += 1;
  }

  for (const idx of stack) {
    unmatched.add(idx);
  }

  let out = '';
  for (let idx = 0; idx < latexFormula.length; idx += 1) {
    if (!unmatched.has(idx)) {
      out += latexFormula[idx];
    }
  }

  if (debug && out !== latexFormula) {
    console.log(`Fixed equation braces from: ${latexFormula} to: ${out}`);
  }

  return out;
}
