export function tryFixEquationLeq(latex: string, debug: boolean = false): string {
  const out = latex.replace(/</g, '< ');
  if (debug && out !== latex) {
    console.log(`Fixed equation leq from: ${latex} to: ${out}`);
  }
  return out;
}
