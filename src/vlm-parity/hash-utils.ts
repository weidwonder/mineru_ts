import crypto from 'crypto';

export function bytesMd5Upper(data: Buffer): string {
  return crypto.createHash('md5').update(data).digest('hex').toUpperCase();
}

export function strMd5(input: string): string {
  return crypto.createHash('md5').update(Buffer.from(input, 'utf-8')).digest('hex');
}

export function strSha256(input: string): string {
  return crypto.createHash('sha256').update(Buffer.from(input, 'utf-8')).digest('hex');
}
