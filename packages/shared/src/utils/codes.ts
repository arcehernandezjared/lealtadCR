const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1 para evitar confusion visual

/** Genera un codigo tipo "LOYAL-8F42KD" para canje de recompensas. */
export function generateRedemptionCode(length = 6): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `LOYAL-${suffix}`;
}
