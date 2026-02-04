export function tryFixEquationDoubleSubscript(latex: string, debug: boolean = false): string {
  const testPattern = /_\s*\{([^{}]|\{[^{}]*\})*\}\s*_\s*\{([^{}]|\{[^{}]*\})*\}/;
  if (!testPattern.test(latex)) {
    return latex;
  }
  const pattern = /_\s*\{([^{}]|\{[^{}]*\})*\}\s*_\s*\{([^{}]|\{[^{}]*\})*\}/g;
  const out = latex.replace(pattern, '');
  if (debug) {
    console.log(`Fixed equation double-subscript from: ${latex} to: ${out}`);
  }
  return out;
}
