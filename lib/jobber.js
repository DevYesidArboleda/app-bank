import { getToken, saveToken } from "@/lib/tokenStore";

const API_URL = "https://api.getjobber.com/api/graphql";
const API_VERSION = "2025-04-16";

class JobberClient {
  static getAuthorizationUrl() {
    const scopes = ["clients:read", "invoices:read"].join(" ");
    const params = new URLSearchParams({
      client_id: process.env.JOBBER_CLIENT_ID,
      redirect_uri: process.env.JOBBER_REDIRECT_URI,
      response_type: "code",
      scope: scopes,
    });
    return `${process.env.JOBBER_AUTH_URL}?${params.toString()}`;
  }

  async getValidAccessToken() {
   const token = await getToken("jobber");

    if (!token) {
      throw new Error("Jobber is not connected. Go to /api/jobber/auth");
    }

    const isExpired = token.expiresAt && new Date() >= token.expiresAt;
    if (!isExpired) return token.accessToken;

    if (!token.refreshToken) {
      throw new Error("Token expired and no refresh_token available. Reconnect Jobber.");
    }

    const refreshResponse = await fetch(process.env.JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error(`Couldn't refresh the token: ${await refreshResponse.text()}`);
    }

    const tokens = await refreshResponse.json();

    saveToken("jobber", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || token.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    });

    return tokens.access_token;
  }

  // Jobber limita por costo de consulta (THROTTLED): se espera a que el
  // cupo se recupere y se reintenta unas veces antes de fallar.
  async graphqlQuery(query, variables = {}, retries = 5) {
    try {
      return await this._graphqlOnce(query, variables);
    } catch (error) {
      if (retries <= 0 || !/THROTTLED/.test(error.message)) throw error;
      await new Promise((r) => setTimeout(r, 3000));
      return this.graphqlQuery(query, variables, retries - 1);
    }
  }

  async _graphqlOnce(query, variables) {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-JOBBER-GRAPHQL-VERSION": API_VERSION,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (!response.ok || json.errors) {
      throw new Error(`Jobber GraphQL error: ${JSON.stringify(json.errors || json)}`);
    }
    return json.data;
  }

  async getClients() {
    const query = `
      query GetClients($cursor: String) {
        clients(first: 50, after: $cursor) {
          nodes { id name emails { address } phones { number } }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    return this._paginate(query, "clients");
  }

  // Visitas que empiezan entre `from` y `to` ("YYYY-MM-DD" en la zona del
  // negocio, ambos incluidos), con sus líneas y cómo se factura su trabajo.
  async getVisits({ from, to }) {
    const query = `
      query GetVisits($cursor: String, $after: ISO8601DateTime, $before: ISO8601DateTime) {
        visits(
          first: 50
          after: $cursor
          filter: { startAt: { after: $after, before: $before } }
          timezone: "America/New_York"
        ) {
          nodes {
            id
            startAt
            job { billingType invoiceSchedule { billingFrequency } }
            lineItems(first: 30) { nodes { totalPrice taxable } }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    // Un día de margen a cada lado por la zona horaria; el agrupado por semana
    // ya descarta lo que quede fuera del rango.
    const pad = (key, days) => {
      const d = new Date(`${key}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString();
    };
    return this._paginate(query, "visits", { after: pad(from, -1), before: pad(to, 2) }, 100);
  }

  async _paginate(query, key, variables = {}, maxPages = 10) {
    let allNodes = [];
    let cursor = null;
    let hasNextPage = true;
    let page = 0;

    while (hasNextPage && page < maxPages) {
      const data = await this.graphqlQuery(query, { ...variables, cursor });
      allNodes = allNodes.concat(data[key].nodes);
      hasNextPage = data[key].pageInfo.hasNextPage;
      cursor = data[key].pageInfo.endCursor;
      page++;
    }
    // Mejor fallar que devolver datos a medias que se ven como semanas en cero
    if (hasNextPage) {
      throw new Error(`Jobber: more than ${maxPages} pages of ${key}, results would be incomplete`);
    }
    return allNodes;
  }
}

export default JobberClient;