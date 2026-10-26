import { kvGet, kvSet } from "@/lib/kv";
import { encrypt, decrypt } from "@/lib/crypto";

export async function saveToken(provider, { accessToken, refreshToken, expiresAt }) {
  await kvSet(`token:${provider}`, {
    accessToken: encrypt(accessToken),
    refreshToken: refreshToken ? encrypt(refreshToken) : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });
}

export async function getToken(provider) {
  const entry = await kvGet(`token:${provider}`);
  if (!entry) return null;

  return {
    accessToken: decrypt(entry.accessToken),
    refreshToken: entry.refreshToken ? decrypt(entry.refreshToken) : null,
    expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : null,
  };
}