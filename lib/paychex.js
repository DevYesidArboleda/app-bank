// Paychex usa OAuth 2.0 client_credentials. El token es de la APP (no por usuario),
// así que lo cacheamos en memoria del proceso para no pedir uno nuevo en cada llamada.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const response = await fetch(process.env.PAYCHEX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.PAYCHEX_CLIENT_ID,
      client_secret: process.env.PAYCHEX_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Couldn't authenticate with Paychex: ${errorBody}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Restamos 60s de margen de seguridad antes de que expire
  cachedTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

// Wrapper genérico para llamadas GET autenticadas a la API de Paychex
export async function paychexGet(path) {
  const token = await getAccessToken();

  const response = await fetch(`${process.env.PAYCHEX_API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Paychex API error (${path}): ${errorBody}`);
  }

  return response.json();
}
