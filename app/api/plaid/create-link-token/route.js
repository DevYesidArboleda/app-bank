import { NextResponse } from "next/server";
import { plaidRequest } from "@/lib/plaid";

// POST /api/plaid/create-link-token
// El frontend llama esto ANTES de abrir el widget de Plaid Link
export async function POST() {
  const userId = "demo-user"; // TODO: usuario real autenticado

  try {
    const data = await plaidRequest("/link/token/create", {
      user: { client_user_id: userId },
      client_name: "Tu App",
      products: (process.env.PLAID_PRODUCTS || "auth,transactions").split(","),
      country_codes: (process.env.PLAID_COUNTRY_CODES || "US").split(","),
      language: "en",
    });

    return NextResponse.json({ link_token: data.link_token });
  } catch (error) {
    console.error("Error creando link_token de Plaid:", error);
    return NextResponse.json({ error: "Couldn't create the link_token" }, { status: 500 });
  }
}
