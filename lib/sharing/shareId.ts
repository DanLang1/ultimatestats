const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 6;

export function generateShareId(): string {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}
