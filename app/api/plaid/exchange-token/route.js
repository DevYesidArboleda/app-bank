import { NextResponse } from "next/server";
import { plaidRequest } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

// POST /api/plaid/exchange-token
// Body: { public_token, metadata } — metadata viene del onSuccess de Plaid Link
export async function POST(request) {
  const userId = "demo-user"; // TODO: usuario real autenticado
  const { public_token, metadata } = await request.json();

  if (!public_token) {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
  }

  try {
    const exchangeData = await plaidRequest("/item/public_token/exchange", {
      public_token,
    });

    const { access_token, item_id } = exchangeData;

    await prisma.integration.upsert({
      where: {
        userId_provider_itemId: { userId, provider: "plaid", itemId: item_id },
      },
      update: {
        accessToken: encrypt(access_token),
        metadata: metadata || {},
      },
      create: {
        userId,
        provider: "plaid",
        itemId: item_id,
        accessToken: encrypt(access_token),
        metadata: metadata || {},
      },
    });

    return NextResponse.json({ success: true, item_id });
  } catch (error) {
    console.error("Error intercambiando token de Plaid:", error);
    return NextResponse.json({ error: "Couldn't complete the bank connection" }, { status: 500 });
  }
}
