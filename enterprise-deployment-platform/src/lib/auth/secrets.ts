function requireSecret(name: string): Uint8Array {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}. Set it in .env (see .env.example).`);
  }
  return new TextEncoder().encode(value);
}

export const getAccessSecret = () => requireSecret('JWT_ACCESS_SECRET');
export const getRefreshSecret = () => requireSecret('JWT_REFRESH_SECRET');
export const getWebhookSecret = () => {
  const s = process.env.WEBHOOK_SECRET;
  if (!s) throw new Error('Missing env var: WEBHOOK_SECRET');
  return s;
};
