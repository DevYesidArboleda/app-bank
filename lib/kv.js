const BASE_URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(command) {
  // El comando va en el cuerpo: en la URL, un valor grande superaría su límite.
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  if (data.error) throw new Error(`Upstash error: ${data.error}`);
  return data.result;
}

export async function kvGet(key) {
  const result = await redisCommand(["get", key]);
  return result ? JSON.parse(result) : null;
}

export async function kvSet(key, value) {
  return redisCommand(["set", key, JSON.stringify(value)]);
}

export async function kvDelete(key) {
  return redisCommand(["del", key]);
}

// Suma 1 a un contador y, si es nuevo, le pone vencimiento. Devuelve el valor.
export async function kvIncr(key, ttlSeconds) {
  const count = await redisCommand(["incr", key]);
  if (count === 1) await redisCommand(["expire", key, String(ttlSeconds)]);
  return count;
}

// Segundos que le quedan a una clave (-2 si no existe)
export async function kvTtl(key) {
  return redisCommand(["ttl", key]);
}
