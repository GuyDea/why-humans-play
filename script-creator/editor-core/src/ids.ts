const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';
const ID_LENGTH = 10;

export function newId(prefix: string): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  const suffix = Array.from(randomBytes, (byte) => BASE32_ALPHABET[byte & 31]).join('');
  return `${prefix}_${suffix}`;
}

export function newBeatId(): string {
  return newId('beat');
}
