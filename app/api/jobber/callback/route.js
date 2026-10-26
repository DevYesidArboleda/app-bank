import { NextResponse } from "next/server";
import { saveToken } from "@/lib/tokenStore";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch(process.env.JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.JOBBER_CLIENT_ID,
        client_secret: process.env.JOBBER_CLIENT_SECRET,
        redirect_uri: process.env.JOBBER_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Jobber token exchange failed: ${await tokenResponse.text()}`);
    }

    const tokens = await tokenResponse.json();

   await saveToken("jobber", {   
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    });

    // Mismo dominio desde el que llegó el callback (localhost o Vercel)
    return NextResponse.redirect(new URL("/dashboard?jobber=connected", request.url));
  } catch (error) {
    console.error("Error en callback de Jobber:", error);
    return NextResponse.json({ error: "Couldn't complete the Jobber connection" }, { status: 500 });
  }
}