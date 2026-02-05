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

const REPLACEMENTS: Array<[RegExp, string]> = [
  [new RegExp("\\\\big{\\)}", 'g'), "\\\\big)"],
  [new RegExp("\\\\big{\\(}", 'g'), "\\\\big("],
  [new RegExp("\\\\big {\\)}", 'g'), "\\\\big)"],
  [new RegExp("\\\\big {\\(}", 'g'), "\\\\big("],
  [new RegExp("\\\\bigr{\\)}", 'g'), "\\\\bigr)"],
  [new RegExp("\\\\bigr{\\(}", 'g'), "\\\\bigr("],
  [new RegExp("\\\\bigr {\\)}", 'g'), "\\\\bigr)"],
  [new RegExp("\\\\bigr {\\(}", 'g'), "\\\\bigr("],
  [new RegExp("\\\\bigm{\\)}", 'g'), "\\\\bigm)"],
  [new RegExp("\\\\bigm{\\(}", 'g'), "\\\\bigm("],
  [new RegExp("\\\\bigm {\\)}", 'g'), "\\\\bigm)"],
  [new RegExp("\\\\bigm {\\(}", 'g'), "\\\\bigm("],
  [new RegExp("\\\\bigl{\\)}", 'g'), "\\\\bigl)"],
  [new RegExp("\\\\bigl{\\(}", 'g'), "\\\\bigl("],
  [new RegExp("\\\\bigl {\\)}", 'g'), "\\\\bigl)"],
  [new RegExp("\\\\bigl {\\(}", 'g'), "\\\\bigl("],
  [new RegExp("\\\\bigg{\\)}", 'g'), "\\\\bigg)"],
  [new RegExp("\\\\bigg{\\(}", 'g'), "\\\\bigg("],
  [new RegExp("\\\\bigg {\\)}", 'g'), "\\\\bigg)"],
  [new RegExp("\\\\bigg {\\(}", 'g'), "\\\\bigg("],
  [new RegExp("\\\\biggr{\\)}", 'g'), "\\\\biggr)"],
  [new RegExp("\\\\biggr{\\(}", 'g'), "\\\\biggr("],
  [new RegExp("\\\\biggr {\\)}", 'g'), "\\\\biggr)"],
  [new RegExp("\\\\biggr {\\(}", 'g'), "\\\\biggr("],
  [new RegExp("\\\\biggm{\\)}", 'g'), "\\\\biggm)"],
  [new RegExp("\\\\biggm{\\(}", 'g'), "\\\\biggm("],
  [new RegExp("\\\\biggm {\\)}", 'g'), "\\\\biggm)"],
  [new RegExp("\\\\biggm {\\(}", 'g'), "\\\\biggm("],
  [new RegExp("\\\\biggl{\\)}", 'g'), "\\\\biggl)"],
  [new RegExp("\\\\biggl{\\(}", 'g'), "\\\\biggl("],
  [new RegExp("\\\\biggl {\\)}", 'g'), "\\\\biggl)"],
  [new RegExp("\\\\biggl {\\(}", 'g'), "\\\\biggl("],
  [new RegExp("\\\\Big{\\)}", 'g'), "\\\\Big)"],
  [new RegExp("\\\\Big{\\(}", 'g'), "\\\\Big("],
  [new RegExp("\\\\Big {\\)}", 'g'), "\\\\Big)"],
  [new RegExp("\\\\Big {\\(}", 'g'), "\\\\Big("],
  [new RegExp("\\\\Bigr{\\)}", 'g'), "\\\\Bigr)"],
  [new RegExp("\\\\Bigr{\\(}", 'g'), "\\\\Bigr("],
  [new RegExp("\\\\Bigr {\\)}", 'g'), "\\\\Bigr)"],
  [new RegExp("\\\\Bigr {\\(}", 'g'), "\\\\Bigr("],
  [new RegExp("\\\\Bigm{\\)}", 'g'), "\\\\Bigm)"],
  [new RegExp("\\\\Bigm{\\(}", 'g'), "\\\\Bigm("],
  [new RegExp("\\\\Bigm {\\)}", 'g'), "\\\\Bigm)"],
  [new RegExp("\\\\Bigm {\\(}", 'g'), "\\\\Bigm("],
  [new RegExp("\\\\Bigl{\\)}", 'g'), "\\\\Bigl)"],
  [new RegExp("\\\\Bigl{\\(}", 'g'), "\\\\Bigl("],
  [new RegExp("\\\\Bigl {\\)}", 'g'), "\\\\Bigl)"],
  [new RegExp("\\\\Bigl {\\(}", 'g'), "\\\\Bigl("],
  [new RegExp("\\\\Bigg{\\)}", 'g'), "\\\\Bigg)"],
  [new RegExp("\\\\Bigg{\\(}", 'g'), "\\\\Bigg("],
  [new RegExp("\\\\Bigg {\\)}", 'g'), "\\\\Bigg)"],
  [new RegExp("\\\\Bigg {\\(}", 'g'), "\\\\Bigg("],
  [new RegExp("\\\\Biggr{\\)}", 'g'), "\\\\Biggr)"],
  [new RegExp("\\\\Biggr{\\(}", 'g'), "\\\\Biggr("],
  [new RegExp("\\\\Biggr {\\)}", 'g'), "\\\\Biggr)"],
  [new RegExp("\\\\Biggr {\\(}", 'g'), "\\\\Biggr("],
  [new RegExp("\\\\Biggm{\\)}", 'g'), "\\\\Biggm)"],
  [new RegExp("\\\\Biggm{\\(}", 'g'), "\\\\Biggm("],
  [new RegExp("\\\\Biggm {\\)}", 'g'), "\\\\Biggm)"],
  [new RegExp("\\\\Biggm {\\(}", 'g'), "\\\\Biggm("],
  [new RegExp("\\\\Biggl{\\)}", 'g'), "\\\\Biggl)"],
  [new RegExp("\\\\Biggl{\\(}", 'g'), "\\\\Biggl("],
  [new RegExp("\\\\Biggl {\\)}", 'g'), "\\\\Biggl)"],
  [new RegExp("\\\\Biggl {\\(}", 'g'), "\\\\Biggl("],
  [new RegExp("\\\\big\\{\\\\\\}\\}", 'g'), "\\\\big\\\\}"],
  [new RegExp("\\\\big\\{\\\\\\{\\}", 'g'), "\\\\big\\\\{"],
  [new RegExp("\\\\big \\{\\\\\\}\\}", 'g'), "\\\\big\\\\}"],
  [new RegExp("\\\\big \\{\\\\\\{\\}", 'g'), "\\\\big\\\\{"],
  [new RegExp("\\\\bigr\\{\\\\\\}\\}", 'g'), "\\\\bigr\\\\}"],
  [new RegExp("\\\\bigr\\{\\\\\\{\\}", 'g'), "\\\\bigr\\\\{"],
  [new RegExp("\\\\bigr \\{\\\\\\}\\}", 'g'), "\\\\bigr\\\\}"],
  [new RegExp("\\\\bigr \\{\\\\\\{\\}", 'g'), "\\\\bigr\\\\{"],
  [new RegExp("\\\\bigm\\{\\\\\\}\\}", 'g'), "\\\\bigm\\\\}"],
  [new RegExp("\\\\bigm\\{\\\\\\{\\}", 'g'), "\\\\bigm\\\\{"],
  [new RegExp("\\\\bigm \\{\\\\\\}\\}", 'g'), "\\\\bigm\\\\}"],
  [new RegExp("\\\\bigm \\{\\\\\\{\\}", 'g'), "\\\\bigm\\\\{"],
  [new RegExp("\\\\bigl\\{\\\\\\}\\}", 'g'), "\\\\bigl\\\\}"],
  [new RegExp("\\\\bigl\\{\\\\\\{\\}", 'g'), "\\\\bigl\\\\{"],
  [new RegExp("\\\\bigl \\{\\\\\\}\\}", 'g'), "\\\\bigl\\\\}"],
  [new RegExp("\\\\bigl \\{\\\\\\{\\}", 'g'), "\\\\bigl\\\\{"],
  [new RegExp("\\\\bigg\\{\\\\\\}\\}", 'g'), "\\\\bigg\\\\}"],
  [new RegExp("\\\\bigg\\{\\\\\\{\\}", 'g'), "\\\\bigg\\\\{"],
  [new RegExp("\\\\bigg \\{\\\\\\}\\}", 'g'), "\\\\bigg\\\\}"],
  [new RegExp("\\\\bigg \\{\\\\\\{\\}", 'g'), "\\\\bigg\\\\{"],
  [new RegExp("\\\\biggr\\{\\\\\\}\\}", 'g'), "\\\\biggr\\\\}"],
  [new RegExp("\\\\biggr\\{\\\\\\{\\}", 'g'), "\\\\biggr\\\\{"],
  [new RegExp("\\\\biggr \\{\\\\\\}\\}", 'g'), "\\\\biggr\\\\}"],
  [new RegExp("\\\\biggr \\{\\\\\\{\\}", 'g'), "\\\\biggr\\\\{"],
  [new RegExp("\\\\biggm\\{\\\\\\}\\}", 'g'), "\\\\biggm\\\\}"],
  [new RegExp("\\\\biggm\\{\\\\\\{\\}", 'g'), "\\\\biggm\\\\{"],
  [new RegExp("\\\\biggm \\{\\\\\\}\\}", 'g'), "\\\\biggm\\\\}"],
  [new RegExp("\\\\biggm \\{\\\\\\{\\}", 'g'), "\\\\biggm\\\\{"],
  [new RegExp("\\\\biggl\\{\\\\\\}\\}", 'g'), "\\\\biggl\\\\}"],
  [new RegExp("\\\\biggl\\{\\\\\\{\\}", 'g'), "\\\\biggl\\\\{"],
  [new RegExp("\\\\biggl \\{\\\\\\}\\}", 'g'), "\\\\biggl\\\\}"],
  [new RegExp("\\\\biggl \\{\\\\\\{\\}", 'g'), "\\\\biggl\\\\{"],
  [new RegExp("\\\\Big\\{\\\\\\}\\}", 'g'), "\\\\Big\\\\}"],
  [new RegExp("\\\\Big\\{\\\\\\{\\}", 'g'), "\\\\Big\\\\{"],
  [new RegExp("\\\\Big \\{\\\\\\}\\}", 'g'), "\\\\Big\\\\}"],
  [new RegExp("\\\\Big \\{\\\\\\{\\}", 'g'), "\\\\Big\\\\{"],
  [new RegExp("\\\\Bigr\\{\\\\\\}\\}", 'g'), "\\\\Bigr\\\\}"],
  [new RegExp("\\\\Bigr\\{\\\\\\{\\}", 'g'), "\\\\Bigr\\\\{"],
  [new RegExp("\\\\Bigr \\{\\\\\\}\\}", 'g'), "\\\\Bigr\\\\}"],
  [new RegExp("\\\\Bigr \\{\\\\\\{\\}", 'g'), "\\\\Bigr\\\\{"],
  [new RegExp("\\\\Bigm\\{\\\\\\}\\}", 'g'), "\\\\Bigm\\\\}"],
  [new RegExp("\\\\Bigm\\{\\\\\\{\\}", 'g'), "\\\\Bigm\\\\{"],
  [new RegExp("\\\\Bigm \\{\\\\\\}\\}", 'g'), "\\\\Bigm\\\\}"],
  [new RegExp("\\\\Bigm \\{\\\\\\{\\}", 'g'), "\\\\Bigm\\\\{"],
  [new RegExp("\\\\Bigl\\{\\\\\\}\\}", 'g'), "\\\\Bigl\\\\}"],
  [new RegExp("\\\\Bigl\\{\\\\\\{\\}", 'g'), "\\\\Bigl\\\\{"],
  [new RegExp("\\\\Bigl \\{\\\\\\}\\}", 'g'), "\\\\Bigl\\\\}"],
  [new RegExp("\\\\Bigl \\{\\\\\\{\\}", 'g'), "\\\\Bigl\\\\{"],
  [new RegExp("\\\\Bigg\\{\\\\\\}\\}", 'g'), "\\\\Bigg\\\\}"],
  [new RegExp("\\\\Bigg\\{\\\\\\{\\}", 'g'), "\\\\Bigg\\\\{"],
  [new RegExp("\\\\Bigg \\{\\\\\\}\\}", 'g'), "\\\\Bigg\\\\}"],
  [new RegExp("\\\\Bigg \\{\\\\\\{\\}", 'g'), "\\\\Bigg\\\\{"],
  [new RegExp("\\\\Biggr\\{\\\\\\}\\}", 'g'), "\\\\Biggr\\\\}"],
  [new RegExp("\\\\Biggr\\{\\\\\\{\\}", 'g'), "\\\\Biggr\\\\{"],
  [new RegExp("\\\\Biggr \\{\\\\\\}\\}", 'g'), "\\\\Biggr\\\\}"],
  [new RegExp("\\\\Biggr \\{\\\\\\{\\}", 'g'), "\\\\Biggr\\\\{"],
  [new RegExp("\\\\Biggl\\{\\\\\\}\\}", 'g'), "\\\\Biggl\\\\}"],
  [new RegExp("\\\\Biggl\\{\\\\\\{\\}", 'g'), "\\\\Biggl\\\\{"],
  [new RegExp("\\\\Biggl \\{\\\\\\}\\}", 'g'), "\\\\Biggl\\\\}"],
  [new RegExp("\\\\Biggl \\{\\\\\\{\\}", 'g'), "\\\\Biggl\\\\{"],
  [new RegExp("\\\\big\\{\\|\\}", 'g'), "\\\\big|"],
  [new RegExp("\\\\Big\\{\\|\\}", 'g'), "\\\\Big|"],
  [new RegExp("\\\\big \\{\\|\\}", 'g'), "\\\\big|"],
  [new RegExp("\\\\Big \\{\\|\\}", 'g'), "\\\\Big|"],
  [new RegExp("\\\\bigm\\{\\|\\}", 'g'), "\\\\bigm|"],
  [new RegExp("\\\\Bigm\\{\\|\\}", 'g'), "\\\\Bigm|"],
  [new RegExp("\\\\bigm \\{\\|\\}", 'g'), "\\\\bigm|"],
  [new RegExp("\\\\Bigm \\{\\|\\}", 'g'), "\\\\Bigm|"],
  [new RegExp("\\\\bigr\\{\\|\\}", 'g'), "\\\\bigr|"],
  [new RegExp("\\\\Bigr\\{\\|\\}", 'g'), "\\\\Bigr|"],
  [new RegExp("\\\\bigr \\{\\|\\}", 'g'), "\\\\bigr|"],
  [new RegExp("\\\\Bigr \\{\\|\\}", 'g'), "\\\\Bigr|"],
  [new RegExp("\\\\bigl\\{\\|\\}", 'g'), "\\\\bigl|"],
  [new RegExp("\\\\Bigl\\{\\|\\}", 'g'), "\\\\Bigl|"],
  [new RegExp("\\\\bigl \\{\\|\\}", 'g'), "\\\\bigl|"],
  [new RegExp("\\\\Bigl \\{\\|\\}", 'g'), "\\\\Bigl|"],
  [new RegExp("\\\\bigg\\{\\|\\}", 'g'), "\\\\bigg|"],
  [new RegExp("\\\\Bigg\\{\\|\\}", 'g'), "\\\\Bigg|"],
  [new RegExp("\\\\bigg \\{\\|\\}", 'g'), "\\\\bigg|"],
  [new RegExp("\\\\Bigg \\{\\|\\}", 'g'), "\\\\Bigg|"],
  [new RegExp("\\\\biggr\\{\\|\\}", 'g'), "\\\\biggr|"],
  [new RegExp("\\\\Biggr\\{\\|\\}", 'g'), "\\\\Biggr|"],
  [new RegExp("\\\\biggr \\{\\|\\}", 'g'), "\\\\biggr|"],
  [new RegExp("\\\\Biggr \\{\\|\\}", 'g'), "\\\\Biggr|"],
  [new RegExp("\\\\biggm\\{\\|\\}", 'g'), "\\\\biggm|"],
  [new RegExp("\\\\Biggm\\{\\|\\}", 'g'), "\\\\Biggm|"],
  [new RegExp("\\\\biggm \\{\\|\\}", 'g'), "\\\\biggm|"],
  [new RegExp("\\\\Biggm \\{\\|\\}", 'g'), "\\\\Biggm|"],
  [new RegExp("\\\\biggl\\{\\|\\}", 'g'), "\\\\biggl|"],
  [new RegExp("\\\\Biggl\\{\\|\\}", 'g'), "\\\\Biggl|"],
  [new RegExp("\\\\biggl \\{\\|\\}", 'g'), "\\\\biggl|"],
  [new RegExp("\\\\Biggl \\{\\|\\}", 'g'), "\\\\Biggl|"],
  [new RegExp("\\\\big\\{\\\\\\|\\}", 'g'), "\\\\big\\\\|"],
  [new RegExp("\\\\Big\\{\\\\\\|\\}", 'g'), "\\\\Big\\\\|"],
  [new RegExp("\\\\big \\{\\\\\\|\\}", 'g'), "\\\\big\\\\|"],
  [new RegExp("\\\\Big \\{\\\\\\|\\}", 'g'), "\\\\Big\\\\|"],
  [new RegExp("\\\\bigm\\{\\\\\\|\\}", 'g'), "\\\\bigm\\\\|"],
  [new RegExp("\\\\Bigm\\{\\\\\\|\\}", 'g'), "\\\\Bigm\\\\|"],
  [new RegExp("\\\\bigm \\{\\\\\\|\\}", 'g'), "\\\\bigm\\\\|"],
  [new RegExp("\\\\Bigm \\{\\\\\\|\\}", 'g'), "\\\\Bigm\\\\|"],
  [new RegExp("\\\\bigr\\{\\\\\\|\\}", 'g'), "\\\\bigr\\\\|"],
  [new RegExp("\\\\Bigr\\{\\\\\\|\\}", 'g'), "\\\\Bigr\\\\|"],
  [new RegExp("\\\\bigr \\{\\\\\\|\\}", 'g'), "\\\\bigr\\\\|"],
  [new RegExp("\\\\Bigr \\{\\\\\\|\\}", 'g'), "\\\\Bigr\\\\|"],
  [new RegExp("\\\\bigl\\{\\\\\\|\\}", 'g'), "\\\\bigl\\\\|"],
  [new RegExp("\\\\Bigl\\{\\\\\\|\\}", 'g'), "\\\\Bigl\\\\|"],
  [new RegExp("\\\\bigl \\{\\\\\\|\\}", 'g'), "\\\\bigl\\\\|"],
  [new RegExp("\\\\Bigl \\{\\\\\\|\\}", 'g'), "\\\\Bigl\\\\|"],
  [new RegExp("\\\\bigg\\{\\\\\\|\\}", 'g'), "\\\\bigg\\\\|"],
  [new RegExp("\\\\Bigg\\{\\\\\\|\\}", 'g'), "\\\\Bigg\\\\|"],
  [new RegExp("\\\\bigg \\{\\\\\\|\\}", 'g'), "\\\\bigg\\\\|"],
  [new RegExp("\\\\Bigg \\{\\\\\\|\\}", 'g'), "\\\\Bigg\\\\|"],
  [new RegExp("\\\\biggr\\{\\\\\\|\\}", 'g'), "\\\\biggr\\\\|"],
  [new RegExp("\\\\Biggr\\{\\\\\\|\\}", 'g'), "\\\\Biggr\\\\|"],
  [new RegExp("\\\\biggr \\{\\\\\\|\\}", 'g'), "\\\\biggr\\\\|"],
  [new RegExp("\\\\Biggr \\{\\\\\\|\\}", 'g'), "\\\\Biggr\\\\|"],
  [new RegExp("\\\\biggm\\{\\\\\\|\\}", 'g'), "\\\\biggm\\\\|"],
  [new RegExp("\\\\Biggm\\{\\\\\\|\\}", 'g'), "\\\\Biggm\\\\|"],
  [new RegExp("\\\\biggm \\{\\\\\\|\\}", 'g'), "\\\\biggm\\\\|"],
  [new RegExp("\\\\Biggm \\{\\\\\\|\\}", 'g'), "\\\\Biggm\\\\|"],
  [new RegExp("\\\\biggl\\{\\\\\\|\\}", 'g'), "\\\\biggl\\\\|"],
  [new RegExp("\\\\Biggl\\{\\\\\\|\\}", 'g'), "\\\\Biggl\\\\|"],
  [new RegExp("\\\\biggl \\{\\\\\\|\\}", 'g'), "\\\\biggl\\\\|"],
  [new RegExp("\\\\Biggl \\{\\\\\\|\\}", 'g'), "\\\\Biggl\\\\|"],
  [new RegExp("\\\\big\\{\\]\\}", 'g'), "\\\\big]"],
  [new RegExp("\\\\Big\\{\\]\\}", 'g'), "\\\\Big]"],
  [new RegExp("\\\\big \\{\\]\\}", 'g'), "\\\\big]"],
  [new RegExp("\\\\Big \\{\\]\\}", 'g'), "\\\\Big]"],
  [new RegExp("\\\\big\\{\\[\\}", 'g'), "\\\\big["],
  [new RegExp("\\\\Big\\{\\[\\}", 'g'), "\\\\Big["],
  [new RegExp("\\\\big \\{\\[\\}", 'g'), "\\\\big["],
  [new RegExp("\\\\Big \\{\\[\\}", 'g'), "\\\\Big["],
  [new RegExp("\\\\bigm\\{\\]\\}", 'g'), "\\\\bigm]"],
  [new RegExp("\\\\Bigm\\{\\]\\}", 'g'), "\\\\Bigm]"],
  [new RegExp("\\\\bigm \\{\\]\\}", 'g'), "\\\\bigm]"],
  [new RegExp("\\\\Bigm \\{\\]\\}", 'g'), "\\\\Bigm]"],
  [new RegExp("\\\\bigm\\{\\[\\}", 'g'), "\\\\bigm["],
  [new RegExp("\\\\Bigm\\{\\[\\}", 'g'), "\\\\Bigm["],
  [new RegExp("\\\\bigm \\{\\[\\}", 'g'), "\\\\bigm["],
  [new RegExp("\\\\Bigm \\{\\[\\}", 'g'), "\\\\Bigm["],
  [new RegExp("\\\\bigr\\{\\]\\}", 'g'), "\\\\bigr]"],
  [new RegExp("\\\\Bigr\\{\\]\\}", 'g'), "\\\\Bigr]"],
  [new RegExp("\\\\bigr \\{\\]\\}", 'g'), "\\\\bigr]"],
  [new RegExp("\\\\Bigr \\{\\]\\}", 'g'), "\\\\Bigr]"],
  [new RegExp("\\\\bigr\\{\\[\\}", 'g'), "\\\\bigr["],
  [new RegExp("\\\\Bigr\\{\\[\\}", 'g'), "\\\\Bigr["],
  [new RegExp("\\\\bigr \\{\\[\\}", 'g'), "\\\\bigr["],
  [new RegExp("\\\\Bigr \\{\\[\\}", 'g'), "\\\\Bigr["],
  [new RegExp("\\\\bigl\\{\\]\\}", 'g'), "\\\\bigl]"],
  [new RegExp("\\\\Bigl\\{\\]\\}", 'g'), "\\\\Bigl]"],
  [new RegExp("\\\\bigl \\{\\]\\}", 'g'), "\\\\bigl]"],
  [new RegExp("\\\\Bigl \\{\\]\\}", 'g'), "\\\\Bigl]"],
  [new RegExp("\\\\bigl\\{\\[\\}", 'g'), "\\\\bigl["],
  [new RegExp("\\\\Bigl\\{\\[\\}", 'g'), "\\\\Bigl["],
  [new RegExp("\\\\bigl \\{\\[\\}", 'g'), "\\\\bigl["],
  [new RegExp("\\\\Bigl \\{\\[\\}", 'g'), "\\\\Bigl["],
  [new RegExp("\\\\bigg\\{\\]\\}", 'g'), "\\\\bigg]"],
  [new RegExp("\\\\Bigg\\{\\]\\}", 'g'), "\\\\Bigg]"],
  [new RegExp("\\\\bigg \\{\\]\\}", 'g'), "\\\\bigg]"],
  [new RegExp("\\\\Bigg \\{\\]\\}", 'g'), "\\\\Bigg]"],
  [new RegExp("\\\\bigg\\{\\[\\}", 'g'), "\\\\bigg["],
  [new RegExp("\\\\Bigg\\{\\[\\}", 'g'), "\\\\Bigg["],
  [new RegExp("\\\\bigg \\{\\[\\}", 'g'), "\\\\bigg["],
  [new RegExp("\\\\Bigg \\{\\[\\}", 'g'), "\\\\Bigg["],
  [new RegExp("\\\\biggr\\{\\]\\}", 'g'), "\\\\biggr]"],
  [new RegExp("\\\\Biggr\\{\\]\\}", 'g'), "\\\\Biggr]"],
  [new RegExp("\\\\biggr \\{\\]\\}", 'g'), "\\\\biggr]"],
  [new RegExp("\\\\Biggr \\{\\]\\}", 'g'), "\\\\Biggr]"],
  [new RegExp("\\\\biggr\\{\\[\\}", 'g'), "\\\\biggr["],
  [new RegExp("\\\\Biggr\\{\\[\\}", 'g'), "\\\\Biggr["],
  [new RegExp("\\\\biggr \\{\\[\\}", 'g'), "\\\\biggr["],
  [new RegExp("\\\\Biggr \\{\\[\\}", 'g'), "\\\\Biggr["],
  [new RegExp("\\\\biggm{\\[}", 'g'), "\\\\biggm\\["],
  [new RegExp("\\\\Biggm{\\[}", 'g'), "\\\\Biggm\\["],
  [new RegExp("\\\\biggm {\\[}", 'g'), "\\\\biggm\\["],
  [new RegExp("\\\\Biggm {\\[}", 'g'), "\\\\Biggm\\["],
  [new RegExp("\\\\biggm\\{\\]\\}", 'g'), "\\\\biggm\\]"],
  [new RegExp("\\\\Biggm\\{\\]\\}", 'g'), "\\\\Biggm\\]"],
  [new RegExp("\\\\biggm \\{\\]\\}", 'g'), "\\\\biggm\\]"],
  [new RegExp("\\\\Biggm \\{\\]\\}", 'g'), "\\\\Biggm\\]"],
  [new RegExp("\\\\biggl\\{\\[\\}", 'g'), "\\\\biggl\\["],
  [new RegExp("\\\\Biggl\\{\\[\\}", 'g'), "\\\\Biggl\\["],
  [new RegExp("\\\\biggl \\{\\[\\}", 'g'), "\\\\biggl\\["],
  [new RegExp("\\\\Biggl \\{\\[\\}", 'g'), "\\\\Biggl\\["],
  [new RegExp("\\\\biggl\\{\\]\\}", 'g'), "\\\\biggl\\]"],
  [new RegExp("\\\\Biggl\\{\\]\\}", 'g'), "\\\\Biggl\\]"],
  [new RegExp("\\\\biggl \\{\\]\\}", 'g'), "\\\\biggl\\]"],
  [new RegExp("\\\\Biggl \\{\\]\\}", 'g'), "\\\\Biggl\\]"],
  [new RegExp("\\\\big\\{\\\\rangle\\}", 'g'), "\\\\big\\\\rangle "],
  [new RegExp("\\\\big\\{\\\\langle\\}", 'g'), "\\\\big\\\\langle "],
  [new RegExp("\\\\big \\{\\\\rangle\\}", 'g'), "\\\\big\\\\rangle "],
  [new RegExp("\\\\big \\{\\\\langle\\}", 'g'), "\\\\big\\\\langle "],
  [new RegExp("\\\\bigr\\{\\\\rangle\\}", 'g'), "\\\\bigr\\\\rangle "],
  [new RegExp("\\\\bigr\\{\\\\langle\\}", 'g'), "\\\\bigr\\\\langle "],
  [new RegExp("\\\\bigr \\{\\\\rangle\\}", 'g'), "\\\\bigr\\\\rangle "],
  [new RegExp("\\\\bigr \\{\\\\langle\\}", 'g'), "\\\\bigr\\\\langle "],
  [new RegExp("\\\\bigm\\{\\\\rangle\\}", 'g'), "\\\\bigm\\\\rangle "],
  [new RegExp("\\\\bigm\\{\\\\langle\\}", 'g'), "\\\\bigm\\\\langle "],
  [new RegExp("\\\\bigm \\{\\\\rangle\\}", 'g'), "\\\\bigm\\\\rangle "],
  [new RegExp("\\\\bigm \\{\\\\langle\\}", 'g'), "\\\\bigm\\\\langle "],
  [new RegExp("\\\\bigl\\{\\\\rangle\\}", 'g'), "\\\\bigl\\\\rangle "],
  [new RegExp("\\\\bigl\\{\\\\langle\\}", 'g'), "\\\\bigl\\\\langle "],
  [new RegExp("\\\\bigl \\{\\\\rangle\\}", 'g'), "\\\\bigl\\\\rangle "],
  [new RegExp("\\\\bigl \\{\\\\langle\\}", 'g'), "\\\\bigl\\\\langle "],
  [new RegExp("\\\\bigg\\{\\\\rangle\\}", 'g'), "\\\\bigg\\\\rangle "],
  [new RegExp("\\\\bigg\\{\\\\langle\\}", 'g'), "\\\\bigg\\\\langle "],
  [new RegExp("\\\\bigg \\{\\\\rangle\\}", 'g'), "\\\\bigg\\\\rangle "],
  [new RegExp("\\\\bigg \\{\\\\langle\\}", 'g'), "\\\\bigg\\\\langle "],
  [new RegExp("\\\\biggr\\{\\\\rangle\\}", 'g'), "\\\\biggr\\\\rangle "],
  [new RegExp("\\\\biggr\\{\\\\langle\\}", 'g'), "\\\\biggr\\\\langle "],
  [new RegExp("\\\\biggr \\{\\\\rangle\\}", 'g'), "\\\\biggr\\\\rangle "],
  [new RegExp("\\\\biggr \\{\\\\langle\\}", 'g'), "\\\\biggr\\\\langle "],
  [new RegExp("\\\\biggm\\{\\\\rangle\\}", 'g'), "\\\\biggm\\\\rangle "],
  [new RegExp("\\\\biggm\\{\\\\langle\\}", 'g'), "\\\\biggm\\\\langle "],
  [new RegExp("\\\\biggm \\{\\\\rangle\\}", 'g'), "\\\\biggm\\\\rangle "],
  [new RegExp("\\\\biggm \\{\\\\langle\\}", 'g'), "\\\\biggm\\\\langle "],
  [new RegExp("\\\\biggl\\{\\\\rangle\\}", 'g'), "\\\\biggl\\\\rangle "],
  [new RegExp("\\\\biggl\\{\\\\langle\\}", 'g'), "\\\\biggl\\\\langle "],
  [new RegExp("\\\\biggl \\{\\\\rangle\\}", 'g'), "\\\\biggl\\\\rangle "],
  [new RegExp("\\\\biggl \\{\\\\langle\\}", 'g'), "\\\\biggl\\\\langle "],
  [new RegExp("\\\\Big\\{\\\\rangle\\}", 'g'), "\\\\Big\\\\rangle "],
  [new RegExp("\\\\Big\\{\\\\langle\\}", 'g'), "\\\\Big\\\\langle "],
  [new RegExp("\\\\Big \\{\\\\rangle\\}", 'g'), "\\\\Big\\\\rangle "],
  [new RegExp("\\\\Big \\{\\\\langle\\}", 'g'), "\\\\Big\\\\langle "],
  [new RegExp("\\\\Bigr\\{\\\\rangle\\}", 'g'), "\\\\Bigr\\\\rangle "],
  [new RegExp("\\\\Bigr\\{\\\\langle\\}", 'g'), "\\\\Bigr\\\\langle "],
  [new RegExp("\\\\Bigr \\{\\\\rangle\\}", 'g'), "\\\\Bigr\\\\rangle "],
  [new RegExp("\\\\Bigr \\{\\\\langle\\}", 'g'), "\\\\Bigr\\\\langle "],
  [new RegExp("\\\\Bigm\\{\\\\rangle\\}", 'g'), "\\\\Bigm\\\\rangle "],
  [new RegExp("\\\\Bigm\\{\\\\langle\\}", 'g'), "\\\\Bigm\\\\langle "],
  [new RegExp("\\\\Bigm \\{\\\\rangle\\}", 'g'), "\\\\Bigm\\\\rangle "],
  [new RegExp("\\\\Bigm \\{\\\\langle\\}", 'g'), "\\\\Bigm\\\\langle "],
  [new RegExp("\\\\Bigl\\{\\\\rangle\\}", 'g'), "\\\\Bigl\\\\rangle "],
  [new RegExp("\\\\Bigl\\{\\\\langle\\}", 'g'), "\\\\Bigl\\\\langle "],
  [new RegExp("\\\\Bigl \\{\\\\rangle\\}", 'g'), "\\\\Bigl\\\\rangle "],
  [new RegExp("\\\\Bigl \\{\\\\langle\\}", 'g'), "\\\\Bigl\\\\langle "],
  [new RegExp("\\\\Bigg\\{\\\\rangle\\}", 'g'), "\\\\Bigg\\\\rangle "],
  [new RegExp("\\\\Bigg\\{\\\\langle\\}", 'g'), "\\\\Bigg\\\\langle "],
  [new RegExp("\\\\Bigg \\{\\\\rangle\\}", 'g'), "\\\\Bigg\\\\rangle "],
  [new RegExp("\\\\Bigg \\{\\\\langle\\}", 'g'), "\\\\Bigg\\\\langle "],
  [new RegExp("\\\\Biggr\\{\\\\rangle\\}", 'g'), "\\\\Biggr\\\\rangle "],
  [new RegExp("\\\\Biggr\\{\\\\langle\\}", 'g'), "\\\\Biggr\\\\langle "],
  [new RegExp("\\\\Biggr \\{\\\\rangle\\}", 'g'), "\\\\Biggr\\\\rangle "],
  [new RegExp("\\\\Biggr \\{\\\\langle\\}", 'g'), "\\\\Biggr\\\\langle "],
  [new RegExp("\\\\Biggl\\{\\\\rangle\\}", 'g'), "\\\\Biggl\\\\rangle "],
  [new RegExp("\\\\Biggl\\{\\\\langle\\}", 'g'), "\\\\Biggl\\\\langle "],
  [new RegExp("\\\\Biggl \\{\\\\rangle\\}", 'g'), "\\\\Biggl\\\\rangle "],
  [new RegExp("\\\\Biggl \\{\\\\langle\\}", 'g'), "\\\\Biggl\\\\langle "],
  [new RegExp("\\\\bigtimes", 'g'), "\\\\times"],
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

function tryMatchEquationLeftRight(latex: string, debug: boolean = false): string {
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

function tryFixEquationDoubleSubscript(latex: string, debug: boolean = false): string {
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

function tryFixEquationEqqcolon(latex: string, debug: boolean = false): string {
  let out = latex.replace(/\\eqqcolon/g, '=:');
  out = out.replace(/\\coloneqq/g, ':=');
  if (debug && out !== latex) {
    console.log(`Fixed equation eq-colon from: ${latex} to: ${out}`);
  }
  return out;
}

function tryFixEquationBig(latex: string, debug: boolean = false): string {
  const original = latex;
  let out = latex;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  if (debug && out !== original) {
    console.log(`Fixed equation big from: ${original} to: ${out}`);
  }
  return out;
}

function tryFixEquationLeq(latex: string, debug: boolean = false): string {
  const out = latex.replace(/</g, '< ');
  if (debug && out !== latex) {
    console.log(`Fixed equation leq from: ${latex} to: ${out}`);
  }
  return out;
}

function tryFixUnbalancedBraces(latexFormula: string, debug: boolean = false): string {
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
