import { tryMatchEquationLeftRight } from './equation-left-right';
import { tryFixEquationDoubleSubscript } from './equation-double-subscript';
import { tryFixEquationEqqcolon } from './equation-fix-eqqcolon';
import { tryFixEquationBig } from './equation-big';
import { tryFixEquationLeq } from './equation-leq';
import { tryFixUnbalancedBraces } from './equation-unbalanced-braces';

export function processEquation(content: string, debug: boolean = false): string {
  let out = content;
  out = tryMatchEquationLeftRight(out, debug);
  out = tryFixEquationDoubleSubscript(out, debug);
  out = tryFixEquationEqqcolon(out, debug);
  out = tryFixEquationBig(out, debug);
  out = tryFixEquationLeq(out, debug);
  out = tryFixUnbalancedBraces(out, debug);
  return out;
}
