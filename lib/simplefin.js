// SimpleFIN usa una Access URL con credenciales embebidas (Basic Auth),
// no un client_id/secret separado como Paychex.
// Formato: https://usuario:password@bridge.simplefin.org/simplefin
//
// NOTA: fetch() nativo NO permite URLs con credenciales embebidas (user:pass@host),
// así que extraemos usuario/password y los mandamos como header Authorization.

function getParsedAccessUrl() {
  const rawUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!rawUrl) {
    throw new Error("Missing SIMPLEFIN_ACCESS_URL environment variable");
  }

  const parsed = new URL(rawUrl);
  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);

  // Quitamos las credenciales de la URL para poder usarla con fetch()
  parsed.username = "";
  parsed.password = "";

  return {
    baseUrl: parsed.toString().replace(/\/$/, ""), // sin slash final
    authHeader: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
  };
}

// Trae todas las cuentas conectadas (balances incluidos)
export async function simplefinGetAccounts({ startDate, endDate } = {}) {
  const { baseUrl, authHeader } = getParsedAccessUrl();
  const params = new URLSearchParams();

  if (startDate) params.set("start-date", startDate); // unix timestamp
  if (endDate) params.set("end-date", endDate); // unix timestamp

  const url = `${baseUrl}/accounts${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: { Authorization: authHeader },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SimpleFIN API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}