import crypto from "crypto";

// Login de un solo usuario. Nada sensible vive en el código:
//   AUTH_USERNAME       → el usuario (ej. "linda")
//   AUTH_PASSWORD_HASH  → "scrypt:<salt>:<hash>" (scripts/hash-password.mjs).
//                         Separado con ":" y no "$", que Next expande en .env.
//   AUTH_SECRET         → firma la cookie de sesión (32+ bytes aleatorios)
// La sesión es una cookie firmada con HMAC: no hace falta guardarla en la base.

export const SESSION_COOKIE = "wc_session";
export const SESSION_DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("Missing AUTH_SECRET (32+ characters)");
  return s;
}

const sign = (data) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function createSessionToken(username) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// true si la cookie la firmó este servidor, no venció y es del usuario actual
// (cambiar AUTH_USERNAME o AUTH_SECRET cierra todas las sesiones).
export function verifySessionToken(token) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    if (!safeEqual(signature, sign(payload))) return false;
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return u === process.env.AUTH_USERNAME && Date.now() < exp;
  } catch {
    return false;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export function verifyCredentials(username, password) {
  const expectedUser = process.env.AUTH_USERNAME;
  const stored = process.env.AUTH_PASSWORD_HASH;
  if (!expectedUser || !stored) throw new Error("Missing AUTH_USERNAME or AUTH_PASSWORD_HASH");

  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) throw new Error("AUTH_PASSWORD_HASH has an invalid format");

  // Se calcula el hash aunque el usuario no coincida, para que la respuesta
  // tarde lo mismo y no revele cuál de los dos estaba mal.
  const actual = crypto.scryptSync(String(password || ""), Buffer.from(salt, "base64url"), 64);
  const passwordOk = crypto.timingSafeEqual(actual, Buffer.from(hash, "base64url"));
  const userOk = safeEqual(String(username || "").trim().toLowerCase(), expectedUser.toLowerCase());
  return passwordOk && userOk;
}
