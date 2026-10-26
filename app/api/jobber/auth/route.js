import { NextResponse } from "next/server";

// GET /api/jobber/auth
// Redirige al usuario a la pantalla de autorización de Jobber
export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.JOBBER_CLIENT_ID,
    redirect_uri: process.env.JOBBER_REDIRECT_URI,
    response_type: "code",
    // agrega aquí los scopes que necesites, ej: "clients:read"
  });

  const authorizeUrl = `${process.env.JOBBER_AUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(authorizeUrl);
}
