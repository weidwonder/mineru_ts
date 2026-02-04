export function isHyphenAtLineEnd(line: string): boolean {
  return /[A-Za-z]+-\s*$/.test(line);
}

export function fullToHalfExcludeMarks(text: string): string {
  const out: string[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (
      (code >= 0xff21 && code <= 0xff3a) ||
      (code >= 0xff41 && code <= 0xff5a) ||
      (code >= 0xff10 && code <= 0xff19)
    ) {
      out.push(String.fromCharCode(code - 0xfee0));
    } else {
      out.push(ch);
    }
  }
  return out.join('');
}

export function fullToHalf(text: string): string {
  const out: string[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xff01 && code <= 0xff5e) {
      out.push(String.fromCharCode(code - 0xfee0));
    } else {
      out.push(ch);
    }
  }
  return out.join('');
}
