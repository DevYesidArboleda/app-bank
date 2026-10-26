const PLAID_BASE_URLS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

function getPlaidBaseUrl() {
  const env = process.env.PLAID_ENV || "sandbox";
  return PLAID_BASE_URLS[env];
}

// Wrapper genérico para llamadas a Plaid: agrega client_id/secret automáticamente
export async function plaidRequest(endpoint, body = {}) {
  const response = await fetch(`${getPlaidBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error_message || "Plaid request failed");
    err.plaidError = data;
    throw err;
  }

  return data;
}
