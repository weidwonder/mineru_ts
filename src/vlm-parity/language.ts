export function detectLang(text: string): string {
  if (!text) {
    return '';
  }
  const cleaned = text.replace(/\n/g, '');
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(cleaned)) {
    return 'zh';
  }
  return 'en';
}
