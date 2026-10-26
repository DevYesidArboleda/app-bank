// Genera el valor de AUTH_PASSWORD_HASH para una contraseña (mismo formato
// que lib/auth.js). Uso:
//   node scripts/hash-password.mjs "la-contraseña"
// Sin argumento genera una contraseña aleatoria y la muestra junto al hash.
// Para AUTH_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
import crypto from "node:crypto";

const password = process.argv[2] || crypto.randomBytes(12).toString("base64url");
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64);

if (!process.argv[2]) console.log(`Password: ${password}`);
console.log(`AUTH_PASSWORD_HASH=scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`);
