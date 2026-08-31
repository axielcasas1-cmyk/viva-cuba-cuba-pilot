import {randomInt} from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateDx():string {
  let value = 'DX-';
  for (let i=0;i<8;i++) value += ALPHABET[randomInt(ALPHABET.length)];
  return value;
}
