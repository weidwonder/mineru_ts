export function tryFixEquationEqqcolon(latex: string, debug: boolean = false): string {
  let out = latex.replace(/\\eqqcolon/g, '=:' );
  out = out.replace(/\\coloneqq/g, ':=' );
  if (debug && out !== latex) {
    console.log(`Fixed equation eq-colon from: ${latex} to: ${out}`);
  }
  return out;
}
